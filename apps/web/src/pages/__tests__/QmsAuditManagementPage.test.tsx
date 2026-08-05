import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsAuditManagementPage from '../qms/QmsAuditManagementPage';
import { qmsApi } from '@/api/qms';

vi.mock('@/api/qms', () => ({
  qmsApi: {
    listAuditPlans: vi.fn(),
    createAuditPlan: vi.fn(),
    getStatistics: vi.fn(),
  },
}));

describe('QmsAuditManagementPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <QmsAuditManagementPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have audit API methods defined', () => {
    expect(qmsApi.listAuditPlans).toBeDefined();
    expect(qmsApi.createAuditPlan).toBeDefined();
    expect(qmsApi.getStatistics).toBeDefined();
  });
});
