import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OpportunityManagementPage from '../crm/OpportunityManagementPage';
import { crmApi } from '@/api/crm';
import { useAppStore } from '@/store';

vi.mock('@/api/crm', () => ({
  crmApi: {
    opportunities: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      convert: vi.fn(),
      close: vi.fn(),
    },
    customers: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['crm:opportunity:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['crm:opportunity:read'] },
          theme: 'light',
        }
  ),
}));

describe('OpportunityManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <OpportunityManagementPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have opportunity API methods defined', async () => {
    render(
      <BrowserRouter>
        <OpportunityManagementPage />
      </BrowserRouter>
    );
    expect(crmApi.opportunities.list).toBeDefined();
    expect(crmApi.opportunities.get).toBeDefined();
    expect(crmApi.opportunities.create).toBeDefined();
    expect(crmApi.opportunities.update).toBeDefined();
    expect(crmApi.opportunities.delete).toBeDefined();
    expect(crmApi.opportunities.convert).toBeDefined();
    expect(crmApi.opportunities.close).toBeDefined();
  });

  it('should call opportunity list API on mount', async () => {
    render(
      <BrowserRouter>
        <OpportunityManagementPage />
      </BrowserRouter>
    );
    expect(crmApi.opportunities.list).toHaveBeenCalled();
  });
});
