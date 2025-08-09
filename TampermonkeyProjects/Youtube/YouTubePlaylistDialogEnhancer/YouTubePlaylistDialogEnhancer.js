// ==UserScript==
// @name         YouTube Playlist Dialog Enhancer
// @namespace    http://tampermonkey.net/
// @author       JJJ
// @version      0.0.2
// @description  Adds a styled search bar to the YouTube playlist dialog and centers it on the screen
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function getChannelName() {
        console.log('Getting channel name...');

        // Try multiple selectors to find the channel name
        const selectors = [
            'ytd-channel-name yt-formatted-string#text a',
            'ytd-channel-name yt-formatted-string#text',
            'ytd-video-owner-renderer ytd-channel-name yt-formatted-string#text a',
            'ytd-video-owner-renderer ytd-channel-name yt-formatted-string#text',
            '#channel-name yt-formatted-string#text a',
            '#channel-name yt-formatted-string#text',
            'ytd-video-owner-renderer yt-formatted-string#text a',
            'ytd-video-owner-renderer yt-formatted-string#text',
            // Fallback selectors
            '.ytd-channel-name a',
            '.ytd-channel-name',
            '#upload-info #channel-name a',
            '#upload-info #channel-name'
        ];

        for (const selector of selectors) {
            console.log('Trying selector:', selector);
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                const channelName = element.textContent.trim();
                console.log('Found channel name:', channelName, 'with selector:', selector);
                return channelName;
            }
        }

        // If nothing found, try to get any text that looks like a channel name
        const channelElements = document.querySelectorAll('[id*="channel"], [class*="channel"], [class*="owner"]');
        for (const element of channelElements) {
            const text = element.textContent.trim();
            if (text && text.length > 0 && text.length < 100 && !text.includes('suscriptor')) {
                console.log('Found potential channel name:', text, 'from element:', element);
                return text;
            }
        }

        console.log('Channel name not found');
        return null;
    }

    function addSearchBar() {
        console.log('Looking for playlist dialog...');

        // Try multiple selectors for the playlist dialog
        const selectors = [
            'ytd-add-to-playlist-renderer',
            '[role="dialog"] ytd-add-to-playlist-renderer',
            'tp-yt-paper-dialog ytd-add-to-playlist-renderer',
            '.ytd-popup-container ytd-add-to-playlist-renderer'
        ];

        let playlistDialog = null;
        for (const selector of selectors) {
            playlistDialog = document.querySelector(selector);
            if (playlistDialog) {
                console.log('Playlist dialog found with selector:', selector, playlistDialog);
                break;
            }
        }

        if (!playlistDialog) {
            // Try to find any dialog that might contain playlists
            const dialogs = document.querySelectorAll('[role="dialog"], tp-yt-paper-dialog, ytd-popup-container');
            console.log('Found dialogs:', dialogs.length);

            for (const dialog of dialogs) {
                if (dialog.textContent.includes('Nueva lista') ||
                    dialog.textContent.includes('Guardar en') ||
                    dialog.querySelector('#playlists')) {
                    playlistDialog = dialog;
                    console.log('Found playlist dialog by content:', playlistDialog);
                    break;
                }
            }
        }

        if (!playlistDialog) {
            console.log('No playlist dialog found');
            return;
        }

        // Check if search bar already exists
        if (playlistDialog.querySelector('.playlist-search-container')) {
            console.log('Search bar already exists');
            return;
        }

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
        searchContainer.className = 'playlist-search-container';
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
        clearButton.textContent = '✕';
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
        console.log('Inserting search container');
        playlistDialog.insertBefore(searchContainer, playlistDialog.firstChild);
        console.log('Search bar added successfully');

        // Adjust the width of the playlist dialog
        playlistDialog.style.width = '100%';
        playlistDialog.style.height = 'calc(500px - 60px)'; // Account for header
        playlistDialog.style.margin = '0';

        // Find the playlist container - try multiple selectors
        const playlistContainerSelectors = [
            '#playlists',
            '[role="listbox"]',
            '.ytd-add-to-playlist-renderer #playlists',
            '.playlist-items-container'
        ];

        let playlistContainer = null;
        for (const selector of playlistContainerSelectors) {
            playlistContainer = playlistDialog.querySelector(selector);
            if (playlistContainer) {
                console.log('Found playlist container with selector:', selector);
                break;
            }
        }

        // If we can't find the container, look for any scrollable container
        if (!playlistContainer) {
            const containers = playlistDialog.querySelectorAll('*');
            for (const container of containers) {
                const style = window.getComputedStyle(container);
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                    playlistContainer = container;
                    console.log('Found scrollable container:', container);
                    break;
                }
            }
        }
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

            // Try multiple selectors for playlist items
            const playlistSelectors = [
                'ytd-playlist-add-to-option-renderer',
                '[role="option"]',
                '.playlist-item',
                '.ytd-add-to-playlist-renderer [role="checkbox"]'
            ];

            let playlists = [];
            for (const selector of playlistSelectors) {
                playlists = playlistDialog.querySelectorAll(selector);
                if (playlists.length > 0) {
                    console.log('Found playlists with selector:', selector, playlists.length);
                    break;
                }
            }

            playlists.forEach(playlist => {
                // Try multiple ways to get the playlist name
                let playlistName = '';

                const labelSelectors = ['#label', '.playlist-name', '[role="checkbox"] + *', 'span', 'div'];
                for (const labelSelector of labelSelectors) {
                    const labelElement = playlist.querySelector(labelSelector);
                    if (labelElement && labelElement.textContent.trim()) {
                        playlistName = labelElement.textContent.toLowerCase();
                        break;
                    }
                }

                if (!playlistName) {
                    playlistName = playlist.textContent.toLowerCase();
                }

                if (playlistName.includes(searchTerm)) {
                    playlist.style.display = '';
                } else {
                    playlist.style.display = 'none';
                }
            });
        });

        // Automatically populate search bar with channel name if available
        // Try immediately and also with a small delay
        function populateChannelName() {
            const channelName = getChannelName();
            if (channelName) {
                console.log('Populating search bar with:', channelName);
                searchBar.value = channelName;
                searchBar.dispatchEvent(new Event('input'));
                clearButton.style.display = 'block';
                return true;
            }
            return false;
        }

        // Try immediately
        if (!populateChannelName()) {
            // If not found, try again after a short delay
            setTimeout(() => {
                if (!populateChannelName()) {
                    console.log('Could not find channel name after delay');
                }
            }, 500);
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
            clearButton.textContent = '✕';
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

        // Get the channel name and populate the title
        function populateChannelNameInTitle() {
            const channelName = getChannelName();
            if (channelName) {
                console.log('Populating playlist title with:', channelName);

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
                return true;
            }
            return false;
        }

        // Try immediately and with delay
        if (!populateChannelNameInTitle()) {
            setTimeout(() => {
                if (!populateChannelNameInTitle()) {
                    console.log('Could not find channel name for playlist title after delay');
                }
            }, 500);
        }
    }

    // Observe for changes in the DOM to detect when dialogs appear
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        console.log('Node added:', node.tagName, node.className);

                        // Check for add to playlist dialog - more comprehensive check
                        const isPlaylistDialog =
                            (node.matches && node.matches('ytd-add-to-playlist-renderer')) ||
                            (node.matches && node.matches('[role="dialog"]') && node.textContent.includes('Guardar')) ||
                            (node.matches && node.matches('tp-yt-paper-dialog') && node.querySelector('ytd-add-to-playlist-renderer'));

                        if (isPlaylistDialog) {
                            console.log('Add to playlist dialog detected');
                            setTimeout(addSearchBar, 100);
                        }

                        // Also check if the dialog is inside the added node
                        const playlistRenderer = node.querySelector && (
                            node.querySelector('ytd-add-to-playlist-renderer') ||
                            (node.querySelector('[role="dialog"]') && node.textContent.includes('Guardar'))
                        );
                        if (playlistRenderer) {
                            console.log('Add to playlist dialog found inside node');
                            setTimeout(addSearchBar, 200);
                        }

                        // Check for create playlist dialog
                        if (node.tagName &&
                            (node.tagName.toLowerCase() === 'yt-dialog-view-model' ||
                                node.querySelector('yt-create-playlist-dialog-form-view-model'))) {
                            console.log('Create playlist dialog detected');
                            setTimeout(populateNewPlaylistTitle, 100); // Small delay to ensure DOM is ready
                        }
                    }
                }
            }
        });
    });

    // Also try to add search bar immediately in case the dialog is already open
    setTimeout(() => {
        console.log('Initial check for existing dialogs');
        addSearchBar();
        populateNewPlaylistTitle();
    }, 1000);

    // Start observing the body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();