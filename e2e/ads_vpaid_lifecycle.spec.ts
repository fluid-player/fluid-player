import { test, expect, Page } from '@playwright/test';

/**
 * VPAID 2.0 linear ad lifecycle, driven by a scripted creative (test/static/e2e/vpaid_lifecycle_ad.js) that
 * records every call the player makes and fires the lifecycle events on a timer. No ad media is involved.
 *
 * VPAID 2.0 lifecycle: handshakeVersion -> initAd -> AdLoaded -> startAd -> AdStarted -> AdImpression ->
 * AdVideoStart/FirstQuartile/Midpoint/ThirdQuartile/Complete -> AdStopped.
 * IAB VAST 4.0 "Tracking" section: the matching VAST tracking URLs must be requested as those events occur.
 */

type VpaidCall = { name: string, args: unknown[] };

const TRACKING_ORDER = [
    'creativeView', // AdStarted
    'impression', // AdImpression
    'start',
    'firstQuartile',
    'midpoint',
    'thirdQuartile',
    'complete',
];

async function trackRequests(page: Page): Promise<string[]> {
    const hits: string[] = [];
    await page.route('http://www.example.com/**', async (route) => {
        hits.push(new URL(route.request().url()).pathname.replace('/vpaid/', ''));
        await route.fulfill({ status: 200, contentType: 'image/gif', body: '' });
    });
    return hits;
}

const getVpaidCalls = (page: Page): Promise<VpaidCall[]> =>
    page.evaluate(() => (window as any).__vpaidCalls ?? []);

const callNames = (calls: VpaidCall[]) => calls.map((c) => c.name);

test.describe('VPAID linear ad lifecycle', () => {

    test('should call the creative in VPAID order and fire tracking URLs as events occur', async ({ page }) => {
        const hits = await trackRequests(page);
        await page.goto('/ads_vpaid_lifecycle.html');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        // Player -> creative calls
        await expect.poll(async () => callNames(await getVpaidCalls(page))).toContain('startAd');
        const calls = await getVpaidCalls(page);
        const names = callNames(calls);
        expect(names.indexOf('handshakeVersion')).toBeGreaterThanOrEqual(0);
        expect(names.indexOf('handshakeVersion')).toBeLessThan(names.indexOf('initAd'));
        expect(names.indexOf('initAd')).toBeLessThan(names.indexOf('emit:AdLoaded'));
        expect(names.indexOf('emit:AdLoaded')).toBeLessThan(names.indexOf('startAd'));
        expect(names.indexOf('startAd')).toBeLessThan(names.indexOf('emit:AdStarted'));

        // initAd receives the slot size, view mode and the VAST <AdParameters>
        const initAd = calls.find((c) => c.name === 'initAd')!;
        expect(initAd.args[0]).toBeGreaterThan(0);
        expect(initAd.args[1]).toBeGreaterThan(0);
        expect(initAd.args[2]).toBe('normal');
        expect(String(initAd.args[4]).trim()).toBe('{}');

        // Creative -> player events end the ad
        await expect.poll(async () => callNames(await getVpaidCalls(page)), { timeout: 10000 })
            .toContain('emit:AdStopped');

        // Tracking URLs: each fired exactly once, in lifecycle order
        await expect.poll(() => hits.length, { timeout: 10000 }).toBeGreaterThanOrEqual(TRACKING_ORDER.length);
        expect(hits.filter((h) => h !== 'error')).toEqual(TRACKING_ORDER);
    });

    test('should remove the VPAID slot and play the main video after AdStopped', async ({ page }) => {
        await trackRequests(page);
        await page.goto('/ads_vpaid_lifecycle.html');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        await expect(page.locator('.fluid_vpaid_slot')).toHaveCount(1);
        await expect.poll(async () => callNames(await getVpaidCalls(page))).toContain('emit:AdStopped');
        await expect(page.locator('.fluid_vpaid_slot')).toHaveCount(0);

        // The 20s content video is now playing
        await page.waitForFunction(() => {
            const v = document.querySelector('video') as HTMLVideoElement | null;
            return !!v && !v.paused && v.currentTime > 0 && Math.round(v.duration) === 20;
        }, undefined, { timeout: 15000 });
    });

    test('should skip the ad and play the main video when the creative fires AdError', async ({ page }) => {
        const hits = await trackRequests(page);
        await page.goto('/ads_vpaid_lifecycle.html?vastTag=/static/e2e/vpaid_lifecycle_error.xml');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        await expect.poll(async () => callNames(await getVpaidCalls(page))).toContain('emit:AdError');
        await expect(page.locator('.fluid_vpaid_slot')).toHaveCount(0);

        // The ad never started, so no start/quartile tracking may have fired
        expect(callNames(await getVpaidCalls(page))).not.toContain('startAd');
        expect(hits).not.toContain('start');
        expect(hits).not.toContain('complete');

        await page.waitForFunction(() => {
            const v = document.querySelector('video') as HTMLVideoElement | null;
            return !!v && !v.paused && v.currentTime > 0 && Math.round(v.duration) === 20;
        }, undefined, { timeout: 15000 });
    });
});
