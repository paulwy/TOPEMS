import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsQualityControlPage from '../qms/QmsQualityControlPage';
import { qmsApi } from '@/api/qms';
import { useAppStore } from '@/store';

vi.mock('@/api/qms', () => ({
  qmsApi: {
    qualityIssues: {
      list: vi.fn().mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    inspections: {
      list: vi.fn().mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    nonconformances: {
      list: vi.fn().mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
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
          user: { permissions: ['qms:quality:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['qms:quality:read'] },
          theme: 'light',
        }
  ),
}));

describe('QmsQualityControlPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <QmsQualityControlPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have QMS API methods defined', () => {
    render(
      <BrowserRouter>
        <QmsQualityControlPage />
      </BrowserRouter>
    );
    expect(qmsApi.qualityIssues.list).toBeDefined();
    expect(qmsApi.inspections.list).toBeDefined();
  });
});
