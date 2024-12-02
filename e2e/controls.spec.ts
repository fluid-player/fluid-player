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
        fullPlayer.click();

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
        fullPlayer.click();

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

        await page.waitForTimeout(1500);

        // Evaluate the cursor CSS property of the video element or its parent
        const isCursorHidden = await video.evaluate((vid) => {
            const computedStyle = window.getComputedStyle(vid);
            return computedStyle.cursor === 'none';
        });

        expect(isCursorHidden).toBeTruthy(); // Assert that the cursor is hidden
    });
});

