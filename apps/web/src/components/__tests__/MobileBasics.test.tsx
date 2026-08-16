import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

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
  withTranslation: () => (Component: any) => Component,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
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

import { BottomTabBar, type TabItem } from '../mobile/BottomTabBar';
import { MobileButton } from '../mobile/MobileButton';
import { MobileCard } from '../mobile/MobileCard';
import { MobileHeader } from '../mobile/MobileHeader';
import { MobileSearch } from '../mobile/MobileSearch';
import { MobileSkeleton } from '../mobile/MobileSkeleton';
import { PullToRefresh } from '../mobile/PullToRefresh';
import { SwipeAction, type SwipeActionItem } from '../mobile/SwipeAction';

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
        提交
      </MobileButton>
    );

    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled state', () => {
    renderWithProviders(<MobileButton disabled>禁用</MobileButton>);
    expect(screen.getByRole('button', { name: '禁用' })).toBeDisabled();
  });
});

describe('MobileCard', () => {
  it('renders composed card content and handles click', () => {
    const onClick = vi.fn();
    renderWithProviders(
      <MobileCard
        title='任务标题'
        subtitle='任务描述'
        leftIcon={<span>左侧图标</span>}
        rightContent={<span>右侧内容</span>}
        badge={<span>徽章</span>}
        showArrow
        divider
        onClick={onClick}
      />
    );

    expect(screen.getByText('任务标题')).toBeInTheDocument();
    expect(screen.getByText('任务描述')).toBeInTheDocument();
    expect(screen.getByText('左侧图标')).toBeInTheDocument();
    expect(screen.getByText('右侧内容')).toBeInTheDocument();
    expect(screen.getByText('徽章')).toBeInTheDocument();

    fireEvent.click(screen.getByText('任务标题'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders custom children instead of generated content', () => {
    renderWithProviders(
      <MobileCard title='不会显示'>
        <div>自定义内容</div>
      </MobileCard>
    );

    expect(screen.getByText('自定义内容')).toBeInTheDocument();
    expect(screen.queryByText('不会显示')).not.toBeInTheDocument();
  });
});

describe('MobileSearch', () => {
  it('submits trimmed query with Enter and clears input', () => {
    const onSearch = vi.fn();
    renderWithProviders(
      <MobileSearch
        placeholder='搜索物料'
        onSearch={onSearch}
      />
    );

    const input = screen.getByPlaceholderText('搜索物料');
    fireEvent.change(input, { target: { value: '  MAT-001  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSearch).toHaveBeenCalledWith('MAT-001');

    fireEvent.click(screen.getByLabelText('关闭'));
    expect(input).toHaveValue('');
  });

  it('shows history, handles history click, and clears history', () => {
    const onHistoryClick = vi.fn();
    const onHistoryClear = vi.fn();
    renderWithProviders(
      <MobileSearch
        history={['工单', '审批']}
        onHistoryClick={onHistoryClick}
        onHistoryClear={onHistoryClear}
      />
    );

    fireEvent.focus(screen.getByPlaceholderText('搜索...'));

    expect(screen.getByText('搜索...')).toBeInTheDocument();
    fireEvent.click(screen.getByText('工单'));
    expect(onHistoryClick).toHaveBeenCalledWith('工单');

    fireEvent.focus(screen.getByDisplayValue('工单'));
    fireEvent.click(screen.getByLabelText('关闭'));
    fireEvent.click(screen.getByText('清除'));
    expect(onHistoryClear).toHaveBeenCalledTimes(1);
  });
});

describe('BottomTabBar', () => {
  it('renders tabs, badge, and emits selected tab changes', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <BottomTabBar
        tabs={tabs}
        activeTab='home'
        onChange={onChange}
      />
    );

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('任务')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('任务'));
    expect(onChange).toHaveBeenCalledWith('tasks');
  });
});

describe('MobileHeader', () => {
  it('renders title and action buttons', () => {
    const onMenuClick = vi.fn();
    const onNotificationClick = vi.fn();
    const onSearchClick = vi.fn();
    const onMoreClick = vi.fn();

    renderWithProviders(
      <MobileHeader
        title='移动工作台'
        showSearch
        showMore
        notificationCount={5}
        onMenuClick={onMenuClick}
        onNotificationClick={onNotificationClick}
        onSearchClick={onSearchClick}
        onMoreClick={onMoreClick}
      />
    );

    expect(screen.getByRole('heading', { name: '移动工作台' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('菜单'));
    fireEvent.click(screen.getByLabelText('搜索'));
    fireEvent.click(screen.getByLabelText('徽章'));
    fireEvent.click(screen.getByLabelText('更多'));

    expect(onMenuClick).toHaveBeenCalledTimes(1);
    expect(onSearchClick).toHaveBeenCalledTimes(1);
    expect(onNotificationClick).toHaveBeenCalledTimes(1);
    expect(onMoreClick).toHaveBeenCalledTimes(1);
  });

  it('uses custom back handler when provided', () => {
    const onBackClick = vi.fn();
    renderWithProviders(
      <MobileHeader
        title='详情'
        showBack
        onBackClick={onBackClick}
      />
    );

    fireEvent.click(screen.getByLabelText('返回'));
    expect(onBackClick).toHaveBeenCalledTimes(1);
  });
});

describe('MobileSkeleton', () => {
  it('renders list skeleton with requested count and avatar placeholders', () => {
    const { container } = renderWithProviders(
      <MobileSkeleton
        type='list'
        count={3}
      />
    );

    expect(container.querySelectorAll('.MuiSkeleton-circular')).toHaveLength(3);
  });

  it('renders dashboard skeleton blocks', () => {
    const { container } = renderWithProviders(<MobileSkeleton type='dashboard' />);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(5);
  });
});

describe('PullToRefresh', () => {
  it('renders children and triggers refresh after pull threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { container } = renderWithProviders(
      <PullToRefresh
        threshold={40}
        onRefresh={onRefresh}
      >
        <div>列表内容</div>
      </PullToRefresh>
    );

    const pullArea = container.firstElementChild as HTMLElement;
    fireEvent.touchStart(pullArea, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(pullArea, {
      touches: [{ clientY: 100 }],
      cancelable: true,
    });
    fireEvent.touchEnd(pullArea);

    expect(screen.getByText('列表内容')).toBeInTheDocument();
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  });

  it('does not trigger refresh when disabled', () => {
    const onRefresh = vi.fn();
    const { container } = renderWithProviders(
      <PullToRefresh
        disabled
        onRefresh={onRefresh}
      >
        <div>禁用列表</div>
      </PullToRefresh>
    );

    const pullArea = container.firstElementChild as HTMLElement;
    fireEvent.touchStart(pullArea, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(pullArea, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(pullArea);

    expect(onRefresh).not.toHaveBeenCalled();
  });
});

describe('SwipeAction', () => {
  const rightAction: SwipeActionItem = {
    id: 'delete',
    label: '删除',
    icon: <span>delete-icon</span>,
    color: 'error.main',
    onClick: vi.fn(),
  };

  it('renders action labels and invokes action click handlers', () => {
    const onClick = vi.fn();
    renderWithProviders(
      <SwipeAction rightActions={[{ ...rightAction, onClick }]}>
        <div>可滑动内容</div>
      </SwipeAction>
    );

    expect(screen.getByText('可滑动内容')).toBeInTheDocument();
    fireEvent.click(screen.getByText('删除'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onOpen after enough left swipe', () => {
    const onOpen = vi.fn();
    const { container } = renderWithProviders(
      <SwipeAction
        rightActions={[rightAction]}
        onOpen={onOpen}
      >
        <div>滑动打开</div>
      </SwipeAction>
    );

    const swipeArea = container.firstElementChild as HTMLElement;
    fireEvent.touchStart(swipeArea, { touches: [{ clientX: 100 }] });
    fireEvent.touchMove(swipeArea, { touches: [{ clientX: 0 }] });
    fireEvent.touchEnd(swipeArea);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
