import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import MeetingRoomPage from '@/pages/erp/MeetingRoomPage';

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

vi.mock('@/schemas/erp/meetingRoom', () => ({
  meetingRoomSchema: { name: 'meetingRoom' },
}));

vi.mock('@/api/erp', () => ({
  meetingRoomApi: {},
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('MeetingRoomPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<MeetingRoomPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('meetingRoom');
  });

  it('渲染 3 个面包屑', () => {
    render(<MeetingRoomPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
