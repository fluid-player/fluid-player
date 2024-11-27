import { test, expect } from '@playwright/test';

test.describe('desktop ads', () => {
    test('should navigate to the publishers advertised website on click', async ({ page }) => {
        await page.goto('/ads_linear.html');

        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');

        // start the video
        fullPlayer.click();

        // Wait for video to start playing
        await page.waitForFunction(() => {
            const video = document.querySelector('video');
            return video && !video.paused;
        });

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
        await page.goto('/ads_linear.html');

        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const skipButton = page.locator('.skip_button');

        // Start the video
        fullPlayer.click();
        // Wait for video to start playing
        await page.waitForFunction(() => {
            const video = document.querySelector('video');
            return video && !video.paused;
        });

        /**
         * PREROLL
         */
        await expect(skipButton).toHaveText(/Skip ad in 2/);
        // Wait for skip ad timer
        await page.waitForTimeout(2500);
        await expect(skipButton).toHaveText(/Skip Ad /);

        // Skip the ad
        skipButton.click();

        /**
         * MIDROLL
         */
        const video = page.locator('video');

        await video.evaluate((vid) => {
            (vid as HTMLVideoElement).currentTime = 4;
        });

        await page.waitForTimeout(2000);
        await expect(skipButton).toHaveText(/Skip ad in 2/);
        // Wait for skip ad timer
        await page.waitForTimeout(2500);
        await expect(skipButton).toHaveText(/Skip Ad /);

         // Skip the ad
         skipButton.click();

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

        // Skip the ad
        skipButton.click();

        // Check if video is marked as ended
        await page.waitForFunction(() => {
            const video = document.querySelector('video');
            return video && !video.ended;
        });
    });

    test('ad should not be skipped when the ad countdown is not done', async ({ page }) => {
        await page.goto('/ads_linear.html');

        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const skipButton = page.locator('.skip_button');
        const video = page.locator('video');


        // Start the video
        fullPlayer.click();

        await page.waitForFunction(() => {
            const videoElement = document.querySelector('video');
            return videoElement && videoElement.duration > 0;
        }, { timeout: 5000 });

        // Click the button but it should not be skipped
        skipButton.click();

        // TODO: check if duration is still the same

        const adDuration = await video.evaluate((vid) => {
            const videoElement = vid as HTMLVideoElement;
            return videoElement.duration;
        });

        await page.waitForTimeout(2000);
        // Skip Ad
        skipButton.click();
        await page.waitForTimeout(500);

        const videoDuration = await video.evaluate((vid) => {
            const videoElement = vid as HTMLVideoElement;
            return videoElement.duration;
        });

        expect(videoDuration).not.toBeFalsy();
        expect(adDuration).not.toBeFalsy();

        expect(videoDuration).not.toEqual(adDuration);
    });
});

