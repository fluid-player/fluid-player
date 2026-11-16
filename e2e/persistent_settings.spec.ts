import { test, expect, Page } from '@playwright/test';

/**
 * Remembered settings (persistentSettings) are stored in localStorage under names shared by every player
 * of a site. A value saved by one player must only be restored by a player that allows that feature,
 * and must only be saved when the matching persistentSettings flag is on.
 */
const wrapper = '#fluid_video_wrapper_fluid-player-e2e-case';

/** Opens the test page and waits for the player to apply the remembered settings */
async function open(page: Page, query: string) {
    await page.goto(`/persistent_settings.html${query}`);
    // setPersistentSettings runs at the end of the player's init, after the controls are built
    await expect(page.locator(`${wrapper} .fluid_controls_container`)).toBeAttached();
    await page.waitForTimeout(300);
}

/**
 * Fills localStorage as if another player of the site had saved these values, then opens the page.
 * Storage is filled once per test, so pages opened afterwards with open() see what the player saved.
 */
async function openWithStorage(page: Page, query: string, stored: Record<string, string> = {}) {
    await page.addInitScript((values) => {
        if (sessionStorage.getItem('seeded')) {
            return;
        }
        sessionStorage.setItem('seeded', '1');
        localStorage.clear();
        Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, value));
    }, stored);
    await open(page, query);
}

const video = (page: Page) => page.locator('#fluid-player-e2e-case');
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);
const playbackRate = (page: Page) => video(page).evaluate((v) => (v as HTMLVideoElement).playbackRate);
const volume = (page: Page) => video(page).evaluate((v) => (v as HTMLVideoElement).volume);
const muted = (page: Page) => video(page).evaluate((v) => (v as HTMLVideoElement).muted);
const currentSource = (page: Page) => video(page).evaluate((v) => (v as HTMLVideoElement).currentSrc);
const qualityItem = (page: Page, title: string) => page.locator('.fluid_video_source_list_item', { hasText: title });

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

        test('remembered theatre mode is not applied when persistentSettings.theatre is false', async ({ page }) => {
            await openWithStorage(page, '?noPersist=theatre', { fluidTheatre: 'true' });
            await expect(page.locator(wrapper)).not.toHaveClass(/fluid_theatre_mode/);
        });

        test('remembered speed is not applied when the speed menu is off', async ({ page }) => {
            await openWithStorage(page, '', { fluidSpeed: '2' });
            expect(await video(page).evaluate((v) => (v as HTMLVideoElement).playbackRate)).toBe(1);
        });

        test('remembered speed is applied when the speed menu is on', async ({ page }) => {
            await openWithStorage(page, '?speedMenu=1', { fluidSpeed: '2' });
            await expect.poll(() => video(page).evaluate((v) => (v as HTMLVideoElement).playbackRate)).toBe(2);
        });

        test('remembered speed is not applied when persistentSettings.speed is false', async ({ page }) => {
            await openWithStorage(page, '?speedMenu=1&noPersist=speed', { fluidSpeed: '2' });
            expect(await playbackRate(page)).toBe(1);
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

        test('remembered volume and mute are not applied when persistentSettings.volume is false', async ({ page }) => {
            await openWithStorage(page, '?noPersist=volume', { fluidVolume: '0.5', fluidMute: 'true' });
            expect(await volume(page)).toBe(1);
            expect(await muted(page)).toBe(false);
        });

        test('remembered quality is applied when the player has several sources', async ({ page }) => {
            await openWithStorage(page, '?sources=1', { fluidQuality: '720p' });
            await expect.poll(() => currentSource(page)).toContain('miniplayer_30s.webm');
            await expect(qualityItem(page, '720p').locator('.source_button_icon')).toHaveClass(/source_selected/);
        });

        test('remembered quality is not applied when persistentSettings.quality is false', async ({ page }) => {
            await openWithStorage(page, '?sources=1&noPersist=quality', { fluidQuality: '720p' });
            expect(await currentSource(page)).toContain('content_20s.webm');
            await expect(qualityItem(page, '360p').locator('.source_button_icon')).toHaveClass(/source_selected/);
        });

        test('a suggested video only gets the remembered settings the player allows', async ({ page }) => {
            // No speed menu and no theatre button on this player
            await openWithStorage(page, '?noTheatre=1', { fluidSpeed: '2', fluidTheatre: 'true' });

            // What clicking a suggested video tile does (the debug API exposes the player internals)
            await page.evaluate(() => (window as any).fluidPlayerDebug[0].internals.resetPlayer([
                { url: '/static/e2e/miniplayer_30s.webm', mimeType: 'video/webm', resolution: '360p' }
            ]));
            await expect.poll(() => currentSource(page)).toContain('miniplayer_30s.webm');
            await page.waitForTimeout(300);

            await expect(page.locator(wrapper)).not.toHaveClass(/fluid_theatre_mode/);
            expect(await playbackRate(page)).toBe(1);
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

        test('mute from the keyboard (M) is saved', async ({ page }) => {
            await openWithStorage(page, '');
            // Clicking the player turns on its keyboard shortcuts
            await page.locator(wrapper).click();
            await page.keyboard.press('m');
            expect(await muted(page)).toBe(true);
            expect(await stored(page, 'fluidMute')).toBe('true');
        });

        test('mute from the right-click menu is saved', async ({ page }) => {
            await openWithStorage(page, '');
            await page.locator(wrapper).click({ button: 'right' });
            await page.locator('.context_option_mute').click();
            expect(await muted(page)).toBe(true);
            expect(await stored(page, 'fluidMute')).toBe('true');
        });

        test('volume set with the slider is saved', async ({ page }) => {
            await openWithStorage(page, '');
            await page.locator(wrapper).hover();
            const slider = page.locator('.fluid_control_volume_container');
            const box = await slider.boundingBox();
            await slider.click({ position: { x: box!.width / 2, y: box!.height / 2 } });
            expect(Number(await stored(page, 'fluidVolume'))).toBeCloseTo(await volume(page), 5);
            expect(await volume(page)).toBeGreaterThan(0.3);
            expect(await volume(page)).toBeLessThan(0.7);
        });

        test('volume set with the arrow keys is saved', async ({ page }) => {
            await openWithStorage(page, '');
            await page.evaluate(() => (window as any).instance.setVolume(0.5));
            await page.locator(wrapper).click();
            await page.keyboard.press('ArrowDown');
            expect(Number(await stored(page, 'fluidVolume'))).toBeCloseTo(0.45, 5);
        });

        test('quality is not saved when persistentSettings.quality is false', async ({ page }) => {
            await openWithStorage(page, '?sources=1&noPersist=quality');
            await page.locator(wrapper).hover();
            await page.locator('.fluid_control_video_source').click();
            await qualityItem(page, '720p').click();
            await expect.poll(() => currentSource(page)).toContain('miniplayer_30s.webm');
            expect(await stored(page, 'fluidQuality')).toBeNull();
        });

        test('quality is saved when persistentSettings.quality is on', async ({ page }) => {
            await openWithStorage(page, '?sources=1');
            await page.locator(wrapper).hover();
            await page.locator('.fluid_control_video_source').click();
            await qualityItem(page, '720p').click();
            await expect.poll(() => currentSource(page)).toContain('miniplayer_30s.webm');
            expect(await stored(page, 'fluidQuality')).toBe('720p');
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

        test('unmuting a player that starts muted is saved', async ({ page }) => {
            await openWithStorage(page, '?mute=1');
            await page.locator(wrapper).hover();
            await page.locator('.fluid_control_mute').click();
            expect(await muted(page)).toBe(false);
            expect(await stored(page, 'fluidMute')).toBe('false');

            // The next player of the site without mute: true starts unmuted
            await open(page, '');
            expect(await muted(page)).toBe(false);
            expect(await volume(page)).toBeGreaterThan(0);
        });

        test('speed set through the API without the speed menu is saved, and only applied where the menu is on', async ({ page }) => {
            await openWithStorage(page, '');
            await page.evaluate(() => (window as any).instance.setPlaybackSpeed(1.5));
            expect(await stored(page, 'fluidSpeed')).toBe('1.5');

            await open(page, '');
            expect(await playbackRate(page)).toBe(1);

            await open(page, '?speedMenu=1');
            await expect.poll(() => playbackRate(page)).toBe(1.5);
        });
    });

    test.describe('several players of a site', () => {
        test('a player that starts muted does not make the next player start muted', async ({ page }) => {
            // The viewer had chosen volume 0.5, unmuted, on an earlier page
            await openWithStorage(page, '?mute=1', { fluidVolume: '0.5', fluidMute: 'false' });
            expect(await volume(page)).toBe(0);

            await open(page, '');
            expect(await muted(page)).toBe(false);
            expect(await volume(page)).toBe(0.5);
        });
    });
});
