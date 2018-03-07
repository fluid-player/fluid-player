---
title: "Demo"
type: homepage
---
## Default Layout

* Supports VAST (Video Ad Serving Template).
* Comes with its own design, which is easily customizable.
* Timeline Preview.
* Lightweight.
* Compatible with modern web browsers.
<br/><br/>

<video id='my-video' controls style="width:720px;height:405px;">
    <source src='video.mp4' type='video/mp4' title="720p" />
    <source src='video360.mp4' type='video/mp4' title="360p" />
</video>

## Custom Themed Layout
* Easily customised with our [primaryColor](../configuration#primaryColor) configuration.
<br/><br/>

<video id='colour-video' controls style="width:720px;height:405px;">
    <source src='video.mp4' type='video/mp4' title="720p" />
    <source src='video360.mp4' type='video/mp4' title="360p" />
</video>

## Browser-Based Layout

* Ability to have more than 1 player per page.
* Ability to use the default video layout for the current browser.
<br/><br/>

<video id='default-video' controls style="width:720px;height:405px;">
    <source src='video.mp4' type='video/mp4' title="720p" />
    <source src='video360.mp4' type='video/mp4' title="360p" />
</video>

## Multiple VAST and NonLinear Ad

* Ability to have more than 1 VAST (example: pre-roll and mid-roll).
* Ability to show non Linear (Banner) ads.
<br/><br/>

<video id='vast-video' controls style="width:720px;height:405px;">
    <source src='video.mp4' type='video/mp4' title="720p" />
    <source src='video360.mp4' type='video/mp4' title="360p" />
</video>

<link rel="stylesheet" href="../fluidplayer/fluidplayer.css" type="text/css"/>
<script src="../fluidplayer/fluidplayer.js"></script>
<script src="fp_generator.js"></script>