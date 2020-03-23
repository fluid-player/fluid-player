var fluidPlayerScriptLocation = function () {
    var currentSrc = '';

    if (document.currentScript) {
        currentSrc = document.currentScript.src;

    } else {
        //IE
        currentSrc = (function () {
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

//remove() polyfill
(function (arr) {
    arr.forEach(function (item) {
        if (item.hasOwnProperty('remove')) {
            return;
        }
        Object.defineProperty(item, 'remove', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: function remove() {
                if (this.parentNode === null) {
                    return;
                }
                this.parentNode.removeChild(this);
            }
        });
    });
})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);

fluidPlayer = function (idVideoPlayer, options) {
    var inArray = function (needle, haystack) {
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
    hlsJsScript: '/scripts/hls.min.js',
    dashJsScript: '/scripts/dash.min.js',
    vttParserScript: '/scripts/webvtt.min.js',
    subtitlesParseScript: '/scripts/vtt.js',
    panolensScript: '/scripts/panolens.min.js',
    threeJsScript: '/scripts/three.min.js',
    instances: [],
    notCloned: ['notCloned', 'vttParserScript', 'instances', 'getInstanceById',
        'requestStylesheet', 'reqiestScript', 'isTouchDevice', 'vastOptions',
        'displayOptions', 'getEventOffsetX', 'getEventOffsetY', 'getTranslateX',
        'toggleElementText', 'getMobileOs', 'findClosestParent', 'activeVideoPlayerId',
        'getInstanceIdByWrapperId', 'timer', 'timerPool', 'adList', 'adPool',
        'isUserActive', 'isCurrentlyPlayingAd', 'initialAnimationSet'],
    version: '2.4.11',
    vpaidVer: '2.0',
    homepage: 'https://www.fluidplayer.com/',
    activeVideoPlayerId: null,
    destructors: [],

    getInstanceById: function (playerId) {
        for (var i = 0; i < this.instances.length; i++) {
            if (this.instances[i].videoPlayerId === playerId) {
                return this.instances[i];
            }
        }

        return null;
    },

    getInstanceIdByWrapperId: function (wrapperId) {
        return typeof wrapperId != "undefined" ? wrapperId.replace('fluid_video_wrapper_', '') : null;
    },

    requestStylesheet: function (cssId, url) {
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

    requestScript: function (url, callback) {
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

    isTouchDevice: function () {
        return !!('ontouchstart' in window        // works on most browsers
            || navigator.maxTouchPoints);       // works on IE10/11 and Surface
    },

    /**
     * Distinguishes iOS from Android devices and the OS version.
     *
     * @returns object
     */
    getMobileOs: function () {
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
    getBrowserVersion: function () {

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

    getCurrentVideoDuration: function () {
        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        if (videoPlayerTag) {
            return videoPlayerTag.duration;
        }

        return 0;
    },

    getClickThroughUrlFromLinear: function (linear) {
        var videoClicks = linear.getElementsByTagName('VideoClicks');

        if (videoClicks.length) {//There should be exactly 1 node
            var clickThroughs = videoClicks[0].getElementsByTagName('ClickThrough');

            if (clickThroughs.length) {
                return this.extractNodeData(clickThroughs[0]);
            }
        }

        return false;
    },


    getVastAdTagUriFromWrapper: function (xmlResponse) {
        var wrapper = xmlResponse.getElementsByTagName('Wrapper');

        if (typeof wrapper !== 'undefined' && wrapper.length) {

            var vastAdTagURI = wrapper[0].getElementsByTagName('VASTAdTagURI');
            if (vastAdTagURI.length) {
                return this.extractNodeData(vastAdTagURI[0]);
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


    getTrackingFromLinear: function (linear) {
        var trackingEvents = linear.getElementsByTagName('TrackingEvents');

        if (trackingEvents.length) {//There should be no more than one node
            return trackingEvents[0].getElementsByTagName('Tracking');
        }

        return [];
    },

    getDurationFromLinear: function (linear) {
        var duration = linear.getElementsByTagName('Duration');

        if (duration.length && (typeof duration[0].childNodes[0] !== 'undefined')) {
            var nodeDuration = this.extractNodeData(duration[0]);
            return this.convertTimeStringToSeconds(nodeDuration);
        }

        return false;
    },

    getDurationFromNonLinear: function (tag) {
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

    getMediaFilesFromLinear: function (linear) {
        var mediaFiles = linear.getElementsByTagName('MediaFiles');

        if (mediaFiles.length) {//There should be exactly 1 MediaFiles node
            return mediaFiles[0].getElementsByTagName('MediaFile');
        }

        return [];
    },

    getStaticResourcesFromNonLinear: function (linear) {
        var result = [];
        var nonLinears = linear.getElementsByTagName('NonLinear');

        if (nonLinears.length) {//There should be exactly 1 StaticResource node
            result = nonLinears[0].getElementsByTagName('StaticResource');
        }

        return result;
    },

    extractNodeData: function (parentNode) {
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

    getAdParametersFromLinear: function(linear){
        var adParameters = linear.getElementsByTagName('AdParameters');
        var adParametersData = null;

        if (adParameters.length) {
            adParametersData = this.extractNodeData(adParameters[0]);
        }

        return adParametersData;
    },

    getMediaFileListFromLinear: function (linear) {
        var mediaFileList = [];
        var mediaFiles = this.getMediaFilesFromLinear(linear);
        if (mediaFiles.length) {

            for (var n = 0; n < mediaFiles.length; n++) {

                var mediaType = mediaFiles[n].getAttribute('mediaType');
                if(!mediaType){
                    // if there is no mediaType attribute then the video is 2D
                    mediaType = '2D';
                }

                // get all the attributes of media file
                mediaFileList.push({
                    'src': this.extractNodeData(mediaFiles[n]),
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

        }

        return mediaFileList;
    },

    getIconClickThroughFromLinear: function (linear) {
        var iconClickThrough = linear.getElementsByTagName('IconClickThrough');

        if (iconClickThrough.length) {
            return this.extractNodeData(iconClickThrough[0]);
        }

        return '';
    },

    getStaticResourceFromNonLinear: function (linear) {
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

    registerTrackingEvents: function (creativeLinear, tmpOptions) {
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

    registerClickTracking: function (clickTrackingTag, tmpOptions) {

        if (clickTrackingTag.length) {
            for (var i = 0; i < clickTrackingTag.length; i++) {
                if (clickTrackingTag[i] != '') {
                    tmpOptions.clicktracking.push(clickTrackingTag[i]);
                }
            }
        }

    },

    registerImpressionEvents: function (impressionTags, tmpOptions) {
        if (impressionTags.length) {

            for (var i = 0; i < impressionTags.length; i++) {
                var impressionEvent = this.extractNodeData(impressionTags[i]);
                tmpOptions.impression.push(impressionEvent);
            }
        }
    },

    registerErrorEvents: function (errorTags, tmpOptions) {
        if (
            (typeof errorTags !== 'undefined') &&
            (errorTags !== null) &&
            (errorTags.length === 1) && //Only 1 Error tag is expected
            (errorTags[0].childNodes.length === 1)
        ) {
            tmpOptions.errorUrl = errorTags[0].childNodes[0].nodeValue;
        }
    },

    announceError: function (code) {
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

    getClickTrackingEvents: function (linear) {
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
        var result = [];
        var nonLinears = nonLinear.getElementsByTagName('NonLinear');

        if (nonLinears.length) {
            var clickTracking = nonLinear.getElementsByTagName('NonLinearClickTracking');
            if (clickTracking.length) {
                for (var i = 0; i < clickTracking.length; i++) {
                    var NonLinearClickTracking = this.extractNodeData(clickTracking[i]);
                    result.push(NonLinearClickTracking);
                }
            }
        }

        return result;
    },

    callUris: function (uris) {
        for (var i = 0; i < uris.length; i++) {
            new Image().src = uris[i];
        }
    },

    recalculateAdDimensions: function (idVideoPlayer) {
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
                player.processVastWithRetries(player.adList[adListId]);
                videoPlayerTag.addEventListener('adId_' + adListId, player[roll]);
            }
        }
    },

    toggleLoader: function (showLoader) {
        var player = this;
        if (showLoader) {
            player.isLoading = true;
        } else {
            player.isLoading = false;
        }

        var loaderDiv = document.getElementById('vast_video_loading_' + this.videoPlayerId);

        if (showLoader) {
            loaderDiv.style.display = 'table';
        } else {
            loaderDiv.style.display = 'none';
        }
    },

    sendRequest: function (url, withCredentials, timeout, functionReadyStateChange) {
        var xmlHttpReq = new XMLHttpRequest();

        xmlHttpReq.onreadystatechange = functionReadyStateChange;

        xmlHttpReq.open('GET', url, true);
        xmlHttpReq.withCredentials = withCredentials;
        xmlHttpReq.timeout = timeout;
        xmlHttpReq.send();
    },

    playMainVideoWhenVpaidFails: function (errorCode) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        var vpaidSlot = document.getElementById(player.videoPlayerId +"_fluid_vpaid_slot");

        if (vpaidSlot){
            vpaidSlot.remove();
        }

        clearInterval(player.getVPAIDAdInterval);
        player.playMainVideoWhenVastFails(errorCode);
    },

    playMainVideoWhenVastFails: function (errorCode) {
        var player = this;
        player.debugMessage('playMainVideoWhenVastFails called');

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

    switchPlayerToVastMode: function () {},
    switchPlayerToVpaidMode: function() {},

    /**
     * Process the XML response
     *
     * @param xmlResponse
     * @param adListId
     * @param tmpOptions
     */
    processVastXml: function (xmlResponse, tmpOptions, callBack) {
        var player = this;

        if (!xmlResponse) {
            callBack(false);
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

                var clickTracks = player.getClickTrackingEvents(creativeLinear);
                player.registerClickTracking(clickTracks, tmpOptions);

                //Extract the Ad data if it is actually the Ad (!wrapper)
                if (!player.hasVastAdTagUri(xmlResponse) && player.hasInLine(xmlResponse)) {

                    //Set initial values
                    tmpOptions.adFinished = false;
                    tmpOptions.adType = 'linear';
                    tmpOptions.vpaid = false;

                    //Extract the necessary data from the Linear node
                    tmpOptions.skipoffset = player.convertTimeStringToSeconds(creativeLinear.getAttribute('skipoffset'));
                    tmpOptions.clickthroughUrl = player.getClickThroughUrlFromLinear(creativeLinear);
                    tmpOptions.duration = player.getDurationFromLinear(creativeLinear);
                    tmpOptions.mediaFileList = player.getMediaFileListFromLinear(creativeLinear);
                    tmpOptions.adParameters = player.getAdParametersFromLinear(creativeLinear);
                    tmpOptions.iconClick = player.getIconClickThroughFromLinear(creativeLinear);

                    if (tmpOptions.adParameters) {
                        tmpOptions.vpaid = true;
                    }
                }
            }

            var arrayCreativeNonLinears = creative[0].getElementsByTagName('NonLinearAds');

            if ((typeof arrayCreativeNonLinears !== 'undefined') && (arrayCreativeNonLinears !== null) && arrayCreativeNonLinears.length) {

                var creativeNonLinear = arrayCreativeNonLinears[0];
                player.registerTrackingEvents(creativeNonLinear, tmpOptions);

                var clickTracks = player.getNonLinearClickTrackingEvents(creativeNonLinear);
                player.registerClickTracking(clickTracks, tmpOptions);

                //Extract the Ad data if it is actually the Ad (!wrapper)
                if (!player.hasVastAdTagUri(xmlResponse) && player.hasInLine(xmlResponse)) {

                    //Set initial values
                    tmpOptions.adType = 'nonLinear';
                    tmpOptions.vpaid = false;

                    //Extract the necessary data from the NonLinear node
                    tmpOptions.clickthroughUrl = player.getClickThroughUrlFromNonLinear(creativeNonLinear);
                    tmpOptions.duration = player.getDurationFromNonLinear(creativeNonLinear); // VAST version < 4.0
                    tmpOptions.dimension = player.getDimensionFromNonLinear(creativeNonLinear); // VAST version < 4.0
                    tmpOptions.staticResource = player.getStaticResourceFromNonLinear(creativeNonLinear);
                    tmpOptions.creativeType = player.getCreativeTypeFromStaticResources(creativeNonLinear);
                    tmpOptions.adParameters = player.getAdParametersFromLinear(creativeNonLinear);

                    if (tmpOptions.adParameters) {
                        tmpOptions.vpaid = true;
                    }

                }
            }

            //Extract the Ad data if it is actually the Ad (!wrapper)
            if (!player.hasVastAdTagUri(xmlResponse) && player.hasInLine(xmlResponse)) {

                if (typeof tmpOptions.mediaFileList !== 'undefined' || typeof tmpOptions.staticResource !== 'undefined') {

                    callBack(true, tmpOptions);

                } else {

                    callBack(false);

                }

            }
        } else {
            callBack(false);
        }

    },


    /**
     * Parse the VAST Tag
     *
     * @param vastTag
     * @param adListId
     */

    processVastWithRetries: function (vastObj) {
        var player = this;
        var vastTag = vastObj.vastTag;
        var adListId = vastObj.id;

        var handleVastResult = function (pass, tmpOptions) {

            if (pass && typeof tmpOptions !== 'undefined' &&  tmpOptions.vpaid && !player.displayOptions.vastOptions.allowVPAID) {
                pass = false;
                player.announceLocalError('103', 'VPAID not allowed, so skipping this VAST tag.')
            }

            if (pass) {
                // ok

                if (tmpOptions.adType === 'linear') {

                    if ((typeof tmpOptions.iconClick !== 'undefined') && (tmpOptions.iconClick !== null) && tmpOptions.iconClick.length) {
                        player.adList[adListId].landingPage = tmpOptions.iconClick;
                    }

                    var selectedMediaFile = player.getSupportedMediaFileObject(tmpOptions.mediaFileList);
                    if (selectedMediaFile) {
                        player.adList[adListId].mediaType = selectedMediaFile.mediaType;
                    }

                }

                player.adList[adListId].adType = tmpOptions.adType ? tmpOptions.adType : 'unknown';

                player.adList[adListId].vastLoaded = true;
                player.adPool[adListId] = Object.assign({}, tmpOptions);
                var event = document.createEvent('Event');
                event.initEvent('adId_' + adListId, false, true);
                document.getElementById(player.videoPlayerId).dispatchEvent(event);

                player.displayOptions.vastOptions.vastAdvanced.vastLoadedCallback();

                if (player.hasTitle()) {
                  var title = document.getElementById(player.videoPlayerId + '_title');
                  title.style.display = 'none';
                }

            } else {
                // when vast failed

                player.reportError('101');

                if (vastObj.hasOwnProperty('fallbackVastTags') && vastObj.fallbackVastTags.length > 0) {
                    vastTag = vastObj.fallbackVastTags.shift();
                    player.processUrl(vastTag, handleVastResult);
                } else {
                    if (vastObj.roll === 'preRoll') {
                        player.preRollFail(vastObj);
                    }
                    player.adList[adListId].error = true;
                }
            }
        };

        player.processUrl(vastTag, handleVastResult);
    },

    processUrl: function (vastTag, callBack) {
        var player = this;
        var numberOfRedirects = 0;
        //var adListId = adListId;

        var tmpOptions = {
            tracking: [],
            stopTracking: [],
            impression: [],
            clicktracking: [],
            vastLoaded: false
        };

        player.resolveVastTag(
            vastTag,
            numberOfRedirects,
            tmpOptions,
            callBack
        );
    },

    resolveVastTag: function (vastTag, numberOfRedirects, tmpOptions, callBack) {
        var player = this;

        if (!vastTag || vastTag == '') {
            callBack(false);
            return;
        }

        var handleXmlHttpReq = function () {
            var xmlHttpReq = this;

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
                var xmlResponse = xmlHttpReq.responseXML;
            } catch (e) {
                callBack(false);
                return;
            }

            if (!xmlResponse) {
                callBack(false);
                return;
            }

            player.inLineFound = player.hasInLine(xmlResponse);

            if (!player.inLineFound && player.hasVastAdTagUri(xmlResponse)) {

                var vastAdTagUri = player.getVastAdTagUriFromWrapper(xmlResponse);
                if (vastAdTagUri) {
                    player.resolveVastTag(vastAdTagUri, numberOfRedirects, tmpOptions, callBack);
                } else {
                    callBack(false);
                    return;
                }
            }

            if (numberOfRedirects > player.displayOptions.vastOptions.maxAllowedVastTagRedirects && !player.inLineFound) {
                callBack(false);
                return;
            }

            player.processVastXml(xmlResponse, tmpOptions, callBack);
        };

        if (numberOfRedirects <= player.displayOptions.vastOptions.maxAllowedVastTagRedirects) {

            player.sendRequest(
                vastTag,
                true,
                player.displayOptions.vastOptions.vastTimeout,
                handleXmlHttpReq
            );
        }

        numberOfRedirects++;
    },

    /**
     * Helper function to stop processing
     *
     * @param adListId
     */
    reportError: function (errorCode) {
        var player = this;

        player.announceLocalError(errorCode);
    },

    backupMainVideoContentTime: function (adListId) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        var roll = player.adList[adListId].roll;

        //spec configs by roll
        switch (roll) {
            case 'midRoll':
                videoPlayerTag.mainVideoCurrentTime = videoPlayerTag.currentTime - 1;
                break;

            case 'postRoll':
                videoPlayerTag.mainVideoCurrentTime = player.mainVideoDuration;
                player.autoplayAfterAd = false;
                videoPlayerTag.currentTime = player.mainVideoDuration;
                break;

            case 'preRoll':
                if (videoPlayerTag.currentTime > 0) {
                    videoPlayerTag.mainVideoCurrentTime = videoPlayerTag.currentTime - 1;
                }
                break;
        }
    },

    checkVPAIDInterface: function(vpaidAdUnit) {
        var VPAIDCreative = vpaidAdUnit;
        // checks if all the mandatory params present
        if (
            VPAIDCreative.handshakeVersion && typeof
        VPAIDCreative.handshakeVersion == "function" && VPAIDCreative.initAd && typeof
        VPAIDCreative.initAd == "function" &&
            VPAIDCreative.startAd && typeof VPAIDCreative.startAd == "function" &&
            VPAIDCreative.stopAd && typeof VPAIDCreative.stopAd == "function" &&
            VPAIDCreative.skipAd && typeof VPAIDCreative.skipAd == "function" &&
            VPAIDCreative.resizeAd && typeof VPAIDCreative.resizeAd == "function" &&
            VPAIDCreative.pauseAd && typeof VPAIDCreative.pauseAd == "function" &&
            VPAIDCreative.resumeAd && typeof VPAIDCreative.resumeAd == "function"
        &&
            VPAIDCreative.expandAd && typeof VPAIDCreative.expandAd == "function"
        &&
            VPAIDCreative.collapseAd && typeof VPAIDCreative.collapseAd == "function"
        &&
            VPAIDCreative.subscribe && typeof VPAIDCreative.subscribe == "function" &&
            VPAIDCreative.unsubscribe && typeof VPAIDCreative.unsubscribe ==
        "function" ) {
            return true;
        }

            return false;
    },

    debugMessage: function (msg) {
        var player = this;

        if (player.displayOptions.debug) {
            console.log(msg);
        }
    },

    // Callback for AdPaused
    onVpaidAdPaused: function() {
        var player = this;

        player.vpaidTimeoutTimerClear();
        player.debugMessage("onAdPaused");
    },

    // Callback for AdPlaying
    onVpaidAdPlaying: function() {
        var player = this;

        player.vpaidTimeoutTimerClear();
        player.debugMessage("onAdPlaying");
    },

    // Callback for AdError
    onVpaidAdError: function(message) {
        var player = this;

        player.debugMessage("onAdError: " + message);
        player.vpaidTimeoutTimerClear();
        player.onVpaidEnded();
    },

    // Callback for AdLog
    onVpaidAdLog: function(message) {
        var player = this;

        player.debugMessage("onAdLog: " + message);
    },

    // Callback for AdUserAcceptInvitation
    onVpaidAdUserAcceptInvitation: function() {
        var player = this;

        player.debugMessage("onAdUserAcceptInvitation");
    },

    // Callback for AdUserMinimize
    onVpaidAdUserMinimize: function() {
        var player = this;

        player.debugMessage("onAdUserMinimize");
    },

    // Callback for AdUserClose
    onVpaidAdUserClose: function() {
        var player = this;

        player.debugMessage("onAdUserClose");
    },

    // Callback for AdUserClose
    onVpaidAdSkippableStateChange: function() {
        var player = this;

        if (!player.vpaidAdUnit) {
            return;
        }
        player.debugMessage("Ad Skippable State Changed to: " + player.vpaidAdUnit.getAdSkippableState());
    },

    // Callback for AdUserClose
    onVpaidAdExpandedChange: function() {
        var player = this;

        if (!player.vpaidAdUnit) {
            return;
        }
        player.debugMessage("Ad Expanded Changed to: " + player.vpaidAdUnit.getAdExpanded());
    },

    // Pass through for getAdExpanded
    getVpaidAdExpanded: function() {
        var player = this;

        player.debugMessage("getAdExpanded");

        if (!player.vpaidAdUnit) {
            return;
        }
        return player.vpaidAdUnit.getAdExpanded();
    },

    // Pass through for getAdSkippableState
    getVpaidAdSkippableState: function() {
        var player = this;

        player.debugMessage("getAdSkippableState");

        if (!player.vpaidAdUnit) {
            return;
        }
        return player.vpaidAdUnit.getAdSkippableState();
    },

    // Callback for AdSizeChange
    onVpaidAdSizeChange: function() {
        var player = this;

        if (!player.vpaidAdUnit) {
            return;
        }
        player.debugMessage("Ad size changed to: w=" + player.vpaidAdUnit.getAdWidth() + " h=" + player.vpaidAdUnit.getAdHeight());
    },

    // Callback for AdDurationChange
    onVpaidAdDurationChange: function() {
        var player = this;

        if (!player.vpaidAdUnit) {
            return;
        }
        player.debugMessage("Ad Duration Changed to: " + player.vpaidAdUnit.getAdDuration());
    },

    // Callback for AdRemainingTimeChange
    onVpaidAdRemainingTimeChange: function() {
        var player = this;

        if (!player.vpaidAdUnit) {
            return;
        }
        player.debugMessage("Ad Remaining Time Changed to: " + player.vpaidAdUnit.getAdRemainingTime());
    },

    // Pass through for getAdRemainingTime
    getVpaidAdRemainingTime: function() {
        var player = this;

        player.debugMessage("getAdRemainingTime");
        if (!player.vpaidAdUnit) {
            return;
        }
        return player.vpaidAdUnit.getAdRemainingTime();
    },

    // Callback for AdImpression
    onVpaidAdImpression: function() {
        var player = this;
        player.debugMessage("Ad Impression");

        //Announce the impressions
        player.trackSingleEvent('impression');
    },

    // Callback for AdClickThru
    onVpaidAdClickThru: function(url, id, playerHandles) {
        var player = this;
        player.debugMessage("Clickthrough portion of the ad was clicked");

        // if playerHandles flag is set to true
        // then player need to open click thorough url in new window
        if (playerHandles) {
            window.open(player.vastOptions.clickthroughUrl);
        }

        player.pauseVpaidAd();
        // fire click tracking
        player.callUris(player.vastOptions.clicktracking);
    },

    // Callback for AdInteraction
    onVpaidAdInteraction: function(id) {
        var player = this;

        player.debugMessage("A non-clickthrough event has occured");
    },

    // Callback for AdVideoStart
    onVpaidAdVideoStart: function() {
        var player = this;

        player.debugMessage("Video 0% completed");
        player.trackSingleEvent('start');
    },

    // Callback for AdUserClose
    onVpaidAdVideoFirstQuartile: function() {
        var player = this;

        player.debugMessage("Video 25% completed");
        player.trackSingleEvent('firstQuartile');
    },

    // Callback for AdUserClose
    onVpaidAdVideoMidpoint: function() {
        var player = this;

        player.debugMessage("Video 50% completed");
        player.trackSingleEvent('midpoint');
    },

    // Callback for AdUserClose
    onVpaidAdVideoThirdQuartile: function() {
        var player = this;

        player.debugMessage("Video 75% completed");
        player.trackSingleEvent('thirdQuartile');
    },

    // Callback for AdVideoComplete
    onVpaidAdVideoComplete: function() {
        var player = this;

        player.debugMessage("Video 100% completed");
        player.trackSingleEvent('complete');
    },

    // Callback for AdLinearChange
    onVpaidAdLinearChange: function() {
        var player = this;

        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        var vpaidNonLinearSlot = document.getElementsByClassName("fluid_vpaidNonLinear_ad")[0];
        var closeBtn = document.getElementById('close_button_' + player.videoPlayerId);
        var adListId = vpaidNonLinearSlot.getAttribute('adlistid');
        player.debugMessage("Ad linear has changed: " + player.vpaidAdUnit.getAdLinear());

        if (player.vpaidAdUnit.getAdLinear()) {
            player.backupMainVideoContentTime(adListId);
            player.isCurrentlyPlayingAd = true;

            if (closeBtn) {
                closeBtn.remove();
            }

            vpaidNonLinearSlot.className = 'fluid_vpaid_slot';
            vpaidNonLinearSlot.id = player.videoPlayerId +"_fluid_vpaid_slot";

            videoPlayerTag.loop = false;
            videoPlayerTag.removeAttribute('controls'); //Remove the default Controls


            var progressbarContainer = videoPlayerTag.parentNode.getElementsByClassName('fluid_controls_currentprogress');
            for (var i = 0; i < progressbarContainer.length; i++) {
                progressbarContainer[i].style.backgroundColor = player.displayOptions.layoutControls.adProgressColor;
            }

            player.toggleLoader(false);
        }
    },

    // Pass through for getAdLinear
    getVpaidAdLinear: function() {
        var player = this;

        player.debugMessage("getAdLinear");
        return player.vpaidAdUnit.getAdLinear();
    },

    // Pass through for startAd()
    startVpaidAd: function() {
        var player = this;

        player.debugMessage("startAd");
        player.vpaidTimeoutTimerStart();
        player.vpaidAdUnit.startAd();
    },

    // Callback for AdLoaded
    onVpaidAdLoaded: function() {
        var player = this;
        player.debugMessage("ad has been loaded");

        // start the video play as vpaid is loaded successfully
        player.vpaidTimeoutTimerClear();
        player.startVpaidAd();
    },

    // Callback for StartAd()
    onStartVpaidAd: function() {
        var player = this;

        player.debugMessage("Ad has started");
        player.vpaidTimeoutTimerClear();
    },

    // Pass through for stopAd()
    stopVpaidAd: function() {
        var player = this;

        player.vpaidTimeoutTimerStart();
        player.vpaidAdUnit.stopAd();
    },

    // Hard Pass through for stopAd() excluding deleteOtherVpaidAdsApart
    hardStopVpaidAd: function(deleteOtherVpaidAdsApart) {
        // this is hard stop of vpaid ads
        // we delete all the vpaid assets so the new one can be loaded
        // delete all assets apart from the ad from deleteOtherVpaidAdsApart
        var player = this;

        if (player.vpaidAdUnit) {
            player.vpaidAdUnit.stopAd();
            player.vpaidAdUnit = null;
        }

        var vpaidIframes = document.getElementsByClassName("fluid_vpaid_iframe");
        var vpaidSlots = document.getElementsByClassName("fluid_vpaid_slot");
        var vpaidNonLinearSlots = document.getElementsByClassName("fluid_vpaidNonLinear_ad");

        for (var i = 0; i< vpaidIframes.length; i++){
            if (vpaidIframes[i].getAttribute('adListId') !== deleteOtherVpaidAdsApart) {
                vpaidIframes[i].remove();
            }
        }

        for (var j = 0; j< vpaidSlots.length; j++){
            if (vpaidSlots[j].getAttribute('adListId') !== deleteOtherVpaidAdsApart) {
                vpaidSlots[j].remove();
            }
        }

        for (var k = 0; k< vpaidNonLinearSlots.length; k++){
            if (vpaidNonLinearSlots[k].getAttribute('adListId') !== deleteOtherVpaidAdsApart) {
                vpaidNonLinearSlots[k].remove();
            }
        }
    },

    // Callback for AdUserClose
    onStopVpaidAd: function() {
        var player = this;

        player.debugMessage("Ad has stopped");
        player.vpaidTimeoutTimerClear();
        player.onVpaidEnded();
    },

    // Callback for AdUserClose
    onSkipVpaidAd: function() {
        var player = this;
        player.debugMessage("Ad was skipped");

        player.vpaidTimeoutTimerClear();
        player.onVpaidEnded();
    },

    // Passthrough for skipAd
    skipVpaidAd: function() {
        var player = this;

        player.vpaidTimeoutTimerStart();
        if (!player.vpaidAdUnit) {
            return;
        }
        player.vpaidAdUnit.skipAd();
    },

    // Passthrough for setAdVolume
    setVpaidAdVolume: function(val) {
        var player = this;

        if (!player.vpaidAdUnit) {
            return;
        }
        player.vpaidAdUnit.setAdVolume(val);
    },

    // Passthrough for getAdVolume
    getVpaidAdVolume: function() {
        var player = this;

        if (!player.vpaidAdUnit) {
            return;
        }
        return player.vpaidAdUnit.getAdVolume();
    },

    // Callback for AdVolumeChange
    onVpaidAdVolumeChange: function() {
        var player = this;

        if (!player.vpaidAdUnit) {
            return;
        }
        player.debugMessage("Ad Volume has changed to - " + player.vpaidAdUnit.getAdVolume());
    },

    resizeVpaidAuto: function () {
        var player = this;
        if (player.vastOptions !== null && player.vastOptions.vpaid && player.vastOptions.linear) {
            var adWidth = videoPlayer.offsetWidth;
            var adHeight = videoPlayer.offsetHeight;
            var mode = (player.fullscreenMode ? 'fullscreen' : 'normal');
            this.resizeVpaidAd(adWidth, adHeight, mode);
        }
    },

    //Passthrough for resizeAd
    resizeVpaidAd: function(width, height, viewMode) {
        var player = this;

        if (!player.vpaidAdUnit) {
            return;
        }
        player.vpaidAdUnit.resizeAd(width, height, viewMode);
    },

    // Passthrough for pauseAd()
    pauseVpaidAd: function() {
        var player = this;

        player.vpaidTimeoutTimerStart();
        if (!player.vpaidAdUnit) {
            return;
        }
        player.vpaidAdUnit.pauseAd();
    },

    // Passthrough for resumeAd()
    resumeVpaidAd: function() {
        var player = this;

        player.vpaidTimeoutTimerStart();
        if (!player.vpaidAdUnit) {
            return;
        }
        player.vpaidAdUnit.resumeAd();
    },

    //Passthrough for expandAd()
    expandVpaidAd: function() {
        var player = this;

        if (!player.vpaidAdUnit) {
            return;
        }
        player.vpaidAdUnit.expandAd();
    },

    //Passthrough for collapseAd()
    collapseVpaidAd: function () {
        var player = this;

        if (!player.vpaidAdUnit) {
            return;
        }
        player.vpaidAdUnit.collapseAd();
    },

    vpaidTimeoutTimerClear: function () {
        var player = this;

        if (player.vpaidTimer) {
            clearTimeout(player.vpaidTimer);
        }
    },

    // placeholder for timer function
    vpaidTimeoutTimerStart: function () {
        var player = this;

        // clear previous timer if any
        player.vpaidTimeoutTimerClear();
        player.vpaidTimer = setTimeout(function() {
            player.reportError('901');
            player.onVpaidEnded();
        },player.displayOptions.vastOptions.vpaidTimeout);
    },

    vpaidCallbackListenersAttach: function() {
        var player = this;

        //The key of the object is the event name and the value is a reference to the callback function that is registered with the creative
        var callbacks = {
            AdStarted : player.onStartVpaidAd,
            AdStopped : player.onStopVpaidAd,
            AdSkipped : player.onSkipVpaidAd,
            AdLoaded : player.onVpaidAdLoaded,
            AdLinearChange : player.onVpaidAdLinearChange,
            AdSizeChange : player.onVpaidAdSizeChange,
            AdExpandedChange : player.onVpaidAdExpandedChange,
            AdSkippableStateChange : player.onVpaidAdSkippableStateChange,
            AdDurationChange : player.onVpaidAdDurationChange,
            AdRemainingTimeChange : player.onVpaidAdRemainingTimeChange,
            AdVolumeChange : player.onVpaidAdVolumeChange,
            AdImpression : player.onVpaidAdImpression,
            AdClickThru : player.onVpaidAdClickThru,
            AdInteraction : player.onVpaidAdInteraction,
            AdVideoStart : player.onVpaidAdVideoStart,
            AdVideoFirstQuartile : player.onVpaidAdVideoFirstQuartile,
            AdVideoMidpoint : player.onVpaidAdVideoMidpoint,
            AdVideoThirdQuartile : player.onVpaidAdVideoThirdQuartile,
            AdVideoComplete : player.onVpaidAdVideoComplete,
            AdUserAcceptInvitation : player.onVpaidAdUserAcceptInvitation,
            AdUserMinimize : player.onVpaidAdUserMinimize,
            AdUserClose : player.onVpaidAdUserClose,
            AdPaused : player.onVpaidAdPaused,
            AdPlaying : player.onVpaidAdPlaying,
            AdError : player.onVpaidAdError,
            AdLog : player.onVpaidAdLog
        };

        // Looping through the object and registering each of the callbacks with the creative
        for ( var eventName in callbacks) {

            player.vpaidAdUnit.subscribe(callbacks[eventName],
                    eventName, player);

        }

    },

    loadVpaid: function (adListId, vpaidJsUrl) {

        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        var vpaidIframe = document.createElement('iframe');
        vpaidIframe.id = player.videoPlayerId  + "_" + adListId + "_fluid_vpaid_iframe";
        vpaidIframe.className = 'fluid_vpaid_iframe';
        vpaidIframe.setAttribute('adListId', adListId);
        vpaidIframe.setAttribute('frameborder', '0');

        videoPlayerTag.parentNode.insertBefore(vpaidIframe, videoPlayerTag.nextSibling);

        vpaidIframe.contentWindow.document.write('<script src="' + vpaidJsUrl + '"></scr' + 'ipt>');

        // set interval with timeout
        player.tempVpaidCounter = 0;
        player.getVPAIDAdInterval = setInterval( function () {

            var fn  = vpaidIframe.contentWindow['getVPAIDAd'];

            // check if JS is loaded fully in iframe
            if (fn && typeof fn == 'function') {

                if (player.vpaidAdUnit) {
                    var deleteOtherVpaidAdsApart = adListId;
                    player.hardStopVpaidAd(deleteOtherVpaidAdsApart);
                }

                player.vpaidAdUnit = fn();
                clearInterval(player.getVPAIDAdInterval);
                if (player.checkVPAIDInterface(player.vpaidAdUnit)) {

                    if (player.getVpaidAdLinear()) {
                        player.isCurrentlyPlayingAd = true;
                        player.switchPlayerToVpaidMode(adListId);
                    } else {
                        player.debugMessage('non linear vpaid ad is loaded');
                        player.loadVpaidNonlinearAssets(adListId);
                    }

                }

            } else {

                // video player will wait for 2seconds if vpaid is not loaded, then it will declare vast error and move ahead
                player.tempVpaidCounter++;
                if (player.tempVpaidCounter >= 20) {
                    clearInterval(player.getVPAIDAdInterval);
                    player.adList[adListId].error = true;
                    player.playMainVideoWhenVpaidFails(403);
                    return false;
                } else {
                    player.debugMessage(player.tempVpaidCounter);
                }

            }

        }, 100);

    },

    renderLinearAd: function (adListId,backupTheVideoTime) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

            player.toggleLoader(true);

            //get the proper ad
            player.vastOptions = player.adPool[adListId];

            if ( backupTheVideoTime ) {
                player.backupMainVideoContentTime(adListId);
            }

            var playVideoPlayer = function (adListId) {

                player.switchPlayerToVpaidMode = function (adListId) {

                    var player = this;
                    player.debugMessage('starting function switchPlayerToVpaidMode');
                    var vpaidIframe = player.videoPlayerId + "_" + adListId + "_fluid_vpaid_iframe";
                    var creativeData = {};
                    creativeData.AdParameters = player.adPool[adListId].adParameters;
                    var slotElement = document.createElement('div');
                    slotElement.id = player.videoPlayerId +"_fluid_vpaid_slot";
                    slotElement.className = 'fluid_vpaid_slot';
                    slotElement.setAttribute('adListId', adListId);

                    videoPlayerTag.parentNode.insertBefore(slotElement, vpaidIframe.nextSibling);

                    var environmentVars = {
                        slot: slotElement,
                        videoSlot: videoPlayerTag,
                        videoSlotCanAutoPlay: true
                    };

                    // calls this functions after ad unit is loaded in iframe
                    var ver = player.vpaidAdUnit.handshakeVersion(player.vpaidVer);
                    var compare = player.compareVersion(player.vpaidVer, ver);
                    if (compare === 1) {
                        //VPAID version of ad is lower than we need
                        player.adList[adListId].error = true;
                        player.playMainVideoWhenVpaidFails(403);
                        return false;
                    }

                    if (player.vastOptions.skipoffset !== false) {
                        player.addSkipButton();
                    }

                    videoPlayerTag.loop = false;
                    videoPlayerTag.removeAttribute('controls'); //Remove the default Controls

                    player.vpaidCallbackListenersAttach();
                    var mode = (player.fullscreenMode ? 'fullscreen': 'normal');
                    var adWidth = videoPlayerTag.offsetWidth;
                    var adHeight = videoPlayerTag.offsetHeight;
                    player.vpaidAdUnit.initAd(adWidth, adHeight, mode, 3000, creativeData, environmentVars);

                    var progressbarContainer = videoPlayerTag.parentNode.getElementsByClassName('fluid_controls_currentprogress');
                    for (var i = 0; i < progressbarContainer.length; i++) {
                        progressbarContainer[i].style.backgroundColor = player.displayOptions.layoutControls.adProgressColor;
                    }

                    player.toggleLoader(false);
                    player.adList[adListId].played = true;
                    player.adFinished = false;
                };

                player.switchPlayerToVastMode = function () {

                    //Get the actual duration from the video file if it is not present in the VAST XML
                    if (!player.vastOptions.duration) {
                        player.vastOptions.duration = videoPlayerTag.duration;
                    }

                    if ( player.displayOptions.layoutControls.showCardBoardView ) {

                        if ( !player.adList[adListId].landingPage ) {
                            player.addCTAButton(player.adPool[adListId].clickthroughUrl);
                        } else {
                            player.addCTAButton(player.adList[adListId].landingPage);
                        }

                    } else {

                        var addClickthroughLayer = (typeof player.adList[adListId].adClickable != "undefined") ? player.adList[adListId].adClickable: player.displayOptions.vastOptions.adClickable;

                        if (addClickthroughLayer) {
                            player.addClickthroughLayer(player.videoPlayerId);
                        }

                        player.addCTAButton(player.adList[adListId].landingPage);

                    }


                    if (player.vastOptions.skipoffset !== false) {
                        player.addSkipButton();
                    }

                    videoPlayerTag.loop = false;

                    player.addAdCountdown();

                    videoPlayerTag.removeAttribute('controls'); //Remove the default Controls

                    player.vastLogoBehaviour(true);

                    var progressbarContainer = videoPlayerTag.parentNode.getElementsByClassName('fluid_controls_currentprogress');
                    for (var i = 0; i < progressbarContainer.length; i++) {
                        progressbarContainer[i].style.backgroundColor = player.displayOptions.layoutControls.adProgressColor;
                    }

                    if (player.displayOptions.vastOptions.adText || player.adList[adListId].adText) {
                        var adTextToShow = (player.adList[adListId].adText !== null) ? player.adList[adListId].adText : player.displayOptions.vastOptions.adText;
                        player.addAdPlayingText(adTextToShow);
                    }

                    player.positionTextElements(player.adList[adListId]);

                    player.toggleLoader(false);
                    player.adList[adListId].played = true;
                    player.adFinished = false;
                    videoPlayerTag.play();

                    //Announce the impressions
                    player.trackSingleEvent('impression');

                    videoPlayerTag.removeEventListener('loadedmetadata', player.switchPlayerToVastMode);


                    // if in vr mode then do not show
                    if ( player.vrMode ) {

                        var adCountDownTimerText = document.getElementById('ad_countdown' + player.videoPlayerId);
                        var ctaButton = document.getElementById(player.videoPlayerId+'_fluid_cta');
                        var addAdPlayingTextOverlay = document.getElementById(player.videoPlayerId+'_fluid_ad_playing');
                        var skipBtn = document.getElementById('skip_button_' + player.videoPlayerId);

                        if ( adCountDownTimerText ) {
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

                videoPlayerTag.pause();

                // Remove the streaming objects to prevent errors on the VAST content
                player.detachStreamers();

                //Try to load multiple
                var selectedMediaFile = player.getSupportedMediaFileObject(player.vastOptions.mediaFileList);

                // if player in cardboard mode then, linear ads media type should be a '360' video
                if ( player.displayOptions.layoutControls.showCardBoardView && player.adList[adListId].mediaType !== '360' ) {
                    player.adList[adListId].error = true;
                    player.playMainVideoWhenVastFails(403);
                    return false;
                }

                var isVpaid = player.vastOptions.vpaid;

                if (!isVpaid) {

                    if (selectedMediaFile.src === false) {
                        // Couldn’t find MediaFile that is supported by this video player, based on the attributes of the MediaFile element.
                        player.adList[adListId].error = true;
                        player.playMainVideoWhenVastFails(403);
                        return false;
                    }

                    videoPlayerTag.addEventListener('loadedmetadata', player.switchPlayerToVastMode);

                    videoPlayerTag.src = selectedMediaFile.src;
                    player.isCurrentlyPlayingAd = true;

                    if (player.displayOptions.vastOptions.showProgressbarMarkers) {
                        player.hideAdMarkers();
                    }

                    videoPlayerTag.load();

                    //Handle the ending of the Pre-Roll ad
                    videoPlayerTag.addEventListener('ended', player.onVastAdEnded);

                } else {

                    player.loadVpaid(adListId, selectedMediaFile.src);

                    if (player.displayOptions.vastOptions.showProgressbarMarkers) {
                        player.hideAdMarkers();
                    }

                }

            };


            /**
             * Sends requests to the tracking URIs
             */
            var videoPlayerTimeUpdate = function () {

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

    playRoll: function (adListId) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        // register all the ad pods
        for (var i = 0; i < adListId.length; i++) {
            if (!player.adPool.hasOwnProperty(adListId[i])) {
                player.announceLocalError(101);
                return;
            }
            player.temporaryAdPods.push(player.adList[adListId[i]]);
        }

        if (player.vastOptions !== null && player.vastOptions.adType.toLowerCase() === 'linear') {
            return;
        }

        var adListIdToPlay = player.getNextAdPod();
        if (adListIdToPlay !== null) {
            player.renderLinearAd(adListIdToPlay,true);
        }


    },

    getSupportedMediaFileObject: function (mediaFiles) {
        var selectedMediaFile = null;
        var adSupportedType = false;
        if (mediaFiles.length) {
            for (var i = 0; i < mediaFiles.length; i++) {

                if (mediaFiles[i].apiFramework !== 'VPAID') {
                    var supportLevel = this.getMediaFileTypeSupportLevel(mediaFiles[i]['type']);

                    if (supportLevel === "maybe" || supportLevel === "probably") {
                        selectedMediaFile = mediaFiles[i];
                        adSupportedType = true;
                    }

                    //one of the best(s) option, no need to seek more
                    if (supportLevel === "probably") {
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
    },

    /**
     * Reports how likely it is that the current browser will be able to play media of a given MIME type.
     * return (string): "probably", "maybe", "no" or null
     */
    getMediaFileTypeSupportLevel: function (mediaType) {
        if (mediaType === null) {
            return null;
        }

        tmpVideo = document.createElement('video');

        var response = tmpVideo.canPlayType(mediaType);

        if (response == "") {
            response = "no";
        }
        delete tmpVideo;
        return response;
    },

    scheduleTrackingEvent : function (currentTime, duration) {
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

    trackSingleEvent : function (eventType, eventSubType) {
        var player = this;

        if (typeof player.vastOptions === 'undefined' || player.vastOptions === null) {
            return;
        }

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
                player.vastOptions.tracking['progress'][eventSubType].elements.forEach(function (currentValue, index) {
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
        if (player.adFinished == false) {
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
        if (player.adList[adListId].error === true) {
            return;
        }
        player.adFinished = false;

        if (!player.vastOptions.vpaid) {
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
        }

        var time = parseInt(player.getCurrentTime()) + parseInt(duration);
        player.scheduleTask({time: time, closeStaticAd: adListId});
    },

    compareVersion: function (v1, v2) {
        if (typeof v1 !== 'string') return false;
        if (typeof v2 !== 'string') return false;
        v1 = v1.split('.');
        v2 = v2.split('.');
        var k = Math.min(v1.length, v2.length);
        for (var i = 0; i < k; ++ i) {
            v1[i] = parseInt(v1[i], 10);
            v2[i] = parseInt(v2[i], 10);
            if (v1[i] > v2[i]) return 1;
            if (v1[i] < v2[i]) return -1;
        }
        return v1.length === v2.length ? 0 : (v1.length < v2.length ? -1 : 1);
    },

    createVpaidNonLinearBoard: function (adListId) {
        // create iframe
        // pass the js

        var player = this;
        var vastSettings = player.adPool[adListId];

        player.loadVpaidNonlinearAssets = function (adListId) {

            var player = this;
            player.debugMessage('starting function switchPlayerToVpaidMode');

            var videoPlayerTag = document.getElementById(player.videoPlayerId);
            var vAlign = (player.adList[adListId].vAlign) ? player.adList[adListId].vAlign : player.nonLinearVerticalAlign;
            var showCloseButton = (player.adList[adListId].vpaidNonLinearCloseButton) ? player.adList[adListId].vpaidNonLinearCloseButton : player.vpaidNonLinearCloseButton;
            var vpaidIframe = player.videoPlayerId + "_" + adListId + "_fluid_vpaid_iframe";
            var creativeData = {};
            creativeData.AdParameters = player.adPool[adListId].adParameters;
            var slotWrapper = document.createElement('div');
            slotWrapper.id = 'fluid_vpaidNonLinear_' + adListId;
            slotWrapper.className = 'fluid_vpaidNonLinear_' + vAlign;
            slotWrapper.className += ' fluid_vpaidNonLinear_ad';
            slotWrapper.setAttribute('adListId', adListId);

            // Default values in case nothing defined in VAST data or ad settings
            var adWidth = Math.min(468, videoPlayerTag.offsetWidth);
            var adHeight = Math.min(60, Math.floor(videoPlayerTag.offsetHeight / 4));

            if (typeof player.adList[adListId].size !== 'undefined') {
                var dimensions = player.adList[adListId].size.split('x');
                adWidth = dimensions[0];
                adHeight = dimensions[1];
            } else if (vastSettings.dimension.width && vastSettings.dimension.height) {
                adWidth = vastSettings.dimension.width;
                adHeight = vastSettings.dimension.height;
            }

            slotWrapper.style.width  = '100%';
            slotWrapper.style.height  = adHeight + 'px';

            if (showCloseButton) {
                var slotFrame = document.createElement('div');
                slotFrame.className = 'fluid_vpaidNonLinear_frame';
                slotFrame.style.width = adWidth + 'px';
                slotFrame.style.height = adHeight + 'px';
                slotWrapper.appendChild(slotFrame);

                var closeBtn = document.createElement('div');
                closeBtn.id = 'close_button_' + player.videoPlayerId;
                closeBtn.className = 'close_button';
                closeBtn.innerHTML = '';
                closeBtn.title = player.displayOptions.layoutControls.closeButtonCaption;
                var tempadListId = adListId;
                closeBtn.onclick = function (event) {

                    player.hardStopVpaidAd('');

                    if (typeof event.stopImmediatePropagation !== 'undefined') {
                        event.stopImmediatePropagation();
                    }
                    player.adFinished = true;

                    //if any other onPauseRoll then render it
                    if (player.adList[tempadListId].roll === 'onPauseRoll' && player.onPauseRollAdPods[0]) {
                        var getNextOnPauseRollAd = player.onPauseRollAdPods[0];
                        player.createBoard(getNextOnPauseRollAd);
                        player.currentOnPauseRollAd = player.onPauseRollAdPods[0];
                        delete player.onPauseRollAdPods[0];
                    }

                    return false;
                };

                slotFrame.appendChild(closeBtn);

            }

            var slotIframe = document.createElement('iframe');
            slotIframe.id = player.videoPlayerId +"non_linear_vapid_slot_iframe";
            slotIframe.className = 'fluid_vpaid_nonlinear_slot_iframe';
            slotIframe.setAttribute('width', adWidth + 'px');
            slotIframe.setAttribute('height',  adHeight + 'px');
            slotIframe.setAttribute('sandbox', 'allow-forms allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts');
            slotIframe.setAttribute('frameborder', '0');
            slotIframe.setAttribute('scrolling', 'no');
            slotIframe.setAttribute('marginwidth', '0');
            slotIframe.setAttribute('marginheight', '0');
            slotWrapper.appendChild(slotIframe);

            videoPlayerTag.parentNode.insertBefore(slotWrapper, vpaidIframe.nextSibling);

            var slotElement = slotIframe.contentWindow.document.createElement('div');

            slotIframe.contentWindow.document.body.appendChild(slotElement);

            player.vastOptions.slotIframe = slotIframe;
            player.vastOptions.slotFrame = slotFrame;

            var environmentVars = {
                slot: slotElement,
                videoSlot: videoPlayerTag,
                videoSlotCanAutoPlay: true
            };

            player.debugMessage(player.adList[adListId]);

            // calls this functions after ad unit is loaded in iframe
            var ver = player.vpaidAdUnit.handshakeVersion(player.vpaidVer);
            var compare = player.compareVersion(player.vpaidVer, ver);
            if (compare === 1) {
                //VPAID version of ad is lower than we need
                player.adList[adListId].error = true;
                player.playMainVideoWhenVpaidFails(403);
                return false;
            }

            videoPlayerTag.loop = false;
            videoPlayerTag.removeAttribute('controls'); //Remove the default Controls

            player.vpaidCallbackListenersAttach();
            var mode = (player.fullscreenMode ? 'fullscreen': 'normal');
            player.vpaidAdUnit.initAd(adWidth, adHeight, mode, 3000, creativeData, environmentVars);

            player.toggleLoader(false);
            player.adList[adListId].played = true;
            player.adFinished = false;
        };

        player.loadVpaid(adListId, vastSettings.staticResource);

        player.debugMessage('create non linear vpaid');
    },

    createNonLinearBoard: function (adListId) {
        var player = this;
        var vastSettings = player.adPool[adListId];

        player.adList[adListId].played = true;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        var playerWidth = videoPlayerTag.clientWidth;
        var playerHeight = videoPlayerTag.clientHeight;
        var board = document.createElement('div');
        var vAlign = (player.adList[adListId].vAlign) ? player.adList[adListId].vAlign : player.nonLinearVerticalAlign;

        var creative = new Image();
        creative.src = vastSettings.staticResource;
        creative.id = 'fluid_nonLinear_imgCreative_' + adListId + '_' + player.videoPlayerId;

        creative.onerror = function () {
            player.adList[adListId].error = true;
            player.announceError(500);
        };

        creative.onload = function () {

            //Set banner size based on the below priority
            // 1. adList -> roll -> size
            // 2. VAST XML width/height attriubute (VAST 3.)
            // 3. VAST XML static resource dimension
            if (typeof player.adList[adListId].size !== 'undefined') {
                origWidth = player.adList[adListId].size.split('x')[0];
                origHeight = player.adList[adListId].size.split('x')[1];
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

            if( player.adList[adListId].roll !== 'onPauseRoll' ){
                //Show the board only if media loaded
                document.getElementById('fluid_nonLinear_' + adListId).style.display = '';
            }


            img = document.getElementById(creative.id);
            img.width = newBannerWidth;
            img.height = newBannerHeight;

            player.trackSingleEvent('impression');
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
        var tempadListId = adListId;
        closeBtn.onclick = function (event) {
            this.parentElement.remove(player);
            if (typeof event.stopImmediatePropagation !== 'undefined') {
                event.stopImmediatePropagation();
            }
            player.adFinished = true;
            clearInterval(player.nonLinearTracking);

            //if any other onPauseRoll then render it
            if (player.adList[tempadListId].roll === 'onPauseRoll' && player.onPauseRollAdPods[0]) {
                var getNextOnPauseRollAd = player.onPauseRollAdPods[0];
                player.createBoard(getNextOnPauseRollAd);
                player.currentOnPauseRollAd = player.onPauseRollAdPods[0];
                delete player.onPauseRollAdPods[0];
            }

            return false;
        };

        board.appendChild(closeBtn);
        videoPlayerTag.parentNode.insertBefore(board, videoPlayerTag.nextSibling);
    },

    /**
     * Adds a nonLinear static Image banner
     *
     * currently only image/gif, image/jpeg, image/png supported
     */
    createBoard: function (adListId) {

        var player = this;
        var vastSettings = player.adPool[adListId];

        // create nonLinear Vpaid
        // create nonLinear regular
        if (vastSettings.vpaid) {
            player.hardStopVpaidAd('');
            player.createVpaidNonLinearBoard(adListId);

        } else {

            if (typeof vastSettings.staticResource === 'undefined'
            || player.supportedStaticTypes.indexOf(vastSettings.creativeType) === -1) {
                //Couldn’t find NonLinear resource with supported type.
                player.adList[adListId].error = true;
                if (!player.vastOptions || typeof player.vastOptions.errorUrl === 'undefined') {
                    player.announceLocalError(503);
                } else {
                    player.announceError(503);
                }
                return;
            }

            player.createNonLinearBoard(adListId);

        }

    },


    closeNonLinear: function (adListId) {
        var element = document.getElementById('fluid_nonLinear_' + adListId);
        if (element) {
            element.remove();
        }
    },

    rollGroupContainsLinear: function (groupedRolls) {
        var player = this;
        var found = false;
        for(var i = 0; i < groupedRolls.length; i++) {
            if (player.adList[groupedRolls[i].id].adType && player.adList[groupedRolls[i].id].adType === 'linear') {
                found = true;
                break;
            }
        }
        return found;
    },
    rollGroupContainsNonlinear: function (groupedRolls) {
        var player = this;
        var found = false;
        for(var i = 0; i < groupedRolls.length; i++) {
            if (player.adList[groupedRolls[i].id].adType.toLowerCase() === 'nonlinear') {
                found = true;
                break;
            }
        }
        return found;
    },

    preRollFail: function () {
        var player = this;
        var preRollsLength = player.preRollAdPodsLength;

        player.preRollVastResolved++;

        if (player.preRollVastResolved === preRollsLength) {
            player.preRollAdsPlay();
        }
    },

    preRollSuccess: function () {
        var player = this;
        var preRollsLength = player.preRollAdPodsLength;

        player.preRollVastResolved++;

        if (player.preRollVastResolved === preRollsLength) {
            player.preRollAdsPlay();
        }
    },

    preRollAdsPlay: function () {
        var player = this;
        var time = 0;
        var adListIds = player.preRollAdPods;
        var adsByType = {
            linear: [],
            nonLinear: []
        };

        player.firstPlayLaunched = true;

        for (var index = 0; index < adListIds.length; index++) {

            if (player.adList[adListIds[index]].played === true) {
                return
            }

            if (player.adList[adListIds[index]].adType === 'linear') {
                adsByType.linear.push(adListIds[index]);
            }

            if (player.adList[adListIds[index]].adType === 'nonLinear') {
                adsByType.nonLinear.push(adListIds[index]);
                player.scheduleTask({time: time, playRoll: 'midRoll', adListId: adsByType.nonLinear.shift()});
            }
        }

        if (adsByType.linear.length > 0) {
            player.toggleLoader(true);
            player.playRoll(adsByType.linear);
        } else {
            player.playMainVideoWhenVastFails(900);
        }

    },

    preRoll: function (event) {
        var player = fluidPlayerClass.getInstanceById(this.id);
        var videoPlayerTag = document.getElementById(this.getAttribute('id'));
        var vastObj = event.vastObj;
        videoPlayerTag.removeEventListener(event.type, player.preRoll);

        var adListId = [];
        adListId[0] = event.type.replace('adId_', '');
        var time = 0;

        if (player.adList[adListId[0]].played === true) {
            return;
        }

        player.preRollAdPods.push(adListId[0]);

        player.preRollSuccess(vastObj);
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
        if (player.adList[adListId].played === true) {
            return;
        }

        var time = player.adList[adListId].timer;

        if (typeof time == 'string' && time.indexOf("%") !== -1) {
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

        if (player.adList[adListId].adType === 'nonLinear') {
            if (!player.adPool.hasOwnProperty(adListId) || player.adPool[adListId].error === true) {
                player.announceLocalError(101);
                return;
            }

            //var playerWrapper = document.getElementById('fluid_video_wrapper_' + player.videoPlayerId);
            var nonLinearAdExists = document.getElementsByClassName('fluid_nonLinear_ad')[0];
            if (!nonLinearAdExists) {
                player.createBoard(adListId);
                player.currentOnPauseRollAd = adListId;
                onPauseAd = document.getElementById('fluid_nonLinear_' + adListId);
                if (onPauseAd) {
                    onPauseAd.style.display = 'none';
                }
            } else {
                player.onPauseRollAdPods.push(adListId);
            }

        }
    },


    /**
     * Check if player has a valid nonLinear onPause Ad
     */
    hasValidOnPauseAd: function () {
        var player = this;
        var onPauseAd = player.findRoll('onPauseRoll'); //should be only one. todo add validator to allow only one onPause roll

        return (onPauseAd.length != 0 && player.adList[onPauseAd[0]] && player.adList[onPauseAd[0]].error === false);
    },


    /**
     * Hide/show nonLinear onPause Ad
     */
    toggleOnPauseAd: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        if (player.hasValidOnPauseAd() && !player.isCurrentlyPlayingAd) {

            var onPauseRoll = player.findRoll('onPauseRoll');
            if (player.currentOnPauseRollAd !== '') {
                var adListId = player.currentOnPauseRollAd;
            } else {
                var adListId = onPauseRoll[0];
            }

            player.vastOptions = player.adPool[adListId];
            var onPauseAd = document.getElementById('fluid_nonLinear_' + adListId);

            if (onPauseAd && videoPlayerTag.paused) {
                setTimeout(function(){
                    onPauseAd.style.display = 'flex';
                    player.adList[adListId].played = false;
                    player.trackingOnPauseNonLinearAd(adListId, 'start');
                }, 500);
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

    getLinearAdsFromKeyTime: function (keyTimeLinearObj) {
        var player = this;
        var adListIds = [];

        for (var i = 0; i < keyTimeLinearObj.length; i++) {
            if (player.adList[keyTimeLinearObj[i].adListId].played === false) {
                adListIds.push(keyTimeLinearObj[i].adListId);
            }
        }

        return adListIds;
    },

    adKeytimePlay: function (keyTime) {
        var player = this;

        if (!player.timerPool[keyTime] || player.isCurrentlyPlayingAd) {
            return;
        }

        var timerPoolKeytimeCloseStaticAdsLength = player.timerPool[keyTime]['closeStaticAd'].length;
        var timerPoolKeytimeLinearAdsLength = player.timerPool[keyTime]['linear'].length;
        var timerPoolKeytimeNonlinearAdsLength = player.timerPool[keyTime]['nonLinear'].length;

        // remove the item from keytime if no ads to play
        if (timerPoolKeytimeCloseStaticAdsLength === 0 && timerPoolKeytimeLinearAdsLength === 0 && timerPoolKeytimeNonlinearAdsLength === 0) {
            delete player.timerPool[keyTime];
            return;
        }

        // Task: close nonLinear ads
        if (timerPoolKeytimeCloseStaticAdsLength > 0) {
            for (var index = 0; index < timerPoolKeytimeCloseStaticAdsLength; index++) {
                var adListId = player.timerPool[keyTime]['closeStaticAd'][index].closeStaticAd;

                if (player.adList[adListId].played === true) {
                    player.completeNonLinearStatic(adListId);
                }
            }

            // empty closeStaticAd from the timerpool after closing
            player.timerPool[keyTime]['closeStaticAd'] = [];
        }

        // Task: play linear ads
        if (timerPoolKeytimeLinearAdsLength > 0) {
            var adListIds = player.getLinearAdsFromKeyTime(player.timerPool[keyTime]['linear']);
            if (adListIds.length > 0) {
                player.playRoll(adListIds);

                // empty the linear ads from the timerpool after played
                player.timerPool[keyTime]['linear'] = [];

                // return after starting video ad, so non-linear will not overlap
                return;
            }
        }

        // Task: play nonLinear ads
        if (timerPoolKeytimeNonlinearAdsLength > 0) {
            for (var index = 0; index < timerPoolKeytimeNonlinearAdsLength; index++) {
                var adListId = player.timerPool[keyTime]['nonLinear'][index].adListId;
                var vastOptions = player.adPool[adListId];

                // we are not supporting nonLinear ads in cardBoard mode
                if (player.adList[adListId].played === false && !player.displayOptions.layoutControls.showCardBoardView) {
                    player.createNonLinearStatic(adListId);
                    if (player.displayOptions.vastOptions.showProgressbarMarkers) {
                        player.hideAdMarker(adListId);
                    }

                    // delete nonLinear after playing
                    player.timerPool[keyTime]['nonLinear'].splice(index, 1);

                    // return after starting non-linear ad, so multiple non-linear will not overlap
                    // unplayed non-linear will appear if user seeks back to the time :)
                    return;
                }
            }
        }

    },

    adTimer: function () {
        var player = this;

        if (player.isTimer == true) {
            return;
        }

        player.isTimer = !player.isTimer;

        player.timer = setInterval(
            function () {
                var keyTime = Math.floor(player.getCurrentTime());
                player.adKeytimePlay(keyTime)
            }, 800);
    },


    scheduleTask: function (task) {
        var player = this;
        if (!player.timerPool.hasOwnProperty(task.time)) {
            player.timerPool[task.time] = {linear: [], nonLinear: [], closeStaticAd: []};
        }

        if (task.hasOwnProperty('playRoll') && player.adList[task.adListId].adType === 'linear') {
            player.timerPool[task.time]['linear'].push(task);
        } else if (task.hasOwnProperty('playRoll') && player.adList[task.adListId].adType === 'nonLinear') {
            player.timerPool[task.time]['nonLinear'].push(task);
        } else if (task.hasOwnProperty('closeStaticAd')) {
            player.timerPool[task.time]['closeStaticAd'].push(task);
        }

    },

    deleteVastAdElements: function () {
        var player = this;

        player.removeClickthrough();
        player.removeSkipButton();
        player.removeAdCountdown();
        player.removeAdPlayingText();
        player.removeCTAButton();
        player.vastLogoBehaviour(false);
    },

    switchToMainVideo: function () {

        var player = this;
        player.debugMessage('starting main video');
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        videoPlayerTag.src = player.originalSrc;

        player.initialiseStreamers();

        var newCurrentTime = (typeof videoPlayerTag.mainVideoCurrentTime !== 'undefined')
            ? videoPlayerTag.mainVideoCurrentTime : 0;

        if (videoPlayerTag.hasOwnProperty('currentTime')) {
            videoPlayerTag.currentTime = newCurrentTime;
        }

        if (player.displayOptions.layoutControls.loop) {
            videoPlayerTag.loop = true;
        }

        player.setCurrentTimeAndPlay(newCurrentTime, player.autoplayAfterAd);

        player.isCurrentlyPlayingAd = false;

        player.deleteVastAdElements();

        player.adFinished = true;
        player.displayOptions.vastOptions.vastAdvanced.vastVideoEndedCallback();
        player.vastOptions = null;

        player.setBuffering();
        var progressbarContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');

        if (progressbarContainer !== null) {
            var backgroundColor = (player.displayOptions.layoutControls.primaryColor) ? player.displayOptions.layoutControls.primaryColor : "white";

            var currentProgressBar = videoPlayerTag.parentNode.getElementsByClassName('fluid_controls_currentprogress');

            for (var i = 0; i < currentProgressBar.length; i++) {
                currentProgressBar[i].style.backgroundColor = backgroundColor;
            }

        }

        videoPlayerTag.removeEventListener('ended', player.onVastAdEnded);

        if (player.displayOptions.vastOptions.showProgressbarMarkers) {
            player.showAdMarkers();
        }

        if (player.hasTitle()) {
          var title = document.getElementById(player.videoPlayerId + '_title');
          title.style.display = 'inline';
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

    getNextAdPod: function () {
        var player = this;
        var getFirstUnPlayedAd = false;
        var adListId = null;

        // if temporaryAdPods is not empty
        if (player.temporaryAdPods.length > 0) {
            var temporaryAdPods = player.temporaryAdPods.shift();
            adListId = temporaryAdPods.id;
        }

        return adListId;
    },


    onVpaidEnded: function (event) {
        if (event) {
            event.stopImmediatePropagation();
        }

        var player = this;
        var vpaidSlot = document.getElementById(player.videoPlayerId +"_fluid_vpaid_slot");

        player.vpaidAdUnit = null;
        clearInterval(player.getVPAIDAdInterval);
        vpaidSlot.remove();

        player.checkForNextAd();
    },

    onVastAdEnded: function (event) {
        if (event) {
            event.stopImmediatePropagation();
        }
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        var player = fluidPlayerClass.getInstanceById(this.id);

        player.deleteVastAdElements();
        player.checkForNextAd();
    },

    checkForNextAd: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        var availableNextAdID = player.getNextAdPod();
        if (availableNextAdID === null) {
            player.switchToMainVideo();
            player.vastOptions = null;
            player.adFinished = true;
        } else {
            videoPlayerTag.removeEventListener('ended', player.onVastAdEnded);
            player.isCurrentlyPlayingAd = false;
            player.vastOptions = null;
            player.adFinished = true;
            player.renderLinearAd(availableNextAdID,false); // passing false so it doesn't backup the Ad playbacktime as video playback time
        }
    },

    onMainVideoEnded: function (event) {

        var videoPlayerTag = this;
        var player = fluidPlayerClass.getInstanceById(this.id);

        if (event && !player.isCurrentlyPlayingAd) {
            event.stopImmediatePropagation();
        }

        player.debugMessage('onMainVideoEnded is called');

        if (player.isCurrentlyPlayingAd && player.autoplayAfterAd) {  // It may be in-stream ending, and if it's not postroll then we don't execute anything
            return;
        }

        //we can remove timer as no more ad will be shown
        if (Math.floor(player.getCurrentTime()) >= Math.floor(player.mainVideoDuration)) {

            // play pre-roll ad
            // sometime pre-roll ad will be missed because we are clearing the timer
            player.adKeytimePlay(Math.floor(player.mainVideoDuration));

            clearInterval(player.timer);
        }

        if (player.displayOptions.layoutControls.loop === true) {
            var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(this.getAttribute('id'));
            var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
            player.switchToMainVideo();
            player.playPauseToggle(videoPlayerTag);
        }
    },

    getCurrentTime: function () {
        var player = this;

        if (player.isCurrentlyPlayingAd) {
            return player.mainVideoCurrentTime;
        } else {
            var videoPlayerTag = document.getElementById(this.videoPlayerId);
            return videoPlayerTag.currentTime;
        }

    },

    /**
     * Adds a Skip Button
     */
    addSkipButton: function () {
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
    addAdCountdown: function () {
        var videoPlayerTag = document.getElementById(this.videoPlayerId);
        var videoWrapper = document.getElementById('fluid_video_wrapper_' + this.videoPlayerId);
        var divAdCountdown = document.createElement('div');

        // Create element
        var adCountdown = this.pad(parseInt(this.currentVideoDuration / 60)) + ':' + this.pad(parseInt(this.currentVideoDuration % 60));
        var durationText = parseInt(adCountdown);
        divAdCountdown.id = 'ad_countdown' + this.videoPlayerId;
        divAdCountdown.className = 'ad_countdown';
        divAdCountdown.innerHTML = "<span class='ad_timer_prefix'>Ad - </span>" + durationText;

        videoWrapper.appendChild(divAdCountdown);

        videoPlayerTag.addEventListener('timeupdate', this.decreaseAdCountdown, false);
        videoWrapper.addEventListener('mouseover', function () { divAdCountdown.style.display = 'none'; }, false);
    },

    decreaseAdCountdown: function decreaseAdCountdown() {
        var videoPlayerTag = this;
        var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);
        var sec = parseInt(player.currentVideoDuration) - parseInt(videoPlayerTag.currentTime);
        var btn = document.getElementById('ad_countdown' + player.videoPlayerId);

        if (btn) {
            btn.innerHTML = "<span class='ad_timer_prefix'>Ad - </span> " + player.pad(parseInt(sec / 60)) + ':' + player.pad(parseInt(sec % 60));
        } else {
            videoPlayerTag.removeEventListener('timeupdate', player.decreaseAdCountdown);
        }
    },

    removeAdCountdown: function () {
        var btn = document.getElementById('ad_countdown' + this.videoPlayerId);
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    },

    toggleAdCountdown: function (showing) {
        var btn = document.getElementById('ad_countdown' + this.videoPlayerId);
        if (btn) {
            if (showing) {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'none';
            }
        }
    },

    addAdPlayingText: function (textToShow) {
        var player = this;

        var adPlayingDiv = document.createElement('div');
        adPlayingDiv.id = this.videoPlayerId + '_fluid_ad_playing';

        if (player.displayOptions.layoutControls.primaryColor) {
            adPlayingDiv.style.backgroundColor = player.displayOptions.layoutControls.primaryColor;
            adPlayingDiv.style.opacity = 1;
        }

        adPlayingDiv.className = 'fluid_ad_playing';
        adPlayingDiv.innerText = textToShow;

        document.getElementById('fluid_video_wrapper_' + this.videoPlayerId).appendChild(adPlayingDiv);
    },

    positionTextElements: function (adListData) {
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

            ctaButton.style[positionsCTA[0]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + 'px';
            ctaButton.style[positionsCTA[1]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].h + 'px';

            if (isBottom && positionsCTA[1] == 'right') {
                ctaButton.style[positionsCTA[0]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + skipButtonHeightWithSpacing + 'px';
            }

            ctaButtonHeightWithSpacing = ctaButton.offsetHeight + pixelSpacing + 'px';

        }

        if (adPlayingDiv !== null) {

            var adPlayingDivPosition = (adListData.adTextPosition !== null) ? adListData.adTextPosition.toLowerCase() : this.displayOptions.vastOptions.adTextPosition.toLowerCase();

            if (allowedPosition.indexOf(adPlayingDivPosition) == -1) {
                console.log('[FP Error] Invalid position for adText. Reverting to "top left"');
                adPlayingDivPosition = 'top left';
            }

            var positionsAdText = adPlayingDivPosition.split(' ');
            adPlayingDiv.style[positionsAdText[0]] = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + 'px';
            adPlayingDiv.style[positionsAdText[1]] = defaultPositions[positionsAdText[0]][positionsAdText[1]].h + 'px';
            adPlayingDivHeightWithSpacing = adPlayingDiv.offsetHeight + pixelSpacing + 'px';
        }

        if (ctaButtonHeightWithSpacing > 0 && adPlayingDivHeightWithSpacing > 0 && CTATextPosition == adPlayingDivPosition) {
            if (isBottom) {
                if (positionsCTA[1] == 'right') {
                    adPlayingDiv.style.bottom = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + skipButtonHeightWithSpacing + ctaButtonHeightWithSpacing + 'px';
                } else {
                    adPlayingDiv.style.bottom = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + ctaButtonHeightWithSpacing + 'px';
                }
            } else {
                ctaButton.style.top = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + adPlayingDivHeightWithSpacing + 'px';
            }
        }
    },

    removeAdPlayingText: function () {
        var div = document.getElementById(this.videoPlayerId + '_fluid_ad_playing');
        if (div) {
            div.parentElement.removeChild(div);
        }
    },

    addCTAButton: function (landingPage) {

        var player = this;

        if ( !landingPage ) {
            return;
        }

        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        var ctaButton = document.createElement('div');
        ctaButton.id = this.videoPlayerId + '_fluid_cta';
        ctaButton.className = 'fluid_ad_cta';

        var link = document.createElement('span');
        link.innerHTML = this.displayOptions.vastOptions.adCTAText + "<br/><span class=\"add_icon_clickthrough\">" + landingPage + "</span>";

        ctaButton.addEventListener('click', function () {
            if (!videoPlayerTag.paused) {
                videoPlayerTag.pause();
            }

            var win = window.open(player.vastOptions.clickthroughUrl, '_blank');
            win.focus();
            return true;
        }, false);

        ctaButton.appendChild(link);

        document.getElementById('fluid_video_wrapper_' + this.videoPlayerId).appendChild(ctaButton);
    },

    removeCTAButton: function () {
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
                btn.innerHTML = '<a href="javascript:;" id="skipHref_' + player.videoPlayerId + '" onclick="fluidPlayerClass.getInstanceById(\'' + player.videoPlayerId + '\').pressSkipButton(); return false;">'
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

    pressSkipButton: function () {

        this.removeSkipButton();
        this.removeAdPlayingText();
        this.removeCTAButton();

        var player = fluidPlayerClass.getInstanceById(this.videoPlayerId);

        if (player.vastOptions.vpaid) {

            // skip the linear vpaid ad
            player.skipVpaidAd();

        } else {

            // skip the regular linear vast
            this.displayOptions.vastOptions.vastAdvanced.vastVideoSkippedCallback();
            var event = document.createEvent('Event');
            event.initEvent('ended', false, true);
            document.getElementById(this.videoPlayerId).dispatchEvent(event);

        }

    },

    removeSkipButton: function () {
        var btn = document.getElementById('skip_button_' + this.videoPlayerId);
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    },

    /**
     * Makes the player open the ad URL on clicking
     */
    addClickthroughLayer: function () {
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
        var openClickthrough = function () {
            window.open(player.vastOptions.clickthroughUrl);

            //Tracking the Clickthorugh events
            if (typeof player.vastOptions.clicktracking !== 'undefined') {
                player.callUris(player.vastOptions.clicktracking);
            }
        };

        var clickthroughLayer = document.getElementById('vast_clickthrough_layer_' + player.videoPlayerId);
        var isIos9orLower = (player.mobileInfo.device === 'iPhone') && (player.mobileInfo.userOsMajor !== false) && (player.mobileInfo.userOsMajor <= 9);

        clickthroughLayer.onclick = function () {
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
    removeClickthrough: function () {
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
    getCurrentSrc: function () {
        var sources = document.getElementById(this.videoPlayerId).getElementsByTagName('source');

        if (sources.length) {
            return sources[0].getAttribute('src');
        }

        return null;
    },

    /**
     * Src types required for streaming elements
     */
    getCurrentSrcType: function () {
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

    convertTimeStringToSeconds: function (str) {
        if (str && str.match(/^(\d){2}(:[0-5][0-9]){2}(.(\d){1,3})?$/)) {
            var timeParts = str.split(':');
            return ((parseInt(timeParts[0], 10)) * 3600) + ((parseInt(timeParts[1], 10)) * 60) + (parseInt(timeParts[2], 10));
        }

        return false;
    },

    onRecentWaiting: function () {
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
    onFluidPlayerPause: function () {
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

    checkShouldDisplayVolumeBar: function () {
        var deviceType = fluidPlayerClass.getMobileOs();

        if (deviceType.userOs === 'iOS') {
            return false;
        }

        return true;
    },

    generateCustomControlTags: function () {
        return '<div class="fluid_controls_left">' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_playpause" class="fluid_button fluid_button_play fluid_control_playpause"></div>' +
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
            '   <div id="' + this.videoPlayerId + '_fluid_control_fullscreen" class="fluid_button fluid_control_fullscreen fluid_button_fullscreen"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_theatre" class="fluid_button fluid_control_theatre fluid_button_theatre"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_cardboard" class="fluid_button fluid_control_cardboard fluid_button_cardboard"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_subtitles" class="fluid_button fluid_button_subtitles"></div>' +
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
            '   <div id="' + this.videoPlayerId + '_fluid_control_mute" class="fluid_button fluid_button_volume fluid_control_mute"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_duration" class="fluid_control_duration fluid_fluid_control_duration">00:00 / 00:00</div>' +
            '</div>';
    },

    controlPlayPauseToggle: function (videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);
        var videoPlayer = document.getElementById(player.videoPlayerId);
        var playPauseButton = videoPlayer.parentNode.getElementsByClassName('fluid_control_playpause');
        var menuOptionPlay = document.getElementById(videoPlayerId + 'context_option_play');
        var controlsDisplay = videoPlayer.parentNode.getElementsByClassName('fluid_controls_container');
        var fpLogo = document.getElementById(player.videoPlayerId + '_logo');
        var videoPlayer = document.getElementById(player.videoPlayerId);

        var initialPlay = document.getElementById(videoPlayerId + '_fluid_initial_play');
        if (initialPlay) {
            document.getElementById(videoPlayerId + '_fluid_initial_play').style.display = "none";
            document.getElementById(videoPlayerId + '_fluid_initial_play_button').style.opacity = "1";
        }

        if (!videoPlayer.paused) {

            for (var i = 0; i < playPauseButton.length; i++) {
                playPauseButton[i].className = playPauseButton[i].className.replace(/\bfluid_button_play\b/g, 'fluid_button_pause');
            }

            for (var i = 0; i < controlsDisplay.length; i++) {
                controlsDisplay[i].classList.remove('initial_controls_show');
            }

            if (fpLogo) {
                fpLogo.classList.remove('initial_controls_show');
            }

            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = this.displayOptions.captions.pause;
            }

        } else {

            for ( var i = 0; i < playPauseButton.length; i++ ){
                playPauseButton[i].className = playPauseButton[i].className.replace(/\bfluid_button_pause\b/g, 'fluid_button_play');
            }

            for ( var i = 0; i < controlsDisplay.length; i++ ){
                controlsDisplay[i].classList.add('initial_controls_show');
            }

            if (this.isCurrentlyPlayingAd && player.displayOptions.vastOptions.showPlayButton) {
                document.getElementById(videoPlayerId + '_fluid_initial_play').style.display = "block";
                document.getElementById(videoPlayerId + '_fluid_initial_play_button').style.opacity = "1";
            }

            if (fpLogo) {
                fpLogo.classList.add('initial_controls_show');
            }

            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = this.displayOptions.captions.play;
            }
        }
    },

    playPauseAnimationToggle: function (play) {
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
        var videoPlayerSaveId = videoPlayerId;
        setTimeout(
            function () {
                document.getElementById(videoPlayerSaveId + '_fluid_initial_play').classList.remove('transform-active');
            },
            800
        );
    },

    contolProgressbarUpdate: function (videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);
        var videoPlayerTag = document.getElementById(videoPlayerId);
        var currentProgressTag = videoPlayerTag.parentNode.getElementsByClassName('fluid_controls_currentprogress');

        for (var i = 0; i < currentProgressTag.length; i++) {
            currentProgressTag[i].style.width = (videoPlayerTag.currentTime / player.currentVideoDuration * 100) + '%';
        }

    },

    //Format time to hh:mm:ss
    formatTime: function (duration) {
      var formatDateObj = new Date(duration * 1000);
      var formatHours = this.pad(formatDateObj.getUTCHours());
      var formatMinutes = this.pad(formatDateObj.getUTCMinutes());
      var formatSeconds = this.pad(formatDateObj.getSeconds());

      if (formatHours >= 1) {
        var result = formatHours + ':' + formatMinutes + ':' + formatSeconds;
      } else {
        var result = formatMinutes + ':' + formatSeconds;
      }

      return result;
    },

    contolDurationUpdate: function (videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);
        var videoPlayerTag = document.getElementById(videoPlayerId);

        var currentPlayTime = player.formatTime(videoPlayerTag.currentTime);
        var totalTime = player.formatTime(player.currentVideoDuration);

        var durationText = currentPlayTime + ' / ' + totalTime;

        var timePlaceholder = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_duration');

        for (var i = 0; i < timePlaceholder.length; i++) {
            timePlaceholder[i].innerHTML = durationText;
        }

    },

    pad: function (value) {
        if (value < 10) {
            return '0' + value;
        } else {
            return value;
        }
    },

    contolVolumebarUpdate: function (videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);
        var videoPlayerTag = document.getElementById(videoPlayerId);
        var currentVolumeTag = document.getElementById(videoPlayerId + '_fluid_control_currentvolume');
        var volumeposTag = document.getElementById(videoPlayerId + '_fluid_control_volume_currentpos');
        var volumebarTotalWidth = document.getElementById(videoPlayerId + '_fluid_control_volume').clientWidth;
        var volumeposTagWidth = volumeposTag.clientWidth;
        var muteButtonTag = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_mute');
        var menuOptionMute = document.getElementById(videoPlayerId + 'context_option_mute');

        if (videoPlayerTag.volume) {
            player.latestVolume = videoPlayerTag.volume;
            player.fluidStorage.fluidMute = false;
        }

        if (videoPlayerTag.volume && !videoPlayerTag.muted) {
            for (var i = 0; i < muteButtonTag.length; i++) {
                muteButtonTag[i].className = muteButtonTag[i].className.replace(/\bfluid_button_mute\b/g, 'fluid_button_volume');
            }

            if (menuOptionMute !== null) {
                menuOptionMute.innerHTML = this.displayOptions.captions.mute;
            }

        } else {
            for (var i = 0; i < muteButtonTag.length; i++) {
                muteButtonTag[i].className = muteButtonTag[i].className.replace(/\bfluid_button_volume\b/g, 'fluid_button_mute');
            }

            if (menuOptionMute !== null) {
                menuOptionMute.innerHTML = this.displayOptions.captions.unmute;
            }
        }
        currentVolumeTag.style.width = (videoPlayerTag.volume * volumebarTotalWidth) + 'px';
        volumeposTag.style.left = (videoPlayerTag.volume * volumebarTotalWidth - (volumeposTagWidth / 2)) + 'px';
    },

    muteToggle: function (videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);
        var videoPlayerTag = document.getElementById(videoPlayerId);

        if (videoPlayerTag.volume && !videoPlayerTag.muted) {
            videoPlayerTag.volume = 0;
            videoPlayerTag.muted = true;
        } else {
            videoPlayerTag.volume = player.latestVolume;
            videoPlayerTag.muted = false;
        }

        // Persistent settings
        this.fluidStorage.fluidVolume = player.latestVolume;
        this.fluidStorage.fluidMute   = videoPlayerTag.muted;
    },

    checkFullscreenSupport: function (videoPlayerWrapperId) {
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
        for (var i = 0; i < fullscreenButton.length; i++) {
            fullscreenButton[i].className = fullscreenButton[i].className.replace(/\bfluid_button_fullscreen_exit\b/g, 'fluid_button_fullscreen');
        }
        if (menuOptionFullscreen !== null) {
            menuOptionFullscreen.innerHTML = 'Fullscreen';
        }
        this.fullscreenMode = false;
    },

    fullscreenOn: function (fullscreenButton, menuOptionFullscreen) {

        for (var i = 0; i < fullscreenButton.length; i++) {
            fullscreenButton[i].className = fullscreenButton[i].className.replace(/\bfluid_button_fullscreen\b/g, 'fluid_button_fullscreen_exit');
        }

        if (menuOptionFullscreen !== null) {
            menuOptionFullscreen.innerHTML = this.displayOptions.captions.exitFullscreen;
        }
        this.fullscreenMode = true;
    },

    fullscreenToggle: function () {
        fluidPlayerClass.activeVideoPlayerId = this.videoPlayerId;

        var videoPlayerTag = document.getElementById(this.videoPlayerId);
        var fullscreenTag = document.getElementById('fluid_video_wrapper_' + this.videoPlayerId);
        var requestFullscreenFunctionNames = this.checkFullscreenSupport('fluid_video_wrapper_' + this.videoPlayerId);
        var fullscreenButton = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_fullscreen');
        var menuOptionFullscreen = document.getElementById(this.videoPlayerId + 'context_option_fullscreen');


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

        this.resizeVpaidAuto();

    },

    findClosestParent: function (el, selector) {
        var matchesFn;

        // find vendor prefix
        ['matches','webkitMatchesSelector','mozMatchesSelector','msMatchesSelector','oMatchesSelector'].some( function (fn) {
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

    getTranslateX: function (el) {
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

    getEventOffsetX: function (evt, el) {
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

    getEventOffsetY: function (evt, el) {
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

    onProgressbarMouseDown: function (videoPlayerId, event) {

        var player = fluidPlayerClass.getInstanceById(videoPlayerId);
        player.displayOptions.layoutControls.playPauseAnimation = false;
        // we need an initial position for touchstart events, as mouse up has no offset x for iOS
        var initialPosition;

        if (player.displayOptions.layoutControls.showCardBoardView) {
            initialPosition = fluidPlayerClass.getEventOffsetX(event, event.srcElement.parentNode);
        } else {
            initialPosition = fluidPlayerClass.getEventOffsetX(event, document.getElementById(videoPlayerId + '_fluid_controls_progress_container'));
        }

        if (player.isCurrentlyPlayingAd) {
            return;
        }

        player.fluidPseudoPause = true;
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
            var currentX = fluidPlayerClass.getEventOffsetX(event, event.srcElement.parentNode);
            initialPosition = NaN; // mouse up will fire after the move, we don't want to trigger the initial position in the event of iOS
            shiftTime(videoPlayerId, currentX);
            player.contolProgressbarUpdate(player.videoPlayerId);
            player.contolDurationUpdate(player.videoPlayerId);
        }

        function onProgressbarMouseUp (event) {
            document.removeEventListener('mousemove', onProgressbarMouseMove);
            document.removeEventListener('touchmove', onProgressbarMouseMove);
            document.removeEventListener('mouseup', onProgressbarMouseUp);
            document.removeEventListener('touchend', onProgressbarMouseUp);
            var clickedX = fluidPlayerClass.getEventOffsetX(event, event.srcElement.parentNode);
            if (isNaN(clickedX) && !isNaN(initialPosition)) {
                clickedX = initialPosition;
            }

            if (!isNaN(clickedX)) {
                shiftTime(videoPlayerId, clickedX);
            }
            if (!initiallyPaused) {
                player.play();
            }
            // Wait till video played then reenable the animations
            if (player.initialAnimationSet) {
                setTimeout(function () { player.displayOptions.layoutControls.playPauseAnimation = player.initialAnimationSet; }, 200);
            }
            player.fluidPseudoPause = false;
        }

        document.addEventListener('mouseup', onProgressbarMouseUp);
        document.addEventListener('touchend', onProgressbarMouseUp);
        document.addEventListener('mousemove', onProgressbarMouseMove);
        document.addEventListener('touchmove', onProgressbarMouseMove);
    },

    onVolumebarMouseDown: function (videoPlayerId) {

        function shiftVolume(videoPlayerId, volumeBarX) {
            var videoPlayerTag = document.getElementById(videoPlayerId);
            var totalWidth = document.getElementById(videoPlayerId + '_fluid_control_volume_container').clientWidth;
            var player = fluidPlayerClass.getInstanceById(videoPlayerId);

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
                player.setVolume(newVolume);
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
        var adGroupedByRolls = {preRoll:[], postRoll:[], midRoll:[], onPauseRoll:[]};
        var def = {id: null, roll: null, played: false, vastLoaded: false, error: false, adText: null, adTextPosition: null};
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

                if (validateRequiredParams(adItem)) {
                    player.announceLocalError(102, 'Wrong adList parameters.');
                    continue;
                }
                var id = 'ID' + idPart;

                ads[id] = Object.assign({}, def);
                ads[id] = Object.assign(ads[id], player.displayOptions.vastOptions.adList[key]);
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
           }
           else if (ads[e].roll.toLowerCase() === 'midRoll'.toLowerCase()) {
            adGroupedByRolls.midRoll.push(ads[e]);
           }
           else if (ads[e].roll.toLowerCase() === 'postRoll'.toLowerCase()) {
            adGroupedByRolls.postRoll.push(ads[e]);
           }
           else if (ads[e].roll.toLowerCase() === 'onPauseRoll'.toLowerCase()) {
            adGroupedByRolls.onPauseRoll.push(ads[e]);
           }
        });

        player.adGroupedByRolls = adGroupedByRolls;
        player.adList = ads;
    },


    findRoll: function (roll) {
        var player = this;
        var ids = [];
        ids.length = 0;

        if (!roll || !player.hasOwnProperty('adList')) {
            return;
        }

        for (var key in player.adList) {
            if (player.adList[key].roll == roll) {
                ids.push(key);
            }
        }

        return ids;
    },


    volumeChange: function (videoPlayerId, direction) {
        var videoPlayerTag = document.getElementById(videoPlayerId);
        var newVolume = videoPlayerTag.volume;

        if (direction == 'asc') {
            newVolume += 0.05;
        } else if (direction == 'desc') {
            newVolume -= 0.05;
        }

        if (newVolume < 0.05) {
            newVolume = 0;
        } else if (newVolume > 0.95) {
            newVolume = 1;
        }

        this.setVolume(newVolume);
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

    handleMouseleave: function (event) {
        var playerElement = this;
        var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(playerElement.getAttribute('id'));
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);

        if (typeof event.clientX !== 'undefined' && document.getElementById('fluid_video_wrapper_' + videoInstanceId).contains(document.elementFromPoint(event.clientX, event.clientY))) {
            //false positive; we didn't actually leave the player
            return;
        }

        videoPlayerInstance.hideControlBar.call(playerElement);
        videoPlayerInstance.hideTitle.call(playerElement);
    },

    handleMouseenterForKeyboard: function () {
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

    keyboardControl: function () {
        var player = this;
        var videoPlayer = document.getElementById('fluid_video_wrapper_' + player.videoPlayerId);

        videoPlayer.addEventListener('click', player.handleMouseenterForKeyboard, false);

        // When we click outside player, we stop registering keyboard events
        var clickHandler = player.handleWindowClick.bind(player);
        player.destructors.push(function () {
            window.removeEventListener('click', clickHandler);
        });
        window.addEventListener('click', clickHandler);
    },

    handleWindowClick: function (e) {
        var videoInstanceId = this.videoPlayerId;
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
        var videoPlayerWrapper = document.getElementById('fluid_video_wrapper_' + videoInstanceId);

        if (!videoPlayerWrapper) {
            console.warn('Dangling click event listener should be collected for unknown wrapper ' + videoInstanceId
              + '. Did you forget to call destroy on player instance?');
            return;
        }

        var inScopeClick = videoPlayerWrapper.contains(e.target) || e.target.id === 'skipHref_' + videoInstanceId;

        if (inScopeClick) {
            return;
        }

        document.removeEventListener('keydown', videoPlayerInstance.captureKey, true);
        delete videoPlayerInstance['captureKey'];

        if (videoPlayerInstance.theatreMode && !videoPlayerInstance.theatreModeAdvanced) {
            videoPlayerInstance.theatreToggle();
        }
    },

    initialPlay: function () {
        var videoPlayerTag = this;
        var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);

        videoPlayerTag.addEventListener('playing', function () {
            player.toggleLoader(false);
        });

        videoPlayerTag.addEventListener('timeupdate', function () {
            // some places we are manually displaying toggleLoader
            // user experience toggleLoader being displayed even when content is playing in background
            player.toggleLoader(false);
        });

        videoPlayerTag.addEventListener('waiting', function () {
            player.toggleLoader(true);
        });

        if (!player.displayOptions.layoutControls.playButtonShowing) {
            // Controls always showing until the video is first played
            var initialControlsDisplay = document.getElementById(player.videoPlayerId + '_fluid_controls_container');
            initialControlsDisplay.classList.remove('initial_controls_show');
            // The logo shows before playing but may need to be removed
            var fpPlayer = document.getElementById(player.videoPlayerId + '_logo');
            if (fpPlayer) {
                fpPlayer.classList.remove('initial_controls_show');
            }
        }

        if (!player.firstPlayLaunched) {
            player.playPauseToggle(videoPlayerTag);

            videoPlayerTag.removeEventListener('play', player.initialPlay);
        }
    },

    playPauseToggle: function (videoPlayerTag) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);
        var isFirstStart = !player.firstPlayLaunched;

        var preRolls = player.findRoll('preRoll');
        if (!isFirstStart || preRolls.length == 0) {

            if (isFirstStart && preRolls.length == 0) {
                player.firstPlayLaunched = true;
                player.displayOptions.vastOptions.vastAdvanced.noVastVideoCallback();
            }


            if (videoPlayerTag.paused) {

                if (player.isCurrentlyPlayingAd && player.vastOptions !== null &&  player.vastOptions.vpaid) {
                    // resume the vpaid linear ad
                    player.resumeVpaidAd();
                } else {
                    // resume the regular linear vast or content video player
                    if (player.dashPlayer) {
                        player.dashPlayer.play();
                    } else {
                        videoPlayerTag.play();
                    }
                }

                this.playPauseAnimationToggle(true);

            } else if (!isFirstStart) {

                if (player.isCurrentlyPlayingAd && player.vastOptions !== null && player.vastOptions.vpaid){
                    // pause the vpaid linear ad
                    player.pauseVpaidAd();
                } else {
                    // pause the regular linear vast or content video player
                    videoPlayerTag.pause();
                }

                this.playPauseAnimationToggle(false);
            }


            player.toggleOnPauseAd();

        } else {
            //Workaround for Safari or Mobile Chrome - otherwise it blocks the subsequent
            //play() command, because it considers it not being triggered by the user.
            var browserVersion = fluidPlayerClass.getBrowserVersion();
            player.isCurrentlyPlayingAd = true;

            if (
                browserVersion.browserName == 'Safari'
                || (player.mobileInfo.userOs !== false && player.mobileInfo.userOs == 'Android' && browserVersion.browserName == 'Google Chrome')
            ) {
                videoPlayerTag.src = fluidPlayerScriptLocation + 'blank.mp4';
                videoPlayerTag.play();
                this.playPauseAnimationToggle(true);
            }

            player.firstPlayLaunched = true;

            //trigger the loading of the VAST Tag
            player.prepareVast('preRoll');
            player.preRollAdPodsLength = preRolls.length;
        }

        var prepareVastAdsThatKnowDuration = function () {
            player.prepareVast('onPauseRoll');
            player.prepareVast('postRoll');
            player.prepareVast('midRoll');
        };

        if (isFirstStart) {
            // Remove the div that was placed as a fix for poster image and DASH streaming, if it exists
            var pseudoPoster= document.getElementById(player.videoPlayerId + '_fluid_pseudo_poster');
            if (pseudoPoster) {
                pseudoPoster.parentNode.removeChild(pseudoPoster);
            }

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

    setCustomControls: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        //Set the Play/Pause behaviour
        player.trackEvent(videoPlayerTag.parentNode, 'click', '.fluid_control_playpause', function() {

            if (!player.firstPlayLaunched) {
                videoPlayerTag.removeEventListener('play', player.initialPlay);
            }

            player.playPauseToggle(videoPlayerTag);
        }, false);

        document.getElementById(player.videoPlayerId).addEventListener('play', function () {
            player.controlPlayPauseToggle(player.videoPlayerId);
            player.contolVolumebarUpdate(player.videoPlayerId);
        }, false);

        document.getElementById(player.videoPlayerId).addEventListener('fluidplayerpause', function () {
            player.controlPlayPauseToggle(player.videoPlayerId);
        }, false);

        //Set the progressbar
        videoPlayerTag.addEventListener('timeupdate', function () {
            player.contolProgressbarUpdate(player.videoPlayerId);
            player.contolDurationUpdate(player.videoPlayerId);
        });

        var isMobileChecks = fluidPlayerClass.getMobileOs();
        var eventOn = (isMobileChecks.userOs) ? 'touchstart' : 'mousedown';

        if ( player.displayOptions.layoutControls.showCardBoardView ) {

            player.trackEvent(videoPlayerTag.parentNode, eventOn, '.fluid_controls_progress_container', function (event) {
                player.onProgressbarMouseDown(player.videoPlayerId, event);
            }, false);

        } else {

            document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container').addEventListener(eventOn, function (event) {
                player.onProgressbarMouseDown(player.videoPlayerId, event);
            }, false);

        }

        //Set the volume controls
        document.getElementById(player.videoPlayerId + '_fluid_control_volume_container').addEventListener(eventOn, function (event) {
            player.onVolumebarMouseDown(player.videoPlayerId);
        }, false);

        videoPlayerTag.addEventListener('volumechange', function () {
            player.contolVolumebarUpdate(player.videoPlayerId);
        });

        player.trackEvent(videoPlayerTag.parentNode, 'click', '.fluid_control_mute', function() {
            player.muteToggle(player.videoPlayerId);
        });

        player.setBuffering();

        //Set the fullscreen control
        player.trackEvent(videoPlayerTag.parentNode, 'click', '.fluid_control_fullscreen', function() {
            player.fullscreenToggle();
        });

        // Theatre mode
        if (player.displayOptions.layoutControls.allowTheatre && !player.isInIframe) {
            player.trackEvent(videoPlayerTag.parentNode, 'click', '.fluid_control_theatre', function() {
                player.theatreToggle(player.videoPlayerId);
            });
        } else {
            document.getElementById(player.videoPlayerId + '_fluid_control_theatre').style.display = 'none';
        }

        videoPlayerTag.addEventListener('ratechange', function () {
            if (player.isCurrentlyPlayingAd) {
                this.playbackRate = 1;
            }
        });
    },

    // Create the time position preview only if the vtt previews aren't enabled
    createTimePositionPreview: function () {
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
        document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container').addEventListener('mousemove', function (event) {
            var progressContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');
            var totalWidth = progressContainer.clientWidth;
            var hoverTimeItem = document.getElementById(player.videoPlayerId + '_fluid_timeline_preview');
            var hoverQ = fluidPlayerClass.getEventOffsetX(event, progressContainer);

            hoverSecondQ = player.currentVideoDuration * hoverQ / totalWidth;
            showad = player.formatTime(hoverSecondQ);
            hoverTimeItem.innerText = showad;

            hoverTimeItem.style.display = 'block';
            hoverTimeItem.style.left = (hoverSecondQ / videoPlayer.duration * 100) + "%";
        }, false);

        // Hide timeline preview on mouseout
        document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container').addEventListener('mouseout', function () {
            var hoverTimeItem = document.getElementById(player.videoPlayerId + '_fluid_timeline_preview');
            hoverTimeItem.style.display = 'none';
        }, false);
    },

    setCustomContextMenu: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        var playerWrapper = document.getElementById('fluid_video_wrapper_' + player.videoPlayerId);

        //Create own context menu
        var divContextMenu = document.createElement('div');
        divContextMenu.id = player.videoPlayerId + '_fluid_context_menu';
        divContextMenu.className = 'fluid_context_menu';
        divContextMenu.style.display = 'none';
        divContextMenu.style.position = 'absolute';
        divContextMenu.innerHTML = '<ul>'+
            '    <li id="' + player.videoPlayerId + 'context_option_play">' + this.displayOptions.captions.play + '</li>' +
            '    <li id="' + player.videoPlayerId + 'context_option_mute">' + this.displayOptions.captions.mute + '</li>' +
            '    <li id="' + player.videoPlayerId + 'context_option_fullscreen">' + this.displayOptions.captions.fullscreen + '</li>' +
            '    <li id="' + player.videoPlayerId + 'context_option_homepage">Fluid Player ' + player.version + '</li>' +
            '</ul>';

        videoPlayerTag.parentNode.insertBefore(divContextMenu, videoPlayerTag.nextSibling);

        //Disable the default context menu
        playerWrapper.addEventListener('contextmenu', function (event) {
            event.preventDefault();

            divContextMenu.style.left = fluidPlayerClass.getEventOffsetX(event, videoPlayerTag) + 'px';
            divContextMenu.style.top = fluidPlayerClass.getEventOffsetY(event, videoPlayerTag) + 'px';
            divContextMenu.style.display = 'block';
        }, false);

        //Hide the context menu on clicking elsewhere
        document.addEventListener('click', function (event) {
            if ((event.target !== videoPlayerTag) || event.button !== 2) {
                divContextMenu.style.display = 'none';
            }

        }, false);

        //Attach events to the menu elements
        var menuOptionPlay       = document.getElementById(player.videoPlayerId + 'context_option_play');
        var menuOptionMute       = document.getElementById(player.videoPlayerId + 'context_option_mute');
        var menuOptionFullscreen = document.getElementById(player.videoPlayerId + 'context_option_fullscreen');
        var menuOptionHomepage   = document.getElementById(player.videoPlayerId + 'context_option_homepage');

        menuOptionPlay.addEventListener('click', function () {
            player.playPauseToggle(videoPlayerTag);
        }, false);

        menuOptionMute.addEventListener('click', function () {
            player.muteToggle(player.videoPlayerId);
        }, false);

        menuOptionFullscreen.addEventListener('click', function () {
            player.fullscreenToggle();
        }, false);

        menuOptionHomepage.addEventListener('click', function () {
            var win = window.open(player.homepage, '_blank');
            win.focus();
        }, false);
    },

    setDefaultLayout: function () {
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

        var backgroundColor = (player.displayOptions.layoutControls.primaryColor) ? player.displayOptions.layoutControls.primaryColor : "white";
        document.getElementById(player.videoPlayerId + '_vast_control_currentprogress').style.backgroundColor = backgroundColor;

        videoPlayerTag.parentNode.insertBefore(divLoading, videoPlayerTag.nextSibling);

        var remainingAttemptsToInitiateVolumeBar = 100;

        /**
         * Set the volumebar after its elements are properly rendered.
         */
        var initiateVolumebar = function () {
            if (!remainingAttemptsToInitiateVolumeBar) {
                clearInterval(initiateVolumebarTimerId);

            } else if (player.checkIfVolumebarIsRendered()) {
                clearInterval(initiateVolumebarTimerId);
                player.contolVolumebarUpdate(player.videoPlayerId);

            } else {
                remainingAttemptsToInitiateVolumeBar--;
            }
        };


        /*
            Dobule click fullscreen
        */
        if (player.displayOptions.layoutControls.doubleclickFullscreen) {
            videoPlayerTag.addEventListener('dblclick', function () {
                player.fullscreenToggle();
            }, false);
        }

        var initiateVolumebarTimerId = setInterval(initiateVolumebar, 100);

        player.initHtmlOnPauseBlock();

        player.setCustomControls();

        player.setupThumbnailPreview();

        player.createTimePositionPreview();

        player.posterImage();

        player.initPlayButton();

        player.setVideoPreload();

        player.createPlaybackList();

        player.createDownload();
    },

    /**
     * Checks if the volumebar is rendered and the styling applied by comparing
     * the width of 2 elements that should look different.
     *
     * @returns Boolean
     */
    checkIfVolumebarIsRendered: function () {
        var player = this;
        var volumeposTag = document.getElementById(player.videoPlayerId + '_fluid_control_volume_currentpos');
        var volumebarTotalWidth = document.getElementById(player.videoPlayerId + '_fluid_control_volume').clientWidth;
        var volumeposTagWidth = volumeposTag.clientWidth;

        if (volumeposTagWidth === volumebarTotalWidth) {
            return false;
        }

        return true;
    },

    setLayout: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        //All other browsers
        var listenTo = (fluidPlayerClass.isTouchDevice()) ? 'touchend' : 'click';
        document.getElementById(this.videoPlayerId).addEventListener(listenTo, function () {
            player.playPauseToggle(videoPlayerTag);
        }, false);

        //Mobile Safari - because it does not emit a click event on initial click of the video
        videoPlayerTag.addEventListener('play', player.initialPlay, false);
        this.setDefaultLayout();
    },

    handleFullscreen: function () {
        var player = this;

        if (typeof document.vastFullsreenChangeEventListenersAdded === 'undefined') {
            ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach(
                function (eventType) {

                    if (typeof (document['on' + eventType]) === 'object') {
                        document.addEventListener(eventType, function (ev) {
                            player.recalculateAdDimensions(fluidPlayerClass.activeVideoPlayerId);
                        }, false);
                    }
                }
            );

            document.vastFullsreenChangeEventListenersAdded = true;
        }
    },

    setupThumbnailPreviewVtt: function () {
        var player = this;

        player.sendRequest(
            player.displayOptions.layoutControls.timelinePreview.file,
            true,
            player.displayOptions.vastOptions.vastTimeout,
            function () {
                var convertVttRawData = function (vttRawData) {
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

    generateTimelinePreviewTags: function () {
        var player = this;
        var progressContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');
        var previewContainer = document.createElement('div');

        previewContainer.id = player.videoPlayerId + '_fluid_timeline_preview_container';
        previewContainer.className = 'fluid_timeline_preview_container';
        previewContainer.style.display = 'none';
        previewContainer.style.position = 'absolute';

        progressContainer.appendChild(previewContainer);

        //Shadow is needed to not trigger mouseleave event, that stops showing thumbnails, in case one scrubs a bit too fast and leaves current thumb before new one drawn.
        var previewContainerShadow = document.createElement('div');
        previewContainerShadow.id = player.videoPlayerId + '_fluid_timeline_preview_container_shadow';
        previewContainerShadow.className = 'fluid_timeline_preview_container_shadow';
        previewContainerShadow.style.position = 'absolute';
        previewContainerShadow.style.display = 'none';
        previewContainerShadow.style.opacity = 1;
        progressContainer.appendChild(previewContainerShadow);
    },

    getThumbnailCoordinates: function (second) {
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

    drawTimelinePreview: function (event) {
        var player = this;
        var timelinePreviewTag = document.getElementById(player.videoPlayerId + '_fluid_timeline_preview_container');
        var timelinePreviewShadow = document.getElementById(player.videoPlayerId + '_fluid_timeline_preview_container_shadow');
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
            timelinePreviewShadow.style.width = totalWidth + 'px';
            timelinePreviewShadow.style.display = 'block';

            if (thumbnailCoordinates !== false) {
                timelinePreviewTag.style.width = thumbnailCoordinates.w + 'px';
                timelinePreviewTag.style.height = thumbnailCoordinates.h + 'px';
                timelinePreviewShadow.style.height = thumbnailCoordinates.h + 'px';
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

    setupThumbnailPreview: function () {
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

                    var eventOn = 'mousemove';
                    var eventOff = 'mouseleave';
                    if (player.mobileInfo.userOs) {
                        eventOn = 'touchmove';
                        eventOff = 'touchend';
                    }

                    document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container')
                        .addEventListener(eventOn, player.drawTimelinePreview.bind(player), false);
                    document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container')
                        .addEventListener(eventOff, function (event) {
                            var progress = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');
                            if (typeof event.clientX !== 'undefined' && progress.contains(document.elementFromPoint(event.clientX, event.clientY))) {
                                //False positive (Chrome bug when fast click causes leave event)
                                return;
                            }
                            document.getElementById(player.videoPlayerId + '_fluid_timeline_preview_container').style.display = 'none';
                            document.getElementById(player.videoPlayerId + '_fluid_timeline_preview_container_shadow').style.display = 'none';
                        }, false);

                    player.generateTimelinePreviewTags();
                    break;

                default:
                    break;
            }

            player.showTimeOnHover = false;
        }
    },

    setupPlayerWrapper: function () {
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

    onErrorDetection: function () {
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

    subtitleFetchParse: function (subtitleItem) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        player.sendRequest(
        subtitleItem.url,
        true,
        player.displayOptions.vastOptions.vastTimeout,
        function () {
            var convertVttRawData = function (vttRawData) {
                if (!(
                    (typeof vttRawData.cues !== 'undefined') &&
                    (vttRawData.cues.length)
                )) {
                    return [];
                }

                var result = [];

                for (var i = 0; i < vttRawData.cues.length; i++) {
                    tempThumbnailData = vttRawData.cues[i].text.split('#');

                    result.push({
                        startTime: vttRawData.cues[i].startTime,
                        endTime: vttRawData.cues[i].endTime,
                        text:  vttRawData.cues[i].text,
                        cue: vttRawData.cues[i]
                    })
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

            var parser = new WebVTT.Parser(window, WebVTT.StringDecoder());
            var cues = [];
            var regions = [];
            parser.oncue = function (cue) {
              cues.push(cue);
            };
            parser.onregion = function (region) {
              regions.push(region);
            }
            parser.parse(textResponse);
            parser.flush();
            player.subtitlesData = cues;

            }
         );
    },

    createSubtitlesSwitch: function () {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);
        var subtitlesOff = 'OFF'
        player.subtitlesData =  [];

        if (player.displayOptions.layoutControls.subtitlesEnabled) {
            var tracks = [];
            tracks.push({'label': subtitlesOff, 'url': 'na', 'lang': subtitlesOff});

            var tracksList = videoPlayer.querySelectorAll('track');

            [].forEach.call(tracksList, function (track) {
                if (track.kind === 'metadata' && track.src) {
                    tracks.push({'label': track.label, 'url': track.src, 'lang': track.srclang});
                }
            });

            player.subtitlesTracks = tracks;
            var subtitlesChangeButton = document.getElementById(player.videoPlayerId + '_fluid_control_subtitles');
            var appendSubtitleChange = false;

            var subtitlesChangeList = document.createElement('div');
            subtitlesChangeList.id = player.videoPlayerId + '_fluid_control_subtitles_list';
            subtitlesChangeList.className = 'fluid_subtitles_list';
            subtitlesChangeList.style.display = 'none';

            var firstSubtitle = true;
            player.subtitlesTracks.forEach(function (subtitle) {

            var subtitleSelected = (firstSubtitle) ? "subtitle_selected" :  "";
            firstSubtitle = false;
            var subtitlesChangeDiv = document.createElement('div');
            subtitlesChangeDiv.id        = 'subtitle_' + player.videoPlayerId + '_' + subtitle.label;
            subtitlesChangeDiv.className = 'fluid_subtitle_list_item';
            subtitlesChangeDiv.innerHTML = '<span class="subtitle_button_icon ' + subtitleSelected + '"></span>' + subtitle.label;

            subtitlesChangeDiv.addEventListener('click', function (event) {
                event.stopPropagation();
                var subtitleChangedTo = this;
                var subtitleIcons = document.getElementsByClassName('subtitle_button_icon');
                for (var i = 0; i < subtitleIcons.length; i++) {
                    subtitleIcons[i].className = subtitleIcons[i].className.replace("subtitle_selected", "");
                }
                subtitleChangedTo.firstChild.className += ' subtitle_selected';

                player.subtitlesTracks.forEach(function (subtitle) {
                    if (subtitle.label == subtitleChangedTo.innerText.replace(/(\r\n\t|\n|\r\t)/gm,"")) {

                        if (subtitle.label === subtitlesOff) {
                            player.subtitlesData =  [];
                        } else {
                            player.subtitleFetchParse(subtitle);
                        }
                    }
                 });
                    player.openCloseSubtitlesSwitch();

                });

                subtitlesChangeList.appendChild(subtitlesChangeDiv);
                appendSubtitleChange = true;

            });

            if (appendSubtitleChange) {
                subtitlesChangeButton.appendChild(subtitlesChangeList);
                subtitlesChangeButton.addEventListener('click', function () {
                    player.openCloseSubtitlesSwitch();
                });
            } else {
                // Didn't give any subtitle options
                document.getElementById(player.videoPlayerId + '_fluid_control_subtitles').style.display = 'none';
            }


        } else {
            // No other video subtitles
            document.getElementById(player.videoPlayerId + '_fluid_control_subtitles').style.display = 'none';
        }

        //attach subtitles to show based on time
        //this function is for rendering of subtitles when content is playing
        var videoPlayerSubtitlesUpdate = function () {
            player.renderSubtitles();
        };

        videoPlayer.addEventListener('timeupdate', videoPlayerSubtitlesUpdate);
    },

    renderSubtitles: function () {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);

        //if content is playing then no subtitles
        var currentTime = Math.floor(videoPlayer.currentTime);
        var subtitlesAvailable = false;
        var subtitlesContainer =  document.getElementById(player.videoPlayerId+'_fluid_subtitles_container');

        if (player.isCurrentlyPlayingAd) {
             subtitlesContainer.innerHTML = '';
            return;
        }

        var currentTime = Math.floor(videoPlayer.currentTime);
        var subtitlesAvailable = false;
        var subtitlesContainer =  document.getElementById(player.videoPlayerId+'_fluid_subtitles_container');

        for (var i = 0; i < player.subtitlesData.length; i++) {
            if (currentTime >= (player.subtitlesData[i].startTime) && currentTime <= (player.subtitlesData[i].endTime)) {
                subtitlesContainer.innerHTML = '';
                subtitlesContainer.appendChild(WebVTT.convertCueToDOMTree(window, player.subtitlesData[i].text));
                subtitlesAvailable = true;
            }
        }

        if (!subtitlesAvailable) {
            subtitlesContainer.innerHTML = '';
        }
    },

    openCloseSubtitlesSwitch: function () {
        var player = this;
        var subtitleChangeList = document.getElementById(this.videoPlayerId + '_fluid_control_subtitles_list');
        var sourceChangeListContainer = document.getElementById(this.videoPlayerId + '_fluid_control_subtitles');

        if (player.isCurrentlyPlayingAd) {
            subtitleChangeList.style.display = 'none';
            return;
        }

        if (subtitleChangeList.style.display == 'none') {
            subtitleChangeList.style.display = 'block';
            var mouseOut = function (event) {
                sourceChangeListContainer.removeEventListener('mouseleave', mouseOut);
                subtitleChangeList.style.display = 'none';
            };
            sourceChangeListContainer.addEventListener('mouseleave', mouseOut);
        } else {
            subtitleChangeList.style.display = 'none';
        }
    },

    createSubtitles: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        var divSubtitlesContainer = document.createElement('div');
        divSubtitlesContainer.id = player.videoPlayerId + '_fluid_subtitles_container';
        divSubtitlesContainer.className = 'fluid_subtitles_container';
        videoPlayerTag.parentNode.insertBefore(divSubtitlesContainer, videoPlayerTag.nextSibling);

        fluidPlayerClass.requestScript(
            fluidPlayerScriptLocation + fluidPlayerClass.subtitlesParseScript,
            player.createSubtitlesSwitch.bind(this)
        );
    },

    createCardboardJoystickButton: function (identity) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        var vrJoystickPanel = document.getElementById(player.videoPlayerId + '_fluid_vr_joystick_panel');
        var joystickButton = document.createElement('div');
        joystickButton.id = player.videoPlayerId + '_fluid_vr_joystick_' + identity;
        joystickButton.className = 'fluid_vr_button fluid_vr_joystick_' + identity;
        vrJoystickPanel.appendChild(joystickButton);

        return joystickButton;
    },

    cardboardRotateLeftRight: function (param /* 0 - right, 1 - left */) {
        var player = this;
        var go = player.vrROTATION_POSITION;
        var back = -player.vrROTATION_POSITION;
        var pos = param < 1 ? go : back;
        var easing = {val: pos};
        var tween = new TWEEN.Tween(easing)
          .to({val: 0}, player.vrROTATION_SPEED)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate(function () {
              player.vrViewer.OrbitControls.rotateLeft(easing.val)
          }).start();
    },

    cardboardRotateUpDown: function (param /* 0 - down, 1- up */) {
        var player = this;
        var go = player.vrROTATION_POSITION;
        var back = -player.vrROTATION_POSITION;
        var pos = param < 1 ? go : back;
        var easing = {val: pos};
        var tween = new TWEEN.Tween(easing)
          .to({val: 0}, player.vrROTATION_SPEED)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate(function () {
              player.vrViewer.OrbitControls.rotateUp(easing.val)
          }).start();
    },

    createCardboardJoystick: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        var vrContainer = document.getElementById(player.videoPlayerId + '_fluid_vr_container');

        // Create a JoyStick and append to VR container
        var vrJoystickPanel = document.createElement('div');
        vrJoystickPanel.id = player.videoPlayerId + '_fluid_vr_joystick_panel';
        vrJoystickPanel.className = 'fluid_vr_joystick_panel';
        vrContainer.appendChild(vrJoystickPanel);

        // Create Joystick buttons
        var upButton = player.createCardboardJoystickButton('up');
        var leftButton = player.createCardboardJoystickButton('left');
        var rightButton = player.createCardboardJoystickButton('right');
        var downButton = player.createCardboardJoystickButton('down');
        var zoomDefaultButton = player.createCardboardJoystickButton('zoomdefault');
        var zoomInButton = player.createCardboardJoystickButton('zoomin');
        var zoomOutButton = player.createCardboardJoystickButton('zoomout');

        // Camera movement buttons
        upButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateUp(-0.1);
            player.cardboardRotateUpDown(1);
        });

        downButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateUp(0.1);
            player.cardboardRotateUpDown(0);
        });

        rightButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateLeft(0.1);
            player.cardboardRotateLeftRight(0);
        });

        leftButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateLeft(-0.1);
            player.cardboardRotateLeftRight(1);
        });

        zoomDefaultButton.addEventListener('click', function () {
            player.vrViewer.camera.fov = 60;
            player.vrViewer.camera.updateProjectionMatrix();
        });

        // Camera Zoom buttons
        zoomOutButton.addEventListener('click', function () {
            player.vrViewer.camera.fov *= 1.1;
            player.vrViewer.camera.updateProjectionMatrix();
        });

        zoomInButton.addEventListener('click', function () {
            player.vrViewer.camera.fov *= 0.9;
            player.vrViewer.camera.updateProjectionMatrix();
        });

    },

    cardBoardResize: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(this.videoPlayerId);
        videoPlayerTag.addEventListener('theatreModeOn', function () {
            player.vrViewer.onWindowResize();
        });

        videoPlayerTag.addEventListener('theatreModeOff', function () {
            player.vrViewer.onWindowResize();
        });
    },

    cardBoardSwitchToNormal: function () {
        var player = this;
        var vrJoystickPanel = document.getElementById(player.videoPlayerId + '_fluid_vr_joystick_panel');
        var controlBar = document.getElementById(player.videoPlayerId + '_fluid_controls_container');
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        player.vrViewer.enableEffect( PANOLENS.MODES.NORMAL );
        player.vrViewer.onWindowResize();
        player.vrMode = false;

        // remove dual control bar
        var newControlBar = videoPlayerTag.parentNode.getElementsByClassName('fluid_vr2_controls_container')[0];
        videoPlayerTag.parentNode.removeChild(newControlBar);

        if(player.displayOptions.layoutControls.showCardBoardJoystick && vrJoystickPanel){
            vrJoystickPanel.style.display = "block";
        }
        controlBar.classList.remove("fluid_vr_controls_container");

        // show volume control bar
        var volumeContainer = document.getElementById(player.videoPlayerId + '_fluid_control_volume_container')
        volumeContainer.style.display = "block";

        // show all ads overlays if any
        var adCountDownTimerText = document.getElementById('ad_countdown' + player.videoPlayerId);
        var ctaButton = document.getElementById(player.videoPlayerId+'_fluid_cta');
        var addAdPlayingTextOverlay = document.getElementById(player.videoPlayerId+'_fluid_ad_playing');
        var skipBtn = document.getElementById('skip_button_' + player.videoPlayerId);

        if ( adCountDownTimerText ) {
            adCountDownTimerText.style.display = 'block';
        }

        if ( ctaButton ) {
            ctaButton.style.display = 'block';
        }

        if ( addAdPlayingTextOverlay ) {
            addAdPlayingTextOverlay.style.display = 'block';
        }

        if ( skipBtn ) {
            skipBtn.style.display = 'block';
        }
    },


    cardBoardHideDefaultControls: function () {
        var player = this;
        var vrJoystickPanel = document.getElementById(player.videoPlayerId + '_fluid_vr_joystick_panel');
        var initialPlay = document.getElementById(player.videoPlayerId + '_fluid_initial_play');
        var volumeContainer = document.getElementById(player.videoPlayerId + '_fluid_control_volume_container');
        var controlBar = document.getElementById(player.videoPlayerId + '_fluid_controls_container');

        // hide the joystick in VR mode
        if ( player.displayOptions.layoutControls.showCardBoardJoystick && vrJoystickPanel) {
            vrJoystickPanel.style.display = "none";
        }

        // hide big play icon
        if ( initialPlay ) {
            document.getElementById(player.videoPlayerId + '_fluid_initial_play').style.display = "none";
            document.getElementById(player.videoPlayerId + '_fluid_initial_play_button').style.opacity = "1";
        }

        // hide volume control bar
        volumeContainer.style.display = "none";

    },

    cardBoardCreateVRControls: function () {
        var player = this;
        var controlBar = document.getElementById(player.videoPlayerId + '_fluid_controls_container');
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        // create and append dual control bar
        var newControlBar = controlBar.cloneNode(true);
        newControlBar.removeAttribute('id');
        newControlBar.querySelectorAll('*').forEach(function (node) {
            node.removeAttribute('id');
        });

        newControlBar.classList.add("fluid_vr2_controls_container");
        videoPlayerTag.parentNode.insertBefore(newControlBar, videoPlayerTag.nextSibling);
        player.copyEvents(newControlBar);

    },

    cardBoardSwitchToVR: function () {
        var player = this;
        var vrJoystickPanel = document.getElementById(player.videoPlayerId + '_fluid_vr_joystick_panel');
        var controlBar = document.getElementById(player.videoPlayerId + '_fluid_controls_container');
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        player.vrViewer.enableEffect(PANOLENS.MODES.CARDBOARD);

        player.vrViewer.onWindowResize();
        player.vrViewer.disableReticleControl();

        player.vrMode = true;

        controlBar.classList.add("fluid_vr_controls_container");

        player.cardBoardHideDefaultControls();
        player.cardBoardCreateVRControls();


        // hide all ads overlays
        var adCountDownTimerText = document.getElementById('ad_countdown' + player.videoPlayerId);
        var ctaButton = document.getElementById(player.videoPlayerId+'_fluid_cta');
        var addAdPlayingTextOverlay = document.getElementById(player.videoPlayerId+'_fluid_ad_playing');
        var skipBtn = document.getElementById('skip_button_' + player.videoPlayerId);

        if ( adCountDownTimerText ) {
            adCountDownTimerText.style.display = 'none';
        }

        if ( ctaButton ) {
            ctaButton.style.display = 'none';
        }

        if ( addAdPlayingTextOverlay ) {
            addAdPlayingTextOverlay.style.display = 'none';
        }

        if ( skipBtn ) {
            skipBtn.style.display = 'none';
        }

    },

    cardBoardMoveTimeInfo: function () {
        var player = this;
        var timePlaceholder = document.getElementById(player.videoPlayerId + '_fluid_control_duration');
        var controlBar = document.getElementById(player.videoPlayerId + '_fluid_controls_container');

        timePlaceholder.classList.add("cardboard_time");
        controlBar.appendChild(timePlaceholder);

        // override the time display function for this instance
        player.contolDurationUpdate = function ( videoPlayerId ) {
            var player = fluidPlayerClass.getInstanceById(videoPlayerId);
            var videoPlayerTag = document.getElementById(videoPlayerId);

            var currentPlayTime = player.formatTime(videoPlayerTag.currentTime);
            var totalTime = player.formatTime(player.currentVideoDuration);
            var timePlaceholder = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_duration');

            var durationText = '';

            if ( player.isCurrentlyPlayingAd ) {

                durationText = "<span class='ad_timer_prefix'>AD : </span>"+currentPlayTime + ' / ' + totalTime;

                for( var index = 0; index < timePlaceholder.length; index++){
                    timePlaceholder[index].classList.add("ad_timer_prefix");
                }


            } else {

                durationText = currentPlayTime + ' / ' + totalTime;

                for( var index = 0; index < timePlaceholder.length; index++){
                    timePlaceholder[index].classList.remove("ad_timer_prefix");
                }

            }


            for (var i = 0; i < timePlaceholder.length; i++) {
                timePlaceholder[i].innerHTML = durationText;
            }
        }
    },

    cardBoardAlterDefaultControls: function () {
        var player = this;

        player.cardBoardMoveTimeInfo();
    },

    createCardboardView: function () {

        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        var vrSwitchButton = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_cardboard');

        // Create a container for 360degree
        var vrContainer = document.createElement('div');
        vrContainer.id = player.videoPlayerId + '_fluid_vr_container';
        vrContainer.className = 'fluid_vr_container';
        videoPlayerTag.parentNode.insertBefore(vrContainer, videoPlayerTag.nextSibling);

        // OverRide some conflicting functions from panolens
        PANOLENS.VideoPanorama.prototype.pauseVideo = function () { };
        PANOLENS.VideoPanorama.prototype.playVideo = function () { };

        player.vrPanorama = new PANOLENS.VideoPanorama( '', { videoElement:  videoPlayerTag, autoplay: player.displayOptions.layoutControls.autoPlay } );

        player.vrViewer = new PANOLENS.Viewer( { container: vrContainer, controlBar: true, controlButtons: [], enableReticle: false } );
        player.vrViewer.add( player.vrPanorama );

        player.vrViewer.enableEffect( PANOLENS.MODES.NORMAL );
        player.vrViewer.onWindowResize();

        // if Mobile device then enable controls using gyroscope
        if ( fluidPlayerClass.getMobileOs().userOs === 'Android' || fluidPlayerClass.getMobileOs().userOs === 'iOS' ){
            player.vrViewer.enableControl(1);
        }

        // Make Changes for default skin
        player.cardBoardAlterDefaultControls();

        // resize on toggle theater mode
        player.cardBoardResize();

        // Store initial camera position
        player.vrViewer.initialCameraPosition = JSON.parse( JSON.stringify( player.vrViewer.camera.position ) );

        if(player.displayOptions.layoutControls.showCardBoardJoystick){
            if (!( fluidPlayerClass.getMobileOs().userOs === 'Android' || fluidPlayerClass.getMobileOs().userOs === 'iOS' )){
                player.createCardboardJoystick();
            }
            // Disable zoom if showing joystick
            player.vrViewer.OrbitControls.noZoom = true;
        }

        player.trackEvent(videoPlayerTag.parentNode, 'click', '.fluid_control_cardboard', function() {

            if ( player.vrMode ) {

                player.cardBoardSwitchToNormal();

            } else {

                player.cardBoardSwitchToVR();

            }

        });
    },

    createCardboard: function () {
        var player = this;

        if(player.displayOptions.layoutControls.showCardBoardView){

            fluidPlayerClass.requestScript(
                fluidPlayerScriptLocation + fluidPlayerClass.threeJsScript,
                function () {

                    fluidPlayerClass.requestScript(
                        fluidPlayerScriptLocation + fluidPlayerClass.panolensScript,
                        function () {

                            player.createCardboardView();

                        })

                }
            );

        }else{

            var cardBoardBtn = document.getElementById(player.videoPlayerId + '_fluid_control_cardboard');
            cardBoardBtn.style.display = 'none';

        }
    },

    createVideoSourceSwitch: function () {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);

        var sources = [];
        var sourcesList = videoPlayer.querySelectorAll('source');
        [].forEach.call(sourcesList, function (source) {
            if (source.title && source.src) {
                sources.push({'title': source.title, 'url': source.src, 'isHD': (source.getAttribute('data-fluid-hd') != null) });
            }
        });

        player.videoSources = sources;
        if (player.videoSources.length > 1) {
            var sourceChangeButton = document.getElementById(player.videoPlayerId + '_fluid_control_video_source');
            var appendSourceChange = false;

            var sourceChangeList = document.createElement('div');
            sourceChangeList.id = player.videoPlayerId + '_fluid_control_video_source_list';
            sourceChangeList.className = 'fluid_video_sources_list';
            sourceChangeList.style.display = 'none';

            var firstSource = true;
            player.videoSources.forEach(function (source) {
                // Fix for issues occurring on iOS with mkv files
                var getTheType = source.url.split(".").pop();
                if (player.mobileInfo.userOs == "iOS" && getTheType == 'mkv') {
                    return;
                }

                var sourceSelected = (firstSource) ? "source_selected" :  "";
                var hdElement = (source.isHD) ? '<sup style="color:' + player.displayOptions.layoutControls.primaryColor + '" class="fp_hd_source"></sup>' : '';
                firstSource = false;
                var sourceChangeDiv = document.createElement('div');
                sourceChangeDiv.id        = 'source_' + player.videoPlayerId + '_' + source.title;
                sourceChangeDiv.className = 'fluid_video_source_list_item';
                sourceChangeDiv.innerHTML = '<span class="source_button_icon ' + sourceSelected + '"></span>' + source.title + hdElement;

                sourceChangeDiv.addEventListener('click', function (event) {
                    // While changing source the player size can flash, we want to set the pixel dimensions then back to 100% afterwards
                    videoPlayer.style.width = videoPlayer.clientWidth + "px";
                    videoPlayer.style.height = videoPlayer.clientHeight + "px";

                    event.stopPropagation();
                    var videoChangedTo = this;
                    var sourceIcons = document.getElementsByClassName('source_button_icon');
                    for (var i = 0; i < sourceIcons.length; i++) {
                        sourceIcons[i].className = sourceIcons[i].className.replace("source_selected", "");
                    }
                    videoChangedTo.firstChild.className += ' source_selected';

                    player.videoSources.forEach(function (source) {
                        if (source.title == videoChangedTo.innerText.replace(/(\r\n\t|\n|\r\t)/gm,"")) {
                            player.setBuffering();
                            player.setVideoSource(source.url);
                            player.fluidStorage.fluidQuality = source.title;
                        }
                    });

                    player.openCloseVideoSourceSwitch();

                });
                sourceChangeList.appendChild(sourceChangeDiv);
                appendSourceChange = true;
            });

            if (appendSourceChange) {
                sourceChangeButton.appendChild(sourceChangeList);
                sourceChangeButton.addEventListener('click', function () {
                    player.openCloseVideoSourceSwitch();
                });
            } else {
                // Didn't give any source options
                document.getElementById(player.videoPlayerId + '_fluid_control_video_source').style.display = 'none';
            }

        } else {
            // No other video sources
            document.getElementById(player.videoPlayerId + '_fluid_control_video_source').style.display = 'none';
        }
    },

    openCloseVideoSourceSwitch: function () {
        var player = this;
        var sourceChangeList = document.getElementById(this.videoPlayerId + '_fluid_control_video_source_list');
        var sourceChangeListContainer = document.getElementById(this.videoPlayerId + '_fluid_control_video_source');

        if (player.isCurrentlyPlayingAd) {
            sourceChangeList.style.display = 'none';
            return;
        }

        if (sourceChangeList.style.display == 'none') {
            sourceChangeList.style.display = 'block';
            var mouseOut = function (event) {
                sourceChangeListContainer.removeEventListener('mouseleave', mouseOut);
                sourceChangeList.style.display = 'none';
            };
            sourceChangeListContainer.addEventListener('mouseleave', mouseOut);
        } else {
            sourceChangeList.style.display = 'none';
        }
    },

    setVideoSource: function (url) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        if (player.mobileInfo.userOs == "iOS" && url.indexOf('.mkv') > 0) {
            console.log('[FP_ERROR] .mkv files not supported by iOS devices.');
            return false;
        }

        if (player.isCurrentlyPlayingAd) {
            player.originalSrc = url;
        } else {
            player.isSwitchingSource = true;
            var play = false;
            if (!videoPlayerTag.paused) {
                videoPlayerTag.pause();
                play = true;
            }

            var currentTime = videoPlayerTag.currentTime;
            player.setCurrentTimeAndPlay(currentTime, play);

            videoPlayerTag.src = url;
            player.originalSrc = url;
            player.displayOptions.layoutControls.mediaType = player.getCurrentSrcType();
            player.initialiseStreamers();
        }
    },

    setCurrentTimeAndPlay: function (newCurrentTime, shouldPlay) {
        var videoPlayerTag = document.getElementById(this.videoPlayerId);
        var player = this;

        var loadedMetadata = function () {
            videoPlayerTag.currentTime = newCurrentTime;
            videoPlayerTag.removeEventListener('loadedmetadata', loadedMetadata);
            // Safari ios and mac fix to set currentTime
            if (player.mobileInfo.userOs == 'iOS' || player.getBrowserVersion().browserName.toLowerCase() === 'safari') {
                videoPlayerTag.addEventListener('playing', videoPlayStart);
            }

            if (shouldPlay) {
                videoPlayerTag.play();
            } else {
                videoPlayerTag.pause();
                player.controlPlayPauseToggle(player.videoPlayerId);
            }
            player.isSwitchingSource = false;
            videoPlayerTag.style.width = "100%";
            videoPlayerTag.style.height = "100%";
        };
        var videoPlayStart = function () {
            this.currentTime = newCurrentTime;
            videoPlayerTag.removeEventListener('playing', videoPlayStart);
        };

        videoPlayerTag.addEventListener("loadedmetadata", loadedMetadata, false);

        videoPlayerTag.load();
    },

    initTitle: function () {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);
        if (player.displayOptions.layoutControls.title) {
            var titleHolder = document.createElement('div');
            titleHolder.id = player.videoPlayerId + '_title';
            videoPlayer.parentNode.insertBefore(titleHolder, null);
            titleHolder.innerHTML += player.displayOptions.layoutControls.title;
            titleHolder.classList.add('fp_title');
        }
    },

    hasTitle: function () {
        var title = document.getElementById(this.videoPlayerId + '_title');
        var titleOption = this.displayOptions.layoutControls.title;
        return (title && titleOption != null) ? true : false;
    },

    hideTitle: function () {
        var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(this.getAttribute('id'));
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
        var videoPlayerTag = document.getElementById(videoInstanceId);
        var titleHolder = document.getElementById(videoPlayerInstance.videoPlayerId + '_title');

        if (videoPlayerInstance.hasTitle()) {
          titleHolder.classList.add('fade_out');
        }
    },

    showTitle: function () {
        var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(this.getAttribute('id'));
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
        var videoPlayerTag = document.getElementById(videoInstanceId);
        var titleHolder = document.getElementById(videoPlayerInstance.videoPlayerId + '_title');

        if (videoPlayerInstance.hasTitle()) {
          titleHolder.classList.remove('fade_out');
        }
    },

    initLogo: function () {
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
            logoImage.addEventListener('click', function () {
                var win = window.open(player.displayOptions.layoutControls.logo.clickUrl, '_blank');
                win.focus();
            });
        }

        // If a mouseOverImage is provided then we must set up the listeners for it
        if (player.displayOptions.layoutControls.logo.mouseOverImageUrl) {
            logoImage.addEventListener('mouseover', function () { logoImage.src = player.displayOptions.layoutControls.logo.mouseOverImageUrl; }, false);
            logoImage.addEventListener('mouseout', function () { logoImage.src = player.displayOptions.layoutControls.logo.imageUrl; }, false);
        }

        videoPlayer.parentNode.insertBefore(logoHolder, null);
        logoHolder.appendChild(logoImage, null);
    },

    initHtmlOnPauseBlock: function () {
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
        containerDiv.onclick = function (event) {
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
    initPlayButton: function () {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);

        // Create the html fpr the play button
        var containerDiv = document.createElement('div');
        containerDiv.id = player.videoPlayerId + '_fluid_initial_play_button';
        containerDiv.className = 'fluid_html_on_pause';
        var backgroundColor = (player.displayOptions.layoutControls.primaryColor) ? player.displayOptions.layoutControls.primaryColor : "#333333";
        containerDiv.innerHTML = '<div id="' + player.videoPlayerId + '_fluid_initial_play" class="fluid_initial_play" style="background-color:' + backgroundColor + '"><div id="' + player.videoPlayerId + '_fluid_state_button" class="fluid_initial_play_button"></div></div>';
        var initPlayFunction = function () {
            player.playPauseToggle(videoPlayer);
            containerDiv.removeEventListener('click', initPlayFunction);
        };
        containerDiv.addEventListener('click', initPlayFunction);

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
    mainVideoReady: function () {
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
        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        player.newActivity = null;

        var isMouseStillDown = false;

        var activity = function (event) {
            if (event.type === 'touchstart' || event.type === 'mousedown') {
                isMouseStillDown = true;
            }
            if (event.type === 'touchend' || event.type === 'mouseup') {
                isMouseStillDown = false;
            }
            player.newActivity = true;
        };

        var activityCheck = setInterval(function () {

            if (player.newActivity === true) {
                if (!isMouseStillDown && !player.isLoading) {
                    player.newActivity = false;
                }

                if (player.isUserActive === false || !player.isControlBarVisible()) {
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

        var listenTo = (fluidPlayerClass.isTouchDevice()) ? ['touchstart', 'touchmove', 'touchend'] : ['mousemove', 'mousedown', 'mouseup'];
        for (var i = 0; i < listenTo.length; i++) {
            videoPlayer.addEventListener(listenTo[i], activity);
        }
    },

    hasControlBar: function () {
        return (document.getElementById(this.videoPlayerId + '_fluid_controls_container')) ? true : false;
    },

    isControlBarVisible: function () {
        var player = this;

        if (player.hasControlBar() === false) {
            return false;
        }

        var controlBar = document.getElementById(player.videoPlayerId + '_fluid_controls_container');
        var style = window.getComputedStyle(controlBar, null);
        return !(style.opacity == 0 || style.visibility == 'hidden');
    },

    setVideoPreload: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        videoPlayerTag.setAttribute('preload', this.displayOptions.layoutControls.preload);
    },

    hideControlBar: function () {
        var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(this.getAttribute('id'));
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
        var videoPlayerTag = document.getElementById(videoInstanceId);

        if (videoPlayerInstance.isCurrentlyPlayingAd && !videoPlayerTag.paused) {
            videoPlayerInstance.toggleAdCountdown(true);
        }

        // handles both VR and Normal condition
        if (videoPlayerInstance.hasControlBar()) {
            var divVastControls = videoPlayerTag.parentNode.getElementsByClassName('fluid_controls_container');
            var fpLogo = videoPlayerTag.parentNode.getElementsByClassName('fp_logo');

            for (var i = 0; i < divVastControls.length; i++) {
                if (videoPlayerInstance.displayOptions.layoutControls.controlBar.animated) {
                    divVastControls[i].classList.remove('fade_in');
                    divVastControls[i].classList.add('fade_out');
                } else {
                    divVastControls[i].style.display = 'none';

                }
            }

            for (var i = 0; i < fpLogo.length; i++) {
                if ( videoPlayerInstance.displayOptions.layoutControls.controlBar.animated ) {
                    if ( fpLogo[i] ) {
                        fpLogo[i].classList.remove('fade_in');
                        fpLogo[i].classList.add('fade_out');
                    }
                } else {
                    if ( fpLogo[i] ) {
                        fpLogo[i].style.display = 'none';
                    }
                }
            }
        }

        videoPlayerTag.style.cursor = 'none';
    },

    showControlBar: function () {
        var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(this.getAttribute('id'));
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
        var videoPlayerTag = document.getElementById(videoInstanceId);

        if (videoPlayerInstance.isCurrentlyPlayingAd && !videoPlayerTag.paused) {
            videoPlayerInstance.toggleAdCountdown(false);
        }

        if (videoPlayerInstance.hasControlBar()) {
            var divVastControls = videoPlayerTag.parentNode.getElementsByClassName('fluid_controls_container');
            var fpLogo = videoPlayerTag.parentNode.getElementsByClassName('fp_logo');

            for (var i = 0; i < divVastControls.length; i++) {
                if (videoPlayerInstance.displayOptions.layoutControls.controlBar.animated) {
                    divVastControls[i].classList.remove('fade_out');
                    divVastControls[i].classList.add('fade_in');
                } else {
                    divVastControls[i].style.display = 'block';
                }
            }

            for (var i = 0; i < fpLogo.length; i++) {
                if (videoPlayerInstance.displayOptions.layoutControls.controlBar.animated) {
                    if ( fpLogo[i] ) {
                        fpLogo[i].classList.remove('fade_out');
                        fpLogo[i].classList.add('fade_in');
                    }
                } else {
                    if ( fpLogo[i] ) {
                        fpLogo[i].style.display = 'block';
                    }
                }
            }

        }

        if (!fluidPlayerClass.isTouchDevice()) {
            videoPlayerTag.style.cursor = 'default';
        }
    },

    linkControlBarUserActivity: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        videoPlayerTag.addEventListener('userInactive', player.hideControlBar);
        videoPlayerTag.addEventListener('userActive', player.showControlBar);
        videoPlayerTag.addEventListener('userInactive', player.hideTitle);
        videoPlayerTag.addEventListener('userActive', player.showTitle);
    },

    initMute: function () {
        var player = this;
        if (player.displayOptions.layoutControls.mute === true) {
            var videoPlayerTag = document.getElementById(player.videoPlayerId);
            videoPlayerTag.volume = 0;
        }
    },

    initLoop: function () {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);
        if (player.displayOptions.layoutControls.loop !== null) {
            videoPlayerTag.loop = player.displayOptions.layoutControls.loop;
        } else if (videoPlayerTag.loop) {
            player.displayOptions.layoutControls.loop = true;
        }
    },

    setBuffering: function () {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);

        var bufferBar = videoPlayer.parentNode.getElementsByClassName('fluid_controls_buffered');

        for (var j = 0; j < bufferBar.length; j++) {
            bufferBar[j].style.width = 0;
        }


        // Buffering
        logProgress = function () {
            var duration =  videoPlayer.duration;
            if (duration > 0) {
                for (var i = 0; i < videoPlayer.buffered.length; i++) {

                    if (videoPlayer.buffered.start(videoPlayer.buffered.length - 1 - i) < videoPlayer.currentTime) {

                        var newBufferLength = (videoPlayer.buffered.end(videoPlayer.buffered.length - 1 - i) / duration) * 100 + "%";

                        for (var j = 0; j < bufferBar.length; j++) {
                            bufferBar[j].style.width = newBufferLength;
                        }

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

    createPlaybackList: function () {
        var player = this;
        var playbackRates = ['x2', 'x1.5', 'x1', 'x0.5'];

        if (player.displayOptions.layoutControls.playbackRateEnabled) {
            var sourceChangeButton = document.getElementById(player.videoPlayerId + '_fluid_control_playback_rate');

            var sourceChangeList = document.createElement('div');
            sourceChangeList.id = player.videoPlayerId + '_fluid_control_video_playback_rate';
            sourceChangeList.className = 'fluid_video_playback_rates';
            sourceChangeList.style.display = 'none';

            playbackRates.forEach(function (rate) {
                var sourceChangeDiv = document.createElement('div');
                sourceChangeDiv.className = 'fluid_video_playback_rates_item';
                sourceChangeDiv.innerText = rate;

                sourceChangeDiv.addEventListener('click', function (event) {
                    event.stopPropagation();
                    playbackRate = this.innerText.replace('x','');
                    player.setPlaybackSpeed(playbackRate);
                    player.openCloseVideoPlaybackRate();

                });
                sourceChangeList.appendChild(sourceChangeDiv);
            });

            sourceChangeButton.appendChild(sourceChangeList);
            sourceChangeButton.addEventListener('click', function () {
                player.openCloseVideoPlaybackRate();
            });

        } else {
            // No other video sources
            document.getElementById(player.videoPlayerId + '_fluid_control_playback_rate').style.display = 'none';
        }
    },

    openCloseVideoPlaybackRate: function () {
        var player = this;
        var sourceChangeList = document.getElementById(this.videoPlayerId + '_fluid_control_video_playback_rate');
        var sourceChangeListContainer = document.getElementById(this.videoPlayerId + '_fluid_control_playback_rate');

        if (player.isCurrentlyPlayingAd) {
            sourceChangeList.style.display = 'none';
            return;
        }

        if (sourceChangeList.style.display == 'none') {
            sourceChangeList.style.display = 'block';
            var mouseOut = function () {
                sourceChangeListContainer.removeEventListener('mouseleave', mouseOut);
                sourceChangeList.style.display = 'none';
            };
            sourceChangeListContainer.addEventListener('mouseleave', mouseOut);
        } else {
            sourceChangeList.style.display = 'none';
        }
    },

    createDownload: function () {
        var player = this;
        var downloadOption = document.getElementById(this.videoPlayerId + '_fluid_control_download');
        if (player.displayOptions.layoutControls.allowDownload) {
            downloadClick = document.createElement('a');
            downloadClick.id = this.videoPlayerId + '_download';
            downloadClick.onclick = function (e) {
                var linkItem = this;

                if (typeof e.stopImmediatePropagation !== 'undefined') {
                    e.stopImmediatePropagation();
                }

                setInterval(function () {
                    linkItem.download = '';
                    linkItem.href = '';
                }, 100);
            };

            downloadOption.appendChild(downloadClick);

            downloadOption.addEventListener('click', function () {
                var downloadItem = document.getElementById(player.videoPlayerId + '_download');
                downloadItem.download = player.originalSrc;
                downloadItem.href = player.originalSrc;
                downloadClick.click();
            });
        } else {
            downloadOption.style.display = 'none';
        }
    },

    theatreToggle: function () {
        if (this.isInIframe) {
            return;
        }

        // Theatre and fullscreen, it's only one or the other
        if (this.fullscreenMode) {
            this.fullscreenToggle();
        }

        // Advanced Theatre mode if specified
        if (this.displayOptions.layoutControls.theatreAdvanced) {
            var elementForTheatre = document.getElementById(this.displayOptions.layoutControls.theatreAdvanced.theatreElement);
            var theatreClassToApply = this.displayOptions.layoutControls.theatreAdvanced.classToApply;
            if (elementForTheatre != null && theatreClassToApply != null) {
                if (!this.theatreMode) {
                    elementForTheatre.classList.add(theatreClassToApply);
                } else {
                    elementForTheatre.classList.remove(theatreClassToApply);
                }
                this.theatreModeAdvanced = !this.theatreModeAdvanced;
            } else {
                console.log('[FP_ERROR] Theatre mode elements could not be found, defaulting behaviour.');
                // Default overlay behaviour
                this.defaultTheatre();
            }
        } else {
            // Default overlay behaviour
            this.defaultTheatre();
        }

        // Set correct variables
        this.theatreMode = !this.theatreMode;
        this.fluidStorage.fluidTheatre = this.theatreMode;

        // Trigger theatre event
        var videoPlayer = document.getElementById(this.videoPlayerId);
        var theatreEvent = (this.theatreMode) ? 'theatreModeOn' : 'theatreModeOff';
        var event = document.createEvent('CustomEvent');
        event.initEvent(theatreEvent, false, true);
        videoPlayer.dispatchEvent(event);

        this.resizeVpaidAuto();
        return;
    },

    defaultTheatre: function () {
        var videoWrapper = document.getElementById('fluid_video_wrapper_' + this.videoPlayerId);

        if (!this.theatreMode) {
            videoWrapper.classList.add('fluid_theatre_mode');
            var workingWidth = this.displayOptions.layoutControls.theatreSettings.width;
            var defaultHorizontalMargin = '10px';
            videoWrapper.style.width = workingWidth;
            videoWrapper.style.height = this.displayOptions.layoutControls.theatreSettings.height;
            videoWrapper.style.maxHeight = screen.height + "px";
            videoWrapper.style.marginTop = this.displayOptions.layoutControls.theatreSettings.marginTop + 'px';
            switch (this.displayOptions.layoutControls.theatreSettings.horizontalAlign) {
                case 'center':
                    // We must calculate the margin differently based on whether they passed % or px
                    if (typeof(workingWidth) == 'string' && workingWidth.substr(workingWidth.length - 1) == "%") {
                        defaultHorizontalMargin = ((100 - parseInt(workingWidth.substring(0, workingWidth.length - 1))) / 2) + "%"; // A margin of half the remaining space
                    } else if (typeof(workingWidth) == 'string' && workingWidth.substr(workingWidth.length - 2) == "px") {
                        defaultHorizontalMargin = (((screen.width - parseInt(workingWidth.substring(0, workingWidth.length - 2))) / screen.width) * 100 / 2) + "%"; // Half the (Remaining width / fullwidth)
                    } else {
                        console.log('[FP_ERROR] Theatre width specified invalid.');
                    }

                    videoWrapper.style.left = defaultHorizontalMargin;
                    break;
                case 'right':
                    videoWrapper.style.right = defaultHorizontalMargin;
                    break;
                case 'left':
                default:
                    videoWrapper.style.left = defaultHorizontalMargin;
                    break;
            }
        } else {
            videoWrapper.classList.remove('fluid_theatre_mode');
            videoWrapper.style.maxHeight = "";
            videoWrapper.style.marginTop = "";
            videoWrapper.style.left = "";
            videoWrapper.style.right = "";
            videoWrapper.style.position = "";
            if (!this.displayOptions.layoutControls.fillToContainer) {
                videoWrapper.style.width = this.originalWidth + 'px';
                videoWrapper.style.height = this.originalHeight + 'px';
            } else {
                videoWrapper.style.width = '100%';
                videoWrapper.style.height = '100%';
            }
        }
    },

    // Set the poster for the video, taken from custom params
    // Cannot use the standard video tag poster image as it can be removed by the persistent settings
    posterImage: function () {
        if (this.displayOptions.layoutControls.posterImage) {
            var containerDiv = document.createElement('div');
            containerDiv.id = this.videoPlayerId + '_fluid_pseudo_poster';
            containerDiv.className = 'fluid_pseudo_poster';

            if (['auto', 'contain', 'cover'].indexOf(this.displayOptions.layoutControls.posterImageSize) === -1) {
                console.log('[FP_ERROR] Not allowed value in posterImageSize');
                return;
            }

            containerDiv.style.background = "url('" + this.displayOptions.layoutControls.posterImage + "') center center / "
                + this.displayOptions.layoutControls.posterImageSize + " no-repeat black";
            document.getElementById(this.videoPlayerId).parentNode.insertBefore(containerDiv, null);
        }
    },

    initialiseStreamers: function () {
        this.detachStreamers();
        switch (this.displayOptions.layoutControls.mediaType) {
            case 'application/dash+xml': // MPEG-DASH
                if (!this.dashScriptLoaded) { // First time trying adding in DASH streamer, get the script
                    this.dashScriptLoaded = true;
                    fluidPlayerClass.requestScript(fluidPlayerScriptLocation + fluidPlayerClass.dashJsScript, this.initialiseDash.bind(this));
                } else {
                    this.initialiseDash();
                }
                break;
            case 'application/x-mpegURL': // HLS
                if (!this.hlsScriptLoaded && !window.Hls) { // First time trying adding in DASH streamer, get the script
                    this.hlsScriptLoaded = true;
                    fluidPlayerClass.requestScript(fluidPlayerScriptLocation + fluidPlayerClass.hlsJsScript, this.initialiseHls.bind(this));
                } else {
                    this.initialiseHls();
                }
                break;
        }
    },

    initialiseDash: function () {
        if ( typeof ( window.MediaSource || window.WebKitMediaSource ) === "function") {
            var playVideo = (!this.autoplayAfterAd) ? this.autoplayAfterAd : this.displayOptions.layoutControls.autoPlay; // If false we want to override the autoPlay, as it comes from postRoll
            var dashPlayer = dashjs.MediaPlayer().create();
            dashPlayer.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_NONE }}); // Remove default logging that clogs up the console
            dashPlayer.initialize(document.getElementById(this.videoPlayerId), this.originalSrc, playVideo);
            this.dashPlayer = dashPlayer;
        } else {
            this.nextSource();
            console.log('[FP_ERROR] Media type not supported by this browser. (application/dash+xml)');
        }
    },

    initialiseHls: function () {
        if (Hls.isSupported()) {
            var hls = new Hls(this.displayOptions.hlsjsConfig);
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

    detachStreamers: function () {
        if (this.dashPlayer) {
            this.dashPlayer.reset();
            this.dashPlayer = false;
        } else if (this.hlsPlayer) {
            this.hlsPlayer.detachMedia();
            this.hlsPlayer = false;
        }
    },

    // This is called when a media type is unsupported. we'll find the current source and try set the next source if it exists
    nextSource: function () {
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

    inIframe: function () {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    },

    setPersistentSettings: function () {
        if (typeof(Storage) !== "undefined" && typeof(localStorage) !== "undefined") {
            this.fluidStorage = localStorage;

            if (typeof(this.fluidStorage.fluidVolume) !== "undefined" && this.displayOptions.layoutControls.persistentSettings.volume) {
                this.setVolume(this.fluidStorage.fluidVolume);
                if (typeof(this.fluidStorage.fluidMute) !== "undefined" && this.fluidStorage.fluidMute == "true") {
                    this.muteToggle(this.videoPlayerId);
                }
            }

            if (typeof(this.fluidStorage.fluidQuality) !== "undefined" && this.displayOptions.layoutControls.persistentSettings.quality) {
                var sourceOption = document.getElementById('source_' + this.videoPlayerId + '_' + this.fluidStorage.fluidQuality);
                var sourceChangeButton = document.getElementById(this.videoPlayerId + '_fluid_control_video_source');
                if (sourceOption) {
                    sourceOption.click();
                    sourceChangeButton.click();
                }
            }

            if (typeof(this.fluidStorage.fluidSpeed) !== "undefined" && this.displayOptions.layoutControls.persistentSettings.speed) {
                this.setPlaybackSpeed(this.fluidStorage.fluidSpeed);
            }

            if (typeof(this.fluidStorage.fluidTheatre) !== "undefined" && this.fluidStorage.fluidTheatre == "true" && this.displayOptions.layoutControls.persistentSettings.theatre) {
                this.theatreToggle();
            }
        }
    },

    init: function (idVideoPlayer, options) {
        var player = this;
        var videoPlayer = document.getElementById(idVideoPlayer);

        videoPlayer.setAttribute('playsinline', '');
        videoPlayer.setAttribute('webkit-playsinline', '');

        player.vrROTATION_POSITION     = 0.1;
        player.vrROTATION_SPEED        = 80;
        player.vrMode                  = false;
        player.vrPanorama              = null;
        player.vrViewer                = null;
        player.vpaidTimer              = null;
        player.vpaidAdUnit             = null;
        player.vastOptions             = null;
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
        player.adGroupedByRolls        = {};
        player.onPauseRollAdPods       = [];
        player.currentOnPauseRollAd    = '';
        player.preRollAdsResolved      = false;
        player.preRollAdPods           = [];
        player.preRollAdPodsLength     = 0;
        player.preRollVastResolved     = 0;
        player.temporaryAdPods         = [];
        player.availableRolls          = ['preRoll', 'midRoll', 'postRoll', 'onPauseRoll'];
        player.supportedNonLinearAd    = ['300x250', '468x60', '728x90'];
        player.autoplayAfterAd         = true;
        player.nonLinearDuration       = 15;
        player.supportedStaticTypes    = ['image/gif', 'image/jpeg', 'image/png'];
        player.inactivityTimeout       = null;
        player.isUserActive            = null;
        player.nonLinearVerticalAlign  = 'bottom';
        player.vpaidNonLinearCloseButton = true;
        player.showTimeOnHover         = true;
        player.initialAnimationSet     = true;
        player.theatreMode             = false;
        player.theatreModeAdvanced     = false;
        player.fullscreenMode          = false;
        player.originalWidth           = videoPlayer.offsetWidth;
        player.originalHeight          = videoPlayer.offsetHeight;
        player.dashPlayer              = false;
        player.hlsPlayer               = false;
        player.dashScriptLoaded        = false;
        player.hlsScriptLoaded         = false;
        player.isPlayingMedia          = false;
        player.isSwitchingSource       = false;
        player.isLoading               = false;
        player.isInIframe              = player.inIframe();
        player.mainVideoReadyState     = false;
        player.xmlCollection           = [];
        player.inLineFound             = null;
        player.fluidStorage            = {};
        player.fluidPseudoPause        = false;
        player.mobileInfo              = fluidPlayerClass.getMobileOs();
        player.events                  = {};

        //Default options
        player.displayOptions = {
            layoutControls: {
                mediaType:                    player.getCurrentSrcType(),
                primaryColor:                 false,
                posterImage:                  false,
                posterImageSize:              'contain',
                adProgressColor:              '#f9d300',
                playButtonShowing:            true,
                playPauseAnimation:           true,
                closeButtonCaption:           'Close', // Remove?
                fillToContainer:              false,
                autoPlay:                     false,
                preload:                      'auto',
                mute:                         false,
                loop:                         null,
                keyboardControl:              true,
                allowDownload:                false,
                playbackRateEnabled:          false,
                subtitlesEnabled:             false,
                showCardBoardView:            false,
                showCardBoardJoystick:        false,
                allowTheatre:                 true,
                doubleclickFullscreen:        true,
                theatreSettings: {
                    width:                    '100%',
                    height:                   '60%',
                    marginTop:                0,
                    horizontalAlign:          'center',
                    keepPosition:             false
                },
                theatreAdvanced:              false,
                title:                        null,
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
                layout:                       'default', //options: 'default', '<custom>'
                playerInitCallback:           (function () {}),
                persistentSettings:           {
                    volume:                   true,
                    quality:                  true,
                    speed:                    true,
                    theatre:                  true
                }
            },
            vastOptions: {
                adList:                       {},
                skipButtonCaption:            'Skip ad in [seconds]',
                skipButtonClickCaption:       'Skip Ad <span class="skip_button_icon"></span>',
                adText:                       null,
                adTextPosition:               'top left',
                adCTAText:                    'Visit now!',
                adCTATextPosition:            'bottom right',
                adClickable:                  true,
                vastTimeout:                  5000,
                showProgressbarMarkers:       false,
                allowVPAID:                   false,
                showPlayButton:               false,
                maxAllowedVastTagRedirects:   3,
                vpaidTimeout              :   3000,

                vastAdvanced: {
                    vastLoadedCallback:       (function () {}),
                    noVastVideoCallback:      (function () {}),
                    vastVideoSkippedCallback: (function () {}),
                    vastVideoEndedCallback:   (function () {})
                }
            },
            hlsjsConfig: {
                p2pConfig: {
                    logLevel: false,
                },
                enableWebVTT: false,
                enableCEA708Captions: false,
            },
            captions: {
                play: 'Play',
                pause: 'Pause',
                mute: 'Mute',
                unmute: 'Unmute',
                fullscreen: 'Fullscreen',
                subtitles: 'Subtitles',
                exitFullscreen: 'Exit Fullscreen',
            },
            debug: false
        };

        // Overriding the default options
        for (var key in options) {
            if (typeof options[key] == "object") {
                for (var subKey in options[key]) {
                    player.displayOptions[key][subKey] = options[key][subKey];
                }
            } else {
                player.displayOptions[key] = options[key];
            }
        }

        player.setupPlayerWrapper();
        player.initialiseStreamers();

        videoPlayer.addEventListener('webkitfullscreenchange', player.recalculateAdDimensions, false);
        videoPlayer.addEventListener('fullscreenchange', player.recalculateAdDimensions, false);
        videoPlayer.addEventListener('waiting', player.onRecentWaiting, false);
        videoPlayer.addEventListener('pause', player.onFluidPlayerPause, false);
        videoPlayer.addEventListener('loadedmetadata', player.mainVideoReady, false);
        videoPlayer.addEventListener('durationchange', function () {player.currentVideoDuration = player.getCurrentVideoDuration();}, false);
        videoPlayer.addEventListener('error', player.onErrorDetection, false);
        videoPlayer.addEventListener('ended', player.onMainVideoEnded, false);

        if (player.displayOptions.layoutControls.showCardBoardView) {
            // This fixes cross origin errors on three.js
            videoPlayer.setAttribute('crossOrigin', 'anonymous');
        }

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

        player.initTitle();

        player.initMute();

        player.initLoop();

        player.displayOptions.layoutControls.playerInitCallback();

        player.createVideoSourceSwitch();

        player.createSubtitles();

        player.createCardboard();

        player.userActivityChecker();

        player.setVastList();

        player.setPersistentSettings();

        var _play_videoPlayer = videoPlayer.play;
        videoPlayer.play = function () {
            var videoPlayerTag = this;
            var promise = null;
            var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);

            if (player.displayOptions.layoutControls.showCardBoardView) {

                if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                    DeviceOrientationEvent.requestPermission()
                        .then(function(response) {
                            if (response === 'granted') {
                                player.debugMessage('DeviceOrientationEvent permission granted!');
                            }
                        })
                        .catch(console.error);
                }
            }

            try {

                promise = _play_videoPlayer.apply(this, arguments);

                if (promise !== undefined && promise !== null) {

                    promise.then(function () {

                        player.isPlayingMedia = true;
                        clearTimeout(player.promiseTimeout);

                    }).catch(function (error) {

                        var isAbortError = (typeof error.name !== 'undefined' && error.name === 'AbortError');
                        // Ignore abort errors which caused for example Safari or autoplay functions
                        // (example: interrupted by a new load request)
                        if (isAbortError) {
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
            if (browserVersion.browserName == 'Safari' && browserVersion.majorVersion >= 11) {
                return;
            }

            videoPlayer.play();
        }

        var videoWrapper = document.getElementById('fluid_video_wrapper_' + videoPlayer.id);
        if (!player.mobileInfo.userOs) {
            videoWrapper.addEventListener('mouseleave', player.handleMouseleave, false);
            videoWrapper.addEventListener('mouseenter', player.showControlBar, false);
            videoWrapper.addEventListener('mouseenter', player.showTitle, false);
        } else {
            //On mobile mouseleave behavior does not make sense, so it's better to keep controls, once the playback starts
            //Autohide behavior on timer is a separate functionality
            player.hideControlBar.call(videoWrapper);
            videoWrapper.addEventListener('touchstart', player.showControlBar, false);
        }

        //Keyboard Controls
        if (player.displayOptions.layoutControls.keyboardControl) {
            player.keyboardControl();
        }

        if (player.displayOptions.layoutControls.controlBar.autoHide) {
            player.linkControlBarUserActivity();
        }

        // disable showing the captions, if user added subtitles track
        // we are taking subtitles track kind as metadata

        try{
            [].forEach.call(videoPlayerTag.textTracks,function (textTrack) {
                textTrack.mode = 'hidden';
            })
        }catch(e){
        }
    },

    // "API" Functions
    play: function () {
        var videoPlayer = document.getElementById(this.videoPlayerId);
        if (videoPlayer.paused) {
            this.playPauseToggle(videoPlayer);
        }
        return true;
    },

    pause: function () {
        var videoPlayer = document.getElementById(this.videoPlayerId);
        if (!videoPlayer.paused) {
            this.playPauseToggle(videoPlayer);
        }
        return true;
    },

    skipTo: function (time) {
        var videoPlayer = document.getElementById(this.videoPlayerId);
        videoPlayer.currentTime = time;
    },

    setPlaybackSpeed: function (speed) {
        if (!this.isCurrentlyPlayingAd) {
            var videoPlayer = document.getElementById(this.videoPlayerId);
            videoPlayer.playbackRate = speed;
            this.fluidStorage.fluidSpeed = speed;
        }
    },

    setVolume: function (passedVolume) {
        var videoPlayer = document.getElementById(this.videoPlayerId);
        videoPlayer.volume = passedVolume;
        this.latestVolume = passedVolume;
        this.fluidStorage.fluidVolume = passedVolume;
    },

    isCurrentlyPlayingVideo: function (instance) {
        return instance && instance.currentTime > 0 && !instance.paused && !instance.ended && instance.readyState > 2;
    },

    setHtmlOnPauseBlock: function (passedHtml) {
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
            containerDiv.onclick = function () {
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

    toggleControlBar: function (show) {
        var controlBar = document.getElementById(this.videoPlayerId + "_fluid_controls_container");

        if (show) {
            controlBar.className += " initial_controls_show";
        } else {
            controlBar.className = controlBar.className.replace(" initial_controls_show", "");
        }
    },

    toggleFullscreen: function (fullscreen) {
        if (this.fullscreenMode != fullscreen) {

            // If we're turning fullscreen on and we're in theatre mode, remove theatre
            if (fullscreen && this.theatreMode) {
                this.theatreToggle();
            }

            this.fullscreenToggle();
        }
    },

    on: function (eventCall, functionCall) {
        var videoPlayer = document.getElementById(this.videoPlayerId);
        var player = this;
        switch(eventCall) {
            case 'play':
                videoPlayer.onplay = functionCall;
                break;
            case 'seeked':
                videoPlayer.onseeked = functionCall;
                break;
            case 'ended':
                videoPlayer.onended = functionCall;
                break;
            case 'pause':
                videoPlayer.addEventListener('pause', function () {
                    if (!player.fluidPseudoPause) {
                        functionCall();
                    }
                });
                break;
            case 'playing':
                videoPlayer.addEventListener('playing', function () {
                        functionCall();
                });
                break;
            case 'theatreModeOn':
                videoPlayer.addEventListener('theatreModeOn', function () {
                    functionCall();
                });
                break;
            case 'theatreModeOff':
                videoPlayer.addEventListener('theatreModeOff', function () {
                    functionCall();
                });
                break;
            default:
                console.log('[FP_ERROR] Event not recognised');
                break;
        }
    },

    toggleLogo: function (logo) {
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
    },

    // this functions helps in adding event listeners for future dynamic elements
    //trackEvent(document, "click", ".some_elem", callBackFunction);
    trackEvent: function (el, evt, sel, handler) {
        var player = this;

        if (typeof player.events[sel] === 'undefined') {
            player.events[sel] = {};
        }
        if (typeof player.events[sel][evt] === 'undefined') {
            player.events[sel][evt] = [];
        }
        player.events[sel][evt].push(handler);

        player.registerListener(el, evt, sel, handler);
    },

    registerListener: function(el, evt, sel, handler) {
        var currentElements = el.querySelectorAll(sel);
        for (var i = 0; i < currentElements.length; i++) {
            currentElements[i].addEventListener(evt, handler);
        }
    },

    copyEvents: function (topLevelEl) {
        var player = this;

        for (var sel in player.events) {
            if (!player.events.hasOwnProperty(sel)) {
                continue;
            }

            for (var evt in player.events[sel]) {
                if (!player.events[sel].hasOwnProperty(evt)) {
                    continue;
                }

                for (var i = 0; i < player.events[sel][evt].length; i++) {
                    player.registerListener(topLevelEl, evt, sel, player.events[sel][evt][i]);
                }
            }
        }
    },

    destroy: function () {
        var numDestructors = this.destructors.length;

        if (0 === numDestructors) {
            return;
        }

        for (var i = 0; i < numDestructors; ++i) {
            this.destructors[i].bind(this)();
        }

        var container = document.getElementById('fluid_video_wrapper_' + player.videoPlayerId);

        if (!container) {
            console.warn('Unable to remove wrapper element for Fluid Player instance - element not found ' + player.videoPlayerId);
            return;
        }

        if ('function' === typeof container.remove) {
            container.remove();
            return;
        }

        if (container.parentNode) {
            container.parentNode.removeChild(container);
            return;
        }

        console.error('Unable to remove wrapper element for Fluid Player instance - no parent' + player.videoPlayerId);
    }
};
