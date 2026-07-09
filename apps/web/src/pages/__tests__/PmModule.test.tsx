import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from '../pm/DashboardPage';
import PmContractCreatePage from '../pm/PmContractCreatePage';
import PmContractDetailPage from '../pm/PmContractDetailPage';
import PmContractListPage from '../pm/PmContractListPage';
import PmProjectCreatePage from '../pm/PmProjectCreatePage';
import PmProjectDetailPage from '../pm/PmProjectDetailPage';
import PmProjectListPage from '../pm/PmProjectListPage';
import PmReportPage from '../pm/PmReportPage';
import PmResourcePage from '../pm/PmResourcePage';
import PmTemplatePage from '../pm/PmTemplatePage';
import { useAppStore } from '@/store';

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['pm:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['pm:read'] },
          theme: 'light',
        }
  ),
}));

describe('PmModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('PmContractCreatePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PmContractCreatePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('PmContractDetailPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PmContractDetailPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('PmContractListPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PmContractListPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('PmProjectCreatePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PmProjectCreatePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('PmProjectDetailPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PmProjectDetailPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('PmProjectListPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PmProjectListPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('PmReportPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PmReportPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('PmResourcePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PmResourcePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('PmTemplatePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PmTemplatePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });
});
