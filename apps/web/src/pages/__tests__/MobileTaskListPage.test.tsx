import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MobileTaskListPage from '../mobile/MobileTaskListPage';
import { useAppStore } from '@/store';

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector ? selector({
      user: mockUser,
      addNotification: mockAddNotification,
      notifications: [],
      theme: 'light',
    }) : {
      user: mockUser,
      addNotification: mockAddNotification,
      notifications: [],
      theme: 'light',
    }
  ),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockUser = {
  id: 'user-001',
  name: '测试用户',
};

describe('MobileTaskListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', async () => {
    renderWithProviders(<MobileTaskListPage />);
    await waitFor(() => {
      expect(screen.getByText('我的任务')).toBeInTheDocument();
    });
  });
});
