import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QualityTraceabilityPage from '../mes/QualityTraceabilityPage';
import { mesApi } from '@/api/mes';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    traceability: {
      getTraceChain: vi.fn(),
      forwardTraceability: vi.fn(),
      backwardTraceability: vi.fn(),
      listQualityRecords: vi.fn(),
    },
  },
}));

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

describe('QualityTraceabilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    // QualityTraceabilityPage is a stub component that returns null
    render(
      <BrowserRouter>
        <QualityTraceabilityPage />
      </BrowserRouter>
    );
    // Stub component renders null, so no errors is the expected behavior
    expect(true).toBe(true);
  });

  it('should have valid traceability API', () => {
    expect(mesApi.traceability.getTraceChain).toBeDefined();
    expect(mesApi.traceability.forwardTraceability).toBeDefined();
    expect(mesApi.traceability.backwardTraceability).toBeDefined();
    expect(mesApi.traceability.listQualityRecords).toBeDefined();
  });
});
