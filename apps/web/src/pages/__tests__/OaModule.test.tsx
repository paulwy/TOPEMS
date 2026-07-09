import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AddressbookPage from '../oa/AddressbookPage';
import AdministrationDashboardPage from '../oa/AdministrationDashboardPage';
import AnnouncementManagementPage from '../oa/AnnouncementManagementPage';
import BudgetManagementPage from '../oa/BudgetManagementPage';
import ExpenseClaimPage from '../oa/ExpenseClaimPage';
import MeetingRoomManagementPage from '../oa/MeetingRoomManagementPage';
import OfficeSuppliesPage from '../oa/OfficeSuppliesPage';
import VehicleManagementPage from '../oa/VehicleManagementPage';
import { useAppStore } from '@/store';

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['oa:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['oa:read'] },
          theme: 'light',
        }
  ),
}));

describe('OaModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AddressbookPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AddressbookPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('AdministrationDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AdministrationDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('AnnouncementManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AnnouncementManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('BudgetManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <BudgetManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('ExpenseClaimPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <ExpenseClaimPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('MeetingRoomManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MeetingRoomManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('OfficeSuppliesPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <OfficeSuppliesPage />
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
});
