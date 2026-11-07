import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsStandardListPage from '@/pages/qms/QmsStandardListPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/qms', () => ({
  qualityStandardSchema: { name: 'qualityStandard' },
}));

vi.mock('@/api/qms', () => ({
  qmsApi: {
    listStandards: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createStandard: vi.fn(),
    updateStandard: vi.fn(),
    deleteStandard: vi.fn(),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/module-configs/qms/config', () => ({
  QMS_PATHS: { standardDetail: '/qms/standards' },
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key, exists: () => true },
}));

describe('QmsStandardListPage', () => {
  it('渲染 CrudPage 并传入 qualityStandard schema', () => {
    render(<QmsStandardListPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'qualityStandard'
    );
  });

  it('渲染 3 个面包屑', () => {
    render(<QmsStandardListPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
