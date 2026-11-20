import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import AnnouncementPage from '@/pages/erp/AnnouncementPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schema-dsl/crudPageAdapter', () => ({
  createCrudPageAdapter: vi.fn(() => ({})),
}));

vi.mock('@/schemas/erp/announcement', () => ({
  announcementSchema: { name: 'announcement' },
}));

vi.mock('@/api/erp', () => ({
  announcementApi: { list: vi.fn() },
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: { ERP: { ANNOUNCEMENTS: 'announcements' } },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: { items: [] } })),
}));

vi.mock('@mui/material', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
  Typography: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('lucide-react', () => ({
  Bell: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('AnnouncementPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<AnnouncementPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('announcement');
  });

  it('渲染 3 个面包屑', () => {
    render(<AnnouncementPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
