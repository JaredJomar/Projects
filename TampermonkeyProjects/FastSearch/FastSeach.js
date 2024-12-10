// ==UserScript==
// @name         Fast Search
// @namespace    fast-search
// @version      0.1.6
// @description  Quickly search various sites using custom shortcuts with an improved UI.
// @author       JJJ
// @icon         https://th.bing.com/th/id/OIG4.Zgw8Ep_gbQoBnQO33DyS?pid=ImgGn
// @match        *://*/*
// @grant        GM_addStyle
// @grant        window.focus
// @run-at       document-end
// @require      https://unpkg.com/react@17/umd/react.production.min.js
// @require      https://unpkg.com/react-dom@17/umd/react-dom.production.min.js
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const SEARCH_ENGINES = {
        // Search
        a: { name: "Amazon", url: "https://www.amazon.com/s?k=" },
        g: { name: "Google", url: "https://www.google.com/search?q=" },
        b: { name: "Bing", url: "https://www.bing.com/search?q=" },
        d: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
        gs: { name: "Google Scholar", url: "https://scholar.google.com/scholar?q=" },
        gi: { name: "Google Images", url: "https://www.google.com/search?tbm=isch&q=" },
        ar: { name: "Internet Archive", url: "https://archive.org/search.php?query=" },
        way: { name: "Wayback Machine", url: "https://web.archive.org/web/*/" },
        w: { name: "Wikipedia", url: "https://en.wikipedia.org/w/index.php?search=" },
        p: { name: "Perplexity", url: "https://www.perplexity.ai/?q=" },

        // Coding
        gf: { name: "Greasy Fork", url: "https://greasyfork.org/en/scripts?q=" },
        gh: { name: "GitHub", url: "https://github.com/search?q=" },
        so: { name: "Stack Overflow", url: "https://stackoverflow.com/search?q=" },

        // Social
        r: { name: "Reddit", url: "https://www.reddit.com/search/?q=" },
        li: { name: "LinkedIn", url: "https://www.linkedin.com/search/results/all/?keywords=" },
        t: { name: "Twitch", url: "https://www.twitch.tv/search?term=" },
        x: { name: "Twitter", url: "https://twitter.com/search?q=" },
        f: { name: "Facebook", url: "https://www.facebook.com/search/top/?q=" },
        i: { name: "Instagram", url: "https://www.instagram.com/explore/tags/" },
        pi: { name: "Pinterest", url: "https://www.pinterest.com/search/pins/?q=" },
        tu: { name: "Tumblr", url: "https://www.tumblr.com/search/" },
        q: { name: "Quora", url: "https://www.quora.com/search?q=" },
        sc: { name: "SoundCloud", url: "https://soundcloud.com/search?q=" },
        y: { name: "YouTube", url: "https://www.youtube.com/results?search_query=" },
        tk: { name: "TikTok", url: "https://www.tiktok.com/search?q=" },
        fi: { name: "Find That Meme", url: "https://findthatmeme.com/?search=" },

        // Gaming
        steam: { name: "Steam", url: "https://store.steampowered.com/search/?term=" },
        epic: { name: "Epic Games", url: "https://store.epicgames.com/en-US/browse?q=" },
        gog: { name: "GOG", url: "https://www.gog.com/games?search=" },
        ubi: { name: "Ubisoft", url: "https://store.ubi.com/us/search?q=" },
        g2: { name: "G2A", url: "https://www.g2a.com/search?query=" },
        cd: { name: "CDKeys", url: "https://www.cdkeys.com/catalogsearch/result/?q=" },
        ori: { name: "Origin", url: "https://www.origin.com/search?searchString=" },
        bat: { name: "Battle.net", url: "https://shop.battle.net/search?q=" },

        // Movies and TV Shows
        c: { name: "Cuevana", url: "https://wow.cuevana3.nu/search?s=" },
        lm: { name: "LookMovie (Movies)", url: "https://www.lookmovie2.to/movies/search/?q=" },
        ls: { name: "LookMovie (Shows)", url: "https://www.lookmovie2.to/shows/search/?q=" },
    };

    // Utility functions
    const isFocusInEditable = () => {
        const el = document.activeElement;
        return el.isContentEditable || ['input', 'textarea'].includes(el.tagName.toLowerCase());
    };

    const constructSearchUrl = (shortcut, query) => {
        const engine = SEARCH_ENGINES[shortcut] || SEARCH_ENGINES.g;
        let baseUrl = engine.url;
        if (shortcut === 'epic') {
            baseUrl += `${encodeURIComponent(query)}&sortBy=relevancy&sortDir=DESC&count=40`;
        } else {
            baseUrl += encodeURIComponent(query);
        }
        return baseUrl;
    };

    const openNewTab = (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const searchMultipleGamingPlatforms = (query) => {
        const platforms = ['g2', 'cd'];
        platforms.forEach(platform => {
            const searchUrl = constructSearchUrl(platform, query);
            openNewTab(searchUrl);
        });
    };

    // React components
    const BotInterface = ({ onClose }) => {
        const [input, setInput] = React.useState('');
        const [results, setResults] = React.useState([]);
        const [currentEngine, setCurrentEngine] = React.useState(null);
        const inputRef = React.useRef(null);

        React.useEffect(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };

            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }, []);

        React.useEffect(() => {
            const [shortcut] = input.trim().split(/\s+/);
            const engine = SEARCH_ENGINES[shortcut.toLowerCase()];
            setCurrentEngine(engine || null);
        }, [input]);

        const handleSearch = () => {
            const [rawShortcut, ...queryParts] = input.trim().split(/\s+/);
            const shortcut = rawShortcut.toLowerCase();
            const query = queryParts.join(" ");

            let newResults = [];

            if (shortcut === 'sg') {
                newResults.push({ type: 'info', message: 'Searching multiple gaming platforms...' });
                searchMultipleGamingPlatforms(query);
            } else if (SEARCH_ENGINES.hasOwnProperty(shortcut)) {
                const searchUrl = constructSearchUrl(shortcut, query || '');
                const siteName = SEARCH_ENGINES[shortcut].name;
                newResults.push({ type: 'link', url: searchUrl, message: `Searching ${siteName} for "${query}"` });
                openNewTab(searchUrl);
            } else {
                const searchUrl = SEARCH_ENGINES.g.url + encodeURIComponent(input);
                newResults.push({ type: 'link', url: searchUrl, message: `Searching Google for "${input}"` });
                openNewTab(searchUrl);
            }

            setResults(prevResults => [...newResults, ...prevResults]);
            setInput('');

            // Close the UI after performing the search
            setTimeout(() => {
                onClose();
            }, 100);
        };

        return React.createElement('div', { className: 'fixed top-4 right-4 min-w-[20rem] max-w-[30rem] w-[90vw] bg-custom-dark shadow-lg rounded-lg overflow-hidden' },
            React.createElement('div', { className: 'p-4' },
                React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                    React.createElement('h2', { className: 'text-lg font-bold text-white' }, 'Fast Search'),
                    React.createElement('button', {
                        onClick: onClose,
                        className: 'text-gray-400 hover:text-gray-200'
                    }, '×')
                ),
                React.createElement('div', { className: 'flex gap-2 mb-4 relative' },
                    React.createElement('div', { className: 'flex-1 relative' },
                        currentEngine && React.createElement('div', {
                            className: 'absolute right-2 top-0 transform -translate-y-6 bg-blue-600 text-white text-xs px-2 py-1 rounded'
                        }, currentEngine.name),
                        React.createElement('input', {
                            ref: inputRef,
                            type: 'text',
                            value: input,
                            onChange: (e) => setInput(e.target.value),
                            onKeyPress: (e) => e.key === 'Enter' && handleSearch(),
                            placeholder: 'Enter search command...',
                            className: 'w-full px-3 py-2 bg-custom-darker border-0 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                        })
                    ),
                    React.createElement('button', {
                        onClick: handleSearch,
                        className: 'min-w-[80px] px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap flex-shrink-0'
                    }, 'Search')
                ),
                React.createElement('div', { className: 'space-y-2' },
                    results.map((result, index) =>
                        React.createElement('div', { key: index, className: 'text-sm' },
                            result.type === 'link'
                                ? React.createElement('a', {
                                    href: result.url,
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                    className: 'text-blue-400 hover:text-blue-300 hover:underline'
                                }, result.message)
                                : React.createElement('span', {
                                    className: 'text-gray-300'
                                }, result.message)
                        )
                    )
                )
            )
        );
    };

    // Main script
    const init = () => {
        let botContainer = null;

        const showBot = () => {
            if (botContainer) return;

            botContainer = document.createElement('div');
            document.body.appendChild(botContainer);

            ReactDOM.render(
                React.createElement(BotInterface, {
                    onClose: () => {
                        ReactDOM.unmountComponentAtNode(botContainer);
                        botContainer.remove();
                        botContainer = null;
                    }
                }),
                botContainer
            );
        };

        document.addEventListener('keydown', event => {
            if (event.key === 'Insert' && !isFocusInEditable()) {
                event.preventDefault();
                showBot();
            }
        }, true);
    };

    // Add styles
    GM_addStyle(`
        .fixed { position: fixed; }
        .top-4 { top: 1rem; }
        .right-4 { right: 1rem; }
        .w-80 { width: 20rem; }
        .bg-custom-dark { background-color: #030d22; }
        .bg-custom-darker { background-color: #15132a; }
        .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2); }
        .rounded-lg { border-radius: 0.5rem; }
        .overflow-hidden { overflow: hidden; }
        /* Add very high z-index to ensure it's above everything */
        .fixed.top-4.right-4 { z-index: 2147483647; }
        .p-4 { padding: 1rem; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }
        .mb-4 { margin-bottom: 1rem; }
        .text-lg { font-size: 1.125rem; }
        .font-bold { font-weight: 700; }
        .text-white { color: white; }
        .text-gray-200 { color: #e5e7eb; }
        .text-gray-300 { color: #d1d5db; }
        .text-gray-400 { color: #9ca3af; }
        .hover\\:text-gray-200:hover { color: #e5e7eb; }
        .w-full { width: 100%; }
        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .rounded-l-md { border-top-left-radius: 0.375rem; border-bottom-left-radius: 0.375rem; }
        .focus\\:outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
        .focus\\:ring-2:focus { --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color); --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color); box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000); }
        .focus\\:ring-blue-500:focus { --tw-ring-opacity: 1; --tw-ring-color: rgba(59, 130, 246, var(--tw-ring-opacity)); }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .bg-blue-600 { background-color: #2563eb; }
        .hover\\:bg-blue-700:hover { background-color: #1d4ed8; }
        .text-blue-400 { color: #60a5fa; }
        .hover\\:text-blue-300:hover { color: #93c5fd; }
        .rounded-r-md { border-top-right-radius: 0.375rem; border-bottom-right-radius: 0.375rem; }
        .space-y-2 > :not([hidden]) ~ :not([hidden]) { --tw-space-y-reverse: 0; margin-top: calc(0.5rem * calc(1 - var(--tw-space-y-reverse))); margin-bottom: calc(0.5rem * var(--tw-space-y-reverse)); }
        .text-sm { font-size: 0.875rem; }
        .hover\\:underline:hover { text-decoration: underline; }
        .placeholder-gray-400::placeholder { color: #9ca3af; }
        .relative { position: relative; }
        .transform { transform: var(--tw-transform); }
        .-translate-y-1/2 { --tw-translate-y: -50%; transform: var(--tw-transform); }
        .text-xs { font-size: 0.75rem; line-height: 1rem; }
        .pl-24 { padding-left: 6rem; }
        .top-1/2 { top: 50%; }
        .left-2 { left: 0.5rem; }
        .min-w-\\[20rem\\] { min-width: 20rem; }
        .max-w-\\[30rem\\] { max-width: 30rem; }
        .w-\\[90vw\\] { width: 90vw; }
        .gap-2 { gap: 0.5rem; }
        .flex-1 { flex: 1 1 0%; }
        .flex-shrink-0 { flex-shrink: 0; }
        .whitespace-nowrap { white-space: nowrap; }
        .rounded-md { border-radius: 0.375rem; }
        .min-w-\\[80px\\] { min-width: 80px; }
        .-translate-y-6 { --tw-translate-y: -1.5rem; }
    `);

    // Start the script
    init();
})();