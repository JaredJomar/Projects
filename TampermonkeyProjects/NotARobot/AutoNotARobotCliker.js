// ==UserScript==
// @name         Auto Click "I'm not a robot"
// @namespace    http://tampermonkey.net/
// @version      0.5
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

    // Define the sleep function that pauses the script for a specified amount of time
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Define the clickRecaptchaCheckbox function that attempts to find and click the reCAPTCHA checkbox
    async function clickRecaptchaCheckbox() {
        const recaptchaCheckboxElement = findRecaptchaCheckboxElement();
        if (recaptchaCheckboxElement) {
            recaptchaCheckboxElement.click();
            await sleep(delayBetweenClicks);
        }
    }

    // Define the findRecaptchaCheckboxElement function that searches for the reCAPTCHA checkbox using the DOM
    function findRecaptchaCheckboxElement() {
        const recaptchaTextElements = document.querySelectorAll('*:not(script):not(style)');
        for (const element of recaptchaTextElements) {
            if (element.textContent.includes("I'm not a robot")) {
                return element;
            }
        }

        const recaptchaCheckboxElements = document.querySelectorAll('.recaptcha-checkbox');
        for (const element of recaptchaCheckboxElements) {
            return element;
        }

        return null;
    }

    // Call the clickRecaptchaCheckbox function periodically
    setInterval(clickRecaptchaCheckbox, 200);

    // Solve CloudFlare Turnstile
    (function () {
        'use strict';
        setInterval(function () {
            document.querySelector('#challenge-stage')?.querySelectorAll('*')?.forEach(element => {
                element.click();
            });
        }, 1500);
    })();
})();