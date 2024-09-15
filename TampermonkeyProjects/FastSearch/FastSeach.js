// ==UserScript==
// @name         Fast Search
// @namespace    fast-search
// @version      0.1
// @description  Quickly search various sites using custom shortcuts.
// @match        *://*/*
// @icon         https://th.bing.com/th/id/OIG4.Zgw8Ep_gbQoBnQO33DyS?pid=ImgGn
// @grant        GM_notification
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Define search engine shortcuts and URLs
    const SEARCH_ENGINES = {
        "a": "https://www.amazon.com/s?k=",
        "b": "https://www.bing.com/search?q=",
        "d": "https://duckduckgo.com/?q=",
        "gh": "https://github.com/search?q=",
        "gi": "https://www.google.com/search?tbm=isch&q=",
        "g": "https://www.google.com/search?q=",
        "gs": "https://scholar.google.com/scholar?q=",
        "li": "https://www.linkedin.com/search/results/all/?keywords=",
        "r": "https://www.reddit.com/search/?q=",
        "so": "https://stackoverflow.com/search?q=",
        "t": "https://twitter.com/search?q=",
        "w": "https://en.wikipedia.org/w/index.php?search=",
        "y": "https://www.youtube.com/results?search_query="
    };

    // Notify user with a message
    function notifyUser(message) {
        if (!('Notification' in window)) {
            console.log('Browser does not support notifications');
            return;
        }
        if (Notification.permission === 'granted') {
            new Notification(message);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(message);
                }
            });
        }
    }

    // Check if current element is an input or editable
    function isFocusInEditable() {
        const el = document.activeElement;
        return el.tagName.toLowerCase() === 'input' ||
            el.tagName.toLowerCase() === 'textarea' ||
            (el.tagName.toLowerCase() === 'div' && el.contentEditable === 'true');
    }

    // Perform the search
    function performSearch() {
        const userInput = prompt("Enter search command:");
        const [shortcut, ...queryParts] = (userInput || "").trim().split(" ");
        const query = queryParts.join(" ");

        let baseUrl = SEARCH_ENGINES[shortcut] || SEARCH_ENGINES["g"];
        let searchUrl;

        if (query) {
            searchUrl = `${baseUrl}${encodeURIComponent(query)}`;
        } else {
            // Use Google search with the shortcut as the query if no query is provided
            searchUrl = SEARCH_ENGINES["g"] + encodeURIComponent(shortcut);
        }

        notifyUser("Redirecting to your search...");
        window.location.href = searchUrl;
    }

    // Initialize script
    function init() {
        console.log('Fast Search script initialized');
        document.addEventListener('keydown', event => {
            if (event.key === 'Insert' && !isFocusInEditable()) {
                performSearch();
            }
        }, true);
    }

    init();
})();