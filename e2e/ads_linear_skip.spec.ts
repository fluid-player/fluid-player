import { test, expect, Page } from '@playwright/test';
import { waitForVideoDurationChange, getVideoDuration } from './functions/video';

/**
 * Skip button behaviour for linear ads.
 * IAB VAST 4.0: <Linear skipoffset> defines when the ad becomes skippable (section "Linear"),
 * and the "skip" tracking event must only fire when the user actually skips (section "Tracking", ~p.19).
 */

const SKIP_TRACKING_URL = 'http://www.example.com/skip/skip';

function trackRequests(page: Page): string[] {
    const urls: string[] = [];
    page.on('request', (req) => {
        if (req.url().startsWith('http://www.example.com/skip/')) {
            urls.push(req.url());
        }
    });
    // Stub the tracking pixels so they resolve quickly
    page.route('http://www.example.com/**', (route) => route.fulfill({ status: 200, body: '' }));
    return urls;
}

test.describe('linear ad skip button', () => {
    test('skippable ad: countdown is disabled until skipoffset, then becomes a clickable skip link', async ({ page }) => {
        trackRequests(page);
        await page.goto('/ads_linear_skip_skippable.html');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        const skipButton = page.locator('.skip_button');
        await expect(skipButton).toBeVisible({ timeout: 15000 });
        await expect(skipButton).toHaveClass(/skip_button_disabled/);
        await expect(skipButton).toHaveText(/Skip ad in [1-3]/);
        await expect(skipButton.locator('.js-skipHref')).toHaveCount(0);

        // Countdown ends: skip link appears and the disabled class is removed
        await expect(skipButton.locator('.js-skipHref')).toBeVisible({ timeout: 10000 });
        await expect(skipButton).not.toHaveClass(/skip_button_disabled/);
        await expect(skipButton).toHaveText(/Skip Ad/);
    });

    test('clicking the button before skipoffset does not skip or fire the skip tracking event', async ({ page }) => {
        const urls = trackRequests(page);
        await page.goto('/ads_linear_skip_skippable.html');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        const skipButton = page.locator('.skip_button');
        await expect(skipButton).toHaveText(/Skip ad in/, { timeout: 15000 });
        const adDuration = await getVideoDuration(page.locator('video'));

        // force: the disabled button may be covered by other layers; we only care that the click is ignored
        await skipButton.click({ force: true });
        await page.waitForTimeout(500);

        await expect(skipButton).toBeVisible();
        expect(await getVideoDuration(page.locator('video'))).toBe(adDuration);
        expect(urls).not.toContain(SKIP_TRACKING_URL);
    });

    test('skipping after skipoffset removes the button, fires skip once and resumes content', async ({ page }) => {
        const urls = trackRequests(page);
        await page.goto('/ads_linear_skip_skippable.html');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        const skipButton = page.locator('.skip_button');
        const skipLink = skipButton.locator('.js-skipHref');
        await expect(skipLink).toBeVisible({ timeout: 20000 });
        const adDuration = await getVideoDuration(page.locator('video'));

        await skipLink.click();

        await expect(skipButton).toHaveCount(0);
        await waitForVideoDurationChange(page, adDuration);
        await page.waitForTimeout(500);

        expect(urls.filter((u) => u === SKIP_TRACKING_URL)).toHaveLength(1);
        // A skipped ad must not report completion
        expect(urls).not.toContain('http://www.example.com/skip/complete');
    });

    test('non-skippable ad (no skipoffset) shows no skip button', async ({ page }) => {
        trackRequests(page);
        await page.goto('/ads_linear_skip_nonskippable.html');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        // Wait until the ad is actually playing (start tracking fired)
        await page.waitForRequest('http://www.example.com/skip/start', { timeout: 15000 });
        await page.waitForTimeout(1500);

        await expect(page.locator('.skip_button')).toHaveCount(0);
    });
});
