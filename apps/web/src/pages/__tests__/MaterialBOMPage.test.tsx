import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MaterialBOMPage from '../mes/MaterialBOMPage';
import { mesApi } from '@/api/mes';
import { useNotificationStore, useAuthStore } from '@/store';

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
