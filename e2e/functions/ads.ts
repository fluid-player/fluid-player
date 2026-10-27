import { expect, Page } from '@playwright/test';
import { getVideoDuration } from './video';

/**
 * Wait for the linear ad skip countdown to finish, then skip the ad
 *
 * @param page - The Playwright page instance
 * @returns The duration of the skipped ad, to wait for the main video with waitForVideoDurationChange
 */
export async function skipAd(page: Page): Promise<number> {
    const skipButton = page.locator('.skip_button');

    await skipButton.waitFor({ timeout: 15000 });
    await expect(skipButton).toHaveText(/Skip ad in \d/);

    // The skip link only gets added once the countdown is done
    const skipLink = skipButton.locator('.js-skipHref');
    await skipLink.waitFor({ timeout: 10000 });
    const adDuration = await getVideoDuration(page.locator('video'));
    await skipLink.click();
    await expect(skipButton).toBeHidden();

    return adDuration;
}
