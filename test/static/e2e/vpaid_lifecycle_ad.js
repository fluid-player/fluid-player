/**
 * Scripted VPAID 2.0 linear creative for E2E tests. It needs no media of its own: it records every call made by
 * the player in window.parent.__vpaidCalls and fires the VPAID lifecycle events on a short timer.
 * AdParameters (JSON): { "mode": "error" } makes the creative fire AdError instead of AdLoaded.
 */
var getVPAIDAd = function () {
    var callbacks = {};
    var params = {};
    var log = function (name, args) {
        var calls = window.parent.__vpaidCalls = window.parent.__vpaidCalls || [];
        calls.push({ name: name, args: args || [] });
    };
    var emit = function (eventName) {
        log('emit:' + eventName);
        if (callbacks[eventName]) {
            callbacks[eventName]();
        }
    };
    var STEP = 300;

    return {
        handshakeVersion: function (version) { log('handshakeVersion', [version]); return '2.0'; },
        initAd: function (width, height, viewMode, desiredBitrate, creativeData) {
            log('initAd', [width, height, viewMode, desiredBitrate, creativeData.AdParameters]);
            params = JSON.parse(creativeData.AdParameters || '{}');
            setTimeout(function () { emit(params.mode === 'error' ? 'AdError' : 'AdLoaded'); }, 0);
        },
        startAd: function () {
            log('startAd');
            emit('AdStarted');
            emit('AdImpression');
            emit('AdVideoStart');
            setTimeout(function () { emit('AdVideoFirstQuartile'); }, STEP);
            setTimeout(function () { emit('AdVideoMidpoint'); }, STEP * 2);
            setTimeout(function () { emit('AdVideoThirdQuartile'); }, STEP * 3);
            setTimeout(function () { emit('AdVideoComplete'); }, STEP * 4);
            setTimeout(function () { emit('AdStopped'); }, STEP * 5);
        },
        stopAd: function () { log('stopAd'); },
        skipAd: function () { log('skipAd'); },
        resizeAd: function () { log('resizeAd'); },
        pauseAd: function () { log('pauseAd'); },
        resumeAd: function () { log('resumeAd'); },
        expandAd: function () { log('expandAd'); },
        collapseAd: function () { log('collapseAd'); },
        subscribe: function (callback, eventName, context) { callbacks[eventName] = callback.bind(context); },
        unsubscribe: function (eventName) { callbacks[eventName] = null; },
        getAdLinear: function () { return true; },
        getAdWidth: function () { return 0; },
        getAdHeight: function () { return 0; },
        getAdExpanded: function () { return false; },
        getAdSkippableState: function () { return false; },
        getAdRemainingTime: function () { return 0; },
        getAdDuration: function () { return 1.5; },
        getAdVolume: function () { return 1; },
        getAdCompanions: function () { return ''; },
        getAdIcons: function () { return ''; },
        setAdVolume: function () {}
    };
};
