export default function (playerInstance, options) {
    playerInstance.suggestedVideosGrid = null;

    playerInstance.generateSuggestedVideoList = () => {
        const configUrl = playerInstance.displayOptions.suggestedVideos.configUrl

        playerInstance.sendRequestAsync(configUrl, false, 5000).then(({response}) => {
            const config = JSON.parse(response);
            console.log(config)
            const suggestedVideosGrid = playerInstance.generateSuggestedVideoGrid(config);

            playerInstance.suggestedVideosGrid = suggestedVideosGrid;
            console.log(suggestedVideosGrid);
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

    playerInstance.createVideoTile = (config) => {
        const videoTile = document.createElement('div');
        videoTile.addEventListener('click', function () {
            playerInstance.clickSuggestedVideo(config.sources)
        }, false);
        videoTile.className = 'suggested_tile';
        videoTile.id = 'suggested_tile_' + config.id;
        videoTile.style = `background-image: url(${config.thumbnailUrl})`;

        const suggestedTileOverlay = document.createElement('div');
        suggestedTileOverlay.className='suggested_tile_overlay';
        const title = document.createElement('p');
        title.className = 'title';
        title.innerText = config.title;
        suggestedTileOverlay.appendChild(title);

        return videoTile.appendChild(suggestedTileOverlay);
    };

    playerInstance.displaySuggestedVideos = () => {
        const PlayerDOM = document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId);
        PlayerDOM.appendChild(playerInstance.suggestedVideosGrid);
    };

    playerInstance.clickSuggestedVideo = (sources) => {
        playerInstance.hideSuggestedVideos();
        const videoDOM = document.getElementsByTagName('video')[0];
        videoDOM.innerHTML = '';

        let sourcesHTML = ''
        sources.forEach(source => {
            sourcesHTML += `<source src='${source.url}' ${source.hd && 'data-fluid-hd'} title="${source.resolution}" type='${source.mimeType}'/>`;
        });
        videoDOM.innerHTML = sourcesHTML;

        // TODO: WIP remove previous sources and create the new ones
        // works on first switch but not on second one
        const sourcesDOM = document.getElementsByClassName('fluid_video_source_list_item');
        for (let i = 0; i < sourcesDOM.length; i++) {
            sourcesDOM[i].remove();
        }
        playerInstance.createVideoSourceSwitch();

        playerInstance.createSubtitles();
        playerInstance.createCardboard();
        playerInstance.userActivityChecker();
        playerInstance.setVastList();
        playerInstance.setPersistentSettings();
        playerInstance.domRef.player.src = sources[0].url;
        playerInstance.initialiseStreamers();
        playerInstance.domRef.player.currentTime = 0;
        playerInstance.setCurrentTimeAndPlay(playerInstance.domRef.player.currentTime, true);
        playerInstance.setBuffering();

        playerInstance.generateSuggestedVideoList();
    };

    playerInstance.hideSuggestedVideos = () => {
        const suggestedVideosDOM = document.getElementsByClassName('suggested_tile_grid')[0];
        if (suggestedVideosDOM) {
            suggestedVideosDOM.remove();
        }
    };

}