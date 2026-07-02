import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MaterialBOMPage from '../mes/MaterialBOMPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    boms: {
      list: vi.fn().mockResolvedValue({ success: true, data: { boms: [], total: 0 } }),
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['mes:bom:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['mes:bom:read'] },
          theme: 'light',
        }
  ),
}));

describe('MaterialBOMPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <MaterialBOMPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have BOM API methods defined', () => {
    render(
      <BrowserRouter>
        <MaterialBOMPage />
      </BrowserRouter>
    );
    expect(mesApi.boms.list).toBeDefined();
  });
});
