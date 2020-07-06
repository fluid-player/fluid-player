'use strict';
export default function (playerInstance, options) {
    const VPAID_VERSION = '2.0';

    playerInstance.renderLinearAd = (adListId, backupTheVideoTime) => {
        playerInstance.toggleLoader(true);

        //get the proper ad
        playerInstance.vastOptions = playerInstance.adPool[adListId];

        if (backupTheVideoTime) {
            playerInstance.backupMainVideoContentTime(adListId);
        }

        const playVideoPlayer = adListId => {
            playerInstance.switchPlayerToVpaidMode = adListId => {
                playerInstance.debugMessage('starting function switchPlayerToVpaidMode');
                const vpaidIframe = playerInstance.videoPlayerId + "_" + adListId + "_fluid_vpaid_iframe";
                const creativeData = {};
                creativeData.AdParameters = playerInstance.adPool[adListId].adParameters;
                const slotElement = document.createElement('div');
                slotElement.id = playerInstance.videoPlayerId + "_fluid_vpaid_slot";
                slotElement.className = 'fluid_vpaid_slot';
                slotElement.setAttribute('adListId', adListId);

                playerInstance.domRef.player.parentNode.insertBefore(slotElement, vpaidIframe.nextSibling);

                const environmentVars = {
                    slot: slotElement,
                    videoSlot: playerInstance.domRef.player,
                    videoSlotCanAutoPlay: true
                };

                // calls this functions after ad unit is loaded in iframe
                const ver = playerInstance.vpaidAdUnit.handshakeVersion(VPAID_VERSION);
                const compare = playerInstance.compareVersion(VPAID_VERSION, ver);
                if (compare === 1) {
                    //VPAID version of ad is lower than we need
                    playerInstance.adList[adListId].error = true;
                    playerInstance.playMainVideoWhenVpaidFails(403);
                    return false;
                }

                if (playerInstance.vastOptions.skipoffset !== false) {
                    playerInstance.addSkipButton();
                }

                playerInstance.domRef.player.loop = false;
                playerInstance.domRef.player.removeAttribute('controls'); //Remove the default Controls

                playerInstance.vpaidCallbackListenersAttach();
                const mode = (playerInstance.fullscreenMode ? 'fullscreen' : 'normal');
                const adWidth = playerInstance.domRef.player.offsetWidth;
                const adHeight = playerInstance.domRef.player.offsetHeight;
                playerInstance.vpaidAdUnit.initAd(adWidth, adHeight, mode, 3000, creativeData, environmentVars);

                const progressbarContainer = playerInstance.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');
                for (let i = 0; i < progressbarContainer.length; i++) {
                    progressbarContainer[i].style.backgroundColor = playerInstance.displayOptions.layoutControls.adProgressColor;
                }

                playerInstance.toggleLoader(false);
                playerInstance.adList[adListId].played = true;
                playerInstance.adFinished = false;
            };

            playerInstance.switchPlayerToVastMode = () => {
                //Get the actual duration from the video file if it is not present in the VAST XML
                if (!playerInstance.vastOptions.duration) {
                    playerInstance.vastOptions.duration = playerInstance.domRef.player.duration;
                }

                if (playerInstance.displayOptions.layoutControls.showCardBoardView) {

                    if (!playerInstance.adList[adListId].landingPage) {
                        playerInstance.addCTAButton(playerInstance.adPool[adListId].clickthroughUrl);
                    } else {
                        playerInstance.addCTAButton(playerInstance.adList[adListId].landingPage);
                    }

                } else {

                    const addClickthroughLayer = (typeof playerInstance.adList[adListId].adClickable != "undefined") ? playerInstance.adList[adListId].adClickable : playerInstance.displayOptions.vastOptions.adClickable;

                    if (addClickthroughLayer) {
                        playerInstance.addClickthroughLayer(playerInstance.videoPlayerId);
                    }

                    playerInstance.addCTAButton(playerInstance.adList[adListId].landingPage);

                }

                if (playerInstance.vastOptions.skipoffset !== false) {
                    playerInstance.addSkipButton();
                }

                playerInstance.domRef.player.loop = false;

                playerInstance.addAdCountdown();

                playerInstance.domRef.player.removeAttribute('controls'); //Remove the default Controls

                playerInstance.vastLogoBehaviour(true);

                const progressbarContainer = playerInstance.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');
                for (let i = 0; i < progressbarContainer.length; i++) {
                    progressbarContainer[i].style.backgroundColor = playerInstance.displayOptions.layoutControls.adProgressColor;
                }

                if (playerInstance.displayOptions.vastOptions.adText || playerInstance.adList[adListId].adText) {
                    const adTextToShow = (playerInstance.adList[adListId].adText !== null) ? playerInstance.adList[adListId].adText : playerInstance.displayOptions.vastOptions.adText;
                    playerInstance.addAdPlayingText(adTextToShow);
                }

                playerInstance.positionTextElements(playerInstance.adList[adListId]);

                playerInstance.toggleLoader(false);
                playerInstance.adList[adListId].played = true;
                playerInstance.adFinished = false;
                playerInstance.domRef.player.play();

                //Announce the impressions
                playerInstance.trackSingleEvent('impression');

                playerInstance.domRef.player.removeEventListener('loadedmetadata', playerInstance.switchPlayerToVastMode);

                // if in vr mode then do not show
                if (playerInstance.vrMode) {
                    const adCountDownTimerText = document.getElementById('ad_countdown' + playerInstance.videoPlayerId);
                    const ctaButton = document.getElementById(playerInstance.videoPlayerId + '_fluid_cta');
                    const addAdPlayingTextOverlay = document.getElementById(playerInstance.videoPlayerId + '_fluid_ad_playing');
                    const skipBtn = document.getElementById('skip_button_' + playerInstance.videoPlayerId);

                    if (adCountDownTimerText) {
                        adCountDownTimerText.style.display = 'none';
                    }

                    if (ctaButton) {
                        ctaButton.style.display = 'none';
                    }

                    if (addAdPlayingTextOverlay) {
                        addAdPlayingTextOverlay.style.display = 'none';
                    }

                    if (skipBtn) {
                        skipBtn.style.display = 'none';
                    }
                }
            };

            playerInstance.domRef.player.pause();

            // Remove the streaming objects to prevent errors on the VAST content
            playerInstance.detachStreamers();

            //Try to load multiple
            const selectedMediaFile = playerInstance.getSupportedMediaFileObject(playerInstance.vastOptions.mediaFileList);

            // if player in cardboard mode then, linear ads media type should be a '360' video
            if (playerInstance.displayOptions.layoutControls.showCardBoardView && playerInstance.adList[adListId].mediaType !== '360') {
                playerInstance.adList[adListId].error = true;
                playerInstance.playMainVideoWhenVastFails(403);
                return false;
            }

            const isVpaid = playerInstance.vastOptions.vpaid;

            if (!isVpaid) {
                if (selectedMediaFile.src === false) {
                    // Couldn’t find MediaFile that is supported by this video player, based on the attributes of the MediaFile element.
                    playerInstance.adList[adListId].error = true;
                    playerInstance.playMainVideoWhenVastFails(403);
                    return false;
                }

                playerInstance.domRef.player.addEventListener('loadedmetadata', playerInstance.switchPlayerToVastMode);

                playerInstance.domRef.player.src = selectedMediaFile.src;
                playerInstance.isCurrentlyPlayingAd = true;

                if (playerInstance.displayOptions.vastOptions.showProgressbarMarkers) {
                    playerInstance.hideAdMarkers();
                }

                playerInstance.domRef.player.load();

                //Handle the ending of the Pre-Roll ad
                playerInstance.domRef.player.addEventListener('ended', playerInstance.onVastAdEnded);

            } else {
                playerInstance.loadVpaid(adListId, selectedMediaFile.src);

                if (playerInstance.displayOptions.vastOptions.showProgressbarMarkers) {
                    playerInstance.hideAdMarkers();
                }
            }
        };

        /**
         * Sends requests to the tracking URIs
         */
        const videoPlayerTimeUpdate = () => {
            if (playerInstance.adFinished) {
                playerInstance.domRef.player.removeEventListener('timeupdate', videoPlayerTimeUpdate);
                return;
            }

            const currentTime = Math.floor(playerInstance.domRef.player.currentTime);
            if (playerInstance.vastOptions.duration !== 0) {
                playerInstance.scheduleTrackingEvent(currentTime, playerInstance.vastOptions.duration);
            }

            if (currentTime >= (playerInstance.vastOptions.duration - 1) && playerInstance.vastOptions.duration !== 0) {
                playerInstance.domRef.player.removeEventListener('timeupdate', videoPlayerTimeUpdate);
                playerInstance.adFinished = true;
            }

        };

        playVideoPlayer(adListId);

        playerInstance.domRef.player.addEventListener('timeupdate', videoPlayerTimeUpdate);

    };

    playerInstance.playRoll = (adListId) => {
        // register all the ad pods
        for (let i = 0; i < adListId.length; i++) {
            if (!playerInstance.adPool.hasOwnProperty(adListId[i])) {
                playerInstance.announceLocalError(101);
                return;
            }
            playerInstance.temporaryAdPods.push(playerInstance.adList[adListId[i]]);
        }

        if (playerInstance.vastOptions !== null && playerInstance.vastOptions.adType.toLowerCase() === 'linear') {
            return;
        }

        const adListIdToPlay = playerInstance.getNextAdPod();

        if (adListIdToPlay !== null) {
            playerInstance.renderLinearAd(adListIdToPlay, true);
        }
    };

    playerInstance.backupMainVideoContentTime = (adListId) => {
        const roll = playerInstance.adList[adListId].roll;

        //spec configs by roll
        switch (roll) {
            case 'midRoll':
                playerInstance.domRef.player.mainVideoCurrentTime = playerInstance.domRef.player.currentTime - 1;
                break;

            case 'postRoll':
                playerInstance.domRef.player.mainVideoCurrentTime = playerInstance.mainVideoDuration;
                playerInstance.autoplayAfterAd = false;
                playerInstance.domRef.player.currentTime = playerInstance.mainVideoDuration;
                break;

            case 'preRoll':
                if (playerInstance.domRef.player.currentTime > 0) {
                    playerInstance.domRef.player.mainVideoCurrentTime = playerInstance.domRef.player.currentTime - 1;
                }
                break;
        }
    };

    playerInstance.getSupportedMediaFileObject = (mediaFiles) => {
        let selectedMediaFile = null;
        let adSupportedType = false;
        if (mediaFiles.length) {
            for (let i = 0; i < mediaFiles.length; i++) {

                if (mediaFiles[i].apiFramework !== 'VPAID') {
                    const supportLevel = playerInstance.getMediaFileTypeSupportLevel(mediaFiles[i]['type']);

                    if (supportLevel === 'maybe' || supportLevel === 'probably') {
                        selectedMediaFile = mediaFiles[i];
                        adSupportedType = true;
                    }

                    //one of the best(s) option, no need to seek more
                    if (supportLevel === 'probably') {
                        break;
                    }

                } else {
                    selectedMediaFile = mediaFiles[i];
                    adSupportedType = true;
                    break;
                }
            }
        }

        if (adSupportedType === false) {
            return false;
        }

        return selectedMediaFile;
    };

    /**
     * Reports how likely it is that the current browser will be able to play media of a given MIME type.
     * @return string|null "probably", "maybe", "no" or null
     */
    playerInstance.getMediaFileTypeSupportLevel = (mediaType) => {
        if (null === mediaType) {
            return null;
        }

        const tmpVideo = document.createElement('video');
        let response = tmpVideo.canPlayType(mediaType);

        return !response ? "no" : response;
    };

    playerInstance.scheduleTrackingEvent = (currentTime, duration) => {
        if (currentTime === 0) {
            playerInstance.trackSingleEvent('start');
        }

        if ((typeof playerInstance.vastOptions.tracking['progress'] !== 'undefined') &&
            (playerInstance.vastOptions.tracking['progress'].length) &&
            (typeof playerInstance.vastOptions.tracking['progress'][currentTime] !== 'undefined')) {

            playerInstance.trackSingleEvent('progress', currentTime);
        }

        if (currentTime === (Math.floor(duration / 4))) {
            playerInstance.trackSingleEvent('firstQuartile');
        }

        if (currentTime === (Math.floor(duration / 2))) {
            playerInstance.trackSingleEvent('midpoint');
        }

        if (currentTime === (Math.floor(duration * 3 / 4))) {
            playerInstance.trackSingleEvent('thirdQuartile');
        }

        if (currentTime >= (duration - 1)) {
            playerInstance.trackSingleEvent('complete');
        }
    };


    // ADS
    playerInstance.trackSingleEvent = (eventType, eventSubType) => {
        if (typeof playerInstance.vastOptions === 'undefined' || playerInstance.vastOptions === null) {
            return;
        }

        let trackingUris = [];
        trackingUris.length = 0;

        switch (eventType) {
            case 'start':
            case 'firstQuartile':
            case 'midpoint':
            case 'thirdQuartile':
            case 'complete':
                if (playerInstance.vastOptions.stopTracking[eventType] === false) {
                    if (playerInstance.vastOptions.tracking[eventType] !== null) {
                        trackingUris = playerInstance.vastOptions.tracking[eventType];
                    }

                    playerInstance.vastOptions.stopTracking[eventType] = true;
                }
                break;

            case 'progress':
                playerInstance.vastOptions.tracking['progress'][eventSubType].elements.forEach(function (currentValue, index) {
                    if (
                        (playerInstance.vastOptions.tracking['progress'][eventSubType].stopTracking === false) &&
                        (playerInstance.vastOptions.tracking['progress'][eventSubType].elements.length)
                    ) {
                        trackingUris = playerInstance.vastOptions.tracking['progress'][eventSubType].elements;
                    }

                    playerInstance.vastOptions.tracking['progress'][eventSubType].stopTracking = true;
                });
                break;

            case 'impression':
                if (
                    (typeof playerInstance.vastOptions.impression !== 'undefined') &&
                    (playerInstance.vastOptions.impression !== null) &&
                    (typeof playerInstance.vastOptions.impression.length !== 'undefined')
                ) {
                    trackingUris = playerInstance.vastOptions.impression;
                }
                break;

            default:
                break;
        }

        playerInstance.callUris(trackingUris);
    };

    // ADS
    playerInstance.completeNonLinearStatic = (adListId) => {
        playerInstance.closeNonLinear(adListId);
        if (playerInstance.adFinished === false) {
            playerInstance.adFinished = true;
            playerInstance.trackSingleEvent('complete');
        }
        clearInterval(playerInstance.nonLinearTracking);
    };

    // ADS
    /**
     * Show up a nonLinear static creative
     */
    playerInstance.createNonLinearStatic = (adListId) => {
        if (!playerInstance.adPool.hasOwnProperty(adListId) || playerInstance.adPool[adListId].error === true) {
            playerInstance.announceLocalError(101);
            return;
        }

        //get the proper ad
        playerInstance.vastOptions = playerInstance.adPool[adListId];
        playerInstance.createBoard(adListId);
        if (playerInstance.adList[adListId].error === true) {
            return;
        }
        playerInstance.adFinished = false;
        let duration;
        if (!playerInstance.vastOptions.vpaid) {
            playerInstance.trackSingleEvent('start');
            duration = (playerInstance.adList[adListId].nonLinearDuration) ? playerInstance.adList[adListId].nonLinearDuration : playerInstance.vastOptions.duration;

            playerInstance.nonLinearTracking = setInterval(function () {
                if (playerInstance.adFinished === true) {
                    return;
                }

                const currentTime = Math.floor(playerInstance.domRef.player.currentTime);
                playerInstance.scheduleTrackingEvent(currentTime, duration);
                if (currentTime >= (duration - 1)) {
                    playerInstance.adFinished = true;
                }
            }, 400);
        }

        const time = parseInt(playerInstance.getCurrentTime()) + parseInt(duration);
        playerInstance.scheduleTask({time: time, closeStaticAd: adListId});
    };

    // ADS
    playerInstance.createVpaidNonLinearBoard = (adListId) => {
        // create iframe
        // pass the js

        const vastSettings = playerInstance.adPool[adListId];

        playerInstance.loadVpaidNonlinearAssets = function (adListId) {

            playerInstance.debugMessage('starting function switchPlayerToVpaidMode');

            const vAlign = (playerInstance.adList[adListId].vAlign) ? playerInstance.adList[adListId].vAlign : playerInstance.nonLinearVerticalAlign;
            const showCloseButton = (playerInstance.adList[adListId].vpaidNonLinearCloseButton) ? playerInstance.adList[adListId].vpaidNonLinearCloseButton : playerInstance.vpaidNonLinearCloseButton;
            const vpaidIframe = playerInstance.videoPlayerId + "_" + adListId + "_fluid_vpaid_iframe";
            const creativeData = {};
            creativeData.AdParameters = playerInstance.adPool[adListId].adParameters;
            const slotWrapper = document.createElement('div');
            slotWrapper.id = 'fluid_vpaidNonLinear_' + adListId;
            slotWrapper.className = 'fluid_vpaidNonLinear_' + vAlign;
            slotWrapper.className += ' fluid_vpaidNonLinear_ad';
            slotWrapper.setAttribute('adListId', adListId);

            // Default values in case nothing defined in VAST data or ad settings
            let adWidth = Math.min(468, playerInstance.domRef.player.offsetWidth);
            let adHeight = Math.min(60, Math.floor(playerInstance.domRef.player.offsetHeight / 4));

            if (typeof playerInstance.adList[adListId].size !== 'undefined') {
                const dimensions = playerInstance.adList[adListId].size.split('x');
                adWidth = dimensions[0];
                adHeight = dimensions[1];
            } else if (vastSettings.dimension.width && vastSettings.dimension.height) {
                adWidth = vastSettings.dimension.width;
                adHeight = vastSettings.dimension.height;
            }

            slotWrapper.style.width = '100%';
            slotWrapper.style.height = adHeight + 'px';

            let slotFrame;
            if (showCloseButton) {
                const slotFrame = document.createElement('div');
                slotFrame.className = 'fluid_vpaidNonLinear_frame';
                slotFrame.style.width = adWidth + 'px';
                slotFrame.style.height = adHeight + 'px';
                slotWrapper.appendChild(slotFrame);

                const closeBtn = document.createElement('div');
                closeBtn.id = 'close_button_' + playerInstance.videoPlayerId;
                closeBtn.className = 'close_button';
                closeBtn.innerHTML = '';
                closeBtn.title = playerInstance.displayOptions.layoutControls.closeButtonCaption;
                const tempadListId = adListId;
                closeBtn.onclick = function (event) {

                    playerInstance.hardStopVpaidAd('');

                    if (typeof event.stopImmediatePropagation !== 'undefined') {
                        event.stopImmediatePropagation();
                    }
                    playerInstance.adFinished = true;

                    //if any other onPauseRoll then render it
                    if (playerInstance.adList[tempadListId].roll === 'onPauseRoll' && playerInstance.onPauseRollAdPods[0]) {
                        const getNextOnPauseRollAd = playerInstance.onPauseRollAdPods[0];
                        playerInstance.createBoard(getNextOnPauseRollAd);
                        playerInstance.currentOnPauseRollAd = playerInstance.onPauseRollAdPods[0];
                        delete playerInstance.onPauseRollAdPods[0];
                    }

                    return false;
                };

                slotFrame.appendChild(closeBtn);

            }

            const slotIframe = document.createElement('iframe');
            slotIframe.id = playerInstance.videoPlayerId + "non_linear_vapid_slot_iframe";
            slotIframe.className = 'fluid_vpaid_nonlinear_slot_iframe';
            slotIframe.setAttribute('width', adWidth + 'px');
            slotIframe.setAttribute('height', adHeight + 'px');
            slotIframe.setAttribute('sandbox', 'allow-forms allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts');
            slotIframe.setAttribute('frameborder', '0');
            slotIframe.setAttribute('scrolling', 'no');
            slotIframe.setAttribute('marginwidth', '0');
            slotIframe.setAttribute('marginheight', '0');
            slotWrapper.appendChild(slotIframe);

            playerInstance.domRef.player.parentNode.insertBefore(slotWrapper, vpaidIframe.nextSibling);

            const slotElement = slotIframe.contentWindow.document.createElement('div');

            slotIframe.contentWindow.document.body.appendChild(slotElement);

            playerInstance.vastOptions.slotIframe = slotIframe;
            playerInstance.vastOptions.slotFrame = slotFrame;

            const environmentVars = {
                slot: slotElement,
                videoSlot: playerInstance.domRef.player,
                videoSlotCanAutoPlay: true
            };

            playerInstance.debugMessage(playerInstance.adList[adListId]);

            // calls this functions after ad unit is loaded in iframe
            const ver = playerInstance.vpaidAdUnit.handshakeVersion(VPAID_VERSION);
            const compare = playerInstance.compareVersion(VPAID_VERSION, ver);
            if (compare === 1) {
                //VPAID version of ad is lower than we need
                playerInstance.adList[adListId].error = true;
                playerInstance.playMainVideoWhenVpaidFails(403);
                return false;
            }

            playerInstance.domRef.player.loop = false;
            playerInstance.domRef.player.removeAttribute('controls'); //Remove the default Controls

            playerInstance.vpaidCallbackListenersAttach();
            const mode = (playerInstance.fullscreenMode ? 'fullscreen' : 'normal');
            playerInstance.vpaidAdUnit.initAd(adWidth, adHeight, mode, 3000, creativeData, environmentVars);

            playerInstance.toggleLoader(false);
            playerInstance.adList[adListId].played = true;
            playerInstance.adFinished = false;
        };

        playerInstance.loadVpaid(adListId, vastSettings.staticResource);

        playerInstance.debugMessage('create non linear vpaid');
    };

    // ADS
    playerInstance.createNonLinearBoard = (adListId) => {
        const vastSettings = playerInstance.adPool[adListId];

        playerInstance.adList[adListId].played = true;
        const playerWidth = playerInstance.domRef.player.clientWidth;
        const playerHeight = playerInstance.domRef.player.clientHeight;
        const board = document.createElement('div');
        const vAlign = (playerInstance.adList[adListId].vAlign) ? playerInstance.adList[adListId].vAlign : playerInstance.nonLinearVerticalAlign;

        const creative = new Image();
        creative.src = vastSettings.staticResource;
        creative.id = 'fluid_nonLinear_imgCreative_' + adListId + '_' + playerInstance.videoPlayerId;

        creative.onerror = function () {
            playerInstance.adList[adListId].error = true;
            playerInstance.announceError(500);
        };

        creative.onload = function () {
            let origWidth;
            let origHeight;
            let newBannerWidth;
            let newBannerHeight;

            //Set banner size based on the below priority
            // 1. adList -> roll -> size
            // 2. VAST XML width/height attriubute (VAST 3.)
            // 3. VAST XML static resource dimension
            if (typeof playerInstance.adList[adListId].size !== 'undefined') {
                origWidth = playerInstance.adList[adListId].size.split('x')[0];
                origHeight = playerInstance.adList[adListId].size.split('x')[1];
            } else if (vastSettings.dimension.width && vastSettings.dimension.height) {
                origWidth = vastSettings.dimension.width;
                origHeight = vastSettings.dimension.height;
            } else {
                origWidth = creative.width;
                origHeight = creative.height;
            }

            if (origWidth > playerWidth) {
                newBannerWidth = playerWidth - 5;
                newBannerHeight = origHeight * newBannerWidth / origWidth;
            } else {
                newBannerWidth = origWidth;
                newBannerHeight = origHeight;
            }

            if (playerInstance.adList[adListId].roll !== 'onPauseRoll') {
                //Show the board only if media loaded
                document.getElementById('fluid_nonLinear_' + adListId).style.display = '';
            }

            const img = document.getElementById(creative.id);
            img.width = newBannerWidth;
            img.height = newBannerHeight;

            playerInstance.trackSingleEvent('impression');
        };

        board.id = 'fluid_nonLinear_' + adListId;
        board.className = 'fluid_nonLinear_' + vAlign;
        board.className += ' fluid_nonLinear_ad';
        board.innerHTML = creative.outerHTML;
        board.style.display = 'none';

        //Bind the Onclick event
        board.onclick = function () {
            if (typeof vastSettings.clickthroughUrl !== 'undefined') {
                window.open(vastSettings.clickthroughUrl);
            }

            //Tracking the NonLinearClickTracking events
            if (typeof vastSettings.clicktracking !== 'undefined') {
                playerInstance.callUris([vastSettings.clicktracking]);
            }
        };

        if (typeof vastSettings.clickthroughUrl !== 'undefined') {
            board.style.cursor = 'pointer';
        }

        const closeBtn = document.createElement('div');
        closeBtn.id = 'close_button_' + playerInstance.videoPlayerId;
        closeBtn.className = 'close_button';
        closeBtn.innerHTML = '';
        closeBtn.title = playerInstance.displayOptions.layoutControls.closeButtonCaption;
        const tempadListId = adListId;
        closeBtn.onclick = function (event) {
            this.parentElement.remove();
            if (typeof event.stopImmediatePropagation !== 'undefined') {
                event.stopImmediatePropagation();
            }
            playerInstance.adFinished = true;
            clearInterval(playerInstance.nonLinearTracking);

            //if any other onPauseRoll then render it
            if (playerInstance.adList[tempadListId].roll === 'onPauseRoll' && playerInstance.onPauseRollAdPods[0]) {
                const getNextOnPauseRollAd = playerInstance.onPauseRollAdPods[0];
                playerInstance.createBoard(getNextOnPauseRollAd);
                playerInstance.currentOnPauseRollAd = playerInstance.onPauseRollAdPods[0];
                delete playerInstance.onPauseRollAdPods[0];
            }

            return false;
        };

        board.appendChild(closeBtn);
        playerInstance.domRef.player.parentNode.insertBefore(board, playerInstance.domRef.player.nextSibling);
    };

    // ADS
    /**
     * Adds a nonLinear static Image banner
     *
     * currently only image/gif, image/jpeg, image/png supported
     */
    playerInstance.createBoard = (adListId) => {
        const vastSettings = playerInstance.adPool[adListId];

        // create nonLinear Vpaid
        // create nonLinear regular
        if (vastSettings.vpaid) {
            playerInstance.hardStopVpaidAd('');
            playerInstance.createVpaidNonLinearBoard(adListId);

        } else {

            if (typeof vastSettings.staticResource === 'undefined'
                || playerInstance.supportedStaticTypes.indexOf(vastSettings.creativeType) === -1) {
                //Couldn’t find NonLinear resource with supported type.
                playerInstance.adList[adListId].error = true;
                if (!playerInstance.vastOptions || typeof playerInstance.vastOptions.errorUrl === 'undefined') {
                    playerInstance.announceLocalError(503);
                } else {
                    playerInstance.announceError(503);
                }
                return;
            }

            playerInstance.createNonLinearBoard(adListId);

        }

    };

    playerInstance.closeNonLinear = (adListId) => {
        const element = document.getElementById('fluid_nonLinear_' + adListId);
        if (element) {
            element.remove();
        }
    };

    playerInstance.rollGroupContainsLinear = (groupedRolls) => {
        let found = false;
        for (let i = 0; i < groupedRolls.length; i++) {
            if (playerInstance.adList[groupedRolls[i].id].adType && playerInstance.adList[groupedRolls[i].id].adType === 'linear') {
                found = true;
                break;
            }
        }
        return found;
    };
    playerInstance.rollGroupContainsNonlinear = (groupedRolls) => {
        let found = false;
        for (let i = 0; i < groupedRolls.length; i++) {
            if (playerInstance.adList[groupedRolls[i].id].adType.toLowerCase() === 'nonlinear') {
                found = true;
                break;
            }
        }
        return found;
    };

    playerInstance.preRollFail = () => {
        const preRollsLength = playerInstance.preRollAdPodsLength;

        playerInstance.preRollVastResolved++;

        if (playerInstance.preRollVastResolved === preRollsLength) {
            playerInstance.preRollAdsPlay();
        }
    };

    playerInstance.preRollSuccess = () => {
        const preRollsLength = playerInstance.preRollAdPodsLength;

        playerInstance.preRollVastResolved++;

        if (playerInstance.preRollVastResolved === preRollsLength) {
            playerInstance.preRollAdsPlay();
        }
    };

    playerInstance.preRollAdsPlay = () => {
        const time = 0;
        const adListIds = playerInstance.preRollAdPods;
        const adsByType = {
            linear: [],
            nonLinear: []
        };

        playerInstance.firstPlayLaunched = true;

        for (let index = 0; index < adListIds.length; index++) {

            if (playerInstance.adList[adListIds[index]].played === true) {
                return
            }

            if (playerInstance.adList[adListIds[index]].adType === 'linear') {
                adsByType.linear.push(adListIds[index]);
            }

            if (playerInstance.adList[adListIds[index]].adType === 'nonLinear') {
                adsByType.nonLinear.push(adListIds[index]);
                playerInstance.scheduleTask({time: time, playRoll: 'midRoll', adListId: adsByType.nonLinear.shift()});
            }
        }

        if (adsByType.linear.length > 0) {
            playerInstance.toggleLoader(true);
            playerInstance.playRoll(adsByType.linear);
        } else {
            playerInstance.playMainVideoWhenVastFails(900);
        }

    };

    playerInstance.preRoll = (event) => {
        const vastObj = event.vastObj;
        playerInstance.domRef.player.removeEventListener(event.type, playerInstance.preRoll);

        const adListId = [];
        adListId[0] = event.type.replace('adId_', '');
        const time = 0;

        if (playerInstance.adList[adListId[0]].played === true) {
            return;
        }

        playerInstance.preRollAdPods.push(adListId[0]);

        playerInstance.preRollSuccess(vastObj);
    };

    playerInstance.createAdMarker = (adListId, time) => {
        const markersHolder = document.getElementById(playerInstance.videoPlayerId + '_ad_markers_holder');
        const adMarker = document.createElement('div');
        adMarker.id = 'ad_marker_' + playerInstance.videoPlayerId + "_" + adListId;
        adMarker.className = 'fluid_controls_ad_marker';
        adMarker.style.left = (time / playerInstance.mainVideoDuration * 100) + '%';
        if (playerInstance.isCurrentlyPlayingAd) {
            adMarker.style.display = 'none';
        }
        markersHolder.appendChild(adMarker);
    };

    playerInstance.hideAdMarker = (adListId) => {
        const element = document.getElementById('ad_marker_' + playerInstance.videoPlayerId + "_" + adListId);
        if (element) {
            element.style.display = 'none';
        }
    };

    playerInstance.showAdMarkers = () => {
        const markersHolder = document.getElementById(playerInstance.videoPlayerId + '_ad_markers_holder');
        const adMarkers = markersHolder.getElementsByClassName('fluid_controls_ad_marker');
        const idPrefix = 'ad_marker_' + playerInstance.videoPlayerId + "_";
        for (let i = 0; i < adMarkers.length; ++i) {
            const item = adMarkers[i];
            const adListId = item.id.replace(idPrefix, '');
            if (playerInstance.adList[adListId].played === false) {
                item.style.display = '';
            }
        }
    };

    playerInstance.hideAdMarkers = () => {
        const markersHolder = document.getElementById(playerInstance.videoPlayerId + '_ad_markers_holder');
        const adMarkers = markersHolder.getElementsByClassName('fluid_controls_ad_marker');
        for (let i = 0; i < adMarkers.length; ++i) {
            const item = adMarkers[i];
            item.style.display = 'none';
        }
    };

    playerInstance.midRoll = (event) => {
        playerInstance.domRef.player.removeEventListener(event.type, playerInstance.midRoll);

        const adListId = event.type.replace('adId_', '');
        if (playerInstance.adList[adListId].played === true) {
            return;
        }

        let time = playerInstance.adList[adListId].timer;

        if (typeof time == 'string' && time.indexOf("%") !== -1) {
            time = time.replace('%', '');
            time = Math.floor(playerInstance.mainVideoDuration / 100 * time);
        }

        if (playerInstance.displayOptions.vastOptions.showProgressbarMarkers &&
            playerInstance.adList[adListId].adType === "nonLinear") {
            playerInstance.createAdMarker(adListId, time);
        }

        playerInstance.scheduleTask({time: time, playRoll: 'midRoll', adListId: adListId});
    };

    playerInstance.postRoll = (event) => {
        playerInstance.domRef.player.removeEventListener(event.type, playerInstance.postRoll);
        const adListId = event.type.replace('adId_', '');
        playerInstance.scheduleTask({
            time: Math.floor(playerInstance.mainVideoDuration),
            playRoll: 'postRoll',
            adListId: adListId
        });
    };

    playerInstance.onPauseRoll = (event) => {
        playerInstance.domRef.player.removeEventListener(event.type, playerInstance.onPauseRoll);
        const adListId = event.type.replace('adId_', '');

        if (playerInstance.adList[adListId].adType === 'nonLinear') {
            if (!playerInstance.adPool.hasOwnProperty(adListId) || playerInstance.adPool[adListId].error === true) {
                playerInstance.announceLocalError(101);
                return;
            }

            //var playerWrapper = document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId);
            const nonLinearAdExists = document.getElementsByClassName('fluid_nonLinear_ad')[0];
            if (!nonLinearAdExists) {
                playerInstance.createBoard(adListId);
                playerInstance.currentOnPauseRollAd = adListId;
                let onPauseAd = document.getElementById('fluid_nonLinear_' + adListId);
                if (onPauseAd) {
                    onPauseAd.style.display = 'none';
                }
            } else {
                playerInstance.onPauseRollAdPods.push(adListId);
            }

        }
    };

    /**
     * Check if player has a valid nonLinear onPause Ad
     */
    playerInstance.hasValidOnPauseAd = () => {
        // TODO should be only one. Add validator to allow only one onPause roll
        const onPauseAd = playerInstance.findRoll('onPauseRoll');

        return (onPauseAd.length !== 0 && playerInstance.adList[onPauseAd[0]] && playerInstance.adList[onPauseAd[0]].error === false);
    };

    /**
     * Hide/show nonLinear onPause Ad
     */
    playerInstance.toggleOnPauseAd = () => {
        if (playerInstance.hasValidOnPauseAd() && !playerInstance.isCurrentlyPlayingAd) {
            const onPauseRoll = playerInstance.findRoll('onPauseRoll');
            let adListId;
            if (playerInstance.currentOnPauseRollAd !== '') {
                adListId = playerInstance.currentOnPauseRollAd;
            } else {
                adListId = onPauseRoll[0];
            }

            playerInstance.vastOptions = playerInstance.adPool[adListId];
            const onPauseAd = document.getElementById('fluid_nonLinear_' + adListId);

            if (onPauseAd && playerInstance.domRef.player.paused) {
                setTimeout(function () {
                    onPauseAd.style.display = 'flex';
                    playerInstance.adList[adListId].played = false;
                    playerInstance.trackingOnPauseNonLinearAd(adListId, 'start');
                }, 500);
            } else if (onPauseAd && !playerInstance.domRef.player.paused) {
                onPauseAd.style.display = 'none';
                playerInstance.adFinished = true;
                playerInstance.trackingOnPauseNonLinearAd(adListId, 'complete');
            }
        }
    };

    /**
     * Helper function for tracking onPause Ads
     */
    playerInstance.trackingOnPauseNonLinearAd = (adListId, status) => {
        if (!playerInstance.adPool.hasOwnProperty(adListId) || playerInstance.adPool[adListId].error === true) {
            playerInstance.announceLocalError(101);
            return;
        }

        playerInstance.vastOptions = playerInstance.adPool[adListId];
        playerInstance.trackSingleEvent(status);
    };

    playerInstance.getLinearAdsFromKeyTime = (keyTimeLinearObj) => {
        const adListIds = [];

        for (let i = 0; i < keyTimeLinearObj.length; i++) {
            if (playerInstance.adList[keyTimeLinearObj[i].adListId].played === false) {
                adListIds.push(keyTimeLinearObj[i].adListId);
            }
        }

        return adListIds;
    };

    playerInstance.adKeytimePlay = (keyTime) => {
        if (!playerInstance.timerPool[keyTime] || playerInstance.isCurrentlyPlayingAd) {
            return;
        }

        const timerPoolKeytimeCloseStaticAdsLength = playerInstance.timerPool[keyTime]['closeStaticAd'].length;
        const timerPoolKeytimeLinearAdsLength = playerInstance.timerPool[keyTime]['linear'].length;
        const timerPoolKeytimeNonlinearAdsLength = playerInstance.timerPool[keyTime]['nonLinear'].length;

        // remove the item from keytime if no ads to play
        if (timerPoolKeytimeCloseStaticAdsLength === 0 && timerPoolKeytimeLinearAdsLength === 0 && timerPoolKeytimeNonlinearAdsLength === 0) {
            delete playerInstance.timerPool[keyTime];
            return;
        }

        // Task: close nonLinear ads
        if (timerPoolKeytimeCloseStaticAdsLength > 0) {
            for (let index = 0; index < timerPoolKeytimeCloseStaticAdsLength; index++) {
                const adListId = playerInstance.timerPool[keyTime]['closeStaticAd'][index].closeStaticAd;
                if (playerInstance.adList[adListId].played === true) {
                    playerInstance.completeNonLinearStatic(adListId);
                }
            }

            // empty closeStaticAd from the timerpool after closing
            playerInstance.timerPool[keyTime]['closeStaticAd'] = [];
        }

        // Task: play linear ads
        if (timerPoolKeytimeLinearAdsLength > 0) {
            const adListIds = playerInstance.getLinearAdsFromKeyTime(playerInstance.timerPool[keyTime]['linear']);
            if (adListIds.length > 0) {
                playerInstance.playRoll(adListIds);

                // empty the linear ads from the timerpool after played
                playerInstance.timerPool[keyTime]['linear'] = [];

                // return after starting video ad, so non-linear will not overlap
                return;
            }
        }

        // Task: play nonLinear ads
        if (timerPoolKeytimeNonlinearAdsLength > 0) {
            for (let index = 0; index < timerPoolKeytimeNonlinearAdsLength; index++) {
                const adListId = playerInstance.timerPool[keyTime]['nonLinear'][index].adListId;
                const vastOptions = playerInstance.adPool[adListId];

                // we are not supporting nonLinear ads in cardBoard mode
                if (playerInstance.adList[adListId].played === false && !playerInstance.displayOptions.layoutControls.showCardBoardView) {
                    playerInstance.createNonLinearStatic(adListId);
                    if (playerInstance.displayOptions.vastOptions.showProgressbarMarkers) {
                        playerInstance.hideAdMarker(adListId);
                    }

                    // delete nonLinear after playing
                    playerInstance.timerPool[keyTime]['nonLinear'].splice(index, 1);

                    // return after starting non-linear ad, so multiple non-linear will not overlap
                    // unplayed non-linear will appear if user seeks back to the time :)
                    return;
                }
            }
        }

    };

    playerInstance.adTimer = () => {
        if (!!playerInstance.isTimer) {
            return;
        }

        playerInstance.isTimer = !playerInstance.isTimer;

        playerInstance.timer = setInterval(
            function () {
                const keyTime = Math.floor(playerInstance.getCurrentTime());
                playerInstance.adKeytimePlay(keyTime)
            }, 800);
    };

    // ADS
    playerInstance.scheduleTask = (task) => {
        if (!playerInstance.timerPool.hasOwnProperty(task.time)) {
            playerInstance.timerPool[task.time] = {linear: [], nonLinear: [], closeStaticAd: []};
        }

        if (task.hasOwnProperty('playRoll') && playerInstance.adList[task.adListId].adType === 'linear') {
            playerInstance.timerPool[task.time]['linear'].push(task);
        } else if (task.hasOwnProperty('playRoll') && playerInstance.adList[task.adListId].adType === 'nonLinear') {
            playerInstance.timerPool[task.time]['nonLinear'].push(task);
        } else if (task.hasOwnProperty('closeStaticAd')) {
            playerInstance.timerPool[task.time]['closeStaticAd'].push(task);
        }

    };

    // ADS
    playerInstance.switchToMainVideo = () => {
        playerInstance.debugMessage('starting main video');

        playerInstance.domRef.player.src = playerInstance.originalSrc;

        playerInstance.initialiseStreamers();

        const newCurrentTime = (typeof playerInstance.domRef.player.mainVideoCurrentTime !== 'undefined')
            ? playerInstance.domRef.player.mainVideoCurrentTime : 0;

        if (playerInstance.domRef.player.hasOwnProperty('currentTime')) {
            playerInstance.domRef.player.currentTime = newCurrentTime;
        }

        if (playerInstance.displayOptions.layoutControls.loop) {
            playerInstance.domRef.player.loop = true;
        }

        playerInstance.setCurrentTimeAndPlay(newCurrentTime, playerInstance.autoplayAfterAd);

        playerInstance.isCurrentlyPlayingAd = false;

        playerInstance.deleteVastAdElements();

        playerInstance.adFinished = true;
        playerInstance.displayOptions.vastOptions.vastAdvanced.vastVideoEndedCallback();
        playerInstance.vastOptions = null;

        playerInstance.setBuffering();
        const progressbarContainer = document.getElementById(playerInstance.videoPlayerId + '_fluid_controls_progress_container');

        if (progressbarContainer !== null) {
            const backgroundColor = (playerInstance.displayOptions.layoutControls.primaryColor) ? playerInstance.displayOptions.layoutControls.primaryColor : "white";

            const currentProgressBar = playerInstance.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');

            for (let i = 0; i < currentProgressBar.length; i++) {
                currentProgressBar[i].style.backgroundColor = backgroundColor;
            }
        }

        playerInstance.domRef.player.removeEventListener('ended', playerInstance.onVastAdEnded);

        if (playerInstance.displayOptions.vastOptions.showProgressbarMarkers) {
            playerInstance.showAdMarkers();
        }

        if (playerInstance.hasTitle()) {
            const title = document.getElementById(playerInstance.videoPlayerId + '_title');
            title.style.display = 'inline';
        }
    };

    // ADS
    playerInstance.getNextAdPod = () => {
        const getFirstUnPlayedAd = false;
        let adListId = null;

        // if temporaryAdPods is not empty
        if (playerInstance.temporaryAdPods.length > 0) {
            const temporaryAdPods = playerInstance.temporaryAdPods.shift();
            adListId = temporaryAdPods.id;
        }

        return adListId;
    };

    // ADS
    playerInstance.checkForNextAd = () => {
        const availableNextAdID = playerInstance.getNextAdPod();
        if (availableNextAdID === null) {
            playerInstance.switchToMainVideo();
            playerInstance.vastOptions = null;
            playerInstance.adFinished = true;
        } else {
            playerInstance.domRef.player.removeEventListener('ended', playerInstance.onVastAdEnded);
            playerInstance.isCurrentlyPlayingAd = false;
            playerInstance.vastOptions = null;
            playerInstance.adFinished = true;
            playerInstance.renderLinearAd(availableNextAdID, false); // passing false so it doesn't backup the Ad playbacktime as video playback time
        }
    };


    /**
     * Adds a Skip Button
     */
    playerInstance.addSkipButton = () => {
        // TODO: ahh yes, the DIVbutton...
        const divSkipButton = document.createElement('div');
        divSkipButton.id = 'skip_button_' + playerInstance.videoPlayerId;
        divSkipButton.className = 'skip_button skip_button_disabled';
        divSkipButton.innerHTML = playerInstance.displayOptions.vastOptions.skipButtonCaption.replace('[seconds]', playerInstance.vastOptions.skipoffset);

        document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId).appendChild(divSkipButton);

        playerInstance.domRef.player.addEventListener('timeupdate', playerInstance.decreaseSkipOffset, false);
    };

    /**
     * Ad Countdown
     */
    playerInstance.addAdCountdown = () => {
        const videoWrapper = document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId);
        const divAdCountdown = document.createElement('div');

        // Create element
        const adCountdown = playerInstance.pad(parseInt(playerInstance.currentVideoDuration / 60)) + ':' + playerInstance.pad(parseInt(playerInstance.currentVideoDuration % 60));
        const durationText = parseInt(adCountdown);
        divAdCountdown.id = 'ad_countdown' + playerInstance.videoPlayerId;
        divAdCountdown.className = 'ad_countdown';
        divAdCountdown.innerHTML = "<span class='ad_timer_prefix'>Ad - </span>" + durationText;

        videoWrapper.appendChild(divAdCountdown);

        playerInstance.domRef.player.addEventListener('timeupdate', playerInstance.decreaseAdCountdown, false);
        videoWrapper.addEventListener('mouseover', function () {
            divAdCountdown.style.display = 'none';
        }, false);
    };

    playerInstance.decreaseAdCountdown = function decreaseAdCountdown() {
        const sec = parseInt(playerInstance.currentVideoDuration) - parseInt(playerInstance.domRef.player.currentTime);
        const btn = document.getElementById('ad_countdown' + playerInstance.videoPlayerId);

        if (btn) {
            btn.innerHTML = "<span class='ad_timer_prefix'>Ad - </span> " + playerInstance.pad(parseInt(sec / 60)) + ':' + playerInstance.pad(parseInt(sec % 60));
        } else {
            playerInstance.domRef.player.removeEventListener('timeupdate', playerInstance.decreaseAdCountdown);
        }
    };

    playerInstance.removeAdCountdown = () => {
        const btn = document.getElementById('ad_countdown' + playerInstance.videoPlayerId);
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    };

    playerInstance.toggleAdCountdown = (showing) => {
        const btn = document.getElementById('ad_countdown' + playerInstance.videoPlayerId);
        if (btn) {
            if (showing) {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'none';
            }
        }
    };

    playerInstance.addAdPlayingText = (textToShow) => {
        const adPlayingDiv = document.createElement('div');
        adPlayingDiv.id = playerInstance.videoPlayerId + '_fluid_ad_playing';

        if (playerInstance.displayOptions.layoutControls.primaryColor) {
            adPlayingDiv.style.backgroundColor = playerInstance.displayOptions.layoutControls.primaryColor;
            adPlayingDiv.style.opacity = 1;
        }

        adPlayingDiv.className = 'fluid_ad_playing';
        adPlayingDiv.innerText = textToShow;

        document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId).appendChild(adPlayingDiv);
    };

    playerInstance.positionTextElements = (adListData) => {
        const allowedPosition = ['top left', 'top right', 'bottom left', 'bottom right'];

        const skipButton = document.getElementById('skip_button_' + playerInstance.videoPlayerId);
        const adPlayingDiv = document.getElementById(playerInstance.videoPlayerId + '_fluid_ad_playing');
        const ctaButton = document.getElementById(playerInstance.videoPlayerId + '_fluid_cta');

        let ctaButtonHeightWithSpacing = 0;
        let adPlayingDivHeightWithSpacing = 0;
        const pixelSpacing = 8;
        let isBottom = false;
        let skipButtonHeightWithSpacing = 0;
        let positionsCTA = [];

        const defaultPositions = {
            top: {
                left: {h: 34, v: 34},
                right: {h: 0, v: 34}
            },
            bottom: {
                left: {h: 34, v: 50},
                right: {h: 0, v: 50}
            }
        };

        if (skipButton !== null) {
            skipButtonHeightWithSpacing = skipButton.offsetHeight + pixelSpacing;

            const wrapperElement = playerInstance.domRef.wrapper;

            if (wrapperElement.classList.contains('mobile')) {
                defaultPositions.bottom.left.v = 75;
                defaultPositions.bottom.right.v = 75;
            }
        }

        let CTATextPosition;
        if (ctaButton !== null) {
            CTATextPosition = playerInstance.displayOptions.vastOptions.adCTATextPosition.toLowerCase();

            if (allowedPosition.indexOf(CTATextPosition) === -1) {
                console.log('[FP Error] Invalid position for CTAText. Reverting to "bottom right"');
                CTATextPosition = 'bottom right';
            }

            positionsCTA = CTATextPosition.split(' ');

            isBottom = positionsCTA[0] === 'bottom';

            ctaButton.style[positionsCTA[0]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + 'px';
            ctaButton.style[positionsCTA[1]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].h + 'px';

            if (isBottom && positionsCTA[1] === 'right') {
                ctaButton.style[positionsCTA[0]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + skipButtonHeightWithSpacing + 'px';
            }

            ctaButtonHeightWithSpacing = ctaButton.offsetHeight + pixelSpacing + 'px';
        }

        let adPlayingDivPosition;
        let positionsAdText;
        if (adPlayingDiv !== null) {
            adPlayingDivPosition = (adListData.adTextPosition !== null) ? adListData.adTextPosition.toLowerCase() : playerInstance.displayOptions.vastOptions.adTextPosition.toLowerCase();

            if (allowedPosition.indexOf(adPlayingDivPosition) === -1) {
                console.log('[FP Error] Invalid position for adText. Reverting to "top left"');
                adPlayingDivPosition = 'top left';
            }

            positionsAdText = adPlayingDivPosition.split(' ');
            adPlayingDiv.style[positionsAdText[0]] = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + 'px';
            adPlayingDiv.style[positionsAdText[1]] = defaultPositions[positionsAdText[0]][positionsAdText[1]].h + 'px';
            adPlayingDivHeightWithSpacing = adPlayingDiv.offsetHeight + pixelSpacing + 'px';
        }

        if (ctaButtonHeightWithSpacing > 0 && adPlayingDivHeightWithSpacing > 0 && CTATextPosition === adPlayingDivPosition) {
            if (isBottom) {
                if (positionsCTA[1] === 'right') {
                    adPlayingDiv.style.bottom = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + skipButtonHeightWithSpacing + ctaButtonHeightWithSpacing + 'px';
                } else {
                    adPlayingDiv.style.bottom = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + ctaButtonHeightWithSpacing + 'px';
                }
            } else {
                ctaButton.style.top = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + adPlayingDivHeightWithSpacing + 'px';
            }
        }
    };

    playerInstance.removeAdPlayingText = () => {
        const div = document.getElementById(playerInstance.videoPlayerId + '_fluid_ad_playing');
        if (!div) {
            return;
        }
        div.parentElement.removeChild(div);
    };

    playerInstance.addCTAButton = (landingPage) => {
        if (!landingPage) {
            return;
        }

        const ctaButton = document.createElement('div');
        ctaButton.id = playerInstance.videoPlayerId + '_fluid_cta';
        ctaButton.className = 'fluid_ad_cta';

        const link = document.createElement('span');
        link.innerHTML = playerInstance.displayOptions.vastOptions.adCTAText + "<br/><span class=\"add_icon_clickthrough\">" + landingPage + "</span>";

        ctaButton.addEventListener('click', () => {
            if (!playerInstance.domRef.player.paused) {
                playerInstance.domRef.player.pause();
            }

            const win = window.open(playerInstance.vastOptions.clickthroughUrl, '_blank');
            win.focus();
            return true;
        }, false);

        ctaButton.appendChild(link);

        document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId).appendChild(ctaButton);
    };

    playerInstance.removeCTAButton = () => {
        const btn = document.getElementById(playerInstance.videoPlayerId + '_fluid_cta');
        if (!btn) {
            return;
        }

        btn.parentElement.removeChild(btn);
    };

    playerInstance.decreaseSkipOffset = () => {
        let sec = playerInstance.vastOptions.skipoffset - Math.floor(playerInstance.domRef.player.currentTime);
        const btn = document.getElementById('skip_button_' + playerInstance.videoPlayerId);

        if (!btn) {
            playerInstance.domRef.player.removeEventListener('timeupdate', playerInstance.decreaseSkipOffset);
            return;
        }

        if (sec >= 1) {
            //set the button label with the remaining seconds
            btn.innerHTML = playerInstance.displayOptions.vastOptions.skipButtonCaption.replace('[seconds]', sec);
            return;
        }

        // TODO: refactored, but this is still terrible - remove all this and just make the button clickable...
        const skipLink = document.createElement('a');
        skipLink.href = '#';
        skipLink.id = 'skipHref_' + playerInstance.videoPlayerId;
        skipLink.innerHTML = playerInstance.displayOptions.vastOptions.skipButtonClickCaption;
        skipLink.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            playerInstance.pressSkipButton();
        };

        btn.innerHTML = '';
        btn.appendChild(skipLink);

        //removes the CSS class for a disabled button
        btn.className = btn.className.replace(/\bskip_button_disabled\b/, '');

        playerInstance.domRef.player.removeEventListener('timeupdate', playerInstance.decreaseSkipOffset);
    };

    playerInstance.pressSkipButton = () => {
        playerInstance.removeSkipButton();
        playerInstance.removeAdPlayingText();
        playerInstance.removeCTAButton();

        if (playerInstance.vastOptions.vpaid) {
            // skip the linear vpaid ad
            playerInstance.skipVpaidAd();
            return;
        }

        // skip the regular linear vast
        playerInstance.displayOptions.vastOptions.vastAdvanced.vastVideoSkippedCallback();
        const event = document.createEvent('Event');
        event.initEvent('ended', false, true);
        playerInstance.domRef.player.dispatchEvent(event);
    };

    playerInstance.removeSkipButton = () => {
        const btn = document.getElementById('skip_button_' + playerInstance.videoPlayerId);
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    };

    /**
     * Makes the player open the ad URL on clicking
     */
    playerInstance.addClickthroughLayer = () => {
        const divWrapper = playerInstance.domRef.wrapper;

        const divClickThrough = document.createElement('div');
        divClickThrough.className = 'vast_clickthrough_layer';
        divClickThrough.id = 'vast_clickthrough_layer_' + playerInstance.videoPlayerId;
        divClickThrough.setAttribute(
            'style',
            'position: absolute; cursor: pointer; top: 0; left: 0; width: ' +
            playerInstance.domRef.player.offsetWidth + 'px; height: ' +
            (playerInstance.domRef.player.offsetHeight) + 'px;'
        );

        divWrapper.appendChild(divClickThrough);

        //Bind the Onclick event
        const openClickthrough = function () {
            window.open(playerInstance.vastOptions.clickthroughUrl);

            //Tracking the Clickthorugh events
            if (typeof playerInstance.vastOptions.clicktracking !== 'undefined') {
                playerInstance.callUris(playerInstance.vastOptions.clicktracking);
            }
        };

        const clickthroughLayer = document.getElementById('vast_clickthrough_layer_' + playerInstance.videoPlayerId);
        const isIos9orLower = (playerInstance.mobileInfo.device === 'iPhone') && (playerInstance.mobileInfo.userOsMajor !== false) && (playerInstance.mobileInfo.userOsMajor <= 9);

        clickthroughLayer.onclick = () => {
            if (playerInstance.domRef.player.paused) {
                //On Mobile Safari on iPhones with iOS 9 or lower open the clickthrough only once
                if (isIos9orLower && !playerInstance.suppressClickthrough) {
                    openClickthrough();
                    playerInstance.suppressClickthrough = true;

                } else {
                    playerInstance.domRef.player.play();
                }

            } else {
                openClickthrough();
                playerInstance.domRef.player.pause();
            }
        };
    };

    /**
     * Remove the Clickthrough layer
     */
    playerInstance.removeClickthrough = () => {
        const clickthroughLayer = document.getElementById('vast_clickthrough_layer_' + playerInstance.videoPlayerId);

        if (clickthroughLayer) {
            clickthroughLayer.parentNode.removeChild(clickthroughLayer);
        }
    };
}
