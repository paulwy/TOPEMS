import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LimsInstrumentPage from '../lims/LimsInstrumentPage';
import { limsApi } from '@/api/lims';
import { useAppStore } from '@/store';

vi.mock('@/api/lims');
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

const mockInstruments = [
  {
    id: 'INS001',
    name: '气相色谱仪',
    code: 'INS-2024-001',
    type: 'chromatograph',
    model: 'GC-2010',
    status: 'normal',
    calibration_date: '2024-01-01',
  },
];

describe('LimsInstrumentPage', () => {
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
    (limsApi.listInstruments as vi.Mock).mockResolvedValue({
      success: true,
      data: mockInstruments,
    });
  });

  it('should render loading state initially', async () => {
    await act(async () => {
      renderWithProviders(<LimsInstrumentPage />);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    await act(async () => {
      renderWithProviders(<LimsInstrumentPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('仪器设备')).toBeInTheDocument();
    });
  });

  it('should render instrument table', async () => {
    await act(async () => {
      renderWithProviders(<LimsInstrumentPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('INS-2024-001')).toBeInTheDocument();
      expect(screen.getByText('气相色谱仪')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    await act(async () => {
      renderWithProviders(<LimsInstrumentPage />);
    });
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '气相' } });
    });
  });

  it('should handle create instrument', async () => {
    (limsApi.createInstrument as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    await act(async () => {
      renderWithProviders(<LimsInstrumentPage />);
    });

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增/i });
      fireEvent.click(addButton);
    });

    await act(async () => {
      const nameInput = screen.getByLabelText(/仪器名称/);
      fireEvent.change(nameInput, { target: { value: '测试仪器' } });
    });

    await act(async () => {
      const codeInput = screen.getByLabelText(/仪器编号/);
      fireEvent.change(codeInput, { target: { value: 'TEST-001' } });
    });

    await act(async () => {
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(limsApi.createInstrument).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (limsApi.listInstruments as vi.Mock).mockRejectedValue(new Error('Network error'));
    await act(async () => {
      renderWithProviders(<LimsInstrumentPage />);
    });

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalled();
    });
  });
});
