import { test, expect } from '@playwright/test';

declare global {
    interface Window {
        vastCallbacks: { loaded: number; noVideo: number };
    }
}

test.describe('VAST request timeout', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/vast-timeout-hang', async () => {
            await new Promise(() => {});
        });
    });

    test('tries a configured fallback after the primary VAST request times out', async ({ page }) => {
        await page.route('**/vast-timeout-image.png', route => route.fulfill({
            status: 200,
            contentType: 'image/png',
            body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p1sAAAAASUVORK5CYII=', 'base64'),
        }));
        await page.goto('/vast_timeout.html?fallback=true');
        const primaryRequest = page.waitForRequest('**/vast-timeout-hang');
        const fallbackRequest = page.waitForRequest(request =>
            new URL(request.url()).pathname === '/static/vast_timeout_valid.xml' && request.resourceType() === 'xhr'
        );

        await page.locator('#fluid_video_wrapper_vast-timeout-player').click();
        await primaryRequest;
        await fallbackRequest;
        await expect.poll(() => page.evaluate(() => window.vastCallbacks.loaded)).toBe(1);
        await expect.poll(() => page.evaluate(() => window.vastCallbacks.noVideo)).toBe(0);
    });

    test('recovers and calls noVastVideoCallback when timeout exhausts VAST tags', async ({ page }) => {
        await page.goto('/vast_timeout.html');
        const primaryRequest = page.waitForRequest('**/vast-timeout-hang');

        await page.locator('#fluid_video_wrapper_vast-timeout-player').click();
        await primaryRequest;
        await expect.poll(() => page.evaluate(() => window.vastCallbacks.noVideo)).toBe(1);
        await expect(page.locator('#fluid_video_wrapper_vast-timeout-player .vast_video_loading')).toBeHidden();
        await expect.poll(() => page.evaluate(() => window.vastCallbacks.loaded)).toBe(0);
    });

    test('continues through failed fallbacks and recovers after the final VAST failure', async ({ page }) => {
        await page.route('**/vast-timeout-fail-*', route => route.fulfill({ status: 500 }));
        await page.goto('/vast_timeout.html?fallback=exhaustion');
        const requests = [
            page.waitForRequest('**/vast-timeout-hang'),
            page.waitForRequest('**/vast-timeout-fail-one'),
            page.waitForRequest('**/vast-timeout-fail-two'),
        ];

        await page.locator('#fluid_video_wrapper_vast-timeout-player').click();
        await Promise.all(requests);
        await expect.poll(() => page.evaluate(() => window.vastCallbacks.noVideo)).toBe(1);
        await expect(page.locator('#fluid_video_wrapper_vast-timeout-player .vast_video_loading')).toBeHidden();
        await expect.poll(() => page.evaluate(() => window.vastCallbacks.loaded)).toBe(0);
    });
});
