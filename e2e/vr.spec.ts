import { test, expect } from '@playwright/test';

test.describe('VR cardboard mode', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        await page.goto('/vr.html');
        // The PSV chunk is lazy-loaded; the viewer container appears once it is ready
        await expect(page.locator('.fluid_vr_container')).toBeAttached();
        await page.waitForFunction(() => !!(window as any).fluidPlayerDebug[0].internals.vrViewer);
    });

    const wrapper = (page) => page.locator('#fluid_video_wrapper_fluid-player-e2e-case');
    const cardboardButton = (page) => page.locator('.fluid_control_cardboard').first();

    test('should show the cardboard button and the joystick panel in normal mode', async ({ page }) => {
        await expect(cardboardButton(page)).toBeVisible();
        await expect(page.locator('.fluid_vr_joystick_panel')).toBeVisible();
        await expect(page.locator('.fluid_vr_joystick_panel .fluid_vr_button')).toHaveCount(7);
        await expect(wrapper(page)).not.toHaveClass(/fluid_vr_active/);
        await expect(page.locator('.fluid_vr2_controls_container')).toHaveCount(0);
    });

    test('should enter VR mode with a second control bar for the other eye', async ({ page }) => {
        await cardboardButton(page).click();

        await expect(wrapper(page)).toHaveClass(/fluid_vr_active/);
        await expect(page.locator('.fluid_vr2_controls_container')).toHaveCount(1);
        await expect(page.locator('.fluid_controls_container.fluid_vr_controls_container')).toHaveCount(2);
        expect(await page.evaluate(() => (window as any).fluidPlayerDebug[0].internals.vrMode)).toBe(true);
        // Drag navigation is disabled in VR mode, the scene only moves with the gyroscope
        expect(await page.evaluate(() => (window as any).fluidPlayerDebug[0].internals.vrViewer.config.mousemove)).toBe(false);
    });

    test('should return to normal mode when toggling the cardboard button again', async ({ page }) => {
        await cardboardButton(page).click();
        await expect(page.locator('.fluid_vr2_controls_container')).toHaveCount(1);

        await cardboardButton(page).click();

        await expect(wrapper(page)).not.toHaveClass(/fluid_vr_active/);
        await expect(page.locator('.fluid_vr2_controls_container')).toHaveCount(0);
        await expect(page.locator('.fluid_vr_controls_container')).toHaveCount(0);
        await expect(page.locator('.fluid_vr_joystick_panel')).toBeVisible();
        expect(await page.evaluate(() => (window as any).fluidPlayerDebug[0].internals.vrMode)).toBe(false);
        expect(await page.evaluate(() => (window as any).fluidPlayerDebug[0].internals.vrViewer.config.mousemove)).toBe(true);
    });

    test('should rotate the view when clicking the joystick direction buttons', async ({ page }) => {
        const position = () => page.evaluate(() => (window as any).fluidPlayerDebug[0].internals.vrViewer.getPosition());
        // The rotation is animated, wait for it to come to rest before reading the final position
        const settledPosition = async () => {
            let last = await position();
            await expect.poll(async () => {
                const current = await position();
                const still = current.yaw === last.yaw && current.pitch === last.pitch;
                last = current;
                return still;
            }).toBe(true);
            return last;
        };

        // Yaw wraps around at 2π, so compare it as a signed angular difference
        const yawDelta = (to: number, from: number) => ((to - from + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;

        const start = await settledPosition();

        await page.locator('.fluid_vr_joystick_right').click();
        await expect.poll(async () => yawDelta((await position()).yaw, start.yaw)).toBeGreaterThan(0);
        const afterRight = await settledPosition();

        await page.locator('.fluid_vr_joystick_left').click();
        await expect.poll(async () => yawDelta((await position()).yaw, afterRight.yaw)).toBeLessThan(0);

        const beforeUp = await settledPosition();
        await page.locator('.fluid_vr_joystick_up').click();
        await expect.poll(async () => (await position()).pitch).toBeGreaterThan(beforeUp.pitch);
        const afterUp = await settledPosition();

        await page.locator('.fluid_vr_joystick_down').click();
        await expect.poll(async () => (await position()).pitch).toBeLessThan(afterUp.pitch);
    });

    test('should change zoom level with the zoom buttons', async ({ page }) => {
        const zoom = () => page.evaluate(() => (window as any).fluidPlayerDebug[0].internals.vrViewer.getZoomLevel());

        await page.locator('.fluid_vr_joystick_zoomin').click();
        await expect.poll(zoom).toBeGreaterThan(50);

        await page.locator('.fluid_vr_joystick_zoomout').click();
        await page.locator('.fluid_vr_joystick_zoomout').click();
        await expect.poll(zoom).toBeLessThan(50);

        await page.locator('.fluid_vr_joystick_zoomdefault').click();
        await expect.poll(zoom).toBe(50);
    });

    test('should keep the VR viewer video in sync with play and pause', async ({ page }) => {
        const vrVideo = () => page.evaluate(() => {
            const v = (window as any).fluidPlayerDebug[0].internals.vrViewer.getPlugin('video').video as HTMLVideoElement;
            return v ? !v.paused : false;
        });

        await page.locator('.fluid_button_play').first().click();
        await expect.poll(vrVideo).toBe(true);

        await page.locator('.fluid_button_pause').first().click();
        await expect.poll(vrVideo).toBe(false);
    });
});
