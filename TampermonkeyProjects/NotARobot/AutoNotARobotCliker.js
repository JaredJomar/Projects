// ==UserScript==
// @name         Auto Click "I'm not a robot"
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Automatically clicks the "I'm not a robot" checkbox and solves CloudFlare Turnstile challenges with improved reliability and human-like behavior simulation.
// @author       JJJ
// @match        *://*/*
// @icon         https://pngimg.com/uploads/robot/robot_PNG96.png
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Constants to simplify delay modifications
    const MIN_DELAY = 500;  // Increased to better simulate human behavior
    const MAX_DELAY = 1500;  // Increased to better simulate human behavior
    const BASE_CHECK_DELAY = 3000;  // Increased to give more time for verification
    const CURSOR_MOVE_MIN_DELAY = 20;  // Min delay for cursor movement
    const CURSOR_MOVE_MAX_DELAY = 40;  // Max delay for cursor movement
    const MAX_RETRIES = 5;

    let challengeInProgress = false;
    let pageReloaded = false;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getRandomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function simulateCursorMovement(startX, startY, endX, endY, callback) {
        const steps = 40;  // Increased steps for smoother movement
        const delay = getRandomDelay(CURSOR_MOVE_MIN_DELAY, CURSOR_MOVE_MAX_DELAY);  // Randomized delay for more human-like behavior
        let currentStep = 0;

        function move() {
            if (currentStep <= steps) {
                const progress = currentStep / steps;
                const easeProgress = easeInOutQuad(progress);

                const curveX = startX + (endX - startX) * easeProgress;
                const curveY = startY + (endY - startY) * easeProgress;

                const randomX = curveX + (Math.random() - 0.5) * 5;
                const randomY = curveY + (Math.random() - 0.5) * 5;

                const moveEvent = new MouseEvent('mousemove', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: randomX,
                    clientY: randomY
                });
                document.dispatchEvent(moveEvent);

                currentStep++;
                setTimeout(move, delay);
            } else {
                callback();
            }
        }

        move();
    }

    function simulateClick(element) {
        if (element) {
            const rect = element.getBoundingClientRect();
            const endX = rect.left + (rect.width / 2);
            const endY = rect.top + (rect.height / 2);
            const startX = Math.random() * window.innerWidth;
            const startY = Math.random() * window.innerHeight;

            console.log(`Simulating cursor movement from (${startX}, ${startY}) to (${endX}, ${endY})`);
            simulateCursorMovement(startX, startY, endX, endY, () => {
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: endX,
                    clientY: endY
                });
                element.dispatchEvent(clickEvent);
                console.log(`Clicked element at (${endX}, ${endY})`);
            });
        } else {
            console.log('Element to simulate click on is not found');
        }
    }

    function findRecaptchaCheckboxElement() {
        const element = document.querySelector('.recaptcha-checkbox-border') ||
            document.querySelector('[role="checkbox"][aria-labelledby="recaptcha-anchor-label"]');
        if (element) {
            console.log('Found reCAPTCHA checkbox element');
        } else {
            console.log('reCAPTCHA checkbox element not found');
        }
        return element;
    }

    async function clickRecaptchaCheckbox() {
        const recaptchaCheckboxElement = findRecaptchaCheckboxElement();
        if (recaptchaCheckboxElement) {
            console.log('Clicking reCAPTCHA checkbox');
            simulateClick(recaptchaCheckboxElement);
            await sleep(getRandomDelay(MIN_DELAY, MAX_DELAY));
        }
    }

    async function solveCloudflareTurnstile() {
        const challengeStage = document.querySelector('#challenge-stage');
        if (challengeStage) {
            console.log('Found Cloudflare Turnstile challenge stage');
            const elements = challengeStage.querySelectorAll('*');
            for (const element of elements) {
                simulateClick(element);
                await sleep(getRandomDelay(MIN_DELAY, MAX_DELAY));
            }
        } else {
            console.log('Cloudflare Turnstile challenge stage not found');
        }

        const otherChallengeTypes = document.querySelectorAll('.challenge-body .challenge-element, .challenge-stage .challenge-element');
        if (otherChallengeTypes.length > 0) {
            console.log('Found additional Turnstile challenge elements');
            for (const element of otherChallengeTypes) {
                simulateClick(element);
                await sleep(getRandomDelay(MIN_DELAY, MAX_DELAY));
            }
        } else {
            console.log('No additional Turnstile challenge elements found');
        }
    }

    function isTurnstileSolved() {
        const turnstileCompleted = document.querySelector('.challenge-stage.completed') ||
            document.querySelector('.challenge-passed');
        if (turnstileCompleted) {
            console.log('Turnstile challenge completed');
        } else {
            console.log('Turnstile challenge not completed');
        }
        return !!turnstileCompleted;
    }

    async function attemptToSolveTurnstile() {
        if (challengeInProgress) {
            console.log('Challenge in progress, skipping attempt');
            return false;
        }

        challengeInProgress = true;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            console.log(`Attempt ${attempt} to solve Turnstile`);
            await solveCloudflareTurnstile();
            await sleep(BASE_CHECK_DELAY + getRandomDelay(0, 1000));  // Added random delay to check delay
            if (isTurnstileSolved()) {
                console.log('Turnstile solved');
                challengeInProgress = false;
                return true;
            }
            console.log('Turnstile not solved, retrying...');
        }
        console.log('Failed to solve Turnstile after max retries');
        challengeInProgress = false;
        return false;
    }

    function initializeObserver() {
        const observer = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    console.log('Mutation detected: childList change');
                    const checkbox = findRecaptchaCheckboxElement();
                    if (checkbox) {
                        simulateClick(checkbox);
                        observer.disconnect();
                        return;
                    }
                    await attemptToSolveTurnstile();  // Always attempt to solve Turnstile on mutation
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    async function init() {
        console.log('Initial attempt to solve reCAPTCHA and Turnstile');
        const recaptchaPresent = findRecaptchaCheckboxElement() !== null;
        const turnstilePresent = document.querySelector('#challenge-stage') !== null || document.querySelector('.challenge-body .challenge-element, .challenge-stage .challenge-element') !== null;

        if (recaptchaPresent || turnstilePresent) {
            await clickRecaptchaCheckbox();
            await attemptToSolveTurnstile();

            setInterval(async () => {
                console.log('Periodic attempt to solve reCAPTCHA and Turnstile');
                await clickRecaptchaCheckbox();
                await attemptToSolveTurnstile();
            }, 1500);
        } else {
            console.log('No CAPTCHA or Turnstile challenge detected, no need to reload the page');
        }
    }

    // Ensure the script runs after the DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeObserver();
            init();
        });
    } else {
        initializeObserver();
        init();
    }
})();
