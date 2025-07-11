// ==UserScript==
// @name         Request on Overseerr
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Adds a button to request movies or TV shows directly on Overseerr from supported pages, and auto-fills search fields with the selected title.
// @author       JJJ
// @match        http://localhost:5055/*
// @match        https://app.plex.tv/*
// @match        http://127.0.0.1:32400/web/*
// @icon         https://user-images.githubusercontent.com/1066576/125193232-b41d8900-e28e-11eb-801b-3b643f672536.png
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';
    /**
     * Configuration constants
     */
    const CONFIG = {
        OVERSEERR_BASE_URL: 'http://localhost:5055',
        OVERSEERR_SEARCH_URL: 'http://localhost:5055/search',
        OVERSEERR_FAVICON: 'https://user-images.githubusercontent.com/1066576/125193232-b41d8900-e28e-11eb-801b-3b643f672536.png',
        OBSERVER_TIMEOUT: 1000,
        BUTTON_ID: 'overseerrRequestButton',
        STORAGE_KEY: 'overseerrSearchTitle'
    };

    const SELECTORS = {
        TITLE: 'h1, .title, .media-title',
        BUTTON_CONTAINER: '.media-actions, .actions, .button-group',
        REQUEST_BUTTON: `#${CONFIG.BUTTON_ID}`,
        SEARCH_INPUT: 'input[type="text"], input[placeholder*="search"], input[placeholder*="Search"]',
    };

    /**
     * Utility functions
     */
    const Utils = {
        waitForElement(selector, timeout = 5000) {
            return new Promise((resolve, reject) => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }
                const observer = new MutationObserver((mutations, obs) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        obs.disconnect();
                        resolve(element);
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                }, timeout);
            });
        },
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                return false;
            }
        },
        createElement(tag, attributes = {}, innerHTML = '') {
            const element = document.createElement(tag);
            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
            if (innerHTML) {
                element.innerHTML = innerHTML;
            }
            return element;
        },
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };

    /**
     * Style manager for injecting CSS
     */
    const StyleManager = {
        inject() {
            const style = Utils.createElement('style', {}, `
                #${CONFIG.BUTTON_ID} {
                    width: 48px;
                    height: 48px;
                    background: #18181b url('${CONFIG.OVERSEERR_FAVICON}') center/28px no-repeat;
                    border: 1px solid #232329;
                    border-radius: 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    margin-right: 8px;
                    margin-top: 0;
                    position: relative;
                    transition: background 0.2s, border 0.2s;
                    box-sizing: border-box;
                }
                #${CONFIG.BUTTON_ID}:hover {
                    background-color: #232329;
                    border-color: #444;
                    background-image: url('${CONFIG.OVERSEERR_FAVICON}');
                }
                #${CONFIG.BUTTON_ID} .overseerr-icon {
                    display: none;
                }
                #${CONFIG.BUTTON_ID}::after {
                    content: 'Request on Overseerr';
                    position: absolute;
                    bottom: -28px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #232329;
                    color: #fff;
                    padding: 3px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s;
                    z-index: 1000;
                }
                #${CONFIG.BUTTON_ID}:hover::after {
                    opacity: 1;
                }
            `);
            document.head.appendChild(style);
        }
    };

    /**
     * Button insertion logic
     */
    function insertRequestButton() {
        if (document.querySelector(SELECTORS.REQUEST_BUTTON)) return;
        const titleElement = document.querySelector(SELECTORS.TITLE);
        if (!titleElement) return;

        // Try to find the same container as Simkl/TV Time/AniList buttons
        // Common selectors from your other scripts
        const possibleContainers = [
            'div._1h4p3k00._1v25wbq8._1v25wbq1o._1v25wbq1p._1v25wbqg._1v25wbq1g._1v25wbq1c._1v25wbqw._1v25wbq3g._1v25wbq2g', // Plex
            '.media-actions', '.actions', '.button-group',
            titleElement.parentElement
        ];
        let buttonContainer = null;
        for (const selector of possibleContainers) {
            if (typeof selector === 'string') {
                buttonContainer = document.querySelector(selector);
            } else if (selector instanceof Element) {
                buttonContainer = selector;
            }
            if (buttonContainer) break;
        }
        if (!buttonContainer) return;

        // Insert after the last known action button if present
        const knownButtonSelectors = [
            '#tvTimeButton', '#simklButton', '#anilistButton',
            '.tvtime-button', '.anilist-button', '.plex-tvtime-button', '.plex-simkl-button', '.plex-anilist-button'
        ];
        let lastActionButton = null;
        for (const sel of knownButtonSelectors) {
            const btns = buttonContainer.querySelectorAll(sel);
            if (btns.length) lastActionButton = btns[btns.length - 1];
        }


        // Create button with no text, just the icon as background
        const button = Utils.createElement('button', { id: CONFIG.BUTTON_ID, type: 'button', title: 'Request on Overseerr' }, '<span class="overseerr-icon"></span>');
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const title = titleElement.textContent.trim();
            Utils.copyToClipboard(title);
            window.open(`${CONFIG.OVERSEERR_SEARCH_URL}?query=${encodeURIComponent(title)}`, '_blank');
        });

        if (lastActionButton && lastActionButton.parentNode === buttonContainer) {
            // Insert right after the last action button
            if (lastActionButton.nextSibling) {
                buttonContainer.insertBefore(button, lastActionButton.nextSibling);
            } else {
                buttonContainer.appendChild(button);
            }
        } else {
            buttonContainer.appendChild(button);
        }
    }

    /**
     * Observer for dynamic pages
     */
    function observePage() {
        const observer = new MutationObserver(Utils.debounce(() => {
            insertRequestButton();
        }, 100));
        observer.observe(document.body, { childList: true, subtree: true });
        insertRequestButton();
    }

    /**
     * Auto-fill search field on Overseerr search page
     */
    function autoFillSearch() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('query');
        if (!query) return;
        const tryFill = (attempts = 0) => {
            const field = document.querySelector(SELECTORS.SEARCH_INPUT);
            if (field) {
                field.value = query;
                field.focus();
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
            if (attempts < 10) setTimeout(() => tryFill(attempts + 1), 500);
        };
        tryFill();
    }

    /**
     * Main app init
     */
    function init() {
        if (window.location.pathname.startsWith('/search')) {
            autoFillSearch();
            return;
        }
        StyleManager.inject();
        observePage();
    }

    // Start
    init();

})();
