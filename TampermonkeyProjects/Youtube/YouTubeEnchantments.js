// ==UserScript==
// @name           YouTube Enchantments
// @namespace      YouTube Auto-Liker 
// @version        0.1
// @description    Automatically likes videos of channels you're subscribed to and automatically scrolls down on Youtube with a toggle button
// @author         JJJ
// @match          https://www.youtube.com/*
// @exclude        https://www.youtube.com/*/community
// @icon           https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @require        https://raw.githubusercontent.com/sizzlemctwizzle/GM_config/master/gm_config.js
// @require        GM_config
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_registerMenuCommand
// @run-at         document-idle
// @noframes
// @license        MIT
// ==/UserScript==

(() => {
    'use strict';

    const SELECTORS = {
        PLAYER: '#movie_player',
        SUBSCRIBE_BUTTON: '#subscribe-button > ytd-subscribe-button-renderer, ytd-reel-player-overlay-renderer #subscribe-button',
        LIKE_BUTTON: '#menu .YtLikeButtonViewModelHost button, #segmented-like-button button, #like-button button',
        DISLIKE_BUTTON: '#menu .YtDislikeButtonViewModelHost button, #segmented-dislike-button button, #dislike-button button'
    };

    const autoLikedVideoIds = new Set();
    var isScrolling = false;
    var scrollInterval;

    function onInit() {
        const DEBUG = new Debugger(GM_info.script.name, GM_config.get('DEBUG_MODE'));
        setInterval(wait, GM_config.get('CHECK_FREQUENCY'), DEBUG);
    }

    function clearAutoLikedVideoIds() {
        autoLikedVideoIds.clear();
    }

    window.addEventListener('popstate', clearAutoLikedVideoIds);

    function getVideoId() {
        const watchFlexyElem = document.querySelector('#page-manager > ytd-watch-flexy');
        if (watchFlexyElem && watchFlexyElem.hasAttribute('video-id')) {
            return watchFlexyElem.getAttribute('video-id');
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('v');
        }
    }

    function watchThresholdReached(DEBUG) {
        const player = document.querySelector(SELECTORS.PLAYER);
        if (player) {
            const watched = player.getCurrentTime() / player.getDuration();
            const watchedTarget = GM_config.get('WATCH_THRESHOLD') / 100;
            if (watched < watchedTarget) {
                DEBUG.info(`Waiting until watch threshold reached (${watched.toFixed(2)}/${watchedTarget})...`);
                return false;
            }
        }
        return true;
    }

    function isSubscribed(DEBUG) {
        DEBUG.info('Checking whether subscribed...');
        const subscribeButton = document.querySelector(SELECTORS.SUBSCRIBE_BUTTON);
        if (!subscribeButton) {
            DEBUG.warn('Couldn\'t find sub button');
            return false;
        }
        const subscribed = subscribeButton.hasAttribute('subscribe-button-invisible') || subscribeButton.hasAttribute('subscribed');
        DEBUG.info(subscribed ? 'We are subscribed' : 'We are not subscribed');
        return subscribed;
    }

    function wait(DEBUG) {
        if (watchThresholdReached(DEBUG)) {
            try {
                if (GM_config.get('LIKE_IF_NOT_SUBSCRIBED') || isSubscribed(DEBUG)) {
                    if (GM_config.get('AUTO_LIKE_LIVE_STREAMS') || window.getComputedStyle(document.querySelector('.ytp-live-badge')).display === 'none') {
                        like(DEBUG);
                    }
                }
            } catch (e) {
                DEBUG.warn(`Failed to like video: ${e}. Will try again in ${GM_config.get('CHECK_FREQUENCY')} ms...`);
            }
        }
    }

    function isButtonPressed(button) {
        return button.classList.contains('style-default-active') || button.getAttribute('aria-pressed') === 'true';
    }

    function like(DEBUG) {
        DEBUG.info('Trying to like video...');
        const likeButton = document.querySelector(SELECTORS.LIKE_BUTTON);
        const dislikeButton = document.querySelector(SELECTORS.DISLIKE_BUTTON);
        if (!likeButton) {
            throw Error('Couldn\'t find like button');
        }
        if (!dislikeButton) {
            throw Error('Couldn\'t find dislike button');
        }
        const videoId = getVideoId();
        if (isButtonPressed(likeButton)) {
            DEBUG.info('Like button has already been clicked');
            autoLikedVideoIds.add(videoId);
        } else if (isButtonPressed(dislikeButton)) {
            DEBUG.info('Dislike button has already been clicked');
        } else if (autoLikedVideoIds.has(videoId)) {
            DEBUG.info('Video has already been auto-liked. User must have un-liked it, so we won\'t like it again');
        } else {
            DEBUG.info('Found like button. It\'s unclicked. Clicking it...');
            likeButton.click();
            if (isButtonPressed(likeButton)) {
                autoLikedVideoIds.add(videoId);
                DEBUG.info('Successfully liked video');
            } else {
                DEBUG.info('Failed to like video');
            }
        }
    }

    class Debugger {
        constructor(name, enabled) {
            this.debug = {};
            if (!window.console) {
                return () => { };
            }
            Object.getOwnPropertyNames(window.console).forEach(key => {
                if (typeof window.console[key] === 'function') {
                    this.debug[key] = enabled ? window.console[key].bind(window.console, name + ': ') : () => { };
                }
            });
            return this.debug;
        }
    }

    function toggleScrolling() {
        if (isScrolling) {
            clearInterval(scrollInterval);
            isScrolling = false;
        } else {
            isScrolling = true;
            scrollInterval = setInterval(scrollDown, 20);
        }
    }

    function scrollDown() {
        var scrollAmount = 50;
        window.scrollBy(0, scrollAmount);
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "PageDown") {
            toggleScrolling();
        } else if (event.key === "PageUp") {
            clearInterval(scrollInterval);
            isScrolling = false;
        }
    });

    // Configuration options for the script
    const configOptions = {
        DEBUG_MODE: {
            label: 'Debug mode',
            type: 'checkbox',
            default: false,
            title: 'Log debug messages to the console'
        },
        CHECK_FREQUENCY: {
            label: 'Check frequency (ms)',
            type: 'number',
            min: 1,
            default: 5000,
            title: 'The number of milliseconds to wait between checking if video should be liked'
        },
        WATCH_THRESHOLD: {
            label: 'Watch threshold %',
            type: 'number',
            min: 0,
            max: 100,
            default: 0,
            title: 'The percentage watched to like the video at'
        },
        LIKE_IF_NOT_SUBSCRIBED: {
            label: 'Like if not subscribed',
            type: 'checkbox',
            default: false,
            title: 'Like videos from channels you are not subscribed to'
        },
        AUTO_LIKE_LIVE_STREAMS: {
            label: 'Auto-like live streams',
            type: 'checkbox',
            default: false,
            title: 'Automatically like live streams'
        }
    };

    // Function to initialize the configuration
    function initConfig() {
        GM_config.init({
            id: 'ytal_config',
            title: GM_info.script.name + ' Settings',
            fields: configOptions,
            events: {
                init: onInit
            }
        });
    }

    // Function to register the settings menu command
    function registerMenuCommand() {
        GM_registerMenuCommand('Settings', () => {
            GM_config.open();
        });
    }

    // Call the functions to initialize the script
    initConfig();
    registerMenuCommand();
})();
