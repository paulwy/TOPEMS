import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MobileApprovalPage from '../mobile/MobileApprovalPage';
import { useAppStore } from '@/store';

vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockUser = {
  id: 'user-001',
  name: '测试用户',
};

describe('MobileApprovalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAppStore as vi.Mock).mockImplementation(() => ({
      user: mockUser,
      addNotification: mockAddNotification,
    }));
  });

  it('should render page title', async () => {
    renderWithProviders(<MobileApprovalPage />);
    await waitFor(() => {
      expect(screen.getByText('移动审批')).toBeInTheDocument();
    });
  });
});
