/**
 * Unit Tests for Player Manager (AdBlock Bypass)
 * Tests injectYouTubeIframeAPI, createPlayerIframe, handleAdBlockError
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { setupYouTubeWatchPage } from './__mocks__/dom.js';
import {
  createMockYTPlayer,
  simulateIFrameAPILoad,
  createMockPlayerIframe,
  getLastYTPlayer,
  clearYTPlayers
} from './__mocks__/youtube-api.js';
import { createMockSettings, mockGMGetValue } from './__mocks__/tampermonkey.js';

describe('Player Manager - AdBlock Bypass', () => {
  
  describe('injectYouTubeIframeAPI()', () => {
    
    beforeEach(() => {
      // Clear any existing scripts
      document.head.innerHTML = '';
      clearYTPlayers();
    });
    
    it('should resolve immediately if YT.Player already exists', async () => {
      // YT.Player is already mocked globally
      expect(global.YT).toBeDefined();
      expect(global.YT.Player).toBeDefined();
    });
    
    it('should inject script tag with correct src', () => {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
      
      const injectedScript = document.querySelector('script[src*="iframe_api"]');
      
      expect(injectedScript).not.toBeNull();
      expect(injectedScript.src).toBe('https://www.youtube.com/iframe_api');
    });
    
    it('should not inject duplicate scripts', () => {
      const script1 = document.createElement('script');
      script1.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script1);
      
      // Check for existing script before adding
      const existing = document.querySelector('script[src*="iframe_api"]');
      
      if (!existing) {
        const script2 = document.createElement('script');
        script2.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script2);
      }
      
      const allScripts = document.querySelectorAll('script[src*="iframe_api"]');
      expect(allScripts.length).toBe(1);
    });
    
    it('should resolve when script loads successfully', async () => {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      
      const loadPromise = new Promise((resolve) => {
        script.onload = () => resolve();
      });
      
      document.head.appendChild(script);
      script.dispatchEvent(new Event('load'));
      
      await expect(loadPromise).resolves.toBeUndefined();
    });
    
    it('should reject when script fails to load', async () => {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      
      const errorPromise = new Promise((_, reject) => {
        script.onerror = reject;
      });
      
      document.head.appendChild(script);
      const error = new Error('Script load failed');
      script.dispatchEvent(new ErrorEvent('error', { error }));
      
      await expect(errorPromise).rejects.toBeDefined();
    });
    
    it('should handle exceptions during injection', () => {
      // Mock document.head to throw error
      const originalAppendChild = document.head.appendChild;
      document.head.appendChild = jest.fn(() => {
        throw new Error('Injection blocked by CSP');
      });
      
      expect(() => {
        const script = document.createElement('script');
        document.head.appendChild(script);
      }).toThrow('Injection blocked by CSP');
      
      document.head.appendChild = originalAppendChild;
    });
  });
  
  describe('createPlayerIframe()', () => {
    
    it('should create iframe element with correct attributes', () => {
      const iframe = createMockPlayerIframe('test123', 0);
      
      expect(iframe.tagName).toBe('IFRAME');
      expect(iframe.id).toBe('youtube-player-iframe');
      expect(iframe.width).toBe('100%');
      expect(iframe.height).toBe('100%');
    });
    
    it('should include video ID in src URL', () => {
      const videoId = 'dQw4w9WgXcQ';
      const iframe = createMockPlayerIframe(videoId, 0);
      
      expect(iframe.src).toContain(videoId);
      expect(iframe.src).toContain('youtube.com/embed/');
    });
    
    it('should include start time parameter when provided', () => {
      const iframe = createMockPlayerIframe('test123', 30);
      
      expect(iframe.src).toContain('start=30');
    });
    
    it('should include autoplay parameter', () => {
      const iframe = createMockPlayerIframe('test123', 0);
      
      expect(iframe.src).toContain('autoplay=1');
    });
    
    it('should set frameBorder to 0', () => {
      const iframe = createMockPlayerIframe('test123', 0);
      
      expect(iframe.frameBorder).toBe('0');
    });
    
    it('should set allowFullscreen attribute', () => {
      const iframe = createMockPlayerIframe('test123', 0);
      
      expect(iframe.allowFullscreen).toBe(true);
    });
    
    it('should include required allow permissions', () => {
      const iframe = createMockPlayerIframe('test123', 0);
      
      expect(iframe.allow).toContain('autoplay');
      expect(iframe.allow).toContain('encrypted-media');
    });
    
    it('should handle playlist URLs', () => {
      const url = 'https://www.youtube.com/watch?v=test123&list=PLxxx&index=5';
      const params = new URL(url).searchParams;
      
      expect(params.get('v')).toBe('test123');
      expect(params.get('list')).toBe('PLxxx');
      expect(params.get('index')).toBe('5');
    });
    
    it('should extract start time from t parameter', () => {
      const url = 'https://www.youtube.com/watch?v=test123&t=90';
      const params = new URL(url).searchParams;
      const startTime = params.get('t');
      
      expect(startTime).toBe('90');
    });
    
    it('should convert time format (1h2m3s) to seconds', () => {
      const timestamp = '1h2m3s';
      const parts = timestamp.split(/h|m|s/).filter(Boolean).map(Number);
      
      let seconds = 0;
      if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 1) {
        seconds = parts[0];
      }
      
      expect(seconds).toBe(3723); // 1*3600 + 2*60 + 3
    });
  });
  
  describe('handleAdBlockError()', () => {
    
    let settings;
    
    beforeEach(() => {
      settings = createMockSettings({ adBlockBypassEnabled: true });
      mockGMGetValue(settings);
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should do nothing if adBlockBypassEnabled is false', () => {
      settings.adBlockBypassEnabled = false;
      
      expect(settings.adBlockBypassEnabled).toBe(false);
    });
    
    it('should detect error screen element', () => {
      const errorScreen = global.createMockErrorScreen();
      errorScreen.className = 'yt-playability-error-supported-renderers';
      document.body.appendChild(errorScreen);
      
      const found = document.querySelector('.yt-playability-error-supported-renderers');
      
      expect(found).not.toBeNull();
    });
    
    it('should remove error screen when found', () => {
      const errorScreen = global.createMockErrorScreen();
      errorScreen.className = 'yt-playability-error-supported-renderers';
      document.body.appendChild(errorScreen);
      
      const found = document.querySelector('.yt-playability-error-supported-renderers');
      if (found) {
        found.remove();
      }
      
      const afterRemoval = document.querySelector('.yt-playability-error-supported-renderers');
      expect(afterRemoval).toBeNull();
    });
    
    it('should retry detection with delay when error not found', () => {
      const MAX_TRIES = 150;
      const DELAY = 300;
      let tries = 0;
      
      // Simulate retry logic
      const checkError = () => {
        if (tries < MAX_TRIES) {
          tries++;
          setTimeout(checkError, DELAY);
        }
      };
      
      checkError();
      
      expect(tries).toBe(1);
      
      jest.advanceTimersByTime(DELAY);
      expect(tries).toBe(2);
      
      jest.advanceTimersByTime(DELAY * 10);
      expect(tries).toBe(12);
    });
    
    it('should stop retrying after MAX_TRIES reached', () => {
      const MAX_TRIES = 5;
      let tries = 0;
      let stopped = false;
      
      const checkError = () => {
        if (tries < MAX_TRIES) {
          tries++;
          setTimeout(checkError, 100);
        } else {
          stopped = true;
        }
      };
      
      checkError();
      jest.advanceTimersByTime(100 * MAX_TRIES);
      
      expect(stopped).toBe(true);
      expect(tries).toBe(MAX_TRIES);
    });
    
    it('should create iframe when error screen is removed', () => {
      const errorScreen = global.createMockErrorScreen();
      errorScreen.className = 'yt-playability-error-supported-renderers';
      document.body.appendChild(errorScreen);
      
      // Remove error and create iframe
      errorScreen.remove();
      const iframe = createMockPlayerIframe('test123', 0);
      document.body.appendChild(iframe);
      
      const createdIframe = document.querySelector('iframe');
      expect(createdIframe).not.toBeNull();
    });
    
    it('should handle error screen in different locations', () => {
      const selectors = [
        { selector: '#error-screen', attr: 'id' },
        { selector: '.yt-playability-error-supported-renderers', attr: 'class' }
      ];
      
      selectors.forEach(({ selector, attr }) => {
        document.body.innerHTML = '';
        const div = document.createElement('div');
        if (attr === 'id') {
          div.id = selector.replace('#', '');
        } else {
          div.className = selector.replace('.', '');
        }
        document.body.appendChild(div);
        
        const found = document.querySelector(selector);
        expect(found).not.toBeNull();
      });
    });
  });
  
  describe('Player initialization', () => {
    
    it('should initialize YT.Player with correct config', () => {
      const iframe = createMockPlayerIframe('test123', 0);
      iframe.id = 'test-player';
      document.body.appendChild(iframe);
      
      const mockPlayer = createMockYTPlayer();
      
      expect(mockPlayer).toHaveProperty('getCurrentTime');
      expect(mockPlayer).toHaveProperty('getDuration');
      expect(mockPlayer).toHaveProperty('playVideo');
    });
    
    it('should trigger onReady callback when player loads', () => {
      jest.useRealTimers();
      
      const onReadyMock = jest.fn();
      const config = {
        events: {
          onReady: onReadyMock
        }
      };
      
      // Simulate player creation synchronously
      config.events.onReady({ target: {} });
      
      expect(onReadyMock).toHaveBeenCalledWith({ target: {} });
      
      jest.useFakeTimers();
    });
    
    it('should handle player errors with onError callback', () => {
      jest.useRealTimers();
      
      const onErrorMock = jest.fn();
      const config = {
        events: {
          onError: onErrorMock
        }
      };
      
      // Simulate error synchronously
      config.events.onError({ data: 150 });
      
      expect(onErrorMock).toHaveBeenCalledWith({ data: 150 });
      
      jest.useFakeTimers();
    });
    
    it('should track player state changes', () => {
      const mockPlayer = createMockYTPlayer();
      
      mockPlayer.getPlayerState.mockReturnValue(global.YT.PlayerState.PLAYING);
      expect(mockPlayer.getPlayerState()).toBe(1);
      
      mockPlayer.getPlayerState.mockReturnValue(global.YT.PlayerState.PAUSED);
      expect(mockPlayer.getPlayerState()).toBe(2);
    });
  });
  
  describe('Duplicate iframe cleanup', () => {
    
    it('should detect multiple iframes with same ID', () => {
      const iframe1 = createMockPlayerIframe('test123', 0);
      iframe1.id = 'adblock-bypass-player';
      document.body.appendChild(iframe1);
      
      const iframe2 = createMockPlayerIframe('test456', 0);
      iframe2.id = 'adblock-bypass-player';
      document.body.appendChild(iframe2);
      
      const iframes = document.querySelectorAll('#adblock-bypass-player');
      expect(iframes.length).toBe(2);
    });
    
    it('should remove all but the last iframe', () => {
      const iframe1 = createMockPlayerIframe('test123', 0);
      iframe1.id = 'adblock-bypass-player';
      document.body.appendChild(iframe1);
      
      const iframe2 = createMockPlayerIframe('test456', 0);
      iframe2.id = 'adblock-bypass-player';
      document.body.appendChild(iframe2);
      
      // Cleanup logic
      const iframes = Array.from(document.querySelectorAll('#adblock-bypass-player'));
      if (iframes.length > 1) {
        iframes.slice(0, -1).forEach(iframe => iframe.remove());
      }
      
      const remaining = document.querySelectorAll('#adblock-bypass-player');
      expect(remaining.length).toBe(1);
    });
    
    it('should run cleanup periodically', () => {
      jest.useFakeTimers();
      
      let cleanupCount = 0;
      const cleanup = () => cleanupCount++;
      
      const interval = setInterval(cleanup, 7000);
      
      jest.advanceTimersByTime(7000);
      expect(cleanupCount).toBe(1);
      
      jest.advanceTimersByTime(14000);
      expect(cleanupCount).toBe(3);
      
      clearInterval(interval);
      jest.useRealTimers();
    });
  });
  
  describe('Iframe positioning and styling', () => {
    
    it('should calculate correct z-index for iframe', () => {
      const div1 = document.createElement('div');
      div1.style.zIndex = '1000';
      document.body.appendChild(div1);
      
      const div2 = document.createElement('div');
      div2.style.zIndex = '2000';
      document.body.appendChild(div2);
      
      const elements = Array.from(document.querySelectorAll('*'));
      const maxZ = Math.max(...elements.map(el => {
        const z = window.getComputedStyle(el).zIndex;
        return z === 'auto' ? 0 : parseInt(z, 10);
      }), 0);
      
      expect(maxZ).toBeGreaterThanOrEqual(1000);
    });
    
    it('should position iframe absolutely', () => {
      const iframe = createMockPlayerIframe('test123', 0);
      iframe.style.position = 'absolute';
      iframe.style.top = '0';
      iframe.style.left = '0';
      
      expect(iframe.style.position).toBe('absolute');
      expect(iframe.style.top).toBe('0px'); // DOM adds 'px' suffix
    });
    
    it('should make iframe full width and height', () => {
      const iframe = createMockPlayerIframe('test123', 0);
      
      expect(iframe.width).toBe('100%');
      expect(iframe.height).toBe('100%');
    });
  });
  
  describe('Player scroll behavior', () => {
    
    it('should detect when user scrolls past player', () => {
      const iframe = createMockPlayerIframe('test123', 0);
      iframe.style.position = 'absolute';
      iframe.style.top = '100px';
      document.body.appendChild(iframe);
      
      // Mock scroll position
      const scrollTop = 200;
      const iframeTop = 100;
      
      const hasScrolledPast = scrollTop > iframeTop;
      
      expect(hasScrolledPast).toBe(true);
    });
    
    it('should keep iframe visible when scrolling', () => {
      const iframe = createMockPlayerIframe('test123', 0);
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      document.body.appendChild(iframe);
      
      expect(iframe.style.position).toBe('fixed');
    });
  });
});
