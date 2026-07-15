import React, { useState, useEffect } from 'react';
import { GlobalLayout } from '@/components/layout';
import { MobileLayout } from './MobileLayout';
import { TabletLayout } from './TabletLayout';
import { getDeviceInfo } from '@/utils/mobileDetector';

interface SmartLayoutProps {
  children: React.ReactNode;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const SmartLayout: React.FC<SmartLayoutProps> = ({ children }) => {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const checkDevice = () => {
      const info = getDeviceInfo();
      if (info.isMobile) {
        setDeviceType('mobile');
      } else if (info.isTablet) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  if (deviceType === 'mobile') {
    return <MobileLayout>{children}</MobileLayout>;
  }

  if (deviceType === 'tablet') {
    return <TabletLayout>{children}</TabletLayout>;
  }

  return <GlobalLayout>{children}</GlobalLayout>;
};

export default SmartLayout;
