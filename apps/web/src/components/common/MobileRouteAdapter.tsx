import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';

interface MobileRouteAdapterProps {
  desktopPath: string;
  mobilePath: string;
  children: React.ReactNode;
}

const MobileRouteAdapter: React.FC<MobileRouteAdapterProps> = ({
  desktopPath,
  mobilePath,
  children,
}) => {
  const { isMobile } = useResponsive();
  const location = useLocation();

  const isDesktopRoute = location.pathname.startsWith(desktopPath);
  const isMobileRoute = location.pathname.startsWith('/mobile');

  if (isMobile && isDesktopRoute && !isMobileRoute) {
    const mobileTarget = location.pathname.replace(desktopPath, mobilePath);
    const search = location.search;
    return (
      <Navigate
        to={`${mobileTarget}${search}`}
        replace
      />
    );
  }

  if (!isMobile && isMobileRoute && !location.pathname.startsWith('/mobile/home')) {
    const desktopTarget = location.pathname.replace(mobilePath, desktopPath);
    const search = location.search;
    return (
      <Navigate
        to={`${desktopTarget}${search}`}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default MobileRouteAdapter;
