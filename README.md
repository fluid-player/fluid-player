# Fluid Player

![Latest version](https://img.shields.io/badge/Latest%20Version-1.0.1-blue.svg)

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
  * `layout`: Several options are available. The default layout is `default`. It provides own skin to the player. Another option is `browser`, meaning that the standard video player layout and behaviour, specific for each browser, is used. Also, a custom layout may be used: in this case there should be a folder with the given name inside the `/templates` folder, containing a file `styles.css`. _Note: on iPhone devices the player always switches automatically to the `browser` layout._
  * `templateLocation`: A custom folder where the template is located.
  * `scriptsLocation`: A custom folder where additional scripts are located.
  * `skipButtonCaption` (VAST only): The text, displayed on the Skip button. The text can contain the placeholder `[seconds]`. The default value is `Skip ad in [seconds]`.
  * `skipButtonClickCaption` (VAST only): The text, displayed when the Skip button is available for clicking.
  * `vastTimeout` (VAST only): The number of milliseconds before the VAST Tag call timeouts. Default: `5000`.
  * Callback functions: can be used to execute custom code when some key events occur. Currently the following events are supported: `vastLoadedCallback`, `noVastVideoCallback`, `vastVideoSkippedCallback`, `vastVideoEndedCallback` and `playerInitCallback`.

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

## <a name="what-is-vast"></a>What is VAST

The IAB Digital Video Ad Serving Template (VAST) specification is a universal XML schema for serving ads to digital video players, and describes expected video player behavior when executing VAST-formatted ad responses.

In short, VAST makes it possible for an ad provider to serve ads to various video players using a universal way of communication which all these players understand.

A thorough description of the overall idea behind VAST, as well as the full VAST specification, can be found here: [VAST 4.0](https://www.iab.com/guidelines/digital-video-ad-serving-template-vast-4-0/).

## License

Fluid Player is licensed under the MIT License. View the [License File](LICENSE).

## Changelog

A full list of changes and updates can be found in the project [CHANGELOG](CHANGELOG.md).
