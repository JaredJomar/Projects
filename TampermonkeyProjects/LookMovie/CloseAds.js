// ==UserScript==
// @name         Close Ads  
// @namespace    https://www.lookmovie2.to/
// @version      0.4
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
        maxAttempts: 100 // Maximum number of attempts (5 seconds total)
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

    // Function to repeatedly attempt closing ads
    function attemptClosingAds() {
        let attempts = 0;
        const intervalId = setInterval(() => {
            if (closeAds() || attempts >= config.maxAttempts) {
                clearInterval(intervalId);
                console.log('Ad closing process finished');
            }
            attempts++;
        }, config.checkInterval);
    }

    // Function to initialize the ad closing process
    function initAdCloser() {
        console.log('Ad closer initialized');
        attemptClosingAds();
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