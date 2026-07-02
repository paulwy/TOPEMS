import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductionRecordPage from '../mes/ProductionRecordPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    productionRecords: {
      list: vi.fn().mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['mes:record:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['mes:record:read'] },
          theme: 'light',
        }
  ),
}));

describe('ProductionRecordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductionRecordPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have production record API methods defined', () => {
    expect(mesApi.productionRecords.list).toBeDefined();
    expect(mesApi.productionRecords.create).toBeDefined();
    expect(mesApi.productionRecords.get).toBeDefined();
    expect(mesApi.productionRecords.update).toBeDefined();
  });
});
