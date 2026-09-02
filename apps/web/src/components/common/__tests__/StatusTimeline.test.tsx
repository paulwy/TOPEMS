import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import StatusTimeline from '../StatusTimeline';
import type { TimelineItem } from '../StatusTimeline';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/mobile.json'),
    require('../../../i18n/locales/zh/store.json'),
    require('../../../i18n/locales/zh/shared.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
    let base = (i18nMap[key] ?? key) as string;
    if (options === undefined || options === null) return base;
    let didReplace = false;
    const tryReplace = (phName: string, valStr: string) => {
      const p1 = `{{${phName}}}`;
      const p2 = `{${phName}}`;
      const p3 = `\${${phName}}`;
      if (base.includes(p1)) {
        base = base.split(p1).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p2)) {
        base = base.split(p2).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p3)) {
        base = base.split(p3).join(valStr);
        didReplace = true;
        return true;
      }
      return false;
    };
    if (typeof options === 'object') {
      for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
      if (!didReplace) {
        const keys = Object.keys(options);
        if (keys.length === 1) {
          base = `${base} ${String((options as any)[keys[0]])}`;
        } else {
          base = `${base}:${JSON.stringify(options)}`;
        }
      }
    } else {
      const strVal = String(options);
      if (!tryReplace('0', strVal)) {
        base = `${base} ${strVal}`;
      }
    }
    return base;
  };
  return {
    useTranslation: () => ({ t, i18n: { language: 'zh' } }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const sources = [
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/mobile.json'),
    require('../../../i18n/locales/zh/store.json'),
    require('../../../i18n/locales/zh/shared.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
    let base = (i18nMap[key] ?? key) as string;
    if (options === undefined || options === null) return base;
    let didReplace = false;
    const tryReplace = (phName: string, valStr: string) => {
      const p1 = `{{${phName}}}`;
      const p2 = `{${phName}}`;
      const p3 = `\${${phName}}`;
      if (base.includes(p1)) {
        base = base.split(p1).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p2)) {
        base = base.split(p2).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p3)) {
        base = base.split(p3).join(valStr);
        didReplace = true;
        return true;
      }
      return false;
    };
    if (typeof options === 'object') {
      for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
      if (!didReplace) {
        const keys = Object.keys(options);
        if (keys.length === 1) {
          base = `${base} ${String((options as any)[keys[0]])}`;
        } else {
          base = `${base}:${JSON.stringify(options)}`;
        }
      }
    } else {
      const strVal = String(options);
      if (!tryReplace('0', strVal)) {
        base = `${base} ${strVal}`;
      }
    }
    return base;
  };
  return {
    default: {
      t,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

const mockItems: TimelineItem[] = [
  {
    id: '1',
    title: '订单创建',
    description: '客户提交了订单',
    status: 'completed',
    time: '2024-01-15 09:00',
    user: '张三',
  },
  {
    id: '2',
    title: '审核中',
    description: '等待主管审核',
    status: 'current',
    time: '2024-01-15 10:30',
    user: '李四',
  },
  {
    id: '3',
    title: '待发货',
    description: '准备商品发货',
    status: 'pending',
    time: '2024-01-15 14:00',
  },
  {
    id: '4',
    title: '支付失败',
    description: '信用卡支付被拒绝',
    status: 'failed',
    time: '2024-01-15 15:00',
  },
  {
    id: '5',
    title: '库存警告',
    status: 'warning',
    time: '2024-01-15 16:00',
  },
];

describe('StatusTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all timeline items', () => {
    renderWithProviders(<StatusTimeline items={mockItems} />);
    expect(screen.getByText('订单创建')).toBeInTheDocument();
    expect(screen.getByText('审核中')).toBeInTheDocument();
    expect(screen.getByText('待发货')).toBeInTheDocument();
    expect(screen.getByText('支付失败')).toBeInTheDocument();
    expect(screen.getByText('库存警告')).toBeInTheDocument();
  });

  it('renders in vertical orientation by default', () => {
    const { container } = renderWithProviders(<StatusTimeline items={mockItems} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders in horizontal orientation', () => {
    renderWithProviders(
      <StatusTimeline
        items={mockItems}
        orientation='horizontal'
      />
    );
    expect(screen.getByText('订单创建')).toBeInTheDocument();
    expect(screen.getByText('审核中')).toBeInTheDocument();
  });

  it('shows descriptions when provided', () => {
    renderWithProviders(<StatusTimeline items={mockItems} />);
    expect(screen.getByText('客户提交了订单')).toBeInTheDocument();
    expect(screen.getByText('等待主管审核')).toBeInTheDocument();
    expect(screen.getByText('准备商品发货')).toBeInTheDocument();
    expect(screen.getByText('信用卡支付被拒绝')).toBeInTheDocument();
  });

  it('shows time and user when provided', () => {
    renderWithProviders(<StatusTimeline items={mockItems} />);
    expect(screen.getByText(/2024-01-15 09:00/)).toBeInTheDocument();
    expect(screen.getByText(/张三/)).toBeInTheDocument();
    expect(screen.getByText(/李四/)).toBeInTheDocument();
  });

  it('renders status labels (completed, current, pending, failed, warning)', () => {
    renderWithProviders(<StatusTimeline items={mockItems} />);
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('进行中')).toBeInTheDocument();
    expect(screen.getByText('待处理')).toBeInTheDocument();
    expect(screen.getByText('失败')).toBeInTheDocument();
    expect(screen.getByText('警告')).toBeInTheDocument();
  });

  it('renders status icons for each item', () => {
    const { container } = renderWithProviders(<StatusTimeline items={mockItems} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(5);
  });

  it('hides labels when showLabels is false', () => {
    renderWithProviders(
      <StatusTimeline
        items={mockItems}
        showLabels={false}
      />
    );
    expect(screen.queryByText('已完成')).not.toBeInTheDocument();
    expect(screen.queryByText('进行中')).not.toBeInTheDocument();
  });

  it('hides icons when showIcons is false', () => {
    const { container } = renderWithProviders(
      <StatusTimeline
        items={mockItems}
        showIcons={false}
      />
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeLessThan(5);
  });

  it('renders with custom dotSize', () => {
    const { container } = renderWithProviders(
      <StatusTimeline
        items={mockItems}
        dotSize={30}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with custom item icon', () => {
    const itemsWithIcon: TimelineItem[] = [
      {
        id: '1',
        title: '自定义图标',
        status: 'current',
        icon: <span data-testid='custom-timeline-icon'>★</span>,
      },
    ];
    renderWithProviders(<StatusTimeline items={itemsWithIcon} />);
    expect(screen.getByTestId('custom-timeline-icon')).toBeInTheDocument();
  });

  it('renders with custom color on item', () => {
    const itemsWithColor: TimelineItem[] = [
      {
        id: '1',
        title: '自定义颜色',
        status: 'completed',
        // eslint-disable-next-line topems-design/no-hardcoded-colors
        color: '#ff0000',
      },
    ];
    const { container } = renderWithProviders(<StatusTimeline items={itemsWithColor} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with dotColor alias', () => {
    const itemsWithDotColor: TimelineItem[] = [
      {
        id: '1',
        title: '圆点颜色',
        status: 'completed',
        // eslint-disable-next-line topems-design/no-hardcoded-colors
        dotColor: '#00ff00',
      },
    ];
    const { container } = renderWithProviders(<StatusTimeline items={itemsWithDotColor} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders empty items list without errors', () => {
    const { container } = renderWithProviders(<StatusTimeline items={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders horizontal orientation with custom dotSize', () => {
    renderWithProviders(
      <StatusTimeline
        items={mockItems}
        orientation='horizontal'
        dotSize={16}
      />
    );
    expect(screen.getByText('订单创建')).toBeInTheDocument();
  });
});
