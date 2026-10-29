import { test, expect } from '@playwright/test';
import {
    waitForVideoToPlay,
    setVideoCurrentTime,
    getVideoCurrentTime,
    getVideoDuration,
    waitForVideoDurationChange
} from './functions/video';
import { waitForSpecificNetworkCall } from './functions/network';
import { skipAd } from './functions/ads';

test.describe('desktop ads', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        await page.goto('/ads_linear.html');
    });

    test('should navigate to the publishers advertised website on click', async ({ page }) => {
        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');

        // start the video
        await fullPlayer.click();

        // Wait for the preRoll to be clickable
        await page.locator('.vast_clickthrough_layer').waitFor();

        // Listen for the new _blank tab opened by clicking the ad
        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            fullPlayer.click() // click ad to open advertisers link
        ]);

        console.log(`Popup URL: ${popup.url()}`);
        await expect(popup).toHaveURL('http://www.example.com/');

        // Close the popup to prevent extra tabs
        await popup.close();
    });

    test('should fire pre-, mid- and postRoll based on time', async ({ page }) => {
        // Plays three ads
        test.slow();

        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const video = page.locator('video');

        // Start the video
        await fullPlayer.click();

        /**
         * PREROLL
         */
        let adDuration = await skipAd(page);
        await waitForVideoDurationChange(page, adDuration);
        await waitForVideoToPlay(video);

        /**
         * MIDROLL
         */
        // Midrolls don't trigger if you seek less then 5 seconds before their time
        await setVideoCurrentTime(video, 35);
        adDuration = await skipAd(page);
        await waitForVideoDurationChange(page, adDuration);
        await waitForVideoToPlay(video);

        // Check if the video resumes after the midroll at the correct time
        expect(Math.floor(await getVideoCurrentTime(video))).toEqual(39);

        /**
         * POSTROLL
         */
        // Skip to the last 5 seconds: the player loads the postRoll during the last vastTimeout (5s) of the video
        await setVideoCurrentTime(video, (await getVideoDuration(video)) - 5);
        await skipAd(page);

        // Check if video is marked as ended
        await page.waitForFunction(() => {
            const video = document.querySelector('video');
            return video && !video.ended;
        });
    });

    test('ad should not be skipped when the ad countdown is not done', async ({ page }) => {
        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const skipButton = page.locator('.skip_button');

        // Start the video
        await fullPlayer.click();

        // The button is added with the full 2 second countdown
        await skipButton.waitFor();
        await skipButton.click();

        // Still the ad, with the countdown running
        await expect(skipButton).toHaveText(/Skip ad in \d/);

        const adDuration = await skipAd(page);
        await waitForVideoDurationChange(page, adDuration);
    });

    test('impression url should be called', async ({ page }) => {
        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');

        const request = waitForSpecificNetworkCall(
            page,
            'http://www.example.com/impression',
            'GET'
        );

        // start the video
        await fullPlayer.click();

        expect((await request).url()).toBe('http://www.example.com/impression');
    });

});
