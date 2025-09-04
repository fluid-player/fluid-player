export const trackingEventTypes = {
    // Player Operation Metrics (use in linear and non-linear ads)
    muteEvent: 'mute',
    unmuteEvent: 'unmute',
    pauseEvent: 'pause',
    resumeEvent: 'resume',
    rewindEvent: 'rewind',
    fullscreenEvent: 'fullscreen',
    skipEvent: 'skip',
    playerExpandEvent: 'playerExpand',
    playerCollapseEvent: 'playerCollapse',
    impressionEvent: 'impression',
    viewImpressionEvent: 'viewImpression',

    // Use in linear ad metrics
    startEvent: 'start',
    firstQuartileEvent: 'firstQuartile',
    midpointEvent: 'midpoint',
    thirdQuartileEvent: 'thirdQuartile',
    completeEvent: 'complete',
    progressEvent: 'progress',

    // Use in non-linear ad metrics
    creativeViewEvent: 'creativeView',
    collapseEvent: 'collapse',
    adCollapseEvent: 'adCollapse',
    closeEvent: 'close',
    acceptInvitationEvent: 'acceptInvitation',

    iconClickThroughEvent: 'iconClickThrough',
}

export const displayModes = {
    FULLSCREEN: 'fullscreen',
    THEATER: 'theaterMode',
    MINI_PLAYER: 'miniPlayer',
    NORMAL: 'normal',
}
