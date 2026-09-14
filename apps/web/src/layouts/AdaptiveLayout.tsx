import React from 'react';
import { GlobalLayoutV3 } from './GlobalLayoutV3';
import { MobileLayoutV3 } from './MobileLayoutV3';
import { useResponsive } from '../hooks/useResponsive';

/**
 * VITE_UI_V3_ENABLED 特性开关
 *
 * 开启时走新布局（GlobalLayoutV3 / MobileLayoutV3），
 * 关闭时回退旧布局（GlobalLayout / MobileLayout）。
 *
 * 用法：
 * ```tsx
 * // .env
 * VITE_UI_V3_ENABLED=true
 *
 * // 代码中
 * import { AdaptiveLayout } from '@/layouts/AdaptiveLayout';
 * <AdaptiveLayout>{children}</AdaptiveLayout>
 * ```
 */
export const isUIV3Enabled = (): boolean => {
  return import.meta.env.VITE_UI_V3_ENABLED === 'true';
};

export interface AdaptiveLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  /** 强制使用 V3 布局（忽略环境变量开关），用于灰度测试 */
  forceV3?: boolean;
}

/**
 * AdaptiveLayout — 自适应布局选择器
 *
 * 根据 VITE_UI_V3_ENABLED 开关和设备类型自动选择布局：
 * - 桌面端：GlobalLayoutV3（开启）/ GlobalLayout（关闭，需外部传入）
 * - 移动端：MobileLayoutV3（开启）/ MobileLayout（关闭，需外部传入）
 *
 * 注意：关闭开关时，AdaptiveLayout 会渲染 children 而不包裹布局，
 * 由调用方决定使用旧布局。这样可以渐进式迁移。
 */
export const AdaptiveLayout: React.FC<AdaptiveLayoutProps> = ({
  children,
  fullWidth = false,
  forceV3 = false,
}) => {
  const { isMobile } = useResponsive();
  const v3Enabled = forceV3 || isUIV3Enabled();

  if (!v3Enabled) {
    // 开关关闭时，不包裹布局，由调用方使用旧布局
    return <>{children}</>;
  }

  if (isMobile) {
    return <MobileLayoutV3>{children}</MobileLayoutV3>;
  }

  return (
    <GlobalLayoutV3 fullWidth={fullWidth}>{children}</GlobalLayoutV3>
  );
};

export default AdaptiveLayout;
