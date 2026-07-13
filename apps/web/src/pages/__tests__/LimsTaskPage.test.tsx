import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LimsTaskPage from '../lims/LimsTaskPage';
import { limsApi } from '@/api/lims';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/lims', () => ({
  limsApi: {
    listTasks: vi
      .fn()
      .mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
    createTask: vi.fn(),
    getTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    completeStep: vi.fn(),
    submitResult: vi.fn(),
    listTasksBySample: vi.fn(),
    listSamples: vi
      .fn()
      .mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
    listProcesses: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getProcess: vi.fn(),
    listRecords: vi.fn(),
    getRecord: vi.fn(),
    createRecord: vi.fn(),
    deleteRecord: vi.fn(),
    listRecordsByTask: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getStatistics: vi.fn().mockResolvedValue({ success: true, data: {} }),
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

describe('LimsTaskPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <LimsTaskPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have task API methods defined', () => {
    expect(limsApi.listTasks).toBeDefined();
    expect(limsApi.createTask).toBeDefined();
    expect(limsApi.getTask).toBeDefined();
    expect(limsApi.updateTask).toBeDefined();
  });
});
