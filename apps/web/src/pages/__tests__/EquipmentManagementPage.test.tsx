import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EquipmentManagementPage from '../fixed/EquipmentManagementPage';
import { assetApi } from '@/api/erp';
import { employeeApi } from '@/api/hrm';
import { useAppStore } from '@/store';

vi.mock('@/api/erp', () => ({
  assetApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/api/hrm', () => ({
  employeeApi: {
    list: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

const mockAssets = [
  {
    id: 'EQ001',
    name: 'CNC加工中心',
    asset_number: 'EQ-CNC-001',
    model: 'VMC-850',
    status: 'in_use',
    location: 'A区-1号车间',
    purchase_date: '2023-01-15',
    purchase_amount: 500000,
    created_at: '2023-01-15',
    updated_at: '2023-01-15',
  },
];

const mockEmployees = [
  {
    id: 'EMP001',
    name: '张三',
    employee_number: 'EMP-001',
  },
];

describe('EquipmentManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue({
      addNotification: mockAddNotification,
    });
    (assetApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        items: mockAssets,
        total: mockAssets.length,
        page: 1,
        page_size: 20,
      },
    });
    (employeeApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        items: mockEmployees,
        total: mockEmployees.length,
      },
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<EquipmentManagementPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<EquipmentManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('设备管理')).toBeInTheDocument();
    });
  });

  it('should render equipment table', async () => {
    renderWithProviders(<EquipmentManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('CNC加工中心')).toBeInTheDocument();
      expect(screen.getByText('EQ-CNC-001')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<EquipmentManagementPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: 'CNC' } });
    });
    await waitFor(() => {
      expect(assetApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'CNC' })
      );
    });
  });

  it('should handle create equipment', async () => {
    (assetApi.create as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<EquipmentManagementPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增/i });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(assetApi.create).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should handle API error', async () => {
    (assetApi.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<EquipmentManagementPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});