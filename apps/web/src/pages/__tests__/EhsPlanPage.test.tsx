import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsPlanPage from '../ehs/EhsPlanPage';
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

const mockPlans = [
  {
    id: 'PL001',
    plan_no: 'PL-2024-001',
    name: '年度安全培训计划',
    plan_type: 'training',
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
  },
];

describe('EhsPlanPage', () => {
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
    (ehsApi.listPlans as vi.Mock).mockResolvedValue({
      success: true,
      data: mockPlans,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<EhsPlanPage />);
    expect(screen.getByText('应急预案')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<EhsPlanPage />);
    await waitFor(() => {
      expect(screen.getByText('应急预案')).toBeInTheDocument();
    });
  });

  it('should render plan table', async () => {
    renderWithProviders(<EhsPlanPage />);
    await waitFor(() => {
      expect(screen.getByText('PL-2024-001')).toBeInTheDocument();
      expect(screen.getByText('年度安全培训计划')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<EhsPlanPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '培训' } });
    });
  });

  it('should handle create plan', async () => {
    (ehsApi.createPlan as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<EhsPlanPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增预案/i });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const planNoInput = screen.getByLabelText(/预案编号/i);
      const planNameInput = screen.getByLabelText(/预案名称/i);
      fireEvent.change(planNoInput, { target: { value: 'PL-TEST-001' } });
      fireEvent.change(planNameInput, { target: { value: '测试预案' } });

      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(ehsApi.createPlan).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (ehsApi.listPlans as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<EhsPlanPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
