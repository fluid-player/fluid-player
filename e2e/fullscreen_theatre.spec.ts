import { test, expect } from '@playwright/test';

test.describe('fullscreen and theatre mode', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        await page.goto('/fullscreen_theatre.html');
    });

    const wrapper = '#fluid_video_wrapper_fluid-player-e2e-case';

    test('fullscreen button enters and exits native fullscreen', async ({ page }) => {
        const fullscreenButton = page.locator('.fluid_control_fullscreen');
        const isFullscreen = () => page.evaluate(() => (document.fullscreenElement as HTMLElement | null)?.id ?? null);

        await expect(fullscreenButton).toHaveClass(/fluid_button_fullscreen(?!_exit)/);

        await fullscreenButton.click();
        await expect.poll(isFullscreen).toBe('fluid_video_wrapper_fluid-player-e2e-case');
        await expect(fullscreenButton).toHaveClass(/fluid_button_fullscreen_exit/);

        await fullscreenButton.click();
        await expect.poll(isFullscreen).toBeNull();
        await expect(fullscreenButton).toHaveClass(/fluid_button_fullscreen(?!_exit)/);
    });

    test('theatre button toggles theatre mode, size and events', async ({ page }) => {
        const player = page.locator(wrapper);
        const theatreButton = page.locator('.fluid_control_theatre');
        const normalWidth = (await player.boundingBox())!.width;

        await theatreButton.click();
        await expect(player).toHaveClass(/fluid_theatre_mode/);
        await expect.poll(async () => (await player.boundingBox())!.height).toBeCloseTo(400, 0);
        expect((await player.boundingBox())!.width).toBeGreaterThan(normalWidth);

        await theatreButton.click();
        await expect(player).not.toHaveClass(/fluid_theatre_mode/);
        expect((await player.boundingBox())!.width).toBeCloseTo(normalWidth, 0);

        expect(await page.evaluate(() => (window as any).displayEvents)).toEqual(['theatreModeOn', 'theatreModeOff']);
    });

    test('entering fullscreen while in theatre mode leaves theatre mode', async ({ page }) => {
        const player = page.locator(wrapper);

        await page.locator('.fluid_control_theatre').click();
        await expect(player).toHaveClass(/fluid_theatre_mode/);

        await page.locator('.fluid_control_fullscreen').click();
        await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
        await expect(player).not.toHaveClass(/fluid_theatre_mode/);
        expect(await page.evaluate(() => (window as any).displayEvents)).toEqual(['theatreModeOn', 'theatreModeOff']);
    });

    test('double clicking the video toggles fullscreen', async ({ page }) => {
        await page.locator('video').dispatchEvent('dblclick');
        await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    });
});
