// ==UserScript==
// @name         YouTube Channel AutoPlaylist Generator (API)
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Generate custom playlists from YouTube channels using the YouTube Data API v3, separating videos and Shorts with sorting options
// @author       JJJ
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Constants
    const STORAGE_KEYS = {
        API_KEY: 'yt_api_key',
        LAST_CHANNEL: 'yt_last_channel'
    };

    const CSS_STYLES = `
        .aplaylist-chip-btn {
            margin-left: 8px;
            margin-right: 0px;
            background: transparent;
            border: none;
            outline: none;
            cursor: pointer;
            padding: 0;
        }
        .aplaylist-chip {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            background: var(--yt-spec-badge-chip-background, #27243c);
            color: var(--yt-spec-text-primary, #fff);
            margin: 0;
            transition: background 0.2s;
        }
        .aplaylist-chip:hover {
            background: var(--yt-spec-button-chip-background-hover, #3a3660);
        }
        .yt-loading {
            text-align: center;
            padding: 20px;
            color: var(--yt-spec-text-primary);
            font-family: Roboto, Arial, sans-serif;
        }
        .yt-error {
            color: #cc0000;
            padding: 12px;
            text-align: center;
            background: #ffebee;
            border-radius: 4px;
            margin: 8px 0;
            font-family: Roboto, Arial, sans-serif;
        }
    `;

    // Helper Functions
    const getApiKey = () => GM_getValue(STORAGE_KEYS.API_KEY, '');
    const setApiKey = (key) => GM_setValue(STORAGE_KEYS.API_KEY, key);

    // Channel detection functions
    function getChannelId() {
        const externalId = typeof ytInitialData !== 'undefined'
            ? ytInitialData?.metadata?.channelMetadataRenderer?.externalId
            || ytInitialData?.header?.c4TabbedHeaderRenderer?.channelId
            : null;

        if (externalId) {
            console.log('Using channel external ID:', externalId);
            return externalId;
        }

        const cfgChannelId = typeof ytcfg !== 'undefined'
            ? (ytcfg?.get?.('CHANNEL_ID') || ytcfg?.data_?.CHANNEL_ID)
            : null;

        if (cfgChannelId) {
            console.log('Using config channel ID:', cfgChannelId);
            return cfgChannelId;
        }

        const metaChannelId = document.querySelector('meta[itemprop="channelId"]')?.content
            || document.querySelector('meta[itemprop="identifier"]')?.content;

        if (metaChannelId) {
            console.log('Using meta channel ID:', metaChannelId);
            return metaChannelId;
        }

        const canonicalHref = document.querySelector('link[rel="canonical"][href*="/channel/"]')?.href;
        if (canonicalHref) {
            const match = canonicalHref.match(/\/channel\/([\w-]+)/);
            if (match) {
                console.log('Using canonical channel ID:', match[1]);
                return match[1];
            }
        }

        const storedChannelId = GM_getValue(STORAGE_KEYS.LAST_CHANNEL, null);
        if (storedChannelId) {
            console.log('Using stored channel ID:', storedChannelId);
            return storedChannelId;
        }

        const path = window.location.pathname.replace(/\/$/, '');
        const cleanPath = path.replace(/\/(videos|featured)$/i, '');
        const segments = cleanPath.split('/').filter(Boolean);

        if (segments.length === 0) return null;

        if (segments[0] === 'channel' && segments[1]) {
            return segments[1];
        }

        const firstSegment = segments[0];
        if (firstSegment.startsWith('@')) {
            return firstSegment;
        }

        if ((firstSegment === 'c' || firstSegment === 'user') && segments[1]) {
            return segments[1];
        }

        console.warn('Unable to determine channel identifier from URL:', path);
        return null;
    }

    function isChannelVideosPage() {
        return location.pathname.includes('/videos');
    }

    // Wait for page content to be ready
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver((mutations) => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    // YouTube API Service
    class YouTubeApiService {
        constructor(apiKey) {
            this.apiKey = apiKey;
            this.baseUrl = 'https://www.googleapis.com/youtube/v3';
            this.channelIdCache = new Map();
        }

        gmRequestJson(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    onload: (response) => {
                        if (response.status === 200) {
                            resolve(JSON.parse(response.responseText));
                        } else {
                            reject(new Error(`API Error: ${response.status} ${response.statusText}`));
                        }
                    },
                    onerror: reject
                });
            });
        }

        async fetchChannelVideos(channelId, pageToken = '') {
            if (!channelId) {
                throw new Error('Channel identifier is required');
            }

            const url = `${this.baseUrl}/search?key=${this.apiKey}&channelId=${channelId}&part=snippet&maxResults=50&order=date&type=video${pageToken ? `&pageToken=${pageToken}` : ''}`;

            try {
                const response = await this.gmRequestJson(url);

                if (!response.items?.length) {
                    return { items: [], nextPageToken: null, pageInfo: { totalResults: 0 } };
                }

                const videoIds = response.items.map(item => item.id.videoId).filter(Boolean);
                if (!videoIds.length) {
                    return response;
                }

                const detailsUrl = `${this.baseUrl}/videos?key=${this.apiKey}&id=${videoIds.join(',')}&part=contentDetails,statistics`;
                const detailsResponse = await this.gmRequestJson(detailsUrl);

                response.items = response.items.map(item => {
                    const detail = detailsResponse.items?.find(video => video.id === item.id.videoId);
                    return {
                        ...item,
                        contentDetails: detail ? detail.contentDetails : null,
                        statistics: detail ? detail.statistics : null
                    };
                });

                return response;
            } catch (error) {
                console.error('Error fetching videos:', error);
                throw error;
            }
        }

        async resolveChannelId(channelId) {
            if (!channelId) {
                throw new Error('Channel identifier is required');
            }

            if (this.channelIdCache.has(channelId)) {
                return this.channelIdCache.get(channelId);
            }

            if (channelId.startsWith('UC')) {
                this.channelIdCache.set(channelId, channelId);
                GM_setValue(STORAGE_KEYS.LAST_CHANNEL, channelId);
                return channelId;
            }

            let resolvedId = null;

            if (!channelId.startsWith('@')) {
                resolvedId = await this.fetchChannelIdByUsername(channelId);
            }

            if (!resolvedId) {
                resolvedId = await this.fetchChannelIdBySearch(channelId);
            }

            if (!resolvedId && channelId.startsWith('@')) {
                resolvedId = await this.fetchChannelIdBySearch(channelId.replace(/^@/, ''));
            }

            if (resolvedId && resolvedId.startsWith('UC')) {
                console.log('Resolved channel ID:', resolvedId);
                this.channelIdCache.set(channelId, resolvedId);
                GM_setValue(STORAGE_KEYS.LAST_CHANNEL, resolvedId);
                return resolvedId;
            }

            console.warn('Unable to resolve channel identifier:', channelId);
            this.channelIdCache.set(channelId, channelId);
            return channelId;
        }

        async fetchChannelIdByUsername(username) {
            if (!username) return null;
            const encoded = encodeURIComponent(username);
            const url = `${this.baseUrl}/channels?key=${this.apiKey}&forUsername=${encoded}&part=id`;
            try {
                const response = await this.gmRequestJson(url);
                return response.items?.[0]?.id || null;
            } catch (error) {
                console.error('Username lookup failed:', error);
                return null;
            }
        }

        async fetchChannelIdBySearch(query) {
            if (!query) return null;
            const encoded = encodeURIComponent(query);
            const url = `${this.baseUrl}/search?key=${this.apiKey}&part=id&type=channel&maxResults=1&q=${encoded}`;
            try {
                const response = await this.gmRequestJson(url);
                return response.items?.[0]?.id?.channelId || null;
            } catch (error) {
                console.error('Channel search lookup failed:', error);
                return null;
            }
        }

        async getAllChannelVideos(channelId, progressCallback) {
            let allVideos = [];
            let nextPageToken = '';
            let totalPages = 0;
            let currentPage = 0;

            const resolvedChannelId = await this.resolveChannelId(channelId);
            if (!resolvedChannelId.startsWith('UC')) {
                throw new Error(`Unable to resolve channel ID for ${channelId}`);
            }

            try {
                do {
                    const response = await this.fetchChannelVideos(resolvedChannelId, nextPageToken);
                    allVideos = [...allVideos, ...response.items];
                    nextPageToken = response.nextPageToken;

                    // Update progress
                    currentPage++;
                    if (currentPage === 1 && response.pageInfo?.totalResults) {
                        totalPages = Math.ceil(parseInt(response.pageInfo.totalResults, 10) / 50);
                    }
                    if (progressCallback) {
                        progressCallback(currentPage, totalPages);
                    }
                } while (nextPageToken);

                return allVideos;
            } catch (error) {
                throw error;
            }
        }

        parseDuration(duration) {
            const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
            const hours = (match[1] || '').replace('H', '');
            const minutes = (match[2] || '').replace('M', '');
            const seconds = (match[3] || '').replace('S', '');

            return (parseInt(hours || 0) * 3600) +
                (parseInt(minutes || 0) * 60) +
                parseInt(seconds || 0);
        }

        categorizeVideos(videos) {
            // Filter out any videos without duration info
            const validVideos = videos.filter(video => video.contentDetails?.duration);

            const all = validVideos;
            const shorts = validVideos.filter(video =>
                this.parseDuration(video.contentDetails.duration) <= 60
            );
            const regular = validVideos.filter(video =>
                this.parseDuration(video.contentDetails.duration) > 60
            );

            return { all, shorts, regular };
        }
    }

    // UI Manager
    class UIManager {
        constructor() {
            this.removeOldButtons();
        }

        removeOldButtons() {
            document.querySelectorAll('.aplaylist-chip-btn').forEach(el => el.remove());
        }

        createChipButton(label, clickHandler) {
            const btn = document.createElement('button');
            btn.className = 'aplaylist-chip-btn ytChipShapeButtonReset style-scope yt-chip-cloud-chip-renderer';
            btn.type = 'button';

            const div = document.createElement('div');
            div.className = 'aplaylist-chip ytChipShapeChip ytChipShapeInactive ytChipShapeOnlyTextPadding';
            div.textContent = label;

            btn.appendChild(div);
            btn.onclick = clickHandler;
            return btn;
        }

        addButtons(videosData, onSortChange) {
            const chips = document.querySelector('div#chips-content iron-selector#chips');
            if (!chips) return;

            this.removeOldButtons();

            // Add video count to labels
            const buttons = [
                { label: `Play All (${videosData.all.length})`, data: videosData.all },
                { label: `Play Videos (${videosData.regular.length})`, data: videosData.regular },
                { label: `Play Shorts (${videosData.shorts.length})`, data: videosData.shorts }
            ];

            // Add buttons for each type
            buttons.forEach(({ label, data }) => {
                const btn = this.createChipButton(label, () => {
                    // Create a temporary container for the sort buttons
                    const sortContainer = document.createElement('div');
                    sortContainer.style.display = 'inline-block';
                    sortContainer.style.marginLeft = '8px';

                    // Add sort buttons
                    const newestBtn = this.createChipButton('Newest First', () => {
                        onSortChange(data, 'newest');
                        sortContainer.remove();
                    });
                    const oldestBtn = this.createChipButton('Oldest First', () => {
                        onSortChange(data, 'oldest');
                        sortContainer.remove();
                    });

                    sortContainer.appendChild(newestBtn);
                    sortContainer.appendChild(oldestBtn);

                    // Insert after the clicked button
                    btn.parentNode.insertBefore(sortContainer, btn.nextSibling);
                });
                chips.appendChild(btn);
            });
        }

        createSortControl() {
            const sort = document.createElement('div');
            sort.className = 'yt-autoplaylist-sort';

            const select = document.createElement('select');
            select.onchange = (e) => {
                this.sortDirection = e.target.value;
                this.updateVideoList(this.currentVideosData);
            };

            ['newest', 'oldest'].forEach(option => {
                const opt = document.createElement('option');
                opt.value = option;
                opt.textContent = `${option.charAt(0).toUpperCase() + option.slice(1)} First`;
                opt.selected = this.sortDirection === option;
                select.appendChild(opt);
            });

            sort.appendChild(select);
            return sort;
        }

        createVideoList(videos) {
            const list = document.createElement('div');
            list.className = 'yt-autoplaylist-list';

            const sortedVideos = [...videos].sort((a, b) => {
                const dateA = new Date(a.snippet.publishedAt);
                const dateB = new Date(b.snippet.publishedAt);
                return this.sortDirection === 'newest' ? dateB - dateA : dateA - dateB;
            });

            sortedVideos.forEach(video => {
                const item = document.createElement('a');
                item.className = 'yt-video-item';
                item.href = `https://www.youtube.com/watch?v=${video.id.videoId}`;
                item.target = '_blank';

                const info = document.createElement('div');
                info.className = 'yt-video-info';

                const title = document.createElement('div');
                title.className = 'yt-video-title';
                title.textContent = video.snippet.title;

                const date = document.createElement('div');
                date.className = 'yt-video-date';
                date.textContent = new Date(video.snippet.publishedAt).toLocaleDateString();

                info.appendChild(title);
                info.appendChild(date);
                item.appendChild(info);
                list.appendChild(item);
            });

            return list;
        }

        showLoading() {
            if (this.listContainer) {
                this.listContainer.innerHTML = '<div class="yt-loading">Loading videos...</div>';
            }
        }

        showError(message) {
            if (this.listContainer) {
                this.listContainer.innerHTML = `<div class="yt-error">${message}</div>`;
            }
        }

        render(videosData) {
            if (this.container) {
                this.container.remove();
            }

            this.container = this.createContainer();
            this.container.appendChild(this.createHeader());
            this.container.appendChild(this.createTabs(videosData));
            this.container.appendChild(this.createSortControl());

            this.listContainer = document.createElement('div');
            this.container.appendChild(this.listContainer);

            document.body.appendChild(this.container);

            this.currentVideosData = videosData;
            this.updateVideoList(videosData);
        }

        updateVideoList(videosData) {
            if (!this.listContainer) return;
            this.listContainer.innerHTML = '';
            this.listContainer.appendChild(this.createVideoList(videosData[this.currentTab]));
        }

        switchTab(tab) {
            this.currentTab = tab;
            const tabs = document.querySelectorAll('.yt-autoplaylist-tab');
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelector(`.yt-autoplaylist-tab:nth-child(${['all', 'regular', 'shorts'].indexOf(tab) + 1})`).classList.add('active');
        }
    }

    // Main Script
    class AutoPlaylistGenerator {
        constructor() {
            this.apiKey = getApiKey();
            this.apiService = null;
            this.uiManager = null;
            this.videosData = null;
            this.initialized = false;

            this.initialize();
        }

        async initialize() {
            // Add styles
            GM_addStyle(CSS_STYLES);

            // Register menu command for API key
            GM_registerMenuCommand('Set YouTube API Key', () => this.promptApiKey());

            // Initialize API if key exists
            if (this.apiKey) {
                this.apiService = new YouTubeApiService(this.apiKey);
            }

            // Start observer for page changes
            this.observePageChanges();
        }

        promptApiKey() {
            const key = prompt('Enter your YouTube Data API v3 Key:', this.apiKey);
            if (key) {
                this.apiKey = key;
                setApiKey(key);
                this.apiService = new YouTubeApiService(key);
                // Try to generate playlists if we're on a channel page
                this.checkAndGeneratePlaylists();
            }
        }

        observePageChanges() {
            // Watch for URL changes
            let lastUrl = location.href;
            new MutationObserver(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    this.checkAndGeneratePlaylists();
                }
            }).observe(document, { subtree: true, childList: true });

            // Initial check
            this.checkAndGeneratePlaylists();
        }

        async checkAndGeneratePlaylists() {
            if (!this.apiKey) {
                if (!this.initialized) {
                    this.promptApiKey();
                    this.initialized = true;
                }
                return;
            }

            if (isChannelVideosPage()) {
                // Wait for the chips container to be present
                const chips = await waitForElement('div#chips-content iron-selector#chips');
                if (!chips) {
                    console.log('Chips container not found');
                    return;
                }

                // Wait a bit for the page data to load
                await new Promise(resolve => setTimeout(resolve, 1000));

                const channelId = getChannelId();
                console.log('Found channel ID:', channelId);

                if (channelId) {
                    this.generatePlaylists(channelId);
                } else {
                    console.log('Channel ID not found');
                }
            }
        }

        async generatePlaylists(channelId) {
            try {
                if (!this.apiService) {
                    this.apiService = new YouTubeApiService(this.apiKey);
                }

                if (!this.uiManager) {
                    this.uiManager = new UIManager();
                }

                // Show loading message
                const loadingChip = this.uiManager.createChipButton('Loading videos...', () => { });
                const chips = document.querySelector('ytd-feed-filter-chip-bar-renderer[page-subtype="channels"] #chips');
                if (chips) {
                    chips.appendChild(loadingChip);
                } else {
                    console.log('Chips container not found, trying alternative selector');
                    const alternativeChips = document.querySelector('#chips-content #chips') || document.querySelector('#chips');
                    if (alternativeChips) {
                        alternativeChips.appendChild(loadingChip);
                    } else {
                        console.error('No suitable container found for buttons');
                        return;
                    }
                }

                console.log('Starting to fetch videos for channel:', channelId);
                // Fetch all videos with progress updates
                const videos = await this.apiService.getAllChannelVideos(channelId, (current, total) => {
                    loadingChip.querySelector('div').textContent = `Loading... (Page ${current}/${total || '?'})`;
                    console.log(`Loading page ${current} of ${total || '?'}`);
                });

                console.log(`Fetched ${videos.length} videos total`);
                // Process videos
                this.videosData = this.apiService.categorizeVideos(videos);

                // Remove loading chip and show video buttons
                loadingChip.remove();
                this.uiManager.addButtons(this.videosData, (videoList, sortOrder) => {
                    // Sort videos
                    const sortedVideos = [...videoList].sort((a, b) => {
                        const dateA = new Date(a.snippet.publishedAt);
                        const dateB = new Date(b.snippet.publishedAt);
                        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
                    });

                    // Create and open playlist with sorted videos
                    const firstVideoId = sortedVideos[0]?.id.videoId;
                    if (firstVideoId) {
                        const playlistIds = sortedVideos.map(v => v.id.videoId);
                        window.location.href = `https://www.youtube.com/watch_videos?video_ids=${playlistIds.join(',')}`;
                    }
                });

            } catch (error) {
                console.error('Error generating playlists:', error);
                const errorChip = this.uiManager.createChipButton('Error: Check API key and channel ID', () => { });
                const chips = document.querySelector('div#chips-content iron-selector#chips');
                if (chips) {
                    this.uiManager.removeOldButtons();
                    chips.appendChild(errorChip);
                    setTimeout(() => errorChip.remove(), 5000);
                } else {
                    alert('Error generating playlists. Please check your API key and channel ID.');
                }
            }
        }
    }

    // Initialize the script
    new AutoPlaylistGenerator();
})();