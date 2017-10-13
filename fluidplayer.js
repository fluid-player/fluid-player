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

fluidPlayer = function(idVideoPlayer, vastTag, options) {
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

    copy.init(idVideoPlayer, vastTag, options);

    return copy;
};

var fluidPlayerClass = {
    vttParserScript: 'webvtt.js',
    instances: [],
    notCloned: ['notCloned', 'vttParserScript', 'instances', 'getInstanceById',
        'requestStylesheet', 'reqiestScript', 'isTouchDevice', 'vastOptions',
        'displayOptions', 'getEventOffsetX', 'getEventOffsetY', 'getTranslateX',
        'toggleElementText', 'getMobileOs', 'findClosestParent'],
    version: '1.1.3',
    homepage: 'https://www.fluidplayer.com/',

    getInstanceById: function(playerId) {
        for (var i = 0; i < this.instances.length; i++) {
            if (this.instances[i].videoPlayerId === playerId) {
                return this.instances[i];
            }
        }
        
        return null;
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

    getMediaFilesFromLinear: function(linear) {
        var mediaFiles = linear.getElementsByTagName('MediaFiles');

        if (mediaFiles.length) {//There should be exactly 1 MediaFiles node
            return mediaFiles[0].getElementsByTagName('MediaFile');
        }

        return [];
    },

    getMediaFileFromLinear: function(linear) {
        var fallbackMediaFile;
        var mediaFiles = this.getMediaFilesFromLinear(linear);

        for (var i = 0; i < mediaFiles.length; i++) {
            if (!mediaFiles[i].getAttribute('type')) {
                fallbackMediaFile = mediaFiles[i].childNodes[0].nodeValue;
            }

            if (mediaFiles[i].getAttribute('type') === this.displayOptions.mediaType) {
                return mediaFiles[i].childNodes[0].nodeValue;
            }
        }

        return fallbackMediaFile;
    },

    registerTrackingEvents: function() {
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
                    if (typeof this.vastOptions.tracking[eventType] === 'undefined') {
                        this.vastOptions.tracking[eventType] = [];
                    }

                    if (typeof this.vastOptions.stopTracking[eventType] === 'undefined') {
                        this.vastOptions.stopTracking[eventType] = [];
                    }
                    this.vastOptions.tracking[eventType].push(trackingEvents[i].childNodes[0].nodeValue);
                    this.vastOptions.stopTracking[eventType] = false;

                    break;

                case 'progress':
                    if (typeof this.vastOptions.tracking[eventType] === 'undefined') {
                        this.vastOptions.tracking[eventType] = [];
                    }

                    oneEventOffset = this.convertTimeStringToSeconds(trackingEvents[i].getAttribute('offset'));

                    if (typeof this.vastOptions.tracking[eventType][oneEventOffset] === 'undefined') {
                        this.vastOptions.tracking[eventType][oneEventOffset] = {
                            elements: [],
                            stopTracking: false
                        };
                    }

                    this.vastOptions.tracking[eventType][oneEventOffset].elements.push(trackingEvents[i].childNodes[0].nodeValue);

                    break;

                default:
                    break;
            }
        }
    },

    registerImpressionEvents: function(impressionTags) {
        if (impressionTags.length) {
            this.vastOptions.impression = [];

            for (var i = 0; i < impressionTags.length; i++) {
                this.vastOptions.impression.push(impressionTags[i].childNodes[0].nodeValue);
            }
        }
    },

    registerErrorEvents: function(errorTags) {
        if (
            (typeof errorTags !== 'undefined') &&
            (errorTags !== null) &&
            (errorTags.length === 1) && //Only 1 Error tag is expected
            (errorTags[0].childNodes.length === 1)
        ) {
            this.vastOptions.errorUrl = errorTags[0].childNodes[0].nodeValue;
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
    },

    prepareVast: function() {
        var player = this;

        player.initialStart = true;
        player.parseVastTag(player.vastOptions.vastTagUrl);
    },

    toggleLoader: function(showLoader) {
        if (this.displayOptions.layout === 'browser') {
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
        player.displayOptions.noVastVideoCallback();

        player.announceError(errorCode);

        player.switchToMainVideo();
    },

    /**
     * Parse the VAST Tag
     *
     * @param vastTag
     */
    parseVastTag: function(vastTag) {
        var player = this;

        player.toggleLoader(true);

        player.sendRequest(
            vastTag,
            true,
            player.displayOptions.vastTimeout,
            function() {
                var xmlHttpReq = this;

                if ((xmlHttpReq.readyState === 4) && (xmlHttpReq.status !== 200)) {
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
                    player.registerImpressionEvents(impression);
                }

                //Get the error tag, if any
                var errorTags = xmlResponse.getElementsByTagName('Error');
                if (errorTags !== null) {
                    player.registerErrorEvents(errorTags);
                }

                //Set initial values
                player.vastOptions.skipoffset = false;
                player.vastOptions.adFinished = false;

                //Get Creative
                var creative = xmlResponse.getElementsByTagName('Creative');

                //Currently only 1 creative and 1 linear is supported
                if ((typeof creative !== 'undefined') && creative.length) {
                    var arrayCreativeLinears = creative[0].getElementsByTagName('Linear');

                    if ((typeof arrayCreativeLinears !== 'undefined') && (arrayCreativeLinears !== null) && arrayCreativeLinears.length) {
                        creativeLinear = arrayCreativeLinears[0];

                        //Extract the necessary data from the Linear node
                        player.vastOptions.skipoffset      = player.convertTimeStringToSeconds(creativeLinear.getAttribute('skipoffset'));
                        player.vastOptions.clickthroughUrl = player.getClickThroughUrlFromLinear(creativeLinear);
                        player.vastOptions.clicktracking   = player.getClickTrackingEvents(creativeLinear);
                        player.vastOptions.duration        = player.getDurationFromLinear(creativeLinear);
                        player.vastOptions.mediaFile       = player.getMediaFileFromLinear(creativeLinear);

                        player.registerTrackingEvents();
                    }

                    if (typeof player.vastOptions.mediaFile !== 'undefined') {
                        player.preRoll();
                    } else {
                        //Play the main video
                        player.playMainVideoWhenVastFails(101);
                        return;
                    }
                } else {
                    //Play the main video
                    player.playMainVideoWhenVastFails(101);
                    return;
                }
                player.displayOptions.vastLoadedCallback();
            }
        );
    },

    switchPlayerToVastMode: function() {},

    preRoll: function() {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

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

                videoPlayerTag.removeAttribute('controls'); //Remove the default Controls

                if (player.displayOptions.layout !== 'browser') {
                    var progressbarContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');

                    if (progressbarContainer !== null) {
                        progressbarContainer.className = progressbarContainer.className.replace(/\bfluid_slider\b/g, 'fluid_ad_slider');
                    }
                }

                if (player.displayOptions.adText) {
                    player.addAdPlayingText(player.displayOptions.adText);
                }

                player.toggleLoader(false);
                videoPlayerTag.play();

                //Announce the impressions
                trackSingleEvent('impression');

                videoPlayerTag.removeEventListener('loadedmetadata', player.switchPlayerToVastMode);
            };

            videoPlayerTag.pause();

            videoPlayerTag.addEventListener('loadedmetadata', player.switchPlayerToVastMode);

            //Load the PreRoll ad
            videoPlayerTag.src = player.vastOptions.mediaFile;
            player.isCurrentlyPlayingAd = true;
            videoPlayerTag.load();

            //Handle the ending of the Pre-Roll ad
            videoPlayerTag.addEventListener('ended', player.onVastAdEnded);
        };

        var trackSingleEvent = function(eventType, eventSubType) {
            var trackingUris = [];

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
        };

        /**
         * Sends requests to the tracking URIs
         */
        var videoPlayerTimeUpdate = function() {
            if (player.vastOptions.adFinished) {
                videoPlayerTag.removeEventListener('timeupdate', videoPlayerTimeUpdate);
                return;
            }

            var currentTime = Math.floor(videoPlayerTag.currentTime);

            if (currentTime == 0) {
                trackSingleEvent('start');
            }

            if (
                (typeof player.vastOptions.tracking['progress'] !== 'undefined') &&
                (player.vastOptions.tracking['progress'].length) &&
                (typeof player.vastOptions.tracking['progress'][currentTime] !== 'undefined')
            ) {
                trackSingleEvent('progress', currentTime);
            }

            if (currentTime == (Math.floor(player.vastOptions.duration / 4))) {
                trackSingleEvent('firstQuartile');
            }

            if (currentTime == (Math.floor(player.vastOptions.duration / 2))) {
                trackSingleEvent('midpoint');
            }

            if (currentTime == (Math.floor(player.vastOptions.duration * 3 / 4))) {
                trackSingleEvent('thirdQuartile');
            }

            if (currentTime >= (player.vastOptions.duration - 1 )) {
                trackSingleEvent('complete');

                videoPlayerTag.removeEventListener('timeupdate', videoPlayerTimeUpdate);
                player.vastOptions.adFinished = true;
            }
        };

        playVideoPlayer();

        videoPlayerTag.addEventListener('timeupdate', videoPlayerTimeUpdate);
    },

    switchToMainVideo: function() {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        videoPlayerTag.src = player.originalSrc;

        videoPlayerTag.load();
        videoPlayerTag.play();

        player.isCurrentlyPlayingAd = false;

        player.removeClickthrough();
        player.removeSkipButton();
        player.removeAdPlayingText();
        player.removeCTAButton();
        player.vastOptions.adFinished = true;
        player.displayOptions.vastVideoEndedCallback();

        if (player.displayOptions.layout !== 'browser') {
            var progressbarContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');

            if (progressbarContainer !== null) {
                progressbarContainer.className = progressbarContainer.className.replace(/\bfluid_ad_slider\b/g, 'fluid_slider');
            }
        }

        videoPlayerTag.removeEventListener('ended', player.onVastAdEnded);

        if (player.displayOptions.layout === 'browser') {
            videoPlayerTag.setAttribute('controls', 'controls');
        }
    },

    onVastAdEnded: function() {
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        fluidPlayerClass.getInstanceById(this.id).switchToMainVideo();
    },

    /**
     * Adds a Skip Button
     */
    addSkipButton: function() {
        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        var divSkipButton = document.createElement('div');
        divSkipButton.id = 'skip_button_' + this.videoPlayerId;
        divSkipButton.className = 'skip_button skip_button_disabled';
        divSkipButton.innerHTML = this.displayOptions.skipButtonCaption.replace('[seconds]', this.vastOptions.skipoffset);

        document.getElementById('fluid_video_wrapper_' + this.videoPlayerId).appendChild(divSkipButton);

        videoPlayerTag.addEventListener('timeupdate', this.decreaseSkipOffset, false);
    },

    addAdPlayingText: function() {
        var text = this.displayOptions.adText;

        var adPlayingDiv = document.createElement('div');
        adPlayingDiv.id = this.videoPlayerId + '_fluid_ad_playing';
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
        if (!this.displayOptions.adCTAText) {
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
        link.innerText = this.displayOptions.adCTAText;
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
                btn.innerHTML = player.displayOptions.skipButtonCaption.replace('[seconds]', sec);

            } else {
                //make the button clickable
                btn.innerHTML = '<a href="javascript:;" onclick="fluidPlayerClass.getInstanceById(\'' + player.videoPlayerId + '\').pressSkipButton();">'
                    + player.displayOptions.skipButtonClickCaption
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
        this.displayOptions.vastVideoSkippedCallback();

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
            '</div>' +
            '<div class="fluid_controls_right">' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_fullscreen" class="fluid_button fluid_button_fullscreen"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_video_source" class="fluid_button_video_source"></div>' +
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

        if (isPlaying) {
            playPauseButton.className = playPauseButton.className.replace(/\bfluid_button_play\b/g, 'fluid_button_pause');

            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = 'Pause';
            }

        } else {
            playPauseButton.className = playPauseButton.className.replace(/\bfluid_button_pause\b/g, 'fluid_button_play');
         
            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = 'Play';
            }
        }
    },

    contolProgressbarUpdate: function(videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);
        var videoPlayerTag = document.getElementById(videoPlayerId);
        var currentProgressTag = document.getElementById(videoPlayerId + '_vast_control_currentprogress');

        currentProgressTag.style.width = (videoPlayerTag.currentTime / player.currentVideoDuration * 100) + '%';
    },

    contolDurationUpdate: function(videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);

        if (player.isCurrentlyPlayingAd) {
            var durationText = '00:00 / 00:00';
        } else {
            var videoPlayerTag = document.getElementById(videoPlayerId);
            var durationText = player.pad(parseInt(videoPlayerTag.currentTime / 60)) + ':' + player.pad(parseInt(videoPlayerTag.currentTime % 60)) +
            ' / ' +
            player.pad(parseInt(player.currentVideoDuration / 60)) + ':' + player.pad(parseInt(player.currentVideoDuration % 60));
        }
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

        if (player.displayOptions.layout === 'browser') {
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

    fullscreenToggle: function(videoPlayerId) {
        var fullscreenTag = document.getElementById('fluid_video_wrapper_' + videoPlayerId);
        var requestFullscreenFunctionNames = this.checkFullscreenSupport('fluid_video_wrapper_' + videoPlayerId);
        var fullscreenButton = document.getElementById(videoPlayerId + '_fluid_control_fullscreen');
        var menuOptionFullscreen = document.getElementById(videoPlayerId + 'context_option_fullscreen');

        if (requestFullscreenFunctionNames) {
            var functionNameToExecute = '';

            if (document[requestFullscreenFunctionNames.isFullscreen] === null) {
                //Go fullscreen
                functionNameToExecute = 'videoPlayerTag.' + requestFullscreenFunctionNames.goFullscreen + '();';
                fullscreenButton.className = fullscreenButton.className.replace(/\bfluid_button_fullscreen\b/g, 'fluid_button_fullscreen_exit');

                if (menuOptionFullscreen !== null) {
                    menuOptionFullscreen.innerHTML = 'Exit Fullscreen';
                }

            } else {
                //Exit fullscreen
                functionNameToExecute = 'document.' + requestFullscreenFunctionNames.exitFullscreen + '();';
                fullscreenButton.className = fullscreenButton.className.replace(/\bfluid_button_fullscreen_exit\b/g, 'fluid_button_fullscreen');

                if (menuOptionFullscreen !== null) {
                    menuOptionFullscreen.innerHTML = 'Fullscreen';
                }
            }

            new Function('videoPlayerTag', functionNameToExecute)(fullscreenTag);

        } else {
            //The browser does not support the Fullscreen API, so a pseudo-fullscreen implementation is used
            if (fullscreenTag.className.search(/\bpseudo_fullscreen\b/g) !== -1) {
                fullscreenTag.className = fullscreenTag.className.replace(/\bpseudo_fullscreen\b/g, '');
                fullscreenButton.className = fullscreenButton.className.replace(/\bfluid_button_fullscreen_exit\b/g, 'fluid_button_fullscreen');

                if (menuOptionFullscreen !== null) {
                    menuOptionFullscreen.innerHTML = 'Fullscreen';
                }

            } else {
                fullscreenTag.className += ' pseudo_fullscreen';
                fullscreenButton.className = fullscreenButton.className.replace(/\bfluid_button_fullscreen\b/g, 'fluid_button_fullscreen_exit');

                if (menuOptionFullscreen !== null) {
                    menuOptionFullscreen.innerHTML = 'Exit Fullscreen';
                }
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

        return evt.clientX - x;
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

    onProgressbarClick: function(videoPlayerId, event) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);

        if (player.isCurrentlyPlayingAd) {
            return;
        }

        var videoPlayerTag = document.getElementById(videoPlayerId);
        var totalWidth = document.getElementById(videoPlayerId + '_fluid_controls_progress_container').clientWidth;
        var clickedX = fluidPlayerClass.getEventOffsetX(event, document.getElementById(videoPlayerId + '_fluid_controls_progress_container'));

        if (totalWidth) {
            videoPlayerTag.currentTime = player.currentVideoDuration * clickedX / totalWidth;
        }
    },

    onVolumebarClick: function(videoPlayerId, event) {
        var videoPlayerTag = document.getElementById(videoPlayerId);
        var totalWidth = document.getElementById(videoPlayerId + '_fluid_control_volume_container').clientWidth;
        var clickedX = fluidPlayerClass.getEventOffsetX(event, document.getElementById(videoPlayerId + '_fluid_control_volume_container'));

        if (totalWidth) {
            var newVolume = clickedX / totalWidth;

            if (newVolume < 0.05) {
                newVolume = 0;

            } else if (newVolume > 0.95) {
                newVolume = 1;
            }

            videoPlayerTag.volume = newVolume;
        }
    },

    initialPlay: function() {
        var videoPlayerTag = this;
        var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id)

        if (!player.initialStart) {
            player.playPauseToggle(videoPlayerTag);

            videoPlayerTag.removeEventListener('play', player.initialPlay);
        }
    },

    playPauseToggle: function(videoPlayerTag) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerTag.id);
        var initialStartJustSet = false;

        if (player.initialStart || (!player.vastOptions.vastTagUrl)) {
            if (!(player.initialStart || player.vastOptions.vastTagUrl)) {
                player.initialStart = true;
                initialStartJustSet = true;
                player.displayOptions.noVastVideoCallback();
            }

            if (player.displayOptions.layout !== 'browser') { //The original player play/pause toggling is managed by the browser
                if (videoPlayerTag.paused) {
                    videoPlayerTag.play();
                } else if (!initialStartJustSet) {
                    videoPlayerTag.pause();
                }
            }
        } else {
            //Workaround for Chrome Mobile - otherwise it blocks the subsequent
            //play() command, because it considers it not being triggered by the user.
            var ua = window.navigator.userAgent;
            var isMobileChecks = fluidPlayerClass.getMobileOs();
            if ((isMobileChecks.userOs !== false || isMobileChecks.device !== false) && (!!window.chrome || -1 !== ua.indexOf("crios") || 0 === window.navigator.vendor.indexOf("Google") && -1 !== ua.indexOf("chrome"))) {
                videoPlayerTag.src = fluidPlayerScriptLocation + 'blank.mp4';
                videoPlayerTag.play();
            }

            //trigger the loading of the VAST Tag
            player.prepareVast();
        }

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
        
        document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container').addEventListener('click', function(event) {
            player.onProgressbarClick(player.videoPlayerId, event);
        }, false);

        //Set the volume contols
        document.getElementById(player.videoPlayerId + '_fluid_control_volume_container').addEventListener('click', function(event) {
            player.onVolumebarClick(player.videoPlayerId, event);
        }, false);

        videoPlayerTag.addEventListener('volumechange', function(){
            player.contolVolumebarUpdate(player.videoPlayerId);
        });

        document.getElementById(player.videoPlayerId + '_fluid_control_mute').addEventListener('click', function(){
            player.muteToggle(player.videoPlayerId);
        });

        //Set the fullscreen control
        document.getElementById(player.videoPlayerId + '_fluid_control_fullscreen').addEventListener('click', function(){
            player.fullscreenToggle(player.videoPlayerId);
        });
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
            '           Fluidplayer ' + player.version + '' +
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

        playerWrapper.className += ' fluid_player_layout_' + player.displayOptions.layout;

        fluidPlayerClass.requestStylesheet(
            'controls_stylesheet_' + player.videoPlayerId,
            player.displayOptions.templateLocation + player.displayOptions.layout + '/styles.css'
        );

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
            this.displayOptions.layout = 'browser';
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

        switch (this.displayOptions.layout) {
            case 'browser':
                //Nothing special to do here at this point.
                break;

            default:
                this.setDefaultLayout();
                break;
        }
    },

    handleFullscreen: function() {
        var videoPlayerId = this.videoPlayerId;
        var player = this;

        if (typeof document.vastFullsreenChangeEventListenersAdded === 'undefined') {
            ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach(
                function(eventType) {

                    if (typeof (document['on' + eventType]) === 'object') {
                        document.addEventListener(eventType, function(ev) {
                            player.recalculateAdDimensions(videoPlayerId);
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
            player.displayOptions.timelinePreview.file,
            true,
            player.displayOptions.vastTimeout,
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
                                    image: (player.displayOptions.timelinePreview.sprite ? player.displayOptions.timelinePreview.sprite : tempThumbnailData[0]),
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
            player.displayOptions.timelinePreview &&
            (typeof player.displayOptions.timelinePreview.file === 'string') &&
            (typeof player.displayOptions.timelinePreview.type === 'string')
        ) {
            switch (player.displayOptions.timelinePreview.type) {
                case 'VTT':
                    fluidPlayerClass.requestScript(
                        player.displayOptions.scriptsLocation + fluidPlayerClass.vttParserScript,
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
        if (player.displayOptions.responsive) {
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
        if (player.displayOptions.layout === 'browser') {
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
            var sourceChangeButtonTitle = document.createElement('div');
            sourceChangeButtonTitle.id = player.videoPlayerId + '_fluid_control_video_source_title';
            sourceChangeButtonTitle.className = 'fluid_video_sources_title';
            sourceChangeButtonTitle.innerText = player.videoSources[0].title;
            sourceChangeButton.appendChild(sourceChangeButtonTitle);

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
                            sourceChangeButtonTitle.innerText = source.title;
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
        if (!player.displayOptions.logo) {
            return;
        }

        var logoImage = document.createElement('img');
        logoImage.src = player.displayOptions.logo;
        logoImage.style.position = 'absolute';
        var logoPosition = player.displayOptions.logoPosition.toLowerCase();
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
        if (player.displayOptions.logoOpacity) {
            logoImage.style.opacity = player.displayOptions.logoOpacity;
        }
        logoImage.style.pointerEvents = 'none';

        videoPlayer.parentNode.insertBefore(logoImage, null);
    },

    initHtmlOnPauseBlock: function() {
        var player = this;
        if (!player.displayOptions.htmlOnPauseBlock) {
            return;
        }

        var videoPlayer = document.getElementById(player.videoPlayerId);
        var containerDiv = document.createElement('div');
        containerDiv.id = player.videoPlayerId + '_fluid_html_on_pause';
        containerDiv.className = 'fluid_html_on_pause';
        containerDiv.style.display = 'none';
        containerDiv.innerHTML = player.displayOptions.htmlOnPauseBlock;
        containerDiv.onclick = function(event) {
            player.playPauseToggle(videoPlayer);
        }

        if (player.displayOptions.htmlOnPauseBlockWidth) {
            containerDiv.style.width = player.displayOptions.htmlOnPauseBlockWidth + 'px';
        }

        if (player.displayOptions.htmlOnPauseBlockHeight) {
            containerDiv.style.height = player.displayOptions.htmlOnPauseBlockHeight + 'px';
        }

        videoPlayer.parentNode.insertBefore(containerDiv, null);
    },

    init: function(idVideoPlayer, vastTag, options) {
        var player = this;
        var videoPlayer = document.getElementById(idVideoPlayer);

        player.vastOptions = {
            vastTagUrl:   vastTag,
            tracking:     [],
            stopTracking: []
        };

        player.videoPlayerId        = idVideoPlayer;
        player.originalSrc          = player.getCurrentSrc();
        player.isCurrentlyPlayingAd = false;
        player.recentWaiting        = false;
        player.latestVolume         = 1;
        player.currentVideoDuration = 0;
        player.initialStart         = false;
        player.suppressClickthrough = false;
        player.timelinePreviewData  = [];

        //Default options
        player.displayOptions = {
            mediaType:                'video/mp4',//TODO: should be taken from the VAST Tag; consider removing it completely, since the supported format is browser-dependent
            skipButtonCaption:        'Skip ad in [seconds]',
            skipButtonClickCaption:   'Skip ad <span class="skip_button_icon"></span>',
            layout:                   'default', //options: 'default', 'browser', '<custom>'
            templateLocation:         fluidPlayerScriptLocation + 'templates/', //Custom folder where the template is located
            scriptsLocation:          fluidPlayerScriptLocation + 'scripts/', //Custom folder where additional scripts are located
            vastTimeout:              5000, //number of milliseconds before the VAST Tag call timeouts
            timelinePreview:          {}, //Structure: {file: 'filename.vtt', sprite: 'timeline.jpg', type: 'VTT'}. Supported types: VTT only at this time. Sprite will override values from vtt file
            vastLoadedCallback:       (function() {}),
            noVastVideoCallback:      (function() {}),
            vastVideoSkippedCallback: (function() {}),
            vastVideoEndedCallback:   (function() {}),
            playerInitCallback:       (function() {}),
            autoPlay:                 false,
            logo:                     null,
            logoPosition:             "top left",
            logoOpacity:              1,
            adText:                   null,
            adCTAText:                null,
            htmlOnPauseBlock:         null,
            htmlOnPauseBlockWidth:    null,
            htmlOnPauseBlockHeight:   null,
            responsive:               false
        };

        //Overriding the default options
        for (var key in options) {
            player.displayOptions[key] = options[key];
        }

        if (player.displayOptions.templateLocation.slice(-1) !== '/') {
            player.displayOptions.templateLocation += '/';
        }

        if (player.displayOptions.scriptsLocation.slice(-1) !== '/') {
            player.displayOptions.scriptsLocation += '/';
        }

        player.setupPlayerWrapper();

        videoPlayer.addEventListener('webkitfullscreenchange', player.recalculateAdDimensions, false);
        videoPlayer.addEventListener('fullscreenchange', player.recalculateAdDimensions, false);
        videoPlayer.addEventListener('waiting', player.onRecentWaiting, false);
        videoPlayer.addEventListener('pause', player.onFluidPlayerPause, false);
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

        //Set the custom fullscreen behaviour
        player.handleFullscreen();

        player.initLogo();

        player.initHtmlOnPauseBlock();

        player.displayOptions.playerInitCallback();

        player.createVideoSourceSwitch();

        if (player.displayOptions.autoPlay) {
            videoPlayer.play();
        }
    }
};