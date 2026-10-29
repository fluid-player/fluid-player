import { test, expect } from '@playwright/test';

/**
 * VAST 4.0 Ad Pod (Ad "sequence" attribute): ads carrying a sequence are played back to back in
 * ascending sequence order, regardless of their order in the document. Ads without a sequence are
 * standalone ads and must not be played as part of the pod.
 */
test.describe('vast ad pod', () => {

    test('should play sequenced ads in sequence order and skip the standalone ad', async ({ page }) => {
        // Two 3s ads followed by the content
        test.slow();

        const tracked: string[] = [];

        await page.route('http://e2e-track.test/**', async (route) => {
            const url = new URL(route.request().url());
            tracked.push(url.pathname.slice(1));
            await route.fulfill({ status: 200, contentType: 'image/gif', body: '' });
        });

        await page.goto('/ads_pod.html');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        await expect.poll(() => tracked, { timeout: 30000 }).toEqual([
            'impression/pod1',
            'complete/pod1',
            'impression/pod2',
            'complete/pod2',
        ]);

        // Let the content start and make sure the standalone ad never shows up afterwards
        await page.waitForTimeout(2000);
        expect(tracked).not.toContain('impression/standalone');
        expect(tracked).toHaveLength(4);
    });
});
