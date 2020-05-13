'use strict';
export default function (playerInstance, options) {
    playerInstance.initialiseStreamers = () => {
        playerInstance.detachStreamers();
        switch (playerInstance.displayOptions.layoutControls.mediaType) {
            case 'application/dash+xml': // MPEG-DASH
                if (!playerInstance.dashScriptLoaded && !window.dashjs) {
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

            const dashPlayer = dashjs.MediaPlayer().create();

            dashPlayer.updateSettings({
                'debug': {
                    'logLevel': options.debug ? dashjs.Debug.LOG_LEVEL_DEBUG : dashjs.Debug.LOG_LEVEL_FATAL
                }
            });

            dashPlayer.initialize(playerInstance.domRef.player, playerInstance.originalSrc, playVideo);

            playerInstance.dashPlayer = dashPlayer;
        } else {
            playerInstance.nextSource();
            console.log('[FP_ERROR] Media type not supported by this browser. (application/dash+xml)');
        }
    };

    playerInstance.initialiseHls = () => {
        if (Hls.isSupported()) {
            const hls = new Hls(playerInstance.displayOptions.hlsjsConfig);

            hls.attachMedia(playerInstance.domRef.player);
            hls.loadSource(playerInstance.originalSrc);

            playerInstance.hlsPlayer = hls;

            if (!playerInstance.firstPlayLaunched && playerInstance.displayOptions.layoutControls.autoPlay) {
                playerInstance.domRef.player.play();
            }
        } else {
            playerInstance.nextSource();
            console.log('[FP_ERROR] Media type not supported by this browser. (application/x-mpegURL)');
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
