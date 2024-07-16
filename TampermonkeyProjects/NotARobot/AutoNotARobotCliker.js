// ==UserScript==
// @name         Auto Click "I'm not a robot"
// @namespace    http://tampermonkey.net/
// @version      0.6
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

    // Function to find and click the reCAPTCHA checkbox
    async function clickRecaptchaCheckbox() {
        const recaptchaCheckboxElement = findRecaptchaCheckboxElement();
        if (recaptchaCheckboxElement) {
            recaptchaCheckboxElement.click();
            await sleep(delayBetweenClicks);
        }
    }

    // Function to locate the reCAPTCHA checkbox element
    function findRecaptchaCheckboxElement() {
        // Search for elements containing the "I'm not a robot" text
        const recaptchaTextElements = document.querySelectorAll('*:not(script):not(style)');
        for (const element of recaptchaTextElements) {
            if (element.textContent.includes("I'm not a robot")) {
                return element.closest('div').querySelector('.recaptcha-checkbox');
            }
        }

        // Search for elements with the class 'recaptcha-checkbox'
        const recaptchaCheckboxElements = document.querySelectorAll('.recaptcha-checkbox');
        for (const element of recaptchaCheckboxElements) {
            return element;
        }

        return null;
    }

    // Function to solve Cloudflare Turnstile challenges by clicking on all elements in the challenge stage
    async function solveCloudflareTurnstile() {
        const challengeStage = document.querySelector('#challenge-stage');
        if (challengeStage) {
            const elements = challengeStage.querySelectorAll('*');
            for (const element of elements) {
                // Dispatch a mouse event to simulate a click
                element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                await sleep(50); // Small delay between clicks
            }
        }
    }

    // Set an interval to periodically attempt to click the reCAPTCHA checkbox and solve the Cloudflare Turnstile
    setInterval(async () => {
        await clickRecaptchaCheckbox();
        await solveCloudflareTurnstile();
    }, 1500);
})();
