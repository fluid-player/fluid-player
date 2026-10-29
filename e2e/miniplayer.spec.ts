import { test, expect } from '@playwright/test';

test.describe('miniplayer', () => {
    test.beforeEach(async ({ page }) => {
        console.log(`Running ${test.info().title}`);
        await page.goto('/miniplayer.html');
    });

    const wrapper = '#fluid_video_wrapper_fluid-player-e2e-case';
    const miniPlayerClass = /(^|\s)fluid_mini_player_mode(\s|$)/;
    const placeholder = '.fluidplayer-miniplayer-player-placeholder';

    test('should toggle on and off through the API, with placeholder and events', async ({ page }) => {
        await expect(page.locator(wrapper)).not.toHaveClass(miniPlayerClass);
        await expect(page.locator(placeholder)).toHaveCount(0);

        await page.evaluate(() => (window as any).instance.toggleMiniPlayer(true));

        await expect(page.locator(wrapper)).toHaveClass(/fluid_mini_player_mode--bottom-right/);
        await expect(page.locator(placeholder)).toHaveText('Playing in Miniplayer');
        await expect.poll(() => page.locator(wrapper).evaluate(el => el.getBoundingClientRect().width)).toBeCloseTo(400, 0);
        await expect.poll(() => page.locator(wrapper).evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo(225, 0);

        await page.evaluate(() => (window as any).instance.toggleMiniPlayer(false));

        await expect(page.locator(wrapper)).not.toHaveClass(miniPlayerClass);
        await expect(page.locator(placeholder)).toHaveCount(0);
        expect(await page.evaluate(() => (window as any).miniPlayerEvents)).toEqual([true, false]);
    });

    test('should ignore forcing the miniplayer to the state it is already in', async ({ page }) => {
        await page.evaluate(() => (window as any).instance.toggleMiniPlayer(false));
        expect(await page.evaluate(() => (window as any).miniPlayerEvents)).toEqual([]);

        await page.evaluate(() => (window as any).instance.toggleMiniPlayer(true));
        await page.evaluate(() => (window as any).instance.toggleMiniPlayer(true));
        expect(await page.evaluate(() => (window as any).miniPlayerEvents)).toEqual([true]);
    });

    test('should restore the player when clicking the placeholder', async ({ page }) => {
        await page.evaluate(() => (window as any).instance.toggleMiniPlayer(true));
        await page.locator(placeholder).click();

        await expect(page.locator(wrapper)).not.toHaveClass(miniPlayerClass);
        await expect(page.locator(placeholder)).toHaveCount(0);
    });

    test('should close the miniplayer and pause the video with the close button', async ({ page }) => {
        const video = page.locator('video#fluid-player-e2e-case');
        await page.locator(wrapper).click();
        await page.waitForFunction(() => !document.querySelector('video')!.paused);

        await page.evaluate(() => (window as any).instance.toggleMiniPlayer(true));
        await page.locator('.mini-player-close-button').first().click();

        await expect(page.locator(wrapper)).not.toHaveClass(miniPlayerClass);
        await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
    });

    test('should auto toggle on when a playing video is scrolled out of view', async ({ page }) => {
        await page.locator(wrapper).click();
        await page.waitForFunction(() => !document.querySelector('video')!.paused);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect(page.locator(wrapper)).toHaveClass(miniPlayerClass);
        await expect(page.locator(placeholder)).toBeAttached();
        expect(await page.evaluate(() => (window as any).miniPlayerEvents)).toEqual([true]);
    });

    test('should not auto toggle while the video is paused', async ({ page }) => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);

        await expect(page.locator(wrapper)).not.toHaveClass(miniPlayerClass);
    });

    test('should stop auto toggling once the miniplayer is toggled manually', async ({ page }) => {
        await page.locator(wrapper).click();
        await page.waitForFunction(() => !document.querySelector('video')!.paused);
        await page.evaluate(() => (window as any).instance.toggleMiniPlayer(true));
        await page.evaluate(() => (window as any).instance.toggleMiniPlayer(false));

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);

        await expect(page.locator(wrapper)).not.toHaveClass(miniPlayerClass);
    });
});
