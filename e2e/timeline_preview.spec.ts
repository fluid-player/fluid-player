import { test, expect, Page } from '@playwright/test';

test.describe('timeline thumbnail preview', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        await page.goto('/timeline_preview.html');
        // Duration is needed to map the hover position to a time
        await page.waitForFunction(() => {
            const v = document.querySelector('#fluid-player-e2e-case') as HTMLVideoElement;
            return v && v.duration > 0;
        });
        // The vtt is parsed asynchronously; the preview only shows once cue data exists
        await page.waitForFunction(() => (window as any).fluidPlayerDebug?.[0]?.internals.timelinePreviewData?.length > 0);
    });

    const preview = (page: Page) => page.locator('.fluid_timeline_preview_container');

    // Hover the progress bar at a given time (in seconds) of the 30s video
    const hoverAtTime = async (page: Page, second: number) => {
        // The initial play button overlay intercepts element hovers, so move by coordinates
        const videoBox = (await page.locator('#fluid-player-e2e-case').boundingBox())!;
        await page.mouse.move(videoBox.x + videoBox.width / 2, videoBox.y + videoBox.height / 2);
        const bar = page.locator('.fluid_controls_progress_container');
        const box = (await bar.boundingBox())!;
        const duration = await page.evaluate(() => (document.querySelector('#fluid-player-e2e-case') as HTMLVideoElement).duration);
        await page.mouse.move(box.x + box.width * (second / duration), box.y + box.height / 2);
        return box;
    };

    test('should be hidden until the progress bar is hovered', async ({ page }) => {
        await expect(preview(page)).toBeHidden();
    });

    test('should load one thumbnail cue per vtt entry with sprite coordinates', async ({ page }) => {
        const first = await page.evaluate(() => (window as any).fluidPlayerDebug?.[0]?.internals.timelinePreviewData[0]);
        expect(first).toMatchObject({ startTime: 0, endTime: 0.5, x: 0, y: 0, w: 200, h: 84 });
        expect(first.image).toContain('/static/thumbnails.jpg');
    });

    test('should show the sprite region matching the hovered time', async ({ page }) => {
        // 10.25s falls in the cue 10.0 --> 10.5, i.e. the 21st sprite tile (x = 20 * 200)
        await hoverAtTime(page, 10.25);

        await expect(preview(page)).toBeVisible();
        await expect(preview(page)).toHaveCSS('width', '200px');
        await expect(preview(page)).toHaveCSS('height', '84px');
        await expect(preview(page)).toHaveCSS('background-position', '-4000px 0px');
        await expect(preview(page)).toHaveCSS('background-image', /thumbnails\.jpg/);
    });

    test('should update the thumbnail when the hover position changes', async ({ page }) => {
        await hoverAtTime(page, 5.25);
        await expect(preview(page)).toHaveCSS('background-position', '-2000px 0px');

        await hoverAtTime(page, 20.25);
        await expect(preview(page)).toHaveCSS('background-position', '-8000px 0px');
    });

    test('should center the thumbnail on the mouse position', async ({ page }) => {
        const box = await hoverAtTime(page, 10.25);
        await expect(preview(page)).toBeVisible();

        const previewBox = (await preview(page).boundingBox())!;
        const centerX = previewBox.x + previewBox.width / 2;
        expect(Math.abs(centerX - (box.x + box.width * (10.25 / 30)))).toBeLessThanOrEqual(2);
    });

    test('should hide the thumbnail when the mouse leaves the progress bar', async ({ page }) => {
        await hoverAtTime(page, 10.25);
        await expect(preview(page)).toBeVisible();

        await page.mouse.move(0, 0);
        await expect(preview(page)).toBeHidden();
    });

    test('should not play or seek the video just by hovering', async ({ page }) => {
        await hoverAtTime(page, 20.25);
        await expect(preview(page)).toBeVisible();

        const state = await page.locator('#fluid-player-e2e-case').evaluate((v: HTMLVideoElement) => ({
            paused: v.paused,
            currentTime: v.currentTime,
        }));
        expect(state.paused).toBe(true);
        expect(state.currentTime).toBe(0);
    });
});
