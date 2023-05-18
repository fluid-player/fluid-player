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

        for (let i = 0; i < 6; i++) {
            const videoTile = document.createElement('div');
            videoTile.className = 'suggested_tile';
            videoTile.id = 'suggested_tile_' + config[i].id;
            videoTile.style = `background-image: url(${config[i].thumbnailUrl})`;

            const title = document.createElement('p');
            title.className = 'title';
            title.innerText = config[i].title;
            videoTile.appendChild(title);

            suggestedVideosGrid.appendChild(videoTile);
        }

        playerInstance.suggestedVideosGrid = suggestedVideosGrid;
    };

    playerInstance.showSuggestedVideos = () => {
        console.log('Display Suggested Videos');
        const PlayerDOM = document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId);
        PlayerDOM.appendChild(playerInstance.suggestedVideosGrid);
    };

    playerInstance.clickSuggestedVideo = () => {
        console.log('Display new Video');
    };

    playerInstance.hideSuggestedVideos = () => {
        console.log('Hide Suggested Videos');
    };

    // Denisa, code for local storage
    // playerInstance.trackTag = (tagName) => {
    //     if (!localStorage.hasOwnProperty("tags"))
    //         localStorage.setItem("tags", JSON.stringify({}))
    //     var tags = JSON.parse(localStorage.getItem('tags'))
    //     if (tags.hasOwnProperty(tagName))
    //         tags[tagName] = parseInt(tags[tagName]) + 1
    //     else {
    //         tags[tagName] = 1
    //         localStorage.setItem("tags", JSON.stringify(tags))
    //     }
    // };

}