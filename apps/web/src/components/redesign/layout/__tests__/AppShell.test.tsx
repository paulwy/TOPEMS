import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { AppShell } from '../AppShell';

describe('AppShell', () => {
  it('renders with children', () => {
    render(
      <AppShell>
        <div>页面内容</div>
      </AppShell>
    );

    expect(screen.getByText('页面内容')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <AppShell title='TOPEMS'>
        <div>页面内容</div>
      </AppShell>
    );

    expect(screen.getByText('TOPEMS')).toBeInTheDocument();
  });

  it('renders with navigation items', () => {
    render(
      <AppShell
        items={[
          { id: 'home', label: '首页', icon: () => null },
          { id: 'settings', label: '设置', icon: () => null },
        ]}
      >
        <div>页面内容</div>
      </AppShell>
    );

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
  });
});
