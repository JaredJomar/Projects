// ==UserScript==
// @name         YouTube Playlist Dialog Enhancer
// @namespace    http://tampermonkey.net/
// @author       JJJ
// @version      0.1
// @description  Adds a styled search bar to the YouTube playlist dialog and centers it on the screen
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function addSearchBar() {
        const playlistDialog = document.querySelector('ytd-add-to-playlist-renderer');
        if (!playlistDialog) return;

        // Set fixed dimensions for the dialog and center it
        const dialogContainer = playlistDialog.closest('tp-yt-paper-dialog');
        if (dialogContainer) {
            dialogContainer.style.width = '700px';
            dialogContainer.style.height = '500px';
            dialogContainer.style.maxWidth = '700px !important';
            dialogContainer.style.maxHeight = '500px !important';
            dialogContainer.style.position = 'fixed';
            dialogContainer.style.top = '50%';
            dialogContainer.style.left = '50%';
            dialogContainer.style.transform = 'translate(-50%, -50%)';
        }

        // Create search bar container
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = `
            padding: 16px 24px;
            background-color: #2f2554;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            width: 100%;
            box-sizing: border-box;
        `;

        // Create search bar
        const searchBar = document.createElement('input');
        searchBar.type = 'text';
        searchBar.placeholder = 'Search playlists...';
        searchBar.style.cssText = `
            width: calc(100% + 48px);
            margin-left: -24px;
            padding: 8px 24px;
            background-color: #2f2554;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-left: none;
            border-right: none;
            color: #ffffff;
            font-size: 14px;
            line-height: 20px;
            outline: none;
            box-sizing: border-box;
        `;

        // Add focus and hover effects
        searchBar.addEventListener('focus', () => {
            searchBar.style.backgroundColor = '#3a2e6a';
        });
        searchBar.addEventListener('blur', () => {
            searchBar.style.backgroundColor = '#2f2554';
        });
        searchBar.addEventListener('mouseover', () => {
            if (document.activeElement !== searchBar) {
                searchBar.style.backgroundColor = '#3a2e6a';
            }
        });
        searchBar.addEventListener('mouseout', () => {
            if (document.activeElement !== searchBar) {
                searchBar.style.backgroundColor = '#2f2554';
            }
        });

        // Append search bar to container
        searchContainer.appendChild(searchBar);

        // Insert search container at the top of the dialog
        playlistDialog.insertBefore(searchContainer, playlistDialog.firstChild);

        // Adjust the width of the playlist dialog
        playlistDialog.style.width = '100%';
        playlistDialog.style.height = 'calc(500px - 60px)'; // Account for header
        playlistDialog.style.margin = '0';

        // Adjust the height of the playlist container
        const playlistContainer = playlistDialog.querySelector('#playlists');
        if (playlistContainer) {
            playlistContainer.style.maxHeight = 'calc(500px - 120px)'; // Account for header and search bar
            playlistContainer.style.overflowY = 'auto';
            playlistContainer.style.width = '100%';
            playlistContainer.style.margin = '0';
            playlistContainer.style.padding = '0 24px';
        }

        // Add event listener for search functionality
        searchBar.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            const playlists = playlistDialog.querySelectorAll('ytd-playlist-add-to-option-renderer');

            playlists.forEach(playlist => {
                const playlistName = playlist.querySelector('#label').textContent.toLowerCase();
                if (playlistName.includes(searchTerm)) {
                    playlist.style.display = '';
                } else {
                    playlist.style.display = 'none';
                }
            });
        });

        // Automatically populate search bar with channel name if available
        const channelNameElement = document.querySelector('ytd-video-owner-renderer yt-formatted-string#text');
        if (channelNameElement) {
            const channelName = channelNameElement.textContent.trim();
            searchBar.value = channelName;
            searchBar.dispatchEvent(new Event('input'));
        }
    }

    // Observe for changes in the DOM to detect when the playlist dialog appears
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches('ytd-add-to-playlist-renderer')) {
                        setTimeout(addSearchBar, 0);
                    }
                }
            }
        });
    });

    // Start observing the body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();