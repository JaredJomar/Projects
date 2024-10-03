// ==UserScript==
// @name           YouTube AdBlock Ban Bypass 
// @namespace      http://tampermonkey.net/
// @version        0.1
// @description    Bypass YouTube Adblock Ban
// @author         JJJ
// @match          https://www.youtube.com/*
// @match          https://www.youtube-nocookie.com/*
// @exclude        https://www.youtube.com/*/community
// @icon           https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant          none
// @license        MIT
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        IFRAME_ID: 'adblock-bypass-iframe',
        RETRY_DELAY_MS: 200,
        MAX_RETRIES: 100,
        DUPLICATE_CLEANUP_INTERVAL_MS: 5000
    };

    const SELECTORS = {
        PLAYABILITY_ERROR: '.yt-playability-error-supported-renderers',
        ERROR_SCREEN_CONTAINER: '#error-screen',
        VIDEO_PLAYER_CONTAINER: '#movie_player'
    };

    let currentUrl = window.location.href;
    let retryCount = 0;

    // URL Utilities
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
                console.error('Failed to extract URL parameters:', e);
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

    // Player Management
    const playerManager = {
        createIframe(url) {
            const { videoId, playlistId, index } = urlUtils.extractParams(url);
            if (!videoId) return null;

            const iframe = document.createElement('iframe');
            const commonArgs = 'autoplay=1&modestbranding=1';
            const embedUrl = playlistId
                ? `https://www.youtube-nocookie.com/embed/${videoId}?${commonArgs}&list=${playlistId}&index=${index}`
                : `https://www.youtube-nocookie.com/embed/${videoId}?${commonArgs}${urlUtils.getTimestampFromUrl(url)}`;

            this.setIframeAttributes(iframe, embedUrl);
            return iframe;
        },

        setIframeAttributes(iframe, url) {
            iframe.id = CONFIG.IFRAME_ID;
            iframe.src = url;
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            iframe.allowFullscreen = true;
            iframe.style.cssText = 'height:100%; width:100%; border:none; border-radius:12px;';
        },

        replacePlayer(url) {
            const errorScreenContainer = document.querySelector(SELECTORS.ERROR_SCREEN_CONTAINER);
            if (!errorScreenContainer) return;

            let iframe = document.getElementById(CONFIG.IFRAME_ID);
            if (iframe) {
                this.setIframeAttributes(iframe, url);
            } else {
                iframe = this.createIframe(url);
                if (iframe) {
                    errorScreenContainer.appendChild(iframe);
                }
            }
            this.bringToFront(CONFIG.IFRAME_ID);
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

        removeDuplicateIframes() {
            const iframes = document.querySelectorAll(`#${CONFIG.IFRAME_ID}`);
            if (iframes.length > 1) {
                Array.from(iframes).slice(1).forEach(iframe => iframe.remove());
            }
        }
    };

    // Event Handlers
    function handleAdBlockError() {
        const playabilityError = document.querySelector(SELECTORS.PLAYABILITY_ERROR);
        if (playabilityError) {
            playabilityError.remove();
            playerManager.replacePlayer(window.location.href);
        } else if (retryCount < CONFIG.MAX_RETRIES) {
            retryCount++;
            setTimeout(handleAdBlockError, CONFIG.RETRY_DELAY_MS);
        }
    }

    // Event Listeners
    function setupEventListeners() {
        window.addEventListener('beforeunload', () => {
            currentUrl = window.location.href;
        });

        document.addEventListener('yt-navigate-finish', () => {
            const newUrl = window.location.href;
            if (newUrl !== currentUrl) {
                if (newUrl.endsWith('.com/')) {
                    const iframe = document.getElementById(CONFIG.IFRAME_ID);
                    iframe?.remove();
                } else {
                    playerManager.replacePlayer(newUrl);
                }
                currentUrl = newUrl;
            }
        });

        // Using MutationObserver for efficient DOM change detection
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE &&
                            node.matches(SELECTORS.PLAYABILITY_ERROR)) {
                            handleAdBlockError();
                            return;
                        }
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Initialize
    function initialize() {
        setupEventListeners();
        handleAdBlockError();
        setInterval(() => playerManager.removeDuplicateIframes(), CONFIG.DUPLICATE_CLEANUP_INTERVAL_MS);
    }

    initialize();
})();