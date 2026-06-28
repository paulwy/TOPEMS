import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkStationPage from '../mes/WorkStationPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    workstations: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockWorkStations = [
  {
    id: 'WS001',
    name: '焊接工作站',
    code: 'WS-WELD-001',
    location: 'A区-1号车间',
    capacity: 5,
    supervisor: '张三',
    status: 'active',
    created_at: '2024-01-10',
    updated_at: '2024-01-15',
  },
];

describe('WorkStationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue({
      addNotification: mockAddNotification,
    });
    (mesApi.workstations.list as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        workstations: mockWorkStations,
        total: mockWorkStations.length,
        page: 0,
        pagesize: 10,
      },
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<WorkStationPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(screen.getByText('工作站管理')).toBeInTheDocument();
    });
  });

  it('should render workstation table', async () => {
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(screen.getByText('焊接工作站')).toBeInTheDocument();
      expect(screen.getByText('WS-WELD-001')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '焊接' } });
    });
    await waitFor(() => {
      expect(mesApi.workstations.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: '焊接' })
      );
    });
  });

  it('should handle create workstation', async () => {
    (mesApi.workstations.create as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增工作站/i });
      fireEvent.click(addButton);
    });

    const nameInput = await screen.findByLabelText(/工作站名称/i);
    fireEvent.change(nameInput, { target: { value: '测试工作站' } });

    const codeInput = screen.getByLabelText(/编码/i);
    fireEvent.change(codeInput, { target: { value: 'WS-TEST' } });

    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mesApi.workstations.create).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (mesApi.workstations.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
