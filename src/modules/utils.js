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

    /**
     * Checks if element is fully visible in the viewport
     *
     * @param {Element} element
     * @returns {boolean|null}
     */
    playerInstance.isElementVisible = (element) => {
        if (!element) { return null; }

        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    playerInstance.observe = () => {
        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.intersectionRatio >= 0.5) {
                        playerInstance.domRef.player.inView = true;
                    }

                    if (entry.intersectionRatio == 0 && entry.target.glast) {
                        playerInstance.domRef.player.inView = false;
                    }
                });
            },
            {
                threshold: [0.0, 0.5],
            },
        );

        observer.observe(playerInstance.domRef.wrapper);
    }

    /**
     * Throttles callback by time
     *
     * @param callback
     * @param time
     * @returns {function(): void}
     */
    playerInstance.throttle = function throttle(callback, time) {
        let throttleControl = false;

        return function () {
            if (!throttleControl) {
                callback.apply(this, arguments);
                throttleControl = true;
                setTimeout(function () {
                    throttleControl = false;
                }, time);
            }
        }
    }

    playerInstance.getImageTwoMostProminentColours = (imageUrl) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = imageUrl;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                const imageData = ctx.getImageData(0, 0, img.width, img.height).data;

                const colorCount = {};
                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];
                    const color = `rgb(${r},${g},${b})`;

                    if (colorCount[color]) {
                        colorCount[color]++;
                    } else {
                        colorCount[color] = 1;
                    }
                }

                const rgbToHsl = (r, g, b) => {
                    r /= 255, g /= 255, b /= 255;
                    const max = Math.max(r, g, b), min = Math.min(r, g, b);
                    let h, s, l = (max + min) / 2;

                    if (max === min) {
                        h = s = 0;
                    } else {
                        const d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        switch (max) {
                            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                            case g: h = (b - r) / d + 2; break;
                            case b: h = (r - g) / d + 4; break;
                        }
                        h /= 6;
                    }

                    return [h, s, l];
                };

                const sortedColors = Object.keys(colorCount).map(color => {
                    const [r, g, b] = color.match(/\d+/g).map(Number);
                    const [h, s, l] = rgbToHsl(r, g, b);
                    return { color, h, s, l, score: s + (1 - Math.abs(2 * l - 1)) };
                }).sort((a, b) => b.score - a.score);

                const isCloseToBlack = (color) => {
                    const rgb = color.match(/\d+/g).map(Number);
                    const blackThreshold = 40;
                    return rgb[0] < blackThreshold && rgb[1] < blackThreshold && rgb[2] < blackThreshold;
                };

                const minHueDifference = 0.1;
                const minSaturationDifference = 0.1;
                const minLightnessDifference = 0.1;

                let mostVibrantColors = [];

                for (const colorObj of sortedColors) {
                    if (mostVibrantColors.length === 2) break;
                    if (!isCloseToBlack(colorObj.color)) {
                        const enoughDifference = mostVibrantColors.every(existingColor => {
                            const hueDifference = Math.abs(colorObj.h - existingColor.h);
                            const saturationDifference = Math.abs(colorObj.s - existingColor.s);
                            const lightnessDifference = Math.abs(colorObj.l - existingColor.l);
                            return (
                                hueDifference >= minHueDifference &&
                                saturationDifference >= minSaturationDifference &&
                                lightnessDifference >= minLightnessDifference
                            );
                        });
                        if (enoughDifference) {
                            mostVibrantColors.push(colorObj);
                        }
                    }
                }

                if (mostVibrantColors.length < 2) {
                    mostVibrantColors = sortedColors.slice(0, 2);
                }

                resolve(mostVibrantColors.map(colorObj => colorObj.color));
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
        });
    }
}
