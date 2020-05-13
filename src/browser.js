/**
 * Build entry point for CDN builds.
 * You SHOULD NOT import this file except if you plan to build browser distribution of Fluid Player.
 */

import fluidPlayerInitializer from './index';

// Import CSS automatically in browser builds.
import './css/fluidplayer.css';

if (window) {
    /**
     * Register public interface.
     */
    if (!window.fluidPlayer) {
        window.fluidPlayer = fluidPlayerInitializer;
    }
}

