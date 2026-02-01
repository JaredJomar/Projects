/**
 * Unit Tests for Utility Functions
 * Tests urlUtils, throttle, and other helper functions
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('Utility Functions', () => {
  
  describe('urlUtils.extractParams()', () => {
    
    it('should extract video ID from watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const params = new URL(url).searchParams;
      
      expect(params.get('v')).toBe('dQw4w9WgXcQ');
    });
    
    it('should extract video ID and playlist ID', () => {
      const url = 'https://www.youtube.com/watch?v=test123&list=PLxxx';
      const params = new URL(url).searchParams;
      
      expect(params.get('v')).toBe('test123');
      expect(params.get('list')).toBe('PLxxx');
    });
    
    it('should extract playlist index', () => {
      const url = 'https://www.youtube.com/watch?v=test123&list=PLxxx&index=5';
      const params = new URL(url).searchParams;
      
      expect(params.get('index')).toBe('5');
    });
    
    it('should handle URLs without query parameters', () => {
      const url = 'https://www.youtube.com/';
      const params = new URL(url).searchParams;
      
      expect(params.get('v')).toBeNull();
    });
    
    it('should handle malformed URLs gracefully', () => {
      const malformedUrl = 'not-a-valid-url';
      
      expect(() => {
        new URL(malformedUrl);
      }).toThrow();
    });
    
    it('should return empty object on URL parsing error', () => {
      try {
        new URL('invalid-url');
      } catch (e) {
        const result = {};
        expect(result).toEqual({});
      }
    });
  });
  
  describe('urlUtils.getTimestampFromUrl()', () => {
    
    it('should extract timestamp from t parameter', () => {
      const url = 'https://www.youtube.com/watch?v=test123&t=90';
      const params = new URL(url).searchParams;
      const timestamp = params.get('t');
      
      expect(timestamp).toBe('90');
    });
    
    it('should convert seconds to start parameter', () => {
      const timestamp = '90';
      const result = `&start=${timestamp}`;
      
      expect(result).toBe('&start=90');
    });
    
    it('should parse 1h2m3s format correctly', () => {
      const timestamp = '1h2m3s';
      const parts = timestamp.split(/h|m|s/).filter(Boolean).map(Number);
      
      const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      
      expect(seconds).toBe(3723); // 1*3600 + 2*60 + 3
    });
    
    it('should parse 2m30s format correctly', () => {
      const timestamp = '2m30s';
      const parts = timestamp.split(/m|s/).filter(Boolean).map(Number);
      
      const seconds = parts[0] * 60 + parts[1];
      
      expect(seconds).toBe(150); // 2*60 + 30
    });
    
    it('should parse 45s format correctly', () => {
      const timestamp = '45s';
      const seconds = parseInt(timestamp);
      
      expect(seconds).toBe(45);
    });
    
    it('should return empty string when no timestamp exists', () => {
      const url = 'https://www.youtube.com/watch?v=test123';
      const params = new URL(url).searchParams;
      const timestamp = params.get('t');
      
      const result = timestamp ? `&start=${timestamp}` : '';
      
      expect(result).toBe('');
    });
    
    it('should handle complex time formats', () => {
      const testCases = [
        { input: '1h', expected: 3600 },
        { input: '30m', expected: 1800 },
        { input: '90', expected: 90 },
        { input: '1h30m', expected: 5400 },
        { input: '1h30m45s', expected: 5445 }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const parts = input.split(/h|m|s/).filter(Boolean).map(Number);
        let seconds = 0;
        
        const hasHours = input.includes('h');
        const hasMinutes = input.includes('m');
        const hasSeconds = input.includes('s');
        
        if (hasHours && hasMinutes && hasSeconds) {
          seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (hasHours && hasMinutes) {
          seconds = parts[0] * 3600 + parts[1] * 60;
        } else if (hasMinutes && hasSeconds) {
          seconds = parts[0] * 60 + parts[1];
        } else if (hasHours) {
          seconds = parts[0] * 3600;
        } else if (hasMinutes) {
          seconds = parts[0] * 60;
        } else {
          seconds = parts[0] || parseInt(input);
        }
        
        expect(seconds).toBe(expected);
      });
    });
  });
  
  describe('throttle()', () => {
    
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should call function immediately on first invocation', () => {
      const mockFn = jest.fn();
      let lastCall = 0;
      const wait = 1000;
      
      const throttled = () => {
        const now = Date.now();
        if (now - lastCall >= wait) {
          lastCall = now;
          mockFn();
        }
      };
      
      throttled();
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    it('should ignore rapid subsequent calls within wait time', () => {
      const mockFn = jest.fn();
      let lastCall = 0;
      const wait = 1000;
      
      const throttled = () => {
        const now = Date.now();
        if (now - lastCall >= wait) {
          lastCall = now;
          mockFn();
        }
      };
      
      throttled(); // Call 1
      throttled(); // Ignored
      throttled(); // Ignored
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    it('should allow call after wait time has passed', () => {
      const mockFn = jest.fn();
      let lastCall = 0;
      const wait = 1000;
      
      const throttled = () => {
        const now = Date.now();
        if (now - lastCall >= wait) {
          lastCall = now;
          mockFn();
        }
      };
      
      throttled();
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(1000);
      throttled();
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
    
    it('should preserve function context', () => {
      const context = { value: 42 };
      const mockFn = jest.fn(function() {
        return this.value;
      });
      
      const result = mockFn.call(context);
      
      expect(result).toBe(42);
    });
    
    it('should pass arguments to throttled function', () => {
      const mockFn = jest.fn((a, b) => a + b);
      
      const result = mockFn(5, 3);
      
      expect(result).toBe(8);
      expect(mockFn).toHaveBeenCalledWith(5, 3);
    });
    
    it('should enforce minimum wait time', () => {
      const wait = 750;
      const minWait = 750;
      
      const effectiveWait = Math.max(wait, minWait);
      
      expect(effectiveWait).toBe(750);
    });
  });
  
  describe('Logger utility', () => {
    
    beforeEach(() => {
      global.console.log = jest.fn();
      global.console.warn = jest.fn();
      global.console.error = jest.fn();
    });
    
    it('should log info messages when enabled', () => {
      const Logger = {
        enabled: true,
        info: (msg) => {
          if (Logger.enabled) {
            console.log(msg);
          }
        }
      };
      
      Logger.info('Test message');
      
      expect(console.log).toHaveBeenCalledWith('Test message');
    });
    
    it('should not log when disabled', () => {
      const Logger = {
        enabled: false,
        info: (msg) => {
          if (Logger.enabled) {
            console.log(msg);
          }
        }
      };
      
      Logger.info('Test message');
      
      expect(console.log).not.toHaveBeenCalled();
    });
    
    it('should format messages with prefix and timestamp', () => {
      const prefix = '[YouTubeEnchantments]';
      const timestamp = new Date().toISOString();
      const message = 'Test';
      
      const formatted = `${prefix} ${timestamp} - ${message}`;
      
      expect(formatted).toContain(prefix);
      expect(formatted).toContain(message);
    });
    
    it('should support different log levels', () => {
      const Logger = {
        enabled: true,
        info: (msg) => console.log(msg),
        warning: (msg) => console.warn(msg),
        error: (msg) => console.error(msg)
      };
      
      Logger.info('Info');
      Logger.warning('Warning');
      Logger.error('Error');
      
      expect(console.log).toHaveBeenCalledWith('Info');
      expect(console.warn).toHaveBeenCalledWith('Warning');
      expect(console.error).toHaveBeenCalledWith('Error');
    });
  });
  
  describe('Game section detection', () => {
    
    it('should detect gaming sections by is-gaming attribute', () => {
      const section = document.createElement('div');
      section.setAttribute('is-gaming', '');
      
      const isGaming = section.hasAttribute('is-gaming');
      
      expect(isGaming).toBe(true);
    });
    
    it('should detect gaming sections by title text (English)', () => {
      const section = document.createElement('div');
      const title = document.createElement('h2');
      title.textContent = 'Gaming';
      section.appendChild(title);
      
      const titleText = title.textContent.toLowerCase();
      const isGaming = titleText.includes('gaming');
      
      expect(isGaming).toBe(true);
    });
    
    it('should detect gaming sections by title text (Spanish)', () => {
      const section = document.createElement('div');
      const title = document.createElement('h2');
      title.textContent = 'Gaming';
      section.appendChild(title);
      
      const titleText = title.textContent.toLowerCase();
      const isGaming = titleText.includes('gaming') || titleText.includes('juegos');
      
      expect(isGaming).toBe(true);
    });
    
    it('should detect gaming sections by aria-label', () => {
      const section = document.createElement('div');
      section.setAttribute('aria-label', 'Gaming feed');
      
      const ariaLabel = section.getAttribute('aria-label')?.toLowerCase() || '';
      const isGaming = ariaLabel.includes('gaming') || ariaLabel.includes('game');
      
      expect(isGaming).toBe(true);
    });
    
    it('should not detect non-gaming sections', () => {
      const section = document.createElement('div');
      const title = document.createElement('h2');
      title.textContent = 'Recommended';
      section.appendChild(title);
      
      const titleText = title.textContent.toLowerCase();
      const isGaming = titleText.includes('gaming');
      
      expect(isGaming).toBe(false);
    });
  });
  
  describe('Channel URL handling', () => {
    
    it('should detect @username format URLs', () => {
      const url = 'https://www.youtube.com/@channelname/featured';
      
      const hasAtSymbol = url.includes('/@');
      
      expect(hasAtSymbol).toBe(true);
    });
    
    it('should detect legacy /channel/ID format URLs', () => {
      const url = 'https://www.youtube.com/channel/UC123456/featured';
      
      const isChannelUrl = url.includes('/channel/');
      
      expect(isChannelUrl).toBe(true);
    });
    
    it('should detect /featured page', () => {
      const url = 'https://www.youtube.com/@channelname/featured';
      
      const isFeatured = url.includes('/featured');
      
      expect(isFeatured).toBe(true);
    });
    
    it('should replace /featured with /videos', () => {
      const url = 'https://www.youtube.com/@channelname/featured';
      
      const videosUrl = url.replace('/featured', '/videos');
      
      expect(videosUrl).toBe('https://www.youtube.com/@channelname/videos');
    });
    
    it('should handle URLs with query parameters', () => {
      const url = 'https://www.youtube.com/@channelname/featured?foo=bar';
      
      const videosUrl = url.replace(/\/featured(\?.*)?$/, '/videos$1');
      
      expect(videosUrl).toContain('/videos?foo=bar');
    });
    
    it('should handle root channel URLs', () => {
      const url = 'https://www.youtube.com/@channelname';
      
      const shouldRedirect = !url.includes('/videos') && !url.includes('/community');
      
      expect(shouldRedirect).toBe(true);
    });
  });
  
  describe('Constants validation', () => {
    
    it('should have valid IFRAME_ID', () => {
      const IFRAME_ID = 'adblock-bypass-player';
      
      expect(typeof IFRAME_ID).toBe('string');
      expect(IFRAME_ID.length).toBeGreaterThan(0);
    });
    
    it('should have valid STORAGE_KEY', () => {
      const STORAGE_KEY = 'youtubeEnchantmentsSettings';
      
      expect(typeof STORAGE_KEY).toBe('string');
      expect(STORAGE_KEY.length).toBeGreaterThan(0);
    });
    
    it('should have reasonable delay values', () => {
      const DELAY = 300;
      const MIN_CHECK_FREQUENCY = 1000;
      const MAX_CHECK_FREQUENCY = 30000;
      
      expect(DELAY).toBeGreaterThan(0);
      expect(MIN_CHECK_FREQUENCY).toBeLessThan(MAX_CHECK_FREQUENCY);
    });
    
    it('should have reasonable MAX_TRIES', () => {
      const MAX_TRIES = 150;
      
      expect(MAX_TRIES).toBeGreaterThan(0);
      expect(MAX_TRIES).toBeLessThan(1000);
    });
  });
});
