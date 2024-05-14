// ==UserScript==
// @name         HTML5 Video Player Speed Control
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Control the playback speed of HTML5 video players with keyboard shortcuts.
// @author       JJJ
// @match        *://*/*
// @icon         https://logos-download.com/wp-content/uploads/2017/07/HTML5_logo.png
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';
    // Get the video element
    const video = document.querySelector('video');

    // Set the initial playback rate
    let playbackRate = 1.0;
    let previousPlaybackRate = 1.0;

    // Create a speed indicator element
    const speedIndicator = document.createElement('div');
    speedIndicator.style.position = 'absolute';
    speedIndicator.style.top = '10px';
    speedIndicator.style.left = '10px';
    speedIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    speedIndicator.style.color = '#fff';
    speedIndicator.style.padding = '5px';
    speedIndicator.style.fontFamily = 'Arial, sans-serif';
    speedIndicator.style.fontSize = '12px';
    speedIndicator.style.zIndex = '9999';

    // Function to update the speed indicator
    function updateSpeedIndicator() {
        speedIndicator.textContent = `Speed: ${playbackRate.toFixed(1)}x`;
    }

    // Function to update the speed indicator position
    function updateSpeedIndicatorPosition() {
        if (video.offsetWidth === window.innerWidth && video.offsetHeight === window.innerHeight) {
            // Video is in fullscreen
            speedIndicator.style.position = 'fixed';
        } else {
            // Video is not in fullscreen
            speedIndicator.style.position = 'absolute';
        }
    }

    // Update the speed indicator position whenever the window is resized
    window.addEventListener('resize', updateSpeedIndicatorPosition);

    // Update the speed indicator position initially
    updateSpeedIndicatorPosition();

    // Function to increase the playback rate by 0.1
    function speedUpVideo() {
        playbackRate += 0.1;
        video.playbackRate = playbackRate;
        updateSpeedIndicator();
    }

    // Function to decrease the playback rate by 0.1
    function slowDownVideo() {
        playbackRate -= 0.1;
        video.playbackRate = playbackRate;
        updateSpeedIndicator();
    }

    // Function to set the playback rate to 1.5x
    function setFastSpeed() {
        playbackRate = 1.5;
        video.playbackRate = playbackRate;
        updateSpeedIndicator();
    }

    // Function to set the playback rate to 1.8x
    function setFasterSpeed() {
        playbackRate = 1.8;
        video.playbackRate = playbackRate;
        updateSpeedIndicator();
    }

    // Function to reset the playback rate to normal
    function resetSpeed() {
        if (playbackRate !== 1.0) {
            previousPlaybackRate = playbackRate;
            playbackRate = 1.0;
            video.playbackRate = playbackRate;
            updateSpeedIndicator();
        } else {
            playbackRate = previousPlaybackRate;
            video.playbackRate = playbackRate;
            updateSpeedIndicator();
        }
    }

    // Function to toggle the visibility of the speed indicator
    function toggleSpeedIndicator() {
        speedIndicator.style.display = speedIndicator.style.display === 'none' ? 'block' : 'none';
    }

    // Append the speed indicator element to the video container
    const videoContainer = video.parentElement;
    videoContainer.style.position = 'relative';
    videoContainer.appendChild(speedIndicator);

    // Update the speed indicator with the initial playback rate
    updateSpeedIndicator();

    // Event listener for key presses
    document.addEventListener('keydown', (event) => {
        if (event.key === 'd') {
            speedUpVideo();
        } else if (event.key === 's') {
            slowDownVideo();
        } else if (event.key === 'g') {
            setFastSpeed();
        } else if (event.key === 'h') {
            setFasterSpeed();
        } else if (event.key === 'r') {
            resetSpeed();
        } else if (event.key === 'v') {
            toggleSpeedIndicator();
        }
    });
})();
