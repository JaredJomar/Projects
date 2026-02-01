// ==UserScript==
// @name           YouTube Enchantments
// @namespace      http://tampermonkey.net/
// @version        0.8.6
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

    // ============================================================================
    // CONSTANTS
    // ============================================================================
    
    const SELECTORS = {
        PLAYER: '#movie_player',
        SUBSCRIBE_BUTTON: '#subscribe-button > ytd-subscribe-button-renderer, ytd-reel-player-overlay-renderer #subscribe-button, tp-yt-paper-button[subscribed]',
        LIKE_BUTTON: [
            'like-button-view-model button',
            'ytd-menu-renderer button[aria-label*="like" i]',
            'button[aria-label*="like" i]',
            'ytd-toggle-button-renderer[aria-pressed] button',
            'ytd-reel-player-overlay-renderer ytd-like-button-view-model button',
            'ytd-reel-video-renderer ytd-like-button-view-model button'
        ].join(','),
        DISLIKE_BUTTON: [
            'dislike-button-view-model button',
            'ytd-menu-renderer button[aria-label*="dislike" i]',
            'button[aria-label*="dislike" i]',
            'ytd-toggle-button-renderer[aria-pressed] button[aria-label*="dislike" i]'
        ].join(','),
        PLAYER_CONTAINER: '#player-container-outer',
        ERROR_SCREEN: '#error-screen',
        PLAYABILITY_ERROR: '.yt-playability-error-supported-renderers',
        LIVE_BADGE: '.ytp-live-badge',
        GAME_SECTION: 'ytd-rich-section-renderer, div#dismissible.style-scope.ytd-rich-shelf-renderer'
    };

    const CONSTANTS = {
        IFRAME_ID: 'adblock-bypass-player',
        STORAGE_KEY: 'youtubeEnchantmentsSettings',
        DELAY: 300,
        MAX_TRIES: 150,
        DUPLICATE_CHECK_INTERVAL: 7000,
        GAME_CHECK_INTERVAL: 2000,
        MIN_CHECK_FREQUENCY: 1000,
        MAX_CHECK_FREQUENCY: 30000
    };

    // ============================================================================
    // LOGGER CLASS
    // ============================================================================
    // Handles all console logging with styled output and timestamp tracking.
    // Provides info, warning, success, and error log levels.
    // Can be enabled/disabled globally to control logging verbosity.
    
    class Logger {
        constructor(enabled = true) {
            this.enabled = enabled;
            this.styles = {
                info: 'color: #2196F3; font-weight: bold',
                warning: 'color: #FFC107; font-weight: bold',
                success: 'color: #4CAF50; font-weight: bold',
                error: 'color: #F44336; font-weight: bold'
            };
            this.prefix = '[YouTubeEnchantments]';
        }

        getTimestamp() {
            return new Date().toISOString().split('T')[1].slice(0, -1);
        }

        info(msg) {
            if (!this.enabled) return;
            console.log(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.info);
        }

        warning(msg) {
            if (!this.enabled) return;
            console.warn(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.warning);
        }

        success(msg) {
            if (!this.enabled) return;
            console.log(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.success);
        }

        error(msg) {
            if (!this.enabled) return;
            console.error(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.error);
        }

        setEnabled(enabled) {
            this.enabled = enabled;
        }
    }

    // ============================================================================
    // SETTINGS MANAGER CLASS
    // ============================================================================
    // Manages all user settings (load, save, update) using GM_getValue/GM_setValue.
    // Handles default values, merging saved settings with defaults.
    // Provides methods to get, set, toggle, and validate numeric settings.
    // Ensures settings are persisted between script executions.
    
    class SettingsManager {
        constructor(logger) {
            this.logger = logger;
            this.defaults = {
                autoLikeEnabled: true,
                autoLikeLiveStreams: false,
                likeIfNotSubscribed: false,
                watchThreshold: 0,
                checkFrequency: 3000,
                adBlockBypassEnabled: false,
                scrollSpeed: 50,
                removeGamesEnabled: true,
                loggingEnabled: true
            };
            this.settings = this.load();
        }

        load() {
            const saved = GM_getValue(CONSTANTS.STORAGE_KEY, {});
            return { ...this.defaults, ...saved };
        }

        save() {
            GM_setValue(CONSTANTS.STORAGE_KEY, this.settings);
        }

        get(key) {
            return this.settings[key];
        }

        set(key, value) {
            this.settings[key] = value;
            this.save();
        }

        toggle(key) {
            this.settings[key] = !this.settings[key];
            this.save();
            return this.settings[key];
        }

        updateNumeric(key, value) {
            let v = parseInt(value, 10);
            if (key === 'checkFrequency') {
                if (!Number.isFinite(v)) v = this.defaults.checkFrequency;
                v = Math.min(CONSTANTS.MAX_CHECK_FREQUENCY, Math.max(CONSTANTS.MIN_CHECK_FREQUENCY, v));
            }
            this.settings[key] = v;
            this.save();
        }

        getAll() {
            return { ...this.settings };
        }
    }

    // ============================================================================
    // URL UTILITIES
    // ============================================================================
    // Static utility class for URL parsing and manipulation.
    // Extracts query parameters (video ID, playlist ID, index) from URLs.
    // Converts time format strings (1h2m3s) to seconds for video timestamps.
    
    class UrlUtils {
        static extractParams(url) {
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
        }

        static getTimestampFromUrl(url) {
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
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    
    function throttle(fn, wait) {
        let last = 0;
        let timeout = null;
        return function (...args) {
            const now = Date.now();
            const remaining = wait - (now - last);
            const context = this;
            if (remaining <= 0) {
                if (timeout) { clearTimeout(timeout); timeout = null; }
                last = now;
                fn.apply(context, args);
            } else if (!timeout) {
                timeout = setTimeout(() => {
                    last = Date.now();
                    timeout = null;
                    fn.apply(context, args);
                }, remaining);
            }
        };
    }

    function injectYouTubeAPI() {
        return new Promise((resolve, reject) => {
            try {
                if (window.YT && window.YT.Player) return resolve();

                const existing = Array.from(document.scripts).find(s => 
                    s.src && s.src.includes('https://www.youtube.com/iframe_api'));
                if (existing) {
                    existing.addEventListener('load', () => resolve());
                    existing.addEventListener('error', reject);
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://www.youtube.com/iframe_api';
                script.onload = () => resolve();
                script.onerror = (e) => reject(e);
                document.head.appendChild(script);
            } catch (e) {
                reject(e);
            }
        });
    }

    // ============================================================================
    // PLAYER MANAGER CLASS
    // ============================================================================
    // Manages YouTube iframe player creation and AdBlock bypass functionality.
    // Injects YouTube IFrame API, creates embedded player iframes.
    // Handles player initialization, event callbacks (ready, state, error).
    // Manages duplicate iframe cleanup and scroll behavior for fixed positioning.
    
    class PlayerManager {
        constructor(logger) {
            this.logger = logger;
            this.player = null;
        }

        async initPlayer() {
            try {
                await injectYouTubeAPI();
                const iframe = document.getElementById(CONSTANTS.IFRAME_ID);
                if (iframe) {
                    this.player = new YT.Player(CONSTANTS.IFRAME_ID, {
                        events: {
                            'onReady': this.onPlayerReady.bind(this),
                            'onStateChange': this.onPlayerStateChange.bind(this),
                            'onError': (event) => {
                                this.logger.error(`Player error: ${event.data}`);
                            }
                        }
                    });
                }
            } catch (error) {
                this.logger.error(`Failed to initialize player: ${error}`);
            }
        }

        onPlayerReady(event) {
            this.logger.info('Player is ready');
        }

        onPlayerStateChange(event) {
            if (event.data === YT.PlayerState.AD_STARTED) {
                this.logger.info('Ad is playing, allowing ad to complete.');
            } else if (event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.PLAYING) {
                this.logger.info('Video is playing, ensuring it is tracked in history.');
            }
        }

        createIframe(url) {
            try {
                const { videoId, playlistId, index } = UrlUtils.extractParams(url);
                if (!videoId) return null;

                const iframe = document.createElement('iframe');
                const commonArgs = 'autoplay=1&modestbranding=1&enablejsapi=1&origin=' + encodeURIComponent(window.location.origin);
                const embedUrl = playlistId
                    ? `https://www.youtube.com/embed/${videoId}?${commonArgs}&list=${playlistId}&index=${index}`
                    : `https://www.youtube.com/embed/${videoId}?${commonArgs}${UrlUtils.getTimestampFromUrl(url)}`;

                this.setIframeAttributes(iframe, embedUrl);
                return iframe;
            } catch (error) {
                this.logger.error(`Failed to create iframe: ${error}`);
                return null;
            }
        }

        setIframeAttributes(iframe, url) {
            iframe.id = CONSTANTS.IFRAME_ID;
            iframe.src = url;
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            iframe.allowFullscreen = true;
            iframe.style.cssText = 'height:100%; width:calc(100% - 240px); border:none; border-radius:12px; position:relative; left:240px;';
        }

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
            this.bringToFront(CONSTANTS.IFRAME_ID);
            this.addScrollListener();
        }

        bringToFront(elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                const maxZIndex = Math.max(
                    ...Array.from(document.querySelectorAll('*'))
                        .map(e => parseInt(window.getComputedStyle(e).zIndex) || 0)
                );
                element.style.zIndex = maxZIndex + 1;
            }
        }

        removeDuplicates() {
            const iframes = document.querySelectorAll(`#${CONSTANTS.IFRAME_ID}`);
            if (iframes.length > 1) {
                Array.from(iframes).slice(1).forEach(iframe => iframe.remove());
            }
        }

        addScrollListener() {
            window.addEventListener('scroll', this.handleScroll.bind(this));
        }

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
                iframe.style.height = 'calc(100vh - 56px)';
            } else {
                iframe.style.position = 'relative';
                iframe.style.top = '0';
                iframe.style.left = '240px';
                iframe.style.width = 'calc(100% - 240px)';
                iframe.style.height = '100%';
            }
        }
    }

    // ============================================================================
    // AUTO-LIKE MANAGER CLASS
    // ============================================================================
    // Core auto-like functionality with background checking at configurable intervals.
    // Detects subscription status, video watch percentage, and live stream status.
    // Automatically clicks like button when all conditions are met.
    // Prevents duplicate likes and tracks auto-liked video IDs.
    // Observes DOM for like button readiness to optimize performance.
    
    class AutoLikeManager {
        constructor(settingsManager, logger) {
            this.settingsManager = settingsManager;
            this.logger = logger;
            this.autoLikedVideoIds = new Set();
            this.isChecking = false;
            this.checkTimer = null;
            this.likeReadyObserver = null;
        }

        startBackgroundCheck() {
            this.restartBackgroundCheck();
        }

        restartBackgroundCheck() {
            if (this.checkTimer) clearInterval(this.checkTimer);
            const freq = Math.min(
                CONSTANTS.MAX_CHECK_FREQUENCY, 
                Math.max(CONSTANTS.MIN_CHECK_FREQUENCY, 
                    this.settingsManager.get('checkFrequency') || 3000)
            );
            const throttled = throttle(() => this.checkAndLikeVideo(), Math.max(750, Math.floor(freq / 2)));
            this.checkTimer = setInterval(throttled, freq);
            this.logger.info(`Background check started (every ${freq}ms)`);
        }

        stopBackgroundCheck() {
            if (this.checkTimer) {
                clearInterval(this.checkTimer);
                this.checkTimer = null;
            }
        }

        checkAndLikeVideo() {
            if (this.isChecking) return;
            this.isChecking = true;
            
            this.logger.info('Checking if video should be liked...');
            
            if (this.watchThresholdReached()) {
                this.logger.info('Watch threshold reached.');
                if (this.settingsManager.get('autoLikeEnabled')) {
                    this.logger.info('Auto-like is enabled.');
                    if (this.settingsManager.get('likeIfNotSubscribed') || this.isSubscribed()) {
                        this.logger.info('User is subscribed or likeIfNotSubscribed is enabled.');
                        if (this.settingsManager.get('autoLikeLiveStreams') || !this.isLiveStream()) {
                            this.logger.info('Video is not a live stream or auto-like for live streams is enabled.');
                            this.likeVideo();
                        } else {
                            this.logger.info('Video is a live stream and auto-like for live streams is disabled.');
                        }
                    } else {
                        this.logger.info('User is not subscribed and likeIfNotSubscribed is disabled.');
                    }
                } else {
                    this.logger.info('Auto-like is disabled.');
                }
            } else {
                this.logger.info('Watch threshold not reached.');
            }
            
            this.isChecking = false;
        }

        watchThresholdReached() {
            const player = document.querySelector(SELECTORS.PLAYER);
            if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
                const currentTime = player.getCurrentTime();
                const duration = player.getDuration();

                if (duration > 0) {
                    const watched = currentTime / duration;
                    const watchedTarget = this.settingsManager.get('watchThreshold') / 100;
                    if (watched < watchedTarget) {
                        this.logger.info(`Waiting until watch threshold reached (${(watched * 100).toFixed(1)}%/${this.settingsManager.get('watchThreshold')}%)...`);
                        return false;
                    }
                }
            }
            return true;
        }

        isSubscribed() {
            const subscribeButton = document.querySelector(SELECTORS.SUBSCRIBE_BUTTON);
            if (!subscribeButton) {
                this.logger.info('Subscribe button not found');
                return false;
            }

            const isSubbed = subscribeButton.hasAttribute('subscribe-button-invisible') ||
                subscribeButton.hasAttribute('subscribed') ||
                /subscrib/i.test(subscribeButton.textContent);

            this.logger.info(`Subscribe button found: true, Is subscribed: ${isSubbed}`);
            return isSubbed;
        }

        isLiveStream() {
            try {
                const liveBadge = document.querySelector(SELECTORS.LIVE_BADGE);
                if (liveBadge && window.getComputedStyle(liveBadge).display !== 'none') return true;
                return false;
            } catch (_) { 
                return false; 
            }
        }

        likeVideo() {
            this.logger.info('Attempting to like the video...');
            const likeButton = document.querySelector(SELECTORS.LIKE_BUTTON);
            const dislikeButton = document.querySelector(SELECTORS.DISLIKE_BUTTON);
            const videoId = this.getVideoId();

            this.logger.info(`Like button found: ${!!likeButton}`);
            this.logger.info(`Dislike button found: ${!!dislikeButton}`);
            this.logger.info(`Video ID: ${videoId}`);

            if (!likeButton || !dislikeButton || !videoId) {
                this.logger.info('Like button, dislike button, or video ID not found.');
                return;
            }

            const likePressed = this.isButtonPressed(likeButton);
            const dislikePressed = this.isButtonPressed(dislikeButton);
            const alreadyAutoLiked = this.autoLikedVideoIds.has(videoId);

            this.logger.info(`Like button pressed: ${likePressed}`);
            this.logger.info(`Dislike button pressed: ${dislikePressed}`);
            this.logger.info(`Already auto-liked: ${alreadyAutoLiked}`);

            if (!likePressed && !dislikePressed && !alreadyAutoLiked) {
                this.logger.info('Liking the video...');
                likeButton.click();

                setTimeout(() => {
                    if (this.isButtonPressed(likeButton)) {
                        this.logger.success('Video liked successfully.');
                        this.autoLikedVideoIds.add(videoId);
                    } else {
                        this.logger.warning('Failed to like the video.');
                    }
                }, 500);
            } else {
                this.logger.info('Video already liked or disliked, or already auto-liked.');
            }
        }

        isButtonPressed(button) {
            if (!button) return false;
            const pressed = button.classList.contains('style-default-active') || 
                          button.getAttribute('aria-pressed') === 'true';
            const toggled = button.closest('ytd-toggle-button-renderer')?.getAttribute('aria-pressed') === 'true';
            return pressed || toggled;
        }

        getVideoId() {
            const watchFlexyElem = document.querySelector('#page-manager > ytd-watch-flexy');
            if (watchFlexyElem && watchFlexyElem.hasAttribute('video-id')) {
                return watchFlexyElem.getAttribute('video-id');
            }
            
            const path = window.location.pathname;
            const shortsMatch = path.match(/^\/shorts\/([\w-]{5,})/);
            if (shortsMatch) return shortsMatch[1];
            
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('v');
        }

        observeLikeButtonReady() {
            if (this.likeReadyObserver) this.likeReadyObserver.disconnect();
            this.likeReadyObserver = new MutationObserver(() => {
                const btn = document.querySelector(SELECTORS.LIKE_BUTTON);
                if (btn) {
                    this.logger.info('Like button detected by observer');
                    this.checkAndLikeVideo();
                    if (this.likeReadyObserver) this.likeReadyObserver.disconnect();
                }
            });
            this.likeReadyObserver.observe(document.body, { childList: true, subtree: true });
        }

        cleanup() {
            this.stopBackgroundCheck();
            if (this.likeReadyObserver) {
                this.likeReadyObserver.disconnect();
                this.likeReadyObserver = null;
            }
        }
    }

    // ============================================================================
    // GAME SECTION MANAGER CLASS
    // ============================================================================
    // Removes/hides game sections from YouTube homepage at regular intervals.
    // Detects games using multiple methods: DOM structure, title text, aria-labels, genres.
    // Supports multiple languages (English and Spanish game section names).
    // Can be toggled on/off via settings.
    
    class GameSectionManager {
        constructor(settingsManager, logger) {
            this.settingsManager = settingsManager;
            this.logger = logger;
            this.hideInterval = null;
        }

        start() {
            this.hideInterval = setInterval(() => this.hideGameSections(), CONSTANTS.GAME_CHECK_INTERVAL);
            this.hideGameSections();
        }

        stop() {
            if (this.hideInterval) {
                clearInterval(this.hideInterval);
                this.hideInterval = null;
            }
        }

        hideGameSections() {
            if (!this.settingsManager.get('removeGamesEnabled')) return;

            const allSections = document.querySelectorAll(SELECTORS.GAME_SECTION);
            if (allSections.length > 0) {
                allSections.forEach(section => {
                    if (this.isGameSection(section)) {
                        section.style.display = 'none';
                        this.logger.success('Game section hidden');
                    }
                });
            }
        }

        isGameSection(section) {
            if (section.querySelectorAll('div#dismissible.style-scope.ytd-rich-shelf-renderer').length > 0) return true;
            if (section.querySelectorAll('ytd-mini-game-card-view-model').length > 0) return true;
            if (section.querySelectorAll('a[href*="/playables"], a[href*="gaming"]').length > 0) return true;

            const titleElement = section.querySelector('#title-text span');
            if (titleElement && /game|jugable/i.test(titleElement.textContent)) return true;

            const richShelfElements = section.querySelectorAll('ytd-rich-shelf-renderer');
            for (const element of richShelfElements) {
                const ariaLabel = element.getAttribute('aria-label');
                if (ariaLabel && /game|juego/i.test(ariaLabel)) return true;
            }

            const gameGenres = ['Arcade', 'Racing', 'Sports', 'Action', 'Puzzles', 'Music', 'Carreras', 'Deportes', 'Acción', 'Puzles', 'Música'];
            const genreSpans = section.querySelectorAll('.yt-mini-game-card-view-model__genre');
            return Array.from(genreSpans).some(span =>
                gameGenres.some(genre => span.textContent.includes(genre))
            );
        }

        cleanup() {
            this.stop();
        }
    }

    // ============================================================================
    // ADBLOCK HANDLER CLASS
    // ============================================================================
    // Detects and bypasses AdBlock detection screens on YouTube.
    // Monitors DOM for playability error messages and removes them.
    // Replaces blocked player with embedded YouTube iframe player.
    // Retries detection with exponential backoff up to MAX_TRIES limit.
    
    class AdBlockHandler {
        constructor(settingsManager, playerManager, logger) {
            this.settingsManager = settingsManager;
            this.playerManager = playerManager;
            this.logger = logger;
            this.tries = 0;
            this.adBlockObserver = null;
        }

        handleAdBlockError() {
            if (!this.settingsManager.get('adBlockBypassEnabled')) {
                this.logger.info('AdBlock bypass disabled');
                return;
            }

            const playabilityError = document.querySelector(SELECTORS.PLAYABILITY_ERROR);
            if (playabilityError) {
                playabilityError.remove();
                this.playerManager.replacePlayer(window.location.href);
            } else if (this.tries < CONSTANTS.MAX_TRIES) {
                this.tries++;
                setTimeout(() => this.handleAdBlockError(), CONSTANTS.DELAY);
            }
        }

        startObserver() {
            this.adBlockObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                node.matches(SELECTORS.PLAYABILITY_ERROR)) {
                                this.logger.info('Playability error detected');
                                this.handleAdBlockError();
                                return;
                            }
                        }
                    }
                }
            });
            this.adBlockObserver.observe(document.body, { childList: true, subtree: true });
        }

        cleanup() {
            if (this.adBlockObserver) {
                this.adBlockObserver.disconnect();
                this.adBlockObserver = null;
            }
        }
    }

    // ============================================================================
    // UI MANAGER CLASS (Settings Dialog)
    // ============================================================================
    // Creates and manages the settings dialog UI with toggles and sliders.
    // Handles user interactions (checkbox toggles, range sliders, save/cancel).
    // Updates settings values in real-time and persists to storage.
    // Provides callbacks for settings changes (logging, check frequency, etc.).
    
    class UIManager {
        constructor(settingsManager, logger, callbacks) {
            this.settingsManager = settingsManager;
            this.logger = logger;
            this.callbacks = callbacks; // { onCheckFrequencyChange, onLoggingChange }
        }

        createSettingsMenu() {
            GM_registerMenuCommand('YouTube Enchantments Settings', () => this.showSettingsDialog());
        }

        showSettingsDialog() {
            let dialog = document.getElementById('youtube-enchantments-settings');
            if (!dialog) {
                dialog = this.createSettingsDialog();
                document.body.appendChild(dialog);
            }
            dialog.style.display = 'block';
        }

        hideSettingsDialog() {
            const dialog = document.getElementById('youtube-enchantments-settings');
            if (dialog) {
                dialog.style.display = 'none';
            }
        }

        toggleSettingsDialog() {
            const dialog = document.getElementById('youtube-enchantments-settings');
            if (dialog && dialog.style.display === 'block') {
                this.hideSettingsDialog();
            } else {
                this.showSettingsDialog();
            }
        }

        createSettingsDialog() {
            const wrapper = document.createElement('div');
            wrapper.id = 'youtube-enchantments-settings';

            const styleEl = document.createElement('style');
            styleEl.textContent = `
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
                .dpe-toggle-container:hover { background: #1a1832; }
                .dpe-toggle-label {
                    flex-grow: 1;
                    color: #ffffff;
                    font-size: 1.1em;
                    font-weight: 600;
                    margin-left: 12px;
                }
                .dpe-toggle { position: relative; display: inline-block; width: 46px; height: 24px; }
                .dpe-toggle input {
                    position: absolute; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0;
                }
                .dpe-toggle-slider {
                    position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #2a2945; transition: .3s; border-radius: 24px;
                }
                .dpe-toggle-slider:before {
                    position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
                    background-color: #ffffff; transition: .3s; border-radius: 50%;
                }
                .dpe-toggle input:checked + .dpe-toggle-slider { background-color: #cc0000; }
                .dpe-toggle input:checked + .dpe-toggle-slider:before { transform: translateX(22px); }
                .dpe-slider-container { margin: 24px 0; padding: 12px; background: #15132a; border-radius: 8px; }
                .dpe-slider-container label { display: block; margin-bottom: 8px; color: #ffffff; font-size: 1.1em; font-weight: 600; }
                .dpe-slider-container input[type="range"] {
                    width: 100%; margin: 8px 0; height: 4px; background: #2a2945; border-radius: 2px; -webkit-appearance: none;
                }
                .dpe-slider-container input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none; width: 16px; height: 16px; background: #cc0000; border-radius: 50%; cursor: pointer; transition: background-color 0.2s;
                }
                .dpe-slider-container input[type="range"]::-webkit-slider-thumb:hover { background: #990000; }
                .dpe-button-container { display: flex; justify-content: space-between; margin-top: 24px; gap: 12px; }
                .dpe-button { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 1.1em; font-weight: 600; transition: all 0.2s; flex: 1; }
                .dpe-button-save { background-color: #cc0000; color: white; }
                .dpe-button-save:hover { background-color: #990000; transform: translateY(-1px); }
                .dpe-button-cancel { background-color: #15132a; color: white; border: 1px solid #2a2945; }
                .dpe-button-cancel:hover { background-color: #1a1832; transform: translateY(-1px); }
            `;

            const container = document.createElement('div');
            container.className = 'dpe-dialog';

            const title = document.createElement('h3');
            title.textContent = 'YouTube Enchantments';
            container.appendChild(title);

            container.appendChild(this.createToggle('autoLikeEnabled', 'Auto Like', 'Automatically like videos of subscribed channels'));
            container.appendChild(this.createToggle('autoLikeLiveStreams', 'Like Live Streams', 'Include live streams in auto-like feature'));
            container.appendChild(this.createToggle('likeIfNotSubscribed', 'Like All Videos', 'Like videos even if not subscribed'));
            container.appendChild(this.createToggle('adBlockBypassEnabled', 'AdBlock Bypass', 'Bypass AdBlock detection'));
            container.appendChild(this.createToggle('removeGamesEnabled', 'Remove Games', 'Hide game sections from YouTube homepage'));
            container.appendChild(this.createToggle('loggingEnabled', 'Logging', 'Enable or disable console logging'));

            container.appendChild(this.createSlider('watchThreshold', 'Watch Threshold', 0, 100, 10, '%'));
            container.appendChild(this.createSlider('scrollSpeed', 'Scroll Speed', 10, 100, 5, 'px'));
            container.appendChild(this.createSlider('checkFrequency', 'Check Frequency (ms)', CONSTANTS.MIN_CHECK_FREQUENCY, CONSTANTS.MAX_CHECK_FREQUENCY, 500, 'ms'));

            const btns = document.createElement('div');
            btns.className = 'dpe-button-container';
            const saveBtn = document.createElement('button');
            saveBtn.id = 'saveSettingsButton'; 
            saveBtn.className = 'dpe-button dpe-button-save';
            saveBtn.textContent = 'Save';
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'closeSettingsButton'; 
            cancelBtn.className = 'dpe-button dpe-button-cancel';
            cancelBtn.textContent = 'Cancel';
            btns.appendChild(saveBtn); 
            btns.appendChild(cancelBtn);
            container.appendChild(btns);

            wrapper.appendChild(styleEl);
            wrapper.appendChild(container);

            saveBtn.addEventListener('click', () => {
                this.settingsManager.save();
                this.hideSettingsDialog();
            });
            cancelBtn.addEventListener('click', () => this.hideSettingsDialog());
            
            wrapper.querySelectorAll('.dpe-toggle input').forEach(toggle => {
                toggle.addEventListener('change', (e) => this.handleSettingChange(e));
            });

            wrapper.querySelectorAll('input[type="range"]').forEach(slider => {
                slider.addEventListener('input', (e) => this.handleSliderInput(e));
            });

            return wrapper;
        }

        createToggle(id, label, title) {
            const container = document.createElement('div');
            container.className = 'dpe-toggle-container';
            container.title = title;

            const toggleLabel = document.createElement('label');
            toggleLabel.className = 'dpe-toggle';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.setAttribute('data-setting', id);
            if (this.settingsManager.get(id)) input.checked = true;
            const slider = document.createElement('span');
            slider.className = 'dpe-toggle-slider';
            toggleLabel.appendChild(input);
            toggleLabel.appendChild(slider);

            const textLabel = document.createElement('label');
            textLabel.className = 'dpe-toggle-label';
            textLabel.textContent = label;

            container.appendChild(toggleLabel);
            container.appendChild(textLabel);
            return container;
        }

        createSlider(id, label, min, max, step, suffix) {
            const container = document.createElement('div');
            container.className = 'dpe-slider-container';
            
            const labelEl = document.createElement('label');
            labelEl.setAttribute('for', id);
            labelEl.textContent = label;
            
            const input = document.createElement('input');
            input.type = 'range';
            input.id = id;
            input.min = String(min);
            input.max = String(max);
            input.step = String(step);
            input.setAttribute('data-setting', id);
            input.value = String(this.settingsManager.get(id));
            
            const valueSpan = document.createElement('span');
            valueSpan.id = `${id}Value`;
            valueSpan.textContent = `${this.settingsManager.get(id)}${suffix}`;
            
            container.appendChild(labelEl);
            container.appendChild(input);
            container.appendChild(valueSpan);
            
            return container;
        }

        handleSettingChange(e) {
            if (e.target.dataset.setting) {
                if (e.target.type === 'checkbox') {
                    const newValue = this.settingsManager.toggle(e.target.dataset.setting);
                    
                    if (e.target.dataset.setting === 'adBlockBypassEnabled') {
                        this.logger.info(`AdBlock Ban Bypass is ${newValue ? 'enabled' : 'disabled'}`);
                    }
                    if (e.target.dataset.setting === 'loggingEnabled') {
                        if (this.callbacks.onLoggingChange) {
                            this.callbacks.onLoggingChange(newValue);
                        }
                    }
                }
            }
        }

        handleSliderInput(e) {
            if (e.target.type === 'range') {
                const value = e.target.value;
                const setting = e.target.getAttribute('data-setting');
                
                if (setting === 'watchThreshold') {
                    document.getElementById('watchThresholdValue').textContent = `${value}%`;
                    this.settingsManager.updateNumeric('watchThreshold', value);
                } else if (setting === 'scrollSpeed') {
                    document.getElementById('scrollSpeedValue').textContent = `${value}px`;
                    this.settingsManager.updateNumeric('scrollSpeed', value);
                } else if (setting === 'checkFrequency') {
                    document.getElementById('checkFrequencyValue').textContent = `${value}ms`;
                    this.settingsManager.updateNumeric('checkFrequency', value);
                    if (this.callbacks.onCheckFrequencyChange) {
                        this.callbacks.onCheckFrequencyChange();
                    }
                }
            }
        }
    }

    // ============================================================================
    // SCROLL MANAGER CLASS
    // ============================================================================
    // Manages auto-scrolling functionality with PageDown/PageUp keyboard shortcuts.
    // Toggles continuous scrolling at configurable speed (pixels per interval).
    // Handles page-up to scroll to top or stop scrolling if already scrolling.
    
    class ScrollManager {
        constructor(settingsManager) {
            this.settingsManager = settingsManager;
            this.isScrolling = false;
            this.scrollInterval = null;
        }

        toggle() {
            if (this.isScrolling) {
                clearInterval(this.scrollInterval);
                this.isScrolling = false;
            } else {
                this.isScrolling = true;
                this.scrollInterval = setInterval(() => 
                    window.scrollBy(0, this.settingsManager.get('scrollSpeed')), 20);
            }
        }

        stop() {
            if (this.isScrolling && this.scrollInterval) {
                clearInterval(this.scrollInterval);
                this.isScrolling = false;
            }
        }

        pageUp() {
            if (this.isScrolling) {
                clearInterval(this.scrollInterval);
                this.isScrolling = false;
            } else {
                window.scrollTo(0, 0);
            }
        }

        cleanup() {
            this.stop();
        }
    }

    // ============================================================================
    // NAVIGATION MANAGER CLASS
    // ============================================================================
    // Tracks page URL changes and handles channel navigation redirects.
    // Redirects from /featured to /videos page on channel visits.
    // Handles both new format (@username) and legacy (/channel/ID) URLs.
    // Maintains current URL state for detecting page navigation changes.
    
    class NavigationManager {
        constructor(logger) {
            this.logger = logger;
            this.currentPageUrl = window.location.href;
        }

        redirectToVideosPage() {
            const currentUrl = window.location.href;

            if (currentUrl.includes('/@')) {
                if (currentUrl.endsWith('/featured') || currentUrl.includes('/featured?')) {
                    const videosUrl = currentUrl.replace(/\/featured(\?.*)?$/, '/videos');
                    this.logger.info(`Redirecting to videos page: ${videosUrl}`);
                    window.location.replace(videosUrl);
                    return true;
                } else if (currentUrl.match(/\/@[^\/]+\/?(\?.*)?$/)) {
                    const videosUrl = currentUrl.replace(/\/?(\?.*)?$/, '/videos');
                    this.logger.info(`Redirecting to videos page: ${videosUrl}`);
                    window.location.replace(videosUrl);
                    return true;
                }
            }

            if (currentUrl.includes('/channel/')) {
                if (currentUrl.endsWith('/featured') || currentUrl.includes('/featured?')) {
                    const videosUrl = currentUrl.replace(/\/featured(\?.*)?$/, '/videos');
                    this.logger.info(`Redirecting to videos page: ${videosUrl}`);
                    window.location.replace(videosUrl);
                    return true;
                } else if (currentUrl.match(/\/channel\/[^\/]+\/?(\?.*)?$/)) {
                    const videosUrl = currentUrl.replace(/\/?(\?.*)?$/, '/videos');
                    this.logger.info(`Redirecting to videos page: ${videosUrl}`);
                    window.location.replace(videosUrl);
                    return true;
                }
            }

            return false;
        }

        getCurrentUrl() {
            return this.currentPageUrl;
        }

        updateCurrentUrl(url) {
            this.currentPageUrl = url;
        }
    }

    // ============================================================================
    // MAIN APPLICATION CLASS
    // ============================================================================
    // Orchestrates all managers and coordinates script initialization.
    // Composes Logger, SettingsManager, PlayerManager, AutoLikeManager, etc.
    // Sets up event listeners for keyboard shortcuts, page navigation, DOM changes.
    // Manages cleanup on page unload to prevent memory leaks.
    // Entry point that initializes and runs the entire application.
    
    class YouTubeEnchantments {
        constructor() {
            this.logger = new Logger(true);
            this.settingsManager = new SettingsManager(this.logger);
            this.logger.setEnabled(this.settingsManager.get('loggingEnabled'));
            
            this.playerManager = new PlayerManager(this.logger);
            this.autoLikeManager = new AutoLikeManager(this.settingsManager, this.logger);
            this.gameSectionManager = new GameSectionManager(this.settingsManager, this.logger);
            this.adBlockHandler = new AdBlockHandler(this.settingsManager, this.playerManager, this.logger);
            this.scrollManager = new ScrollManager(this.settingsManager);
            this.navigationManager = new NavigationManager(this.logger);
            
            this.uiManager = new UIManager(this.settingsManager, this.logger, {
                onCheckFrequencyChange: () => this.autoLikeManager.restartBackgroundCheck(),
                onLoggingChange: (enabled) => {
                    this.logger.setEnabled(enabled);
                    this.logger.info(`Logging ${enabled ? 'enabled' : 'disabled'}`);
                }
            });

            this.duplicateCleanupInterval = null;

            if (!window.URL) {
                this.logger.warning('URL API not available; some features may not work as expected.');
            }
        }

        async init() {
            try {
                this.logger.info('Initializing YouTube Enchantments');

                this.uiManager.createSettingsMenu();
                this.setupEventListeners();
                this.navigationManager.redirectToVideosPage();

                this.autoLikeManager.startBackgroundCheck();
                this.autoLikeManager.observeLikeButtonReady();
                
                this.gameSectionManager.start();
                this.adBlockHandler.startObserver();

                this.duplicateCleanupInterval = setInterval(
                    () => this.playerManager.removeDuplicates(), 
                    CONSTANTS.DUPLICATE_CHECK_INTERVAL
                );

                this.logger.info('Script initialization complete');
            } catch (error) {
                this.logger.error(`Initialization failed: ${error}`);
            }
        }

        setupEventListeners() {
            window.addEventListener('beforeunload', () => {
                this.navigationManager.updateCurrentUrl(window.location.href);
                this.cleanup();
            });

            document.addEventListener('yt-navigate-finish', () => {
                this.logger.info('Page navigation detected');
                const newUrl = window.location.href;
                const currentUrl = this.navigationManager.getCurrentUrl();
                
                if (newUrl !== currentUrl) {
                    this.logger.info(`URL changed: ${newUrl}`);

                    if (this.navigationManager.redirectToVideosPage()) return;

                    if (newUrl.endsWith('.com/')) {
                        const iframe = document.getElementById(CONSTANTS.IFRAME_ID);
                        if (iframe) {
                            this.logger.info('Removing iframe');
                            iframe.remove();
                        }
                    } else {
                        this.logger.info('Handling potential ad block error');
                        this.adBlockHandler.handleAdBlockError();
                    }
                    
                    this.navigationManager.updateCurrentUrl(newUrl);
                    this.scrollManager.stop();
                    this.autoLikeManager.restartBackgroundCheck();
                    this.autoLikeManager.observeLikeButtonReady();
                }
            });

            window.addEventListener('popstate', () => {
                this.logger.info('popstate detected');
                const newUrl = window.location.href;
                const currentUrl = this.navigationManager.getCurrentUrl();
                
                if (newUrl !== currentUrl) {
                    this.navigationManager.updateCurrentUrl(newUrl);
                    this.autoLikeManager.restartBackgroundCheck();
                    this.autoLikeManager.observeLikeButtonReady();
                }
            });

            document.addEventListener('keydown', (event) => {
                const tag = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : '';
                const isEditable = tag === 'input' || tag === 'textarea' || 
                                 (event.target && event.target.isContentEditable);

                switch (event.key) {
                    case 'F2':
                        if (!isEditable) {
                            event.preventDefault();
                            event.stopPropagation();
                            this.logger.info('F2 pressed - toggling settings dialog');
                            this.uiManager.toggleSettingsDialog();
                        }
                        break;
                    case 'PageDown':
                        if (!isEditable) {
                            event.preventDefault();
                            this.scrollManager.toggle();
                        }
                        break;
                    case 'PageUp':
                        if (!isEditable) {
                            event.preventDefault();
                            this.scrollManager.pageUp();
                        }
                        break;
                }
            }, true);
        }

        cleanup() {
            try {
                this.autoLikeManager.cleanup();
                this.gameSectionManager.cleanup();
                this.adBlockHandler.cleanup();
                this.scrollManager.cleanup();
                
                if (this.duplicateCleanupInterval) {
                    clearInterval(this.duplicateCleanupInterval);
                    this.duplicateCleanupInterval = null;
                }
            } catch (e) {
                this.logger.error(`Cleanup error: ${e}`);
            }
        }
    }

    // ============================================================================
    // APPLICATION ENTRY POINT
    // ============================================================================
    
    const app = new YouTubeEnchantments();
    app.init();
})();
