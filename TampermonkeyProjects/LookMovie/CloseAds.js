// ==UserScript==
// @name         Close Ads
// @namespace    https://www.lookmovie2.to/
// @version      0.6
// @description  Close ads on LookMovie
// @author       JJJ
// @match        https://www.lookmovie2.to/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lookmovie2.to
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Configuration
    const config = {
        closeButtonSelector: '#PlayerZone > section > a.close-icon.player-ads-summer-2024--close',
        maxAttempts: 100,
        continuousCheck: true
    };

    let attempts = 0;
    let observer = null;

    // Function to close ads
    function closeAds() {
        try {
            const closeButton = document.querySelector(config.closeButtonSelector);
            if (closeButton && closeButton.style.display !== 'none') {
                closeButton.click();
                console.log('Ad closed');
                return true; // Ad was closed
            }
        } catch (error) {
            console.error('Error while trying to close the ad:', error);
        }
        return false; // No ad to close
    }

    // Function to handle mutations
    function handleMutations(mutations) {
        mutations.forEach(() => {
            if (closeAds()) {
                attempts = 0; // Reset attempts on success
            } else {
                attempts++;
            }

            if (!config.continuousCheck && attempts >= config.maxAttempts) {
                stopObserver();
                console.log('Ad closing process finished');
            }
        });
    }

    // Function to start the MutationObserver
    function startObserver() {
        if (observer) return; // Prevent multiple observers

        observer = new MutationObserver(handleMutations);
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('MutationObserver started');
    }

    // Function to stop the MutationObserver
    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
            console.log('MutationObserver stopped');
        }
    }

    // Function to initialize the ad closing process
    function initAdCloser() {
        console.log('Ad closer initialized');
        if (closeAds()) {
            attempts = 0; // Reset attempts on success
        }

        startObserver();

        window.addEventListener('beforeunload', stopObserver); // Cleanup on unload
    }

    // Start the process as soon as possible
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initAdCloser();
    } else {
        document.addEventListener('DOMContentLoaded', initAdCloser);
    }

    // Fallback: If DOMContentLoaded doesn't fire, start after a short delay
    setTimeout(initAdCloser, 1000);

    // Listen for errors and log them
    window.addEventListener('error', (e) => {
        console.error('Error in Close Ads script:', e.error);
    });

    // Polyfill for MutationObserver for older browsers
    (function () {
        if (!window.MutationObserver) {
            window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver || class {
                constructor(callback) {
                    this.callback = callback;
                }
                observe() {
                    console.warn('MutationObserver not supported by this browser.');
                }
                disconnect() { }
            };
        }
    })();
})();
