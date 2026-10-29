import { test, expect } from '@playwright/test';

test.describe('desktop controls', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        await page.goto('/controls.html');
    });

    test('should toggle play/pause when clicking the player', async ({ page }) => {
        // Selectors
        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const playButton = page.locator('.fluid_button_play');
        const pauseButton = page.locator('.fluid_button_pause');

        // Initial state checks
        await expect(playButton).toBeVisible();
        await expect(pauseButton).not.toBeVisible();

        // Video player should start playing
        await fullPlayer.click();

        // Wait for video to start playing
        await page.waitForFunction(() => {
            const video = document.querySelector('video');
            return video && !video.paused;
        });

        // Verify playing state
        await expect(playButton).not.toBeVisible();
        await expect(pauseButton).toBeVisible();

        // Wait for 500ms so the browser doesn't reject the click
        await page.waitForTimeout(1000);
        // Video player should pause
        await fullPlayer.click();

        // Wait for video to pause
        await page.waitForFunction(() => {
            const video = document.querySelector('video');
            return video && video.paused;
        });

        // Verify paused state
        await expect(playButton).toBeVisible();
        await expect(pauseButton).not.toBeVisible();
    });

    test('mouse should disappear when hovering the video', async ({ page }) => {
        const video = page.locator('video');
        const playButton = page.locator('.fluid_button_play');

        await playButton.click();

        // Hover over the video
        await video.hover();

        // Cursor hides after the 1 second autoHideTimeout
        await expect(video).toHaveCSS('cursor', 'none');
    });
});

