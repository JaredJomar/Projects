// ==UserScript==
// @name         Close Ads  
// @namespace    https://www.lookmovie2.to/
// @version      0.5
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
        checkInterval: 50, // Check every 50ms
        maxAttempts: 100, // Maximum number of attempts (5 seconds total)
        continuousCheck: true // Keep checking for ads continuously
    };

    // Function to close ads
    function closeAds() {
        const closeButton = document.querySelector(config.closeButtonSelector);
        if (closeButton && closeButton.style.display !== 'none') {
            closeButton.click();
            console.log('Ad closed');
            return true; // Ad was closed
        }
        return false; // No ad to close
    }

    // Function to continuously attempt closing ads
    function continuousAdClosing() {
        let attempts = 0;
        const intervalId = setInterval(() => {
            if (closeAds()) {
                attempts = 0; // Reset attempts when an ad is closed
            } else {
                attempts++;
            }

            if (!config.continuousCheck && attempts >= config.maxAttempts) {
                clearInterval(intervalId);
                console.log('Ad closing process finished');
            }
        }, config.checkInterval);
    }

    // Function to initialize the ad closing process
    function initAdCloser() {
        console.log('Ad closer initialized');
        continuousAdClosing();
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
})();