// ==UserScript==
// @name Delete Thread
// @namespace http://tampermonkey.net/
// @version 0.1
// @description Delete thread on Perplexity by pressing the Delete key and confirming with Enter
// @author JJJ
// @match https://www.perplexity.ai/*
// @icon https://www.google.com/s2/favicons?sz=64&domain=perplexity.ai
// @grant none
// @license MIT
// ==/UserScript==

(function () {
    'use strict';

    // Listen for keydown events
    document.addEventListener('keydown', function (event) {
        // If the Delete key is pressed, open the menu and trigger the delete thread action
        if (event.key === 'Delete') {
            openMenuAndDeleteThread();
        }
        // If the Enter key is pressed, confirm the deletion
        else if (event.key === 'Enter') {
            confirmDeletion();
        }
        // If the Backspace key is pressed, cancel the deletion
        else if (event.key === 'Backspace') {
            cancelDeletion();
        }
    });

    // Function to open the menu and trigger the delete thread action
    function openMenuAndDeleteThread() {
        var ellipsisButton = document.querySelector('svg[data-icon="ellipsis"]').parentNode;
        if (ellipsisButton) {
            ellipsisButton.click();
            setTimeout(deleteThread, 10); // Wait for a short time before triggering the delete thread action
        } else {
            console.log('Ellipsis button not found');
        }
    }

    // Function to trigger the delete thread action
    function deleteThread() {
        var deleteButton = Array.from(document.querySelectorAll('span')).find(button => button.textContent === 'Delete Thread');
        if (deleteButton) {
            deleteButton.click();
            console.log('Thread deletion triggered');
        } else {
            console.log('Delete button not found');
        }
    }

    // Function to confirm the deletion
    function confirmDeletion() {
        var confirmButton = document.querySelector('.bg-superAlt.text-white');
        if (confirmButton) {
            confirmButton.click();
            console.log('Confirm triggered');
        } else {
            console.log('Confirm button not found');
        }
    }

    // Function to cancel the deletion
    function cancelDeletion() {
        var nevermindButton = document.querySelector('');
        if (nevermindButton) {
            nevermindButton.click();
            console.log('Nevermind triggered');
        } else {
            console.log('Nevermind button not found');
        }
    }
})();