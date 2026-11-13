import { test, expect } from '@playwright/test';

test.describe('ad text', () => {

    test.beforeEach(async () => {
        console.log(`Running ${test.info().title}`);
    });

    test('should show vastOptions.adText on an ad without its own text', async ({ page }) => {
        await page.goto('/ads_text.html');

        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        await expect(page.locator('.fluid_ad_playing')).toHaveText('Player-wide text');
    });

    test('should prefer adList[].adText over vastOptions.adText', async ({ page }) => {
        await page.goto('/ads_text.html?perAd=1');

        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').click();

        await expect(page.locator('.fluid_ad_playing')).toHaveText('Per-ad text');
    });
});
