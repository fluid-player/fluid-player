'use strict';

// Player modules
import VPAIDModule from './modules/vpaid';
import VASTModule from './modules/vast';
import CardboardModule from './modules/cardboard';
import SubtitleModule from './modules/subtitles';
import TimelineModule from './modules/timeline';
import AdSupportModule from './modules/adsupport';
import StreamingModule from './modules/streaming';
import UtilsModule from './modules/utils'

const FP_MODULES = [
    VPAIDModule,
    VASTModule,
    CardboardModule,
    SubtitleModule,
    TimelineModule,
    AdSupportModule,
    StreamingModule,
    UtilsModule
];

// Determine build mode
// noinspection JSUnresolvedVariable
const FP_DEVELOPMENT_MODE = typeof FP_ENV !== 'undefined' && FP_ENV === 'development';

// Are we running in debug mode?
// noinspection JSUnresolvedVariable
const FP_RUNTIME_DEBUG = typeof FP_DEBUG !== 'undefined' && FP_DEBUG === true;

let playerInstances = 0;

const fluidPlayerClass = function () {
    // "self" always points to current instance of the player within the scope of the instance
    // This should help readability and context awareness slightly...
    const self = this;

    self.domRef = {
        player: null
    };

    // noinspection JSUnresolvedVariable
    self.version = typeof FP_BUILD_VERSION !== 'undefined' ? FP_BUILD_VERSION : '';
    // noinspection JSUnresolvedVariable
    self.homepage = typeof FP_HOMEPAGE !== 'undefined'
        ? FP_HOMEPAGE + '/?utm_source=player&utm_medium=context_menu&utm_campaign=organic'
        : '';
    self.destructors = [];

    self.init = (playerTarget, options) => {
        // Install player modules and features
        const moduleOptions = {
            development: FP_DEVELOPMENT_MODE,
            debug: FP_RUNTIME_DEBUG,
        };

        for (const playerModule of FP_MODULES) {
            playerModule(self, moduleOptions);
        }

        let playerNode;
        if (playerTarget instanceof HTMLVideoElement) {
            playerNode = playerTarget;

            // Automatically assign ID if none exists
            if (!playerTarget.id) {
                playerTarget.id = 'fluid_player_instance_' + (playerInstances++).toString();
            }
        } else if (typeof playerTarget === 'string' || playerTarget instanceof String) {
            playerNode = document.getElementById(playerTarget);
        } else {
            throw 'Invalid initializer - player target must be HTMLVideoElement or ID';
        }

        if (!playerNode) {
            throw 'Could not find a HTML node to attach to for target ' + playerTarget + '"';
        }

        playerNode.setAttribute('playsinline', '');
        playerNode.setAttribute('webkit-playsinline', '');

        self.domRef.player = playerNode;
        self.vrROTATION_POSITION = 0.1;
        self.vrROTATION_SPEED = 80;
        self.vrMode = false;
        self.vrPanorama = null;
        self.vrViewer = null;
        self.vpaidTimer = null;
        self.vpaidAdUnit = null;
        self.vastOptions = null;
        /**
         * @deprecated Nothing should RELY on this. An internal ID generator
         * should be used where absolutely necessary and DOM objects under FP control
         * MUST be referenced in domRef.
         */
        self.videoPlayerId = playerNode.id;
        self.originalSrc = self.getCurrentSrc();
        self.isCurrentlyPlayingAd = false;
        self.recentWaiting = false;
        self.latestVolume = 1;
        self.currentVideoDuration = 0;
        self.firstPlayLaunched = false;
        self.suppressClickthrough = false;
        self.timelinePreviewData = [];
        self.mainVideoCurrentTime = 0;
        self.mainVideoDuration = 0;
        self.isTimer = false;
        self.timer = null;
        self.timerPool = {};
        self.adList = {};
        self.adPool = {};
        self.adGroupedByRolls = {};
        self.onPauseRollAdPods = [];
        self.currentOnPauseRollAd = '';
        self.preRollAdsResolved = false;
        self.preRollAdPods = [];
        self.preRollAdPodsLength = 0;
        self.preRollVastResolved = 0;
        self.temporaryAdPods = [];
        self.availableRolls = ['preRoll', 'midRoll', 'postRoll', 'onPauseRoll'];
        self.supportedNonLinearAd = ['300x250', '468x60', '728x90'];
        self.autoplayAfterAd = true;
        self.nonLinearDuration = 15;
        self.supportedStaticTypes = ['image/gif', 'image/jpeg', 'image/png'];
        self.inactivityTimeout = null;
        self.isUserActive = null;
        self.nonLinearVerticalAlign = 'bottom';
        self.vpaidNonLinearCloseButton = true;
        self.showTimeOnHover = true;
        self.initialAnimationSet = true;
        self.theatreMode = false;
        self.theatreModeAdvanced = false;
        self.fullscreenMode = false;
        self.originalWidth = playerNode.offsetWidth;
        self.originalHeight = playerNode.offsetHeight;
        self.dashPlayer = false;
        self.hlsPlayer = false;
        self.dashScriptLoaded = false;
        self.hlsScriptLoaded = false;
        self.isPlayingMedia = false;
        self.isSwitchingSource = false;
        self.isLoading = false;
        self.isInIframe = self.inIframe();
        self.mainVideoReadyState = false;
        self.xmlCollection = [];
        self.inLineFound = null;
        self.fluidStorage = {};
        self.fluidPseudoPause = false;
        self.mobileInfo = self.getMobileOs();
        self.events = {};

        //Default options
        self.displayOptions = {
            layoutControls: {
                mediaType: self.getCurrentSrcType(),
                primaryColor: false,
                posterImage: false,
                posterImageSize: 'contain',
                adProgressColor: '#f9d300',
                playButtonShowing: true,
                playPauseAnimation: true,
                closeButtonCaption: 'Close', // Remove?
                fillToContainer: false,
                autoPlay: false,
                preload: 'auto',
                mute: false,
                loop: null,
                keyboardControl: true,
                allowDownload: false,
                playbackRateEnabled: false,
                subtitlesEnabled: false,
                showCardBoardView: false,
                showCardBoardJoystick: false,
                allowTheatre: true,
                doubleclickFullscreen: true,
                theatreSettings: {
                    width: '100%',
                    height: '60%',
                    marginTop: 0,
                    horizontalAlign: 'center',
                    keepPosition: false
                },
                theatreAdvanced: false,
                title: null,
                logo: {
                    imageUrl: null,
                    position: 'top left',
                    clickUrl: null,
                    opacity: 1,
                    mouseOverImageUrl: null,
                    imageMargin: '2px',
                    hideWithControls: false,
                    showOverAds: false
                },
                controlBar: {
                    autoHide: false,
                    autoHideTimeout: 3,
                    animated: true
                },
                timelinePreview: {
                    spriteImage: false,
                    spriteRelativePath: false
                },
                htmlOnPauseBlock: {
                    html: null,
                    height: null,
                    width: null
                },
                layout: 'default', //options: 'default', '<custom>'
                playerInitCallback: (function () {
                }),
                persistentSettings: {
                    volume: true,
                    quality: true,
                    speed: true,
                    theatre: true
                },
                controlForwardBackward: {
                    show: false
                },
                contextMenu: {
                    controls: true,
                    links: []
                },
            },
            vastOptions: {
                adList: {},
                skipButtonCaption: 'Skip ad in [seconds]',
                skipButtonClickCaption: 'Skip Ad <span class="skip_button_icon"></span>',
                adText: null,
                adTextPosition: 'top left',
                adCTAText: 'Visit now!',
                adCTATextPosition: 'bottom right',
                adClickable: true,
                vastTimeout: 5000,
                showProgressbarMarkers: false,
                allowVPAID: false,
                showPlayButton: false,
                maxAllowedVastTagRedirects: 3,
                vpaidTimeout: 3000,

                vastAdvanced: {
                    vastLoadedCallback: (function () {
                    }),
                    noVastVideoCallback: (function () {
                    }),
                    vastVideoSkippedCallback: (function () {
                    }),
                    vastVideoEndedCallback: (function () {
                    })
                }
            },
            captions: {
                play: 'Play',
                pause: 'Pause',
                mute: 'Mute',
                unmute: 'Unmute',
                fullscreen: 'Fullscreen',
                subtitles: 'Subtitles',
                exitFullscreen: 'Exit Fullscreen',
            },
            debug: FP_RUNTIME_DEBUG,
            modules: {
                configureHls: (options) => {
                    return options;
                },
                onBeforeInitHls: (hls) => {
                },
                onAfterInitHls: (hls) => {
                },
                configureDash: (options) => {
                    return options;
                },
                onBeforeInitDash: (dash) => {
                },
                onAfterInitDash: (dash) => {
                }
            },
            onBeforeXMLHttpRequestOpen: (request) => {
            },
            onBeforeXMLHttpRequest: (request) => {
                if (FP_RUNTIME_DEBUG || FP_DEVELOPMENT_MODE) {
                    console.debug('[FP_DEBUG] Request made', request);
                }
            }
        };

        if (!!options.hlsjsConfig) {
            console.error('[FP_ERROR] player option hlsjsConfig is removed and has no effect. ' +
                'Use module callbacks instead!')
        }

        // Overriding the default options
        for (let key in options) {
            if (!options.hasOwnProperty(key)) {
                continue;
            }
            if (typeof options[key] == "object") {
                for (let subKey in options[key]) {
                    if (!options[key].hasOwnProperty(subKey)) {
                        continue;
                    }
                    self.displayOptions[key][subKey] = options[key][subKey];
                }
            } else {
                self.displayOptions[key] = options[key];
            }
        }

        self.domRef.wrapper = self.setupPlayerWrapper();

        playerNode.addEventListener('webkitfullscreenchange', self.recalculateAdDimensions);
        playerNode.addEventListener('fullscreenchange', self.recalculateAdDimensions);
        playerNode.addEventListener('waiting', self.onRecentWaiting);
        playerNode.addEventListener('pause', self.onFluidPlayerPause);
        playerNode.addEventListener('loadedmetadata', self.mainVideoReady);
        playerNode.addEventListener('error', self.onErrorDetection);
        playerNode.addEventListener('ended', self.onMainVideoEnded);
        playerNode.addEventListener('durationchange', () => {
            self.currentVideoDuration = self.getCurrentVideoDuration();
        });

        if (self.displayOptions.layoutControls.showCardBoardView) {
            // This fixes cross origin errors on three.js
            playerNode.setAttribute('crossOrigin', 'anonymous');
        }

        //Manually load the video duration if the video was loaded before adding the event listener
        self.currentVideoDuration = self.getCurrentVideoDuration();

        if (isNaN(self.currentVideoDuration) || !isFinite(self.currentVideoDuration)) {
            self.currentVideoDuration = 0;
        }

        self.setLayout();

        //Set the volume control state
        self.latestVolume = playerNode.volume;

        // Set the default animation setting
        self.initialAnimationSet = self.displayOptions.layoutControls.playPauseAnimation;

        //Set the custom fullscreen behaviour
        self.handleFullscreen();

        self.initLogo();

        self.initTitle();

        self.initMute();

        self.initLoop();

        self.displayOptions.layoutControls.playerInitCallback();

        self.createVideoSourceSwitch();

        self.createSubtitles();

        self.createCardboard();

        self.userActivityChecker();

        self.setVastList();

        self.setPersistentSettings();

        // DO NOT initialize streamers if there are pre-rolls. It will break the streamers!
        // Streamers will re-initialize once ad has been shown.
        const preRolls = self.findRoll('preRoll');
        if (!preRolls || 0 === preRolls.length) {
            self.initialiseStreamers();
        }

        const _play_videoPlayer = playerNode.play;

        playerNode.play = function () {
            let promise = null;

            if (self.displayOptions.layoutControls.showCardBoardView) {
                if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                    DeviceOrientationEvent.requestPermission()
                        .then(function (response) {
                            if (response === 'granted') {
                                self.debugMessage('DeviceOrientationEvent permission granted!');
                            }
                        })
                        .catch(console.error);
                }
            }

            try {
                promise = _play_videoPlayer.apply(this, arguments);

                if (promise !== undefined && promise !== null) {
                    promise.then(() => {
                        self.isPlayingMedia = true;
                        clearTimeout(self.promiseTimeout);
                    }).catch(error => {
                        console.error('[FP_ERROR] Playback error', error);
                        const isAbortError = (typeof error.name !== 'undefined' && error.name === 'AbortError');
                        // Ignore abort errors which caused for example Safari or autoplay functions
                        // (example: interrupted by a new load request)
                        // (example: interrupted by a new load request)
                        if (isAbortError) {
                            // Ignore AbortError error reporting
                        } else {
                            self.announceLocalError(202, 'Failed to play video.');
                        }

                        clearTimeout(self.promiseTimeout);
                    });

                    self.promiseTimeout = setTimeout(function () {
                        if (self.isPlayingMedia === false) {
                            self.announceLocalError(204, '[FP_ERROR] Timeout error. Failed to play video?');
                        }
                    }, 5000);

                }

                return promise;
            } catch (error) {
                console.error('[FP_ERROR] Playback error', error);
                self.announceLocalError(201, 'Failed to play video.');
            }
        };

        const videoPauseOriginal = playerNode.pause;
        playerNode.pause = function () {
            if (self.isPlayingMedia === true) {
                self.isPlayingMedia = false;
                return videoPauseOriginal.apply(this, arguments);
            }

            // just in case
            if (self.isCurrentlyPlayingVideo(self.domRef.player)) {
                try {
                    self.isPlayingMedia = false;
                    return videoPauseOriginal.apply(this, arguments);
                } catch (e) {
                    self.announceLocalError(203, 'Failed to play video.');
                }
            }
        };

        if (!!self.displayOptions.layoutControls.autoPlay && !self.dashScriptLoaded && !self.hlsScriptLoaded) {
            //There is known issue with Safari 11+, will prevent autoPlay, so we wont try
            const browserVersion = self.getBrowserVersion();

            if ('Safari' === browserVersion.browserName) {
                return;
            }

            playerNode.play();
        }

        const videoWrapper = document.getElementById('fluid_video_wrapper_' + playerNode.id);

        if (!self.mobileInfo.userOs) {
            videoWrapper.addEventListener('mouseleave', self.handleMouseleave, false);
            videoWrapper.addEventListener('mouseenter', self.showControlBar, false);
            videoWrapper.addEventListener('mouseenter', self.showTitle, false);
        } else {
            //On mobile mouseleave behavior does not make sense, so it's better to keep controls, once the playback starts
            //Autohide behavior on timer is a separate functionality
            self.hideControlBar();
            videoWrapper.addEventListener('touchstart', self.showControlBar, false);
        }

        //Keyboard Controls
        if (self.displayOptions.layoutControls.keyboardControl) {
            self.keyboardControl();
        }

        if (self.displayOptions.layoutControls.controlBar.autoHide) {
            self.linkControlBarUserActivity();
        }

        // Hide the captions on init if user added subtitles track.
        // We are taking captions track kind of as metadata
        try {
            if (!!self.domRef.player.textTracks) {
                for (const textTrack of self.domRef.player.textTracks) {
                    textTrack.mode = 'hidden';
                }
            }
        } catch (_ignored) {
        }
    };

    self.getCurrentVideoDuration = () => {
        if (self.domRef.player) {
            return self.domRef.player.duration;
        }

        return 0;
    };

    self.toggleLoader = (showLoader) => {
        self.isLoading = !!showLoader;

        const loaderDiv = document.getElementById('vast_video_loading_' + self.videoPlayerId);

        loaderDiv.style.display = showLoader ? 'table' : 'none';
    };

    self.sendRequest = (url, withCredentials, timeout, functionReadyStateChange) => {
        const xmlHttpReq = new XMLHttpRequest();

        xmlHttpReq.onreadystatechange = functionReadyStateChange;

        self.displayOptions.onBeforeXMLHttpRequestOpen(xmlHttpReq);

        xmlHttpReq.open('GET', url, true);
        xmlHttpReq.withCredentials = withCredentials;
        xmlHttpReq.timeout = timeout;

        self.displayOptions.onBeforeXMLHttpRequest(xmlHttpReq);

        xmlHttpReq.send();
    };

    // TODO: rename
    self.announceLocalError = (code, msg) => {
        const parsedCode = typeof (code) !== 'undefined' ? parseInt(code) : 900;
        let message = '[Error] (' + parsedCode + '): ';
        message += !msg ? 'Failed to load Vast' : msg;
        console.warn(message);
    };

    // TODO: move this somewhere else and refactor
    self.debugMessage = (msg) => {
        if (self.displayOptions.debug) {
            console.log(msg);
        }
    };

    self.onMainVideoEnded = (event) => {
        self.debugMessage('onMainVideoEnded is called');

        if (self.isCurrentlyPlayingAd && self.autoplayAfterAd) {  // It may be in-stream ending, and if it's not postroll then we don't execute anything
            return;
        }

        //we can remove timer as no more ad will be shown
        if (Math.floor(self.getCurrentTime()) >= Math.floor(self.mainVideoDuration)) {

            // play pre-roll ad
            // sometime pre-roll ad will be missed because we are clearing the timer
            self.adKeytimePlay(Math.floor(self.mainVideoDuration));

            clearInterval(self.timer);
        }

        if (!!self.displayOptions.layoutControls.loop) {
            self.switchToMainVideo();
            self.playPauseToggle();
        }
    };

    self.getCurrentTime = () => {
        return self.isCurrentlyPlayingAd
            ? self.mainVideoCurrentTime
            : self.domRef.player.currentTime;
    };

    /**
     * Gets the src value of the first source element of the video tag.
     *
     * @returns string|null
     */
    self.getCurrentSrc = () => {
        const sources = self.domRef.player.getElementsByTagName('source');

        if (sources.length) {
            return sources[0].getAttribute('src');
        }

        return null;
    };

    /**
     * Src types required for streaming elements
     */
    self.getCurrentSrcType = () => {
        const sources = self.domRef.player.getElementsByTagName('source');

        if (!sources.length) {
            return null;
        }

        for (let i = 0; i < sources.length; i++) {
            if (sources[i].getAttribute('src') === self.originalSrc) {
                return sources[i].getAttribute('type').toLowerCase();
            }
        }

        return null;
    };

    self.onRecentWaiting = () => {
        self.recentWaiting = true;

        setTimeout(function () {
            self.recentWaiting = false;
        }, 1000);
    };

    /**
     * Dispatches a custom pause event which is not present when seeking.
     */
    self.onFluidPlayerPause = () => {
        setTimeout(function () {
            if (self.recentWaiting) {
                return;
            }

            const event = document.createEvent('CustomEvent');
            event.initEvent('fluidplayerpause', false, true);
            self.domRef.player.dispatchEvent(event);
        }, 100);
    };

    self.checkShouldDisplayVolumeBar = () => {
        return 'iOS' !== self.getMobileOs().userOs;
    };

    self.generateCustomControlTags = (options) => {
        const controls = {};

        // Loader
        controls.loader = document.createElement('div');
        controls.loader.className = 'vast_video_loading';
        controls.loader.id = 'vast_video_loading_' + self.videoPlayerId;
        controls.loader.style.display = 'none';

        // Root element
        controls.root = document.createElement('div');
        controls.root.className = 'fluid_controls_container';
        controls.root.id = self.videoPlayerId + '_fluid_controls_container';

        if (!options.displayVolumeBar) {
            controls.root.className = controls.root.className + ' no_volume_bar';
        }

        if (options.controlForwardBackward) {
            controls.root.className = controls.root.className + ' skip_controls';
        }

        // Left container
        controls.leftContainer = document.createElement('div');
        controls.leftContainer.className = 'fluid_controls_left';
        controls.root.appendChild(controls.leftContainer);

        // Left container -> Play/Pause
        controls.playPause = document.createElement('div');
        controls.playPause.className = 'fluid_button fluid_button_play fluid_control_playpause';
        controls.playPause.id = self.videoPlayerId + '_fluid_control_playpause';
        controls.leftContainer.appendChild(controls.playPause);

        if (options.controlForwardBackward) {
            // Left container -> Skip backwards
            controls.skipBack = document.createElement('div');
            controls.skipBack.className = 'fluid_button fluid_button_skip_back';
            controls.skipBack.id = self.videoPlayerId + '_fluid_control_skip_back';
            controls.leftContainer.appendChild(controls.skipBack);

            // Left container -> Skip forward
            controls.skipForward = document.createElement('div');
            controls.skipForward.className = 'fluid_button fluid_button_skip_forward';
            controls.skipForward.id = self.videoPlayerId + '_fluid_control_skip_forward';
            controls.leftContainer.appendChild(controls.skipForward);
        }

        // Progress container
        controls.progressContainer = document.createElement('div');
        controls.progressContainer.className = 'fluid_controls_progress_container fluid_slider';
        controls.progressContainer.id = self.videoPlayerId + '_fluid_controls_progress_container';
        controls.root.appendChild(controls.progressContainer);

        // Progress container -> Progress wrapper
        controls.progressWrapper = document.createElement('div');
        controls.progressWrapper.className = 'fluid_controls_progress';
        controls.progressContainer.appendChild(controls.progressWrapper);

        // Progress container -> Progress wrapper -> Current progress
        controls.progressCurrent = document.createElement('div');
        controls.progressCurrent.className = 'fluid_controls_currentprogress';
        controls.progressCurrent.id = self.videoPlayerId + '_vast_control_currentprogress';
        controls.progressCurrent.style.backgroundColor = options.primaryColor;
        controls.progressWrapper.appendChild(controls.progressCurrent);

        // Progress container -> Progress wrapper -> Current progress -> Marker
        controls.progress_current_marker = document.createElement('div');
        controls.progress_current_marker.className = 'fluid_controls_currentpos';
        controls.progress_current_marker.id = self.videoPlayerId + '_vast_control_currentpos';
        controls.progressCurrent.appendChild(controls.progress_current_marker);

        // Progress container -> Buffered indicator
        controls.bufferedIndicator = document.createElement('div');
        controls.bufferedIndicator.className = 'fluid_controls_buffered';
        controls.bufferedIndicator.id = self.videoPlayerId + '_buffered_amount';
        controls.progressContainer.appendChild(controls.bufferedIndicator);

        // Progress container -> Ad markers
        controls.adMarkers = document.createElement('div');
        controls.adMarkers.className = 'fluid_controls_ad_markers_holder';
        controls.adMarkers.id = self.videoPlayerId + '_ad_markers_holder';
        controls.progressContainer.appendChild(controls.adMarkers);

        // Right container
        controls.rightContainer = document.createElement('div');
        controls.rightContainer.className = 'fluid_controls_right';
        controls.root.appendChild(controls.rightContainer);

        // Right container -> Fullscreen
        controls.fullscreen = document.createElement('div');
        controls.fullscreen.id = self.videoPlayerId + '_fluid_control_fullscreen';
        controls.fullscreen.className = 'fluid_button fluid_control_fullscreen fluid_button_fullscreen';
        controls.rightContainer.appendChild(controls.fullscreen);

        // Right container -> Theatre
        controls.theatre = document.createElement('div');
        controls.theatre.id = self.videoPlayerId + '_fluid_control_theatre';
        controls.theatre.className = 'fluid_button fluid_control_theatre fluid_button_theatre';
        controls.rightContainer.appendChild(controls.theatre);

        // Right container -> Cardboard
        controls.cardboard = document.createElement('div');
        controls.cardboard.id = self.videoPlayerId + '_fluid_control_cardboard';
        controls.cardboard.className = 'fluid_button fluid_control_cardboard fluid_button_cardboard';
        controls.rightContainer.appendChild(controls.cardboard);

        // Right container -> Subtitles
        controls.subtitles = document.createElement('div');
        controls.subtitles.id = self.videoPlayerId + '_fluid_control_subtitles';
        controls.subtitles.className = 'fluid_button fluid_button_subtitles';
        controls.rightContainer.appendChild(controls.subtitles);

        // Right container -> Video source
        controls.videoSource = document.createElement('div');
        controls.videoSource.id = self.videoPlayerId + '_fluid_control_video_source';
        controls.videoSource.className = 'fluid_button fluid_button_video_source';
        controls.rightContainer.appendChild(controls.videoSource);

        // Right container -> Playback rate
        controls.playbackRate = document.createElement('div');
        controls.playbackRate.id = self.videoPlayerId + '_fluid_control_playback_rate';
        controls.playbackRate.className = 'fluid_button fluid_button_playback_rate';
        controls.rightContainer.appendChild(controls.playbackRate);

        // Right container -> Download
        controls.download = document.createElement('div');
        controls.download.id = self.videoPlayerId + '_fluid_control_download';
        controls.download.className = 'fluid_button fluid_button_download';
        controls.rightContainer.appendChild(controls.download);

        // Right container -> Volume container
        controls.volumeContainer = document.createElement('div');
        controls.volumeContainer.id = self.videoPlayerId + '_fluid_control_volume_container';
        controls.volumeContainer.className = 'fluid_control_volume_container fluid_slider';
        controls.rightContainer.appendChild(controls.volumeContainer);

        // Right container -> Volume container -> Volume
        controls.volume = document.createElement('div');
        controls.volume.id = self.videoPlayerId + '_fluid_control_volume';
        controls.volume.className = 'fluid_control_volume';
        controls.volumeContainer.appendChild(controls.volume);

        // Right container -> Volume container -> Volume -> Current
        controls.volumeCurrent = document.createElement('div');
        controls.volumeCurrent.id = self.videoPlayerId + '_fluid_control_currentvolume';
        controls.volumeCurrent.className = 'fluid_control_currentvolume';
        controls.volume.appendChild(controls.volumeCurrent);

        // Right container -> Volume container -> Volume -> Current -> position
        controls.volumeCurrentPos = document.createElement('div');
        controls.volumeCurrentPos.id = self.videoPlayerId + '_fluid_control_volume_currentpos';
        controls.volumeCurrentPos.className = 'fluid_control_volume_currentpos';
        controls.volumeCurrent.appendChild(controls.volumeCurrentPos);

        // Right container -> Volume container
        controls.mute = document.createElement('div');
        controls.mute.id = self.videoPlayerId + '_fluid_control_mute';
        controls.mute.className = 'fluid_button fluid_button_volume fluid_control_mute';
        controls.rightContainer.appendChild(controls.mute);

        // Right container -> Volume container
        controls.duration = document.createElement('div');
        controls.duration.id = self.videoPlayerId + '_fluid_control_duration';
        controls.duration.className = 'fluid_control_duration fluid_fluid_control_duration';
        controls.duration.innerText = '00:00 / 00:00';
        controls.rightContainer.appendChild(controls.duration);

        return controls;
    };

    self.controlPlayPauseToggle = () => {
        const playPauseButton = self.domRef.player.parentNode.getElementsByClassName('fluid_control_playpause');
        const menuOptionPlay = document.getElementById(self.videoPlayerId + 'context_option_play');
        const controlsDisplay = self.domRef.player.parentNode.getElementsByClassName('fluid_controls_container');
        const fpLogo = document.getElementById(self.videoPlayerId + '_logo');

        const initialPlay = document.getElementById(self.videoPlayerId + '_fluid_initial_play');
        if (initialPlay) {
            document.getElementById(self.videoPlayerId + '_fluid_initial_play').style.display = "none";
            document.getElementById(self.videoPlayerId + '_fluid_initial_play_button').style.opacity = "1";
        }

        if (!self.domRef.player.paused) {
            for (let i = 0; i < playPauseButton.length; i++) {
                playPauseButton[i].className = playPauseButton[i].className.replace(/\bfluid_button_play\b/g, 'fluid_button_pause');
            }

            for (let i = 0; i < controlsDisplay.length; i++) {
                controlsDisplay[i].classList.remove('initial_controls_show');
            }

            if (fpLogo) {
                fpLogo.classList.remove('initial_controls_show');
            }

            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = self.displayOptions.captions.pause;
            }

            return;
        }

        for (let i = 0; i < playPauseButton.length; i++) {
            playPauseButton[i].className = playPauseButton[i].className.replace(/\bfluid_button_pause\b/g, 'fluid_button_play');
        }

        for (let i = 0; i < controlsDisplay.length; i++) {
            controlsDisplay[i].classList.add('initial_controls_show');
        }

        if (self.isCurrentlyPlayingAd && self.displayOptions.vastOptions.showPlayButton) {
            document.getElementById(self.videoPlayerId + '_fluid_initial_play').style.display = "block";
            document.getElementById(self.videoPlayerId + '_fluid_initial_play_button').style.opacity = "1";
        }

        if (fpLogo) {
            fpLogo.classList.add('initial_controls_show');
        }

        if (menuOptionPlay !== null) {
            menuOptionPlay.innerHTML = self.displayOptions.captions.play;
        }
    };

    self.playPauseAnimationToggle = (play) => {
        if (self.isCurrentlyPlayingAd || !self.displayOptions.layoutControls.playPauseAnimation || self.isSwitchingSource) {
            return;
        }

        if (play) {
            document.getElementById(self.videoPlayerId + '_fluid_state_button').classList.remove('fluid_initial_pause_button');
            document.getElementById(self.videoPlayerId + '_fluid_state_button').classList.add('fluid_initial_play_button');
        } else {
            document.getElementById(self.videoPlayerId + '_fluid_state_button').classList.remove('fluid_initial_play_button');
            document.getElementById(self.videoPlayerId + '_fluid_state_button').classList.add('fluid_initial_pause_button');
        }

        document.getElementById(self.videoPlayerId + '_fluid_initial_play').classList.add('transform-active');
        setTimeout(
            function () {
                document.getElementById(self.videoPlayerId + '_fluid_initial_play').classList.remove('transform-active');
            },
            800
        );
    };

    self.contolProgressbarUpdate = () => {
        const currentProgressTag = self.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');

        for (let i = 0; i < currentProgressTag.length; i++) {
            currentProgressTag[i].style.width = (self.domRef.player.currentTime / self.currentVideoDuration * 100) + '%';
        }
    };

    self.controlDurationUpdate = () => {
        const currentPlayTime = self.formatTime(self.domRef.player.currentTime);

        let isLiveHls = false;
        if (self.hlsPlayer) {
            isLiveHls = self.hlsPlayer.levels &&
                self.hlsPlayer.levels[self.hlsPlayer.currentLevel] &&
                self.hlsPlayer.levels[self.hlsPlayer.currentLevel].details.live;
        }

        let durationText;
        if (isNaN(self.currentVideoDuration) || !isFinite(self.currentVideoDuration) || isLiveHls) {
            durationText = currentPlayTime;
        } else {
            const totalTime = self.formatTime(self.currentVideoDuration);
            durationText = currentPlayTime + ' / ' + totalTime;
        }

        const timePlaceholder = self.domRef.player.parentNode.getElementsByClassName('fluid_control_duration');

        for (let i = 0; i < timePlaceholder.length; i++) {
            timePlaceholder[i].innerHTML = durationText;
        }
    };

    self.contolVolumebarUpdate = () => {
        const currentVolumeTag = document.getElementById(self.videoPlayerId + '_fluid_control_currentvolume');
        const volumeposTag = document.getElementById(self.videoPlayerId + '_fluid_control_volume_currentpos');
        const volumebarTotalWidth = document.getElementById(self.videoPlayerId + '_fluid_control_volume').clientWidth;
        const volumeposTagWidth = volumeposTag.clientWidth;
        const muteButtonTag = self.domRef.player.parentNode.getElementsByClassName('fluid_control_mute');
        const menuOptionMute = document.getElementById(self.videoPlayerId + 'context_option_mute');

        if (0 !== self.domRef.player.volume) {
            self.latestVolume = self.domRef.player.volume;
            self.fluidStorage.fluidMute = false;
        } else {
            self.fluidStorage.fluidMute = true;
        }

        if (self.domRef.player.volume && !self.domRef.player.muted) {
            for (let i = 0; i < muteButtonTag.length; i++) {
                muteButtonTag[i].className = muteButtonTag[i].className.replace(/\bfluid_button_mute\b/g, 'fluid_button_volume');
            }

            if (menuOptionMute !== null) {
                menuOptionMute.innerHTML = self.displayOptions.captions.mute;
            }

        } else {
            for (let i = 0; i < muteButtonTag.length; i++) {
                muteButtonTag[i].className = muteButtonTag[i].className.replace(/\bfluid_button_volume\b/g, 'fluid_button_mute');
            }

            if (menuOptionMute !== null) {
                menuOptionMute.innerHTML = self.displayOptions.captions.unmute;
            }
        }
        currentVolumeTag.style.width = (self.domRef.player.volume * volumebarTotalWidth) + 'px';
        volumeposTag.style.left = (self.domRef.player.volume * volumebarTotalWidth - (volumeposTagWidth / 2)) + 'px';
    };

    self.muteToggle = () => {
        if (0 !== self.domRef.player.volume && !self.domRef.player.muted) {
            self.domRef.player.volume = 0;
            self.domRef.player.muted = true;
        } else {
            self.domRef.player.volume = self.latestVolume;
            self.domRef.player.muted = false;
        }

        // Persistent settings
        self.fluidStorage.fluidVolume = self.latestVolume;
        self.fluidStorage.fluidMute = self.domRef.player.muted;
    };

    self.checkFullscreenSupport = (videoPlayerWrapperId) => {
        const videoPlayerWrapper = document.getElementById(videoPlayerWrapperId);

        if (videoPlayerWrapper.mozRequestFullScreen) {
            return {
                goFullscreen: 'mozRequestFullScreen',
                exitFullscreen: 'mozCancelFullScreen',
                isFullscreen: 'mozFullScreenElement'
            };

        } else if (videoPlayerWrapper.webkitRequestFullscreen) {
            return {
                goFullscreen: 'webkitRequestFullscreen',
                exitFullscreen: 'webkitExitFullscreen',
                isFullscreen: 'webkitFullscreenElement'
            };

        } else if (videoPlayerWrapper.msRequestFullscreen) {
            return {
                goFullscreen: 'msRequestFullscreen',
                exitFullscreen: 'msExitFullscreen',
                isFullscreen: 'msFullscreenElement'
            };

        } else if (videoPlayerWrapper.requestFullscreen) {
            return {
                goFullscreen: 'requestFullscreen',
                exitFullscreen: 'exitFullscreen',
                isFullscreen: 'fullscreenElement'
            };

        } else if (self.domRef.player.webkitSupportsFullscreen) {
            return {
                goFullscreen: 'webkitEnterFullscreen',
                exitFullscreen: 'webkitExitFullscreen',
                isFullscreen: 'webkitDisplayingFullscreen'
            };
        }

        return false;
    };

    self.fullscreenOff = (fullscreenButton, menuOptionFullscreen) => {
        for (let i = 0; i < fullscreenButton.length; i++) {
            fullscreenButton[i].className = fullscreenButton[i].className.replace(/\bfluid_button_fullscreen_exit\b/g, 'fluid_button_fullscreen');
        }
        if (menuOptionFullscreen !== null) {
            menuOptionFullscreen.innerHTML = 'Fullscreen';
        }
        self.fullscreenMode = false;
    };

    self.fullscreenOn = (fullscreenButton, menuOptionFullscreen) => {
        for (let i = 0; i < fullscreenButton.length; i++) {
            fullscreenButton[i].className = fullscreenButton[i].className.replace(/\bfluid_button_fullscreen\b/g, 'fluid_button_fullscreen_exit');
        }

        if (menuOptionFullscreen !== null) {
            menuOptionFullscreen.innerHTML = self.displayOptions.captions.exitFullscreen;
        }
        self.fullscreenMode = true;
    };

    self.fullscreenToggle = () => {
        const videoPlayerTag = self.domRef.player;
        const fullscreenTag = document.getElementById('fluid_video_wrapper_' + self.videoPlayerId);
        const requestFullscreenFunctionNames = self.checkFullscreenSupport('fluid_video_wrapper_' + self.videoPlayerId);
        const fullscreenButton = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_fullscreen');
        const menuOptionFullscreen = document.getElementById(self.videoPlayerId + 'context_option_fullscreen');

        // Disable Theatre mode if it's on while we toggle fullscreen
        if (self.theatreMode) {
            self.theatreToggle();
        }

        let functionNameToExecute;

        if (requestFullscreenFunctionNames) {
            // iOS fullscreen elements are different and so need to be treated separately
            if (requestFullscreenFunctionNames.goFullscreen === 'webkitEnterFullscreen') {
                if (!videoPlayerTag[requestFullscreenFunctionNames.isFullscreen]) {
                    functionNameToExecute = 'videoPlayerTag.' + requestFullscreenFunctionNames.goFullscreen + '();';
                    self.fullscreenOn(fullscreenButton, menuOptionFullscreen);
                    new Function('videoPlayerTag', functionNameToExecute)(videoPlayerTag);
                }
            } else {
                if (document[requestFullscreenFunctionNames.isFullscreen] === null) {
                    //Go fullscreen
                    functionNameToExecute = 'videoPlayerTag.' + requestFullscreenFunctionNames.goFullscreen + '();';
                    self.fullscreenOn(fullscreenButton, menuOptionFullscreen);
                } else {
                    //Exit fullscreen
                    functionNameToExecute = 'document.' + requestFullscreenFunctionNames.exitFullscreen + '();';
                    self.fullscreenOff(fullscreenButton, menuOptionFullscreen);
                }
                new Function('videoPlayerTag', functionNameToExecute)(fullscreenTag);
            }
        } else {
            //The browser does not support the Fullscreen API, so a pseudo-fullscreen implementation is used
            if (fullscreenTag.className.search(/\bpseudo_fullscreen\b/g) !== -1) {
                fullscreenTag.className = fullscreenTag.className.replace(/\bpseudo_fullscreen\b/g, '');
                self.fullscreenOff(fullscreenButton, menuOptionFullscreen);
            } else {
                fullscreenTag.className += ' pseudo_fullscreen';
                self.fullscreenOn(fullscreenButton, menuOptionFullscreen);
            }
        }

        self.resizeVpaidAuto();

    };

    self.findClosestParent = (el, selector) => {
        let matchesFn = null;

        // find vendor prefix
        ['matches', 'webkitMatchesSelector', 'mozMatchesSelector', 'msMatchesSelector', 'oMatchesSelector'].some(function (fn) {
            if (typeof document.body[fn] == 'function') {
                matchesFn = fn;
                return true;
            }
            return false;
        });

        let parent;

        // Check if the current element matches the selector
        if (el[matchesFn](selector)) {
            return el;
        }

        // traverse parents
        while (el) {
            parent = el.parentElement;
            if (parent && parent[matchesFn](selector)) {
                return parent;
            }
            el = parent;
        }

        return null;
    };

    self.getTranslateX = (el) => {
        let coordinates = null;

        try {
            const results = el.style.transform.match(/translate3d\((-?\d+px,\s?){2}-?\d+px\)/);

            if (results && results.length) {
                coordinates = results[0]
                    .replace('translate3d(', '')
                    .replace(')', '')
                    .replace(/\s/g, '')
                    .replace(/px/g, '')
                    .split(',')
                ;
            }
        } catch (e) {
            coordinates = null;
        }

        return (coordinates && (coordinates.length === 3)) ? parseInt(coordinates[0]) : 0;
    };

    self.getEventOffsetX = (evt, el) => {
        let x = 0;
        let translateX = 0;

        while (el && !isNaN(el.offsetLeft)) {
            translateX = self.getTranslateX(el);

            if (el.tagName === 'BODY') {
                x += el.offsetLeft + el.clientLeft + translateX - (el.scrollLeft || document.documentElement.scrollLeft);
            } else {
                x += el.offsetLeft + el.clientLeft + translateX - el.scrollLeft;
            }

            el = el.offsetParent;
        }

        let eventX;
        if (typeof evt.touches !== 'undefined' && typeof evt.touches[0] !== 'undefined') {
            eventX = evt.touches[0].clientX;
        } else {
            eventX = evt.clientX
        }

        return eventX - x;
    };

    self.getEventOffsetY = (evt, el) => {
        let fullscreenMultiplier = 1;
        const videoWrapper = self.findClosestParent(el, 'div[id^="fluid_video_wrapper_"]');

        if (videoWrapper) {
            const videoPlayerId = videoWrapper.id.replace('fluid_video_wrapper_', '');

            const requestFullscreenFunctionNames = self.checkFullscreenSupport('fluid_video_wrapper_' + videoPlayerId);
            if (requestFullscreenFunctionNames && document[requestFullscreenFunctionNames.isFullscreen]) {
                fullscreenMultiplier = 0;
            }
        }

        let y = 0;

        while (el && !isNaN(el.offsetTop)) {
            if (el.tagName === 'BODY') {
                y += el.offsetTop - ((el.scrollTop || document.documentElement.scrollTop) * fullscreenMultiplier);

            } else {
                y += el.offsetTop - (el.scrollTop * fullscreenMultiplier);
            }

            el = el.offsetParent;
        }

        return evt.clientY - y;
    };

    self.onProgressbarMouseDown = (event) => {
        self.displayOptions.layoutControls.playPauseAnimation = false;
        // we need an initial position for touchstart events, as mouse up has no offset x for iOS
        let initialPosition;

        if (self.displayOptions.layoutControls.showCardBoardView) {
            initialPosition = self.getEventOffsetX(event, event.target.parentNode);
        } else {
            initialPosition = self.getEventOffsetX(event, document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container'));
        }

        if (self.isCurrentlyPlayingAd) {
            return;
        }

        self.fluidPseudoPause = true;

        const initiallyPaused = self.domRef.player.paused;
        if (!initiallyPaused) {
            self.domRef.player.pause();
        }

        const shiftTime = timeBarX => {
            const totalWidth = document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container').clientWidth;
            if (totalWidth) {
                self.domRef.player.currentTime = self.currentVideoDuration * timeBarX / totalWidth;
            }
        };

        const onProgressbarMouseMove = event => {
            const currentX = self.getEventOffsetX(event, event.target.parentNode);
            initialPosition = NaN; // mouse up will fire after the move, we don't want to trigger the initial position in the event of iOS
            shiftTime(currentX);
            self.contolProgressbarUpdate(self.videoPlayerId);
            self.controlDurationUpdate(self.videoPlayerId);
        };

        const onProgressbarMouseUp = event => {
            document.removeEventListener('mousemove', onProgressbarMouseMove);
            document.removeEventListener('touchmove', onProgressbarMouseMove);
            document.removeEventListener('mouseup', onProgressbarMouseUp);
            document.removeEventListener('touchend', onProgressbarMouseUp);

            let clickedX = self.getEventOffsetX(event, event.target.parentNode);

            if (isNaN(clickedX) && !isNaN(initialPosition)) {
                clickedX = initialPosition;
            }

            if (!isNaN(clickedX)) {
                shiftTime(clickedX);
            }

            if (!initiallyPaused) {
                self.play();
            }

            // Wait till video played then re-enable the animations
            if (self.initialAnimationSet) {
                setTimeout(() => {
                    self.displayOptions.layoutControls.playPauseAnimation = self.initialAnimationSet;
                }, 200);
            }
            self.fluidPseudoPause = false;
        };

        document.addEventListener('mouseup', onProgressbarMouseUp);
        document.addEventListener('touchend', onProgressbarMouseUp);
        document.addEventListener('mousemove', onProgressbarMouseMove);
        document.addEventListener('touchmove', onProgressbarMouseMove);
    };

    self.onVolumeBarMouseDown = () => {
        const shiftVolume = volumeBarX => {
            const totalWidth = self.domRef.controls.volumeContainer.clientWidth;

            if (totalWidth) {
                let newVolume = volumeBarX / totalWidth;

                if (newVolume < 0.05) {
                    newVolume = 0;
                    self.domRef.player.muted = true;
                } else if (newVolume > 0.95) {
                    newVolume = 1;
                }

                if (self.domRef.player.muted && newVolume > 0) {
                    self.domRef.player.muted = false;
                }

                self.setVolume(newVolume);
            }
        }

        const onVolumeBarMouseMove = event => {
            const currentX = self.getEventOffsetX(event, self.domRef.controls.volumeContainer);
            shiftVolume(currentX);
        }

        const onVolumeBarMouseUp = event => {
            document.removeEventListener('mousemove', onVolumeBarMouseMove);
            document.removeEventListener('touchmove', onVolumeBarMouseMove);
            document.removeEventListener('mouseup', onVolumeBarMouseUp);
            document.removeEventListener('touchend', onVolumeBarMouseUp);

            const currentX = self.getEventOffsetX(event, self.domRef.controls.volumeContainer);

            if (!isNaN(currentX)) {
                shiftVolume(currentX);
            }
        }

        document.addEventListener('mouseup', onVolumeBarMouseUp);
        document.addEventListener('touchend', onVolumeBarMouseUp);
        document.addEventListener('mousemove', onVolumeBarMouseMove);
        document.addEventListener('touchmove', onVolumeBarMouseMove);
    };

    self.findRoll = (roll) => {
        const ids = [];
        ids.length = 0;

        if (!roll || !self.hasOwnProperty('adList')) {
            return;
        }

        for (let key in self.adList) {
            if (!self.adList.hasOwnProperty(key)) {
                continue;
            }

            if (self.adList[key].roll === roll) {
                ids.push(key);
            }
        }

        return ids;
    };

    self.onKeyboardVolumeChange = (direction) => {
        let volume = self.domRef.player.volume;

        if ('asc' === direction) {
            volume += 0.05;
        } else if ('desc' === direction) {
            volume -= 0.05;
        }

        if (volume < 0.05) {
            volume = 0;
        } else if (volume > 0.95) {
            volume = 1;
        }

        self.setVolume(volume);
    };

    self.onKeyboardSeekPosition = (keyCode) => {
        if (self.isCurrentlyPlayingAd) {
            return;
        }

        self.domRef.player.currentTime = self.getNewCurrentTimeValueByKeyCode(
            keyCode,
            self.domRef.player.currentTime,
            self.domRef.player.duration
        );
    };

    self.getNewCurrentTimeValueByKeyCode = (keyCode, currentTime, duration) => {
        let newCurrentTime = currentTime;

        switch (keyCode) {
            case 37://left arrow
                newCurrentTime -= 5;
                newCurrentTime = (newCurrentTime < 5) ? 0 : newCurrentTime;
                break;
            case 39://right arrow
                newCurrentTime += 5;
                newCurrentTime = (newCurrentTime > duration - 5) ? duration : newCurrentTime;
                break;
            case 35://End
                newCurrentTime = duration;
                break;
            case 36://Home
                newCurrentTime = 0;
                break;
            case 48://0
            case 49://1
            case 50://2
            case 51://3
            case 52://4
            case 53://5
            case 54://6
            case 55://7
            case 56://8
            case 57://9
                if (keyCode < 58 && keyCode > 47) {
                    const percent = (keyCode - 48) * 10;
                    newCurrentTime = duration * percent / 100;
                }
                break;
        }

        return newCurrentTime;
    };

    self.handleMouseleave = (event) => {
        if (typeof event.clientX !== 'undefined'
            && self.domRef.wrapper.contains(document.elementFromPoint(event.clientX, event.clientY))) {
            //false positive; we didn't actually leave the player
            return;
        }

        self.hideControlBar();
        self.hideTitle();
    };

    self.handleMouseenterForKeyboard = () => {
        if (self.captureKey) {
            return;
        }

        self.captureKey = event => {
            event.stopPropagation();
            const keyCode = event.keyCode;

            switch (keyCode) {
                case 70://f
                    self.fullscreenToggle();
                    event.preventDefault();
                    break;
                case 13://Enter
                case 32://Space
                    self.playPauseToggle();
                    event.preventDefault();
                    break;
                case 77://m
                    self.muteToggle();
                    event.preventDefault();
                    break;
                case 38://up arrow
                    self.onKeyboardVolumeChange('asc');
                    event.preventDefault();
                    break;
                case 40://down arrow
                    self.onKeyboardVolumeChange('desc');
                    event.preventDefault();
                    break;
                case 37://left arrow
                case 39://right arrow
                case 35://End
                case 36://Home
                case 48://0
                case 49://1
                case 50://2
                case 51://3
                case 52://4
                case 53://5
                case 54://6
                case 55://7
                case 56://8
                case 57://9
                    self.onKeyboardSeekPosition(keyCode);
                    event.preventDefault();
                    break;
            }

            return false;

        };

        document.addEventListener('keydown', self.captureKey, true);
    };

    self.keyboardControl = () => {
        self.domRef.wrapper.addEventListener('click', self.handleMouseenterForKeyboard, false);

        // When we click outside player, we stop registering keyboard events
        const clickHandler = self.handleWindowClick.bind(self);

        self.destructors.push(() => {
            window.removeEventListener('click', clickHandler);
        });

        window.addEventListener('click', clickHandler);
    };

    self.handleWindowClick = (e) => {
        if (!self.domRef.wrapper) {
            console.warn('Dangling click event listener should be collected for unknown wrapper ' + self.videoPlayerId
                + '. Did you forget to call destroy on player instance?');
            return;
        }

        const inScopeClick = self.domRef.wrapper.contains(e.target) || e.target.id === 'skipHref_' + self.videoPlayerId;

        if (inScopeClick) {
            return;
        }

        document.removeEventListener('keydown', self.captureKey, true);
        delete self['captureKey'];

        if (self.theatreMode && !self.theatreModeAdvanced) {
            self.theatreToggle();
        }
    };

    self.initialPlay = () => {
        self.domRef.player.addEventListener('playing', () => {
            self.toggleLoader(false);
        });

        self.domRef.player.addEventListener('timeupdate', () => {
            // some places we are manually displaying toggleLoader
            // user experience toggleLoader being displayed even when content is playing in background
            self.toggleLoader(false);
        });

        self.domRef.player.addEventListener('waiting', () => {
            self.toggleLoader(true);
        });

        if (!self.displayOptions.layoutControls.playButtonShowing) {
            // Controls always showing until the video is first played
            const initialControlsDisplay = document.getElementById(self.videoPlayerId + '_fluid_controls_container');
            initialControlsDisplay.classList.remove('initial_controls_show');
            // The logo shows before playing but may need to be removed
            const fpPlayer = document.getElementById(self.videoPlayerId + '_logo');
            if (fpPlayer) {
                fpPlayer.classList.remove('initial_controls_show');
            }
        }

        if (!self.firstPlayLaunched) {
            self.playPauseToggle();
            self.domRef.player.removeEventListener('play', self.initialPlay);
        }
    };

    self.playPauseToggle = () => {
        const isFirstStart = !self.firstPlayLaunched;
        const preRolls = self.findRoll('preRoll');

        if (!isFirstStart || preRolls.length === 0) {
            if (isFirstStart && preRolls.length === 0) {
                self.firstPlayLaunched = true;
                self.displayOptions.vastOptions.vastAdvanced.noVastVideoCallback();
            }

            if (self.domRef.player.paused) {
                if (self.isCurrentlyPlayingAd && self.vastOptions !== null && self.vastOptions.vpaid) {
                    // resume the vpaid linear ad
                    self.resumeVpaidAd();
                } else {
                    // resume the regular linear vast or content video player
                    if (self.dashPlayer) {
                        self.dashPlayer.play();
                    } else {
                        self.domRef.player.play();
                    }
                }

                self.playPauseAnimationToggle(true);

            } else if (!isFirstStart) {
                if (self.isCurrentlyPlayingAd && self.vastOptions !== null && self.vastOptions.vpaid) {
                    // pause the vpaid linear ad
                    self.pauseVpaidAd();
                } else {
                    // pause the regular linear vast or content video player
                    self.domRef.player.pause();
                }

                self.playPauseAnimationToggle(false);
            }

            self.toggleOnPauseAd();
        } else {
            self.isCurrentlyPlayingAd = true;

            // Workaround for Safari or Mobile Chrome - otherwise it blocks the subsequent
            // play() command, because it considers it not being triggered by the user.
            // The URL is hardcoded here to cover widest possible use cases.
            // If you know of an alternative workaround for this issue - let us know!
            const browserVersion = self.getBrowserVersion();
            const isChromeAndroid = self.mobileInfo.userOs !== false
                && self.mobileInfo.userOs === 'Android'
                && browserVersion.browserName === 'Google Chrome';

            if ('Safari' === browserVersion.browserName || isChromeAndroid) {
                self.domRef.player.src = 'https://cdn.fluidplayer.com/static/blank.mp4';
                self.domRef.player.play();
                self.playPauseAnimationToggle(true);
            }

            self.firstPlayLaunched = true;

            //trigger the loading of the VAST Tag
            self.prepareVast('preRoll');
            self.preRollAdPodsLength = preRolls.length;
        }

        const prepareVastAdsThatKnowDuration = () => {
            self.prepareVast('onPauseRoll');
            self.prepareVast('postRoll');
            self.prepareVast('midRoll');
        };

        if (isFirstStart) {
            // Remove the div that was placed as a fix for poster image and DASH streaming, if it exists
            const pseudoPoster = document.getElementById(self.videoPlayerId + '_fluid_pseudo_poster');
            if (pseudoPoster) {
                pseudoPoster.parentNode.removeChild(pseudoPoster);
            }

            if (self.mainVideoDuration > 0) {
                prepareVastAdsThatKnowDuration();
            } else {
                self.domRef.player.addEventListener('mainVideoDurationSet', prepareVastAdsThatKnowDuration);
            }
        }

        self.adTimer();

        const blockOnPause = document.getElementById(self.videoPlayerId + '_fluid_html_on_pause');

        if (blockOnPause && !self.isCurrentlyPlayingAd) {
            if (self.domRef.player.paused) {
                blockOnPause.style.display = 'flex';
            } else {
                blockOnPause.style.display = 'none';
            }
        }
    };

    self.setCustomControls = () => {
        //Set the Play/Pause behaviour
        self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_playpause', () => {
            if (!self.firstPlayLaunched) {
                self.domRef.player.removeEventListener('play', self.initialPlay);
            }

            self.playPauseToggle();
        }, false);

        self.domRef.player.addEventListener('play', () => {
            self.controlPlayPauseToggle();
            self.contolVolumebarUpdate();
        }, false);

        self.domRef.player.addEventListener('fluidplayerpause', () => {
            self.controlPlayPauseToggle();
        }, false);

        //Set the progressbar
        self.domRef.player.addEventListener('timeupdate', () => {
            self.contolProgressbarUpdate();
            self.controlDurationUpdate();
        });

        const isMobileChecks = self.getMobileOs();
        const eventOn = (isMobileChecks.userOs) ? 'touchstart' : 'mousedown';

        if (self.displayOptions.layoutControls.showCardBoardView) {
            self.trackEvent(
                self.domRef.player.parentNode,
                eventOn,
                '.fluid_controls_progress_container',
                event => self.onProgressbarMouseDown(event),
                false
            );
        } else {
            document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container')
                .addEventListener(eventOn, event => self.onProgressbarMouseDown(event), false);
        }

        //Set the volume controls
        document.getElementById(self.videoPlayerId + '_fluid_control_volume_container')
            .addEventListener(eventOn, event => self.onVolumeBarMouseDown(), false);

        self.domRef.player.addEventListener('volumechange', () => self.contolVolumebarUpdate());

        self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_mute', () => self.muteToggle());

        self.setBuffering();

        //Set the fullscreen control
        self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_fullscreen', () => self.fullscreenToggle());

        // Theatre mode
        if (self.displayOptions.layoutControls.allowTheatre && !self.isInIframe) {
            document.getElementById(self.videoPlayerId + '_fluid_control_theatre').style.display = 'inline-block';
            self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_theatre', () => self.theatreToggle());
        } else {
            document.getElementById(self.videoPlayerId + '_fluid_control_theatre').style.display = 'none';
        }

        self.domRef.player.addEventListener('ratechange', () => {
            if (self.isCurrentlyPlayingAd) {
                self.playbackRate = 1;
            }
        });
    };

    // Create the time position preview only if the vtt previews aren't enabled
    self.createTimePositionPreview = () => {
        if (!self.showTimeOnHover) {
            return;
        }

        const progressContainer = document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container');
        const previewContainer = document.createElement('div');

        previewContainer.id = self.videoPlayerId + '_fluid_timeline_preview';
        previewContainer.className = 'fluid_timeline_preview';
        previewContainer.style.display = 'none';
        previewContainer.style.position = 'absolute';

        progressContainer.appendChild(previewContainer);

        // Set up hover for time position preview display
        document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container')
            .addEventListener('mousemove', event => {
                const progressContainer = document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container');
                const totalWidth = progressContainer.clientWidth;
                const hoverTimeItem = document.getElementById(self.videoPlayerId + '_fluid_timeline_preview');
                const hoverQ = self.getEventOffsetX(event, progressContainer);

                const hoverSecondQ = self.currentVideoDuration * hoverQ / totalWidth;
                hoverTimeItem.innerText = self.formatTime(hoverSecondQ);

                hoverTimeItem.style.display = 'block';
                hoverTimeItem.style.left = (hoverSecondQ / self.domRef.player.duration * 100) + "%";
            }, false);

        // Hide timeline preview on mouseout
        document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container')
            .addEventListener('mouseout', () => {
                const hoverTimeItem = document.getElementById(self.videoPlayerId + '_fluid_timeline_preview');
                hoverTimeItem.style.display = 'none';
            }, false);
    };

    self.setCustomContextMenu = () => {
        const playerWrapper = self.domRef.wrapper;

        const showDefaultControls = self.displayOptions.layoutControls.contextMenu.controls;
        const extraLinks = self.displayOptions.layoutControls.contextMenu.links;

        //Create own context menu
        const divContextMenu = document.createElement('div');
        divContextMenu.id = self.videoPlayerId + '_fluid_context_menu';
        divContextMenu.className = 'fluid_context_menu';
        divContextMenu.style.display = 'none';
        divContextMenu.style.position = 'absolute';

        const contextMenuList = document.createElement('ul');
        divContextMenu.appendChild(contextMenuList);

        if (!!extraLinks) {
            for (const link of extraLinks) {
                const linkItem = document.createElement('li');
                linkItem.id = self.videoPlayerId + 'context_option_play';
                linkItem.innerHTML = link.label;
                linkItem.addEventListener('click', () => window.open(link.href, '_blank'), false);
                contextMenuList.appendChild(linkItem);
            }
        }

        if (showDefaultControls) {
            const menuItemPlay = document.createElement('li');
            menuItemPlay.id = self.videoPlayerId + 'context_option_play';
            menuItemPlay.innerHTML = self.displayOptions.captions.play;
            menuItemPlay.addEventListener('click', () => self.playPauseToggle(), false);
            contextMenuList.appendChild(menuItemPlay);

            const menuItemMute = document.createElement('li');
            menuItemMute.id = self.videoPlayerId + 'context_option_mute';
            menuItemMute.innerHTML = self.displayOptions.captions.mute;
            menuItemMute.addEventListener('click', () => self.muteToggle(), false);
            contextMenuList.appendChild(menuItemMute);

            const menuItemFullscreen = document.createElement('li');
            menuItemFullscreen.id = self.videoPlayerId + 'context_option_fullscreen';
            menuItemFullscreen.innerHTML = self.displayOptions.captions.fullscreen;
            menuItemFullscreen.addEventListener('click', () => self.fullscreenToggle(), false);
            contextMenuList.appendChild(menuItemFullscreen);
        }

        const menuItemVersion = document.createElement('li');
        menuItemVersion.id = self.videoPlayerId + 'context_option_homepage';
        menuItemVersion.innerHTML = 'Fluid Player ' + self.version;
        menuItemVersion.addEventListener('click', () => window.open(self.homepage, '_blank'), false)
        contextMenuList.appendChild(menuItemVersion);

        self.domRef.player.parentNode.insertBefore(divContextMenu, self.domRef.player.nextSibling);

        //Disable the default context menu
        playerWrapper.addEventListener('contextmenu', e => {
            e.preventDefault();

            divContextMenu.style.left = self.getEventOffsetX(e, self.domRef.player) + 'px';
            divContextMenu.style.top = self.getEventOffsetY(e, self.domRef.player) + 'px';
            divContextMenu.style.display = 'block';
        }, false);

        //Hide the context menu on clicking elsewhere
        document.addEventListener('click', e => {
            if ((e.target !== self.domRef.player) || e.button !== 2) {
                divContextMenu.style.display = 'none';
            }
        }, false);
    };

    self.setDefaultLayout = () => {
        self.domRef.wrapper.className += ' fluid_player_layout_' + self.displayOptions.layoutControls.layout;

        self.setCustomContextMenu();

        const controls = self.generateCustomControlTags({
            displayVolumeBar: self.checkShouldDisplayVolumeBar(),
            primaryColor: self.displayOptions.layoutControls.primaryColor
                ? self.displayOptions.layoutControls.primaryColor
                : 'red',
            controlForwardBackward: !!self.displayOptions.layoutControls.controlForwardBackward.show
        });

        // Remove the default controls
        self.domRef.player.removeAttribute('controls');

        // Insert custom controls and append loader
        self.domRef.player.parentNode.insertBefore(controls.root, self.domRef.player.nextSibling);
        self.domRef.player.parentNode.insertBefore(controls.loader, self.domRef.player.nextSibling);

        // Register controls locally
        self.domRef.controls = controls;

        /**
         * Set the volumebar after its elements are properly rendered.
         */
        let remainingAttemptsToInitiateVolumeBar = 100;

        const initiateVolumebar = function () {
            if (!remainingAttemptsToInitiateVolumeBar) {
                clearInterval(initiateVolumebarTimerId);
            } else if (self.checkIfVolumebarIsRendered()) {
                clearInterval(initiateVolumebarTimerId);
                self.contolVolumebarUpdate(self.videoPlayerId);
            } else {
                remainingAttemptsToInitiateVolumeBar--;
            }
        };
        let initiateVolumebarTimerId = setInterval(initiateVolumebar, 100);

        if (self.displayOptions.layoutControls.doubleclickFullscreen) {
            self.domRef.player.addEventListener('dblclick', self.fullscreenToggle);
        }

        self.initHtmlOnPauseBlock();

        self.setCustomControls();

        self.setupThumbnailPreview();

        self.createTimePositionPreview();

        self.posterImage();

        self.initPlayButton();

        self.setVideoPreload();

        self.createPlaybackList();

        self.createDownload();

        if (!!self.displayOptions.layoutControls.controlForwardBackward.show) {
            self.initSkipControls();
        }
    };

    self.initSkipControls = () => {
        const skipFunction = (period) => {
            if (self.isCurrentlyPlayingAd) {
                return;
            }

            let skipTo = self.domRef.player.currentTime + period;
            if (skipTo < 0) {
                skipTo = 0;
            }
            self.domRef.player.currentTime = skipTo;
        };

        self.domRef.controls.skipBack.addEventListener('click', skipFunction.bind(this, -10));
        self.domRef.controls.skipForward.addEventListener('click', skipFunction.bind(this, 10));
    };

    /**
     * Checks if the volumebar is rendered and the styling applied by comparing
     * the width of 2 elements that should look different.
     *
     * @returns Boolean
     */
    self.checkIfVolumebarIsRendered = () => {
        const volumeposTag = document.getElementById(self.videoPlayerId + '_fluid_control_volume_currentpos');
        const volumebarTotalWidth = document.getElementById(self.videoPlayerId + '_fluid_control_volume').clientWidth;
        const volumeposTagWidth = volumeposTag.clientWidth;

        return volumeposTagWidth !== volumebarTotalWidth;
    };

    self.setLayout = () => {
        //All other browsers
        const listenTo = (self.isTouchDevice()) ? 'touchend' : 'click';
        self.domRef.player.addEventListener(listenTo, () => self.playPauseToggle(), false);
        //Mobile Safari - because it does not emit a click event on initial click of the video
        self.domRef.player.addEventListener('play', self.initialPlay, false);
        self.setDefaultLayout();
    };

    self.handleFullscreen = () => {
        if (typeof document.vastFullsreenChangeEventListenersAdded !== 'undefined') {
            return;
        }

        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach(eventType => {
            if (typeof (document['on' + eventType]) === 'object') {
                document.addEventListener(eventType, function (ev) {
                    self.recalculateAdDimensions();
                }, false);
            }
        });

        document.vastFullsreenChangeEventListenersAdded = true;
    };

    self.setupPlayerWrapper = () => {
        const wrapper = document.createElement('div');

        wrapper.id = 'fluid_video_wrapper_' + self.videoPlayerId;
        wrapper.className = self.isTouchDevice()
            ? 'fluid_video_wrapper mobile'
            : 'fluid_video_wrapper';

        //Assign the height/width dimensions to the wrapper
        if (self.displayOptions.layoutControls.fillToContainer) {
            wrapper.style.width = '100%';
            wrapper.style.height = '100%';
        } else {
            wrapper.style.height = self.domRef.player.clientHeight + 'px';
            wrapper.style.width = self.domRef.player.clientWidth + 'px';
        }

        self.domRef.player.style.height = '100%';
        self.domRef.player.style.width = '100%';

        self.domRef.player.parentNode.insertBefore(wrapper, self.domRef.player);
        wrapper.appendChild(self.domRef.player);

        return wrapper;
    };

    self.onErrorDetection = () => {
        if (self.domRef.player.networkState === self.domRef.player.NETWORK_NO_SOURCE && self.isCurrentlyPlayingAd) {
            //Probably the video ad file was not loaded successfully
            self.playMainVideoWhenVastFails(401);
        }
    };

    self.createVideoSourceSwitch = () => {
        const sources = [];
        const sourcesList = self.domRef.player.querySelectorAll('source');
        [].forEach.call(sourcesList, source => {
            if (source.title && source.src) {
                sources.push({
                    'title': source.title,
                    'url': source.src,
                    'isHD': (source.getAttribute('data-fluid-hd') != null)
                });
            }
        });

        self.videoSources = sources;
        if (self.videoSources.length <= 1) {
            return;
        }

        const sourceChangeButton = document.getElementById(self.videoPlayerId + '_fluid_control_video_source');
        sourceChangeButton.style.display = 'inline-block';

        let appendSourceChange = false;

        const sourceChangeList = document.createElement('div');
        sourceChangeList.id = self.videoPlayerId + '_fluid_control_video_source_list';
        sourceChangeList.className = 'fluid_video_sources_list';
        sourceChangeList.style.display = 'none';

        let firstSource = true;
        for (const source of self.videoSources) {
            // Fix for issues occurring on iOS with mkv files
            const getTheType = source.url.split(".").pop();
            if (self.mobileInfo.userOs === 'iOS' && getTheType === 'mkv') {
                continue;
            }

            const sourceSelected = (firstSource) ? "source_selected" : "";
            const hdElement = (source.isHD) ? '<sup style="color:' + self.displayOptions.layoutControls.primaryColor + '" class="fp_hd_source"></sup>' : '';
            firstSource = false;
            const sourceChangeDiv = document.createElement('div');
            sourceChangeDiv.id = 'source_' + self.videoPlayerId + '_' + source.title;
            sourceChangeDiv.className = 'fluid_video_source_list_item';
            sourceChangeDiv.innerHTML = '<span class="source_button_icon ' + sourceSelected + '"></span>' + source.title + hdElement;

            sourceChangeDiv.addEventListener('click', function (event) {
                event.stopPropagation();
                // While changing source the player size can flash, we want to set the pixel dimensions then back to 100% afterwards
                self.domRef.player.style.width = self.domRef.player.clientWidth + 'px';
                self.domRef.player.style.height = self.domRef.player.clientHeight + 'px';

                const videoChangedTo = this;
                const sourceIcons = document.getElementsByClassName('source_button_icon');
                for (let i = 0; i < sourceIcons.length; i++) {
                    sourceIcons[i].className = sourceIcons[i].className.replace('source_selected', '');
                }
                videoChangedTo.firstChild.className += ' source_selected';

                self.videoSources.forEach(source => {
                    if (source.title === videoChangedTo.innerText.replace(/(\r\n\t|\n|\r\t)/gm, '')) {
                        self.setBuffering();
                        self.setVideoSource(source.url);
                        self.fluidStorage.fluidQuality = source.title;
                    }
                });

                self.openCloseVideoSourceSwitch();
            });

            sourceChangeList.appendChild(sourceChangeDiv);
            appendSourceChange = true;
        }

        if (appendSourceChange) {
            sourceChangeButton.appendChild(sourceChangeList);
            sourceChangeButton.addEventListener('click', () => {
                self.openCloseVideoSourceSwitch();
            });
        } else {
            // Didn't give any source options
            document.getElementById(self.videoPlayerId + '_fluid_control_video_source').style.display = 'none';
        }
    };

    self.openCloseVideoSourceSwitch = () => {
        const sourceChangeList = document.getElementById(self.videoPlayerId + '_fluid_control_video_source_list');

        if (self.isCurrentlyPlayingAd) {
            sourceChangeList.style.display = 'none';
            return;
        }

        if (sourceChangeList.style.display !== 'none') {
            sourceChangeList.style.display = 'none';
            return;
        }

        sourceChangeList.style.display = 'block';
        const mouseOut = () => {
            sourceChangeList.removeEventListener('mouseleave', mouseOut);
            sourceChangeList.style.display = 'none';
        };
        sourceChangeList.addEventListener('mouseleave', mouseOut);
    };

    self.setVideoSource = (url) => {
        if (self.mobileInfo.userOs === 'iOS' && url.indexOf('.mkv') > 0) {
            console.log('[FP_ERROR] .mkv files not supported by iOS devices.');
            return false;
        }

        if (self.isCurrentlyPlayingAd) {
            self.originalSrc = url;
            return;
        }

        self.isSwitchingSource = true;
        let play = false;
        if (!self.domRef.player.paused) {
            self.domRef.player.pause();
            play = true;
        }

        const currentTime = self.domRef.player.currentTime;
        self.setCurrentTimeAndPlay(currentTime, play);

        self.domRef.player.src = url;
        self.originalSrc = url;
        self.displayOptions.layoutControls.mediaType = self.getCurrentSrcType();
        self.initialiseStreamers();
    };

    self.setCurrentTimeAndPlay = (newCurrentTime, shouldPlay) => {
        const loadedMetadata = () => {
            self.domRef.player.currentTime = newCurrentTime;
            self.domRef.player.removeEventListener('loadedmetadata', loadedMetadata);
            // Safari ios and mac fix to set currentTime
            if (self.mobileInfo.userOs === 'iOS' || self.getBrowserVersion().browserName.toLowerCase() === 'safari') {
                self.domRef.player.addEventListener('playing', videoPlayStart);
            }

            if (shouldPlay) {
                self.domRef.player.play();
            } else {
                self.domRef.player.pause();
                self.controlPlayPauseToggle(self.videoPlayerId);
            }

            self.isSwitchingSource = false;
            self.domRef.player.style.width = '100%';
            self.domRef.player.style.height = '100%';
        };

        let videoPlayStart = () => {
            self.currentTime = newCurrentTime;
            self.domRef.player.removeEventListener('playing', videoPlayStart);
        };

        self.domRef.player.addEventListener('loadedmetadata', loadedMetadata, false);
        self.domRef.player.load();
    };

    self.initTitle = () => {
        if (!self.displayOptions.layoutControls.title) {
            return;
        }

        const titleHolder = document.createElement('div');
        titleHolder.id = self.videoPlayerId + '_title';
        self.domRef.player.parentNode.insertBefore(titleHolder, null);
        titleHolder.innerHTML += self.displayOptions.layoutControls.title;
        titleHolder.classList.add('fp_title');
    };

    self.hasTitle = () => {
        const title = document.getElementById(self.videoPlayerId + '_title');
        const titleOption = self.displayOptions.layoutControls.title;
        return title && titleOption != null;
    };

    self.hideTitle = () => {
        const titleHolder = document.getElementById(self.videoPlayerId + '_title');

        if (!self.hasTitle()) {
            return;
        }

        titleHolder.classList.add('fade_out');
    };

    self.showTitle = () => {
        const titleHolder = document.getElementById(self.videoPlayerId + '_title');

        if (!self.hasTitle()) {
            return;
        }

        titleHolder.classList.remove('fade_out');
    };

    self.initLogo = () => {
        if (!self.displayOptions.layoutControls.logo.imageUrl) {
            return;
        }

        // Container div for the logo
        // This is to allow for fade in and out logo_maintain_display
        const logoHolder = document.createElement('div');
        logoHolder.id = self.videoPlayerId + '_logo';
        let hideClass = 'logo_maintain_display';
        if (self.displayOptions.layoutControls.logo.hideWithControls) {
            hideClass = 'initial_controls_show';
        }
        logoHolder.classList.add(hideClass, 'fp_logo');

        // The logo itself
        const logoImage = document.createElement('img');
        logoImage.id = self.videoPlayerId + '_logo_image';
        if (self.displayOptions.layoutControls.logo.imageUrl) {
            logoImage.src = self.displayOptions.layoutControls.logo.imageUrl;
        }

        logoImage.style.position = 'absolute';
        logoImage.style.margin = self.displayOptions.layoutControls.logo.imageMargin;
        const logoPosition = self.displayOptions.layoutControls.logo.position.toLowerCase();

        if (logoPosition.indexOf('bottom') !== -1) {
            logoImage.style.bottom = 0;
        } else {
            logoImage.style.top = 0;
        }
        if (logoPosition.indexOf('right') !== -1) {
            logoImage.style.right = 0;
        } else {
            logoImage.style.left = 0;
        }
        if (self.displayOptions.layoutControls.logo.opacity) {
            logoImage.style.opacity = self.displayOptions.layoutControls.logo.opacity;
        }

        if (self.displayOptions.layoutControls.logo.clickUrl !== null) {
            logoImage.style.cursor = 'pointer';
            logoImage.addEventListener('click', function () {
                const win = window.open(self.displayOptions.layoutControls.logo.clickUrl, '_blank');
                win.focus();
            });
        }

        // If a mouseOverImage is provided then we must set up the listeners for it
        if (self.displayOptions.layoutControls.logo.mouseOverImageUrl) {
            logoImage.addEventListener('mouseover', function () {
                logoImage.src = self.displayOptions.layoutControls.logo.mouseOverImageUrl;
            }, false);
            logoImage.addEventListener('mouseout', function () {
                logoImage.src = self.displayOptions.layoutControls.logo.imageUrl;
            }, false);
        }

        self.domRef.player.parentNode.insertBefore(logoHolder, null);
        logoHolder.appendChild(logoImage, null);
    };

    self.initHtmlOnPauseBlock = () => {
        //If onPauseRoll is defined than HtmlOnPauseBlock won't be shown
        if (self.hasValidOnPauseAd()) {
            return;
        }

        if (!self.displayOptions.layoutControls.htmlOnPauseBlock.html) {
            return;
        }

        const containerDiv = document.createElement('div');
        containerDiv.id = self.videoPlayerId + '_fluid_html_on_pause';
        containerDiv.className = 'fluid_html_on_pause';
        containerDiv.style.display = 'none';
        containerDiv.innerHTML = self.displayOptions.layoutControls.htmlOnPauseBlock.html;
        containerDiv.onclick = function (event) {
            self.playPauseToggle();
        };

        if (self.displayOptions.layoutControls.htmlOnPauseBlock.width) {
            containerDiv.style.width = self.displayOptions.layoutControls.htmlOnPauseBlock.width + 'px';
        }

        if (self.displayOptions.layoutControls.htmlOnPauseBlock.height) {
            containerDiv.style.height = self.displayOptions.layoutControls.htmlOnPauseBlock.height + 'px';
        }

        self.domRef.player.parentNode.insertBefore(containerDiv, null);
    };

    /**
     * Play button in the middle when the video loads
     */
    self.initPlayButton = () => {
        // Create the html fpr the play button
        const containerDiv = document.createElement('div');
        containerDiv.id = self.videoPlayerId + '_fluid_initial_play_button';
        containerDiv.className = 'fluid_html_on_pause';
        const backgroundColor = (self.displayOptions.layoutControls.primaryColor) ? self.displayOptions.layoutControls.primaryColor : "#333333";
        containerDiv.innerHTML = '<div id="' + self.videoPlayerId + '_fluid_initial_play" class="fluid_initial_play" style="background-color:' + backgroundColor + '"><div id="' + self.videoPlayerId + '_fluid_state_button" class="fluid_initial_play_button"></div></div>';
        const initPlayFunction = function () {
            self.playPauseToggle();
            containerDiv.removeEventListener('click', initPlayFunction);
        };
        containerDiv.addEventListener('click', initPlayFunction);

        // If the user has chosen to not show the play button we'll make it invisible
        // We don't hide altogether because animations might still be used
        if (!self.displayOptions.layoutControls.playButtonShowing) {
            const initialControlsDisplay = document.getElementById(self.videoPlayerId + '_fluid_controls_container');
            initialControlsDisplay.classList.add('initial_controls_show');
            containerDiv.style.opacity = '0';
        }

        self.domRef.player.parentNode.insertBefore(containerDiv, null);
    };

    /**
     * Set the mainVideoDuration property one the video is loaded
     */
    self.mainVideoReady = () => {
        if (!(self.mainVideoDuration === 0 && !self.isCurrentlyPlayingAd && self.mainVideoReadyState === false)) {
            return;
        }
        const event = new CustomEvent('mainVideoDurationSet');

        self.mainVideoDuration = self.domRef.player.duration;
        self.mainVideoReadyState = true;
        self.domRef.player.dispatchEvent(event);
        self.domRef.player.removeEventListener('loadedmetadata', self.mainVideoReady);
    };

    self.userActivityChecker = () => {
        const videoPlayer = self.domRef.wrapper;
        self.newActivity = null;

        let isMouseStillDown = false;

        const activity = event => {
            if (event.type === 'touchstart' || event.type === 'mousedown') {
                isMouseStillDown = true;
            }
            if (event.type === 'touchend' || event.type === 'mouseup') {
                isMouseStillDown = false;
            }
            self.newActivity = true;
        };

        setInterval(() => {
            if (self.newActivity !== true) {
                return;
            }

            if (!isMouseStillDown && !self.isLoading) {
                self.newActivity = false;
            }

            if (self.isUserActive === false || !self.isControlBarVisible()) {
                let event = new CustomEvent('userActive');
                self.domRef.player.dispatchEvent(event);
                self.isUserActive = true;
            }

            clearTimeout(self.inactivityTimeout);

            self.inactivityTimeout = setTimeout(() => {
                if (self.newActivity === true) {
                    clearTimeout(self.inactivityTimeout);
                    return;
                }

                self.isUserActive = false;

                let event = new CustomEvent('userInactive');
                self.domRef.player.dispatchEvent(event);
            }, self.displayOptions.layoutControls.controlBar.autoHideTimeout * 1000);
        }, 300);

        const listenTo = (self.isTouchDevice())
            ? ['touchstart', 'touchmove', 'touchend']
            : ['mousemove', 'mousedown', 'mouseup'];

        for (let i = 0; i < listenTo.length; i++) {
            videoPlayer.addEventListener(listenTo[i], activity);
        }
    };

    self.hasControlBar = () => {
        return !!document.getElementById(self.videoPlayerId + '_fluid_controls_container');
    };

    self.isControlBarVisible = () => {
        if (self.hasControlBar() === false) {
            return false;
        }

        const controlBar = document.getElementById(self.videoPlayerId + '_fluid_controls_container');
        const style = window.getComputedStyle(controlBar, null);
        return !(style.opacity === 0 || style.visibility === 'hidden');
    };

    self.setVideoPreload = () => {
        self.domRef.player.setAttribute('preload', self.displayOptions.layoutControls.preload);
    };

    self.hideControlBar = () => {
        if (self.isCurrentlyPlayingAd && !self.domRef.player.paused) {
            self.toggleAdCountdown(true);
        }

        self.domRef.player.style.cursor = 'none';

        // handles both VR and Normal condition
        if (!self.hasControlBar()) {
            return;
        }

        const divVastControls = self.domRef.player.parentNode.getElementsByClassName('fluid_controls_container');
        const fpLogo = self.domRef.player.parentNode.getElementsByClassName('fp_logo');

        for (let i = 0; i < divVastControls.length; i++) {
            if (self.displayOptions.layoutControls.controlBar.animated) {
                divVastControls[i].classList.remove('fade_in');
                divVastControls[i].classList.add('fade_out');
            } else {
                divVastControls[i].style.display = 'none';
            }
        }

        for (let i = 0; i < fpLogo.length; i++) {
            if (self.displayOptions.layoutControls.controlBar.animated) {
                if (fpLogo[i]) {
                    fpLogo[i].classList.remove('fade_in');
                    fpLogo[i].classList.add('fade_out');
                }
            } else {
                if (fpLogo[i]) {
                    fpLogo[i].style.display = 'none';
                }
            }
        }
    };

    self.showControlBar = () => {
        if (self.isCurrentlyPlayingAd && !self.domRef.player.paused) {
            self.toggleAdCountdown(false);
        }


        if (!self.isTouchDevice()) {
            self.domRef.player.style.cursor = 'default';
        }

        if (!self.hasControlBar()) {
            return;
        }

        const divVastControls = self.domRef.player.parentNode.getElementsByClassName('fluid_controls_container');
        const fpLogo = self.domRef.player.parentNode.getElementsByClassName('fp_logo');
        for (let i = 0; i < divVastControls.length; i++) {
            if (self.displayOptions.layoutControls.controlBar.animated) {
                divVastControls[i].classList.remove('fade_out');
                divVastControls[i].classList.add('fade_in');
            } else {
                divVastControls[i].style.display = 'block';
            }
        }

        for (let i = 0; i < fpLogo.length; i++) {
            if (self.displayOptions.layoutControls.controlBar.animated) {
                if (fpLogo[i]) {
                    fpLogo[i].classList.remove('fade_out');
                    fpLogo[i].classList.add('fade_in');
                }
            } else {
                if (fpLogo[i]) {
                    fpLogo[i].style.display = 'block';
                }
            }
        }
    };

    self.linkControlBarUserActivity = () => {
        self.domRef.player.addEventListener('userInactive', self.hideControlBar);
        self.domRef.player.addEventListener('userInactive', self.hideTitle);

        self.domRef.player.addEventListener('userActive', self.showControlBar);
        self.domRef.player.addEventListener('userActive', self.showTitle);
    };

    self.initMute = () => {
        if (self.displayOptions.layoutControls.mute !== true) {
            return;
        }

        self.domRef.player.volume = 0;
    };

    self.initLoop = () => {
        self.domRef.player.loop = !!self.displayOptions.layoutControls.loop;
    };

    self.setBuffering = () => {
        let progressInterval;
        const bufferBar = self.domRef.player.parentNode.getElementsByClassName('fluid_controls_buffered');

        for (let j = 0; j < bufferBar.length; j++) {
            bufferBar[j].style.width = 0;
        }

        // Buffering
        const logProgress = () => {
            const duration = self.domRef.player.duration;
            if (duration <= 0) {
                return;
            }

            for (let i = 0; i < self.domRef.player.buffered.length; i++) {
                if (self.domRef.player.buffered.start(self.domRef.player.buffered.length - 1 - i) >= self.domRef.player.currentTime) {
                    continue;
                }

                const newBufferLength = (self.domRef.player.buffered.end(self.domRef.player.buffered.length - 1 - i) / duration) * 100 + "%";

                for (let j = 0; j < bufferBar.length; j++) {
                    bufferBar[j].style.width = newBufferLength;
                }

                // Stop checking for buffering if the video is fully buffered
                if (!!progressInterval && 1 === (self.domRef.player.buffered.end(self.domRef.player.buffered.length - 1 - i) / duration)) {
                    clearInterval(progressInterval);
                }

                break;
            }
        };
        progressInterval = setInterval(logProgress, 500);
    };

    self.createPlaybackList = () => {
        const playbackRates = ['x2', 'x1.5', 'x1', 'x0.5'];

        if (!self.displayOptions.layoutControls.playbackRateEnabled) {
            return;
        }

        document.getElementById(self.videoPlayerId + '_fluid_control_playback_rate').style.display = 'inline-block';

        const sourceChangeButton = document.getElementById(self.videoPlayerId + '_fluid_control_playback_rate');

        const sourceChangeList = document.createElement('div');
        sourceChangeList.id = self.videoPlayerId + '_fluid_control_video_playback_rate';
        sourceChangeList.className = 'fluid_video_playback_rates';
        sourceChangeList.style.display = 'none';

        playbackRates.forEach(function (rate) {
            const sourceChangeDiv = document.createElement('div');
            sourceChangeDiv.className = 'fluid_video_playback_rates_item';
            sourceChangeDiv.innerText = rate;

            sourceChangeDiv.addEventListener('click', function (event) {
                event.stopPropagation();
                let playbackRate = this.innerText.replace('x', '');
                self.setPlaybackSpeed(playbackRate);
                self.openCloseVideoPlaybackRate();

            });
            sourceChangeList.appendChild(sourceChangeDiv);
        });

        sourceChangeButton.appendChild(sourceChangeList);
        sourceChangeButton.addEventListener('click', function () {
            self.openCloseVideoPlaybackRate();
        });
    };

    self.openCloseVideoPlaybackRate = () => {
        const sourceChangeList = document.getElementById(self.videoPlayerId + '_fluid_control_video_playback_rate');

        if (self.isCurrentlyPlayingAd || 'none' !== sourceChangeList.style.display) {
            sourceChangeList.style.display = 'none';
            return;
        }

        sourceChangeList.style.display = 'block';
        const mouseOut = function () {
            sourceChangeList.removeEventListener('mouseleave', mouseOut);
            sourceChangeList.style.display = 'none';
        };
        sourceChangeList.addEventListener('mouseleave', mouseOut);
    };

    self.createDownload = () => {
        const downloadOption = document.getElementById(self.videoPlayerId + '_fluid_control_download');
        if (!self.displayOptions.layoutControls.allowDownload) {
            return;
        }
        downloadOption.style.display = 'inline-block';

        let downloadClick = document.createElement('a');
        downloadClick.id = self.videoPlayerId + '_download';
        downloadClick.onclick = function (e) {
            const linkItem = this;

            if (typeof e.stopImmediatePropagation !== 'undefined') {
                e.stopImmediatePropagation();
            }

            setInterval(function () {
                linkItem.download = '';
                linkItem.href = '';
            }, 100);
        };

        downloadOption.appendChild(downloadClick);

        downloadOption.addEventListener('click', function () {
            const downloadItem = document.getElementById(self.videoPlayerId + '_download');
            downloadItem.download = self.originalSrc;
            downloadItem.href = self.originalSrc;
            downloadClick.click();
        });
    };

    self.theatreToggle = () => {
        if (self.isInIframe) {
            return;
        }

        // Theatre and fullscreen, it's only one or the other
        if (self.fullscreenMode) {
            self.fullscreenToggle();
        }

        // Advanced Theatre mode if specified
        if (self.displayOptions.layoutControls.theatreAdvanced) {
            const elementForTheatre = document.getElementById(self.displayOptions.layoutControls.theatreAdvanced.theatreElement);
            const theatreClassToApply = self.displayOptions.layoutControls.theatreAdvanced.classToApply;
            if (elementForTheatre != null && theatreClassToApply != null) {
                if (!self.theatreMode) {
                    elementForTheatre.classList.add(theatreClassToApply);
                } else {
                    elementForTheatre.classList.remove(theatreClassToApply);
                }
                self.theatreModeAdvanced = !self.theatreModeAdvanced;
            } else {
                console.log('[FP_ERROR] Theatre mode elements could not be found, defaulting behaviour.');
                // Default overlay behaviour
                self.defaultTheatre();
            }
        } else {
            // Default overlay behaviour
            self.defaultTheatre();
        }

        // Set correct variables
        self.theatreMode = !self.theatreMode;
        self.fluidStorage.fluidTheatre = self.theatreMode;

        // Trigger theatre event
        const theatreEvent = (self.theatreMode) ? 'theatreModeOn' : 'theatreModeOff';
        const event = document.createEvent('CustomEvent');
        event.initEvent(theatreEvent, false, true);
        self.domRef.player.dispatchEvent(event);

        self.resizeVpaidAuto();
    };

    self.defaultTheatre = () => {
        const videoWrapper = document.getElementById('fluid_video_wrapper_' + self.videoPlayerId);

        if (self.theatreMode) {
            videoWrapper.classList.remove('fluid_theatre_mode');
            videoWrapper.style.maxHeight = '';
            videoWrapper.style.marginTop = '';
            videoWrapper.style.left = '';
            videoWrapper.style.right = '';
            videoWrapper.style.position = '';
            if (!self.displayOptions.layoutControls.fillToContainer) {
                videoWrapper.style.width = self.originalWidth + 'px';
                videoWrapper.style.height = self.originalHeight + 'px';
            } else {
                videoWrapper.style.width = '100%';
                videoWrapper.style.height = '100%';
            }
            return;
        }

        videoWrapper.classList.add('fluid_theatre_mode');
        const workingWidth = self.displayOptions.layoutControls.theatreSettings.width;
        let defaultHorizontalMargin = '10px';
        videoWrapper.style.width = workingWidth;
        videoWrapper.style.height = self.displayOptions.layoutControls.theatreSettings.height;
        videoWrapper.style.maxHeight = screen.height + "px";
        videoWrapper.style.marginTop = self.displayOptions.layoutControls.theatreSettings.marginTop + 'px';
        switch (self.displayOptions.layoutControls.theatreSettings.horizontalAlign) {
            case 'center':
                // We must calculate the margin differently based on whether they passed % or px
                if (typeof (workingWidth) == 'string' && workingWidth.substr(workingWidth.length - 1) === "%") {
                    // A margin of half the remaining space
                    defaultHorizontalMargin = ((100 - parseInt(workingWidth.substring(0, workingWidth.length - 1))) / 2) + "%";
                } else if (typeof (workingWidth) == 'string' && workingWidth.substr(workingWidth.length - 2) === "px") {
                    // Half the (Remaining width / fullwidth)
                    defaultHorizontalMargin = (((screen.width - parseInt(workingWidth.substring(0, workingWidth.length - 2))) / screen.width) * 100 / 2) + "%";
                } else {
                    console.log('[FP_ERROR] Theatre width specified invalid.');
                }

                videoWrapper.style.left = defaultHorizontalMargin;
                break;
            case 'right':
                videoWrapper.style.right = defaultHorizontalMargin;
                break;
            case 'left':
            default:
                videoWrapper.style.left = defaultHorizontalMargin;
                break;
        }
    };

    // Set the poster for the video, taken from custom params
    // Cannot use the standard video tag poster image as it can be removed by the persistent settings
    self.posterImage = () => {
        if (!self.displayOptions.layoutControls.posterImage) {
            return;
        }

        const containerDiv = document.createElement('div');
        containerDiv.id = self.videoPlayerId + '_fluid_pseudo_poster';
        containerDiv.className = 'fluid_pseudo_poster';
        if (['auto', 'contain', 'cover'].indexOf(self.displayOptions.layoutControls.posterImageSize) === -1) {
            console.log('[FP_ERROR] Not allowed value in posterImageSize');
            return;
        }
        containerDiv.style.background = "url('" + self.displayOptions.layoutControls.posterImage + "') center center / "
            + self.displayOptions.layoutControls.posterImageSize + " no-repeat black";
        self.domRef.player.parentNode.insertBefore(containerDiv, null);
    };

    // This is called when a media type is unsupported. We'll find the current source and try set the next source if it exists
    self.nextSource = () => {
        const sources = self.domRef.player.getElementsByTagName('source');

        if (!sources.length) {
            return null;
        }

        for (let i = 0; i < sources.length - 1; i++) {
            if (sources[i].getAttribute('src') === self.originalSrc && sources[i + 1].getAttribute('src')) {
                self.setVideoSource(sources[i + 1].getAttribute('src'));
                return;
            }
        }
    };

    self.inIframe = () => {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    };

    self.setPersistentSettings = () => {
        if (!(typeof (Storage) !== 'undefined' && typeof (localStorage) !== 'undefined')) {
            return;
        }

        // See https://github.com/fluid-player/fluid-player/issues/271
        const testKey = '_fp_storage_enabled', storage = localStorage;
        try {
            storage.setItem(testKey, '1');
            storage.removeItem(testKey);
        } catch (error) {
            return false;
        }

        self.fluidStorage = localStorage;
        if (typeof (self.fluidStorage.fluidVolume) !== 'undefined'
            && self.displayOptions.layoutControls.persistentSettings.volume) {
            self.setVolume(self.fluidStorage.fluidVolume);

            if (typeof (self.fluidStorage.fluidMute) !== 'undefined' && self.fluidStorage.fluidMute === 'true') {
                self.muteToggle();
            }
        }

        if (typeof (self.fluidStorage.fluidQuality) !== 'undefined'
            && self.displayOptions.layoutControls.persistentSettings.quality) {
            const sourceOption = document.getElementById('source_' + self.videoPlayerId + '_' + self.fluidStorage.fluidQuality);
            const sourceChangeButton = document.getElementById(self.videoPlayerId + '_fluid_control_video_source');
            if (sourceOption) {
                sourceOption.click();
                sourceChangeButton.click();
            }
        }

        if (typeof (self.fluidStorage.fluidSpeed) !== 'undefined'
            && self.displayOptions.layoutControls.persistentSettings.speed) {
            self.setPlaybackSpeed(self.fluidStorage.fluidSpeed);
        }

        if (typeof (self.fluidStorage.fluidTheatre) !== 'undefined'
            && self.fluidStorage.fluidTheatre === 'true'
            && self.displayOptions.layoutControls.persistentSettings.theatre) {
            self.theatreToggle();
        }
    };

    // "API" Functions
    self.play = () => {
        if (!self.domRef.player.paused) {
            return;
        }
        self.playPauseToggle();
        return true;
    };

    self.pause = () => {
        if (!self.domRef.player.paused) {
            self.playPauseToggle();
        }
        return true;
    };

    self.skipTo = (time) => {
        self.domRef.player.currentTime = time;
    };

    self.setPlaybackSpeed = (speed) => {
        if (self.isCurrentlyPlayingAd) {
            return;
        }
        self.domRef.player.playbackRate = speed;
        self.fluidStorage.fluidSpeed = speed;
    };

    self.setVolume = (passedVolume) => {
        self.domRef.player.volume = passedVolume;

        // If user scrolls to volume 0, we should not store 0 as
        // latest volume - there is a property called "muted" already
        // and storing 0 will break the toggle.
        // In case user scrolls to 0 we assume last volume to be 1
        // for toggle.
        const latestVolume = 0 === passedVolume ? 1 : passedVolume;

        self.latestVolume = latestVolume;
        self.fluidStorage.fluidVolume = latestVolume;
    };

    self.isCurrentlyPlayingVideo = (instance) => {
        return instance && instance.currentTime > 0 && !instance.paused && !instance.ended && instance.readyState > 2;
    };

    self.setHtmlOnPauseBlock = (passedHtml) => {
        if (typeof passedHtml != 'object' || typeof passedHtml.html == 'undefined') {
            return false;
        }

        const htmlBlock = document.getElementById(self.videoPlayerId + '_fluid_html_on_pause');

        // We create the HTML block from scratch if it doesn't already exist
        if (!htmlBlock) {
            const containerDiv = document.createElement('div');
            containerDiv.id = self.videoPlayerId + '_fluid_html_on_pause';
            containerDiv.className = 'fluid_html_on_pause';
            containerDiv.style.display = 'none';
            containerDiv.innerHTML = passedHtml.html;
            containerDiv.onclick = function () {
                self.playPauseToggle();
            };

            if (passedHtml.width) {
                containerDiv.style.width = passedHtml.width + 'px';
            }

            if (passedHtml.height) {
                containerDiv.style.height = passedHtml.height + 'px';
            }

            self.domRef.player.parentNode.insertBefore(containerDiv, null);
            return;
        }

        htmlBlock.innerHTML = passedHtml.html;

        if (passedHtml.width) {
            htmlBlock.style.width = passedHtml.width + 'px';
        }

        if (passedHtml.height) {
            htmlBlock.style.height = passedHtml.height + 'px';
        }
    };

    self.toggleControlBar = (show) => {
        const controlBar = document.getElementById(self.videoPlayerId + 'fluid_controls_container');

        if (show) {
            controlBar.className += ' initial_controls_show';
            return;
        }

        controlBar.className = controlBar.className.replace(' initial_controls_show', '');
    };

    self.on = (eventCall, functionCall) => {
        switch (eventCall) {
            case 'play':
                self.domRef.player.onplay = functionCall;
                break;
            case 'seeked':
                self.domRef.player.onseeked = functionCall;
                break;
            case 'ended':
                self.domRef.player.onended = functionCall;
                break;
            case 'pause':
                self.domRef.player.addEventListener('pause', () => {
                    if (!self.fluidPseudoPause) {
                        functionCall();
                    }
                });
                break;
            case 'playing':
                self.domRef.player.addEventListener('playing', functionCall);
                break;
            case 'theatreModeOn':
                self.domRef.player.addEventListener('theatreModeOn', functionCall);
                break;
            case 'theatreModeOff':
                self.domRef.player.addEventListener('theatreModeOff', functionCall);
                break;
            case 'timeupdate':
                self.domRef.player.addEventListener('timeupdate', () => {
                    functionCall(self.getCurrentTime())
                });
                break;
            default:
                console.log('[FP_ERROR] Event not recognised');
                break;
        }
    };

    self.toggleLogo = (logo) => {
        if (typeof logo != 'object' || !logo.imageUrl) {
            return false;
        }

        const logoBlock = document.getElementById(self.videoPlayerId + "_logo");

        // We create the logo from scratch if it doesn't already exist, they might not give everything correctly so we
        self.displayOptions.layoutControls.logo.imageUrl = (logo.imageUrl) ? logo.imageUrl : null;
        self.displayOptions.layoutControls.logo.position = (logo.position) ? logo.position : 'top left';
        self.displayOptions.layoutControls.logo.clickUrl = (logo.clickUrl) ? logo.clickUrl : null;
        self.displayOptions.layoutControls.logo.opacity = (logo.opacity) ? logo.opacity : 1;
        self.displayOptions.layoutControls.logo.mouseOverImageUrl = (logo.mouseOverImageUrl) ? logo.mouseOverImageUrl : null;
        self.displayOptions.layoutControls.logo.imageMargin = (logo.imageMargin) ? logo.imageMargin : '2px';
        self.displayOptions.layoutControls.logo.hideWithControls = (logo.hideWithControls) ? logo.hideWithControls : false;
        self.displayOptions.layoutControls.logo.showOverAds = (logo.showOverAds) ? logo.showOverAds : false;

        if (logoBlock) {
            logoBlock.remove();
        }

        self.initLogo();
    };

    // this functions helps in adding event listeners for future dynamic elements
    // trackEvent(document, "click", ".some_elem", callBackFunction);
    self.trackEvent = (el, evt, sel, handler) => {
        if (typeof self.events[sel] === 'undefined') {
            self.events[sel] = {};
        }

        if (typeof self.events[sel][evt] === 'undefined') {
            self.events[sel][evt] = [];
        }

        self.events[sel][evt].push(handler);
        self.registerListener(el, evt, sel, handler);
    };

    self.registerListener = (el, evt, sel, handler) => {
        const currentElements = el.querySelectorAll(sel);
        for (let i = 0; i < currentElements.length; i++) {
            currentElements[i].addEventListener(evt, handler);
        }
    };

    self.copyEvents = (topLevelEl) => {
        for (let sel in self.events) {
            if (!self.events.hasOwnProperty(sel)) {
                continue;
            }

            for (let evt in self.events[sel]) {
                if (!self.events[sel].hasOwnProperty(evt)) {
                    continue;
                }

                for (let i = 0; i < self.events[sel][evt].length; i++) {
                    self.registerListener(topLevelEl, evt, sel, self.events[sel][evt][i]);
                }
            }
        }
    };

    self.destroy = () => {
        const numDestructors = self.destructors.length;

        if (0 === numDestructors) {
            return;
        }

        for (let i = 0; i < numDestructors; ++i) {
            self.destructors[i].bind(this)();
        }

        const container = document.getElementById('fluid_video_wrapper_' + self.videoPlayerId);

        if (!container) {
            console.warn('Unable to remove wrapper element for Fluid Player instance - element not found ' + self.videoPlayerId);
            return;
        }

        if ('function' === typeof container.remove) {
            container.remove();
            return;
        }

        if (container.parentNode) {
            container.parentNode.removeChild(container);
            return;
        }

        console.error('Unable to remove wrapper element for Fluid Player instance - no parent' + self.videoPlayerId);
    }
};

/**
 * Public Fluid Player API interface
 * @param instance
 */
const fluidPlayerInterface = function (instance) {
    this.play = () => {
        return instance.play()
    };

    this.pause = () => {
        return instance.pause()
    };

    this.skipTo = (position) => {
        return instance.skipTo(position)
    };

    this.setPlaybackSpeed = (speed) => {
        return instance.setPlaybackSpeed(speed)
    };

    this.setVolume = (volume) => {
        return instance.setVolume(volume)
    };

    this.setHtmlOnPauseBlock = (options) => {
        return instance.setHtmlOnPauseBlock(options)
    };

    this.toggleControlBar = (state) => {
        return instance.toggleControlBar(state)
    };

    this.toggleFullScreen = (state) => {
        return instance.fullscreenToggle(state)
    };

    this.destroy = () => {
        return instance.destroy()
    };

    this.dashInstance = () => {
        return !!instance.dashPlayer ? instance.dashPlayer : null;
    }

    this.hlsInstance = () => {
        return !!instance.hlsPlayer ? instance.hlsPlayer : null;
    }

    this.on = (event, callback) => {
        return instance.on(event, callback)
    };
}

/**
 * Initialize and attach Fluid Player to instance of HTMLVideoElement
 *
 * @param target ID of HTMLVideoElement or reference to HTMLVideoElement
 * @param options Fluid Player configuration options
 * @returns {fluidPlayerInterface}
 */
const fluidPlayerInitializer = function (target, options) {
    const instance = new fluidPlayerClass();

    if (!options) {
        options = {};
    }

    instance.init(target, options);

    const publicInstance = new fluidPlayerInterface(instance);

    if (window && FP_DEVELOPMENT_MODE) {
        const debugApi = {
            id: target,
            options: options,
            instance: publicInstance,
            internals: instance
        };

        if (typeof window.fluidPlayerDebug === 'undefined') {
            window.fluidPlayerDebug = [];
        }

        window.fluidPlayerDebug.push(debugApi);

        console.log('Created instance of Fluid Player. ' +
            'Debug API available at window.fluidPlayerDebug[' + (window.fluidPlayerDebug.length - 1) + '].', debugApi);
    }

    return publicInstance;
}


if (FP_DEVELOPMENT_MODE) {
    console.log('Fluid Player - Development Build' + (FP_RUNTIME_DEBUG ? ' (in debug mode)' : ''));
}

export default fluidPlayerInitializer;
