// ==UserScript==
// @name         YouTube Playlist Dialog Enhancer
// @namespace    http://tampermonkey.net/
// @author       JJJ
// @version      0.0.3
// @description  Adds a search bar to the YouTube "Save to playlist" dialog and auto-fills the channel name
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    let lastContextChannelName = null;

    GM_addStyle(`
        .yt-playlist-search-container {
            padding: 10px 24px;
            background-color: #2f2554;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            width: 100%;
            box-sizing: border-box;
            position: relative;
            z-index: 2;
        }
        .yt-playlist-search-input {
            width: 100%;
            padding: 8px 36px 8px 12px;
            background-color: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 4px;
            color: #fff;
            font-size: 14px;
            outline: none;
            box-sizing: border-box;
        }
        .yt-playlist-search-input:focus {
            background-color: rgba(255,255,255,0.15);
            border-color: rgba(255,255,255,0.35);
        }
        .yt-playlist-search-clear {
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
            line-height: 1;
        }
        .yt-playlist-search-clear:hover { color: #fff; }
    `);

    // ─── POSITION ───────────────────────────────────────────────────────────────

    let positionInterval = null;

    function forceDialogPosition() {
        document.querySelectorAll('tp-yt-iron-dropdown').forEach(dropdown => {
            if (!isPlaylistDropdown(dropdown)) return;

            const set = (k, v) => dropdown.style.setProperty(k, v, 'important');
            set('position', 'fixed');
            set('left', '50%');
            set('top', '50%');
            set('transform', 'translate(-50%, -50%)');
            set('max-width', '700px');
            set('width', '700px');
            set('min-width', '700px');
            set('margin', '0');
            set('z-index', '9999');

            [dropdown.querySelector('yt-sheet-view-model'), dropdown.querySelector('#contentWrapper')].forEach(el => {
                if (!el) return;
                el.style.setProperty('max-width', '700px', 'important');
                el.style.setProperty('width', '700px', 'important');
                el.style.setProperty('min-width', '700px', 'important');
            });

            const cs = dropdown.querySelector('yt-contextual-sheet-layout');
            if (cs) {
                cs.style.setProperty('max-width', '700px', 'important');
                cs.style.setProperty('width', '100%', 'important');
            }
        });
    }

    function startPositionWatcher() {
        if (positionInterval) return;
        forceDialogPosition();
        positionInterval = setInterval(forceDialogPosition, 50);
    }

    function stopPositionWatcher() {
        if (positionInterval) { clearInterval(positionInterval); positionInterval = null; }
    }

    function captureChannelFromActionTrigger(trigger) {
        if (!trigger || !trigger.closest) return;

        // Look around the clicked card/lockup where the 3-dots menu was opened.
        const container = trigger.closest(
            '.ytLockupViewModelMetadata, ytd-rich-item-renderer, ytd-rich-grid-media, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer'
        ) || trigger.parentElement;

        if (!container || !container.querySelector) return;

        const channelLink = container.querySelector(
            'a[href^="/@"], a[href*="/channel/"], a[href*="/user/"], a[href*="/c/"]'
        );
        const fromLink = channelLink?.textContent?.trim();

        if (fromLink) {
            lastContextChannelName = fromLink;
            return;
        }

        const avatarButton = container.querySelector('[aria-label^="Ir al canal"], [aria-label^="Go to channel"]');
        const label = avatarButton?.getAttribute('aria-label') || '';
        const match = label.match(/(?:Ir al canal|Go to channel)\s+(.+)/i);
        if (match?.[1]) {
            lastContextChannelName = match[1].trim();
        }
    }

    // ─── DETECTION ──────────────────────────────────────────────────────────────

    // A "playlist dropdown" must be the real Save-to-playlist panel,
    // not generic action/context menus.
    function getHeaderText(container) {
        const header = container.querySelector('yt-panel-header-view-model');
        if (!header) return '';

        const specific = header.querySelector('yt-formatted-string#title, [role="heading"], h1, h2, h3');
        return (specific?.textContent || header.textContent || '').trim().replace(/\s+/g, ' ');
    }

    function isSaveToHeader(text) {
        const t = (text || '').trim().toLowerCase();
        // Must match the actual playlist dialog header.
        return /^(guardar en|save to)\b/.test(t);
    }

    function isLikelyActionMenu(container) {
        const text = (container.textContent || '').toLowerCase();
        const keywords = [
            'añadir a la cola',
            'guardar para ver más tarde',
            'descargar',
            'compartir',
            'no me interesa',
            'no recomendarme este canal',
            'denunciar',
            'add to queue',
            'save to watch later',
            'download',
            'share',
            'not interested',
            'dont recommend channel',
            'report'
        ];
        let hits = 0;
        for (const kw of keywords) {
            if (text.includes(kw)) hits++;
            if (hits >= 2) return true;
        }
        return false;
    }

    function isPlaylistDropdown(el) {
        if (!el.querySelector('toggleable-list-item-view-model')) return false;
        if (isLikelyActionMenu(el)) return false;
        return isSaveToHeader(getHeaderText(el));
    }

    function isPlaylistSheet(sheet) {
        if (!sheet.querySelector('toggleable-list-item-view-model')) return false;
        if (isLikelyActionMenu(sheet)) return false;
        return isSaveToHeader(getHeaderText(sheet));
    }

    function cleanupMisplacedSearchBars(root = document) {
        const sheets = root.querySelectorAll
            ? root.querySelectorAll('yt-contextual-sheet-layout')
            : [];

        sheets.forEach(sheet => {
            const searchBar = sheet.querySelector('.yt-playlist-search-container');
            if (!searchBar) return;
            if (isPlaylistSheet(sheet)) return;

            searchBar.remove();
            console.log('[YT-Enhancer] Removed misplaced search bar');
        });
    }

    // ─── CHANNEL NAME ───────────────────────────────────────────────────────────

    function getChannelName() {
        function normalize(raw) {
            if (!raw) return null;
            let s = raw.trim().replace(/\s+/g, ' ');
            const parts = s.split(/[\u00B7\u2022|·•—]/).map(p => p.trim()).filter(Boolean);
            const bad = /suscripto|suscrib|videos?|vídeos?|subscrip|subscribers|views?|vistas?/i;
            let out = null;
            for (const p of parts) {
                if (bad.test(p)) continue;
                if (p.replace(/[0-9.,\sMKmk]+/g, '').trim().length >= 1) { out = p; break; }
            }
            if (!out) out = parts[0] || s;
            out = out.replace(/\b\d[0-9.,\s]*\s*[MKk]?\b(\s*(de)?\s*(suscriptores|subscribers|vistas|views))?/i, '')
                     .replace(/^@+/, '').trim();
            if (out.length > 60) out = out.split('\n')[0].split(',')[0].trim();
            return out || null;
        }

        function isGoodName(name) {
            if (!name) return false;
            const t = name.trim();
            if (!t) return false;
            if (/^(youtube|home|shorts|playlists?|videos?|inicio|explorar)$/i.test(t)) return false;
            if (/^[0-9.,\s]+$/.test(t)) return false;
            return true;
        }

        function tryNormalize(raw) {
            const n = normalize(raw);
            return isGoodName(n) ? n : null;
        }

        const contextName = tryNormalize(lastContextChannelName);
        if (contextName) return contextName;

        const selectors = [
            'ytd-tabbed-page-header h1.dynamicTextViewModelH1 > span.ytAttributedStringHost',
            'ytd-tabbed-page-header .ytPageHeaderViewModelTitle h1 > span.ytAttributedStringHost',
            'ytd-tabbed-page-header h1[aria-label] > span.ytAttributedStringHost',
            'ytd-tabbed-page-header h1.dynamicTextViewModelH1',
            'ytd-watch-metadata #owner ytd-channel-name a',
            'ytd-watch-metadata #owner a[href^="/@"]',
            'ytd-watch-metadata #owner a[href*="/channel/"]',
            'ytd-watch-metadata #channel-name a',
            'ytd-video-owner-renderer ytd-channel-name yt-formatted-string#text a',
            'ytd-video-owner-renderer ytd-channel-name yt-formatted-string#text',
            'ytd-video-owner-renderer yt-formatted-string#text a',
            'ytd-video-owner-renderer yt-formatted-string#text',
            'ytd-channel-name yt-formatted-string#text a',
            'ytd-channel-name yt-formatted-string#text',
            'ytd-c4-tabbed-header-renderer yt-formatted-string#text a',
            'ytd-c4-tabbed-header-renderer yt-formatted-string#text',
            '#channel-name yt-formatted-string#text a',
            '#channel-name yt-formatted-string#text',
        ];

        for (const sel of selectors) {
            try {
                const el = document.querySelector(sel);
                if (!el || !el.textContent.trim()) continue;
                if (el.tagName === 'A') {
                    const href = el.getAttribute('href') || '';
                    if (!/\/@|\/channel\/|\/user\/|\/c\//.test(href)) continue;
                    if (/^(videos?|vídeos?|inicio|shorts|about|playlists?)$/i.test(el.textContent.trim())) continue;
                }
                const name = tryNormalize(el.textContent.trim());
                if (name) return name;
            } catch (_) {}
        }

        // Fallback: pull owner name from watch metadata text when links/selectors shift.
        try {
            const owner = document.querySelector('ytd-watch-metadata #owner');
            if (owner) {
                const ownerName = owner.querySelector('#channel-name, ytd-channel-name, a[href^="/@"], a[href*="/channel/"]');
                const text = ownerName?.textContent?.trim() || owner.textContent?.trim();
                const normalized = tryNormalize(text);
                if (normalized) return normalized;
            }
        } catch (_) {}

        // Fallback: JSON-LD author metadata injected by YouTube.
        try {
            const authorMeta = document.querySelector('meta[itemprop="author"]');
            const content = authorMeta?.getAttribute('content');
            const normalized = tryNormalize(content);
            if (normalized) return normalized;
        } catch (_) {}

        // Fallback: watch page runtime objects.
        try {
            const data = window.ytInitialPlayerResponse
                || window.ytplayer?.config?.args?.raw_player_response
                || null;
            const raw = data?.videoDetails?.author
                || data?.microformat?.playerMicroformatRenderer?.ownerChannelName
                || null;
            const normalized = tryNormalize(raw);
            if (normalized) return normalized;
        } catch (_) {}

        // Fallback: currently visible video owner links (cards/feed/watch).
        try {
            const ownerLink = document.querySelector('a[href^="/@"][aria-label], ytd-video-owner-renderer a[href^="/@"], ytd-rich-grid-media a[href^="/@"]');
            const text = ownerLink?.textContent || ownerLink?.getAttribute('aria-label');
            const normalized = tryNormalize(text);
            if (normalized) return normalized;
        } catch (_) {}

        // Fallback: derive from channel handle in URL (/@handle).
        try {
            const match = window.location.pathname.match(/^\/@([^\/?#]+)/);
            if (match?.[1]) {
                const fromHandle = tryNormalize(match[1].replace(/[-_]+/g, ' '));
                if (fromHandle) return fromHandle;
            }
        } catch (_) {}

        // Fallback: OpenGraph title usually contains "ChannelName - YouTube".
        try {
            const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
            const raw = ogTitle ? ogTitle.replace(/\s*-\s*youtube\s*$/i, '').trim() : null;
            const normalized = tryNormalize(raw);
            if (normalized) return normalized;
        } catch (_) {}

        return null;
    }

    function resetSearchState(sheet, input, clearBtn) {
        input.value = '';
        clearBtn.style.display = 'none';
        filterPlaylists('', sheet);
    }

    function fillSearchWithChannel(sheet, input, clearBtn) {
        const name = getChannelName();
        if (!name) return false;
        input.value = name;
        clearBtn.style.display = 'block';
        filterPlaylists(name, sheet);
        return true;
    }

    // ─── SEARCH BAR ─────────────────────────────────────────────────────────────

    function addSearchBar(sheet) {
        // Guard: only real playlist sheets
        if (!isPlaylistSheet(sheet)) {
            console.log('[YT-Enhancer] Skipping non-playlist sheet');
            return;
        }

        const contentContainer = sheet.querySelector('.ytContextualSheetLayoutContentContainer');
        if (!contentContainer) {
            setTimeout(() => addSearchBar(sheet), 200);
            return;
        }

        startPositionWatcher();

        const existingContainer = contentContainer.querySelector(':scope > .yt-playlist-search-container')
            || sheet.querySelector('.yt-playlist-search-container');
        if (existingContainer) {
            const existingInput = existingContainer.querySelector('.yt-playlist-search-input');
            const existingClear = existingContainer.querySelector('.yt-playlist-search-clear');
            if (existingInput && existingClear) {
                resetSearchState(sheet, existingInput, existingClear);
                if (!fillSearchWithChannel(sheet, existingInput, existingClear)) {
                    setTimeout(() => fillSearchWithChannel(sheet, existingInput, existingClear), 400);
                }
            }
            return;
        }

        const container = document.createElement('div');
        container.className = 'yt-playlist-search-container';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'yt-playlist-search-input';
        input.placeholder = 'Search playlists...';
        input.autocomplete = 'off';
        input.spellcheck = false;

        const clearBtn = document.createElement('button');
        clearBtn.className = 'yt-playlist-search-clear';
        clearBtn.textContent = '✕';

        input.addEventListener('input', function () {
            clearBtn.style.display = this.value ? 'block' : 'none';
            filterPlaylists(this.value, sheet);
        });
        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            input.focus();
            filterPlaylists('', sheet);
        });

        container.appendChild(input);
        container.appendChild(clearBtn);
        contentContainer.prepend(container);

        // Fresh state every open.
        resetSearchState(sheet, input, clearBtn);
        if (!fillSearchWithChannel(sheet, input, clearBtn)) {
            setTimeout(() => {
                if (!fillSearchWithChannel(sheet, input, clearBtn)) {
                    console.log('[YT-Enhancer] Channel name not found, leaving empty');
                }
            }, 600);
        }

        input.focus();
        console.log('[YT-Enhancer] Search bar injected ✓');
    }

    function filterPlaylists(term, sheet) {
        const lower = term.toLowerCase();
        sheet.querySelectorAll('toggleable-list-item-view-model').forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(lower) ? '' : 'none';
        });
    }

    // ─── NEW PLAYLIST TITLE ──────────────────────────────────────────────────────

    function fillNewPlaylistTitle(dialog) {
        const textarea = dialog.querySelector('textarea.ytStandardsTextareaShapeTextarea');
        if (!textarea) return;

        // Remove old flag so we always re-fill on each open
        delete textarea.dataset.ytEnhancerFilled;

        function tryFill() {
            const name = getChannelName();
            if (!name) return false;
            textarea.value = name;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            const placeholder = dialog.querySelector('.ytStandardsTextareaShapePlaceholder');
            if (placeholder) placeholder.classList.remove('ytStandardsTextareaShapePlaceholderVisible');
            textarea.focus();
            return true;
        }
        if (!tryFill()) setTimeout(tryFill, 500);
    }

    // ─── OBSERVER ───────────────────────────────────────────────────────────────

    function checkNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        // If YouTube reuses the same panel for a different menu, remove stale UI.
        cleanupMisplacedSearchBars(node);

        // Playlist sheet added directly
        if (node.matches('yt-contextual-sheet-layout')) {
            if (node.querySelector('toggleable-list-item-view-model')) {
                setTimeout(() => addSearchBar(node), 80);
            }
            return;
        }

        if (node.querySelector) {
            // Playlist sheet nested inside added node (e.g. iron-dropdown)
            const sheet = node.querySelector('yt-contextual-sheet-layout');
            if (sheet && sheet.querySelector('toggleable-list-item-view-model')) {
                setTimeout(() => addSearchBar(sheet), 80);
            }

            // toggleable items added to existing sheet (YouTube lazy-fills)
            if (node.matches('toggleable-list-item-view-model') || node.querySelector('toggleable-list-item-view-model')) {
                const sheet = node.closest ? node.closest('yt-contextual-sheet-layout') : null;
                if (sheet && !sheet.querySelector('.yt-playlist-search-container')) {
                    setTimeout(() => addSearchBar(sheet), 80);
                }
            }

            // New playlist dialog
            const dialog = node.querySelector('yt-create-playlist-dialog-form-view-model');
            if (dialog) setTimeout(() => fillNewPlaylistTitle(dialog), 150);
        }

        if (node.matches('yt-dialog-view-model')) {
            const dialog = node.querySelector('yt-create-playlist-dialog-form-view-model');
            if (dialog) setTimeout(() => fillNewPlaylistTitle(dialog), 150);
        }
    }

    const observer = new MutationObserver((mutations) => {
        for (const { addedNodes, removedNodes } of mutations) {
            for (const node of addedNodes) checkNode(node);
            for (const node of removedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                if (node.matches('tp-yt-iron-dropdown') || node.matches('yt-contextual-sheet-layout')) {
                    if (!document.querySelector('toggleable-list-item-view-model')) stopPositionWatcher();
                }
            }
        }

        // Final safety pass per mutation batch.
        cleanupMisplacedSearchBars(document);
    });

    function init() {
        if (!document.body) { setTimeout(init, 100); return; }

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            const actionTrigger = target.closest(
                'button[aria-label*="Más acciones"], button[aria-label*="More actions"], button[aria-label*="acciones"], button[aria-label*="actions"]'
            );
            if (!actionTrigger) return;

            captureChannelFromActionTrigger(actionTrigger);
        }, true);

        observer.observe(document.body, { childList: true, subtree: true });
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

})();