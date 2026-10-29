import { test, expect, Page } from '@playwright/test';

const qualityItem = (page: Page, title: string) =>
    page.locator('.fluid_video_source_list_item', { hasText: title });

async function startAndOpenMenu(page: Page) {
    await page.locator('.fluid_button_play').click();
    await page.waitForFunction(() => {
        const v = document.querySelector('video') as HTMLVideoElement | null;
        return !!v && !v.paused && v.currentTime > 0.5;
    });
    await page.locator('.fluid_control_video_source').hover();
    await page.locator('.fluid_control_video_source').click();
    await expect(page.locator('.fluid_video_sources_list')).toBeVisible();
}

// hls.js reports the level actually playing from currentLevel; autoLevelEnabled tells whether ABR is on.
const hlsState = (page: Page) => page.evaluate(() => {
    const hls = (window as any).instance.hlsInstance();
    return { level: hls.currentLevel as number, auto: hls.autoLevelEnabled as boolean };
});

test.describe('HLS quality switching', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
        await page.goto('/hls_quality.html');
        await page.waitForFunction(() => (window as any).instance?.hlsInstance()?.levels?.length === 2);
    });

    test('lists every rendition sorted by height plus auto, with auto selected', async ({ page }) => {
        await startAndOpenMenu(page);

        const items = page.locator('.fluid_video_source_list_item');
        await expect(items).toHaveText(['360p', '240p', 'auto']);
        await expect(qualityItem(page, 'auto').locator('.source_button_icon')).toHaveClass(/source_selected/);
        await expect(page.locator('.source_selected')).toHaveCount(1);
        expect((await hlsState(page)).auto).toBe(true);
    });

    test('selecting a rendition switches the hls.js level and the selected marker', async ({ page }) => {
        await startAndOpenMenu(page);

        await qualityItem(page, '240p').click();

        await expect.poll(() => hlsState(page)).toEqual({ level: 0, auto: false });
        await expect(qualityItem(page, '240p').locator('.source_button_icon')).toHaveClass(/source_selected/);
        await expect(page.locator('.source_selected')).toHaveCount(1);
        // The menu closes after a selection
        await expect(page.locator('.fluid_video_sources_list')).toBeHidden();

        // Playback continues on the new level
        const t = await page.evaluate(() => (document.querySelector('video') as HTMLVideoElement).currentTime);
        await page.waitForFunction((t0) => (document.querySelector('video') as HTMLVideoElement).currentTime > t0 + 0.5, t);
    });

    test('switching back to auto restores adaptive level selection', async ({ page }) => {
        await startAndOpenMenu(page);
        await qualityItem(page, '360p').click();
        await expect.poll(() => hlsState(page)).toEqual({ level: 1, auto: false });

        await page.locator('.fluid_control_video_source').click();
        await qualityItem(page, 'auto').click();

        await expect.poll(async () => (await hlsState(page)).auto).toBe(true);
        await expect(qualityItem(page, 'auto').locator('.source_button_icon')).toHaveClass(/source_selected/);
        await expect(page.locator('.source_selected')).toHaveCount(1);
    });

    test('chosen quality persists across a page reload', async ({ page }) => {
        await startAndOpenMenu(page);
        await qualityItem(page, '240p').click();
        await expect.poll(() => hlsState(page)).toEqual({ level: 0, auto: false });

        // beforeEach's storage clearing is skipped on reload via the session flag
        await page.evaluate(() => sessionStorage.setItem('keep', '1'));
        await page.reload();
        await page.waitForFunction(() => (window as any).instance?.hlsInstance()?.levels?.length === 2);
        await page.locator('.fluid_button_play').click();
        await page.waitForFunction(() => (document.querySelector('video') as HTMLVideoElement).currentTime > 0.5);

        expect(await hlsState(page)).toEqual({ level: 0, auto: false });
        await page.locator('.fluid_control_video_source').click();
        await expect(qualityItem(page, '240p').locator('.source_button_icon')).toHaveClass(/source_selected/);
        await expect(page.locator('.source_selected')).toHaveCount(1);
    });
});
