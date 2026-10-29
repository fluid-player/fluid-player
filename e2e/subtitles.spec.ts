import { test, expect } from '@playwright/test';
import { setVideoCurrentTime } from './functions/video';

test.describe('subtitles', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        await page.goto('/subtitles.html');
        // The track list is built once the vtt.js chunk has loaded
        await expect(page.locator('.fluid_subtitle_list_item:not(.fluid_sub_menu_button)')).toHaveCount(3);
    });

    const container = (page) => page.locator('.fluid_subtitles_container');
    const openMenu = async (page) => {
        await page.locator('.fluid_control_subtitles').hover();
        await page.locator('.fluid_control_subtitles').click();
        await expect(page.locator('.fluid_subtitles_list')).toBeVisible();
    };
    const pickTrack = async (page, label: string) => {
        await openMenu(page);
        await page.locator('.fluid_subtitle_list_item', { hasText: new RegExp(`^${label}$`) }).click();
    };
    const seekAndPlay = async (page, time: number) => {
        const video = page.locator('#fluid-player-e2e-case');
        await setVideoCurrentTime(video, time);
        // renderSubtitles runs on timeupdate, which only fires on seek/playback
        await video.evaluate((v) => (v as HTMLVideoElement).dispatchEvent(new Event('timeupdate')));
    };

    test('should list the tracks plus OFF and select the default track', async ({ page }) => {
        const items = page.locator('.fluid_subtitle_list_item:not(.fluid_sub_menu_button)');
        await expect(items).toHaveText([/OFF/, /English/, /Deutsch/]);

        await expect(items.nth(1).locator('.subtitle_button_icon')).toHaveClass(/subtitle_selected/);
        await expect(items.nth(0).locator('.subtitle_button_icon')).not.toHaveClass(/subtitle_selected/);
        await expect(items.nth(2).locator('.subtitle_button_icon')).not.toHaveClass(/subtitle_selected/);
    });

    test('should render the cue text for the current time and clear it outside of a cue', async ({ page }) => {
        await seekAndPlay(page, 16);
        await expect(container(page)).toContainText('At the left we can see...');

        // No cue between 12s and 15s
        await seekAndPlay(page, 10);
        await expect(container(page)).toHaveText('');
    });

    test('should switch language and OFF disables rendering', async ({ page }) => {
        await seekAndPlay(page, 16);
        await expect(container(page)).toContainText('At the left we can see...');

        await pickTrack(page, 'Deutsch');
        await expect(page.locator('.fluid_subtitle_list_item').filter({ hasText: /^Deutsch$/ }).locator('.subtitle_button_icon')).toHaveClass(/subtitle_selected/);
        await seekAndPlay(page, 16);
        await expect(container(page)).toContainText('Auf der linken Seite sehen wir...');

        await pickTrack(page, 'OFF');
        await seekAndPlay(page, 16);
        await expect(container(page)).toHaveText('');
    });

    test('should resize subtitles through the font size menu', async ({ page }) => {
        await openMenu(page);
        await page.locator('.fluid_subtitles_list .fluid_sub_menu_button', { hasText: 'Font Size' }).click();
        const sizeMenu = page.locator('.fluid_subtitle_size_menu');
        await expect(sizeMenu).toBeVisible();

        await sizeMenu.locator('.fluid_subtitle_size_button', { hasText: '150%' }).click();
        expect(await container(page).evaluate((el) => (el as HTMLElement).style.fontSize)).toBe('1.5em');
        await expect(sizeMenu.locator('.subtitle_size_selected')).toHaveCount(1);
    });
});
