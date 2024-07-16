// ==UserScript==
// @name         Auto Click "I'm not a robot"
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Automatically clicks the "I'm not a robot" checkbox and Solves CloudFlare Turnstile
// @author       JJJ
// @match        *://*/*
// @icon         https://pngimg.com/uploads/robot/robot_PNG96.png
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Define the delay between clicks (in milliseconds)
    const delayBetweenClicks = 100;

    // Function to pause execution for a specified time
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Function to simulate a click event
    function simulateClick(element) {
        const evt = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        element.dispatchEvent(evt);
    }

    // Function to find the reCAPTCHA checkbox element
    function findRecaptchaCheckboxElement() {
        return document.querySelector('.recaptcha-checkbox-border') ||
            document.querySelector('[role="checkbox"][aria-labelledby="recaptcha-anchor-label"]');
    }

    // Function to click the reCAPTCHA checkbox
    async function clickRecaptchaCheckbox() {
        const recaptchaCheckboxElement = findRecaptchaCheckboxElement();
        if (recaptchaCheckboxElement) {
            simulateClick(recaptchaCheckboxElement);
            await sleep(delayBetweenClicks);
        }
    }

    // Function to solve Cloudflare Turnstile challenges
    async function solveCloudflareTurnstile() {
        const challengeStage = document.querySelector('#challenge-stage');
        if (challengeStage) {
            const elements = challengeStage.querySelectorAll('*');
            for (const element of elements) {
                simulateClick(element);
                await sleep(50); // Small delay between clicks
            }
        }
    }

    // Set up a mutation observer to detect when the reCAPTCHA or Turnstile is added to the page
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                const checkbox = findRecaptchaCheckboxElement();
                if (checkbox) {
                    simulateClick(checkbox);
                    observer.disconnect();
                    break;
                }
                solveCloudflareTurnstile(); // Attempt to solve Cloudflare Turnstile challenges
            }
        }
    });

    // Start observing the document body for changes
    observer.observe(document.body, { childList: true, subtree: true });

    // Try to click immediately on script load
    (async function () {
        await clickRecaptchaCheckbox();
        await solveCloudflareTurnstile();
    })();

    // Set an interval to periodically attempt to click the reCAPTCHA checkbox and solve the Cloudflare Turnstile
    setInterval(async () => {
        await clickRecaptchaCheckbox();
        await solveCloudflareTurnstile();
    }, 1500);

})();
