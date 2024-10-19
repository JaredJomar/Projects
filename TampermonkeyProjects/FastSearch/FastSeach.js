// ==UserScript==
// @name         Fast Search
// @namespace    fast-search
// @version      0.1.5
// @description  Quickly search various sites using custom shortcuts.
// @author       JJJ
// @match        *://*/*
// @icon         https://th.bing.com/th/id/OIG4.Zgw8Ep_gbQoBnQO33DyS?pid=ImgGn
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Search Engines categorized into groups

    // Search
    const SEARCH_ENGINES = {
        g: "https://www.google.com/search?q=",
        b: "https://www.bing.com/search?q=",
        d: "https://duckduckgo.com/?q=",
        gs: "https://scholar.google.com/scholar?q=",
        ar: "https://archive.org/search.php?query=",
        way: "https://web.archive.org/web/*/",
        w: "https://en.wikipedia.org/w/index.php?search=",
        p: "https://www.perplexity.ai/?q=",

        // Coding
        gf: "https://greasyfork.org/en/scripts?q=",
        gh: "https://github.com/search?q=",
        so: "https://stackoverflow.com/search?q=",

        // Social
        r: "https://www.reddit.com/search/?q=",
        li: "https://www.linkedin.com/search/results/all/?keywords=",
        t: "https://www.twitch.tv/search?term=",
        x: "https://twitter.com/search?q=",
        f: "https://www.facebook.com/search/top/?q=",
        i: "https://www.instagram.com/explore/tags/",
        pi: "https://www.pinterest.com/search/pins/?q=",
        tu: "https://www.tumblr.com/search/",
        q: "https://www.quora.com/search?q=",
        sc: "https://soundcloud.com/search?q=",
        y: "https://www.youtube.com/results?search_query=",
        tk: "https://www.tiktok.com/search?q=",
        fi: "https://findthatmeme.com/?search=",

        // Gaming
        steam: "https://store.steampowered.com/search/?term=",
        epic: "https://store.epicgames.com/en-US/browse?q=",
        gog: "https://www.gog.com/games?search=",
        ubi: "https://store.ubi.com/us/search?q=",
        g2: "https://www.g2a.com/search?query=",
        cd: "https://www.cdkeys.com/catalogsearch/result/?q=",
        ori: "https://www.origin.com/search?searchString=",
        bat: "https://shop.battle.net/search?q=",

    };

    /**
     * Checks if the current focus is in an editable element.
     * @returns {boolean} True if focus is in an editable element, false otherwise.
     */
    const isFocusInEditable = () => {
        const el = document.activeElement;
        return el.isContentEditable || ['input', 'textarea'].includes(el.tagName.toLowerCase());
    };

    /**
     * Constructs the search URL for a given shortcut and query.
     * @param {string} shortcut - The shortcut key for the search engine.
     * @param {string} query - The search query.
     * @returns {string} The constructed search URL.
     */
    const constructSearchUrl = (shortcut, query) => {
        let baseUrl = SEARCH_ENGINES[shortcut] || SEARCH_ENGINES.g;

        if (shortcut === 'epic') {
            // Add special parameters for Epic Games
            baseUrl += `${encodeURIComponent(query)}&sortBy=relevancy&sortDir=DESC&count=40`;
        } else {
            baseUrl += encodeURIComponent(query || shortcut);
        }

        return baseUrl;
    };

    /**
     * Opens a new tab with the specified URL.
     * @param {string} url - The URL to open.
     */
    const openNewTab = (url) => {
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (newWindow) {
            newWindow.opener = null;
        } else {
            console.error('Failed to open new tab. Pop-up might be blocked.');
        }
    };

    /**
     * Executes the search across multiple gaming platforms.
     * @param {string} query - The search query.
     */
    const searchMultipleGamingPlatforms = (query) => {
        const platforms = ['g2a', 'cdkeys'];
        platforms.forEach(platform => {
            const searchUrl = constructSearchUrl(platform, query);
            openNewTab(searchUrl);
        });
    };

    /**
     * Handles the search based on user input.
     */
    const handleSearch = () => {
        const userInput = prompt("Enter search command:");
        if (!userInput) {
            console.log("Search canceled.");
            return;
        }

        const [shortcut, ...queryParts] = userInput.trim().split(" ");
        const query = queryParts.join(" ");

        if (shortcut === 'sg') {
            searchMultipleGamingPlatforms(query);
        } else {
            const searchUrl = constructSearchUrl(shortcut, query);
            openNewTab(searchUrl);
        }
    };

    /**
     * Initializes the Fast Search script.
     */
    const init = () => {
        console.log('Fast Search script initialized');
        document.addEventListener('keydown', event => {
            if (event.key === 'Insert' && !isFocusInEditable()) {
                handleSearch();
            }
        }, true);
    };

    // Start the script
    init();
})();