// ==UserScript==
// @name         AniList Send to TV Time
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Adds TV Time buttons to AniList pages and automatically pastes titles in TV Time search.
// @author       JJJ
// @match        https://anilist.co/anime/*/*/
// @match        https://app.tvtime.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=anilist.co
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    /**
     * Configuration constants
     */
    const CONFIG = {
        TV_TIME_BASE_URL: 'https://app.tvtime.com',
        TV_TIME_SEARCH_URL: 'https://app.tvtime.com/explore/search/media',
        TV_TIME_FAVICON: 'https://www.tvtime.com/favicon.ico',
        OBSERVER_TIMEOUT: 1000,
        BUTTON_ID: 'tvTimeButton',
        STORAGE_KEY: 'anilistSearchTitle'
    }; const SELECTORS = {
        // AniList page selectors
        ACTIONS_CONTAINER: '.actions',
        FAVOURITE_BUTTON: '.favourite',
        TV_TIME_BUTTON: `#${CONFIG.BUTTON_ID}`,

        // Title selectors
        TITLE_PRIMARY: 'h1.title',
        TITLE_ALTERNATIVES: [
            '.content h1',
            '.container .content h1',
            '.header .title h1',
            '[data-page-segment="anime"] h1',
            'h1[data-v-*]',
            'h1'
        ],

        // TV Time search selectors
        SEARCH_INPUT: 'input[type="text"]',
        SEARCH_INTERFACES: [
            '[role="search"]',
            '.search-container',
            '.search-wrapper',
            '.search-bar',
            '[data-testid*="search"]',
            '[placeholder*="search"]:not([style*="-9999"])',
            '[placeholder*="Search"]:not([style*="-9999"])',
            'flt-semantics[role="textbox"]',
            '[aria-label*="search"]:not(input)',
            '[aria-label*="Search"]:not(input)'
        ],
        FLUTTER_INPUTS: 'flt-text-editing-host input, .flt-text-editing, input[placeholder*="search"], input[placeholder*="Search"]'
    };

    const CSS_CLASSES = {
        TV_TIME_BUTTON: 'tv-time-button'
    };

    /**
     * Utility functions
     */
    const Utils = {
        /**
         * Safely copies text to clipboard
         * @param {string} text - Text to copy
         * @returns {Promise<boolean>}
         */
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                return false;
            }
        },

        /**
         * Creates a DOM element with attributes and content
         * @param {string} tag - HTML tag name
         * @param {Object} attributes - Element attributes
         * @param {string} innerHTML - Inner HTML content
         * @returns {Element}
         */
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

        /**
         * Debounces a function call
         * @param {Function} func - Function to debounce
         * @param {number} wait - Wait time in milliseconds
         * @returns {Function}
         */
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
     * Title extraction utility
     */
    const TitleExtractor = {
        /**
         * Gets the anime title from the current page
         * @returns {string}
         */
        getAnimeTitle() {
            // Try the primary selector first
            let titleElement = document.querySelector(SELECTORS.TITLE_PRIMARY);
            if (titleElement) {
                let title = titleElement.textContent.trim();
                title = title.replace(/\s+/g, ' ').trim();
                if (title && title !== 'AniList') {
                    console.log('Found anime title with primary selector:', title);
                    return title;
                }
            }

            // Try alternative selectors
            for (const selector of SELECTORS.TITLE_ALTERNATIVES) {
                titleElement = document.querySelector(selector);
                if (titleElement) {
                    let title = titleElement.textContent.trim();
                    title = title.replace(/\s+/g, ' ').trim();
                    if (title && title !== 'AniList') {
                        console.log('Found anime title with selector:', selector, '- Title:', title);
                        return title;
                    }
                }
            }

            // Try to find any h1 with dynamic data-v attributes
            const dynamicH1Elements = document.querySelectorAll('h1[data-v-*], h1[class*="data-v-"]');
            for (const element of dynamicH1Elements) {
                let title = element.textContent.trim();
                title = title.replace(/\s+/g, ' ').trim();
                if (title && title !== 'AniList' && title.length > 1) {
                    console.log('Found anime title with dynamic data-v attribute:', title);
                    return title;
                }
            }

            // Try to find h1 elements that are likely to be anime titles
            const allH1Elements = document.querySelectorAll('h1');
            for (const element of allH1Elements) {
                // Skip if it's likely not an anime title
                if (element.closest('.nav') || element.closest('.header') || element.closest('.footer')) {
                    continue;
                }

                let title = element.textContent.trim();
                title = title.replace(/\s+/g, ' ').trim();

                // Filter out likely non-anime titles
                if (title &&
                    title !== 'AniList' &&
                    title.length > 1 &&
                    !title.includes('Login') &&
                    !title.includes('Sign') &&
                    !title.includes('Search')) {
                    console.log('Found anime title with generic h1 search:', title);
                    return title;
                }
            }

            // Fallback: extract from URL
            const urlParts = window.location.pathname.split('/');
            if (urlParts.length > 3 && urlParts[3]) {
                let title = decodeURIComponent(urlParts[3]).replace(/-/g, ' ');
                title = title.replace(/\b\w/g, l => l.toUpperCase()); // Title case
                console.log('Extracted title from URL:', title);
                return title;
            }

            // Last fallback: from page title
            const pageTitle = document.title.split(' | ')[0] || document.title.split(' - ')[0];
            if (pageTitle && pageTitle !== 'AniList') {
                console.log('Using page title:', pageTitle);
                return pageTitle;
            }

            console.log('Could not find anime title, using fallback');
            return 'Unknown Title';
        }
    };    /**
     * Style manager for injecting CSS
     */
    const StyleManager = {
        inject() {
            const style = Utils.createElement('style', {}, `
                .${CSS_CLASSES.TV_TIME_BUTTON} {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    background: rgb(var(--color-red));
                    color: rgb(var(--color-text-bright));
                    padding: 8px 12px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 1.3rem;
                    font-weight: 500;
                    transition: all 0.15s ease-in-out;
                    text-decoration: none;
                    border: none;
                    user-select: none;
                    box-sizing: border-box;
                    white-space: nowrap;
                    font-family: 'Overpass', -apple-system, BlinkMacSystemFont, 'Segoe UI', Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                    line-height: 1.15;
                    min-height: auto;
                }
                
                .${CSS_CLASSES.TV_TIME_BUTTON}:hover {
                    filter: brightness(1.1);
                }
                
                .${CSS_CLASSES.TV_TIME_BUTTON}:active {
                    filter: brightness(0.9);
                }
            `);
            document.head.appendChild(style);
        }
    };

    /**
     * Button factory for creating TV Time buttons
     */
    const ButtonFactory = {
        /**
         * Creates a TV Time button element
         * @returns {Element}
         */
        createButton() {
            const button = Utils.createElement('div', {
                class: CSS_CLASSES.TV_TIME_BUTTON,
                id: CONFIG.BUTTON_ID
            }, `
                <img src="${CONFIG.TV_TIME_FAVICON}" alt="TV Time" style="width: 14px; height: 14px; flex-shrink: 0;">
                <span>TV Time</span>
            `);

            return button;
        }
    };

    /**
     * Main button manager
     */
    const ButtonManager = {
        observer: null,

        /**
         * Initializes the button insertion observer
         */
        init() {
            this.observer = new MutationObserver(
                Utils.debounce(() => this.attemptButtonInsertion(), 100)
            );

            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Try immediate insertion
            this.attemptButtonInsertion();
        },        /**
         * Attempts to insert the TV Time button
         */
        attemptButtonInsertion() {
            // Skip if button already exists
            if (document.querySelector(SELECTORS.TV_TIME_BUTTON)) {
                return;
            }

            const actionsContainer = document.querySelector(SELECTORS.ACTIONS_CONTAINER);
            if (!actionsContainer) {
                return false;
            } const tvTimeButton = ButtonFactory.createButton();

            // Try to add after the favorite button
            const favouriteButton = document.querySelector(SELECTORS.FAVOURITE_BUTTON);
            if (favouriteButton) {
                favouriteButton.insertAdjacentElement('afterend', tvTimeButton);
                console.log('TV Time button added after favorite button');
            } else {
                // Fallback: add at the end of actions container
                actionsContainer.appendChild(tvTimeButton);
                console.log('TV Time button added to end of actions container');
            }

            this.observer.disconnect();
            return true;
        },

        /**
         * Handles button click events
         */
        handleButtonClick(event) {
            event.preventDefault();

            const title = TitleExtractor.getAnimeTitle();
            console.log('TV Time button clicked, searching for:', title);

            if (title && title !== 'Unknown Title') {
                // Store the title in sessionStorage to use on TV Time page
                sessionStorage.setItem(CONFIG.STORAGE_KEY, title);
                // Copy title to clipboard and open TV Time search
                Utils.copyToClipboard(title);
                window.open(`${CONFIG.TV_TIME_SEARCH_URL}?q=${encodeURIComponent(title)}`, '_blank');
            } else {
                console.error('Could not get anime title for TV Time search');
                // Still try to open TV Time search page
                window.open(CONFIG.TV_TIME_SEARCH_URL, '_blank');
            }
        },

        /**
         * Destroys the observer
         */
        destroy() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        }
    };

    /**
     * TV Time search page handler
     */
    const TVTimeHandler = {
        searchSuccessful: false,        /**
         * Initializes auto-paste functionality on TV Time search page
         */
        init() {
            const currentUrl = window.location.href;
            const isSearchPage = currentUrl.includes('/search') || currentUrl.includes('/explore');

            if (!isSearchPage) return;

            // Check for URL parameter first (from button click)
            const urlParams = new URLSearchParams(window.location.search);
            let query = urlParams.get('q') || urlParams.get('query');

            // If no URL parameter, check sessionStorage
            if (!query) {
                query = sessionStorage.getItem(CONFIG.STORAGE_KEY);
            }

            if (!query) return; console.log('TV Time search/explore query detected:', query);

            // Try immediate search fill
            if (this.fillSearch(query)) return;

            // Set up observer for dynamic content
            const observer = new MutationObserver(() => {
                if (this.fillSearch(query)) {
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // More aggressive fallback attempts with shorter intervals
            setTimeout(() => this.fillSearch(query), 500);
            setTimeout(() => this.fillSearch(query), 1000);
            setTimeout(() => this.fillSearch(query), 1500);
            setTimeout(() => this.fillSearch(query), 2000);
            setTimeout(() => this.fillSearch(query), 3000);
            setTimeout(() => this.fillSearch(query), 4000);
            setTimeout(() => this.fillSearch(query), 5000);

            // Cleanup after timeout
            setTimeout(() => {
                observer.disconnect();
                if (!this.searchSuccessful) {
                    console.log('TV Time search auto-fill timeout - clearing storage');
                    sessionStorage.removeItem(CONFIG.STORAGE_KEY);
                }
            }, 15000); // Extended timeout
        },/**
         * Attempts to fill the search box with the query
         * @param {string} query - Search query
         * @returns {boolean} - Success status
         */
        fillSearch(query) {
            if (this.searchSuccessful) return true;

            console.log('Attempting to fill search box...');

            // First try to find any visible input fields
            const allInputs = document.querySelectorAll('input[type="text"], input:not([type]), input[type="search"]');
            for (const input of allInputs) {
                if (input.offsetParent !== null && !input.disabled && !input.readOnly) {
                    console.log('Trying visible input field');
                    if (this.tryFillInput(input, query)) {
                        this.searchSuccessful = true;
                        setTimeout(() => sessionStorage.removeItem(CONFIG.STORAGE_KEY), 2000);
                        return true;
                    }
                }
            }

            // Try clicking on visible search interface elements first
            for (const selector of SELECTORS.SEARCH_INTERFACES) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element.offsetParent !== null) { // Check if visible
                        console.log('Found visible search interface:', selector);
                        try {
                            element.click();
                            element.focus();

                            // Wait then try to find active input
                            setTimeout(() => {
                                const activeInput = document.activeElement;
                                if (activeInput && activeInput.tagName === 'INPUT') {
                                    console.log('Found active input after clicking search interface');
                                    this.tryFillInput(activeInput, query);
                                    this.searchSuccessful = true;
                                    return true;
                                }
                                this.tryFlutterInputs(query);
                            }, 100);

                        } catch (error) {
                            console.log('Error clicking search interface:', error);
                        }
                    }
                }
            }

            // Try Flutter inputs directly
            return this.tryFlutterInputs(query);
        },

        /**
         * Attempts to fill Flutter inputs
         * @param {string} searchQuery - Search query
         * @returns {boolean} - Success status
         */
        tryFlutterInputs(searchQuery) {
            const flutterInputs = document.querySelectorAll(SELECTORS.FLUTTER_INPUTS);

            for (const input of flutterInputs) {
                console.log('Trying Flutter input:', {
                    placeholder: input.placeholder,
                    className: input.className,
                    hidden: input.style.top === '-9999px'
                });

                if (this.tryFillInput(input, searchQuery)) {
                    this.searchSuccessful = true;
                    // Clear sessionStorage after successful attempt
                    setTimeout(() => {
                        sessionStorage.removeItem(CONFIG.STORAGE_KEY);
                    }, 2000);
                    return true;
                }
            }
            return false;
        },        /**
         * Helper function to fill an input with multiple methods
         * @param {Element} input - Input element
         * @param {string} searchQuery - Search query
         * @returns {boolean} - Success status
         */
        tryFillInput(input, searchQuery) {
            try {
                console.log('Attempting to fill input with query:', searchQuery);

                // Focus and clear
                input.focus();
                input.click();

                // Clear using multiple methods
                input.value = '';
                input.setAttribute('value', '');
                input.textContent = '';

                // Set new value using multiple methods
                input.value = searchQuery;
                input.setAttribute('value', searchQuery);

                // Create a more comprehensive event list
                const events = [
                    new Event('focus', { bubbles: true }),
                    new Event('click', { bubbles: true }),
                    new Event('input', { bubbles: true }),
                    new Event('change', { bubbles: true }),
                    new KeyboardEvent('keydown', { bubbles: true }),
                    new KeyboardEvent('keyup', { bubbles: true }),
                    new KeyboardEvent('keypress', { bubbles: true }),
                    new Event('paste', { bubbles: true }),
                    new InputEvent('input', { bubbles: true, inputType: 'insertText', data: searchQuery }),
                    new Event('blur', { bubbles: true })
                ];

                // Dispatch all events
                events.forEach(event => {
                    try {
                        input.dispatchEvent(event);
                    } catch (e) {
                        console.log('Event dispatch error:', e);
                    }
                });

                // Additional method: Try setting via React/Vue property
                if (input._valueTracker) {
                    input._valueTracker.setValue('');
                }

                // Force React update if present
                const lastValue = input.value;
                input.value = '';
                const event1 = new Event('input', { bubbles: true });
                event1.simulated = true;
                input.dispatchEvent(event1);

                input.value = searchQuery;
                const event2 = new Event('input', { bubbles: true });
                event2.simulated = true;
                input.dispatchEvent(event2);

                // Simulate character-by-character typing for Flutter/complex inputs
                setTimeout(() => {
                    if (input.value !== searchQuery) {
                        input.value = '';
                        let currentValue = '';

                        for (let i = 0; i < searchQuery.length; i++) {
                            setTimeout(() => {
                                currentValue += searchQuery[i];
                                input.value = currentValue;

                                input.dispatchEvent(new InputEvent('input', {
                                    bubbles: true,
                                    inputType: 'insertText',
                                    data: searchQuery[i]
                                }));
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }, i * 50);
                        }

                        // Press Enter to trigger search after typing is complete
                        setTimeout(() => {
                            const enterEvent = new KeyboardEvent('keydown', {
                                key: 'Enter',
                                code: 'Enter',
                                keyCode: 13,
                                which: 13,
                                bubbles: true
                            });
                            input.dispatchEvent(enterEvent);

                            // Also try submitting parent form if exists
                            const form = input.closest('form');
                            if (form) {
                                try {
                                    form.submit();
                                } catch (e) {
                                    console.log('Form submit error:', e);
                                }
                            }
                        }, searchQuery.length * 50 + 200);
                    }
                }, 300);

                console.log('Successfully attempted to fill input');
                return true;

            } catch (error) {
                console.log('Error filling input:', error);
                return false;
            }
        }
    };

    /**
     * Main application controller
     */
    const App = {
        /**
         * Initializes the application based on current hostname
         */
        init() {
            const currentUrl = window.location.href;

            if (currentUrl.includes('anilist.co/anime/')) {
                this.setupAnilistPage();
            } else if (currentUrl.includes('app.tvtime.com')) {
                TVTimeHandler.init();
            }
        },

        /**
         * Sets up AniList page functionality
         */
        setupAnilistPage() {
            StyleManager.inject();
            ButtonManager.init();
            this.setupEventListeners();
        },

        /**
         * Sets up global event listeners
         */
        setupEventListeners() {
            // Handle button clicks through event delegation
            document.addEventListener('click', (event) => {
                if (event.target.closest(SELECTORS.TV_TIME_BUTTON)) {
                    ButtonManager.handleButtonClick(event);
                }
            });
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
        App.init();
    }

    // Handle navigation changes (for SPAs)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(() => App.init(), 500);
        }
    }).observe(document, { subtree: true, childList: true });

    console.log('AniList to TV Time userscript loaded');

})();