export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeChat: boolean;
  isMiniProgram: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

export function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const screenWidth = window.innerWidth || window.screen.width;
  const screenHeight = window.innerHeight || window.screen.height;
  const pixelRatio = window.devicePixelRatio || 1;

  const isWeChat = userAgent.includes('micromessenger');
  const isMiniProgram = isWeChat && window.__wxjs_environment === 'miniprogram';

  const isAndroid = userAgent.includes('android');
  const isIOS = /iphone|ipad|ipod/.test(userAgent) && !userAgent.includes('mac');

  const mobileRegex = /android|iphone|ipad|ipod|blackberry|windows phone|opera mini|iemobile/i;
  const tabletRegex = /ipad|tablet|playbook|silk/i;

  const isTablet = tabletRegex.test(userAgent) || (screenWidth >= 768 && screenWidth < 1024);
  const isMobile = mobileRegex.test(userAgent) && !isTablet;
  const isDesktop = !isMobile && !isTablet;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isWeChat,
    isMiniProgram,
    isAndroid,
    isIOS,
    screenWidth,
    screenHeight,
    pixelRatio,
  };
}

function isMobileView(): boolean {
  return getDeviceInfo().isMobile || window.innerWidth < 768;
}

function isTabletView(): boolean {
  return getDeviceInfo().isTablet || (window.innerWidth >= 768 && window.innerWidth < 1024);
}

export function shouldUseMobileLayout(): boolean {
  return isMobileView() || isTabletView();
}
