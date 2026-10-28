import { test, expect, Page } from '@playwright/test';
import { waitForVideoToPlay } from './functions/video';

const AD_MP4 = '/static/e2e/ad_fallback.mp4';
const AD_HLS_PLAYLIST = '/static/e2e/hls/ad_fallback.m3u8';

/**
 * Make the browser report that it can't play HLS natively, like Firefox and most desktop browsers.
 * The player then has to use hls.js for HLS MediaFiles, which makes the selection logic deterministic across browsers.
 */
async function disableNativeHls(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const original = HTMLMediaElement.prototype.canPlayType;
        HTMLMediaElement.prototype.canPlayType = function (type: string) {
            return /mpegurl/i.test(type) ? '' : original.call(this, type);
        };
    });
}

/**
 * Open the media file selection page, start the preRoll and wait for the ad to be playing.
 * Returns the paths of every ad creative request the browser made.
 */
async function playAd(page: Page, adCase: string): Promise<string[]> {
    const creativeRequests: string[] = [];
    page.on('request', (req) => {
        const { pathname } = new URL(req.url());
        if (pathname === AD_MP4 || pathname.startsWith('/static/e2e/hls/')) {
            // The content video is the same file with a ?content query, only count the ad's own requests
            if (!req.url().endsWith('?content')) {
                creativeRequests.push(pathname);
            }
        }
    });

    await page.goto(`/ads_media_file_fallback.html?case=${adCase}`);
    await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

    const video = page.locator('video');
    await waitForVideoToPlay(video);
    // The click layer only exists while a linear ad is playing, so this confirms we're in the ad and not the content
    await page.locator('.vast_clickthrough_layer').waitFor();

    return creativeRequests;
}

test.describe('ad MediaFile selection and fallback', () => {


    test.beforeEach(async ({ page }) => {
        await disableNativeHls(page);
    });

    test('falls back to the MP4 MediaFile when HLS is listed first and not supported natively', async ({ page }) => {
        const requests = await playAd(page, 'hls_then_mp4');

        // VAST 4.0 section 3.9.2: the player picks a MediaFile it can play from the options in the Linear creative.
        // The progressive MP4 is playable, so it must be used instead of loading hls.js for the HLS stream.
        const adSrc = await page.locator('video').evaluate((v: HTMLVideoElement) => v.currentSrc);
        expect(adSrc).toContain(AD_MP4);
        expect(requests).toContain(AD_MP4);
        expect(requests).not.toContain(AD_HLS_PLAYLIST);
    });

    test('plays the ad whichever order the HLS and MP4 MediaFiles are listed in', async ({ page }) => {
        const requests = await playAd(page, 'mp4_then_hls');

        // Either source is a valid choice, what matters is that exactly one gets picked and plays
        const adSrc = await page.locator('video').evaluate((v: HTMLVideoElement) => v.currentSrc);
        expect(adSrc.includes(AD_MP4) || adSrc.startsWith('blob:')).toBe(true);
        expect(requests.some((r) => r === AD_MP4) !== requests.some((r) => r === AD_HLS_PLAYLIST)).toBe(true);
    });

    test('plays an HLS-only ad through hls.js when HLS is not supported natively', async ({ page }) => {
        const requests = await playAd(page, 'hls_only');

        expect(requests).toContain(AD_HLS_PLAYLIST);
        expect(requests).not.toContain(AD_MP4);

        // hls.js feeds the element through Media Source Extensions, so the source is a blob URL
        const adSrc = await page.locator('video').evaluate((v: HTMLVideoElement) => v.currentSrc);
        expect(adSrc).toMatch(/^blob:/);
    });
});

test.describe('ad MediaFile selection with native HLS support', () => {
    test('plays an HLS-only ad directly when the browser supports HLS natively', async ({ page }) => {
        const nativeHls = await page.goto('/ads_media_file_fallback.html').then(() => page.evaluate(() => {
            const type = document.createElement('video').canPlayType('application/vnd.apple.mpegurl');
            return type === 'maybe' || type === 'probably';
        }));
        test.skip(!nativeHls, 'Browser has no native HLS support');

        const requests = await playAd(page, 'hls_only');

        expect(requests).toContain(AD_HLS_PLAYLIST);
        const adSrc = await page.locator('video').evaluate((v: HTMLVideoElement) => v.currentSrc);
        expect(adSrc).toContain(AD_HLS_PLAYLIST);
    });
});
