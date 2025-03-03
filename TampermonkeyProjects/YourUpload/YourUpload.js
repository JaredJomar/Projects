// ==UserScript==
// @name        YourUpload Auto Downloader
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Automatically clicks the download button on YourUpload and subsequent page
// @author       JJJ      
// @match        https://www.yourupload.com/watch/*
// @match        https://www.yourupload.com/download*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=yourupload.com
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const MAX_RETRIES = 5;
    // Define button selectors as constants
    const INITIAL_BUTTON_SELECTOR = 'a.btn.btn-success';
    const FINAL_BUTTON_SELECTOR = '#download';

    // Function to attempt clicking a button with retries
    function attemptClickWithRetry(findButtonFn, buttonName, attempt = 1) {
        const button = findButtonFn();

        if (button) {
            console.log(`${buttonName} found on attempt ${attempt}, clicking automatically...`);
            button.click();
            return true;
        } else {
            if (attempt < MAX_RETRIES) {
                console.log(`${buttonName} not found. Retrying... (${attempt}/${MAX_RETRIES})`);
                // Exponential backoff for retries (500ms, 1000ms, 1500ms, 2000ms, 2500ms)
                setTimeout(() => attemptClickWithRetry(findButtonFn, buttonName, attempt + 1),
                    500 * attempt);
                return false;
            } else {
                console.log(`${buttonName} not found after ${MAX_RETRIES} attempts. Please check if the page structure has changed.`);
                return false;
            }
        }
    }

    // Function to execute when the DOM is fully loaded
    function autoDownload() {
        console.log('Running YourUpload Auto Downloader on: ' + window.location.href);

        // Add a slight delay to ensure elements are properly loaded
        setTimeout(function () {
            // Check current URL to determine which button to click
            if (window.location.href.includes('/watch/')) {
                // On the initial watch page
                attemptClickWithRetry(
                    () => document.querySelector(INITIAL_BUTTON_SELECTOR),
                    'Initial download button'
                );
            } else if (window.location.href.includes('/download')) {
                // On the second download page
                attemptClickWithRetry(
                    () => document.querySelector(FINAL_BUTTON_SELECTOR),
                    'Final download button'
                );
            }
        }, 1000);
    }

    // Run when the page is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoDownload);
    } else {
        autoDownload();
    }
})();