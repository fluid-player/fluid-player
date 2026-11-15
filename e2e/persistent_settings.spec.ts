import { test, expect, Page } from '@playwright/test';

/**
 * Remembered settings (persistentSettings) are stored in localStorage under names shared by every player
 * of a site. A value saved by one player must only be restored by a player that allows that feature,
 * and must only be saved when the matching persistentSettings flag is on.
 */
const wrapper = '#fluid_video_wrapper_fluid-player-e2e-case';

/** Fills localStorage as if another player of the site had saved these values, then opens the page */
async function openWithStorage(page: Page, query: string, stored: Record<string, string> = {}) {
    await page.addInitScript((values) => {
        localStorage.clear();
        Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, value));
    }, stored);
    await page.goto(`/persistent_settings.html${query}`);
    // setPersistentSettings runs at the end of the player's init, after the controls are built
    await expect(page.locator(`${wrapper} .fluid_controls_container`)).toBeAttached();
    await page.waitForTimeout(300);
}

const video = (page: Page) => page.locator('#fluid-player-e2e-case');
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);

test.describe('persistent settings', () => {

    test.beforeEach(async () => {
        console.log(`Running ${test.info().title}`);
    });

    test.describe('restoring', () => {
        test('remembered theatre mode is not applied when allowTheatre is false', async ({ page }) => {
            await openWithStorage(page, '?noTheatre=1', { fluidTheatre: 'true' });
            await expect(page.locator(wrapper)).not.toHaveClass(/fluid_theatre_mode/);
        });

        test('remembered theatre mode is applied when theatre mode is allowed', async ({ page }) => {
            await openWithStorage(page, '', { fluidTheatre: 'true' });
            await expect(page.locator(wrapper)).toHaveClass(/fluid_theatre_mode/);
        });

        test('remembered speed is not applied when the speed menu is off', async ({ page }) => {
            await openWithStorage(page, '', { fluidSpeed: '2' });
            expect(await video(page).evaluate((v) => (v as HTMLVideoElement).playbackRate)).toBe(1);
        });

        test('remembered speed is applied when the speed menu is on', async ({ page }) => {
            await openWithStorage(page, '?speedMenu=1', { fluidSpeed: '2' });
            await expect.poll(() => video(page).evaluate((v) => (v as HTMLVideoElement).playbackRate)).toBe(2);
        });

        test('remembered volume does not override mute: true', async ({ page }) => {
            await openWithStorage(page, '?mute=1', { fluidVolume: '0.8', fluidMute: 'false' });
            expect(await video(page).evaluate((v) => (v as HTMLVideoElement).volume)).toBe(0);
        });

        test('a remembered mute is applied when the player is not set to start muted', async ({ page }) => {
            await openWithStorage(page, '', { fluidVolume: '0.5', fluidMute: 'true' });
            await expect.poll(() => video(page).evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true);
            expect(await stored(page, 'fluidMute')).toBe('true');
        });

        test('remembered volume is applied when the player is not set to start muted', async ({ page }) => {
            await openWithStorage(page, '', { fluidVolume: '0.5', fluidMute: 'false' });
            await expect.poll(() => video(page).evaluate((v) => (v as HTMLVideoElement).volume)).toBe(0.5);
        });
    });

    test.describe('saving', () => {
        test('theatre mode is not saved when persistentSettings.theatre is false', async ({ page }) => {
            await openWithStorage(page, '?noPersist=theatre');
            await page.locator('.fluid_control_theatre').click();
            await expect(page.locator(wrapper)).toHaveClass(/fluid_theatre_mode/);
            expect(await stored(page, 'fluidTheatre')).toBeNull();
        });

        test('speed is not saved when persistentSettings.speed is false', async ({ page }) => {
            await openWithStorage(page, '?speedMenu=1&noPersist=speed');
            await page.evaluate(() => (window as any).instance.setPlaybackSpeed(1.5));
            expect(await video(page).evaluate((v) => (v as HTMLVideoElement).playbackRate)).toBe(1.5);
            expect(await stored(page, 'fluidSpeed')).toBeNull();
        });

        test('volume and mute are not saved when persistentSettings.volume is false', async ({ page }) => {
            await openWithStorage(page, '?noPersist=volume');
            await page.locator(wrapper).hover();
            await page.locator('.fluid_control_mute').click();
            expect(await video(page).evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true);
            expect(await stored(page, 'fluidVolume')).toBeNull();
            expect(await stored(page, 'fluidMute')).toBeNull();
        });

        test('settings are saved when their persistentSettings flag is on', async ({ page }) => {
            await openWithStorage(page, '?speedMenu=1');
            await page.locator('.fluid_control_theatre').click();
            await page.evaluate(() => (window as any).instance.setPlaybackSpeed(1.5));
            await page.locator(wrapper).hover();
            await page.locator('.fluid_control_mute').click();
            expect(await stored(page, 'fluidTheatre')).toBe('true');
            expect(await stored(page, 'fluidSpeed')).toBe('1.5');
            expect(await stored(page, 'fluidMute')).toBe('true');
        });

        test('setting the volume to 0 is saved as muted', async ({ page }) => {
            await openWithStorage(page, '');
            await page.evaluate(() => (window as any).instance.setVolume(0));
            expect(await stored(page, 'fluidMute')).toBe('true');
        });

        test('a player that starts muted (mute: true) does not save a muted state', async ({ page }) => {
            await openWithStorage(page, '?mute=1');
            expect(await video(page).evaluate((v) => (v as HTMLVideoElement).volume)).toBe(0);
            expect(await stored(page, 'fluidMute')).toBeNull();
        });
    });
});
