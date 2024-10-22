export default function (playerInstance) {
    // Module constants
    const MINIMUM_WIDTH = 400; // Pixels
    const MINIMUM_HEIGHT = 225; // Pixels
    const MINIMUM_WIDTH_MOBILE = 40; // Percentage
    const TOGGLE_BY_VISIBILITY_DETECTION_RATE = 1000 / 60; // ms

    const DISABLE_MINI_PLAYER_MOBILE_ANIMATION_CLAMP = 50;
    const DISABLE_MINI_PLAYER_MOBILE_ANIMATION_DEADZONE = 5;

    const DESKTOP_ONLY_MEDIA_QUERY = '(max-width: 768px)';

    const FLUID_PLAYER_WRAPPER_CLASS = 'fluid_mini_player_mode';
    const CLOSE_BUTTON_WRAPPER_CLASS = 'mini-player-close-button-wrapper';
    const CLOSE_BUTTON_CLASS = 'mini-player-close-button';
    const PLACEHOLDER_CLASS = 'fluidplayer-miniplayer-player-placeholder'
    const DISABLE_MINI_PLAYER_MOBILE_CLASS = 'disable-mini-player-mobile';

    const LINEAR_CLICKTHROUGH_SELECTOR = '.vast_clickthrough_layer';
    const NON_LINEAR_SELECTOR = '.fluid_nonLinear_ad img, .fluid_vpaid_nonlinear_slot_iframe';
    const VPAID_FRAME_SELECTOR = '.fluid_vpaidNonLinear_frame';

    const MINI_PLAYER_TOGGLE_EVENT = 'miniPlayerToggle';

    // Module variables
    let originalWidth = null;
    let originalHeight = null;
    let originalNonLinearWidth = null
    let originalNonLinearHeight = null;
    let isSetup = false;
    /** @type null | Element */
    let placeholderElement = null;
    let isMobile = false;
    /** @type boolean */
    let toggleByVisibilityControl = false;

    /**
     * Toggles the MiniPlayer given that it's enabled. Resets all other display modes.
     *
     * @param {'on'|'off'} [forceToggle]
     * @param {boolean} manualToggle
     */
    function toggleMiniPlayer(forceToggle, manualToggle = false) {
        playerInstance.debugMessage(`[MiniPlayer] Toggling MiniPlayer, forceToggle: ${forceToggle}`);

        const miniPlayerOptions = playerInstance.displayOptions.layoutControls.miniPlayer;

        if (!miniPlayerOptions.enabled) {
            playerInstance.debugMessage(`[MiniPlayer] Prevent toggle MiniPlayer, it's currently disabled`);
            return;
        }

        if ((forceToggle === 'on' && playerInstance.miniPlayerToggledOn) || (forceToggle === 'off' && !playerInstance.miniPlayerToggledOn)) {
            playerInstance.debugMessage(`[MiniPlayer] Can't force toggle Mini Player to it's same state`);
            return;
        }

        if (manualToggle) {
            toggleScreenDetection();
        }

        if (window.matchMedia(DESKTOP_ONLY_MEDIA_QUERY).matches) {
            isMobile = true;
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
            toggleMiniPlayerOn(miniPlayerOptions.width, miniPlayerOptions.height, miniPlayerOptions.widthMobile, miniPlayerOptions.position);
        }
    }

    /**
     * Setups custom Mini Player DOM
     */
    function setupMiniPlayer() {
        const hasCloseButton = Boolean(playerInstance.domRef.player.parentNode.querySelector(`.${CLOSE_BUTTON_CLASS}`));

        if (!hasCloseButton) {
            const closeButtonWrapper = document.createElement('div');
            closeButtonWrapper.classList.add(CLOSE_BUTTON_WRAPPER_CLASS);

            const closeButton = document.createElement('span');
            closeButton.classList.add(CLOSE_BUTTON_CLASS);
            closeButton.addEventListener('click', () => {
                toggleMiniPlayer('off', true);

                if (!playerInstance.domRef.player.paused) {
                    playerInstance.playPauseToggle();
                }
            });

            closeButtonWrapper.appendChild(closeButton);
            playerInstance.domRef.player.parentNode.append(closeButtonWrapper);
        }

        if (isMobile) {
            setupMobile();
        }

        isSetup = true;
    }

    /**
     * Toggles the MiniPlayer off and restores previous functionality to player
     */
    function toggleMiniPlayerOff() {
        const videoWrapper = playerInstance.domRef.wrapper;

        removePlayerPlaceholder();

        videoWrapper.classList.remove(FLUID_PLAYER_WRAPPER_CLASS);
        videoWrapper.style.width = `${originalWidth}px`;
        videoWrapper.style.height = `${originalHeight}px`;

        originalWidth = null;
        originalHeight = null;

        adaptNonLinearSize();
        adaptLinearSize();
        playerInstance.miniPlayerToggledOn = false;
        emitToggleEvent();
    }

    /**
     * Toggles the MiniPlayer on, stores the original size of the player.
     *
     * @param {number} width
     * @param {number} height
     * @param {number} mobileWidth
     * @param {'top left'|'top right'|'bottom left'|'bottom right'} position
     */
    function toggleMiniPlayerOn(width, height, mobileWidth, position) {
        const videoWrapper = playerInstance.domRef.wrapper;
        const targetWidth = width > MINIMUM_WIDTH ? width : MINIMUM_WIDTH;
        const targetHeight = height > MINIMUM_HEIGHT ? height : MINIMUM_HEIGHT;
        const targetMobileWidth = mobileWidth > MINIMUM_WIDTH_MOBILE ? mobileWidth : MINIMUM_WIDTH_MOBILE;

        originalWidth = extractSizeFromElement(videoWrapper, 'width', 'clientWidth');
        originalHeight = extractSizeFromElement(videoWrapper, 'height', 'clientHeight');

        videoWrapper.classList.add(
            FLUID_PLAYER_WRAPPER_CLASS,
            `${FLUID_PLAYER_WRAPPER_CLASS}--${position.trim().replace(/\s/, '-')}`
        );

        if (!isMobile) {
            videoWrapper.style.width = `${targetWidth}px`;
            videoWrapper.style.height = `${targetHeight}px`;
        } else {
            videoWrapper.style.width = `${targetMobileWidth}vw`;
            videoWrapper.style.height = `auto`;
            videoWrapper.style.aspectRatio = `16 / 9`;
        }

        createPlayerPlaceholder(originalWidth, originalHeight);
        adaptNonLinearSize(targetWidth, targetHeight, targetMobileWidth);
        adaptLinearSize();
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
     * Adapts NonLinear size (if present) to fit MiniPlayer view
     *
     * @param {number} [width]
     * @param {number} [height]
     * @param {number} [mobileWidth]
     */
    function adaptNonLinearSize(width, height, mobileWidth) {
        /** @type HTMLImageElement|HTMLIFrameElement */
        const nonLinear = playerInstance.domRef.wrapper.querySelector(NON_LINEAR_SELECTOR);
        /** @type HTMLElement */
        const vpaidFrame = playerInstance.domRef.wrapper.querySelector(VPAID_FRAME_SELECTOR);

        if (!nonLinear) return;

        if (isMobile) {
            width = window.innerWidth * mobileWidth / 100; // Transforms vw to px
        }

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
            const targetRatio = (width - (isMobile ? 4 : 32)) / nonLinearWidth;

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

    /**
     * Adapts Linear size (if present) to fit MiniPlayer view
     */
    function adaptLinearSize() {
        const clickTroughLayer = playerInstance.domRef.wrapper.querySelector(LINEAR_CLICKTHROUGH_SELECTOR);

        if (clickTroughLayer) {
            clickTroughLayer.style.width = `${playerInstance.domRef.player.offsetWidth}px`;
            clickTroughLayer.style.height = `${playerInstance.domRef.player.offsetHeight}px`;
        }
    }

    /**
     * Setups mobile disable element
     */
    function setupMobile() {
        const disableMiniPlayerMobile = document.createElement('div');
        let animationAmount = 0;
        let startTimestamp = 0;
        let startScreenX = 0;
        let hasTriggeredAnimation;
        disableMiniPlayerMobile.classList.add(DISABLE_MINI_PLAYER_MOBILE_CLASS);
        const closeButton = document.createElement('span');
        closeButton.classList.add(CLOSE_BUTTON_CLASS);
        disableMiniPlayerMobile.appendChild(closeButton); 

        disableMiniPlayerMobile.ontouchstart = event => {
            hasTriggeredAnimation = false;
            startTimestamp = event.timeStamp;
            startScreenX = event.changedTouches[0].screenX;
            event.preventDefault();
        }

        disableMiniPlayerMobile.ontouchmove = event => {
            animationAmount = Math.min(
                Math.max(
                    startScreenX - event.changedTouches[0].screenX,
                    DISABLE_MINI_PLAYER_MOBILE_ANIMATION_CLAMP * -1),
                DISABLE_MINI_PLAYER_MOBILE_ANIMATION_CLAMP
            );

            if (Math.abs(animationAmount) > DISABLE_MINI_PLAYER_MOBILE_ANIMATION_DEADZONE) {
                // Moves the element the same amount as the touch event moved
                playerInstance.domRef.wrapper.style.transform = `translateX(${animationAmount * -1}px)`;
                hasTriggeredAnimation = true;
            } else {
                playerInstance.domRef.wrapper.style.transform = `translateX(0px)`
            }
        }

        disableMiniPlayerMobile.ontouchend = event => {
            if (Math.abs(animationAmount) > DISABLE_MINI_PLAYER_MOBILE_ANIMATION_DEADZONE) {
                // Scroll X behaviour - Disable mini player and pauses video
                toggleMiniPlayer('off', true);

                if (!playerInstance.domRef.player.paused) {
                    playerInstance.playPauseToggle();
                }
                event.preventDefault();
            } else if (!hasTriggeredAnimation) {
                // Tap behaviour - Disable mini player and moves screen to video
                toggleMiniPlayer('off', true);
                setTimeout(() => {
                    playerInstance.domRef.wrapper.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                })
            }

            animationAmount = 0;
            playerInstance.domRef.wrapper.style.transform = ``;
        }

        // Fallback for when there is no touch event
        disableMiniPlayerMobile.onmouseup = () => toggleMiniPlayer('off', true)

        playerInstance.domRef.wrapper.insertBefore(disableMiniPlayerMobile, playerInstance.domRef.player.nextSibling);
    }

    /**
     * Creates a placeholder element in place where the video player was
     *
     * @param {number} placeholderWidth
     * @param {number} placeholderHeight
     */
    function createPlayerPlaceholder(placeholderWidth, placeholderHeight) {
        placeholderElement = document.createElement('div');
        placeholderElement.classList.add(PLACEHOLDER_CLASS);
        placeholderElement.style.height = `${placeholderHeight}px`;
        placeholderElement.style.width = `${placeholderWidth}px`;
        placeholderElement.innerText = playerInstance.displayOptions.layoutControls.miniPlayer.placeholderText || '';
        placeholderElement.onclick = () => toggleMiniPlayer('off', true);

        playerInstance.domRef.wrapper.parentElement.insertBefore(placeholderElement, playerInstance.domRef.wrapper);
    }

    /**
     * Removes the placeholder that was in place where video player was
     */
    function removePlayerPlaceholder() {
        playerInstance.domRef.wrapper.parentElement.removeChild(placeholderElement);
        placeholderElement = null;
    }

    /**
     * Toggles auto toggle for mini player
     */
    function toggleScreenDetection() {
        const autoToggle = playerInstance.displayOptions.layoutControls.miniPlayer.autoToggle;

        if (toggleByVisibilityControl || !autoToggle) {
            document.removeEventListener('scroll', toggleMiniPlayerByVisibility);
            return;
        }

        toggleByVisibilityControl = true;
        document.addEventListener('scroll', toggleMiniPlayerByVisibility, { passive: true });
    }

    /**
     * Checks for player visibility and toggles mini player based on it
     */
    const toggleMiniPlayerByVisibility = playerInstance.throttle(function toggleMiniPlayerByVisibility() {
        if (playerInstance.domRef.player.paused) {
            return;
        }

        const isPlayerVisible = playerInstance.isElementVisible(playerInstance.domRef.player);
        const isPlaceholderVisible = playerInstance.isElementVisible(playerInstance.domRef.wrapper.querySelector(`.${PLACEHOLDER_CLASS}`));

        if (!isPlayerVisible && !playerInstance.miniPlayerToggledOn) {
            toggleMiniPlayer('on');
        } else if (isPlaceholderVisible && playerInstance.miniPlayerToggledOn) {
            toggleMiniPlayer('off');
        }
    }, TOGGLE_BY_VISIBILITY_DETECTION_RATE);

    // Exposes public module functions
    playerInstance.toggleMiniPlayer = toggleMiniPlayer;
    playerInstance.toggleMiniPlayerScreenDetection = toggleScreenDetection;
}
