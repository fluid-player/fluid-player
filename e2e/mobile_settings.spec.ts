import { test, expect, Page } from '@playwright/test';

// Touch devices are detected through (pointer: coarse)
const useCoarsePointer = (page: Page) => page.addInitScript(() => {
    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = query => matchMedia(query.includes('pointer: coarse') ? 'all' : query);
});

const wrapper = (page: Page) => page.locator('.fluid_video_wrapper');
const settingsButton = (page: Page) => page.locator('.fluid_control_settings');
const sheet = (page: Page) => page.locator('.fluid_settings_sheet');
const rows = (page: Page) => page.locator('.fluid_settings_row');

const openSettings = async (page: Page) => {
    await settingsButton(page).click();
    await expect(sheet(page)).toBeVisible();
};

const pickOption = async (page: Page, row: string, option: string) => {
    await openSettings(page);
    await page.getByRole('button', { name: row }).click();
    await page.getByRole('radio', { name: option, exact: true }).click();
    await expect(sheet(page)).toBeHidden();
};

test.describe('compact (mobile) layout and settings menu', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
    });

    test('touch devices get the compact bar, secondary controls move into the settings sheet', async ({ page }) => {
        await useCoarsePointer(page);
        await page.goto('/playback_seek.html');

        await expect(wrapper(page)).toHaveClass(/fluid_mobile_layout/);
        await expect(settingsButton(page)).toBeVisible();
        await expect(settingsButton(page)).toHaveAttribute('aria-label', 'Settings');
        await expect(page.locator('.fluid_control_playback_rate')).toBeHidden();
        await expect(sheet(page)).toBeHidden();

        await openSettings(page);
        // Only controls enabled on this page get a row
        await expect(rows(page)).toHaveText([/Playback Speed/, /Theatre Mode/, /Mini Player/]);
        await page.getByRole('button', { name: 'Close settings' }).click();
        await expect(sheet(page)).toBeHidden();

        await pickOption(page, 'Playback Speed', 'x1.5');
        expect(await page.evaluate(() => document.querySelector('video')!.playbackRate)).toBe(1.5);
        // The desktop popup the option belongs to stays closed
        await expect(page.locator('.fluid_video_playback_rates')).toBeHidden();

        await openSettings(page);
        await expect(page.getByRole('button', { name: 'Playback Speed' })).toContainText('x1.5');
        await page.keyboard.press('Escape');
        await expect(sheet(page)).toBeHidden();
    });

    test('small players get the compact layout with a mouse too, and switch back when they grow', async ({ page }) => {
        await page.goto('/playback_seek.html');
        const resizePlayer = (width: string) => wrapper(page).evaluate((el, w) => { (el as HTMLElement).style.width = w; }, width);

        await expect(wrapper(page)).not.toHaveClass(/fluid_mobile_layout/);
        await resizePlayer('420px');
        await expect(wrapper(page)).toHaveClass(/fluid_mobile_layout/);

        // On a large screen the sheet opens inside the player
        await openSettings(page);
        const bottom = async (el: ReturnType<typeof sheet>) => { const box = (await el.boundingBox())!; return Math.round(box.y + box.height); };
        await expect.poll(() => bottom(sheet(page))).toBe(await bottom(wrapper(page)));

        await resizePlayer('1000px');
        await expect(wrapper(page)).not.toHaveClass(/fluid_mobile_layout/);
        await expect(sheet(page)).toBeHidden();
        await expect(settingsButton(page)).toBeHidden();
        await expect(page.locator('.fluid_control_playback_rate')).toBeVisible();
        // The volume slider is back with the desktop bar
        await expect(page.locator('.fluid_control_volume_container')).toBeVisible();
    });

    test('desktop keeps the classic control bar', async ({ page }) => {
        await page.goto('/playback_seek.html');

        await expect(wrapper(page)).not.toHaveClass(/fluid_mobile_layout/);
        await expect(settingsButton(page)).toBeHidden();
        await expect(page.locator('.fluid_control_playback_rate')).toBeVisible();
    });

    test('the settings button only shows while the sheet has something to offer', async ({ page }) => {
        await useCoarsePointer(page);
        await page.goto('/controls.html');
        await page.evaluate(() => {
            document.body.innerHTML = '<video id="plain"><source src="/static/e2e/subtitles_30s.webm" type="video/webm"></video>'
                + '<video id="subs"><source src="/static/e2e/subtitles_30s.webm" type="video/webm">'
                + '<track label="English" kind="metadata" srclang="en" src="/static/subtitles/english.vtt" default></video>';
            const noExtras = { allowTheatre: false, miniPlayer: { enabled: false } };
            (window as any).fluidPlayer('plain', { layoutControls: noExtras });
            (window as any).fluidPlayer('subs', { layoutControls: { ...noExtras, subtitlesEnabled: true } });
        });

        const plain = page.locator('#fluid_video_wrapper_plain');
        await expect(plain).toHaveClass(/fluid_mobile_layout/);
        await expect(plain.locator('.fluid_control_settings')).toBeHidden();

        // Subtitles are enabled once vtt.js has loaded
        const subs = page.locator('#fluid_video_wrapper_subs');
        await expect(subs.locator('.fluid_control_settings')).toBeVisible();
        await subs.locator('.fluid_control_settings').click();
        await expect(subs.locator('.fluid_settings_row')).toHaveText([/Subtitles/, /Subtitle Size/]);
    });

    test('the sheet offers exactly the secondary buttons and options of the desktop bar', async ({ page }) => {
        await page.goto('/controls.html');
        await page.evaluate(() => {
            const src = 'https://media.w3.org/2010/05/video/movie_300.mp4';
            document.body.innerHTML = `<video id="all">
                <source src="${src}" title="720p" data-fluid-hd type="video/mp4">
                <source src="${src}?480" title="480p" type="video/mp4">
                <track label="English" kind="metadata" srclang="en" src="/static/subtitles/english.vtt" default>
                <track label="Deutsch" kind="metadata" srclang="de" src="/static/subtitles/deutsch.vtt"></video>`;
            (window as any).fluidPlayer('all', { layoutControls: {
                fillToContainer: false, playbackRateEnabled: true, subtitlesEnabled: true, allowDownload: true,
                allowTheatre: true, miniPlayer: { enabled: true },
            } });
        });
        const player = page.locator('#fluid_video_wrapper_all');
        await expect(page.locator('.fluid_subtitle_list_item:not(.fluid_sub_menu_button)')).toHaveCount(3);

        // Desktop bar: which secondary buttons show, and how many options each menu has
        const ROWS: Record<string, string[]> = {
            '.fluid_control_playback_rate': ['Playback Speed'], '.fluid_control_video_source': ['Quality'],
            '.fluid_control_subtitles': ['Subtitles', 'Subtitle Size'], '.fluid_control_cardboard': ['VR'],
            '.fluid_control_theatre': ['Theatre Mode'], '.fluid_control_mini_player': ['Mini Player'],
            '.fluid_control_download': ['Download'],
        };
        await player.evaluate(el => { (el as HTMLElement).style.width = '1000px'; });
        await expect(player).not.toHaveClass(/fluid_mobile_layout/);
        const expectedRows: string[] = [];
        for (const [button, rowLabels] of Object.entries(ROWS)) {
            if (await page.locator(button).isVisible()) {
                expectedRows.push(...rowLabels);
            }
        }
        const desktopOptions = {
            'Playback Speed': await page.locator('.fluid_video_playback_rates_item').count(),
            'Quality': await page.locator('.fluid_video_source_list_item').count(),
            'Subtitles': await page.locator('.fluid_subtitle_list_item:not(.fluid_sub_menu_button)').count(),
            'Subtitle Size': await page.locator('.fluid_subtitle_size_button:not(.fluid_sub_menu_button)').count(),
        };
        expect(expectedRows).toEqual(['Playback Speed', 'Quality', 'Subtitles', 'Subtitle Size', 'Theatre Mode', 'Mini Player', 'Download']);

        // Same player, compact layout
        await player.evaluate(el => { (el as HTMLElement).style.width = '420px'; });
        await expect(player).toHaveClass(/fluid_mobile_layout/);
        await openSettings(page);
        const sheetRows = await page.locator('.fluid_settings_row .fluid_settings_label').allTextContents();
        expect(sheetRows).toEqual(expectedRows);

        for (const [row, count] of Object.entries(desktopOptions)) {
            await expect(page.locator('.fluid_settings_row', { hasText: row }).locator('+ .fluid_settings_options .fluid_settings_option'))
                .toHaveCount(count);
        }
    });

    test('iPhones get every quality option too, .mkv named sources included', async ({ browser }) => {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            viewport: { width: 390, height: 844 },
            hasTouch: true,
        });
        const page = await context.newPage();
        await useCoarsePointer(page);
        await page.goto('/suggested_videos_subtitles.html');
        const player = page.locator('#fluid_video_wrapper_fluid-player-e2e-case');

        // Same three options as on desktop (the .mkv named ones were dropped on iOS before)
        await expect(player.locator('.fluid_video_source_list_item')).toHaveCount(3);
        // On phones the control bar shows once the player is touched
        await player.tap({ position: { x: 10, y: 10 } });
        await player.locator('.fluid_control_settings').click();
        await page.getByRole('button', { name: 'Quality' }).click();
        await expect(page.getByRole('radio')).toHaveText(['1080p', '720p', '480p'].map(t => new RegExp(t)));
        await expect(page.getByRole('radio', { name: /1080p/ })).toHaveAttribute('aria-checked', 'true');

        // Mute button only, no volume slider
        await expect(player.locator('.fluid_control_mute')).toBeVisible();
        await expect(player.locator('.fluid_control_volume_container')).toBeHidden();

        // ...and switching to one works like on desktop
        await page.getByRole('radio', { name: /720p/ }).click();
        await expect(player.locator('.js-source_720p .source_button_icon')).toHaveClass(/source_selected/);
        expect(await page.locator('#fluid-player-e2e-case').evaluate(v => (v as HTMLVideoElement).src)).toContain('valerian-720p');
        await context.close();
    });

    test('switching to a source the browser cannot play logs it and still switches, like master\'s .mkv check', async ({ page }) => {
        const logs: string[] = [];
        page.on('console', message => logs.push(message.text()));
        await page.goto('/controls.html');
        await page.evaluate(() => {
            const src = '/static/e2e/subtitles_30s.webm';
            document.body.innerHTML = `<video id="formats">
                <source src="${src}?720" title="720p" type="video/webm">
                <source src="${src}?1080" title="1080p" type="video/x-unplayable">
                <source src="${src}?av1" title="2160p" type='video/mp4; codecs="av01.0.04M.08"'></video>`;
            (window as any).fluidPlayer('formats', { layoutControls: { fillToContainer: false } });
        });
        const player = page.locator('#fluid_video_wrapper_formats');
        await player.evaluate(el => { (el as HTMLElement).style.width = '1000px'; });
        const pick = async (title: string) => {
            await player.hover();
            await player.locator('.fluid_control_video_source').click();
            await player.locator('.js-source_' + title).click();
        };

        await pick('1080p');
        await expect.poll(() => logs).toContain('[FP_ERROR] video/x-unplayable files not supported by this browser.');
        expect(await page.locator('#formats').evaluate(v => (v as HTMLVideoElement).src)).toContain('?1080');
        await expect(player.locator('.js-source_1080p .source_button_icon')).toHaveClass(/source_selected/);

        // Codec strings are case sensitive: a playable AV1 source must not be reported
        expect(await page.locator('#formats').evaluate(v => (v as HTMLVideoElement).canPlayType('video/mp4; codecs="av01.0.04M.08"'))).not.toBe('');
        await pick('2160p');
        await expect.poll(() => page.locator('#formats').evaluate(v => (v as HTMLVideoElement).src)).toContain('?av1');
        expect(logs.filter(log => log.includes('av01'))).toEqual([]);
    });

    test('timeline thumbnails show above the compact bar, not over its buttons', async ({ page }) => {
        await page.goto('/timeline_preview.html');
        await page.waitForFunction(() => (window as any).fluidPlayerDebug?.[0]?.internals.timelinePreviewData?.length > 0
            && (document.querySelector('#fluid-player-e2e-case') as HTMLVideoElement).duration > 0);
        await wrapper(page).evaluate(el => { (el as HTMLElement).style.width = '420px'; });
        await expect(wrapper(page)).toHaveClass(/fluid_mobile_layout/);

        const box = (await wrapper(page).boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        const bar = (await page.locator('.fluid_controls_progress_container').boundingBox())!;
        await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);

        const preview = page.locator('.fluid_timeline_preview_container');
        await expect(preview).toBeVisible();
        const previewBottom = await preview.evaluate(el => el.getBoundingClientRect().bottom);
        const buttonsTop = await page.locator('.fluid_controls_container').evaluate(el => el.getBoundingClientRect().top);
        expect(previewBottom).toBeLessThanOrEqual(buttonsTop);
    });

    test('the VR switch in the sheet works on phones, keeping master\'s phone VR controls', async ({ browser }) => {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
            viewport: { width: 844, height: 390 },
            hasTouch: true,
        });
        const page = await context.newPage();
        await useCoarsePointer(page);
        await page.goto('/vr.html');
        await page.waitForFunction(() => !!(window as any).fluidPlayerDebug[0].internals.vrViewer);

        // As on master, phones steer with the gyroscope: no joystick, and VR hides the volume slider
        await expect(page.locator('.fluid_vr_joystick_panel')).toHaveCount(0);

        await page.locator('#fluid_video_wrapper_fluid-player-e2e-case').tap({ position: { x: 10, y: 10 } });
        await page.locator('.fluid_control_settings').first().tap();
        await page.getByRole('switch', { name: 'VR' }).tap();
        await expect(page.locator('.fluid_vr2_controls_container')).toHaveCount(1);
        await expect(page.locator('.fluid_control_volume_container').first()).toHaveCSS('display', 'none');
        await context.close();
    });

    test('narrow players keep every bar control inside the player, with the mute button but no volume slider', async ({ page }) => {
        // A small sidebar player, narrow enough for the tighter spacing
        await page.goto('/playback_seek.html');
        await wrapper(page).evaluate(el => { (el as HTMLElement).style.width = '320px'; });
        await expect(wrapper(page)).toHaveClass(/fluid_mobile_layout/);

        const playerBox = (await wrapper(page).boundingBox())!;
        for (const control of ['.fluid_control_playpause', '.fluid_control_duration', '.fluid_control_mute', '.fluid_control_settings', '.fluid_control_fullscreen']) {
            const box = (await page.locator(control).boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(playerBox.x);
            expect(box.x + box.width).toBeLessThanOrEqual(playerBox.x + playerBox.width);
        }
        // The time still fits whole on one line, and there's no room for the volume slider
        expect(await page.locator('.fluid_control_duration').evaluate(el => el.scrollWidth <= el.clientWidth && el.clientHeight < 30)).toBe(true);
        await expect(page.locator('.fluid_control_volume_container')).toBeHidden();
    });

    test('tablets get the volume slider in the compact bar, where there is room for it', async ({ page }) => {
        await useCoarsePointer(page);
        await page.setViewportSize({ width: 820, height: 1180 });
        await page.goto('/playback_seek.html');
        await expect(wrapper(page)).toHaveClass(/fluid_mobile_layout/);

        const slider = page.locator('.fluid_control_volume_container');
        await expect(slider).toBeVisible();
        const sliderBox = (await slider.boundingBox())!;
        const muteBox = (await page.locator('.fluid_control_mute').boundingBox())!;
        const gearBox = (await settingsButton(page).boundingBox())!;
        // Between the mute button and the gear
        expect(sliderBox.x).toBeGreaterThanOrEqual(muteBox.x + muteBox.width);
        expect(sliderBox.x + sliderBox.width).toBeLessThanOrEqual(gearBox.x);
    });

    test('subtitle tracks and size work from the sheet like the desktop menu', async ({ page }) => {
        await useCoarsePointer(page);
        await page.goto('/subtitles.html');
        await expect(page.locator('.fluid_subtitle_list_item:not(.fluid_sub_menu_button)')).toHaveCount(3);

        await pickOption(page, 'Subtitles', 'Deutsch');
        await expect(page.locator('.fluid_subtitle_list_item', { hasText: /^Deutsch$/ }).locator('.subtitle_button_icon'))
            .toHaveClass(/subtitle_selected/);

        await pickOption(page, 'Subtitle Size', '150%');
        expect(await page.locator('.fluid_subtitles_container').evaluate(el => (el as HTMLElement).style.fontSize)).toBe('1.5em');

        await openSettings(page);
        await expect(page.getByRole('button', { name: 'Subtitles' })).toContainText('Deutsch');
        await expect(page.getByRole('button', { name: 'Subtitle Size' })).toContainText('150%');
    });

    test('HLS quality levels can be picked from the sheet', async ({ page }) => {
        await useCoarsePointer(page);
        await page.goto('/hls_quality.html');
        await page.waitForFunction(() => (window as any).instance?.hlsInstance()?.levels?.length === 2);
        await expect(page.locator('.fluid_video_source_list_item')).toHaveCount(3);

        await openSettings(page);
        await page.getByRole('button', { name: 'Quality' }).click();
        await expect(page.getByRole('radio', { name: 'auto' })).toHaveAttribute('aria-checked', 'true');
        const level = (await page.getByRole('radio').first().textContent())!;
        await page.getByRole('radio', { name: level, exact: true }).click();

        await expect.poll(() => page.evaluate(() => (window as any).instance.hlsInstance().autoLevelEnabled)).toBe(false);
        expect(await page.evaluate(() => localStorage.getItem('fluidQuality'))).toBe(level);
    });

    test('theatre mode and mini player are switches in the sheet', async ({ page }) => {
        await useCoarsePointer(page);
        await page.goto('/fullscreen_theatre.html');

        await openSettings(page);
        const theatre = page.getByRole('switch', { name: 'Theatre Mode' });
        await expect(theatre).toHaveAttribute('aria-checked', 'false');
        await theatre.click();
        await expect(wrapper(page)).toHaveClass(/fluid_theatre_mode/);

        await openSettings(page);
        await expect(theatre).toHaveAttribute('aria-checked', 'true');
        await theatre.click();
        await expect(wrapper(page)).not.toHaveClass(/fluid_theatre_mode/);
        expect(await page.evaluate(() => (window as any).displayEvents)).toEqual(['theatreModeOn', 'theatreModeOff']);

        await page.goto('/miniplayer.html');
        await openSettings(page);
        await page.getByRole('switch', { name: 'Mini Player' }).click();
        await expect(wrapper(page)).toHaveClass(/fluid_mini_player_mode--bottom-right/);
        await expect(wrapper(page)).toHaveClass(/fluid_mobile_layout/);
    });

    test('the sheet follows the light/dark colour scheme preference', async ({ page }) => {
        await useCoarsePointer(page);
        await page.goto('/playback_seek.html');
        await openSettings(page);

        const colours = () => page.evaluate(() => {
            const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
            return {
                sheet: style('.fluid_settings_sheet').backgroundColor,
                text: style('.fluid_settings_row').color,
                barText: style('.fluid_control_duration').color,
            };
        });

        await page.emulateMedia({ colorScheme: 'light' });
        expect(await colours()).toEqual({ sheet: 'rgb(255, 255, 255)', text: 'rgb(15, 15, 15)', barText: 'rgb(255, 255, 255)' });

        await page.emulateMedia({ colorScheme: 'dark' });
        expect(await colours()).toEqual({ sheet: 'rgb(33, 33, 33)', text: 'rgb(255, 255, 255)', barText: 'rgb(255, 255, 255)' });
    });

    test('the sheet works during an ad, as the desktop buttons stay visible then', async ({ page }) => {
        await useCoarsePointer(page);
        await page.goto('/ads_linear.html');

        await page.locator('.fluid_initial_play_button_container').click();
        await page.locator('.vast_clickthrough_layer').waitFor();
        await openSettings(page);
        await expect(rows(page)).toHaveText([/Theatre Mode/, /Mini Player/]);
        await page.getByRole('switch', { name: 'Theatre Mode' }).click();
        await expect(wrapper(page)).toHaveClass(/fluid_theatre_mode/);
    });

    test('during an ad the sheet\'s option lists stay closed, like the desktop menus', async ({ page }) => {
        await useCoarsePointer(page);
        await page.goto('/controls.html');
        await page.evaluate(() => {
            const src = '/static/e2e/subtitles_30s.webm';
            document.body.innerHTML = `<video id="with-ad" style="width:100%">
                <source src="${src}?720" title="720p" type="video/webm">
                <source src="${src}?480" title="480p" type="video/webm"></video>`;
            (window as any).fluidPlayer('with-ad', {
                layoutControls: { playbackRateEnabled: true },
                vastOptions: { adList: [{ roll: 'preRoll', vastTag: '/static/vast_linear_e2e.xml' }] },
            });
        });

        await page.locator('.fluid_initial_play_button_container').click();
        await page.locator('.vast_clickthrough_layer').waitFor();
        await openSettings(page);
        await expect(rows(page)).toHaveText([/Playback Speed/, /Quality/, /Theatre Mode/, /Mini Player/]);
        for (const row of ['Quality', 'Playback Speed']) {
            await page.getByRole('button', { name: row }).click();
            await expect(page.getByRole('button', { name: row })).toHaveAttribute('aria-expanded', 'false');
        }
        await expect(page.getByRole('radio')).toHaveCount(0);
    });

    test('the settings button and sheet work with the keyboard', async ({ page }) => {
        await page.setViewportSize({ width: 480, height: 720 });
        await page.goto('/playback_seek.html');
        await expect(wrapper(page)).toHaveClass(/fluid_mobile_layout/);
        const video = page.locator('video');

        // Clicking inside the player turns its keyboard shortcuts on
        await openSettings(page);

        // ...but they are off while the sheet is open
        await page.keyboard.press('Space');
        await page.keyboard.press('ArrowRight');
        expect(await video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
        expect(await video.evaluate(v => (v as HTMLVideoElement).currentTime)).toBe(0);

        await page.keyboard.press('Escape');
        await expect(sheet(page)).toBeHidden();
        await expect(settingsButton(page)).toBeFocused();

        // Enter on the focused button opens the sheet instead of toggling playback
        await page.keyboard.press('Enter');
        await expect(sheet(page)).toBeVisible();
        expect(await video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);

        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: 'Playback Speed' })).toBeFocused();
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Space');
        await expect(sheet(page)).toBeHidden();
        expect(await video.evaluate(v => (v as HTMLVideoElement).playbackRate)).toBe(2);
        await expect(settingsButton(page)).toBeFocused();
    });
});
