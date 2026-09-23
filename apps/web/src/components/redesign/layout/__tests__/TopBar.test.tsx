import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { TopBar } from '../TopBar';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
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

    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
  });

  it('renders with notifications button', () => {
    render(
      <MemoryRouter>
        <TopBar onNotificationsOpen={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });
});
