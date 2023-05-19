export default function (playerInstance, options) {
    playerInstance.suggestedVideosGrid = null;

    playerInstance.generateSuggestedVideoList = () => {
        const configUrl = playerInstance.displayOptions.suggestedVideos.configUrl

        playerInstance.sendRequestAsync(configUrl, false, 5000).then(({response}) => {
            const config = JSON.parse(response);
            playerInstance.generateSuggestedVideoGrid(config)
        });
    };

    playerInstance.generateSuggestedVideoGrid = (config) => {
        const suggestedVideosGrid = document.createElement('div');
        suggestedVideosGrid.className = 'suggested_tile_grid';

        // for (let i = 0; i < 6; i++) {
        //     const videoTile = document.createElement('div');
        //     videoTile.addEventListener('click', function () { playerInstance.clickSuggestedVideo(config[i].sources, config[i].tags) }, false)
        //     videoTile.className = 'suggested_tile';
        //     videoTile.id = 'suggested_tile_' + config[i].id;
        //     videoTile.style = `background-image: url(${config[i].thumbnailUrl})`;

        //     const title = document.createElement('p');
        //     title.className = 'title';
        //     title.innerText = config[i].title;


        //     videoTile.appendChild(title);

        //     suggestedVideosGrid.appendChild(videoTile);
        // }

        for (let i = 0; i < 6; i++) {
            const videoTile = document.createElement('div');
            videoTile.addEventListener('click', function () { playerInstance.clickSuggestedVideo(config[i].sources, config[i].tags) }, false)
            videoTile.className = 'suggested_tile';
            videoTile.id = 'suggested_tile_' + config[i].id;
            videoTile.style = `background-image: url(${config[i].thumbnailUrl})`;

            const suggestedTileOverlay = document.createElement('div');
            suggestedTileOverlay.className='suggested_tile_overlay';
            const title = document.createElement('p');
            title.className = 'title';
            title.innerText = config[i].title;
            suggestedTileOverlay.appendChild(title);

            videoTile.appendChild(suggestedTileOverlay);

            suggestedVideosGrid.appendChild(videoTile);
        }

        playerInstance.suggestedVideosGrid = suggestedVideosGrid;
    };

    playerInstance.showSuggestedVideos = () => {
        console.log('Display Suggested Videos');
        const PlayerDOM = document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId);
        PlayerDOM.appendChild(playerInstance.suggestedVideosGrid);
    };

    playerInstance.clickSuggestedVideo = (sources, tags) => {
        playerInstance.saveTagsToLocalStorage(tags);
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

        console.log('Display new Video', sources);
    };

    playerInstance.hideSuggestedVideos = () => {
        document.getElementsByClassName('suggested_tile_grid')[0].remove();
    };

    playerInstance.saveTagsToLocalStorage = (tags) => {
        let savedTags = playerInstance.fluidStorage.tags ? JSON.parse(playerInstance.fluidStorage.tags) : [];
        const tagNames = savedTags.map(tag => tag.name);

        for (let i = 0; i < tags.length; i++) {
            const tag = tags[i];
            if (tagNames.includes(tag)) {
                savedTags.filter(savedTag => savedTag.name === tag)[0].count++;
            } else {
                savedTags.push({
                    name: tag,
                    count:1,
                })
            }
        }

        playerInstance.fluidStorage.tags = JSON.stringify(savedTags);
    };

}