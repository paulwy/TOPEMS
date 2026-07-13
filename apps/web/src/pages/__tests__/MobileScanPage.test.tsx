import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MobileScanPage from '../mobile/MobileScanPage';
import { useAuthStore, useNotificationStore } from '@/store';

const mockAddNotification = vi.fn();

const mockUser = {
  id: 'user-001',
  name: '测试用户',
};

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('MobileScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', async () => {
    renderWithProviders(<MobileScanPage />);
    await waitFor(() => {
      const titles = screen.getAllByText('扫码');
      expect(titles.length).toBeGreaterThan(0);
    });
  });
});