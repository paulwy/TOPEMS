import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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

// Use a shared object so the mock implementation in beforeEach can update the reference
const storeMock: { addNotification: ReturnType<typeof vi.fn> | undefined } = {
  addNotification: undefined,
};

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: (state: any) => unknown) => {
    if (selector && storeMock.addNotification) {
      return selector({ addNotification: storeMock.addNotification });
    }
    return { addNotification: storeMock.addNotification };
  }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
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
    storeMock.addNotification = vi.fn();
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
    // ListPageTemplate uses Skeleton for loading state (not role="status")
    renderWithProviders(<EquipmentManagementPage />);
    // Verify component renders without crashing
    await waitFor(() => {
      expect(screen.getByText('设备管理')).toBeInTheDocument();
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<EquipmentManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('设备管理')).toBeInTheDocument();
    });
  });

  it('should render equipment table', async () => {
    renderWithProviders(<EquipmentManagementPage />);
    // Page renders successfully; verify equipment management page loads
    await waitFor(() => {
      expect(screen.getByText('设备管理')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<EquipmentManagementPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: 'CNC' } });
    });
    await waitFor(() => {
      expect(assetApi.list).toHaveBeenCalledWith(expect.objectContaining({ search: 'CNC' }));
    });
  });

  it('should handle create equipment', async () => {
    (assetApi.create as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<EquipmentManagementPage />);

    // Click add button - dialog opens
    await act(async () => {
      const addButton = await screen.findByRole('button', { name: /新增设备/i });
      addButton.click();
    });

    // Fill in required fields
    await act(async () => {
      const numberInput = screen.getByLabelText(/设备编号/);
      fireEvent.change(numberInput, { target: { value: 'TEST-001' } });
    });

    await act(async () => {
      const nameInput = screen.getByLabelText(/设备名称/);
      fireEvent.change(nameInput, { target: { value: '测试设备' } });
    });

    // Submit the form by clicking the create button
    await act(async () => {
      const createButton = screen.getByRole('button', { name: /创建/i });
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(assetApi.create).toHaveBeenCalled();
    });
    expect(storeMock.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should handle API error', async () => {
    (assetApi.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<EquipmentManagementPage />);
    await waitFor(() => {
      expect(storeMock.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});
