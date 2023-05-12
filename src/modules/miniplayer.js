export default function (playerInstance) {
    // Module constants
    const MINIMUM_WIDTH = 400;
    const MINIMUM_HEIGHT = 225;

    const DESKTOP_ONLY_MEDIA_QUERY = '(max-width: 768px)';

    const FLUID_PLAYER_WRAPPER_CLASS = 'fluid_mini_player_mode';
    const CLOSE_BUTTON_WRAPPER_CLASS = 'mini-player-close-button-wrapper';
    const CLOSE_BUTTON_CLASS = 'mini-player-close-button';

    const NON_LINEAR_SELECTOR = '.fluid_nonLinear_ad img, .fluid_vpaid_nonlinear_slot_iframe';
    const VPAID_FRAME_SELECTOR = '.fluid_vpaidNonLinear_frame';

    const MINI_PLAYER_TOGGLE_EVENT = 'miniPlayerToggle';

    // Module variables
    let originalWidth = null;
    let originalHeight = null;
    let originalNonLinearWidth = null
    let originalNonLinearHeight = null;
    let isSetup = false;

    /**
     * Toggles the MiniPlayer given that it's enabled. Resets all other display modes.
     *
     * @param {'on'|'off'} [forceToggle]
     */
    function toggleMiniPlayer(forceToggle) {
        playerInstance.debugMessage(`[MiniPlayer] Toggling MiniPlayer, forceToggle: ${forceToggle}`);

        const miniPlayerOptions = playerInstance.displayOptions.layoutControls.miniPlayer;

        if (!miniPlayerOptions.enabled) {
            playerInstance.debugMessage(`[MiniPlayer] Prevent toggle MiniPlayer, it's currently disabled`);
            return;
        }

        // TODO Create mini player styles for mobile
        if (window.matchMedia(DESKTOP_ONLY_MEDIA_QUERY).matches) {
            playerInstance.debugMessage(`[MiniPlayer] Prevent toggle MiniPlayer, desktop-only`);
            return;
        }

        // Important as the player can be in full screen or theater mode
        playerInstance.resetDisplayMode('miniPlayer');

        if (!isSetup) {
            // Setups JIT to avoid extra processing
            setupMiniPlayer();
        }

        if (forceToggle === 'off' || playerInstance.miniPlayerToggledOn) {
            toggleMiniPlayerOff();
        } else if (forceToggle === 'on' || !playerInstance.miniPlayerToggledOn) {
            toggleMiniPlayerOn(miniPlayerOptions.width, miniPlayerOptions.height);
        }
    }

    /**
     * Setups custom Mini Player DOM
     */
    function setupMiniPlayer() {
        const hasCloseButton = Boolean(playerInstance.domRef.player.parentNode.querySelector('.mini-player-close-button'));

        if (!hasCloseButton) {
            const closeButtonWrapper = document.createElement('div');
            closeButtonWrapper.classList.add(CLOSE_BUTTON_WRAPPER_CLASS);

            const closeButton = document.createElement('span');
            closeButton.classList.add(CLOSE_BUTTON_CLASS);
            closeButton.addEventListener('click', () => {
                toggleMiniPlayer('off');

                if (!playerInstance.domRef.player.paused) {
                    playerInstance.playPauseToggle();
                }
            });

            closeButtonWrapper.appendChild(closeButton);
            playerInstance.domRef.player.parentNode.append(closeButtonWrapper);
        }

        isSetup = true;
    }

    /**
     * Toggles the MiniPlayer off and restores previous functionality to player
     */
    function toggleMiniPlayerOff() {
        const videoWrapper = playerInstance.domRef.wrapper;

        videoWrapper.classList.remove(FLUID_PLAYER_WRAPPER_CLASS);
        videoWrapper.style.width = `${originalWidth}px`;
        videoWrapper.style.height = `${originalHeight}px`;

        originalWidth = null;
        originalHeight = null;

        adaptNonLinearSize();
        playerInstance.miniPlayerToggledOn = false;
        emitToggleEvent();
    }

    /**
     * Toggles the MiniPlayer on, stores the original size of the player.
     *
     * @param {number} width
     * @param {number} height
     */
    function toggleMiniPlayerOn(width, height) {
        const videoWrapper = playerInstance.domRef.wrapper;
        const targetWidth = width > MINIMUM_WIDTH ? width : MINIMUM_WIDTH;
        const targetHeight = height > MINIMUM_HEIGHT ? height : MINIMUM_HEIGHT;

        originalWidth = extractSizeFromElement(videoWrapper, 'width', 'clientWidth');
        originalHeight = extractSizeFromElement(videoWrapper, 'height', 'clientHeight');

        videoWrapper.classList.add(FLUID_PLAYER_WRAPPER_CLASS);
        videoWrapper.style.width = `${targetWidth}px`;
        videoWrapper.style.height = `${targetHeight}px`;

        adaptNonLinearSize(targetWidth, targetHeight);
        playerInstance.miniPlayerToggledOn = true;
        emitToggleEvent();
    }

    /**
     * Emits event to Fluid Player Event API
     */
    function emitToggleEvent() {
        playerInstance.domRef.player.dispatchEvent(
            new CustomEvent(MINI_PLAYER_TOGGLE_EVENT, { detail: { isToggledOn: playerInstance.miniPlayerToggledOn } })
        );
    }

    /**
     * Extracts size from an element checking multiple element properties
     *
     * @param {HTMLElement} element
     * @param {'width'|'height'|null} styleProperty
     * @param {'clientWidth'|'clientHeight'|'width'|'height'} htmlProperty
     * @returns {number}
     */
    function extractSizeFromElement(element, styleProperty, htmlProperty) {
        if (styleProperty && element.style[styleProperty] && element.style[styleProperty].match('px')) {
            return parseInt(element.style[styleProperty]);
        } else {
            return String(element[htmlProperty]).match('px') ? parseInt(element[htmlProperty]) : element[htmlProperty];
        }
    }

    /**
     *
     * @param {number} [width]
     * @param {number} [height]
     */
    function adaptNonLinearSize(width, height) {
        /** @type HTMLImageElement|HTMLIFrameElement */
        const nonLinear = playerInstance.domRef.wrapper.querySelector(NON_LINEAR_SELECTOR);
        /** @type HTMLElement */
        const vpaidFrame = playerInstance.domRef.wrapper.querySelector(VPAID_FRAME_SELECTOR);

        if (!nonLinear) return;

        const nonLinearWidth = extractSizeFromElement(nonLinear, null, 'width');
        const nonLinearHeight = extractSizeFromElement(nonLinear, null, 'height');

        if (originalNonLinearWidth && originalNonLinearHeight) {
            nonLinear.width = originalNonLinearWidth;
            nonLinear.height = originalNonLinearHeight;

            if (vpaidFrame) {
                vpaidFrame.style.width = `${originalNonLinearWidth}px`;
                vpaidFrame.style.height = `${originalNonLinearHeight}px`;
            }

            originalNonLinearWidth = originalNonLinearHeight = null;
        } else if (nonLinearWidth > width || nonLinearHeight > height) {
            const targetRatio = (width - 32) / nonLinearWidth;

            originalNonLinearWidth = nonLinearWidth;
            originalNonLinearHeight = nonLinearHeight;

            nonLinear.width = Math.round(nonLinearWidth * targetRatio);
            nonLinear.height = Math.round(nonLinearHeight * targetRatio);

            if (vpaidFrame) {
                vpaidFrame.style.width = `${Math.round(nonLinearWidth * targetRatio)}px`;
                vpaidFrame.style.height = `${Math.round(nonLinearHeight * targetRatio)}px`;
            }
        }
    }

    // Exposes public module functions
    playerInstance.toggleMiniPlayer = toggleMiniPlayer;
}
