---
date: 2016-08-10T15:00:00+00:00
title: "Fluid Player"
type: homepage
weight: 0
---

## What is Fluid Player
Fluid Player is a free HTML5 video player. It is lightweight, easy to integrate and has advanced VAST capabilities.

<br/>

<video id='my-video' controls style="width:720px;height:405px;">
    <source src='http://cdn.fluidplayer.com/videos/1.3/fluidplayer_1080.mp4' title="1080p" type='video/mp4' />
    <source src='http://cdn.fluidplayer.com/videos/1.3/fluidplayer_720.mp4' title="720p" type='video/mp4' />
    <source src='http://cdn.fluidplayer.com/videos/1.3/fluidplayer_480.mp4' title="480p" type='video/mp4' />
</video>

<link rel="stylesheet" href="fluidplayer/fluidplayer.css" type="text/css"/>
<script src="fluidplayer/fluidplayer.js"></script>
<script src="fluidplayer/fp_generator.js"></script>

## What is VAST
The IAB Digital Video Ad Serving Template (VAST) specification is a universal XML schema for serving ads to digital video players, and describes expected video player behavior when executing VAST-formatted ad responses.

In short, VAST makes it possible for an ad provider to serve ads to various video players using a universal way of communication which all these players understand.

A thorough description of the overall idea behind VAST, as well as the full VAST specification, can be found here: VAST 4.0.

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

## License

Fluid Player is licensed under the MIT License. View the [License File](https://github.com/fluid-player/fluid-player/blob/master/LICENSE).

## Fluid Player CDN

The Fluid Player code is found at https://github.com/fluid-player/ but is also available for direct linking at http://cdn.fluidplayer.com/ 

Specify the version:
```html
https://cdn.fluidplayer.com/1.0.1/fluidplayer.min.js
https://cdn.fluidplayer.com/1.0.1/fluidplayer.min.css
```
Or use the most recent version:
```html
https://cdn.fluidplayer.com/v2/current/fluidplayer.min.js
https://cdn.fluidplayer.com/v2/current/fluidplayer.min.css
```
