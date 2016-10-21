# Fluid Player

![Latest version](https://img.shields.io/badge/Latest%20Version-1.0.0-blue.svg)

## Overview

Fluid Player is a new free HTML5 video player. It is lightweight, easy to integrate and has advanced VAST[\*](#what-is-vast) capabilities.

## Features
* Supports the VAST standard.
* Comes with its own design, which is easily customizable. Ability to use the browser default layout.
* Timeline Preview.
* Lightweight.
* Compatible with modern web browsers.
* Ability to have more than 1 player per page.

![Fluid Player - VAST Ad](examples/ScreenshotFluidPlayerVastAd.jpg)

![Fluid Player](examples/ScreenshotFluidPlayerMain.jpg)

## Integration Guide

### Quick Integration

In order to set Fluid Player, three things are required:
* The Javascript and CSS files of the player;
* An HTML5 `<video>` tag;
* A single Javascript line of code that attaches the player to the video tag.

```html
<link rel="stylesheet" href="vast.css" type="text/css"/>
<script src="vast.js"></script>

<video id='my-video' controls style="width: 640px; height: 360px;">
	<source src='vid.mp4' type='video/mp4' />		
</video>

<script type="text/javascript">
	var testVideo = fluidPlayer('my-video');
</script>
```

The `fluidVideo()` function gets the video tag id as a first parameter, which is the only required one.

### Integration Using Optional Parameters

Fluid Player can be customized by setting some optional parameters:

```html
<link rel="stylesheet" href="vast.css" type="text/css"/>
<script src="vast.js"></script>

<video id='my-video' controls style="width: 640px; height: 360px;">
	<source src='vid.mp4' type='video/mp4' />		
</video>

<script type="text/javascript">
	var testVideo = fluidPlayer(
        'my-video',
        'http://example.com/vast.xml',
        {
            timelinePreview: {
                file: 'thumbnails.vtt',
                type: 'VTT'
            },
            layout: 'default',
            vastLoadedCallback: function() {console.log('vast loaded')},
            noVastVideoCallback: function() {console.log('no vast')},
            vastVideoSkippedCallback: function() {console.log('vast skipped')},
            vastVideoEndedCallback: function() {console.log('vast ended')}
        }
    );
</script>
```

### Syntax

```
fluidPlayer(idVideoPlayer[, vastTag, options]);
```

#### Parameters

Here is a description of the parameters which can be used when setting Fluid Player:

* `idVideoPlayer`: The id of the html video tag, containing the main video to be played.
* `vastTag`: The URL of the VAST Tag, which returns an XML describing the VAST ad to be displayed.
* `options`: Various options for tweaking the appearance and behaviour of the player:
  * `timelinePreview`: Sets the timeline preview, visible when hovering over the progress bar. The provided `file` contains a description of the thumbnail images used for the preview. The `type` sets the format of the file. Currently only the VTT format is supported. The timeline preview only works if the `default` layout is chosen (see below).
  * `layout`: Two options are available. The default layout is `default`. It provides own skin to the player. The other option is `browser`. There, the standard video player layout and behaviour, specific for each browser, is used. _Note: on iPhone devices the `default` layout is not available, so the player switches automatically to `browser` layout._
  * `customCssFile`: If "default" layout is chosen, a custom CSS file can be used instead the default one.
  * `customClassName`: When a custom CSS file is used, the video wrapper (id="fluid_video_wrapper_<VIDEO PLAYER ID>") will have this additional class name assigned.
  * `skipButtonCaption` (VAST only): The text, displayed on the Skip button. The text can contain the placeholder `[seconds]`. The default value is `Skip ad in [seconds]`.
  * `skipButtonClickCaption` (VAST only): The text, displayed when the Skip button is available for clicking.
  * `vastTimeout` (VAST only): The number of milliseconds before the VAST Tag call timeouts. Default: `5000`.
  * Callback functions: can be used to execute custom code when some key events occur. Currently the following events are supported: `vastLoadedCallback`, `noVastVideoCallback`, `vastVideoSkippedCallback` and `vastVideoEndedCallback`.

## Layout Customization

When Fluid Player is set to use its `default` layout, it automatically loads the [styles/default_layout.css](styles/default_layout.css) CSS file. It also loads the [Material Icons font](https://design.google.com/icons/), used to display the symbols of the buttons.
The easiest way to change the layout is to edit the [styles/default_layout.css](styles/default_layout.css) CSS file of the local copy of Fluid Player.

## <a name="what-is-vast"></a>What is VAST

The IAB Digital Video Ad Serving Template (VAST) specification is a universal XML schema for serving ads to digital video players, and describes expected video player behavior when executing VAST-formatted ad responses.

In short, VAST makes it possible for an ad provider to serve ads to various video players using a universal way of communication which all these players understand.

A thorough description of the overall idea behind VAST, as well as the full VAST specification, can be found here: [VAST 4.0](https://www.iab.com/guidelines/digital-video-ad-serving-template-vast-4-0/).

## License

Fluid Player is licensed under the MIT License. View the [License File](LICENSE).

## Changelog

A full list of changes and updates can be found in the project [CHANGELOG](CHANGELOG.md).
