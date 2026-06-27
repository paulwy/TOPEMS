import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QMSCorrectiveActionPage from '../qms/QMSCorrectiveActionPage';
import { qmsApi } from '@/api/qms';
import { useAppStore } from '@/store';

vi.mock('@/api/qms');
vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockActions = [
  {
    id: 'CA001',
    action_no: 'CA-2024-001',
    action_title: '改进生产工艺',
    related_issue: '产品表面划痕',
    status: 'in_progress',
    assignee: '李四',
    due_date: '2024-02-15',
  },
];

describe('QMSCorrectiveActionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue(mockAddNotification);
    (qmsApi.listActions as vi.Mock).mockResolvedValue({
      success: true,
      data: mockActions,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QMSCorrectiveActionPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<QMSCorrectiveActionPage />);
    await waitFor(() => {
      expect(screen.getByText('纠正措施')).toBeInTheDocument();
    });
  });

  it('should render action table', async () => {
    renderWithProviders(<QMSCorrectiveActionPage />);
    await waitFor(() => {
      expect(screen.getByText('CA-2024-001')).toBeInTheDocument();
      expect(screen.getByText('改进生产工艺')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<QMSCorrectiveActionPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '工艺' } });
    });
  });

  it('should handle create action', async () => {
    (qmsApi.createAction as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<QMSCorrectiveActionPage />);
    await waitFor(() => {
      const addButton = screen.getByText(/新增/);
      fireEvent.click(addButton);
    });

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(qmsApi.createAction).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (qmsApi.listActions as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QMSCorrectiveActionPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
