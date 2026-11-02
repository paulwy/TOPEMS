import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import IntegrationConnectionsPage from '../IntegrationConnectionsPage';

// CrudPage 包装页：页面内 useQuery 调 integrationApi.connections.listConnections（try/catch），
// 必须 mock @/api/integration 避免真实 axios。apiAdapter.list 为页面内硬编码空数组。
vi.mock('@/api/integration', () => ({
  integrationApi: {
    connections: {
      listConnections: vi.fn().mockResolvedValue({ success: true, data: [] }),
    },
  },
}));

describe('IntegrationConnectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders schema title heading（连接管理）', () => {
    renderWithProviders(<IntegrationConnectionsPage />);
    expect(
      screen.getByRole('heading', { name: '连接管理' })
    ).toBeInTheDocument();
  });
});
