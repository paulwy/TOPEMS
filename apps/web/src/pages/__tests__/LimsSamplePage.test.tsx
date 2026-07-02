import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LimsSamplePage from '../lims/LimsSamplePage';
import { limsApi } from '@/api/lims';
import { useAppStore } from '@/store';

vi.mock('@/api/lims', () => ({
  limsApi: {
    listSamples: vi.fn(),
    getSample: vi.fn(),
    createSample: vi.fn(),
    updateSample: vi.fn(),
    deleteSample: vi.fn(),
    batchCreateSamples: vi.fn(),
    batchDeleteSamples: vi.fn(),
    exportSamples: vi.fn(),
    importSamples: vi.fn(),
  },
}));
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

const mockSamples = [
  {
    id: 'SMP001',
    sample_no: 'SMP-2024-001',
    name: '土壤样本A',
    description: '重金属含量检测',
    sample_type: 'soil',
    status: '待接收',
    location: '冷藏柜A-01',
    received_date: '2024-01-15',
  },
];

describe('LimsSamplePage', () => {
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
    (limsApi.listSamples as vi.Mock).mockResolvedValue({
      success: true,
      data: mockSamples,
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<LimsSamplePage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '样品管理' })).toBeInTheDocument();
    });
  });

  it('should render sample table', async () => {
    renderWithProviders(<LimsSamplePage />);
    await waitFor(() => {
      expect(screen.getByText('SMP-2024-001')).toBeInTheDocument();
      expect(screen.getByText('土壤样本A')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<LimsSamplePage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜索/)).toBeInTheDocument();
    });
  });

  it('should render statistics cards', async () => {
    renderWithProviders(<LimsSamplePage />);
    await waitFor(() => {
      expect(screen.getByText('样品总数')).toBeInTheDocument();
    });
  });

  it('should handle create sample', async () => {
    (limsApi.createSample as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<LimsSamplePage />);

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /样品登记/ });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '样品登记' })).toBeInTheDocument();
    });

    await act(async () => {
      const nameInput = screen.getByLabelText(/样品名称/);
      fireEvent.change(nameInput, { target: { value: '测试样品' } });
    });

    await act(async () => {
      const saveButton = screen.getByRole('button', { name: '保存' });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(limsApi.createSample).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (limsApi.listSamples as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<LimsSamplePage />);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
