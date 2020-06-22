// VPAID support module
'use strict';
export default function (playerInstance, options) {
    const callbacks = {
        AdStarted: () => playerInstance.onStartVpaidAd,
        AdStopped: () => playerInstance.onStopVpaidAd,
        AdSkipped: () => playerInstance.onSkipVpaidAd,
        AdLoaded: () => playerInstance.onVpaidAdLoaded,
        AdLinearChange: () => playerInstance.onVpaidAdLinearChange,
        AdSizeChange: () => playerInstance.onVpaidAdSizeChange,
        AdExpandedChange: () => playerInstance.onVpaidAdExpandedChange,
        AdSkippableStateChange: () => playerInstance.onVpaidAdSkippableStateChange,
        AdDurationChange: () => playerInstance.onVpaidAdDurationChange,
        AdRemainingTimeChange: () => playerInstance.onVpaidAdRemainingTimeChange,
        AdVolumeChange: () => playerInstance.onVpaidAdVolumeChange,
        AdImpression: () => playerInstance.onVpaidAdImpression,
        AdClickThru: () => playerInstance.onVpaidAdClickThru,
        AdInteraction: () => playerInstance.onVpaidAdInteraction,
        AdVideoStart: () => playerInstance.onVpaidAdVideoStart,
        AdVideoFirstQuartile: () => playerInstance.onVpaidAdVideoFirstQuartile,
        AdVideoMidpoint: () => playerInstance.onVpaidAdVideoMidpoint,
        AdVideoThirdQuartile: () => playerInstance.onVpaidAdVideoThirdQuartile,
        AdVideoComplete: () => playerInstance.onVpaidAdVideoComplete,
        AdUserAcceptInvitation: () => playerInstance.onVpaidAdUserAcceptInvitation,
        AdUserMinimize: () => playerInstance.onVpaidAdUserMinimize,
        AdUserClose: () => playerInstance.onVpaidAdUserClose,
        AdPaused: () => playerInstance.onVpaidAdPaused,
        AdPlaying: () => playerInstance.onVpaidAdPlaying,
        AdError: () => playerInstance.onVpaidAdError,
        AdLog: () => playerInstance.onVpaidAdLog
    };

    playerInstance.checkVPAIDInterface = (vpaidAdUnit) => {
        const VPAIDCreative = vpaidAdUnit;
        // checks if all the mandatory params present
        return !!(VPAIDCreative.handshakeVersion && typeof VPAIDCreative.handshakeVersion == "function"
            && VPAIDCreative.initAd && typeof VPAIDCreative.initAd == "function"
            && VPAIDCreative.startAd && typeof VPAIDCreative.startAd == "function"
            && VPAIDCreative.stopAd && typeof VPAIDCreative.stopAd == "function"
            && VPAIDCreative.skipAd && typeof VPAIDCreative.skipAd == "function"
            && VPAIDCreative.resizeAd && typeof VPAIDCreative.resizeAd == "function"
            && VPAIDCreative.pauseAd && typeof VPAIDCreative.pauseAd == "function"
            && VPAIDCreative.resumeAd && typeof VPAIDCreative.resumeAd == "function"
            && VPAIDCreative.expandAd && typeof VPAIDCreative.expandAd == "function"
            && VPAIDCreative.collapseAd && typeof VPAIDCreative.collapseAd == "function"
            && VPAIDCreative.subscribe && typeof VPAIDCreative.subscribe == "function"
            && VPAIDCreative.unsubscribe && typeof VPAIDCreative.unsubscribe == "function");
    };

    // Callback for AdPaused
    playerInstance.onVpaidAdPaused = () => {
        playerInstance.vpaidTimeoutTimerClear();
        playerInstance.debugMessage("onAdPaused");
    };

    // Callback for AdPlaying
    playerInstance.onVpaidAdPlaying = () => {
        playerInstance.vpaidTimeoutTimerClear();
        playerInstance.debugMessage("onAdPlaying");
    };

    // Callback for AdError
    playerInstance.onVpaidAdError = (message) => {
        playerInstance.debugMessage("onAdError: " + message);
        playerInstance.vpaidTimeoutTimerClear();
        playerInstance.onVpaidEnded();
    };

    // Callback for AdLog
    playerInstance.onVpaidAdLog = (message) => {
        playerInstance.debugMessage("onAdLog: " + message);
    };

    // Callback for AdUserAcceptInvitation
    playerInstance.onVpaidAdUserAcceptInvitation = () => {
        playerInstance.debugMessage("onAdUserAcceptInvitation");
    };

    // Callback for AdUserMinimize
    playerInstance.onVpaidAdUserMinimize = () => {
        playerInstance.debugMessage("onAdUserMinimize");
    };

    // Callback for AdUserClose
    playerInstance.onVpaidAdUserClose = () => {
        playerInstance.debugMessage("onAdUserClose");
    };

    // Callback for AdUserClose
    playerInstance.onVpaidAdSkippableStateChange = () => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.debugMessage("Ad Skippable State Changed to: " + playerInstance.vpaidAdUnit.getAdSkippableState());
    };

    // Callback for AdUserClose
    playerInstance.onVpaidAdExpandedChange = () => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.debugMessage("Ad Expanded Changed to: " + playerInstance.vpaidAdUnit.getAdExpanded());
    };

    // Pass through for getAdExpanded
    playerInstance.getVpaidAdExpanded = () => {
        playerInstance.debugMessage("getAdExpanded");

        if (!playerInstance.vpaidAdUnit) {
            return;
        }

        return playerInstance.vpaidAdUnit.getAdExpanded();
    };

    // Pass through for getAdSkippableState
    playerInstance.getVpaidAdSkippableState = () => {
        playerInstance.debugMessage("getAdSkippableState");

        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        return playerInstance.vpaidAdUnit.getAdSkippableState();
    };

    // Callback for AdSizeChange
    playerInstance.onVpaidAdSizeChange = () => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.debugMessage("Ad size changed to: w=" + playerInstance.vpaidAdUnit.getAdWidth() + " h=" + playerInstance.vpaidAdUnit.getAdHeight());
    };

    // Callback for AdDurationChange
    playerInstance.onVpaidAdDurationChange = () => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.debugMessage("Ad Duration Changed to: " + playerInstance.vpaidAdUnit.getAdDuration());
    };

    // Callback for AdRemainingTimeChange
    playerInstance.onVpaidAdRemainingTimeChange = () => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.debugMessage("Ad Remaining Time Changed to: " + playerInstance.vpaidAdUnit.getAdRemainingTime());
    };

    // Pass through for getAdRemainingTime
    playerInstance.getVpaidAdRemainingTime = () => {
        playerInstance.debugMessage("getAdRemainingTime");
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        return playerInstance.vpaidAdUnit.getAdRemainingTime();
    };

    // Callback for AdImpression
    playerInstance.onVpaidAdImpression = () => {
        playerInstance.debugMessage("Ad Impression");

        //Announce the impressions
        playerInstance.trackSingleEvent('impression');
    };

    // Callback for AdClickThru
    playerInstance.onVpaidAdClickThru = (url, id, playerHandles) => {
        playerInstance.debugMessage("Clickthrough portion of the ad was clicked");

        // if playerHandles flag is set to true
        // then player need to open click thorough url in new window
        if (playerHandles) {
            window.open(playerInstance.vastOptions.clickthroughUrl);
        }

        playerInstance.pauseVpaidAd();
        // fire click tracking
        playerInstance.callUris(playerInstance.vastOptions.clicktracking);
    };

    // Callback for AdInteraction
    playerInstance.onVpaidAdInteraction = (id) => {
        playerInstance.debugMessage("A non-clickthrough event has occured");
    };

    // Callback for AdVideoStart
    playerInstance.onVpaidAdVideoStart = () => {
        playerInstance.debugMessage("Video 0% completed");
        playerInstance.trackSingleEvent('start');
    };

    // Callback for AdUserClose
    playerInstance.onVpaidAdVideoFirstQuartile = () => {
        playerInstance.debugMessage("Video 25% completed");
        playerInstance.trackSingleEvent('firstQuartile');
    };

    // Callback for AdUserClose
    playerInstance.onVpaidAdVideoMidpoint = () => {
        playerInstance.debugMessage("Video 50% completed");
        playerInstance.trackSingleEvent('midpoint');
    };

    // Callback for AdUserClose
    playerInstance.onVpaidAdVideoThirdQuartile = () => {
        playerInstance.debugMessage("Video 75% completed");
        playerInstance.trackSingleEvent('thirdQuartile');
    };

    // Callback for AdVideoComplete
    playerInstance.onVpaidAdVideoComplete = () => {
        playerInstance.debugMessage("Video 100% completed");
        playerInstance.trackSingleEvent('complete');
    };

    // Callback for AdLinearChange
    playerInstance.onVpaidAdLinearChange = () => {
        const vpaidNonLinearSlot = document.getElementsByClassName("fluid_vpaidNonLinear_ad")[0];
        const closeBtn = document.getElementById('close_button_' + playerInstance.videoPlayerId);
        const adListId = vpaidNonLinearSlot.getAttribute('adlistid');
        playerInstance.debugMessage("Ad linear has changed: " + playerInstance.vpaidAdUnit.getAdLinear());

        if (!playerInstance.vpaidAdUnit.getAdLinear()) {
            return;
        }

        playerInstance.backupMainVideoContentTime(adListId);
        playerInstance.isCurrentlyPlayingAd = true;

        if (closeBtn) {
            closeBtn.remove();
        }

        vpaidNonLinearSlot.className = 'fluid_vpaid_slot';
        vpaidNonLinearSlot.id = playerInstance.videoPlayerId + "_fluid_vpaid_slot";
        playerInstance.domRef.player.loop = false;
        playerInstance.domRef.player.removeAttribute('controls');

        const progressbarContainer = playerInstance.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');

        for (let i = 0; i < progressbarContainer.length; i++) {
            progressbarContainer[i].style.backgroundColor = playerInstance.displayOptions.layoutControls.adProgressColor;
        }

        playerInstance.toggleLoader(false);
    };

    // Pass through for getAdLinear
    playerInstance.getVpaidAdLinear = () => {
        playerInstance.debugMessage("getAdLinear");
        return playerInstance.vpaidAdUnit.getAdLinear();
    };

    // Pass through for startAd()
    playerInstance.startVpaidAd = () => {
        playerInstance.debugMessage("startAd");
        playerInstance.vpaidTimeoutTimerStart();
        playerInstance.vpaidAdUnit.startAd();
    };

    // Callback for AdLoaded
    playerInstance.onVpaidAdLoaded = () => {
        playerInstance.debugMessage("ad has been loaded");
        // start the video play as vpaid is loaded successfully
        playerInstance.vpaidTimeoutTimerClear();
        playerInstance.startVpaidAd();
    };

    // Callback for StartAd()
    playerInstance.onStartVpaidAd = () => {
        playerInstance.debugMessage("Ad has started");
        playerInstance.vpaidTimeoutTimerClear();
    };

    // Pass through for stopAd()
    playerInstance.stopVpaidAd = () => {
        playerInstance.vpaidTimeoutTimerStart();
        playerInstance.vpaidAdUnit.stopAd();
    };

    // Hard Pass through for stopAd() excluding deleteOtherVpaidAdsApart
    playerInstance.hardStopVpaidAd = (deleteOtherVpaidAdsApart) => {
        // this is hard stop of vpaid ads
        // we delete all the vpaid assets so the new one can be loaded
        // delete all assets apart from the ad from deleteOtherVpaidAdsApart
        if (playerInstance.vpaidAdUnit) {
            playerInstance.vpaidAdUnit.stopAd();
            playerInstance.vpaidAdUnit = null;
        }

        const vpaidIframes = document.getElementsByClassName("fluid_vpaid_iframe");
        const vpaidSlots = document.getElementsByClassName("fluid_vpaid_slot");
        const vpaidNonLinearSlots = document.getElementsByClassName("fluid_vpaidNonLinear_ad");

        for (let i = 0; i < vpaidIframes.length; i++) {
            if (vpaidIframes[i].getAttribute('adListId') !== deleteOtherVpaidAdsApart) {
                vpaidIframes[i].remove();
            }
        }

        for (let j = 0; j < vpaidSlots.length; j++) {
            if (vpaidSlots[j].getAttribute('adListId') !== deleteOtherVpaidAdsApart) {
                vpaidSlots[j].remove();
            }
        }

        for (let k = 0; k < vpaidNonLinearSlots.length; k++) {
            if (vpaidNonLinearSlots[k].getAttribute('adListId') !== deleteOtherVpaidAdsApart) {
                vpaidNonLinearSlots[k].remove();
            }
        }
    };

    // Callback for AdUserClose
    playerInstance.onStopVpaidAd = () => {
        playerInstance.debugMessage("Ad has stopped");
        playerInstance.vpaidTimeoutTimerClear();
        playerInstance.onVpaidEnded();
    };

    // Callback for AdUserClose
    playerInstance.onSkipVpaidAd = () => {
        playerInstance.debugMessage("Ad was skipped");

        playerInstance.vpaidTimeoutTimerClear();
        playerInstance.onVpaidEnded();
    };

    // Passthrough for skipAd
    playerInstance.skipVpaidAd = () => {
        playerInstance.vpaidTimeoutTimerStart();
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.vpaidAdUnit.skipAd()
        playerInstance.vpaidTimeoutTimerClear();
        playerInstance.onVpaidEnded();
    };

    // Passthrough for setAdVolume
    playerInstance.setVpaidAdVolume = (val) => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.vpaidAdUnit.setAdVolume(val);
    };

    // Passthrough for getAdVolume
    playerInstance.getVpaidAdVolume = () => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        return playerInstance.vpaidAdUnit.getAdVolume();
    };

    // Callback for AdVolumeChange
    playerInstance.onVpaidAdVolumeChange = () => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.debugMessage("Ad Volume has changed to - " + playerInstance.vpaidAdUnit.getAdVolume());
    };

    playerInstance.resizeVpaidAuto = () => {
        if (playerInstance.vastOptions !== null && playerInstance.vastOptions.vpaid && playerInstance.vastOptions.linear) {
            const adWidth = playerInstance.domRef.player.offsetWidth;
            const adHeight = playerInstance.domRef.player.offsetHeight;
            const mode = (playerInstance.fullscreenMode ? 'fullscreen' : 'normal');
            playerInstance.resizeVpaidAd(adWidth, adHeight, mode);
        }
    };

    //Passthrough for resizeAd
    playerInstance.resizeVpaidAd = (width, height, viewMode) => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.vpaidAdUnit.resizeAd(width, height, viewMode);
    };

    // Passthrough for pauseAd()
    playerInstance.pauseVpaidAd = () => {
        playerInstance.vpaidTimeoutTimerStart();
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.vpaidAdUnit.pauseAd();
    };

    // Passthrough for resumeAd()
    playerInstance.resumeVpaidAd = () => {
        playerInstance.vpaidTimeoutTimerStart();
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.vpaidAdUnit.resumeAd();
    };

    //Passthrough for expandAd()
    playerInstance.expandVpaidAd = () => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.vpaidAdUnit.expandAd();
    };

    //Passthrough for collapseAd()
    playerInstance.collapseVpaidAd = () => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        playerInstance.vpaidAdUnit.collapseAd();
    };

    playerInstance.vpaidTimeoutTimerClear = () => {
        if (playerInstance.vpaidTimer) {
            clearTimeout(playerInstance.vpaidTimer);
        }
    };

    // placeholder for timer function
    playerInstance.vpaidTimeoutTimerStart = () => {
        // clear previous timer if any
        playerInstance.vpaidTimeoutTimerClear();
        playerInstance.vpaidTimer = setTimeout(function () {
            playerInstance.announceLocalError('901');
            playerInstance.onVpaidEnded();
        }, playerInstance.displayOptions.vastOptions.vpaidTimeout);
    };

    playerInstance.vpaidCallbackListenersAttach = () => {
        //The key of the object is the event name and the value is a reference to the callback function that is registered with the creative
        // Looping through the object and registering each of the callbacks with the creative
        for (let eventName in callbacks) {
            playerInstance.vpaidAdUnit.subscribe(callbacks[eventName](), eventName, playerInstance);
        }
    };

    playerInstance.vpaidCallbackListenersDetach = () => {
        if (!playerInstance.vpaidAdUnit) {
            return;
        }
        for (let eventName in callbacks) {
            playerInstance.vpaidAdUnit.unsubscribe(callbacks[eventName](), eventName, playerInstance);
        }
    };

    playerInstance.loadVpaid = (adListId, vpaidJsUrl) => {
        const vpaidIframe = document.createElement('iframe');
        vpaidIframe.id = playerInstance.videoPlayerId + "_" + adListId + "_fluid_vpaid_iframe";
        vpaidIframe.className = 'fluid_vpaid_iframe';
        vpaidIframe.setAttribute('adListId', adListId);
        vpaidIframe.setAttribute('frameborder', '0');

        playerInstance.domRef.player.parentNode.insertBefore(vpaidIframe, playerInstance.domRef.player.nextSibling);

        vpaidIframe.contentWindow.document.write('<script src="' + vpaidJsUrl + '"></scr' + 'ipt>');

        // set interval with timeout
        playerInstance.tempVpaidCounter = 0;
        playerInstance.getVPAIDAdInterval = setInterval(function () {

            const fn = vpaidIframe.contentWindow['getVPAIDAd'];

            // check if JS is loaded fully in iframe
            if (fn && typeof fn == 'function') {

                if (playerInstance.vpaidAdUnit) {
                    playerInstance.hardStopVpaidAd(adListId);
                }

                playerInstance.vpaidAdUnit = fn();
                clearInterval(playerInstance.getVPAIDAdInterval);
                if (playerInstance.checkVPAIDInterface(playerInstance.vpaidAdUnit)) {

                    if (playerInstance.getVpaidAdLinear()) {
                        playerInstance.isCurrentlyPlayingAd = true;
                        playerInstance.switchPlayerToVpaidMode(adListId);
                    } else {
                        playerInstance.debugMessage('non linear vpaid ad is loaded');
                        playerInstance.loadVpaidNonlinearAssets(adListId);
                    }

                }

            } else {

                // video player will wait for 2seconds if vpaid is not loaded, then it will declare vast error and move ahead
                playerInstance.tempVpaidCounter++;
                if (playerInstance.tempVpaidCounter >= 20) {
                    clearInterval(playerInstance.getVPAIDAdInterval);
                    playerInstance.adList[adListId].error = true;
                    playerInstance.playMainVideoWhenVpaidFails(403);
                    return false;
                } else {
                    playerInstance.debugMessage(playerInstance.tempVpaidCounter);
                }

            }

        }, 100);

    };

    playerInstance.onVpaidEnded = (event) => {
        if (event) {
            event.stopImmediatePropagation();
        }

        const vpaidSlot = document.getElementById(playerInstance.videoPlayerId + "_fluid_vpaid_slot");

        playerInstance.vpaidCallbackListenersDetach();

        playerInstance.vpaidAdUnit = null;
        clearInterval(playerInstance.getVPAIDAdInterval);

        if (!!vpaidSlot) {
            vpaidSlot.remove();
        }

        playerInstance.checkForNextAd();
    };

    playerInstance.playMainVideoWhenVpaidFails = (errorCode) => {
        const vpaidSlot = document.getElementById(playerInstance.videoPlayerId + "_fluid_vpaid_slot");

        if (vpaidSlot) {
            vpaidSlot.remove();
        }

        clearInterval(playerInstance.getVPAIDAdInterval);
        playerInstance.playMainVideoWhenVastFails(errorCode);
    };

    // TODO: ???
    playerInstance.switchPlayerToVpaidMode = () => {
    };
}
