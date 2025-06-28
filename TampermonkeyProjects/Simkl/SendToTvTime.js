// ==UserScript==
// @name         Send to TV Time
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  Adds TV Time and Simkl buttons to Plex pages, TV Time buttons to Simkl pages, and automatically pastes titles in search fields.
// @author       JJJ
// @match        https://simkl.com/*/*
// @match        https://app.tvtime.com/*
// @match        https://app.plex.tv/*
// @match        http://127.0.0.1:32400/web/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=simkl.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';    /**
     * Configuration constants
     */
    const CONFIG = {
        TV_TIME_BASE_URL: 'https://app.tvtime.com',
        TV_TIME_SEARCH_URL: 'https://app.tvtime.com/explore/search/media',
        TV_TIME_FAVICON: 'https://www.tvtime.com/favicon.ico',
        SIMKL_SEARCH_URL: 'https://simkl.com/search/',
        SIMKL_FAVICON: 'https://www.google.com/s2/favicons?sz=64&domain=simkl.com',
        OBSERVER_TIMEOUT: 1000,
        BUTTON_ID: 'tvTimeButton',
        SIMKL_BUTTON_ID: 'simklButton',
        STORAGE_KEY: 'simklSearchTitle'
    };

    const SELECTORS = {
        // General selectors
        IMDB_LINK: 'a[href*="imdb.com"]',
        MAL_LINK: 'a[href*="myanimelist.net"]',
        TITLE: 'h1[itemprop="name"]',

        // Plex selectors
        PLEX_TITLE: '[data-testid="metadata-title"]',
        PLEX_BUTTON_CONTAINER: 'div._1h4p3k00._1v25wbq8._1v25wbq1o._1v25wbq1p._1v25wbqg._1v25wbq1g._1v25wbq1c._1v25wbqw._1v25wbq3g._1v25wbq2g',

        // Anime page selectors
        ANIME_RATINGS_ROW: '.SimklTVAboutRatingsBlockTR',
        ANIME_REACTIONS_CELL: '.SimklTVRatingReactionsTd',

        // Movie/Series page selectors
        RATING_TABLE: 'table[border="0"] tbody tr td[colspan="2"] table tbody tr',
        RATING_CELL_WIDTH: 'td[width="1"]',

        // TV Time specific
        TV_TIME_BUTTON: `#${CONFIG.BUTTON_ID}`,
        SIMKL_BUTTON: `#${CONFIG.SIMKL_BUTTON_ID}`,
        TV_TIME_SEARCH_INPUT: 'input[type="text"]',

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
        ANIME_BLOCK_TD: 'SimklTVAboutRatingsBlockTD',
        RATING_BORDER: 'SimklTVAboutRatingBorder SimklTVAboutRatingBorderClick',
        RATING_TEN: 'SimklTVRatingTen',
        TV_TIME_BUTTON: 'tvtime-button',
        PLEX_TV_TIME_BUTTON: 'plex-tvtime-button',
        PLEX_SIMKL_BUTTON: 'plex-simkl-button'
    };

    /**
     * Utility functions
     */
    const Utils = {
        /**
         * Waits for an element to appear in the DOM
         * @param {string} selector - CSS selector to wait for
         * @param {number} timeout - Maximum time to wait in milliseconds
         * @returns {Promise<Element>}
         */
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

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                }, timeout);
            });
        },

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
     * Style manager for injecting CSS
     */
    const StyleManager = {
        inject() {
            const style = Utils.createElement('style', {}, `
                .${CSS_CLASSES.TV_TIME_BUTTON} {
                    background: url('${CONFIG.TV_TIME_FAVICON}') center/24px no-repeat;
                    width: 50px;
                    height: 24px;
                    display: inline-block;
                    margin-top: 8px;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }
                
                .${CSS_CLASSES.TV_TIME_BUTTON}:hover {
                    opacity: 0.8;
                }

                .${CSS_CLASSES.PLEX_TV_TIME_BUTTON} {
                    background: url('${CONFIG.TV_TIME_FAVICON}') center/20px no-repeat #1f1f1f;
                    border: 1px solid #404040;
                    border-radius: 8px;
                    width: 48px;
                    height: 48px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-right: 8px;
                    position: relative;
                }
                
                .${CSS_CLASSES.PLEX_TV_TIME_BUTTON}:hover {
                    background-color: #2a2a2a;
                    border-color: #505050;
                }

                .${CSS_CLASSES.PLEX_TV_TIME_BUTTON}::after {
                    content: 'TV Time';
                    position: absolute;
                    bottom: -20px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 10px;
                    color: #fff;
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                .${CSS_CLASSES.PLEX_TV_TIME_BUTTON}:hover::after {
                    opacity: 1;
                }

                .${CSS_CLASSES.PLEX_SIMKL_BUTTON} {
                    background: url('${CONFIG.SIMKL_FAVICON}') center/20px no-repeat #1f1f1f;
                    border: 1px solid #404040;
                    border-radius: 8px;
                    width: 48px;
                    height: 48px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-right: 8px;
                    position: relative;
                }
                
                .${CSS_CLASSES.PLEX_SIMKL_BUTTON}:hover {
                    background-color: #2a2a2a;
                    border-color: #505050;
                }

                .${CSS_CLASSES.PLEX_SIMKL_BUTTON}::after {
                    content: 'Simkl';
                    position: absolute;
                    bottom: -20px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 10px;
                    color: #fff;
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                .${CSS_CLASSES.PLEX_SIMKL_BUTTON}:hover::after {
                    opacity: 1;
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
         * Creates a standard TV Time button element
         * @returns {Element}
         */
        createButton() {
            return Utils.createElement('td', { width: '1' }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tr>
                        <td>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td height="40" align="center">
                                        <a href="#" class="${CSS_CLASSES.TV_TIME_BUTTON}" id="${CONFIG.BUTTON_ID}"></a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <span class="${CSS_CLASSES.RATING_TEN}">TV Time</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `);
        },

        /**
         * Creates an anime-specific TV Time button element
         * @returns {Element}
         */
        createAnimeButton() {
            return Utils.createElement('td', { class: CSS_CLASSES.ANIME_BLOCK_TD }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tbody>
                        <tr>
                            <td>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tbody>
                                        <tr>
                                            <td height="40" align="center">
                                                <a href="#" class="${CSS_CLASSES.TV_TIME_BUTTON}" id="${CONFIG.BUTTON_ID}"></a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center">
                                                <span class="${CSS_CLASSES.RATING_TEN}">TV TIME</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        },

        /**
         * Creates a Plex-specific TV Time button element
         * @returns {Element}
         */
        createPlexButton() {
            return Utils.createElement('button', {
                class: `${CSS_CLASSES.PLEX_TV_TIME_BUTTON} _1v4h9jl0 _76v8d62 _76v8d61 _76v8d6a tvbry60 _76v8d6g _76v8d65 _1v25wbq1g _1v25wbq18`,
                'data-testid': 'preplay-tvtime',
                'aria-label': 'Send to TV Time',
                role: 'button',
                type: 'button',
                id: CONFIG.BUTTON_ID
            });
        },

        /**
         * Creates a Plex-specific Simkl button element
         * @returns {Element}
         */
        createPlexSimklButton() {
            return Utils.createElement('button', {
                class: `${CSS_CLASSES.PLEX_SIMKL_BUTTON} _1v4h9jl0 _76v8d62 _76v8d61 _76v8d6a tvbry60 _76v8d6g _76v8d65 _1v25wbq1g _1v25wbq18`,
                'data-testid': 'preplay-simkl',
                'aria-label': 'Send to Simkl',
                role: 'button',
                type: 'button',
                id: CONFIG.SIMKL_BUTTON_ID
            });
        }
    };

    /**
     * Button insertion strategies for different page types
     */
    const InsertionStrategies = {
        /**
         * Inserts button for movie/series pages with IMDB/MAL links
         */
        insertForRatingCell() {
            const imdbLink = document.querySelector(SELECTORS.IMDB_LINK);
            const malLink = document.querySelector(SELECTORS.MAL_LINK);
            const link = imdbLink || malLink;

            if (!link) return false;

            const ratingCell = link.closest(SELECTORS.RATING_CELL_WIDTH);
            if (!ratingCell) return false;

            const spacerCell = Utils.createElement('td', {}, '&nbsp;');
            const tvTimeCell = ButtonFactory.createButton();

            ratingCell.parentNode.insertBefore(spacerCell, ratingCell.nextSibling);
            ratingCell.parentNode.insertBefore(tvTimeCell, spacerCell.nextSibling);

            return true;
        },

        /**
         * Inserts button for anime pages
         */
        insertForAnimePage() {
            const animeRatingsRow = document.querySelector(SELECTORS.ANIME_RATINGS_ROW);
            if (!animeRatingsRow) return false;

            const reactionsCell = animeRatingsRow.querySelector(SELECTORS.ANIME_REACTIONS_CELL);
            if (!reactionsCell) return false;

            const tvTimeCell = ButtonFactory.createAnimeButton();
            animeRatingsRow.insertBefore(tvTimeCell, reactionsCell);

            return true;
        },

        /**
         * Fallback insertion for general rating tables
         */
        insertForRatingTable() {
            const ratingTable = document.querySelector(SELECTORS.RATING_TABLE);
            if (!ratingTable) return false;

            const lastCell = ratingTable.querySelector('td:last-child');
            if (!lastCell) return false;

            const spacerCell = Utils.createElement('td', {}, '&nbsp;');
            const tvTimeCell = ButtonFactory.createButton();

            ratingTable.insertBefore(spacerCell, lastCell.nextSibling);
            ratingTable.insertBefore(tvTimeCell, spacerCell.nextSibling);

            return true;
        },

        /**
         * Inserts button for Plex pages
         */
        insertForPlexPage() {
            const buttonContainer = document.querySelector(SELECTORS.PLEX_BUTTON_CONTAINER);
            if (!buttonContainer) return false;

            const tvTimeButton = ButtonFactory.createPlexButton();
            const simklButton = ButtonFactory.createPlexSimklButton();

            buttonContainer.appendChild(tvTimeButton);
            buttonContainer.appendChild(simklButton);

            return true;
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
        },

        /**
         * Attempts to insert the TV Time button using various strategies
         */
        attemptButtonInsertion() {
            // Skip if buttons already exist
            if (document.querySelector(SELECTORS.TV_TIME_BUTTON) || document.querySelector(SELECTORS.SIMKL_BUTTON)) {
                return;
            }

            // Try different insertion strategies
            const strategies = [
                InsertionStrategies.insertForPlexPage,
                InsertionStrategies.insertForRatingCell,
                InsertionStrategies.insertForAnimePage,
                InsertionStrategies.insertForRatingTable
            ];

            for (const strategy of strategies) {
                if (strategy()) {
                    break;
                }
            }
        },

        /**
         * Handles button click events
         */
        handleButtonClick(event) {
            event.preventDefault();

            let titleElement = document.querySelector(SELECTORS.TITLE);

            // Check for Plex title if standard title not found
            if (!titleElement) {
                titleElement = document.querySelector(SELECTORS.PLEX_TITLE);
            }

            if (!titleElement) {
                console.error('Title element not found');
                return;
            }

            const title = titleElement.textContent.trim();
            const clickedButton = event.target.closest('button, a');

            // Determine which button was clicked
            if (clickedButton && clickedButton.id === CONFIG.SIMKL_BUTTON_ID) {
                // Simkl button clicked
                Utils.copyToClipboard(title);
                window.open(`${CONFIG.SIMKL_SEARCH_URL}?q=${encodeURIComponent(title)}`, '_blank');
            } else {
                // TV Time button clicked (default)
                Utils.copyToClipboard(title);
                window.open(`${CONFIG.TV_TIME_SEARCH_URL}?q=${encodeURIComponent(title)}`, '_blank');
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
    };    /**
     * TV Time search page handler
     */
    const TVTimeHandler = {
        searchQuery: null,
        retryAttempts: 0,
        maxRetries: 15,

        /**
         * Initializes auto-paste functionality on TV Time search page
         */
        init() {
            this.searchQuery = this.getSearchQuery();

            if (!this.searchQuery) {
                console.warn('No search query found');
                return;
            }

            console.log('Starting TV Time auto-search for:', this.searchQuery);
            this.startSearchFieldMonitor();
        },

        /**
         * Gets search query from URL parameters or sessionStorage
         */
        getSearchQuery() {
            // Try URL parameter first
            const urlParams = new URLSearchParams(window.location.search);
            let query = urlParams.get('q') || urlParams.get('search');

            if (!query) {
                // Try sessionStorage
                query = sessionStorage.getItem('simkl_tvtime_search');
                if (query) {
                    sessionStorage.removeItem('simkl_tvtime_search');
                }
            }

            return query;
        },

        /**
         * Starts monitoring for search field and automatically fills it
         */
        startSearchFieldMonitor() {
            const attemptSearch = () => {
                if (this.retryAttempts >= this.maxRetries) {
                    console.warn('Maximum retry attempts reached for search field detection');
                    return;
                }

                this.retryAttempts++;
                console.log(`Search attempt ${this.retryAttempts}/${this.maxRetries}`);

                if (this.findAndFillSearchField()) {
                    console.log('Successfully filled search field');
                    return;
                }

                // Retry after 1 second
                setTimeout(attemptSearch, 1000);
            };

            attemptSearch();
        },

        /**
         * Finds and fills the search field
         */
        findAndFillSearchField() {
            // Try different search field detection strategies
            let searchField = this.findSearchField();

            if (searchField && this.fillSearchField(searchField)) {
                return true;
            }

            return false;
        },

        /**
         * Finds search field using multiple strategies
         */
        findSearchField() {
            // Strategy 1: Direct input selectors
            let field = document.querySelector(SELECTORS.SEARCH_INPUT);
            if (field && this.isValidSearchField(field)) return field;

            // Strategy 2: Search interfaces
            for (const selector of SELECTORS.SEARCH_INTERFACES) {
                const container = document.querySelector(selector);
                if (container) {
                    field = container.querySelector('input[type="text"], input:not([type]), textarea');
                    if (field && this.isValidSearchField(field)) return field;
                }
            }

            // Strategy 3: Flutter inputs
            field = document.querySelector(SELECTORS.FLUTTER_INPUTS);
            if (field && this.isValidSearchField(field)) return field;

            // Strategy 4: All visible text inputs
            const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type]), textarea'));
            for (const input of inputs) {
                if (this.isValidSearchField(input)) return input;
            }

            // Strategy 5: Flutter semantic elements
            const flutterElements = Array.from(document.querySelectorAll('[aria-label*="search"], [aria-label*="Search"]'));
            for (const element of flutterElements) {
                if (this.isValidSearchField(element)) return element;
            }

            return null;
        },

        /**
         * Validates if an element is a valid search field
         */
        isValidSearchField(element) {
            if (!element) return false;

            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }

            const rect = element.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return false;

            if (element.disabled || element.readOnly) return false;

            // Check for search-related attributes
            const searchIndicators = [
                element.placeholder?.toLowerCase().includes('search'),
                element.name?.toLowerCase().includes('search'),
                element.id?.toLowerCase().includes('search'),
                element.className?.toLowerCase().includes('search'),
                element.getAttribute('aria-label')?.toLowerCase().includes('search')
            ];

            return searchIndicators.some(indicator => indicator === true);
        },

        /**
         * Fills the search field with the query
         */
        fillSearchField(field) {
            try {
                // Clear existing value
                field.value = '';
                field.textContent = '';

                // Focus the field
                field.focus();
                field.click();

                // Set the value using multiple methods
                field.value = this.searchQuery;

                if (field.setAttribute) {
                    field.setAttribute('value', this.searchQuery);
                }

                if (field.textContent !== undefined) {
                    field.textContent = this.searchQuery;
                }

                // Simulate typing character by character
                this.simulateTyping(field, this.searchQuery);

                // Dispatch comprehensive events
                this.dispatchInputEvents(field);

                return true;
            } catch (error) {
                console.error('Error filling search field:', error);
                return false;
            }
        },

        /**
         * Simulates typing character by character
         */
        simulateTyping(element, text) {
            element.focus();

            for (let i = 0; i < text.length; i++) {
                const char = text[i];

                // Key events
                element.dispatchEvent(new KeyboardEvent('keydown', {
                    key: char,
                    char: char,
                    charCode: char.charCodeAt(0),
                    keyCode: char.charCodeAt(0),
                    which: char.charCodeAt(0),
                    bubbles: true
                }));

                element.dispatchEvent(new KeyboardEvent('keypress', {
                    key: char,
                    char: char,
                    charCode: char.charCodeAt(0),
                    keyCode: char.charCodeAt(0),
                    which: char.charCodeAt(0),
                    bubbles: true
                }));

                // Update value progressively
                element.value = text.substring(0, i + 1);

                // Input event for each character
                element.dispatchEvent(new Event('input', { bubbles: true }));

                element.dispatchEvent(new KeyboardEvent('keyup', {
                    key: char,
                    char: char,
                    charCode: char.charCodeAt(0),
                    keyCode: char.charCodeAt(0),
                    which: char.charCodeAt(0),
                    bubbles: true
                }));
            }
        },

        /**
         * Dispatches comprehensive input events
         */
        dispatchInputEvents(element) {
            const events = [
                new Event('input', { bubbles: true }),
                new Event('change', { bubbles: true }),
                new Event('blur', { bubbles: true }),
                new Event('focus', { bubbles: true }),
                new InputEvent('input', {
                    bubbles: true,
                    inputType: 'insertText',
                    data: this.searchQuery
                }),
                new Event('search', { bubbles: true })
            ];

            events.forEach(event => {
                try {
                    element.dispatchEvent(event);
                } catch (e) {
                    console.warn('Failed to dispatch event:', e);
                }
            });

            // For React/Vue components
            if (element._valueTracker) {
                element._valueTracker.setValue('');
            }

            // Trigger React's synthetic events
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            )?.set;

            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(element, this.searchQuery);
                element.dispatchEvent(new Event('input', { bubbles: true }));
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
            if (window.location.hostname === 'app.tvtime.com') {
                TVTimeHandler.init();
                return;
            }

            // Initialize for Simkl and Plex pages
            StyleManager.inject();
            this.setupEventListeners();
            this.startButtonManager();
        },

        /**
         * Sets up global event listeners
         */
        setupEventListeners() {
            // Use event delegation for button clicks
            document.addEventListener('click', (event) => {
                const tvTimeButton = event.target.closest(SELECTORS.TV_TIME_BUTTON);
                const simklButton = event.target.closest(SELECTORS.SIMKL_BUTTON);

                if (tvTimeButton || simklButton) {
                    ButtonManager.handleButtonClick(event);
                }
            });
        },

        /**
         * Starts the button manager when DOM is ready
         */
        startButtonManager() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => ButtonManager.init());
            } else {
                ButtonManager.init();
            }
        }
    };

    // Initialize the application
    App.init();

})();