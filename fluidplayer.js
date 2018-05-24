var fluidPlayerScriptLocation = function() {
    var currentSrc = '';

    if (document.currentScript) {
        currentSrc = document.currentScript.src;

    } else {
        //IE
        currentSrc = (function() {
            var scripts = document.getElementsByTagName('script'),
                script = scripts[scripts.length - 1];

            if (script.getAttribute.length !== undefined) {
                return script.src;
            }

            return script.getAttribute('src', -1)
        }());
    }

    if (currentSrc) {
        return currentSrc.substring(0, currentSrc.lastIndexOf('/') + 1);
    }

    return '';
}();

//Object.assign polyfill
if (typeof Object.assign != 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
        value: function assign(target, varArgs) { // .length of function is 2
            'use strict';
            if (target == null) { // TypeError if undefined or null
                throw new TypeError('Cannot convert undefined or null to object');
            }

            var to = Object(target);

            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];

                if (nextSource != null) { // Skip over if undefined or null
                    for (var nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        writable: true,
        configurable: true
    });
}

//CustomEvent polyfill
(function () {

    if ( typeof window.CustomEvent === "function" ) return false;

    function CustomEvent ( event, params ) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent( 'CustomEvent' );
        evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
        return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
})();

fluidPlayer = function(idVideoPlayer, options) {
    var inArray = function(needle, haystack) {
        var length = haystack.length;

        for (var i = 0; i < length; i++) {
            if (haystack[i] == needle) {
                return true;
            }
        }

        return false;
    };

    var copy = fluidPlayerClass.constructor();
    for (var attr in fluidPlayerClass) {
        if (fluidPlayerClass.hasOwnProperty(attr) && !inArray(attr, fluidPlayerClass.notCloned)) {
            copy[attr] = fluidPlayerClass[attr];
        }
    }

    fluidPlayerClass.instances.push(copy);

    copy.init(idVideoPlayer, options);

    return copy;
};

var fluidPlayerClass = {
    vttParserScript: '/scripts/webvtt.js',
    instances: [],
    notCloned: ['notCloned', 'vttParserScript', 'instances', 'getInstanceById',
        'requestStylesheet', 'reqiestScript', 'isTouchDevice', 'vastOptions',
        'displayOptions', 'getEventOffsetX', 'getEventOffsetY', 'getTranslateX',
        'toggleElementText', 'getMobileOs', 'findClosestParent', 'activeVideoPlayerId',
        'getInstanceIdByWrapperId', 'timer', 'timerPool', 'adList', 'adPool',
        'isUserActive', 'isCurrentlyPlayingAd', 'initialAnimationSet'],
    version: '2.2.1',
    homepage: 'https://www.fluidplayer.com/',
    activeVideoPlayerId: null,

    getInstanceById: function(playerId) {
        for (var i = 0; i < this.instances.length; i++) {
            if (this.instances[i].videoPlayerId === playerId) {
                return this.instances[i];
            }
        }

        return null;
    },

    getInstanceIdByWrapperId: function(wrapperId) {
        return typeof wrapperId != "undefined" ? wrapperId.replace('fluid_video_wrapper_', '') : null;
    },

    requestStylesheet: function(cssId, url) {
        if (!document.getElementById(cssId)) {
            var head   = document.getElementsByTagName('head')[0];
            var link   = document.createElement('link');

            link.id    = cssId;
            link.rel   = 'stylesheet';
            link.type  = 'text/css';
            link.href  = url;
            link.media = 'all';

            head.appendChild(link);
        }
    },

    requestScript: function(url, callback) {
        // Adding the script tag to the head
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;

        // Then bind the event to the callback function.
        // There are several events for cross browser compatibility.
        script.onreadystatechange = callback;
        script.onload = callback;

        // Fire the loading
        head.appendChild(script);
    },

    isTouchDevice: function() {
        return !!('ontouchstart' in window        // works on most browsers
            || navigator.maxTouchPoints);       // works on IE10/11 and Surface
    },

    /**
     * Distinguises iOS from Android devices and the OS version.
     *
     * @returns object
     */
    getMobileOs: function() {
        var ua = navigator.userAgent;
        var uaindex;

        var result = {device: false, userOs: false, userOsVer: false, userOsMajor: false};

        // determine OS
        if (ua.match(/iPad/i)) {
            result.device = 'iPad';
            result.userOs = 'iOS';
            uaindex = ua.indexOf('OS ');

        } else if (ua.match(/iPhone/i)) {
            result.device = 'iPhone';
            result.userOs = 'iOS';
            uaindex = ua.indexOf('OS ');

        } else if (ua.match(/Android/i)) {
            result.userOs = 'Android';
            uaindex = ua.indexOf('Android ');

        } else {
            result.userOs = false;
        }

        // determine version
        if (result.userOs === 'iOS' && (uaindex > -1)) {
            var userOsTemp = ua.substr(uaindex + 3);
            var indexOfEndOfVersion = userOsTemp.indexOf(' ');

            if (indexOfEndOfVersion !== -1) {
                result.userOsVer = userOsTemp.substring(0, userOsTemp.indexOf(' ')).replace(/_/g, '.');
                result.userOsMajor = parseInt(result.userOsVer);
            }

        } else if (result.userOs === 'Android' && (uaindex > -1)) {
            result.userOsVer = ua.substr(uaindex + 8, 3);

        } else {
            result.userOsVer = false;
        }

        return result;
    },

    /**
     * Browser detection
     *
     * @returns object
     */
    getBrowserVersion: function() {

        var ua = navigator.userAgent;
        var result = {browserName: false, fullVersion: false, majorVersion: false, userOsMajor: false};
        var idx, uaindex;

        try {

            result.browserName = navigator.appName;

            if ((idx = ua.indexOf("OPR/")) != -1) {
                result.browserName = "Opera";
                result.fullVersion = ua.substring(idx + 4);
            }
            else if ((idx = ua.indexOf("Opera")) != -1) {
                result.browserName = "Opera";
                result.fullVersion = ua.substring(idx + 6);
                if ((idx = ua.indexOf("Version")) != -1)
                    result.fullVersion = ua.substring(idx + 8);
            }
            else if ((idx = ua.indexOf("MSIE")) != -1) {
                result.browserName = "Microsoft Internet Explorer";
                result.fullVersion = ua.substring(idx + 5);
            }
            else if ((idx = ua.indexOf("Chrome")) != -1) {
                result.browserName = "Google Chrome";
                result.fullVersion = ua.substring(idx + 7);
            }
            else if ((idx = ua.indexOf("Safari")) != -1) {
                result.browserName = "Safari";
                result.fullVersion = ua.substring(idx + 7);
                if ((idx = ua.indexOf("Version")) != -1)
                    result.fullVersion = ua.substring(idx + 8);
            }
            else if ((idx = ua.indexOf("Firefox")) != -1) {
                result.browserName = "Mozilla Firefox";
                result.fullVersion = ua.substring(idx + 8);
            }
            // Others "name/version" is at the end of userAgent
            else if ((uaindex = ua.lastIndexOf(' ') + 1) < (idx = ua.lastIndexOf('/'))) {
                result.browserName = ua.substring(uaindex, idx);
                result.fullVersion = ua.substring(idx + 1);
                if (result.browserName.toLowerCase() == result.browserName.toUpperCase()) {
                    result.browserName = navigator.appName;
                }
            }

            // trim the fullVersion string at semicolon/space if present
            if ((uaindex = result.fullVersion.indexOf(';')) != -1) {
                result.fullVersion = result.fullVersion.substring(0, uaindex);
            }
            if ((uaindex = result.fullVersion.indexOf(' ')) != -1) {
                result.fullVersion = result.fullVersion.substring(0, uaindex);
            }

            result.majorVersion = parseInt('' + result.fullVersion, 10);
            if (isNaN(result.majorVersion)) {
                result.fullVersion = '' + parseFloat(navigator.appVersion);
                result.majorVersion = parseInt(navigator.appVersion, 10);
            }
        } catch (e) {
            //Return default obj.
        }

        return result;
    },

    getCurrentVideoDuration: function() {
        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        if (videoPlayerTag) {
            return videoPlayerTag.duration;
        }

        return 0;
    },

    getClickThroughUrlFromLinear: function(linear) {
        var videoClicks = linear.getElementsByTagName('VideoClicks');

        if (videoClicks.length) {//There should be exactly 1 node
            var clickThroughs = videoClicks[0].getElementsByTagName('ClickThrough');

            if (clickThroughs.length) {
                return this.extractNodeData(clickThroughs[0]);
            }
        }

        return false;
    },


    getVastAdTagUriFromWrapper: function(wrapper) {

        if (typeof wrapper !== 'undefined' && wrapper.length) {

            var vastAdTagURI = wrapper[0].getElementsByTagName('VASTAdTagURI');
            if (vastAdTagURI.length) {
                return vastAdTagURI[0].childNodes[0].nodeValue;
            }
        }

        return false;
    },


    hasInLine: function (xmlResponse) {
        var inLine = xmlResponse.getElementsByTagName('InLine');
        return ((typeof inLine !== 'undefined') && inLine.length);
    },


    hasVastAdTagUri: function (xmlResponse) {
        var vastAdTagURI = xmlResponse.getElementsByTagName('VASTAdTagURI');
        return ((typeof vastAdTagURI !== 'undefined') && vastAdTagURI.length);
    },

    hasVastAdTagUriFromWrapper: function(creative) {
        var player = this;

        if ((typeof creative !== 'undefined') && creative.length) {
            var arrayCreativeLinears = creative[0].getElementsByTagName('Linear');
            if ((typeof arrayCreativeLinears !== 'undefined') && (arrayCreativeLinears !== null) && arrayCreativeLinears.length) {
                return player.getMediaFileFromLinear(arrayCreativeLinears[0]);
            }
        }

        return false;
    },

    getClickThroughUrlFromNonLinear: function (nonLinear) {
        var result = '';
        var nonLinears = nonLinear.getElementsByTagName('NonLinear');

        if (nonLinears.length) {//There should be exactly 1 node
            var nonLinearClickThrough = nonLinear.getElementsByTagName('NonLinearClickThrough');
            if (nonLinearClickThrough.length) {
                result = this.extractNodeData(nonLinearClickThrough[0]);
            }
        }

        return result;
    },


    getTrackingFromLinear: function(linear) {
        var trackingEvents = linear.getElementsByTagName('TrackingEvents');

        if (trackingEvents.length) {//There should be no more than one node
            return trackingEvents[0].getElementsByTagName('Tracking');
        }

        return [];
    },

    getDurationFromLinear: function(linear) {
        var duration = linear.getElementsByTagName('Duration');

        if (duration.length && (typeof duration[0].childNodes[0] !== 'undefined')) {
            var nodeDuration = this.extractNodeData(duration[0]);
            return this.convertTimeStringToSeconds(nodeDuration);
        }

        return false;
    },

    getDurationFromNonLinear: function(tag) {
        var result = 0;
        var nonLinear = tag.getElementsByTagName('NonLinear');
        if (nonLinear.length && (typeof nonLinear[0].getAttribute('minSuggestedDuration') !== 'undefined')) {
            result = this.convertTimeStringToSeconds(nonLinear[0].getAttribute('minSuggestedDuration'));
        }
        return result;
    },

    getDimensionFromNonLinear: function (tag) {
        var result = {'width': null, 'height': null};
        var nonLinear = tag.getElementsByTagName('NonLinear');
        if (nonLinear.length) {
            if (typeof nonLinear[0].getAttribute('width') !== 'undefined') {
                result.width = nonLinear[0].getAttribute('width');
            }
            if (typeof nonLinear[0].getAttribute('height') !== 'undefined') {
                result.height = nonLinear[0].getAttribute('height');
            }
        }
        return result;
    },

    getCreativeTypeFromStaticResources: function (tag) {
        var result = '';
        var nonLinears = tag.getElementsByTagName('NonLinear');

        if (nonLinears.length && (typeof nonLinears[0].childNodes[0] !== 'undefined')) {//There should be exactly 1 StaticResource node
            result = nonLinears[0].getElementsByTagName('StaticResource')[0].getAttribute('creativeType');
        }

        return result.toLowerCase();
    },

    getMediaFilesFromLinear: function(linear) {
        var mediaFiles = linear.getElementsByTagName('MediaFiles');

        if (mediaFiles.length) {//There should be exactly 1 MediaFiles node
            return mediaFiles[0].getElementsByTagName('MediaFile');
        }

        return [];
    },

    getStaticResourcesFromNonLinear: function(linear) {
        var result = [];
        var nonLinears = linear.getElementsByTagName('NonLinear');

        if (nonLinears.length) {//There should be exactly 1 StaticResource node
            result = nonLinears[0].getElementsByTagName('StaticResource');
        }

        return result;
    },

    extractNodeData: function(parentNode) {
        var contentAsString = "";
        for(var n = 0; n < parentNode.childNodes.length; n ++)
        {
            var child = parentNode.childNodes[n];
            if (child.nodeType === 8 || (child.nodeType === 3 && /^\s*$/.test(child.nodeValue))) {
                // Comments or text with no content
            } else {
                contentAsString += child.nodeValue;
            }
        }
        var tidyString = contentAsString.replace(/(^\s+|\s+$)/g,'');
        return tidyString;
    },

    getMediaFileFromLinear: function(linear) {
        var mediaFile;
        var mediaFiles = this.getMediaFilesFromLinear(linear);

        if (mediaFiles.length) {
            mediaFile = this.extractNodeData(mediaFiles[0]);
        }

        return mediaFile;
    },

    getIconClickThroughFromLinear: function (linear) {
        var iconClickThrough = linear.getElementsByTagName('IconClickThrough');

        if (iconClickThrough.length) {
            return this.extractNodeData(iconClickThrough[0]);
        } else {
            this.displayOptions.vastOptions.adCTAText = false;
        }

        return '';
    },

    getStaticResourceFromNonLinear: function(linear) {
        var fallbackStaticResource;
        var staticResources = this.getStaticResourcesFromNonLinear(linear);

        for (var i = 0; i < staticResources.length; i++) {
            if (!staticResources[i].getAttribute('type')) {
                fallbackStaticResource = this.extractNodeData(staticResources[i]);
            }

            if (staticResources[i].getAttribute('type') === this.displayOptions.staticResource) {
                return this.extractNodeData(staticResources[i]);
            }
        }

        return fallbackStaticResource;
    },

    registerTrackingEvents: function(creativeLinear, tmpOptions) {
        var trackingEvents = this.getTrackingFromLinear(creativeLinear);
        var eventType = '';
        var oneEventOffset = 0;

        for (var i = 0; i < trackingEvents.length; i++) {
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

                    oneEventOffset = this.convertTimeStringToSeconds(trackingEvents[i].getAttribute('offset'));

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
    },

    registerImpressionEvents: function(impressionTags, tmpOptions) {
        if (impressionTags.length) {

            for (var i = 0; i < impressionTags.length; i++) {
                var impressionEvent = this.extractNodeData(impressionTags[i]);
                tmpOptions.impression.push(impressionEvent);
            }
        }
    },

    registerErrorEvents: function(errorTags, tmpOptions) {
        if (
            (typeof errorTags !== 'undefined') &&
            (errorTags !== null) &&
            (errorTags.length === 1) && //Only 1 Error tag is expected
            (errorTags[0].childNodes.length === 1)
        ) {
            tmpOptions.errorUrl = errorTags[0].childNodes[0].nodeValue;
        }
    },

    announceError: function(code) {
        if (
            (typeof this.vastOptions.errorUrl === 'undefined') ||
            !this.vastOptions.errorUrl
        ) {
            return;
        }

        if (typeof(code) !== 'undefined') {
            code = parseInt(code);
        } else {
            //Set a default code (900 Unidentified error)
            code = 900;
        }

        var errorUrl = this.vastOptions.errorUrl.replace('[ERRORCODE]' , code);

        //Send the error request
        this.callUris([errorUrl]);
    },


    announceLocalError: function (code, msg) {
        if (typeof(code) !== 'undefined') {
            code = parseInt(code);
        } else {
            //Set a default code (900 Unidentified error)
            code = 900;
        }
        message = '[Error] (' + code + '): ';
        message += (!msg) ? 'Failed to load Vast' : msg;
        console.log(message);
    },

    getClickTrackingEvents: function(linear) {
        var result = [];

        var videoClicks = linear.getElementsByTagName('VideoClicks');

        if (videoClicks.length) {//There should be exactly 1 node
            var clickTracking = videoClicks[0].getElementsByTagName('ClickTracking');

            if (clickTracking.length) {
                for (var i = 0; i < clickTracking.length; i++) {
                    var clickTrackingEvent = this.extractNodeData(clickTracking[i]);
                    result.push(clickTrackingEvent);
                }
            }
        }

        return result;
    },


    getNonLinearClickTrackingEvents: function (nonLinear) {
        var result = '';
        var nonLinears = nonLinear.getElementsByTagName('NonLinear');

        if (nonLinears.length) {//There should be exactly 1 node
            var clickTracking = nonLinear.getElementsByTagName('NonLinearClickTracking');
            if (clickTracking.length) {
                result = this.extractNodeData(clickTracking[0]);
            }
        }

        return result;
    },

    callUris: function(uris) {
        for (var i = 0; i < uris.length; i++) {
            new Image().src = uris[i];
        }
    },

    recalculateAdDimensions: function(idVideoPlayer) {
        if ((!idVideoPlayer) && (typeof this.videoPlayerId !== 'undefined')) {
            var idVideoPlayer = this.videoPlayerId;
        }

        var videoPlayer     = document.getElementById(idVideoPlayer);
        var divClickThrough = document.getElementById('vast_clickthrough_layer_' + idVideoPlayer);

        if (divClickThrough) {
            divClickThrough.style.width  = videoPlayer.offsetWidth + 'px';
            divClickThrough.style.height = videoPlayer.offsetHeight + 'px';
        }

        var requestFullscreenFunctionNames = this.checkFullscreenSupport('fluid_video_wrapper_' + idVideoPlayer);
        var fullscreenButton = document.getElementById(idVideoPlayer + '_fluid_control_fullscreen');
        var menuOptionFullscreen = document.getElementById(idVideoPlayer + 'context_option_fullscreen');

        if (requestFullscreenFunctionNames) {
            // this will go other way around because we alredy exited full screen
            if (document[requestFullscreenFunctionNames.isFullscreen] === null) {
                // Exit fullscreen
                this.fullscreenOff(fullscreenButton, menuOptionFullscreen);
            } else {
                // Go fullscreen
                this.fullscreenOn(fullscreenButton, menuOptionFullscreen);
            }
        } else {
            //The browser does not support the Fullscreen API, so a pseudo-fullscreen implementation is used
            if (fullscreenTag.className.search(/\bpseudo_fullscreen\b/g) !== -1) {
                fullscreenTag.className += ' pseudo_fullscreen';
                this.fullscreenOn(fullscreenButton, menuOptionFullscreen);
            } else {
                fullscreenTag.className = fullscreenTag.className.replace(/\bpseudo_fullscreen\b/g, '');
                this.fullscreenOff(fullscreenButton, menuOptionFullscreen);
            }
        }
    },

    prepareVast: function (roll) {
        var player = this;
        var videoPlayerTag = document.getElementById(this.videoPlayerId);
        var list = [];
        list.length = 0;

        list = player.findRoll(roll);

        for (var i = 0; i < list.length; i++) {
            var adListId = list[i];

            if (player.adList[adListId].vastLoaded !== true && player.adList[adListId].error !== true) {
                player.processUrl(player.adList[adListId].vastTag, adListId);
                videoPlayerTag.addEventListener('adId_' + adListId, player[roll]);
            }
        }
    },

    toggleLoader: function(showLoader) {
        if (this.displayOptions.layoutControls.layout=== 'browser') {
            //The browser handles all the layout of the video tag
            return;
        }

        var loaderDiv = document.getElementById('vast_video_loading_' + this.videoPlayerId);

        if (showLoader) {
            loaderDiv.style.display = 'table';
        } else {
            loaderDiv.style.display = 'none';
        }
    },

    sendRequest: function(url, withCredentials, timeout, functionReadyStateChange) {
        var xmlHttpReq = new XMLHttpRequest();

        xmlHttpReq.onreadystatechange = functionReadyStateChange;

        xmlHttpReq.open('GET', url, true);
        xmlHttpReq.withCredentials = withCredentials;
        xmlHttpReq.timeout = timeout;
        xmlHttpReq.send();
    },

    playMainVideoWhenVastFails: function(errorCode) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        videoPlayerTag.removeEventListener('loadedmetadata', player.switchPlayerToVastMode);
        videoPlayerTag.pause();
        player.toggleLoader(false);
        player.displayOptions.vastOptions.vastAdvanced.noVastVideoCallback();

        if (!player.vastOptions || typeof this.vastOptions.errorUrl === 'undefined') {
            player.announceLocalError(errorCode);
        } else {
            player.announceError(errorCode);
        }

        player.switchToMainVideo();
    },

    switchPlayerToVastMode: function() {},


    /**
     * Process the XML response
     *
     * @param xmlResponse
     * @param adListId
     * @param tmpOptions
     */
    processVastXml: function (xmlResponse, adListId, tmpOptions) {
        var player = this;

        if (!xmlResponse) {
            player.stopProcessAndReportError(adListId);
            return;
        }

        //Get impression tag
        var impression = xmlResponse.getElementsByTagName('Impression');
        if (impression !== null) {
            player.registerImpressionEvents(impression, tmpOptions);
        }

        //Get the error tag, if any
        var errorTags = xmlResponse.getElementsByTagName('Error');
        if (errorTags !== null) {
            player.registerErrorEvents(errorTags, tmpOptions);
        }


        //Get Creative
        var creative = xmlResponse.getElementsByTagName('Creative');

        //Currently only 1 creative and 1 linear is supported
        if ((typeof creative !== 'undefined') && creative.length) {
            var arrayCreativeLinears = creative[0].getElementsByTagName('Linear');

            if ((typeof arrayCreativeLinears !== 'undefined') && (arrayCreativeLinears !== null) && arrayCreativeLinears.length) {

                var creativeLinear = arrayCreativeLinears[0];
                player.registerTrackingEvents(creativeLinear, tmpOptions);

                //Extract the Ad data if it is actually the Ad (!wrapper)
                if (!player.hasVastAdTagUri(xmlResponse) && player.hasInLine(xmlResponse)) {

                    //Set initial values
                    tmpOptions.skipoffset = false;
                    tmpOptions.adFinished = false;
                    tmpOptions.adType = 'linear';

                    //Extract the necessary data from the Linear node
                    tmpOptions.skipoffset = player.convertTimeStringToSeconds(creativeLinear.getAttribute('skipoffset'));
                    tmpOptions.clickthroughUrl = player.getClickThroughUrlFromLinear(creativeLinear);
                    tmpOptions.clicktracking = player.getClickTrackingEvents(creativeLinear);
                    tmpOptions.duration = player.getDurationFromLinear(creativeLinear);
                    tmpOptions.mediaFile = player.getMediaFileFromLinear(creativeLinear);
                    tmpOptions.iconClick = player.getIconClickThroughFromLinear(creativeLinear);

                }
            }

            if ((typeof tmpOptions.iconClick !== 'undefined') && (tmpOptions.iconClick !== null) && tmpOptions.iconClick.length) {
                player.adList[adListId].landingPage = tmpOptions.iconClick;
            }

            var arrayCreativeNonLinears = creative[0].getElementsByTagName('NonLinearAds');

            if ((typeof arrayCreativeNonLinears !== 'undefined') && (arrayCreativeNonLinears !== null) && arrayCreativeNonLinears.length) {

                var creativeNonLinear = arrayCreativeNonLinears[0];
                player.registerTrackingEvents(creativeNonLinear, tmpOptions);

                //Extract the Ad data if it is actually the Ad (!wrapper)
                if (!player.hasVastAdTagUri(xmlResponse) && player.hasInLine(xmlResponse)) {

                    //Set initial values
                    tmpOptions.adType = 'nonLinear';

                    //Extract the necessary data from the NonLinear node
                    tmpOptions.clickthroughUrl = player.getClickThroughUrlFromNonLinear(creativeNonLinear);
                    tmpOptions.clicktracking = player.getNonLinearClickTrackingEvents(creativeNonLinear);
                    tmpOptions.duration = player.getDurationFromNonLinear(creativeNonLinear);
                    tmpOptions.dimension = player.getDimensionFromNonLinear(creativeNonLinear);
                    tmpOptions.staticResource = player.getStaticResourceFromNonLinear(creativeNonLinear);
                    tmpOptions.creativeType = player.getCreativeTypeFromStaticResources(creativeNonLinear);
                }
            }

            //Extract the Ad data if it is actually the Ad (!wrapper)
            if (!player.hasVastAdTagUri(xmlResponse) && player.hasInLine(xmlResponse)) {

                player.adList[adListId].adType = tmpOptions.adType ? tmpOptions.adType : 'unknown';

                if (typeof tmpOptions.mediaFile !== 'undefined' || typeof tmpOptions.staticResource !== 'undefined') {

                    player.adList[adListId].vastLoaded = true;
                    player.adPool[adListId] = Object.assign({}, tmpOptions);
                    var event = document.createEvent('Event');
                    event.initEvent('adId_' + adListId, false, true);
                    document.getElementById(player.videoPlayerId).dispatchEvent(event);

                } else {

                    player.stopProcessAndReportError(adListId);

                }

            }
        } else {
            player.stopProcessAndReportError(adListId);
        }

    },


    /**
     * Parse the VAST Tag
     *
     * @param vastTag
     * @param adListId
     */
    processUrl: function (vastTag, adListId) {
        var player = this;
        var numberOfJumps = 0;

        var tmpOptions = {
            tracking: [],
            stopTracking: [],
            impression: [],
            vastLoaded: false
        };

        var resolveVastTag = function (vastTag, callback, numberOfJumps) {

            var handleXmlHttpReq = function () {
                var xmlHttpReq = this;

                if ((xmlHttpReq.readyState === 4) && (xmlHttpReq.status !== 200)) {
                    player.stopProcessAndReportError(adListId);
                    return;
                }

                if (!((xmlHttpReq.readyState === 4) && (xmlHttpReq.status === 200))) {
                    return;
                }

                try {
                    var xmlResponse = xmlHttpReq.responseXML;
                } catch (e) {
                    player.stopProcessAndReportError(adListId);
                    return;
                }

                if (!xmlResponse) {
                    player.stopProcessAndReportError(adListId);
                    return;
                }

                player.inLineFound = player.hasInLine(xmlResponse);

                if (!player.inLineFound) {
                    var wrapper = xmlResponse.getElementsByTagName('Wrapper');

                    if ((typeof wrapper !== 'undefined') && wrapper.length) {

                        var vastAdTagURI = xmlResponse.getElementsByTagName('VASTAdTagURI');

                        if ((typeof vastAdTagURI !== 'undefined') && vastAdTagURI.length) {
                            resolveVastTag(player.getVastAdTagUriFromWrapper(wrapper), callback, numberOfJumps);
                        }

                    }

                }

                if (numberOfJumps >= player.displayOptions.vastOptions.maxVastTagJumps && !player.inLineFound) {
                    player.stopProcessAndReportError(adListId);
                    return;
                }

                if (player.inLineFound) {
                    callback(numberOfJumps);
                }
                player.processVastXml(xmlResponse, adListId, tmpOptions);
            };

            if (numberOfJumps <= player.displayOptions.vastOptions.maxVastTagJumps) {

                player.sendRequest(
                    vastTag,
                    true,
                    player.displayOptions.vastOptions.vastTimeout,
                    handleXmlHttpReq
                );

            }

            numberOfJumps++;
        };


        resolveVastTag(vastTag, function (numberOfJumps) {
            //console.log('numberOfJumps:', numberOfJumps);
            player.displayOptions.vastOptions.vastAdvanced.vastLoadedCallback();
        }, numberOfJumps);

    },

    /**
     * Helper function to stop processing
     *
     * @param adListId
     */
    stopProcessAndReportError: function(adListId) {
        var player = this;

        //Set the error flag for the Ad
        player.adList[adListId].error = true;

        //The response returned an error. Proceeding with the main video.
        //Try to switch main video only if it is a preRoll scenario
        if (typeof adListId !== 'undefined' && player.adList[adListId]['roll'] == 'preRoll') {
            player.playMainVideoWhenVastFails(900);
        } else {
            player.announceLocalError(101);
        }

    },

    playRoll: function(adListId) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        if (!player.adPool.hasOwnProperty(adListId)) {
            player.announceLocalError(101);
            return;
        }
        var roll = player.adList[adListId].roll;

        //get the proper ad
        player.vastOptions = player.adPool[adListId];

        //spec configs by roll
        switch (roll) {
            case 'midRoll':
                videoPlayerTag.mainVideoCurrentTime = videoPlayerTag.currentTime - 1;
                break;

            case 'postRoll':
                videoPlayerTag.mainVideoCurrentTime = 0;
                player.autoplayAfterAd = false;
                videoPlayerTag.currentTime = player.mainVideoDuration;
                break;
        }


        var playVideoPlayer = function(adListId) {
            player.switchPlayerToVastMode = function() {
                //Get the actual duration from the video file if it is not present in the VAST XML
                if (!player.vastOptions.duration) {
                    player.vastOptions.duration = videoPlayerTag.duration;
                }

                player.addClickthroughLayer(player.videoPlayerId);
                if (player.vastOptions.skipoffset !== false) {
                    player.addSkipButton();
                }

                player.addCTAButton(player.adList[adListId].landingPage);

                player.addAdCountdown();

                videoPlayerTag.removeAttribute('controls'); //Remove the default Controls

                player.vastLogoBehaviour(true);

                if (player.displayOptions.layoutControls.layout!== 'browser') {
                    var progressbarContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');

                    if (progressbarContainer !== null) {
                        document.getElementById(player.videoPlayerId + '_vast_control_currentprogress').style.backgroundColor = player.displayOptions.layoutControls.adProgressColor;
                    }
                }

                if (player.displayOptions.vastOptions.adText) {
                    player.addAdPlayingText(player.displayOptions.vastOptions.adText);
                }

                player.positionTextElements();

                player.toggleLoader(false);
                player.adList[adListId].played = true;
                player.adFinished = false;
                videoPlayerTag.play();

                //Announce the impressions
                player.trackSingleEvent('impression');

                videoPlayerTag.removeEventListener('loadedmetadata', player.switchPlayerToVastMode);
            };

            videoPlayerTag.pause();

            videoPlayerTag.addEventListener('loadedmetadata', player.switchPlayerToVastMode);

            //Store the current time of the main video
            player.mainVideoCurrentTime = videoPlayerTag.currentTime;

            // Remove the streaming objects to prevent errors on the VAST content
            player.detachStreamers();

            videoPlayerTag.src = player.vastOptions.mediaFile;
            player.isCurrentlyPlayingAd = true;
            if (player.displayOptions.vastOptions.showProgressbarMarkers) {
                player.hideAdMarkers();
            }
            videoPlayerTag.load();

            //Handle the ending of the Pre-Roll ad
            videoPlayerTag.addEventListener('ended', player.onVastAdEnded);
        };


        /**
         * Sends requests to the tracking URIs
         */
        var videoPlayerTimeUpdate = function() {
            if (player.adFinished) {
                videoPlayerTag.removeEventListener('timeupdate', videoPlayerTimeUpdate);
                return;
            }

            var currentTime = Math.floor(videoPlayerTag.currentTime);
            if (player.vastOptions.duration != 0) {
                player.scheduleTrackingEvent(currentTime, player.vastOptions.duration);
            }

            if (currentTime >= (player.vastOptions.duration - 1 ) && player.vastOptions.duration != 0) {
                videoPlayerTag.removeEventListener('timeupdate', videoPlayerTimeUpdate);
                player.adFinished = true;
            }
        };

        playVideoPlayer(adListId);

        videoPlayerTag.addEventListener('timeupdate', videoPlayerTimeUpdate);
    },

    scheduleTrackingEvent : function(currentTime, duration) {
        var player = this;
        if (currentTime == 0) {
            player.trackSingleEvent('start');
        }

        if (
            (typeof player.vastOptions.tracking['progress'] !== 'undefined') &&
            (player.vastOptions.tracking['progress'].length) &&
            (typeof player.vastOptions.tracking['progress'][currentTime] !== 'undefined')
        ) {
            player.trackSingleEvent('progress', currentTime);
        }

        if (currentTime == (Math.floor(duration / 4))) {
            player.trackSingleEvent('firstQuartile');
        }

        if (currentTime == (Math.floor(duration / 2))) {
            player.trackSingleEvent('midpoint');
        }

        if (currentTime == (Math.floor(duration * 3 / 4))) {
            player.trackSingleEvent('thirdQuartile');
        }

        if (currentTime >= (duration - 1 )) {
            player.trackSingleEvent('complete');
        }
    },

    trackSingleEvent : function(eventType, eventSubType) {
        var player = this;
        var trackingUris = [];
        trackingUris.length = 0;

        switch (eventType) {
            case 'start':
            case 'firstQuartile':
            case 'midpoint':
            case 'thirdQuartile':
            case 'complete':
                if (player.vastOptions.stopTracking[eventType] === false) {
                    if (player.vastOptions.tracking[eventType] !== null) {
                        trackingUris = player.vastOptions.tracking[eventType];
                    }

                    player.vastOptions.stopTracking[eventType] = true;
                }

                break;

            case 'progress':
                player.vastOptions.tracking['progress'][eventSubType].elements.forEach(function(currentValue, index) {
                    if (
                        (player.vastOptions.tracking['progress'][eventSubType].stopTracking === false) &&
                        (player.vastOptions.tracking['progress'][eventSubType].elements.length)
                    ) {
                        trackingUris = player.vastOptions.tracking['progress'][eventSubType].elements;
                    }

                    player.vastOptions.tracking['progress'][eventSubType].stopTracking = true;
                });
                break;

            case 'impression':
                if (
                    (typeof player.vastOptions.impression !== 'undefined') &&
                    (player.vastOptions.impression !== null) &&
                    (typeof player.vastOptions.impression.length !== 'unknown')
                ) {
                    trackingUris = player.vastOptions.impression;
                }
                break;

            default:
                break;
        }

        player.callUris(trackingUris);
    },


    completeNonLinearStatic: function (adListId) {
        var player = this;
        player.closeNonLinear(adListId);
        if(player.adFinished == false) {
            player.adFinished = true;
            player.trackSingleEvent('complete');
        }
        clearInterval(player.nonLinearTracking);
    },


    /**
     * Show up a nonLinear static creative
     */
    createNonLinearStatic: function (adListId) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        if (!player.adPool.hasOwnProperty(adListId) || player.adPool[adListId].error === true) {
            player.announceLocalError(101);
            return;
        }

        //get the proper ad
        player.vastOptions = player.adPool[adListId];
        player.createBoard(adListId);

        player.adFinished = false;
        player.trackSingleEvent('start');

        var duration = (player.adList[adListId].nonLinearDuration) ? player.adList[adListId].nonLinearDuration : player.vastOptions.duration;

        player.nonLinearTracking = setInterval(function () {

            if (player.adFinished !== true) {

                var currentTime = Math.floor(videoPlayerTag.currentTime);
                player.scheduleTrackingEvent(currentTime, duration);

                if (currentTime >= (duration - 1 )) {
                    player.adFinished = true;
                }
            }
        }, 400);


        time = parseInt(player.getCurrentTime()) + parseInt(duration);
        player.scheduleTask({time: time, closeStaticAd: adListId});
    },


    /**
     * Adds a nonLinear static Image banner
     *
     * currently only image/gif, image/jpeg, image/png supported
     */
    createBoard: function (adListId) {

        var player = this;
        var vastSettings = player.adPool[adListId];

        if (typeof vastSettings.staticResource === 'undefined'
            || player.supportedStaticTypes.indexOf(vastSettings.creativeType) === -1) {
            player.adList[adListId].error = true;
            return;
        }

        player.adList[adListId].played = true;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        var playerWidth = videoPlayerTag.clientWidth;
        var playerHeight = videoPlayerTag.clientHeight;
        var board = document.createElement('div');
        var vAlign = (player.adList[adListId].vAlign) ? player.adList[adListId].vAlign : player.nonLinearVerticalAlign;

        var creative = new Image();
        creative.src = vastSettings.staticResource;
        creative.id = 'fluid_nonLinear_imgCreative_' + adListId + '_' + player.videoPlayerId;
        creative.onload = function () {

            //Set banner size based on the below priority
            // 1. adList -> roll -> size
            // 2. VAST XML width/height attriubute (VAST 3.)
            // 3. VAST XML static resource dimension
            if(typeof player.adList[adListId].size !== 'undefined') {
                origWidth = player.adList[adListId].size.split('x')[0];
                origHeight = player.adList[adListId].size.split('x')[1];
            } else if(vastSettings.dimension.width && vastSettings.dimension.height) {
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

            img = document.getElementById(creative.id);
            img.width = newBannerWidth;
            img.height = newBannerHeight;

        };

        board.id = 'fluid_nonLinear_' + adListId;
        board.className = 'fluid_nonLinear_' + vAlign;
        board.innerHTML = creative.outerHTML;

        //Bind the Onclick event
        board.onclick = function () {
            if (typeof vastSettings.clickthroughUrl !== 'undefined') {
                window.open(vastSettings.clickthroughUrl);
            }

            //Tracking the NonLinearClickTracking events
            if (typeof vastSettings.clicktracking !== 'undefined') {
                player.callUris([vastSettings.clicktracking]);
            }
        };

        if (typeof vastSettings.clickthroughUrl !== 'undefined') {
            board.style.cursor = 'pointer';
        }

        var closeBtn = document.createElement('div');
        closeBtn.id = 'close_button_' + player.videoPlayerId;
        closeBtn.className = 'close_button';
        closeBtn.innerHTML = '';
        closeBtn.title = player.displayOptions.layoutControls.closeButtonCaption;
        closeBtn.onclick = function (event) {
            this.parentElement.remove(player);
            if (typeof event.stopImmediatePropagation !== 'undefined') {
                event.stopImmediatePropagation();
            }
            player.adFinished = true;
            clearInterval(player.nonLinearTracking);
            return false;
        };

        board.appendChild(closeBtn);
        videoPlayerTag.parentNode.insertBefore(board, videoPlayerTag.nextSibling);

    },


    closeNonLinear: function (adListId) {
        var element = document.getElementById('fluid_nonLinear_' + adListId);
        if(element) {
            element.remove();
        }
    },


    preRoll: function (event) {
        var player = fluidPlayerClass.getInstanceById(this.id);
        var videoPlayerTag = document.getElementById(this.getAttribute('id'));
        videoPlayerTag.removeEventListener(event.type, player.preRoll);
        player.firstPlayLaunched = true;
        var adListId = event.type.replace('adId_', '');

        if (player.adList[adListId].played === true) {
            return;
        }

        if (player.adList[adListId].adType == 'linear') {
            player.toggleLoader(true);
            player.playRoll(adListId);
        }

        if (player.adList[adListId].adType == 'nonLinear') {
            videoPlayerTag.play();
            player.createNonLinearStatic(adListId);
        }

    },

    createAdMarker: function (adListId, time) {
        var player = this;
        var markersHolder = document.getElementById(player.videoPlayerId + '_ad_markers_holder');
        var adMarker = document.createElement('div');
        adMarker.id = 'ad_marker_' + player.videoPlayerId + "_" + adListId;
        adMarker.className = 'fluid_controls_ad_marker';
        adMarker.style.left = (time / player.mainVideoDuration * 100) + '%';
        if (player.isCurrentlyPlayingAd) {
            adMarker.style.display = 'none';
        }
        markersHolder.appendChild(adMarker);
    },

    hideAdMarker: function (adListId) {
        var player = this;
        var element = document.getElementById('ad_marker_' + player.videoPlayerId + "_" + adListId);
        if (element) {
            element.style.display = 'none';
        }
    },

    showAdMarkers: function () {
        var player = this;
        var markersHolder = document.getElementById(player.videoPlayerId + '_ad_markers_holder');
        var adMarkers = markersHolder.getElementsByClassName('fluid_controls_ad_marker');
        var idPrefix = 'ad_marker_' + player.videoPlayerId + "_";
        for (var i = 0; i < adMarkers.length; ++i) {
            var item = adMarkers[i];
            var adListId = item.id.replace(idPrefix, '');
            if (player.adList[adListId].played === false) {
                item.style.display = '';
            }
        }
    },

    hideAdMarkers: function () {
        var player = this;
        var markersHolder = document.getElementById(player.videoPlayerId + '_ad_markers_holder');
        var adMarkers = markersHolder.getElementsByClassName('fluid_controls_ad_marker');
        for (var i = 0; i < adMarkers.length; ++i) {
            var item = adMarkers[i];
            item.style.display = 'none';
        }
    },

    midRoll: function (event) {
        var player = fluidPlayerClass.getInstanceById(this.id);
        var videoPlayerTag = document.getElementById(this.getAttribute('id'));
        videoPlayerTag.removeEventListener(event.type, player.midRoll); //todo pass id?!

        var adListId = event.type.replace('adId_', '');
        if(player.adList[adListId].played === true){
            return;
        }

        var time = parseInt(player.adList[adListId].timer);

        if(typeof time == 'string' && time.indexOf("%") !== -1) {
            time = time.replace('%', '');
            time = Math.floor(player.mainVideoDuration / 100 * time);
        }

        if (player.displayOptions.vastOptions.showProgressbarMarkers &&
            player.adList[adListId].adType === "nonLinear") {
            player.createAdMarker(adListId, time);
        }

        player.scheduleTask({time: time, playRoll: 'midRoll', adListId: adListId});
    },


    postRoll: function (event) {
        var player = fluidPlayerClass.getInstanceById(this.id);
        var videoPlayerTag = document.getElementById(this.getAttribute('id'));
        videoPlayerTag.removeEventListener(event.type, player.postRoll);
        var adListId = event.type.replace('adId_', '');
        player.scheduleTask({time: Math.floor(player.mainVideoDuration), playRoll: 'postRoll', adListId: adListId});
    },


    onPauseRoll: function (event) {
        var player = fluidPlayerClass.getInstanceById(this.id);
        var videoPlayerTag = document.getElementById(this.getAttribute('id'));
        videoPlayerTag.removeEventListener(event.type, player.onPauseRoll);
        var adListId = event.type.replace('adId_', '');

        if (player.adList[adListId].adType == 'nonLinear') {
            if (!player.adPool.hasOwnProperty(adListId) || player.adPool[adListId].error === true) {
                player.announceLocalError(101);
                return;
            }


            player.createBoard(adListId);
            onPauseAd = document.getElementById('fluid_nonLinear_' + adListId);
            onPauseAd.style.display = 'none';
        }
    },


    /**
     * Check if player has a valid nonLinear onPause Ad
     */
    hasValidOnPauseAd: function() {
        var player = this;
        var onPauseAd = player.findRoll('onPauseRoll'); //should be only one. todo add validator to allow only one onPause roll

        return (onPauseAd.length != 0 && player.adList[onPauseAd[0]] && player.adList[onPauseAd[0]].error === false);
    },


    /**
     * Hide/show nonLinear onPause Ad
     */
    toggleOnPauseAd: function() {
        var player = this;
        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        if (player.hasValidOnPauseAd() && !player.isCurrentlyPlayingAd) {

            onPauseRoll = player.findRoll('onPauseRoll');
            adListId = onPauseRoll[0];
            player.vastOptions = player.adPool[adListId];
            onPauseAd = document.getElementById('fluid_nonLinear_' + adListId);

            if (onPauseAd && videoPlayerTag.paused) {
                onPauseAd.style.display = 'flex';
                player.adList[adListId].played = false;
                player.trackingOnPauseNonLinearAd(adListId, 'start');
            } else if (onPauseAd && !videoPlayerTag.paused) {
                onPauseAd.style.display = 'none';
                player.adFinished = true;
                player.trackingOnPauseNonLinearAd(adListId, 'complete');
            }

        }

    },


    /**
     * Helper function for tracking onPause Ads
     */
    trackingOnPauseNonLinearAd: function (adListId, status) {
        var player = this;

        if (!player.adPool.hasOwnProperty(adListId) || player.adPool[adListId].error === true) {
            player.announceLocalError(101);
            return;
        }

        player.vastOptions = player.adPool[adListId];
        player.trackSingleEvent(status);
    },


    adTimer: function() {
        var player = this;

        if (player.isTimer == true) {
            return;
        }

        player.isTimer = !player.isTimer;

        player.timer = setInterval(function () {

            for (var keyTime in player.timerPool) {

                time = Math.floor(player.getCurrentTime());
                if(time != keyTime || player.isCurrentlyPlayingAd) {
                    continue;
                }

                //Task: playRoll
                if (player.timerPool[keyTime] && player.timerPool[keyTime].hasOwnProperty('playRoll')) {

                    var adIdToCheck = player.timerPool[keyTime].adListId;
                    var playRoll = player.timerPool[keyTime].playRoll;

                    if(player.adList[adIdToCheck].played == false) {

                        player.vastOptions = player.adPool[adIdToCheck];

                        if(player.vastOptions.adType == 'linear'){
                            player.toggleLoader(true);
                            player.playRoll(adIdToCheck);
                        }
                        if(player.vastOptions.adType == 'nonLinear'){
                            player.createNonLinearStatic(adIdToCheck);
                            if (player.displayOptions.vastOptions.showProgressbarMarkers) {
                                player.hideAdMarker(adIdToCheck);
                            }
                        }

                        //Remove ad from the play list
                        delete player.timerPool[keyTime];
                    }

                }


                //Task: close nonLinear ads
                if (player.timerPool[keyTime] && player.timerPool[keyTime].hasOwnProperty('closeStaticAd')) {
                    var adListId = player.timerPool[keyTime].closeStaticAd;

                    if(player.adList[adListId].played == true) {
                        player.completeNonLinearStatic(adListId);

                        //Remove ad from the play list
                        delete player.timerPool[keyTime];
                    }

                }

            }

        }, 800);
    },


    scheduleTask: function (task) {
        this.timerPool[task.time] = task;
    },


    switchToMainVideo: function() {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        videoPlayerTag.src = player.originalSrc;

        player.initialiseStreamers();

        var newCurrentTime = (typeof videoPlayerTag.mainVideoCurrentTime !== 'undefined')
            ? videoPlayerTag.mainVideoCurrentTime : 0;

        if(videoPlayerTag.hasOwnProperty('currentTime')) {
            videoPlayerTag.currentTime = newCurrentTime;
        }

        player.setCurrentTimeAndPlay(newCurrentTime, player.autoplayAfterAd);

        player.isCurrentlyPlayingAd = false;

        player.removeClickthrough();
        player.removeSkipButton();
        player.removeAdCountdown();
        player.removeAdPlayingText();
        player.removeCTAButton();
        player.vastLogoBehaviour(false);
        player.adFinished = true;
        player.displayOptions.vastOptions.vastAdvanced.vastVideoEndedCallback();
        player.vastOptions = null;

        if (player.displayOptions.layoutControls.layout!== 'browser') {
            player.setBuffering();
            var progressbarContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');

            if (progressbarContainer !== null) {
                backgroundColor = (player.displayOptions.layoutControls.primaryColor) ? player.displayOptions.layoutControls.primaryColor : "white";
                document.getElementById(player.videoPlayerId + '_vast_control_currentprogress').style.backgroundColor = backgroundColor;
            }
        }

        videoPlayerTag.removeEventListener('ended', player.onVastAdEnded);

        if (player.displayOptions.layoutControls.layout=== 'browser') {
            videoPlayerTag.setAttribute('controls', 'controls');
        }

        if (player.displayOptions.vastOptions.showProgressbarMarkers) {
            player.showAdMarkers();
        }
    },

    vastLogoBehaviour: function (vastPlaying) {
        if (!this.displayOptions.layoutControls.logo.showOverAds) {
            var logoHolder = document.getElementById(this.videoPlayerId + '_logo');
            var logoImage = document.getElementById(this.videoPlayerId + '_logo_image');

            if (!logoHolder || !logoImage) {
                return;
            }

            var logoDisplay = (vastPlaying) ? 'none' : 'inline';
            logoHolder.style.display = logoDisplay;
        }
    },

    onVastAdEnded: function() {
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        var player = fluidPlayerClass.getInstanceById(this.id);
        player.switchToMainVideo();
        player.vastOptions = null;
        player.adFinished = true;
    },

    onMainVideoEnded: function () {
        var player = fluidPlayerClass.getInstanceById(this.id);
        if (player.isCurrentlyPlayingAd && player.autoplayAfterAd) {  // It may be in-stream ending, and if it's not postroll then we don't execute anything
            return;
        }

        //we can remove timer as no more ad will be shown
        if (Math.floor(player.getCurrentTime()) >= Math.floor(player.mainVideoDuration)) {
            clearInterval(player.timer);
        }

    },

    getCurrentTime: function() {
        var player = this;

        if(player.isCurrentlyPlayingAd) {
            return player.mainVideoCurrentTime;
        } else {
            var videoPlayerTag = document.getElementById(this.videoPlayerId);
            return videoPlayerTag.currentTime;
        }

    },

    /**
     * Adds a Skip Button
     */
    addSkipButton: function() {
        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        var divSkipButton = document.createElement('div');
        divSkipButton.id = 'skip_button_' + this.videoPlayerId;
        divSkipButton.className = 'skip_button skip_button_disabled';
        divSkipButton.innerHTML = this.displayOptions.vastOptions.skipButtonCaption.replace('[seconds]', this.vastOptions.skipoffset);

        document.getElementById('fluid_video_wrapper_' + this.videoPlayerId).appendChild(divSkipButton);

        videoPlayerTag.addEventListener('timeupdate', this.decreaseSkipOffset, false);
    },

    /**
     * Ad Countdown
     */
    addAdCountdown: function() {
        var videoPlayerTag = document.getElementById(this.videoPlayerId);
        var videoWrapper = document.getElementById('fluid_video_wrapper_' + this.videoPlayerId);
        var clickthrough = document.getElementById('vast_clickthrough_layer_' + this.videoPlayerId);
        var divAdCountdown = document.createElement('div');

        // Create element
        var adCountdown = this.pad(parseInt(this.currentVideoDuration / 60)) + ':' + this.pad(parseInt(this.currentVideoDuration % 60));
        var durationText = parseInt(adCountdown);
        divAdCountdown.id = 'ad_countdown' + this.videoPlayerId;
        divAdCountdown.className = 'ad_countdown';
        divAdCountdown.innerHTML = "Ad - " + durationText;

        videoWrapper.appendChild(divAdCountdown);

        videoPlayerTag.addEventListener('timeupdate', this.decreaseAdCountdown, false);
        clickthrough.addEventListener('mouseover', function() { divAdCountdown.style.display = 'none'; }, false);
    },

    decreaseAdCountdown: function decreaseAdCountdown() {
        var videoPlayerTag = this;
        var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);
        var sec = parseInt(player.currentVideoDuration) - parseInt(videoPlayerTag.currentTime);
        var btn = document.getElementById('ad_countdown' + player.videoPlayerId);

        if (btn) {
            btn.innerHTML = "Ad - " + player.pad(parseInt(sec / 60)) + ':' + player.pad(parseInt(sec % 60));
        } else {
            videoPlayerTag.removeEventListener('timeupdate', player.decreaseAdCountdown);
        }
    },

    removeAdCountdown: function() {
        var btn = document.getElementById('ad_countdown' + this.videoPlayerId);
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    },

    toggleAdCountdown: function(showing) {
        var btn = document.getElementById('ad_countdown' + this.videoPlayerId);
        if (btn) {
            if (showing){
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'none';
            }
        }
    },

    addAdPlayingText: function() {
        var player = this;
        var text = this.displayOptions.vastOptions.adText;

        var adPlayingDiv = document.createElement('div');
        adPlayingDiv.id = this.videoPlayerId + '_fluid_ad_playing';

        if (player.displayOptions.layoutControls.primaryColor) {
            adPlayingDiv.style.backgroundColor = player.displayOptions.layoutControls.primaryColor;
            adPlayingDiv.style.opacity = 1;
        }

        adPlayingDiv.className = 'fluid_ad_playing';
        adPlayingDiv.innerText = text;

        document.getElementById('fluid_video_wrapper_' + this.videoPlayerId).appendChild(adPlayingDiv);
    },

    positionTextElements: function() {
        var player = this;

        var allowedPosition = ['top left', 'top right', 'bottom left', 'bottom right'];

        var skipButton = document.getElementById('skip_button_' + player.videoPlayerId);
        var adPlayingDiv = document.getElementById(player.videoPlayerId + '_fluid_ad_playing');
        var ctaButton = document.getElementById(player.videoPlayerId + '_fluid_cta');

        var ctaButtonHeightWithSpacing = 0;
        var adPlayingDivHeightWithSpacing = 0;
        var pixelSpacing = 8;
        var isBottom = false;
        var skipButtonHeightWithSpacing = 0;
        var positionsCTA = [];


        var defaultPositions = {
            "top": {
                "left": {"h": 34, "v": 34 },
                "right": {"h": 0, "v": 34 }
            },
            "bottom": {
                "left": {"h": 34, "v": 50 },
                "right": {"h": 0, "v": 50 }
            }
        };

        if (skipButton !== null) {
            skipButtonHeightWithSpacing = skipButton.offsetHeight + pixelSpacing;

            var wrapperElement = document.getElementById('fluid_video_wrapper_' + player.videoPlayerId);

            if (wrapperElement.classList.contains('mobile')) {
                defaultPositions.bottom.left.v = 75;
                defaultPositions.bottom.right.v = 75;
            }
        }

        if (ctaButton !== null) {

            var CTATextPosition = player.displayOptions.vastOptions.adCTATextPosition.toLowerCase();

            if (allowedPosition.indexOf(CTATextPosition) == -1) {
                console.log('[FP Error] Invalid position for CTAText. Reverting to "bottom right"');
                CTATextPosition = 'bottom right';
            }

            positionsCTA = CTATextPosition.split(' ');

            isBottom = positionsCTA[0] == 'bottom';

            ctaButton.style[positionsCTA[0]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].v;
            ctaButton.style[positionsCTA[1]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].h;

            if (isBottom && positionsCTA[1] == 'right') {
                ctaButton.style[positionsCTA[0]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + skipButtonHeightWithSpacing;
            }

            ctaButtonHeightWithSpacing = ctaButton.offsetHeight + pixelSpacing;

        }

        if (adPlayingDiv !== null) {

            var adPlayingDivPosition = this.displayOptions.vastOptions.adTextPosition.toLowerCase();

            if (allowedPosition.indexOf(adPlayingDivPosition) == -1) {
                console.log('[FP Error] Invalid position for adText. Reverting to "top left"');
                adPlayingDivPosition = 'top left';
            }

            var positionsAdText = adPlayingDivPosition.split(' ');
            adPlayingDiv.style[positionsAdText[0]] = defaultPositions[positionsAdText[0]][positionsAdText[1]].v;
            adPlayingDiv.style[positionsAdText[1]] = defaultPositions[positionsAdText[0]][positionsAdText[1]].h;
            adPlayingDivHeightWithSpacing = adPlayingDiv.offsetHeight + pixelSpacing;
        }

        if (ctaButtonHeightWithSpacing > 0 && adPlayingDivHeightWithSpacing > 0 && CTATextPosition == adPlayingDivPosition) {
            if (isBottom) {
                if (positionsCTA[1] == 'right') {
                    adPlayingDiv.style.bottom = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + skipButtonHeightWithSpacing + ctaButtonHeightWithSpacing;
                } else {
                    adPlayingDiv.style.bottom = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + ctaButtonHeightWithSpacing;
                }
            } else {
                ctaButton.style.top = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + adPlayingDivHeightWithSpacing;
            }
        }
    },

    removeAdPlayingText: function() {
        var div = document.getElementById(this.videoPlayerId + '_fluid_ad_playing');
        if (div) {
            div.parentElement.removeChild(div);
        }
    },

    addCTAButton: function(landingPage) {
        if (!this.displayOptions.vastOptions.adCTAText) {
            return;
        }
        var player = this;
        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        var ctaButton = document.createElement('div');
        ctaButton.id = this.videoPlayerId + '_fluid_cta';
        ctaButton.className = 'fluid_ad_cta';

        var link = document.createElement('a');
        link.href = player.vastOptions.clickthroughUrl;
        link.target = '_blank';
        link.innerHTML = this.displayOptions.vastOptions.adCTAText + "<br/><span class=\"add_icon_clickthrough\">" + landingPage + "</span>";
        link.onclick = function() {
            if (!videoPlayerTag.paused) {
                videoPlayerTag.pause();
            }

            return true;
        };

        ctaButton.appendChild(link);

        document.getElementById('fluid_video_wrapper_' + this.videoPlayerId).appendChild(ctaButton);
    },

    removeCTAButton: function() {
        var btn = document.getElementById(this.videoPlayerId + '_fluid_cta');
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    },

    decreaseSkipOffset: function decreaseSkipOffset() {
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        var videoPlayerTag = this;
        var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);
        var sec = player.vastOptions.skipoffset - Math.floor(videoPlayerTag.currentTime);
        var btn = document.getElementById('skip_button_' + player.videoPlayerId);

        if (btn) {
            if (sec >= 1) {
                //set the button label with the remaining seconds
                btn.innerHTML = player.displayOptions.vastOptions.skipButtonCaption.replace('[seconds]', sec);

            } else {
                //make the button clickable
                btn.innerHTML = '<a href="javascript:;" id="skipHref_' + player.videoPlayerId + '" onclick="fluidPlayerClass.getInstanceById(\'' + player.videoPlayerId + '\').pressSkipButton();">'
                    + player.displayOptions.vastOptions.skipButtonClickCaption
                    + '</a>';

                //removes the CSS class for a disabled button
                btn.className = btn.className.replace(/\bskip_button_disabled\b/,'');

                videoPlayerTag.removeEventListener('timeupdate', player.decreaseSkipOffset);
            }
        } else {
            sec = 0;
            videoPlayerTag.removeEventListener('timeupdate', videoPlayerTag.decreaseSkipOffset);
        }
    },

    pressSkipButton: function() {
        this.removeSkipButton();
        this.removeAdPlayingText();
        this.removeCTAButton();
        this.displayOptions.vastOptions.vastAdvanced.vastVideoSkippedCallback();

        var event = document.createEvent('Event');
        event.initEvent('ended', false, true);
        document.getElementById(this.videoPlayerId).dispatchEvent(event);
    },

    removeSkipButton: function() {
        btn = document.getElementById('skip_button_' + this.videoPlayerId);
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    },

    /**
     * Makes the player open the ad URL on clicking
     */
    addClickthroughLayer: function() {
        var player = this;

        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        var divWrapper = document.getElementById('fluid_video_wrapper_' + player.videoPlayerId);

        var divClickThrough = document.createElement('div');
        divClickThrough.className = 'vast_clickthrough_layer';
        divClickThrough.id = 'vast_clickthrough_layer_' + player.videoPlayerId;
        divClickThrough.setAttribute(
            'style',
            'position: absolute; cursor: pointer; top: 0; left: 0; width: ' +
            videoPlayerTag.offsetWidth + 'px; height: ' +
            (videoPlayerTag.offsetHeight) + 'px;'
        );

        divWrapper.appendChild(divClickThrough);

        //Bind the Onclick event
        var openClickthrough = function() {
            window.open(player.vastOptions.clickthroughUrl);

            //Tracking the Clickthorugh events
            if (typeof player.vastOptions.clicktracking !== 'undefined') {
                player.callUris(player.vastOptions.clicktracking);
            }
        };

        var clickthroughLayer = document.getElementById('vast_clickthrough_layer_' + player.videoPlayerId);
        var deviceInfo = fluidPlayerClass.getMobileOs();
        var isIos9orLower = (deviceInfo.device === 'iPhone') && (deviceInfo.userOsMajor !== false) && (deviceInfo.userOsMajor <= 9);

        clickthroughLayer.onclick = function() {
            if (videoPlayerTag.paused) {
                //On Mobile Safari on iPhones with iOS 9 or lower open the clickthrough only once
                if (isIos9orLower && !player.suppressClickthrough) {
                    openClickthrough();
                    player.suppressClickthrough = true;

                } else {
                    videoPlayerTag.play();
                }

            } else {
                openClickthrough();
                videoPlayerTag.pause();
            }
        };
    },

    /**
     * Remove the Clickthrough layer
     */
    removeClickthrough: function() {
        var clickthroughLayer = document.getElementById('vast_clickthrough_layer_' + this.videoPlayerId);

        if (clickthroughLayer) {
            clickthroughLayer.parentNode.removeChild(clickthroughLayer);
        }
    },

    /**
     * Gets the src value of the first source element of the video tag.
     *
     * @returns string|null
     */
    getCurrentSrc: function() {
        var sources = document.getElementById(this.videoPlayerId).getElementsByTagName('source');

        if (sources.length) {
            return sources[0].getAttribute('src');
        }

        return null;
    },

    /**
     * Src types required for streaming elements
     */
    getCurrentSrcType: function() {
        var sources = document.getElementById(this.videoPlayerId).getElementsByTagName('source');

        if (sources.length) {
            for (var i = 0; i < sources.length; i++) {
                if (sources[i].getAttribute('src') == this.originalSrc) {
                    return sources[i].getAttribute('type');
                }
            }
        }

        return null;
    },

    convertTimeStringToSeconds: function(str) {
        if (str && str.match(/^(\d){2}(:[0-5][0-9]){2}(.(\d){1,3})?$/)) {
            var timeParts = str.split(':');
            return ((parseInt(timeParts[0], 10)) * 3600) + ((parseInt(timeParts[1], 10)) * 60) + (parseInt(timeParts[2], 10));
        }

        return false;
    },

    onRecentWaiting: function() {
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        var player = fluidPlayerClass.getInstanceById(this.id);

        player.recentWaiting = true;

        setTimeout(function () {
            player.recentWaiting = false;
        }, 1000);
    },

    /**
     * Dispatches a custom pause event which is not present when seeking.
     */
    onFluidPlayerPause: function() {
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        var videoPlayerTag = this;

        setTimeout(function () {
            var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);

            if (!player.recentWaiting) {
                var event = document.createEvent('CustomEvent');
                event.initEvent('fluidplayerpause', false, true);
                videoPlayerTag.dispatchEvent(event);
            }
        }, 100);
    },

    checkShouldDisplayVolumeBar: function() {
        var deviceType = fluidPlayerClass.getMobileOs();

        if (deviceType.userOs === 'iOS') {
            return false;
        }

        return true;
    },

    generateCustomControlTags: function() {
        return '<div class="fluid_controls_left">' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_playpause" class="fluid_button fluid_button_play"></div>' +
            '</div>' +
            '<div id="' + this.videoPlayerId + '_fluid_controls_progress_container" class="fluid_controls_progress_container fluid_slider">' +
            '   <div class="fluid_controls_progress">' +
            '      <div id="' + this.videoPlayerId + '_vast_control_currentprogress" class="fluid_controls_currentprogress">' +
            '          <div id="' + this.videoPlayerId + '_vast_control_currentpos" class="fluid_controls_currentpos"></div>' +
            '      </div>' +
            '   </div>' +
            '   <div id="' + this.videoPlayerId + '_buffered_amount" class="fluid_controls_buffered"></div>' +
            '   <div id="' + this.videoPlayerId + '_ad_markers_holder" class="fluid_controls_ad_markers_holder"></div>' +
            '</div>' +
            '<div class="fluid_controls_right">' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_fullscreen" class="fluid_button fluid_button_fullscreen"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_theatre" class="fluid_button fluid_button_theatre"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_video_source" class="fluid_button fluid_button_video_source"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_playback_rate" class="fluid_button fluid_button_playback_rate"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_download" class="fluid_button fluid_button_download"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_volume_container" class="fluid_control_volume_container fluid_slider">' +
            '       <div id="' + this.videoPlayerId + '_fluid_control_volume" class="fluid_control_volume">' +
            '           <div id="' + this.videoPlayerId + '_fluid_control_currentvolume" class="fluid_control_currentvolume">' +
            '               <div id="' + this.videoPlayerId + '_fluid_control_volume_currentpos" class="fluid_control_volume_currentpos"></div>' +
            '           </div>' +
            '       </div>' +
            '   </div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_mute" class="fluid_button fluid_button_volume"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_duration" class="fluid_fluid_control_duration">00:00 / 00:00</div>' +
            '</div>';
    },

    controlPlayPauseToggle: function(videoPlayerId, isPlaying) {
        var playPauseButton = document.getElementById(videoPlayerId + '_fluid_control_playpause');
        var menuOptionPlay = document.getElementById(videoPlayerId + 'context_option_play');
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);
        var controlsDisplay = document.getElementById(player.videoPlayerId + '_fluid_controls_container');
        var fpLogo = document.getElementById(player.videoPlayerId + '_logo');

        var initialPlay = document.getElementById(videoPlayerId + '_fluid_initial_play');
        if (initialPlay) {
            document.getElementById(videoPlayerId + '_fluid_initial_play').style.display = "none";
            document.getElementById(videoPlayerId + '_fluid_initial_play_button').style.opacity = "1";
        }

        if (isPlaying) {
            playPauseButton.className = playPauseButton.className.replace(/\bfluid_button_play\b/g, 'fluid_button_pause');
            controlsDisplay.classList.remove('initial_controls_show');
            if (fpLogo) {
                fpLogo.classList.remove('initial_controls_show');
            }

            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = 'Pause';
            }

        } else {
            playPauseButton.className = playPauseButton.className.replace(/\bfluid_button_pause\b/g, 'fluid_button_play');
            controlsDisplay.classList.add('initial_controls_show');
            if (fpLogo) {
                fpLogo.classList.add('initial_controls_show');
            }

            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = 'Play';
            }
        }
    },

    playPauseAnimationToggle: function(play) {
        if (this.isCurrentlyPlayingAd || !this.displayOptions.layoutControls.playPauseAnimation || this.isSwitchingSource) {
            return;
        }

        videoPlayerId = this.videoPlayerId;
        if (play) {
            document.getElementById(videoPlayerId + '_fluid_state_button').classList.remove('fluid_initial_pause_button');
            document.getElementById(videoPlayerId + '_fluid_state_button').classList.add('fluid_initial_play_button');
        } else {
            document.getElementById(videoPlayerId + '_fluid_state_button').classList.remove('fluid_initial_play_button');
            document.getElementById(videoPlayerId + '_fluid_state_button').classList.add('fluid_initial_pause_button');
        }

        document.getElementById(videoPlayerId + '_fluid_initial_play').classList.add('transform-active');
        setTimeout(
            function() {
                document.getElementById(videoPlayerId + '_fluid_initial_play').classList.remove('transform-active');
            },
            800
        );
    },

    contolProgressbarUpdate: function(videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);
        var videoPlayerTag = document.getElementById(videoPlayerId);
        var currentProgressTag = document.getElementById(videoPlayerId + '_vast_control_currentprogress');

        currentProgressTag.style.width = (videoPlayerTag.currentTime / player.currentVideoDuration * 100) + '%';
    },

    contolDurationUpdate: function(videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);

        var videoPlayerTag = document.getElementById(videoPlayerId);
        var durationText = player.pad(parseInt(videoPlayerTag.currentTime / 60)) + ':' + player.pad(parseInt(videoPlayerTag.currentTime % 60)) +
            ' / ' +
            player.pad(parseInt(player.currentVideoDuration / 60)) + ':' + player.pad(parseInt(player.currentVideoDuration % 60));

        var timePlaceholder = document.getElementById(videoPlayerId + '_fluid_control_duration');
        timePlaceholder.innerHTML = durationText;
    },

    pad: function(value) {
        if (value < 10) {
            return '0' + value;
        } else {
            return value;
        }
    },

    contolVolumebarUpdate: function(videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);

        if (player.displayOptions.layoutControls.layout === 'browser') {
            return;
        }

        var videoPlayerTag = document.getElementById(videoPlayerId);
        var currentVolumeTag = document.getElementById(videoPlayerId + '_fluid_control_currentvolume');
        var volumeposTag = document.getElementById(videoPlayerId + '_fluid_control_volume_currentpos');
        var volumebarTotalWidth = document.getElementById(videoPlayerId + '_fluid_control_volume').clientWidth;
        var volumeposTagWidth = volumeposTag.clientWidth;
        var muteButtonTag = document.getElementById(videoPlayerId + '_fluid_control_mute');
        var menuOptionMute = document.getElementById(videoPlayerId + 'context_option_mute');

        if (videoPlayerTag.volume) {
            player.latestVolume = videoPlayerTag.volume;
        }

        if (videoPlayerTag.volume && !videoPlayerTag.muted) {
            muteButtonTag.className = muteButtonTag.className.replace(/\bfluid_button_mute\b/g, 'fluid_button_volume');

            if (menuOptionMute !== null) {
                menuOptionMute.innerHTML = 'Mute';
            }

        } else {
            muteButtonTag.className = muteButtonTag.className.replace(/\bfluid_button_volume\b/g, 'fluid_button_mute');

            if (menuOptionMute !== null) {
                menuOptionMute.innerHTML = 'Unmute';
            }
        }
        currentVolumeTag.style.width = (videoPlayerTag.volume * volumebarTotalWidth) + 'px';
        volumeposTag.style.left = (videoPlayerTag.volume * volumebarTotalWidth - (volumeposTagWidth / 2)) + 'px';
    },

    muteToggle: function(videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);
        var videoPlayerTag = document.getElementById(videoPlayerId);

        if (videoPlayerTag.volume && !videoPlayerTag.muted) {
            videoPlayerTag.volume = 0;
            videoPlayerTag.muted = true;
        } else {
            videoPlayerTag.volume = player.latestVolume;
            videoPlayerTag.muted = false;
        }
    },

    checkFullscreenSupport: function(videoPlayerWrapperId) {
        var videoPlayerWrapper = document.getElementById(videoPlayerWrapperId);
        var videoPlayer = document.getElementById(this.videoPlayerId);

        if (videoPlayerWrapper.mozRequestFullScreen) {
            return {goFullscreen: 'mozRequestFullScreen', exitFullscreen: 'mozCancelFullScreen', isFullscreen: 'mozFullScreenElement'};

        } else if (videoPlayerWrapper.webkitRequestFullscreen) {
            return {goFullscreen: 'webkitRequestFullscreen', exitFullscreen: 'webkitExitFullscreen', isFullscreen: 'webkitFullscreenElement'};

        } else if (videoPlayerWrapper.msRequestFullscreen) {
            return {goFullscreen: 'msRequestFullscreen', exitFullscreen: 'msExitFullscreen', isFullscreen: 'msFullscreenElement'};

        } else if (videoPlayerWrapper.requestFullscreen) {
            return {goFullscreen: 'requestFullscreen', exitFullscreen: 'exitFullscreen', isFullscreen: 'fullscreenElement'};

        } else if (videoPlayer.webkitSupportsFullscreen) {
            return {goFullscreen: 'webkitEnterFullscreen', exitFullscreen: 'webkitExitFullscreen', isFullscreen: 'webkitDisplayingFullscreen'};

        }

        return false;
    },

    fullscreenOff: function (fullscreenButton, menuOptionFullscreen) {
        fullscreenButton.className = fullscreenButton.className.replace(/\bfluid_button_fullscreen_exit\b/g, 'fluid_button_fullscreen');
        if (menuOptionFullscreen !== null) {
            menuOptionFullscreen.innerHTML = 'Fullscreen';
            this.fullscreenMode = false;
        }
    },

    fullscreenOn: function (fullscreenButton, menuOptionFullscreen) {
        fullscreenButton.className = fullscreenButton.className.replace(/\bfluid_button_fullscreen\b/g, 'fluid_button_fullscreen_exit');
        if (menuOptionFullscreen !== null) {
            menuOptionFullscreen.innerHTML = 'Exit Fullscreen';
            this.fullscreenMode = true;
        }
    },

    fullscreenToggle: function() {
        fluidPlayerClass.activeVideoPlayerId = this.videoPlayerId;

        var fullscreenTag = document.getElementById('fluid_video_wrapper_' + this.videoPlayerId);
        var requestFullscreenFunctionNames = this.checkFullscreenSupport('fluid_video_wrapper_' + this.videoPlayerId);
        var fullscreenButton = document.getElementById(this.videoPlayerId + '_fluid_control_fullscreen');
        var menuOptionFullscreen = document.getElementById(this.videoPlayerId + 'context_option_fullscreen');
        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        // Disable Theatre mode if it's on while we toggle fullscreen
        if (this.theatreMode) {
            this.theatreToggle();
        }

        if (requestFullscreenFunctionNames) {
            // iOS fullscreen elements are different and so need to be treated separately
            switch (requestFullscreenFunctionNames.goFullscreen) {
                case 'webkitEnterFullscreen':
                    if (!videoPlayerTag[requestFullscreenFunctionNames.isFullscreen]) {
                        functionNameToExecute = 'videoPlayerTag.' + requestFullscreenFunctionNames.goFullscreen + '();';
                        this.fullscreenOn(fullscreenButton, menuOptionFullscreen);
                        new Function('videoPlayerTag', functionNameToExecute)(videoPlayerTag);
                    }

                    break;
                default:
                    if (document[requestFullscreenFunctionNames.isFullscreen] === null) {
                        //Go fullscreen
                        functionNameToExecute = 'videoPlayerTag.' + requestFullscreenFunctionNames.goFullscreen + '();';
                        this.fullscreenOn(fullscreenButton, menuOptionFullscreen);
                    } else {
                        //Exit fullscreen
                        functionNameToExecute = 'document.' + requestFullscreenFunctionNames.exitFullscreen + '();';
                        this.fullscreenOff(fullscreenButton, menuOptionFullscreen);
                    }
                    new Function('videoPlayerTag', functionNameToExecute)(fullscreenTag);

                    break;
            }
        } else {
            //The browser does not support the Fullscreen API, so a pseudo-fullscreen implementation is used
            if (fullscreenTag.className.search(/\bpseudo_fullscreen\b/g) !== -1) {
                fullscreenTag.className = fullscreenTag.className.replace(/\bpseudo_fullscreen\b/g, '');
                this.fullscreenOff(fullscreenButton, menuOptionFullscreen);
            } else {
                fullscreenTag.className += ' pseudo_fullscreen';
                this.fullscreenOn(fullscreenButton, menuOptionFullscreen);
            }
        }

    },

    findClosestParent: function(el, selector) {
        var matchesFn;

        // find vendor prefix
        ['matches','webkitMatchesSelector','mozMatchesSelector','msMatchesSelector','oMatchesSelector'].some(function(fn) {
            if (typeof document.body[fn] == 'function') {
                matchesFn = fn;
                return true;
            }
            return false;
        });

        var parent;

        // Check if the current element matches the selector
        if (el[matchesFn](selector)) {
            return el;
        }

        // traverse parents
        while (el) {
            parent = el.parentElement;
            if (parent && parent[matchesFn](selector)) {
                return parent;
            }
            el = parent;
        }

        return null;
    },

    getTranslateX: function(el) {
        var coordinates = null;

        try {
            var results = el.style.transform.match(/translate3d\((-?\d+px,\s?){2}-?\d+px\)/);

            if (results && results.length) {
                coordinates = results[0]
                    .replace('translate3d(', '')
                    .replace(')', '')
                    .replace(/\s/g, '')
                    .replace(/px/g, '')
                    .split(',')
                ;
            }
        } catch (e) {
            coordinates = null;
        }

        return (coordinates && (coordinates.length === 3)) ? parseInt(coordinates[0]) : 0;
    },

    getEventOffsetX: function(evt, el) {
        var x = 0;
        var translateX = 0;

        while (el && !isNaN(el.offsetLeft)) {
            translateX = fluidPlayerClass.getTranslateX(el);

            if (el.tagName === 'BODY') {
                x += el.offsetLeft + el.clientLeft + translateX - (el.scrollLeft || document.documentElement.scrollLeft);
            } else {
                x += el.offsetLeft + el.clientLeft + translateX - el.scrollLeft;
            }

            el = el.offsetParent;
        }

        var eventX;
        if (typeof evt.touches !== 'undefined' && typeof evt.touches[0] !== 'undefined') {
            eventX = evt.touches[0].clientX;
        } else {
            eventX = evt.clientX
        }

        return eventX - x;
    },

    getEventOffsetY: function(evt, el) {
        var fullscreenMultiplier = 1;
        var videoWrapper = fluidPlayerClass.findClosestParent(el, 'div[id^="fluid_video_wrapper_"]');

        if (videoWrapper) {
            var videoPlayerId = videoWrapper.id.replace('fluid_video_wrapper_', '');

            var requestFullscreenFunctionNames = fluidPlayerClass.checkFullscreenSupport('fluid_video_wrapper_' + videoPlayerId);
            if (requestFullscreenFunctionNames && document[requestFullscreenFunctionNames.isFullscreen]) {
                fullscreenMultiplier = 0;
            }
        }

        var y = 0;

        while (el && !isNaN(el.offsetTop)) {
            if (el.tagName === 'BODY') {
                y += el.offsetTop - ((el.scrollTop || document.documentElement.scrollTop) * fullscreenMultiplier);

            } else {
                y += el.offsetTop - (el.scrollTop * fullscreenMultiplier);
            }

            el = el.offsetParent;
        }

        return evt.clientY - y;
    },

    onProgressbarMouseDown: function(videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);
        player.displayOptions.layoutControls.playPauseAnimation = false;

        if (player.isCurrentlyPlayingAd) {
            return;
        }

        var videoPlayerTag = document.getElementById(videoPlayerId);

        var initiallyPaused = videoPlayerTag.paused;
        if (!initiallyPaused) {
            videoPlayerTag.pause();
        }

        function shiftTime(videoPlayerId, timeBarX) {
            var totalWidth = document.getElementById(videoPlayerId + '_fluid_controls_progress_container').clientWidth;
            if (totalWidth) {
                videoPlayerTag.currentTime = player.currentVideoDuration * timeBarX / totalWidth;
            }
        }

        function onProgressbarMouseMove (event) {
            var currentX = fluidPlayerClass.getEventOffsetX(event, document.getElementById(videoPlayerId + '_fluid_controls_progress_container'));
            shiftTime(videoPlayerId, currentX);
            player.contolProgressbarUpdate(player.videoPlayerId);
            player.contolDurationUpdate(player.videoPlayerId);
        }

        function onProgressbarMouseUp (event) {
            document.removeEventListener('mousemove', onProgressbarMouseMove);
            document.removeEventListener('touchmove', onProgressbarMouseMove);
            document.removeEventListener('mouseup', onProgressbarMouseUp);
            document.removeEventListener('touchend', onProgressbarMouseUp);
            var clickedX = fluidPlayerClass.getEventOffsetX(event, document.getElementById(videoPlayerId + '_fluid_controls_progress_container'));
            if (!isNaN(clickedX)) {
                shiftTime(videoPlayerId, clickedX);
            }
            if (!initiallyPaused) {
                player.play();
            }
            // Wait till video played then reenable the animations
            if (player.initialAnimationSet) {
                setTimeout(function() { player.displayOptions.layoutControls.playPauseAnimation = player.initialAnimationSet; }, 200);
            }
        }

        document.addEventListener('mouseup', onProgressbarMouseUp);
        document.addEventListener('touchend', onProgressbarMouseUp);
        document.addEventListener('mousemove', onProgressbarMouseMove);
        document.addEventListener('touchmove', onProgressbarMouseMove);
    },

    onVolumebarMouseDown: function(videoPlayerId) {

        function shiftVolume(videoPlayerId, volumeBarX) {
            var videoPlayerTag = document.getElementById(videoPlayerId);
            var totalWidth = document.getElementById(videoPlayerId + '_fluid_control_volume_container').clientWidth;
            if (totalWidth) {
                var newVolume = volumeBarX / totalWidth;

                if (newVolume < 0.05) {
                    newVolume = 0;
                    videoPlayerTag.muted = true;
                } else if (newVolume > 0.95) {
                    newVolume = 1;
                }

                if (videoPlayerTag.muted && newVolume > 0) {
                    videoPlayerTag.muted = false;
                }
                videoPlayerTag.volume = newVolume;
            }
        }

        function onVolumebarMouseMove (event) {
            var currentX = fluidPlayerClass.getEventOffsetX(event, document.getElementById(videoPlayerId + '_fluid_control_volume_container'));
            shiftVolume(videoPlayerId, currentX);
        }

        function onVolumebarMouseUp (event) {
            document.removeEventListener('mousemove', onVolumebarMouseMove);
            document.removeEventListener('touchmove', onVolumebarMouseMove);
            document.removeEventListener('mouseup', onVolumebarMouseUp);
            document.removeEventListener('touchend', onVolumebarMouseUp);
            var currentX = fluidPlayerClass.getEventOffsetX(event, document.getElementById(videoPlayerId + '_fluid_control_volume_container'));
            if (!isNaN(currentX)) {
                shiftVolume(videoPlayerId, currentX);
            }
        }

        document.addEventListener('mouseup', onVolumebarMouseUp);
        document.addEventListener('touchend', onVolumebarMouseUp);
        document.addEventListener('mousemove', onVolumebarMouseMove);
        document.addEventListener('touchmove', onVolumebarMouseMove);
    },

    setVastList: function () {
        var player = this;
        var ads = {};
        var def = {id: null, roll: null, played: false, vastLoaded: false, error: false};
        var idPart = 0;

        var validateVastList = function (item) {
            var hasError = false;

            switch (item.roll) {

                case 'midRoll':
                    if (typeof item.timer === 'undefined') {
                        hasError = true;
                    }
                    break;

            }

            return hasError;
        };

        var validateRequiredParams = function (item) {
            var hasError = false;

            if (!item.vastTag) {
                player.announceLocalError(102, '"vastTag" property is missing from adList.');
                hasError = true;
            }

            if (!item.roll) {
                player.announceLocalError(102, '"roll" is missing from adList.');
                hasError = true;
            }

            if (player.availableRolls.indexOf(item.roll) === -1) {
                player.announceLocalError(102, 'Only ' + player.availableRolls.join(',') +  ' rolls are supported.');
                hasError = true;
            }

            if (item.size && player.supportedNonLinearAd.indexOf(item.size) === -1) {
                player.announceLocalError(102, 'Only ' + player.supportedNonLinearAd.join(',') +  ' size are supported.');
                hasError = true;
            }

            return hasError;
        };


        if (player.displayOptions.vastOptions.hasOwnProperty('adList')) {

            for (var key in player.displayOptions.vastOptions.adList) {

                adItem = player.displayOptions.vastOptions.adList[key];

                if(validateRequiredParams(adItem)) {
                    player.announceLocalError(102, 'Wrong adList parameters.');
                    continue;
                }
                id = 'ID' + idPart;

                ads[id] = Object.assign({}, def);
                ads[id] = Object.assign(ads[id], player.displayOptions.vastOptions.adList[key]);
                if (adItem.roll == 'midRoll') {
                    ads[id].error = validateVastList('midRoll', adItem);
                }
                ads[id].id = id;
                idPart++;

            }
        }

        player.adList = ads;
    },


    findRoll: function(roll) {
        var player = this;
        var ids = [];
        ids.length = 0;

        if(!roll || !player.hasOwnProperty('adList')) {
            return;
        }

        for (var key in player.adList) {
            if (player.adList[key].roll == roll) {
                ids.push(key);
            }
        }

        return ids;
    },


    volumeChange: function(videoPlayerId, direction) {
        var videoPlayerTag = document.getElementById(videoPlayerId);
        var newVolume = videoPlayerTag.volume;

        if(direction == 'asc'){
            newVolume += 0.05;
        } else if(direction == 'desc') {
            newVolume -= 0.05;
        }

        if (newVolume < 0.05) {
            newVolume = 0;
        } else if (newVolume > 0.95) {
            newVolume = 1;
        }

        videoPlayerTag.volume = newVolume;
    },

    currentTimeChange: function (videoPlayerId, keyCode) {
        var videoInstanceId = fluidPlayerClass.getInstanceById(videoPlayerId);
        if (videoInstanceId.isCurrentlyPlayingAd) {
            return;
        }

        var videoPlayerTag = document.getElementById(videoPlayerId);

        videoPlayerTag.currentTime = videoInstanceId.getNewCurrentTimeValueByKeyCode(keyCode, videoPlayerTag.currentTime, videoPlayerTag.duration);
    },

    getNewCurrentTimeValueByKeyCode: function (keyCode, currentTime, duration) {

        var newCurrentTime = currentTime;

        switch (keyCode) {

            case 37://left arrow
                newCurrentTime -= 5;
                newCurrentTime = (newCurrentTime < 5) ? 0 : newCurrentTime;
                break;
            case 39://right arrow
                newCurrentTime += 5;
                newCurrentTime = (newCurrentTime > duration - 5) ? duration : newCurrentTime;
                break;
            case 35://End
                newCurrentTime = duration;
                break;
            case 36://Home
                newCurrentTime = 0;
                break;
            case 48://0
            case 49://1
            case 50://2
            case 51://3
            case 52://4
            case 53://5
            case 54://6
            case 55://7
            case 56://8
            case 57://9
                if (keyCode < 58 && keyCode > 47) {
                    var percent = (keyCode - 48) * 10;
                    newCurrentTime = duration * percent / 100;
                }
                break;
        }


        return newCurrentTime;
    },


    handleMouseenter: function () {
        var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(this.getAttribute('id'));
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
        var videoPlayerTag = document.getElementById(videoInstanceId);

        if (videoPlayerInstance.captureKey) {
            return;
        }

        videoPlayerInstance.captureKey = function (event) {
            event.stopPropagation();
            var keyCode = event.keyCode;

            switch (keyCode) {

                case 70://f
                    videoPlayerInstance.fullscreenToggle();
                    event.preventDefault();
                    break;
                case 13://Enter
                case 32://Space
                    videoPlayerInstance.playPauseToggle(videoPlayerTag);
                    event.preventDefault();
                    break;
                case 77://m
                    videoPlayerInstance.muteToggle(videoInstanceId);
                    event.preventDefault();
                    break;
                case 38://up arrow
                    videoPlayerInstance.volumeChange(videoInstanceId, 'asc');
                    event.preventDefault();
                    break;
                case 40://down arrow
                    videoPlayerInstance.volumeChange(videoInstanceId, 'desc');
                    event.preventDefault();
                    break;
                case 37://left arrow
                case 39://right arrow
                case 35://End
                case 36://Home
                case 48://0
                case 49://1
                case 50://2
                case 51://3
                case 52://4
                case 53://5
                case 54://6
                case 55://7
                case 56://8
                case 57://9
                    videoPlayerInstance.currentTimeChange(videoInstanceId, keyCode);
                    event.preventDefault();
                    break;
            }

            return false;

        };
        document.addEventListener('keydown', videoPlayerInstance.captureKey, true);

    },

    handleMouseleave: function () {
        var player = this;
        var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(player.getAttribute('id'));
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
        var videoPlayerTag = document.getElementById(videoInstanceId);

        if (videoPlayerInstance.isCurrentlyPlayingAd && !videoPlayerTag.paused && videoPlayerInstance.displayOptions.layoutControls.layout !== 'browser') {
            setTimeout(function() {
                if (!videoPlayerInstance.isControlBarVisible()) {
                    videoPlayerInstance.toggleAdCountdown(true);
                }
            }, 600);
        }

        window.addEventListener('click', function (e) {
            var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(player.getAttribute('id'));
            var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);

            if (document.getElementById('fluid_video_wrapper_' + videoInstanceId).contains(e.target)
                || e.target.id == 'skipHref_' + videoInstanceId) {
                // do nothing
            } else {
                document.removeEventListener('keydown', videoPlayerInstance.captureKey, true);
                delete videoPlayerInstance["captureKey"];

                if (videoPlayerInstance.theatreMode) {
                    videoPlayerInstance.theatreToggle();
                }
            }
        });
    },

    keyboardControl: function () {
        var player = this;
        var videoPlayer = document.getElementById('fluid_video_wrapper_' + player.videoPlayerId);

        videoPlayer.addEventListener('click', player.handleMouseenter, false);
        videoPlayer.addEventListener('mouseleave', player.handleMouseleave, false);
    },

    initialPlay: function() {
        var videoPlayerTag = this;
        var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);

        if (!player.displayOptions.layoutControls.playButtonShowing) {
            var initialControlsDisplay = document.getElementById(player.videoPlayerId + '_fluid_controls_container');
            var fpPlayer = document.getElementById(player.videoPlayerId + '_logo');
            initialControlsDisplay.classList.remove('initial_controls_show');
            fpPlayer.classList.remove('initial_controls_show');
        }

        if (!player.firstPlayLaunched) {
            player.playPauseToggle(videoPlayerTag);

            videoPlayerTag.removeEventListener('play', player.initialPlay);
        }
    },

    playPauseToggle: function(videoPlayerTag) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);
        var isFirstStart = !player.firstPlayLaunched;

        var preRolls = player.findRoll('preRoll');
        if (!isFirstStart || preRolls.length == 0) {

            if (isFirstStart && preRolls.length == 0) {
                player.firstPlayLaunched = true;
                player.displayOptions.vastOptions.vastAdvanced.noVastVideoCallback();
            }

            if (player.displayOptions.layoutControls.layout !== 'browser') { //The original player play/pause toggling is managed by the browser
                if (videoPlayerTag.paused) {
                    if (player.dashPlayer) {
                        player.dashPlayer.play();
                    } else {
                        videoPlayerTag.play();
                    }
                    this.playPauseAnimationToggle(true);
                } else if (!isFirstStart) {
                    videoPlayerTag.pause();
                    this.playPauseAnimationToggle(false);
                }
            }

            player.toggleOnPauseAd();

        } else {
            //Workaround for Safari or Mobile Chrome - otherwise it blocks the subsequent
            //play() command, because it considers it not being triggered by the user.
            var isMobileChecks = fluidPlayerClass.getMobileOs();
            var browserVersion = fluidPlayerClass.getBrowserVersion();
            player.isCurrentlyPlayingAd = true;

            if (
                browserVersion.browserName == 'Safari'
                || (isMobileChecks.userOs !== false && isMobileChecks.userOs == 'Android' && browserVersion.browserName == 'Google Chrome')
            ) {
                videoPlayerTag.src = fluidPlayerScriptLocation + 'blank.mp4';
                videoPlayerTag.play();
                this.playPauseAnimationToggle(true);
            }

            player.firstPlayLaunched = true;

            //trigger the loading of the VAST Tag
            player.prepareVast('preRoll');
        }

        var prepareVastAdsThatKnowDuration = function() {
            player.prepareVast('onPauseRoll');
            player.prepareVast('postRoll');
            player.prepareVast('midRoll');
        };

        if (isFirstStart) {
            if (player.mainVideoDuration > 0) {
                prepareVastAdsThatKnowDuration();
            } else {
                videoPlayerTag.addEventListener('mainVideoDurationSet', prepareVastAdsThatKnowDuration);
            }
        }

        player.adTimer();

        var blockOnPause = document.getElementById(player.videoPlayerId + '_fluid_html_on_pause');
        if (blockOnPause && !player.isCurrentlyPlayingAd) {
            if (videoPlayerTag.paused) {
                blockOnPause.style.display = 'flex';
            } else {
                blockOnPause.style.display = 'none';
            }
        }
    },

    setCustomControls: function() {
        var player = this;
        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        //Set the Play/Pause behaviour
        document.getElementById(this.videoPlayerId + '_fluid_control_playpause').addEventListener('click', function() {

            if (!player.firstPlayLaunched) {
                videoPlayerTag.removeEventListener('play', player.initialPlay);
            }

            player.playPauseToggle(videoPlayerTag);
        }, false);

        document.getElementById(player.videoPlayerId).addEventListener('play', function() {
            player.controlPlayPauseToggle(player.videoPlayerId, true);
            player.contolVolumebarUpdate(player.videoPlayerId);
        }, false);

        document.getElementById(player.videoPlayerId).addEventListener('fluidplayerpause', function() {
            player.controlPlayPauseToggle(player.videoPlayerId, false);
        }, false);

        //Set the progressbar
        videoPlayerTag.addEventListener('timeupdate', function(){
            player.contolProgressbarUpdate(player.videoPlayerId);
            player.contolDurationUpdate(player.videoPlayerId);
        });

        document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container').addEventListener('mousedown', function(event) {
            player.onProgressbarMouseDown(player.videoPlayerId);
        }, false);

        document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container').addEventListener('touchstart', function(event) {
            player.onProgressbarMouseDown(player.videoPlayerId);
        }, false);

        //Set the volume contols
        document.getElementById(player.videoPlayerId + '_fluid_control_volume_container').addEventListener('mousedown', function(event) {
            player.onVolumebarMouseDown(player.videoPlayerId);
        }, false);

        document.getElementById(player.videoPlayerId + '_fluid_control_volume_container').addEventListener('touchstart', function(event) {
            player.onVolumebarMouseDown(player.videoPlayerId);
        }, false);

        videoPlayerTag.addEventListener('volumechange', function(){
            player.contolVolumebarUpdate(player.videoPlayerId);
        });

        document.getElementById(player.videoPlayerId + '_fluid_control_mute').addEventListener('click', function(){
            player.muteToggle(player.videoPlayerId);
        });

        player.setBuffering();

        //Set the fullscreen control
        document.getElementById(player.videoPlayerId + '_fluid_control_fullscreen').addEventListener('click', function(){
            player.fullscreenToggle();
        });

        // Theatre mode
        if (player.displayOptions.layoutControls.allowTheatre && !player.isInIframe) {
            document.getElementById(player.videoPlayerId + '_fluid_control_theatre').addEventListener('click', function () {
                player.theatreToggle(player.videoPlayerId);
            });
        } else {
            document.getElementById(player.videoPlayerId + '_fluid_control_theatre').style.display = 'none';
        }
    },

    // Create the time position preview only if the vtt previews aren't enabled
    createTimePositionPreview: function() {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);

        if (!player.showTimeOnHover) {
            return;
        }

        var progressContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');
        var previewContainer = document.createElement('div');

        previewContainer.id = player.videoPlayerId + '_fluid_timeline_preview';
        previewContainer.className = 'fluid_timeline_preview';
        previewContainer.style.display = 'none';
        previewContainer.style.position = 'absolute';

        progressContainer.appendChild(previewContainer);

        // Set up hover for time position preview display
        document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container').addEventListener('mousemove', function(event) {
            var progressContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');
            var totalWidth = progressContainer.clientWidth;
            var hoverTimeItem = document.getElementById(player.videoPlayerId + '_fluid_timeline_preview');
            var hoverQ = fluidPlayerClass.getEventOffsetX(event, progressContainer);

            hoverSecondQ = player.currentVideoDuration * hoverQ / totalWidth;
            showad = player.pad(parseInt(hoverSecondQ / 60)) + ':' + player.pad(parseInt(hoverSecondQ % 60));
            hoverTimeItem.innerText = showad;

            hoverTimeItem.style.display = 'block';
            hoverTimeItem.style.left = (hoverSecondQ / videoPlayer.duration * 100) + "%";

        }, false);

        // Hide timeline preview on mouseout
        document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container').addEventListener('mouseout', function() {
            var hoverTimeItem = document.getElementById(player.videoPlayerId + '_fluid_timeline_preview');
            hoverTimeItem.style.display = 'none';
        }, false);
    },

    setCustomContextMenu: function() {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        //Create own context menu
        var divContextMenu = document.createElement('div');
        divContextMenu.id = player.videoPlayerId + '_fluid_context_menu';
        divContextMenu.className = 'fluid_context_menu';
        divContextMenu.style.display = 'none';
        divContextMenu.style.position = 'absolute';
        divContextMenu.innerHTML = '<ul>'+
            '    <li id="' + player.videoPlayerId + 'context_option_play">Play</li>' +
            '    <li id="' + player.videoPlayerId + 'context_option_mute">Mute</li>' +
            '    <li id="' + player.videoPlayerId + 'context_option_fullscreen">Fullscreen</li>' +
            '    <li id="' + player.videoPlayerId + 'context_option_homepage">' +
            '       <a ' +
            '           id="' + player.videoPlayerId + 'context_option_homepage_link" ' +
            '           href="' + player.homepage + '" ' +
            '           target="_blank">' +
            '           Fluid Player ' + player.version + '' +
            '       </a>' +
            '     </li>' +
            '</ul>';

        videoPlayerTag.parentNode.insertBefore(divContextMenu, videoPlayerTag.nextSibling);

        //Disable the default context menu
        videoPlayerTag.addEventListener('contextmenu', function(event) {
            event.preventDefault();

            divContextMenu.style.left = fluidPlayerClass.getEventOffsetX(event, videoPlayerTag) + 'px';
            divContextMenu.style.top = fluidPlayerClass.getEventOffsetY(event, videoPlayerTag) + 'px';
            divContextMenu.style.display = 'block';
        }, false);

        //Hide the context menu on clicking elsewhere
        document.addEventListener('click', function(event) {
            if ((event.target !== videoPlayerTag) || event.button !== 2) {
                divContextMenu.style.display = 'none';
            }

        }, false);

        //Attach events to the menu elements
        var menuOptionPlay       = document.getElementById(player.videoPlayerId + 'context_option_play');
        var menuOptionMute       = document.getElementById(player.videoPlayerId + 'context_option_mute');
        var menuOptionFullscreen = document.getElementById(player.videoPlayerId + 'context_option_fullscreen');
        var menuOptionHomepageLink   = document.getElementById(player.videoPlayerId + 'context_option_homepage_link');

        menuOptionPlay.addEventListener('click', function() {
            player.playPauseToggle(videoPlayerTag);
        }, false);

        menuOptionMute.addEventListener('click', function() {
            player.muteToggle(player.videoPlayerId);
        }, false);

        menuOptionFullscreen.addEventListener('click', function() {
            player.fullscreenToggle();
        }, false);

        menuOptionHomepageLink.style.color = 'inherit';
        menuOptionHomepageLink.style.textDecoration = 'inherit';
    },

    setDefaultLayout: function() {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        var playerWrapper = document.getElementById('fluid_video_wrapper_' + player.videoPlayerId);

        playerWrapper.className += ' fluid_player_layout_' + player.displayOptions.layoutControls.layout;

        //Remove the default Controls
        videoPlayerTag.removeAttribute('controls');

        player.setCustomContextMenu();

        var classForDisablingVolumeBar = '';
        if (!player.checkShouldDisplayVolumeBar()) {
            classForDisablingVolumeBar = ' no_volume_bar';
        }

        var divVastControls = document.createElement('div');
        divVastControls.id = player.videoPlayerId + '_fluid_controls_container';
        divVastControls.className = 'fluid_controls_container' + classForDisablingVolumeBar;
        divVastControls.innerHTML = player.generateCustomControlTags();

        videoPlayerTag.parentNode.insertBefore(divVastControls, videoPlayerTag.nextSibling);

        //Create the loading cover
        var divLoading = document.createElement('div');
        divLoading.className = 'vast_video_loading';
        divLoading.id = 'vast_video_loading_' + player.videoPlayerId;
        divLoading.style.display = 'none';

        // Primary Colour

        backgroundColor = (player.displayOptions.layoutControls.primaryColor) ? player.displayOptions.layoutControls.primaryColor : "white";
        document.getElementById(player.videoPlayerId + '_vast_control_currentprogress').style.backgroundColor = backgroundColor;

        videoPlayerTag.parentNode.insertBefore(divLoading, videoPlayerTag.nextSibling);

        var remainingAttemptsToInitiateVolumeBar = 100;

        /**
         * Set the volumebar after its elements are properly rendered.
         */
        var initiateVolumebar = function() {
            if (!remainingAttemptsToInitiateVolumeBar) {
                clearInterval(initiateVolumebarTimerId);

            } else if (player.checkIfVolumebarIsRendered()) {
                clearInterval(initiateVolumebarTimerId);
                player.contolVolumebarUpdate(player.videoPlayerId);

            } else {
                remainingAttemptsToInitiateVolumeBar--;
            }
        };

        var initiateVolumebarTimerId = setInterval(initiateVolumebar, 100);

        player.initHtmlOnPauseBlock();

        player.setCustomControls();

        player.setupThumbnailPreview();

        player.createTimePositionPreview();

        player.initPlayButton();

        player.createPlaybackList();

        player.createDownload();

        player.posterImage();
    },

    /**
     * Checks if the volumebar is rendered and the styling applied by comparing
     * the width of 2 elements that should look different.
     *
     * @returns Boolean
     */
    checkIfVolumebarIsRendered: function() {
        var player = this;
        var volumeposTag = document.getElementById(player.videoPlayerId + '_fluid_control_volume_currentpos');
        var volumebarTotalWidth = document.getElementById(player.videoPlayerId + '_fluid_control_volume').clientWidth;
        var volumeposTagWidth = volumeposTag.clientWidth;

        if (volumeposTagWidth === volumebarTotalWidth) {
            return false;
        }

        return true;
    },

    setLayout: function() {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        //All other browsers
        document.getElementById(this.videoPlayerId).addEventListener('click', function() {
            player.playPauseToggle(videoPlayerTag);
        }, false);

        switch (this.displayOptions.layoutControls.layout) {
            case 'browser':
                //Nothing special to do here at this point.
                break;

            default:
                //Mobile Safari - because it does not emit a click event on initial click of the video
                videoPlayerTag.addEventListener('play', player.initialPlay, false);
                this.setDefaultLayout();
                break;
        }
    },

    handleFullscreen: function() {
        var player = this;

        if (typeof document.vastFullsreenChangeEventListenersAdded === 'undefined') {
            ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach(
                function(eventType) {

                    if (typeof (document['on' + eventType]) === 'object') {
                        document.addEventListener(eventType, function(ev) {
                            player.recalculateAdDimensions(fluidPlayerClass.activeVideoPlayerId);
                        }, false);
                    }
                }
            );

            document.vastFullsreenChangeEventListenersAdded = true;
        }
    },

    setupThumbnailPreviewVtt: function() {
        var player = this;

        player.sendRequest(
            player.displayOptions.layoutControls.timelinePreview.file,
            true,
            player.displayOptions.vastOptions.vastTimeout,
            function() {
                var convertVttRawData = function(vttRawData) {
                    if (!(
                            (typeof vttRawData.cues !== 'undefined') &&
                            (vttRawData.cues.length)
                        )) {
                        return [];
                    }

                    var result = [];
                    var tempThumbnailData = null;
                    var tempThumbnailCoordinates = null;

                    for (var i = 0; i < vttRawData.cues.length; i++) {
                        tempThumbnailData = vttRawData.cues[i].text.split('#');
                        var xCoords = 0, yCoords = 0, wCoords = 122.5, hCoords = 69;

                        // .vtt file contains sprite corrdinates
                        if (
                            (tempThumbnailData.length === 2) &&
                            (tempThumbnailData[1].indexOf('xywh=') === 0)
                        ) {
                            tempThumbnailCoordinates = tempThumbnailData[1].substring(5);
                            tempThumbnailCoordinates = tempThumbnailCoordinates.split(',');

                            if (tempThumbnailCoordinates.length === 4) {
                                player.displayOptions.layoutControls.timelinePreview.spriteImage = true;
                                xCoords = parseInt(tempThumbnailCoordinates[0]);
                                yCoords = parseInt(tempThumbnailCoordinates[1]);
                                wCoords = parseInt(tempThumbnailCoordinates[2]);
                                hCoords = parseInt(tempThumbnailCoordinates[3]);
                            }
                        }

                        if (player.displayOptions.layoutControls.timelinePreview.spriteRelativePath
                            && player.displayOptions.layoutControls.timelinePreview.file.indexOf('/') !== -1
                            && (typeof player.displayOptions.layoutControls.timelinePreview.sprite === 'undefined' || player.displayOptions.layoutControls.timelinePreview.sprite == '')
                            ) {
                            imageUrl = player.displayOptions.layoutControls.timelinePreview.file.substring(0, player.displayOptions.layoutControls.timelinePreview.file.lastIndexOf('/'));
                            imageUrl += '/' + tempThumbnailData[0];
                        } else {
                            imageUrl = (player.displayOptions.layoutControls.timelinePreview.sprite ? player.displayOptions.layoutControls.timelinePreview.sprite : tempThumbnailData[0]);
                        }

                        result.push({
                            startTime: vttRawData.cues[i].startTime,
                            endTime: vttRawData.cues[i].endTime,
                            image: imageUrl,
                            x: xCoords,
                            y: yCoords,
                            w: wCoords,
                            h: hCoords
                        });
                    }

                    return result;
                };

                var xmlHttpReq = this;

                if ((xmlHttpReq.readyState === 4) && (xmlHttpReq.status !== 200)) {
                    //The response returned an error.
                    return;
                }

                if (!((xmlHttpReq.readyState === 4) && (xmlHttpReq.status === 200))) {
                    return;
                }

                var textResponse = xmlHttpReq.responseText;

                var webVttParser = new WebVTTParser();
                var vttRawData = webVttParser.parse(textResponse);

                player.timelinePreviewData = convertVttRawData(vttRawData);
            }
        );
    },

    generateTimelinePreviewTags: function() {
        var player = this;
        var progressContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');
        var previewContainer = document.createElement('div');

        previewContainer.id = player.videoPlayerId + '_fluid_timeline_preview_container';
        previewContainer.className = 'fluid_timeline_preview_container';
        previewContainer.style.display = 'none';
        previewContainer.style.position = 'absolute';

        progressContainer.appendChild(previewContainer);
    },

    getThumbnailCoordinates: function(second) {
        var player = this;

        if (player.timelinePreviewData.length) {
            for (var i = 0; i < player.timelinePreviewData.length; i++) {
                if ((second >= player.timelinePreviewData[i].startTime) && (second <= player.timelinePreviewData[i].endTime)) {
                    return player.timelinePreviewData[i];
                }
            }
        }

        return false;
    },

    drawTimelinePreview: function(event) {
        var player = this;
        var timelinePreviewTag = document.getElementById(player.videoPlayerId + '_fluid_timeline_preview_container');
        var progressContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');
        var totalWidth = progressContainer.clientWidth;

        if (player.isCurrentlyPlayingAd) {
            if (timelinePreviewTag.style.display !== 'none') {
                timelinePreviewTag.style.display = 'none';
            }

            return;
        }

        //get the hover position
        var hoverX = fluidPlayerClass.getEventOffsetX(event, progressContainer);
        var hoverSecond = null;

        if (totalWidth) {
            hoverSecond = player.currentVideoDuration * hoverX / totalWidth;

            //get the corresponding thumbnail coordinates
            var thumbnailCoordinates = player.getThumbnailCoordinates(hoverSecond);

            if (thumbnailCoordinates !== false) {
                timelinePreviewTag.style.width = thumbnailCoordinates.w + 'px';
                timelinePreviewTag.style.height = thumbnailCoordinates.h + 'px';
                timelinePreviewTag.style.background =
                    'url(' + thumbnailCoordinates.image + ') no-repeat scroll -' + thumbnailCoordinates.x + 'px -' + thumbnailCoordinates.y + 'px';
                timelinePreviewTag.style.left = hoverX - (thumbnailCoordinates.w / 2) + 'px';
                timelinePreviewTag.style.display = 'block';
                if (!player.displayOptions.layoutControls.timelinePreview.spriteImage) {
                    timelinePreviewTag.style.backgroundSize = 'contain';
                }

            } else {
                timelinePreviewTag.style.display = 'none';
            }
        }
    },

    setupThumbnailPreview: function() {
        var player = this;

        if (
            player.displayOptions.layoutControls.timelinePreview &&
            (typeof player.displayOptions.layoutControls.timelinePreview.file === 'string') &&
            (typeof player.displayOptions.layoutControls.timelinePreview.type === 'string')
        ) {
            switch (player.displayOptions.layoutControls.timelinePreview.type) {
                case 'VTT':
                    fluidPlayerClass.requestScript(
                        fluidPlayerScriptLocation + fluidPlayerClass.vttParserScript,
                        player.setupThumbnailPreviewVtt.bind(this)
                    );

                    document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container')
                        .addEventListener('mousemove', player.drawTimelinePreview.bind(player), false);

                    document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container')
                        .addEventListener('mouseout', function() {
                            document.getElementById(player.videoPlayerId + '_fluid_timeline_preview_container').style.display = 'none';
                        }, false);

                    player.generateTimelinePreviewTags();
                    break;

                default:
                    break;
            }

            player.showTimeOnHover = false;
        }
    },

    setupPlayerWrapper: function() {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);

        //Create a Wrapper Div element
        var divVideoWrapper = document.createElement('div');
        divVideoWrapper.className = (fluidPlayerClass.isTouchDevice() ? 'fluid_video_wrapper mobile' : 'fluid_video_wrapper');

        divVideoWrapper.id = 'fluid_video_wrapper_' + player.videoPlayerId;

        //Assign the height/width dimensions to the wrapper
        if (player.displayOptions.layoutControls.fillToContainer) {
            divVideoWrapper.style.width = '100%';
            divVideoWrapper.style.height = '100%';
        } else {
            divVideoWrapper.style.height = videoPlayer.clientHeight + 'px';
            divVideoWrapper.style.width = videoPlayer.clientWidth + 'px';
        }
        videoPlayer.style.height = '100%';
        videoPlayer.style.width = '100%';

        videoPlayer.parentNode.insertBefore(divVideoWrapper, videoPlayer);
        divVideoWrapper.appendChild(videoPlayer);
    },

    onErrorDetection: function() {
        var videoPlayerTag = this;
        var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);

        if (
            (videoPlayerTag.networkState === videoPlayerTag.NETWORK_NO_SOURCE) &&
            player.isCurrentlyPlayingAd
        ) {
            //Probably the video ad file was not loaded successfully
            player.playMainVideoWhenVastFails(401);
        }

    },

    createVideoSourceSwitch: function() {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);
        if (player.displayOptions.layoutControls.layout === 'browser') {
            return;
        }

        var sources = [];
        var sourcesList = videoPlayer.querySelectorAll('source');
        [].forEach.call(sourcesList, function (source) {
            if (source.title && source.src) {
                sources.push({'title': source.title, 'url': source.src});
            }
        });

        player.videoSources = sources;
        if (player.videoSources.length > 1) {
            var sourceChangeButton = document.getElementById(player.videoPlayerId + '_fluid_control_video_source');

            var sourceChangeList = document.createElement('div');
            sourceChangeList.id = player.videoPlayerId + '_fluid_control_video_source_list';
            sourceChangeList.className = 'fluid_video_sources_list';
            sourceChangeList.style.display = 'none';

            var firstSource = true;
            player.videoSources.forEach(function(source) {
                var sourceSelected = (firstSource) ? "source_selected" :  "";
                firstSource = false;
                var sourceChangeDiv = document.createElement('div');
                sourceChangeDiv.className = 'fluid_video_source_list_item';
                sourceChangeDiv.innerHTML = '<span class="source_button_icon ' + sourceSelected + '"></span>' + source.title;

                sourceChangeDiv.addEventListener('click', function(event) {
                    event.stopPropagation();
                    var videoChangedTo = this;
                    var sourceIcons = document.getElementsByClassName('source_button_icon');
                    for (var i = 0; i < sourceIcons.length; i++) {
                        sourceIcons[i].className = sourceIcons[i].className.replace("source_selected", "");
                    }
                    videoChangedTo.firstChild.className += ' source_selected';

                    player.videoSources.forEach(function(source) {
                        if (source.title == videoChangedTo.innerText) {
                            player.setBuffering();
                            player.setVideoSource(source.url);
                        }
                    });

                    player.openCloseVideoSourceSwitch();

                });
                sourceChangeList.appendChild(sourceChangeDiv);
            });

            sourceChangeButton.appendChild(sourceChangeList);
            sourceChangeButton.addEventListener('click', function() {
                player.openCloseVideoSourceSwitch();
            });

        } else {
            // No other video sources
            document.getElementById(player.videoPlayerId + '_fluid_control_video_source').style.display = 'none';
        }
    },

    openCloseVideoSourceSwitch: function() {
        var player = this;
        var sourceChangeList = document.getElementById(this.videoPlayerId + '_fluid_control_video_source_list');
        var sourceChangeListContainer = document.getElementById(this.videoPlayerId + '_fluid_control_video_source');

        if (player.isCurrentlyPlayingAd) {
            sourceChangeList.style.display = 'none';
            return;
        }

        if (sourceChangeList.style.display == 'none') {
            sourceChangeList.style.display = 'block';
            var mouseOut = function(event) {
                sourceChangeListContainer.removeEventListener('mouseleave', mouseOut);
                sourceChangeList.style.display = 'none';
            };
            sourceChangeListContainer.addEventListener('mouseleave', mouseOut);
        } else {
            sourceChangeList.style.display = 'none';
        }
    },

    setVideoSource: function(url) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        if (player.isCurrentlyPlayingAd) {
            player.originalSrc = url;
        } else {
            player.isSwitchingSource = true;
            var play = false;
            if (!videoPlayerTag.paused) {
                videoPlayerTag.pause();
                var play = true;
            }

            var currentTime = videoPlayerTag.currentTime;
            player.setCurrentTimeAndPlay(currentTime, play);

            videoPlayerTag.src = url;
            player.originalSrc = url;
            player.displayOptions.layoutControls.mediaType = player.getCurrentSrcType();
            player.initialiseStreamers();
        }
    },

    setCurrentTimeAndPlay: function(newCurrentTime, shouldPlay) {
        var videoPlayerTag = document.getElementById(this.videoPlayerId);
        var player = this;

        var loadedMetadata = function() {
            videoPlayerTag.currentTime = newCurrentTime;
            videoPlayerTag.removeEventListener('loadedmetadata', loadedMetadata);
            // Safari ios fix to set currentTime
            if (fluidPlayerClass.getMobileOs().userOs == 'iOS') {
                videoPlayerTag.addEventListener('playing', videoPlayStart);
            }

            if (shouldPlay) {
                videoPlayerTag.play();
            }
            player.isSwitchingSource = false;
        };
        var videoPlayStart = function() {
            this.currentTime = newCurrentTime;
            videoPlayerTag.removeEventListener('playing', videoPlayStart);
        };

        videoPlayerTag.addEventListener("loadedmetadata", loadedMetadata, false);

        videoPlayerTag.load();
    },

    initLogo: function() {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);
        if (!player.displayOptions.layoutControls.logo.imageUrl) {
            return;
        }

        // Container div for the logo
        // This is to allow for fade in and out logo_maintain_display
        var logoHolder = document.createElement('div');
        logoHolder.id = player.videoPlayerId + '_logo';
        var hideClass = 'logo_maintain_display';
        if (player.displayOptions.layoutControls.logo.hideWithControls) {
            hideClass = 'initial_controls_show';
        }
        logoHolder.classList.add(hideClass, 'fp_logo');

        // The logo itself
        var logoImage = document.createElement('img');
        logoImage.id = player.videoPlayerId + '_logo_image';
        if (player.displayOptions.layoutControls.logo.imageUrl) {
            logoImage.src = player.displayOptions.layoutControls.logo.imageUrl;
        }
        logoImage.style.position = 'absolute';
        logoImage.style.margin = player.displayOptions.layoutControls.logo.imageMargin;
        var logoPosition = player.displayOptions.layoutControls.logo.position.toLowerCase();
        if (logoPosition.indexOf('bottom') !== -1) {
            logoImage.style.bottom = 0;
        } else {
            logoImage.style.top = 0;
        }
        if (logoPosition.indexOf('right') !== -1) {
            logoImage.style.right = 0;
        } else {
            logoImage.style.left = 0;
        }
        if (player.displayOptions.layoutControls.logo.opacity) {
            logoImage.style.opacity = player.displayOptions.layoutControls.logo.opacity;
        }

        if (player.displayOptions.layoutControls.logo.clickUrl !== null) {
            logoImage.style.cursor = 'pointer';
            logoImage.addEventListener('click', function() {
                var win = window.open(player.displayOptions.layoutControls.logo.clickUrl, '_blank');
                win.focus();
            });
        }

        // If a mouseOverImage is provided then we must set up the listeners for it
        if (player.displayOptions.layoutControls.logo.mouseOverImageUrl) {
            logoImage.addEventListener('mouseover', function(){ logoImage.src = player.displayOptions.layoutControls.logo.mouseOverImageUrl; }, false);
            logoImage.addEventListener('mouseout', function(){ logoImage.src = player.displayOptions.layoutControls.logo.imageUrl; }, false);
        }

        videoPlayer.parentNode.insertBefore(logoHolder, null);
        logoHolder.appendChild(logoImage, null);
    },

    initHtmlOnPauseBlock: function() {
        var player = this;

        //If onPauseRoll is defined than HtmlOnPauseBlock won't be shown
        if (player.hasValidOnPauseAd()) {
            return;
        }

        if (!player.displayOptions.layoutControls.htmlOnPauseBlock.html) {
            return;
        }

        var videoPlayer = document.getElementById(player.videoPlayerId);
        var containerDiv = document.createElement('div');
        containerDiv.id = player.videoPlayerId + '_fluid_html_on_pause';
        containerDiv.className = 'fluid_html_on_pause';
        containerDiv.style.display = 'none';
        containerDiv.innerHTML = player.displayOptions.layoutControls.htmlOnPauseBlock.html;
        containerDiv.onclick = function(event) {
            player.playPauseToggle(videoPlayer);
        };

        if (player.displayOptions.layoutControls.htmlOnPauseBlock.width) {
            containerDiv.style.width = player.displayOptions.layoutControls.htmlOnPauseBlock.width + 'px';
        }

        if (player.displayOptions.layoutControls.htmlOnPauseBlock.height) {
            containerDiv.style.height = player.displayOptions.layoutControls.htmlOnPauseBlock.height + 'px';
        }

        videoPlayer.parentNode.insertBefore(containerDiv, null);
    },

    /**
     * Play button in the middle when the video loads
     */
    initPlayButton: function() {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);

        // Create the html fpr the play button
        var containerDiv = document.createElement('div');
        containerDiv.id = player.videoPlayerId + '_fluid_initial_play_button';
        containerDiv.className = 'fluid_html_on_pause';
        backgroundColor = (player.displayOptions.layoutControls.primaryColor) ? player.displayOptions.layoutControls.primaryColor : "#333333";
        containerDiv.innerHTML = '<div id="' + player.videoPlayerId + '_fluid_initial_play" class="fluid_initial_play" style="background-color:' + backgroundColor + '"><div id="' + player.videoPlayerId + '_fluid_state_button" class="fluid_initial_play_button"></div></div>';
        containerDiv.onclick = function(event) {
            player.playPauseToggle(videoPlayer);
        };

        // If the user has chosen to not show the play button we'll make it invisible
        // We don't hide altogether because animations might still be used
        if (!player.displayOptions.layoutControls.playButtonShowing) {
            var initialControlsDisplay = document.getElementById(player.videoPlayerId + '_fluid_controls_container');
            initialControlsDisplay.classList.add('initial_controls_show');
            containerDiv.style.opacity = '0';
        }

        videoPlayer.parentNode.insertBefore(containerDiv, null);
    },

    /**
     * Set the mainVideoDuration property one the video is loaded
     */
    mainVideoReady: function() {
        var videoPlayerTag = this;
        var player = fluidPlayerClass.getInstanceById(this.id);

        if (player.mainVideoDuration == 0 && !player.isCurrentlyPlayingAd && player.mainVideoReadyState === false) {
            player.mainVideoDuration = videoPlayerTag.duration;
            player.mainVideoReadyState = true;
            var event = new CustomEvent("mainVideoDurationSet");
            videoPlayerTag.dispatchEvent(event);
            videoPlayerTag.removeEventListener('loadedmetadata', player.mainVideoReady);
        }

    },

    userActivityChecker: function () {
        var player = this;
        var videoPlayer = document.getElementById('fluid_video_wrapper_' + player.videoPlayerId);
        player.newActivity = null;

        var activity = function () {
            player.newActivity = true;
        };

        activityCheck = setInterval(function () {

            if (player.newActivity === true) {
                player.newActivity = false;

                var videoPlayerTag = document.getElementById(player.videoPlayerId);
                if (player.isUserActive === false) {
                    var videoPlayerTag = document.getElementById(player.videoPlayerId);
                    var event = new CustomEvent("userActive");
                    videoPlayerTag.dispatchEvent(event);
                    player.isUserActive = true;
                }

                clearTimeout(player.inactivityTimeout);

                player.inactivityTimeout = setTimeout(function () {

                    if (player.newActivity !== true) {
                        player.isUserActive = false;
                        event = new CustomEvent("userInactive");
                        videoPlayerTag.dispatchEvent(event);
                    } else {
                        clearTimeout(player.inactivityTimeout);
                    }

                }, player.displayOptions.layoutControls.controlBar.autoHideTimeout * 1000);


            }
        }, 300);

        var listenTo = (fluidPlayerClass.isTouchDevice()) ? 'touchstart' : 'mousemove';
        videoPlayer.addEventListener(listenTo, activity);
    },

    hasControlBar: function () {
        return (document.getElementById(this.videoPlayerId + '_fluid_controls_container') && this.displayOptions.layoutControls.layout != "browser") ? true : false;
    },

    isControlBarVisible: function() {
        var controlBar = document.getElementById(this.videoPlayerId + '_fluid_controls_container');
        var style = window.getComputedStyle(controlBar, null);
        return !(style.opacity == 0 || style.visibility == 'hidden');
    },

    hideControlBar: function () {
        var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(this.getAttribute('id'));
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
        var videoPlayerTag = document.getElementById(videoInstanceId);

        if (videoPlayerInstance.isCurrentlyPlayingAd && !videoPlayerTag.paused && videoPlayerInstance.displayOptions.layoutControls.layout !== 'browser') {
            videoPlayerInstance.toggleAdCountdown(true);
        }

        if (videoPlayerInstance.hasControlBar()) {
            var divVastControls = document.getElementById(videoPlayerInstance.videoPlayerId + '_fluid_controls_container');
            var fpLogo = document.getElementById(videoPlayerInstance.videoPlayerId + '_logo');

            if (videoPlayerInstance.displayOptions.layoutControls.controlBar.animated) {
                videoPlayerInstance.fadeOut(divVastControls);
                if (fpLogo) {
                    videoPlayerInstance.fadeOut(fpLogo);
                }
            } else {
                divVastControls.style.display = 'none';
                if (fpLogo){
                    fpLogo.style.display = 'none';
                }
            }

        }

        videoPlayerTag.style.cursor = 'none';
    },

    showControlBar: function () {
        var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(this.getAttribute('id'));
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
        var videoPlayerTag = document.getElementById(videoInstanceId);

        if (videoPlayerInstance.isCurrentlyPlayingAd && !videoPlayerTag.paused && videoPlayerInstance.displayOptions.layoutControls.layout !== 'browser') {
            videoPlayerInstance.toggleAdCountdown(false);
        }

        if (videoPlayerInstance.hasControlBar()) {
            var divVastControls = document.getElementById(videoPlayerInstance.videoPlayerId + '_fluid_controls_container');
            var fpLogo = document.getElementById(videoPlayerInstance.videoPlayerId + '_logo');

            if (videoPlayerInstance.displayOptions.layoutControls.controlBar.animated) {
                videoPlayerInstance.fadeIn(divVastControls);
                if (fpLogo) {
                    videoPlayerInstance.fadeIn(fpLogo);
                }
            } else {
                divVastControls.style.display = 'block';
                if (fpLogo) {
                    fpLogo.style.display = 'block';
                }
            }
        }

        if (!fluidPlayerClass.isTouchDevice()) {
            videoPlayerTag.style.cursor = 'default';
        }
    },

    fadeOut: function (element) {
        var opacity = 1;
        var timer = setInterval(function () {
            if (opacity <= 0.1) {
                opacity = 0;
                clearInterval(timer);
            } else {
                opacity -= 0.1;
            }
            element.style.opacity = opacity;
        }, 50);
    },

    fadeIn: function (element) {
        var opacity = 0.2;
        var timer = setInterval(function () {
            if (opacity >= 1) {
                opacity = 1;
                clearInterval(timer);
            } else {
                opacity += 0.2;
            }
            element.style.opacity = opacity;
        }, 10);
    },

    linkControlBarUserActivity: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        videoPlayerTag.addEventListener('userInactive', player.hideControlBar);
        videoPlayerTag.addEventListener('userActive', player.showControlBar);
    },

    initMute: function() {
        var player = this;
        if (player.displayOptions.layoutControls.mute === true) {
            var videoPlayerTag = document.getElementById(player.videoPlayerId);
            videoPlayerTag.volume = 0;
        }
    },

    setBuffering: function() {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);

        var bufferBar = document.getElementById(player.videoPlayerId + "_buffered_amount");
        bufferBar.style.width = 0;

        // Buffering
        logProgress = function() {
            var duration =  videoPlayer.duration;
            if (duration > 0) {
                for (var i = 0; i < videoPlayer.buffered.length; i++) {
                    if (videoPlayer.buffered.start(videoPlayer.buffered.length - 1 - i) < videoPlayer.currentTime) {
                        bufferBar.style.width = (videoPlayer.buffered.end(videoPlayer.buffered.length - 1 - i) / duration) * 100 + "%";

                        // Stop checking for buffering if the video is fully buffered
                        if ((videoPlayer.buffered.end(videoPlayer.buffered.length - 1 - i) / duration) == "1") {
                            clearInterval(progressInterval);
                        }

                        break;
                    }

                }
            }
        };
        var progressInterval = setInterval(logProgress, 500);
    },

    createPlaybackList: function() {
        var player = this;
        var playbackRates = ['x2', 'x1.5', 'x1', 'x0.5'];

        if (player.displayOptions.layoutControls.playbackRateEnabled) {
            var sourceChangeButton = document.getElementById(player.videoPlayerId + '_fluid_control_playback_rate');

            var sourceChangeList = document.createElement('div');
            sourceChangeList.id = player.videoPlayerId + '_fluid_control_video_playback_rate';
            sourceChangeList.className = 'fluid_video_playback_rates';
            sourceChangeList.style.display = 'none';

            playbackRates.forEach(function(rate) {
                var sourceChangeDiv = document.createElement('div');
                sourceChangeDiv.className = 'fluid_video_playback_rates_item';
                sourceChangeDiv.innerText = rate;

                sourceChangeDiv.addEventListener('click', function(event) {
                    event.stopPropagation();
                    playbackRate = this.innerText.replace('x','');
                    player.setPlaybackSpeed(playbackRate);
                    player.openCloseVideoPlaybackRate();

                });
                sourceChangeList.appendChild(sourceChangeDiv);
            });

            sourceChangeButton.appendChild(sourceChangeList);
            sourceChangeButton.addEventListener('click', function() {
                player.openCloseVideoPlaybackRate();
            });

        } else {
            // No other video sources
            document.getElementById(player.videoPlayerId + '_fluid_control_playback_rate').style.display = 'none';
        }
    },

    openCloseVideoPlaybackRate: function() {
        var player = this;
        var sourceChangeList = document.getElementById(this.videoPlayerId + '_fluid_control_video_playback_rate');
        var sourceChangeListContainer = document.getElementById(this.videoPlayerId + '_fluid_control_playback_rate');

        if (player.isCurrentlyPlayingAd) {
            sourceChangeList.style.display = 'none';
            return;
        }

        if (sourceChangeList.style.display == 'none') {
            sourceChangeList.style.display = 'block';
            var mouseOut = function() {
                sourceChangeListContainer.removeEventListener('mouseleave', mouseOut);
                sourceChangeList.style.display = 'none';
            };
            sourceChangeListContainer.addEventListener('mouseleave', mouseOut);
        } else {
            sourceChangeList.style.display = 'none';
        }
    },

    createDownload: function() {
        var player = this;
        var downloadOption = document.getElementById(this.videoPlayerId + '_fluid_control_download');
        if (player.displayOptions.layoutControls.allowDownload) {
            downloadClick = document.createElement('a');
            downloadClick.id = this.videoPlayerId + '_download';
            downloadOption.appendChild(downloadClick);

            downloadOption.addEventListener('click', function() {
                var downloadItem = document.getElementById(player.videoPlayerId + '_download');
                downloadItem.download = player.originalSrc;
                downloadItem.href = player.originalSrc;
                downloadClick.click();
            });
        } else {
            downloadOption.style.display = 'none';
        }
    },

    theatreToggle: function() {
        if (this.isInIframe) {
            return;
        }

        var downloadItem = document.getElementById('fluid_video_wrapper_' + this.videoPlayerId);
        if (!this.theatreMode) {
            // Theatre and fullscreen, it's only one or the other
            if (this.fullscreenMode) {
                this.fullscreenToggle();
            }

            downloadItem.classList.add('fluid_theatre_mode');
            lessFullHeight = (screen.height / 100) * 60;
            downloadItem.style.width = '100%';
            downloadItem.style.height = "60%";
            downloadItem.style.maxHeight = lessFullHeight + "px";
            this.theatreMode = true;
        } else {
            downloadItem.classList.remove('fluid_theatre_mode');
            downloadItem.style.maxHeight = "";
            if (!this.displayOptions.layoutControls.fillToContainer) {
                downloadItem.style.width = this.originalWidth + 'px';
                downloadItem.style.height = this.originalHeight + 'px';
            } else {
                downloadItem.style.width = '100%';
                downloadItem.style.height = '100%';
            }
            this.theatreMode = false;
        }
    },

    // Set the poster for the video, taken from custom params
    posterImage: function() {
        if (this.displayOptions.layoutControls.posterImage) {
            var videoPlayer = document.getElementById(this.videoPlayerId);
            videoPlayer.poster = this.displayOptions.layoutControls.posterImage;
        }
    },

    initialiseStreamers: function() {
        this.detachStreamers();
        switch (this.displayOptions.layoutControls.mediaType) {
            case 'application/dash+xml': // MPEG-DASH
                if (!this.dashScriptLoaded) { // First time trying adding in DASH streamer, get the script
                    this.dashScriptLoaded = true;
                    fluidPlayerClass.requestScript('https://cdn.dashjs.org/latest/dash.mediaplayer.min.js', this.initialiseDash.bind(this));
                } else {
                    this.initialiseDash();
                }
                break;
            case 'application/x-mpegURL': // HLS
                if (!this.hlsScriptLoaded) { // First time trying adding in DASH streamer, get the script
                    this.hlsScriptLoaded = true;
                    fluidPlayerClass.requestScript('https://cdn.jsdelivr.net/npm/hls.js@latest', this.initialiseHls.bind(this));
                } else {
                    this.initialiseHls();
                }
                break;
        }
    },

    initialiseDash: function() {
        if ( typeof ( window.MediaSource || window.WebKitMediaSource ) === "function") {
            var playVideo = (!this.autoplayAfterAd) ? this.autoplayAfterAd : this.displayOptions.layoutControls.autoPlay; // If false we want to override the autoPlay, as it comes from postRoll
            var dashPlayer = dashjs.MediaPlayer().create();
            dashPlayer.getDebug().setLogToBrowserConsole(false); // Remove default logging that clogs up the console
            dashPlayer.initialize(document.getElementById(this.videoPlayerId), this.originalSrc, playVideo);
            this.dashPlayer = dashPlayer;
        } else {
            this.nextSource();
            console.log('[FP_ERROR] Media type not supported by this browser. (application/dash+xml)');
        }
    },

    initialiseHls: function() {
        if (Hls.isSupported()) {
            var hls = new Hls();
            hls.attachMedia(document.getElementById(this.videoPlayerId));
            hls.loadSource(this.originalSrc);
            this.hlsPlayer = hls;
            if (!this.firstPlayLaunched && this.displayOptions.layoutControls.autoPlay) {
                document.getElementById(this.videoPlayerId).play();
            }
        } else {
            this.nextSource();
            console.log('[FP_ERROR] Media type not supported by this browser. (application/x-mpegURL)');
        }
    },

    detachStreamers: function() {
        if (this.dashPlayer) {
            this.dashPlayer.reset();
            this.dashPlayer = false;
        } else if (this.hlsPlayer) {
            this.hlsPlayer.detachMedia();
            this.hlsPlayer = false;
        }
    },

    // This is called when a media type is unsupported. we'll find the current source and try set the next source if it exists
    nextSource: function() {
        var sources = document.getElementById(this.videoPlayerId).getElementsByTagName('source');

        if (sources.length) {
            for (var i = 0; i < sources.length - 1; i++) {
                if (sources[i].getAttribute('src') == this.originalSrc && sources[i + 1].getAttribute('src')) {
                    this.setVideoSource(sources[i + 1].getAttribute('src'));
                    return;
                }
            }
        }

        return null;
    },

    inIframe: function() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    },

    init: function(idVideoPlayer, options) {
        var player = this;
        var videoPlayer = document.getElementById(idVideoPlayer);

        videoPlayer.setAttribute('playsinline', '');
        videoPlayer.setAttribute('webkit-playsinline', '');

        player.vastOptions = {
            tracking:     [],
            stopTracking: []
        };

        player.videoPlayerId           = idVideoPlayer;
        player.originalSrc             = player.getCurrentSrc();
        player.isCurrentlyPlayingAd    = false;
        player.recentWaiting           = false;
        player.latestVolume            = 1;
        player.currentVideoDuration    = 0;
        player.firstPlayLaunched       = false;
        player.suppressClickthrough    = false;
        player.timelinePreviewData     = [];
        player.mainVideoCurrentTime    = 0;
        player.mainVideoDuration       = 0;
        player.isTimer                 = false;
        player.timer                   = null;
        player.timerPool               = {};
        player.adList                  = {};
        player.adPool                  = {};
        player.availableRolls          = ['preRoll', 'midRoll', 'postRoll', 'onPauseRoll'];
        player.supportedNonLinearAd    = ['300x250', '468x60', '728x90'];
        player.autoplayAfterAd         = true;
        player.nonLinearDuration       = 15;
        player.supportedStaticTypes    = ['image/gif', 'image/jpeg', 'image/png'];
        player.inactivityTimeout       = null;
        player.isUserActive            = null;
        player.nonLinearVerticalAlign  = 'bottom';
        player.showTimeOnHover         = true;
        player.initialAnimationSet     = true;
        player.theatreMode             = false;
        player.fullscreenMode          = false;
        player.originalWidth           = videoPlayer.offsetWidth;
        player.originalHeight          = videoPlayer.offsetHeight;
        player.dashPlayer              = false;
        player.hlsPlayer               = false;
        player.dashScriptLoaded        = false;
        player.hlsScriptLoaded         = false;
        player.isPlayingMedia          = false;
        player.isSwitchingSource       = false;
        player.isInIframe              = player.inIframe();
        player.mainVideoReadyState     = false;
        player.xmlCollection           = [];
        player.inLineFound             = null;

        //Default options
        player.displayOptions = {
            layoutControls: {
                mediaType:                    player.getCurrentSrcType(),
                primaryColor:                 false,
                posterImage:                  false,
                adProgressColor:              '#f9d300',
                playButtonShowing:            true,
                playPauseAnimation:           true,
                closeButtonCaption:           'Close', // Remove?
                fillToContainer:              false,
                autoPlay:                     false,
                mute:                         false,
                keyboardControl:              true,
                allowDownload:                false,
                playbackRateEnabled:          false,
                allowTheatre:                 true,
                logo: {
                    imageUrl:                 null,
                    position:                 'top left',
                    clickUrl:                 null,
                    opacity:                  1,
                    mouseOverImageUrl:        null,
                    imageMargin:              '2px',
                    hideWithControls:         false,
                    showOverAds:              false
                },
                controlBar: {
                    autoHide:                 false,
                    autoHideTimeout:          3,
                    animated:                 true
                },
                timelinePreview:              {
                    spriteImage:              false,
                    spriteRelativePath:       false
                },
                htmlOnPauseBlock: {
                    html:                     null,
                    height:                   null,
                    width:                    null
                },
                layout:                       'default', //options: 'default', 'browser', '<custom>'
                playerInitCallback:           (function() {})
            },
            vastOptions: {
                adList:                       {},
                skipButtonCaption:            'Skip ad in [seconds]',
                skipButtonClickCaption:       'Skip Ad <span class="skip_button_icon"></span>',
                adText:                       null,
                adTextPosition:               'top left',
                adCTAText:                    'Visit now!',
                adCTATextPosition:            'bottom right',
                vastTimeout:                  5000,
                showProgressbarMarkers:       false,
                maxVastTagJumps:              3,

                vastAdvanced: {
                    vastLoadedCallback:       (function() {}),
                    noVastVideoCallback:      (function() {}),
                    vastVideoSkippedCallback: (function() {}),
                    vastVideoEndedCallback:   (function() {})
                }
            }
        };

        // Overriding the default options
        for (var key in options) {
            if(typeof options[key] == "object") {
                for (var subKey in options[key]) {
                    player.displayOptions[key][subKey] = options[key][subKey];
                }
            } else {
                player.displayOptions[key] = options[key];
            }
        }

        player.initialiseStreamers();

        player.setupPlayerWrapper();

        videoPlayer.addEventListener('webkitfullscreenchange', player.recalculateAdDimensions, false);
        videoPlayer.addEventListener('fullscreenchange', player.recalculateAdDimensions, false);
        videoPlayer.addEventListener('waiting', player.onRecentWaiting, false);
        videoPlayer.addEventListener('pause', player.onFluidPlayerPause, false);
        videoPlayer.addEventListener('loadedmetadata', player.mainVideoReady, false);
        videoPlayer.addEventListener('durationchange', function() {player.currentVideoDuration = player.getCurrentVideoDuration();}, false);
        videoPlayer.addEventListener('error', player.onErrorDetection, false);
        videoPlayer.addEventListener('ended', player.onMainVideoEnded, false);

        //Manually load the video duration if the video was loaded before adding the event listener
        player.currentVideoDuration = player.getCurrentVideoDuration();

        if (isNaN(player.currentVideoDuration)) {
            player.currentVideoDuration = 0;
        }

        player.setLayout();

        //Set the volume control state
        player.latestVolume = videoPlayer.volume;

        // Set the default animation setting
        player.initialAnimationSet = player.displayOptions.layoutControls.playPauseAnimation;

        //Set the custom fullscreen behaviour
        player.handleFullscreen();

        player.initLogo();

        player.initMute();

        player.displayOptions.layoutControls.playerInitCallback();

        player.createVideoSourceSwitch();
        player.userActivityChecker();

        player.setVastList();

        var _play_videoPlayer = videoPlayer.play;
        videoPlayer.play = function () {
            var videoPlayerTag = this;
            var promise = null;
            var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);

            try {

                promise = _play_videoPlayer.apply(this, arguments);

                if (promise !== undefined && promise !== null) {

                    promise.then(function() {

                        player.isPlayingMedia = true;
                        clearTimeout(player.promiseTimeout);

                    }).catch(function (error) {

                        var isAbortError = (typeof error.name !== 'undefined' && error.name === 'AbortError');
                        // Ignore abort errors which caused for example Safari or autoplay functions
                        // (example: interrupted by a new load request)
                        if(isAbortError) {
                            // Ignore AbortError error reporting
                        } else {
                            player.announceLocalError(202, 'Failed to play video.');
                        }
                        clearTimeout(player.promiseTimeout);

                    });

                    player.promiseTimeout = setTimeout(function () {
                        if (player.isPlayingMedia === false) {
                            player.announceLocalError(204, 'Timeout error. Failed to play video.');
                        }
                    }, 5000);

                }

            } catch (error) {
                player.announceLocalError(201, 'Failed to play video.');
            }

        };

        var _pause_videoPlayer = videoPlayer.pause;
        videoPlayer.pause = function () {
            var videoPlayer = this;
            var player = fluidPlayerClass.getInstanceById(videoPlayer.id);

            if (player.isPlayingMedia === true) {
                player.isPlayingMedia = false;
                return _pause_videoPlayer.apply(this, arguments);

            } else {

                // just in case
                if (player.isCurrentlyPlayingVideo(videoPlayer)) {
                    try {
                        player.isPlayingMedia = false;
                        return _pause_videoPlayer.apply(this, arguments);
                    } catch (e) {
                        player.announceLocalError(203, 'Failed to play video.');
                    }
                }

            }

        };

        if (player.displayOptions.layoutControls.autoPlay && !player.dashScriptLoaded && !player.hlsScriptLoaded) {

            //There is known issue with Safari 11+, will prevent autoPlay, so we wont try
            var browserVersion = fluidPlayerClass.getBrowserVersion();
            if (browserVersion.browserName == 'Safari' && browserVersion.majorVersion >= 11){
                return;
            }

            videoPlayer.play();
        }

        //Keyboard Controls
        if (player.displayOptions.layoutControls.keyboardControl) {
            player.keyboardControl();
        }

        if (player.displayOptions.layoutControls.controlBar.autoHide) {
            player.linkControlBarUserActivity();
        }
    },

    // "API" Functions
    play: function() {
        var videoPlayer = document.getElementById(this.videoPlayerId);
        if (videoPlayer.paused) {
            this.playPauseToggle(videoPlayer);
        }
        return true;
    },

    pause: function() {
        var videoPlayer = document.getElementById(this.videoPlayerId);
        if (!videoPlayer.paused) {
            this.playPauseToggle(videoPlayer);
        }
        return true;
    },

    skipTo: function(time) {
        var videoPlayer = document.getElementById(this.videoPlayerId);
        videoPlayer.currentTime = time;
    },

    setPlaybackSpeed: function(speed) {
        var videoPlayer = document.getElementById(this.videoPlayerId);
        videoPlayer.playbackRate = speed;
    },

    setVolume: function(passedVolume) {
        var videoPlayer = document.getElementById(this.videoPlayerId);
        videoPlayer.volume = passedVolume;
    },

    isCurrentlyPlayingVideo: function(instance) {
        return instance && instance.currentTime > 0 && !instance.paused && !instance.ended && instance.readyState > 2;
    },

    setHtmlOnPauseBlock: function(passedHtml) {
        if (typeof passedHtml != 'object' || typeof passedHtml.html == 'undefined') {
            return false;
        }

        var htmlBlock = document.getElementById(this.videoPlayerId + "_fluid_html_on_pause");

        // We create the HTML block from scratch if it doesn't already exist
        if (!htmlBlock) {
            var videoPlayer = document.getElementById(player.videoPlayerId);
            var containerDiv = document.createElement('div');
            containerDiv.id = player.videoPlayerId + '_fluid_html_on_pause';
            containerDiv.className = 'fluid_html_on_pause';
            containerDiv.style.display = 'none';
            containerDiv.innerHTML = passedHtml.html;
            containerDiv.onclick = function() {
                player.playPauseToggle(videoPlayer);
            };

            if (passedHtml.width) {
                containerDiv.style.width = passedHtml.width + 'px';
            }

            if (passedHtml.height) {
                containerDiv.style.height = passedHtml.height + 'px';
            }

            videoPlayer.parentNode.insertBefore(containerDiv, null);
        } else {
            htmlBlock.innerHTML = passedHtml.html;

            if (passedHtml.width) {
                htmlBlock.style.width = passedHtml.width + 'px';
            }

            if (passedHtml.height) {
                htmlBlock.style.height = passedHtml.height + 'px';
            }
        }
    },

    toggleControlBar: function(show) {
        var controlBar = document.getElementById(this.videoPlayerId + "_fluid_controls_container");

        if (show) {
            controlBar.className += " initial_controls_show";
        } else {
            controlBar.className = controlBar.className.replace(" initial_controls_show", "");
        }
    },

    toggleFullscreen: function(fullscreen) {
        if (this.fullscreenMode != fullscreen) {

            // If we're turning fullscreen on and we're in theatre mode, remove theatre
            if (fullscreen && this.theatreMode) {
                this.theatreToggle();
            }

            this.fullscreenToggle();
        }
    },

    on: function(eventCall, functionCall) {
        var videoPlayer = document.getElementById(this.videoPlayerId);
        switch(eventCall) {
            case 'play':
                videoPlayer.onplay = functionCall;
                break;
            case 'pause':
                videoPlayer.onpause = functionCall;
                break;
            default:
                console.log('[FP_ERROR] Event not recognised');
                break;
        }
    },

    toggleLogo: function(logo) {
        if (typeof logo != 'object' || !logo.imageUrl) {
            return false;
        }
        var logoBlock = document.getElementById(this.videoPlayerId + "_logo");

        // We create the logo from scratch if it doesn't already exist, they might not give everything correctly so we
        this.displayOptions.layoutControls.logo.imageUrl = (logo.imageUrl) ? logo.imageUrl : null;
        this.displayOptions.layoutControls.logo.position = (logo.position) ? logo.position : 'top left';
        this.displayOptions.layoutControls.logo.clickUrl = (logo.clickUrl) ? logo.clickUrl : null;
        this.displayOptions.layoutControls.logo.opacity = (logo.opacity) ? logo.opacity : 1;
        this.displayOptions.layoutControls.logo.mouseOverImageUrl = (logo.mouseOverImageUrl) ? logo.mouseOverImageUrl : null;
        this.displayOptions.layoutControls.logo.imageMargin = (logo.imageMargin) ? logo.imageMargin : '2px';
        this.displayOptions.layoutControls.logo.hideWithControls = (logo.hideWithControls) ? logo.hideWithControls : false;
        this.displayOptions.layoutControls.logo.showOverAds = (logo.showOverAds) ? logo.showOverAds : false;

        if (logoBlock) {
            logoBlock.remove();
        }

        this.initLogo();
    }
};
