// ==UserScript==
// @name         JKAnime Auto Server Selector
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Auto-click 'Accept and Continue' inside iframe, auto-select server, F2 settings
// @author       JJJ
// @match        https://jkanime.net/*/*/*
// @match        https://jkanime.net/jkplayer/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jkanime.net
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const IS_IFRAME = window.location.pathname.includes('/jkplayer/');
    const STORAGE_KEY = 'jk_preferred_server';
    const SERVERS = [
        'Desu', 'Magi', 'Okru', 'StreamWish', 'Streamwish',
        'Mega', 'VOE', 'Vidhide', 'Filemoon', 'Mixdrop',
        'Mp4upload', 'Streamtape', 'Doodstream'
    ];
    const DEFAULT_SERVER = 'Mega';

    function getPreferredServer() {
        const saved = localStorage.getItem(STORAGE_KEY);
        return SERVERS.includes(saved) ? saved : DEFAULT_SERVER;
    }

    function dispatchClick(element) {
        if (!(element instanceof HTMLElement)) return;

        ['mousedown', 'mouseup', 'click'].forEach(type => {
            element.dispatchEvent(new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                view: window
            }));
        });
    }

    function findAcceptButton() {
        const selectors = [
            'button.accept-risk',
            '.accept-risk',
            "button[onclick*='hideMsj']"
        ];

        for (const selector of selectors) {
            const button = document.querySelector(selector);
            if (button instanceof HTMLElement) return button;
        }

        const button = [...document.querySelectorAll('button')].find(item => {
            const text = item.textContent.trim().toLowerCase();
            return text.includes('accept') || text.includes('continue');
        });

        return button instanceof HTMLElement ? button : null;
    }

    function autoClickAcceptRisk() {
        const button = findAcceptButton();
        if (!button || button.dataset.jkClicked === 'true') return;

        button.dataset.jkClicked = 'true';
        dispatchClick(button);
        console.log('[JKAnime] Accept button clicked.');
    }

    function startIframeAutomation() {
        autoClickAcceptRisk();

        const observer = new MutationObserver(autoClickAcceptRisk);
        const observe = () => {
            if (document.body) observer.observe(document.body, { childList: true, subtree: true });
        };

        observe();
        window.setInterval(autoClickAcceptRisk, 1000);
    }

    function createSettingsModal() {
        const existing = document.getElementById('jk-config-modal');
        if (existing) {
            existing.remove();
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'jk-config-modal';
        modal.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:999999', 'display:flex',
            'align-items:center', 'justify-content:center', 'background:rgba(0,0,0,.7)',
            'color:white', 'font-family:Arial,sans-serif'
        ].join(';');

        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.style.cssText = [
            'width:min(330px,calc(100vw - 32px))', 'padding:25px', 'border-radius:12px',
            'background:#1e1e1e', 'box-shadow:0 0 20px #000', 'box-sizing:border-box'
        ].join(';');

        const title = document.createElement('h2');
        title.textContent = 'JKAnime Settings';
        title.style.marginTop = '0';

        const label = document.createElement('label');
        label.textContent = 'Default server';
        label.htmlFor = 'jk-server-select';

        const select = document.createElement('select');
        select.id = 'jk-server-select';
        select.style.cssText = 'width:100%;padding:10px;margin:10px 0;background:#2c2c2c;color:white;border:1px solid #444;border-radius:6px;';

        const preferred = getPreferredServer();
        SERVERS.forEach(server => {
            const option = document.createElement('option');
            option.value = server;
            option.textContent = server;
            option.selected = server === preferred;
            select.appendChild(option);
        });

        const save = document.createElement('button');
        save.type = 'button';
        save.textContent = 'Save';
        save.style.cssText = 'width:100%;padding:10px;background:#4c8bff;border:0;border-radius:6px;color:white;margin-top:10px;cursor:pointer;';

        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Cancel';
        close.style.cssText = 'width:100%;padding:10px;background:#333;border:0;border-radius:6px;color:white;margin-top:10px;cursor:pointer;';

        const removeModal = () => modal.remove();
        save.addEventListener('click', () => {
            if (!SERVERS.includes(select.value)) return;
            localStorage.setItem(STORAGE_KEY, select.value);
            removeModal();
            window.location.reload();
        });
        close.addEventListener('click', removeModal);
        modal.addEventListener('click', event => {
            if (event.target === modal) removeModal();
        });

        dialog.append(title, label, select, save, close);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        select.focus();
    }

    function setupSettingsShortcut() {
        window.addEventListener('keydown', event => {
            if (event.key === 'F2') {
                event.preventDefault();
                createSettingsModal();
            } else if (event.key === 'Escape') {
                document.getElementById('jk-config-modal')?.remove();
            }
        });
    }

    function getServerButtons() {
        return [...document.querySelectorAll('#collapseServers .servers')]
            .filter(button => button instanceof HTMLElement);
    }

    function selectPreferredServer() {
        const preferred = getPreferredServer().toLowerCase();
        const target = getServerButtons().find(button =>
            button.textContent.trim().toLowerCase() === preferred
        );

        if (!target || target.dataset.jkSelected === 'true') return false;

        target.dataset.jkSelected = 'true';
        dispatchClick(target);
        console.log(`[JKAnime] Auto-selected: ${getPreferredServer()}`);
        return true;
    }

    function startMainPageAutomation() {
        setupSettingsShortcut();
        selectPreferredServer();

        const observer = new MutationObserver(selectPreferredServer);
        const observe = () => {
            if (document.body) observer.observe(document.body, { childList: true, subtree: true });
        };

        if (document.body) observe();
        else document.addEventListener('DOMContentLoaded', observe, { once: true });
    }

    if (IS_IFRAME) startIframeAutomation();
    else startMainPageAutomation();
})();
