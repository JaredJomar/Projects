// ==UserScript==
// @name           YouTube Enchantments
// @namespace      http://tampermonkey.net/
// @version        0.8.1
// @description    Automatically likes videos of channels you're subscribed to, scrolls down on Youtube with a toggle button, and bypasses the AdBlock ban.
// @author         JJJ
// @match          https://www.youtube.com/*
// @exclude        https://www.youtube.com/*/community
// @icon           https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_registerMenuCommand
// @run-at         document-idle
// @noframes
// @license        MIT
// ==/UserScript==

(() => {
    'use strict';

    // Polyfill for Edge if necessary
    if (!window.Blob || !window.URL || !window.Worker) {
        console.warn('Browser compatibility features missing');
        return;
    }

    // Inject the YouTube IFrame API script with error handling
    function injectYouTubeAPI() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Updated constants
    const SELECTORS = {
        PLAYER: '#movie_player',
        SUBSCRIBE_BUTTON: '#subscribe-button > ytd-subscribe-button-renderer, ytd-reel-player-overlay-renderer #subscribe-button, tp-yt-paper-button[subscribed]',
        LIKE_BUTTON: 'ytd-menu-renderer button[aria-pressed][aria-label*="like"], like-button-view-model button[aria-pressed]',
        DISLIKE_BUTTON: 'ytd-menu-renderer button[aria-pressed][aria-label*="dislike"], dislike-button-view-model button[aria-pressed]',
        PLAYER_CONTAINER: '#player-container-outer',
        ERROR_SCREEN: '#error-screen',
        PLAYABILITY_ERROR: '.yt-playability-error-supported-renderers',
        LIVE_BADGE: '.ytp-live-badge'
    };

    const CONSTANTS = {
        IFRAME_ID: 'adblock-bypass-player',
        STORAGE_KEY: 'youtubeEnchantmentsSettings',
        DELAY: 300, // Increased delay for Edge
        MAX_TRIES: 150, // Increased max tries
        DUPLICATE_CHECK_INTERVAL: 7000 // Increased interval
    };

    const defaultSettings = {
        autoLikeEnabled: true,
        autoLikeLiveStreams: false,
        likeIfNotSubscribed: false,
        watchThreshold: 0,
        checkFrequency: 5000,
        adBlockBypassEnabled: false
    };

    let settings = loadSettings();
    const autoLikedVideoIds = new Set();
    let isScrolling = false;
    let scrollInterval;
    let currentPageUrl = window.location.href;
    let tries = 0;

    const worker = createWorker();

    const urlUtils = {
        extractParams(url) {
            try {
                const params = new URL(url).searchParams;
                return {
                    videoId: params.get('v'),
                    playlistId: params.get('list'),
                    index: params.get('index')
                };
            } catch (e) {
                console.error('Failed to extract URL params:', e);
                return {};
            }
        },

        getTimestampFromUrl(url) {
            try {
                const timestamp = new URL(url).searchParams.get('t');
                if (timestamp) {
                    const timeArray = timestamp.split(/h|m|s/).map(Number);
                    const timeInSeconds = timeArray.reduce((acc, time, index) =>
                        acc + time * Math.pow(60, 2 - index), 0);
                    return `&start=${timeInSeconds}`;
                }
            } catch (e) {
                console.error('Failed to extract timestamp:', e);
            }
            return '';
        }
    };

    let player;

    // Updated PlayerManager
    const playerManager = {
        async initPlayer() {
            try {
                await injectYouTubeAPI();
                const iframe = document.getElementById(CONSTANTS.IFRAME_ID);
                if (iframe) {
                    player = new YT.Player(CONSTANTS.IFRAME_ID, {
                        events: {
                            'onReady': this.onPlayerReady.bind(this),
                            'onStateChange': this.onPlayerStateChange.bind(this),
                            'onError': (event) => {
                                console.error('Player error:', event.data);
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Failed to initialize player:', error);
            }
        },

        onPlayerReady(event) {
            console.log('Player is ready');
        },

        onPlayerStateChange(event) {
            if (event.data === YT.PlayerState.AD_STARTED) {
                console.log('Ad is playing, allowing ad to complete.');
            } else if (event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.PLAYING) {
                console.log('Video is playing, ensuring it is tracked in history.');
            }
        },

        createIframe(url) {
            try {
                const { videoId, playlistId, index } = urlUtils.extractParams(url);
                if (!videoId) return null;

                const iframe = document.createElement('iframe');
                const commonArgs = 'autoplay=1&modestbranding=1&enablejsapi=1&origin=' + encodeURIComponent(window.location.origin);
                const embedUrl = playlistId
                    ? `https://www.youtube.com/embed/${videoId}?${commonArgs}&list=${playlistId}&index=${index}`
                    : `https://www.youtube.com/embed/${videoId}?${commonArgs}${urlUtils.getTimestampFromUrl(url)}`;

                this.setIframeAttributes(iframe, embedUrl);
                return iframe;
            } catch (error) {
                console.error('Failed to create iframe:', error);
                return null;
            }
        },

        setIframeAttributes(iframe, url) {
            iframe.id = CONSTANTS.IFRAME_ID;
            iframe.src = url;
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            iframe.allowFullscreen = true;
            iframe.style.cssText = 'height:100%; width:calc(100% - 240px); border:none; border-radius:12px; position:relative; left:240px;';
        },

        replacePlayer(url) {
            const playerContainer = document.querySelector(SELECTORS.ERROR_SCREEN);
            if (!playerContainer) return;

            let iframe = document.getElementById(CONSTANTS.IFRAME_ID);
            if (iframe) {
                this.setIframeAttributes(iframe, url);
            } else {
                iframe = this.createIframe(url);
                if (iframe) {
                    playerContainer.appendChild(iframe);
                    this.initPlayer();
                }
            }
            // Ensure the iframe is on top of the player container
            this.bringToFront(CONSTANTS.IFRAME_ID);
            this.addScrollListener();
        },

        bringToFront(elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                const maxZIndex = Math.max(
                    ...Array.from(document.querySelectorAll('*'))
                        .map(e => parseInt(window.getComputedStyle(e).zIndex) || 0)
                );
                element.style.zIndex = maxZIndex + 1;
            }
        },

        removeDuplicates() {
            const iframes = document.querySelectorAll(`#${CONSTANTS.IFRAME_ID}`);
            if (iframes.length > 1) {
                Array.from(iframes).slice(1).forEach(iframe => iframe.remove());
            }
        },

        addScrollListener() {
            window.addEventListener('scroll', this.handleScroll);
        },

        handleScroll() {
            const iframe = document.getElementById(CONSTANTS.IFRAME_ID);
            if (!iframe) return;

            const playerContainer = document.querySelector(SELECTORS.ERROR_SCREEN);
            if (!playerContainer) return;

            const rect = playerContainer.getBoundingClientRect();
            if (rect.top < 0) {
                iframe.style.position = 'fixed';
                iframe.style.top = '0';
                iframe.style.left = '240px';
                iframe.style.width = 'calc(100% - 240px)';
                iframe.style.height = 'calc(100vh - 56px)'; // Adjust height as needed
            } else {
                iframe.style.position = 'relative';
                iframe.style.top = '0';
                iframe.style.left = '240px';
                iframe.style.width = 'calc(100% - 240px)';
                iframe.style.height = '100%';
            }
        }
    };

    // Updated worker with error handling
    function createWorker() {
        try {
            const workerBlob = new Blob([`
                let checkInterval;
                self.onmessage = function(e) {
                    try {
                        if (e.data.type === 'startCheck') {
                            if (checkInterval) clearInterval(checkInterval);
                            checkInterval = setInterval(() => {
                                self.postMessage({ type: 'check' });
                            }, e.data.checkFrequency);
                        } else if (e.data.type === 'stopCheck') {
                            clearInterval(checkInterval);
                        }
                    } catch (error) {
                        self.postMessage({ type: 'error', error: error.message });
                    }
                };
            `], { type: 'text/javascript' });

            const worker = new Worker(URL.createObjectURL(workerBlob));
            worker.onerror = function (error) {
                console.error('Worker error:', error);
            };
            return worker;
        } catch (error) {
            console.error('Failed to create worker:', error);
            return null;
        }
    }

    function loadSettings() {
        const savedSettings = GM_getValue(CONSTANTS.STORAGE_KEY, {});
        return Object.keys(defaultSettings).reduce((acc, key) => {
            acc[key] = key in savedSettings ? savedSettings[key] : defaultSettings[key];
            return acc;
        }, {});
    }

    function saveSettings() {
        GM_setValue(CONSTANTS.STORAGE_KEY, settings);
    }

    function createSettingsMenu() {
        GM_registerMenuCommand('YouTube Enchantments Settings', showSettingsDialog);
    }

    function showSettingsDialog() {
        let dialog = document.getElementById('youtube-enchantments-settings');
        if (!dialog) {
            dialog = createSettingsDialog();
            document.body.appendChild(dialog);
        }
        dialog.style.display = 'block';
    }

    function createSettingsDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'youtube-enchantments-settings';

        const dialogHTML = `
            <div class="dpe-dialog">
                <h3>YouTube Enchantments</h3>
                ${createToggle('autoLikeEnabled', 'Auto Like', 'Automatically like videos of subscribed channels')}
                ${createToggle('autoLikeLiveStreams', 'Like Live Streams', 'Include live streams in auto-like feature')}
                ${createToggle('likeIfNotSubscribed', 'Like All Videos', 'Like videos even if not subscribed')}
                ${createToggle('adBlockBypassEnabled', 'AdBlock Bypass', 'Bypass AdBlock detection')}
                <div class="dpe-slider-container" title="Percentage of video to watch before liking">
                    <label for="watchThreshold">Watch Threshold</label>
                    <input type="range" id="watchThreshold" min="0" max="100" step="10" 
                           value="${settings.watchThreshold}">
                    <span id="watchThresholdValue">${settings.watchThreshold}%</span>
                </div>
                <div class="dpe-button-container">
                    <button id="saveSettingsButton" class="dpe-button dpe-button-save">Save</button>
                    <button id="closeSettingsButton" class="dpe-button dpe-button-cancel">Cancel</button>
                </div>
            </div>
        `;

        const styleSheet = `
            <style>
                .dpe-dialog {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #030d22;
                    border: 1px solid #2a2945;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                    z-index: 9999;
                    color: #ffffff;
                    width: 320px;
                    font-family: 'Roboto', Arial, sans-serif;
                }
                .dpe-dialog h3 {
                    margin-top: 0;
                    font-size: 1.8em;
                    text-align: center;
                    margin-bottom: 24px;
                    color: #ffffff;
                    font-weight: 700;
                }
                .dpe-toggle-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding: 8px;
                    border-radius: 8px;
                    background: #15132a;
                    transition: background-color 0.2s;
                }
                .dpe-toggle-container:hover {
                    background: #1a1832;
                }
                .dpe-toggle-label {
                    flex-grow: 1;
                    color: #ffffff;
                    font-size: 1.1em;
                    font-weight: 600;
                    margin-left: 12px;
                }
                .dpe-toggle {
                    position: relative;
                    display: inline-block;
                    width: 46px;
                    height: 24px;
                }
                .dpe-toggle input {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                    margin: 0;
                }
                .dpe-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #2a2945;
                    transition: .3s;
                    border-radius: 24px;
                }
                .dpe-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: #ffffff;
                    transition: .3s;
                    border-radius: 50%;
                }
                .dpe-toggle input:checked + .dpe-toggle-slider {
                    background-color: #cc0000;
                }
                .dpe-toggle input:checked + .dpe-toggle-slider:before {
                    transform: translateX(22px);
                }
                .dpe-slider-container {
                    margin: 24px 0;
                    padding: 12px;
                    background: #15132a;
                    border-radius: 8px;
                }
                .dpe-slider-container label {
                    display: block;
                    margin-bottom: 8px;
                    color: #ffffff;
                    font-size: 1.1em;
                    font-weight: 600;
                }
                .dpe-slider-container input[type="range"] {
                    width: 100%;
                    margin: 8px 0;
                    height: 4px;
                    background: #2a2945;
                    border-radius: 2px;
                    -webkit-appearance: none;
                }
                .dpe-slider-container input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #cc0000;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .dpe-slider-container input[type="range"]::-webkit-slider-thumb:hover {
                    background: #990000;
                }
                .dpe-button-container {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 24px;
                    gap: 12px;
                }
                .dpe-button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 1.1em;
                    font-weight: 600;
                    transition: all 0.2s;
                    flex: 1;
                }
                .dpe-button-save {
                    background-color: #cc0000;
                    color: white;
                }
                .dpe-button-save:hover {
                    background-color: #990000;
                    transform: translateY(-1px);
                }
                .dpe-button-cancel {
                    background-color: #15132a;
                    color: white;
                    border: 1px solid #2a2945;
                }
                .dpe-button-cancel:hover {
                    background-color: #1a1832;
                    transform: translateY(-1px);
                }
            </style>
        `;

        dialog.innerHTML = styleSheet + dialogHTML;

        // Add event listeners
        dialog.querySelector('#saveSettingsButton').addEventListener('click', () => {
            saveSettings();
            hideSettingsDialog();
        });

        dialog.querySelector('#closeSettingsButton').addEventListener('click', hideSettingsDialog);

        dialog.querySelectorAll('.dpe-toggle input').forEach(toggle => {
            toggle.addEventListener('change', handleSettingChange);
        });

        dialog.querySelector('#watchThreshold').addEventListener('input', handleSliderInput);

        return dialog;
    }

    function createToggle(id, label, title) {
        return `
            <div class="dpe-toggle-container" title="${title}">
                <label class="dpe-toggle">
                    <input type="checkbox" data-setting="${id}" ${settings[id] ? 'checked' : ''}>
                    <span class="dpe-toggle-slider"></span>
                </label>
                <label class="dpe-toggle-label">${label}</label>
            </div>
        `;
    }

    function hideSettingsDialog() {
        const dialog = document.getElementById('youtube-enchantments-settings');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }

    function formatSettingName(setting) {
        return setting.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    function handleSettingChange(e) {
        if (e.target.dataset.setting) {
            if (e.target.type === 'checkbox') {
                toggleSetting(e.target.dataset.setting);
            } else if (e.target.type === 'range') {
                updateNumericSetting(e.target.dataset.setting, e.target.value);
            }

            // Log the status of adBlockBypassEnabled if it is changed
            if (e.target.dataset.setting === 'adBlockBypassEnabled') {
                console.log(`AdBlock Ban Bypass is ${e.target.checked ? 'enabled' : 'disabled'}`);
            }
        }
    }


    function handleSliderInput(e) {
        if (e.target.type === 'range') {
            const value = e.target.value;
            document.getElementById('watchThresholdValue').textContent = `${value}%`;
            updateNumericSetting(e.target.dataset.setting, value);
        }
    }

    function toggleSetting(settingName) {
        settings[settingName] = !settings[settingName];
        saveSettings();
    }

    function updateNumericSetting(settingName, value) {
        settings[settingName] = parseInt(value, 10);
        saveSettings();
    }

    function startBackgroundCheck() {
        worker.postMessage({ type: 'startCheck', checkFrequency: settings.checkFrequency });
    }

    function checkAndLikeVideo() {
        console.log('Checking if video should be liked...');
        if (watchThresholdReached()) {
            console.log('Watch threshold reached.');
            if (settings.autoLikeEnabled) {
                console.log('Auto-like is enabled.');
                if (settings.likeIfNotSubscribed || isSubscribed()) {
                    console.log('User is subscribed or likeIfNotSubscribed is enabled.');
                    if (settings.autoLikeLiveStreams || !isLiveStream()) {
                        console.log('Video is not a live stream or auto-like for live streams is enabled.');
                        likeVideo();
                    } else {
                        console.log('Video is a live stream and auto-like for live streams is disabled.');
                    }
                } else {
                    console.log('User is not subscribed and likeIfNotSubscribed is disabled.');
                }
            } else {
                console.log('Auto-like is disabled.');
            }
        } else {
            console.log('Watch threshold not reached.');
        }
    }

    function watchThresholdReached() {
        const player = document.querySelector(SELECTORS.PLAYER);
        if (player) {
            const watched = player.getCurrentTime() / player.getDuration();
            const watchedTarget = settings.watchThreshold / 100;
            if (watched < watchedTarget) {
                console.log(`Waiting until watch threshold reached (${watched.toFixed(2)}/${watchedTarget})...`);
                return false;
            }
        }
        return true;
    }

    function isSubscribed() {
        const subscribeButton = document.querySelector(SELECTORS.SUBSCRIBE_BUTTON);
        return subscribeButton && (subscribeButton.hasAttribute('subscribe-button-invisible') || subscribeButton.hasAttribute('subscribed'));
    }

    function isLiveStream() {
        const liveBadge = document.querySelector(SELECTORS.LIVE_BADGE);
        return liveBadge && window.getComputedStyle(liveBadge).display !== 'none';
    }

    function likeVideo() {
        console.log('Attempting to like the video...');
        const likeButton = document.querySelector(SELECTORS.LIKE_BUTTON);
        const dislikeButton = document.querySelector(SELECTORS.DISLIKE_BUTTON);
        const videoId = getVideoId();

        if (!likeButton || !dislikeButton || !videoId) {
            console.log('Like button, dislike button, or video ID not found.');
            return;
        }

        if (!isButtonPressed(likeButton) && !isButtonPressed(dislikeButton) && !autoLikedVideoIds.has(videoId)) {
            console.log('Liking the video...');
            likeButton.click();
            if (isButtonPressed(likeButton)) {
                console.log('Video liked successfully.');
                autoLikedVideoIds.add(videoId);
            } else {
                console.log('Failed to like the video.');
            }
        } else {
            console.log('Video already liked or disliked, or already auto-liked.');
        }
    }

    function isButtonPressed(button) {
        return button.classList.contains('style-default-active') || button.getAttribute('aria-pressed') === 'true';
    }

    function getVideoId() {
        const watchFlexyElem = document.querySelector('#page-manager > ytd-watch-flexy');
        if (watchFlexyElem && watchFlexyElem.hasAttribute('video-id')) {
            return watchFlexyElem.getAttribute('video-id');
        }
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    function handleAdBlockError() {
        if (!settings.adBlockBypassEnabled) {
            console.log('AdBlock bypass is disabled.');
            return; // Do nothing if the AdBlock bypass is disabled
        }

        const playabilityError = document.querySelector(SELECTORS.PLAYABILITY_ERROR);
        if (playabilityError) {
            playabilityError.remove();
            playerManager.replacePlayer(window.location.href);
        } else if (tries < CONSTANTS.MAX_TRIES) {
            tries++;
            setTimeout(handleAdBlockError, CONSTANTS.DELAY);
        }
    }


    function handleKeyPress(event) {
        switch (event.key) {
            case 'F2':
                toggleSettingsDialog();
                break;
            case 'PageDown':
                toggleScrolling();
                break;
            case 'PageUp':
                handlePageUp();
                break;
        }
    }

    function toggleSettingsDialog() {
        const dialog = document.getElementById('youtube-enchantments-settings');
        if (dialog && dialog.style.display === 'block') {
            hideSettingsDialog();
        } else {
            showSettingsDialog();
        }
    }

    function toggleScrolling() {
        if (isScrolling) {
            clearInterval(scrollInterval);
            isScrolling = false;
        } else {
            isScrolling = true;
            scrollInterval = setInterval(() => window.scrollBy(0, 50), 20);
        }
    }

    function handlePageUp() {
        if (isScrolling) {
            clearInterval(scrollInterval);
            isScrolling = false;
        } else {
            window.scrollTo(0, 0);
        }
    }

    function setupEventListeners() {
        window.addEventListener('beforeunload', () => {
            currentPageUrl = window.location.href;
        });

        document.addEventListener('yt-navigate-finish', () => {
            console.log('yt-navigate-finish event triggered');
            const newUrl = window.location.href;
            if (newUrl !== currentPageUrl) {
                console.log('URL changed:', newUrl);
                if (newUrl.endsWith('.com/')) {
                    const iframe = document.getElementById(CONSTANTS.IFRAME_ID);
                    if (iframe) {
                        console.log('Removing iframe');
                        iframe.remove();
                    }
                } else {
                    console.log('Handling ad block error');
                    handleAdBlockError();
                }
                currentPageUrl = newUrl;
            }
        });

        document.addEventListener('keydown', (event) => {
            console.log('Key pressed:', event.key);
            handleKeyPress(event);
        });

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE &&
                            node.matches(SELECTORS.PLAYABILITY_ERROR)) {
                            console.log('Playability error detected');
                            handleAdBlockError();
                            return;
                        }
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        setInterval(() => {
            console.log('Checking for duplicate players');
            playerManager.removeDuplicates();
        }, CONSTANTS.DUPLICATE_CHECK_INTERVAL);
    }

    // Updated main initialization function
    async function initScript() {
        try {
            console.log('Initializing script for Edge compatibility');
            createSettingsMenu();
            setupEventListeners();

            const worker = createWorker();
            if (worker) {
                startBackgroundCheck(worker);
            } else {
                console.warn('Worker creation failed, falling back to interval');
                setInterval(checkAndLikeVideo, settings.checkFrequency);
            }

            // Check browser compatibility
            const userAgent = navigator.userAgent;
            if (userAgent.includes("Edg/")) {
                console.log('Edge detected, applying specific optimizations');
                CONSTANTS.DELAY = 300; // Specific adjustment for Edge
                CONSTANTS.MAX_TRIES = 150;
            }

        } catch (error) {
            console.error('Script initialization failed:', error);
        }
    }

    initScript();
})();