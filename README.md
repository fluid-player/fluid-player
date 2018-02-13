# Fluid Player
[![Latest version](https://img.shields.io/badge/Latest%20Version-1.2.0-blue.svg)](https://github.com/fluid-player/fluid-player/releases/latest)

## Overview

Fluid Player is a new free HTML5 video player. It is lightweight, easy to integrate and has advanced VAST[\*](#what-is-vast) capabilities.

## Features
* Supports the VAST standard
  * Multiple VAST tags (pre-roll, mid-roll, post-roll)
  * Linear (video) ads
  * Non linear VAST tags (banner images (gif/jpg/png))
* Comes with its own design, which is easily customizable. Ability to use the browser default layout
* Timeline Preview
* Lightweight
* Responsive
* Compatible with modern web browsers
* Ability to have more than 1 player per page
* Keyboard Shortcuts by key
* Allows adding multiple video sources for user to switch between different video quality
* Autoplay control
* Allows adding a custom logo
* Custom call to action text when playing a video ad
* Wordpress Plugin
* Scripts and resources available via CDN

![Fluid Player - VAST Ad](examples/ScreenshotFluidPlayerVastAd.jpg)

![Fluid Player](examples/ScreenshotFluidPlayerMain.jpg)

## Integration Guide

### Quick Integration

In order to set Fluid Player, three things are required:
* The Javascript and CSS files of the player;
* An HTML5 `<video>` tag;
* A single Javascript line of code that attaches the player to the video tag.

```html
<link rel="stylesheet" href="https://cdn.fluidplayer.com/current/fluidplayer.min.css" type="text/css"/>
<script src="https://cdn.fluidplayer.com/current/fluidplayer.min.js"></script>

<video id='my-video' controls style="width: 640px; height: 360px;">
	<source src='vid.mp4' type='video/mp4' />
</video>

<script type="text/javascript">
	var testVideo = fluidPlayer('my-video');
</script>
```

The `fluidPlayer()` function gets the video tag id as a first parameter, which is the only required one.

### Integration Using Optional Parameters

Fluid Player can be customized by setting some optional parameters:

```html
<link rel="stylesheet" href="fluidplayer.css" type="text/css"/>
<script src="fluidplayer.js"></script>

<video id='my-video' controls style="width: 640px; height: 360px;">
	<source src='vid.mp4' type='video/mp4' />
</video>

<script type="text/javascript">
	var testVideo = fluidPlayer(
        'my-video',
        {
            timelinePreview: {
                file: 'thumbnails.vtt',
                type: 'VTT'
            },
            layout: 'default',
            vastLoadedCallback: function() {console.log('vast loaded')},
            noVastVideoCallback: function() {console.log('no vast')},
            vastVideoSkippedCallback: function() {console.log('vast skipped')},
            vastVideoEndedCallback: function() {console.log('vast ended')},
            adList: [{roll: 'preRoll', vastTag: 'http://example.com/vast.xml'}]
        }
    );
</script>
```

Player can switch video quality by providing different video files:

```html
<video id='my-video' controls style="width: 640px; height: 360px;">
	<source src='vid_480p.mp4' title='480p' type='video/mp4' />
	<source src='vid_720p.mp4' title='720p' type='video/mp4' />
	<source src='vid_1080p.mp4' title='1080p' type='video/mp4' />
</video>
```

### Syntax

```
fluidPlayer(idVideoPlayer[, vastTag, options]);
```

#### Parameters

Here is a description of the parameters which can be used when setting Fluid Player:

* `idVideoPlayer`: The id of the html video tag, containing the main video to be played.
* `options`: Various options for tweaking the appearance and behaviour of the player:
  * `timelinePreview`: Sets the timeline preview, visible when hovering over the progress bar. The provided `file` contains a description of the thumbnail images used for the preview. The `type` sets the format of the file. Currently only the VTT format is supported. The timeline preview only works if the `default` layout is chosen (see below).
  * `layout`: Several options are available. The default layout is `default`. It provides own skin to the player. Another option is `browser`, meaning that the standard video player layout and behaviour, specific for each browser, is used. Also, a custom layout may be used: in this case there should be a folder with the given name inside the `/templates` folder, containing a file `styles.css`. _Note: on iPhone devices the player always switches automatically to the `browser` layout._
  * `templateLocation`: A custom folder where the template is located.
  * `scriptsLocation`: A custom folder where additional scripts are located.
  * `skipButtonCaption` (VAST only): The text, displayed on the Skip button. The text can contain the placeholder `[seconds]`. The default value is `Skip ad in [seconds]`.
  * `closeButtonCaption` (VAST only): The alt text, displayed on the Close button.
  * `skipButtonClickCaption` (VAST only): The text, displayed when the Skip button is available for clicking.
  * `vastTimeout` (VAST only): The number of milliseconds before the VAST Tag call timeouts. Default: `5000`.
  * Callback functions: can be used to execute custom code when some key events occur. Currently the following events are supported: `vastLoadedCallback`, `noVastVideoCallback`, `vastVideoSkippedCallback`, `vastVideoEndedCallback` and `playerInitCallback`.
  * `autoPlay`: Starts playing video file after load. Note: on most mobile browsers auto play is disabled by the browser. Default: `false`.
  * `logo`: Put a logo image on the video player by providing the image URL. Default: `null`.
  * `logoPosition`: If `logo` option is set then this parameter sets the position of the logo on the player. Accept a string with one or two values: `top`, `bottom`; `left`, `right`. Default: `top left`.
  * `logoOpacity`:  If `logo` option is set this set opacity for logo image, can be a float value from `0` to `1`. Default: `1`.
  * `logoUrl`:  An optional URL. If the user clicks the logo this URL will be opened in a new tab.
  * `adText` (VAST only): Optional text to be shown on top right corner while an ad is playing. Default: `null`.
  * `adCTAText` (VAST only): Optional call to action text that is shown while an ad is playing. When the button is clicked, the ad URL is open in a new tab. Default: `null`.
  * `htmlOnPauseBlock`: A string that could contain any html to be displayed in the center of the player when the user pauses the video. Note: Clicking on the HTML area triggers a play event. If you don't need that behaviour then add `e.stopPropagation()` to your event. Default: `null`.
  * `htmlOnPauseBlockHeight`: An integer. if `htmlOnPauseBlock` is set, then it sets the container height. Default: `null` .
  * `htmlOnPauseBlockWidth`: An integer. if `htmlOnPauseBlock` is set, then it sets the container width. Default: `null`.
  * `responsive`: If set to `true`, the player will stretch horizontally to 100% of its parent container width. Default: `false`.
  * `adList` (VAST only): Setup one or multiple VastTag.
    * `roll` (mandatory): The available timeline positions: `preRoll`, `midRoll`, `postRoll`.
    * `vastTag` (mandatory): The url of the VAST XML (Please find the supported tags/attributes [vastLinear.xml](examples/vastLinear.xml))
    * `timer` (only for mid-roll): the `timer` property schedules the Ad as below:
      * `timer: number` Ad plays after the specified number of seconds (Example `timer: 10`)
      * `timer: 'xx%'` Ad plays after xx percent of the content
    `adList` example 1: play a pre-roll Ad at the beginning of the video and a mid-roll Ad after 8 seconds:
    ```javascript
    // ...
    adList: [
        {
            roll: 'preRoll',
            vastTag: 'vastPreRoll.xml'
        },
        {
            roll: 'midRoll',
            vastTag: 'vastMidRoll.xml',
            timer: 8
        }
    ]
    // ...
    ```
    It is possible to set multiple mid-roll Ads however only one pre-roll and one post-roll Ad is supported.
    `adList` example 2: for showing two mid-roll Ads:
    ```javascript
    // ...
    adList: [
        {
            roll: 'midRoll',
            vastTag: 'vastMidRoll.xml',
            timer: 10
        },
        {
            roll: 'midRoll',
            vastTag: 'vastMidRoll.xml',
            timer: '50%'
        }
    ]
    // ...
    ```
  * `mute`: If set to `true`, the player will be muted by default on page load. Default: `  false`.
  * `controlBar`: Autohiding the control bar after 3 seconds. The feature is disabled by default. To enable set:
    ```javascript
    // ...
    controlBar: {
        autoHide: true
        }
    // ...
    ```
    Some customization options are available for the controlBar:
    * `autoHide: true/false` Turn the feature on/off. Default: `false`
    * `autoHideTimeout: number` The number of seconds before hiding the control bar. Default: `3`
    * `animated: true/false` Enable/disable the fade out effect. Default: `true`
  * `keyboardControl: true/false` Enable/disable the keyboard shortcuts. Find more details here:[Keyboard Shortcuts](#keyboard-shortcuts)

### Integration with popular frameworks

#### Wordpress

We developed a plugin to embed Fluid Player in Wordpress blogs:
https://wordpress.org/plugins/fluid-player/

Fluid Player can be easily embedded by using the custom [fluid-player] shortcode.
The initial version accepts the following list of named parameters:

  * video : path to actual video to be used by the player. If no value is passed it will fall back to the plugin sample video.
  * vast_file : path to vast file (optional)
  * vtt_file : path to VTT file (optional)
  * vtt_sprite : path to VTT sprites file (optional)
  * layout : any of the following themes are provided with the player: default/funky/metal, if no value is passed it will fall back to 'default'

Provided below is a generic example of how such a call would look like:

```
[fluid-player video="foo.mp4" vast_file="vast.xml"  vtt_file="thumbs.vtt" vtt_sprite="thumbs.jpg" layout="default"]
```

For more information visit the Wordpress hosted plugin page.

## Layout Customization

Fluid Player supports customization of its look. It is even possible to have several instances of the player, using different skins, on the same page.

The easiest way to create a custom skin is to make a copy of one of the existing templates, located in separate folders inside the `/templates/` folder. Then, it can be modified to implement the new skin.

When loading a template, the video wrapper element of the player (`id="fluid_video_wrapper_<VIDEO PLAYER ID>"`) will have the template name as an additional class name assigned, prefiexed with `fluid_player_layout_`. This makes it possible for several templates to be used on different instances of Fluid Player on the same page.

For example, if a new skin, called `my_custom_skin` is created, all CSS selectors should start with `.fluid_video_wrapper.fluid_player_layout_my_custom_skin`.

## Keyboard Shortcuts
  * `Space/Enter`: Pause/Play video playback
  * `Left/Right arrow`: Go back/forward 5 seconds
  * `Home/End`: Go to beginning/end of video
  * `Numbers 0-9`: Skip to a particular section of the video (e.g., 5 goes to the video midpoint)
  * `Up/Down arrow`: Increase/Decrease volume 5%
  * `m key`: Mute/Unmute video volume
  * `f key`: Go to Full Screen mode

## <a name="what-is-vast"></a>What is VAST

The IAB Digital Video Ad Serving Template (VAST) specification is a universal XML schema for serving ads to digital video players, and describes expected video player behavior when executing VAST-formatted ad responses.

In short, VAST makes it possible for an ad provider to serve ads to various video players using a universal way of communication which all these players understand.

A thorough description of the overall idea behind VAST, as well as the full VAST specification, can be found here: [VAST 4.0](https://www.iab.com/guidelines/digital-video-ad-serving-template-vast-4-0/).

## License

Fluid Player is licensed under the MIT License. View the [License File](LICENSE).

## Changelog

A full list of changes and updates can be found in the project [CHANGELOG](CHANGELOG.md).

## Fluid Player CDN

The Fluid Player code is found at https://github.com/fluid-player/ but is also available for direct linking at http://cdn.fluidplayer.com/ 

Specify the version:
```html  
https://cdn.fluidplayer.com/1.0.2/fluidplayer.min.js
https://cdn.fluidplayer.com/1.0.2/fluidplayer.min.css
```
Or use the most recent version:
```html  
https://cdn.fluidplayer.com/current/fluidplayer.min.js
https://cdn.fluidplayer.com/current/fluidplayer.min.css
```
