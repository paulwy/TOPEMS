import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

import NotFoundPage from '../NotFoundPage';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/navigation', () => ({
  navigationRegistryV2: {
    getModuleCards: vi.fn(() => []),
  },
}));

vi.mock('@/routes/dashboard', () => ({
  DASHBOARD_PATHS: {
    dashboard: '/dashboard',
    modules: '/modules',
  },
}));

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 404 text', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders 页面未找到 heading', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText('页面未找到')).toBeInTheDocument();
  });

  it('renders 返回首页 button', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole('button', { name: /返回首页/ })).toBeInTheDocument();
  });

  it('renders 浏览模块 button', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole('button', { name: /浏览模块/ })).toBeInTheDocument();
  });

  it('renders 返回上一页 button', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole('button', { name: /返回上一页/ })).toBeInTheDocument();
  });

  it('clicking 返回首页 calls navigate with dashboard path', () => {
    renderWithProviders(<NotFoundPage />);
    fireEvent.click(screen.getByRole('button', { name: /返回首页/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('clicking 返回上一页 calls navigate with -1', () => {
    renderWithProviders(<NotFoundPage />);
    fireEvent.click(screen.getByRole('button', { name: /返回上一页/ }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
