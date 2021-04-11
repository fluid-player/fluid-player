
<script src="https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js"></script>
<video id="video-id"><source src="video.mp4" type="video/mp4" />
<script>
    var myFP = fluidPlayer(
        'video-id',	{
	"layoutControls": {
		"controlBar": {
			"autoHideTimeout": 3,
			"animated": true,
			"autoHide": true
		},
		"htmlOnPauseBlock": {
			"html": null,
			"height": null,
			"width": null
		},
		"autoPlay": false,
		"mute": true,
		"allowTheatre": true,
		"playPauseAnimation": false,
		"playbackRateEnabled": false,
		"allowDownload": false,
		"playButtonShowing": false,
		"fillToContainer": false,
		"posterImage": ""
	},
	"vastOptions": {
		"adList": [],
		"adCTAText": false,
		"adCTATextPosition": ""
	}
}
</script>
