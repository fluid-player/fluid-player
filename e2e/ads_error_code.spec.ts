import { test, expect } from '@playwright/test';

/**
 * VAST 4.0 "Error Reporting" (~p.21) and "Macros" (~p.24): when an ad cannot be shown, the <Error> URL is requested
 * with the [ERRORCODE] macro replaced. Code 500 is the "General NonLinearAds error" (here: the creative image failed to load).
 */
test.describe('vast error code', () => {

    test('should request the Error URL with code 500 when the NonLinear image fails to load', async ({ page }) => {
        const tracked: string[] = [];

        await page.route('http://e2e-track.test/**', async (route) => {
            const url = new URL(route.request().url());
            tracked.push(url.pathname.slice(1) + url.search);
            await route.fulfill({ status: 200, contentType: 'image/gif', body: '' });
        });

        await page.goto('/ads_error_code.html');
        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        await expect.poll(() => tracked.filter((it) => it.startsWith('error'))).toEqual(['error?code=500']);

        // The overlay was never shown, so no Impression may be reported (VAST 4.0 p.19)
        await page.waitForTimeout(1000);
        expect(tracked.filter((it) => it === 'impression')).toEqual([]);
        expect(tracked.filter((it) => it.startsWith('error'))).toHaveLength(1);
    });
});
