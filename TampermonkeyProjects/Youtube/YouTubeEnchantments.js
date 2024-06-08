// ==UserScript==
// @name           YouTube Enchantments
// @namespace      Based on YouTube Auto-Liker by HatScripts and Youtube Auto Scroll Down
// @version        0.6
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

    // Selectors for various YouTube elements
    const SELECTORS = {
        PLAYER: '#movie_player',
        SUBSCRIBE_BUTTON: '#subscribe-button > ytd-subscribe-button-renderer, ytd-reel-player-overlay-renderer #subscribe-button',
        LIKE_BUTTON: '#menu .YtLikeButtonViewModelHost button, #segmented-like-button button, #like-button button',
        DISLIKE_BUTTON: '#menu .YtDislikeButtonViewModelHost button, #segmented-dislike-button button, #dislike-button button'
    };

    const PLAYER_CONTAINER_SELECTOR = '#player-container-outer';
    const PLAYABILITY_ERROR_SELECTOR = 'yt-playability-error-supported-renderers';
    const IFRAME_ID = 'adblock-bypass-player';

    // Variable to keep track of whether the settings dialog is open
    let settingsDialogOpen = false;

    // Set to store video IDs that have been auto-liked
    const autoLikedVideoIds = new Set();
    let isScrolling = false;
    let scrollInterval;
    let currentVideoId = '';

    // Default settings for the script
    const defaultSettings = {
        autoLikeEnabled: true,
        autoLikeLiveStreams: false,
        likeIfNotSubscribed: false,
        watchThreshold: 0,
        checkFrequency: 5000,
        debugMode: false
    };

    // Load settings from storage or use default settings
    const settings = loadSettings();

    // Function to load settings from storage or use default settings
    function loadSettings() {
        const savedSettings = GM_getValue('settings', null);
        return savedSettings ? Object.assign({}, defaultSettings, savedSettings) : defaultSettings;
    }

    // Function to save settings to storage
    function saveSettings() {
        GM_setValue('settings', settings);
    }

    // Function to toggle a specific setting
    function toggleSetting(settingName) {
        if (settingName === 'watchThreshold') {
            showWatchThresholdDropdown();
        } else {
            settings[settingName] = !settings[settingName];
            saveSettings();
        }
    }

    // Function called when the script is initialized
    function onInit() {
        const DEBUG = new Debugger(GM_info.script.name, settings.debugMode);
        setInterval(wait, settings.checkFrequency, DEBUG);
        createSettingsMenu()
        document.addEventListener('keydown', handleKeyPress);
    }

    // Function to create the settings menu
    function createSettingsMenu() {
        GM_registerMenuCommand('YouTube Enchantments Settings', showSettingsDialog);
    }

    // Function to show the settings dialog
    function showSettingsDialog() {
        const settingsDialog = createSettingsDialog();
        document.body.appendChild(settingsDialog);
    }

    // Function to create the settings dialog element
    function createSettingsDialog() {
        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = 'white';
        dialog.style.padding = '20px';
        dialog.style.border = '1px solid black';
        dialog.style.zIndex = '9999';

        const title = document.createElement('h2');
        title.textContent = 'YouTube Enchantments Settings';
        dialog.appendChild(title);

        const settingsList = document.createElement('ul');
        settingsList.style.listStyleType = 'none';
        settingsList.style.padding = '0';

        // Create a setting item for each setting
        for (const setting in settings) {
            const settingItem = createSettingItem(setting);
            settingsList.appendChild(settingItem);
        }

        dialog.appendChild(settingsList);

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            closeSettingsDialog();
        });
        dialog.appendChild(closeButton);

        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) {
                closeSettingsDialog();
            }
        });

        return dialog;
    }

    // Function to create a setting item element
    function createSettingItem(settingName) {
        const listItem = document.createElement('li');
        listItem.style.marginBottom = '10px';

        const label = document.createElement('label');
        label.style.cursor = 'pointer';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = settings[settingName];
        checkbox.addEventListener('change', () => {
            toggleSetting(settingName);
        });

        const settingText = document.createElement('span');
        settingText.textContent = settingName.replace(/([A-Z])/g, ' $1').trim();

        label.appendChild(checkbox);
        label.appendChild(settingText);
        listItem.appendChild(label);

        return listItem;
    }

    // Function to show the watch threshold dropdown
    function showWatchThresholdDropdown() {
        const dropdown = document.createElement('select');
        const watchThresholdOptions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

        watchThresholdOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = `${option}%`;
            if (option === settings.watchThreshold) {
                optionElement.selected = true;
            }
            dropdown.appendChild(optionElement);
        });

        const dialogContainer = document.createElement('div');
        dialogContainer.style.position = 'fixed';
        dialogContainer.style.top = '50%';
        dialogContainer.style.left = '50%';
        dialogContainer.style.transform = 'translate(-50%, -50%)';
        dialogContainer.style.backgroundColor = 'white';
        dialogContainer.style.padding = '20px';
        dialogContainer.style.border = '1px solid black';
        dialogContainer.style.zIndex = '9999';

        const title = document.createElement('h2');
        title.textContent = 'Select Watch Threshold';
        dialogContainer.appendChild(title);
        dialogContainer.appendChild(dropdown);

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(dialogContainer);
        });
        dialogContainer.appendChild(closeButton);

        dropdown.addEventListener('change', () => {
            settings.watchThreshold = parseInt(dropdown.value);
            saveSettings();
            document.body.removeChild(dialogContainer);
        });

        document.body.appendChild(dialogContainer);
    }

    // Clear the set of auto-liked video IDs when the page state changes
    function clearAutoLikedVideoIds() {
        autoLikedVideoIds.clear();
    }

    window.addEventListener('popstate', clearAutoLikedVideoIds);

    // Get the current video ID
    function getVideoId() {
        const watchFlexyElem = document.querySelector('#page-manager > ytd-watch-flexy');
        if (watchFlexyElem && watchFlexyElem.hasAttribute('video-id')) {
            return watchFlexyElem.getAttribute('video-id');
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('v');
        }
    }

    // Check if the watch threshold has been reached
    function watchThresholdReached(DEBUG) {
        const player = document.querySelector(SELECTORS.PLAYER);
        if (player) {
            const watched = player.getCurrentTime() / player.getDuration();
            const watchedTarget = settings.watchThreshold / 100;
            if (watched < watchedTarget) {
                DEBUG.info(`Waiting until watch threshold reached (${watched.toFixed(2)}/${watchedTarget})...`);
                return false;
            }
        }
        return true;
    }

    // Check if the user is subscribed to the channel
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

    // Function to check if video should be liked and perform liking
    function wait(DEBUG) {
        if (watchThresholdReached(DEBUG)) {
            try {
                if (settings.autoLikeEnabled && (settings.likeIfNotSubscribed || isSubscribed(DEBUG))) {
                    if (settings.autoLikeLiveStreams || window.getComputedStyle(document.querySelector('.ytp-live-badge')).display === 'none') {
                        like(DEBUG);
                    }
                }
            } catch (e) {
                DEBUG.warn(`Failed to like video: ${e}. Will try again in ${settings.checkFrequency} ms...`);
            }
        }
    }

    // Check if a like or dislike button is pressed
    function isButtonPressed(button) {
        return button.classList.contains('style-default-active') || button.getAttribute('aria-pressed') === 'true';
    }

    // Function to like the current video
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

    // Debugger class for logging messages
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

    // Function to toggle automatic scrolling
    function toggleScrolling() {
        if (isScrolling) {
            clearInterval(scrollInterval);
            isScrolling = false;
        } else {
            isScrolling = true;
            scrollInterval = setInterval(scrollDown, 20);
        }
    }

    // Function to perform scrolling
    function scrollDown() {
        var scrollAmount = 50;
        window.scrollBy(0, scrollAmount);
    }

    // Event listener for keydown to toggle scrolling
    document.addEventListener("keydown", function (event) {
        if (event.key === "PageDown") {
            toggleScrolling();
        } else if (event.key === "PageUp") {
            if (isScrolling) {
                clearInterval(scrollInterval);
                isScrolling = false;
            } else {
                window.scrollTo(0, 0);
            }
        }
    });

    function handleAdBlockError(DEBUG) {
        DEBUG.info('Checking for AdBlock error...');
        const playabilityError = document.querySelector(PLAYABILITY_ERROR_SELECTOR);
        if (playabilityError) {
            DEBUG.info('AdBlock error detected. Replacing player...');
            const videoId = getVideoId();
            if (videoId && videoId !== currentVideoId) {
                currentVideoId = videoId;
                replacePlayer(videoId, DEBUG);
            }
        }
    }

    function replacePlayer(videoId, DEBUG) {
        DEBUG.info(`Replacing player with iframe for video ID: ${videoId}`);
        const playerContainer = document.querySelector(PLAYER_CONTAINER_SELECTOR);
        if (playerContainer) {
            playerContainer.innerHTML = '';
            const iframe = createIframe(videoId);
            playerContainer.appendChild(iframe);
            DEBUG.info('Player replaced successfully');
        } else {
            DEBUG.warn('Player container not found');
        }
    }

    function createIframe(videoId) {
        const iframe = document.createElement('iframe');
        iframe.id = IFRAME_ID;
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
        iframe.allow = 'autoplay; encrypted-media';
        iframe.allowFullscreen = true;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        return iframe;
    }

    function observeDomChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const addedNodes = mutation.addedNodes;
                    for (let node of addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE && node.matches(PLAYABILITY_ERROR_SELECTOR)) {
                            const DEBUG = new Debugger(GM_info.script.name, settings.debugMode);
                            handleAdBlockError(DEBUG);
                            break;
                        }
                    }
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Function to handle key press events
    function handleKeyPress(event) {
        if (event.key === 'F2') {
            toggleSettingsDialog();
        }
    }

    // Function to toggle the settings dialog
    function toggleSettingsDialog() {
        if (settingsDialogOpen) {
            closeSettingsDialog();
        } else {
            openSettingsDialog();
        }
    }

    // Function to close the settings dialog
    function closeSettingsDialog() {
        const settingsDialog = document.querySelector('.settings-dialog');
        if (settingsDialog) {
            settingsDialog.remove();
            settingsDialogOpen = false;
        }
    }

    // Function to open the settings dialog
    function openSettingsDialog() {
        const settingsDialog = createSettingsDialog();
        settingsDialog.classList.add('settings-dialog');
        document.body.appendChild(settingsDialog);
        settingsDialogOpen = true;
    }

    // Initialize the script
    onInit();
    observeDomChanges();
}
)();