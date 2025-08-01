/**
 * @fileoverview A sample VPAID ad useful for testing a VPAID JS enabled player.
 * This ad will just play a video.
 */

/**
 * @constructor
 */
const VpaidVideoPlayer = function() {
    /**
     * The slot is the div element on the main page that the ad is supposed to
     * occupy.
     * @type {Object}
     * @private
     */
    this.slot_ = null;

    /**
     * The video slot is the video element used by the ad to render video content.
     * @type {Object}
     * @private
     */
    this.videoSlot_ = null;

    /**
     * An object containing all registered events. These events are all
     * callbacks for use by the VPAID ad.
     * @type {Object}
     * @private
     */
    this.eventsCallbacks_ = {};

    /**
     * A list of getable and setable attributes.
     * @type {Object}
     * @private
     */
    this.attributes_ = {
        'companions': '',
        'desiredBitrate': 256,
        'duration': 10,
        'expanded': false,
        'height': 0,
        'icons': '',
        'linear': true,
        'remainingTime': 10,
        'skippableState': true,
        'viewMode': 'normal',
        'width': 0,
        'volume': 1.0
    };

    /**
     * A set of ad playback events to be reported.
     * @type {Object}
     * @private
     */
    this.quartileEvents_ = [
        {event: 'AdImpression', value: 0}, {event: 'AdVideoStart', value: 0},
        {event: 'AdVideoFirstQuartile', value: 25},
        {event: 'AdVideoMidpoint', value: 50},
        {event: 'AdVideoThirdQuartile', value: 75},
        {event: 'AdVideoComplete', value: 100}
    ];

    /**
     * @type {number} An index into what quartile was last reported.
     * @private
     */
    this.nextQuartileIndex_ = 0;

    /**
     * Parameters passed in from the AdParameters section of the VAST.
     * Used for video URL and MIME type.
     * @type {!object}
     * @private
     */
    this.parameters_ = {};
};

/**
 * Returns the supported VPAID verion.
 * @param {string} version
 * @return {string}
 */
VpaidVideoPlayer.prototype.handshakeVersion = function(version) {
    return ('2.0');
};

/**
 * Initializes all attributes in the ad. The ad will not start until startAd is\
 * called.
 * @param {number} width The ad width.
 * @param {number} height The ad height.
 * @param {string} viewMode The ad view mode.
 * @param {number} desiredBitrate The chosen bitrate.
 * @param {Object} creativeData Data associated with the creative.
 * @param {Object} environmentVars Runtime variables associated with the
 *     creative like the slot and video slot.
 */
VpaidVideoPlayer.prototype.initAd = function(
    width, height, viewMode, desiredBitrate, creativeData, environmentVars) {
    this.attributes_['width'] = width;
    this.attributes_['height'] = height;
    this.attributes_['viewMode'] = viewMode;
    this.attributes_['desiredBitrate'] = desiredBitrate;

    // slot and videoSlot are passed as part of the environmentVars
    this.slot_ = environmentVars.slot;
    this.videoSlot_ = environmentVars.videoSlot;

    // Parse the incoming ad parameters.
    this.parameters_ = JSON.parse(creativeData['AdParameters']);

    this.log(
        'initAd ' + width + 'x' + height + ' ' + viewMode + ' ' + desiredBitrate);
    this.updateVideoSlot_();
    this.videoSlot_.addEventListener(
        'timeupdate', this.timeUpdateHandler_.bind(this), false);
    this.videoSlot_.addEventListener(
        'loadedmetadata', this.loadedMetadata_.bind(this), false);
    this.videoSlot_.addEventListener('ended', this.stopAd.bind(this), false);
    this.slot_.addEventListener('click', this.clickAd_.bind(this), false);
    this.callEvent_('AdLoaded');

    setTimeout(() => {
         this.addTestingCustomButtons();
    }, 2000);
};

VpaidVideoPlayer.prototype.addTestingCustomButtons = function() {
    const acceptInvitationBtn = document.createElement('button');
    acceptInvitationBtn.innerText = 'Accept Invitation';

    Object.assign(acceptInvitationBtn.style, {
        display: 'block',
        position: 'absolute',
        top: '50px',
        right: '10px',
        left: 'auto',
        backgroundColor: 'blue',
        height: '10%',
        width: '40%',
        zIndex: '10000',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
    });
    acceptInvitationBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();

        this.callEvent_('AdUserAcceptInvitation');
    });
    this.slot_.appendChild(acceptInvitationBtn);
}

/**
 * Called when the ad is clicked.
 * @private
 */
VpaidVideoPlayer.prototype.clickAd_ = function() {
    if ('AdClickThru' in this.eventsCallbacks_) {
        this.eventsCallbacks_['AdClickThru']('', '0', true);
    }
};

/**
 * Called by the video element when video metadata is loaded.
 * @private
 */
VpaidVideoPlayer.prototype.loadedMetadata_ = function() {
    // The ad duration is not known until the media metadata is loaded.
    // Then, update the player with the duration change.
    this.attributes_['duration'] = this.videoSlot_.duration;
    this.callEvent_('AdDurationChange');
};

/**
 * Called by the video element when the video reaches specific points during
 * playback.
 * @private
 */
VpaidVideoPlayer.prototype.timeUpdateHandler_ = function() {
    if (this.nextQuartileIndex_ >= this.quartileEvents_.length) {
        return;
    }
    const percentPlayed =
        this.videoSlot_.currentTime * 100.0 / this.videoSlot_.duration;
    if (percentPlayed >= this.quartileEvents_[this.nextQuartileIndex_].value) {
        const lastQuartileEvent =
            this.quartileEvents_[this.nextQuartileIndex_].event;
        this.eventsCallbacks_[lastQuartileEvent]();
        this.nextQuartileIndex_ += 1;
    }
    if (this.videoSlot_.duration > 0) {
        this.attributes_['remainingTime'] =
            this.videoSlot_.duration - this.videoSlot_.currentTime;
    }
};

/**
 * Creates or updates the video slot and fills it with a supported video.
 * @private
 */
VpaidVideoPlayer.prototype.updateVideoSlot_ = function() {
    if (this.videoSlot_ == null) {
        this.videoSlot_ = document.createElement('video');
        this.log('Warning: No video element passed to ad, creating element.');
        this.slot_.appendChild(this.videoSlot_);
    }
    this.updateVideoPlayerSize_();
    let foundSource = false;
    const videos = this.parameters_.videos || [];
    for (let i = 0; i < videos.length; i++) {
        // Choose the first video with a supported mimetype.
        if (this.videoSlot_.canPlayType(videos[i].mimetype) != '') {
            this.videoSlot_.setAttribute('src', videos[i].url);
            foundSource = true;
            break;
        }
    }
    if (!foundSource) {
        // Unable to find a source video.
        this.callEvent_('AdError');
    }
};

/**
 * Helper function to update the size of the video player.
 * @private
 */
VpaidVideoPlayer.prototype.updateVideoPlayerSize_ = function() {
    this.videoSlot_.setAttribute('width', this.attributes_['width']);
    this.videoSlot_.setAttribute('height', this.attributes_['height']);
};

/**
 * Called by the wrapper to start the ad.
 */
VpaidVideoPlayer.prototype.startAd = function() {
    this.log('Starting ad');
    this.videoSlot_.play();

    this.callEvent_('AdStarted');
};

/**
 * Called by the wrapper to stop the ad.
 */
VpaidVideoPlayer.prototype.stopAd = function() {
    this.log('Stopping ad');
    // Calling AdStopped immediately terminates the ad. Setting a timeout allows
    // events to go through.
    const callback = this.callEvent_.bind(this);
    setTimeout(callback, 75, ['AdStopped']);
};

/**
 * Called when the video player changes the width/height of the container.
 * @param {number} width The new width.
 * @param {number} height A new height.
 * @param {string} viewMode A new view mode.
 */
VpaidVideoPlayer.prototype.resizeAd = function(width, height, viewMode) {
    this.log('resizeAd ' + width + 'x' + height + ' ' + viewMode);
    this.attributes_['width'] = width;
    this.attributes_['height'] = height;
    this.attributes_['viewMode'] = viewMode;
    this.updateVideoPlayerSize_();
    this.callEvent_('AdSizeChange');
};

/**
 * Pauses the ad.
 */
VpaidVideoPlayer.prototype.pauseAd = function() {
    this.log('pauseAd');
    this.videoSlot_.pause();
    this.callEvent_('AdPaused');
};

/**
 * Resumes the ad.
 */
VpaidVideoPlayer.prototype.resumeAd = function() {
    this.log('resumeAd');
    this.videoSlot_.play();
    this.callEvent_('AdPlaying');
};

/**
 * Expands the ad.
 */
VpaidVideoPlayer.prototype.expandAd = function() {
    this.log('expandAd');
    this.attributes_['expanded'] = true;
    this.callEvent_('AdExpanded');
};

/**
 * Collapses the ad.
 */
VpaidVideoPlayer.prototype.collapseAd = function() {
    this.log('collapseAd');
    this.attributes_['expanded'] = false;
};

/**
 * Skips the ad.
 */
VpaidVideoPlayer.prototype.skipAd = function() {
    this.log('skipAd');
    const skippableState = this.attributes_['skippableState'];
    if (skippableState) {
        this.callEvent_('AdSkipped');
    }
};

/**
 * Registers a callback for an event.
 * @param {Function} aCallback The callback function.
 * @param {string} eventName The callback type.
 * @param {Object} aContext The context for the callback.
 */
VpaidVideoPlayer.prototype.subscribe = function(
    aCallback, eventName, aContext) {
    this.log('Subscribe ' + eventName);
    const callBack = aCallback.bind(aContext);
    this.eventsCallbacks_[eventName] = callBack;
};

/**
 * Removes a callback based on the eventName.
 * @param {string} eventName The callback type.
 */
VpaidVideoPlayer.prototype.unsubscribe = function(eventName) {
    this.log('unsubscribe ' + eventName);
    this.eventsCallbacks_[eventName] = null;
};

/**
 * Returns whether the ad is linear.
 * @return {boolean} True if the ad is a linear, false for non linear.
 */
VpaidVideoPlayer.prototype.getAdLinear = function() {
    return this.attributes_['linear'];
};

/**
 * Returns ad width.
 * @return {number} The ad width.
 */
VpaidVideoPlayer.prototype.getAdWidth = function() {
    return this.attributes_['width'];
};

/**
 * Returns ad height.
 * @return {number} The ad height.
 */
VpaidVideoPlayer.prototype.getAdHeight = function() {
    return this.attributes_['height'];
};

/**
 * Returns true if the ad is expanded.
 * @return {boolean}
 */
VpaidVideoPlayer.prototype.getAdExpanded = function() {
    this.log('getAdExpanded');
    return this.attributes_['expanded'];
};

/**
 * Returns the skippable state of the ad.
 * @return {boolean}
 */
VpaidVideoPlayer.prototype.getAdSkippableState = function() {
    this.log('getAdSkippableState');
    return this.attributes_['skippableState'];
};

/**
 * Returns the remaining ad time, in seconds.
 * @return {number} The time remaining in the ad.
 */
VpaidVideoPlayer.prototype.getAdRemainingTime = function() {
    return this.attributes_['remainingTime'];
};

/**
 * Returns the duration of the ad, in seconds.
 * @return {number} The duration of the ad.
 */
VpaidVideoPlayer.prototype.getAdDuration = function() {
    return this.attributes_['duration'];
};

/**
 * Returns the ad volume.
 * @return {number} The volume of the ad.
 */
VpaidVideoPlayer.prototype.getAdVolume = function() {
    this.log('getAdVolume');
    return this.attributes_['volume'];
};

/**
 * Sets the ad volume.
 * @param {number} value The volume in percentage.
 */
VpaidVideoPlayer.prototype.setAdVolume = function(value) {
    this.attributes_['volume'] = value;
    this.log('setAdVolume ' + value);
    this.callEvent_('AdVolumeChange');
};

/**
 * Returns a list of companion ads for the ad.
 * @return {string} List of companions in VAST XML.
 */
VpaidVideoPlayer.prototype.getAdCompanions = function() {
    return this.attributes_['companions'];
};

/**
 * Returns a list of icons.
 * @return {string} A list of icons.
 */
VpaidVideoPlayer.prototype.getAdIcons = function() {
    return this.attributes_['icons'];
};

/**
 * Logs events and messages.
 * @param {string} message
 */
VpaidVideoPlayer.prototype.log = function(message) {
    console.log(message);
};

/**
 * Calls an event if there is a callback.
 * @param {string} eventType
 * @private
 */
VpaidVideoPlayer.prototype.callEvent_ = function(eventType) {
    if (eventType in this.eventsCallbacks_) {
        this.eventsCallbacks_[eventType]();
    }
};

/**
 * Main function called by wrapper to get the VPAID ad.
 * @return {Object} The VPAID compliant ad.
 */
var getVPAIDAd = function() {
    return new VpaidVideoPlayer();
};
