// ==UserScript==
// @name         YouTube Playlist Dialog Enhancer
// @namespace    http://tampermonkey.net/
// @author       JJJ
// @version      0.0.1
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
            position: relative;
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
            padding-right: 40px; /* Make room for the clear button */
        `;

        // Create clear button (X)
        const clearButton = document.createElement('button');
        clearButton.innerHTML = '✕';
        clearButton.style.cssText = `
            position: absolute;
            right: 30px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #aaa;
            font-size: 16px;
            cursor: pointer;
            padding: 4px 8px;
            display: none;
            z-index: 10;
        `;

        // Add hover effect to clear button
        clearButton.addEventListener('mouseover', () => {
            clearButton.style.color = '#fff';
        });

        clearButton.addEventListener('mouseout', () => {
            clearButton.style.color = '#aaa';
        });

        // Clear search when button is clicked
        clearButton.addEventListener('click', () => {
            searchBar.value = '';
            clearButton.style.display = 'none';
            searchBar.focus();
            // Trigger input event to update playlist filtering
            searchBar.dispatchEvent(new Event('input'));
        });

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

        // Show/hide clear button based on search content
        searchBar.addEventListener('input', function () {
            clearButton.style.display = this.value ? 'block' : 'none';
        });

        // Append search bar and clear button to container
        searchContainer.appendChild(searchBar);
        searchContainer.appendChild(clearButton);

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

    function populateNewPlaylistTitle() {
        // Find the new playlist dialog
        const createPlaylistDialog = document.querySelector('yt-create-playlist-dialog-form-view-model');
        if (!createPlaylistDialog) return;

        // Get the title field
        const titleTextarea = createPlaylistDialog.querySelector('textarea.ytStandardsTextareaShapeTextarea');
        if (!titleTextarea) return;

        // Get the title field container to position our clear button
        const titleContainer = titleTextarea.closest('.ytStandardsTextareaShapeTextareaContainer');
        if (!titleContainer) return;

        // Create clear button (X) if it doesn't already exist
        let clearButton = titleContainer.querySelector('.playlist-title-clear-button');
        if (!clearButton) {
            clearButton = document.createElement('button');
            clearButton.className = 'playlist-title-clear-button';
            clearButton.innerHTML = '✕';
            clearButton.style.cssText = `
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: #aaa;
                font-size: 16px;
                cursor: pointer;
                padding: 4px 8px;
                z-index: 10;
            `;

            // Position the container as relative to allow absolute positioning of the clear button
            titleContainer.style.position = 'relative';

            // Add hover effect to clear button
            clearButton.addEventListener('mouseover', () => {
                clearButton.style.color = '#fff';
            });

            clearButton.addEventListener('mouseout', () => {
                clearButton.style.color = '#aaa';
            });

            // Clear title when button is clicked
            clearButton.addEventListener('click', () => {
                titleTextarea.value = '';
                clearButton.style.display = 'none';
                titleTextarea.focus();

                // Show the placeholder
                const placeholder = titleContainer.querySelector('.ytStandardsTextareaShapePlaceholder');
                if (placeholder) {
                    placeholder.classList.add('ytStandardsTextareaShapePlaceholderVisible');
                }

                // Trigger input event to update validation
                titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            });

            // Add the clear button to the container
            titleContainer.appendChild(clearButton);

            // Show/hide clear button based on title content
            titleTextarea.addEventListener('input', function () {
                clearButton.style.display = this.value ? 'block' : 'none';
            });
        }

        // Get the channel name
        const channelNameElement = document.querySelector('ytd-video-owner-renderer yt-formatted-string#text');
        if (channelNameElement) {
            const channelName = channelNameElement.textContent.trim();

            // Set the title in the input field
            titleTextarea.value = channelName;

            // Show the clear button
            clearButton.style.display = 'block';

            // Dispatch input event to trigger validation and enable the create button
            titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));

            // Hide the placeholder
            const placeholder = createPlaylistDialog.querySelector('.ytStandardsTextareaShapePlaceholder');
            if (placeholder) {
                placeholder.classList.remove('ytStandardsTextareaShapePlaceholderVisible');
            }

            // Focus on the title field for easy editing if needed
            titleTextarea.focus();
        }
    }

    // Observe for changes in the DOM to detect when dialogs appear
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check for add to playlist dialog
                        if (node.matches('ytd-add-to-playlist-renderer')) {
                            setTimeout(addSearchBar, 0);
                        }

                        // Check for create playlist dialog
                        if (node.tagName &&
                            (node.tagName.toLowerCase() === 'yt-dialog-view-model' ||
                                node.querySelector('yt-create-playlist-dialog-form-view-model'))) {
                            setTimeout(populateNewPlaylistTitle, 100); // Small delay to ensure DOM is ready
                        }
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