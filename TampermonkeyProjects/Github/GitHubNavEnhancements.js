// ==UserScript==
// @name         GitHub Nav Enhancements
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @description  Add Home, Explorer, Dashboard, Repositories, and Stars buttons to GitHub navigation breadcrumbs
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

        if (
            document.getElementById('gh-home-button') ||
            document.getElementById('gh-explorer-button') ||
            document.getElementById('gh-dashboard-button') ||
            document.getElementById('gh-repo-button') ||
            document.getElementById('gh-stars-button')
        ) return;

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

        const homePath = 'M7.25 2.359a1 1 0 0 1 1.5 0l5.25 5.896a.75.75 0 1 1-1.12.99L12.75 9.1V13.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1-.75-.75V11a.25.25 0 0 0-.25-.25h-1a.25.25 0 0 0-.25.25v2.5a.75.75 0 0 1-.75.75H4a.75.75 0 0 1-.75-.75V9.1l-.13.145a.75.75 0 0 1-1.12-.99Z';
        const explorerPath = 'M8.177.677A.75.75 0 0 1 8.75 0h4.5A1.75 1.75 0 0 1 15 1.75v4.5a.75.75 0 0 1-1.5 0V1.5h-4a.75.75 0 0 1-.677-.823ZM1.75 2h4.5a.75.75 0 0 1 0 1.5h-4a.25.25 0 0 0-.25.25v10c0 .138.112.25.25.25h10a.25.25 0 0 0 .25-.25v-4a.75.75 0 0 1 1.5 0v4A1.75 1.75 0 0 1 12.25 15h-10A1.75 1.75 0 0 1 .5 13.25v-10A1.75 1.75 0 0 1 2.25 1.5Zm11.78 1.72a.75.75 0 0 1 0 1.06L8.81 9.5a.75.75 0 1 1-1.06-1.06l4.72-4.72a.75.75 0 0 1 1.06 0Z';
        const dashboardPath = 'M2.5 1A1.5 1.5 0 0 0 1 2.5v3A1.5 1.5 0 0 0 2.5 7h3A1.5 1.5 0 0 0 7 5.5v-3A1.5 1.5 0 0 0 5.5 1h-3Zm0 1.5h3v3h-3v-3Zm8-1.5A1.5 1.5 0 0 0 9 2.5v3A1.5 1.5 0 0 0 10.5 7h3A1.5 1.5 0 0 0 15 5.5v-3A1.5 1.5 0 0 0 13.5 1h-3Zm0 1.5h3v3h-3v-3Zm-8 6A1.5 1.5 0 0 0 1 10v3A1.5 1.5 0 0 0 2.5 14.5h3A1.5 1.5 0 0 0 7 13v-3A1.5 1.5 0 0 0 5.5 8.5h-3Zm0 1.5h3v3h-3v-3Zm8-1.5A1.5 1.5 0 0 0 9 10v3a1.5 1.5 0 0 0 1.5 1.5h3A1.5 1.5 0 0 0 15 13v-3a1.5 1.5 0 0 0-1.5-1.5h-3Zm0 1.5h3v3h-3v-3Z';
        const repoPath = 'M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z';
        const starPath = 'M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z';

        buttonContainer.appendChild(createNavButton(
            'gh-home-button',
            `https://github.com/${username}`,
            homePath,
            'Home'
        ));
        buttonContainer.appendChild(createNavButton(
            'gh-explorer-button',
            'https://github.com/explore',
            explorerPath,
            'Explorer'
        ));
        buttonContainer.appendChild(createNavButton(
            'gh-dashboard-button',
            'https://github.com/dashboard',
            dashboardPath,
            'Dashboard'
        ));

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