import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { AppShell } from '../AppShell';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}));

describe('AppShell', () => {
  it('renders with children', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>页面内容</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByText('页面内容')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <MemoryRouter>
        <AppShell title='TOPEMS'>
          <div>页面内容</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByText('TOPEMS')).toBeInTheDocument();
  });

  it('renders with navigation items', () => {
    render(
      <MemoryRouter>
        <AppShell
          items={[
            { id: 'home', label: '首页', icon: () => null },
            { id: 'settings', label: '设置', icon: () => null },
          ]}
        >
          <div>页面内容</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
  });
});
