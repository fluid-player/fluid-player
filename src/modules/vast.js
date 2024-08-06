// VAST support module

/* Type declarations */

/**
 * @typedef {Object} RawAdTree
 * @property {Array<RawAdTree>} children
 * @property {XMLDocument} data
 * @property {'inLine'|'wrapper'} tagType
 * @property {boolean|undefined} fallbackOnNoAd
 * @property {Array<XMLDocument> | undefined} wrappers
*/

/**
 * @typedef {Object} RawAd
 * @property {XMLDocument} data
 * @property {Array<XMLDocument>} wrappers
 * @property {'inLine' | 'wrapper'} tagType
 */

/**
 * @typedef {Object & RawAd} Ad
 * @property {Array<string>} clicktracking
 * @property {string} errorUrl
 * @property {Array<string>} impressions
 * @property {Array<string>} viewImpression
 * @property {Array<any>} stopTracking
 * @property {Array<any>} tracking
 * @property {number|null} sequence
 * @property {number} duration
 * @property {boolean} played
 */

export default function (playerInstance, options) {
    /**
     * Gets CTA parameters from VAST and sets them on tempOptions
     *
     * Fallbacks to any value that is filled on the TitleCTA extension, but needs at least an url and a text
     *
     * @param {HTMLElement} titleCtaElement
     *
     * @param {any} tmpOptions
     */
    playerInstance.setCTAFromVast = (titleCtaElement, tmpOptions) => {
        if (playerInstance.displayOptions.vastOptions.adCTATextVast && titleCtaElement) {
            const mobileText = playerInstance.extractNodeDataByTagName(titleCtaElement, 'MobileText');
            const desktopText = playerInstance.extractNodeDataByTagName(titleCtaElement, 'PCText');
            const link =
                playerInstance.extractNodeDataByTagName(titleCtaElement, 'DisplayUrl') ||
                playerInstance.extractNodeDataByTagName(titleCtaElement, 'Link');
            const tracking = playerInstance.extractNodeDataByTagName(titleCtaElement, 'Tracking');
            const isMobile = window.matchMedia('(max-width: 768px)').matches;

            if ((desktopText || mobileText) && tracking) {
                tmpOptions.titleCTA = {
                    text: isMobile ?
                        mobileText || desktopText :
                        desktopText || mobileText,
                    link: link || null,
                    tracking,
                }
            }
        }
    };

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
        const result = { 'width': null, 'height': null };
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

    /**
     * Gets the first element found by tag name, and returns the element data
     *
     * @param {HTMLElement} parentNode
     *
     * @param {string} tagName
     *
     * @returns {string|null}
     */
    playerInstance.extractNodeDataByTagName = (parentNode, tagName) => {
        const element = parentNode.getElementsByTagName(tagName);

        if (element && element.length) {
            return playerInstance.extractNodeData(element[0]);
        } else {
            return null;
        }
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
                    tmpOptions.tracking[eventType].push(trackingEvents[i].textContent.trim());
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

                    tmpOptions.tracking[eventType][oneEventOffset].elements.push(trackingEvents[i].textContent.trim());

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

    playerInstance.registerViewableImpressionEvents = (viewableImpressionTags, tmpOptions) => {
        if (!viewableImpressionTags.length) {
            return;
        }

        for (let i = 0; i < viewableImpressionTags.length; i++) {
            const viewableImpressionEvent = playerInstance.extractNodeData(viewableImpressionTags[i]);
            tmpOptions.viewImpression.push(viewableImpressionEvent);
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
        const videoPlayer = playerInstance.domRef.player;
        const divClickThrough = playerInstance.domRef.wrapper.querySelector('.vast_clickthrough_layer');

        if (divClickThrough) {
            divClickThrough.style.width = videoPlayer.offsetWidth + 'px';
            divClickThrough.style.height = videoPlayer.offsetHeight + 'px';
        }

        const requestFullscreenFunctionNames = playerInstance.checkFullscreenSupport();
        const fullscreenButton = playerInstance.domRef.wrapper.querySelector('.fluid_control_fullscreen');
        const menuOptionFullscreen = playerInstance.domRef.wrapper.querySelector('.context_option_fullscreen');

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
            const fullscreenTag = playerInstance.domRef.wrapper;

            if (fullscreenTag.className.search(/\bpseudo_fullscreen\b/g) !== -1) {
                fullscreenTag.className += ' pseudo_fullscreen';
                playerInstance.fullscreenOn(fullscreenButton, menuOptionFullscreen);
            } else {
                fullscreenTag.className = fullscreenTag.className.replace(/\bpseudo_fullscreen\b/g, '');
                playerInstance.fullscreenOff(fullscreenButton, menuOptionFullscreen);
            }
        }
    };

    /**
     * Prepares VAST for instant ads
     *
     * @param roll
     */
    playerInstance.prepareVast = (roll) => {
        let list = playerInstance.findRoll(roll);

        for (let i = 0; i < list.length; i++) {
            const rollListId = list[i];

            if (!(playerInstance.rollsById[rollListId].vastLoaded !== true && playerInstance.rollsById[rollListId].error !== true)) {
                continue;
            }

            playerInstance.processVastWithRetries(playerInstance.rollsById[rollListId]);
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
     * @param ad
     */
    function processAdCreatives(ad) {
        const adElement = ad.data;

        if (!adElement) {
            return;
        }

        const creativeElements = Array.from(adElement.getElementsByTagName('Creative'));

        if (creativeElements.length) {
            for (let i = 0; i < creativeElements.length; i++) {
                const creativeElement = creativeElements[i];

                try {
                    if (ad.adType === 'linear') {
                        const linearCreatives = creativeElement.getElementsByTagName('Linear');
                        const creativeLinear = linearCreatives[0];
    
                        //Extract the Ad data if it is actually the Ad (!wrapper)
                        if (!playerInstance.hasVastAdTagUri(adElement) && playerInstance.hasInLine(adElement)) {
                            //Set initial values
                            ad.adFinished = false;
                            ad.vpaid = false;
    
                            //Extract the necessary data from the Linear node
                            ad.skipoffset = playerInstance.convertTimeStringToSeconds(creativeLinear.getAttribute('skipoffset'));
                            ad.clickthroughUrl = playerInstance.getClickThroughUrlFromLinear(creativeLinear);
                            ad.duration = playerInstance.getDurationFromLinear(creativeLinear);
                            ad.mediaFileList = playerInstance.getMediaFileListFromLinear(creativeLinear);
                            ad.adParameters = playerInstance.getAdParametersFromLinear(creativeLinear);
                            ad.iconClick = ad.iconClick || playerInstance.getIconClickThroughFromLinear(creativeLinear);
    
                            if (ad.adParameters) {
                                ad.vpaid = true;
                            }
                        }
                    }
    
                    if (ad.adType === 'nonLinear') {
                        const nonLinearCreatives = creativeElement.getElementsByTagName('NonLinearAds');
                        const creativeNonLinear = nonLinearCreatives[0];
    
                        //Extract the Ad data if it is actually the Ad (!wrapper)
                        if (!playerInstance.hasVastAdTagUri(adElement) && playerInstance.hasInLine(adElement)) {
                            //Set initial values
                            ad.vpaid = false;
    
                            //Extract the necessary data from the NonLinear node
                            ad.clickthroughUrl = playerInstance.getClickThroughUrlFromNonLinear(creativeNonLinear);
                            ad.duration = playerInstance.getDurationFromNonLinear(creativeNonLinear); // VAST version < 4.0
                            ad.dimension = playerInstance.getDimensionFromNonLinear(creativeNonLinear); // VAST version < 4.0
                            ad.staticResource = playerInstance.getStaticResourceFromNonLinear(creativeNonLinear);
                            ad.creativeType = playerInstance.getCreativeTypeFromStaticResources(creativeNonLinear);
                            ad.adParameters = playerInstance.getAdParametersFromLinear(creativeNonLinear);
    
                            if (ad.adParameters) {
                                ad.vpaid = true;
                            }
                        }
                    }

                    // Current support is for only one creative element
                    // break the loop if creative was successful
                    break;
                } catch (err) {
                    if (creativeElement.firstElementChild &&
                        !(creativeElement.firstElementChild.tagName === 'Linear' ||
                            creativeElement.firstElementChild.tagName === 'NonLinearAds')) {
                        console.warn('Skipping ' + creativeElement.firstElementChild.tagName + ', this might not be supported yet.')
                    }
                    console.error(err);
                }
            };
        }

        return ad;
    }

    /**
     * Parse the VAST Tag
     *
     * @param vastObj
     */
    playerInstance.processVastWithRetries = (vastObj) => {
        let vastTag = vastObj.vastTag;
        const rollListId = vastObj.id;

        playerInstance.domRef.player.addEventListener('adId_' + rollListId, playerInstance[vastObj.roll]);

        const handleVastResult = function (pass, adOptionsList) {
            if (pass && Array.isArray(adOptionsList) && !playerInstance.displayOptions.vastOptions.allowVPAID && adOptionsList.some(adOptions => adOptions.vpaid)) {
                adOptionsList = adOptionsList.filter(adOptions => adOptions.vpaid !== true);
                playerInstance.announceLocalError('103', 'VPAID not allowed, so skipping this VAST tag.')
            }

            if (pass && Array.isArray(adOptionsList) && adOptionsList.length) {

                playerInstance.adPool[rollListId] = [];

                adOptionsList.forEach((tmpOptions, index) => {
                    tmpOptions.id = rollListId + '_AD' + index;
                    tmpOptions.rollListId = rollListId;

                    if (tmpOptions.adType === 'linear') {

                        if ((typeof tmpOptions.iconClick !== 'undefined') && (tmpOptions.iconClick !== null) && tmpOptions.iconClick.length) {
                            tmpOptions.landingPage = tmpOptions.iconClick;
                        }

                        const selectedMediaFile = playerInstance.getSupportedMediaFileObject(tmpOptions.mediaFileList);
                        if (selectedMediaFile) {
                            tmpOptions.mediaType = selectedMediaFile.mediaType;
                        }

                    }

                    tmpOptions.adType = tmpOptions.adType ? tmpOptions.adType : 'unknown';
                    playerInstance.adPool[rollListId].push(Object.assign({}, tmpOptions));

                    if (playerInstance.hasTitle()) {
                        const title = playerInstance.domRef.wrapper.querySelector('.fp_title');
                        title.style.display = 'none';
                    }

                    playerInstance.rollsById[rollListId].ads.push(tmpOptions);
                });

                playerInstance.rollsById[rollListId].vastLoaded = true;

                const event = document.createEvent('Event');

                event.initEvent('adId_' + rollListId, false, true);
                playerInstance.domRef.player.dispatchEvent(event);
                playerInstance.displayOptions.vastOptions.vastAdvanced.vastLoadedCallback();
            } else {
                // when vast failed
                playerInstance.announceLocalError('101');

                if (vastObj.hasOwnProperty('fallbackVastTags') && vastObj.fallbackVastTags.length > 0) {
                    vastTag = vastObj.fallbackVastTags.shift();
                    playerInstance.processUrl(vastTag, handleVastResult, rollListId);
                } else {
                    if (vastObj.roll === 'preRoll') {
                        playerInstance.preRollFail(vastObj);
                    }
                    playerInstance.rollsById[rollListId].error = true;
                }
            }
        };

        playerInstance.processUrl(vastTag, handleVastResult, rollListId);
    };

    playerInstance.processUrl = (vastTag, callBack, rollListId) => {
        const numberOfRedirects = 0;

        const tmpOptions = {
            tracking: [],
            stopTracking: [],
            impression: [],
            viewImpression: [],
            clicktracking: [],
            vastLoaded: false
        };

        playerInstance.resolveVastTag(
            vastTag,
            numberOfRedirects,
            tmpOptions,
            callBack,
            rollListId
        );
    };

    /**
     * Gets first stand-alone ad
     *
     * @param {Array<RawAdTree>} ads
     * @returns {Array<RawAdTree>}
     */
    function getFirstStandAloneAd(ads) {
        for (const ad of ads) {
            const isAdPod = ad.data.attributes.sequence !== undefined;

            if (!isAdPod) {
                return [ad];
            }
        }

        return [];
    }

    /**
     * Resolves ad requests recursively and returns a tree of "Ad" and "Wrapper" elements
     *
     * @param {string} url vast resource url
     * @param {number} maxDepth depth of recursive calls (wrapper depth)
     * @param {Partial<RawAdTree>} baseNode used for recursive calls as base node
     * @param {number} currentDepth used internally to track depth
     * @param {boolean} followAdditionalWrappers used internally to track nested wrapper calls
     * @returns {Promise<RawAdTree>}
     */
    async function resolveAdTreeRequests(url, maxDepth, baseNode = {}, currentDepth = 0, followAdditionalWrappers = true) {
        const adTree = { ...baseNode, children: [] };
        const { responseXML } = await playerInstance.sendRequestAsync(url, true, playerInstance.displayOptions.vastOptions.vastTimeout);
        const adElements = Array.from(responseXML.getElementsByTagName('Ad'));

        for (const adElement of adElements) {
            const vastAdTagUri = playerInstance.getVastAdTagUriFromWrapper(adElement);
            const isAdPod = adElement.attributes.sequence !== undefined;
            const adNode = { data: adElement };

            if (vastAdTagUri && currentDepth <= maxDepth && followAdditionalWrappers) {
                const [wrapperElement] = adElement.getElementsByTagName('Wrapper');
                const disableAdditionalWrappers = wrapperElement.attributes.followAdditionalWrappers && ["false", "0"].includes(wrapperElement.attributes.followAdditionalWrappers.value); // See VAST Wrapper spec
                const allowMultipleAds = wrapperElement.attributes.allowMultipleAds && ["true", "1"].includes(wrapperElement.attributes.allowMultipleAds.value); // See VAST Wrapper spec
                const fallbackOnNoAd = wrapperElement.attributes.fallbackOnNoAd && ["true", "1"].includes(wrapperElement.attributes.fallbackOnNoAd.value);

                try {
                    const wrapperResponse = await resolveAdTreeRequests(vastAdTagUri, maxDepth, { tagType: 'wrapper', ...adNode, fallbackOnNoAd }, currentDepth+1, !disableAdditionalWrappers);
                    wrapperResponse.fallbackOnNoAd = fallbackOnNoAd;

                    if (!allowMultipleAds || isAdPod) {
                        wrapperResponse.children = getFirstStandAloneAd(wrapperResponse.children);
                    }

                    adTree.children.push(wrapperResponse);
                } catch (e) {
                    adTree.children.push({ tagType: `wrapper`, fallbackOnNoAd, httpError: true })
                    playerInstance.debugMessage(`Error when loading Wrapper, will trigger fallback if available`, e);
                }
            } else if (!vastAdTagUri) {
                adTree.children.push({ tagType: 'inLine', ...adNode });
            }
        }

        return adTree;
    }

    /**
     * Transforms an Ad Tree to a 1-dimensional array of Ads with wrapper data attached to each ad
     *
     * @param {RawAdTree} root
     * @param {Array<RawAd>} ads
     * @param {Array<XMLDocument>} wrappers
     * @returns {Array<RawAd>}
     */
    function flattenAdTree(root, ads = [], wrappers = []) {
        const currentWrappers = [...wrappers, root.data];

        if (Array.isArray(root.children) && root.children.length) {
            root.children.forEach(child => flattenAdTree(child, ads, currentWrappers));
        }

        if (root.tagType === 'inLine') {
            ads.push({ ...root, wrappers: currentWrappers.filter(Boolean) });
        }

        return ads;
    }

    /**
     * Register Ad element properties to an Ad based on its data and its wrapper data if available
     *
     * @param {RawAd} rawAd
     * @param {{ tracking: Array, stopTracking: Array, impression: Array, viewImpression: Array, clicktracking: Array }} options
     * @returns {Ad}
     */
    function registerAdProperties(rawAd, options) {
        const ad = { ...rawAd, ...JSON.parse(JSON.stringify(options)) };

        ad.adType = (ad.data.getElementsByTagName('Linear').length && 'linear') ||
            (ad.data.getElementsByTagName('NonLinearAds').length && 'nonLinear') || 'unknown';

        [...(ad.wrappers || []), ad.data].filter(Boolean).forEach(dataSource => {
            // Register impressions
            const impression = dataSource.getElementsByTagName('Impression');
            if (impression !== null) {
                playerInstance.registerImpressionEvents(impression, ad);
            }

            // Register viewable impressions
            const viewableImpression = dataSource.getElementsByTagName('Viewable');
            if (viewableImpression !== null) {
                playerInstance.registerViewableImpressionEvents(viewableImpression, ad);
            }

            // Get the error tag, if any
            const errorTags = dataSource.getElementsByTagName('Error');
            if (errorTags !== null) {
                playerInstance.registerErrorEvents(errorTags, ad);
            }

            // Sets CTA from vast
            const [titleCta] = dataSource.getElementsByTagName('TitleCTA');
            if (titleCta) {
                playerInstance.setCTAFromVast(titleCta, ad);
            }

            // Register tracking events
            playerInstance.registerTrackingEvents(dataSource, ad);
            const clickTracks = ad.adType === 'linear' ?
                playerInstance.getClickTrackingEvents(dataSource) :
                playerInstance.getNonLinearClickTrackingEvents(dataSource);
            playerInstance.registerClickTracking(clickTracks, ad);
        });

        ad.sequence = ad.data.attributes.sequence ? Number(ad.data.attributes.sequence.value) : null;
        ad.played = false;

        return ad;
    }

    /**
     * Handles selection of ad pod or standalone ad to be played
     *
     * @param {Array<Ad>} ads
     * @param {number} maxDuration
     * @param {number} maxQuantity
     * @param {boolean} forceStandAloneAd
     */
    function getPlayableAds(ads, maxDuration, maxQuantity, forceStandAloneAd) {
        const { adPod } = ads
            .filter(ad => Boolean(ad.sequence))
            .sort((adX, adY) => adX.sequence - adY.sequence)
            .reduce((playableAds, ad) => {
                if (playableAds.adPod.length < maxQuantity && (playableAds.totalDuration + ad.duration) <= maxDuration) {
                    playableAds.adPod.push(ad);
                }

                return playableAds;
            }, { adPod: [], totalDuration: 0 });
        const adBuffet = ads.filter(ad => !Boolean(ad.sequence) && ad.duration < maxDuration);

        const isValidAdPodFormats = adPod.map(ad => ad.adType).slice(0, -1).every(adType => adType === 'linear');

        if (adPod.length > 0 && !forceStandAloneAd && isValidAdPodFormats) {
            playerInstance.debugMessage('Playing valid adPod', adPod);
            return adPod;
        } else {
            playerInstance.debugMessage('Trying to play single ad, adBuffet:', adBuffet);
            return adBuffet.length > 0 ? [adBuffet[0]] : [];
        }
    }

    /**
     * @param vastTag
     * @param numberOfRedirects
     * @param tmpOptions
     * @param callback
     * @param rollListId
     */
    playerInstance.resolveVastTag = (vastTag, numberOfRedirects, tmpOptions, callback, rollListId) => {
        if (!vastTag || vastTag === '') {
            return callback(false);
        }

        resolveAdTreeRequests(vastTag, playerInstance.displayOptions.vastOptions.maxAllowedVastTagRedirects)
            .then(result => {
                try {
                    /** @see VAST 4.0 Wrapper.fallbackOnNoAd */
                    const triggerFallbackOnNoAd = result.children.some(ad =>
                        ad.tagType === 'wrapper' && ad.fallbackOnNoAd && (!/"tagType":"ad"/.test(JSON.stringify(ad)) || ad.httpError)
                    );

                    if (triggerFallbackOnNoAd) {
                        playerInstance.debugMessage('Error on VAST Wrapper, triggering fallbackOnNoAd. Ad tree:', result);
                    }

                    result = flattenAdTree(result).map(ad => processAdCreatives(registerAdProperties(ad, tmpOptions)));

                    const playableAds = getPlayableAds(
                        result,
                        playerInstance.rollsById[rollListId].maxTotalDuration || Number.MAX_SAFE_INTEGER,
                        playerInstance.rollsById[rollListId].maxTotalQuantity || Number.MAX_SAFE_INTEGER,
                        triggerFallbackOnNoAd,
                    );

                    (playableAds && playableAds.length) ? callback(true, playableAds) : callback(false);
                } catch (error) {
                    callback(false);
                }
            })
            .catch(() => {
                return callback(false);
            });
    };

    playerInstance.setVastList = () => {
        const rolls = {};
        const rollsGroupedByType = { preRoll: [], postRoll: [], midRoll: [], onPauseRoll: [] };
        const def = {
            id: null,
            roll: null,
            vastLoaded: false,
            error: false,
            adText: null,
            adTextPosition: null,
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

                let rollItem = playerInstance.displayOptions.vastOptions.adList[key];

                if (validateRequiredParams(rollItem)) {
                    playerInstance.announceLocalError(102, 'Wrong adList parameters.');
                    continue;
                }
                const id = 'ID' + idPart;

                rolls[id] = Object.assign({}, def);
                rolls[id] = Object.assign(rolls[id], playerInstance.displayOptions.vastOptions.adList[key]);
                if (rollItem.roll === 'midRoll') {
                    rolls[id].error = validateVastList('midRoll', rollItem);
                }
                rolls[id].id = id;
                rolls[id].ads = [];
                idPart++;

            }
        }

        // group the ads by roll
        // pushing object references and forming json
        Object.keys(rolls).map(function (e) {
            switch (rolls[e].roll.toLowerCase()) {
                case 'preRoll'.toLowerCase():
                    rollsGroupedByType.preRoll.push(rolls[e]);
                    break;
                case 'midRoll'.toLowerCase():
                    rollsGroupedByType.midRoll.push(rolls[e]);
                    break;
                case 'postRoll'.toLowerCase():
                    rollsGroupedByType.postRoll.push(rolls[e]);
                    break;
                case 'onPauseRoll'.toLowerCase():
                    rollsGroupedByType.onPauseRoll.push(rolls[e]);
                    break;
                default:
                    console.error(`${rolls[e].roll.toLowerCase()} is not a recognized roll`);
                    break;
            }
        });

        playerInstance.adGroupedByRolls = rollsGroupedByType;
        playerInstance.rollsById = rolls;
    };

    playerInstance.onVastAdEnded = (event) => {
        if (event) {
            event.stopImmediatePropagation();
        }
        playerInstance.vastOptions.adFinished = true;
        //"this" is the HTML5 video tag, because it dispatches the "ended" event
        playerInstance.deleteVastAdElements();
        playerInstance.checkForNextAd();
    };

    playerInstance.vastLogoBehaviour = (vastPlaying) => {
        if (!playerInstance.displayOptions.layoutControls.logo.showOverAds) {
            const logoHolder = playerInstance.domRef.wrapper.querySelector('.logo_holder');

            if (!logoHolder) {
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
