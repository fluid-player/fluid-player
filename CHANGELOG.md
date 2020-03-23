# CHANGELOG

## 2.4.10
* [Pull #430](https://github.com/fluid-player/fluid-player/pull/430) Add destroy function

## 2.4.10
* [Pull #399](https://github.com/fluid-player/fluid-player/pull/399) Adding VR Features to player (experimental)

## 2.4.9
* [Pull #398](https://github.com/fluid-player/fluid-player/pull/398) Add support for VPAID (2.0)

## 2.4.8
* [Pull #374](https://github.com/fluid-player/fluid-player/pull/374) Skip ad button on VAST preroll opening a new blank tab

## 2.4.7
* [Pull #361](https://github.com/fluid-player/fluid-player/pull/361) Adding subtitles, multiple ad-roll, fallback vast ad, fixing dash playback, double click to fullscreen
* [Pull #354](https://github.com/fluid-player/fluid-player/pull/354) VAST Multiple mediafile support, announce proper error codes and some bug fixes
* [Pull #356](https://github.com/fluid-player/fluid-player/pull/356) Seeked and ended html5 event listeners

## 2.4.6
* [Pull #358](https://github.com/fluid-player/fluid-player/pull/358) fix bug with dash js api

## 2.4.5
* [Pull #325](https://github.com/fluid-player/fluid-player/pull/325) Add poster image size option (posterImageSize)
* [Pull #330](https://github.com/fluid-player/fluid-player/pull/330) Add showPlayButton config to display Play button on ad
* [Pull #306](https://github.com/fluid-player/fluid-player/pull/306) Remove unsupported browser layout parts
* [Pull #331](https://github.com/fluid-player/fluid-player/pull/331) Add ability to change controls titles
* [Pull #332](https://github.com/fluid-player/fluid-player/pull/332) Fix multiple videos play
* [Pull #335](https://github.com/fluid-player/fluid-player/pull/335) Improve timecode
* [Pull #336](https://github.com/fluid-player/fluid-player/pull/336) Add title
* [Pull #334](https://github.com/fluid-player/fluid-player/pull/334) Add ability to set preload value

## 2.4.4
* [Pull #289](https://github.com/fluid-player/fluid-player/pull/289) Fix window.getComputedStyle call on null
* [Pull #290](https://github.com/fluid-player/fluid-player/pull/290) Prevent multi click event on download btn
* [Pull #293](https://github.com/fluid-player/fluid-player/pull/293) Check if Hls already exposed in window

## 2.4.3
* [Pull #266](https://github.com/fluid-player/fluid-player/pull/266) Fix play pause issue on mobile
* [Pull #268](https://github.com/fluid-player/fluid-player/pull/268) Fix iOS scrubbing bugs
* [Pull #270](https://github.com/fluid-player/fluid-player/pull/270) Fix for iOS switching to unsupported file types

## 2.4.2
* [Pull #235](https://github.com/fluid-player/fluid-player/pull/235) [Pull #236](https://github.com/fluid-player/fluid-player/pull/236) Fix the controls randomly disappearing on scrubbing clicks

## 2.4.1
* [Pull #228](https://github.com/fluid-player/fluid-player/pull/228) Persistent volume settings from before mute on page navigation 
* [Pull #229](https://github.com/fluid-player/fluid-player/pull/229) Link to FP on menu button working correctly
* [Pull #230](https://github.com/fluid-player/fluid-player/pull/230) Fix for right click on initial play button
* [Pull #227](https://github.com/fluid-player/fluid-player/pull/227) Optional parameter to disable clickthrough layer on instream ads
* [Pull #231](https://github.com/fluid-player/fluid-player/pull/231) Fixes for how thumbnails are drawn and mouse event detection

## 2.4.0
* [Pull #214](https://github.com/fluid-player/fluid-player/pull/241) Avoid looping VAST Ad
* [Pull #206](https://github.com/fluid-player/fluid-player/pull/206) Fix tracking impression events for nonLinear ads 
* [Pull #221](https://github.com/fluid-player/fluid-player/pull/221) Fix VAST loading issue by AdBlock
* [Pull #207](https://github.com/fluid-player/fluid-player/pull/207) Add support for HD icon on quality select
* [Pull #209](https://github.com/fluid-player/fluid-player/pull/209) Advanced theatre mode
* [Pull #208](https://github.com/fluid-player/fluid-player/pull/208) Compress files
* [Pull #179](https://github.com/fluid-player/fluid-player/pull/179) Fix to prevent changing speed during ads
* [Pull #217](https://github.com/fluid-player/fluid-player/pull/217) Prevent video size change on quality switch
* [Pull #213](https://github.com/fluid-player/fluid-player/pull/213) Controls to stay working with adblock and fix for double event on mobile touch
* [Pull #212](https://github.com/fluid-player/fluid-player/pull/212) Poster image to fit player size
* [Pull #186](https://github.com/fluid-player/fluid-player/pull/186) Fix for source switch on Edge
* [Pull #219](https://github.com/fluid-player/fluid-player/pull/219) Play / pause icon fix and progress bar to disappear correctly
* [Pull #218](https://github.com/fluid-player/fluid-player/pull/218) Optional theatre settings

## 2.3.0
* [Pull #192](https://github.com/fluid-player/fluid-player/pull/191) Persist user settings across pages for volume, speed, quality and theatre mode
* [Pull #194](https://github.com/fluid-player/fluid-player/pull/194) Fix for play event on video click for certain devices
* [Pull #193](https://github.com/fluid-player/fluid-player/pull/193) Option to set adText and adTextPosition on a per ad basis
* [Pull #184](https://github.com/fluid-player/fluid-player/pull/184) Fix for thumbnails appearing incorrectly on mobile
* [Pull #181](https://github.com/fluid-player/fluid-player/pull/181) Fix for poster image for dash file
* [Pull #195](https://github.com/fluid-player/fluid-player/pull/195) Loading icon while player is waiting
* [Pull #200](https://github.com/fluid-player/fluid-player/pull/200) Ad text positioning fix
* [Pull #196](https://github.com/fluid-player/fluid-player/pull/196) Fix for issue causing controls to hide incorrectly
* [Pull #191](https://github.com/fluid-player/fluid-player/pull/191) Scrubbing to no longer trigger Fluid on.pause event

## 2.2.2
* [Pull #175](https://github.com/fluid-player/fluid-player/pull/175) Fullscreen mode variable correct place
* [Pull #177](https://github.com/fluid-player/fluid-player/pull/177) Fix fadeOut/fadeIn opacity to correct values in the end of animation
* [Pull #180](https://github.com/fluid-player/fluid-player/pull/180) Adding VASTAdTagURI support

## 2.2.1
* [Pull #153](https://github.com/fluid-player/fluid-player/pull/153) CDATA media file ignores whitespace correctly
* [Pull #154](https://github.com/fluid-player/fluid-player/pull/154) onPauseRoll not showing on source switch
* [Pull #155](https://github.com/fluid-player/fluid-player/pull/155) iOS native fullscreen
* [Pull #156](https://github.com/fluid-player/fluid-player/pull/156) CSS fixes for progress bar and logo
* [Pull #157](https://github.com/fluid-player/fluid-player/pull/157) Fix for onMainVideoEnded firing correctly
* [Pull #158](https://github.com/fluid-player/fluid-player/pull/158) Play / Pause animation to not show when changing source
* [Pull #159](https://github.com/fluid-player/fluid-player/pull/159) Theatre mode to not show in iframe
* [Pull #148](https://github.com/fluid-player/fluid-player/pull/148) Fix for currentTime being set for iOS and safari for ads and source switch
* [Pull #165](https://github.com/fluid-player/fluid-player/pull/165) Fix for video duration if passed as 00:00:00 in the VAST file
* [Pull #167](https://github.com/fluid-player/fluid-player/pull/167) Allow for individual images to be set in .vtt file
* [Pull #169](https://github.com/fluid-player/fluid-player/pull/169) Preview Thumbnail image locations - Ability to set relative path
* [Pull #168](https://github.com/fluid-player/fluid-player/pull/168) Show custom error if XML content-type is wrong
* [Pull #166](https://github.com/fluid-player/fluid-player/pull/166) Bug fix for Error 202  showing up periodically in the console
* [Pull #149](https://github.com/fluid-player/fluid-player/pull/149) Bug fix to remove mainVideoReady eventListener after success

## 2.2.0
* [Pull #121](https://github.com/fluid-player/fluid-player/pull/121) 'Browser layout' VAST fixes
* [Pull #122](https://github.com/fluid-player/fluid-player/pull/122) iOS fullscreen improvements, use native player
* [Pull #125](https://github.com/fluid-player/fluid-player/pull/125) Fix for VAST tag: additional checks for CDATA node irregularity
* [Pull #126](https://github.com/fluid-player/fluid-player/pull/126) Pause player when linear ad opens (ad video is clicked)
* [Pull #127](https://github.com/fluid-player/fluid-player/pull/127) OnPause ad showing on source switch fix
* [Pull #128](https://github.com/fluid-player/fluid-player/pull/128) [Pull #139](https://github.com/fluid-player/fluid-player/pull/139) Poster Image as a param
* [Pull #130](https://github.com/fluid-player/fluid-player/pull/130) Create progressbar markers for nonLinear ads
* [Pull #131](https://github.com/fluid-player/fluid-player/pull/131) [Pull #136](https://github.com/fluid-player/fluid-player/pull/136/) Additional logo parameters
* [Pull #138](https://github.com/fluid-player/fluid-player/pull/138) Support for DASH and HLS streaming
* [Pull #143](https://github.com/fluid-player/fluid-player/pull/143) Positioning of ad and cta text elements

## 2.1.2
* [Pull #108](https://github.com/fluid-player/fluid-player/pull/108) Fullscreen API call fix
* [Pull #110](https://github.com/fluid-player/fluid-player/pull/110) Improvements for iOs safari (use default skin) and mobile screens
* [Pull #111](https://github.com/fluid-player/fluid-player/pull/111) Adjust how iconClickThrough is gotten

## 2.1.1
* [Pull #107](https://github.com/fluid-player/fluid-player/pull/107) Download and Theatre fixes

## 2.1
* [Pull #101](https://github.com/fluid-player/fluid-player/pull/101) Quality indicator
* [Pull #102](https://github.com/fluid-player/fluid-player/pull/102) API functions
* [Pull #103](https://github.com/fluid-player/fluid-player/pull/103) Landing page displayed in In-Stream ads
* [Pull #104](https://github.com/fluid-player/fluid-player/pull/104) Theater mode, download & playback rate

## 2.0
* [Pull #91](https://github.com/fluid-player/fluid-player/pull/91) Version 2 Changes:
  * New default template
  * Add play button
  * Play pause animations
  * Restructuring of optional parameters
  * Remove templates 
  * General fixes 

## 1.2.2
* [Pull #88](https://github.com/fluid-player/fluid-player/pull/88) Improve nonlinear ads

## 1.2.1
* [Pull #86](https://github.com/fluid-player/fluid-player/pull/86) [Pull #87](https://github.com/fluid-player/fluid-player/pull/87) Mid roll current time fix

## 1.2.0
* [Pull #68](https://github.com/fluid-player/fluid-player/pull/68) Controls remain fullscreen after escaping fullscreen
* [Pull #66](https://github.com/fluid-player/fluid-player/pull/66) Optional logoUrl for clickable logo
* [Pull #74](https://github.com/fluid-player/fluid-player/pull/74) Add ability to grab and slide the volume slider and timeline scrubber.
* [Pull #75](https://github.com/fluid-player/fluid-player/pull/75) [Pull #77](https://github.com/fluid-player/fluid-player/pull/77) Adding mid/post roll support and initial VAST nonLinear support.
* [Pull #67](https://github.com/fluid-player/fluid-player/pull/67) Adding key controls.
* [Pull #69](https://github.com/fluid-player/fluid-player/pull/69) Adding controls hiding functionality.

## 1.1.3
* [Pull #50](https://github.com/fluid-player/fluid-player/pull/50) Fix for double double render of blank video on some browsers

## 1.1.2
* [Pull #43](https://github.com/fluid-player/fluid-player/pull/43) Add two new skins.

## 1.1.1
* [Pull #38](https://github.com/fluid-player/fluid-player/pull/38) Reset the CSS box-sizing settings.

## 1.1.0
* [Pull #34](https://github.com/fluid-player/fluid-player/pull/34) Various Improvements:
  * Possibility to allow the user to switch between different video qualities. (Example, 720p, 1080p, etc...)
  * Enable/Disable autoplay.
  * Possibility to set a logo over the video player, with configurable position and opacity.
  * Possibility to show a text when a video ad is being played. (Example : "Advertising")
  * Possibility to show a call to action link when a video ad is being played. (Example : "Click here to learn more about this product.")
  * Improved CSS management.
  * Possibility to show a custom HTML code when the user pauses the video. (For example, a banner ad, or some related video links)
  * The video player can be fully responsive.

## 1.0.2
* [Pull #18](https://github.com/fluid-player/fluid-player/pull/18) [Pull #19](https://github.com/fluid-player/fluid-player/pull/19) Update file names, add in min file versions

## 1.0.1
* [Pull #1](https://github.com/fluid-player/fluid-player/pull/1) Fix a Fluid Player crash when the ad video file is not available. Properly announcing errors if an Error tag is present in the VAST tag.
* [Pull #3](https://github.com/fluid-player/fluid-player/pull/3) Demo layouts. Various bugfixes and improvements.
* [Pull #10](https://github.com/fluid-player/fluid-player/pull/10) Thumbnail previews from vtt file can be overwritten.
* [Pull #11](https://github.com/fluid-player/fluid-player/pull/11) Player shows current play time and video duration in 'default' template.
* [Pull #14](https://github.com/fluid-player/fluid-player/pull/14) Fix a minor issue when playing the video from outside the Fluid Player code.

## 1.0.0
* Initial Release
