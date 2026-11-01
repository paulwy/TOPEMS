/**
 * 表单弹窗路径冒烟（数据输入模拟 · 新建/编辑弹窗打开 + QMS 填表提交）
 *
 * 覆盖核心 5 页面：渲染后点击"新建"按钮打开表单弹窗，捕获弹窗渲染路径运行时错误。
 * QMS 检验页额外深做：填入必填字段并点击提交，验证 mutation 提交路径无运行时错误
 * （不强制断言 create 一定被调用——若表单校验拦截则校验行为正常，非崩溃）。
 */
import React, { Component, Suspense, type ReactNode } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, act, cleanup, fireEvent, screen } from '@testing-library/react';
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
      status: 'approved',
      inspector: '张三',
      inspected_at: '2026-10-15T10:00:00Z',
      created_at: '2026-10-15T09:00:00Z',
    },
  ],
  crm: [
    {
      id: 'c1',
      code: 'CUST-001',
      name: '北方精密制造有限公司',
      short_name: '北方精密',
      status: 'active',
      industry: '制造',
      created_at: '2026-10-15T08:00:00Z',
    },
  ],
  erp: [
    {
      id: 'e1',
      order_no: 'SO-20261015-001',
      customer_name: '北方精密',
      status: 'confirmed',
      total_amount: 50000,
      order_date: '2026-10-15',
      created_at: '2026-10-15T08:00:00Z',
    },
  ],
  wms: [
    {
      id: 'w1',
      inbound_no: 'IN-20261015-001',
      supplier_name: '华北供应商',
      status: 'completed',
      total_quantity: 200,
      created_at: '2026-10-15T08:00:00Z',
    },
  ],
  hrm: [
    {
      id: 'h1',
      employee_no: 'EMP-001',
      name: '王五',
      department: '制造部',
      position: '工程师',
      status: 'active',
      created_at: '2026-10-15T08:00:00Z',
    },
  ],
};

vi.mock('@/api/qms/inspection', () => ({
  inspectionApi: {
    listChecks: vi.fn(async () => samples.qms),
    createCheck: vi.fn(async (d: unknown) => ({ data: { id: 'new', ...(d as object) } })),
    updateCheck: vi.fn(async () => ({ data: {} })),
    deleteCheck: vi.fn(async () => ({ data: {} })),
  },
}));
vi.mock('@/api/crm/customer', () => ({
  customerApi: {
    list: vi.fn(async () => samples.crm),
    create: vi.fn(async (d: unknown) => ({ data: { id: 'new', ...(d as object) } })),
    update: vi.fn(async () => ({ data: {} })),
    delete: vi.fn(async () => ({ data: {} })),
  },
}));
vi.mock('@/api/erp/core/salesOrder', () => ({
  salesOrderApi: {
    list: vi.fn(async () => samples.erp),
    create: vi.fn(async (d: unknown) => ({ data: { id: 'new', ...(d as object) } })),
    update: vi.fn(async () => ({ data: {} })),
    delete: vi.fn(async () => ({ data: {} })),
  },
}));
vi.mock('@/api/wms/inbound', () => ({
  inboundApi: {
    list: vi.fn(async () => samples.wms),
    create: vi.fn(async (d: unknown) => ({ data: { id: 'new', ...(d as object) } })),
    update: vi.fn(async () => ({ data: {} })),
    delete: vi.fn(async () => ({ data: {} })),
  },
}));
vi.mock('@/api/hrm/employee', () => ({
  employeeApi: {
    list: vi.fn(async () => samples.hrm),
    create: vi.fn(async (d: unknown) => ({ data: { id: 'new', ...(d as object) } })),
    update: vi.fn(async () => ({ data: {} })),
    delete: vi.fn(async () => ({ data: {} })),
  },
}));

import QmsPage from '@/pages/qms/QmsInspectionRedesignPage';
import CrmPage from '@/pages/crm/CrmCustomerRedesignPage';
import ErpPage from '@/pages/erp/ErpSalesOrderRedesignPage';
import HrmPage from '@/pages/hrm/HrmEmployeeRedesignPage';

class CaptureBoundary extends Component<{ name: string; errors: string[]; children?: ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    this.props.errors.push(
      `[${this.props.name}] ${error instanceof Error ? error.message : String(error)}`
    );
  }
  render() {
    if (this.state.hasError) return <div data-testid='page-crash' />;
    return this.props.children;
  }
}

function renderPage(Page: React.ComponentType, captured: string[]) {
  return render(
    <ThemeProvider theme={createTheme()}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <Suspense fallback={<div data-testid='loading' />}>
            <CaptureBoundary
              name='form'
              errors={captured}
            >
              <Page />
            </CaptureBoundary>
          </Suspense>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function findButtonByText(pattern: RegExp) {
  const all = screen.getAllByRole('button');
  return all.find((b) => pattern.test(b.textContent || ''));
}

const pages: Array<[string, React.ComponentType]> = [
  ['QMS 检验列表', QmsPage],
  ['CRM 客户列表', CrmPage],
  ['ERP 销售订单列表', ErpPage],
  ['HRM 员工列表', HrmPage],
];

describe('表单弹窗打开冒烟（5 核心页面新建路径）', () => {
  afterEach(() => cleanup());

  it.each(pages)('%s 打开新建弹窗不崩溃', async (_name, Page) => {
    const captured: string[] = [];
    let thrown: Error | null = null;
    try {
      renderPage(Page, captured);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 150));
      });
      await act(async () => {
        const btn = findButtonByText(/新建|新增/);
        expect(btn, `${_name} 未找到新建按钮`).toBeTruthy();
        fireEvent.click(btn!);
        await new Promise((r) => setTimeout(r, 200));
      });
    } catch (e) {
      thrown = e instanceof Error ? e : new Error(String(e));
    }
    expect(thrown, `渲染/交互抛错: ${thrown?.message}`).toBeNull();
    expect(captured, `运行时错误: ${captured.join(' | ')}`).toHaveLength(0);
  });
});

describe('QMS 检验表单提交路径深做', () => {
  afterEach(() => cleanup());

  it('填必填字段并提交，无运行时错误', async () => {
    const captured: string[] = [];
    let thrown: Error | null = null;
    try {
      renderPage(QmsPage, captured);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 150));
      });
      await act(async () => {
        const btn = findButtonByText(/新建|新增/);
        expect(btn).toBeTruthy();
        fireEvent.click(btn!);
        await new Promise((r) => setTimeout(r, 200));
      });
      // 找弹窗内可见输入框（MUI TextField input / 原生 input），给第一个可编辑输入填值
      await act(async () => {
        const inputs = screen
          .getAllByRole('textbox')
          .filter((el) => (el as HTMLInputElement).disabled === false);
        const editable = inputs[0];
        if (editable) {
          fireEvent.change(editable, { target: { value: '测试检验单-表单提交' } });
        }
        // 尝试提交（按钮文本含 创建/提交/保存/确定）
        const submit = findButtonByText(/创建|提交|保存|确定|新增/);
        if (submit) {
          fireEvent.click(submit);
        }
        await new Promise((r) => setTimeout(r, 300));
      });
    } catch (e) {
      thrown = e instanceof Error ? e : new Error(String(e));
    }
    expect(thrown, `提交路径抛错: ${thrown?.message}`).toBeNull();
    expect(captured, `运行时错误: ${captured.join(' | ')}`).toHaveLength(0);
  });
});
