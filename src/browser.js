/**
 * Build entry point for CDN builds.
 * You SHOULD NOT import this file except if you plan to build browser distribution of Fluid Player.
 */

import fluidPlayerInitializer from './index';

// Import CSS automatically in browser builds.
import './css/fluidplayer.css';

if (window) {
    // TODO: all webpack dynamic imports should look here first and all imported vendor modules should load into this object.
    // TODO: webpack dynamic imports should not touch "window" or globals.

    /**
     * Register vendors global. Allows for user override of vendor dependencies.
     * First time a third party dependency is needed, Fluid Player will look for it
     * in this map. If no appropriate dependency is registered, Fluid Player will attempt
     * to dynamically load the dependency.
     */
    if (!window.fluidPlayerVendors) {
        window.fluidPlayerVendors = {};
    }

    /**
     * Register public interface.
     */
    if (!window.fluidPlayer) {
        window.fluidPlayer = fluidPlayerInitializer;
    }
}

