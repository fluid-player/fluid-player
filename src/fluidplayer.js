'use strict';

// Player modules
import VPAIDModule from './modules/vpaid';
import VASTModule from './modules/vast';
import CardboardModule from './modules/cardboard';
import SubtitleModule from './modules/subtitles';
import TimelineModule from './modules/timeline';
import AdSupportModule from './modules/adsupport';
import StreamingModule from './modules/streaming';
import UtilsModule from './modules/utils';
import SuggestedVideosModule from './modules/suggestedVideos';
import MiniPlayerModule from './modules/miniplayer';

const FP_MODULES = [
    VPAIDModule,
    VASTModule,
    CardboardModule,
    SubtitleModule,
    TimelineModule,
    AdSupportModule,
    StreamingModule,
    UtilsModule,
    SuggestedVideosModule,
    MiniPlayerModule
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

        if (playerNode.classList.contains('js-fluid-player')) {
            throw 'Invalid initializer - player target already is initialized';
        }

        playerNode.setAttribute('playsinline', '');
        playerNode.setAttribute('webkit-playsinline', '');
        playerNode.classList.add('js-fluid-player');

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
         * Don't use this as a way to change the DOM. DOM manipulation should be done with domRef.
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
        self.rollsById = {};
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
        self.timeSkipOffsetAmount = 10;
        // Only for linear ads, non linear are not taken into account
        self.currentMediaSourceType = 'source';
        self.isLiveStream = null;

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
                subtitlesOnByDefault: true,
                showCardBoardView: false,
                showCardBoardJoystick: false,
                allowTheatre: true,
                doubleclickFullscreen: true,
                autoRotateFullScreen: false,
                theatreSettings: {
                    width: '100%',
                    height: '60%',
                    marginTop: 0,
                    horizontalAlign: 'center',
                    keepPosition: false
                },
                theatreAdvanced: {
                    theatreElement: null,
                },
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
                    animated: true,
                    playbackRates: ['x2', 'x1.5', 'x1', 'x0.5']
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
                    show: false,
                    doubleTapMobile: true
                },
                contextMenu: {
                    controls: true,
                    links: []
                },
                miniPlayer: {
                    enabled: true,
                    width: 400,
                    height: 225,
                    widthMobile: 50,
                    placeholderText: 'Playing in Miniplayer',
                    position: 'bottom right',
                    autoToggle: false,
                },
                roundedCorners: 0
            },
            suggestedVideos: {
                configUrl: null
            },
            vastOptions: {
                adList: {},
                skipButtonCaption: 'Skip ad in [seconds]',
                skipButtonClickCaption: 'Skip Ad <span class="skip_button_icon"></span>',
                adText: null,
                adTextPosition: 'top left',
                adCTAText: 'Visit now!',
                adCTATextPosition: 'bottom right',
                adCTATextVast: false,
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
            hls: {
                overrideNative: false
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

        /**
         * Replaces values from objects without replacing the default object
         *
         * @param defaults
         * @param options
         * @returns {object}
         */
        function overrideDefaults(defaults, options) {
            Object.keys(options).forEach(defaultKey => {
                if (
                    typeof options[defaultKey] === 'object' &&
                    options[defaultKey] !== null &&
                    !Array.isArray(options[defaultKey])
                ) {
                    overrideDefaults(defaults[defaultKey], options[defaultKey]);
                } else if (typeof options[defaultKey] !== 'undefined') {
                    defaults[defaultKey] = options[defaultKey];
                }
            });

            return defaults;
        }

        overrideDefaults(self.displayOptions, options);

        self.domRef.wrapper = self.setupPlayerWrapper();

        playerNode.addEventListener('webkitfullscreenchange', self.recalculateAdDimensions);
        playerNode.addEventListener('fullscreenchange', self.recalculateAdDimensions);
        playerNode.addEventListener('waiting', self.onRecentWaiting);
        playerNode.addEventListener('pause', self.onFluidPlayerPause);
        playerNode.addEventListener('error', self.onErrorDetection);
        playerNode.addEventListener('ended', self.onMainVideoEnded);
        playerNode.addEventListener('durationchange', () => {
            self.currentVideoDuration = self.getCurrentVideoDuration();
        });

        // 'loadedmetadata' inconsistently fires because the audio can already be loaded when the listener is added.
        // Here we use readystate to see if metadata has already loaded
        if (playerNode.readyState > 0) {
            self.mainVideoReady();
        } else {
            playerNode.addEventListener('loadedmetadata', self.mainVideoReady);
        }

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

        self.generateSuggestedVideoList();

        // Previously prevented to be initialized if preRolls were set up
        // but now the streamers support reinitialization
        self.initialiseStreamers();

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

        if (!self.mobileInfo.userOs) {
            if (!self.displayOptions.layoutControls.controlBar.autoHide) {
                self.domRef.wrapper.addEventListener('mouseleave', self.handleMouseleave, false);
            }
            self.domRef.wrapper.addEventListener('mouseenter', self.showControlBar, false);
            self.domRef.wrapper.addEventListener('mouseenter', self.showTitle, false);
        } else {
            //On mobile mouseleave behavior does not make sense, so it's better to keep controls, once the playback starts
            //Autohide behavior on timer is a separate functionality
            self.hideControlBar();
            self.domRef.wrapper.addEventListener('touchstart', self.showControlBar, { passive: true });
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

        const loaderDiv = self.domRef.wrapper.querySelector('.vast_video_loading');

        if (loaderDiv) {
            loaderDiv.style.display = showLoader ? 'table' : 'none';
        }
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

    /**
     * Makes a XMLHttpRequest encapsulated by a Promise
     *
     * @param url
     * @param withCredentials
     * @param timeout
     * @returns {Promise<unknown>}
     */
    self.sendRequestAsync = async (url, withCredentials, timeout) => {
        return await new Promise((resolve, reject) => {
            const xmlHttpReq = new XMLHttpRequest();

            xmlHttpReq.onreadystatechange = (event) => {
                const response = event.target;

                if (response.readyState === 4 && response.status >= 200 && response.status < 300) {
                    resolve(response);
                } else if (response.readyState === 4) {
                    reject(response);
                }
            };

            self.displayOptions.onBeforeXMLHttpRequestOpen(xmlHttpReq);

            xmlHttpReq.open('GET', url, true);
            xmlHttpReq.withCredentials = withCredentials;
            xmlHttpReq.timeout = timeout;

            self.displayOptions.onBeforeXMLHttpRequest(xmlHttpReq);

            xmlHttpReq.send();
        })
    };

    // TODO: rename
    self.announceLocalError = (code, msg) => {
        const parsedCode = typeof (code) !== 'undefined' ? parseInt(code) : 900;
        let message = '[Error] (' + parsedCode + '): ';
        message += !msg ? 'Failed to load Vast' : msg;
        console.warn(message);
    };

    // TODO: move this somewhere else and refactor
    self.debugMessage = (...msg) => {
        const style = 'color: #fff; font-weight: bold; background-color: #1a5e87; padding: 3px 6px; border-radius: 3px;';

        if (self.displayOptions.debug) {
            console.log('%cFP DEBUG', style, ...msg);
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

        // Event listener doesn't wait on flags to be flipped from post roll ads, needs small time out to compensate
        setTimeout(() => {
            if (!self.isCurrentlyPlayingAd && self.displayOptions.suggestedVideos.configUrl) {
                self.displaySuggestedVideos();
            }
        }, 100);
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
        controls.loader.style.display = 'none';

        // Root element
        controls.root = document.createElement('div');
        controls.root.className = 'fluid_controls_container';

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
        controls.leftContainer.appendChild(controls.playPause);

        if (options.controlForwardBackward) {
            // Left container -> Skip backwards
            controls.skipBack = document.createElement('div');
            controls.skipBack.className = 'fluid_button fluid_button_skip_back';
            controls.leftContainer.appendChild(controls.skipBack);

            // Left container -> Skip forward
            controls.skipForward = document.createElement('div');
            controls.skipForward.className = 'fluid_button fluid_button_skip_forward';
            controls.leftContainer.appendChild(controls.skipForward);
        }

        // Progress container
        controls.progressContainer = document.createElement('div');
        controls.progressContainer.className = 'fluid_controls_progress_container fluid_slider';
        controls.root.appendChild(controls.progressContainer);

        // Progress container -> Progress wrapper
        controls.progressWrapper = document.createElement('div');
        controls.progressWrapper.className = 'fluid_controls_progress';
        controls.progressContainer.appendChild(controls.progressWrapper);

        // Progress container -> Progress wrapper -> Current progress
        controls.progressCurrent = document.createElement('div');
        controls.progressCurrent.className = 'fluid_controls_currentprogress';
        controls.progressCurrent.style.backgroundColor = options.primaryColor;
        controls.progressWrapper.appendChild(controls.progressCurrent);

        // Progress container -> Progress wrapper -> Current progress -> Marker
        controls.progress_current_marker = document.createElement('div');
        controls.progress_current_marker.className = 'fluid_controls_currentpos';
        controls.progressCurrent.appendChild(controls.progress_current_marker);

        // Progress container -> Buffered indicator
        controls.bufferedIndicator = document.createElement('div');
        controls.bufferedIndicator.className = 'fluid_controls_buffered';
        controls.progressContainer.appendChild(controls.bufferedIndicator);

        // Progress container -> Ad markers
        controls.adMarkers = document.createElement('div');
        controls.adMarkers.className = 'fluid_controls_ad_markers_holder';
        controls.progressContainer.appendChild(controls.adMarkers);

        // Right container
        controls.rightContainer = document.createElement('div');
        controls.rightContainer.className = 'fluid_controls_right';
        controls.root.appendChild(controls.rightContainer);

        // Right container -> Fullscreen
        controls.fullscreen = document.createElement('div');
        controls.fullscreen.className = 'fluid_button fluid_control_fullscreen fluid_button_fullscreen';
        controls.rightContainer.appendChild(controls.fullscreen);

        if (options.miniPlayer.enabled) {
            // Right container -> MiniPlayer
            controls.miniPlayer = document.createElement('div');
            controls.miniPlayer.className = 'fluid_button fluid_control_mini_player fluid_button_mini_player';
            controls.rightContainer.appendChild(controls.miniPlayer);
        }

        // Right container -> Theatre
        controls.theatre = document.createElement('div');
        controls.theatre.className = 'fluid_button fluid_control_theatre fluid_button_theatre';
        controls.rightContainer.appendChild(controls.theatre);

        // Right container -> Cardboard
        controls.cardboard = document.createElement('div');
        controls.cardboard.className = 'fluid_button fluid_control_cardboard fluid_button_cardboard';
        controls.rightContainer.appendChild(controls.cardboard);

        // Right container -> Subtitles
        controls.subtitles = document.createElement('div');
        controls.subtitles.className = 'fluid_button fluid_control_subtitles fluid_button_subtitles';
        controls.rightContainer.appendChild(controls.subtitles);

        // Right container -> Video source
        controls.videoSource = document.createElement('div');
        controls.videoSource.className = 'fluid_button fluid_control_video_source fluid_button_video_source';
        controls.rightContainer.appendChild(controls.videoSource);

        // Right container -> Playback rate
        controls.playbackRate = document.createElement('div');
        controls.playbackRate.className = 'fluid_button fluid_control_playback_rate fluid_button_playback_rate';
        controls.rightContainer.appendChild(controls.playbackRate);

        // Right container -> Download
        controls.download = document.createElement('div');
        controls.download.className = 'fluid_button fluid_control_download fluid_button_download';
        controls.rightContainer.appendChild(controls.download);

        // Right container -> Volume container
        controls.volumeContainer = document.createElement('div');
        controls.volumeContainer.className = 'fluid_control_volume_container fluid_slider';
        controls.rightContainer.appendChild(controls.volumeContainer);

        // Right container -> Volume container -> Volume
        controls.volume = document.createElement('div');
        controls.volume.className = 'fluid_control_volume';
        controls.volumeContainer.appendChild(controls.volume);

        // Right container -> Volume container -> Volume -> Current
        controls.volumeCurrent = document.createElement('div');
        controls.volumeCurrent.className = 'fluid_control_currentvolume';
        controls.volume.appendChild(controls.volumeCurrent);

        // Right container -> Volume container -> Volume -> Current -> position
        controls.volumeCurrentPos = document.createElement('div');
        controls.volumeCurrentPos.className = 'fluid_control_volume_currentpos';
        controls.volumeCurrent.appendChild(controls.volumeCurrentPos);

        // Right container -> Volume container
        controls.mute = document.createElement('div');
        controls.mute.className = 'fluid_button fluid_button_volume fluid_control_mute';
        controls.rightContainer.appendChild(controls.mute);

        // Right container -> Volume Control + Live Steam Button
        const durationContainer = document.createElement('div');
        durationContainer.className = 'fluid_control_duration';

        controls.duration = document.createElement('div');
        controls.duration.className = 'fluid_fluid_control_duration';
        controls.duration.innerText = '00:00 / 00:00';

        if (!options.displayVolumeBar) {
            durationContainer.className = durationContainer.className + ' no_volume_bar';
        }

        controls.live_indicator = document.createElement('div');
        controls.live_indicator.className = 'fluid_control_live_indicator';
        durationContainer.append(controls.live_indicator, controls.duration);
        controls.rightContainer.appendChild(durationContainer);

        return controls;
    };

    self.showLiveIndicator = () => {
        const liveIndicatorButton = self.domRef.player.parentNode.getElementsByClassName('fluid_button_live_indicator');
        if (!liveIndicatorButton.length) {
            const liveIndicator = self.domRef.player.parentNode.getElementsByClassName('fluid_control_live_indicator');
            const liveIndicatorButton = document.createElement('span');
            liveIndicatorButton.className = 'fluid_button_live_indicator';
            liveIndicatorButton.innerHTML = `LIVE<span class="live_circle"></span>`;
            liveIndicatorButton.addEventListener('click', () => {
                self.domRef.player.currentTime = self.currentVideoDuration;
            });

            for (let i = 0; i < liveIndicator.length; i++) {
                liveIndicator[i].appendChild(liveIndicatorButton);
            }
        }
    };

    self.hideLiveIndicator = () => {
        const liveIndicatorButton = self.domRef.player.parentNode.getElementsByClassName('fluid_button_live_indicator')[0];

        if (liveIndicatorButton) {
            liveIndicatorButton.remove();
        }
    };

    self.controlPlayPauseToggle = () => {
        const playPauseButton = self.domRef.player.parentNode.getElementsByClassName('fluid_control_playpause');
        const menuOptionPlay = self.domRef.wrapper.querySelector('.context_option_play');
        const controlsDisplay = self.domRef.player.parentNode.getElementsByClassName('fluid_controls_container');
        const fpLogo = self.domRef.wrapper.querySelector('.logo_holder');

        const initialPlay = self.domRef.wrapper.querySelector('.fluid_initial_play');
        if (initialPlay) {
            self.domRef.wrapper.querySelector('.fluid_initial_play').style.display = "none";
            self.domRef.wrapper.querySelector('.fluid_initial_play_button_container').style.opacity = "1";
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
            self.domRef.wrapper.querySelector('.fluid_initial_play').style.display = "block";
            self.domRef.wrapper.querySelector('.fluid_initial_play_button_container').style.opacity = "1";
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

        const playButtonElement = self.domRef.wrapper.querySelector('.fluid_initial_play_button, .fluid_initial_pause_button');

        if (play) {
            playButtonElement.classList.remove('fluid_initial_pause_button');
            playButtonElement.classList.add('fluid_initial_play_button');
        } else {
            playButtonElement.classList.remove('fluid_initial_play_button');
            playButtonElement.classList.add('fluid_initial_pause_button');
        }

        self.domRef.wrapper.querySelector('.fluid_initial_play').classList.add('transform-active');
        setTimeout(
            function () {
                self.domRef.wrapper.querySelector('.fluid_initial_play').classList.remove('transform-active');
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
            timePlaceholder[i].innerHTML = '';

            if (self.isLiveStream) {
                const liveIndicatorButton = document.createElement('span');
                liveIndicatorButton.className = 'fluid_button_live_indicator';
                liveIndicatorButton.innerHTML = `LIVE<span class="live_circle"></span>`;
                liveIndicatorButton.addEventListener('pointerdown', () => {
                    self.domRef.player.currentTime = self.currentVideoDuration;
                });
                timePlaceholder[i].appendChild(liveIndicatorButton);
            }

            const durationTextElement = document.createElement('span');
            durationTextElement.className = 'fluid_fluid_control_duration';
            durationTextElement.innerText = durationText;
            timePlaceholder[i].appendChild(durationTextElement);
        }
    };

    self.contolVolumebarUpdate = () => {
        const currentVolumeTag = self.domRef.wrapper.querySelector('.fluid_control_currentvolume');
        const volumeposTag = self.domRef.wrapper.querySelector('.fluid_control_volume_currentpos');
        const volumebarTotalWidth = self.domRef.wrapper.querySelector('.fluid_control_volume').clientWidth;
        const volumeposTagWidth = volumeposTag.clientWidth;
        const muteButtonTag = self.domRef.player.parentNode.getElementsByClassName('fluid_control_mute');
        const menuOptionMute = self.domRef.wrapper.querySelector('.context_option_mute');

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

    self.checkFullscreenSupport = () => {
        const videoPlayerWrapper = self.domRef.wrapper;

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
        self.debugMessage(`Toggling Full Screen`);
        const videoPlayerTag = self.domRef.player;
        const fullscreenTag = self.domRef.wrapper;
        const requestFullscreenFunctionNames = self.checkFullscreenSupport();
        const fullscreenButton = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_fullscreen');
        const menuOptionFullscreen = fullscreenTag.querySelector('.context_option_fullscreen');
        self.resetDisplayMode('fullScreen');

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

        // Listen for fullscreen exit event on safari, as the fullscreen mode uses the native UI in iOS
        self.domRef.player.addEventListener('webkitendfullscreen', () => {
            self.fullscreenOff(fullscreenButton, menuOptionFullscreen);
        });
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

        const requestFullscreenFunctionNames = self.checkFullscreenSupport();
        if (requestFullscreenFunctionNames && document[requestFullscreenFunctionNames.isFullscreen]) {
            fullscreenMultiplier = 0;
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
            initialPosition = self.getEventOffsetX(event, self.domRef.wrapper.querySelector('.fluid_controls_progress_container'));
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
            const totalWidth = self.domRef.wrapper.querySelector('.fluid_controls_progress_container').clientWidth;
            if (totalWidth) {
                self.domRef.player.currentTime = self.currentVideoDuration * timeBarX / totalWidth;
            }

            self.hideSuggestedVideos();
        };

        const onProgressbarMouseMove = event => {
            const currentX = self.getEventOffsetX(event, event.target.parentNode);
            initialPosition = NaN; // mouse up will fire after the move, we don't want to trigger the initial position in the event of iOS
            shiftTime(currentX);
            self.contolProgressbarUpdate();
            self.controlDurationUpdate();
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
        document.addEventListener('touchend', onProgressbarMouseUp, { passive: true });
        document.addEventListener('mousemove', onProgressbarMouseMove);
        document.addEventListener('touchmove', onProgressbarMouseMove, { passive: true });
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
        document.addEventListener('touchend', onVolumeBarMouseUp, { passive: true });
        document.addEventListener('mousemove', onVolumeBarMouseMove);
        document.addEventListener('touchmove', onVolumeBarMouseMove, { passive: true });
    };

    self.findRoll = (roll) => {
        const ids = [];
        ids.length = 0;

        if (!roll || !self.hasOwnProperty('rollsById')) {
            return;
        }

        for (let key in self.rollsById) {
            if (!self.rollsById.hasOwnProperty(key)) {
                continue;
            }

            if (self.rollsById[key].roll === roll) {
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
                    self.skipRelative(-self.timeSkipOffsetAmount);
                    break;
                case 39://right arrow
                    self.skipRelative(self.timeSkipOffsetAmount);
                    break;
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
                case 73: // i
                    self.toggleMiniPlayer(undefined, true);
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
            console.warn('Dangling click event listener should be collected for unknown wrapper.' +
              'Did you forget to call destroy on player instance?');
            return;
        }

        const inScopeClick = self.domRef.wrapper.contains(e.target) || e.target.classList.contains('.js-skipHref');

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
            const initialControlsDisplay = self.domRef.wrapper.querySelector('.fluid_controls_container');
            initialControlsDisplay.classList.remove('initial_controls_show');
            // The logo shows before playing but may need to be removed
            const fpPlayer = self.domRef.wrapper.querySelector('.logo_holder');
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
        self.hideSuggestedVideos();
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
                    // Check if video has ended. If so, replay
                    if (
                        Math.floor(self.domRef.player.currentTime) !== 0 &&
                        Math.floor(self.currentVideoDuration) === Math.floor(self.domRef.player.currentTime)
                    ) {
                        self.initialiseStreamers();
                        self.domRef.player.currentTime = 0;
                    }

                    if (self.hlsPlayer && !self.hlsPlayer.config.autoStartLoad) {
                        self.hlsPlayer.startLoad();
                    }

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
            self.scheduleOnDemandRolls();
        };

        if (isFirstStart) {
            // Remove the div that was placed as a fix for poster image and DASH streaming, if it exists
            const pseudoPoster = self.domRef.wrapper.querySelector('.fluid_pseudo_poster');
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

        const blockOnPause = self.domRef.wrapper.querySelector('.fluid_html_on_pause_container');

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
            self.domRef.wrapper.querySelector('.fluid_controls_progress_container')
                .addEventListener(eventOn, event => self.onProgressbarMouseDown(event), { passive: true });
        }

        //Set the volume controls
        self.domRef.wrapper.querySelector('.fluid_control_volume_container')
            .addEventListener(eventOn, event => self.onVolumeBarMouseDown(), { passive: true });

        self.domRef.player.addEventListener('volumechange', () => self.contolVolumebarUpdate());

        self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_mute', () => self.muteToggle());

        self.setBuffering();

        //Set the fullscreen control
        self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_fullscreen', () => self.fullscreenToggle());

        // Theatre mode
        if (self.displayOptions.layoutControls.allowTheatre && !self.isInIframe) {
            self.domRef.wrapper.querySelector('.fluid_control_theatre').style.display = 'inline-block';
            self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_theatre', () => self.theatreToggle());
        } else {
            self.domRef.wrapper.querySelector('.fluid_control_theatre').style.display = 'none';
        }

        // Mini Player
        if (self.displayOptions.layoutControls.miniPlayer.enabled && !self.isInIframe) {
            self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_mini_player', () => self.toggleMiniPlayer(undefined, true));
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

        const progressContainer = self.domRef.wrapper.querySelector('.fluid_controls_progress_container');
        const previewContainer = document.createElement('div');

        previewContainer.className = 'fluid_timeline_preview';
        previewContainer.style.display = 'none';
        previewContainer.style.position = 'absolute';

        progressContainer.appendChild(previewContainer);

        // Set up hover for time position preview display
        self.domRef.wrapper.querySelector('.fluid_controls_progress_container')
            .addEventListener('mousemove', event => {
                const progressContainer = self.domRef.wrapper.querySelector('.fluid_controls_progress_container');
                const totalWidth = progressContainer.clientWidth;
                const hoverTimeItem = self.domRef.wrapper.querySelector('.fluid_timeline_preview');
                const hoverQ = self.getEventOffsetX(event, progressContainer);

                const hoverSecondQ = self.currentVideoDuration * hoverQ / totalWidth;
                hoverTimeItem.innerText = self.formatTime(hoverSecondQ);

                hoverTimeItem.style.display = 'block';
                hoverTimeItem.style.left = (hoverSecondQ / self.domRef.player.duration * 100) + "%";
            }, false);

        // Hide timeline preview on mouseout
        self.domRef.wrapper.querySelector('.fluid_controls_progress_container')
            .addEventListener('mouseout', () => {
                const hoverTimeItem = self.domRef.wrapper.querySelector('.fluid_timeline_preview');
                hoverTimeItem.style.display = 'none';
            }, false);
    };

    self.setCustomContextMenu = () => {
        const playerWrapper = self.domRef.wrapper;

        const showDefaultControls = self.displayOptions.layoutControls.contextMenu.controls;
        const extraLinks = self.displayOptions.layoutControls.contextMenu.links;

        //Create own context menu
        const divContextMenu = document.createElement('div');
        divContextMenu.className = 'fluid_context_menu';
        divContextMenu.style.display = 'none';
        divContextMenu.style.position = 'absolute';

        const contextMenuList = document.createElement('ul');
        divContextMenu.appendChild(contextMenuList);

        if (Array.isArray(extraLinks)) {
            extraLinks.forEach(function appendExtraLinks(link, index) {
                const linkItem = document.createElement('li');
                linkItem.innerHTML = link.label;
                linkItem.addEventListener('click', () => window.open(link.href, '_blank'), false);
                contextMenuList.appendChild(linkItem);
            });
        }

        if (showDefaultControls) {
            const menuItemPlay = document.createElement('li');
            menuItemPlay.className = 'context_option_play';
            menuItemPlay.innerHTML = self.displayOptions.captions.play;
            menuItemPlay.addEventListener('click', () => self.playPauseToggle(), false);
            contextMenuList.appendChild(menuItemPlay);

            const menuItemMute = document.createElement('li');
            menuItemMute.className = 'context_option_mute';
            menuItemMute.innerHTML = self.displayOptions.captions.mute;
            menuItemMute.addEventListener('click', () => self.muteToggle(), false);
            contextMenuList.appendChild(menuItemMute);

            const menuItemFullscreen = document.createElement('li');
            menuItemFullscreen.className = 'context_option_fullscreen';
            menuItemFullscreen.innerHTML = self.displayOptions.captions.fullscreen;
            menuItemFullscreen.addEventListener('click', () => self.fullscreenToggle(), false);
            contextMenuList.appendChild(menuItemFullscreen);
        }

        const menuItemVersion = document.createElement('li');
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
            controlForwardBackward: !!self.displayOptions.layoutControls.controlForwardBackward.show,
            miniPlayer: self.displayOptions.layoutControls.miniPlayer,
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
                self.contolVolumebarUpdate();
            } else {
                remainingAttemptsToInitiateVolumeBar--;
            }
        };
        let initiateVolumebarTimerId = setInterval(initiateVolumebar, 100);
        self.destructors.push(() => clearInterval(initiateVolumebarTimerId));

        if (self.displayOptions.layoutControls.doubleclickFullscreen && !(self.isTouchDevice() || !self.displayOptions.layoutControls.controlForwardBackward.doubleTapMobile)) {
            self.domRef.player.addEventListener('dblclick', self.fullscreenToggle);
        }

        if (self.getMobileOs().userOs === 'iOS') {
            let orientationListenerAdded = false;
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        self.domRef.player.inView = true;
                        if (self.displayOptions.layoutControls.autoRotateFullScreen && self.isTouchDevice() && !orientationListenerAdded) {
                            window.matchMedia("(orientation: landscape)").addEventListener('change', self.handleOrientationChange);
                            orientationListenerAdded = true;
                        }
                    } else {
                        self.domRef.player.inView = false;
                    }
                });
            });

            observer.observe(self.domRef.player);
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

        self.toggleMiniPlayerScreenDetection();

        if (!!self.displayOptions.layoutControls.controlForwardBackward.show) {
            self.initSkipControls();
        }

        if (!!self.displayOptions.layoutControls.controlForwardBackward.doubleTapMobile) {
            self.initDoubleTapSkip();
        }

        self.initSkipAnimationElements();
    };

    self.initSkipControls = () => {
        self.domRef.controls.skipBack.addEventListener('click', self.skipRelative.bind(this, -self.timeSkipOffsetAmount));
        self.domRef.controls.skipForward.addEventListener('click', self.skipRelative.bind(this, self.timeSkipOffsetAmount));
    };

    // Function to handle fullscreen toggle based on orientation
    self.handleOrientationChange = () => {
        const isLandscape = window.matchMedia("(orientation: landscape)").matches;
        const videoPlayerTag = self.domRef.player;
        const fullscreenTag = self.domRef.wrapper;
        const requestFullscreenFunctionNames = self.checkFullscreenSupport();
        const fullscreenButton = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_fullscreen');
        const menuOptionFullscreen = fullscreenTag.querySelector('.context_option_fullscreen');
        let functionNameToExecute;
        if (isLandscape && self.domRef.player.inView) {
            if (requestFullscreenFunctionNames) {
                if (requestFullscreenFunctionNames.goFullscreen === 'webkitEnterFullscreen') {
                    functionNameToExecute = 'videoPlayerTag.' + requestFullscreenFunctionNames.goFullscreen + '();';
                    self.fullscreenOn(fullscreenButton, menuOptionFullscreen);
                    new Function('videoPlayerTag', functionNameToExecute)(videoPlayerTag);
                } else {
                    if (document[requestFullscreenFunctionNames.isFullscreen] === null) {
                        functionNameToExecute = 'videoPlayerTag.' + requestFullscreenFunctionNames.goFullscreen + '();';
                        self.fullscreenOn(fullscreenButton, menuOptionFullscreen);
                    }
                    new Function('videoPlayerTag', functionNameToExecute)(fullscreenTag);
                }
            } else {
                fullscreenTag.className += ' pseudo_fullscreen';
                self.fullscreenOn(fullscreenButton, menuOptionFullscreen);
            }
        } else {
            fullscreenTag.className = fullscreenTag.className.replace(/\bpseudo_fullscreen\b/g, '');
            if (requestFullscreenFunctionNames) {
                functionNameToExecute = 'document.' + requestFullscreenFunctionNames.exitFullscreen + '();';
                self.fullscreenOff(fullscreenButton, menuOptionFullscreen);
                new Function('videoPlayerTag', functionNameToExecute)(fullscreenTag);
            }  else {
                if (fullscreenTag.className.search(/\bpseudo_fullscreen\b/g) !== -1) {
                    fullscreenTag.className = fullscreenTag.className.replace(/\bpseudo_fullscreen\b/g, '');
                    self.fullscreenOff(fullscreenButton, menuOptionFullscreen);
                }
            }
        }
        self.resizeVpaidAuto();
    }

    /**
     * Creates the skip animation elements and appends them to the player
     *
     * @returns {void}
     */
    self.initSkipAnimationElements = function initSkipAnimationElements() {
        const skipAnimationWrapper = document.createElement('div');
        skipAnimationWrapper.classList.add('fluid_player_skip_offset');

        const skipAnimationBackward = document.createElement('div');
        skipAnimationBackward.classList.add('fluid_player_skip_offset__backward');
        skipAnimationWrapper.appendChild(skipAnimationBackward);

        const skipAnimationBackwardIcon = document.createElement('div');
        skipAnimationBackwardIcon.classList.add('fluid_player_skip_offset__backward-icon');
        skipAnimationBackwardIcon.ontransitionend = () => skipAnimationBackwardIcon.classList.remove('animate');
        skipAnimationBackward.appendChild(skipAnimationBackwardIcon);

        const skipAnimationForward = document.createElement('div');
        skipAnimationForward.classList.add('fluid_player_skip_offset__forward');
        skipAnimationWrapper.appendChild(skipAnimationForward);

        const skipAnimationForwardIcon = document.createElement('div');
        skipAnimationForwardIcon.classList.add('fluid_player_skip_offset__forward-icon');
        skipAnimationForwardIcon.ontransitionend = () => skipAnimationForwardIcon.classList.remove('animate');
        skipAnimationForward.appendChild(skipAnimationForwardIcon);

        self.domRef.player.parentNode.insertBefore(skipAnimationWrapper, self.domRef.player.nextSibling);
    }

    /**
     * Initialises the double tap skip functionality
     */
    self.initDoubleTapSkip = () => {
        let hasDoubleClicked = false;
        let timeouts = [];

        function clearTimeouts() {
            timeouts.forEach(timeout => clearTimeout(timeout));
            timeouts = [];
        }

        self.domRef.player.addEventListener('pointerdown', (event) => {
            // Check if it's mobile on the fly and prevent double click skip if it is
            if (!self.isTouchDevice()) {
                return;
            }

            // Save current state here, if you check the state in the settimeout it will always be true
            const isControlBarVisible = self.isControlBarVisible();

            const { offsetX } = event
            const { clientWidth } = self.domRef.player;

            // Simulates default behaviour if it's a single click
            timeouts.push(setTimeout(() => {
                hasDoubleClicked = false;
                    if (isControlBarVisible) {
                        self.playPauseToggle();
                    }
            }, 300));

            // Skips video time if it's a double click
            if (hasDoubleClicked) {
                clearTimeouts();
                hasDoubleClicked = false;
                return self.skipRelative(offsetX < clientWidth / 2 ? -self.timeSkipOffsetAmount : self.timeSkipOffsetAmount);
            }

            hasDoubleClicked = true;
        });
    }

    /**
     * Skips the video time by timeOffset relative to the current video time
     *
     * @param {number} timeOffset
     */
    self.skipRelative = function skipRelative(timeOffset) {
        self.debugMessage('skipping video time by ', timeOffset);
        if (self.isCurrentlyPlayingAd) {
            return;
        }

        let skipTo = self.domRef.player.currentTime + timeOffset;
        if (skipTo < 0) {
            skipTo = 0;
        }
        self.domRef.player.currentTime = skipTo;

        // Trigger animation
        if (timeOffset >= 0) {
            const forwardElement = self.domRef.wrapper.querySelector(`.fluid_player_skip_offset__forward-icon`);
            forwardElement.classList.add('animate');
        } else {
            const backwardElement = self.domRef.wrapper.querySelector(`.fluid_player_skip_offset__backward-icon`);
            backwardElement.classList.add('animate');
        }
    }

    /**
     * Checks if the volumebar is rendered and the styling applied by comparing
     * the width of 2 elements that should look different.
     *
     * @returns Boolean
     */
    self.checkIfVolumebarIsRendered = () => {
        const volumeposTag = self.domRef.wrapper.querySelector('.fluid_control_volume_currentpos');
        const volumebarTotalWidth = self.domRef.wrapper.querySelector('.fluid_control_volume').clientWidth;
        const volumeposTagWidth = volumeposTag.clientWidth;

        return volumeposTagWidth !== volumebarTotalWidth;
    };

    self.setLayout = () => {
        //All other browsers
        if (!self.isTouchDevice()) {
            self.domRef.player.addEventListener('click', () => self.playPauseToggle(), false);
        }
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

        const parseBorderRadius = () => {
            const roundedCorners = self.displayOptions.layoutControls.roundedCorners;
            const parsedValue = Number(roundedCorners);

            return !isNaN(parsedValue) && parsedValue !== 0
                ? `${parsedValue}px`
                : roundedCorners;
        }

        wrapper.style.borderRadius = self.domRef.player.style.borderRadius = parseBorderRadius();
        wrapper.style.overflow = 'hidden';

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

    self.createVideoSourceSwitch = (initialLoad = true) => {
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

        const sourceChangeButton = self.domRef.wrapper.querySelector('.fluid_control_video_source');
        self.videoSources = sources;

        if (self.videoSources.length > 1) {
            sourceChangeButton.style.display = 'inline-block';
        } else {
            sourceChangeButton.style.display = 'none';
        }

        if (self.videoSources.length <= 1) {
            return;
        }

        let appendSourceChange = false;

        const sourceChangeList = document.createElement('div');
        sourceChangeList.className = 'fluid_video_sources_list';
        sourceChangeList.style.display = 'none';

        let firstSource = true;
        for (const source of self.videoSources) {
            // Fix for issues occurring on iOS with mkv files
            const getTheType = source.url.split(".").pop();
            if (self.mobileInfo.userOs === 'iOS' && getTheType === 'mkv') {
                continue;
            }

            // On suggested videos, if the resolution doesn't exist in the new source list, use the first one in the list
            // This gets overwritten if it's needed by setPersistentSettings()
            if(firstSource && !initialLoad) {
                self.domRef.player.src = source.url;
            }

            const sourceSelected = (firstSource) ? "source_selected" : "";
            const hdElement = (source.isHD) ? '<sup style="color:' + self.displayOptions.layoutControls.primaryColor + '" class="fp_hd_source"></sup>' : '';
            firstSource = false;
            const sourceChangeDiv = document.createElement('div');
            sourceChangeDiv.className = 'fluid_video_source_list_item js-source_' + source.title;
            sourceChangeDiv.innerHTML = '<span class="source_button_icon ' + sourceSelected + '"></span>' + source.title + hdElement;

            sourceChangeDiv.addEventListener('click', function (event) {
                event.stopPropagation();
                // While changing source the player size can flash, we want to set the pixel dimensions then back to 100% afterwards
                self.domRef.player.style.width = self.domRef.player.clientWidth + 'px';
                self.domRef.player.style.height = self.domRef.player.clientHeight + 'px';

                const videoChangedTo = this;
                const sourceIcons = self.domRef.wrapper.getElementsByClassName('source_button_icon');
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
            // To reset player for suggested videos, in case the event listener already exists
            sourceChangeButton.removeEventListener('click', self.openCloseVideoSourceSwitch);
            sourceChangeButton.addEventListener('click', self.openCloseVideoSourceSwitch);
        } else {
            // Didn't give any source options
            self.domRef.wrapper.querySelector('.fluid_control_video_source').style.display = 'none';
        }
    };

    self.openCloseVideoSourceSwitch = () => {
        const sourceChangeList = self.domRef.wrapper.querySelector('.fluid_video_sources_list');

        if (self.isCurrentlyPlayingAd || self.isShowingSuggestedVideos()) {
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
                self.controlPlayPauseToggle();
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
        self.domRef.player.parentNode.insertBefore(titleHolder, null);
        titleHolder.innerHTML += self.displayOptions.layoutControls.title;
        titleHolder.classList.add('fp_title');
    };

    self.hasTitle = () => {
        const title = self.domRef.wrapper.querySelector('.fp_title');
        const titleOption = self.displayOptions.layoutControls.title;
        return title && titleOption != null;
    };

    self.hideTitle = () => {
        const titleHolder = self.domRef.wrapper.querySelector('.fp_title');

        if (!self.hasTitle()) {
            return;
        }

        titleHolder.classList.add('fade_out');
    };

    self.showTitle = () => {
        const titleHolder = self.domRef.wrapper.querySelector('.fp_title');

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
        logoHolder.className = 'logo_holder';
        if (self.displayOptions.layoutControls.logo.hideWithControls) {
            logoHolder.classList.add('initial_controls_show', 'fp_logo');
        } else {
            logoHolder.classList.add('logo_maintain_display');
        }
        // The logo itself
        const logoImage = document.createElement('img');
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
        containerDiv.className = 'fluid_html_on_pause_container';
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
        // Create the html for the play button
        const containerDiv = document.createElement('div');
        containerDiv.className = 'fluid_html_on_pause fluid_initial_play_button_container';
        const backgroundColor = (self.displayOptions.layoutControls.primaryColor) ? self.displayOptions.layoutControls.primaryColor : "#333333";
        containerDiv.innerHTML = '<div class="fluid_initial_play" style="background-color:' + backgroundColor + '"><div class="fluid_initial_play_button"></div></div>';
        const initPlayEventTypes = ['click', 'touchend'];
        const initPlayFunction = function () {
            self.playPauseToggle();
            initPlayEventTypes.forEach(eventType => containerDiv.removeEventListener(eventType, initPlayFunction))
        };
        initPlayEventTypes.forEach(eventType => containerDiv.addEventListener(eventType, initPlayFunction))

        // If the user has chosen to not show the play button we'll make it invisible
        // We don't hide altogether because animations might still be used
        if (!self.displayOptions.layoutControls.playButtonShowing) {
            const initialControlsDisplay = self.domRef.wrapper.querySelector('.fluid_controls_container');
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

        const intervalId = setInterval(() => {
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

        self.destructors.push(() => clearInterval(intervalId));

        const listenTo = (self.isTouchDevice())
            ? ['touchstart', 'touchmove', 'touchend']
            : ['mousemove', 'mousedown', 'mouseup'];

        for (let i = 0; i < listenTo.length; i++) {
            videoPlayer.addEventListener(listenTo[i], activity, { passive: true });
        }
    };

    self.hasControlBar = () => {
        return !!self.domRef.wrapper.querySelector('.fluid_controls_container');
    };

    self.isControlBarVisible = () => {
        if (self.hasControlBar() === false) {
            return false;
        }

        const controlBar = self.domRef.wrapper.querySelector('.fluid_controls_container');
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

        if (self.displayOptions.layoutControls.logo.hideWithControls) {
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
        }

        self.repositionSubtitlesContainer('12px');
    };

    self.showControlBar = (event) => {
        if (self.isCurrentlyPlayingAd && !self.domRef.player.paused) {
            self.toggleAdCountdown(false);
        }

        if (event.type === 'mouseenter' || event.type === 'userActive') {
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
        if (self.displayOptions.layoutControls.logo.hideWithControls) {
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
        }

        self.repositionSubtitlesContainer('46px');
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
        self.destructors.push(() => clearInterval(progressInterval));
    };

    self.createPlaybackList = () => {
        if (!self.displayOptions.layoutControls.playbackRateEnabled) {
            return;
        }

        const sourceChangeButton = self.domRef.wrapper.querySelector('.fluid_control_playback_rate');
        sourceChangeButton.style.display = 'inline-block';

        const sourceChangeList = document.createElement('div');
        sourceChangeList.className = 'fluid_video_playback_rates';
        sourceChangeList.style.display = 'none';

        if (
            !Array.isArray(self.displayOptions.layoutControls.controlBar.playbackRates)
            || self.displayOptions.layoutControls.controlBar.playbackRates.some(
                rate => typeof rate !== 'string' || Number.isNaN(Number(rate.replace('x', '')))
            )
        ) {
            self.displayOptions.layoutControls.controlBar.playbackRates = ['x2', 'x1.5', 'x1', 'x0.5'];
        }

        self.displayOptions.layoutControls.controlBar.playbackRates.forEach(function (rate) {
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
        const sourceChangeList = self.domRef.wrapper.querySelector('.fluid_video_playback_rates');

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
        const downloadOption = self.domRef.wrapper.querySelector('.fluid_control_download');
        if (!self.displayOptions.layoutControls.allowDownload) {
            return;
        }
        downloadOption.style.display = 'inline-block';

        let downloadClick = document.createElement('a');
        downloadClick.className = 'fp_download_click';
        downloadClick.onclick = function (e) {
            const linkItem = this;

            if (typeof e.stopImmediatePropagation !== 'undefined') {
                e.stopImmediatePropagation();
            }

            setTimeout(function () {
                linkItem.download = '';
                linkItem.href = '';
            }, 100);
        };

        downloadOption.appendChild(downloadClick);

        downloadOption.addEventListener('click', function () {
            const downloadItem = self.domRef.wrapper.querySelector('.fp_download_click');
            downloadItem.download = self.originalSrc;
            downloadItem.href = self.originalSrc;
            downloadClick.click();
        });
    };

    self.theatreToggle = () => {
        self.debugMessage(`Toggling Theater Mode`);
        if (self.isInIframe) {
            return;
        }

        // Theatre and fullscreen, it's only one or the other
        this.resetDisplayMode('theaterMode');

        // Advanced Theatre mode if specified
        if (self.displayOptions.layoutControls.theatreAdvanced) {
            const elementForTheatre = self.domRef.wrapper.querySelector(`#${self.displayOptions.layoutControls.theatreAdvanced.theatreElement}`); 
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
        const videoWrapper = self.domRef.wrapper;

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

    self.setPersistentSettings = (ignoreMute = false) => {
        try {
            if (!(typeof (Storage) !== 'undefined' && typeof (localStorage) !== 'undefined')) {
                return;
            }
        } catch (e) {
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
            && self.displayOptions.layoutControls.persistentSettings.volume
            && !ignoreMute) {
            self.setVolume(self.fluidStorage.fluidVolume);

            if (typeof (self.fluidStorage.fluidMute) !== 'undefined' && self.fluidStorage.fluidMute === 'true') {
                self.muteToggle();
            }
        }

        if (typeof (self.fluidStorage.fluidQuality) !== 'undefined'
            && self.displayOptions.layoutControls.persistentSettings.quality) {
            const sourceOption = self.domRef.wrapper.querySelector('.js-source_' + self.fluidStorage.fluidQuality);
            const sourceChangeButton = self.domRef.wrapper.querySelector('.fluid_control_video_source');
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

        const htmlBlock = self.domRef.wrapper.querySelector('.fluid_html_on_pause_container');

        // We create the HTML block from scratch if it doesn't already exist
        if (!htmlBlock) {
            const containerDiv = document.createElement('div');
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
        const controlBar = self.domRef.wrapper.querySelector('.fluid_controls_container');

        if (show) {
            controlBar.className += ' initial_controls_show';
            return;
        }

        controlBar.className = controlBar.className.replace(' initial_controls_show', '');
    };

    self.on = (eventCall, callback) => {
        /**
         * Improves events by adding player info to the callbacks
         *
         * source | preRoll | midRoll | postRoll
         */
        const getAdditionalInfo = () => ({
            mediaSourceType: self.currentMediaSourceType
        });

        const functionCall = (event, additionalEventData = {}) => {
            const additionalInfo =  {...getAdditionalInfo(), ...additionalEventData}
            return callback(event, additionalInfo);
        }

        const eventHandlers = {
            play: () => self.domRef.player.addEventListener('play', functionCall),
            seeked: () => self.domRef.player.addEventListener('seeked', functionCall),
            ended: () => self.domRef.player.addEventListener('ended', functionCall),
            pause: () => self.domRef.player.addEventListener('pause', (event) => {
                if (!self.fluidPseudoPause) {
                    functionCall(event)
                }
            }),
            playing: () => self.domRef.player.addEventListener('playing', functionCall),
            waiting: () => self.domRef.player.addEventListener('waiting', functionCall),
            theatreModeOn: () => self.domRef.player.addEventListener('theatreModeOn', functionCall),
            theatreModeOff: () => self.domRef.player.addEventListener('theatreModeOff', functionCall),
            timeupdate: () => self.domRef.player.addEventListener('timeupdate', (event) => {
                functionCall(event, { currentTime: self.domRef.player.currentTime });
            }),
            miniPlayerToggle: () => self.domRef.player.addEventListener('miniPlayerToggle', functionCall)
        };

        if (!eventHandlers[eventCall]) {
            console.error(`[FP_ERROR] Event "${eventCall}" is not recognized`);
            return;
        }

        // Call event handler
        eventHandlers[eventCall]();
    };

    self.toggleLogo = (logo) => {
        if (typeof logo != 'object' || !logo.imageUrl) {
            return false;
        }

        const logoBlock = self.domRef.wrapper.querySelector('.fp_logo');

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

    /**
     * Resets all display types that are not the target display mode
     *
     * @param {'fullScreen'|'theaterMode'|'miniPlayer'} displayTarget
     */
    self.resetDisplayMode = (displayTarget) => {
        if (self.fullscreenMode && displayTarget !== 'fullScreen') {
            self.fullscreenToggle();
        }

        if (self.theatreMode && displayTarget !== 'theaterMode') {
            self.theatreToggle();
        }

        if (self.miniPlayerToggledOn && displayTarget !== 'miniPlayer') {
            self.toggleMiniPlayer('off');
        }
    }

    self.destroy = () => {
        self.domRef.player.classList.remove('js-fluid-player');
        const numDestructors = self.destructors.length;

        if (0 === numDestructors) {
            return;
        }

        self.destructors.forEach(destructor => destructor.call(self));

        const container = self.domRef.wrapper;

        if (!container) {
            console.warn('Unable to remove wrapper element for Fluid Player instance - element not found');
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

        console.error('Unable to remove wrapper element for Fluid Player instance - no parent');
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

    this.toggleMiniPlayer = (state) => {
        if (state === undefined) {
            state = !instance.miniPlayerToggledOn;
        }

        return instance.toggleMiniPlayer(state ? 'on' : 'off', true);
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

    this.setDebug = (value) => {
        instance.displayOptions.debug = value;
    }
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
