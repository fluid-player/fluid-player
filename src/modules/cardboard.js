'use strict';
export default function (playerInstance, options) {
    playerInstance.createCardboardJoystickButton = (identity) => {
        const vrJoystickPanel = document.getElementById(playerInstance.videoPlayerId + '_fluid_vr_joystick_panel');
        const joystickButton = document.createElement('div');

        joystickButton.id = playerInstance.videoPlayerId + '_fluid_vr_joystick_' + identity;
        joystickButton.className = 'fluid_vr_button fluid_vr_joystick_' + identity;
        vrJoystickPanel.appendChild(joystickButton);

        return joystickButton;
    };

    playerInstance.cardboardRotateLeftRight = (param /* 0 - right, 1 - left */) => {
        const go = playerInstance.vrROTATION_POSITION;
        const back = -playerInstance.vrROTATION_POSITION;
        const pos = param < 1 ? go : back;
        const easing = {val: pos};
        const tween = new TWEEN.Tween(easing)
            .to({val: 0}, playerInstance.vrROTATION_SPEED)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(function () {
                playerInstance.vrViewer.OrbitControls.rotateLeft(easing.val)
            }).start();
    };

    playerInstance.cardboardRotateUpDown = (param /* 0 - down, 1- up */) => {
        const go = playerInstance.vrROTATION_POSITION;
        const back = -playerInstance.vrROTATION_POSITION;
        const pos = param < 1 ? go : back;
        const easing = {val: pos};
        const tween = new TWEEN.Tween(easing)
            .to({val: 0}, playerInstance.vrROTATION_SPEED)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(function () {
                playerInstance.vrViewer.OrbitControls.rotateUp(easing.val)
            }).start();
    };

    playerInstance.createCardboardJoystick = () => {
        const vrContainer = document.getElementById(playerInstance.videoPlayerId + '_fluid_vr_container');

        // Create a JoyStick and append to VR container
        const vrJoystickPanel = document.createElement('div');
        vrJoystickPanel.id = playerInstance.videoPlayerId + '_fluid_vr_joystick_panel';
        vrJoystickPanel.className = 'fluid_vr_joystick_panel';
        vrContainer.appendChild(vrJoystickPanel);

        // Create Joystick buttons
        const upButton = playerInstance.createCardboardJoystickButton('up');
        const leftButton = playerInstance.createCardboardJoystickButton('left');
        const rightButton = playerInstance.createCardboardJoystickButton('right');
        const downButton = playerInstance.createCardboardJoystickButton('down');
        const zoomDefaultButton = playerInstance.createCardboardJoystickButton('zoomdefault');
        const zoomInButton = playerInstance.createCardboardJoystickButton('zoomin');
        const zoomOutButton = playerInstance.createCardboardJoystickButton('zoomout');

        // Camera movement buttons
        upButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateUp(-0.1);
            playerInstance.cardboardRotateUpDown(1);
        });

        downButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateUp(0.1);
            playerInstance.cardboardRotateUpDown(0);
        });

        rightButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateLeft(0.1);
            playerInstance.cardboardRotateLeftRight(0);
        });

        leftButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateLeft(-0.1);
            playerInstance.cardboardRotateLeftRight(1);
        });

        zoomDefaultButton.addEventListener('click', function () {
            playerInstance.vrViewer.camera.fov = 60;
            playerInstance.vrViewer.camera.updateProjectionMatrix();
        });

        // Camera Zoom buttons
        zoomOutButton.addEventListener('click', function () {
            playerInstance.vrViewer.camera.fov *= 1.1;
            playerInstance.vrViewer.camera.updateProjectionMatrix();
        });

        zoomInButton.addEventListener('click', function () {
            playerInstance.vrViewer.camera.fov *= 0.9;
            playerInstance.vrViewer.camera.updateProjectionMatrix();
        });

    };

    playerInstance.cardBoardResize = () => {
        playerInstance.domRef.player.addEventListener('theatreModeOn', function () {
            playerInstance.vrViewer.onWindowResize();
        });

        playerInstance.domRef.player.addEventListener('theatreModeOff', function () {
            playerInstance.vrViewer.onWindowResize();
        });
    };

    playerInstance.cardBoardSwitchToNormal = () => {
        const vrJoystickPanel = document.getElementById(playerInstance.videoPlayerId + '_fluid_vr_joystick_panel');
        const controlBar = document.getElementById(playerInstance.videoPlayerId + '_fluid_controls_container');
        const videoPlayerTag = playerInstance.domRef.player;

        playerInstance.vrViewer.enableEffect(PANOLENS.MODES.NORMAL);
        playerInstance.vrViewer.onWindowResize();
        playerInstance.vrMode = false;

        // remove dual control bar
        const newControlBar = videoPlayerTag.parentNode.getElementsByClassName('fluid_vr2_controls_container')[0];
        videoPlayerTag.parentNode.removeChild(newControlBar);

        if (playerInstance.displayOptions.layoutControls.showCardBoardJoystick && vrJoystickPanel) {
            vrJoystickPanel.style.display = "block";
        }
        controlBar.classList.remove("fluid_vr_controls_container");

        // show volume control bar
        const volumeContainer = document.getElementById(playerInstance.videoPlayerId + '_fluid_control_volume_container');
        volumeContainer.style.display = "block";

        // show all ads overlays if any
        const adCountDownTimerText = document.getElementById('ad_countdown' + playerInstance.videoPlayerId);
        const ctaButton = document.getElementById(playerInstance.videoPlayerId + '_fluid_cta');
        const addAdPlayingTextOverlay = document.getElementById(playerInstance.videoPlayerId + '_fluid_ad_playing');
        const skipBtn = document.getElementById('skip_button_' + playerInstance.videoPlayerId);

        if (adCountDownTimerText) {
            adCountDownTimerText.style.display = 'block';
        }

        if (ctaButton) {
            ctaButton.style.display = 'block';
        }

        if (addAdPlayingTextOverlay) {
            addAdPlayingTextOverlay.style.display = 'block';
        }

        if (skipBtn) {
            skipBtn.style.display = 'block';
        }
    };

    playerInstance.cardBoardHideDefaultControls = () => {
        const vrJoystickPanel = document.getElementById(playerInstance.videoPlayerId + '_fluid_vr_joystick_panel');
        const initialPlay = document.getElementById(playerInstance.videoPlayerId + '_fluid_initial_play');
        const volumeContainer = document.getElementById(playerInstance.videoPlayerId + '_fluid_control_volume_container');

        // hide the joystick in VR mode
        if (playerInstance.displayOptions.layoutControls.showCardBoardJoystick && vrJoystickPanel) {
            vrJoystickPanel.style.display = "none";
        }

        // hide big play icon
        if (initialPlay) {
            document.getElementById(playerInstance.videoPlayerId + '_fluid_initial_play').style.display = "none";
            document.getElementById(playerInstance.videoPlayerId + '_fluid_initial_play_button').style.opacity = "1";
        }

        // hide volume control bar
        volumeContainer.style.display = "none";

    };

    playerInstance.cardBoardCreateVRControls = () => {
        const controlBar = document.getElementById(playerInstance.videoPlayerId + '_fluid_controls_container');

        // create and append dual control bar
        const newControlBar = controlBar.cloneNode(true);
        newControlBar.removeAttribute('id');
        newControlBar.querySelectorAll('*').forEach(function (node) {
            node.removeAttribute('id');
        });

        newControlBar.classList.add("fluid_vr2_controls_container");
        playerInstance.domRef.player.parentNode.insertBefore(newControlBar, playerInstance.domRef.player.nextSibling);
        playerInstance.copyEvents(newControlBar);
    };

    playerInstance.cardBoardSwitchToVR = () => {
        const controlBar = document.getElementById(playerInstance.videoPlayerId + '_fluid_controls_container');

        playerInstance.vrViewer.enableEffect(PANOLENS.MODES.CARDBOARD);

        playerInstance.vrViewer.onWindowResize();
        playerInstance.vrViewer.disableReticleControl();

        playerInstance.vrMode = true;

        controlBar.classList.add("fluid_vr_controls_container");

        playerInstance.cardBoardHideDefaultControls();
        playerInstance.cardBoardCreateVRControls();

        // hide all ads overlays
        const adCountDownTimerText = document.getElementById('ad_countdown' + playerInstance.videoPlayerId);
        const ctaButton = document.getElementById(playerInstance.videoPlayerId + '_fluid_cta');
        const addAdPlayingTextOverlay = document.getElementById(playerInstance.videoPlayerId + '_fluid_ad_playing');
        const skipBtn = document.getElementById('skip_button_' + playerInstance.videoPlayerId);

        if (adCountDownTimerText) {
            adCountDownTimerText.style.display = 'none';
        }

        if (ctaButton) {
            ctaButton.style.display = 'none';
        }

        if (addAdPlayingTextOverlay) {
            addAdPlayingTextOverlay.style.display = 'none';
        }

        if (skipBtn) {
            skipBtn.style.display = 'none';
        }

    };

    playerInstance.cardBoardMoveTimeInfo = () => {
        const timePlaceholder = document.getElementById(playerInstance.videoPlayerId + '_fluid_control_duration');
        const controlBar = document.getElementById(playerInstance.videoPlayerId + '_fluid_controls_container');

        timePlaceholder.classList.add("cardboard_time");
        controlBar.appendChild(timePlaceholder);

        // override the time display function for this instance
        playerInstance.controlDurationUpdate = function () {

            const currentPlayTime = playerInstance.formatTime(playerInstance.domRef.player.currentTime);
            const totalTime = playerInstance.formatTime(playerInstance.currentVideoDuration);
            const timePlaceholder = playerInstance.domRef.player.parentNode.getElementsByClassName('fluid_control_duration');

            let durationText = '';

            if (playerInstance.isCurrentlyPlayingAd) {
                durationText = "<span class='ad_timer_prefix'>AD : </span>" + currentPlayTime + ' / ' + totalTime;

                for (let i = 0; i < timePlaceholder.length; i++) {
                    timePlaceholder[i].classList.add("ad_timer_prefix");
                }

            } else {
                durationText = currentPlayTime + ' / ' + totalTime;

                for (let i = 0; i < timePlaceholder.length; i++) {
                    timePlaceholder[i].classList.remove("ad_timer_prefix");
                }
            }

            for (let i = 0; i < timePlaceholder.length; i++) {
                timePlaceholder[i].innerHTML = durationText;
            }
        }
    };

    playerInstance.cardBoardAlterDefaultControls = () => {
        playerInstance.cardBoardMoveTimeInfo();
    };

    playerInstance.createCardboardView = () => {
        // Create a container for 360degree
        const vrContainer = document.createElement('div');
        vrContainer.id = playerInstance.videoPlayerId + '_fluid_vr_container';
        vrContainer.className = 'fluid_vr_container';
        playerInstance.domRef.player.parentNode.insertBefore(vrContainer, playerInstance.domRef.player.nextSibling);

        // OverRide some conflicting functions from panolens
        PANOLENS.VideoPanorama.prototype.pauseVideo = function () {
        };
        PANOLENS.VideoPanorama.prototype.playVideo = function () {
        };

        playerInstance.vrPanorama = new PANOLENS.VideoPanorama('', {
            videoElement: playerInstance.domRef.player,
            autoplay: playerInstance.displayOptions.layoutControls.autoPlay,
            loop: !!playerInstance.displayOptions.layoutControls.loop
        });

        playerInstance.vrViewer = new PANOLENS.Viewer({
            container: vrContainer,
            controlBar: true,
            controlButtons: [],
            enableReticle: false
        });
        playerInstance.vrViewer.add(playerInstance.vrPanorama);

        playerInstance.vrViewer.enableEffect(PANOLENS.MODES.NORMAL);
        playerInstance.vrViewer.onWindowResize();

        // if Mobile device then enable controls using gyroscope
        if (playerInstance.getMobileOs().userOs === 'Android' || playerInstance.getMobileOs().userOs === 'iOS') {
            playerInstance.vrViewer.enableControl(1);
        }

        // Make Changes for default skin
        playerInstance.cardBoardAlterDefaultControls();

        // resize on toggle theater mode
        playerInstance.cardBoardResize();

        // Store initial camera position
        playerInstance.vrViewer.initialCameraPosition = JSON.parse(JSON.stringify(playerInstance.vrViewer.camera.position));

        if (playerInstance.displayOptions.layoutControls.showCardBoardJoystick) {
            if (!(playerInstance.getMobileOs().userOs === 'Android' || playerInstance.getMobileOs().userOs === 'iOS')) {
                playerInstance.createCardboardJoystick();
            }
            // Disable zoom if showing joystick
            playerInstance.vrViewer.OrbitControls.noZoom = true;
        }

        playerInstance.trackEvent(playerInstance.domRef.player.parentNode, 'click', '.fluid_control_cardboard', function () {
            if (playerInstance.vrMode) {
                playerInstance.cardBoardSwitchToNormal();
            } else {
                playerInstance.cardBoardSwitchToVR();
            }
        });
    };

    playerInstance.createCardboard = () => {
        if (!playerInstance.displayOptions.layoutControls.showCardBoardView) {
            return;
        }

        document
            .getElementById(playerInstance.videoPlayerId + '_fluid_control_cardboard')
            .style
            .display = 'inline-block';

        if (!window.PANOLENS) {
            import(/* webpackChunkName: "panolens" */ 'panolens').then((it) => {
                window.PANOLENS = it;
                playerInstance.createCardboardView();
            });
        } else {
            playerInstance.createCardboardView();
        }
    };
}
