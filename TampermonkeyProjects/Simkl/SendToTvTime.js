// ==UserScript==
// @name         Send to TV Time
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Add TV Time button to Simkl movie pages
// @author       JJJ
// @match        https://simkl.com/movies/*
// @match        https://app.tvtime.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=simkl.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Handle TV Time search page
    if (window.location.hostname === 'app.tvtime.com') {
        const observer = new MutationObserver((mutations, obs) => {
            const searchInput = document.querySelector('input[type="text"]');
            if (searchInput) {
                obs.disconnect();
                setTimeout(() => {
                    navigator.clipboard.readText().then(text => {
                        searchInput.focus();
                        // Simula el pegado usando execCommand
                        if (!document.execCommand('insertText', false, text)) {
                            // Fallback: asigna el valor directamente
                            searchInput.value = text;
                        }
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    });
                }, 1000);
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        return;
    }

    // Add TV Time button styles
    const style = document.createElement('style');
    style.textContent = `
        .tvtime-button {
            background: url('https://www.tvtime.com/favicon.ico') center/24px no-repeat;
            width: 50px;
            height: 24px;
            display: inline-block;
            margin-top: 8px;
        }
    `;
    document.head.appendChild(style);

    // Create TV Time button cell
    const tvTimeCell = document.createElement('td');
    tvTimeCell.width = "1";
    tvTimeCell.innerHTML = `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" class="SimklTVAboutRatingBorder SimklTVAboutRatingBorderClick">
            <tr>
                <td>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td height="40" align="center">
                                <a href="#" class="tvtime-button" id="tvTimeButton"></a>
                            </td>
                        </tr>
                        <tr>
                            <td align="center">
                                <span class="SimklTVRatingTen">TV Time</span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    // Función para insertar o reinsertar el botón si no existe
    function observeAndInsertTVTimeButton() {
        const observer = new MutationObserver((mutations, obs) => {
            const imdbLink = document.querySelector('a[href*="imdb.com"]');
            if (imdbLink) {
                const imdbCell = imdbLink.closest('td[width="1"]');
                if (imdbCell && !document.getElementById('tvTimeButton')) {
                    const spacerCell = document.createElement('td');
                    spacerCell.innerHTML = '&nbsp;';
                    imdbCell.parentNode.insertBefore(spacerCell, imdbCell.nextSibling);
                    imdbCell.parentNode.insertBefore(tvTimeCell, spacerCell.nextSibling);
                }
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Inicia el observador desde DOMContentLoaded para páginas dinámicas
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeAndInsertTVTimeButton);
    } else {
        observeAndInsertTVTimeButton();
    }

    // Reemplaza el click handler directo con delegación de eventos
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('#tvTimeButton');
        if (btn) {
            e.preventDefault();
            const title = document.querySelector('h1[itemprop="name"]').textContent.trim();
            // Copy to clipboard
            navigator.clipboard.writeText(title).catch(err => {
                console.error('Failed to copy title:', err);
            });
            window.open(`https://app.tvtime.com/explore/search/media?q=${encodeURIComponent(title)}`, '_blank');
        }
    });

})();