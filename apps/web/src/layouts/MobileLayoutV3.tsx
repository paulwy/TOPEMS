import React, { useMemo } from 'react';
import i18n from '@/i18n';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Factory,
  MessageSquare,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * MobileLayoutV3 — Industrial OS 移动端布局
 *
 * 使用底部导航栏（BottomRail）+ 全屏抽屉替换旧的 MobileLayout。
 * 通过 VITE_UI_V3_ENABLED 开关控制，开启时走新布局，关闭时回退旧布局。
 *
 * 特性：
 * - 底部 5 个核心 Tab 导航
 * - 全屏抽屉菜单（更多功能）
 * - 统一的 Industrial OS 视觉语言
 * - 页面过渡动画（后续接入）
 */
export interface MobileLayoutV3Props {
  children: React.ReactNode;
}

interface MobileTabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
}

const mobileTabs: MobileTabItem[] = [
  { id: 'home', label: i18n.t('layouts.mobile_nav.home'), icon: Home, path: '/dashboard' },
  { id: 'mes', label: i18n.t('layouts.mobile_nav.mes'), icon: Factory, path: '/mes' },
  { id: 'im', label: i18n.t('layouts.mobile_nav.im'), icon: MessageSquare, path: '/im', badge: 3 },
  { id: 'profile', label: i18n.t('layouts.mobile_nav.profile'), icon: User, path: '/profile' },
];

export const MobileLayoutV3: React.FC<MobileLayoutV3Props> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTabId = useMemo(() => {
    for (const tab of mobileTabs) {
      if (location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')) {
        return tab.id;
      }
    }
    return 'home';
  }, [location.pathname]);

  const handleTabClick = (tab: MobileTabItem) => {
    if (tab.id !== activeTabId) {
      navigate(tab.path);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 主内容区 */}
      <main
        style={{
          flex: 1,
          paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
          overflowY: 'auto',
        }}
      >
        {children}
      </main>

      {/* 底部导航栏 */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'var(--bottom-nav-height, 64px)',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 1000,
        }}
      >
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                position: 'relative',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {tab.badge && tab.badge > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-8px',
                      minWidth: '16px',
                      height: '16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--status-error)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                    }}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 400,
                  lineHeight: 1,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileLayoutV3;
