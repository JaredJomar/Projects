// ==UserScript==
// @name         Fast Search
// @namespace    fast-search
// @version      0.1.3
// @description  Quickly search various sites using custom shortcuts.
// @match        *://*/*
// @icon         https://th.bing.com/th/id/OIG4.Zgw8Ep_gbQoBnQO33DyS?pid=ImgGn
// @grant        GM_notification
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Define search engine shortcuts and URLs
    const searchEngines = {
        "a": "https://www.amazon.com/s?k=",
        "b": "https://www.bing.com/search?q=",
        "d": "https://duckduckgo.com/?q=",
        "gf": "https://greasyfork.org/en/scripts?q=",
        "gh": "https://github.com/search?q=",
        "gi": "https://www.google.com/search?tbm=isch&q=",
        "g": "https://www.google.com/search?q=",
        "gs": "https://scholar.google.com/scholar?q=",
        "li": "https://www.linkedin.com/search/results/all/?keywords=",
        "r": "https://www.reddit.com/search/?q=",
        "so": "https://stackoverflow.com/search?q=",
        "t": "https://www.twitch.tv/search?term=",
        "w": "https://en.wikipedia.org/w/index.php?search=",
        "x": "https://twitter.com/search?q=",
        "y": "https://www.youtube.com/results?search_query=",
        "tk": "https://www.tiktok.com/search?q=",
        "f": "https://www.facebook.com/search/top/?q=",
        "i": "https://www.instagram.com/explore/tags/",
        "p": "https://www.pinterest.com/search/pins/?q=",
        "tu": "https://www.tumblr.com/search/",
        "q": "https://www.quora.com/search?q=",
        "fl": "https://www.flickr.com/search/?text=",
        "sc": "https://soundcloud.com/search?q="
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
        if (!userInput) {
            notifyUser("Search canceled.");
            return;
        }
        const [shortcut, ...queryParts] = userInput.trim().split(" ");
        const query = queryParts.join(" ");

        // Default to Google if shortcut is not found
        const baseUrl = SEARCH_ENGINES[shortcut] || SEARCH_ENGINES["g"];
        const searchUrl = query ? `${baseUrl}${encodeURIComponent(query)}` : `${SEARCH_ENGINES["g"]}${encodeURIComponent(shortcut)}`;

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