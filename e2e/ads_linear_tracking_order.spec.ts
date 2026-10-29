import { test, expect } from '@playwright/test';
import { waitForVideoToPlay } from './functions/video';

// VAST 4.0 spec reference: IAB VAST 4.0, "Tracking" section (~p.19).
// A linear ad must report its progress through the creative's TrackingEvents, in order:
// impression when the ad is shown, then start (0%), firstQuartile (25%), midpoint (50%),
// thirdQuartile (75%) and complete (100%).
const TRACKING_BASE = 'http://www.example.com/tracking/';

test.describe('VAST linear ad tracking-event firing order', () => {
    let seenEvents: string[];

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        seenEvents = [];

        await page.route(`${TRACKING_BASE}*`, (route) => {
            seenEvents.push(route.request().url().replace(TRACKING_BASE, ''));
            return route.fulfill({ status: 200, body: '' });
        });

        await page.goto('/ads_linear_tracking_order.html');
    });

    test('should fire impression, start, firstQuartile, midpoint, thirdQuartile and complete in order', async ({ page }) => {
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();
        await waitForVideoToPlay(page.locator('video'));

        // The 5s ad has to play to the end for complete to fire
        await expect.poll(() => seenEvents, { timeout: 15000 }).toEqual([
            'impression', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete',
        ]);
    });

});
