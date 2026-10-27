import { test, expect } from '@playwright/test';
import { waitForVideoToPlay, setVideoCurrentTime, getVideoDuration } from './functions/video';
import { skipAd } from './functions/ads';

test.describe('suggested videos', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
    });

    test('should show up in 4x3 grid at the end of the video if it is configured and after postRoll', async ({ page }) => {
        await page.goto('/suggested_videos_e2e.html');

        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const video = page.locator('video');
        const suggestedVideosGrid = page.locator('.suggested_tile_grid');

        await fullPlayer.click();
        await waitForVideoToPlay(video);

        // Skip to the last 5 seconds: the player loads the postRoll during the last vastTimeout (5s) of the video
        await setVideoCurrentTime(video, (await getVideoDuration(video)) - 5);

        // The postRoll plays before the suggested videos
        await page.locator('.skip_button').waitFor({ timeout: 15000 });
        await expect(suggestedVideosGrid).not.toBeVisible();
        await skipAd(page);

        // Keep the mouse off the tiles so no hover state ends up in the screenshot
        await page.mouse.move(0, 0);
        await expect(suggestedVideosGrid).toHaveScreenshot('baseline-sv-grid.png', { threshold: 0.02 });
    });

});
