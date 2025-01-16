declare module 'fluid-player' {
    function fluidPlayer(
        target: HTMLVideoElement | String | string,
        options?: Partial<FluidPlayerOptions>
    ): FluidPlayerInstance;

    export default fluidPlayer;
}

declare type AdditionalEventInfo = { mediaSourceType: 'source' | 'preRoll' | 'midRoll' | 'postRoll' };
declare type OnPlay = (event: 'play', callback: (additionalInfo: AdditionalEventInfo) => void) => void;
declare type OnPlaying =
    (event: 'playing', callback: (event: Event, additionalInfo: AdditionalEventInfo) => void) => void;
declare type OnPause = (event: 'pause', callback: (additionalInfo: AdditionalEventInfo) => void) => void;
declare type OnEnded = (event: 'ended', callback: (additionalInfo: AdditionalEventInfo) => void) => void;
declare type OnSeeked = (event: 'seeked', callback: (additionalInfo: AdditionalEventInfo) => void) => void;
declare type OnTheaterModeOn =
    (event: 'theatreModeOn', callback: (event: Event, additionalInfo: AdditionalEventInfo) => void) => void;
declare type OnTheaterModeOff =
    (event: 'theatreModeOff', callback: (event: Event, additionalInfo: AdditionalEventInfo) => void) => void;
declare type OnTimeUpdate =
    (event: 'timeupdate', callback: (time: number, additionalInfo: AdditionalEventInfo) => void) => void;
declare type OnMiniPlayerToggle =
    (event: 'miniPlayerToggle', callback: (event: CustomEvent<{
        isToggledOn: boolean
    }>, additionalInfo: AdditionalEventInfo) => void) => void;

declare interface FluidPlayerInstance {
    play: () => void;
    pause: () => void;
    skipTo: (seconds: number) => void;
    setPlaybackSpeed: (speed: number) => void;
    setVolume: (volume: number) => void;
    toggleControlBar: (shouldToggle: boolean) => void;
    toggleFullScreen: (shouldToggle: boolean) => void;
    toggleMiniPlayer: (shouldToggle: boolean) => void;
    setHtmlOnPauseBlock: (pauseBlock: { html: string; width: number; height: number; }) => void;
    destroy: () => void;
    dashInstance: () => any | null;
    hlsInstance: () => any | null;
    on: OnPlay & OnPlaying & OnPause & OnEnded & OnSeeked & OnTheaterModeOn & OnTheaterModeOff & OnTimeUpdate &
        OnMiniPlayerToggle;
}

declare interface LayoutControls {
    primaryColor: false | string;
    posterImage: false | string;
    posterImageSize: 'auto' | 'cover' | 'contain';
    playButtonShowing: boolean;
    playPauseAnimation: boolean;
    fillToContainer: boolean;
    autoPlay: boolean;
    preload: 'none' | 'metadata' | 'auto' | string;
    mute: boolean;
    doubleclickFullscreen: boolean;
    subtitlesEnabled: boolean;
    keyboardControl: boolean;
    title: string;
    loop: boolean;
    logo: Partial<{
        imageUrl: string | null;
        position: 'top right' | 'top left' | 'bottom right' | 'bottom left';
        clickUrl: string | null;
        opacity: number;
        mouseOverImageUrl: string | null;
        imageMargin: string;
        hideWithControls: boolean;
        showOverAds: boolean;
    }>;
    controlBar: Partial<{
        autoHide: boolean;
        autoHideTimeout: number;
        animated: boolean;
    }>;
    timelinePreview: VTTPreviewOptions | StaticPreviewOptions;
    htmlOnPauseBlock: Partial<{
        html: string | null;
        height: number | null;
        width: number | null;
    }>;
    layout: 'default' | string;
    allowDownload: boolean;
    playbackRateEnabled: boolean;
    allowTheatre: boolean;
    theatreAdvanced: Partial<{
        theatreElement: string;
        classToApply: string;
    }>;
    theatreSettings: Partial<{
        width: string;
        height: string;
        marginTop: number;
        horizontalAlign: 'center' | 'left' | 'right';
    }>;
    playerInitCallback: () => void;
    persistentSettings: Partial<{
        volume: boolean;
        quality: boolean;
        speed: boolean;
        theatre: boolean;
    }>;
    controlForwardBackward: Partial<{
        show: boolean;
        doubleTapMobile: boolean;
    }>;
    contextMenu: Partial<{
        controls: boolean;
        links: Array<{
            href: string;
            label: string;
        }>;
    }>;
    miniPlayer: Partial<{
        enabled: boolean;
        width: number;
        height: number;
        widthMobile: number;
        placeholderText: string;
        position: 'top right' | 'top left' | 'bottom right' | 'bottom left';
        autoToggle: boolean;
    }>;
    showCardBoardView: boolean;
    showCardBoardJoystick: boolean;
    roundedCorners: number;
    autoRotateFullScreen: boolean;
}

declare interface VTTPreviewOptions {
    file: string;
    type: 'VTT';
    spriteRelativePath?: boolean;
    sprite?: string;
}

declare interface StaticPreviewOptions {
    type: 'static';
    frames: Array<{
        startTime: number;
        endTime: number;
        image: string;
        x: number;
        y: number;
        w: number;
        h: number;
    }>
}

declare interface VastOptions {
    adList: Array<PreRollAdOptions | MidRollAdOptions | PostRollAdOptions | OnPauseRollAdOptions>;
    skipButtonCaption: string;
    skipButtonClickCaption: string;
    adText: string;
    adTextPosition: 'top right' | 'top left' | 'bottom right' | 'bottom left';
    adCTAText: string | boolean;
    adCTATextPosition: 'top right' | 'top left' | 'bottom right' | 'bottom left';
    adCTATextVast: boolean;
    vastTimeout: number;
    showPlayButton: boolean;
    maxAllowedVastTagRedirects: number;
    showProgressbarMarkers: boolean;
    adClickable: boolean;
    allowVPAID: boolean;
    vastAdvanced: Partial<{
        vastLoadedCallback: () => void;
        noVastVideoCallback: () => void;
        vastVideoSkippedCallback: () => void;
        vastVideoEndedCallback: () => void;
    }>;
}

declare interface AdOptions {
    vastTag: string;
    roll: string;
    fallbackVastTags?: Array<string>;
    adText?: string;
    adTextPosition?: 'top right' | 'top left' | 'bottom right' | 'bottom left';
    adClickable?: boolean;
    vAlign?: 'top' | 'middle' | 'bottom';
    nonLinearDuration?: number;
    size?: '468x60' | '300x250' | '728x90';
}

declare interface PreRollAdOptions extends AdOptions {
    roll: 'preRoll';
}

declare interface MidRollAdOptions extends AdOptions {
    roll: 'midRoll';
    timer: number | string;
}

declare interface PostRollAdOptions extends AdOptions {
    roll: 'postRoll';
}

declare interface OnPauseRollAdOptions extends AdOptions {
    roll: 'onPauseRoll';
}

declare interface ModulesOptions {
    configureHls: (options: any) => any;
    onBeforeInitHls: (hls: any) => void;
    onAfterInitHls: (hls: any) => void;
    configureDash: (options: any) => any;
    onBeforeInitDash: (dash: any) => void;
    onAfterInitDash: (dash: any) => void;
}

declare interface FluidPlayerOptions {
    layoutControls: Partial<LayoutControls>;
    vastOptions: Partial<VastOptions>;
    modules: Partial<ModulesOptions>;
    onBeforeXMLHttpRequestOpen?: (request: XMLHttpRequest) => void;
    onBeforeXMLHttpRequest?: (request: XMLHttpRequest) => void;
    debug?: boolean;
    captions: Partial<{
        play: string;
        pause: string;
        mute: string;
        unmute: string;
        fullscreen: string;
        exitFullscreen: string;
    }>;
    suggestedVideos?: {
        configUrl: string | null;
    };
    hls?: {
        overrideNative: boolean;
    };
}
