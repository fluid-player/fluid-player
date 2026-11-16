import { test, expect, Page } from '@playwright/test';
import { waitForVideoToPlay, setVideoCurrentTime, getVideoDuration } from './functions/video';

const autoplayButton = (page: Page) => page.locator('.fluid_control_autoplay');
const overlay = (page: Page) => page.locator('.fluid_autoplay_overlay');
const grid = (page: Page) => page.locator('.suggested_tile_grid');
const video = (page: Page) => page.locator('video');

/** Play, then seek to the final moment so the main video ends and the end-of-video hook runs. */
const playToEnd = async (page: Page) => {
    await page.locator('.fluid_video_wrapper').click();
    await waitForVideoToPlay(video(page));
    const duration = await getVideoDuration(video(page));
    await setVideoCurrentTime(video(page), duration - 0.3);
};

const events = (page: Page) => page.evaluate(() => (window as any).autoPlayEvents || []);

test.describe('autoplay next video (FP-323)', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
    });

    test('the toggle is shown with switch semantics when enabled and configUrl is set', async ({ page }) => {
        await page.goto('/autoplay_e2e.html');
        await expect(autoplayButton(page)).toBeVisible();
        await expect(autoplayButton(page)).toHaveAttribute('role', 'switch');
        await expect(autoplayButton(page)).toHaveAttribute('aria-checked', 'true');
        await expect(autoplayButton(page)).toHaveAttribute('aria-label', 'Autoplay');
        await expect(autoplayButton(page)).toHaveAttribute('title', 'Autoplay is on');
    });

    test('toggling updates state, tooltip and persists the preference', async ({ page }) => {
        await page.goto('/autoplay_e2e.html');
        await autoplayButton(page).click();
        await expect(autoplayButton(page)).toHaveAttribute('aria-checked', 'false');
        await expect(autoplayButton(page)).toHaveAttribute('title', 'Autoplay is off');
        expect(await page.evaluate(() => localStorage.getItem('fluidAutoPlay'))).toBe('false');

        // Returning viewer keeps the off preference
        await page.reload();
        await expect(autoplayButton(page)).toHaveAttribute('aria-checked', 'false');
    });

    test('at the end of the video the countdown overlay is shown instead of the grid', async ({ page }) => {
        await page.goto('/autoplay_e2e.html');
        await playToEnd(page);

        await expect(overlay(page)).toBeVisible({ timeout: 10000 });
        await expect(grid(page)).toHaveCount(0);
        await expect(page.locator('.fluid_autoplay_uptitle')).toHaveText('Up next');
        await expect(page.locator('.fluid_autoplay_title')).not.toHaveText('');
        await expect(page.locator('.fluid_autoplay_seconds')).toHaveText('3');
        await expect(page.locator('.fluid_autoplay_cancel')).toBeVisible();
        await expect(page.locator('.fluid_autoplay_playnow')).toBeVisible();

        const names = (await events(page)).map((e: any) => e.name);
        expect(names).toContain('autoPlayCountdownStarted');
    });

    test('Cancel closes the overlay and shows the suggested grid', async ({ page }) => {
        await page.goto('/autoplay_e2e.html');
        await playToEnd(page);
        await expect(overlay(page)).toBeVisible({ timeout: 10000 });

        await page.locator('.fluid_autoplay_cancel').click();
        await expect(overlay(page)).toHaveCount(0);
        await expect(grid(page)).toBeVisible();

        const names = (await events(page)).map((e: any) => e.name);
        expect(names).toContain('autoPlayCancelled');
    });

    test('Play now starts the next video immediately', async ({ page }) => {
        await page.goto('/autoplay_e2e.html');
        const firstSrc = await video(page).evaluate((v: HTMLVideoElement) => v.currentSrc);
        await playToEnd(page);
        await expect(overlay(page)).toBeVisible({ timeout: 10000 });

        await page.locator('.fluid_autoplay_playnow').click();
        await expect(overlay(page)).toHaveCount(0);
        // The next video is loaded via the reused suggested-videos pipeline
        await page.waitForFunction(
            (prev) => {
                const v = document.querySelector('video') as HTMLVideoElement;
                return v && v.currentSrc && v.currentSrc !== prev;
            },
            firstSrc,
            { timeout: 10000 }
        );

        const names = (await events(page)).map((e: any) => e.name);
        expect(names).toContain('autoPlayPlayNow');
        expect(names).not.toContain('autoPlayCompleted');
    });

    test('toggling autoplay off during the countdown cancels it', async ({ page }) => {
        await page.goto('/autoplay_e2e.html');
        await playToEnd(page);
        await expect(overlay(page)).toBeVisible({ timeout: 10000 });

        await autoplayButton(page).click();
        await expect(overlay(page)).toHaveCount(0);

        const names = (await events(page)).map((e: any) => e.name);
        expect(names).toContain('autoPlayCancelled');
    });

    test('with autoplay off, the existing end-of-video grid behaviour is preserved', async ({ page }) => {
        await page.goto('/autoplay_e2e.html');
        await autoplayButton(page).click();
        await expect(autoplayButton(page)).toHaveAttribute('aria-checked', 'false');

        await playToEnd(page);
        await expect(grid(page)).toBeVisible({ timeout: 10000 });
        await expect(overlay(page)).toHaveCount(0);
    });

    test('the countdown completes and the next video plays automatically', async ({ page }) => {
        await page.goto('/autoplay_e2e.html');
        const firstSrc = await video(page).evaluate((v: HTMLVideoElement) => v.currentSrc);
        await playToEnd(page);
        await expect(overlay(page)).toBeVisible({ timeout: 10000 });

        // countdown is 3s — wait for it to elapse and the next video to load
        await page.waitForFunction(
            (prev) => {
                const v = document.querySelector('video') as HTMLVideoElement;
                return v && v.currentSrc && v.currentSrc !== prev;
            },
            firstSrc,
            { timeout: 10000 }
        );
        await expect(overlay(page)).toHaveCount(0);

        const names = (await events(page)).map((e: any) => e.name);
        expect(names).toContain('autoPlayCompleted');
    });

});
