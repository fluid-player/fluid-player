import { test, expect } from '@playwright/test';
import { waitForVideoToPlay } from './functions/video';

/**
 * VAST 4.0 "VAST Wrapper Ads" (~p.20): a wrapper's Impression and tracking events must be fired
 * alongside those of the InLine ad it resolves to, for every wrapper in the chain.
 */
test.describe('vast wrapper chain', () => {

    test('should resolve outer > middle > inline wrappers and fire tracking from every level', async ({ page }) => {
        const tracked: string[] = [];

        await page.route('**/e2e-track/**', async (route) => {
            tracked.push(new URL(route.request().url()).pathname.replace('/e2e-track/', ''));
            await route.fulfill({ status: 200, contentType: 'image/gif', body: '' });
        });

        await page.goto('/ads_wrapper_chain.html');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        // The ad (not the content) is playing once the inline media is loaded
        await waitForVideoToPlay(page.locator('video'));

        // Impressions fire for every level of the chain
        await expect.poll(() => tracked).toEqual(expect.arrayContaining([
            'outer/impression', 'middle/impression', 'inline/impression',
        ]));

        // Start events are merged from every level too
        await expect.poll(() => tracked).toEqual(expect.arrayContaining([
            'outer/start', 'middle/start', 'inline/start',
        ]));

        // Complete events only fire once the ad has finished playing; none must have fired yet
        expect(tracked).not.toContain('inline/complete');

        // Each URL is only requested once
        expect(new Set(tracked).size).toBe(tracked.length);

        // Let the ad finish, then complete events from all levels fire
        await expect.poll(() => tracked, { timeout: 30000 }).toEqual(expect.arrayContaining([
            'outer/complete', 'middle/complete', 'inline/complete',
        ]));
    });
});
