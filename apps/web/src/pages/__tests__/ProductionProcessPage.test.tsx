import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductionProcessPage from '../mes/ProductionProcessPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    processes: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

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

const mockProcesses = [
  {
    id: 'PROC001',
    name: '焊接工序',
    code: 'PROC-WELD-001',
    status: 'active',
    description: '产品焊接工序',
    sequence: 1,
    created_at: '2024-01-10',
    updated_at: '2024-01-10',
  },
  {
    id: 'PROC002',
    name: '组装工序',
    code: 'PROC-ASSM-002',
    status: 'active',
    description: '产品组装工序',
    sequence: 2,
    created_at: '2024-01-11',
    updated_at: '2024-01-11',
  },
];

describe('ProductionProcessPage', () => {
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
    (mesApi.processes.list as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        processes: mockProcesses,
        total: mockProcesses.length,
        page: 0,
        pagesize: 10,
      },
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<ProductionProcessPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<ProductionProcessPage />);
    await waitFor(() => {
      expect(screen.getByText('生产工序管理')).toBeInTheDocument();
    });
  });

  it('should render process table', async () => {
    renderWithProviders(<ProductionProcessPage />);
    await waitFor(() => {
      expect(screen.getByText('焊接工序')).toBeInTheDocument();
      expect(screen.getByText('PROC-WELD-001')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<ProductionProcessPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '焊接' } });
    });
    await waitFor(() => {
      expect(mesApi.processes.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: '焊接' })
      );
    });
  });

  it('should handle create process', async () => {
    (mesApi.processes.create as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<ProductionProcessPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增工序/i });
      fireEvent.click(addButton);
    });

    const nameInput = await screen.findByLabelText(/工序名称/i);
    fireEvent.change(nameInput, { target: { value: '测试工序' } });

    const sequenceInput = screen.getByLabelText(/顺序/i);
    fireEvent.change(sequenceInput, { target: { value: '1' } });

    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mesApi.processes.create).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (mesApi.processes.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<ProductionProcessPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
