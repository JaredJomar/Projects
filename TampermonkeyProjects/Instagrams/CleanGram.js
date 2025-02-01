// ==UserScript==
// @name         CleanGram
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Hides Instagram posts that are suggested, sponsored, or prompt for "Follow" using a flexible configuration.
// @author       JJJ
// @match        https://www.instagram.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=instagram.com
// @license      MIT
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // Configuration: adjust wait time, target tags, and blacklist phrases as needed.
    const CONFIG = {
        waitLength: 500, // delay after a click to re-run cleanup
        // Targeting ARTICLE elements (Instagram posts) is usually safest,
        // but you can add additional tag names (e.g., 'DIV', 'SPAN') if desired.
        elementsToClean: ['ARTICLE'],
        // Blacklisted phrases (in lowercase) to search for.
        // You can add or remove phrases as needed.
        blacklist: [
            'follow',             // matches posts with a "Follow" prompt
            'suggested for you',  // common phrasing for suggestions
            'suggested posts',    // alternate phrasing
            'sponsored'           // to catch sponsored content
        ]
    };

    /**
     * Check whether the given element (or any of its children) contains banned text.
     * This version converts text to lowercase for a case-insensitive search.
     *
     * @param {Element} element
     * @returns {Boolean} true if banned text is found, false otherwise.
     */
    const containsBannedText = (element) => {
        if (!element || !element.textContent) return false;
        const text = element.textContent.trim().toLowerCase();
        // Check if the element's text contains any blacklisted phrase.
        return CONFIG.blacklist.some(phrase => text.includes(phrase));
    };

    /**
     * Instead of removing an element (which might disrupt layout),
     * we hide it non-destructively.
     *
     * @param {Element} element
     */
    const hideElement = (element) => {
        element.style.visibility = 'hidden';
        element.style.height = '0px';
        element.style.overflow = 'hidden';
    };

    /**
     * Check all elements specified in CONFIG.elementsToClean for banned text.
     * If banned text is found, the element is hidden.
     */
    const cleanElements = () => {
        CONFIG.elementsToClean.forEach(tag => {
            document.querySelectorAll(tag).forEach(element => {
                if (containsBannedText(element)) {
                    console.log(`Hiding element containing banned text: "${element.textContent.trim().slice(0, 50)}"`);
                    hideElement(element);
                }
            });
        });
    };

    /**
     * MutationObserver callback:
     * Checks for newly added elements matching the target tags and hides them if needed.
     *
     * @param {MutationRecord[]} mutationList
     */
    const observerCallback = (mutationList) => {
        mutationList.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE &&
                        CONFIG.elementsToClean.includes(node.tagName)) {
                        if (containsBannedText(node)) {
                            console.log(`Hiding newly added element containing banned text: "${node.textContent.trim().slice(0, 50)}"`);
                            hideElement(node);
                        }
                    }
                });
            }
        });
    };

    // Wait for the page to load so we can start cleaning up.
    window.addEventListener('load', () => {
        // Initial cleanup when the page is fully loaded.
        cleanElements();

        // Setup MutationObserver on the main content area if available; fallback to document.body.
        const targetNode = document.querySelector('main') || document.body;
        const observer = new MutationObserver(observerCallback);
        observer.observe(targetNode, { childList: true, subtree: true });

        // Optional: re-run cleanup a short time after any click event
        // (useful when dynamic content loads after user interaction).
        document.addEventListener('click', () => {
            setTimeout(cleanElements, CONFIG.waitLength);
        });
    });
})();
