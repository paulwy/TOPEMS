import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MobileHomePage } from '../mobile/MobileHomePage';
import { useAppStore } from '@/store';

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector ? selector({
      user: mockUser,
      addNotification: vi.fn(),
      notifications: [],
      theme: 'light',
    }) : {
      user: mockUser,
      addNotification: vi.fn(),
      notifications: [],
      theme: 'light',
    }
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockUser = {
  id: 'user-001',
  name: '测试用户',
  email: 'test@example.com',
  avatar: undefined,
};

describe('MobileHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', async () => {
    renderWithProviders(<MobileHomePage />);
    await waitFor(() => {
      expect(screen.getByText('移动办公')).toBeInTheDocument();
    });
  });

  it('should render quick actions', async () => {
    renderWithProviders(<MobileHomePage />);
    await waitFor(() => {
      expect(screen.getByText('扫码')).toBeInTheDocument();
      expect(screen.getByText('任务')).toBeInTheDocument();
      expect(screen.getByText('审批')).toBeInTheDocument();
    });
  });

  it('should render stats cards', async () => {
    renderWithProviders(<MobileHomePage />);
    await waitFor(() => {
      expect(screen.getByText('待办任务')).toBeInTheDocument();
      expect(screen.getByText('待审批')).toBeInTheDocument();
    });
  });

  it('should render user info', async () => {
    renderWithProviders(<MobileHomePage />);
    await waitFor(() => {
      expect(screen.getByText('测试用户')).toBeInTheDocument();
    });
  });
});
