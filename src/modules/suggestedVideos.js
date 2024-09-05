export default function (playerInstance, options) {
    playerInstance.suggestedVideosGrid = null;

    playerInstance.generateSuggestedVideoList = () => {
        const configUrl = playerInstance.displayOptions.suggestedVideos.configUrl;

        if (!configUrl) {
            return;
        }

        playerInstance.sendRequestAsync(configUrl, false, 5000).then(({response}) => {
            const config = JSON.parse(response);
            const suggestedVideosGrid = playerInstance.generateSuggestedVideoGrid(config);

            playerInstance.suggestedVideosGrid = suggestedVideosGrid;

        }).catch(err => {
            console.error('[FP_ERROR] given suggested videos config url is invalid or not found.', err);
        })
    };

    playerInstance.generateSuggestedVideoGrid = (config) => {
        const suggestedVideosGrid = document.createElement('div');
        suggestedVideosGrid.className = 'suggested_tile_grid';

        for (let i = 0; i < 12; i++) {
            const videoTile = playerInstance.createVideoTile(config[i]);
            suggestedVideosGrid.appendChild(videoTile);
        }

        return suggestedVideosGrid;
    };

    playerInstance.displaySuggestedVideos = () => {
        const PlayerDOM = playerInstance.domRef.wrapper;
        PlayerDOM.appendChild(playerInstance.suggestedVideosGrid);
    };

    playerInstance.clickSuggestedVideo = (sources, subtitles, configUrl) => {
        playerInstance.toggleLoader(true);
        playerInstance.hideSuggestedVideos();
        playerInstance.resetPlayer(sources, subtitles, configUrl);

        playerInstance.generateSuggestedVideoList();
    };

    playerInstance.resetPlayer = (sources, subtitles, configUrl) => {
        const videoDOM = playerInstance.domRef.wrapper.querySelector(`#${playerInstance.videoPlayerId}`);
        videoDOM.innerHTML = '';

        let sourcesHTML = '';
        if (sources) {
            sources.forEach(source => {
                sourcesHTML += `<source src='${source.url}' ${source.hd ? 'data-fluid-hd' : ''} title="${source.resolution}" type='${source.mimeType}'/>`;
            });
        }
        if (subtitles) {
            subtitles.forEach(subtitle => {
                sourcesHTML += `<track label="${subtitle.label}" kind="metadata" srclang="${subtitle.lang}" src="${subtitle.url}" ${subtitle.default ? 'default' : ''}>`;
            });
        }

        videoDOM.innerHTML = sourcesHTML;

        playerInstance.removeVideoSourcesListFromDOM();

        const videoSourceList = playerInstance.domRef.wrapper.getElementsByClassName('fluid_control_video_source')[0];
        videoSourceList.innerHTML = '';
        playerInstance.domRef.player.src = '';
        playerInstance.domRef.player.removeAttribute('src');
        playerInstance.setVideoSource(sources[0].url);
        playerInstance.createVideoSourceSwitch(false);
        playerInstance.resetSubtitles();
        playerInstance.setPersistentSettings(true);
        playerInstance.loadInNewVideo();
        playerInstance.resetAds();

        // set new API config url
        if (configUrl) {
            playerInstance.displayOptions.suggestedVideos.configUrl = configUrl;
            playerInstance.generateSuggestedVideoList();
        }
    }

    playerInstance.createVideoTile = (config) => {
        const videoTile = document.createElement('div');
        videoTile.addEventListener('click', function () {
            playerInstance.clickSuggestedVideo(config.sources, config.subtitles, config.configUrl);
        }, false);
        videoTile.className = 'suggested_tile';
        videoTile.id = 'suggested_tile_' + config.id;

        playerInstance.getImageTwoMostProminentColours(config.thumbnailUrl).then(mostProminentColors => {
            if (mostProminentColors && mostProminentColors.length) {
                videoTile.style = `background: ${mostProminentColors[0]};`;
            }
        });

        const videoImage = document.createElement('img');
        videoImage.src = config.thumbnailUrl;
        videoImage.className = 'suggested_tile_image';

        const videoTileOverlay = document.createElement('div');
        videoTileOverlay.className='suggested_tile_overlay';
        const title = document.createElement('p');
        title.className = 'suggested_tile_title';
        title.innerText = config.title;
        videoTileOverlay.appendChild(title);

        videoTile.appendChild(videoImage);
        videoTile.appendChild(videoTileOverlay);

        return videoTile;
    }

    playerInstance.resetSubtitles = () => {
        playerInstance.removeSubtitlesListFromDOM();
        const videoSubtitlesList = playerInstance.domRef.wrapper.getElementsByClassName('fluid_control_subtitles')[0];
        videoSubtitlesList.innerHTML = '';
        playerInstance.domRef.player.load();
        playerInstance.createSubtitles(false);
    }

    playerInstance.loadInNewVideo = () => {
        playerInstance.displayOptions.layoutControls.mediaType = playerInstance.getCurrentSrcType();
        playerInstance.initialiseStreamers();
        playerInstance.domRef.player.currentTime = 0;
        playerInstance.domRef.player.mainVideoCurrentTime = 0;
        playerInstance.setBuffering();
    }

    playerInstance.resetAds = () => {
         // Clear midroll and postroll ads
         playerInstance.timerPool = {};
         playerInstance.rollsById = {};
         playerInstance.adPool = {};
         playerInstance.adGroupedByRolls = {};
         playerInstance.onPauseRollAdPods = [];
         playerInstance.currentOnPauseRollAd = '';

         // Reset variables and flags, needed for assigning the different rolls correctly
         playerInstance.isTimer = false;
         playerInstance.timer = null;
         playerInstance.firstPlayLaunched = false;

         // Clear preroll ads
         playerInstance.preRollAdsResolved = false;
         playerInstance.preRollAdPods = [];
         playerInstance.preRollAdPodsLength = 0;
         playerInstance.preRollVastResolved = 0;
         playerInstance.autoplayAfterAd = true;

         // Wait until new selected video is buffered so we can get the video length
         // This is needed for mid and post rolls to assign the correct time key to their respective triggers
         const checkMainVideoDuration = () => {
             if (!isNaN(playerInstance.domRef.player.duration) && playerInstance.domRef.player.duration > 0) {
                playerInstance.toggleLoader(true);
                 playerInstance.mainVideoDuration = playerInstance.domRef.player.duration;

                 clearInterval(intervalId);

                 // Set up ads
                 playerInstance.setVastList();
                 playerInstance.checkForNextAd();
                 playerInstance.playPauseToggle();
             }
         };

         const intervalId = setInterval(checkMainVideoDuration, 100);
    }

    playerInstance.removeVideoSourcesListFromDOM = () => {
        const sourcesDOM = playerInstance.domRef.wrapper.getElementsByClassName('fluid_video_source_list_item');
        for (let i = 0; i < sourcesDOM.length; i++) {
            sourcesDOM[i].remove();
        }
    };

    playerInstance.removeSubtitlesListFromDOM = () => {
        const tracksDOM = playerInstance.domRef.wrapper.getElementsByClassName('fluid_subtitle_list_item');
        for (let i = 0; i < tracksDOM.length; i++) {
            tracksDOM[i].remove();
        }
    };

    playerInstance.hideSuggestedVideos = () => {
        const suggestedVideosDOM = playerInstance.domRef.wrapper.getElementsByClassName('suggested_tile_grid')[0];
        if (suggestedVideosDOM) {
            suggestedVideosDOM.remove();
        }
    };

    playerInstance.isShowingSuggestedVideos = () => {
        return !!playerInstance.domRef.wrapper.getElementsByClassName('suggested_tile_grid')[0];
    }

}
