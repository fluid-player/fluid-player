# CHANGELOG

## Next release
* [Pull #177](https://github.com/fluid-player/fluid-player/pull/177) Fix fadeOut/fadeIn opacity to correct values in the end of animation

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
