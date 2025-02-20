
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
                const { displayOptions, domRef } = playerInstance;
                const { player } = domRef;
                const { hls } = displayOptions;

                // Doesn't load hls.js if player can play it natively
                if (player.canPlayType('application/x-mpegurl') && !hls.overrideNative) {
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

            dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
                playerInstance.isLiveStream = !!dashPlayer.isDynamic()
                if (!!dashPlayer.isDynamic()) {
                    playerInstance.showLiveIndicator();
                }
            });

            playerInstance.displayOptions.modules.onAfterInitDash(dashPlayer);

            playerInstance.dashPlayer = dashPlayer;
        } else {
            playerInstance.nextSource();
            console.log('[FP_WARNING] Media type not supported by this browser using DASH.js. (application/dash+xml)');
        }
    };

    playerInstance.initialiseHls = () => {
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            playerInstance.debugMessage('Initializing hls.js');

            const defaultOptions = {
                debug: typeof FP_DEBUG !== 'undefined' && FP_DEBUG === true,
                startPosition: 0,
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

            hls.once(Hls.Events.LEVEL_LOADED, function (event, level) {
                playerInstance.isLiveStream = !!level.details.live;
                if (!!level.details.live) {
                    playerInstance.showLiveIndicator();
                } else {
                    playerInstance.hideLiveIndicator();
                }
            });

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
                const levels = createHLSLevels();
                const sortedLevels = sortLevels(levels);
                playerInstance.videoSources = sortedLevels;

                // <=2 because of the added auto function
                if (sortedLevels.length <= 2) return;

                const sourceChangeButton = playerInstance.domRef.wrapper.querySelector('.fluid_control_video_source');

                toggleSourceChangeButtonVisibility(sortedLevels, sourceChangeButton);

                const sourceChangeList = createSourceChangeList(sortedLevels);
                attachSourceChangeList(sourceChangeButton, sourceChangeList);

                // Set initial level based on persisted quality or default to auto
                setInitialLevel(sortedLevels);
            } catch (err) {
                console.error(err);
            }
        });
    };

    function createHLSLevels() {
        const HLSLevels = playerInstance.hlsPlayer.levels
            .map((level, index) => ({
                id: index,
                title: level.height + 'p',
                isHD: level.videoRange === 'HDR',
                bitrate: level.bitrate
            }));

        const autoLevel = {
            id: -1,
            title: 'auto',
            isHD: false,
            bitrate: 0
        };

        return [...HLSLevels, autoLevel];
    }

    function toggleSourceChangeButtonVisibility(levels, sourceChangeButton) {
        if (levels.length > 1) {
            sourceChangeButton.style.display = 'inline-block';
        } else {
            sourceChangeButton.style.display = 'none';
        }
    }

    function createSourceChangeList(levels) {
        const sourceChangeList = document.createElement('div');
        sourceChangeList.className = 'fluid_video_sources_list';
        sourceChangeList.style.display = 'none';

        levels.forEach(level => {
            const sourceChangeDiv = createSourceChangeItem(level);
            sourceChangeList.appendChild(sourceChangeDiv);
        });

        return sourceChangeList;
    }

    function createSourceChangeItem(level) {
        const sourceSelectedClass = getSourceSelectedClass(level);
        const hdIndicator = level.isHD ? `<sup style="color:${playerInstance.displayOptions.layoutControls.primaryColor}" class="fp_hd_source"></sup>` : '';

        const sourceChangeDiv = document.createElement('div');
        sourceChangeDiv.className = `fluid_video_source_list_item js-source_${level.title}`;
        sourceChangeDiv.innerHTML = `<span class="source_button_icon ${sourceSelectedClass}"></span>${level.title}${hdIndicator}`;

        sourceChangeDiv.addEventListener('click', event => onSourceChangeClick(event, level));

        return sourceChangeDiv;
    }

    function getSourceSelectedClass(level) {
        const matchingLevels = playerInstance.videoSources.filter(source => source.title === playerInstance.fluidStorage.fluidQuality);

        // If there are multiple matching levels, use the first one
        if (matchingLevels.length > 1) {
            if (matchingLevels[0].id === level.id) {
                return "source_selected";
            }
        } else if (matchingLevels.length === 1) {
            return matchingLevels[0].id === level.id ? "source_selected" : "";
        }

        // Fallback to auto selection if no persistent level exists
        if (!matchingLevels.length && level.title === 'auto') {
            return "source_selected";
        }

        return "";
    }

    function onSourceChangeClick(event, selectedLevel) {
        event.stopPropagation();

        const videoChangedTo = event.currentTarget;
        clearSourceSelectedIcons();

        videoChangedTo.firstChild.classList.add('source_selected');

        playerInstance.videoSources.forEach(source => {
            if (source.title === videoChangedTo.innerText.replace(/(\r\n\t|\n|\r\t)/gm, '')) {
                playerInstance.hlsPlayer.currentLevel = selectedLevel.id;
                playerInstance.fluidStorage.fluidQuality = selectedLevel.title;
            }
        });

        playerInstance.openCloseVideoSourceSwitch();
    }

    function clearSourceSelectedIcons() {
        const sourceIcons = playerInstance.domRef.wrapper.getElementsByClassName('source_button_icon');
        Array.from(sourceIcons).forEach(icon => icon.classList.remove('source_selected'));
    }

    function attachSourceChangeList(sourceChangeButton, sourceChangeList) {
        sourceChangeButton.appendChild(sourceChangeList);
        sourceChangeButton.removeEventListener('click', playerInstance.openCloseVideoSourceSwitch);
        sourceChangeButton.addEventListener('click', playerInstance.openCloseVideoSourceSwitch);
    }

    function setInitialLevel(levels) {
        // Check if a persistency level exists and set the current level accordingly
        const persistedLevel = levels.find(level => level.title === playerInstance.fluidStorage.fluidQuality);

        if (persistedLevel) {
            playerInstance.hlsPlayer.currentLevel = persistedLevel.id;
        } else {
            // Default to 'auto' if no persisted level is found
            const autoLevel = levels.find(level => level.title === 'auto');
            playerInstance.hlsPlayer.currentLevel = autoLevel.id;
        }
    }

    function sortLevels(levels) {
        return [...levels].sort((a, b) => {
            // First sort by height in descending order
            if (b.height !== a.height) {
                return b.height - a.height;
            }
            // If height is the same, sort by bitrate in descending order
            return b.bitrate - a.bitrate;
        });
    }

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
