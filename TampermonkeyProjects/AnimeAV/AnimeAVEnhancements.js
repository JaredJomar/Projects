// ==UserScript==
// @name         AnimeAV Auto Server Selector
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Automatically selects the preferred language and video server on AnimeAV
// @author       JJJ
// @match        https://animeav1.com/media/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=animeav1.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const LANGUAGES = ['SUB', 'DUB'];
    const LANGUAGE_KEY = 'animeav_preferred_language';
    const SERVER_KEY = 'animeav_preferred_server';
    const DEFAULTS = { language: 'DUB', server: 'HLS' };
    let currentPage = window.location.href;

    const readPreference = (key, allowed, fallback) => {
        const value = localStorage.getItem(key);
        return allowed.includes(value) ? value : fallback;
    };

    function getPreferences() {
        return {
            language: readPreference(LANGUAGE_KEY, LANGUAGES, DEFAULTS.language),
            server: localStorage.getItem(SERVER_KEY) || DEFAULTS.server
        };
    }

    function getLanguageRows() {
        return [...document.querySelectorAll('div')].filter(row => {
            const label = [...row.children].find(child => child.tagName === 'SPAN');
            return label && LANGUAGES.includes(label.textContent.trim().toUpperCase());
        });
    }

    function getAvailableServers() {
        return [...new Set(getLanguageRows().flatMap(row =>
            [...row.querySelectorAll('button')].map(button => button.textContent.trim())
        ).filter(Boolean))];
    }

    function activateButton(button) {
        ['mousedown', 'mouseup', 'click'].forEach(type => {
            button.dispatchEvent(new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                view: window
            }));
        });
    }

    function clearEpisodeSelection() {
        document.querySelectorAll('[data-animeav-selected="true"]').forEach(button => {
            delete button.dataset.animeavSelected;
        });
    }

    function findPreferredButton() {
        const preferences = getPreferences();
        const row = getLanguageRows().find(item => {
            const label = [...item.children].find(child => child.tagName === 'SPAN');
            return label?.textContent.trim().toUpperCase() === preferences.language;
        });

        if (!row) return null;
        const buttons = [...row.querySelectorAll('button')];
        return buttons.find(button =>
            button.textContent.trim().toLowerCase() === preferences.server.toLowerCase()
        ) || buttons[0] || null;
    }

    function selectPreferredOption() {
        const button = findPreferredButton();
        if (!(button instanceof HTMLElement)) return;
        if (button.classList.contains('bg-main')) {
            button.dataset.animeavSelected = 'true';
            return;
        }

        button.dataset.animeavSelected = 'true';
        activateButton(button);
        requestAnimationFrame(() => {
            if (button.isConnected && !button.classList.contains('bg-main')) {
                delete button.dataset.animeavSelected;
                activateButton(button);
            }
        });
        console.log(`[AnimeAV] Selected ${getPreferences().language} / ${getPreferences().server}.`);
    }

    function resetEpisodeSelection() {
        currentPage = window.location.href;
        clearEpisodeSelection();
        selectPreferredOption();
    }

    function applyForCurrentPage() {
        if (window.location.href !== currentPage) {
            currentPage = window.location.href;
            clearEpisodeSelection();
        }
        selectPreferredOption();
    }

    function observeNavigation() {
        const notifyNavigation = () => resetEpisodeSelection();
        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;

        window.history.pushState = function (...args) {
            const result = originalPushState.apply(this, args);
            notifyNavigation();
            return result;
        };
        window.history.replaceState = function (...args) {
            const result = originalReplaceState.apply(this, args);
            notifyNavigation();
            return result;
        };
        window.addEventListener('popstate', notifyNavigation);
    }

    function buildSelect(id, values, selected) {
        const select = document.createElement('select');
        select.id = id;
        select.style.cssText = 'width:100%;padding:10px;margin:8px 0;background:#2c2c2c;color:white;border:1px solid #444;border-radius:6px;';

        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            option.selected = value === selected;
            select.appendChild(option);
        });
        return select;
    }

    function toggleSettings() {
        const existing = document.getElementById('animeav-settings');
        if (existing) {
            existing.remove();
            return;
        }

        const preferences = getPreferences();
        const availableServers = getAvailableServers();
        const selectedServer = availableServers.includes(preferences.server)
            ? preferences.server
            : availableServers[0] || preferences.server;
        const modal = document.createElement('div');
        modal.id = 'animeav-settings';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);color:white;font-family:Arial,sans-serif;';

        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.style.cssText = 'width:min(330px,calc(100vw - 32px));padding:25px;border-radius:12px;background:#1e1e1e;box-shadow:0 0 20px #000;box-sizing:border-box;';

        const title = document.createElement('h2');
        title.textContent = 'AnimeAV Settings';
        title.style.marginTop = '0';

        const languageLabel = document.createElement('label');
        languageLabel.textContent = 'Audio / subtitle language';
        const language = buildSelect('animeav-language', LANGUAGES, preferences.language);

        const serverLabel = document.createElement('label');
        serverLabel.textContent = 'Video server';
        const server = buildSelect('animeav-server', availableServers, selectedServer);

        const save = document.createElement('button');
        save.type = 'button';
        save.textContent = 'Save';
        save.style.cssText = 'width:100%;padding:10px;background:#4c8bff;border:0;border-radius:6px;color:white;margin-top:10px;cursor:pointer;';

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = 'Cancel';
        cancel.style.cssText = 'width:100%;padding:10px;background:#333;border:0;border-radius:6px;color:white;margin-top:10px;cursor:pointer;';

        save.addEventListener('click', () => {
            if (!LANGUAGES.includes(language.value) || !availableServers.includes(server.value)) return;
            localStorage.setItem(LANGUAGE_KEY, language.value);
            localStorage.setItem(SERVER_KEY, server.value);
            modal.remove();
            selectPreferredOption();
        });
        cancel.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', event => {
            if (event.target === modal) modal.remove();
        });

        dialog.append(title, languageLabel, language, serverLabel, server, save, cancel);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        language.focus();
    }

    function initialize() {
        window.addEventListener('keydown', event => {
            if (event.key === 'F2') {
                event.preventDefault();
                toggleSettings();
            } else if (event.key === 'Escape') {
                document.getElementById('animeav-settings')?.remove();
            }
        });

        selectPreferredOption();
        const observer = new MutationObserver(applyForCurrentPage);
        observer.observe(document.body, { childList: true, subtree: true });
        observeNavigation();
    }

    if (document.body) initialize();
    else document.addEventListener('DOMContentLoaded', initialize, { once: true });
})();
