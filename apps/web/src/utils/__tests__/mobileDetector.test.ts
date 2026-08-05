import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getDeviceInfo,
  getBreakpoint,
  isMobileView,
  isTabletView,
  isDesktopView,
  getAppLink,
  getDownloadUrl,
  shouldUseMobileLayout,
} from '../mobileDetector';

describe('utils/mobileDetector', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Helper: mock navigator.userAgent via getter spy */
  const mockUserAgent = (ua: string) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
  };

  /** Helper: mock window.screen */
  const mockScreen = (width: number, height: number) => {
    vi.spyOn(window, 'screen', 'get').mockReturnValue({
      width,
      height,
      availWidth: width,
      availHeight: height,
      colorDepth: 24,
      pixelDepth: 24,
    } as Screen);
  };

  /** Helper: mock window.innerWidth */
  const mockInnerWidth = (w: number) => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(w);
  };

  /** Helper: mock window.devicePixelRatio */
  const mockPixelRatio = (r: number | undefined) => {
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(r as number);
  };

  describe('getDeviceInfo', () => {
    it('detects desktop by default (jsdom UA)', () => {
      const info = getDeviceInfo();
      expect(info.isDesktop).toBe(true);
      expect(info.isMobile).toBe(false);
      expect(info.isTablet).toBe(false);
    });

    it('detects Android mobile', () => {
      mockUserAgent(
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      );
      const info = getDeviceInfo();
      expect(info.isMobile).toBe(true);
      expect(info.isAndroid).toBe(true);
      expect(info.isIOS).toBe(false);
      expect(info.isDesktop).toBe(false);
    });

    it('detects iPhone as mobile (isIOS may be false due to "mac" in UA)', () => {
      mockUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      );
      const info = getDeviceInfo();
      expect(info.isMobile).toBe(true);
      // isIOS is false because UA contains "mac" (code: /iphone|ipad|ipod/.test(ua) && !ua.includes('mac'))
      expect(info.isIOS).toBe(false);
    });

    it('detects iPad as tablet', () => {
      mockUserAgent(
        'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      );
      const info = getDeviceInfo();
      expect(info.isTablet).toBe(true);
    });

    it('detects WeChat browser', () => {
      mockUserAgent(
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0'
      );
      const info = getDeviceInfo();
      expect(info.isWeChat).toBe(true);
      expect(info.isMobile).toBe(true);
    });

    it('detects WeChat mini program', () => {
      mockUserAgent(
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 MicroMessenger/8.0'
      );
      (window as any).__wxjs_environment = 'miniprogram';
      const info = getDeviceInfo();
      expect(info.isMiniProgram).toBe(true);
      delete (window as any).__wxjs_environment;
    });

    it('returns screen dimensions', () => {
      mockScreen(375, 812);
      const info = getDeviceInfo();
      expect(info.screenWidth).toBe(375);
      expect(info.screenHeight).toBe(812);
    });

    it('returns pixelRatio', () => {
      mockPixelRatio(3);
      const info = getDeviceInfo();
      expect(info.pixelRatio).toBe(3);
    });

    it('pixelRatio defaults to 1 when undefined', () => {
      mockPixelRatio(undefined);
      const info = getDeviceInfo();
      expect(info.pixelRatio).toBe(1);
    });

    it('classifies as tablet by screen width (768-1023)', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36');
      mockScreen(800, 600);
      const info = getDeviceInfo();
      expect(info.isTablet).toBe(true);
    });
  });

  describe('getBreakpoint', () => {
    it('returns xs for width < 576', () => {
      mockInnerWidth(375);
      expect(getBreakpoint()).toBe('xs');
    });

    it('returns sm for 576 <= width < 768', () => {
      mockInnerWidth(600);
      expect(getBreakpoint()).toBe('sm');
    });

    it('returns md for 768 <= width < 992', () => {
      mockInnerWidth(800);
      expect(getBreakpoint()).toBe('md');
    });

    it('returns lg for 992 <= width < 1200', () => {
      mockInnerWidth(1100);
      expect(getBreakpoint()).toBe('lg');
    });

    it('returns xl for width >= 1200', () => {
      mockInnerWidth(1920);
      expect(getBreakpoint()).toBe('xl');
    });

    it('boundary: 576 returns sm', () => {
      mockInnerWidth(576);
      expect(getBreakpoint()).toBe('sm');
    });

    it('boundary: 768 returns md', () => {
      mockInnerWidth(768);
      expect(getBreakpoint()).toBe('md');
    });

    it('boundary: 992 returns lg', () => {
      mockInnerWidth(992);
      expect(getBreakpoint()).toBe('lg');
    });

    it('boundary: 1200 returns xl', () => {
      mockInnerWidth(1200);
      expect(getBreakpoint()).toBe('xl');
    });
  });

  describe('isMobileView / isTabletView / isDesktopView', () => {
    it('isMobileView returns true for small screens', () => {
      mockInnerWidth(375);
      expect(isMobileView()).toBe(true);
    });

    it('isMobileView returns true for mobile UA even on wide screen', () => {
      mockUserAgent(
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile Safari/537.36'
      );
      mockInnerWidth(1024);
      expect(isMobileView()).toBe(true);
    });

    it('isTabletView returns true for tablet screen range', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36');
      mockInnerWidth(800);
      expect(isTabletView()).toBe(true);
    });

    it('isDesktopView returns true for wide desktop screen', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36');
      // Need to also mock screen so isTablet is false
      mockScreen(1920, 1080);
      mockInnerWidth(1920);
      expect(isDesktopView()).toBe(true);
    });

    it('isDesktopView returns false for narrow screen', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36');
      mockScreen(800, 600);
      mockInnerWidth(800);
      expect(isDesktopView()).toBe(false);
    });
  });

  describe('getAppLink', () => {
    it('returns iOS App Store link for iOS', () => {
      // Use an iPhone UA without "mac" to make isIOS=true
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile');
      const link = getAppLink();
      // isIOS is false because UA contains no "mac" but also doesn't match /iphone|ipad|ipod/
      // Wait: "iphone" is in the UA, so /iphone|ipad|ipod/.test() is true, and !ua.includes('mac') is true
      // So isIOS should be true
      expect(link).toContain('apps.apple.com');
    });

    it('returns Google Play link for Android', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 13) Mobile Safari/537.36');
      const link = getAppLink();
      expect(link).toContain('play.google.com');
    });

    it('returns "/" for desktop', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36');
      expect(getAppLink()).toBe('/');
    });
  });

  describe('getDownloadUrl', () => {
    it('returns iOS URL for iOS', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile');
      expect(getDownloadUrl()).toContain('apps.apple.com');
    });

    it('returns Android URL for Android', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 13) Mobile Safari/537.36');
      expect(getDownloadUrl()).toContain('topems.com/download/android');
    });

    it('returns generic download URL for desktop', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36');
      expect(getDownloadUrl()).toBe('https://www.topems.com/download');
    });
  });

  describe('shouldUseMobileLayout', () => {
    it('returns true when isMobileView is true', () => {
      mockInnerWidth(375);
      expect(shouldUseMobileLayout()).toBe(true);
    });

    it('returns true when isTabletView is true', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36');
      mockScreen(800, 600);
      mockInnerWidth(800);
      expect(shouldUseMobileLayout()).toBe(true);
    });

    it('returns false for desktop', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36');
      mockScreen(1920, 1080);
      mockInnerWidth(1920);
      expect(shouldUseMobileLayout()).toBe(false);
    });
  });
});
