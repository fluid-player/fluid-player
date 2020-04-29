'use strict';

import promisePolyfill from 'es6-promise';
import './css/fluidplayer.css';
import fluidPlayerInitializer from './fluidplayer.js';

promisePolyfill.polyfill();

export default fluidPlayerInitializer;
