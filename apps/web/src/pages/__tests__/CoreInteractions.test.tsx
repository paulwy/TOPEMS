import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkStationPage from '../mes/WorkStationPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

const mockAddNotification = vi.fn();

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
  {
    id: 'WS002',
    name: '装配工作站',
    code: 'WS-ASM-002',
    location: 'B区-2号车间',
    capacity: 8,
    supervisor: '李四',
    status: 'idle',
    created_at: '2024-01-12',
    updated_at: '2024-01-16',
  },
];

describe('WorkStationPage Interactions', () => {
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

  it('should render workstation data after loading', async () => {
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(screen.getByText('焊接工作站')).toBeInTheDocument();
      expect(screen.getByText('WS-WELD-001')).toBeInTheDocument();
      expect(screen.getByText('装配工作站')).toBeInTheDocument();
    });
  });

  it('should filter workstations by search term', async () => {
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(screen.getByText('焊接工作站')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/搜索/);
    fireEvent.change(searchInput, { target: { value: '焊接' } });

    await waitFor(() => {
      expect(mesApi.workstations.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: '焊接' })
      );
    });
  });

  it('should handle API error gracefully', async () => {
    (mesApi.workstations.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });

  it('should open create dialog when clicking add button', async () => {
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(screen.getByText('焊接工作站')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /新增工作站/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should create workstation successfully', async () => {
    (mesApi.workstations.create as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(screen.getByText('焊接工作站')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /新增工作站/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/工作站名称/i);
    fireEvent.change(nameInput, { target: { value: '测试工作站' } });

    const codeInput = screen.getByLabelText(/编码/i);
    fireEvent.change(codeInput, { target: { value: 'WS-TEST' } });

    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mesApi.workstations.create).toHaveBeenCalled();
    });
  });
});

describe('SrmOrderPage Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have srmApi purchase order methods defined', async () => {
    const { srmApi } = await import('@/api/srm');
    expect(srmApi.listPurchaseOrders).toBeDefined();
    expect(srmApi.createPurchaseOrder).toBeDefined();
    expect(srmApi.updatePurchaseOrder).toBeDefined();
    expect(srmApi.deletePurchaseOrder).toBeDefined();
  });
});

describe('NavigationRegistryV2 Interactions', () => {
  it('should register and emit events', async () => {
    const { NavigationRegistryV2 } = await import('@/lib/navigation/NavigationRegistryV2');
    const registry = NavigationRegistryV2.getInstance();
    const listener = vi.fn();

    registry.emitter.on('navigationUpdated', listener);
    registry.registerModule({
      code: 'test-interaction',
      name: 'Test',
      icon: 'Test',
      path: '/test-interaction',
      source: 'core',
      navItems: [],
    });

    expect(listener).toHaveBeenCalledWith('test-interaction');
    expect(registry.getModule('test-interaction')).toBeDefined();

    registry.unregisterModule('test-interaction');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(registry.getModule('test-interaction')).toBeUndefined();

    registry.emitter.off('navigationUpdated', listener);
  });

  it('should group modules by business domain correctly', async () => {
    const { NavigationRegistryV2 } = await import('@/lib/navigation/NavigationRegistryV2');
    const registry = NavigationRegistryV2.getInstance();

    registry.registerModule({
      code: 'test-finance-1',
      name: 'Finance 1',
      icon: 'Test',
      path: '/test-finance-1',
      source: 'core',
      suite: 'finance',
      navItems: [],
    });

    registry.registerModule({
      code: 'test-hr-1',
      name: 'HR 1',
      icon: 'Test',
      path: '/test-hr-1',
      source: 'core',
      suite: 'hr',
      navItems: [],
    });

    const grouped = registry.getNavItemsGroupedByBusinessDomain();
    expect(grouped['finance']).toBeDefined();
    expect(grouped['hr']).toBeDefined();

    registry.unregisterModule('test-finance-1');
    registry.unregisterModule('test-hr-1');
  });
});