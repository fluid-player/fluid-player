import { Page, Request } from 'playwright';

/**
 * Wait for a specific network request and log it.
 *
 * @param page - The Playwright page instance.
 * @param url - The URL of the request to wait for.
 * @param method - The HTTP method of the request (default is 'GET').
 * @returns The intercepted request object.
 */
export async function waitForSpecificNetworkCall(
    page: Page,
    url: string,
    method: string = 'GET'
): Promise<Request> {
    const request = await page.waitForRequest((req) =>
        req.url() === url && req.method() === method
    );

    return request;
}