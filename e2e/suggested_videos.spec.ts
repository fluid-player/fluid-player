import { test, expect } from '@playwright/test';
import { waitForVideoToPlay, setVideoCurrentTime, getVideoDuration } from './functions/video';

test.describe('suggested videos', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
    });

    test('should show up in 4x3 grid at the end of the video if it is configured and after postRoll', async ({ page }) => {
        await page.goto('/suggested_videos_e2e.html');

        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const video = page.locator('video');

        fullPlayer.click();
        await waitForVideoToPlay(video);

        const videoDuration = await getVideoDuration(video);
        await setVideoCurrentTime(video, videoDuration - 5);

        await waitForVideoToPlay(video);
        await page.waitForTimeout(5500);

        const suggestedVideosGrid = page.locator('.suggested_tile_grid');
        await expect(suggestedVideosGrid).not.toBeVisible();

        await page.waitForTimeout(3000);
        const skipButton = page.locator('.skip_button');
        skipButton.click();

        await expect(suggestedVideosGrid).toBeVisible();
        expect(await suggestedVideosGrid.screenshot()).toMatchSnapshot('baseline-sv-grid.png', { threshold: 0.02 });
    });

});

