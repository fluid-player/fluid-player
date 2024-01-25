
if ('undefined' === typeof FP_HOMEPAGE) {
    globalThis.FP_HOMEPAGE = 'https://fluidplayer.com';
}

if ('undefined' === typeof FP_BUILD_VERSION) {
    globalThis.FP_BUILD_VERSION = 'v3';
}

if ('undefined' === typeof FP_ENV) {
    const isLocalhost = globalThis
        && globalThis.location
        && (globalThis.location.hostname === 'localhost'
            || globalThis.location.hostname === '127.0.0.1'
            || globalThis.location.hostname === '');

    if ('undefined' !== typeof process && process && process.env && process.env.NODE_ENV) {
        globalThis.FP_ENV = process.env.NODE_ENV;
    } else if (globalThis && !isLocalhost) {
        globalThis.FP_ENV = 'production';
    } else {
        globalThis.FP_ENV = 'development';
    }
}

if ('undefined' === typeof FP_DEBUG) {
    globalThis.FP_DEBUG = false;
}

import './polyfills';
import fluidPlayerInitializer from './fluidplayer.js';

export default fluidPlayerInitializer;
