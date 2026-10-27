import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import { BottomTabBar, type TabItem } from '../mobile/BottomTabBar';
import { MobileButton } from '../mobile/MobileButton';
import { MobileCard } from '../mobile/MobileCard';
import { MobileHeader } from '../mobile/MobileHeader';
import { MobileSearch } from '../mobile/MobileSearch';
import { MobileSkeleton } from '../mobile/MobileSkeleton';
import { PullToRefresh } from '../mobile/PullToRefresh';
import { SwipeAction, type SwipeActionItem } from '../mobile/SwipeAction';

const { i18nMap, translate } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'shared.mobile_search.k0': '关闭',
    'components.mobile_search.k0': '搜索...',
    'components.mobile_search.k1': '清除',
    'shared.mobile_header.k0': '返回',
    'shared.mobile_header.k1': '菜单',
    'shared.mobile_header.k2': '搜索',
    'shared.mobile_header.k3': '徽章',
    'shared.mobile_header.k4': '更多',
  };

  const translate = (key: string, options?: Record<string, unknown>): string => {
    if (i18nMap[key]) {
      let result = i18nMap[key];
      if (options) {
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      }
      return result;
    }
    if (!options) return key;
    return `${key}:${Object.values(options).join(',')}`;
  };

  return { i18nMap, translate };
});

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    i18n: { language: 'zh-CN', changeLanguage: vi.fn(), exists: (k: string) => !!i18nMap[k] },
    ready: true,
  }),
  withTranslation: () => (Component: unknown) => Component,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ i18nKey, children }: { i18nKey?: string; children?: unknown }) =>
    i18nKey ? translate(i18nKey) : children,
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    language: 'zh-CN',
    changeLanguage: vi.fn(),
    exists: (key: string) => !!i18nMap[key],
  },
}));

const tabs: TabItem[] = [
  { id: 'home', label: '首页', icon: <span>home-icon</span> },
  { id: 'tasks', label: '任务', icon: <span>tasks-icon</span>, badge: 2 },
  { id: 'profile', label: '我的', icon: <span>profile-icon</span>, badge: 0 },
];

describe('MobileButton', () => {
  it('renders children and forwards click handlers', () => {
    const onClick = vi.fn();
    renderWithProviders(
      <MobileButton
        size='large'
        fullWidth
        onClick={onClick}
      >
