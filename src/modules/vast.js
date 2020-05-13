// VAST support module
'use strict';
export default function (playerInstance, options) {
    playerInstance.getClickThroughUrlFromLinear = (linear) => {
        const videoClicks = linear.getElementsByTagName('VideoClicks');

        if (videoClicks.length) { //There should be exactly 1 node
            const clickThroughs = videoClicks[0].getElementsByTagName('ClickThrough');

            if (clickThroughs.length) {
                return playerInstance.extractNodeData(clickThroughs[0]);
            }
        }

        return false;
    };

    playerInstance.getVastAdTagUriFromWrapper = (xmlResponse) => {
        const wrapper = xmlResponse.getElementsByTagName('Wrapper');

        if (typeof wrapper !== 'undefined' && wrapper.length) {
            const vastAdTagURI = wrapper[0].getElementsByTagName('VASTAdTagURI');

            if (vastAdTagURI.length) {
                return playerInstance.extractNodeData(vastAdTagURI[0]);
            }
        }

        return false;
    };

    playerInstance.hasInLine = (xmlResponse) => {
        const inLine = xmlResponse.getElementsByTagName('InLine');
        return ((typeof inLine !== 'undefined') && inLine.length);
    };

    playerInstance.hasVastAdTagUri = (xmlResponse) => {
        const vastAdTagURI = xmlResponse.getElementsByTagName('VASTAdTagURI');
        return ((typeof vastAdTagURI !== 'undefined') && vastAdTagURI.length);
    };

    playerInstance.getClickThroughUrlFromNonLinear = (nonLinear) => {
        let result = '';
        const nonLinears = nonLinear.getElementsByTagName('NonLinear');

        if (nonLinears.length) {//There should be exactly 1 node
            const nonLinearClickThrough = nonLinear.getElementsByTagName('NonLinearClickThrough');
            if (nonLinearClickThrough.length) {
                result = playerInstance.extractNodeData(nonLinearClickThrough[0]);
            }
        }

        return result;
    };

    playerInstance.getTrackingFromLinear = (linear) => {
        const trackingEvents = linear.getElementsByTagName('TrackingEvents');

        if (trackingEvents.length) {//There should be no more than one node
            return trackingEvents[0].getElementsByTagName('Tracking');
        }

        return [];
    };

    playerInstance.getDurationFromLinear = (linear) => {
        const duration = linear.getElementsByTagName('Duration');

        if (duration.length && (typeof duration[0].childNodes[0] !== 'undefined')) {
            const nodeDuration = playerInstance.extractNodeData(duration[0]);
            return playerInstance.convertTimeStringToSeconds(nodeDuration);
        }

        return false;
    };

    playerInstance.getDurationFromNonLinear = (tag) => {
        let result = 0;
        const nonLinear = tag.getElementsByTagName('NonLinear');
        if (nonLinear.length && (typeof nonLinear[0].getAttribute('minSuggestedDuration') !== 'undefined')) {
            result = playerInstance.convertTimeStringToSeconds(nonLinear[0].getAttribute('minSuggestedDuration'));
        }
        return result;
    };

    playerInstance.getDimensionFromNonLinear = (tag) => {
        const result = {'width': null, 'height': null};
        const nonLinear = tag.getElementsByTagName('NonLinear');

        if (nonLinear.length) {
            if (typeof nonLinear[0].getAttribute('width') !== 'undefined') {
                result.width = nonLinear[0].getAttribute('width');
            }
            if (typeof nonLinear[0].getAttribute('height') !== 'undefined') {
                result.height = nonLinear[0].getAttribute('height');
            }
        }

        return result;
    };

    playerInstance.getCreativeTypeFromStaticResources = (tag) => {
        let result = '';
        const nonLinears = tag.getElementsByTagName('NonLinear');

        if (nonLinears.length && (typeof nonLinears[0].childNodes[0] !== 'undefined')) {//There should be exactly 1 StaticResource node
            result = nonLinears[0].getElementsByTagName('StaticResource')[0].getAttribute('creativeType');
        }

        return result.toLowerCase();
    };

    playerInstance.getMediaFilesFromLinear = (linear) => {
        const mediaFiles = linear.getElementsByTagName('MediaFiles');

        if (mediaFiles.length) {//There should be exactly 1 MediaFiles node
            return mediaFiles[0].getElementsByTagName('MediaFile');
        }

        return [];
    };

    playerInstance.getStaticResourcesFromNonLinear = (linear) => {
        let result = [];
        const nonLinears = linear.getElementsByTagName('NonLinear');

        if (nonLinears.length) {//There should be exactly 1 StaticResource node
            result = nonLinears[0].getElementsByTagName('StaticResource');
        }

        return result;
    };

    playerInstance.extractNodeData = (parentNode) => {
        let contentAsString = "";
        for (let n = 0; n < parentNode.childNodes.length; n++) {
            const child = parentNode.childNodes[n];
            if (child.nodeType === 8 || (child.nodeType === 3 && /^\s*$/.test(child.nodeValue))) {
                // Comments or text with no content
            } else {
                contentAsString += child.nodeValue;
            }
        }
        return contentAsString.replace(/(^\s+|\s+$)/g, '');
    };

    playerInstance.getAdParametersFromLinear = (linear) => {
        const adParameters = linear.getElementsByTagName('AdParameters');
        let adParametersData = null;

        if (adParameters.length) {
            adParametersData = playerInstance.extractNodeData(adParameters[0]);
        }

        return adParametersData;
    };

    playerInstance.getMediaFileListFromLinear = (linear) => {
        const mediaFileList = [];
        const mediaFiles = playerInstance.getMediaFilesFromLinear(linear);

        if (!mediaFiles.length) {
            return mediaFileList;
        }

        for (let n = 0; n < mediaFiles.length; n++) {
            let mediaType = mediaFiles[n].getAttribute('mediaType');

            if (!mediaType) {
                // if there is no mediaType attribute then the video is 2D
                mediaType = '2D';
            }

            // get all the attributes of media file
            mediaFileList.push({
                'src': playerInstance.extractNodeData(mediaFiles[n]),
                'type': mediaFiles[n].getAttribute('type'),
                'apiFramework': mediaFiles[n].getAttribute('apiFramework'),
                'codec': mediaFiles[n].getAttribute('codec'),
                'id': mediaFiles[n].getAttribute('codec'),
                'fileSize': mediaFiles[n].getAttribute('fileSize'),
                'delivery': mediaFiles[n].getAttribute('delivery'),
                'width': mediaFiles[n].getAttribute('width'),
                'height': mediaFiles[n].getAttribute('height'),
                'mediaType': mediaType.toLowerCase()
            });

        }

        return mediaFileList;
    };

    playerInstance.getIconClickThroughFromLinear = (linear) => {
        const iconClickThrough = linear.getElementsByTagName('IconClickThrough');

        if (iconClickThrough.length) {
            return playerInstance.extractNodeData(iconClickThrough[0]);
        }

        return '';
    };

    playerInstance.getStaticResourceFromNonLinear = (linear) => {
        let fallbackStaticResource;
        const staticResources = playerInstance.getStaticResourcesFromNonLinear(linear);

        for (let i = 0; i < staticResources.length; i++) {
            if (!staticResources[i].getAttribute('type')) {
                fallbackStaticResource = playerInstance.extractNodeData(staticResources[i]);
            }

            if (staticResources[i].getAttribute('type') === playerInstance.displayOptions.staticResource) {
                return playerInstance.extractNodeData(staticResources[i]);
            }
        }

        return fallbackStaticResource;
    };

    playerInstance.registerTrackingEvents = (creativeLinear, tmpOptions) => {
        const trackingEvents = playerInstance.getTrackingFromLinear(creativeLinear);
        let eventType = '';
        let oneEventOffset = 0;

        for (let i = 0; i < trackingEvents.length; i++) {
            eventType = trackingEvents[i].getAttribute('event');

            switch (eventType) {
                case 'start':
                case 'firstQuartile':
                case 'midpoint':
                case 'thirdQuartile':
                case 'complete':
                    if (typeof tmpOptions.tracking[eventType] === 'undefined') {
                        tmpOptions.tracking[eventType] = [];
                    }

                    if (typeof tmpOptions.stopTracking[eventType] === 'undefined') {
                        tmpOptions.stopTracking[eventType] = [];
                    }
                    tmpOptions.tracking[eventType].push(trackingEvents[i].childNodes[0].nodeValue);
                    tmpOptions.stopTracking[eventType] = false;

                    break;

                case 'progress':
                    if (typeof tmpOptions.tracking[eventType] === 'undefined') {
                        tmpOptions.tracking[eventType] = [];
                    }

                    oneEventOffset = playerInstance.convertTimeStringToSeconds(trackingEvents[i].getAttribute('offset'));

                    if (typeof tmpOptions.tracking[eventType][oneEventOffset] === 'undefined') {
                        tmpOptions.tracking[eventType][oneEventOffset] = {
                            elements: [],
                            stopTracking: false
                        };
                    }

                    tmpOptions.tracking[eventType][oneEventOffset].elements.push(trackingEvents[i].childNodes[0].nodeValue);

                    break;

                default:
                    break;
            }
        }
    };

    playerInstance.registerClickTracking = (clickTrackingTag, tmpOptions) => {
        if (!clickTrackingTag || !clickTrackingTag.length) {
            return;
        }

        for (let i = 0; i < clickTrackingTag.length; i++) {
            if (clickTrackingTag[i] === '') {
                continue;
            }

            tmpOptions.clicktracking.push(clickTrackingTag[i]);
        }

    };

    playerInstance.registerImpressionEvents = (impressionTags, tmpOptions) => {
        if (!impressionTags.length) {
            return;
        }

        for (let i = 0; i < impressionTags.length; i++) {
            const impressionEvent = playerInstance.extractNodeData(impressionTags[i]);
            tmpOptions.impression.push(impressionEvent);
        }
    };

    playerInstance.registerErrorEvents = (errorTags, tmpOptions) => {
        if ((typeof errorTags !== 'undefined') &&
            (errorTags !== null) &&
            (errorTags.length === 1) && //Only 1 Error tag is expected
            (errorTags[0].childNodes.length === 1)) {
            tmpOptions.errorUrl = errorTags[0].childNodes[0].nodeValue;
        }
    };

    playerInstance.announceError = (code) => {
        if (typeof playerInstance.vastOptions.errorUrl === 'undefined' || !playerInstance.vastOptions.errorUrl) {
            return;
        }

        const parsedCode = typeof code !== 'undefined' ? parseInt(code) : 900;
        const errorUrl = playerInstance.vastOptions.errorUrl.replace('[ERRORCODE]', parsedCode);

        //Send the error request
        playerInstance.callUris([errorUrl]);
    };

    playerInstance.getClickTrackingEvents = (linear) => {
        const result = [];

        const videoClicks = linear.getElementsByTagName('VideoClicks');

        //There should be exactly 1 node
        if (!videoClicks.length) {
            return;
        }

        const clickTracking = videoClicks[0].getElementsByTagName('ClickTracking');

        if (!clickTracking.length) {
            return;
        }

        for (let i = 0; i < clickTracking.length; i++) {
            const clickTrackingEvent = playerInstance.extractNodeData(clickTracking[i]);
            result.push(clickTrackingEvent);
        }

        return result;
    };

    playerInstance.getNonLinearClickTrackingEvents = (nonLinear) => {
        const result = [];
        const nonLinears = nonLinear.getElementsByTagName('NonLinear');

        if (!nonLinears.length) {
            return;
        }

        const clickTracking = nonLinear.getElementsByTagName('NonLinearClickTracking');

        if (!clickTracking.length) {
            return;
        }

        for (let i = 0; i < clickTracking.length; i++) {
            const NonLinearClickTracking = playerInstance.extractNodeData(clickTracking[i]);
            result.push(NonLinearClickTracking);
        }

        return result;
    };

    // TODO: ???
    playerInstance.callUris = (uris) => {
        for (let i = 0; i < uris.length; i++) {
            new Image().src = uris[i];
        }
    };

    playerInstance.recalculateAdDimensions = () => {
        const videoPlayer = document.getElementById(playerInstance.videoPlayerId);
        const divClickThrough = document.getElementById('vast_clickthrough_layer_' + playerInstance.videoPlayerId);

        if (divClickThrough) {
            divClickThrough.style.width = videoPlayer.offsetWidth + 'px';
            divClickThrough.style.height = videoPlayer.offsetHeight + 'px';
        }

        const requestFullscreenFunctionNames = playerInstance.checkFullscreenSupport('fluid_video_wrapper_' + playerInstance.videoPlayerId);
        const fullscreenButton = document.getElementById(playerInstance.videoPlayerId + '_fluid_control_fullscreen');
        const menuOptionFullscreen = document.getElementById(playerInstance.videoPlayerId + 'context_option_fullscreen');

        if (requestFullscreenFunctionNames) {
            // this will go other way around because we already exited full screen
            if (document[requestFullscreenFunctionNames.isFullscreen] === null) {
                // Exit fullscreen
                playerInstance.fullscreenOff(fullscreenButton, menuOptionFullscreen);
            } else {
                // Go fullscreen
                playerInstance.fullscreenOn(fullscreenButton, menuOptionFullscreen);
            }
        } else {
            // TODO: I am fairly certain this fallback does not work...
            //The browser does not support the Fullscreen API, so a pseudo-fullscreen implementation is used
            const fullscreenTag = document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId);

            if (fullscreenTag.className.search(/\bpseudo_fullscreen\b/g) !== -1) {
                fullscreenTag.className += ' pseudo_fullscreen';
                playerInstance.fullscreenOn(fullscreenButton, menuOptionFullscreen);
            } else {
                fullscreenTag.className = fullscreenTag.className.replace(/\bpseudo_fullscreen\b/g, '');
                playerInstance.fullscreenOff(fullscreenButton, menuOptionFullscreen);
            }
        }
    };

    playerInstance.prepareVast = (roll) => {
        let list = playerInstance.findRoll(roll);

        for (let i = 0; i < list.length; i++) {
            const adListId = list[i];

            if (!(playerInstance.adList[adListId].vastLoaded !== true && playerInstance.adList[adListId].error !== true)) {
                continue;
            }

            playerInstance.processVastWithRetries(playerInstance.adList[adListId]);
            playerInstance.domRef.player.addEventListener('adId_' + adListId, playerInstance[roll]);
        }
    };


    playerInstance.playMainVideoWhenVastFails = (errorCode) => {
        playerInstance.debugMessage('playMainVideoWhenVastFails called');
        playerInstance.domRef.player.removeEventListener('loadedmetadata', playerInstance.switchPlayerToVastMode);
        playerInstance.domRef.player.pause();
        playerInstance.toggleLoader(false);
        playerInstance.displayOptions.vastOptions.vastAdvanced.noVastVideoCallback();

        if (!playerInstance.vastOptions || typeof playerInstance.vastOptions.errorUrl === 'undefined') {
            playerInstance.announceLocalError(errorCode);
        } else {
            playerInstance.announceError(errorCode);
        }

        playerInstance.switchToMainVideo();
    };

    // TODO: ???
    playerInstance.switchPlayerToVastMode = () => {
    };

    /**
     * Process the XML response
     *
     * @param xmlResponse
     * @param tmpOptions
     * @param callBack
     */
    playerInstance.processVastXml = (xmlResponse, tmpOptions, callBack) => {
        let clickTracks;

        if (!xmlResponse) {
            callBack(false);
            return;
        }

        //Get impression tag
        const impression = xmlResponse.getElementsByTagName('Impression');
        if (impression !== null) {
            playerInstance.registerImpressionEvents(impression, tmpOptions);
        }

        //Get the error tag, if any
        const errorTags = xmlResponse.getElementsByTagName('Error');
        if (errorTags !== null) {
            playerInstance.registerErrorEvents(errorTags, tmpOptions);
        }

        //Get Creative
        const creative = xmlResponse.getElementsByTagName('Creative');

        //Currently only 1 creative and 1 linear is supported
        if ((typeof creative !== 'undefined') && creative.length) {
            const arrayCreativeLinears = creative[0].getElementsByTagName('Linear');

            if ((typeof arrayCreativeLinears !== 'undefined') && (arrayCreativeLinears !== null) && arrayCreativeLinears.length) {

                const creativeLinear = arrayCreativeLinears[0];
                playerInstance.registerTrackingEvents(creativeLinear, tmpOptions);

                clickTracks = playerInstance.getClickTrackingEvents(creativeLinear);
                playerInstance.registerClickTracking(clickTracks, tmpOptions);

                //Extract the Ad data if it is actually the Ad (!wrapper)
                if (!playerInstance.hasVastAdTagUri(xmlResponse) && playerInstance.hasInLine(xmlResponse)) {

                    //Set initial values
                    tmpOptions.adFinished = false;
                    tmpOptions.adType = 'linear';
                    tmpOptions.vpaid = false;

                    //Extract the necessary data from the Linear node
                    tmpOptions.skipoffset = playerInstance.convertTimeStringToSeconds(creativeLinear.getAttribute('skipoffset'));
                    tmpOptions.clickthroughUrl = playerInstance.getClickThroughUrlFromLinear(creativeLinear);
                    tmpOptions.duration = playerInstance.getDurationFromLinear(creativeLinear);
                    tmpOptions.mediaFileList = playerInstance.getMediaFileListFromLinear(creativeLinear);
                    tmpOptions.adParameters = playerInstance.getAdParametersFromLinear(creativeLinear);
                    tmpOptions.iconClick = playerInstance.getIconClickThroughFromLinear(creativeLinear);

                    if (tmpOptions.adParameters) {
                        tmpOptions.vpaid = true;
                    }
                }
            }

            const arrayCreativeNonLinears = creative[0].getElementsByTagName('NonLinearAds');

            if ((typeof arrayCreativeNonLinears !== 'undefined') && (arrayCreativeNonLinears !== null) && arrayCreativeNonLinears.length) {

                const creativeNonLinear = arrayCreativeNonLinears[0];
                playerInstance.registerTrackingEvents(creativeNonLinear, tmpOptions);

                clickTracks = playerInstance.getNonLinearClickTrackingEvents(creativeNonLinear);
                playerInstance.registerClickTracking(clickTracks, tmpOptions);

                //Extract the Ad data if it is actually the Ad (!wrapper)
                if (!playerInstance.hasVastAdTagUri(xmlResponse) && playerInstance.hasInLine(xmlResponse)) {

                    //Set initial values
                    tmpOptions.adType = 'nonLinear';
                    tmpOptions.vpaid = false;

                    //Extract the necessary data from the NonLinear node
                    tmpOptions.clickthroughUrl = playerInstance.getClickThroughUrlFromNonLinear(creativeNonLinear);
                    tmpOptions.duration = playerInstance.getDurationFromNonLinear(creativeNonLinear); // VAST version < 4.0
                    tmpOptions.dimension = playerInstance.getDimensionFromNonLinear(creativeNonLinear); // VAST version < 4.0
                    tmpOptions.staticResource = playerInstance.getStaticResourceFromNonLinear(creativeNonLinear);
                    tmpOptions.creativeType = playerInstance.getCreativeTypeFromStaticResources(creativeNonLinear);
                    tmpOptions.adParameters = playerInstance.getAdParametersFromLinear(creativeNonLinear);

                    if (tmpOptions.adParameters) {
                        tmpOptions.vpaid = true;
                    }

                }
            }

            //Extract the Ad data if it is actually the Ad (!wrapper)
            if (!playerInstance.hasVastAdTagUri(xmlResponse) && playerInstance.hasInLine(xmlResponse)) {
                if (typeof tmpOptions.mediaFileList !== 'undefined' || typeof tmpOptions.staticResource !== 'undefined') {
                    callBack(true, tmpOptions);
                } else {
                    callBack(false);
                }
            }
        } else {
            callBack(false);
        }
    };

    /**
     * Parse the VAST Tag
     *
     * @param vastTag
     * @param adListId
     */

    playerInstance.processVastWithRetries = (vastObj) => {
        let vastTag = vastObj.vastTag;
        const adListId = vastObj.id;

        const handleVastResult = function (pass, tmpOptions) {
            if (pass && typeof tmpOptions !== 'undefined' && tmpOptions.vpaid && !playerInstance.displayOptions.vastOptions.allowVPAID) {
                pass = false;
                playerInstance.announceLocalError('103', 'VPAID not allowed, so skipping this VAST tag.')
            }

            if (pass) {
                // ok
                if (tmpOptions.adType === 'linear') {

                    if ((typeof tmpOptions.iconClick !== 'undefined') && (tmpOptions.iconClick !== null) && tmpOptions.iconClick.length) {
                        playerInstance.adList[adListId].landingPage = tmpOptions.iconClick;
                    }

                    const selectedMediaFile = playerInstance.getSupportedMediaFileObject(tmpOptions.mediaFileList);
                    if (selectedMediaFile) {
                        playerInstance.adList[adListId].mediaType = selectedMediaFile.mediaType;
                    }

                }

                playerInstance.adList[adListId].adType = tmpOptions.adType ? tmpOptions.adType : 'unknown';
                playerInstance.adList[adListId].vastLoaded = true;
                playerInstance.adPool[adListId] = Object.assign({}, tmpOptions);

                const event = document.createEvent('Event');

                event.initEvent('adId_' + adListId, false, true);
                playerInstance.domRef.player.dispatchEvent(event);
                playerInstance.displayOptions.vastOptions.vastAdvanced.vastLoadedCallback();

                if (playerInstance.hasTitle()) {
                    const title = document.getElementById(playerInstance.videoPlayerId + '_title');
                    title.style.display = 'none';
                }

            } else {
                // when vast failed
                playerInstance.announceLocalError('101');

                if (vastObj.hasOwnProperty('fallbackVastTags') && vastObj.fallbackVastTags.length > 0) {
                    vastTag = vastObj.fallbackVastTags.shift();
                    playerInstance.processUrl(vastTag, handleVastResult);
                } else {
                    if (vastObj.roll === 'preRoll') {
                        playerInstance.preRollFail(vastObj);
                    }
                    playerInstance.adList[adListId].error = true;
                }
            }
        };

        playerInstance.processUrl(vastTag, handleVastResult);
    };


    playerInstance.processUrl = (vastTag, callBack) => {
        const numberOfRedirects = 0;

        const tmpOptions = {
            tracking: [],
            stopTracking: [],
            impression: [],
            clicktracking: [],
            vastLoaded: false
        };

        playerInstance.resolveVastTag(
            vastTag,
            numberOfRedirects,
            tmpOptions,
            callBack
        );
    };

    playerInstance.resolveVastTag = (vastTag, numberOfRedirects, tmpOptions, callBack) => {
        if (!vastTag || vastTag === '') {
            callBack(false);
            return;
        }

        const handleXmlHttpReq = function () {
            const xmlHttpReq = this;
            let xmlResponse = false;

            if (xmlHttpReq.readyState === 4 && xmlHttpReq.status === 404) {
                callBack(false);
                return;
            }

            if (xmlHttpReq.readyState === 4 && xmlHttpReq.status === 0) {
                callBack(false); //Most likely that Ad Blocker exists
                return;
            }

            if (!((xmlHttpReq.readyState === 4) && (xmlHttpReq.status === 200))) {
                return;
            }

            if ((xmlHttpReq.readyState === 4) && (xmlHttpReq.status !== 200)) {
                callBack(false);
                return;
            }

            try {
                xmlResponse = xmlHttpReq.responseXML;
            } catch (e) {
                callBack(false);
                return;
            }

            if (!xmlResponse) {
                callBack(false);
                return;
            }

            playerInstance.inLineFound = playerInstance.hasInLine(xmlResponse);

            if (!playerInstance.inLineFound && playerInstance.hasVastAdTagUri(xmlResponse)) {

                const vastAdTagUri = playerInstance.getVastAdTagUriFromWrapper(xmlResponse);
                if (vastAdTagUri) {
                    playerInstance.resolveVastTag(vastAdTagUri, numberOfRedirects, tmpOptions, callBack);
                } else {
                    callBack(false);
                    return;
                }
            }

            if (numberOfRedirects > playerInstance.displayOptions.vastOptions.maxAllowedVastTagRedirects && !playerInstance.inLineFound) {
                callBack(false);
                return;
            }

            playerInstance.processVastXml(xmlResponse, tmpOptions, callBack);
        };

        if (numberOfRedirects <= playerInstance.displayOptions.vastOptions.maxAllowedVastTagRedirects) {

            playerInstance.sendRequest(
                vastTag,
                true,
                playerInstance.displayOptions.vastOptions.vastTimeout,
                handleXmlHttpReq
            );
        }

        numberOfRedirects++;
    };

    playerInstance.setVastList = () => {
        const ads = {};
        const adGroupedByRolls = {preRoll: [], postRoll: [], midRoll: [], onPauseRoll: []};
        const def = {
            id: null,
            roll: null,
            played: false,
            vastLoaded: false,
            error: false,
            adText: null,
            adTextPosition: null
        };
        let idPart = 0;

        const validateVastList = function (item) {
            let hasError = false;

            if (item.roll === 'midRoll') {
                if (typeof item.timer === 'undefined') {
                    hasError = true;
                }
            }

            return hasError;
        };

        const validateRequiredParams = function (item) {
            let hasError = false;

            if (!item.vastTag) {
                playerInstance.announceLocalError(102, '"vastTag" property is missing from adList.');
                hasError = true;
            }

            if (!item.roll) {
                playerInstance.announceLocalError(102, '"roll" is missing from adList.');
                hasError = true;
            }

            if (playerInstance.availableRolls.indexOf(item.roll) === -1) {
                playerInstance.announceLocalError(102, 'Only ' + playerInstance.availableRolls.join(',') + ' rolls are supported.');
                hasError = true;
            }

            if (item.size && playerInstance.supportedNonLinearAd.indexOf(item.size) === -1) {
                playerInstance.announceLocalError(102, 'Only ' + playerInstance.supportedNonLinearAd.join(',') + ' size are supported.');
                hasError = true;
            }

            return hasError;
        };

        if (playerInstance.displayOptions.vastOptions.hasOwnProperty('adList')) {

            for (let key in playerInstance.displayOptions.vastOptions.adList) {

                let adItem = playerInstance.displayOptions.vastOptions.adList[key];

                if (validateRequiredParams(adItem)) {
                    playerInstance.announceLocalError(102, 'Wrong adList parameters.');
                    continue;
                }
                const id = 'ID' + idPart;

                ads[id] = Object.assign({}, def);
                ads[id] = Object.assign(ads[id], playerInstance.displayOptions.vastOptions.adList[key]);
                if (adItem.roll == 'midRoll') {
                    ads[id].error = validateVastList('midRoll', adItem);
                }
                ads[id].id = id;
                idPart++;

            }
        }

        // group the ads by roll
        // pushing object references and forming json
        Object.keys(ads).map(function (e) {
            if (ads[e].roll.toLowerCase() === 'preRoll'.toLowerCase()) {
                adGroupedByRolls.preRoll.push(ads[e]);
            } else if (ads[e].roll.toLowerCase() === 'midRoll'.toLowerCase()) {
                adGroupedByRolls.midRoll.push(ads[e]);
            } else if (ads[e].roll.toLowerCase() === 'postRoll'.toLowerCase()) {
                adGroupedByRolls.postRoll.push(ads[e]);
            } else if (ads[e].roll.toLowerCase() === 'onPauseRoll'.toLowerCase()) {
                adGroupedByRolls.onPauseRoll.push(ads[e]);
            }
        });

        playerInstance.adGroupedByRolls = adGroupedByRolls;
        playerInstance.adList = ads;
    };

    playerInstance.onVastAdEnded = (event) => {
        if (event) {
            event.stopImmediatePropagation();
        }
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        playerInstance.deleteVastAdElements();
        playerInstance.checkForNextAd();
    };

    playerInstance.vastLogoBehaviour = (vastPlaying) => {
        if (!playerInstance.displayOptions.layoutControls.logo.showOverAds) {
            const logoHolder = document.getElementById(playerInstance.videoPlayerId + '_logo');
            const logoImage = document.getElementById(playerInstance.videoPlayerId + '_logo_image');

            if (!logoHolder || !logoImage) {
                return;
            }

            logoHolder.style.display = vastPlaying ? 'none' : 'inline';
        }
    };

    playerInstance.deleteVastAdElements = () => {
        playerInstance.removeClickthrough();
        playerInstance.removeSkipButton();
        playerInstance.removeAdCountdown();
        playerInstance.removeAdPlayingText();
        playerInstance.removeCTAButton();
        playerInstance.vastLogoBehaviour(false);
    };
}
