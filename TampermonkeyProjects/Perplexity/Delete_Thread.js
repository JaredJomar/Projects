// ==UserScript==
// @name Delete Thread
// @namespace http://tampermonkey.net/
// @version 0.1.2
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
        // If the ESC key is pressed, cancel the deletion
        else if (event.key === 'Escape') {
            cancelDeletion();
        }
    });

    // Function to open the menu and trigger the delete thread action
    function openMenuAndDeleteThread() {
        var ellipsisButton = document.querySelector('[data-testid="thread-dropdown-menu"]');
        if (ellipsisButton) {
            ellipsisButton.click();
            setTimeout(deleteThread, 10); // Wait for a short time before triggering the delete thread action
        } else {
            console.log('Dropdown menu button not found');
        }
    }

    // Function to trigger the delete thread action
    function deleteThread() {
        var deleteButton = document.querySelector('[data-testid="thread-delete"]');
        if (deleteButton) {
            deleteButton.click();
            console.log('Thread deletion triggered');
        } else {
            var deleteButtonText = Array.from(document.querySelectorAll('span')).find(button => button.textContent === 'Delete');
            if (deleteButtonText) {
                deleteButtonText.click();
                console.log('Thread deletion triggered via text content');
            } else {
                console.log('Delete button not found');
            }
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
        // Try to find the Nevermind button by its text content
        var nevermindButton = Array.from(document.querySelectorAll('button')).find(
            button => button.textContent.trim() === 'Nevermind'
        );

        // If not found, try the close button with data-testid
        if (!nevermindButton) {
            nevermindButton = document.querySelector('[data-testid="close-modal"]');
        }

        // If still not found, try the previous class-based selector as fallback
        if (!nevermindButton) {
            nevermindButton = document.querySelector('button.bg-offsetPlus.dark\\:bg-offsetPlusDark.text-textMain.dark\\:text-textMainDark');
        }

        if (nevermindButton) {
            nevermindButton.click();
            console.log('Deletion canceled successfully');
        } else {
            console.log('Cancel button not found');
        }
    }
})();