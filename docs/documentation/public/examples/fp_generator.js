fluidPlayer(
    'my-video',
    {
        layoutControls: {
            timelinePreview: {
                file: 'thumbnails.vtt',
                type: 'VTT'
            },
            logo: {
                imageUrl: 'fluidplayer.png', // Default null
                position: 'top right', // Default 'top left'
                opacity:  0.5 // Default 1
            },
            responsive: false,
            controlBar: {
                autoHide: false
            }
        },
        vastOptions: {
            adText: 'advertisement',
            adList: [{roll: 'preRoll', vastTag: 'vastLinear.xml'}],
            vastLoadedCallback: function() {console.log('vast loaded');},
            noVastVideoCallback: function() {console.log('no vast');},
            vastVideoSkippedCallback: function() {console.log('vast skipped');},
            vastVideoEndedCallback: function() {console.log('vast ended');},
            playerInitCallback: function() {console.log('Player "test-video" initiation called');},
        }
    }
);

fluidPlayer(
    'colour-video',
    {
        layoutControls: {
            primaryColor: '#28B8ED',
            timelinePreview: {
                file: 'thumbnails.vtt',
                type: 'VTT'
            },
            logo: {
                imageUrl: 'fluidplayer.png', // Default null
                position: 'top right', // Default 'top left'
                opacity:  0.5 // Default 1
            },
            responsive: false,
            controlBar: {
                autoHide: false
            }
        },
        vastOptions: {
            adText: 'advertisement',
            adList: [{roll: 'preRoll', vastTag: 'vastLinear.xml'}],
            vastLoadedCallback: function() {console.log('vast loaded');},
            noVastVideoCallback: function() {console.log('no vast');},
            vastVideoSkippedCallback: function() {console.log('vast skipped');},
            vastVideoEndedCallback: function() {console.log('vast ended');},
            playerInitCallback: function() {console.log('Player "test-video" initiation called');},
        }
    }
);

fluidPlayer(
    'default-video',
    {
        layoutControls: {
            layout: 'browser'
        }
    }
);

fluidPlayer(
    'vast-video',
    {
        layoutControls: {
            timelinePreview: {
                file: 'thumbnails.vtt',
                type: 'VTT'
            },
            logo: {
                imageUrl: 'fluidplayer.png', // Default null
                position: 'top right', // Default 'top left'
                opacity:  0.5 // Default 1
            },
            responsive: false,
            controlBar: {
                autoHide: false
            }
        },
        vastOptions: {
            adText: 'advertisement',
            adList: [
                {
                    roll: 'preRoll',
                    vastTag: 'vastLinear.xml'
                },
                {
                    roll: 'midRoll',
                    vastTag: 'vastNonLinear.xml',
                    timer: 3
                },
                {
                    roll: 'midRoll',
                    vastTag: 'vastLinear.xml',
                    timer: 8
                },
                {
                    roll: 'postRoll',
                    vastTag: 'vastLinear.xml'
                }
            ],
            vastLoadedCallback: function() {console.log('vast loaded');},
            noVastVideoCallback: function() {console.log('no vast');},
            vastVideoSkippedCallback: function() {console.log('vast skipped');},
            vastVideoEndedCallback: function() {console.log('vast ended');},
            playerInitCallback: function() {console.log('Player "test-video" initiation called');},
        }
    }
);