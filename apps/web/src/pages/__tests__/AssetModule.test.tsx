import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AssetManagementPage from '../asset/AssetManagementPage';
import EquipmentInspectionPage from '../asset/EquipmentInspectionPage';
import EquipmentMaintenancePage from '../asset/EquipmentMaintenancePage';
import EquipmentManagementPage from '../asset/EquipmentManagementPage';
import OfficeSuppliesManagementPage from '../asset/OfficeSuppliesManagementPage';
import VehicleManagementPage from '../asset/VehicleManagementPage';
import VoucherTemplatePage from '../asset/VoucherTemplatePage';
import { useNotificationStore, useAuthStore } from '@/store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('AssetModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AssetManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AssetManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('EquipmentInspectionPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <EquipmentInspectionPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('EquipmentMaintenancePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <EquipmentMaintenancePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('EquipmentManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <EquipmentManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('OfficeSuppliesManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <OfficeSuppliesManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('VehicleManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <VehicleManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('VoucherTemplatePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <VoucherTemplatePage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });
});
