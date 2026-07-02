import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsAccidentPage from '../ehs/EhsAccidentPage';
import { ehsApi } from '@/api/ehs';
import { useAppStore } from '@/store';

vi.mock('@/api/ehs');
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: mockAddNotification,
          notifications: [],
          user: null,
          theme: 'light',
        })
      : {
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

const mockAccidents = [
  {
    id: 'AC001',
    accident_no: 'AC-2024-001',
    title: '车间设备故障事故',
    accident_type: '设备故障',
    severity: 'minor',
    location: 'B区-2号车间',
    occurred_at: '2024-01-15T10:00:00Z',
    reported_by: '张三',
    status: 'pending',
    casualties: 0,
    economic_loss: 0,
  },
];

describe('EhsAccidentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockImplementation((selector?: any) =>
      selector
        ? selector({
            addNotification: mockAddNotification,
            notifications: [],
            user: null,
            theme: 'light',
          })
        : {
            addNotification: mockAddNotification,
            notifications: [],
            user: null,
            theme: 'light',
          }
    );
    (ehsApi.listAccidents as vi.Mock).mockResolvedValue({
      success: true,
      data: mockAccidents,
    });
  });

  it('should render loading state initially', async () => {
    const { container } = await act(async () => {
      return renderWithProviders(<EhsAccidentPage />);
    });
    expect(container.querySelector('.css-1plowji-MuiPaper-root')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    await act(async () => {
      renderWithProviders(<EhsAccidentPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('事故记录')).toBeInTheDocument();
    });
  });

  it('should render accident table', async () => {
    await act(async () => {
      renderWithProviders(<EhsAccidentPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('AC-2024-001')).toBeInTheDocument();
      expect(screen.getByText('车间设备故障事故')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    await act(async () => {
      renderWithProviders(<EhsAccidentPage />);
    });
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索事故编号、标题或地点/);
      fireEvent.change(searchInput, { target: { value: 'B区' } });
    });
  });

  it('should handle create accident', async () => {
    (ehsApi.createAccident as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    await act(async () => {
      renderWithProviders(<EhsAccidentPage />);
    });

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /事故上报/ });
      fireEvent.click(addButton);
    });

    await act(async () => {
      const titleInput = screen.getByLabelText(/事故标题/);
      fireEvent.change(titleInput, { target: { value: '测试事故' } });
    });

    await act(async () => {
      const saveButton = screen.getByRole('button', { name: /上报/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(ehsApi.createAccident).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (ehsApi.listAccidents as vi.Mock).mockRejectedValue(new Error('Network error'));
    await act(async () => {
      renderWithProviders(<EhsAccidentPage />);
    });

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
