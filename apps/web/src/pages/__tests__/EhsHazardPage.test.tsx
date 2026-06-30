import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsHazardPage from '../ehs/EhsHazardPage';
import { ehsApi } from '@/api/ehs';
import { useAppStore } from '@/store';

vi.mock('@/api/ehs');
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector ? selector({
      addNotification: mockAddNotification,
      notifications: [],
      user: null,
      theme: 'light',
    }) : {
      addNotification: mockAddNotification,
      notifications: [],
      user: null,
      theme: 'light',
    }
  ),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockIssues = [
  {
    id: 'HZ001',
    hazard_no: 'HZ-2024-001',
    title: '配电箱门未关闭',
    description: 'A区配电箱门未关闭，存在安全隐患',
    category: 'equipment',
    level: 'general',
    source: 'inspection',
    location: 'A区-1号车间',
    reported_by: '张三',
    reported_at: '2024-01-15T10:00:00Z',
    status: 'reported',
  },
];

describe('EhsHazardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockImplementation((selector?: any) =>
      selector ? selector({
        addNotification: mockAddNotification,
        notifications: [],
        user: null,
        theme: 'light',
      }) : {
        addNotification: mockAddNotification,
        notifications: [],
        user: null,
        theme: 'light',
      }
    );
    (ehsApi.listSafetyIssues as vi.Mock).mockResolvedValue({
      success: true,
      data: mockIssues,
    });
  });

  it('should render loading state initially', async () => {
    await act(async () => {
      renderWithProviders(<EhsHazardPage />);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    await act(async () => {
      renderWithProviders(<EhsHazardPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('隐患管理')).toBeInTheDocument();
    });
  });

  it('should render hazard table', async () => {
    await act(async () => {
      renderWithProviders(<EhsHazardPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('HZ-2024-001')).toBeInTheDocument();
      expect(screen.getByText('配电箱门未关闭')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    await act(async () => {
      renderWithProviders(<EhsHazardPage />);
    });
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索隐患名称或编号/);
      fireEvent.change(searchInput, { target: { value: '配电' } });
    });
  });

  it('should handle create hazard', async () => {
    (ehsApi.createSafetyIssue as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    await act(async () => {
      renderWithProviders(<EhsHazardPage />);
    });

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /上报隐患/i });
      fireEvent.click(addButton);
    });

    await act(async () => {
      const titleInput = screen.getByLabelText(/隐患名称/);
      fireEvent.change(titleInput, { target: { value: '测试隐患' } });
    });

    await act(async () => {
      const saveButton = screen.getByRole('button', { name: /上报/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(ehsApi.createSafetyIssue).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (ehsApi.listSafetyIssues as vi.Mock).mockRejectedValue(new Error('Network error'));
    await act(async () => {
      renderWithProviders(<EhsHazardPage />);
    });

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalled();
    });
  });
});
