import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PurchaseOrderPage from '../erp/PurchaseOrderPage';
import ProductionOrderManagementPage from '../mes/ProductionOrderManagementPage';
import FinancePaymentPage from '../finance/FinancePaymentPage';
import QualityInspectionPage from '../mes/QualityInspectionPage';

describe('BatchOperations', () => {
  it('should render PurchaseOrderPage without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PurchaseOrderPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should render ProductionOrderManagementPage without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductionOrderManagementPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should render FinancePaymentPage without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <FinancePaymentPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should render QualityInspectionPage without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <QualityInspectionPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});
