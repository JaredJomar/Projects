// ==UserScript==
// @name         Auto Click "I'm not a robot" and "play-box" button
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Automatically clicks the "I'm not a robot" checkbox and a button with the class "play-box" on websites
// @author       JJJ
// @match        *://*/*
// @icon         https://pngimg.com/uploads/robot/robot_PNG96.png
// @grant        none
// @updateURL    https://github.com/JaredJomar/Projects/blob/main/TampermonkeyProjects/NotARobot/AutoNotARobotCliker.js
// ==/UserScript==

(function () {
    'use strict';

    const recaptchaIntervalId = setInterval(function () {
        const recaptchaCheckbox = document.querySelector('#recaptcha-anchor');
        if (recaptchaCheckbox) {
            clearInterval(recaptchaIntervalId);
            recaptchaCheckbox.click();
        }
    }, 500);

    const playBoxIntervalId = setInterval(function () {
        const playBoxButtons = document.querySelectorAll('.play-box');
        if (playBoxButtons.length > 0) {
            clearInterval(playBoxIntervalId);
            playBoxButtons.forEach(button => button.click());
        }
    }, 500);
})();