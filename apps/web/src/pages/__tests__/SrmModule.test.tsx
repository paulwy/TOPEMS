import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BiddingPage from '../srm/BiddingPage';
import InquiryQuotationPage from '../srm/InquiryQuotationPage';
import SrmCategoryPage from '../srm/SrmCategoryPage';
import SrmContractPage from '../srm/SrmContractPage';
import SrmDashboardPage from '../srm/SrmDashboardPage';
import SrmEvaluationPage from '../srm/SrmEvaluationPage';
import SrmFinancePage from '../srm/SrmFinancePage';
import SrmOrderPage from '../srm/SrmOrderPage';
import SrmPerformancePage from '../srm/SrmPerformancePage';
import SrmScoringDimensionPage from '../srm/SrmScoringDimensionPage';
import SrmSupplierPage from '../srm/SrmSupplierPage';
import SrmSupplierProductPage from '../srm/SrmSupplierProductPage';
import SupplierPortalPage from '../srm/SupplierPortalPage';
import { useAppStore } from '@/store';

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['srm:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['srm:read'] },
          theme: 'light',
        }
  ),
}));

describe('SrmModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SrmDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SrmDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('SrmSupplierPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SrmSupplierPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('SrmSupplierProductPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SrmSupplierProductPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('SrmCategoryPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SrmCategoryPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('SrmContractPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SrmContractPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('SrmOrderPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SrmOrderPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('SrmEvaluationPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SrmEvaluationPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('SrmPerformancePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SrmPerformancePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('SrmScoringDimensionPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SrmScoringDimensionPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('SrmFinancePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SrmFinancePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('InquiryQuotationPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <InquiryQuotationPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('BiddingPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <BiddingPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('SupplierPortalPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SupplierPortalPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });
});
