import { test, expect } from '@playwright/test';
import { waitForVideoToPlay } from './functions/video';

/**
 * VAST 4.0 "Error Reporting" (~p.21): the <Error> URL is only requested when the ad could not be shown.
 * A successfully played ad must request its Impression and must never request the Error URL.
 */
test.describe('vast error url', () => {

    test('should not request the Error URL when the ad plays successfully', async ({ page }) => {
        const tracked: string[] = [];

        await page.route('http://e2e-track.test/**', async (route) => {
            const url = new URL(route.request().url());
            tracked.push(url.pathname.slice(1) + url.search);
            await route.fulfill({ status: 200, contentType: 'image/gif', body: '' });
        });

        await page.goto('/ads_error_url.html');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        await expect.poll(() => tracked).toContain('impression');
        await waitForVideoToPlay(page.locator('video'));

        // Let the 3s ad run to completion and the content start
        await expect(page.locator('video')).toHaveAttribute('src', /video_3s\.webm/);
        await page.waitForTimeout(1000);

        expect(tracked.filter((it) => it.startsWith('error'))).toEqual([]);
        expect(tracked.filter((it) => it === 'impression')).toHaveLength(1);
    });
});
