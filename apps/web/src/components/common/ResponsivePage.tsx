import type React from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

export interface ResponsivePageProps {
  desktop: React.ReactNode;
  mobile: React.ReactNode;
}

function ResponsivePage({ desktop, mobile }: ResponsivePageProps): React.ReactNode {
  const isMobile = useIsMobile();
  return isMobile ? mobile : desktop;
}

export default ResponsivePage;
