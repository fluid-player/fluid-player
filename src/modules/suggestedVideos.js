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
        // Document better, this part is for HTML video removal I think
        // TODO: getting by 'video' is not a good idea, do something with an ID or more specific name
        const videoDOM = document.getElementsByTagName('video')[0];
        videoDOM.innerHTML = '';

        let sourcesHTML = '';
        sources.forEach(source => {
            sourcesHTML += `<source src='${source.url}' ${source.hd ? 'data-fluid-hd' : ''} title="${source.resolution}" type='${source.mimeType}'/>`;
        });
        subtitles.forEach(subtitle => {
            sourcesHTML += `<track label="${subtitle.label}" kind="metadata" srclang="${subtitle.lang}" src="${subtitle.url}" ${subtitle.default ? 'default' : ''}>`;
        });
        console.log(sourcesHTML);

        videoDOM.innerHTML = sourcesHTML;

        // This for the custom list
        playerInstance.removeVideoSourcesListFromDOM();

        // TODO: when coming from a video with no switch, it bugs out and can't open the switch
        const videoSourceList = document.getElementsByClassName('fluid_control_video_source')[0];
        videoSourceList.innerHTML = '';
        playerInstance.domRef.player.src = '';
        playerInstance.createVideoSourceSwitch(false);

        // TODO: same problem as video sources here above
        // Subtitles
        playerInstance.removeSubtitlesListFromDOM();
        const videoSubtitlesList = document.getElementsByClassName('fluid_control_subtitles')[0];
        videoSubtitlesList.innerHTML = '';
        console.dir(playerInstance.domRef.player);
        // if (playerInstance.domRef.player.textTracks) {

        // }
        playerInstance.createSubtitles(false);

        // TODO: do the same as video switch for every other option under here

        // playerInstance.createCardboard();
        // playerInstance.userActivityChecker();
        // playerInstance.setVastList();
        playerInstance.setPersistentSettings();
        playerInstance.initialiseStreamers();
        playerInstance.domRef.player.currentTime = 0;
        playerInstance.setCurrentTimeAndPlay(playerInstance.domRef.player.currentTime, true);
        playerInstance.setBuffering();
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

    playerInstance.createVideoSourcesHTML = () => {
        let sourcesHTML = ''
        sources.forEach(source => {
            sourcesHTML += `<source src='${source.url}' ${source.hd && 'data-fluid-hd'} title="${source.resolution}" type='${source.mimeType}'/>`;
        });
    }

    playerInstance.removeVideoSourcesListFromDOM = () => {
        // TODO: same as todo on subtitles
        const sourcesDOM = document.getElementsByClassName('fluid_video_source_list_item');
        for (let i = 0; i < sourcesDOM.length; i++) {
            sourcesDOM[i].remove();
        }
    };

    playerInstance.removeSubtitlesListFromDOM = () => {
        // TODO: change fluid_subtitle_list_item to getting it by fluid_subtitle_list
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

}