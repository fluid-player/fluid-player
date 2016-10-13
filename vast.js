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
    defaultIconUrl: '//fonts.googleapis.com/icon?family=Material+Icons',
    defaultControlsStylesheet: fluidPlayerScriptLocation + 'styles/default_layout.css',
    vttParserScript: fluidPlayerScriptLocation + 'scripts/webvtt.js',
    instances: [],
    notCloned: ['notCloned', 'defaultIconUrl', 'defaultControlsStylesheet',
        'vttParserScript', 'instances', 'getInstanceById', 'requestStylesheet',
        'reqiestScript', 'isTouchDevice', 'vastOptions', 'displayOptions',
        'getEventOffsetX', 'controlMaterialIconsMapping',
        'controlMaterialIconsGetMappedIcon', 'toggleElementText', 'getMobileOs'],

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

    /**
     * Parse the VAST Tag
     *
     * @param vastTag
     */
    parseVastTag: function(vastTag) {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        var playVideo = function() {
            player.toggleLoader(false);
            videoPlayerTag.play();
        };

        player.toggleLoader(true);

        player.sendRequest(
            vastTag,
            true,
            player.displayOptions.vastTimeout,
            function() {
                var xmlHttpReq = this;

                if ((xmlHttpReq.readyState === 4) && (xmlHttpReq.status !== 200)) {
                    //The response returned an error. Proceeding with the main video.
                    videoPlayerTag.pause();
                    videoPlayerTag.src = player.originalSrc;
                    playVideo();
                    player.displayOptions.noVastVideoCallback();
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
                        videoPlayerTag.pause();
                        videoPlayerTag.src = player.originalSrc;
                        playVideo();
                        player.displayOptions.noVastVideoCallback();
                    }
                } else {
                    //Play the main video
                    videoPlayerTag.pause();
                    videoPlayerTag.src = player.originalSrc;
                    playVideo();
                    player.displayOptions.noVastVideoCallback();
                }
                player.displayOptions.vastLoadedCallback();
            }
        );
    },

    preRoll: function() {
        var player = this;
        var videoPlayerTag = document.getElementById(player.videoPlayerId);

        var playVideoPlayer = function() {
            //Load the PreRoll ad
            videoPlayerTag.pause();
            videoPlayerTag.src = player.vastOptions.mediaFile;
            videoPlayerTag.load();

            var switchPlayerToVastMode = function() {
                //Get the actual duration from the video file if it is not present in the VAST XML
                if (!player.vastOptions.duration) {
                    player.vastOptions.duration = videoPlayerTag.duration;
                }

                player.addClickthroughLayer(player.videoPlayerId);
                if (player.vastOptions.skipoffset !== false) {
                    player.addSkipButton();
                }

                videoPlayerTag.removeAttribute('controls'); //Remove the default Controls

                if (player.displayOptions.layout === 'default') {
                    var progressbarContainer = document.getElementById(player.videoPlayerId + '_fluid_controls_progress_container');

                    if (progressbarContainer !== null) {
                        progressbarContainer.className = progressbarContainer.className.replace(/\bfluid_slider\b/g, 'fluid_ad_slider');
                    }
                }

                player.isCurrentlyPlayingAd = true;

                player.toggleLoader(false);
                videoPlayerTag.play();

                //Announce the impressions
                trackSingleEvent('impression');

                videoPlayerTag.removeEventListener('loadedmetadata', switchPlayerToVastMode);
            };

            /**
             * Handles the ending of the Pre-Roll ad
             */
            videoPlayerTag.addEventListener('loadedmetadata', switchPlayerToVastMode);
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
        player.vastOptions.adFinished = true;
        player.displayOptions.vastVideoEndedCallback();

        if (player.displayOptions.layout === 'default') {
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
        clickthroughLayer.parentNode.removeChild(clickthroughLayer);
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

    /**
     * Maps the default names of the material icons, used in the default layout,
     * to their codes, so that compatibility with IE9 is achieved.
     *
     * @returns object
     */
    controlMaterialIconsMapping: function() {
        return {
            volume_up:       '&#xE050;',
            volume_off:      '&#xE04F;',
            play_arrow:      '&#xE037;',
            pause:           '&#xE034;',
            fullscreen:      '&#xE5D0;',
            fullscreen_exit: '&#xE5D1;',
            hourglass_empty: '&#xE88B;'
        };
    },

    controlMaterialIconsGetMappedIcon: function(iconName) {
        var mapObj = fluidPlayerClass.controlMaterialIconsMapping();

        if (typeof mapObj[iconName] !== 'undefined') {
            return mapObj[iconName];
        }

        return '';
    },

    checkShouldDisplayVolumeControls: function() {
        var deviceType = fluidPlayerClass.getMobileOs();

        if (deviceType.userOs === 'iOS') {
            return false;
        }

        return true;
    },

    generateCustomControlTags: function() {
        var htmlResult = '<div class="fluid_controls_left">' +
        '   <i class="material-icons fluid_button" id="' + this.videoPlayerId + '_vast_control_playpause">play_arrow</i>' +
        '</div>' +
            '<div id="' + this.videoPlayerId + '_fluid_controls_progress_container" class="fluid_controls_progress_container fluid_slider">' +
        '   <div class="fluid_controls_progress">' +
        '      <div id="' + this.videoPlayerId + '_vast_control_currentprogress" class="fluid_controls_currentprogress">' +
        '          <div id="' + this.videoPlayerId + '_vast_control_currentpos" class="fluid_controls_currentpos"></div>' +
        '      </div>' +
        '   </div>' +
        '</div>' +
        '<div class="fluid_controls_right">' +
        '   <i class="material-icons fluid_button" id="' + this.videoPlayerId + '_vast_control_fullscreen">fullscreen</i>' +
        '   <div id="' + this.videoPlayerId + '_fluid_control_volume_container" class="fluid_control_volume_container fluid_slider">' +
        '       <div id="' + this.videoPlayerId + '_fluid_control_volume" class="fluid_control_volume">' +
        '           <div id="' + this.videoPlayerId + '_fluid_control_volume_currentpos" class="fluid_control_volume_currentpos"></div>' +
        '       </div>' +
        '   </div>' +
        '   <i class="material-icons fluid_button fluid_control_mute" id="' + this.videoPlayerId + '_fluid_control_mute">volume_off</i>' +
        '</div>';

        var mapObj = fluidPlayerClass.controlMaterialIconsMapping();

        var re = new RegExp('>' + Object.keys(mapObj).join('<\\/i>|>') + '<\\/i>', 'gi');
        htmlResult = htmlResult.replace(re, function(matched) {
            return '>' + mapObj[matched.replace(/>/, '').replace(/<\/i>/, '')] + '</i>';
        });

        return htmlResult;
    },

    controlPlayPauseToggle: function(videoPlayerId, isPlaying) {
        var playPauseButton = document.getElementById(videoPlayerId + '_vast_control_playpause');
        var menuOptionPlay = document.getElementById(videoPlayerId + 'context_option_play');

        if (isPlaying) {
            playPauseButton.innerHTML = fluidPlayerClass.controlMaterialIconsGetMappedIcon('pause');

            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = 'Pause';
            }

        } else {
            playPauseButton.innerHTML = fluidPlayerClass.controlMaterialIconsGetMappedIcon('play_arrow');
         
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

    contolVolumebarUpdate: function(videoPlayerId) {
        var player = fluidPlayerClass.getInstanceById(videoPlayerId);

        if (player.displayOptions.layout === 'browser') {
            return;
        }

        var videoPlayerTag = document.getElementById(videoPlayerId);
        var volumeposTag = document.getElementById(videoPlayerId + '_fluid_control_volume_currentpos');
        var volumebarTotalWidth = document.getElementById(videoPlayerId + '_fluid_control_volume').clientWidth;
        var volumeposTagWidth = volumeposTag.clientWidth;
        var muteButtonTag = document.getElementById(videoPlayerId + '_fluid_control_mute');
        var menuOptionMute = document.getElementById(videoPlayerId + 'context_option_mute');

        if (videoPlayerTag.volume) {
            player.latestVolume = videoPlayerTag.volume;
        }

        if (videoPlayerTag.volume) {
            muteButtonTag.innerHTML = fluidPlayerClass.controlMaterialIconsGetMappedIcon('volume_up');

            if (menuOptionMute !== null) {
                menuOptionMute.innerHTML = 'Mute';
            }

        } else {
            muteButtonTag.innerHTML = fluidPlayerClass.controlMaterialIconsGetMappedIcon('volume_off');

            if (menuOptionMute !== null) {
                menuOptionMute.innerHTML = 'Unmute';
            }
        }

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
        var fullscreenButton = document.getElementById(videoPlayerId + '_vast_control_fullscreen');
        var menuOptionFullscreen = document.getElementById(videoPlayerId + 'context_option_fullscreen');

        if (requestFullscreenFunctionNames) {
            var functionNameToExecute = '';

            if (document[requestFullscreenFunctionNames.isFullscreen] === null) {
                //Go fullscreen
                functionNameToExecute = 'videoPlayerTag.' + requestFullscreenFunctionNames.goFullscreen + '();';
                fullscreenButton.innerHTML = fluidPlayerClass.controlMaterialIconsGetMappedIcon('fullscreen_exit');

                if (menuOptionFullscreen !== null) {
                    menuOptionFullscreen.innerHTML = 'Exit Fullscreen';
                }

            } else {
                //Exit fullscreen
                functionNameToExecute = 'document.' + requestFullscreenFunctionNames.exitFullscreen + '();';
                fullscreenButton.innerHTML = fluidPlayerClass.controlMaterialIconsGetMappedIcon('fullscreen');

                if (menuOptionFullscreen !== null) {
                    menuOptionFullscreen.innerHTML = 'Fullscreen';
                }
            }

            new Function('videoPlayerTag', functionNameToExecute)(fullscreenTag);

        } else {
            //The browser does not support the Fullscreen API, so a pseudo-fullscreen implementation is used
            if (fullscreenTag.className.search(/\bpseudo_fullscreen\b/g) !== -1) {
                fullscreenTag.className = fullscreenTag.className.replace(/\bpseudo_fullscreen\b/g, '');
                fullscreenButton.innerHTML = fluidPlayerClass.controlMaterialIconsGetMappedIcon('fullscreen');

                if (menuOptionFullscreen !== null) {
                    menuOptionFullscreen.innerHTML = 'Fullscreen';
                }

            } else {
                fullscreenTag.className += ' pseudo_fullscreen';
                fullscreenButton.innerHTML = fluidPlayerClass.controlMaterialIconsGetMappedIcon('fullscreen_exit');

                if (menuOptionFullscreen !== null) {
                    menuOptionFullscreen.innerHTML = 'Exit Fullscreen';
                }
            }
        }

        this.recalculateAdDimensions();
    },

    getEventOffsetX: function(evt, el) {
        var x = 0;

        while (el && !isNaN(el.offsetLeft)) {
            x += el.offsetLeft - el.scrollLeft;
            el = el.offsetParent;
        }

        return evt.clientX - x;
    },

    getEventOffsetY: function(evt, el) {
        var y = 0;

        while (el && !isNaN(el.offsetTop)) {
            y += el.offsetTop - el.scrollTop;
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

        if (player.initialStart) {
            if (player.displayOptions.layout !== 'browser') { //The original player play/pause toggling is managed by the browser
                if (videoPlayerTag.paused) {
                    videoPlayerTag.play();
                } else {
                    videoPlayerTag.pause();
                }
            }
        } else {
            //Workaround for Chrome Mobile - otherwise it blocks the subsequent
            //play() command, because it considers it not being triggered by the user.
            videoPlayerTag.src = fluidPlayerScriptLocation + 'blank.mp4';
            videoPlayerTag.play();

            //trigger the loading of the VAST Tag
            player.prepareVast();
        }
    },

    setCustomControls: function() {
        var player = this;
        var videoPlayerTag = document.getElementById(this.videoPlayerId);

        //Set the Play/Pause behaviour
        document.getElementById(this.videoPlayerId + '_vast_control_playpause').addEventListener('click', function() {

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
        document.getElementById(player.videoPlayerId + '_vast_control_fullscreen').addEventListener('click', function(){
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

        menuOptionPlay.addEventListener('click', function() {
            player.playPauseToggle(videoPlayerTag);
        }, false);

        menuOptionMute.addEventListener('click', function() {
            player.muteToggle(player.videoPlayerId);
        }, false);

        menuOptionFullscreen.addEventListener('click', function() {
            player.fullscreenToggle(player.videoPlayerId);
        }, false);
    },

    setDefaultLayout: function() {
        var player = this;

        //Load the icon css
        fluidPlayerClass.requestStylesheet('defaultLayoutIcons', fluidPlayerClass.defaultIconUrl);
        fluidPlayerClass.requestStylesheet('defaultControlsStylesheet', fluidPlayerClass.defaultControlsStylesheet);

        var videoPlayerTag = document.getElementById(player.videoPlayerId);

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
        divLoading.innerHTML = '<i class="material-icons md-48">' + fluidPlayerClass.controlMaterialIconsGetMappedIcon('hourglass_empty') + '</i>';

        videoPlayerTag.parentNode.insertBefore(divLoading, videoPlayerTag.nextSibling);

        //Wait for the volume bar to be rendered
        setTimeout(function() {
            player.contolVolumebarUpdate(player.videoPlayerId);
        }, 100);

        player.setCustomControls();

        player.setupThumbnailPreview();
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
            case 'default':
                this.setDefaultLayout();
                break;

            case 'custom':
                //TODO
                break;

            case 'browser':
                //Nothing special to do here at this point.
                break;

            default:
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
                                    image: tempThumbnailData[0],
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
                    fluidPlayerClass.requestScript(fluidPlayerClass.vttParserScript, player.setupThumbnailPreviewVtt.bind(this));

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
        divVideoWrapper.style.height = videoPlayer.clientHeight + 'px';
        divVideoWrapper.style.width = videoPlayer.clientWidth + 'px';
        videoPlayer.style.height = '100%';
        videoPlayer.style.width = '100%';

        videoPlayer.parentNode.insertBefore(divVideoWrapper, videoPlayer);
        divVideoWrapper.appendChild(videoPlayer);
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
            skipButtonClickCaption:   'Skip ad &#9193;',
            layout:                   'default', //options: browser, default, custom
            vastTimeout:              5000, //number of milliseconds before the VAST Tag call timeouts
            timelinePreview:          {}, //Structure: {file: 'filename.vtt', type: 'VTT'}. Supported types: VTT only at this time.
            vastLoadedCallback:       (function() {}),
            noVastVideoCallback:      (function() {}),
            vastVideoSkippedCallback: (function() {}),
            vastVideoEndedCallback:   (function() {})
        };

        //Overriding the default options
        for (var key in options) {
            player.displayOptions[key] = options[key];
        }

        player.setupPlayerWrapper();

        videoPlayer.addEventListener('webkitfullscreenchange', player.recalculateAdDimensions, false);
        videoPlayer.addEventListener('fullscreenchange', player.recalculateAdDimensions, false);
        videoPlayer.addEventListener('waiting', player.onRecentWaiting, false);
        videoPlayer.addEventListener('pause', player.onFluidPlayerPause, false);
        videoPlayer.addEventListener('durationchange', function() {player.currentVideoDuration = player.getCurrentVideoDuration();}, false);

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
    }
};