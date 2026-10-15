/**
 * 核心页面数据 mock 深测（页面渲染数据模拟 · 数据驱动路径）
 *
 * 目标：对核心业务列表页（qms/crm/erp/wms/hrm），mock 其 API 模块返回
 * 样本数据后实际渲染，捕获数据驱动代码路径（列渲染/字段访问/嵌套 map）
 * 的运行时错误——即"带数据渲染不崩溃"。
 *
 * 样本字段对齐各页面 types（含编号/名称/状态/日期等列渲染核心字段），
 * 非必填字段省略（页面应按可选字段容错；若因此崩溃即为 bug）。
 */
import React, { Component, Suspense, type ReactNode } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const samples = {
  qms: [
    {
      id: 'q1',
      check_no: 'QC-20261015-001',
      inspection_no: 'QC-20261015-001',
      inspection_type: 'IQC',
      product_name: '精密轴套',
      quantity: 120,
      qualified_quantity: 118,
      unqualified_quantity: 2,
      qualification_rate: 98.33,
      status: 'approved',
      inspector: '张三',
      inspected_at: '2026-10-15T10:00:00Z',
      created_at: '2026-10-15T09:00:00Z',
    },
  ],
  crm: [
    {
      id: 'c1',
      name: '北方精密制造有限公司',
      name_en: 'North Precision Co., Ltd.',
      code: 'CUST-001',
      industry: '制造业',
      website: 'https://example.com',
      email: 'contact@example.com',
      phone: '0311-88888888',
      address: '石家庄高新区',
      city: '石家庄',
      province: '河北',
      country: '中国',
      status: 'active',
      customer_type: 'enterprise',
      rating: 'A',
      revenue: 1500000,
    },
  ],
  erp: [
    {
      id: 'so1',
      order_no: 'SO-20261015-001',
      customer_name: '北方精密制造有限公司',
      status: 'confirmed',
      total_amount: 268000,
      currency: 'CNY',
      order_date: '2026-10-15T08:00:00Z',
      created_at: '2026-10-15T08:00:00Z',
    },
  ],
  wms: [
    {
      id: 'io1',
      order_no: 'IN-20261015-001',
      status: 'received',
      warehouse: '主仓',
      supplier_name: '华北钢材供应商',
      total_quantity: 500,
      received_at: '2026-10-15T11:00:00Z',
      created_at: '2026-10-15T09:30:00Z',
    },
  ],
  hrm: [
    {
      id: 'e1',
      name: '李四',
      employee_no: 'EMP-001',
      department: '研发部',
      position: '工程师',
      status: 'active',
      hire_date: '2024-03-01',
      created_at: '2024-03-01T00:00:00Z',
    },
  ],
};

vi.mock('@/api/qms/inspection', () => ({
  inspectionApi: {
    listChecks: vi.fn(async () => samples.qms),
    createCheck: vi.fn(async () => ({})),
    updateCheck: vi.fn(async () => ({})),
  },
}));
vi.mock('@/api/crm/customer', () => ({
  customerApi: {
    list: vi.fn(async () => samples.crm),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  },
}));
vi.mock('@/api/erp/core/salesOrder', () => ({
  salesOrderApi: {
    list: vi.fn(async () => samples.erp),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  },
}));
vi.mock('@/api/wms/inbound', () => ({
  inboundOrderApi: {
    list: vi.fn(async () => samples.wms),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
  },
}));
vi.mock('@/api/hrm/employee', () => ({
  employeeApi: {
    list: vi.fn(async () => samples.hrm),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  },
}));

// 页面 import 必须在 vi.mock 之后（vitest hoist 保证）
import QmsPage from '@/pages/qms/QmsInspectionRedesignPage';
import CrmPage from '@/pages/crm/CrmCustomerRedesignPage';
import ErpPage from '@/pages/erp/ErpSalesOrderRedesignPage';
import WmsPage from '@/pages/wms/WmsInboundOrderPage';
import HrmPage from '@/pages/hrm/HrmEmployeeRedesignPage';

class CaptureBoundary extends Component<{ name: string; errors: string[]; children?: ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    this.props.errors.push(`[${this.props.name}] ${error instanceof Error ? error.message : String(error)}`);
  }
  render() {
    if (this.state.hasError) return <div data-testid="page-crash" />;
    return this.props.children;
  }
}

function renderWithProviders(ui: ReactNode, errors: string[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider theme={createTheme()}>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <Suspense fallback={<div data-testid="loading" />}>
            <CaptureBoundary name="core-page" errors={errors}>
              {ui}
            </CaptureBoundary>
          </Suspense>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

const pages: Array<[string, React.ComponentType, string]> = [
  ['QMS 检验列表', QmsPage, 'QC-20261015-001'],
  ['CRM 客户列表', CrmPage, 'CUST-001'],
  ['ERP 销售订单列表', ErpPage, 'SO-20261015-001'],
  ['WMS 入库单列表', WmsPage, 'IN-20261015-001'],
  ['HRM 员工列表', HrmPage, 'EMP-001'],
];

describe('核心页面数据 mock 深测（带样本数据渲染）', () => {
  afterEach(() => cleanup());

  it.each(pages)('%s 带数据渲染不崩溃且渲染样本数据', async (_name, Page, sampleKey) => {
    const captured: string[] = [];
    let thrown: Error | null = null;
    try {
      await act(async () => {
        renderWithProviders(<Page />, captured);
        // 等 query mock resolve + 首帧渲染
        await new Promise((r) => setTimeout(r, 150));
      });
      // 真实性断言：页面确实渲染了样本数据（而非停留在 loading/fallback）
      await act(async () => {
        await new Promise((r) => setTimeout(r, 300));
      });
    } catch (e) {
      thrown = e instanceof Error ? e : new Error(String(e));
    }
    expect(thrown, `渲染抛错: ${thrown?.message}`).toBeNull();
    expect(captured, `运行时错误: ${captured.join(' | ')}`).toHaveLength(0);
    expect(
      document.body.textContent,
      `${_name} 未渲染样本数据（可能停留在 loading 或数据未驱动）`
    ).toContain(sampleKey);
  });
});
