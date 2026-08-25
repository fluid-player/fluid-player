import { test, expect } from '@playwright/test';
import { waitForVideoToPlay } from './functions/video';
import { waitForSpecificNetworkCall } from './functions/network';

// VAST 4.0 spec reference: IAB VAST 4.0, "Tracking" section (~p.19).
// The Linear creative's TrackingEvents must fire, in order, as playback
// progresses through: start (0%), firstQuartile (25%), midpoint (50%),
// thirdQuartile (75%) and complete (100%). Impression is tracked when the
// ad is served/displayed, which happens before playback of the creative
// begins.
test.describe('VAST linear ad tracking-event firing order', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        await page.goto('/ads_linear_tracking_order.html');
    });

    test('should fire impression, start, firstQuartile, midpoint, thirdQuartile and complete in order', async ({ page }) => {
        const fullPlayer = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const video = page.locator('video');

        const seenEvents: string[] = [];
        const trackedEvents = ['impression', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete'];

        const requestPromises = trackedEvents.map((eventName) =>
            waitForSpecificNetworkCall(page, `http://www.example.com/tracking/${eventName}`, 'GET')
                .then(() => seenEvents.push(eventName))
        );

        // Start the video (ad preRoll)
        await fullPlayer.click();
        await waitForVideoToPlay(video);

        // Wait until every tracking call in the sequence has fired
        await Promise.all(requestPromises);

        expect(seenEvents).toEqual(trackedEvents);
    });

});
