'use strict';
export default function (playerInstance, options) {
    playerInstance.isTouchDevice = () => {
        return !!('ontouchstart' in window        // works on most browsers
            || navigator.maxTouchPoints);       // works on IE10/11 and Surface
    };

    /**
     * Distinguishes iOS from Android devices and the OS version.
     *
     * This should be avoided in favor of capability detection.
     *
     * @deprecated deprecated as of v3.0
     * @returns object
     */
    playerInstance.getMobileOs = () => {
        const ua = navigator.userAgent || '';
        const result = {device: false, userOs: false, userOsVer: false, userOsMajor: false};

        let versionIndex;
        // determine OS
        if (ua.match(/Android/i)) {
            result.userOs = 'Android';
            versionIndex = ua.indexOf('Android ');
        } else if (ua.match(/iPhone/i)) {
            result.device = 'iPhone';
            result.userOs = 'iOS';
            versionIndex = ua.indexOf('OS ');
        } else if (ua.match(/iPad/i)) {
            result.device = 'iPad';
            result.userOs = 'iOS';
            versionIndex = ua.indexOf('OS ');
        } else {
            result.userOs = false;
        }

        // determine version
        if ('iOS' === result.userOs && versionIndex > -1) {
            const userOsTemp = ua.substr(versionIndex + 3);
            const indexOfEndOfVersion = userOsTemp.indexOf(' ');

            if (indexOfEndOfVersion !== -1) {
                result.userOsVer = userOsTemp.substring(0, userOsTemp.indexOf(' ')).replace(/_/g, '.');
                result.userOsMajor = parseInt(result.userOsVer);
            }
        } else if ('Android' === result.userOs && versionIndex > -1) {
            result.userOsVer = ua.substr(versionIndex + 8, 3);
        } else {
            result.userOsVer = false;
        }

        return result;
    };

    /**
     * Browser detection.
     * This should be avoided in favor of capability detection.
     *
     * @deprecated deprecated as of v3.0
     *
     * @returns object
     */
    playerInstance.getBrowserVersion = () => {
        const ua = navigator.userAgent || '';
        const result = {browserName: false, fullVersion: false, majorVersion: false, userOsMajor: false};

        let idx, uaindex;

        try {
            result.browserName = navigator.appName;

            if ((idx = ua.indexOf('OPR/')) !== -1) {
                result.browserName = 'Opera';
                result.fullVersion = ua.substring(idx + 4);
            } else if ((idx = ua.indexOf('Opera')) !== -1) {
                result.browserName = 'Opera';
                result.fullVersion = ua.substring(idx + 6);
                if ((idx = ua.indexOf('Version')) !== -1)
                    result.fullVersion = ua.substring(idx + 8);
            } else if ((idx = ua.indexOf('MSIE')) !== -1) {
                result.browserName = 'Microsoft Internet Explorer';
                result.fullVersion = ua.substring(idx + 5);
            } else if ((idx = ua.indexOf('Chrome')) !== -1) {
                result.browserName = 'Google Chrome';
                result.fullVersion = ua.substring(idx + 7);
            } else if ((idx = ua.indexOf('Safari')) !== -1) {
                result.browserName = 'Safari';
                result.fullVersion = ua.substring(idx + 7);
                if ((idx = ua.indexOf('Version')) !== -1)
                    result.fullVersion = ua.substring(idx + 8);
            } else if ((idx = ua.indexOf('Firefox')) !== -1) {
                result.browserName = 'Mozilla Firefox';
                result.fullVersion = ua.substring(idx + 8);
            }

            // Others "name/version" is at the end of userAgent
            else if ((uaindex = ua.lastIndexOf(' ') + 1) < (idx = ua.lastIndexOf('/'))) {
                result.browserName = ua.substring(uaindex, idx);
                result.fullVersion = ua.substring(idx + 1);
                if (result.browserName.toLowerCase() === result.browserName.toUpperCase()) {
                    result.browserName = navigator.appName;
                }
            }

            // trim the fullVersion string at semicolon/space if present
            if ((uaindex = result.fullVersion.indexOf(';')) !== -1) {
                result.fullVersion = result.fullVersion.substring(0, uaindex);
            }
            if ((uaindex = result.fullVersion.indexOf(' ')) !== -1) {
                result.fullVersion = result.fullVersion.substring(0, uaindex);
            }

            result.majorVersion = parseInt('' + result.fullVersion, 10);

            if (isNaN(result.majorVersion)) {
                result.fullVersion = '' + parseFloat(navigator.appVersion);
                result.majorVersion = parseInt(navigator.appVersion, 10);
            }
        } catch (e) {
            //Return default obj.
        }

        return result;
    };

    playerInstance.compareVersion = (v1, v2) => {
        if (typeof v1 !== 'string') return false;
        if (typeof v2 !== 'string') return false;
        v1 = v1.split('.');
        v2 = v2.split('.');
        const k = Math.min(v1.length, v2.length);
        for (let i = 0; i < k; ++i) {
            v1[i] = parseInt(v1[i], 10);
            v2[i] = parseInt(v2[i], 10);
            if (v1[i] > v2[i]) return 1;
            if (v1[i] < v2[i]) return -1;
        }
        return v1.length === v2.length ? 0 : (v1.length < v2.length ? -1 : 1);
    };

    playerInstance.convertTimeStringToSeconds = (str) => {
        if (!(str && str.match(/^(\d){2}(:[0-5][0-9]){2}(.(\d){1,3})?$/))) {
            return false;
        }

        const timeParts = str.split(':');
        return ((parseInt(timeParts[0], 10)) * 3600) + ((parseInt(timeParts[1], 10)) * 60) + (parseInt(timeParts[2], 10));
    };

    // Format time to hh:mm:ss
    playerInstance.formatTime = (duration) => {
        const formatDateObj = new Date(duration * 1000);
        const formatHours = playerInstance.pad(formatDateObj.getUTCHours());
        const formatMinutes = playerInstance.pad(formatDateObj.getUTCMinutes());
        const formatSeconds = playerInstance.pad(formatDateObj.getSeconds());

        return formatHours >= 1
            ? formatHours + ':' + formatMinutes + ':' + formatSeconds
            : formatMinutes + ':' + formatSeconds;
    };

    playerInstance.pad = (value) => {
        if (value < 10) {
            return '0' + value;
        }
        return value;
    };
}
