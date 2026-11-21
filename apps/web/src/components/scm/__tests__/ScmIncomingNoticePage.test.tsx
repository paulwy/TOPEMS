import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ScmIncomingNoticePage from '@/components/scm/ScmIncomingNoticePage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/scm', () => ({
  incomingNoticeSchema: { name: 'incomingNotice' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: {
    incomingInspections: {
      listNotices: vi.fn(),
      createNotice: vi.fn(),
      updateNotice: vi.fn(),
      deleteNotice: vi.fn(),
    },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('ScmIncomingNoticePage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<ScmIncomingNoticePage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'incomingNotice'
    );
  });

  it('渲染 2 个面包屑', () => {
    render(<ScmIncomingNoticePage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
