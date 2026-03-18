// ==UserScript==
// @name         GitHub Nav Enhancements
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Add Repositories and Stars buttons to GitHub navigation breadcrumbs
// @author       JJJ
// @match        https://github.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    function getCurrentUsername() {
        // Priority: logged-in user menu header (always the correct logged-in user)
        const userHeader = document.querySelector('#global-nav-user-menu-header');
        if (userHeader) {
            const titleElement = userHeader.querySelector('[title]');
            if (titleElement && titleElement.title) {
                return titleElement.title.trim();
            }
        }

        // Fallback: meta tag GitHub sometimes includes
        const metaUser = document.querySelector('meta[name="user-login"]');
        if (metaUser && metaUser.content) {
            return metaUser.content.trim();
        }

        return null;
    }

    function addNavButtons() {
        const breadcrumbsNav = document.querySelector('nav[aria-label="Breadcrumbs"]');
        if (!breadcrumbsNav) return;

        if (document.getElementById('gh-repo-button') || document.getElementById('gh-stars-button')) return;

        const username = getCurrentUsername();
        if (!username) return;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 8px;
            margin-left: 12px;
            align-items: center;
        `;

        function createNavButton(id, href, svgPath, label) {
            const btn = document.createElement('a');
            btn.id = id;
            btn.href = href;
            btn.className = 'btn btn-sm';
            btn.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 500;
                color: var(--fgColor-default);
                text-decoration: none;
                background-color: transparent;
                border: 1px solid var(--borderColor-default);
                border-radius: var(--borderRadius-medium);
                cursor: pointer;
                transition: all 0.2s;
            `;
            btn.innerHTML = `
                <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="14" height="14"
                    fill="currentColor" display="inline-block" overflow="visible"
                    style="vertical-align: text-bottom;">
                    <path d="${svgPath}"></path>
                </svg>
                <span>${label}</span>
            `;
            btn.addEventListener('mouseenter', () => {
                btn.style.backgroundColor = 'var(--color-action-list-item-default-hover-bg)';
                btn.style.borderColor = 'var(--borderColor-muted)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.backgroundColor = 'transparent';
                btn.style.borderColor = 'var(--borderColor-default)';
            });
            return btn;
        }

        const repoPath = 'M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z';
        const starPath = 'M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z';

        buttonContainer.appendChild(createNavButton(
            'gh-repo-button',
            `https://github.com/${username}?tab=repositories`,
            repoPath,
            'Repositories'
        ));
        buttonContainer.appendChild(createNavButton(
            'gh-stars-button',
            `https://github.com/${username}?tab=stars`,
            starPath,
            'Stars'
        ));

        breadcrumbsNav.appendChild(buttonContainer);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addNavButtons);
    } else {
        addNavButtons();
    }

    const observer = new MutationObserver(() => {
        addNavButtons();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
})();