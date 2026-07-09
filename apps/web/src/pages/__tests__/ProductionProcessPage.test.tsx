import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductionProcessPage from '../mes/ProductionProcessPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    processes: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { processes: [], total: 0, page: 0, pagesize: 10 },
      }),
      create: vi.fn(),
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
          user: { permissions: ['mes:process:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['mes:process:read'] },
          theme: 'light',
        }
  ),
}));

describe('ProductionProcessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductionProcessPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have process API methods defined', () => {
    render(
      <BrowserRouter>
        <ProductionProcessPage />
      </BrowserRouter>
    );
    expect(mesApi.processes.list).toBeDefined();
    expect(mesApi.processes.create).toBeDefined();
    expect(mesApi.processes.update).toBeDefined();
  });

  it('should call processes list API on mount', () => {
    render(
      <BrowserRouter>
        <ProductionProcessPage />
      </BrowserRouter>
    );
    expect(mesApi.processes.list).toHaveBeenCalled();
  });
});
