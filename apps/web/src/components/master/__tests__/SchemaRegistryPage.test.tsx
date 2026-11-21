import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import SchemaRegistryPage from '../SchemaRegistryPage';

vi.mock('@/api/master/schemaRegistry', () => ({
  schemaRegistryApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'S1',
            name: 'material_master',
            title: '物料主数据 Schema',
            version: 2,
            is_active: true,
            updated_at: '2026-10-01T00:00:00Z',
            description: '物料',
            schema_json: { type: 'object' },
            table_name: 'dd_material_master',
          },
        ],
        total: 1,
      },
    }),
    create: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
    remove: vi.fn().mockResolvedValue({ success: true }),
    listData: vi.fn().mockResolvedValue({ success: true, data: { items: [], total: 0 } }),
    createData: vi.fn().mockResolvedValue({ success: true }),
    updateData: vi.fn().mockResolvedValue({ success: true }),
    removeData: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('SchemaRegistryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（Schema 注册表）', async () => {
    renderWithProviders(<SchemaRegistryPage />);
    expect(await screen.findByText('Schema 注册表')).toBeInTheDocument();
  });

  it('renders schema rows from mocked API data', async () => {
    renderWithProviders(<SchemaRegistryPage />);
    await waitFor(() => {
      expect(screen.getByText('material_master')).toBeInTheDocument();
      expect(screen.getByText('物料主数据 Schema')).toBeInTheDocument();
    });
  });
});
