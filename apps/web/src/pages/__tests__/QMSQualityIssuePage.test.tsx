import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QMSQualityIssuePage from '../qms/QMSQualityIssuePage';
import { qmsApi } from '@/api/qms';
import { useAppStore } from '@/store';

vi.mock('@/api/qms');
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
    id: 'QI001',
    issue_no: 'QI-2024-001',
    issue_title: '产品表面划痕',
    severity: 'minor',
    status: 'open',
    reporter: '张三',
    reported_at: '2024-01-15',
  },
];

describe('QMSQualityIssuePage', () => {
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
    (qmsApi.listIssues as vi.Mock).mockResolvedValue({
      success: true,
      data: mockIssues,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QMSQualityIssuePage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<QMSQualityIssuePage />);
    await waitFor(() => {
      expect(screen.getByText('质量问题')).toBeInTheDocument();
    });
  });

  it('should render issue table', async () => {
    renderWithProviders(<QMSQualityIssuePage />);
    await waitFor(() => {
      expect(screen.getByText('QI-2024-001')).toBeInTheDocument();
      expect(screen.getByText('产品表面划痕')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<QMSQualityIssuePage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '划痕' } });
    });
  });

  it('should handle create issue', async () => {
    (qmsApi.createIssue as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<QMSQualityIssuePage />);
    await waitFor(() => {
      const addButton = screen.getByText(/新增/);
      fireEvent.click(addButton);
    });

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(qmsApi.createIssue).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (qmsApi.listIssues as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QMSQualityIssuePage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
