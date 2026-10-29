import { test, expect, Page } from '@playwright/test';
import { waitForVideoToPlay } from './functions/video';

// VAST 4.0 spec reference: IAB VAST 4.0, "Tracking" section (~p.19) and the NonLinearAds element.
// A NonLinear (overlay) creative is displayed on top of the content video, which keeps playing.
// <Impression> is requested once the creative is displayed, the NonLinear TrackingEvents
// (start, creativeView, close, complete) fire for the matching lifecycle moments, and
// <NonLinearClickThrough> opens when the user clicks the overlay. minSuggestedDuration is how long the overlay is suggested to stay visible.
const TRACKING_BASE = 'http://www.example.com/nonlinear/';

/**
 * Records every request to the tracking host (and fulfils it so nothing hits the network)
 * and returns the ordered list of tracked event names.
 */
async function recordTracking(page: Page): Promise<string[]> {
    const seen: string[] = [];

    await page.route(`${TRACKING_BASE}*`, async (route) => {
        seen.push(route.request().url().replace(TRACKING_BASE, ''));
        await route.fulfill({ status: 200, body: '' });
    });
    await page.context().route('http://www.example.com/nonlinear-landing', (route) =>
        route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>landing</body></html>' })
    );

    return seen;
}

test.describe('VAST non-linear (overlay) ad', () => {
    let seen: string[];

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        seen = await recordTracking(page);
        await page.goto('/ads_nonlinear.html');
    });

    test('should show the overlay over the content and fire impression, start and creativeView', async ({ page }) => {
        const video = page.locator('video');
        const overlay = page.locator('.fluid_nonLinear_ad');
        const overlayImg = overlay.locator('img');

        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();
        await waitForVideoToPlay(video);

        await expect(overlayImg).toBeVisible();
        await expect(overlayImg).toHaveAttribute('src', /\/static\/logo\.png$/);

        // VAST dimensions (480x90) are applied to the creative
        await expect(overlayImg).toHaveAttribute('width', '480');
        await expect(overlayImg).toHaveAttribute('height', '90');

        await expect.poll(() => seen).toEqual(expect.arrayContaining(['impression', 'start', 'creativeView']));

        // Content keeps playing underneath the overlay; non-linear ads don't replace the video
        const videoSrc = await video.evaluate((v) => (v as HTMLVideoElement).currentSrc);
        expect(videoSrc).toContain('nonlinear_content.webm');
        expect(await video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(false);

        // Impression is tracked exactly once
        expect(seen.filter((e) => e === 'impression')).toHaveLength(1);
    });

    test('should open the click-through URL when the overlay is clicked', async ({ page }) => {
        const video = page.locator('video');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();
        await waitForVideoToPlay(video);

        const overlayImg = page.locator('.fluid_nonLinear_ad img');
        await expect(overlayImg).toBeVisible();

        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            overlayImg.click(),
        ]);

        await expect(popup).toHaveURL('http://www.example.com/nonlinear-landing');
        await popup.close();
    });

    test('should remove the overlay and fire the close event when the close button is clicked', async ({ page }) => {
        const video = page.locator('video');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();
        await waitForVideoToPlay(video);

        const overlay = page.locator('.fluid_nonLinear_ad');
        await expect(overlay).toBeVisible();

        await overlay.hover();
        await overlay.locator('.close_button').click();

        await expect(overlay).toHaveCount(0);
        await expect.poll(() => seen).toContain('close');

        // Content continues playing after the overlay is closed
        expect(await video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(false);
    });

    test('should remove the overlay by itself after minSuggestedDuration and fire complete', async ({ page }) => {
        test.slow();

        const video = page.locator('video');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();
        await waitForVideoToPlay(video);

        const overlay = page.locator('.fluid_nonLinear_ad');
        await expect(overlay).toBeVisible();

        // minSuggestedDuration is 6s of content playback
        await expect(overlay).toHaveCount(0, { timeout: 20000 });
        await expect.poll(() => seen).toContain('complete');

        // An overlay that ran its full duration was not closed by the user
        expect(seen).not.toContain('close');
    });
});
