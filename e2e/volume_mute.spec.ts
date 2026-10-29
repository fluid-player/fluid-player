import { test, expect, Page } from '@playwright/test';

const getVolume = (page: Page) => page.evaluate(() => (document.querySelector('video') as HTMLVideoElement).volume);
const isMuted = (page: Page) => page.evaluate(() => (document.querySelector('video') as HTMLVideoElement).muted);

test.describe('volume and mute controls', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        await page.goto('/controls.html');
        await page.evaluate(() => window.localStorage.clear());
    });

    test('mute button should toggle muted state and its icon', async ({ page }) => {
        const muteButton = page.locator('.fluid_control_mute').first();

        await expect(muteButton).toHaveClass(/fluid_button_volume/);
        expect(await isMuted(page)).toBe(false);

        await muteButton.click();
        await expect(muteButton).toHaveClass(/fluid_button_mute/);
        await expect(muteButton).not.toHaveClass(/fluid_button_volume/);
        expect(await isMuted(page)).toBe(true);
        expect(await getVolume(page)).toBe(0);

        await muteButton.click();
        await expect(muteButton).toHaveClass(/fluid_button_volume/);
        expect(await isMuted(page)).toBe(false);
        expect(await getVolume(page)).toBe(1);
    });

    test('unmuting should restore the volume that was set before muting', async ({ page }) => {
        const muteButton = page.locator('.fluid_control_mute').first();

        await page.evaluate(() => (window as any).instance.setVolume(0.4));
        expect(await getVolume(page)).toBeCloseTo(0.4);

        await muteButton.click();
        expect(await isMuted(page)).toBe(true);
        expect(await getVolume(page)).toBe(0);

        await muteButton.click();
        expect(await isMuted(page)).toBe(false);
        expect(await getVolume(page)).toBeCloseTo(0.4);
    });

    test('unmuting after the volume was set to 0 should fall back to full volume', async ({ page }) => {
        const muteButton = page.locator('.fluid_control_mute').first();

        await page.evaluate(() => (window as any).instance.setVolume(0));
        await expect(muteButton).toHaveClass(/fluid_button_mute/);

        await muteButton.click();
        expect(await isMuted(page)).toBe(false);
        expect(await getVolume(page)).toBe(1);
        await expect(muteButton).toHaveClass(/fluid_button_volume/);
    });

    test('keyboard shortcuts should change volume and mute once the player is focused', async ({ page }) => {
        const wrapper = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
        const volumeBar = page.locator('.fluid_control_currentvolume');

        await page.evaluate(() => (window as any).instance.setVolume(0.5));
        // Clicking the wrapper enables keyboard capture
        await wrapper.click();

        await page.keyboard.press('ArrowUp');
        expect(await getVolume(page)).toBeCloseTo(0.55);

        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        expect(await getVolume(page)).toBeCloseTo(0.45);

        await page.keyboard.press('m');
        expect(await isMuted(page)).toBe(true);
        await expect(page.locator('.fluid_control_mute').first()).toHaveClass(/fluid_button_mute/);

        await page.keyboard.press('m');
        expect(await isMuted(page)).toBe(false);
        expect(await getVolume(page)).toBeCloseTo(0.45);
        await expect(volumeBar).toBeAttached();
    });

    test('keyboard volume should be clamped between 0 and 1', async ({ page }) => {
        const wrapper = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');

        await page.evaluate(() => (window as any).instance.setVolume(0.97));
        await wrapper.click();

        await page.keyboard.press('ArrowUp');
        expect(await getVolume(page)).toBe(1);

        await page.evaluate(() => (window as any).instance.setVolume(0.07));
        await page.keyboard.press('ArrowDown');
        expect(await getVolume(page)).toBe(0);
    });

    test('clicking the volume bar should set the volume proportionally', async ({ page }) => {
        const volumeBar = page.locator('.fluid_control_volume_container').first();

        // Hovering the mute button reveals the controls and expands the volume slider
        await page.locator('.fluid_control_mute').first().hover();
        await expect(volumeBar).toBeVisible();
        await expect.poll(async () => (await volumeBar.boundingBox())?.width ?? 0).toBeGreaterThan(20);
        const box = (await volumeBar.boundingBox())!;

        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
        expect(await getVolume(page)).toBeGreaterThan(0.4);
        expect(await getVolume(page)).toBeLessThan(0.6);

        // Clicking at the very start snaps to 0 and mutes
        await page.mouse.click(box.x + 1, box.y + box.height / 2);
        expect(await getVolume(page)).toBe(0);
        expect(await isMuted(page)).toBe(true);
    });
});
