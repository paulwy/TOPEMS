import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FinanceInvoicePage from '../finance/FinanceInvoicePage';
import { financeApi } from '@/api/finance';

// CrudPage 模板页：setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api，
// 本 spec 验证真实适配器的参数归一化/响应解包/错误翻译，需恢复真实实现。
vi.unmock('@/schema/crudPageAdapter');

// 适配器直接用全局 i18n.t（非 react-i18next hook），此处显式提供 crud_page_adapter 翻译，
// 避免测试环境 i18n 资源未就绪导致 t() 返回原始 key（与 locales/zh/schema.json 一致）
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const crudTranslations: Record<string, string> = {
        'schema:crud_page_adapter.k0': '加载列表失败',
        'schema:crud_page_adapter.k1': '创建失败',
        'schema:crud_page_adapter.k2': '更新失败',
        'schema:crud_page_adapter.k3': '删除失败',
        'schema:crud_page_adapter.k4': '记录不存在',
      };
      return crudTranslations[key] ?? key;
    },
    exists: () => true,
  },
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  },
}));

vi.mock('@/schemas/finance', () => ({
  invoiceSchema: { name: 'invoiceSchema' },
}));

vi.mock('@/api/finance', () => ({
  financeApi: {
    receivablePayable: {
      listSalesInvoices: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [{ id: 'inv-1', invoice_number: 'INV-001' }], total: 1 },
      }),
      createSalesInvoice: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'inv-2', invoice_number: 'INV-002' },
      }),
      updateSalesInvoice: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'inv-1', invoice_number: 'INV-001', status: 'paid' },
      }),
      deleteSalesInvoice: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('FinanceInvoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders invoice management through CrudPage with finance breadcrumbs', () => {
    render(<FinanceInvoicePage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'invoiceSchema' },
        breadcrumbs: [
          { label: 'finance.finance_invoice_page.k1' },
          { label: 'finance.finance_invoice_page.k0' },
        ],
      })
    );
  });

  it('maps list params pageSize to page_size and delegates to listSalesInvoices', async () => {
    render(<FinanceInvoicePage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 1,
      pageSize: 10,
      search: 'INV',
    });

    expect(financeApi.receivablePayable.listSalesInvoices).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      search: 'INV',
    });
    expect(result).toEqual({
      data: [{ id: 'inv-1', invoice_number: 'INV-001' }],
      total: 1,
    });
  });

  it('delegates create, update and delete to sales invoice methods', async () => {
    render(<FinanceInvoicePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ invoice_number: 'INV-002' })).resolves.toEqual({
      id: 'inv-2',
      invoice_number: 'INV-002',
    });
    await expect(props.apiAdapter.update('inv-1', { status: 'paid' })).resolves.toEqual({
      id: 'inv-1',
      invoice_number: 'INV-001',
      status: 'paid',
    });
    await expect(props.apiAdapter.delete('inv-1')).resolves.toBeUndefined();

    expect(financeApi.receivablePayable.createSalesInvoice).toHaveBeenCalledWith({
      invoice_number: 'INV-002',
    });
    expect(financeApi.receivablePayable.updateSalesInvoice).toHaveBeenCalledWith('inv-1', {
      status: 'paid',
    });
    expect(financeApi.receivablePayable.deleteSalesInvoice).toHaveBeenCalledWith('inv-1');
  });

  it('throws translated errors when sales invoice API operations fail', async () => {
    vi.mocked(financeApi.receivablePayable.listSalesInvoices).mockResolvedValueOnce({
      success: false,
      data: null,
    });
    vi.mocked(financeApi.receivablePayable.createSalesInvoice).mockResolvedValueOnce({
      success: false,
    });
    vi.mocked(financeApi.receivablePayable.updateSalesInvoice).mockResolvedValueOnce({
      success: false,
    });
    vi.mocked(financeApi.receivablePayable.deleteSalesInvoice).mockResolvedValueOnce({
      success: false,
    });

    render(<FinanceInvoicePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('inv-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('inv-1')).rejects.toThrow('删除失败');
  });
});
