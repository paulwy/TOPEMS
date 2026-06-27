import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsDrillPage from '../ehs/EhsDrillPage';
import { ehsApi } from '@/api/ehs';
import { useAppStore } from '@/store';

vi.mock('@/api/ehs');
vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockDrills = [
  {
    id: 'DR001',
    drill_no: 'DR-2024-001',
    drill_name: '火灾逃生演练',
    drill_type: 'fire',
    status: 'completed',
    participants: ['张三', '李四'],
    drill_date: '2024-02-01',
    location: 'A区',
    duration_hours: 2,
    summary: '演练成功',
    issues_found: null,
    improvements: null,
  },
];

describe('EhsDrillPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (useAppStore as vi.Mock).mockImplementation(() => mockAddNotification);
    (ehsApi.listDrills as vi.Mock).mockResolvedValue({
      success: true,
      data: mockDrills,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<EhsDrillPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<EhsDrillPage />);
    await waitFor(() => {
      expect(screen.getByText('演练记录')).toBeInTheDocument();
    });
  });

  it('should render drill table', async () => {
    renderWithProviders(<EhsDrillPage />);
    await waitFor(() => {
      expect(screen.getByText('DR-2024-001')).toBeInTheDocument();
      expect(screen.getByText('火灾逃生演练')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<EhsDrillPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索演练名称或编号/);
      fireEvent.change(searchInput, { target: { value: '火灾' } });
    });
  });

  it('should handle create drill', async () => {
    (ehsApi.createDrill as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<EhsDrillPage />);

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增演练/i });
      fireEvent.click(addButton);
    });

    await act(async () => {
      const noInput = screen.getByLabelText(/演练编号/);
      fireEvent.change(noInput, { target: { value: 'DR-TEST-001' } });
    });

    await act(async () => {
      const nameInput = screen.getByLabelText(/演练名称/);
      fireEvent.change(nameInput, { target: { value: '测试演练' } });
    });

    await act(async () => {
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(ehsApi.createDrill).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (ehsApi.listDrills as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<EhsDrillPage />);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalled();
    });
  });
});
