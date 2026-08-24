// ==UserScript==
// @name         Media Tracker Sender
// @namespace    http://tampermonkey.net/
// @version      0.0.6
// @description  Adds Simkl, AniList, TMDB, Peliplus, SoloLatino, and LaMovie buttons to Plex, Simkl, and streaming pages.
// @author       JJJ
// @match        https://simkl.com/*/*
// @match        https://app.plex.tv/*
// @match        http://127.0.0.1:32400/web/*
// @match        https://anilist.co/*
// @match        https://tioplus.app/*
// @match        https://sololatino.net/*
// @match        https://lamovie.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=simkl.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';
    // Configuration constants

    const CONFIG = {
        SIMKL_SEARCH_URL: 'https://simkl.com/search/',
        SIMKL_FAVICON: 'https://www.google.com/s2/favicons?sz=64&domain=simkl.com',
        ANILIST_SEARCH_URL: 'https://anilist.co/search/anime',
        ANILIST_FAVICON: 'https://anilist.co/img/icons/favicon-32x32.png',
        TMDB_SEARCH_URL: 'https://www.themoviedb.org/search',
        TMDB_FAVICON: 'https://www.google.com/s2/favicons?sz=64&domain=themoviedb.org',
        OBSERVER_TIMEOUT: 1000,
        SIMKL_BUTTON_ID: 'simklButton',
        ANILIST_BUTTON_ID: 'anilistButton',
        TMDB_BUTTON_ID: 'tmdbButton',
        STORAGE_KEY: 'simklSearchTitle',
        PELIPLUS_FAVICON: 'https://www.google.com/s2/favicons?sz=64&domain=tioplus.app',
        PELIPLUS_BUTTON_CONTAINER_ID: 'peliplusButtonContainer',
        PELIPLUS_BUTTON_ID: 'peliplusButton',
        PELIPLUS_BASE_URL: 'https://tioplus.app',
        SOLOLATINO_FAVICON: 'https://www.google.com/s2/favicons?sz=64&domain=sololatino.net',
        SOLOLATINO_BUTTON_ID: 'sololatinoButton',
        SOLOLATINO_BASE_URL: 'https://sololatino.net',
        LAMOVIE_FAVICON: 'https://www.google.com/s2/favicons?sz=64&domain=lamovie.org',
        LAMOVIE_BUTTON_ID: 'lamovieButton',
        LAMOVIE_BASE_URL: 'https://lamovie.org'
    };

    const SELECTORS = {
        IMDB_LINK: 'a[href*="imdb.com"]',
        MAL_LINK: 'a[href*="myanimelist.net"]',
        TITLE: 'h1[itemprop="name"]',

        PLEX_TITLE: '[data-testid="metadata-title"]',
        PLEX_BUTTON_CONTAINER: 'div._1h4p3k00._1v25wbq8._1v25wbq1o._1v25wbq1p._1v25wbqg._1v25wbq1g._1v25wbq1c._1v25wbqw._1v25wbq3g._1v25wbq2g',

        ANIME_RATINGS_ROW: '.SimklTVAboutRatingsBlockTR',
        ANIME_REACTIONS_CELL: '.SimklTVRatingReactionsTd',

        RATING_TABLE: 'table[border="0"] tbody tr td[colspan="2"] table tbody tr',
        RATING_CELL_WIDTH: 'td[width="1"]',

        SIMKL_BUTTON: `#${CONFIG.SIMKL_BUTTON_ID}`,
        ANILIST_BUTTON: `#${CONFIG.ANILIST_BUTTON_ID}`,
        TMDB_BUTTON: `#${CONFIG.TMDB_BUTTON_ID}`,
        PELIPLUS_BUTTON: `#${CONFIG.PELIPLUS_BUTTON_ID}`,
        SOLOLATINO_BUTTON: `#${CONFIG.SOLOLATINO_BUTTON_ID}`,
        LAMOVIE_BUTTON: `#${CONFIG.LAMOVIE_BUTTON_ID}`
    };

    const CSS_CLASSES = {
        ANIME_BLOCK_TD: 'SimklTVAboutRatingsBlockTD',
        RATING_BORDER: 'SimklTVAboutRatingBorder SimklTVAboutRatingBorderClick',
        RATING_TEN: 'SimklTVRatingTen',
        ANILIST_BUTTON: 'anilist-button',
        TMDB_BUTTON: 'tmdb-button',
        PLEX_SIMKL_BUTTON: 'plex-simkl-button',
        PLEX_ANILIST_BUTTON: 'plex-anilist-button',
        PLEX_TMDB_BUTTON: 'plex-tmdb-button',
        PELIPLUS_CONTAINER: 'peliplus-container',
        PELIPLUS_BUTTON: 'peliplus-button',
        SOLOLATINO_PANEL: 'sololatino-panel',
        FLOAT_ICON_FALLBACK: 'float-icon-fallback',
        PELIPLUS_FLOAT_SIMKL: 'peliplus-float-simkl',
        PELIPLUS_FLOAT_ANILIST: 'peliplus-float-anilist',
        PELIPLUS_FLOAT_TMDB: 'peliplus-float-tmdb',
        PELIPLUS_SIMKL_BUTTON: 'peliplus-simkl-button',
        SOLOLATINO_SIMKL_BUTTON: 'sololatino-simkl-button',
        LAMOVIE_SIMKL_BUTTON: 'lamovie-simkl-button'
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
                .${CSS_CLASSES.ANILIST_BUTTON} {
                    background: url('${CONFIG.ANILIST_FAVICON}') center/24px no-repeat;
                    width: 50px;
                    height: 24px;
                    display: inline-block;
                    margin-top: 8px;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }

                .${CSS_CLASSES.ANILIST_BUTTON}:hover {
                    opacity: 0.8;
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

                .${CSS_CLASSES.PLEX_ANILIST_BUTTON} {
                    background: url('${CONFIG.ANILIST_FAVICON}') center/20px no-repeat #1f1f1f;
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

                .${CSS_CLASSES.PLEX_ANILIST_BUTTON}:hover {
                    background-color: #2a2a2a;
                    border-color: #505050;
                }

                .${CSS_CLASSES.PLEX_ANILIST_BUTTON}::after {
                    content: 'AniList';
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

                .${CSS_CLASSES.PLEX_ANILIST_BUTTON}:hover::after {
                    opacity: 1;
                }

                .${CSS_CLASSES.TMDB_BUTTON} {
                    background: url('${CONFIG.TMDB_FAVICON}') center/24px no-repeat;
                    width: 50px;
                    height: 24px;
                    display: inline-block;
                    margin-top: 8px;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }

                .${CSS_CLASSES.TMDB_BUTTON}:hover {
                    opacity: 0.8;
                }

                .${CSS_CLASSES.PLEX_TMDB_BUTTON} {
                    background: url('${CONFIG.TMDB_FAVICON}') center/20px no-repeat #1f1f1f;
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

                .${CSS_CLASSES.PLEX_TMDB_BUTTON}:hover {
                    background-color: #2a2a2a;
                    border-color: #505050;
                }

                .${CSS_CLASSES.PLEX_TMDB_BUTTON}::after {
                    content: 'TMDB';
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

                .${CSS_CLASSES.PLEX_TMDB_BUTTON}:hover::after {
                    opacity: 1;
                }

                .${CSS_CLASSES.PELIPLUS_SIMKL_BUTTON} {
                    background: url('${CONFIG.PELIPLUS_FAVICON}') center/24px no-repeat;
                    width: 50px;
                    height: 24px;
                    display: inline-block;
                    margin-top: 8px;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }

                .${CSS_CLASSES.PELIPLUS_SIMKL_BUTTON}:hover {
                    opacity: 1;
                    filter: brightness(1.15);
                }

                .${CSS_CLASSES.SOLOLATINO_SIMKL_BUTTON} {
                    background: url('${CONFIG.SOLOLATINO_FAVICON}') center/24px no-repeat;
                    width: 50px;
                    height: 24px;
                    display: inline-block;
                    margin-top: 8px;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                    position: relative;
                }

                .${CSS_CLASSES.SOLOLATINO_SIMKL_BUTTON}:hover {
                    opacity: 1;
                    filter: brightness(1.15);
                }

                .${CSS_CLASSES.SOLOLATINO_SIMKL_BUTTON}::after {
                    content: 'SoloLatino';
                    position: absolute;
                    bottom: -18px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 10px;
                    color: #fff;
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    pointer-events: none;
                }

                .${CSS_CLASSES.SOLOLATINO_SIMKL_BUTTON}:hover::after {
                    opacity: 1;
                }

                .${CSS_CLASSES.LAMOVIE_SIMKL_BUTTON} {
                    background: url('${CONFIG.LAMOVIE_FAVICON}') center/24px no-repeat;
                    width: 50px;
                    height: 24px;
                    display: inline-block;
                    margin-top: 8px;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                    position: relative;
                }

                .${CSS_CLASSES.LAMOVIE_SIMKL_BUTTON}:hover {
                    opacity: 1;
                    filter: brightness(1.15);
                }

                .${CSS_CLASSES.LAMOVIE_SIMKL_BUTTON}::after {
                    content: 'LaMovie';
                    position: absolute;
                    bottom: -18px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 10px;
                    color: #fff;
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    pointer-events: none;
                }

                .${CSS_CLASSES.LAMOVIE_SIMKL_BUTTON}:hover::after {
                    opacity: 1;
                }
            `);
            document.head.appendChild(style);
        },

        injectPeliplus() {
            const style = Utils.createElement('style', {}, `
                .${CSS_CLASSES.PELIPLUS_CONTAINER} {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    z-index: 99999;
                }

                .${CSS_CLASSES.PELIPLUS_BUTTON} {
                    background-color: #1a1a1a;
                    background-repeat: no-repeat;
                    background-position: center;
                    background-size: 22px;
                    border: 1px solid #444;
                    border-radius: 10px;
                    width: 46px;
                    height: 46px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                }

                .${CSS_CLASSES.PELIPLUS_BUTTON}:hover {
                    background-color: #2a2a2a;
                    border-color: #666;
                    transform: scale(1.05);
                    filter: brightness(1.1);
                }

                .${CSS_CLASSES.PELIPLUS_BUTTON} span {
                    display: none;
                    position: absolute;
                    right: 54px;
                    background: #1a1a1a;
                    color: #fff;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 12px;
                    white-space: nowrap;
                    border: 1px solid #444;
                    pointer-events: none;
                }

                .${CSS_CLASSES.PELIPLUS_BUTTON}:hover span {
                    display: block;
                }

                .${CSS_CLASSES.FLOAT_ICON_FALLBACK} {
                    display: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 700;
                    color: #fff;
                    background: #2f2f2f;
                    line-height: 1;
                }

                .${CSS_CLASSES.SOLOLATINO_PANEL} .${CSS_CLASSES.PELIPLUS_BUTTON} {
                    background-image: none;
                }

                .${CSS_CLASSES.SOLOLATINO_PANEL} .${CSS_CLASSES.FLOAT_ICON_FALLBACK} {
                    display: inline-flex;
                }

                .${CSS_CLASSES.PELIPLUS_FLOAT_SIMKL} {
                    background-image: url('${CONFIG.SIMKL_FAVICON}');
                }

                .${CSS_CLASSES.PELIPLUS_FLOAT_ANILIST} {
                    background-image: url('${CONFIG.ANILIST_FAVICON}');
                }

                .${CSS_CLASSES.PELIPLUS_FLOAT_TMDB} {
                    background-image: url('${CONFIG.TMDB_FAVICON}');
                }

                .${CSS_CLASSES.LAMOVIE_SIMKL_BUTTON} {
                    background-image: url('${CONFIG.LAMOVIE_FAVICON}');
                }
            `);
            document.head.appendChild(style);
        }
    };

    /**
     * Button factory for creating media tracker buttons
     */
    const ButtonFactory = {
        createAniListButton() {
            return Utils.createElement('td', { width: '1' }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tr>
                        <td>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td height="40" align="center">
                                        <a href="#" class="${CSS_CLASSES.ANILIST_BUTTON}" id="${CONFIG.ANILIST_BUTTON_ID}"></a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <span class="${CSS_CLASSES.RATING_TEN}">AniList</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `);
        },

        createAnimeAniListButton() {
            return Utils.createElement('td', { class: CSS_CLASSES.ANIME_BLOCK_TD }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tbody>
                        <tr>
                            <td>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tbody>
                                        <tr>
                                            <td height="40" align="center">
                                                <a href="#" class="${CSS_CLASSES.ANILIST_BUTTON}" id="${CONFIG.ANILIST_BUTTON_ID}"></a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center">
                                                <span class="${CSS_CLASSES.RATING_TEN}">ANILIST</span>
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

        createPlexSimklButton() {
            return Utils.createElement('button', {
                class: `${CSS_CLASSES.PLEX_SIMKL_BUTTON} _1v4h9jl0 _76v8d62 _76v8d61 _76v8d6a tvbry60 _76v8d6g _76v8d65 _1v25wbq1g _1v25wbq18`,
                'data-testid': 'preplay-simkl',
                'aria-label': 'Send to Simkl',
                role: 'button',
                type: 'button',
                id: CONFIG.SIMKL_BUTTON_ID
            });
        },

        createPlexAniListButton() {
            return Utils.createElement('button', {
                class: `${CSS_CLASSES.PLEX_ANILIST_BUTTON} _1v4h9jl0 _76v8d62 _76v8d61 _76v8d6a tvbry60 _76v8d6g _76v8d65 _1v25wbq1g _1v25wbq18`,
                'data-testid': 'preplay-anilist',
                'aria-label': 'Send to AniList',
                role: 'button',
                type: 'button',
                id: CONFIG.ANILIST_BUTTON_ID
            });
        },

        createTMDBButton() {
            return Utils.createElement('td', { width: '1' }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tr>
                        <td>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td height="40" align="center">
                                        <a href="#" class="${CSS_CLASSES.TMDB_BUTTON}" id="${CONFIG.TMDB_BUTTON_ID}"></a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <span class="${CSS_CLASSES.RATING_TEN}">TMDB</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `);
        },

        createAnimeTMDBButton() {
            return Utils.createElement('td', { class: CSS_CLASSES.ANIME_BLOCK_TD }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tbody>
                        <tr>
                            <td>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tbody>
                                        <tr>
                                            <td height="40" align="center">
                                                <a href="#" class="${CSS_CLASSES.TMDB_BUTTON}" id="${CONFIG.TMDB_BUTTON_ID}"></a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center">
                                                <span class="${CSS_CLASSES.RATING_TEN}">TMDB</span>
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

        createPlexTMDBButton() {
            return Utils.createElement('button', {
                class: `${CSS_CLASSES.PLEX_TMDB_BUTTON} _1v4h9jl0 _76v8d62 _76v8d61 _76v8d6a tvbry60 _76v8d6g _76v8d65 _1v25wbq1g _1v25wbq18`,
                'data-testid': 'preplay-tmdb',
                'aria-label': 'Send to TMDB',
                role: 'button',
                type: 'button',
                id: CONFIG.TMDB_BUTTON_ID
            });
        },

        createPeliplusButton() {
            return Utils.createElement('td', { width: '1' }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tr>
                        <td>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td height="40" align="center">
                                        <a href="#" class="${CSS_CLASSES.PELIPLUS_SIMKL_BUTTON}" id="${CONFIG.PELIPLUS_BUTTON_ID}"></a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <span class="${CSS_CLASSES.RATING_TEN}">Peliplus</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `);
        },

        createAnimePeliplusButton() {
            return Utils.createElement('td', { class: CSS_CLASSES.ANIME_BLOCK_TD }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tbody>
                        <tr>
                            <td>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tbody>
                                        <tr>
                                            <td height="40" align="center">
                                                <a href="#" class="${CSS_CLASSES.PELIPLUS_SIMKL_BUTTON}" id="${CONFIG.PELIPLUS_BUTTON_ID}"></a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center">
                                                <span class="${CSS_CLASSES.RATING_TEN}">PELIPLUS</span>
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

        createSoloLatinoButton() {
            return Utils.createElement('td', { width: '1' }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tr>
                        <td>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td height="40" align="center">
                                        <a href="#" class="${CSS_CLASSES.SOLOLATINO_SIMKL_BUTTON}" id="${CONFIG.SOLOLATINO_BUTTON_ID}"></a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <span class="${CSS_CLASSES.RATING_TEN}">SoloLatino</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `);
        },

        createAnimeSoloLatinoButton() {
            return Utils.createElement('td', { class: CSS_CLASSES.ANIME_BLOCK_TD }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tbody>
                        <tr>
                            <td>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tbody>
                                        <tr>
                                            <td height="40" align="center">
                                                <a href="#" class="${CSS_CLASSES.SOLOLATINO_SIMKL_BUTTON}" id="${CONFIG.SOLOLATINO_BUTTON_ID}"></a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center">
                                                <span class="${CSS_CLASSES.RATING_TEN}">SOLOLATINO</span>
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

        createLamovieButton() {
            return Utils.createElement('td', { width: '1' }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tr>
                        <td>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td height="40" align="center">
                                        <a href="#" class="${CSS_CLASSES.LAMOVIE_SIMKL_BUTTON}" id="${CONFIG.LAMOVIE_BUTTON_ID}"></a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <span class="${CSS_CLASSES.RATING_TEN}">LaMovie</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `);
        },

        createAnimeLamovieButton() {
            return Utils.createElement('td', { class: CSS_CLASSES.ANIME_BLOCK_TD }, `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="${CSS_CLASSES.RATING_BORDER}">
                    <tbody>
                        <tr>
                            <td>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tbody>
                                        <tr>
                                            <td height="40" align="center">
                                                <a href="#" class="${CSS_CLASSES.LAMOVIE_SIMKL_BUTTON}" id="${CONFIG.LAMOVIE_BUTTON_ID}"></a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center">
                                                <span class="${CSS_CLASSES.RATING_TEN}">LAMOVIE</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        }
    };

    /**
     * Button insertion strategies for different page types
     */
    const InsertionStrategies = {
        insertForRatingCell() {
            const imdbLink = document.querySelector(SELECTORS.IMDB_LINK);
            const malLink = document.querySelector(SELECTORS.MAL_LINK);
            const link = imdbLink || malLink;

            if (!link) return false;

            const ratingCell = link.closest(SELECTORS.RATING_CELL_WIDTH);
            if (!ratingCell) return false;

            const spacerCell1 = Utils.createElement('td', {}, '&nbsp;');
            const aniListCell = ButtonFactory.createAniListButton();
            const spacerCell2 = Utils.createElement('td', {}, '&nbsp;');
            const tmdbCell = ButtonFactory.createTMDBButton();
            const spacerCell3 = Utils.createElement('td', {}, '&nbsp;');
            const peliplusCell = ButtonFactory.createPeliplusButton();
            const spacerCell4 = Utils.createElement('td', {}, '&nbsp;');
            const sololatinoCell = ButtonFactory.createSoloLatinoButton();
            const spacerCell5 = Utils.createElement('td', {}, '&nbsp;');
            const lamovieCell = ButtonFactory.createLamovieButton();

            ratingCell.parentNode.insertBefore(spacerCell1, ratingCell.nextSibling);
            ratingCell.parentNode.insertBefore(aniListCell, spacerCell1.nextSibling);
            ratingCell.parentNode.insertBefore(spacerCell2, aniListCell.nextSibling);
            ratingCell.parentNode.insertBefore(tmdbCell, spacerCell2.nextSibling);
            ratingCell.parentNode.insertBefore(spacerCell3, tmdbCell.nextSibling);
            ratingCell.parentNode.insertBefore(peliplusCell, spacerCell3.nextSibling);
            ratingCell.parentNode.insertBefore(spacerCell4, peliplusCell.nextSibling);
            ratingCell.parentNode.insertBefore(sololatinoCell, spacerCell4.nextSibling);
            ratingCell.parentNode.insertBefore(spacerCell5, sololatinoCell.nextSibling);
            ratingCell.parentNode.insertBefore(lamovieCell, spacerCell5.nextSibling);

            return true;
        },

        insertForAnimePage() {
            const animeRatingsRow = document.querySelector(SELECTORS.ANIME_RATINGS_ROW);
            if (!animeRatingsRow) return false;

            const reactionsCell = animeRatingsRow.querySelector(SELECTORS.ANIME_REACTIONS_CELL);
            if (!reactionsCell) return false;

            const aniListCell = ButtonFactory.createAnimeAniListButton();
            const tmdbCell = ButtonFactory.createAnimeTMDBButton();
            const peliplusCell = ButtonFactory.createAnimePeliplusButton();
            const sololatinoCell = ButtonFactory.createAnimeSoloLatinoButton();
            const lamovieCell = ButtonFactory.createAnimeLamovieButton();

            animeRatingsRow.insertBefore(aniListCell, reactionsCell);
            animeRatingsRow.insertBefore(tmdbCell, reactionsCell);
            animeRatingsRow.insertBefore(peliplusCell, reactionsCell);
            animeRatingsRow.insertBefore(sololatinoCell, reactionsCell);
            animeRatingsRow.insertBefore(lamovieCell, reactionsCell);

            return true;
        },

        insertForRatingTable() {
            const ratingTable = document.querySelector(SELECTORS.RATING_TABLE);
            if (!ratingTable) return false;

            const lastCell = ratingTable.querySelector('td:last-child');
            if (!lastCell) return false;

            const spacerCell1 = Utils.createElement('td', {}, '&nbsp;');
            const aniListCell = ButtonFactory.createAniListButton();
            const spacerCell2 = Utils.createElement('td', {}, '&nbsp;');
            const tmdbCell = ButtonFactory.createTMDBButton();
            const spacerCell3 = Utils.createElement('td', {}, '&nbsp;');
            const peliplusCell = ButtonFactory.createPeliplusButton();
            const spacerCell4 = Utils.createElement('td', {}, '&nbsp;');
            const sololatinoCell = ButtonFactory.createSoloLatinoButton();
            const spacerCell5 = Utils.createElement('td', {}, '&nbsp;');
            const lamovieCell = ButtonFactory.createLamovieButton();

            ratingTable.insertBefore(spacerCell1, lastCell.nextSibling);
            ratingTable.insertBefore(aniListCell, spacerCell1.nextSibling);
            ratingTable.insertBefore(spacerCell2, aniListCell.nextSibling);
            ratingTable.insertBefore(tmdbCell, spacerCell2.nextSibling);
            ratingTable.insertBefore(spacerCell3, tmdbCell.nextSibling);
            ratingTable.insertBefore(peliplusCell, spacerCell3.nextSibling);
            ratingTable.insertBefore(spacerCell4, peliplusCell.nextSibling);
            ratingTable.insertBefore(sololatinoCell, spacerCell4.nextSibling);
            ratingTable.insertBefore(spacerCell5, sololatinoCell.nextSibling);
            ratingTable.insertBefore(lamovieCell, spacerCell5.nextSibling);

            return true;
        },

        insertForPlexPage() {
            const buttonContainer = document.querySelector(SELECTORS.PLEX_BUTTON_CONTAINER);
            if (!buttonContainer) return false;

            const simklButton = ButtonFactory.createPlexSimklButton();
            const aniListButton = ButtonFactory.createPlexAniListButton();
            const tmdbButton = ButtonFactory.createPlexTMDBButton();

            buttonContainer.appendChild(simklButton);
            buttonContainer.appendChild(aniListButton);
            buttonContainer.appendChild(tmdbButton);

            return true;
        }
    };

    /**
     * Main button manager
     */
    const ButtonManager = {
        observer: null,

        init() {
            this.observer = new MutationObserver(
                Utils.debounce(() => this.attemptButtonInsertion(), 100)
            );

            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            this.attemptButtonInsertion();
        },

        attemptButtonInsertion() {
            if (document.querySelector(SELECTORS.SIMKL_BUTTON) ||
                document.querySelector(SELECTORS.ANILIST_BUTTON) ||
                document.querySelector(SELECTORS.TMDB_BUTTON) ||
                document.querySelector(SELECTORS.PELIPLUS_BUTTON) ||
                document.querySelector(SELECTORS.SOLOLATINO_BUTTON) ||
                document.querySelector(SELECTORS.LAMOVIE_BUTTON)) {
                return;
            }

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

        handleButtonClick(event) {
            event.preventDefault();

            let titleElement = document.querySelector(SELECTORS.TITLE);

            if (!titleElement) {
                titleElement = document.querySelector(SELECTORS.PLEX_TITLE);
            }

            if (!titleElement) {
                console.error('Title element not found');
                return;
            }

            const title = titleElement.textContent.trim();
            const clickedButton = event.target.closest('button, a');

            if (clickedButton && clickedButton.id === CONFIG.SIMKL_BUTTON_ID) {
                Utils.copyToClipboard(title);
                window.open(`${CONFIG.SIMKL_SEARCH_URL}?q=${encodeURIComponent(title)}`, '_blank');
            } else if (clickedButton && clickedButton.id === CONFIG.ANILIST_BUTTON_ID) {
                Utils.copyToClipboard(title);
                window.open(`${CONFIG.ANILIST_SEARCH_URL}?search=${encodeURIComponent(title)}`, '_blank');
            } else if (clickedButton && clickedButton.id === CONFIG.TMDB_BUTTON_ID) {
                Utils.copyToClipboard(title);
                window.open(`${CONFIG.TMDB_SEARCH_URL}?query=${encodeURIComponent(title)}`, '_blank');
            } else if (clickedButton && clickedButton.id === CONFIG.PELIPLUS_BUTTON_ID) {
                Utils.copyToClipboard(title);
                window.open(CONFIG.PELIPLUS_BASE_URL, '_blank');
            } else if (clickedButton && clickedButton.id === CONFIG.SOLOLATINO_BUTTON_ID) {
                Utils.copyToClipboard(title);
                window.open(CONFIG.SOLOLATINO_BASE_URL, '_blank');
            } else if (clickedButton && clickedButton.id === CONFIG.LAMOVIE_BUTTON_ID) {
                Utils.copyToClipboard(title);
                window.open(CONFIG.LAMOVIE_BASE_URL, '_blank');
            }
        },

        destroy() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        }
    };    const PeliplusHandler = {
        observer: null,

        /**
         * Gets the title from the page, falling back to URL slug
         */
        getTitle() {
            const titleSelectors = ['h1', '[itemprop="name"]', '[class*="title"]', 'h2'];
            for (const sel of titleSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                    const text = el.textContent.trim();
                    if (text) return text;
                }
            }

            // Fallback: parse from URL slug (e.g. /serie/la-oficina → "La Oficina")
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            if (pathParts.length >= 2) {
                return pathParts[1]
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }

            return null;
        },

        /**
         * Creates and appends the floating button panel to the page
         */
        createButtonPanel() {
            if (document.getElementById(CONFIG.PELIPLUS_BUTTON_CONTAINER_ID)) return;

            const container = Utils.createElement('div', {
                id: CONFIG.PELIPLUS_BUTTON_CONTAINER_ID,
                class: CSS_CLASSES.PELIPLUS_CONTAINER
            });

            if (window.location.hostname === 'sololatino.net') {
                container.classList.add(CSS_CLASSES.SOLOLATINO_PANEL);
            }

            if (window.location.hostname === 'lamovie.org') {
                container.classList.add(CSS_CLASSES.SOLOLATINO_PANEL);
            }

            const buttons = [
                { label: 'Simkl', iconClass: CSS_CLASSES.PELIPLUS_FLOAT_SIMKL, short: 'S', getUrl: (t) => `${CONFIG.SIMKL_SEARCH_URL}?q=${encodeURIComponent(t)}` },
                { label: 'AniList', iconClass: CSS_CLASSES.PELIPLUS_FLOAT_ANILIST, short: 'A', getUrl: (t) => `${CONFIG.ANILIST_SEARCH_URL}?search=${encodeURIComponent(t)}` },
                { label: 'TMDB', iconClass: CSS_CLASSES.PELIPLUS_FLOAT_TMDB, short: 'M', getUrl: (t) => `${CONFIG.TMDB_SEARCH_URL}?query=${encodeURIComponent(t)}` },
                { label: 'LaMovie', iconClass: CSS_CLASSES.LAMOVIE_SIMKL_BUTTON, short: 'L', getUrl: () => CONFIG.LAMOVIE_BASE_URL }
            ];

            for (const btn of buttons) {
                const button = Utils.createElement('button', {
                    class: `${CSS_CLASSES.PELIPLUS_BUTTON} ${btn.iconClass}`,
                    title: btn.label,
                    type: 'button'
                });

                const iconFallback = Utils.createElement('i', { class: CSS_CLASSES.FLOAT_ICON_FALLBACK }, btn.short);
                button.appendChild(iconFallback);

                const label = Utils.createElement('span', {}, btn.label);
                button.appendChild(label);

                button.addEventListener('click', () => {
                    const title = this.getTitle();
                    if (!title) {
                        console.error('Peliplus: title not found');
                        return;
                    }
                    Utils.copyToClipboard(title);
                    window.open(btn.getUrl(title), '_blank');
                });

                container.appendChild(button);
            }

            document.body.appendChild(container);
        },

        /**
         * Initializes the handler, waiting for content pages and SPA navigation
         */
        init() {
            StyleManager.injectPeliplus();

            const tryInject = () => {
                const pathParts = window.location.pathname.split('/').filter(Boolean);
                if (pathParts.length >= 2 && (pathParts[0] === 'serie' || pathParts[0] === 'pelicula')) {
                    // Small delay to let the SPA finish rendering
                    setTimeout(() => this.createButtonPanel(), 300);
                } else {
                    // Remove panel when navigating away from a content page
                    const existing = document.getElementById(CONFIG.PELIPLUS_BUTTON_CONTAINER_ID);
                    if (existing) existing.remove();
                }
            };

            // Initial injection
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', tryInject);
            } else {
                tryInject();
            }

            // Listen for back/forward navigation
            window.addEventListener('popstate', tryInject);

            // Intercept history.pushState and replaceState for SPA routers
            const originalPushState = history.pushState.bind(history);
            history.pushState = function (...args) {
                originalPushState(...args);
                tryInject();
            };
            const originalReplaceState = history.replaceState.bind(history);
            history.replaceState = function (...args) {
                originalReplaceState(...args);
                tryInject();
            };

            // Fallback: MutationObserver in case the panel gets removed
            this.observer = new MutationObserver(Utils.debounce(() => {
                if (!document.getElementById(CONFIG.PELIPLUS_BUTTON_CONTAINER_ID)) {
                    tryInject();
                }
            }, 500));

            this.observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    };

    /**
     * Main application controller
     */
    const App = {
        init() {
            if (window.location.hostname === 'tioplus.app' ||
                window.location.hostname === 'sololatino.net' ||
                window.location.hostname === 'lamovie.org') {
                PeliplusHandler.init();
                return;
            }

            StyleManager.inject();
            this.setupEventListeners();
            this.startButtonManager();
        },

        setupEventListeners() {
            document.addEventListener('click', (event) => {
                const simklButton = event.target.closest(SELECTORS.SIMKL_BUTTON);
                const aniListButton = event.target.closest(SELECTORS.ANILIST_BUTTON);
                const tmdbButton = event.target.closest(SELECTORS.TMDB_BUTTON);
                const peliplusButton = event.target.closest(SELECTORS.PELIPLUS_BUTTON);
                const sololatinoButton = event.target.closest(SELECTORS.SOLOLATINO_BUTTON);
                const lamovieButton = event.target.closest(SELECTORS.LAMOVIE_BUTTON);

                if (simklButton || aniListButton || tmdbButton || peliplusButton || sololatinoButton || lamovieButton) {
                    ButtonManager.handleButtonClick(event);
                }
            });
        },

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