
// Prevent DASH.js from automatically attaching to video sources by default.
// Whoever thought this is a good idea?!
if (typeof window !== 'undefined' && !window.dashjs) {
    window.dashjs = {
        skipAutoCreate: true,
        isDefaultSubject: true
    };
}

export default function (playerInstance, options) {
    playerInstance.initialiseStreamers = () => {
        playerInstance.detachStreamers();
        switch (playerInstance.displayOptions.layoutControls.mediaType) {
            case 'application/dash+xml': // MPEG-DASH
                if (!playerInstance.dashScriptLoaded && (!window.dashjs || window.dashjs.isDefaultSubject)) {
                    playerInstance.dashScriptLoaded = true;
                    import(/* webpackChunkName: "dashjs" */ 'dashjs').then((it) => {
                        window.dashjs = it.default;
                        playerInstance.initialiseDash();
                    });
                } else {
                    playerInstance.initialiseDash();
                }
                break;
            case 'application/x-mpegurl': // HLS
                // Doesn't load hls.js if player can play it natively
                if (playerInstance.domRef.player.canPlayType('application/x-mpegurl')) {
                    playerInstance.debugMessage('Native HLS support found, skipping hls.js');
                    break;
                }

                if (!playerInstance.hlsScriptLoaded && !window.Hls) {
                    playerInstance.hlsScriptLoaded = true;
                    import(/* webpackChunkName: "hlsjs" */ 'hls.js').then((it) => {
                        window.Hls = it.default;
                        playerInstance.initialiseHls();
                    });
                } else {
                    playerInstance.initialiseHls();
                }
                break;
        }
    };

    playerInstance.initialiseDash = () => {
        if (typeof (window.MediaSource || window.WebKitMediaSource) === 'function') {
            // If false we want to override the autoPlay, as it comes from postRoll
            const playVideo = !playerInstance.autoplayAfterAd
                ? playerInstance.autoplayAfterAd
                : playerInstance.displayOptions.layoutControls.autoPlay;

            const defaultOptions = {
                'debug': {
                    'logLevel': typeof FP_DEBUG !== 'undefined' && FP_DEBUG === true
                        ? dashjs.Debug.LOG_LEVEL_DEBUG
                        : dashjs.Debug.LOG_LEVEL_FATAL
                }
            };

            const dashPlayer = dashjs.MediaPlayer().create();
            const options = playerInstance.displayOptions.modules.configureDash(defaultOptions);

            dashPlayer.updateSettings(options);

            playerInstance.displayOptions.modules.onBeforeInitDash(dashPlayer);

            dashPlayer.initialize(playerInstance.domRef.player, playerInstance.originalSrc, playVideo);

            dashPlayer.on('streamInitializing', () => {
                playerInstance.toggleLoader(true);
            });

            dashPlayer.on('canPlay', () => {
                playerInstance.toggleLoader(false);
            });

            dashPlayer.on('playbackPlaying', () => {
                playerInstance.toggleLoader(false);
            });

            playerInstance.displayOptions.modules.onAfterInitDash(dashPlayer);

            playerInstance.dashPlayer = dashPlayer;
        } else {
            playerInstance.nextSource();
            console.log('[FP_WARNING] Media type not supported by this browser using DASH.js. (application/dash+xml)');
        }
    };

    playerInstance.initialiseHls = () => {
        if (Hls.isSupported()) {
            playerInstance.debugMessage('Initializing hls.js');

            const defaultOptions = {
                debug: typeof FP_DEBUG !== 'undefined' && FP_DEBUG === true,
                p2pConfig: {
                    logLevel: false,
                },
                enableWebVTT: false,
                enableCEA708Captions: false,
            };

            const options = playerInstance.displayOptions.modules.configureHls(defaultOptions);
            const hls = new Hls(options);
            playerInstance.displayOptions.modules.onBeforeInitHls(hls);

            hls.attachMedia(playerInstance.domRef.player);
            hls.loadSource(playerInstance.originalSrc);

            playerInstance.displayOptions.modules.onAfterInitHls(hls);

            playerInstance.hlsPlayer = hls;

            if (!playerInstance.firstPlayLaunched && playerInstance.displayOptions.layoutControls.autoPlay) {
                playerInstance.domRef.player.play();
            }

            playerInstance.createHLSVideoSourceSwitch();
        } else {
            playerInstance.nextSource();
            console.log('[FP_WARNING] Media type not supported by this browser using HLS.js. (application/x-mpegURL)');
        }
    };

    playerInstance.createHLSVideoSourceSwitch = () => {
        playerInstance.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function () {
            try {
                const HLSLevels =  playerInstance.hlsPlayer.levels.map((level, index) => ({
                    id: index,
                    title: String(level.width),
                    isHD: level.videoRange === 'HDR'
                }));

                const levels = [...HLSLevels, {
                    id: -1,
                    title: 'auto',
                    isHD: false
                }];

                const auto = levels.find(level => level.title === 'auto');
                playerInstance.hlsPlayer.currentLevel = auto.id;

                const sourceChangeButton = playerInstance.domRef.wrapper.querySelector('.fluid_control_video_source');
                playerInstance.videoSources = levels;


                if (playerInstance.videoSources.length > 1) {
                    sourceChangeButton.style.display = 'inline-block';
                } else {
                    sourceChangeButton.style.display = 'none';
                }

                if (playerInstance.videoSources.length <= 1) {
                    return;
                }

                let appendSourceChange = false;

                const sourceChangeList = document.createElement('div');
                sourceChangeList.className = 'fluid_video_sources_list';
                sourceChangeList.style.display = 'none';

                for (const level of playerInstance.videoSources) {
                    const persistencyLevelExists = playerInstance.videoSources.find(level => level.title === playerInstance.fluidStorage.fluidQuality);
                    let sourceSelected = (!persistencyLevelExists && level.title === 'auto') ? "source_selected" : "";

                    if (level.title === playerInstance.fluidStorage.fluidQuality) {
                        sourceSelected = "source_selected";
                    }

                    const hdElement = (level.isHD) ? '<sup style="color:' + playerInstance.displayOptions.layoutControls.primaryColor + '" class="fp_hd_source"></sup>' : '';
                    const sourceChangeDiv = document.createElement('div');
                    sourceChangeDiv.className = 'fluid_video_source_list_item js-source_' + level.title;
                    sourceChangeDiv.innerHTML = '<span class="source_button_icon ' + sourceSelected + '"></span>' + level.title + hdElement;

                    sourceChangeDiv.addEventListener('click', function (event) {
                        event.stopPropagation();
                        // While changing source the player size can flash, we want to set the pixel dimensions then back to 100% afterwards
                        playerInstance.domRef.player.style.width = playerInstance.domRef.player.clientWidth + 'px';
                        playerInstance.domRef.player.style.height = playerInstance.domRef.player.clientHeight + 'px';

                        const videoChangedTo = this;
                        const sourceIcons = playerInstance.domRef.wrapper.getElementsByClassName('source_button_icon');
                        for (let i = 0; i < sourceIcons.length; i++) {
                            sourceIcons[i].className = sourceIcons[i].className.replace('source_selected', '');
                        }
                        videoChangedTo.firstChild.className += ' source_selected';

                        playerInstance.videoSources.forEach(source => {
                            if (source.title === videoChangedTo.innerText.replace(/(\r\n\t|\n|\r\t)/gm, '')) {
                                playerInstance.hlsPlayer.currentLevel = level.id;
                                playerInstance.fluidStorage.fluidQuality = level.title;
                            }
                        });

                        playerInstance.openCloseVideoSourceSwitch();
                    });

                    sourceChangeList.appendChild(sourceChangeDiv);
                    appendSourceChange = true;
                };

                if (appendSourceChange) {
                    sourceChangeButton.appendChild(sourceChangeList);
                    // To reset player for suggested videos, in case the event listener already exists
                    sourceChangeButton.removeEventListener('click', playerInstance.openCloseVideoSourceSwitch);
                    sourceChangeButton.addEventListener('click', playerInstance.openCloseVideoSourceSwitch);
                } else {
                    // Didn't give any source options
                    playerInstance.domRef.wrapper.querySelector('.fluid_control_video_source').style.display = 'none';
                }
            }
            catch (err) {
                console.error(err)
            }
        })
    };

    playerInstance.detachStreamers = () => {
        if (playerInstance.dashPlayer) {
            playerInstance.dashPlayer.reset();
            playerInstance.dashPlayer = false;
        } else if (playerInstance.hlsPlayer) {
            playerInstance.hlsPlayer.detachMedia();
            playerInstance.hlsPlayer = false;
        }
    };
}
