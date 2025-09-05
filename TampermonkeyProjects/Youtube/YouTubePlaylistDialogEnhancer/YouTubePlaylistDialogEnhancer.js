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
        // Normalizer: strip @, remove follower counts and common trailing tokens, split by separators
        function normalizeName(raw) {
            if (!raw || typeof raw !== 'string') return null;
            let s = raw.trim();
            // Replace line breaks and collapsing spaces
            s = s.replace(/\s+/g, ' ');
            // If contains separators like '·' or '•' or '-' or '|' take parts
            const parts = s.split(/\u00B7|\u2022|\||-|·|•|—/).map(p => p.trim()).filter(Boolean);
            // Prefer the part that looks most like a name: contains letters and not keywords like 'suscriptor' or 'videos' or numbers only
            const badRegex = /suscripto|suscrib|videos?|vídeos?|subscrip|subscribers|views?|vistas?/i;
            let candidate = null;
            for (const part of parts) {
                if (!part) continue;
                if (badRegex.test(part)) continue;
                // ignore parts that are mostly numeric or include 'M'/'K' only
                const alpha = part.replace(/[0-9.,\sMKmk]+/g, '').trim();
                if (alpha.length >= 1) {
                    candidate = part;
                    break;
                }
            }
            if (!candidate) candidate = parts[0] || s;
            // Remove trailing counts like "2,05 M de suscriptores" if still present
            candidate = candidate.replace(/\b\d[0-9.,\s]*\s*[MKk]?\b(\s*(de)?\s*(suscriptores|subscribers|vistas|views))?/i, '').trim();
            // Remove leading @
            candidate = candidate.replace(/^@+/, '').trim();
            // If it's still a long string containing both name and extra words, try to take first tokens
            if (candidate.length > 60) {
                candidate = candidate.split('\n')[0].split(',')[0].trim();
            }
            return candidate || null;
        }
        // Try multiple selectors to find the channel name (cover video pages, channel headers and owner renderers)
        const selectors = [
            // Common video page owner/channel renderers
            'ytd-channel-name yt-formatted-string#text a',
            'ytd-channel-name yt-formatted-string#text',
            'ytd-video-owner-renderer ytd-channel-name yt-formatted-string#text a',
            'ytd-video-owner-renderer ytd-channel-name yt-formatted-string#text',
            'ytd-video-owner-renderer yt-formatted-string#text a',
            'ytd-video-owner-renderer yt-formatted-string#text',

            // Channel page header variants (including "Videos" tab header)
            'ytd-c4-tabbed-header-renderer yt-formatted-string#text a',
            'ytd-c4-tabbed-header-renderer yt-formatted-string#text',
            'ytd-channel-name#channel-name yt-formatted-string',
            '#channel-name yt-formatted-string#text a',
            '#channel-name yt-formatted-string#text',

            // Generic fallbacks (prefer anchors that point to channels)
            'a[href^="/@"], a[href*="/@"], a[href*="/channel/"], a[href*="/user/"], a[href*="/c/"]',
            '.ytd-channel-name a',
            '.ytd-channel-name',
            '#upload-info #channel-name a',
            '#upload-info #channel-name'
        ];

        // Helper: ensure the matched element is actually inside a channel header/owner renderer or is a channel link
        function isValidElement(el) {
            if (!el) return false;
            // If it's an anchor that links to a channel path, accept
            if (el.tagName === 'A') {
                const href = el.getAttribute('href') || '';
                // ignore javascript:, mailto:, fragments
                if (/^(javascript:|#|mailto:)/i.test(href)) return false;
                // Match handles like /@DanPlan or /@DanPlan/videos, and /channel/ID, /user/name, /c/name
                if (/(?:\/@[^\/]+)|(?:\/(?:channel|user|c)\/[^\/]+)/.test(href)) {
                    // Skip obvious UI navigation labels (Videos, Inicio, Shorts, etc.) if the anchor text matches
                    const uiBad = /^(videos?|vídeos?|inicio|shorts|mis\s+vídeos|about|playlists?)$/i;
                    const txt = (el.textContent || '').trim();
                    if (txt && uiBad.test(txt)) return false;
                    return true;
                }
            }
            // Accept if inside well-known channel containers
            const container = el.closest && el.closest('ytd-channel-name, ytd-video-owner-renderer, ytd-c4-tabbed-header-renderer, #channel-name');
            if (container) return true;
            return false;
        }

        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.trim()) {
                    // Validate context to avoid capturing unrelated UI strings
                    if (!isValidElement(element)) {
                        console.log('Skipping element for selector (not a channel context):', selector, element.textContent.trim());
                    } else {
                        const channelName = element.textContent.trim();
                        const cleaned = normalizeName(channelName);
                        console.log('Found channel name (raw):', channelName, 'with selector:', selector, '=> cleaned:', cleaned);
                        if (cleaned) return cleaned;
                    }
                }
            } catch (e) {
                // Some selectors may throw on certain pages; ignore and continue
                console.log('Selector error for', selector, e);
            }
        }

        // Try JSON-LD structured data (common on YouTube pages)
        try {
            const ld = document.querySelector('script[type="application/ld+json"]');
            if (ld) {
                const json = JSON.parse(ld.textContent);
                // JSON-LD may include author or publisher name
                if (json && json.author && (json.author.name || (json.author[0] && json.author[0].name))) {
                    const name = json.author.name || (json.author[0] && json.author[0].name);
                    if (name && name.trim()) {
                        const cleaned = normalizeName(name.trim());
                        console.log('Found channel name from JSON-LD (raw):', name.trim(), '=> cleaned:', cleaned);
                        if (cleaned) return cleaned;
                    }
                }
                if (json && json.publisher && json.publisher.name) {
                    const name = json.publisher.name;
                    if (name && name.trim()) {
                        const cleaned = normalizeName(name.trim());
                        console.log('Found channel name from JSON-LD publisher (raw):', name.trim(), '=> cleaned:', cleaned);
                        if (cleaned) return cleaned;
                    }
                }
            }
        } catch (e) {
            console.log('JSON-LD parse error', e);
        }

        // Try meta tags (some channel pages include itemprop/name or og:title)
        const metaName = document.querySelector('meta[itemprop="name"], meta[property="og:site_name"], meta[property="og:title"], meta[name="title"]');
        if (metaName && metaName.content && metaName.content.trim()) {
            const name = metaName.content.trim();
            // Guard against page titles that include "YouTube" only when on channel-like paths
            if (name && name.length < 200) {
                const cleaned = normalizeName(name);
                console.log('Found channel name from meta tag (raw):', name, '=> cleaned:', cleaned);
                if (cleaned) return cleaned;
            }
        }

        // Heuristic: if we're on a channel "videos" page, the document.title often is "ChannelName - YouTube"
        try {
            const path = location.pathname || '';
            if (path.includes('/videos') || /\/(channel|user|c|@)[^\/]+(\/videos)?/.test(path)) {
                let title = (document.title || '').trim();
                if (title) {
                    // Split title into parts and remove parts that are clearly not the channel name
                    // Example titles: "DanPlan - YouTube", "Videos - DanPlan - YouTube", "DanPlan - YouTube" (locale variants possible)
                    const parts = title.split(/\s*-\s*/).map(p => p.trim()).filter(Boolean);
                    // Filter out parts containing YouTube or generic words like "Videos" (Spanish: "Videos", "Vídeos")
                    const badPatterns = [/youtube/i, /videos?/i, /vídeos?/i, /reproducciones/i];
                    const candidates = parts.filter(p => !badPatterns.some(rx => rx.test(p)));
                    // Choose the longest reasonable candidate
                    const candidate = candidates.sort((a, b) => b.length - a.length)[0] || parts[0];
                    const cleaned = (candidate || '').trim().replace(/^[\u2022\u00B7\s]+|[\u2022\u00B7\s]+$/g, '');
                    if (cleaned && cleaned.length < 150) {
                        const normalized = normalizeName(cleaned);
                        console.log('Derived channel name from document.title parts (raw):', cleaned, '=> normalized:', normalized, 'original title:', title);
                        if (normalized) return normalized;
                    }
                }
            }
        } catch (e) {
            console.log('Title heuristic error', e);
        }

        // Try to extract from URL path (handles like /@DanPlan or /channel/ID or /user/name or /c/name)
        try {
            const path = location.pathname || '';
            const segments = path.split('/').filter(Boolean);

            // Direct handle like @DanPlan
            const handleSeg = segments.find(s => s && s.startsWith('@'));
            if (handleSeg) {
                const name = decodeURIComponent(handleSeg.replace(/^@/, '').trim());
                const cleaned = normalizeName(name);
                if (cleaned && !/^(videos|about|playlists|community|channels|shorts)$/i.test(cleaned)) {
                    console.log('Derived channel name from URL handle (raw):', name, '=> cleaned:', cleaned);
                    return cleaned;
                }
            }

            // Look for /channel/<id>, /user/<name>, /c/<name>
            for (let i = 0; i < segments.length; i++) {
                const key = segments[i] && segments[i].toLowerCase();
                if ((key === 'channel' || key === 'user' || key === 'c') && segments[i + 1]) {
                    let name = segments[i + 1];
                    // Skip common subpaths
                    if (/^(videos|about|playlists|community|channels|shorts)$/i.test(name)) continue;
                    name = decodeURIComponent(name.replace(/^@/, '').trim());
                    // Replace separators with spaces for readability
                    name = name.replace(/[-_]+/g, ' ');
                    const cleaned = normalizeName(name);
                    if (cleaned) {
                        console.log('Derived channel name from URL segment (raw):', name, '=> cleaned:', cleaned);
                        return cleaned;
                    }
                }
            }
        } catch (e) {
            console.log('URL parse error', e);
        }

        // If nothing found, try to get any text that looks like a channel name
        const channelElements = document.querySelectorAll('[id*="channel"], [class*="channel"], [class*="owner"], [aria-label*="Channel"]');
        for (const element of channelElements) {
            const text = element.textContent && element.textContent.trim();
            if (text && text.length > 0 && text.length < 100 && !/suscriptor/i.test(text)) {
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