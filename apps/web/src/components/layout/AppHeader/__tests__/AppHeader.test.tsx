import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

import { AppHeader } from '../AppHeader';

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');
  return {
    ...actual,
    useMediaQuery: vi.fn(() => false),
  };
});

vi.mock('../HeaderLogo', () => ({
  HeaderLogo: () => <div data-testid='header-logo' />,
}));

vi.mock('../HeaderSearch', () => ({
  HeaderSearch: () => <div data-testid='header-search' />,
}));

vi.mock('../HeaderNotifications', () => ({
  HeaderNotifications: () => <div data-testid='header-notifications' />,
}));

vi.mock('../HeaderUserMenu', () => ({
  HeaderUserMenu: () => <div data-testid='header-user-menu' />,
}));

vi.mock('../HeaderBreadcrumbs', () => ({
  HeaderBreadcrumbs: () => <div data-testid='header-breadcrumbs' />,
}));

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header element with role banner', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders HeaderLogo component', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-logo')).toBeInTheDocument();
  });

  it('renders HeaderSearch component', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-search')).toBeInTheDocument();
  });

  it('renders HeaderNotifications component', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-notifications')).toBeInTheDocument();
  });

  it('renders HeaderUserMenu component', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-user-menu')).toBeInTheDocument();
  });

  it('renders HeaderBreadcrumbs component', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-breadcrumbs')).toBeInTheDocument();
  });

  it('renders rightActions when provided instead of default components', () => {
    renderWithProviders(<AppHeader rightActions={<div data-testid='custom-action'>Custom</div>} />);
    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
    expect(screen.queryByTestId('header-notifications')).not.toBeInTheDocument();
    expect(screen.queryByTestId('header-user-menu')).not.toBeInTheDocument();
  });
});
