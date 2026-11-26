import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { TopBar } from '../TopBar';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'topbar.collapse_sidebar': '折叠侧边栏',
        'topbar.expand_sidebar': '展开侧边栏',
        'components.top_bar.notifications': '通知',
      })[key] ?? key,
    i18n: { language: 'zh' },
  }),
}));

describe('TopBar', () => {
  it('renders with title', () => {
    render(
      <MemoryRouter>
        <TopBar title='TOPEMS' />
      </MemoryRouter>
    );

    expect(screen.getByText('TOPEMS')).toBeInTheDocument();
  });

  it('renders with menu toggle button', () => {
    render(
      <MemoryRouter>
        <TopBar onMenuToggle={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('折叠侧边栏')).toBeInTheDocument();
  });

  it('renders with notifications button', () => {
    render(
      <MemoryRouter>
        <TopBar onNotificationsOpen={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('通知')).toBeInTheDocument();
  });

  it('内置搜索入口在没有 slot 时渲染，在提供 slot 时被替换', () => {
    const { rerender } = render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    );
    expect(screen.getByTestId('topbar-command-palette')).toBeInTheDocument();
    expect(screen.getByTestId('topbar-command-palette').getAttribute('role')).toBeNull();

    rerender(
      <MemoryRouter>
        <TopBar searchSlot={<span data-testid='fake-search'>搜索条</span>} />
      </MemoryRouter>
    );
    const slot = screen.getByTestId('topbar-command-palette');
    expect(slot.getAttribute('role')).toBe('search');
    expect(screen.getByTestId('fake-search')).toBeInTheDocument();
    // 内置按钮不再渲染（避免同一入口出现两次）
    expect(slot.querySelector('[data-testid="topbar-command-palette"] button')).toBeNull();
  });
});
