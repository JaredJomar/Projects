// ==UserScript==
// @name           YouTube Enchantments
// @namespace      http://tampermonkey.net/
// @version        0.7
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

    // Constants and settings
    const SELECTORS = {
        PLAYER: '#movie_player',
        SUBSCRIBE_BUTTON: '#subscribe-button > ytd-subscribe-button-renderer, ytd-reel-player-overlay-renderer #subscribe-button',
        LIKE_BUTTON: '#menu .YtLikeButtonViewModelHost button, #segmented-like-button button, #like-button button',
        DISLIKE_BUTTON: '#menu .YtDislikeButtonViewModelHost button, #segmented-dislike-button button, #dislike-button button',
        PLAYER_CONTAINER: '#player-container-outer',
        PLAYABILITY_ERROR: 'yt-playability-error-supported-renderers',
        LIVE_BADGE: '.ytp-live-badge'
    };

    const IFRAME_ID = 'adblock-bypass-player';
    const STORAGE_KEY = 'youtubeEnchantmentsSettings';

    // Default settings
    const defaultSettings = {
        autoLikeEnabled: true,
        autoLikeLiveStreams: false,
        likeIfNotSubscribed: false,
        watchThreshold: 0,
        checkFrequency: 5000
    };

    // State variables
    let settings = loadSettings();
    let autoLikedVideoIds = new Set();
    let isScrolling = false;
    let scrollInterval;
    let currentVideoId = '';

    // Web Worker for background tasks
    const worker = createWorker();

    // Main initialization function
    function initScript() {
        createSettingsMenu();
        observeDomChanges();
        startBackgroundCheck();
        addEventListeners();
    }

    // Create and set up the Web Worker
    function createWorker() {
        const workerBlob = new Blob([`
            let checkInterval;

            self.onmessage = function(e) {
                if (e.data.type === 'startCheck') {
                    clearInterval(checkInterval);
                    checkInterval = setInterval(() => {
                        self.postMessage({ type: 'check' });
                    }, e.data.checkFrequency);
                } else if (e.data.type === 'stopCheck') {
                    clearInterval(checkInterval);
                }
            };
        `], { type: 'text/javascript' });

        const worker = new Worker(URL.createObjectURL(workerBlob));

        worker.onmessage = function (e) {
            if (e.data.type === 'check') {
                checkAndLikeVideo();
            }
        };

        return worker;
    }

    // Load settings from storage
    function loadSettings() {
        const savedSettings = GM_getValue(STORAGE_KEY, {});
        // Only load settings that are defined in defaultSettings
        return Object.keys(defaultSettings).reduce((acc, key) => {
            acc[key] = key in savedSettings ? savedSettings[key] : defaultSettings[key];
            return acc;
        }, {});
    }

    // Save settings to storage
    function saveSettings() {
        GM_setValue(STORAGE_KEY, settings);
    }

    // Create settings menu command
    function createSettingsMenu() {
        GM_registerMenuCommand('YouTube Enchantments Settings', showSettingsDialog);
    }

    // Show settings dialog
    function showSettingsDialog() {
        let dialog = document.getElementById('youtube-enchantments-settings');
        if (!dialog) {
            dialog = createSettingsDialog();
            document.body.appendChild(dialog);
        }
        dialog.style.display = 'block';
    }

    // Hide settings dialog
    function hideSettingsDialog() {
        const dialog = document.getElementById('youtube-enchantments-settings');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }

    // Toggle settings dialog visibility
    function toggleSettingsDialog() {
        const dialog = document.getElementById('youtube-enchantments-settings');
        if (dialog && dialog.style.display === 'block') {
            hideSettingsDialog();
        } else {
            showSettingsDialog();
        }
    }

    // Create settings dialog DOM element
    function createSettingsDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'youtube-enchantments-settings';
        dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #030d22;
        padding: 20px;
        border: 1px solid black;
        z-index: 9999;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
    `;

        dialog.innerHTML = `
        <h2 style="margin-top: 0; color: white; font-weight: bold;">YouTube Enchantments Settings</h2>
        <ul style="list-style-type: none; padding: 0;">
            ${Object.entries(settings).map(([setting, value]) =>
            setting === 'watchThreshold'
                ? `
                        <li style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; color: white; font-weight: bold;">
                                <span style="margin-right: 10px;">${formatSettingName(setting)}:</span>
                                <input type="range" min="0" max="100" step="10" value="${value}" data-setting="${setting}" style="width: 200px;">
                                <span style="margin-left: 10px;" id="watchThresholdValue">${value}%</span>
                            </label>
                        </li>
                    `
                : `
                        <li style="margin-bottom: 15px;">
                            <label style="cursor: pointer; display: flex; align-items: center; color: white; font-weight: bold;">
                                <input type="checkbox" ${value ? 'checked' : ''} data-setting="${setting}" style="margin-right: 10px;">
                                <span>${formatSettingName(setting)}</span>
                            </label>
                        </li>
                    `
        ).join('')}
        </ul>
        <button id="close-settings" style="background-color: #cc0000; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px;">Close</button>
    `;

        dialog.addEventListener('change', handleSettingChange);
        dialog.addEventListener('input', handleSliderInput);
        dialog.querySelector('#close-settings').addEventListener('click', () => hideSettingsDialog());

        return dialog;
    }

    // Format setting name for display
    function formatSettingName(setting) {
        return setting.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    // Handle setting change
    function handleSettingChange(e) {
        if (e.target.dataset.setting) {
            if (e.target.type === 'checkbox') {
                toggleSetting(e.target.dataset.setting);
            } else if (e.target.type === 'range') {
                updateNumericSetting(e.target.dataset.setting, e.target.value);
            }
        }
    }

    // Handle slider input
    function handleSliderInput(e) {
        if (e.target.type === 'range') {
            const value = e.target.value;
            document.getElementById('watchThresholdValue').textContent = `${value}%`;
            updateNumericSetting(e.target.dataset.setting, value);
        }
    }

    // Toggle individual setting
    function toggleSetting(settingName) {
        settings[settingName] = !settings[settingName];
        saveSettings();
        if (settingName === 'checkFrequency') {
            startBackgroundCheck();
        }
    }

    // Update numeric setting
    function updateNumericSetting(settingName, value) {
        settings[settingName] = parseInt(value, 10);
        saveSettings();
    }

    // Start background check using Web Worker
    function startBackgroundCheck() {
        worker.postMessage({ type: 'startCheck', checkFrequency: settings.checkFrequency });
    }

    // Check and like video if conditions are met
    function checkAndLikeVideo() {
        if (watchThresholdReached() && settings.autoLikeEnabled) {
            if (settings.likeIfNotSubscribed || isSubscribed()) {
                if (settings.autoLikeLiveStreams || !isLiveStream()) {
                    likeVideo();
                }
            }
        }
    }

    // Check if watch threshold is reached
    function watchThresholdReached() {
        const player = document.querySelector(SELECTORS.PLAYER);
        if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
            const watched = player.getCurrentTime() / player.getDuration();
            return watched >= settings.watchThreshold / 100;
        }
        return false;
    }

    // Check if user is subscribed to the channel
    function isSubscribed() {
        const subscribeButton = document.querySelector(SELECTORS.SUBSCRIBE_BUTTON);
        return subscribeButton && (subscribeButton.hasAttribute('subscribe-button-invisible') || subscribeButton.hasAttribute('subscribed'));
    }

    // Check if current video is a live stream
    function isLiveStream() {
        const liveBadge = document.querySelector(SELECTORS.LIVE_BADGE);
        return liveBadge && window.getComputedStyle(liveBadge).display !== 'none';
    }

    // Like the current video
    function likeVideo() {
        const likeButton = document.querySelector(SELECTORS.LIKE_BUTTON);
        const dislikeButton = document.querySelector(SELECTORS.DISLIKE_BUTTON);
        const videoId = getVideoId();

        if (!likeButton || !dislikeButton || !videoId) return;

        if (!isButtonPressed(likeButton) && !isButtonPressed(dislikeButton) && !autoLikedVideoIds.has(videoId)) {
            likeButton.click();
            if (isButtonPressed(likeButton)) {
                autoLikedVideoIds.add(videoId);
            }
        }
    }

    // Check if a button is pressed
    function isButtonPressed(button) {
        return button.classList.contains('style-default-active') || button.getAttribute('aria-pressed') === 'true';
    }

    // Get current video ID
    function getVideoId() {
        const watchFlexyElem = document.querySelector('#page-manager > ytd-watch-flexy');
        if (watchFlexyElem && watchFlexyElem.hasAttribute('video-id')) {
            return watchFlexyElem.getAttribute('video-id');
        }
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    // Handle AdBlock error
    function handleAdBlockError() {
        const playabilityError = document.querySelector(SELECTORS.PLAYABILITY_ERROR);
        if (playabilityError) {
            const videoId = getVideoId();
            if (videoId && videoId !== currentVideoId) {
                currentVideoId = videoId;
                replacePlayer(videoId);
            }
        }
    }

    // Replace player with iframe to bypass AdBlock
    function replacePlayer(videoId) {
        const playerContainer = document.querySelector(SELECTORS.PLAYER_CONTAINER);
        if (playerContainer) {
            playerContainer.innerHTML = '';
            const iframe = createIframe(videoId);
            playerContainer.appendChild(iframe);
        }
    }

    // Create iframe for video playback
    function createIframe(videoId) {
        const iframe = document.createElement('iframe');
        iframe.id = IFRAME_ID;
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
        iframe.allow = 'autoplay; encrypted-media';
        iframe.allowFullscreen = true;
        iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
        return iframe;
    }

    // Observe DOM changes for AdBlock error
    function observeDomChanges() {
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE && node.matches(SELECTORS.PLAYABILITY_ERROR)) {
                            handleAdBlockError();
                            return;
                        }
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Add event listeners
    function addEventListeners() {
        document.addEventListener('keydown', handleKeyPress);
    }

    // Handle key press events
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

    // Toggle auto-scrolling
    function toggleScrolling() {
        if (isScrolling) {
            clearInterval(scrollInterval);
            isScrolling = false;
        } else {
            isScrolling = true;
            scrollInterval = setInterval(() => window.scrollBy(0, 50), 20);
        }
    }

    // Handle PageUp key press
    function handlePageUp() {
        if (isScrolling) {
            clearInterval(scrollInterval);
            isScrolling = false;
        } else {
            window.scrollTo(0, 0);
        }
    }

    // Initialize the script
    initScript();
})();