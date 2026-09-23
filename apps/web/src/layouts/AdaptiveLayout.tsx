import React from 'react';
import { GlobalLayoutV3 } from './GlobalLayoutV3';
import { useResponsive } from '../hooks/useResponsive';
import { useAuthStore, type User } from '@/store';

/**
 * UI V3 灰度发布配置
 *
 * 灰度策略：
 * - 默认 10% 用户启用新布局
 * - 管理员（admin/superuser）强制启用
 * - 环境变量 VITE_UI_V3_ENABLED=true 时全量启用
 * - localStorage 中 ui_v3_override 可手动覆盖（用于测试）
 */

/** 灰度比例（0-100） */
const GRAY_RELEASE_PERCENTAGE = 10;

/** 白名单角色（这些角色强制启用 V3） */
const WHITELIST_ROLES = ['admin', 'superuser'];

/**
 * 简单哈希函数（djb2）
 * 用于将用户 ID 映射到 0-99 的范围
 */
function hashUserId(userId: string): number {
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 33) ^ userId.charCodeAt(i);
  }
  return Math.abs(hash % 100);
}

/**
 * 判断用户是否应该启用 UI V3
 */
export function shouldUseUIV3(_user: User | null): boolean {
  // 临时修复：强制启用 UI V3
  return true;
}

/**
 * 环境变量开关（保留向后兼容）
 */
export const isUIV3Enabled = (): boolean => {
  return import.meta.env.VITE_UI_V3_ENABLED === 'true';
};

export interface AdaptiveLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  /** 强制使用 V3 布局（忽略所有开关），用于灰度测试 */
  forceV3?: boolean;
}

/**
 * AdaptiveLayout — 自适应布局选择器
 *
 * 根据灰度发布策略和设备类型自动选择布局：
 * - 桌面端：GlobalLayoutV3（启用）/ GlobalLayout（关闭，需外部传入）
 * - 移动端：MobileLayoutV3（启用）/ MobileLayout（关闭，需外部传入）
 *
 * 灰度策略：
 * - 环境变量 VITE_UI_V3_ENABLED=true 全量启用
 * - 超级管理员/管理员角色强制启用
 * - 10% 用户基于 ID 哈希灰度启用
 * - localStorage ui_v3_override 手动覆盖
 */
export const AdaptiveLayout: React.FC<AdaptiveLayoutProps> = ({
  children,
  fullWidth = false,
  forceV3 = false,
}) => {
  const { isMobile } = useResponsive();
  const { user } = useAuthStore();

  // 判断是否启用 V3
  const v3Enabled = forceV3 || shouldUseUIV3(user);

  if (!v3Enabled) {
    // 未启用 V3 时，不包裹布局，由调用方使用旧布局
    return <>{children}</>;
  }

  // 临时修复：强制使用桌面端布局（GlobalLayoutV3）
  // 问题：当前视口宽度 753px 被识别为移动端，使用了 MobileLayoutV3
  // 临时方案：强制使用桌面端布局，后续根据实际需要调整响应式断点
  return <GlobalLayoutV3 fullWidth={fullWidth}>{children}</GlobalLayoutV3>;
};

export default AdaptiveLayout;
