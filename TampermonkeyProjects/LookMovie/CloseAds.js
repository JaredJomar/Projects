// ==UserScript==
// @name Close Ads
// @namespace https://www.lookmovie2.to/
// @version 0.3
// @description Close ads on LookMovie 
// @author JJJ
// @match https://www.lookmovie2.to/*
// @icon https://www.google.com/s2/favicons?sz=64&domain=lookmovie2.to
// @grant none
// @license MIT
// @downloadURL https://update.greasyfork.org/scripts/495537/Close%20Ads.user.js
// @updateURL https://update.greasyfork.org/scripts/495537/Close%20Ads.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // Function to close the ads
    function closeAds() {
        var closeButton = document.querySelector('#PlayerZone > section > a.close-icon.player-ads-summer-2024--close');
        if (closeButton) {
            closeButton.click();
        }
    }

    // Mutation observer for changes in the DOM
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length > 0) {
                closeAds();
            }
        });
    });

    // Observe changes in the <body>
    observer.observe(document.body, { childList: true, subtree: true });
})();