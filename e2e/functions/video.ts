import { Locator, Page } from 'playwright';

/**
 * Seek to a given time in the video
 *
 * @param video - Playwright video locator
 * @param time - The time you want to seek to
 */
export async function setVideoCurrentTime(video: Locator, time: number): Promise<void> {
    await video.page().waitForFunction(
        (vid) => {
            const videoElement = vid as HTMLVideoElement | null;
            return videoElement && videoElement.readyState >= 2;
        },
        await video.elementHandle(),
        { timeout: 10000 }
    );

    // Seek to the specified time
    await video.evaluate((vid, t) => {
        const videoElement = vid as HTMLVideoElement;
        videoElement.currentTime = t;
    }, time);
}

/**
 * Wait until the video duration has changed
 * This way you can detect if the ad or content is loaded in
 *
 * @param page - The Playwright page instance
 * @param initialDuration - The initial duration of the video element
 * @param timeout
 */
export async function waitForVideoDurationChange(
    page: Page,
    initialDuration: number,
    timeout: number = 10000
): Promise<void> {
    await page.waitForFunction(
        (initialDur) => {
            const videoElement = document.querySelector('video') as HTMLVideoElement;
            return videoElement.duration !== initialDur;
        },
        initialDuration,
        { timeout }
    );
}

/**
 * Get the current duration of the video
 *
 * @param video - Playwright video locator
 * @returns video duration time
 */
export async function getVideoDuration(video: Locator): Promise<number> {
    return await video.evaluate((vid) => {
        const videoElement = vid as HTMLVideoElement;
        return videoElement.duration;
    });
}

/**
 * Get the current time of the video
 *
 * @param video - Playwright video locator
 * @returns video current time
 */
export async function getVideoCurrentTime(video: Locator): Promise<number> {
    return await video.evaluate((vid) => {
        const videoElement = vid as HTMLVideoElement;
        return videoElement.currentTime;
    });
}

/**
 * Waits until the given video element starts playing.
 *
 * @param video - The Playwright Locator for the video element.
 */
export async function waitForVideoToPlay(video: Locator): Promise<void> {
    await video.evaluate((vid) => {
        return new Promise<void>((resolve) => {
            vid.addEventListener('playing', () => resolve(), { once: true });
        });
    });
}