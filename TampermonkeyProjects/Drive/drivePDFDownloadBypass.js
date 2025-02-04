// ==UserScript==
// @name         Drive PDF Download Bypass
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  PDF download bypass for Google Drive files automatically scrolling and capturing images to generate a PDF file for download.
// @match        https://drive.google.com/file/d/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        GM_registerMenuCommand
// @require      https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js
// @license      MIT
// ==/UserScript==

(function () {
    "use strict";

    // --- Configuration ---
    // Adjust the scroll delay (in milliseconds). Lower values increase speed.
    const SCROLL_DELAY = 500;

    // --- Utility Functions ---
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Rescale dimensions to fit within target dimensions while preserving aspect ratio.
    const rescale = (width, height, fitWidth, fitHeight) => {
        const ratio = width / height;
        const fitRatio = fitWidth / fitHeight;
        return ratio <= fitRatio ? [width, width / fitRatio] : [height * fitRatio, height];
    };

    // Convert an image element to a base64-encoded JPEG.
    const imageToBase64 = (img, quality = 0.6) => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const maxSize = 1000;
        const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", quality);
    };

    // Ensure an image is loaded before processing.
    const loadImage = img => new Promise(resolve => {
        if (img.complete) {
            resolve();
        } else {
            img.onload = resolve;
        }
    });

    // --- UI Functions ---
    // Create the progress UI (progress bar and stop button).
    const createProgressUI = () => {
        const progressBar = document.createElement("div");
        progressBar.id = "customProgressBar";
        Object.assign(progressBar.style, {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "350px",
            height: "40px",
            backgroundColor: "#000",
            color: "#fff",
            border: "2px solid #fff",
            borderRadius: "8px",
            textAlign: "center",
            lineHeight: "40px",
            fontSize: "18px",
            fontWeight: "bold",
            zIndex: "9999"
        });
        progressBar.innerText = "Preparing...";
        document.body.appendChild(progressBar);

        const stopButton = document.createElement("button");
        stopButton.innerText = "Stop Scrolling";
        Object.assign(stopButton.style, {
            position: "fixed",
            top: "60%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "10px",
            fontSize: "16px",
            fontWeight: "bold",
            backgroundColor: "red",
            color: "white",
            border: "none",
            borderRadius: "5px",
            zIndex: "9999",
            cursor: "pointer"
        });
        stopButton.onclick = () => {
            stopScrolling = true;
            progressBar.innerText = "Stopped. Processing PDF...";
            stopButton.remove();
        };
        document.body.appendChild(stopButton);
    };

    const updateProgressUI = text => {
        const progressBar = document.getElementById("customProgressBar");
        if (progressBar) progressBar.innerText = text;
    };

    const removeProgressUI = () => {
        const progressBar = document.getElementById("customProgressBar");
        if (progressBar) progressBar.remove();
    };

    // --- Global State ---
    let stopScrolling = false;
    let capturedImages = [];

    // --- Image Capture Function ---
    // Capture all visible images whose src begins with "blob:".
    const captureVisibleImages = async () => {
        const images = document.querySelectorAll("img[src^='blob:']");
        images.forEach(img => {
            if (!capturedImages.some(captured => captured.src === img.src)) {
                const imgCopy = new Image();
                imgCopy.src = img.src;
                capturedImages.push({ src: img.src, element: imgCopy });
                console.log(`Captured image ${capturedImages.length}`);
            }
        });
    };

    // --- Auto-Scroll & Capture ---
    // Continuously scroll and capture images until the target page count is reached or stopScrolling is true.
    const autoScrollWithCapture = async (targetPageCount) => {
        let lastIndex = 0;
        while (!stopScrolling && capturedImages.length < targetPageCount) {
            const images = document.querySelectorAll("img[src^='blob:']");
            if (lastIndex < images.length) {
                // Scroll to each new image.
                for (; lastIndex < images.length && !stopScrolling && capturedImages.length < targetPageCount; lastIndex++) {
                    images[lastIndex].scrollIntoView({ behavior: "smooth", block: "center" });
                    await sleep(SCROLL_DELAY);
                    await captureVisibleImages();
                    updateProgressUI(`Captured: ${capturedImages.length} pages. Scrolling... (${lastIndex + 1}/${images.length})`);
                }
            } else {
                // If no new images are found, scroll further down.
                window.scrollBy(0, window.innerHeight * 0.8);
                await sleep(SCROLL_DELAY);
                await captureVisibleImages();
                updateProgressUI(`Captured: ${capturedImages.length} pages. Scrolling...`);
            }
        }
    };

    // --- PDF Generation ---
    // Generate the PDF from captured images and download it.
    const generatePDF = async () => {
        try {
            // Ask the user for the total number of pages in the PDF.
            const targetPages = parseInt(prompt("Enter the total number of pages in the PDF:"), 10);
            if (isNaN(targetPages) || targetPages <= 0) {
                alert("Invalid number of pages.");
                return;
            }

            // Reset state for a new run.
            stopScrolling = false;
            capturedImages = [];

            createProgressUI();
            updateProgressUI("Scrolling pages to capture...");

            console.log("Starting page capture with scrolling...");
            // Continue scrolling until the number of captured pages reaches the target.
            await autoScrollWithCapture(targetPages);

            // Before analyzing, update UI with the total captured pages.
            updateProgressUI(`Captured: ${capturedImages.length} pages. Analyzing...`);
            console.log(`Captured ${capturedImages.length} pages. Generating PDF...`);

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            let imageCount = 0;
            for (const { element: img } of capturedImages) {
                await loadImage(img);
                const imgData = imageToBase64(img, 0.6);
                const [newWidth, newHeight] = rescale(pdfWidth, pdfHeight, img.naturalWidth, img.naturalHeight);
                pdf.addImage(imgData, "JPEG", 0, 0, newWidth, newHeight);
                pdf.addPage();
                imageCount++;
                updateProgressUI(`Processing image ${imageCount}...`);
            }

            if (imageCount === 0) {
                alert("No images found. Please scroll manually through the PDF and try again.");
                removeProgressUI();
                return;
            }

            pdf.deletePage(pdf.internal.getNumberOfPages()); // Remove the last (empty) page.
            pdf.save("download.pdf");
            console.log("PDF downloaded successfully.");
            updateProgressUI("Download complete!");
            await sleep(2000);
            removeProgressUI();
        } catch (error) {
            console.error("Error:", error);
            updateProgressUI("An error occurred.");
            await sleep(2000);
            removeProgressUI();
        }
    };

    // --- Register the Menu Command ---
    GM_registerMenuCommand("Download Full PDF", generatePDF, "d");
})();  