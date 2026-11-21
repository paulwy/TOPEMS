import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsEightDPage from '@/components/qms/QmsEightDPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/components/templates/TreeBuilder', () => ({
  TreeBuilder: () => <div data-testid='tree-builder' />,
}));

vi.mock('@/schemas/qms/eightD', () => ({
  eightDSchema: { name: 'eightD' },
  injectRootCauseRenderer: (schema: { name: string }) => schema,
}));

vi.mock('@/api/qms', () => ({
  eightDApi: {
    listEightDReports: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createEightDReport: vi.fn(),
    updateEightDReport: vi.fn(),
    deleteEightDReport: vi.fn(),
    closeEightDReport: vi.fn(),
  },
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: { QMS: { EIGHT_D: 'qms-eight-d' } },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key, exists: () => true },
}));

describe('QmsEightDPage', () => {
  it('渲染 CrudPage 并传入 eightD schema', () => {
    render(<QmsEightDPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('eightD');
  });

  it('渲染 2 个面包屑', () => {
    render(<QmsEightDPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
