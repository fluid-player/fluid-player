import { test, expect, Page, BrowserContext } from '@playwright/test';
import { getVideoCurrentTime } from './functions/video';

/**
 * Linear ad click-through, click tracking and CTA button.
 *
 * IAB VAST 4.0: <VideoClicks> holds the <ClickThrough> destination and one or more <ClickTracking> URIs, which the
 * player must request when the user clicks the ad (section "Tracking", ~p.19). <ClickTracking> must not be
 * requested when the user does not click.
 * The CTA button comes from the (non-IAB) <TitleCTA> extension, or falls back to the vastOptions.adCTAText config.
 */

const CLICK_THROUGH_URL = 'http://www.example.com/clickthrough';
const CLICK_TRACKING_URLS = [
    'http://www.example.com/click-tracking-1',
    'http://www.example.com/click-tracking-2',
];
const CTA_TRACKING_URL = 'http://www.example.com/cta-landing';

/**
 * Stubs everything on www.example.com (tracking pixels and the advertiser landing pages opened in popups)
 * and records the requested URLs.
 */
async function recordExampleRequests(context: BrowserContext): Promise<string[]> {
    const urls: string[] = [];
    await context.route('http://www.example.com/**', (route) => {
        urls.push(route.request().url());
        return route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' });
    });
    return urls;
}

async function startAd(page: Page): Promise<void> {
    await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();
    await page.locator('.vast_clickthrough_layer').waitFor({ timeout: 15000 });
    // Ad is actually playing, not only loaded
    await expect.poll(() => getVideoCurrentTime(page.locator('video')), { timeout: 15000 }).toBeGreaterThan(0);
}

test.describe('linear ad click-through and CTA', () => {

    test('clicking the ad opens the ClickThrough URL, fires every ClickTracking URI once and pauses the ad', async ({ page, context }) => {
        const urls = await recordExampleRequests(context);
        await page.goto('/ads_click_cta_vast.html');
        await startAd(page);

        // Nothing is tracked as a click before the user clicks
        expect(urls.filter((url) => url.includes('click-tracking'))).toEqual([]);

        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            page.locator('.vast_clickthrough_layer').click(),
        ]);
        await expect(popup).toHaveURL(CLICK_THROUGH_URL);
        await popup.close();

        await expect.poll(() => urls.filter((url) => url.includes('click-tracking')).sort()).toEqual(CLICK_TRACKING_URLS);
        await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    });

    test('clicking a paused ad resumes it without opening the landing page or tracking another click', async ({ page, context }) => {
        const urls = await recordExampleRequests(context);
        await page.goto('/ads_click_cta_vast.html');
        await startAd(page);

        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            page.locator('.vast_clickthrough_layer').click(),
        ]);
        await popup.close();
        await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
        await expect.poll(() => urls.filter((url) => url.includes('click-tracking')).length).toBe(2);

        let extraPopup = false;
        page.on('popup', () => { extraPopup = true; });

        await page.locator('.vast_clickthrough_layer').click();
        await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
        await page.waitForTimeout(500);

        expect(extraPopup).toBe(false);
        expect(urls.filter((url) => url.includes('click-tracking')).length).toBe(2);
    });

    test('CTA button shows the TitleCTA text and display URL, and opens the CTA tracking URL on click', async ({ page, context }) => {
        const urls = await recordExampleRequests(context);
        await page.goto('/ads_click_cta_vast.html');
        await startAd(page);

        const cta = page.locator('.fluid_ad_cta');
        await expect(cta).toBeVisible();
        await expect(cta).toContainText('CTA Text Desktop');
        await expect(cta.locator('.add_icon_clickthrough')).toHaveText('https://www.example.com/display-url');

        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            cta.click(),
        ]);
        await expect(popup).toHaveURL(CTA_TRACKING_URL);
        await popup.close();

        // CTA click pauses the ad
        await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
        // ...and is not a ClickThrough: the VAST ClickTracking URIs are not requested
        expect(urls.filter((url) => url.includes('click-tracking'))).toEqual([]);
    });

    test('CTA button falls back to the adCTAText config and the ClickThrough URL when TitleCTA is not used', async ({ page, context }) => {
        await recordExampleRequests(context);
        await page.goto('/ads_click_cta_config.html');
        await startAd(page);

        const cta = page.locator('.fluid_ad_cta');
        await expect(cta).toBeVisible();
        await expect(cta).toContainText('Config CTA');
        await expect(cta).not.toContainText('CTA Text Desktop');
        // Display URL comes from the Icon's IconClickThrough
        await expect(cta.locator('.add_icon_clickthrough')).toHaveText('https://www.example.com/IconClickThrough');

        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            cta.click(),
        ]);
        await expect(popup).toHaveURL(CLICK_THROUGH_URL);
        await popup.close();
    });
});
