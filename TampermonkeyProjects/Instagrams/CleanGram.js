// ==UserScript==
// @name         CleanGram
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @description  Hides Instagram posts that are suggested, sponsored, or prompt for "Follow" using a flexible configuration.
// @author       JJJ
// @match        https://www.instagram.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=instagram.com
// @license      MIT
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // Add logger configuration
    const Logger = {
        styles: {
            info: 'color: #2196F3; font-weight: bold',
            warning: 'color: #FFC107; font-weight: bold',
            success: 'color: #4CAF50; font-weight: bold',
            error: 'color: #F44336; font-weight: bold'
        },
        prefix: '[CleanGram]',
        getTimestamp() {
            return new Date().toISOString().split('T')[1].slice(0, -1);
        },
        info(msg) {
            console.log(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.info);
        },
        warning(msg) {
            console.warn(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.warning);
        },
        success(msg) {
            console.log(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.success);
        },
        error(msg) {
            console.error(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.error);
        }
    };

    // Configuration: adjust wait time, target tags, and blacklist phrases as needed.
    const CONFIG = {
        waitLength: 500, // delay after a click to re-run cleanup
        // Targeting ARTICLE elements (Instagram posts) is usually safest,
        // but you can add additional tag names (e.g., 'DIV', 'SPAN') if desired.
        elementsToClean: ['ARTICLE'],
        // Updated selectors with more precise targeting
        selectors: {
            sponsored: '[data-ad-preview="message"]',
            suggested: 'div[role="button"] span[dir="auto"]:only-child',
            followButton: 'div[role="button"]:not([aria-disabled="true"]) div[class*="x1i10hfl"]',
            suggestedLabel: 'span[dir="auto"]:first-child'
        }
    };

    /**
     * More precise check for unwanted content
     */
    const containsBannedContent = (element) => {
        // Check for sponsored content
        if (element.querySelector(CONFIG.selectors.sponsored)) {
            Logger.warning(`Found sponsored content: "${element.textContent.trim().slice(0, 30)}..."`);
            return true;
        }

        // Check for suggested posts with more precise targeting
        const suggestedHeader = element.querySelector(CONFIG.selectors.suggested);
        if (suggestedHeader) {
            const headerText = suggestedHeader.textContent.trim().toLowerCase();
            if (headerText === 'suggested for you') {
                return true;
            }
        }

        // Check for standard suggested post structure
        const suggestedLabel = element.querySelector(CONFIG.selectors.suggestedLabel);
        if (suggestedLabel &&
            suggestedLabel.textContent.trim().toLowerCase() === 'suggested for you' &&
            element.querySelector(CONFIG.selectors.followButton)) {
            return true;
        }

        return false;
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
        Logger.success(`Hidden element: ${element.tagName} (${element.textContent.trim().slice(0, 30)}...)`);
    };

    /**
     * Check all elements specified in CONFIG.elementsToClean for banned text.
     * If banned text is found, the element is hidden.
     */
    const cleanElements = () => {
        Logger.info('Starting cleanup scan...');
        let hiddenCount = 0;

        CONFIG.elementsToClean.forEach(tag => {
            const elements = document.querySelectorAll(tag);
            Logger.info(`Scanning ${elements.length} ${tag} elements`);

            elements.forEach(element => {
                if (containsBannedContent(element)) {
                    hideElement(element);
                    hiddenCount++;
                }
            });
        });

        if (hiddenCount > 0) {
            Logger.success(`Cleanup complete: ${hiddenCount} elements hidden`);
        }
    };

    /**
     * MutationObserver callback:
     * Checks for newly added elements matching the target tags and hides them if needed.
     *
     * @param {MutationRecord[]} mutationList
     */
    const observerCallback = (mutationList) => {
        let newElements = 0;
        let hiddenElements = 0;

        mutationList.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE &&
                        CONFIG.elementsToClean.includes(node.tagName)) {
                        newElements++;
                        if (containsBannedContent(node)) {
                            hideElement(node);
                            hiddenElements++;
                        }
                    }
                });
            }
        });

        if (newElements > 0) {
            Logger.info(`Processed ${newElements} new elements, hidden ${hiddenElements}`);
        }
    };

    // Wait for the page to load so we can start cleaning up.
    window.addEventListener('load', () => {
        Logger.info('CleanGram initialized');
        cleanElements();

        // Setup MutationObserver on the main content area if available; fallback to document.body.
        const targetNode = document.querySelector('main') || document.body;
        const observer = new MutationObserver(observerCallback);
        observer.observe(targetNode, { childList: true, subtree: true });
        Logger.success('MutationObserver activated');

        // Optional: re-run cleanup a short time after any click event
        // (useful when dynamic content loads after user interaction).
        document.addEventListener('click', () => {
            Logger.info('Click detected, scheduling cleanup...');
            setTimeout(cleanElements, CONFIG.waitLength);
        });
    });
})();