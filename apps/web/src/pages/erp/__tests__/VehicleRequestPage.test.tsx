import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import VehicleRequestPage from '@/pages/erp/VehicleRequestPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schema/crudPageAdapter', () => ({
  createCrudPageAdapter: vi.fn(() => ({})),
}));

vi.mock('@/schemas/erp/vehicleRequest', () => ({
  vehicleRequestSchema: { name: 'vehicleRequest' },
}));

vi.mock('@/api/erp', () => ({
  vehicleRequestApi: {},
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('VehicleRequestPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<VehicleRequestPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'vehicleRequest'
    );
  });

  it('渲染 3 个面包屑', () => {
    render(<VehicleRequestPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
