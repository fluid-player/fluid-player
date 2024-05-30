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

        });
    };

    playerInstance.generateSuggestedVideoGrid = (config) => {
        const suggestedVideosGrid = document.createElement('div');
        suggestedVideosGrid.className = 'suggested_tile_grid';

        for (let i = 0; i < 6; i++) {
            const videoTile = playerInstance.createVideoTile(config[i]);
            suggestedVideosGrid.appendChild(videoTile);
        }

        return suggestedVideosGrid;
    };

    playerInstance.displaySuggestedVideos = () => {
        const PlayerDOM = document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId);
        PlayerDOM.appendChild(playerInstance.suggestedVideosGrid);
    };

    playerInstance.clickSuggestedVideo = (sources, subtitles) => {
        playerInstance.hideSuggestedVideos();
        playerInstance.resetPlayer(sources, subtitles);

        playerInstance.generateSuggestedVideoList();
    };

    playerInstance.resetPlayer = (sources, subtitles) => {
        const videoDOM = document.getElementById(playerInstance.videoPlayerId);
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

        // This for the custom list
        playerInstance.removeVideoSourcesListFromDOM();

        const videoSourceList = document.getElementsByClassName('fluid_control_video_source')[0];
        videoSourceList.innerHTML = '';
        playerInstance.domRef.player.src = '';
        playerInstance.createVideoSourceSwitch(false);

        // Subtitles
        playerInstance.removeSubtitlesListFromDOM();
        const videoSubtitlesList = document.getElementsByClassName('fluid_control_subtitles')[0];
        videoSubtitlesList.innerHTML = '';
        playerInstance.createSubtitles(false);

        // set persistent settings and try to load in new video
        playerInstance.setPersistentSettings();
        playerInstance.initialiseStreamers();
        playerInstance.domRef.player.currentTime = 0;
        playerInstance.domRef.player.mainVideoCurrentTime = 0;
        playerInstance.setCurrentTimeAndPlay(0, false);
        playerInstance.setBuffering();

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

    playerInstance.createVideoTile = (config) => {
        const videoTile = document.createElement('div');
        videoTile.addEventListener('click', function () {
            playerInstance.clickSuggestedVideo(config.sources, config.subtitles)
        }, false);
        videoTile.className = 'suggested_tile';
        videoTile.id = 'suggested_tile_' + config.id;
        videoTile.style = `background-image: url(${config.thumbnailUrl})`;

        const videoTileOverlay = document.createElement('div');
        videoTileOverlay.className='suggested_tile_overlay';
        const title = document.createElement('p');
        title.className = 'title';
        title.innerText = config.title;
        videoTileOverlay.appendChild(title);

        videoTile.appendChild(videoTileOverlay);

        return videoTile;
    };

    playerInstance.removeVideoSourcesListFromDOM = () => {
        const sourcesDOM = document.getElementsByClassName('fluid_video_source_list_item');
        for (let i = 0; i < sourcesDOM.length; i++) {
            sourcesDOM[i].remove();
        }
    };

    playerInstance.removeSubtitlesListFromDOM = () => {
        const tracksDOM = document.getElementsByClassName('fluid_subtitle_list_item');
        for (let i = 0; i < tracksDOM.length; i++) {
            tracksDOM[i].remove();
        }
    };

    playerInstance.hideSuggestedVideos = () => {
        const suggestedVideosDOM = document.getElementsByClassName('suggested_tile_grid')[0];
        if (suggestedVideosDOM) {
            suggestedVideosDOM.remove();
        }
    };

    playerInstance.isShowingSuggestedVideos = () => {
        return !!document.getElementsByClassName('suggested_tile_grid')[0];
    }

}
