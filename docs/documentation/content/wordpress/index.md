---
title: "WordPress"
type: homepage
---

A plugin has been developed to embed Fluid Player in WordPress blogs:
https://wordpress.org/plugins/fluid-player/

Fluid Player can be easily embedded by using the custom [fluid-player] shortcode.
The initial version accepts the following list of named parameters:

  * **video:** path to actual video to be used by the player. If no value is passed it will fall back to the plugin sample video.
  * **vast_file:** path to vast file (optional)
  * **vtt_file:** path to VTT file (optional)
  * **vtt_sprite:** path to VTT sprites file (optional)
  * **layout:** any of the following themes are provided with the player: default/funky/metal, if no value is passed it will fall back to 'default'

Provided below is a generic example of how such a call would look like:

```
[fluid-player video="foo.mp4" vast_file="vast.xml"  vtt_file="thumbs.vtt" vtt_sprite="thumbs.jpg" layout="default"]
```

For more information visit the Wordpress hosted plugin page.