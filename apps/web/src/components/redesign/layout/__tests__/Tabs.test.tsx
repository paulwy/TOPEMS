import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Tabs } from '../../primitives/Tabs';

const tabs = [
  { id: 'all', label: '全部' },
  { id: 'active', label: '活跃' },
  { id: 'inactive', label: '不活跃' },
];

describe('Tabs', () => {
  it('renders with tabs', () => {
    render(
      <Tabs
        tabs={tabs}
        activeTab='all'
        onChange={() => {}}
      />
    );

    expect(screen.getByText('全部')).toBeInTheDocument();
    expect(screen.getByText('活跃')).toBeInTheDocument();
    expect(screen.getByText('不活跃')).toBeInTheDocument();
  });

  it('renders with active tab', () => {
    render(
      <Tabs
        tabs={tabs}
        activeTab='active'
        onChange={() => {}}
      />
    );

    // 活跃标签应该被选中
    const activeTab = screen.getByText('活跃');
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders with badge', () => {
    const tabsWithBadge = [
      { id: 'all', label: '全部', badge: 100 },
      { id: 'active', label: '活跃', badge: 80 },
    ];

    render(
      <Tabs
        tabs={tabsWithBadge}
        activeTab='all'
        onChange={() => {}}
      />
    );

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });
});
