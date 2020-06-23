'use strict';

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
        } else {
            playerInstance.nextSource();
            console.log('[FP_WARNING] Media type not supported by this browser using HLS.js. (application/x-mpegURL)');
        }
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
