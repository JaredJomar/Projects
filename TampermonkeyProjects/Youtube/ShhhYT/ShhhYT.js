// ==UserScript==
// @name         ShhhYT 
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Efficiently set all channel notification settings to 'None/Ninguna' and paint buttons red, with batch processing and smart auto-scroll
// @author       JJJ
// @match        https://www.youtube.com/feed/channels
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const suscritoLabels = ["Suscrito", "Subscribed"];
    const ningunaLabels = ["Ninguna", "None"];
    const batchSize = 10; // Channels to process per batch
    let processing = false; // Lock
    let paused = false; // For manual control

    // UI Status Bar with Pause/Resume button
    function createStatusBar() {
        let bar = document.createElement('div');
        bar.id = 'shhhyt-status-bar';
        bar.style.position = 'fixed';
        bar.style.bottom = '16px';
        bar.style.right = '16px';
        bar.style.background = 'rgba(20,20,20,0.95)';
        bar.style.color = '#fff';
        bar.style.padding = '10px 16px';
        bar.style.borderRadius = '12px';
        bar.style.zIndex = 99999;
        bar.style.fontSize = '16px';
        bar.style.boxShadow = '0 2px 16px 0 rgba(0,0,0,0.25)';
        bar.innerHTML = `<img src="https://www.google.com/s2/favicons?sz=32&domain=youtube.com" style="vertical-align:middle; width:20px; height:20px; margin-right:10px;">
            <span id="shhhyt-status-msg">ShhhYT loaded…</span>
            <button id="shhhyt-start-btn" style="margin-left:20px; background:#2d7d46; color:#fff; border:none; border-radius:8px; padding:5px 12px; cursor:pointer;">Start</button>
            <button id="shhhyt-toggle-btn" style="margin-left:10px; background:#444; color:#fff; border:none; border-radius:8px; padding:5px 12px; cursor:pointer;">Pause</button>`;
        document.body.appendChild(bar);
        document.getElementById('shhhyt-toggle-btn').onclick = function () {
            paused = !paused;
            this.textContent = paused ? "Resume" : "Pause";
            if (!paused) processBatch();
        };
        document.getElementById('shhhyt-start-btn').onclick = function () {
            paused = false;
            document.getElementById('shhhyt-toggle-btn').textContent = "Pause";
            processBatch();
        };
        return bar;
    }
    if (!document.getElementById('shhhyt-status-bar')) createStatusBar();
    function updateStatus(text) {
        const span = document.getElementById('shhhyt-status-msg');
        if (span) span.textContent = text;
    }

    function waitForElement(selector, root = document, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const el = root.querySelector(selector);
            if (el) return resolve(el);
            const observer = new MutationObserver(() => {
                const el = root.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });
            observer.observe(root, { childList: true, subtree: true });
            setTimeout(() => {
                observer.disconnect();
                reject(new Error("Timeout waiting for: " + selector));
            }, timeout);
        });
    }

    // Batch processor
    async function processBatch() {
        if (processing || paused) return;
        processing = true;
        try {
            const btnSpans = Array.from(document.querySelectorAll('yt-button-shape button span'));
            const subButtons = btnSpans.filter(span =>
                suscritoLabels.includes(span.textContent.trim())
            ).map(span => span.closest('button')).filter(btn => btn && btn.dataset.shhhytDone !== "true");

            let total = document.querySelectorAll('ytd-channel-renderer').length;
            let batch = subButtons.slice(0, batchSize);

            for (const btn of batch) {
                if (paused) break; // Check for pause
                btn.scrollIntoView({ behavior: "smooth", block: "center" });
                btn.click();

                // Wait for menu popup to appear
                let popup;
                try {
                    popup = await waitForElement('ytd-menu-popup-renderer[role="menu"]');
                } catch (e) {
                    continue;
                }

                // Wait for "Ninguna/None" option in the popup
                try {
                    await waitForElement(
                        'tp-yt-paper-item, yt-formatted-string',
                        popup,
                        4000
                    );
                } catch (e) {
                    continue;
                }

                const options = Array.from(popup.querySelectorAll('tp-yt-paper-item, yt-formatted-string'));
                const ninguna = options.find(opt =>
                    ningunaLabels.some(word => opt.textContent.trim().toLowerCase() === word.toLowerCase())
                );

                if (ninguna) {
                    const menuItem = ninguna.closest('ytd-menu-service-item-renderer, tp-yt-paper-item');
                    const alreadyNinguna = menuItem?.getAttribute('aria-selected') === "true" || menuItem?.classList.contains('iron-selected');
                    if (!alreadyNinguna) {
                        ninguna.click();
                    }
                    btn.style.backgroundColor = "red";
                    btn.style.color = "#fff";
                    btn.style.borderRadius = "20px";
                    btn.dataset.shhhytDone = "true";
                }
                document.body.click();
            }

            let done = document.querySelectorAll('yt-button-shape button[data-shhhyt-done="true"]').length;
            updateStatus(`ShhhYT: ${done}/${total} processed. Batch: ${batch.length}. Paused: ${paused ? "YES" : "NO"}`);

            // Auto-scroll if at the bottom (load more channels)
            if (!paused && (batch.length > 0 || subButtons.length >= batchSize)) {
                window.scrollTo(0, document.body.scrollHeight);
                setTimeout(processBatch, 800); // Next batch after a short break
            } else {
                updateStatus(`ShhhYT: FINISHED. ${done} channels processed!`);
            }

        } finally {
            processing = false;
        }
    }

    // MutationObserver for infinite scroll (debounced)
    let debounceTimer;
    let observer = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { if (!paused) processBatch(); }, 500);
    });
    let targetNode = document.querySelector('ytd-section-list-renderer') || document.body;
    observer.observe(targetNode, { childList: true, subtree: true });

    setTimeout(() => {
        // No auto-start, just update status
        updateStatus('ShhhYT loaded. Click Start to begin.');
    }, 1000);

})();
