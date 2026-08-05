import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsInspectionPage from '../qms/QmsInspectionPage';
import { qmsApi } from '@/api/qms';

vi.mock('@/api/qms', () => ({
  qmsApi: {
    listChecks: vi.fn(),
    getCheck: vi.fn(),
    createCheck: vi.fn(),
    updateCheck: vi.fn(),
    deleteCheck: vi.fn(),
    assignCheck: vi.fn(),
    submitCheckResult: vi.fn(),
    auditCheck: vi.fn(),
    reworkCheck: vi.fn(),
    getCheckResults: vi.fn(),
    getCheckAudits: vi.fn(),
  },
}));

describe('QmsInspectionPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <QmsInspectionPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have inspection API methods defined', () => {
    expect(qmsApi.listChecks).toBeDefined();
    expect(qmsApi.createCheck).toBeDefined();
    expect(qmsApi.updateCheck).toBeDefined();
    expect(qmsApi.deleteCheck).toBeDefined();
  });
});
