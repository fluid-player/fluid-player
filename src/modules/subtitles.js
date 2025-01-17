export default function (playerInstance, options) {
    playerInstance.subtitleFetchParse = (subtitleItem) => {
        playerInstance.sendRequest(
            subtitleItem.url,
            true,
            playerInstance.displayOptions.vastOptions.vastTimeout,
            function () {
                const convertVttRawData = function (vttRawData) {
                    if (!(
                        (typeof vttRawData.cues !== 'undefined') &&
                        (vttRawData.cues.length)
                    )) {
                        return [];
                    }

                    const result = [];

                    for (let i = 0; i < vttRawData.cues.length; i++) {
                        let tempThumbnailData = vttRawData.cues[i].text.split('#');

                        result.push({
                            startTime: vttRawData.cues[i].startTime,
                            endTime: vttRawData.cues[i].endTime,
                            text: vttRawData.cues[i].text,
                            cue: vttRawData.cues[i]
                        })
                    }

                    return result;
                };

                const xmlHttpReq = this;

                if ((xmlHttpReq.readyState === 4) && (xmlHttpReq.status !== 200)) {
                    //The response returned an error.
                    return;
                }

                if (!((xmlHttpReq.readyState === 4) && (xmlHttpReq.status === 200))) {
                    return;
                }

                const textResponse = xmlHttpReq.responseText;

                const parser = new WebVTT.Parser(window, WebVTT.StringDecoder());
                const cues = [];
                const regions = []; // TODO: unused?
                parser.oncue = function (cue) {
                    cues.push(cue);
                };
                parser.onregion = function (region) {
                    regions.push(region);
                };
                parser.parse(textResponse);
                parser.flush();
                playerInstance.subtitlesData = cues;

            }
        );
    };

    playerInstance.createSubtitlesSwitch = () => {
        const subtitlesOff = 'OFF';
        playerInstance.subtitlesData = [];

        if (!playerInstance.displayOptions.layoutControls.subtitlesEnabled) {
            // No other video subtitles
            playerInstance.domRef.wrapper.querySelector('.fluid_control_subtitles').style.display = 'none';
            return;
        }

        const tracks = [];
        tracks.push({'label': subtitlesOff, 'url': 'na', 'lang': subtitlesOff});

        const tracksList = playerInstance.domRef.player.querySelectorAll('track');

        [].forEach.call(tracksList, function (track) {
            if (track.kind === 'metadata' && track.src) {
                tracks.push({'label': track.label, 'url': track.src, 'lang': track.srclang, 'default': track.default});
            }
        });

        playerInstance.subtitlesTracks = tracks;
        const subtitlesChangeButton = playerInstance.domRef.wrapper.querySelector('.fluid_control_subtitles');
        subtitlesChangeButton.style.display = 'inline-block';
        let appendSubtitleChange = false;

        const subtitlesChangeList = document.createElement('div');
        subtitlesChangeList.className = 'fluid_subtitles_list';
        subtitlesChangeList.style.display = 'none';

        let hasSelectedSubtitle = false;
        const hasDefault = !!playerInstance.subtitlesTracks.find(track => track.default);
        playerInstance.subtitlesTracks.forEach(function (subtitle) {
            let subtitleSelected = ''

            const subtitlesOnByDefault = playerInstance.displayOptions.layoutControls.subtitlesOnByDefault;

            if (!hasSelectedSubtitle && (subtitlesOnByDefault && subtitle.default ||
                (!hasDefault && subtitle.label !== subtitlesOff) ||
                playerInstance.subtitlesTracks.length === 1) ||
                !subtitlesOnByDefault && subtitle.label === subtitlesOff
            ) {
                subtitleSelected = 'subtitle_selected';
                playerInstance.subtitleFetchParse(subtitle);
                hasSelectedSubtitle = true;
            }

            const subtitlesChangeDiv = document.createElement('div');
            subtitlesChangeDiv.className = 'fluid_subtitle_list_item';
            subtitlesChangeDiv.innerHTML = '<span class="subtitle_button_icon ' + subtitleSelected + '"></span>' + subtitle.label;

            subtitlesChangeDiv.addEventListener('click', function (event) {
                event.stopPropagation();
                const subtitleChangedTo = this;
                const subtitleIcons = playerInstance.domRef.wrapper.getElementsByClassName('subtitle_button_icon');

                for (let i = 0; i < subtitleIcons.length; i++) {
                    subtitleIcons[i].className = subtitleIcons[i].className.replace("subtitle_selected", "");
                }

                subtitleChangedTo.firstChild.className += ' subtitle_selected';

                playerInstance.subtitlesTracks.forEach(function (subtitle) {
                    if (subtitle.label === subtitleChangedTo.innerText.replace(/(\r\n\t|\n|\r\t)/gm, "")) {
                        if (subtitle.label === subtitlesOff) {
                            playerInstance.subtitlesData = [];
                        } else {
                            playerInstance.subtitleFetchParse(subtitle);
                        }
                    }
                });
                playerInstance.openCloseSubtitlesSwitch();

            });

            subtitlesChangeList.appendChild(subtitlesChangeDiv);
            appendSubtitleChange = true;

        });

        if (appendSubtitleChange) {
            subtitlesChangeButton.appendChild(subtitlesChangeList);
            subtitlesChangeButton.removeEventListener('click', handleSubtitlesChange);
            subtitlesChangeButton.addEventListener('click', handleSubtitlesChange);
        } else {
            // Didn't give any subtitle options
            playerInstance.domRef.wrapper.querySelector('.fluid_control_subtitles').style.display = 'none';
        }

        playerInstance.domRef.player.removeEventListener('timeupdate', videoPlayerSubtitlesUpdate);
        playerInstance.domRef.player.addEventListener('timeupdate', videoPlayerSubtitlesUpdate);
    };

    function handleSubtitlesChange() {
        playerInstance.openCloseSubtitlesSwitch();
    }

    //attach subtitles to show based on time
    //this function is for rendering of subtitles when content is playing
    function videoPlayerSubtitlesUpdate() {
        playerInstance.renderSubtitles();
    }

    playerInstance.renderSubtitles = () => {
        const videoPlayer = playerInstance.domRef.player;

        //if content is playing then no subtitles
        let currentTime = Math.floor(videoPlayer.currentTime);
        let subtitlesAvailable = false;
        let subtitlesContainer = playerInstance.domRef.wrapper.querySelector('.fluid_subtitles_container');

        if (playerInstance.isCurrentlyPlayingAd) {
            subtitlesContainer.innerHTML = '';
            return;
        }

        for (let i = 0; i < playerInstance.subtitlesData.length; i++) {
            if (currentTime >= (playerInstance.subtitlesData[i].startTime) && currentTime <= (playerInstance.subtitlesData[i].endTime)) {
                subtitlesContainer.innerHTML = '';
                subtitlesContainer.appendChild(WebVTT.convertCueToDOMTree(window, playerInstance.subtitlesData[i].text));
                subtitlesAvailable = true;
            }
        }

        if (!subtitlesAvailable) {
            subtitlesContainer.innerHTML = '';
        }
    };

    playerInstance.openCloseSubtitlesSwitch = () => {
        const subtitleChangeList = playerInstance.domRef.wrapper.querySelector('.fluid_subtitles_list');

        if (playerInstance.isCurrentlyPlayingAd) {
            subtitleChangeList.style.display = 'none';
            return;
        }

        if (subtitleChangeList.style.display === 'none') {
            subtitleChangeList.style.display = 'block';
            const mouseOut = function (event) {
                subtitleChangeList.removeEventListener('mouseleave', mouseOut);
                subtitleChangeList.style.display = 'none';
            };
            subtitleChangeList.addEventListener('mouseleave', mouseOut);
        } else {
            subtitleChangeList.style.display = 'none';
        }
    };

    playerInstance.createSubtitles = () => {
        const divSubtitlesContainer = document.createElement('div');
        divSubtitlesContainer.className = 'fluid_subtitles_container';
        playerInstance.domRef.player.parentNode.insertBefore(divSubtitlesContainer, playerInstance.domRef.player.nextSibling);

        if (!playerInstance.displayOptions.layoutControls.subtitlesEnabled) {
            return;
        }

        import(/* webpackChunkName: "vttjs" */ 'videojs-vtt.js').then((it) => {
            window.WebVTT = it.WebVTT || it.default.WebVTT;
            playerInstance.createSubtitlesSwitch();
        });
    };

    playerInstance.repositionSubtitlesContainer = (size) => {
        const subtitlesContainer = playerInstance.domRef.wrapper.querySelector('.fluid_subtitles_container');
        subtitlesContainer.style.bottom = size;
    };
}
