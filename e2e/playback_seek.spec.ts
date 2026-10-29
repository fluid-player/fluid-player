import { test, expect, Page } from '@playwright/test';
import { getVideoCurrentTime, getVideoDuration, setVideoCurrentTime, waitForVideoToPlay } from './functions/video';

const getRate = (page: Page) => page.evaluate(() => (document.querySelector('video') as HTMLVideoElement).playbackRate);

test.describe('playback rate and seeking', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        await page.goto('/playback_seek.html');
        await page.evaluate(() => window.localStorage.clear());
    });

    test('playback rate menu should open on click and apply the chosen rate', async ({ page }) => {
        const rateButton = page.locator('.fluid_control_playback_rate').first();
        const menu = page.locator('.fluid_video_playback_rates');

        await expect(rateButton).toBeVisible();
        await expect(menu).toBeHidden();
        expect(await getRate(page)).toBe(1);

        await rateButton.click();
        await expect(menu).toBeVisible();
        await expect(menu.locator('.fluid_video_playback_rates_item')).toHaveText(['x2', 'x1.5', 'x1', 'x0.5']);

        await menu.getByText('x1.5', { exact: true }).click();
        expect(await getRate(page)).toBe(1.5);
        // Choosing a rate closes the menu
        await expect(menu).toBeHidden();

        await rateButton.click();
        await menu.getByText('x0.5', { exact: true }).click();
        expect(await getRate(page)).toBe(0.5);
    });

    test('chosen playback rate should persist across a reload', async ({ page }) => {
        await page.locator('.fluid_control_playback_rate').first().click();
        await page.locator('.fluid_video_playback_rates').getByText('x2', { exact: true }).click();
        expect(await getRate(page)).toBe(2);

        await page.reload();
        await expect.poll(() => getRate(page)).toBe(2);
    });

    test('clicking the progress bar should seek proportionally', async ({ page }) => {
        const video = page.locator('video');
        const progress = page.locator('.fluid_controls_progress_container');

        await waitForReady(page);
        const duration = await getVideoDuration(video);
        await page.locator('.fluid_button_play').click();
        await waitForVideoToPlay(video);
        await page.locator('.fluid_button_pause').click();

        // Controls are shown for a paused player
        const box = (await progress.boundingBox())!;
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);

        const time = await getVideoCurrentTime(video);
        expect(time).toBeGreaterThan(duration * 0.45);
        expect(time).toBeLessThan(duration * 0.55);
    });

    test('left/right arrow keys should skip 10 seconds and clamp at zero', async ({ page }) => {
        const video = page.locator('video');
        await waitForReady(page);
        await page.locator('.fluid_button_play').click();
        await waitForVideoToPlay(video);
        await page.locator('.fluid_button_pause').click();

        // Positions are derived from the real duration so the test doesn't depend on the length of the sample video
        const duration = await getVideoDuration(video);
        const start = duration / 2;

        await setVideoCurrentTime(video, start);
        await page.keyboard.press('ArrowRight');
        await expect.poll(() => getVideoCurrentTime(video)).toBeCloseTo(Math.min(start + 10, duration), 0);

        await setVideoCurrentTime(video, start);
        await page.keyboard.press('ArrowLeft');
        await expect.poll(() => getVideoCurrentTime(video)).toBeCloseTo(Math.max(start - 10, 0), 0);

        // Skipping back near the start clamps to zero
        await setVideoCurrentTime(video, Math.min(4, start));
        await page.keyboard.press('ArrowLeft');
        await expect.poll(() => getVideoCurrentTime(video)).toBe(0);
    });

    test('number keys, Home and End should jump to a percentage of the video', async ({ page }) => {
        const video = page.locator('video');
        await waitForReady(page);
        const duration = await getVideoDuration(video);
        await page.locator('.fluid_button_play').click();
        await waitForVideoToPlay(video);
        await page.locator('.fluid_button_pause').click();

        await page.keyboard.press('5');
        await expect.poll(() => getVideoCurrentTime(video)).toBeCloseTo(duration * 0.5, 0);

        await page.keyboard.press('Home');
        await expect.poll(() => getVideoCurrentTime(video)).toBe(0);

        await page.keyboard.press('End');
        await expect.poll(() => getVideoCurrentTime(video)).toBeCloseTo(duration, 0);
    });
});

async function waitForReady(page: Page) {
    await page.waitForFunction(() => {
        const v = document.querySelector('video') as HTMLVideoElement;
        return v && v.readyState >= 1 && isFinite(v.duration);
    });
}
