import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsAuditManagementPage from '@/components/qms/QmsAuditManagementPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/qms', () => ({
  auditSchema: { name: 'audit' },
}));

vi.mock('@/api/qms', () => ({
  auditApi: { listAuditPlans: vi.fn() },
}));

vi.mock('@/api/client', () => ({
  default: { qms: { post: vi.fn(), put: vi.fn(), delete: vi.fn() } },
}));

vi.mock('@topems/tokens', () => ({
  designTokens: {},
}));

vi.mock('@mui/material', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  Box: ({ children }: any) => <div>{children}</div>,
  Typography: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  FileText: () => <div>icon</div>,
  CheckCircle: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('QmsAuditManagementPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<QmsAuditManagementPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('audit');
  });

  it('渲染 2 个面包屑', () => {
    render(<QmsAuditManagementPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
