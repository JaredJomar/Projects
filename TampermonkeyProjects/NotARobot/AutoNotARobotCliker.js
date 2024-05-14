// ==UserScript==
// @name         Auto Click "I'm not a robot"
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Automatically clicks the "I'm not a robot" checkbox
// @author       JJJ
// @match        *://*/*
// @icon         https://pngimg.com/uploads/robot/robot_PNG96.png
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Define the element selector and delay between clicks (in milliseconds)
    var elementSelector = 'input[type="button"]';
    var delayBetweenClicks = 1000; // in milliseconds

    // Define the sleep function that pauses the script for a specified amount of time
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Define the clickOnElements function that clicks on all elements that match a given selector
    async function clickOnElements(selector, delay) {
        var elements = document.querySelectorAll(selector);
        for (var i = 0; i < elements.length; i++) {
            elements[i].click();
            await sleep(delay); // Add a delay between each click
        }
    }

    // Check if the start element exists on the page
    if (document.getElementById("start")) {
        // Call the clickOnElements function with the appropriate selector and delay values
        clickOnElements(elementSelector, delayBetweenClicks);
    } else {
        console.log("Start element not found.");
    }
})();