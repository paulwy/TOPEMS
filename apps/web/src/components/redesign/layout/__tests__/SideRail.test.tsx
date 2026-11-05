import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Home, Settings, BarChart3, FileText } from 'lucide-react';

import { SideRail } from '../SideRail';

const groupedItems = [
  {
    id: 'mes',
    label: '制造执行',
    icon: Home,
    children: [
      { id: 'mes:mes-work-order', label: '工单管理', icon: FileText, group: 'business' },
      { id: 'mes:mes-oee', label: 'OEE 看板', icon: BarChart3, group: 'analytics' },
      { id: 'mes:mes-spc', label: 'SPC 分析', icon: BarChart3, group: 'analytics' },
      { id: 'mes:mes-param', label: '参数配置', icon: Settings, group: 'setting' },
    ],
  },
];

describe('SideRail', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders with default items', () => {
    render(<SideRail />);

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('制造执行')).toBeInTheDocument();
  });

  it('renders with custom items', () => {
    render(
      <SideRail
        items={[
          { id: 'home', label: '首页', icon: Home },
          { id: 'settings', label: '设置', icon: Settings },
        ]}
      />
    );

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
  });

  it('renders with active item', () => {
    render(
      <SideRail
        items={[
          { id: 'home', label: '首页', icon: Home },
          { id: 'settings', label: '设置', icon: Settings },
        ]}
        activeId='home'
      />
    );

    expect(screen.getByText('首页')).toBeInTheDocument();
  });

  it('renders second-level group headers and auto-expands active module/group', () => {
    render(
      <SideRail
        items={groupedItems}
        activeId='mes:mes-oee'
      />
    );

    // 当前模块自动展开 → 组头可见（组头文案来自 shared.nav_group.* i18n）
    expect(screen.getByText('业务单据')).toBeInTheDocument();
    expect(screen.getByText('统计分析')).toBeInTheDocument();
    expect(screen.getByText('系统配置')).toBeInTheDocument();
    // 当前项所在的 analytics 组自动展开，组内项可点击
    expect(screen.getByText('OEE 看板')).toBeInTheDocument();
    expect(screen.getByText('SPC 分析')).toBeInTheDocument();
  });

  it('collapses a group on header click and remembers state in localStorage', () => {
    render(
      <SideRail
        items={groupedItems}
        activeId='mes:mes-oee'
      />
    );

    // 点击 analytics 组头折叠：组内项隐藏，持久化状态移除该组
    fireEvent.click(screen.getByText('统计分析'));
    expect(screen.queryByText('OEE 看板')).not.toBeInTheDocument();

    let stored = JSON.parse(localStorage.getItem('topems.sidebar.expand.v1') || '{}');
    expect(stored.modules).toContain('mes');
    expect(stored.groups).not.toContain('mes:analytics');

    // 再点击 setting 组头展开：组内项出现，持久化状态记录该组
    fireEvent.click(screen.getByText('系统配置'));
    expect(screen.getByText('参数配置')).toBeInTheDocument();
    stored = JSON.parse(localStorage.getItem('topems.sidebar.expand.v1') || '{}');
    expect(stored.groups).toContain('mes:setting');
  });

  it('restores expanded state from localStorage', () => {
    localStorage.setItem(
      'topems.sidebar.expand.v1',
      JSON.stringify({ modules: ['mes'], groups: ['mes:setting'] })
    );

    render(<SideRail items={groupedItems} />);

    // 存储中展开的 setting 组可见其子项
    expect(screen.getByText('参数配置')).toBeInTheDocument();
    // 未存储展开的 analytics 组默认折叠
    expect(screen.queryByText('OEE 看板')).not.toBeInTheDocument();
  });
});
