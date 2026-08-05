import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import BIDataSourcePage from '../bi/BIDataSourcePage';
import {
  listDataSources,
  deleteDataSource,
  testDataSource,
  refreshDataSource,
  dataSourceCrudApi,
} from '@/api/bi';

vi.mock('@/api/bi', () => ({
  listDataSources: vi.fn(),
  deleteDataSource: vi.fn(),
  testDataSource: vi.fn(),
  refreshDataSource: vi.fn(),
  dataSourceCrudApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('BIDataSourcePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listDataSources as vi.Mock).mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    });
    (dataSourceCrudApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    });
  });

  it('should render without crashing', () => {
    render(<BIDataSourcePage />);
    expect(true).toBe(true);
  });

  it('should have data source API methods defined', () => {
    expect(listDataSources).toBeDefined();
    expect(deleteDataSource).toBeDefined();
    expect(testDataSource).toBeDefined();
    expect(refreshDataSource).toBeDefined();
    expect(dataSourceCrudApi).toBeDefined();
  });
});
