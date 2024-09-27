// ==UserScript==
// @name         Fast Search
// @namespace    fast-search
// @version      0.1.4
// @description  Quickly search various sites using custom shortcuts.
// @match        *://*/*
// @icon         https://th.bing.com/th/id/OIG4.Zgw8Ep_gbQoBnQO33DyS?pid=ImgGn
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Search engines
    const SEARCH_ENGINES = {
        a: "https://www.amazon.com/s?k=",
        b: "https://www.bing.com/search?q=",
        d: "https://duckduckgo.com/?q=",
        gf: "https://greasyfork.org/en/scripts?q=",
        gh: "https://github.com/search?q=",
        gi: "https://www.google.com/search?tbm=isch&q=",
        g: "https://www.google.com/search?q=",
        gs: "https://scholar.google.com/scholar?q=",
        li: "https://www.linkedin.com/search/results/all/?keywords=",
        r: "https://www.reddit.com/search/?q=",
        so: "https://stackoverflow.com/search?q=",
        t: "https://www.twitch.tv/search?term=",
        w: "https://en.wikipedia.org/w/index.php?search=",
        x: "https://twitter.com/search?q=",
        y: "https://www.youtube.com/results?search_query=",
        tk: "https://www.tiktok.com/search?q=",
        f: "https://www.facebook.com/search/top/?q=",
        i: "https://www.instagram.com/explore/tags/",
        p: "https://www.perplexity.ai/?q=",
        pi: "https://www.pinterest.com/search/pins/?q=",
        tu: "https://www.tumblr.com/search/",
        q: "https://www.quora.com/search?q=",
        fl: "https://www.flickr.com/search/?text=",
        sc: "https://soundcloud.com/search?q="
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
     * Performs the search based on user input.
     */
    const performSearch = () => {
        try {
            const userInput = prompt("Enter search command:");
            if (!userInput) {
                console.log("Search canceled.");
                return;
            }

            // Parse user input
            const [shortcut, ...queryParts] = userInput.trim().split(" ");
            const query = queryParts.join(" ");
            const baseUrl = SEARCH_ENGINES[shortcut] || SEARCH_ENGINES.g;
            const searchUrl = `${baseUrl}${encodeURIComponent(query || shortcut)}`;

            console.log("Opening search in a new tab...");

            // Open the search in a new tab without focusing on it
            const newWindow = window.open(searchUrl, '_blank', 'noopener,noreferrer');
            if (newWindow) {
                newWindow.opener = null;
            } else {
                throw new Error('Failed to open new tab. Pop-up might be blocked.');
            }
        } catch (error) {
            console.error('Error in performSearch:', error);
            console.log(`Error: ${error.message}`);
        }
    };

    /**
     * Initializes the Fast Search script.
     */
    const init = () => {
        console.log('Fast Search script initialized');
        // Add event listener for the Insert key
        document.addEventListener('keydown', event => {
            if (event.key === 'Insert' && !isFocusInEditable()) {
                performSearch();
            }
        }, true);
    };

    // Start the script
    init();
})();