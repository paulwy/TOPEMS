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

