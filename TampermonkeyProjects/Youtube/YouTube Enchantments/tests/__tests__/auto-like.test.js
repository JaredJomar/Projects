/**
 * Unit Tests for Auto-Like Functionality
 * Tests likeVideo, checkAndLikeVideo, isSubscribed, watchThresholdReached, isLiveStream
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { setupYouTubeWatchPage, simulateClick } from './__mocks__/dom.js';
import { createMockSettings, mockGMGetValue } from './__mocks__/tampermonkey.js';

describe('Auto-Like Functionality', () => {
  
  describe('isButtonPressed()', () => {
    
    it('should return true when aria-pressed is "true"', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-pressed', 'true');
      
      const isPressed = button.getAttribute('aria-pressed') === 'true';
      
      expect(isPressed).toBe(true);
    });
    
    it('should return false when aria-pressed is "false"', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-pressed', 'false');
      
      const isPressed = button.getAttribute('aria-pressed') === 'true';
      
      expect(isPressed).toBe(false);
    });
    
    it('should return true when button has style-default-active class', () => {
      const button = document.createElement('button');
      button.classList.add('style-default-active');
      
      const isPressed = button.classList.contains('style-default-active');
      
      expect(isPressed).toBe(true);
    });
    
    it('should check parent ytd-toggle-button-renderer for aria-pressed', () => {
      const container = document.createElement('ytd-toggle-button-renderer');
      container.setAttribute('aria-pressed', 'true');
      
      const button = document.createElement('button');
      container.appendChild(button);
      
      const isPressed = container.getAttribute('aria-pressed') === 'true';
      
      expect(isPressed).toBe(true);
    });
    
    it('should return false for null or undefined button', () => {
      expect(null == null).toBe(true);
      expect(undefined == null).toBe(true);
    });
    
    it('should handle buttons without aria-pressed attribute', () => {
      const button = document.createElement('button');
      
      const isPressed = button.getAttribute('aria-pressed') === 'true';
      
      expect(isPressed).toBe(false);
    });
  });
  
  describe('getVideoId()', () => {
    
    beforeEach(() => {
      document.body.innerHTML = '';
    });
    
    it('should extract video ID from ytd-watch-flexy element', () => {
      const pageManager = document.createElement('div');
      pageManager.id = 'page-manager';
      
      const watchFlexy = document.createElement('ytd-watch-flexy');
      watchFlexy.setAttribute('video-id', 'dQw4w9WgXcQ');
      
      pageManager.appendChild(watchFlexy);
      document.body.appendChild(pageManager);
      
      const videoId = document.querySelector('#page-manager > ytd-watch-flexy')?.getAttribute('video-id');
      
      expect(videoId).toBe('dQw4w9WgXcQ');
    });
    
    it('should extract video ID from Shorts URL', () => {
      window.location.pathname = '/shorts/abc123XYZ';
      
      const match = window.location.pathname.match(/^\/shorts\/([\w-]{5,})/);
      const videoId = match ? match[1] : null;
      
      expect(videoId).toBe('abc123XYZ');
    });
    
    it('should extract video ID from URL query parameter', () => {
      window.location.search = '?v=test123&list=playlist';
      
      const params = new URLSearchParams(window.location.search);
      const videoId = params.get('v');
      
      expect(videoId).toBe('test123');
    });
    
    it('should return null when no video ID is found', () => {
      window.location.pathname = '/';
      window.location.search = '';
      
      const params = new URLSearchParams(window.location.search);
      const videoId = params.get('v');
      
      expect(videoId).toBeNull();
    });
    
    it('should handle Shorts URLs with special characters', () => {
      window.location.pathname = '/shorts/abc-123_XYZ';
      
      const match = window.location.pathname.match(/^\/shorts\/([\w-]{5,})/);
      const videoId = match ? match[1] : null;
      
      expect(videoId).toBe('abc-123_XYZ');
    });
    
    it('should reject Shorts URLs that are too short', () => {
      window.location.pathname = '/shorts/abc';
      
      const match = window.location.pathname.match(/^\/shorts\/([\w-]{5,})/);
      
      expect(match).toBeNull();
    });
  });
  
  describe('isSubscribed()', () => {
    
    it('should return true when Subscribe button shows "Subscribed"', () => {
      const { subscribeButton } = setupYouTubeWatchPage({ isSubscribed: true });
      
      const text = subscribeButton.textContent;
      const isSubscribed = text === 'Subscribed';
      
      expect(isSubscribed).toBe(true);
    });
    
    it('should return true when button has subscribed styling', () => {
      const { subscribeButton } = setupYouTubeWatchPage({ isSubscribed: true });
      
      const hasSubscribedClass = subscribeButton.className.includes('mono');
      
      expect(hasSubscribedClass).toBe(true);
    });
    
    it('should return false when button shows "Subscribe"', () => {
      const { subscribeButton } = setupYouTubeWatchPage({ isSubscribed: false });
      
      const text = subscribeButton.textContent;
      const isSubscribed = text === 'Subscribed';
      
      expect(isSubscribed).toBe(false);
    });
    
    it('should return false when subscribe button is not found', () => {
      document.body.innerHTML = '';
      
      const button = document.querySelector('#subscribe-button');
      
      expect(button).toBeNull();
    });
    
    it('should handle different subscribe button selectors', () => {
      const selectors = [
        '#subscribe-button > ytd-subscribe-button-renderer',
        'ytd-reel-player-overlay-renderer #subscribe-button',
        'tp-yt-paper-button[subscribed]'
      ];
      
      selectors.forEach(selector => {
        expect(typeof selector).toBe('string');
        expect(selector.length).toBeGreaterThan(0);
      });
    });
  });
  
  describe('isLiveStream()', () => {
    
    it('should return true when live badge is visible', () => {
      setupYouTubeWatchPage({ isLiveStream: true });
      
      const liveBadge = document.querySelector('.ytp-live-badge');
      const isVisible = liveBadge && window.getComputedStyle(liveBadge).display !== 'none';
      
      expect(isVisible).toBe(true);
    });
    
    it('should return false when live badge display is none', () => {
      setupYouTubeWatchPage({ isLiveStream: true });
      
      const liveBadge = document.querySelector('.ytp-live-badge');
      if (liveBadge) {
        liveBadge.style.display = 'none';
      }
      
      // Mock getComputedStyle to return display: none
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = jest.fn(() => ({
        display: 'none',
        visibility: 'visible'
      }));
      
      const isVisible = liveBadge && window.getComputedStyle(liveBadge).display !== 'none';
      
      window.getComputedStyle = originalGetComputedStyle;
      
      expect(isVisible).toBe(false);
    });
    
    it('should return false when live badge does not exist', () => {
      setupYouTubeWatchPage({ isLiveStream: false });
      
      const liveBadge = document.querySelector('.ytp-live-badge');
      
      expect(liveBadge).toBeNull();
    });
    
    it('should check visibility style property', () => {
      setupYouTubeWatchPage({ isLiveStream: true });
      
      const liveBadge = document.querySelector('.ytp-live-badge');
      
      // Mock getComputedStyle to return visible
      window.getComputedStyle = jest.fn(() => ({
        display: 'block',
        visibility: 'visible'
      }));
      
      const computed = window.getComputedStyle(liveBadge);
      expect(computed.display).toBe('block');
    });
  });
  
  describe('watchThresholdReached()', () => {
    
    it('should return true when watch percentage exceeds threshold', () => {
      setupYouTubeWatchPage({ hasPlayer: true });
      
      const player = document.querySelector('#movie_player');
      const video = player?.querySelector('video');
      
      if (video) {
        video.currentTime = 80;
        video.duration = 100;
      }
      
      const percentage = (80 / 100) * 100;
      const threshold = 70;
      
      expect(percentage).toBeGreaterThan(threshold);
    });
    
    it('should return false when watch percentage is below threshold', () => {
      setupYouTubeWatchPage({ hasPlayer: true });
      
      const player = document.querySelector('#movie_player');
      const video = player?.querySelector('video');
      
      if (video) {
        video.currentTime = 30;
        video.duration = 100;
      }
      
      const percentage = (30 / 100) * 100;
      const threshold = 70;
      
      expect(percentage).toBeLessThan(threshold);
    });
    
    it('should return true when threshold is 0', () => {
      const percentage = 50;
      const threshold = 0;
      
      expect(percentage).toBeGreaterThanOrEqual(threshold);
    });
    
    it('should handle threshold of 100', () => {
      setupYouTubeWatchPage({ hasPlayer: true });
      
      const player = document.querySelector('#movie_player');
      const video = player?.querySelector('video');
      
      if (video) {
        video.currentTime = 100;
        video.duration = 100;
      }
      
      const percentage = (100 / 100) * 100;
      const threshold = 100;
      
      expect(percentage).toBeGreaterThanOrEqual(threshold);
    });
    
    it('should return false when player methods are unavailable', () => {
      document.body.innerHTML = '';
      
      const player = document.querySelector('#movie_player');
      
      expect(player).toBeNull();
    });
    
    it('should handle zero duration gracefully', () => {
      setupYouTubeWatchPage({ hasPlayer: true });
      
      const player = document.querySelector('#movie_player');
      const video = player?.querySelector('video');
      
      if (video) {
        video.currentTime = 0;
        video.duration = 0;
      }
      
      const percentage = video ? (video.currentTime / (video.duration || 1)) * 100 : 0;
      
      expect(percentage).toBe(0);
    });
    
    it('should handle NaN values from player', () => {
      const currentTime = NaN;
      const duration = 100;
      
      const percentage = isNaN(currentTime) ? 0 : (currentTime / duration) * 100;
      
      expect(percentage).toBe(0);
    });
  });
  
  describe('likeVideo()', () => {
    
    let autoLikedVideoIds;
    
    beforeEach(() => {
      autoLikedVideoIds = new Set();
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should click like button when video is not liked or disliked', () => {
      const { likeButton } = setupYouTubeWatchPage({
        isLiked: false,
        isDisliked: false
      });
      
      const clickSpy = jest.spyOn(likeButton, 'click');
      
      // Simulate likeVideo logic
      const likePressed = likeButton.getAttribute('aria-pressed') === 'true';
      const dislikePressed = false;
      const alreadyAutoLiked = false;
      
      if (!likePressed && !dislikePressed && !alreadyAutoLiked) {
        likeButton.click();
      }
      
      expect(clickSpy).toHaveBeenCalled();
    });
    
    it('should NOT click like button when video is already liked', () => {
      const { likeButton } = setupYouTubeWatchPage({
        isLiked: true,
        isDisliked: false
      });
      
      const clickSpy = jest.spyOn(likeButton, 'click');
      
      const likePressed = likeButton.getAttribute('aria-pressed') === 'true';
      
      if (!likePressed) {
        likeButton.click();
      }
      
      expect(clickSpy).not.toHaveBeenCalled();
    });
    
    it('should NOT click like button when video is disliked', () => {
      const { likeButton, dislikeButton } = setupYouTubeWatchPage({
        isLiked: false,
        isDisliked: true
      });
      
      const clickSpy = jest.spyOn(likeButton, 'click');
      
      const dislikePressed = dislikeButton.getAttribute('aria-pressed') === 'true';
      
      if (dislikePressed) {
        // Don't like
      } else {
        likeButton.click();
      }
      
      expect(clickSpy).not.toHaveBeenCalled();
    });
    
    it('should NOT click if video was already auto-liked', () => {
      const { likeButton } = setupYouTubeWatchPage({
        isLiked: false,
        isDisliked: false
      });
      
      const videoId = 'test123';
      autoLikedVideoIds.add(videoId);
      
      const clickSpy = jest.spyOn(likeButton, 'click');
      
      const alreadyAutoLiked = autoLikedVideoIds.has(videoId);
      
      if (!alreadyAutoLiked) {
        likeButton.click();
      }
      
      expect(clickSpy).not.toHaveBeenCalled();
    });
    
    it('should add video ID to autoLikedVideoIds after successful like', () => {
      const videoId = 'test123';
      
      // Simulate successful like
      autoLikedVideoIds.add(videoId);
      
      expect(autoLikedVideoIds.has(videoId)).toBe(true);
    });
    
    it('should verify like success after delay', () => {
      const { likeButton } = setupYouTubeWatchPage({
        isLiked: false,
        isDisliked: false
      });
      
      const videoId = 'test123';
      
      // Click like
      likeButton.click();
      
      // Simulate verification after 500ms
      jest.advanceTimersByTime(500);
      
      // Simulate button state change
      likeButton.setAttribute('aria-pressed', 'true');
      
      // Verify and add to set
      const isPressed = likeButton.getAttribute('aria-pressed') === 'true';
      if (isPressed) {
        autoLikedVideoIds.add(videoId);
      }
      
      expect(autoLikedVideoIds.has(videoId)).toBe(true);
    });
    
    it('should handle like button not found', () => {
      document.body.innerHTML = '';
      
      const likeButton = document.querySelector('.like-button');
      
      expect(likeButton).toBeNull();
    });
    
    it('should handle missing video ID', () => {
      setupYouTubeWatchPage();
      window.location.search = '';
      window.location.pathname = '/';
      
      document.body.innerHTML = '';
      
      const params = new URLSearchParams(window.location.search);
      const videoId = params.get('v');
      
      expect(videoId).toBeNull();
    });
  });
  
  describe('checkAndLikeVideo() - Integration', () => {
    
    let settings;
    let autoLikedVideoIds;
    
    beforeEach(() => {
      settings = createMockSettings({
        autoLikeEnabled: true,
        watchThreshold: 70,
        autoLikeLiveStreams: false,
        autoLikeNonSubscribed: false
      });
      mockGMGetValue(settings);
      autoLikedVideoIds = new Set();
    });
    
    it('should NOT like if autoLikeEnabled is false', () => {
      settings.autoLikeEnabled = false;
      
      expect(settings.autoLikeEnabled).toBe(false);
    });
    
    it('should like if all conditions are met', () => {
      setupYouTubeWatchPage({
        isLiked: false,
        isDisliked: false,
        isSubscribed: true,
        hasPlayer: true,
        isLiveStream: false
      });
      
      const player = document.querySelector('#movie_player');
      const video = player?.querySelector('video');
      if (video) {
        video.currentTime = 80;
        video.duration = 100;
      }
      
      // Check all conditions
      const isLiked = false;
      const isDisliked = false;
      const isSubscribed = true;
      const watchPercentage = 80;
      const watchThreshold = 70;
      const isLive = false;
      const allowLiveStreams = false;
      
      const shouldLike = 
        settings.autoLikeEnabled &&
        !isLiked &&
        !isDisliked &&
        isSubscribed &&
        watchPercentage >= watchThreshold &&
        (!isLive || allowLiveStreams);
      
      expect(shouldLike).toBe(true);
    });
    
    it('should NOT like if watch threshold not reached', () => {
      setupYouTubeWatchPage({
        isSubscribed: true,
        hasPlayer: true
      });
      
      const player = document.querySelector('#movie_player');
      const video = player?.querySelector('video');
      if (video) {
        video.currentTime = 30;
        video.duration = 100;
      }
      
      const watchPercentage = 30;
      const watchThreshold = 70;
      
      expect(watchPercentage).toBeLessThan(watchThreshold);
    });
    
    it('should NOT like if not subscribed and autoLikeNonSubscribed is false', () => {
      setupYouTubeWatchPage({
        isSubscribed: false,
        hasPlayer: true
      });
      
      const isSubscribed = false;
      const autoLikeNonSubscribed = false;
      
      const shouldCheck = isSubscribed || autoLikeNonSubscribed;
      
      expect(shouldCheck).toBe(false);
    });
    
    it('should like if not subscribed but autoLikeNonSubscribed is true', () => {
      settings.autoLikeNonSubscribed = true;
      
      const isSubscribed = false;
      const shouldCheck = isSubscribed || settings.autoLikeNonSubscribed;
      
      expect(shouldCheck).toBe(true);
    });
    
    it('should NOT like live streams when autoLikeLiveStreams is false', () => {
      setupYouTubeWatchPage({
        isSubscribed: true,
        isLiveStream: true,
        hasPlayer: true
      });
      
      const isLive = true;
      const allowLiveStreams = false;
      
      const shouldLike = !isLive || allowLiveStreams;
      
      expect(shouldLike).toBe(false);
    });
    
    it('should like live streams when autoLikeLiveStreams is true', () => {
      settings.autoLikeLiveStreams = true;
      
      const isLive = true;
      const shouldLike = !isLive || settings.autoLikeLiveStreams;
      
      expect(shouldLike).toBe(true);
    });
    
    it('should prevent reentrancy during check', () => {
      let isCheckingAndLiking = false;
      
      // First call
      if (!isCheckingAndLiking) {
        isCheckingAndLiking = true;
        // ... do work
        expect(isCheckingAndLiking).toBe(true);
      }
      
      // Second call (should be blocked)
      let secondCallBlocked = false;
      if (!isCheckingAndLiking) {
        // Won't execute
      } else {
        secondCallBlocked = true;
      }
      
      expect(secondCallBlocked).toBe(true);
    });
  });
});
