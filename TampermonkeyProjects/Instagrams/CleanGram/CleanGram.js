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

    // Logger utility: styled console output with timestamps for easier debugging
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

    // Configuration: tweak timing, target element tags, and CSS selectors used to
    // detect unwanted content. Change these values to adapt to layout/markup
    // updates on Instagram.
    const CONFIG = {
        waitLength: 500, // milliseconds to wait after a click before re-scanning
        // Target tags to scan for feed items (ARTICLE is typically an Instagram post)
        elementsToClean: ['ARTICLE'],
        // CSS selectors that identify sponsored/suggested/follow prompts.
        // These are intentionally specific to reduce false positives.
        selectors: {
            sponsored: '[data-ad-preview="message"]',
            suggested: 'div[role="button"] span[dir="auto"]:only-child',
            followButton: 'div[role="button"]:not([aria-disabled="true"]) div[class*="x1i10hfl"]',
            suggestedLabel: 'span[dir="auto"]:first-child'
        }
    };

    /**
     * Determine whether a DOM element represents unwanted content.
     * Detects sponsored ads, "Suggested for you" items, and follow prompts.
     * Returns true when the element should be hidden.
     *
     * @param {Element} element - candidate feed element to inspect
     * @returns {boolean}
     */
    const containsBannedContent = (element) => {
        // Sponsored/ad indicator (explicit ad metadata)
        if (element.querySelector(CONFIG.selectors.sponsored)) {
            Logger.warning(`Found sponsored content: "${element.textContent.trim().slice(0, 30)}..."`);
            return true;
        }

        // Suggested-post header (more targeted match to reduce false positives)
        const suggestedHeader = element.querySelector(CONFIG.selectors.suggested);
        if (suggestedHeader) {
            const headerText = suggestedHeader.textContent.trim().toLowerCase();
            if (headerText === 'suggested for you') {
                return true;
            }
        }

        // Fallback: match common suggested structure (label + follow button)
        const suggestedLabel = element.querySelector(CONFIG.selectors.suggestedLabel);
        if (suggestedLabel &&
            suggestedLabel.textContent.trim().toLowerCase() === 'suggested for you' &&
            element.querySelector(CONFIG.selectors.followButton)) {
            return true;
        }

        return false;
    };

    /**
     * Hide an element non-destructively to avoid layout reflow or JS errors.
     * Applies simple inline styles so the element is visually removed but
     * remains in the DOM.
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
     * Scan the page for elements matching configured tag names and hide those
     * that match the banned-content heuristic.
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
     * MutationObserver callback. When new nodes are added to the observed
     * subtree, inspect them and hide those that match the banned-content test.
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

    // Initialize when the page finishes loading: run an initial scan,
    // start observing for dynamic additions, and hook a click-triggered re-scan.
    window.addEventListener('load', () => {
        Logger.info('CleanGram initialized');
        cleanElements();

        // Observe the main content region when possible; fall back to the whole
        // document if the main element isn't present.
        const targetNode = document.querySelector('main') || document.body;
        const observer = new MutationObserver(observerCallback);
        observer.observe(targetNode, { childList: true, subtree: true });
        Logger.success('MutationObserver activated');

        // Re-run the cleanup shortly after user clicks. Some Instagram UI
        // interactions load content asynchronously; this helps catch them.
        document.addEventListener('click', () => {
            Logger.info('Click detected, scheduling cleanup...');
            setTimeout(cleanElements, CONFIG.waitLength);
        });
    });
})();