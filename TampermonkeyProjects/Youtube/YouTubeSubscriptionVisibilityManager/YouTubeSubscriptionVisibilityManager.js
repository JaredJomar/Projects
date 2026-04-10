// ==UserScript==
// @name         YouTube Subscription Visibility Manager
// @namespace    http://tampermonkey.net/
// @author       JJJ
// @version      0.1.3  
// @description  Control which subscribed channels are visible in the YouTube subscriptions feed without unsubscribing.
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    const Config = {
        appName: 'YT Subscription Visibility Manager',
        version: '0.1.3',
        storageKey: 'ytsvm_data_v013',

        routes: {
            subscriptions: '/feed/subscriptions'
        },

        oauth: {
            gisScriptSrc: 'https://accounts.google.com/gsi/client',
            tokenScope: 'https://www.googleapis.com/auth/youtube.readonly'
        },

        api: {
            youtubeBaseUrl: 'https://www.googleapis.com/youtube/v3',
            maxResultsPerPage: 50
        },

        settings: {
            defaultStateForNewChannels: false,
            sortMode: 'enabled-first-alphabetical',
            debug: false,
            oauthClientId: ''
        },

        auth: {
            isConnected: false,
            provider: 'google',
            lastSyncAt: 0,
            lastSyncStatus: 'Never synced',
            accessToken: '',
            tokenExpiresAt: 0
        },

        ui: {
            styleId: 'ytsvm-style',
            modalId: 'ytsvm-modal',
            overlayId: 'ytsvm-overlay',
            hiddenClass: 'ytsvm-hidden-card'
        },

        scan: {
            debounceMs: 140,
            minRefreshIntervalMs: 450,
            passiveRefreshIntervalMs: 1800,
            skipPassiveRefreshWhileScrollingMs: 900,
            fullRefreshDelayMs: 900,
            applyBatchSize: 28,
            batchSize: 25,
            batchDelayMs: 20
        },

        selectors: {
            subscriptionCards: [
                'ytd-rich-item-renderer',
                'ytd-rich-grid-media',
                'ytd-grid-video-renderer',
                'ytd-video-renderer',
                'ytd-compact-video-renderer'
            ].join(','),

            channelLinkCandidates: [
                '#channel-name a[href]',
                'ytd-channel-name a[href]',
                '#byline-container a[href]',
                '#metadata-line a[href]',
                '#text-container a[href]',
                'a[href^="/@"]',
                'a[href^="/channel/"]',
                'a[href^="/c/"]',
                'a[href^="/user/"]',
                'a.yt-simple-endpoint.style-scope.yt-formatted-string[href^="/@"]',
                'a.yt-simple-endpoint.style-scope.yt-formatted-string[href^="/channel/"]',
                'a.yt-simple-endpoint.style-scope.yt-formatted-string[href^="/c/"]',
                'a.yt-simple-endpoint.style-scope.yt-formatted-string[href^="/user/"]'
            ],

            channelNameCandidates: [
                '#channel-name',
                'ytd-channel-name',
                '#text.ytd-channel-name',
                'yt-formatted-string#text.style-scope.ytd-channel-name'
            ]
        }
    };

    const AppState = {
        initialized: false,
        channels: {},
        settings: { ...Config.settings },
        auth: { ...Config.auth },
        observer: null,
        modalOpen: false,
        lastUrl: location.href,
        activeTab: 'all',
        searchTerm: '',
        isScanning: false,
        isSyncing: false,
        isConnecting: false,
        gisLoaded: false,
        tokenClient: null,
        lastContextMenuCard: null,
        lastContextVideoId: '',
        lastContextChannelDataList: [],
        lastMenuDisableActionAt: 0,
        bulkEnableSnapshot: [],
        settingsDraft: {
            oauthClientId: '',
            defaultStateForNewChannels: false,
            debug: false
        },
        lastRefreshAt: 0,
        lastPassiveRefreshAt: 0,
        lastScrollActivityAt: 0,
        scanProgress: {
            current: 0,
            total: 0,
            found: 0,
            updated: 0
        },
        syncProgress: {
            current: 0,
            total: 0,
            imported: 0,
            updated: 0
        }
    };

    const Logger = {
        log(...args) {
            if (AppState.settings.debug) {
                console.log(`[${Config.appName}]`, ...args);
            }
        },
        warn(...args) {
            console.warn(`[${Config.appName}]`, ...args);
        },
        error(...args) {
            console.error(`[${Config.appName}]`, ...args);
        }
    };

    const Utils = {
        debounce(fn, wait = 200) {
            let timeout = null;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => fn.apply(this, args), wait);
            };
        },

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        now() {
            return Date.now();
        },

        normalizeText(value) {
            return (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
        },

        safeQuery(root, selector) {
            try {
                return root.querySelector(selector);
            } catch (error) {
                return null;
            }
        },

        safeQueryAll(root, selector) {
            try {
                return Array.from(root.querySelectorAll(selector));
            } catch (error) {
                return [];
            }
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text ?? '';
            return div.innerHTML;
        },

        createElement(tag, options = {}) {
            const el = document.createElement(tag);

            if (options.id) el.id = options.id;
            if (options.className) el.className = options.className;
            if (options.text) el.textContent = options.text;
            if (options.html) el.innerHTML = options.html;

            if (options.attrs) {
                for (const [key, value] of Object.entries(options.attrs)) {
                    el.setAttribute(key, value);
                }
            }

            return el;
        },

        isSubscriptionsPage() {
            return location.pathname === Config.routes.subscriptions;
        },

        parseChannelUrl(url) {
            try {
                const parsed = new URL(url, location.origin);
                return parsed.pathname || '';
            } catch (error) {
                return '';
            }
        },

        extractChannelIdFromUrl(url) {
            const path = this.parseChannelUrl(url);
            const match = path.match(/^\/channel\/([^/]+)/i);
            return match ? match[1] : '';
        },

        extractHandleFromUrl(url) {
            const path = this.parseChannelUrl(url);
            const match = path.match(/^\/(@[^/]+)/i);
            return match ? match[1] : '';
        },

        formatDateTime(timestamp) {
            if (!timestamp) return 'Never';
            try {
                return new Date(timestamp).toLocaleString();
            } catch (error) {
                return 'Invalid date';
            }
        },

        isTypingTarget(target) {
            if (!target) return false;
            const tag = (target.tagName || '').toLowerCase();
            return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
        },

        getGoogleObject() {
            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.google) {
                return unsafeWindow.google;
            }

            if (window.google) {
                return window.google;
            }

            return null;
        },

        getTokenExpiryBufferMs() {
            return 60 * 1000;
        },

        isValidClientId(value) {
            return /^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test((value || '').trim());
        },

        downloadTextFile(filename, text, mimeType = 'application/json') {
            const blob = new Blob([text], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        },

        stopScrollChaining(element) {
            if (!element) return;

            const preventPageScroll = (event) => {
                const delta = event.deltaY;
                const canScroll = element.scrollHeight > element.clientHeight;

                if (!canScroll) {
                    event.preventDefault();
                    return;
                }

                const atTop = element.scrollTop <= 0;
                const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;

                if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
                    event.preventDefault();
                }

                event.stopPropagation();
            };

            element.addEventListener('wheel', preventPageScroll, { passive: false });
            element.addEventListener('touchmove', (event) => {
                event.stopPropagation();
            }, { passive: false });
        },

        deepMerge(target, source) {
            const output = { ...target };
            for (const [key, value] of Object.entries(source || {})) {
                if (
                    value &&
                    typeof value === 'object' &&
                    !Array.isArray(value) &&
                    typeof output[key] === 'object' &&
                    output[key] !== null &&
                    !Array.isArray(output[key])
                ) {
                    output[key] = this.deepMerge(output[key], value);
                } else {
                    output[key] = value;
                }
            }
            return output;
        }
    };

    const Storage = {
        load() {
            try {
                const raw = localStorage.getItem(Config.storageKey);


                if (!raw) {
                    const legacyKeys = ['ytsvm_data_v012', 'ytsvm_data_v011', 'ytsvm_data_v020', 'ytsvm_data_v010'];
                    let oldRaw = null;
                    let foundKey = '';
                    for (const lk of legacyKeys) {
                        const candidate = localStorage.getItem(lk);
                        if (candidate) { oldRaw = candidate; foundKey = lk; break; }
                    }
                    if (oldRaw) {
                        try {
                            const oldParsed = JSON.parse(oldRaw);
                            AppState.channels = oldParsed.channels || {};
                            AppState.settings = { ...Config.settings, ...(oldParsed.settings || {}) };
                            AppState.auth = { ...Config.auth, ...(oldParsed.auth || {}) };
                            Logger.log(`Migrated data from ${foundKey}.`);
                            this.save();
                        } catch (migErr) {
                            Logger.warn(`Migration from ${foundKey} failed.`, migErr);
                        }
                    }
                    return;
                }

                const parsed = JSON.parse(raw);

                AppState.channels = parsed.channels || {};
                AppState.settings = {
                    ...Config.settings,
                    ...(parsed.settings || {})
                };
                AppState.auth = {
                    ...Config.auth,
                    ...(parsed.auth || {})
                };
            } catch (error) {
                Logger.error('Failed to load storage.', error);
            }
        },

        save() {
            try {
                const payload = {
                    channels: AppState.channels,
                    settings: AppState.settings,
                    auth: AppState.auth
                };

                localStorage.setItem(Config.storageKey, JSON.stringify(payload));
            } catch (error) {
                Logger.error('Failed to save storage.', error);
            }
        },

        exportData() {
            return {
                version: Config.version,
                exportedAt: Utils.now(),
                channels: AppState.channels,
                settings: {
                    ...AppState.settings,
                    oauthClientId: AppState.settings.oauthClientId || ''
                },
                auth: {
                    ...AppState.auth,
                    accessToken: '',
                    tokenExpiresAt: 0,
                    isConnected: false
                }
            };
        },

        importData(imported) {
            const mergedSettings = Utils.deepMerge(Config.settings, imported.settings || {});
            const mergedAuth = Utils.deepMerge(Config.auth, imported.auth || {});


            const rawChannels = imported.channels || {};
            const sanitized = {};
            for (const [k, ch] of Object.entries(rawChannels)) {
                if (!ch || typeof ch !== 'object') continue;
                const entry = { ...ch };
                if (!entry.key) entry.key = k;
                sanitized[entry.key] = entry;
            }

            AppState.channels = sanitized;
            AppState.settings = mergedSettings;
            AppState.auth = {
                ...mergedAuth,
                accessToken: '',
                tokenExpiresAt: 0,
                isConnected: false,
                lastSyncStatus: imported?.auth?.lastSyncStatus || 'Imported data'
            };

            ChannelStore.rebuildIndexes();

            Storage.save();
        }
    };

    const ChannelStore = {
        indexes: {
            byId: new Map(),
            byHandle: new Map(),
            byPath: new Map(),
            byTitle: new Map()
        },

        normalizeHandle(value) {
            const raw = String(value || '').trim();
            if (!raw) return '';
            return raw.replace(/^@/, '').toLowerCase();
        },

        addToIndex(index, token, key) {
            if (!token || !key) return;

            let bucket = index.get(token);
            if (!bucket) {
                bucket = new Set();
                index.set(token, bucket);
            }

            bucket.add(key);
        },

        removeFromIndex(index, token, key) {
            if (!token || !key) return;

            const bucket = index.get(token);
            if (!bucket) return;

            bucket.delete(key);
            if (bucket.size === 0) {
                index.delete(token);
            }
        },

        getIndexTokens(channelData = {}) {
            return {
                id: channelData.id || '',
                handle: this.normalizeHandle(channelData.handle || Utils.extractHandleFromUrl(channelData.url || '')),
                path: Utils.parseChannelUrl(channelData.url || ''),
                title: Utils.normalizeText(channelData.title || '')
            };
        },

        getFirstIndexedKey(index, token) {
            if (!token) return '';
            const bucket = index.get(token);
            if (!bucket || bucket.size === 0) return '';
            return bucket.values().next().value || '';
        },

        rebuildIndexes() {
            this.indexes.byId.clear();
            this.indexes.byHandle.clear();
            this.indexes.byPath.clear();
            this.indexes.byTitle.clear();

            for (const [key, channel] of Object.entries(AppState.channels)) {
                const tokens = this.getIndexTokens(channel);
                this.addToIndex(this.indexes.byId, tokens.id, key);
                this.addToIndex(this.indexes.byHandle, tokens.handle, key);
                this.addToIndex(this.indexes.byPath, tokens.path, key);
                this.addToIndex(this.indexes.byTitle, tokens.title, key);
            }
        },

        reindexChannelKey(key, previousData = null) {
            const current = AppState.channels[key];
            if (!current) return;

            if (previousData) {
                const previousTokens = this.getIndexTokens(previousData);
                this.removeFromIndex(this.indexes.byId, previousTokens.id, key);
                this.removeFromIndex(this.indexes.byHandle, previousTokens.handle, key);
                this.removeFromIndex(this.indexes.byPath, previousTokens.path, key);
                this.removeFromIndex(this.indexes.byTitle, previousTokens.title, key);
            }

            const tokens = this.getIndexTokens(current);
            this.addToIndex(this.indexes.byId, tokens.id, key);
            this.addToIndex(this.indexes.byHandle, tokens.handle, key);
            this.addToIndex(this.indexes.byPath, tokens.path, key);
            this.addToIndex(this.indexes.byTitle, tokens.title, key);
        },

        findExistingChannelKey(channelData = {}) {
            const tokens = this.getIndexTokens(channelData);
            const indexedIdKey = this.getFirstIndexedKey(this.indexes.byId, tokens.id);
            if (indexedIdKey) return indexedIdKey;

            const indexedHandleKey = this.getFirstIndexedKey(this.indexes.byHandle, tokens.handle);
            if (indexedHandleKey) return indexedHandleKey;

            const indexedPathKey = this.getFirstIndexedKey(this.indexes.byPath, tokens.path);
            if (indexedPathKey) return indexedPathKey;

            const indexedTitleKey = this.getFirstIndexedKey(this.indexes.byTitle, tokens.title);
            if (indexedTitleKey) return indexedTitleKey;

            return '';
        },

        findAliasKeys(channelKey) {
            const anchor = AppState.channels[channelKey];
            if (!anchor) return [];

            const anchorId = anchor.id || '';
            const anchorHandle = this.normalizeHandle(anchor.handle || Utils.extractHandleFromUrl(anchor.url || ''));
            const anchorPath = Utils.parseChannelUrl(anchor.url || '');

            const aliases = [];

            for (const [key, item] of Object.entries(AppState.channels)) {
                if (key === channelKey) continue;

                const sameId = Boolean(anchorId && item?.id && item.id === anchorId);
                const itemHandle = this.normalizeHandle(item?.handle || Utils.extractHandleFromUrl(item?.url || ''));
                const sameHandle = Boolean(anchorHandle && itemHandle && itemHandle === anchorHandle);
                const itemPath = Utils.parseChannelUrl(item?.url || '');
                const samePath = Boolean(anchorPath && itemPath && itemPath === anchorPath);

                if (sameId || sameHandle || samePath) {
                    aliases.push(key);
                }
            }

            return aliases;
        },

        createChannelKey(channelData) {
            if (channelData.id) return `yt:${channelData.id}`;

            const path = Utils.parseChannelUrl(channelData.url || '');
            if (path) return `url:${path}`;

            return `title:${Utils.normalizeText(channelData.title || 'unknown channel')}`;
        },

        ensureChannel(channelData = {}) {
            const normalized = {
                id: channelData.id || Utils.extractChannelIdFromUrl(channelData.url || ''),
                handle: channelData.handle || Utils.extractHandleFromUrl(channelData.url || ''),
                title: channelData.title || 'Unknown Channel',
                url: channelData.url || '',
                source: channelData.source || 'scan'
            };

            const existingKey = this.findExistingChannelKey(normalized);
            const key = existingKey || this.createChannelKey(normalized);
            let wasCreated = false;
            let wasUpdated = false;

            if (!AppState.channels[key]) {
                AppState.channels[key] = {
                    key,
                    id: normalized.id,
                    handle: normalized.handle,
                    title: normalized.title,
                    url: normalized.url,
                    enabled: AppState.settings.defaultStateForNewChannels,
                    source: normalized.source,
                    addedAt: Utils.now(),
                    updatedAt: Utils.now()
                };
                this.reindexChannelKey(key);
                wasCreated = true;
            } else {
                const existing = AppState.channels[key];
                const fieldsToUpdate = ['id', 'handle', 'title', 'url', 'source'];
                const previousData = {
                    id: existing.id,
                    handle: existing.handle,
                    title: existing.title,
                    url: existing.url
                };

                for (const field of fieldsToUpdate) {
                    if (normalized[field] && existing[field] !== normalized[field]) {
                        existing[field] = normalized[field];
                        wasUpdated = true;
                    }
                }

                if (wasUpdated) {
                    existing.updatedAt = Utils.now();
                    this.reindexChannelKey(key, previousData);
                }
            }

            return { key, wasCreated, wasUpdated };
        },

        setEnabled(channelKey, enabled) {
            const primary = AppState.channels[channelKey];
            if (!primary) return;

            const targetState = Boolean(enabled);
            const keysToUpdate = [channelKey, ...this.findAliasKeys(channelKey)];
            let changed = 0;

            for (const key of keysToUpdate) {
                const item = AppState.channels[key];
                if (!item) continue;

                if (item.enabled !== targetState) {
                    item.enabled = targetState;
                    item.updatedAt = Utils.now();
                    changed += 1;
                }
            }

            if (changed > 0) {
                Storage.save();
            }
        },

        setEnabledMany(channelKeys, enabled) {
            let changed = 0;

            for (const key of channelKeys) {
                const item = AppState.channels[key];
                if (!item) continue;

                if (item.enabled !== Boolean(enabled)) {
                    item.enabled = Boolean(enabled);
                    item.updatedAt = Utils.now();
                    changed += 1;
                }
            }

            if (changed > 0) {
                Storage.save();
            }

            return changed;
        },

        getAllChannels() {
            const list = Object.values(AppState.channels);

            list.sort((a, b) => {
                if (AppState.settings.sortMode === 'enabled-first-alphabetical' && a.enabled !== b.enabled) {
                    return a.enabled ? -1 : 1;
                }
                return a.title.localeCompare(b.title);
            });

            return list;
        },

        getByTab(tabName) {
            const all = this.getAllChannels();

            if (tabName === 'enabled') return all.filter(item => item.enabled);
            if (tabName === 'disabled') return all.filter(item => !item.enabled);
            return all;
        },

        getCounts() {
            const all = this.getAllChannels();
            return {
                all: all.length,
                enabled: all.filter(item => item.enabled).length,
                disabled: all.filter(item => !item.enabled).length
            };
        }
    };

    const YouTubeDOM = {
        isLikelyChannelPath(path) {
            return /^\/(?:@|channel\/|c\/|user\/)/i.test(path || '');
        },

        findBestChannelLinkInCard(card) {
            const anchors = Utils.safeQueryAll(card, 'a[href]');

            for (const anchor of anchors) {
                const href = anchor.getAttribute('href') || anchor.href || '';
                const path = Utils.parseChannelUrl(href);
                if (!this.isLikelyChannelPath(path)) continue;

                const text = (anchor.textContent || '').trim();
                if (text || path) {
                    return anchor;
                }
            }

            return null;
        },

        extractChannelTitleFromCard(card) {
            for (const selector of Config.selectors.channelNameCandidates) {
                const node = Utils.safeQuery(card, selector);
                const text = (node?.textContent || '').trim();
                if (text) return text;
            }

            const fallbackTextNodes = Utils.safeQueryAll(card, 'a, span, yt-formatted-string');
            for (const node of fallbackTextNodes) {
                const text = (node?.textContent || '').trim();
                if (!text) continue;
                if (text.toLowerCase() === 'en directo') continue;
                if (text.length < 2) continue;

                if (text.startsWith('@')) return text;
            }

            return '';
        },

        getSubscriptionCards() {
            if (!Utils.isSubscriptionsPage()) return [];
            return Utils.safeQueryAll(document, Config.selectors.subscriptionCards);
        },

        extractChannelDataFromCard(card) {
            let linkEl = null;

            for (const selector of Config.selectors.channelLinkCandidates) {
                linkEl = Utils.safeQuery(card, selector);
                if (linkEl) break;
            }

            if (!linkEl) {
                linkEl = this.findBestChannelLinkInCard(card);
            }

            const fallbackTitle = this.extractChannelTitleFromCard(card);

            if (!linkEl && !fallbackTitle) return null;

            const title = (linkEl?.textContent || '').trim() || fallbackTitle;
            const url = linkEl?.href || '';

            if (!title && !url) return null;

            return {
                id: Utils.extractChannelIdFromUrl(url),
                handle: Utils.extractHandleFromUrl(url),
                title: title || 'Unknown Channel',
                url,
                source: 'scan'
            };
        },

        extractAllChannelDataFromCard(card) {
            const result = [];
            const seen = new Set();


            const seenEls = new Set();
            const candidateLinks = [];


            for (const selector of Config.selectors.channelLinkCandidates) {
                for (const linkEl of Utils.safeQueryAll(card, selector)) {
                    if (seenEls.has(linkEl)) continue;
                    seenEls.add(linkEl);
                    candidateLinks.push(linkEl);
                }
            }


            for (const linkEl of Utils.safeQueryAll(card, 'a[href]')) {
                if (seenEls.has(linkEl)) continue;
                const path = Utils.parseChannelUrl(linkEl?.href || '');
                if (!this.isLikelyChannelPath(path)) continue;
                seenEls.add(linkEl);
                candidateLinks.push(linkEl);
            }

            for (const linkEl of candidateLinks) {
                const url = linkEl?.href || '';
                const path = Utils.parseChannelUrl(url);
                if (!this.isLikelyChannelPath(path)) continue;

                const title = (linkEl?.textContent || '').trim();
                const item = {
                    id: Utils.extractChannelIdFromUrl(url),
                    handle: Utils.extractHandleFromUrl(url),
                    title: title || this.extractChannelTitleFromCard(card) || 'Unknown Channel',
                    url,
                    source: 'scan'
                };

                const token = item.id || item.handle || path || Utils.normalizeText(item.title);
                if (!token || seen.has(token)) continue;

                seen.add(token);
                result.push(item);
            }

            if (result.length === 0) {
                const bylineText = Utils.safeQuery(card, '#byline-container, #metadata-line, #channel-name, ytd-channel-name, #text-container')?.textContent || '';
                const normalizedByline = bylineText
                    .replace(/\s+/g, ' ')
                    .replace(/\s+y\s+/gi, ' | ')
                    .replace(/\s+and\s+/gi, ' | ')
                    .replace(/\s*&\s*/g, ' | ')
                    .replace(/\s*,\s*/g, ' | ')
                    .trim();

                if (normalizedByline) {
                    const parts = normalizedByline.split('|').map(part => part.trim()).filter(Boolean);
                    for (const part of parts) {
                        const fallbackKey = ChannelStore.findExistingChannelKey({ title: part });
                        const fallbackChannel = fallbackKey ? AppState.channels[fallbackKey] : null;

                        const item = {
                            id: fallbackChannel?.id || '',
                            handle: fallbackChannel?.handle || '',
                            title: fallbackChannel?.title || part,
                            url: fallbackChannel?.url || '',
                            source: 'scan'
                        };

                        const token = item.id || item.handle || Utils.parseChannelUrl(item.url) || Utils.normalizeText(item.title);
                        if (!token || seen.has(token)) continue;

                        seen.add(token);
                        result.push(item);
                    }
                }
            }

            if (result.length === 0) {
                const single = this.extractChannelDataFromCard(card);
                if (single) result.push(single);
            }

            return result;
        },

        extractVideoIdFromCard(card) {
            const videoLink = Utils.safeQuery(card, 'a#thumbnail[href*="watch?v="], a[href*="watch?v="]');
            const href = videoLink?.getAttribute('href') || videoLink?.href || '';
            if (!href) return '';

            try {
                const parsed = new URL(href, location.origin);
                return parsed.searchParams.get('v') || '';
            } catch (error) {
                const match = href.match(/[?&]v=([^&#]+)/i);
                return match ? match[1] : '';
            }
        },

        isLikelyNonSubscriptionCard(card) {
            if (!card) return false;

            if (card.matches('ytd-promoted-video-renderer, ytd-display-ad-renderer, ytd-ad-slot-renderer')) {
                return true;
            }

            const badgeNode = Utils.safeQuery(
                card,
                '#badge, ytd-badge-supported-renderer, [aria-label*="Recommended"], [aria-label*="Recomendado"], [aria-label*="Sponsored"], [aria-label*="Patrocinado"]'
            );
            const badgeText = Utils.normalizeText(badgeNode?.textContent || '');

            if (!badgeText) return false;

            const markers = [
                'recommended',
                'recomendado',
                'for you',
                'para ti',
                'sponsored',
                'patrocinado',
                'promoted'
            ];

            return markers.some(marker => badgeText.includes(marker));
        }
    };

    const FilterEngine = {
        pendingPriorityCards: [],
        pendingDeferredCards: [],
        queuedCards: new Set(),
        queueRunning: false,
        hasPendingStorageSave: false,
        hasPendingUiRefresh: false,

        getPendingCount() {
            return this.pendingPriorityCards.length + this.pendingDeferredCards.length;
        },

        getCurrentBatchSize() {
            const queued = this.getPendingCount();
            if (queued > 260) return 64;
            if (queued > 140) return 44;
            return Config.scan.applyBatchSize;
        },

        markDuplicateCards(cards) {
            const seenVideoIds = new Set();

            for (const card of cards) {
                if (!card) continue;

                const videoId = YouTubeDOM.extractVideoIdFromCard(card);
                if (!videoId) {
                    delete card.dataset.ytsvmDuplicate;
                    continue;
                }

                if (seenVideoIds.has(videoId)) {
                    card.dataset.ytsvmDuplicate = '1';
                } else {
                    seenVideoIds.add(videoId);
                    delete card.dataset.ytsvmDuplicate;
                }
            }
        },

        resolveKnownChannelForCard(card) {
            const cachedKeysRaw = card?.dataset?.ytsvmChannelKeys || '';
            if (cachedKeysRaw) {
                try {
                    const cachedKeys = JSON.parse(cachedKeysRaw);
                    if (Array.isArray(cachedKeys) && cachedKeys.length > 0) {
                        for (const key of cachedKeys) {
                            if (!AppState.channels[key]) {
                                return null;
                            }
                        }

                        const allEnabled = cachedKeys.every(key => Boolean(AppState.channels[key]?.enabled));
                        return { enabled: allEnabled };
                    }
                } catch (error) {}
            }

            const quickLink = Utils.safeQuery(card, 'a[href^="/@"],a[href^="/channel/"],a[href^="/c/"],a[href^="/user/"]');
            const quickUrl = quickLink?.href || '';
            if (!quickUrl) return null;

            const quickKey = ChannelStore.findExistingChannelKey({
                id: Utils.extractChannelIdFromUrl(quickUrl),
                handle: Utils.extractHandleFromUrl(quickUrl),
                url: quickUrl,
                title: ''
            });

            if (!quickKey || !AppState.channels[quickKey]) return null;
            return AppState.channels[quickKey];
        },

        getQueuePriority(card) {
            const knownChannel = this.resolveKnownChannelForCard(card);
            if (!knownChannel) return 'high';
            return knownChannel.enabled ? 'high' : 'low';
        },

        applyCardVisibility(card, channel) {
            if (!card || !channel) return;

            const shouldHide = !channel.enabled;
            const visibilityMark = shouldHide ? 'hidden' : 'visible';

            if (card.dataset.ytsvmVisibility === visibilityMark) {
                return;
            }

            card.classList.toggle(Config.ui.hiddenClass, shouldHide);
            card.dataset.ytsvmVisibility = visibilityMark;


            if (shouldHide) {
                card.dataset.ytsvmHiddenBy = channel.title || channel.key || 'unknown';
            } else {
                delete card.dataset.ytsvmHiddenBy;
            }
        },


        processCard(card) {
            if (!Utils.isSubscriptionsPage()) return false;


            if (YouTubeDOM.isLikelyNonSubscriptionCard(card)) {
                card.classList.add(Config.ui.hiddenClass);
                card.dataset.ytsvmVisibility = 'hidden';
                return false;
            }


            if (card?.dataset?.ytsvmDuplicate === '1') {
                card.classList.add(Config.ui.hiddenClass);
                card.dataset.ytsvmVisibility = 'hidden';
                return false;
            }

            let channelKeys = [];
            let changed = false;


            const cachedKeysRaw = card?.dataset?.ytsvmChannelKeys || '';
            if (cachedKeysRaw) {
                try {
                    const cachedKeys = JSON.parse(cachedKeysRaw);
                    if (Array.isArray(cachedKeys) && cachedKeys.length > 0) {
                        channelKeys = cachedKeys.filter(key => AppState.channels[key]);
                    }
                } catch (error) {}
            }

            if (channelKeys.length === 0) {
                const channelItems = YouTubeDOM.extractAllChannelDataFromCard(card);


                if (!Array.isArray(channelItems) || channelItems.length === 0) {
                    card.classList.add(Config.ui.hiddenClass);
                    card.dataset.ytsvmVisibility = 'hidden';
                    return false;
                }

                const unique = new Set();
                for (const channelData of channelItems) {
                    const result = ChannelStore.ensureChannel(channelData);
                    if (result.wasCreated || result.wasUpdated) {
                        changed = true;
                    }
                    if (result.key && AppState.channels[result.key] && !unique.has(result.key)) {
                        unique.add(result.key);
                        channelKeys.push(result.key);
                    }
                }


                if (channelKeys.length === 0) {
                    card.classList.add(Config.ui.hiddenClass);
                    card.dataset.ytsvmVisibility = 'hidden';
                    return changed;
                }

                card.dataset.ytsvmChannelKeys = JSON.stringify(channelKeys);
                card.dataset.ytsvmChannelKey = channelKeys[0];
            }


            const allEnabled = channelKeys.every(key => Boolean(AppState.channels[key]?.enabled));
            card.classList.toggle(Config.ui.hiddenClass, !allEnabled);
            card.dataset.ytsvmVisibility = allEnabled ? 'visible' : 'hidden';

            return changed;
        },

        enqueueCards(cards) {
            for (const card of cards) {
                if (!card || this.queuedCards.has(card)) continue;
                this.queuedCards.add(card);

                if (this.getQueuePriority(card) === 'low') {
                    this.pendingDeferredCards.push(card);
                } else {
                    this.pendingPriorityCards.push(card);
                }
            }
            this.startQueue();
        },

        startQueue() {
            if (this.queueRunning) return;

            this.queueRunning = true;

            const runBatch = () => {
                if (!Utils.isSubscriptionsPage()) {
                    this.pendingPriorityCards = [];
                    this.pendingDeferredCards = [];
                    this.queuedCards.clear();
                    this.queueRunning = false;
                    this.hasPendingStorageSave = false;
                    this.hasPendingUiRefresh = false;
                    return;
                }

                let processed = 0;
                const batchSize = this.getCurrentBatchSize();

                while (processed < batchSize && this.getPendingCount() > 0) {
                    const card = this.pendingPriorityCards.length > 0
                        ? this.pendingPriorityCards.shift()
                        : this.pendingDeferredCards.shift();
                    this.queuedCards.delete(card);

                    if (!card || !card.isConnected) {
                        processed += 1;
                        continue;
                    }

                    if (this.processCard(card)) {
                        this.hasPendingStorageSave = true;
                        this.hasPendingUiRefresh = true;
                    }

                    processed += 1;
                }

                if (this.getPendingCount() > 0) {
                    requestAnimationFrame(runBatch);
                    return;
                }

                this.queueRunning = false;

                if (this.hasPendingStorageSave) {
                    Storage.save();
                }

                if (this.hasPendingUiRefresh && AppState.modalOpen && AppState.activeTab !== 'settings') {
                    UI.renderActiveTab();
                }

                this.hasPendingStorageSave = false;
                this.hasPendingUiRefresh = false;
            };

            requestAnimationFrame(runBatch);
        },

        refreshVisibleCards() {
            if (!Utils.isSubscriptionsPage()) return false;

            const cards = YouTubeDOM.getSubscriptionCards();
            this.markDuplicateCards(cards);
            this.enqueueCards(cards);

            return true;
        },

        refreshVisibleCardsWithRetry() {
            if (!Utils.isSubscriptionsPage()) return false;

            this.refreshVisibleCards();

            setTimeout(() => {
                if (!Utils.isSubscriptionsPage()) return;
                if (AppState.isScanning || AppState.isSyncing || AppState.isConnecting) return;
                this.refreshVisibleCards();
            }, 180);

            return true;
        }
    };

    const ScanManager = {
        debouncedRefresh: null,

        registerScrollActivity() {
            AppState.lastScrollActivityAt = Utils.now();
        },

        initScrollActivityTracking() {
            const onScrollActivity = () => this.registerScrollActivity();

            window.addEventListener('scroll', onScrollActivity, { passive: true, capture: true });
            window.addEventListener('wheel', onScrollActivity, { passive: true, capture: true });
            window.addEventListener('touchmove', onScrollActivity, { passive: true, capture: true });
        },

        isUserActivelyScrolling() {
            return (Utils.now() - AppState.lastScrollActivityAt) < Config.scan.skipPassiveRefreshWhileScrollingMs;
        },

        init() {
            this.debouncedRefresh = Utils.debounce(() => {
                if (AppState.isScanning || AppState.isSyncing || AppState.isConnecting) return;
                if (AppState.activeTab === 'settings' && AppState.modalOpen) return;

                const now = Utils.now();
                if (now - AppState.lastRefreshAt < Config.scan.minRefreshIntervalMs) return;
                AppState.lastRefreshAt = now;

                FilterEngine.refreshVisibleCards();
            }, Config.scan.debounceMs);

            this.initScrollActivityTracking();
        },

        scheduleRefresh() {
            if (!Utils.isSubscriptionsPage()) return;
            if (AppState.isScanning || AppState.isSyncing || AppState.isConnecting) return;
            if (AppState.activeTab === 'settings' && AppState.modalOpen) return;
            this.debouncedRefresh();
        },

        passiveRefreshTick(force = false) {
            if (!Utils.isSubscriptionsPage()) return;
            if (AppState.isScanning || AppState.isSyncing || AppState.isConnecting) return;
            if (!force && this.isUserActivelyScrolling()) return;

            const now = Utils.now();
            if (!force && (now - AppState.lastPassiveRefreshAt < Config.scan.passiveRefreshIntervalMs)) {
                return;
            }

            AppState.lastPassiveRefreshAt = now;
            FilterEngine.refreshVisibleCards();
        },

        resetProgress(total = 0) {
            AppState.scanProgress = {
                current: 0,
                total,
                found: 0,
                updated: 0
            };
            UI.renderStatusBar();
        },

        async scanCurrentSubscriptionsPage() {
            if (!Utils.isSubscriptionsPage()) return false;
            if (AppState.isScanning || AppState.isSyncing || AppState.isConnecting) return false;

            const cards = YouTubeDOM.getSubscriptionCards();
            AppState.isScanning = true;
            this.resetProgress(cards.length);
            UI.setActionButtonsDisabled(true);

            try {
                for (let i = 0; i < cards.length; i += Config.scan.batchSize) {
                    const batch = cards.slice(i, i + Config.scan.batchSize);

                    for (const card of batch) {

                        const cachedKeysRaw = card?.dataset?.ytsvmChannelKeys || '';
                        if (cachedKeysRaw) {
                            try {
                                const cachedKeys = JSON.parse(cachedKeysRaw);
                                if (Array.isArray(cachedKeys) && cachedKeys.length > 0 &&
                                    cachedKeys.every(k => AppState.channels[k])) {
                                    const allEnabled = cachedKeys.every(k => Boolean(AppState.channels[k]?.enabled));
                                    card.classList.toggle(Config.ui.hiddenClass, !allEnabled);
                                    card.dataset.ytsvmVisibility = allEnabled ? 'visible' : 'hidden';
                                    AppState.scanProgress.current += 1;
                                    continue;
                                }
                            } catch (_) {}
                        }

                        const channelItems = YouTubeDOM.extractAllChannelDataFromCard(card);

                        if (!Array.isArray(channelItems) || channelItems.length === 0) {
                            card.classList.add(Config.ui.hiddenClass);
                            card.dataset.ytsvmVisibility = 'hidden';
                            AppState.scanProgress.current += 1;
                            continue;
                        }

                        const channelKeys = [];
                        for (const channelData of channelItems) {
                            const result = ChannelStore.ensureChannel(channelData);
                            if (result.wasCreated) AppState.scanProgress.found += 1;
                            if (result.wasUpdated) AppState.scanProgress.updated += 1;
                            if (result.key && AppState.channels[result.key] && !channelKeys.includes(result.key)) {
                                channelKeys.push(result.key);
                            }
                        }

                        if (channelKeys.length === 0) {
                            card.classList.add(Config.ui.hiddenClass);
                            card.dataset.ytsvmVisibility = 'hidden';
                            AppState.scanProgress.current += 1;
                            continue;
                        }

                        card.dataset.ytsvmChannelKeys = JSON.stringify(channelKeys);
                        card.dataset.ytsvmChannelKey = channelKeys[0];

                        const allEnabled = channelKeys.every(k => Boolean(AppState.channels[k]?.enabled));
                        card.classList.toggle(Config.ui.hiddenClass, !allEnabled);
                        card.dataset.ytsvmVisibility = allEnabled ? 'visible' : 'hidden';

                        AppState.scanProgress.current += 1;
                    }

                    UI.renderStatusBar();
                    if (AppState.modalOpen && AppState.activeTab !== 'settings') {
                        UI.renderActiveTab();
                    }

                    await Utils.sleep(Config.scan.batchDelayMs);
                }

                Storage.save();
                UI.renderStatusBar('Page scan complete.');
                return true;
            } catch (error) {
                Logger.error('Scan failed.', error);
                UI.renderStatusBar('Page scan failed.');
                return false;
            } finally {
                AppState.isScanning = false;
                UI.setActionButtonsDisabled(false);
            }
        },

        scanOnceAfterNavigation() {
            if (!Utils.isSubscriptionsPage()) return;

            setTimeout(() => {
                if (!AppState.isScanning && !AppState.isSyncing && !AppState.isConnecting) {
                    if (!(AppState.modalOpen && AppState.activeTab === 'settings')) {
                        FilterEngine.refreshVisibleCards();
                    }
                }
            }, Config.scan.fullRefreshDelayMs);
        }
    };

    const AuthManager = {
        async ensureGisLoaded() {
            if (AppState.gisLoaded && Utils.getGoogleObject()?.accounts?.oauth2) {
                return true;
            }


            const maxScriptRetries = 3;
            let scriptLoaded = false;

            for (let attempt = 0; attempt < maxScriptRetries; attempt += 1) {
                const existing = document.querySelector(`script[src="${Config.oauth.gisScriptSrc}"]`);
                if (existing) { scriptLoaded = true; break; }

                try {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = Config.oauth.gisScriptSrc;
                        script.async = true;
                        script.defer = true;
                        script.onload = () => { scriptLoaded = true; resolve(); };
                        script.onerror = () => {
                            script.remove();
                            reject(new Error(`Failed to load Google Identity Services (attempt ${attempt + 1}).`));
                        };
                        document.head.appendChild(script);
                    });
                    break;
                } catch (loadErr) {
                    Logger.warn(loadErr.message);
                    if (attempt < maxScriptRetries - 1) {
                        await Utils.sleep(800 * (attempt + 1));
                    } else {
                        throw loadErr;
                    }
                }
            }

            let tries = 0;
            while (!Utils.getGoogleObject()?.accounts?.oauth2) {
                await Utils.sleep(50);
                tries += 1;
                if (tries > 120) {
                    throw new Error('Google Identity Services did not initialize.');
                }
            }

            AppState.gisLoaded = true;
            return true;
        },

        setClientId(clientId) {
            AppState.settings.oauthClientId = (clientId || '').trim();
            AppState.settingsDraft.oauthClientId = AppState.settings.oauthClientId;
            Storage.save();
        },

        getClientId() {
            return AppState.settings.oauthClientId || '';
        },

        isConfigured() {
            return Boolean(this.getClientId());
        },

        isConnected() {
            return Boolean(
                AppState.auth.isConnected &&
                AppState.auth.accessToken &&
                AppState.auth.tokenExpiresAt > (Utils.now() + Utils.getTokenExpiryBufferMs())
            );
        },

        async ensureTokenClient() {
            await this.ensureGisLoaded();

            const googleObj = Utils.getGoogleObject();
            if (!googleObj?.accounts?.oauth2) {
                throw new Error('Google Identity Services is not available.');
            }

            if (!this.isConfigured()) {
                throw new Error('OAuth Client ID is required before connecting.');
            }

            return true;
        },

        async requestAccessToken({ prompt = 'consent' } = {}) {
            await this.ensureTokenClient();

            const googleObj = Utils.getGoogleObject();

            return new Promise((resolve, reject) => {
                AppState.tokenClient = googleObj.accounts.oauth2.initTokenClient({
                    client_id: this.getClientId(),
                    scope: Config.oauth.tokenScope,
                    callback: (response) => {
                        if (!response || response.error) {
                            reject(new Error(response?.error || 'Token request failed.'));
                            return;
                        }

                        AppState.auth.isConnected = true;
                        AppState.auth.provider = 'google';
                        AppState.auth.accessToken = response.access_token || '';
                        AppState.auth.tokenExpiresAt = Utils.now() + ((response.expires_in || 0) * 1000);
                        AppState.auth.lastSyncStatus = 'Connected';
                        Storage.save();

                        resolve(response);
                    },
                    error_callback: (error) => {
                        reject(new Error(error?.message || 'OAuth popup failed.'));
                    }
                });

                AppState.tokenClient.requestAccessToken({ prompt });
            });
        },

        async connect() {
            if (AppState.isScanning || AppState.isSyncing || AppState.isConnecting) {
                throw new Error('Another task is already running.');
            }

            AppState.isConnecting = true;
            UI.setActionButtonsDisabled(true);

            try {
                const prompt = this.isConnected() ? '' : 'consent';
                await this.requestAccessToken({ prompt });
                AppState.auth.lastSyncStatus = 'Connected';
                Storage.save();
                return true;
            } finally {
                AppState.isConnecting = false;
                UI.setActionButtonsDisabled(false);
                UI.renderStatusBar();
            }
        },

        async ensureValidAccessToken() {
            if (this.isConnected()) {
                return this.getAccessToken();
            }

            await this.connect();
            return this.getAccessToken();
        },

        async disconnect() {
            await this.ensureGisLoaded();

            const googleObj = Utils.getGoogleObject();
            const currentToken = AppState.auth.accessToken || '';

            if (currentToken && googleObj?.accounts?.oauth2?.revoke) {
                await new Promise((resolve) => {
                    try {
                        googleObj.accounts.oauth2.revoke(currentToken, () => resolve());
                    } catch (error) {
                        resolve();
                    }
                });
            }

            AppState.auth.isConnected = false;
            AppState.auth.accessToken = '';
            AppState.auth.tokenExpiresAt = 0;
            AppState.auth.lastSyncStatus = 'Disconnected';
            Storage.save();
        },

        getAccessToken() {
            return AppState.auth.accessToken || '';
        }
    };

    const YouTubeApi = {
        async request(path, params = {}) {
            const accessToken = await AuthManager.ensureValidAccessToken();

            const url = new URL(`${Config.api.youtubeBaseUrl}${path}`);
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.set(key, String(value));
                }
            }

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                AppState.auth.isConnected = false;
                AppState.auth.accessToken = '';
                AppState.auth.tokenExpiresAt = 0;
                Storage.save();
                throw new Error('Authorization expired. Please connect again.');
            }

            if (!response.ok) {
                let message = `YouTube API error ${response.status}`;
                try {
                    const errorData = await response.json();
                    message = errorData?.error?.message || message;
                } catch (error) {}
                throw new Error(message);
            }

            return response.json();
        },

        normalizeSubscriptionItem(item) {
            const channelId = item?.snippet?.resourceId?.channelId || '';
            const title = item?.snippet?.title || 'Unknown Channel';
            const customUrl = item?.snippet?.customUrl || '';
            const handle = customUrl ? `@${customUrl.replace(/^@/, '')}` : '';

            return {
                id: channelId,
                handle,
                title,
                url: channelId ? `https://www.youtube.com/channel/${channelId}` : '',
                source: 'api'
            };
        },

        async fetchAllSubscriptions(onPage) {
            let nextPageToken = '';
            const all = [];

            do {
                const data = await this.request('/subscriptions', {
                    part: 'snippet',
                    mine: true,
                    maxResults: Config.api.maxResultsPerPage,
                    pageToken: nextPageToken
                });

                const items = Array.isArray(data?.items) ? data.items : [];
                const normalizedItems = items.map(item => this.normalizeSubscriptionItem(item));
                all.push(...normalizedItems);

                if (typeof onPage === 'function') {
                    onPage({
                        pageItems: normalizedItems,
                        totalCollected: all.length,
                        nextPageToken: data?.nextPageToken || ''
                    });
                }

                nextPageToken = data?.nextPageToken || '';
            } while (nextPageToken);

            return all;
        }
    };

    const SyncManager = {
        resetProgress(total = 0) {
            AppState.syncProgress = {
                current: 0,
                total,
                imported: 0,
                updated: 0
            };
            UI.renderStatusBar();
        },

        async syncFromAccount() {
            if (AppState.isScanning || AppState.isSyncing || AppState.isConnecting) return false;

            if (!AuthManager.isConfigured()) {
                UI.renderStatusBar('Add an OAuth Client ID in Settings first.');
                return false;
            }

            AppState.isSyncing = true;
            UI.setActionButtonsDisabled(true);
            this.resetProgress(0);
            UI.renderStatusBar('Connecting to Google...');

            try {
                await AuthManager.ensureValidAccessToken();
                UI.renderStatusBar('Fetching subscriptions from account...');

                const collected = [];
                const items = await YouTubeApi.fetchAllSubscriptions(({ totalCollected }) => {
                    AppState.syncProgress.total = totalCollected;
                    UI.renderStatusBar();
                });
                collected.push(...items);

                AppState.syncProgress.total = collected.length;
                AppState.syncProgress.current = 0;
                UI.renderStatusBar();

                for (const channelData of collected) {
                    const result = ChannelStore.ensureChannel(channelData);

                    if (result.wasCreated) AppState.syncProgress.imported += 1;
                    if (result.wasUpdated) AppState.syncProgress.updated += 1;

                    AppState.syncProgress.current += 1;
                    UI.renderStatusBar();

                    if (AppState.modalOpen && AppState.activeTab !== 'settings') {
                        UI.renderActiveTab();
                    }
                }

                AppState.auth.lastSyncAt = Utils.now();
                AppState.auth.lastSyncStatus = `Sync completed. Imported ${AppState.syncProgress.imported}, updated ${AppState.syncProgress.updated}.`;
                Storage.save();

                UI.renderStatusBar('Account scan complete.');
                return true;
            } catch (error) {
                Logger.error('Sync failed.', error);
                AppState.auth.lastSyncStatus = error?.message || 'Sync failed';
                Storage.save();
                UI.renderStatusBar(error?.message || 'Account scan failed.');
                return false;
            } finally {
                AppState.isSyncing = false;
                UI.setActionButtonsDisabled(false);
                if (AppState.modalOpen && AppState.activeTab === 'settings') {
                    UI.updateSettingsStatusFields();
                }
            }
        },

        async scan() {
            if (AuthManager.isConnected()) {
                return await this.syncFromAccount();
            }

            if (Utils.isSubscriptionsPage()) {
                return await ScanManager.scanCurrentSubscriptionsPage();
            }

            UI.renderStatusBar('Not connected. Open the Subscriptions page or connect your account first.');
            return false;
        }
    };

    const UI = {
        injectStyles() {
            if (document.getElementById(Config.ui.styleId)) return;

            const style = Utils.createElement('style', { id: Config.ui.styleId });
            style.textContent = `
                .${Config.ui.hiddenClass} {
                    display: none !important;
                }

                #${Config.ui.overlayId} {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.72);
                    backdrop-filter: blur(4px);
                    z-index: 999999;
                    display: none;
                }

                #${Config.ui.modalId} {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: min(1120px, 95vw);
                    height: min(860px, 92vh);
                    background: #0f0f0f;
                    color: #ffffff;
                    border: 1px solid #2a2a2a;
                    border-radius: 18px;
                    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
                    z-index: 1000000;
                    display: none;
                    overflow: hidden;
                    font-family: Arial, sans-serif;
                }

                #${Config.ui.modalId} * {
                    box-sizing: border-box;
                }

                .ytsvm-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 14px 16px;
                    border-bottom: 1px solid #222;
                    background: #101010;
                }

                .ytsvm-header-title {
                    font-size: 16px;
                    font-weight: bold;
                    letter-spacing: 0.2px;
                }

                .ytsvm-header-actions {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .ytsvm-btn {
                    background: #202020;
                    color: #fff;
                    border: 1px solid #333;
                    border-radius: 10px;
                    padding: 8px 12px;
                    cursor: pointer;
                    transition: background 0.15s ease, border-color 0.15s ease, transform 0.05s ease;
                }

                .ytsvm-btn:hover {
                    background: #2a2a2a;
                    border-color: #444;
                }

                .ytsvm-btn:active {
                    transform: translateY(1px);
                }

                .ytsvm-btn:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                .ytsvm-btn-primary {
                    background: #2b6cb0;
                    border-color: #2b6cb0;
                }

                .ytsvm-btn-primary:hover {
                    background: #357ac7;
                    border-color: #357ac7;
                }

                .ytsvm-body {
                    display: flex;
                    flex-direction: column;
                    height: calc(100% - 62px);
                    padding: 16px;
                    gap: 12px;
                    overflow: hidden;
                }

                .ytsvm-status-box {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    padding: 12px;
                    background: #131313;
                    border: 1px solid #232323;
                    border-radius: 14px;
                }

                .ytsvm-status-text {
                    font-size: 12px;
                    color: #cfcfcf;
                    min-height: 16px;
                }

                .ytsvm-progress-bar {
                    width: 100%;
                    height: 10px;
                    background: #1b1b1b;
                    border: 1px solid #2f2f2f;
                    border-radius: 999px;
                    overflow: hidden;
                }

                .ytsvm-progress-fill {
                    height: 100%;
                    width: 0%;
                    background: linear-gradient(90deg, #3ea6ff, #7cc8ff);
                    transition: width 0.12s ease;
                }

                .ytsvm-tabs {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .ytsvm-tab {
                    background: #1a1a1a;
                    color: #fff;
                    border: 1px solid #333;
                    border-radius: 10px;
                    padding: 8px 12px;
                    cursor: pointer;
                }

                .ytsvm-tab.active {
                    background: #3ea6ff;
                    color: #000;
                    font-weight: bold;
                    border-color: #3ea6ff;
                }

                .ytsvm-tab-count {
                    opacity: 0.8;
                    margin-left: 4px;
                    font-weight: normal;
                }

                .ytsvm-search {
                    width: 100%;
                    padding: 11px 12px;
                    background: #181818;
                    color: white;
                    border: 1px solid #333;
                    border-radius: 12px;
                }

                .ytsvm-search:focus,
                .ytsvm-input:focus,
                .ytsvm-select:focus,
                .ytsvm-textarea:focus {
                    outline: 1px solid #3ea6ff;
                    border-color: #3ea6ff;
                }

                .ytsvm-toolbar {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    padding: 10px 12px;
                    background: #131313;
                    border: 1px solid #232323;
                    border-radius: 12px;
                }

                .ytsvm-content {
                    flex: 1;
                    min-height: 0;
                    overflow: hidden;
                }

                .ytsvm-scroll-area {
                    height: 100%;
                    overflow: auto;
                    overscroll-behavior: contain;
                    padding-right: 4px;
                }

                .ytsvm-list {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 10px;
                    align-content: start;
                }

                .ytsvm-item {
                    background: #181818;
                    border: 1px solid #2f2f2f;
                    border-radius: 12px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    min-height: 96px;
                }

                .ytsvm-title {
                    font-size: 13px;
                    line-height: 1.35;
                    word-break: break-word;
                    font-weight: 600;
                }

                .ytsvm-meta {
                    font-size: 11px;
                    color: #8e8e8e;
                    line-height: 1.45;
                }

                .ytsvm-toggle-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }

                .ytsvm-badge {
                    font-size: 12px;
                    color: #aaa;
                }

                .ytsvm-settings {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .ytsvm-section {
                    background: #181818;
                    border: 1px solid #2f2f2f;
                    border-radius: 14px;
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .ytsvm-section-title {
                    font-size: 14px;
                    font-weight: bold;
                }

                .ytsvm-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .ytsvm-label {
                    font-size: 12px;
                    color: #cfcfcf;
                }

                .ytsvm-input,
                .ytsvm-select,
                .ytsvm-textarea {
                    width: 100%;
                    padding: 10px 12px;
                    background: #111;
                    color: white;
                    border: 1px solid #333;
                    border-radius: 10px;
                    pointer-events: auto;
                    user-select: text;
                    -webkit-user-select: text;
                }

                .ytsvm-textarea {
                    min-height: 130px;
                    resize: vertical;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                    font-size: 12px;
                    line-height: 1.45;
                }

                .ytsvm-inline-actions {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .ytsvm-note {
                    font-size: 12px;
                    color: #aaa;
                    line-height: 1.45;
                }

                .ytsvm-note-strong {
                    color: #e2e2e2;
                }

                .ytsvm-grid-2 {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 10px;
                }

                .ytsvm-footer {
                    font-size: 12px;
                    color: #aaa;
                    border-top: 1px solid #222;
                    padding-top: 10px;
                }

                .ytsvm-error {
                    color: #ff8a8a;
                }

                .ytsvm-success {
                    color: #92e692;
                }

                .ytsvm-context-menu-item {
                    width: 100%;
                    border: none;
                    background: transparent;
                    color: inherit;
                    text-align: left;
                    padding: 12px 16px;
                    font: inherit;
                    cursor: pointer;
                }

                .ytsvm-context-menu-item:hover {
                    background: rgba(255, 255, 255, 0.08);
                }

                @media (max-width: 800px) {
                    .ytsvm-list,
                    .ytsvm-grid-2 {
                        grid-template-columns: 1fr;
                    }
                }
            `;
            document.head.appendChild(style);
        },

        ensureModal() {
            if (document.getElementById(Config.ui.overlayId) && document.getElementById(Config.ui.modalId)) {
                return;
            }

            const overlay = Utils.createElement('div', { id: Config.ui.overlayId });
            const modal = Utils.createElement('div', { id: Config.ui.modalId });

            modal.innerHTML = `
                <div class="ytsvm-header">
                    <div class="ytsvm-header-title">Subscriptions Filter Manager</div>
                    <div class="ytsvm-header-actions">
                        <button class="ytsvm-btn ytsvm-btn-primary" id="ytsvm-scan-btn">Scan</button>
                        <button class="ytsvm-btn" id="ytsvm-refresh-btn">Refresh Current Page</button>
                        <button class="ytsvm-btn" id="ytsvm-close-btn">Close</button>
                    </div>
                </div>

                <div class="ytsvm-body">
                    <div class="ytsvm-status-box">
                        <div id="ytsvm-status-text" class="ytsvm-status-text">Idle</div>
                        <div class="ytsvm-progress-bar">
                            <div id="ytsvm-progress-fill" class="ytsvm-progress-fill"></div>
                        </div>
                    </div>

                    <div class="ytsvm-tabs">
                        <button class="ytsvm-tab active" data-tab="all">All <span id="ytsvm-tab-count-all" class="ytsvm-tab-count">0</span></button>
                        <button class="ytsvm-tab" data-tab="enabled">Enabled <span id="ytsvm-tab-count-enabled" class="ytsvm-tab-count">0</span></button>
                        <button class="ytsvm-tab" data-tab="disabled">Disabled <span id="ytsvm-tab-count-disabled" class="ytsvm-tab-count">0</span></button>
                        <button class="ytsvm-tab" data-tab="settings">Settings</button>
                    </div>

                    <input id="ytsvm-search" class="ytsvm-search" type="text" placeholder="Search channels..." />

                    <div id="ytsvm-toolbar" class="ytsvm-toolbar" style="display:none;"></div>

                    <div id="ytsvm-content" class="ytsvm-content"></div>

                    <div id="ytsvm-footer" class="ytsvm-footer"></div>
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(modal);

            Utils.stopScrollChaining(modal);

            overlay.addEventListener('click', () => this.close());
            modal.querySelector('#ytsvm-close-btn').addEventListener('click', () => this.close());

            modal.querySelector('#ytsvm-scan-btn').addEventListener('click', async () => {
                await SyncManager.scan();
            });

            modal.querySelector('#ytsvm-refresh-btn').addEventListener('click', () => {
                if (!Utils.isSubscriptionsPage()) {
                    this.renderStatusBar('Refresh only works on the YouTube subscriptions page.');
                    return;
                }
                FilterEngine.refreshVisibleCards();
                this.renderStatusBar('Page refreshed.');
            });

            const tabsContainer = modal.querySelector('.ytsvm-tabs');
            if (tabsContainer) {
                tabsContainer.addEventListener('click', (event) => {
                    const btn = event.target.closest('.ytsvm-tab');
                    if (!btn) return;

                    AppState.activeTab = btn.dataset.tab;

                    modal.querySelectorAll('.ytsvm-tab').forEach(tab => tab.classList.remove('active'));
                    btn.classList.add('active');

                    const searchInput = document.getElementById('ytsvm-search');
                    if (searchInput) {
                        searchInput.style.display = AppState.activeTab === 'settings' ? 'none' : 'block';
                    }

                    this.renderActiveTab();
                });
            }

            modal.querySelector('#ytsvm-search').addEventListener('input', Utils.debounce((event) => {
                AppState.searchTerm = Utils.normalizeText(event.target.value);
                this.renderActiveTab();
            }, 120));
        },

        syncSettingsDraftFromState() {
            AppState.settingsDraft = {
                oauthClientId: AppState.settings.oauthClientId || '',
                defaultStateForNewChannels: Boolean(AppState.settings.defaultStateForNewChannels),
                debug: Boolean(AppState.settings.debug)
            };
        },

        setActionButtonsDisabled(disabled) {
            const ids = [
                'ytsvm-scan-btn',
                'ytsvm-refresh-btn',
                'ytsvm-save-client-id-btn',
                'ytsvm-connect-btn',
                'ytsvm-disconnect-btn',
                'ytsvm-sync-btn',
                'ytsvm-save-settings-btn',
                'ytsvm-export-btn',
                'ytsvm-import-btn',
                'ytsvm-enable-all-btn',
                'ytsvm-disable-all-btn',
                'ytsvm-enable-filtered-btn',
                'ytsvm-disable-filtered-btn'
            ];

            for (const id of ids) {
                const element = document.getElementById(id);
                if (element) {
                    element.disabled = disabled;
                }
            }
        },

        renderStatusBar(overrideMessage = '') {
            const textEl = document.getElementById('ytsvm-status-text');
            const fillEl = document.getElementById('ytsvm-progress-fill');
            if (!textEl || !fillEl) return;

            if (overrideMessage) {
                textEl.textContent = overrideMessage;
                if (!AppState.isScanning && !AppState.isSyncing && !AppState.isConnecting) {
                    fillEl.style.width = '0%';
                }
                return;
            }

            if (AppState.isConnecting) {
                fillEl.style.width = '15%';
                textEl.textContent = 'Opening Google sign-in...';
                return;
            }

            if (AppState.isScanning) {
                const { current, total, found, updated } = AppState.scanProgress;
                const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
                fillEl.style.width = `${percent}%`;
                textEl.textContent = `Scanning ${current}/${total} cards • New: ${found} • Updated: ${updated}`;
                return;
            }

            if (AppState.isSyncing) {
                const { current, total, imported, updated } = AppState.syncProgress;
                const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
                fillEl.style.width = `${percent}%`;
                textEl.textContent = `Scanning ${current}/${total} subscriptions • Imported: ${imported} • Updated: ${updated}`;
                return;
            }

            fillEl.style.width = '0%';
            textEl.textContent = 'Idle';
        },

        getFilteredChannels() {
            let channels = ChannelStore.getByTab(AppState.activeTab);

            if (AppState.searchTerm) {
                channels = channels.filter(channel =>
                    Utils.normalizeText(channel.title).includes(AppState.searchTerm)
                );
            }

            return channels;
        },

        attachScrollGuardToContent() {
            const scrollArea = document.getElementById('ytsvm-scroll-area');
            if (scrollArea) {
                Utils.stopScrollChaining(scrollArea);
            }
        },

        updateTabCounts() {
            const counts = ChannelStore.getCounts();
            const allEl = document.getElementById('ytsvm-tab-count-all');
            const enabledEl = document.getElementById('ytsvm-tab-count-enabled');
            const disabledEl = document.getElementById('ytsvm-tab-count-disabled');

            if (allEl) allEl.textContent = String(counts.all);
            if (enabledEl) enabledEl.textContent = String(counts.enabled);
            if (disabledEl) disabledEl.textContent = String(counts.disabled);
        },

        applyBulkToAll(enabled) {

            const allChannels = ChannelStore.getAllChannels();
            const allKeys = allChannels.map(ch => ch.key);

            if (enabled) {

                AppState.bulkEnableSnapshot = allChannels
                    .filter(ch => !ch.enabled)
                    .map(ch => ch.key);
            }

            const changed = ChannelStore.setEnabledMany(allKeys, enabled);

            if (changed > 0) {
                if (Utils.isSubscriptionsPage()) {
                    FilterEngine.refreshVisibleCardsWithRetry();
                }
                this.renderActiveTab();

                if (enabled && AppState.bulkEnableSnapshot && AppState.bulkEnableSnapshot.length > 0) {
                    this.renderStatusBar(`Enabled ${changed} channels. Click "Undo Enable All" to restore.`);

                    this._injectUndoEnableAll();
                } else {
                    this.renderStatusBar(`${enabled ? 'Enabled' : 'Disabled'} ${changed} channels.`);
                }
            } else {
                this.renderStatusBar(`No channels needed to be ${enabled ? 'enabled' : 'disabled'}.`);
            }
        },

        _injectUndoEnableAll() {
            const toolbar = document.getElementById('ytsvm-toolbar');
            if (!toolbar) return;
            if (toolbar.querySelector('#ytsvm-undo-enable-all-btn')) return;

            const btn = Utils.createElement('button', {
                id: 'ytsvm-undo-enable-all-btn',
                className: 'ytsvm-btn ytsvm-btn-primary',
                text: 'Undo Enable All'
            });

            btn.addEventListener('click', () => {
                const snapshot = AppState.bulkEnableSnapshot || [];
                if (snapshot.length > 0) {
                    ChannelStore.setEnabledMany(snapshot, false);
                    AppState.bulkEnableSnapshot = [];
                    if (Utils.isSubscriptionsPage()) {
                        FilterEngine.refreshVisibleCardsWithRetry();
                    }
                    this.renderActiveTab();
                    this.renderStatusBar(`Restored: ${snapshot.length} channels disabled.`);
                }
            });

            toolbar.appendChild(btn);
        },

        applyBulkToFiltered(enabled) {
            const filteredKeys = this.getFilteredChannels().map(channel => channel.key);
            const changed = ChannelStore.setEnabledMany(filteredKeys, enabled);

            if (changed > 0) {
                if (Utils.isSubscriptionsPage()) {
                    FilterEngine.refreshVisibleCardsWithRetry();
                }
                this.renderActiveTab();
                this.renderStatusBar(`${enabled ? 'Enabled' : 'Disabled'} ${changed} filtered channels.`);
            } else {
                this.renderStatusBar(`No filtered channels needed to be ${enabled ? 'enabled' : 'disabled'}.`);
            }
        },

        renderToolbar() {
            const toolbar = document.getElementById('ytsvm-toolbar');
            if (!toolbar) return;

            if (AppState.activeTab === 'settings') {
                toolbar.style.display = 'none';
                toolbar.innerHTML = '';
                return;
            }

            const filteredCount = this.getFilteredChannels().length;

            toolbar.style.display = 'flex';
            toolbar.innerHTML = `
                <button class="ytsvm-btn" id="ytsvm-enable-all-btn">Enable All</button>
                <button class="ytsvm-btn" id="ytsvm-disable-all-btn">Disable All</button>
                <button class="ytsvm-btn" id="ytsvm-enable-filtered-btn">Enable Filtered (${filteredCount})</button>
                <button class="ytsvm-btn" id="ytsvm-disable-filtered-btn">Disable Filtered (${filteredCount})</button>
            `;

            document.getElementById('ytsvm-enable-all-btn')?.addEventListener('click', () => this.applyBulkToAll(true));
            document.getElementById('ytsvm-disable-all-btn')?.addEventListener('click', () => this.applyBulkToAll(false));
            document.getElementById('ytsvm-enable-filtered-btn')?.addEventListener('click', () => this.applyBulkToFiltered(true));
            document.getElementById('ytsvm-disable-filtered-btn')?.addEventListener('click', () => this.applyBulkToFiltered(false));
        },


        renderChannelList() {
            const content = document.getElementById('ytsvm-content');
            const footer = document.getElementById('ytsvm-footer');
            if (!content || !footer) return;

            const channels = this.getFilteredChannels();


            if (!document.getElementById('ytsvm-scroll-area')) {
                content.innerHTML = `
                    <div id="ytsvm-scroll-area" class="ytsvm-scroll-area">
                        <div id="ytsvm-list" class="ytsvm-list"></div>
                    </div>
                `;
                this.attachScrollGuardToContent();
            }

            const list = document.getElementById('ytsvm-list');
            if (!list) return;


            const rendered = new Map();
            for (const el of list.querySelectorAll('.ytsvm-item[data-channel-key]')) {
                rendered.set(el.dataset.channelKey, el);
            }

            const newKeys = new Set(channels.map(ch => ch.key));


            for (const [key, el] of rendered) {
                if (!newKeys.has(key)) el.remove();
            }


            let insertBefore = null;
            for (let i = channels.length - 1; i >= 0; i -= 1) {
                const channel = channels[i];
                const existing = rendered.get(channel.key);

                if (existing) {

                    const badge = existing.querySelector('.ytsvm-badge');
                    const cb = existing.querySelector('input[type="checkbox"]');
                    if (badge) badge.textContent = channel.enabled ? 'Enabled' : 'Disabled';
                    if (cb) cb.checked = channel.enabled;


                    existing.setAttribute('aria-checked', String(channel.enabled));

                    if (insertBefore) {
                        list.insertBefore(existing, insertBefore);
                    }
                    insertBefore = existing;
                } else {
                    const item = Utils.createElement('div', {
                        className: 'ytsvm-item',
                        attrs: { 'data-channel-key': channel.key, 'aria-checked': String(channel.enabled), tabindex: '0' }
                    });

                    item.innerHTML = `
                        <div class="ytsvm-title">${Utils.escapeHtml(channel.title)}</div>
                        <div class="ytsvm-meta">
                            ${channel.handle ? `Handle: ${Utils.escapeHtml(channel.handle)}<br>` : ''}
                            ${channel.id ? `ID: ${Utils.escapeHtml(channel.id)}<br>` : ''}
                            Source: ${Utils.escapeHtml(channel.source || 'unknown')}
                        </div>
                        <div class="ytsvm-toggle-row">
                            <span class="ytsvm-badge">${channel.enabled ? 'Enabled' : 'Disabled'}</span>
                            <label>
                                <input type="checkbox" data-key="${Utils.escapeHtml(channel.key)}" ${channel.enabled ? 'checked' : ''}>
                            </label>
                        </div>
                    `;


                    item.addEventListener('keydown', (event) => {
                        if (event.key === ' ' || event.key === 'Enter') {
                            event.preventDefault();
                            const cb = item.querySelector('input[type="checkbox"]');
                            if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
                        }
                    });

                    const checkbox = item.querySelector('input[type="checkbox"]');
                    checkbox.addEventListener('change', () => {
                        ChannelStore.setEnabled(channel.key, checkbox.checked);
                        this.renderActiveTabPreservingScroll();
                        if (Utils.isSubscriptionsPage()) {
                            FilterEngine.refreshVisibleCardsWithRetry();
                        }
                    });

                    if (insertBefore) {
                        list.insertBefore(item, insertBefore);
                    } else {
                        list.appendChild(item);
                    }
                    insertBefore = item;
                }
            }

            this.updateTabCounts();
            this.renderToolbar();

            const total = ChannelStore.getAllChannels().length;
            const enabled = ChannelStore.getByTab('enabled').length;
            const disabled = ChannelStore.getByTab('disabled').length;
            const filtered = channels.length;

            footer.textContent = `Total: ${total} | Enabled: ${enabled} | Disabled: ${disabled} | Showing: ${filtered}`;
        },

        updateSettingsStatusFields() {
            const configuredEl = document.getElementById('ytsvm-status-configured');
            const connectedEl = document.getElementById('ytsvm-status-connected');
            const lastSyncEl = document.getElementById('ytsvm-status-last-sync');
            const lastStatusEl = document.getElementById('ytsvm-status-last-status');
            const storedChannelsEl = document.getElementById('ytsvm-status-stored-channels');

            if (configuredEl) configuredEl.textContent = AuthManager.isConfigured() ? 'Yes' : 'No';
            if (connectedEl) connectedEl.textContent = AuthManager.isConnected() ? 'Yes' : 'No';
            if (lastSyncEl) lastSyncEl.textContent = Utils.formatDateTime(AppState.auth.lastSyncAt);
            if (lastStatusEl) lastStatusEl.textContent = AppState.auth.lastSyncStatus || 'None';
            if (storedChannelsEl) storedChannelsEl.textContent = String(Object.keys(AppState.channels).length);
        },

        exportData() {
            const data = Storage.exportData();
            const pretty = JSON.stringify(data, null, 2);
            const fileName = `ytsvm-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;

            Utils.downloadTextFile(fileName, pretty, 'application/json');
            this.renderStatusBar('Export completed.');
        },

        handleImportText(text) {
            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch (error) {
                this.renderStatusBar('Import failed. Invalid JSON.');
                return;
            }

            if (!parsed || typeof parsed !== 'object' || typeof parsed.channels !== 'object') {
                this.renderStatusBar('Import failed. JSON structure is not valid.');
                return;
            }

            try {
                Storage.importData(parsed);
                this.syncSettingsDraftFromState();
                this.updateSettingsStatusFields();
                this.renderActiveTab();
                this.renderStatusBar('Import completed.');
            } catch (error) {
                Logger.error('Import failed.', error);
                this.renderStatusBar('Import failed.');
            }
        },

        bindSettingsEvents() {
            const clientIdInput = document.getElementById('ytsvm-oauth-client-id');
            const defaultStateEl = document.getElementById('ytsvm-default-state');
            const debugModeEl = document.getElementById('ytsvm-debug-mode');
            const validationEl = document.getElementById('ytsvm-client-id-validation');
            const importTextArea = document.getElementById('ytsvm-import-text');

            if (clientIdInput) {
                clientIdInput.value = AppState.settingsDraft.oauthClientId || '';
                clientIdInput.addEventListener('input', (event) => {
                    AppState.settingsDraft.oauthClientId = event.target.value;

                    if (!event.target.value.trim()) {
                        validationEl.textContent = '';
                        validationEl.className = 'ytsvm-note';
                        return;
                    }

                    if (Utils.isValidClientId(event.target.value)) {
                        validationEl.textContent = 'Client ID format looks valid.';
                        validationEl.className = 'ytsvm-note ytsvm-success';
                    } else {
                        validationEl.textContent = 'Client ID format looks invalid.';
                        validationEl.className = 'ytsvm-note ytsvm-error';
                    }
                });
            }

            if (defaultStateEl) {
                defaultStateEl.value = AppState.settingsDraft.defaultStateForNewChannels ? 'enabled' : 'disabled';
                defaultStateEl.addEventListener('change', (event) => {
                    AppState.settingsDraft.defaultStateForNewChannels = event.target.value === 'enabled';
                });
            }

            if (debugModeEl) {
                debugModeEl.value = AppState.settingsDraft.debug ? 'on' : 'off';
                debugModeEl.addEventListener('change', (event) => {
                    AppState.settingsDraft.debug = event.target.value === 'on';
                });
            }

            document.getElementById('ytsvm-save-client-id-btn')?.addEventListener('click', () => {
                const value = (AppState.settingsDraft.oauthClientId || '').trim();

                if (!value) {
                    this.renderStatusBar('OAuth Client ID is empty.');
                    return;
                }

                if (!Utils.isValidClientId(value)) {
                    this.renderStatusBar('That does not look like a valid Google OAuth Client ID.');
                    return;
                }

                AuthManager.setClientId(value);
                this.updateSettingsStatusFields();
                this.renderStatusBar('OAuth Client ID saved.');
            });

            document.getElementById('ytsvm-connect-btn')?.addEventListener('click', async () => {
                try {
                    if (AppState.settingsDraft.oauthClientId.trim() && AppState.settingsDraft.oauthClientId.trim() !== AppState.settings.oauthClientId) {
                        if (!Utils.isValidClientId(AppState.settingsDraft.oauthClientId)) {
                            this.renderStatusBar('Save a valid OAuth Client ID first.');
                            return;
                        }
                        AuthManager.setClientId(AppState.settingsDraft.oauthClientId.trim());
                    }

                    await AuthManager.connect();
                    this.updateSettingsStatusFields();
                    this.renderStatusBar('Connected.');
                } catch (error) {
                    this.updateSettingsStatusFields();
                    this.renderStatusBar(error.message || 'Connection failed.');
                }
            });

            document.getElementById('ytsvm-disconnect-btn')?.addEventListener('click', async () => {
                await AuthManager.disconnect();
                this.updateSettingsStatusFields();
                this.renderStatusBar('Disconnected.');
            });

            document.getElementById('ytsvm-sync-btn')?.addEventListener('click', async () => {
                if (AppState.settingsDraft.oauthClientId.trim() && AppState.settingsDraft.oauthClientId.trim() !== AppState.settings.oauthClientId) {
                    if (!Utils.isValidClientId(AppState.settingsDraft.oauthClientId)) {
                        this.renderStatusBar('Save a valid OAuth Client ID first.');
                        return;
                    }
                    AuthManager.setClientId(AppState.settingsDraft.oauthClientId.trim());
                }

                await SyncManager.syncFromAccount();
                this.updateSettingsStatusFields();
            });

            document.getElementById('ytsvm-save-settings-btn')?.addEventListener('click', () => {
                AppState.settings.defaultStateForNewChannels = Boolean(AppState.settingsDraft.defaultStateForNewChannels);
                AppState.settings.debug = Boolean(AppState.settingsDraft.debug);
                Storage.save();
                this.renderStatusBar('Settings saved.');
            });

            document.getElementById('ytsvm-export-btn')?.addEventListener('click', () => {
                this.exportData();
            });

            document.getElementById('ytsvm-import-btn')?.addEventListener('click', () => {
                const value = importTextArea?.value || '';
                if (!value.trim()) {
                    this.renderStatusBar('Paste JSON into the import box first.');
                    return;
                }
                this.handleImportText(value);
            });

            document.getElementById('ytsvm-import-file-btn')?.addEventListener('click', () => {
                document.getElementById('ytsvm-import-file-input')?.click();
            });

            document.getElementById('ytsvm-import-file-input')?.addEventListener('change', async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                try {
                    const text = await file.text();
                    if (importTextArea) {
                        importTextArea.value = text;
                    }
                    this.renderStatusBar('File loaded. Click Import JSON to apply it.');
                } catch (error) {
                    this.renderStatusBar('Could not read the selected file.');
                }

                event.target.value = '';
            });
        },

        renderSettingsTab() {
            const content = document.getElementById('ytsvm-content');
            const footer = document.getElementById('ytsvm-footer');
            if (!content || !footer) return;

            this.syncSettingsDraftFromState();

            content.innerHTML = `
                <div id="ytsvm-scroll-area" class="ytsvm-scroll-area">
                    <div class="ytsvm-settings">
                        <div class="ytsvm-section">
                            <div class="ytsvm-section-title">YouTube Account Sync</div>

                            <div class="ytsvm-field">
                                <label class="ytsvm-label" for="ytsvm-oauth-client-id">OAuth Client ID</label>
                                <input id="ytsvm-oauth-client-id" class="ytsvm-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" placeholder="Paste your Google OAuth Client ID">
                                <div id="ytsvm-client-id-validation" class="ytsvm-note"></div>
                            </div>

                            <div class="ytsvm-inline-actions">
                                <button class="ytsvm-btn" id="ytsvm-save-client-id-btn">Save Client ID</button>
                                <button class="ytsvm-btn" id="ytsvm-connect-btn">Connect Account</button>
                                <button class="ytsvm-btn" id="ytsvm-disconnect-btn">Disconnect</button>
                                <button class="ytsvm-btn ytsvm-btn-primary" id="ytsvm-sync-btn">Sync From Account</button>
                            </div>

                            <div class="ytsvm-note">
                                If your account is connected, <span class="ytsvm-note-strong">Scan</span> will import all subscriptions from your account. If not, <span class="ytsvm-note-strong">Scan</span> will only scan the current Subscriptions page.
                            </div>
                        </div>

                        <div class="ytsvm-section">
                            <div class="ytsvm-section-title">Behavior</div>

                            <div class="ytsvm-grid-2">
                                <div class="ytsvm-field">
                                    <label class="ytsvm-label" for="ytsvm-default-state">Default state for new channels</label>
                                    <select id="ytsvm-default-state" class="ytsvm-select">
                                        <option value="disabled">Disabled</option>
                                        <option value="enabled">Enabled</option>
                                    </select>
                                </div>

                                <div class="ytsvm-field">
                                    <label class="ytsvm-label" for="ytsvm-debug-mode">Debug mode</label>
                                    <select id="ytsvm-debug-mode" class="ytsvm-select">
                                        <option value="off">Off</option>
                                        <option value="on">On</option>
                                    </select>
                                </div>
                            </div>

                            <div class="ytsvm-inline-actions">
                                <button class="ytsvm-btn" id="ytsvm-save-settings-btn">Save Settings</button>
                            </div>
                        </div>

                        <div class="ytsvm-section">
                            <div class="ytsvm-section-title">Import / Export</div>

                            <div class="ytsvm-inline-actions">
                                <button class="ytsvm-btn" id="ytsvm-export-btn">Export JSON</button>
                                <button class="ytsvm-btn" id="ytsvm-import-file-btn">Load JSON File</button>
                                <button class="ytsvm-btn ytsvm-btn-primary" id="ytsvm-import-btn">Import JSON</button>
                                <input id="ytsvm-import-file-input" type="file" accept=".json,application/json" style="display:none;">
                            </div>

                            <div class="ytsvm-field">
                                <label class="ytsvm-label" for="ytsvm-import-text">Import JSON</label>
                                <textarea id="ytsvm-import-text" class="ytsvm-textarea" placeholder="Paste exported JSON here, or load a JSON file above."></textarea>
                            </div>

                            <div class="ytsvm-note">
                                Import replaces the current stored channel list, settings, and sync metadata. Auth tokens are never imported.
                            </div>
                        </div>

                        <div class="ytsvm-section">
                            <div class="ytsvm-section-title">Status</div>
                            <div class="ytsvm-note">Configured Client ID: <span id="ytsvm-status-configured">${AuthManager.isConfigured() ? 'Yes' : 'No'}</span></div>
                            <div class="ytsvm-note">Connected: <span id="ytsvm-status-connected">${AuthManager.isConnected() ? 'Yes' : 'No'}</span></div>
                            <div class="ytsvm-note">Last Sync: <span id="ytsvm-status-last-sync">${Utils.formatDateTime(AppState.auth.lastSyncAt)}</span></div>
                            <div class="ytsvm-note">Last Sync Status: <span id="ytsvm-status-last-status">${Utils.escapeHtml(AppState.auth.lastSyncStatus || 'None')}</span></div>
                            <div class="ytsvm-note">Stored Channels: <span id="ytsvm-status-stored-channels">${Object.keys(AppState.channels).length}</span></div>
                        </div>
                    </div>
                </div>
            `;

            footer.textContent = `Version ${Config.version} | Settings`;
            this.bindSettingsEvents();
            this.attachScrollGuardToContent();
            this.updateTabCounts();
            this.renderToolbar();
        },

        renderActiveTab() {
            if (AppState.activeTab === 'settings') {
                this.renderSettingsTab();
            } else {
                this.renderChannelList();
            }
        },

        renderActiveTabPreservingScroll() {
            const previousScrollTop = document.getElementById('ytsvm-scroll-area')?.scrollTop || 0;

            this.renderActiveTab();

            requestAnimationFrame(() => {
                const nextScrollArea = document.getElementById('ytsvm-scroll-area');
                if (nextScrollArea) {
                    nextScrollArea.scrollTop = previousScrollTop;
                }
            });
        },

        open() {
            this.injectStyles();
            this.ensureModal();

            const overlay = document.getElementById(Config.ui.overlayId);
            const modal = document.getElementById(Config.ui.modalId);
            const searchInput = document.getElementById('ytsvm-search');

            AppState.searchTerm = '';

            overlay.style.display = 'block';
            modal.style.display = 'block';
            AppState.modalOpen = true;

            if (searchInput) {
                searchInput.value = '';
                searchInput.style.display = AppState.activeTab === 'settings' ? 'none' : 'block';
            }

            this.renderActiveTab();
            this.renderStatusBar();
        },

        close() {
            const overlay = document.getElementById(Config.ui.overlayId);
            const modal = document.getElementById(Config.ui.modalId);
            const searchInput = document.getElementById('ytsvm-search');

            if (overlay) overlay.style.display = 'none';
            if (modal) modal.style.display = 'none';

            AppState.searchTerm = '';
            if (searchInput) {
                searchInput.value = '';
            }

            AppState.modalOpen = false;
        }
    };

    const ContextMenuManager = {
        injectCycleId: 0,

        isLikelyMenuTrigger(element) {
            if (!element) return false;

            const label = Utils.normalizeText(
                element.getAttribute?.('aria-label') ||
                element.getAttribute?.('title') ||
                element.textContent || ''
            );

            if (!label) return false;

            const markers = [
                'more actions',
                'acciones',
                'mas acciones',
                'más acciones',
                'options',
                'opciones',
                'menu',
                'menú'
            ];

            return markers.some(marker => label.includes(marker));
        },

        trackPotentialCardFromEvent(event) {
            const target = event.target;
            if (!(target instanceof Element)) return;

            const card = target.closest(Config.selectors.subscriptionCards);
            if (!card) return;

            const trigger = target.closest('button, tp-yt-paper-icon-button, yt-icon-button, [role="button"]');
            if (!trigger) return;

            if (!this.isLikelyMenuTrigger(trigger) && !trigger.closest('ytd-menu-renderer')) {
                return;
            }

            AppState.lastContextMenuCard = card;
            AppState.lastContextVideoId = YouTubeDOM.extractVideoIdFromCard(card) || '';
            AppState.lastContextChannelDataList = YouTubeDOM.extractAllChannelDataFromCard(card);
        },

        resolveActiveMenuCardFromDom() {
            const triggerSelectors = [
                'ytd-menu-renderer button[aria-expanded="true"]',
                'ytd-menu-renderer tp-yt-paper-icon-button[aria-expanded="true"]',
                'ytd-menu-renderer button[aria-pressed="true"]',
                'ytd-menu-renderer tp-yt-paper-icon-button[aria-pressed="true"]',
                'ytd-menu-renderer button[aria-haspopup="true"]',
                'ytd-menu-renderer tp-yt-paper-icon-button[aria-haspopup="true"]'
            ];

            for (const selector of triggerSelectors) {
                const trigger = Utils.safeQuery(document, selector);
                if (!trigger) continue;

                const card = trigger.closest(Config.selectors.subscriptionCards);
                if (card) {
                    return card;
                }
            }

            return null;
        },

        getMenuActionIconHtml() {
            return `
                <span class="ytIconWrapperHost yt-list-item-view-model__accessory yt-list-item-view-model__image" role="img" aria-hidden="true">
                    <span class="yt-icon-shape ytSpecIconShapeHost">
                        <div style="width:100%;height:100%;display:block;fill:currentcolor;">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events:none;display:inherit;width:100%;height:100%;">
                                <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 018.246 12.605L4.755 6.661A8.99 8.99 0 0112 3ZM3.754 8.393l15.491 8.944A9 9 0 013.754 8.393Z"></path>
                            </svg>
                        </div>
                    </span>
                </span>
            `;
        },

        findOpenMenuContentWrapper() {
            const wrappers = Utils.safeQueryAll(document, 'tp-yt-iron-dropdown #contentWrapper, #contentWrapper.style-scope.tp-yt-iron-dropdown');

            for (let i = wrappers.length - 1; i >= 0; i -= 1) {
                const wrapper = wrappers[i];
                if (!(wrapper instanceof HTMLElement)) continue;

                if (Utils.safeQuery(wrapper, 'yt-list-view-model, tp-yt-paper-listbox, [role="listbox"]')) {
                    return wrapper;
                }
            }

            return null;
        },

        createMenuItem(wrapper) {
            const runDisableAction = (event) => {
                const now = Utils.now();
                if (now - AppState.lastMenuDisableActionAt < 250) {
                    return;
                }
                AppState.lastMenuDisableActionAt = now;

                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === 'function') {
                    event.stopImmediatePropagation();
                }
                this.disableCurrentCardChannel(event.currentTarget || event.target);
            };

            const templateButton = Utils.safeQuery(wrapper, '.yt-list-item-view-model__button-or-anchor');
            const templateItem = templateButton?.closest('yt-list-item-view-model');

            if (templateItem) {
                const clonedItem = templateItem.cloneNode(true);
                clonedItem.removeAttribute('is-empty');

                const clonedButton = Utils.safeQuery(clonedItem, '.yt-list-item-view-model__button-or-anchor');
                const titleEl = Utils.safeQuery(clonedItem, '.yt-list-item-view-model__title');
                const imageContainer = Utils.safeQuery(clonedItem, '.yt-list-item-view-model__image-container');

                if (clonedButton) {
                    clonedButton.setAttribute('type', 'button');
                    clonedButton.setAttribute('data-ytsvm-disable-channel', '1');
                    clonedButton.removeAttribute('href');
                    clonedButton.addEventListener('pointerdown', runDisableAction, true);
                }

                clonedItem.addEventListener('click', (event) => {
                    const target = event.target;
                    if (!(target instanceof Element)) return;
                    if (!target.closest('[data-ytsvm-disable-channel="1"]')) return;

                    runDisableAction(event);
                }, true);

                if (titleEl) {
                    titleEl.textContent = 'Desactivar canal en Subscriptions';
                }

                if (imageContainer) {
                    imageContainer.innerHTML = this.getMenuActionIconHtml();
                }

                return clonedItem;
            }

            const fallbackItem = Utils.createElement('yt-list-item-view-model', {
                className: 'yt-list-item-view-model'
            });

            fallbackItem.setAttribute('role', 'menuitem');
            fallbackItem.innerHTML = `
                <div class="yt-list-item-view-model__layout-wrapper yt-list-item-view-model__container yt-list-item-view-model__container--compact yt-list-item-view-model__container--tappable yt-list-item-view-model__container--in-popup">
                    <div class="yt-list-item-view-model__main-container">
                        <div aria-hidden="true" class="yt-list-item-view-model__image-container yt-list-item-view-model__leading">
                            ${this.getMenuActionIconHtml()}
                        </div>
                        <button type="button" class="ytsvm-context-menu-item" data-ytsvm-disable-channel="1">Desactivar canal en Subscriptions</button>
                    </div>
                </div>
            `;

            const fallbackButton = fallbackItem.querySelector('button[data-ytsvm-disable-channel="1"]');
            if (fallbackButton) {
                fallbackButton.addEventListener('pointerdown', runDisableAction, true);
            }

            return fallbackItem;
        },

        findHideItemNode(wrapper) {
            const labels = Utils.safeQueryAll(wrapper, '.yt-list-item-view-model__title');
            for (const label of labels) {
                const text = Utils.normalizeText(label.textContent || '');
                if (!text) continue;
                if (text === 'ocultar' || text === 'hide' || text.includes('ocultar') || text.includes('hide')) {
                    const item = label.closest('yt-list-item-view-model');
                    if (item) return item;
                }
            }

            return null;
        },

        getOpenMenuList(wrapper) {
            return Utils.safeQuery(wrapper, 'yt-list-view-model') ||
                Utils.safeQuery(wrapper, 'tp-yt-paper-listbox') ||
                Utils.safeQuery(wrapper, '[role="listbox"]');
        },

        hasInjectedAction(wrapper) {
            return Boolean(Utils.safeQuery(wrapper, '[data-ytsvm-disable-channel="1"]'));
        },

        scheduleInjectCycle() {
            this.injectCycleId += 1;
            const currentCycle = this.injectCycleId;
            const maxAttempts = 14;
            let attempts = 0;

            const runAttempt = () => {
                if (currentCycle !== this.injectCycleId) return;

                this.injectIntoOpenMenu();
                attempts += 1;

                if (attempts >= maxAttempts) return;
                setTimeout(runAttempt, 80);
            };

            runAttempt();
        },

        resolveContextCard() {
            if (AppState.lastContextMenuCard && AppState.lastContextMenuCard.isConnected) {
                return AppState.lastContextMenuCard;
            }

            const activeCard = this.resolveActiveMenuCardFromDom();
            if (activeCard) {
                AppState.lastContextMenuCard = activeCard;
                AppState.lastContextVideoId = YouTubeDOM.extractVideoIdFromCard(activeCard) || AppState.lastContextVideoId;
                AppState.lastContextChannelDataList = YouTubeDOM.extractAllChannelDataFromCard(activeCard);
                return activeCard;
            }

            const targetVideoId = AppState.lastContextVideoId || '';
            if (!targetVideoId) return null;

            const cards = YouTubeDOM.getSubscriptionCards();
            for (const card of cards) {
                if (YouTubeDOM.extractVideoIdFromCard(card) === targetVideoId) {
                    return card;
                }
            }

            return null;
        },

        applyChannelVisibilityToAllVisibleCards(channelKey) {
            if (!AppState.channels[channelKey]) return;

            const cards = YouTubeDOM.getSubscriptionCards();
            for (const card of cards) {

                let cardKeys = [];
                const cachedKeysRaw = card?.dataset?.ytsvmChannelKeys || '';
                if (cachedKeysRaw) {
                    try {
                        const ks = JSON.parse(cachedKeysRaw);
                        if (Array.isArray(ks)) cardKeys = ks.filter(k => AppState.channels[k]);
                    } catch (_) {}
                }
                if (cardKeys.length === 0) {
                    const singleKey = card?.dataset?.ytsvmChannelKey || '';
                    if (singleKey && AppState.channels[singleKey]) cardKeys = [singleKey];
                }


                if (!cardKeys.includes(channelKey)) {
                    const channelItems = YouTubeDOM.extractAllChannelDataFromCard(card);
                    for (const data of (channelItems || [])) {
                        const resolvedKey = ChannelStore.findExistingChannelKey(data);
                        if (resolvedKey && AppState.channels[resolvedKey] && !cardKeys.includes(resolvedKey)) {
                            cardKeys.push(resolvedKey);
                        }
                    }
                    if (cardKeys.length > 0) {
                        card.dataset.ytsvmChannelKeys = JSON.stringify(cardKeys);
                        card.dataset.ytsvmChannelKey = cardKeys[0];
                    }
                }

                if (!cardKeys.includes(channelKey)) continue;


                const allEnabled = cardKeys.every(k => Boolean(AppState.channels[k]?.enabled));
                card.classList.toggle(Config.ui.hiddenClass, !allEnabled);
                card.dataset.ytsvmVisibility = allEnabled ? 'visible' : 'hidden';
            }
        },


        resolveChannelKeysFromContext(card, channelList) {
            const keys = new Set();


            const cachedKeysRaw = card?.dataset?.ytsvmChannelKeys || '';
            if (cachedKeysRaw) {
                try {
                    const cachedKeys = JSON.parse(cachedKeysRaw);
                    if (Array.isArray(cachedKeys)) {
                        for (const k of cachedKeys) {
                            if (k && AppState.channels[k]) keys.add(k);
                        }
                    }
                } catch (_) {}
            }


            const cachedKey = card?.dataset?.ytsvmChannelKey || '';
            if (cachedKey && AppState.channels[cachedKey]) {
                keys.add(cachedKey);
            }


            if (Array.isArray(channelList) && channelList.length > 0) {
                for (const channelData of channelList) {
                    if (!channelData || typeof channelData !== 'object') continue;
                    const result = ChannelStore.ensureChannel({
                        ...channelData,
                        source: 'context-menu'
                    });
                    if (result?.key) {
                        keys.add(result.key);
                    }
                }
            }


            const targetVideoId = card ? YouTubeDOM.extractVideoIdFromCard(card) : (AppState.lastContextVideoId || '');
            if (targetVideoId) {
                const allCards = YouTubeDOM.getSubscriptionCards();
                for (const candidate of allCards) {
                    if (YouTubeDOM.extractVideoIdFromCard(candidate) !== targetVideoId) continue;

                    const candidateKeysRaw = candidate?.dataset?.ytsvmChannelKeys || '';
                    if (candidateKeysRaw) {
                        try {
                            const ks = JSON.parse(candidateKeysRaw);
                            if (Array.isArray(ks)) {
                                for (const k of ks) {
                                    if (k && AppState.channels[k]) keys.add(k);
                                }
                            }
                        } catch (_) {}
                    }

                    const candidateKey = candidate?.dataset?.ytsvmChannelKey || '';
                    if (candidateKey && AppState.channels[candidateKey]) {
                        keys.add(candidateKey);
                    }
                }
            }

            return Array.from(keys);
        },

        disableCurrentCardChannel(sourceElement = null) {
            const card = this.resolveContextCard();

            let channelList = card ? YouTubeDOM.extractAllChannelDataFromCard(card) : [];

            if ((!Array.isArray(channelList) || channelList.length === 0) && Array.isArray(AppState.lastContextChannelDataList) && AppState.lastContextChannelDataList.length > 0) {
                channelList = [...AppState.lastContextChannelDataList];
            }

            if ((!Array.isArray(channelList) || channelList.length === 0) && sourceElement instanceof Element) {
                const wrapper = sourceElement.closest('#contentWrapper');
                const rawList = wrapper?.dataset?.ytsvmChannelDataList || '';
                const rawSingle = wrapper?.dataset?.ytsvmChannelData || '';

                if (rawList) {
                    try {
                        const parsed = JSON.parse(rawList);
                        if (Array.isArray(parsed)) {
                            channelList = parsed;
                        }
                    } catch (error) {
                        channelList = [];
                    }
                }

                if ((!Array.isArray(channelList) || channelList.length === 0) && rawSingle) {
                    try {
                        const single = JSON.parse(rawSingle);
                        if (single && typeof single === 'object') {
                            channelList = [single];
                        }
                    } catch (error) {
                        channelList = [];
                    }
                }
            }

            if (!Array.isArray(channelList) || channelList.length === 0) {
                channelList = [];
            }

            const resolvedKeys = this.resolveChannelKeysFromContext(card, channelList);
            if (resolvedKeys.length === 0) {
                Logger.log('No video card context available for menu action.', {
                    hasCard: Boolean(card),
                    hasVideoId: Boolean(AppState.lastContextVideoId),
                    cachedChannels: Array.isArray(AppState.lastContextChannelDataList) ? AppState.lastContextChannelDataList.length : 0
                });
                UI.renderStatusBar('Could not detect channel for this card. No action was applied.');
                return;
            }

            const disabledTitles = [];

            for (const channelKey of resolvedKeys) {
                ChannelStore.setEnabled(channelKey, false);

                const channel = AppState.channels[channelKey];
                if (channel) {
                    this.applyChannelVisibilityToAllVisibleCards(channelKey);
                    disabledTitles.push(channel.title || 'Unknown Channel');
                }
            }


            if (card) {
                card.classList.add(Config.ui.hiddenClass);
                card.dataset.ytsvmVisibility = 'hidden';
            }

            if (AppState.modalOpen && AppState.activeTab !== 'settings') {
                UI.renderActiveTab();
            }

            if (Utils.isSubscriptionsPage()) {
                FilterEngine.refreshVisibleCardsWithRetry();
            }

            const uniqueTitles = Array.from(new Set(disabledTitles));
            const label = uniqueTitles.slice(0, 2).join(', ');
            const suffix = uniqueTitles.length > 2 ? ` +${uniqueTitles.length - 2}` : '';
            UI.renderStatusBar(`Channel disabled: ${label}${suffix}`);
        },

        injectIntoOpenMenu() {
            const wrapper = this.findOpenMenuContentWrapper();
            if (!wrapper) return false;

            const contextCard = this.resolveContextCard() || this.resolveActiveMenuCardFromDom();
            if (contextCard) {
                const contextChannelList = YouTubeDOM.extractAllChannelDataFromCard(contextCard);
                if (Array.isArray(contextChannelList) && contextChannelList.length > 0) {
                    wrapper.dataset.ytsvmChannelDataList = JSON.stringify(contextChannelList);
                    wrapper.dataset.ytsvmChannelData = JSON.stringify(contextChannelList[0]);
                }
            }

            if (this.hasInjectedAction(wrapper)) {
                return true;
            }

            const list = this.getOpenMenuList(wrapper);
            if (!list) return false;

            const item = this.createMenuItem(wrapper);
            const hideItem = this.findHideItemNode(wrapper);

            if (hideItem && hideItem.parentNode) {
                hideItem.parentNode.insertBefore(item, hideItem);
            } else {
                list.appendChild(item);
            }

            return true;
        },

        startMenuObserver() {

            const observerTarget = document.querySelector('ytd-popup-container') || document.body;

            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {

                    if (mutation.type === 'attributes') {
                        const target = mutation.target;
                        if (target instanceof Element && target.matches?.('tp-yt-iron-dropdown')) {
                            if (target.hasAttribute('opened') || target.getAttribute('aria-hidden') === 'false') {
                                this.scheduleInjectCycle();
                                return;
                            }
                        }
                        continue;
                    }

                    if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) continue;

                    for (const node of mutation.addedNodes) {
                        if (!(node instanceof Element)) continue;

                        if (
                            node.id === 'contentWrapper' ||
                            node.matches?.('tp-yt-iron-dropdown') ||
                            node.querySelector?.('#contentWrapper.style-scope.tp-yt-iron-dropdown, #contentWrapper, tp-yt-iron-dropdown')
                        ) {
                            this.scheduleInjectCycle();
                            return;
                        }
                    }
                }
            });

            observer.observe(observerTarget, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['opened', 'aria-hidden']
            });


            if (observerTarget === document.body) {
                return;
            }


            const shallowObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type !== 'childList') continue;
                    for (const node of mutation.addedNodes) {
                        if (!(node instanceof Element)) continue;
                        if (node.matches?.('tp-yt-iron-dropdown') || node.querySelector?.('tp-yt-iron-dropdown')) {
                            this.scheduleInjectCycle();
                            return;
                        }
                    }
                }
            });

            shallowObserver.observe(document.body, {
                childList: true,
                subtree: false
            });
        },

        init() {
            document.addEventListener('pointerdown', (event) => this.trackPotentialCardFromEvent(event), true);
            document.addEventListener('click', (event) => {
                this.trackPotentialCardFromEvent(event);
                this.scheduleInjectCycle();
            }, true);
            this.startMenuObserver();
            this.scheduleInjectCycle();
        }
    };

    const ObserverManager = {
        isRelevantTagName(tagName) {
            return tagName === 'YTD-RICH-ITEM-RENDERER' ||
                tagName === 'YTD-GRID-VIDEO-RENDERER' ||
                tagName === 'YTD-VIDEO-RENDERER';
        },

        hasRelevantNode(node) {
            if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;

            const element = /** @type {Element} */ (node);
            const tagName = element.tagName || '';

            if (this.isRelevantTagName(tagName)) {
                return true;
            }

            if (element.matches?.(Config.selectors.subscriptionCards)) {
                return true;
            }

            if (element.querySelector?.(Config.selectors.subscriptionCards)) {
                return true;
            }

            return false;
        },

        hasRelevantMutation(mutations) {
            let inspectedNodes = 0;

            for (const mutation of mutations) {
                if (mutation.type !== 'childList') continue;

                const totalChangedNodes = mutation.addedNodes.length + mutation.removedNodes.length;
                if (totalChangedNodes > 40) {
                    return true;
                }

                const lists = [mutation.addedNodes, mutation.removedNodes];

                for (const nodeList of lists) {
                    for (const node of nodeList) {
                        inspectedNodes += 1;

                        if (inspectedNodes > 60) {
                            return true;
                        }

                        if (this.hasRelevantNode(node)) {
                            return true;
                        }
                    }
                }
            }

            return false;
        },

        getRelevantCardsFromNode(node) {
            if (!node || node.nodeType !== Node.ELEMENT_NODE) return [];

            const element = /** @type {Element} */ (node);
            const cards = [];

            if (element.matches?.(Config.selectors.subscriptionCards)) {
                cards.push(element);
            }

            const descendants = Utils.safeQueryAll(element, Config.selectors.subscriptionCards);
            if (descendants.length > 0) {
                cards.push(...descendants);
            }

            return cards;
        },

        collectRelevantAddedCards(mutations) {
            const cards = [];
            const seen = new Set();

            for (const mutation of mutations) {
                if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) continue;

                for (const node of mutation.addedNodes) {
                    for (const card of this.getRelevantCardsFromNode(node)) {
                        if (seen.has(card)) continue;
                        seen.add(card);
                        cards.push(card);

                        if (cards.length >= 80) {
                            return cards;
                        }
                    }
                }
            }

            return cards;
        },

        start() {
            if (AppState.observer) return;

            AppState.observer = new MutationObserver((mutations) => {
                if (!Utils.isSubscriptionsPage()) return;

                const addedCards = this.collectRelevantAddedCards(mutations);
                if (addedCards.length > 0) {
                    FilterEngine.enqueueCards(addedCards);
                    AppState.lastRefreshAt = Utils.now();
                    return;
                }

                if (!this.hasRelevantMutation(mutations)) return;
                ScanManager.scheduleRefresh();
            });

            AppState.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    };

    const NavigationManager = {
        handleNavigation() {
            const currentUrl = location.href;
            if (currentUrl === AppState.lastUrl) return;

            AppState.lastUrl = currentUrl;

            if (Utils.isSubscriptionsPage()) {
                ScanManager.scanOnceAfterNavigation();
                ScanManager.passiveRefreshTick(true);
            }
        },

        init() {
            window.addEventListener('yt-navigate-finish', () => {
                this.handleNavigation();
            });

            setInterval(() => {
                this.handleNavigation();
                if (Utils.isSubscriptionsPage()) {
                    ScanManager.passiveRefreshTick();
                }
            }, 1000);
        }
    };

    const MenuManager = {
        init() {
            if (typeof GM_registerMenuCommand === 'function') {
                GM_registerMenuCommand('Open Subscriptions Filter Manager', () => {
                    UI.open();
                });

                GM_registerMenuCommand('Scan', async () => {
                    await SyncManager.scan();
                });

                GM_registerMenuCommand('Export JSON', () => {
                    UI.exportData();
                });

                GM_registerMenuCommand('Enable All Channels', () => {
                    UI.applyBulkToAll(true);
                });

                GM_registerMenuCommand('Disable All Channels', () => {
                    UI.applyBulkToAll(false);
                });
            }

            document.addEventListener('keydown', (event) => {
                if (Utils.isTypingTarget(event.target)) return;

                const key = event.key.toLowerCase();
                const isAltB = event.altKey && key === 'b';
                const isCmdB = event.metaKey && !event.ctrlKey && key === 'b';

                if (isAltB || isCmdB) {
                    event.preventDefault();
                    UI.open();
                    return;
                }

                if (event.key === 'Escape' && AppState.modalOpen) {
                    UI.close();
                }
            });
        }
    };

    const App = {
        init() {
            if (AppState.initialized) return;

            Storage.load();
            ChannelStore.rebuildIndexes();
            UI.injectStyles();
            UI.syncSettingsDraftFromState();
            ScanManager.init();
            MenuManager.init();
            ObserverManager.start();
            NavigationManager.init();
            ContextMenuManager.init();

            if (Utils.isSubscriptionsPage()) {
                ScanManager.scanOnceAfterNavigation();
            }

            AppState.initialized = true;
            Logger.log(`${Config.appName} initialized.`);
        }
    };

    App.init();
})();