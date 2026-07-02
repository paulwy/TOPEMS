import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LimsProcessPage from '../lims/LimsProcessPage';
import { limsApi } from '@/api/lims';
import { useAppStore } from '@/store';

vi.mock('@/api/lims', () => ({
  limsApi: {
    processes: {
      list: vi.fn().mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
    },
    getStatistics: vi.fn().mockResolvedValue({ success: true, data: {} }),
    createProcess: vi.fn(),
    getProcess: vi.fn(),
    updateProcess: vi.fn(),
    deleteProcess: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['lims:process:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['lims:process:read'] },
          theme: 'light',
        }
  ),
}));

describe('LimsProcessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <LimsProcessPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have process API methods defined', () => {
    expect(limsApi.processes.list).toBeDefined();
    expect(limsApi.createProcess).toBeDefined();
    expect(limsApi.getProcess).toBeDefined();
    expect(limsApi.updateProcess).toBeDefined();
  });
});
