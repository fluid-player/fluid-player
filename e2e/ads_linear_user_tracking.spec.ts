import { test, expect, Page } from '@playwright/test';
import { waitForVideoToPlay } from './functions/video';

// VAST 4.0 spec reference: IAB VAST 4.0, "Tracking" section (~p.19).
// While a linear ad plays, the player must report user interactions through the
// creative's TrackingEvents: mute/unmute, pause/resume and fullscreen
// (plus playerExpand/playerCollapse for size changes).
const TRACKING_BASE = 'http://www.example.com/tracking/';

test.describe('VAST linear ad user interaction tracking', () => {
    let seenEvents: string[];

    const trackingCalls = (name: string) => seenEvents.filter((e) => e === name).length;

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        seenEvents = [];

        await page.route(`${TRACKING_BASE}*`, (route) => {
            seenEvents.push(route.request().url().replace(TRACKING_BASE, ''));
            return route.fulfill({ status: 200, body: '' });
        });

        await page.goto('/ads_linear_user_tracking.html');
    });

    const startAd = async (page: Page) => {
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();
        await waitForVideoToPlay(page.locator('video'));
        // The ad (not the content) must be the one playing
        await expect.poll(() => seenEvents).toContain('start');
    };

    test('should track mute and unmute when toggling the mute button during the ad', async ({ page }) => {
        await startAd(page);
        const muteButton = page.locator('.fluid_control_mute').first();

        await muteButton.click();
        await expect.poll(() => trackingCalls('mute')).toBe(1);
        expect(trackingCalls('unmute')).toBe(0);

        await muteButton.click();
        await expect.poll(() => trackingCalls('unmute')).toBe(1);
        expect(trackingCalls('mute')).toBe(1);
    });

    test('should track pause and resume when toggling playback during the ad', async ({ page }) => {
        await startAd(page);
        const video = page.locator('video');

        await page.locator('.fluid_control_playpause').first().click();
        await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
        await expect.poll(() => trackingCalls('pause')).toBe(1);
        expect(trackingCalls('resume')).toBe(0);

        await page.locator('.fluid_control_playpause').first().click();
        await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
        await expect.poll(() => trackingCalls('resume')).toBe(1);
        expect(trackingCalls('pause')).toBe(1);
    });

    test('should track fullscreen and playerExpand when entering fullscreen during the ad', async ({ page }) => {
        await startAd(page);
        expect(trackingCalls('fullscreen')).toBe(0);

        await page.locator('.fluid_control_fullscreen').first().click();
        await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);

        await expect.poll(() => trackingCalls('fullscreen')).toBe(1);
        await expect.poll(() => trackingCalls('playerExpand')).toBe(1);
    });

    test('should not fire user interaction events before the user interacts', async ({ page }) => {
        await startAd(page);
        await page.waitForTimeout(1000);

        for (const name of ['mute', 'unmute', 'pause', 'resume', 'fullscreen', 'playerExpand', 'playerCollapse']) {
            expect(trackingCalls(name), name).toBe(0);
        }
    });
});
