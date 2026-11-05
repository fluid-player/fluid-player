/**
 * Auto Play Next Video (FP-323).
 *
 * When the publisher enables `layoutControls.autoPlayNextVideo` and `suggestedVideos.configUrl` is set, a toggle is
 * shown on the control bar (and, on the compact layout, as a switch in the FP-362 settings sheet). While it is on,
 * the end of a video — after any post-roll ads — starts a countdown overlay for the next suggested video; when the
 * countdown finishes (or the viewer taps Play now) the next video plays.
 *
 * The transition reuses the FP-271 suggested-videos pipeline (clickSuggestedVideo -> resetPlayer), so the chained
 * `configUrl` refresh of the suggested pool happens exactly as it does for a manual click. The next video's metadata
 * comes from the parsed suggested-videos list retained by suggestedVideos.js.
 */
export default function (playerInstance) {
    const DEFAULT_COUNTDOWN = 5;
    const MIN_COUNTDOWN = 3;
    const LONG_COUNTDOWN_NOTICE = 30; // informational only — never clamped
    const PLACEHOLDER_TITLE = 'Next video';
    const BUTTON_OFF_CLASS = 'fluid_autoplay_off';
    const OPEN_CLASS = 'fluid_autoplay_overlay_open';

    let countdownTimer = null; // setInterval id while counting down
    let remainingSeconds = 0;
    let overlay = null;
    let liveRegion = null;
    let nextVideo = null; // the item being counted down to
    let isTransitioning = false; // guards the Cancel/Play now/complete races (Scenario 11.3/11.4)
    let onVisibilityChange = null;

    const autoPlayOptions = () => playerInstance.displayOptions.layoutControls.autoPlayNextVideo || {};
    const isConfigured = () => !!playerInstance.displayOptions.suggestedVideos.configUrl;
    const isCountingDown = () => countdownTimer !== null;

    const createElement = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (typeof text !== 'undefined') {
            element.textContent = text;
        }
        if (tag === 'button') {
            element.type = 'button';
        }
        return element;
    };

    const emit = (name, detail) => {
        playerInstance.domRef.player.dispatchEvent(new CustomEvent(name, { detail }));
    };

    // --- Configuration validation (FP-444 / Scenario 2.3-2.4) ---
    playerInstance.getAutoPlayCountdown = () => {
        const raw = autoPlayOptions().countdown;

        if (raw === undefined || raw === null) {
            return DEFAULT_COUNTDOWN;
        }

        const value = Number(raw);

        if (typeof raw === 'boolean' || !Number.isFinite(value)) {
            console.warn(`[FluidPlayer] autoPlayNextVideo.countdown is not a valid number; falling back to default ${DEFAULT_COUNTDOWN}.`);
            return DEFAULT_COUNTDOWN;
        }

        if (value < MIN_COUNTDOWN) {
            console.warn(`[FluidPlayer] autoPlayNextVideo.countdown value ${value} is below the minimum of ${MIN_COUNTDOWN}; falling back to default ${DEFAULT_COUNTDOWN}.`);
            return DEFAULT_COUNTDOWN;
        }

        if (value > LONG_COUNTDOWN_NOTICE) {
            console.info(`[FluidPlayer] autoPlayNextVideo.countdown value ${value} is unusually long (>${LONG_COUNTDOWN_NOTICE}s); using it as configured.`);
        }

        return value;
    };

    // --- Feature availability (Scenario 1) ---
    // The toggle exists only when the feature is enabled AND a suggestedVideos.configUrl is present.
    playerInstance.isAutoPlayAvailable = () => !!autoPlayOptions().enabled && isConfigured();

    // The first item of the retained suggested-videos list, or null when the queue is empty / not yet loaded.
    playerInstance.getNextSuggestedVideo = () => {
        const list = playerInstance.suggestedVideosList;
        return Array.isArray(list) && list.length ? (list[0] || null) : null;
    };

    // Should the end of the current video start a countdown? (Scenario 2.1 vs 6)
    playerInstance.shouldAutoPlayNextVideo = () =>
        playerInstance.isAutoPlayAvailable()
        && !!playerInstance.autoPlayToggledOn
        && !!playerInstance.getNextSuggestedVideo();

    // --- Toggle button + persistence (FP-445 / Scenario 1, 5, 7) ---
    playerInstance.initAutoPlay = () => {
        const button = playerInstance.domRef.wrapper.querySelector('.fluid_control_autoplay');

        if (!playerInstance.isAutoPlayAvailable()) {
            if (autoPlayOptions().enabled && !isConfigured()) {
                console.warn('[FluidPlayer] autoPlayNextVideo is enabled but suggestedVideos.configUrl is not configured — feature disabled.');
            }
            if (button) {
                button.style.display = 'none';
            }
            return;
        }

        // New viewer: start from defaultState (defaults to true). A persisted preference, if any, is applied
        // afterwards by setPersistentSettings() -> applyPersistedAutoPlay().
        playerInstance.autoPlayToggledOn = autoPlayOptions().defaultState !== false;

        if (button) {
            button.style.display = 'inline-block';
            updateButton(button);
            playerInstance.trackEvent(
                playerInstance.domRef.player.parentNode,
                'click',
                '.fluid_control_autoplay',
                () => playerInstance.toggleAutoPlay(undefined, true)
            );
        }

        // Scenario 11.2 — tidy up if the player is destroyed mid-countdown.
        playerInstance.destructors.push(() => teardownCountdown());
    };

    function updateButton(button) {
        button = button || playerInstance.domRef.wrapper.querySelector('.fluid_control_autoplay');
        if (!button) {
            return;
        }

        const on = !!playerInstance.autoPlayToggledOn;
        const captions = playerInstance.displayOptions.captions || {};

        button.classList.toggle(BUTTON_OFF_CLASS, !on);
        button.setAttribute('role', 'switch');
        button.setAttribute('aria-checked', String(on));
        button.setAttribute('aria-label', 'Autoplay');
        button.title = on
            ? (captions.autoPlayOn || 'Autoplay is on')
            : (captions.autoPlayOff || 'Autoplay is off');
    }

    playerInstance.toggleAutoPlay = (forceState, manual = false) => {
        const next = typeof forceState === 'boolean' ? forceState : !playerInstance.autoPlayToggledOn;

        if (next === playerInstance.autoPlayToggledOn) {
            return;
        }

        playerInstance.autoPlayToggledOn = next;
        updateButton();

        if (manual) {
            persistAutoPlay(next);
        }

        emit('autoPlayToggled', { enabled: next });

        // Turning autoplay off during a countdown cancels it and closes the overlay (Scenario 5).
        if (!next && (isCountingDown() || overlay)) {
            playerInstance.cancelAutoPlayCountdown();
        }
    };

    function persistAutoPlay(value) {
        try {
            if (playerInstance.displayOptions.layoutControls.persistentSettings.autoPlay && playerInstance.fluidStorage) {
                playerInstance.fluidStorage.fluidAutoPlay = value ? 'true' : 'false';
            }
        } catch (error) {
            // Storage unavailable (private mode, blocked) — mirror how other persisted settings behave.
        }
    }

    // Called from setPersistentSettings() for a returning viewer (Scenario 1.5 / 7.2).
    playerInstance.applyPersistedAutoPlay = () => {
        if (!playerInstance.isAutoPlayAvailable()) {
            return;
        }
        if (!playerInstance.displayOptions.layoutControls.persistentSettings.autoPlay) {
            return;
        }
        try {
            const stored = playerInstance.fluidStorage.fluidAutoPlay;
            if (typeof stored !== 'undefined') {
                playerInstance.autoPlayToggledOn = stored === 'true';
                updateButton();
            }
        } catch (error) {
            // ignore — fall back to defaultState already set in initAutoPlay()
        }
    };

    // --- Countdown overlay (FP-446 / Scenario 2, 8, 9, 10) ---
    playerInstance.startAutoPlayCountdown = () => {
        nextVideo = playerInstance.getNextSuggestedVideo();

        if (!nextVideo) {
            // Queue legitimately exhausted — fall back to the existing end-of-video state (Scenario 11.5, end-of-queue).
            playerInstance.displaySuggestedVideos();
            return;
        }

        // The suggested-videos grid is suppressed while the countdown runs (Scenario 2.5).
        playerInstance.hideSuggestedVideos();

        remainingSeconds = playerInstance.getAutoPlayCountdown();
        buildOverlay(nextVideo, remainingSeconds);

        emit('autoPlayCountdownStarted', {
            nextVideoId: nextVideo.id,
            nextVideoTitle: nextVideo.title || PLACEHOLDER_TITLE,
            duration: remainingSeconds
        });

        // A single, non-ticking announcement (Scenario 9).
        announce(`Next video starts in ${remainingSeconds} seconds. Cancel or play now.`);

        startTimer();
        attachVisibilityPause();
    };

    function buildOverlay(video, seconds) {
        removeOverlay();

        overlay = createElement('div', 'fluid_autoplay_overlay');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Autoplay next video');

        const panel = createElement('div', 'fluid_autoplay_panel');

        panel.appendChild(createElement('span', 'fluid_autoplay_uptitle', 'Up next'));

        const thumb = createElement('div', 'fluid_autoplay_thumb');
        if (video.thumbnailUrl) {
            const image = document.createElement('img');
            image.src = video.thumbnailUrl;
            image.alt = '';
            image.className = 'fluid_autoplay_thumb_img';
            // Scenario 11.6 — a broken thumbnail degrades to the placeholder background, never a broken image.
            image.addEventListener('error', () => image.remove());
            thumb.appendChild(image);
        }
        panel.appendChild(thumb);

        panel.appendChild(createElement('span', 'fluid_autoplay_title', video.title || PLACEHOLDER_TITLE));

        const timer = createElement('div', 'fluid_autoplay_timer');
        timer.appendChild(createElement('span', 'fluid_autoplay_seconds', String(seconds)));
        panel.appendChild(timer);

        const actions = createElement('div', 'fluid_autoplay_actions');

        const cancelButton = createElement('button', 'fluid_autoplay_cancel', 'Cancel');
        cancelButton.addEventListener('click', () => playerInstance.cancelAutoPlayCountdown());

        const playNowButton = createElement('button', 'fluid_autoplay_playnow', 'Play now');
        playNowButton.addEventListener('click', () => playerInstance.playAutoPlayNow());

        // Play now is the primary action; order in the DOM is Cancel then Play now (CSS places Play now on top in
        // portrait). Focus lands on Cancel when the overlay opens (Scenario 9).
        actions.append(cancelButton, playNowButton);
        panel.appendChild(actions);

        overlay.appendChild(panel);
        overlay.addEventListener('keydown', onOverlayKeydown);

        playerInstance.domRef.wrapper.appendChild(overlay);
        // Allow the open transition to run (respecting prefers-reduced-motion via CSS).
        requestAnimationFrame(() => overlay && overlay.classList.add(OPEN_CLASS));

        cancelButton.focus({ preventScroll: true });
    }

    // Escape acts as Cancel; Tab is trapped between Cancel and Play now (Scenario 9).
    function onOverlayKeydown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            playerInstance.cancelAutoPlayCountdown();
            return;
        }

        if (event.key !== 'Tab' || !overlay) {
            return;
        }

        const focusable = Array.from(overlay.querySelectorAll('button')).filter(button => button.offsetParent !== null);
        if (!focusable.length) {
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function startTimer() {
        stopTimer();
        countdownTimer = setInterval(() => {
            remainingSeconds -= 1;
            updateTimerText(remainingSeconds);
            if (remainingSeconds <= 0) {
                playerInstance.completeAutoPlay();
            }
        }, 1000);
    }

    function stopTimer() {
        if (countdownTimer !== null) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
    }

    function updateTimerText(seconds) {
        if (!overlay) {
            return;
        }
        const secondsEl = overlay.querySelector('.fluid_autoplay_seconds');
        if (secondsEl) {
            secondsEl.textContent = String(Math.max(seconds, 0));
        }
    }

    // Pause/resume the countdown with tab visibility (Scenario 8).
    function attachVisibilityPause() {
        detachVisibilityPause();
        onVisibilityChange = () => {
            if (document.hidden) {
                stopTimer();
            } else if (overlay && countdownTimer === null && remainingSeconds > 0) {
                startTimer();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
    }

    function detachVisibilityPause() {
        if (onVisibilityChange) {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            onVisibilityChange = null;
        }
    }

    // --- Transitions and races (Scenario 2.6, 4, 11.3, 11.4) ---
    playerInstance.completeAutoPlay = () => {
        if (isTransitioning) {
            return;
        }
        const video = nextVideo;
        teardownCountdown();
        if (!video) {
            playerInstance.displaySuggestedVideos();
            return;
        }
        emit('autoPlayCompleted', { nextVideoId: video.id });
        transitionTo(video);
    };

    playerInstance.playAutoPlayNow = () => {
        if (isTransitioning) {
            return;
        }
        const video = nextVideo;
        const secondsLeft = Math.max(remainingSeconds, 0);
        teardownCountdown();
        // Play now wins the race at zero: only autoPlayPlayNow is emitted, never autoPlayCompleted (Scenario 11.4).
        emit('autoPlayPlayNow', { remainingSeconds: secondsLeft });
        transitionTo(video);
    };

    playerInstance.cancelAutoPlayCountdown = () => {
        if (!isCountingDown() && !overlay) {
            return;
        }
        const secondsLeft = Math.max(remainingSeconds, 0);
        teardownCountdown();
        emit('autoPlayCancelled', { remainingSeconds: secondsLeft });
        // Cancel wins the race at zero: autoplay does not trigger (Scenario 11.3).
        playerInstance.displaySuggestedVideos();
    };

    // Reuses the FP-271 click pipeline so the chained configUrl refresh happens exactly as for a manual click
    // (Scenario 2.7). On a load failure it walks to the next item of the batch; if all fail it falls back to the
    // existing end-of-video state (Scenario 11.1).
    function transitionTo(video) {
        if (!video) {
            playerInstance.displaySuggestedVideos();
            return;
        }

        const batch = Array.isArray(playerInstance.suggestedVideosList) ? playerInstance.suggestedVideosList.slice() : [video];
        isTransitioning = true;
        attemptPlay(batch, 0);
    }

    function attemptPlay(batch, index) {
        if (index >= batch.length) {
            console.warn('[FluidPlayer] All suggested videos failed to load; falling back to end-of-video state.');
            isTransitioning = false;
            playerInstance.displaySuggestedVideos();
            return;
        }

        const candidate = batch[index];
        const player = playerInstance.domRef.player;
        let settled = false;

        const onError = () => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            // No retry on the same item — move to the next (Scenario 11.1).
            attemptPlay(batch, index + 1);
        };

        const onPlaying = () => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            isTransitioning = false;
        };

        const cleanup = () => {
            player.removeEventListener('error', onError);
            player.removeEventListener('playing', onPlaying);
        };

        player.addEventListener('error', onError, { once: true });
        player.addEventListener('playing', onPlaying, { once: true });

        try {
            playerInstance.clickSuggestedVideo(candidate.sources, candidate.subtitles, candidate.configUrl);
        } catch (error) {
            onError();
        }
    }

    // --- Accessibility announcements (Scenario 9) ---
    function announce(message) {
        if (!liveRegion) {
            liveRegion = createElement('div', 'fluid_autoplay_live');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('role', 'status');
            playerInstance.domRef.wrapper.appendChild(liveRegion);
        }
        // Clear then set so assistive tech re-announces even if the text is unchanged.
        liveRegion.textContent = '';
        window.setTimeout(() => {
            if (liveRegion) {
                liveRegion.textContent = message;
            }
        }, 50);
    }

    function removeOverlay() {
        if (overlay) {
            overlay.removeEventListener('keydown', onOverlayKeydown);
            overlay.remove();
            overlay = null;
        }
    }

    // Stops the timer, detaches listeners and removes the overlay without triggering a transition or event.
    function teardownCountdown() {
        stopTimer();
        detachVisibilityPause();
        removeOverlay();
        nextVideo = null;
        remainingSeconds = 0;
    }
}
