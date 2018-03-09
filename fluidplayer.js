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
    vttParserScript: 'https://cdn.fluidplayer.com/current/scripts/webvtt.js',
    instances: [],
    notCloned: ['notCloned', 'vttParserScript', 'instances', 'getInstanceById',
        'requestStylesheet', 'reqiestScript', 'isTouchDevice', 'vastOptions',
        'displayOptions', 'getEventOffsetX', 'getEventOffsetY', 'getTranslateX',
        'toggleElementText', 'getMobileOs', 'findClosestParent', 'activeVideoPlayerId',
        'getInstanceIdByWrapperId', 'timer', 'timerPool', 'adList', 'adPool',
        'isUserActive', 'isCurrentlyPlayingAd', 'initialAnimationSet'],
    version: '2.0',
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

            if (clickThroughs.length) {//There should be exactly 1 node
                return clickThroughs[0].childNodes[0].nodeValue;
            }
        }

        return false;
    },


    getClickThroughUrlFromNonLinear: function (nonLinear) {
        var result = '';
        var nonLinears = nonLinear.getElementsByTagName('NonLinear');

        if (nonLinears.length) {//There should be exactly 1 node
            var nonLinearClickThrough = nonLinear.getElementsByTagName('NonLinearClickThrough');
            if (nonLinearClickThrough.length) {//There should be exactly 1 node
                result = nonLinearClickThrough[0].childNodes[0].nodeValue;
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

        if (duration.length && (typeof duration[0].childNodes[0] !== 'undefined')) {//There should be exactly 1 Duration node and it should have a value
            return this.convertTimeStringToSeconds(duration[0].childNodes[0].nodeValue);
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

    getMediaFileFromLinear: function(linear) {
        var fallbackMediaFile;
        var mediaFiles = this.getMediaFilesFromLinear(linear);

        for (var i = 0; i < mediaFiles.length; i++) {
            if (!mediaFiles[i].getAttribute('type')) {
                fallbackMediaFile = mediaFiles[i].childNodes[0].nodeValue;
            }

            if (mediaFiles[i].getAttribute('type') === this.displayOptions.layoutControls.mediaType) {
                return mediaFiles[i].childNodes[0].nodeValue;
            }
        }

        return fallbackMediaFile;
    },

    getStaticResourceFromNonLinear: function(linear) {
        var fallbackStaticResource;
        var staticResources = this.getStaticResourcesFromNonLinear(linear);

        for (var i = 0; i < staticResources.length; i++) {
            if (!staticResources[i].getAttribute('type')) {
                fallbackStaticResource = staticResources[i].childNodes[0].nodeValue;
            }

            if (staticResources[i].getAttribute('type') === this.displayOptions.staticResource) {
                return staticResources[i].childNodes[0].nodeValue;
            }
        }

        return fallbackStaticResource;
    },

    registerTrackingEvents: function(creativeLinear, tmpOptions) {
        trackingEvents = this.getTrackingFromLinear(creativeLinear);
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
            tmpOptions.impression = [];

            for (var i = 0; i < impressionTags.length; i++) {
                tmpOptions.impression.push(impressionTags[i].childNodes[0].nodeValue);
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
                    result.push(clickTracking[i].childNodes[0].nodeValue);
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
            if (clickTracking.length) {//There should be exactly 1 node
                result = clickTracking[0].childNodes[0].nodeValue;
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
            idVideoPlayer = this.videoPlayerId;
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
                player.parseVastTag(player.adList[adListId].vastTag, adListId);
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
        } else{
            player.announceError(errorCode);
        }

        player.switchToMainVideo();
    },

    switchPlayerToVastMode: function() {},

    /**
     * Parse the VAST Tag
     *
     * @param vastTag
     * @param adListId
     */
    parseVastTag: function(vastTag, adListId) {
        var player = this;

        var tmpOptions = {
            vastTagUrl:   vastTag,
            tracking:     [],
            stopTracking: [],
            vastLoaded: false

        };

        player.sendRequest(
            vastTag,
            true,
            player.displayOptions.vastOptions.vastTimeout,
            function() {
                var xmlHttpReq = this;

                if ((xmlHttpReq.readyState === 4) && (xmlHttpReq.status !== 200)) {

                    //Set the error flag for the Ad
                    player.adList[adListId].error = true;

                    //The response returned an error. Proceeding with the main video.
                    player.playMainVideoWhenVastFails(900);
                    return;
                }

                if (!((xmlHttpReq.readyState === 4) && (xmlHttpReq.status === 200))) {
                    return;
                }

                var xmlResponse = xmlHttpReq.responseXML;

                //Get impression tag
                var impression = xmlResponse.getElementsByTagName('Impression');
                if(impression !== null) {
                    player.registerImpressionEvents(impression, tmpOptions);
                }

                //Get the error tag, if any
                var errorTags = xmlResponse.getElementsByTagName('Error');
                if (errorTags !== null) {
                    player.registerErrorEvents(errorTags, tmpOptions);
                }

                //Set initial values
                tmpOptions.skipoffset = false;
                tmpOptions.adFinished = false;
                tmpOptions.vastTagUrl = vastTag;

                //Get Creative
                var creative = xmlResponse.getElementsByTagName('Creative');

                //Currently only 1 creative and 1 linear is supported
                if ((typeof creative !== 'undefined') && creative.length) {
                    var arrayCreativeLinears = creative[0].getElementsByTagName('Linear');

                    if ((typeof arrayCreativeLinears !== 'undefined') && (arrayCreativeLinears !== null) && arrayCreativeLinears.length) {
                        var creativeLinear = arrayCreativeLinears[0];

                        tmpOptions.adType = 'linear';

                        //Extract the necessary data from the Linear node
                        tmpOptions.skipoffset      = player.convertTimeStringToSeconds(creativeLinear.getAttribute('skipoffset'));
                        tmpOptions.clickthroughUrl = player.getClickThroughUrlFromLinear(creativeLinear);
                        tmpOptions.clicktracking   = player.getClickTrackingEvents(creativeLinear);
                        tmpOptions.duration        = player.getDurationFromLinear(creativeLinear);
                        tmpOptions.mediaFile       = player.getMediaFileFromLinear(creativeLinear);

                        player.registerTrackingEvents(creativeLinear, tmpOptions);
                    }

                    var arrayCreativeNonLinears = creative[0].getElementsByTagName('NonLinearAds');

                    if ((typeof arrayCreativeNonLinears !== 'undefined') && (arrayCreativeNonLinears !== null) && arrayCreativeNonLinears.length) {
                        var creativeNonLinear = arrayCreativeNonLinears[0];

                        tmpOptions.adType = 'nonLinear';

                        //Extract the necessary data from the Linear node
                        tmpOptions.clickthroughUrl = player.getClickThroughUrlFromNonLinear(creativeNonLinear);
                        tmpOptions.clicktracking   = player.getNonLinearClickTrackingEvents(creativeNonLinear);
                        tmpOptions.duration        = player.getDurationFromNonLinear(creativeNonLinear);
                        tmpOptions.dimension       = player.getDimensionFromNonLinear(creativeNonLinear);
                        tmpOptions.staticResource  = player.getStaticResourceFromNonLinear(creativeNonLinear);
                        tmpOptions.creativeType    = player.getCreativeTypeFromStaticResources(creativeNonLinear);

                        player.registerTrackingEvents(creativeNonLinear, tmpOptions);
                    }

                    player.adList[adListId].adType = tmpOptions.adType? tmpOptions.adType : 'unknown';

                    if (typeof tmpOptions.mediaFile !== 'undefined' || typeof tmpOptions.staticResource !== 'undefined') {

                        player.adList[adListId].vastLoaded = true;
                        player.displayOptions.vastOptions.vastAdvanced.vastLoadedCallback();
                        player.adPool[adListId] = Object.assign({}, tmpOptions);
                        var event = document.createEvent('Event');
                        event.initEvent('adId_' + adListId, false, true);
                        document.getElementById(player.videoPlayerId).dispatchEvent(event);
                        return;
                    } else {
                        //announceError the main video
                        player.adList[adListId].error = true;
                        player.playMainVideoWhenVastFails(101);
                        return;
                    }
                } else {
                    //announceError the main video
                    player.adList[adListId].error = true;
                    player.playMainVideoWhenVastFails(101);
                    return;
                }
                player.displayOptions.vastOptions.vastAdvanced.vastLoadedCallback();
            }
        );
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
                videoPlayerTag.autoplayAfterAd = false;
                videoPlayerTag.currentTime = player.mainVideoDuration;
                break;
        }


        var playVideoPlayer = function() {
            player.switchPlayerToVastMode = function() {
                //Get the actual duration from the video file if it is not present in the VAST XML
                if (!player.vastOptions.duration) {
                    player.vastOptions.duration = videoPlayerTag.duration;
                }

                player.addClickthroughLayer(player.videoPlayerId);
                if (player.vastOptions.skipoffset !== false) {
                    player.addSkipButton();
                }

                player.addCTAButton();

                player.addAdCountdown();

                videoPlayerTag.removeAttribute('controls'); //Remove the default Controls

                if (player.displayOptions.layoutControls.layout!== 'browser') {
                    var progressbarContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');

                    if (progressbarContainer !== null) {
                        document.getElementById(player.videoPlayerId + '_vast_control_currentprogress').style.backgroundColor = player.displayOptions.layoutControls.adProgressColor;
                    }
                }

                if (player.displayOptions.vastOptions.adText) {
                    player.addAdPlayingText(player.displayOptions.vastOptions.adText);
                }

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

            //Load the PreRoll ad
            videoPlayerTag.src = player.vastOptions.mediaFile;
            player.isCurrentlyPlayingAd = true;
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
            player.scheduleTrackingEvent(currentTime, player.vastOptions.duration);

            if (currentTime >= (player.vastOptions.duration - 1 )) {
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
        player.initialStart = true;
        adListId = event.type.replace('adId_', '');

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


    midRoll: function (event) {
        var player = fluidPlayerClass.getInstanceById(this.id);
        var videoPlayerTag = document.getElementById(this.getAttribute('id'));
        videoPlayerTag.removeEventListener(event.type, player.midRoll); //todo pass id?!

        adListId = event.type.replace('adId_', '');
        if(player.adList[adListId].played === true){
            return;
        }

        var time = player.adList[adListId].timer;

        if(typeof time == 'string' && time.indexOf("%") !== -1) {
            time = time.replace('%', '');
            time = Math.floor(player.mainVideoDuration / 100 * time);
        }

        player.scheduleTask({time: time, playRoll: 'midRoll', adListId: adListId});
    },


    postRoll: function (event) {
        var player = fluidPlayerClass.getInstanceById(this.id);
        var videoPlayerTag = document.getElementById(this.getAttribute('id'));
        videoPlayerTag.removeEventListener(event.type, player.postRoll);
        adListId = event.type.replace('adId_', '');
        player.scheduleTask({time: Math.floor(player.mainVideoDuration), playRoll: 'postRoll', adListId: adListId});
    },


    onPauseRoll: function (event) {
        var player = fluidPlayerClass.getInstanceById(this.id);
        var videoPlayerTag = document.getElementById(this.getAttribute('id'));
        videoPlayerTag.removeEventListener(event.type, player.onPauseRoll);
        adListId = event.type.replace('adId_', '');

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
                if(time != keyTime) {
                    break
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

        videoPlayerTag.load();

        player.setBuffering();

        if (typeof videoPlayerTag.mainVideoCurrentTime !== 'undefined') {
            videoPlayerTag.currentTime = videoPlayerTag.mainVideoCurrentTime;
        } else {
            videoPlayerTag.currentTime = 0;
        }

        videoPlayerTag.play();

        if (player.autoplayAfterAd == false) {
            videoPlayerTag.pause();
        }

        player.isCurrentlyPlayingAd = false;

        player.removeClickthrough();
        player.removeSkipButton();
        player.removeAdCountdown();
        player.removeAdPlayingText();
        player.removeCTAButton();
        player.adFinished = true;
        player.displayOptions.vastOptions.vastAdvanced.vastVideoEndedCallback();
        player.vastOptions = null;

        if (player.displayOptions.layoutControls.layout!== 'browser') {
            var progressbarContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');

            if (progressbarContainer !== null) {
                backgroundColor = (player.displayOptions.layoutControls.primaryColor) ? player.displayOptions.layoutControls.primaryColor : "white";
                document.getElementById(player.videoPlayerId + '_vast_control_currentprogress').style.backgroundColor = backgroundColor;
            }
        }

        videoPlayerTag.removeEventListener('ended', player.onVastAdEnded);
        videoPlayerTag.addEventListener('ended', player.onMainVideoEnded);

        if (player.displayOptions.layoutControls.layout=== 'browser') {
            videoPlayerTag.setAttribute('controls', 'controls');
        }
    },

    onVastAdEnded: function() {
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        fluidPlayerClass.getInstanceById(this.id).switchToMainVideo();
        fluidPlayerClass.getInstanceById(this.id).vastOptions = null;
        fluidPlayerClass.getInstanceById(this.id).adFinished = true;
    },

    onMainVideoEnded: function () {
        var player = fluidPlayerClass.getInstanceById(this.id);

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
        var adCountdown = player.pad(parseInt(player.currentVideoDuration / 60)) + ':' + player.pad(parseInt(player.currentVideoDuration % 60));
        var durationText = parseInt(adCountdown);
        divAdCountdown.id = 'ad_countdown' + this.videoPlayerId;
        divAdCountdown.className = 'ad_countdown';
        divAdCountdown.innerHTML = "Ad - " + durationText;

        if (!this.isUserActive) {
            divAdCountdown.style.display = 'inline-block';
        }

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
        btn = document.getElementById('ad_countdown' + this.videoPlayerId);
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    },

    toggleAdCountdown: function(showing) {
        btn = document.getElementById('ad_countdown' + this.videoPlayerId);
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

    removeAdPlayingText: function() {
        var div = document.getElementById(this.videoPlayerId + '_fluid_ad_playing');
        if (div) {
            div.parentElement.removeChild(div);
        }
    },

    addCTAButton: function() {
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
        link.innerText = this.displayOptions.vastOptions.adCTAText;
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

    checkShouldDisplayVolumeControls: function() {
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
            '</div>' +
            '<div class="fluid_controls_right">' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_fullscreen" class="fluid_button fluid_button_fullscreen"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_video_source" class="fluid_button fluid_button_video_source"></div>' +
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

        var initialPlay = document.getElementById(videoPlayerId + '_fluid_initial_play');
        if (initialPlay) {
            document.getElementById(videoPlayerId + '_fluid_initial_play').style.display = "none";
            document.getElementById(videoPlayerId + '_fluid_initial_play_button').style.opacity = "1";
        }

        if (isPlaying) {
            if (!player.isCurrentlyPlayingAd && player.displayOptions.layoutControls.playPauseAnimation) {
                player.playPauseAnimationToggle(true, videoPlayerId);
            }

            playPauseButton.className = playPauseButton.className.replace(/\bfluid_button_play\b/g, 'fluid_button_pause');
            controlsDisplay.classList.remove('initial_controls_show');

            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = 'Pause';
            }

        } else {
            if (!player.isCurrentlyPlayingAd && player.displayOptions.layoutControls.playPauseAnimation) {
                player.playPauseAnimationToggle(false, videoPlayerId);
            }

            playPauseButton.className = playPauseButton.className.replace(/\bfluid_button_pause\b/g, 'fluid_button_play');
            controlsDisplay.classList.add('initial_controls_show');

            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = 'Play';
            }
        }
    },

    playPauseAnimationToggle: function(play, videoPlayerId) {
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

        if (videoPlayerTag.volume) {
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

        if (videoPlayerTag.volume) {
            videoPlayerTag.volume = 0;

        } else {
            videoPlayerTag.volume = player.latestVolume;
        }
    },

    checkFullscreenSupport: function(videoPlayerId) {
        var videoPlayerTag = document.getElementById(videoPlayerId);

        if (videoPlayerTag.mozRequestFullScreen) {
            return {goFullscreen: 'mozRequestFullScreen', exitFullscreen: 'mozCancelFullScreen', isFullscreen: 'mozFullScreenElement'};

        } else if (videoPlayerTag.webkitRequestFullscreen) {
            return {goFullscreen: 'webkitRequestFullscreen', exitFullscreen: 'webkitExitFullscreen', isFullscreen: 'webkitFullscreenElement'};

        } else if (videoPlayerTag.msRequestFullscreen) {
            return {goFullscreen: 'msRequestFullscreen', exitFullscreen: 'msExitFullscreen', isFullscreen: 'msFullscreenElement'};

        } else if (videoPlayerTag.requestFullscreen) {
            return {goFullscreen: 'requestFullscreen', exitFullscreen: 'exitFullscreen', isFullscreen: 'fullscreenElement'};
        }

        return false;
    },

    fullscreenOff: function (fullscreenButton, menuOptionFullscreen) {
        fullscreenButton.className = fullscreenButton.className.replace(/\bfluid_button_fullscreen_exit\b/g, 'fluid_button_fullscreen');
        if (menuOptionFullscreen !== null) {
            menuOptionFullscreen.innerHTML = 'Fullscreen';
        }
    },

    fullscreenOn: function (fullscreenButton, menuOptionFullscreen) {
        fullscreenButton.className = fullscreenButton.className.replace(/\bfluid_button_fullscreen\b/g, 'fluid_button_fullscreen_exit');
        if (menuOptionFullscreen !== null) {
            menuOptionFullscreen.innerHTML = 'Exit Fullscreen';
        }
    },

    fullscreenToggle: function(videoPlayerId) {
        fluidPlayerClass.activeVideoPlayerId = videoPlayerId;

        var fullscreenTag = document.getElementById('fluid_video_wrapper_' + videoPlayerId);
        var requestFullscreenFunctionNames = this.checkFullscreenSupport('fluid_video_wrapper_' + videoPlayerId);
        var fullscreenButton = document.getElementById(videoPlayerId + '_fluid_control_fullscreen');
        var menuOptionFullscreen = document.getElementById(videoPlayerId + 'context_option_fullscreen');

        if (requestFullscreenFunctionNames) {
            var functionNameToExecute = '';

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

        this.recalculateAdDimensions();
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
                videoPlayerTag.play();
            }
            // Waut till video played then reenable the animations
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

                } else if (newVolume > 0.95) {
                    newVolume = 1;
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
        ids = [];
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
                    videoPlayerInstance.fullscreenToggle(videoInstanceId);
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

        if (videoPlayerInstance.isCurrentlyPlayingAd) {
            videoPlayerInstance.toggleAdCountdown(true);
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
            initialControlsDisplay.classList.remove('initial_controls_show');
        }

        if (!player.initialStart) {
            player.playPauseToggle(videoPlayerTag);

            videoPlayerTag.removeEventListener('play', player.initialPlay);
        }
    },

    playPauseToggle: function(videoPlayerTag) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);
        var initialStartJustSet = false;

        preRolls = player.findRoll('preRoll');
        if (player.initialStart || preRolls.length == 0) {

            if (!(player.initialStart || preRolls.length > 0)) {
                player.initialStart = true;
                initialStartJustSet = true;
                player.displayOptions.vastOptions.vastAdvanced.noVastVideoCallback();
            }

            if (player.displayOptions.layoutControls.layout !== 'browser') { //The original player play/pause toggling is managed by the browser
                if (videoPlayerTag.paused) {
                    videoPlayerTag.play();
                } else if (!initialStartJustSet) {
                    videoPlayerTag.pause();
                }
            }

            player.initHtmlOnPauseBlock();

            player.toggleOnPauseAd();

        } else {
            //Workaround for Chrome Mobile - otherwise it blocks the subsequent
            //play() command, because it considers it not being triggered by the user.
            var ua = window.navigator.userAgent;
            var isMobileChecks = fluidPlayerClass.getMobileOs();
            if ((isMobileChecks.userOs !== false || isMobileChecks.device !== false) && (!!window.chrome || -1 !== ua.indexOf("crios") || 0 === window.navigator.vendor.indexOf("Google") && -1 !== ua.indexOf("chrome"))) {
                videoPlayerTag.src = fluidPlayerScriptLocation + 'blank.mp4';
                videoPlayerTag.play();
            }

            player.initialStart = true;

            //trigger the loading of the VAST Tag
            player.prepareVast('preRoll');
        }

        player.prepareVast('onPauseRoll');
        player.prepareVast('postRoll');
        player.prepareVast('midRoll');

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

            if (!player.initialStart) {
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
            player.fullscreenToggle(player.videoPlayerId);
        });
    },

    // Create the timeline preview only if the vtt previews aren't enabled
    createTimelinePreview: function() {
        var player = this;
        videoPlayer = document.getElementById(player.videoPlayerId);

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

        // Set up hover for timeline preview display
        document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container').addEventListener('mousemove', function(event) {
            var progressContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');
            var totalWidth = progressContainer.clientWidth;
            timeThing = document.getElementById(player.videoPlayerId + '_fluid_timeline_preview');
            var hoverQ = fluidPlayerClass.getEventOffsetX(event, progressContainer);

            hoverSecondQ = player.currentVideoDuration * hoverQ / totalWidth;
            showad = player.pad(parseInt(hoverSecondQ / 60)) + ':' + player.pad(parseInt(hoverSecondQ % 60));
            timeThing.innerText = showad;

            timeThing.style.display = 'block';
            timeThing.style.left = (hoverSecondQ / videoPlayer.duration * 100) + "%";

        }, false);

        // Hide timeline preview on mouseout
        document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container').addEventListener('mouseout', function() {
            timeThing = document.getElementById(player.videoPlayerId + '_fluid_timeline_preview');
            timeThing.style.display = 'none';
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
            player.fullscreenToggle(player.videoPlayerId);
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

        var classForDisablingVolumeControls = '';
        if (!player.checkShouldDisplayVolumeControls()) {
            classForDisablingVolumeControls = ' no_volume_controls';
        }

        var divVastControls = document.createElement('div');
        divVastControls.id = player.videoPlayerId + '_fluid_controls_container';
        divVastControls.className = 'fluid_controls_container' + classForDisablingVolumeControls;
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

        if (player.checkShouldDisplayVolumeControls()) {
            var initiateVolumebarTimerId = setInterval(initiateVolumebar, 100);
        }

        player.setCustomControls();

        player.setupThumbnailPreview();

        player.createTimelinePreview();

        player.initPlayButton();
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

    forceLayoutIfNeeded: function() {
        var userAgent = window.navigator.userAgent;

        //Force "browser" mode for Mobile Safari on iPhone
        if (userAgent.match(/iPhone/i) && userAgent.match(/WebKit/i) && !userAgent.match(/CriOS/i)) {
            this.displayOptions.layoutControls.layout = 'browser';
        }
    },

    setLayout: function() {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        player.forceLayoutIfNeeded();

        //Mobile Safari - because it does not emit a click event on initial click of the video
        videoPlayerTag.addEventListener('play', player.initialPlay, false);

        //All other browsers
        document.getElementById(this.videoPlayerId).addEventListener('click', function() {
            player.playPauseToggle(videoPlayerTag);
        }, false);

        switch (this.displayOptions.layoutControls.layout) {
            case 'browser':
                //Nothing special to do here at this point.
                break;

            default:
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

                        if (
                            (tempThumbnailData.length === 2) &&
                            (tempThumbnailData[1].indexOf('xywh=') === 0)
                        ) {
                            tempThumbnailCoordinates = tempThumbnailData[1].substring(5);
                            tempThumbnailCoordinates = tempThumbnailCoordinates.split(',');

                            if (tempThumbnailCoordinates.length === 4) {
                                result.push({
                                    startTime: vttRawData.cues[i].startTime,
                                    endTime: vttRawData.cues[i].endTime,
                                    image: (player.displayOptions.layoutControls.timelinePreview.sprite ? player.displayOptions.layoutControls.timelinePreview.sprite : tempThumbnailData[0]),
                                    x: parseInt(tempThumbnailCoordinates[0]),
                                    y: parseInt(tempThumbnailCoordinates[1]),
                                    w: parseInt(tempThumbnailCoordinates[2]),
                                    h: parseInt(tempThumbnailCoordinates[3])
                                });
                            }
                        }
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
                        fluidPlayerClass.vttParserScript,
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


            player.videoSources.forEach(function(source) {
                var sourceChangeDiv = document.createElement('div');
                sourceChangeDiv.className = 'fluid_video_source_list_item';
                sourceChangeDiv.innerText = source.title;

                sourceChangeDiv.addEventListener('click', function(event) {
                    event.stopPropagation();
                    var videoChangedTo = this;

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
            }
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
            var play = false;
            if (!videoPlayerTag.paused) {
                player.playPauseToggle(videoPlayerTag);
                var play = true;
            }

            var currentTime = videoPlayerTag.currentTime;
            var videoSwitchedEvent = function() {
                //after new video is loaded setting time from what it should start play
                videoPlayerTag.removeEventListener('loadedmetadata', videoSwitchedEvent);
                videoPlayerTag.currentTime = currentTime;
                if (play) {
                    player.playPauseToggle(videoPlayerTag);
                }
            }
            videoPlayerTag.addEventListener('loadedmetadata', videoSwitchedEvent);
            videoPlayerTag.src = url;
            player.originalSrc = url;
        }
    },

    initLogo: function() {
        var player = this;
        var videoPlayer = document.getElementById(player.videoPlayerId);
        if (!player.displayOptions.layoutControls.logo.imageUrl) {
            return;
        }

        var logoImage = document.createElement('img');
        logoImage.src = player.displayOptions.layoutControls.logo.imageUrl;
        logoImage.style.position = 'absolute';
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
        } else {
            logoImage.style.pointerEvents = 'none';
        }

        videoPlayer.parentNode.insertBefore(logoImage, null);
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
        }

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

        if(player.mainVideoDuration == 0) {
            player.mainVideoDuration = videoPlayerTag.duration;
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

    hideControlBar: function () {
        var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(this.getAttribute('id'));
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
        var videoPlayerTag = document.getElementById(videoInstanceId);

        if (videoPlayerInstance.isCurrentlyPlayingAd) {
            videoPlayerInstance.toggleAdCountdown(true);
        }

        if (videoPlayerInstance.hasControlBar()) {
            var divVastControls = document.getElementById(videoPlayerInstance.videoPlayerId + '_fluid_controls_container');

            if (videoPlayerInstance.displayOptions.layoutControls.controlBar.animated) {
                videoPlayerInstance.fadeOut(divVastControls);
            } else {
                divVastControls.style.display = 'none';
            }

        }

        videoPlayerTag.style.cursor = 'none';
    },

    showControlBar: function () {
        var videoInstanceId = fluidPlayerClass.getInstanceIdByWrapperId(this.getAttribute('id'));
        var videoPlayerInstance = fluidPlayerClass.getInstanceById(videoInstanceId);
        var videoPlayerTag = document.getElementById(videoInstanceId);

        if (videoPlayerInstance.isCurrentlyPlayingAd) {
            videoPlayerInstance.toggleAdCountdown(false);
        }

        if (videoPlayerInstance.hasControlBar()) {
            var divVastControls = document.getElementById(videoPlayerInstance.videoPlayerId + '_fluid_controls_container');

            if (videoPlayerInstance.displayOptions.layoutControls.controlBar.animated) {
                videoPlayerInstance.fadeIn(divVastControls);
            } else {
                divVastControls.style.display = 'block';
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
                clearInterval(timer);
            }
            element.style.opacity = opacity;
            opacity -= 0.1;
        }, 50);
    },

    fadeIn: function (element) {
        var opacity = 0.1;
        var timer = setInterval(function () {
            if (opacity >= 1) {
                clearInterval(timer);
            } else {
                element.style.opacity = opacity;
                opacity += 0.1;
            }
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
        player = this;
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

    init: function(idVideoPlayer, options) {
        var player = this;
        var videoPlayer = document.getElementById(idVideoPlayer);

        player.vastOptions = {
            vastTagUrl:   '',
            tracking:     [],
            stopTracking: []
        };

        player.videoPlayerId           = idVideoPlayer;
        player.originalSrc             = player.getCurrentSrc();
        player.isCurrentlyPlayingAd    = false;
        player.isCurrentlyPlayingVideo = false;
        player.recentWaiting           = false;
        player.latestVolume            = 1;
        player.currentVideoDuration    = 0;
        player.initialStart            = false;
        player.suppressClickthrough    = false;
        player.timelinePreviewData     = [];
        player.mainVideoCurrentTime    = 0;
        player.mainVideoDuration       = 0;
        player.isTimer                 = false;
        player.timer                   = null;
        player.timerPool               = {};
        player.adList                  = {};
        player.adPool                  = {};
        player.availableRolls          = ['preRoll', 'midRoll', 'postRoll'];
        player.supportedNonLinearAd    = ['300x250', '468x60', '728x90'];
        player.autoplayAfterAd         = true;
        player.nonLinearDuration       = 15;
        player.supportedStaticTypes    = ['image/gif', 'image/jpeg', 'image/png'];
        player.inactivityTimeout       = null;
        player.isUserActive            = null;
        player.nonLinearVerticalAlign  = 'bottom';
        player.showTimeOnHover         = true;
        player.initialAnimationSet     = true;

        //Default options
        player.displayOptions = {
            layoutControls: {
                mediaType:                    'video/mp4',//TODO: should be taken from the VAST Tag; consider removing it completely, since the supported format is browser-dependent
                primaryColor:                 false,
                adProgressColor:              '#f9d300',
                playButtonShowing:            true,
                playPauseAnimation:           true,
                closeButtonCaption:           'Close', // Remove?
                fillToContainer:              false,
                autoPlay:                     false,
                mute:                         false,
                keyboardControl:              true,
                logo: {
                    imageUrl:                 null,
                    position:                 'top left',
                    clickUrl:                 null,
                    opacity:                  1
                },
                controlBar: {
                    autoHide:                 false,
                    autoHideTimeout:          3,
                    animated:                 true
                },
                timelinePreview:              {},
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
                skipButtonClickCaption:       'Skip ad <span class="skip_button_icon"></span>',
                adText:                       null,
                adCTAText:                    null, //Remove
                vastTimeout:                  5000,

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
                    if(typeof options[key][subKey] == "object") {
                        for (var subKiev in options[key][subKey]) {
                            player.displayOptions[key][subKey][subKiev] = options[key][subKey][subKiev];
                        }
                    } else {
                        player.displayOptions[key][subKey] = options[key][subKey];
                    }
                }
            } else {
                player.displayOptions[key] = options[key];
            }

        }

        player.setupPlayerWrapper();

        videoPlayer.addEventListener('webkitfullscreenchange', player.recalculateAdDimensions, false);
        videoPlayer.addEventListener('fullscreenchange', player.recalculateAdDimensions, false);
        videoPlayer.addEventListener('waiting', player.onRecentWaiting, false);
        videoPlayer.addEventListener('pause', player.onFluidPlayerPause, false);
        videoPlayer.addEventListener('loadeddata', player.mainVideoReady, false);
        videoPlayer.addEventListener('durationchange', function() {player.currentVideoDuration = player.getCurrentVideoDuration();}, false);
        videoPlayer.addEventListener('error', player.onErrorDetection, false);

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

        if (player.displayOptions.layoutControls.autoPlay) {
            videoPlayer.play();
        }

        //Keyboard Controls
        if (player.displayOptions.layoutControls.keyboardControl) {
            player.keyboardControl();
        }

        if (player.displayOptions.layoutControls.controlBar.autoHide) {
            player.linkControlBarUserActivity();
        }
    }
};