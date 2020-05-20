'use strict';

if ('undefined' === typeof FP_HOMEPAGE) {
    global.FP_HOMEPAGE = 'https://fluidplayer.com';
}

if ('undefined' === typeof FP_BUILD_VERSION) {
    global.FP_BUILD_VERSION = 'v3';
}

if ('undefined' === typeof FP_ENV) {
    const isLocalhost = window
        && window.location
        && (window.location.hostname === 'localhost'
            || window.location.hostname === '127.0.0.1'
            || window.location.hostname === '');

    if (process && process.env && process.env.NODE_ENV) {
        global.FP_ENV = process.env.NODE_ENV;
    } else if (window && !isLocalhost) {
        global.FP_ENV = 'production';
    } else {
        global.FP_ENV = 'development';
    }
}

if ('undefined' === typeof FP_DEBUG) {
    global.FP_DEBUG = false;
}

import './polyfills';
import fluidPlayerInitializer from './fluidplayer.js';

export default fluidPlayerInitializer;
