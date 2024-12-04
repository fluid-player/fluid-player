import { test, expect } from '@playwright/test';
import { waitForVideoToPlay, setVideoCurrentTime, getVideoCurrentTime } from './functions/video';
import { waitForSpecificNetworkCall } from './functions/network';

test.describe('desktop ads', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        await page.goto('/ads_linear.html');
    });

    test('should navigate to the publishers advertised website on click', async ({ page }) => {
        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const video = page.locator('video');

        // start the video
        fullPlayer.click();

        await waitForVideoToPlay(video);

        // Set up a listener for the 'popup' event
        // This listener listens for a new _blank tab to open
        const [popupPromise] = await Promise.all([
            page.waitForEvent('popup'), // Listen for the popup event
            fullPlayer.click() // click ad to open advertisers link
        ]);

        // Prevent the tab from fully opening
        const popup = popupPromise;

        // Verify the URL of the popup
        const popupUrl = popup.url();
        console.log(`Popup URL: ${popupUrl}`);
        expect(popupUrl).toBe('http://www.example.com/');

        // Close the popup to prevent extra tabs, in case the above failed to prevent the opening of the new tab
        await popup.close();
    });

    test('should fire pre-, mid- and postRoll based on time', async ({ page }) => {
        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const skipButton = page.locator('.skip_button');
        const video = page.locator('video');

        // Start the video
        fullPlayer.click();
        await waitForVideoToPlay(video);

        /**
         * PREROLL
         */
        await expect(skipButton).toHaveText(/Skip ad in 2/);
        // Wait for skip ad timer
        await page.waitForTimeout(2500);
        await expect(skipButton).toHaveText(/Skip Ad /);

        // Skip the ad
        await skipButton.click();

        /**
         * MIDROLL
         */
        await page.waitForFunction(() => {
            const videoElement = document.querySelector('video') as HTMLVideoElement;
            // 15 is the length of the ad
            return videoElement && Math.floor(videoElement.duration) !== 15;
        });

        // Midrolls don't trigger if you seek less then 5 seconds before their time
        await setVideoCurrentTime(video, 35);
        await page.waitForTimeout(5500);
        await expect(skipButton).toHaveText(/Skip ad in 2/);
        // Wait for skip ad timer
        await page.waitForTimeout(2500);
        await expect(skipButton).toHaveText(/Skip Ad /);

        // Skip the ad
        await skipButton.click();

        await page.waitForTimeout(500);

        await waitForVideoToPlay(video);

        const currentTime = await getVideoCurrentTime(video);

        // Check if the video resumes after the midroll at the correct time
        expect(Math.floor(currentTime)).toEqual(39);

        /**
         * POSTROLL
         */

        // Skip to the end
        await page.waitForTimeout(500);
        await video.evaluate((videoEl) => {
            const vid = (videoEl as HTMLVideoElement);
            vid.currentTime = Math.max(0, vid.duration) - 1;
        });
        await page.waitForTimeout(1000);
        await expect(skipButton).toHaveText(/Skip ad in 2/);
        // Wait for skip ad timer
        await page.waitForTimeout(2500);
        await expect(skipButton).toHaveText(/Skip Ad /);

        await skipButton.waitFor({ state: 'visible', timeout: 5000 });
        // Skip the ad
        await skipButton.click();

        // Check if video is marked as ended
        await page.waitForFunction(() => {
            const video = document.querySelector('video');
            return video && !video.ended;
        });
    });

    test('ad should not be skipped when the ad countdown is not done', async ({ page }) => {
        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const skipButton = page.locator('.skip_button');
        const video = page.locator('video');

        // Start the video
        fullPlayer.click();

        await page.waitForFunction(() => {
            const videoElement = document.querySelector('video');
            return videoElement && videoElement.duration > 0;
        }, { timeout: 5000 });

        const adDuration = await video.evaluate((vid) => {
            const videoElement = vid as HTMLVideoElement;
            return videoElement.duration;
        });

        // Click the button but it should not be skipped
        // NOTE: don't add 'await' because it will wait until it can skip
        skipButton.click();

        // If the ad still has the same video duration, that means the video is not skipped
        const videoDurationAfterClick = await video.evaluate((vid) => {
            const videoElement = vid as HTMLVideoElement;
            return videoElement.duration;
        });

        expect(videoDurationAfterClick).not.toBeFalsy();
        expect(adDuration).not.toBeFalsy();

        expect(videoDurationAfterClick).toEqual(adDuration);

        await page.waitForTimeout(2000);
        // Skip Ad
        await skipButton.click();
        await page.waitForTimeout(500);

        const videoDuration = await video.evaluate((vid) => {
            const videoElement = vid as HTMLVideoElement;
            return videoElement.duration;
        });

        expect(videoDuration).not.toBeFalsy();
        expect(adDuration).not.toBeFalsy();

        expect(videoDuration).not.toEqual(adDuration);
    });

    test('impression url should be called', async ({ page }) => {
        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');

        // start the video
        fullPlayer.click();

        const request = await waitForSpecificNetworkCall(
            page,
            'http://www.example.com/impression',
            'GET'
        );

        expect(request.url()).toBe('http://www.example.com/impression');
    });

});

