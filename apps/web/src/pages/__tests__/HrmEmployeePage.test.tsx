import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmEmployeePage from '../hrm/HrmEmployeePage';
import { employeeApi, departmentApi, positionApi, companyApi } from '@/api/hrm';

vi.mock('@/api/hrm', () => ({
  hrmApi: {
    employees: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
    },
  },
  employeeApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  },
  departmentApi: { list: vi.fn(), get: vi.fn() },
  positionApi: { list: vi.fn(), get: vi.fn() },
  companyApi: { list: vi.fn(), get: vi.fn() },
}));

describe('HrmEmployeePage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <HrmEmployeePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have employee API methods defined', () => {
    expect(employeeApi.list).toBeDefined();
    expect(employeeApi.get).toBeDefined();
    expect(employeeApi.create).toBeDefined();
    expect(employeeApi.update).toBeDefined();
    expect(employeeApi.delete).toBeDefined();
    expect(employeeApi.enable).toBeDefined();
    expect(employeeApi.disable).toBeDefined();
  });

  it('should have department/position/company APIs', () => {
    expect(departmentApi.list).toBeDefined();
    expect(positionApi.list).toBeDefined();
    expect(companyApi.list).toBeDefined();
  });
});
