export default function (playerInstance, options) {
    // Define the subtitle size levels
    playerInstance.subtitleSizeLevels = [50, 75, 100, 150, 200]; // in percentage
    playerInstance.currentSubtitleSizeIndex = playerInstance.subtitleSizeLevels.indexOf(100); // Default to 100%

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

        playerInstance.addSubtitleSizeControls(subtitlesChangeList, subtitlesChangeButton);

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

    function handleSubtitlesChange(event) {
        const subtitlesChangeButton = playerInstance.domRef.wrapper.querySelector('.fluid_control_subtitles');
        let hasOpenMenuOrSubMenu = false;

        // Check if menu or any submenu is open
        for (let i = 0; i < subtitlesChangeButton.children.length; i++) {
            if (subtitlesChangeButton.children[i].style.display === 'block') {
                hasOpenMenuOrSubMenu = true;
                subtitlesChangeButton.children[i].style.display = 'none';
            }
        }

        // Only open subtitle menu if no menu or submenu (direct child) is visible
        if (!hasOpenMenuOrSubMenu) {
            playerInstance.openCloseSubtitlesSwitch();
        }
    }

    //attach subtitles to show based on time
    //this function is for rendering of subtitles when content is playing
    function videoPlayerSubtitlesUpdate() {
        playerInstance.renderSubtitles();
    }

    /**
     * Creates and appends the subtitle size button and menu
     *
     * @param {HTMLElement} subtitlesChangeList The container for the subtitles change list
     * @param {HTMLElement} subtitlesChangeButton The button to toggle the subtitles menu
     */
    playerInstance.addSubtitleSizeControls = (subtitlesChangeList, subtitlesChangeButton) => {
        const subtitlesSizeButton = playerInstance.createSubtitleSizeButton();
        const subtitlesSizeMenu = playerInstance.createSubtitleSizeMenu();
        subtitlesSizeMenu.style.display = 'none';
        subtitlesChangeList.appendChild(subtitlesSizeButton);
        subtitlesChangeButton.appendChild(subtitlesSizeMenu);
    };

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

    /**
     * Resize the subtitles font size
     *
     * @param size size in percentage, 100% is the default size
     */
    playerInstance.resizeSubtitles = (size) => {
        const subtitlesContainer = playerInstance.domRef.wrapper.querySelector('.fluid_subtitles_container');
        const fontSizeInEm = size / 100; // Convert percentage to em
        subtitlesContainer.style.fontSize = `${fontSizeInEm}em`;
    }

    /**
     * Adjusts the subtitle size to the next or previous level.
     *
     * @param {'+'|'-'} operation '+' to increase, '-' to decrease
     */
    playerInstance.adjustSubtitleSizeByOperation = (operation) => {
        // Validate the operation and the current subtitle size index
        if (operation === '+' && playerInstance.currentSubtitleSizeIndex < playerInstance.subtitleSizeLevels.length - 1) {
            playerInstance.currentSubtitleSizeIndex++;
        } else if (operation === '-' && playerInstance.currentSubtitleSizeIndex > 0) {
            playerInstance.currentSubtitleSizeIndex--;
        } else {
            return; // invalid operation
        }

        const newSize = playerInstance.subtitleSizeLevels[playerInstance.currentSubtitleSizeIndex];
        playerInstance.resizeSubtitles(newSize);

        // Update the checkmark in the subtitle size menu
        playerInstance.updateSubtitleSizeMenuSelection();
    };

    /**
     * Updates the subtitle size menu to show the correct checkmark
     * based on the current subtitle size index
     */
    playerInstance.updateSubtitleSizeMenuSelection = () => {
        const sizeMenu = playerInstance.domRef.wrapper.querySelector('.fluid_subtitle_size_menu');
        if (!sizeMenu) return;

        // Clear all existing checkmarks
        const sizeIcons = sizeMenu.querySelectorAll('.subtitle_button_icon');
        for (let i = 0; i < sizeIcons.length; i++) {
            sizeIcons[i].className = sizeIcons[i].className.replace("subtitle_size_selected", "");
        }

        // Get all size buttons (skip the back button)
        const sizeButtons = Array.from(sizeMenu.querySelectorAll('.fluid_subtitle_size_button'))
            .filter(button => !button.classList.contains('fluid_sub_menu_button'));

        // Add the checkmark to the current size button if it exists
        if (sizeButtons[playerInstance.currentSubtitleSizeIndex]) {
            const icon = sizeButtons[playerInstance.currentSubtitleSizeIndex].querySelector('.subtitle_button_icon');
            if (icon) {
                icon.className += ' subtitle_size_selected';
            }
        }
    };

    /**
     * Creates the subtitle size button element
     *
     * @returns {HTMLElement} The subtitle size button element
     */
    playerInstance.createSubtitleSizeButton = () => {
        const subtitleSizeMenuButton = document.createElement('div');
        subtitleSizeMenuButton.className = 'fluid_subtitle_list_item fluid_sub_menu_button arrow-right';
        subtitleSizeMenuButton.innerHTML = 'Font Size';

        subtitleSizeMenuButton.addEventListener('click', (event) => {
            event.stopPropagation();
            playerInstance.toggleSubtitleSizeMenu();
            playerInstance.openCloseSubtitlesSwitch();
        });

        return subtitleSizeMenuButton;
    }

    /**
     * Creates the subtitle size menu element
     *
     * @returns {HTMLElement} The subtitle size menu element
     */
    playerInstance.createSubtitleSizeMenu = () => {
        const subtitleSizeMenu = document.createElement('div');
        subtitleSizeMenu.className = 'fluid_subtitle_size_menu';

        // Add the "Back" button
        const backButton = playerInstance.createBackButtonForSubtitleSizeMenu();
        subtitleSizeMenu.appendChild(backButton);

        // Add the font size options
        playerInstance.subtitleSizeLevels.forEach((size, index) => {
            const subtitleSizeButton = document.createElement('div');
            subtitleSizeButton.className = 'fluid_subtitle_size_button';

            const isSelected = size === 100; // Default size is 100%
            subtitleSizeButton.innerHTML = '<span class="subtitle_button_icon ' + (isSelected ? 'subtitle_size_selected' : '') + '"></span>' + size + '%';

            subtitleSizeButton.addEventListener('click', (event) => {
                // Stop the click event from propagating to parent elements,
                // preventing unintended actions like toggling the entire menu.
                event.stopPropagation();
                playerInstance.toggleSubtitleSizeMenu();
                playerInstance.resizeSubtitles(size);
                playerInstance.currentSubtitleSizeIndex = index;

                // Update the checkmark for all size buttons
                playerInstance.updateSubtitleSizeMenuSelection();
            });

            subtitleSizeMenu.appendChild(subtitleSizeButton);
        });

        return subtitleSizeMenu;
    };

    /**
     * Creates a "Back" button for the subtitle size menu.
     */
    playerInstance.createBackButtonForSubtitleSizeMenu = () => {
        const backButton = document.createElement('div');
        backButton.className = 'fluid_subtitle_size_button fluid_sub_menu_button arrow-left';
        backButton.innerHTML = 'Font Size';

        backButton.addEventListener('click', (event) => {
            event.stopPropagation();
            playerInstance.toggleSubtitleSizeMenu();
            playerInstance.openCloseSubtitlesSwitch();
        });

        return backButton;
    };

    /**
     * Toggles the visibility of the subtitle size menu
     */
    playerInstance.toggleSubtitleSizeMenu = () => {
        const subtitleSizeMenu = playerInstance.domRef.wrapper.querySelector('.fluid_subtitle_size_menu');

        const mouseOut = function (event) {
            subtitleSizeMenu.removeEventListener('mouseleave', mouseOut);
            subtitleSizeMenu.style.display = 'none';
        };

        if (subtitleSizeMenu.style.display === 'block') {
            subtitleSizeMenu.style.display = 'none';
            subtitleSizeMenu.removeEventListener('mouseleave', mouseOut);
        } else {
            subtitleSizeMenu.style.display = 'block';
            subtitleSizeMenu.addEventListener('mouseleave', mouseOut);
        }
    }

    playerInstance.repositionSubtitlesContainer = (size) => {
        const subtitlesContainer = playerInstance.domRef.wrapper.querySelector('.fluid_subtitles_container');
        subtitlesContainer.style.bottom = size;
    };
}
