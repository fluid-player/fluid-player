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

        for (let i = 0; i < 12; i++) {
            const videoTile = playerInstance.createVideoTile(config[i]);
            suggestedVideosGrid.appendChild(videoTile);
        }

        return suggestedVideosGrid;
    };

    playerInstance.displaySuggestedVideos = () => {
        const PlayerDOM = document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId);
        PlayerDOM.appendChild(playerInstance.suggestedVideosGrid);
    };

    playerInstance.clickSuggestedVideo = (sources, subtitles, configUrl) => {
        playerInstance.hideSuggestedVideos();
        playerInstance.resetPlayer(sources, subtitles, configUrl);

        playerInstance.generateSuggestedVideoList();
    };

    playerInstance.resetPlayer = (sources, subtitles, configUrl) => {
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

        playerInstance.removeVideoSourcesListFromDOM();

        const videoSourceList = document.getElementsByClassName('fluid_control_video_source')[0];
        videoSourceList.innerHTML = '';
        playerInstance.domRef.player.src = '';
        playerInstance.createVideoSourceSwitch(false);
        playerInstance.resetSubtitles();
        playerInstance.setPersistentSettings();
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
                videoTile.style = `background: linear-gradient(125deg, ${mostProminentColors[0]} 0%, ${mostProminentColors[1]} 100%);`;
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
        const videoSubtitlesList = document.getElementsByClassName('fluid_control_subtitles')[0];
        videoSubtitlesList.innerHTML = '';
        playerInstance.createSubtitles(false);
    }

    playerInstance.loadInNewVideo = () => {
        playerInstance.initialiseStreamers();
        playerInstance.domRef.player.currentTime = 0;
        playerInstance.domRef.player.mainVideoCurrentTime = 0;
        playerInstance.setCurrentTimeAndPlay(0, false);
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

    playerInstance.getImageTwoMostProminentColours = (imageUrl) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = imageUrl;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                const imageData = ctx.getImageData(0, 0, img.width, img.height).data;

                const colorCount = {};
                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];
                    const color = `rgb(${r},${g},${b})`;

                    if (colorCount[color]) {
                        colorCount[color]++;
                    } else {
                        colorCount[color] = 1;
                    }
                }

                const rgbToHsl = (r, g, b) => {
                    r /= 255, g /= 255, b /= 255;
                    const max = Math.max(r, g, b), min = Math.min(r, g, b);
                    let h, s, l = (max + min) / 2;

                    if (max === min) {
                        h = s = 0;
                    } else {
                        const d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        switch (max) {
                            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                            case g: h = (b - r) / d + 2; break;
                            case b: h = (r - g) / d + 4; break;
                        }
                        h /= 6;
                    }

                    return [h, s, l];
                };

                const sortedColors = Object.keys(colorCount).map(color => {
                    const [r, g, b] = color.match(/\d+/g).map(Number);
                    const [h, s, l] = rgbToHsl(r, g, b);
                    return { color, h, s, l, score: s + (1 - Math.abs(2 * l - 1)) };
                }).sort((a, b) => b.score - a.score);

                const isCloseToBlack = (color) => {
                    const rgb = color.match(/\d+/g).map(Number);
                    const blackThreshold = 40;
                    return rgb[0] < blackThreshold && rgb[1] < blackThreshold && rgb[2] < blackThreshold;
                };

                const minHueDifference = 0.1;
                const minSaturationDifference = 0.1;
                const minLightnessDifference = 0.1;

                let mostVibrantColors = [];

                for (const colorObj of sortedColors) {
                    if (mostVibrantColors.length === 2) break;
                    if (!isCloseToBlack(colorObj.color)) {
                        const enoughDifference = mostVibrantColors.every(existingColor => {
                            const hueDifference = Math.abs(colorObj.h - existingColor.h);
                            const saturationDifference = Math.abs(colorObj.s - existingColor.s);
                            const lightnessDifference = Math.abs(colorObj.l - existingColor.l);
                            return (
                                hueDifference >= minHueDifference &&
                                saturationDifference >= minSaturationDifference &&
                                lightnessDifference >= minLightnessDifference
                            );
                        });
                        if (enoughDifference) {
                            mostVibrantColors.push(colorObj);
                        }
                    }
                }

                if (mostVibrantColors.length < 2) {
                    mostVibrantColors = sortedColors.slice(0, 2);
                }

                resolve(mostVibrantColors.map(colorObj => colorObj.color));
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
        });
    }

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
