import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SupplierAdmissionPage from '../scm/SupplierAdmissionPage';
import ScmPriceComparisonPage from '../scm/ScmPriceComparisonPage';
import ScmDeliveryAppointmentPage from '../scm/ScmDeliveryAppointmentPage';
import { scmApi } from '@/api/scm';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api；
// 本文件专门验证真实适配器的参数归一化/响应解包/错误翻译，需恢复真实实现。
vi.unmock('@/schema-dsl/crudPageAdapter');

// 适配器直接用全局 i18n.t（非 react-i18next hook），此处显式提供 crud_page_adapter
// 翻译表（与 locales/zh/schema.json 一致）。
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

vi.mock('@/schemas/scm', () => ({
  supplierAdmissionSchema: { name: 'supplierAdmissionSchema' },
  priceComparisonSchema: { name: 'priceComparisonSchema' },
  deliveryAppointmentSchema: { name: 'deliveryAppointmentSchema' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: {
    supplierAdmissions: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    priceComparisons: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    deliveryAppointments: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('ScmCrudPages2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scmApi.supplierAdmissions.list).mockResolvedValue({
      success: true,
      data: { items: [{ id: 'sa-1', supplier_code: 'SUP-001', status: 'pending' }], total: 1 },
    });
    vi.mocked(scmApi.priceComparisons.list).mockResolvedValue({
      success: true,
      data: { items: [{ id: 'pc-1', comparison_no: 'PC-001', status: 'draft' }], total: 1 },
    });
    vi.mocked(scmApi.deliveryAppointments.list).mockResolvedValue({
      success: true,
      data: { items: [{ id: 'da-1', appointment_no: 'DA-001', status: 'scheduled' }], total: 1 },
    });
  });

  describe('SupplierAdmissionPage', () => {
    it('renders supplier admission page through CrudPage with SCM breadcrumbs', () => {
      render(<SupplierAdmissionPage />);

      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { name: 'supplierAdmissionSchema' },
          breadcrumbs: [{ label: 'SCM' }, { label: 'scm.supplier_admission_page.k24' }],
        })
      );
    });

    it('maps supplier admission list params and unwraps response', async () => {
      render(<SupplierAdmissionPage />);
      const props = mockCrudPage.mock.calls[0][0];

      const result = await props.apiAdapter.list({
        page: 1,
        pageSize: 20,
        status: 'pending',
      });

      expect(scmApi.supplierAdmissions.list).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
        status: 'pending',
      });
      expect(result).toEqual({
        data: [{ id: 'sa-1', supplier_code: 'SUP-001', status: 'pending' }],
        total: 1,
      });
    });

    it('delegates supplier admission create, update and delete operations', async () => {
      vi.mocked(scmApi.supplierAdmissions.create).mockResolvedValue({
        success: true,
        data: { id: 'sa-2', supplier_code: 'SUP-002' },
      });
      vi.mocked(scmApi.supplierAdmissions.update).mockResolvedValue({
        success: true,
        data: { id: 'sa-1', supplier_code: 'SUP-001' },
      });
      vi.mocked(scmApi.supplierAdmissions.delete).mockResolvedValue({ success: true });

      render(<SupplierAdmissionPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.create({ supplier_code: 'SUP-002' })).resolves.toEqual({
        id: 'sa-2',
        supplier_code: 'SUP-002',
      });
      await expect(props.apiAdapter.update('sa-1', { supplier_code: 'SUP-001' })).resolves.toEqual({
        id: 'sa-1',
        supplier_code: 'SUP-001',
      });
      await expect(props.apiAdapter.delete('sa-1')).resolves.toBeUndefined();

      expect(scmApi.supplierAdmissions.create).toHaveBeenCalledWith({ supplier_code: 'SUP-002' });
      expect(scmApi.supplierAdmissions.update).toHaveBeenCalledWith('sa-1', {
        supplier_code: 'SUP-001',
      });
      expect(scmApi.supplierAdmissions.delete).toHaveBeenCalledWith('sa-1');
    });

    it('throws translated errors when supplier admission API operations fail', async () => {
      vi.mocked(scmApi.supplierAdmissions.list).mockResolvedValueOnce({
        success: false,
        data: null,
      });
      vi.mocked(scmApi.supplierAdmissions.create).mockResolvedValueOnce({ success: false });
      vi.mocked(scmApi.supplierAdmissions.update).mockResolvedValueOnce({ success: false });
      vi.mocked(scmApi.supplierAdmissions.delete).mockResolvedValueOnce({ success: false });

      render(<SupplierAdmissionPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
      await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
      await expect(props.apiAdapter.update('sa-1', {})).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('sa-1')).rejects.toThrow('删除失败');
    });
  });

  describe('ScmPriceComparisonPage', () => {
    it('renders price comparison page with dynamic exportConfig schema', () => {
      render(<ScmPriceComparisonPage />);

      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: expect.objectContaining({
            name: 'priceComparisonSchema',
            exportConfig: expect.objectContaining({ enabled: true }),
          }),
          breadcrumbs: [{ label: 'SCM' }, { label: 'scm.scm_price_comparison_page.k1' }],
        })
      );
    });

    it('maps price comparison list params and unwraps response', async () => {
      render(<ScmPriceComparisonPage />);
      const props = mockCrudPage.mock.calls[0][0];

      const result = await props.apiAdapter.list({ page: 2, pageSize: 15 });

      expect(scmApi.priceComparisons.list).toHaveBeenCalledWith({ page: 2, page_size: 15 });
      expect(result).toEqual({
        data: [{ id: 'pc-1', comparison_no: 'PC-001', status: 'draft' }],
        total: 1,
      });
    });

    it('delegates price comparison create, update and delete operations', async () => {
      vi.mocked(scmApi.priceComparisons.create).mockResolvedValue({
        success: true,
        data: { id: 'pc-2', comparison_no: 'PC-002' },
      });
      vi.mocked(scmApi.priceComparisons.update).mockResolvedValue({
        success: true,
        data: { id: 'pc-1', comparison_no: 'PC-001' },
      });
      vi.mocked(scmApi.priceComparisons.delete).mockResolvedValue({ success: true });

      render(<ScmPriceComparisonPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.create({ comparison_no: 'PC-002' })).resolves.toEqual({
        id: 'pc-2',
        comparison_no: 'PC-002',
      });
      await expect(props.apiAdapter.update('pc-1', { comparison_no: 'PC-001' })).resolves.toEqual({
        id: 'pc-1',
        comparison_no: 'PC-001',
      });
      await expect(props.apiAdapter.delete('pc-1')).resolves.toBeUndefined();

      expect(scmApi.priceComparisons.create).toHaveBeenCalledWith({ comparison_no: 'PC-002' });
      expect(scmApi.priceComparisons.update).toHaveBeenCalledWith('pc-1', {
        comparison_no: 'PC-001',
      });
      expect(scmApi.priceComparisons.delete).toHaveBeenCalledWith('pc-1');
    });

    it('throws translated errors when price comparison API operations fail', async () => {
      vi.mocked(scmApi.priceComparisons.list).mockResolvedValueOnce({ success: false, data: null });
      vi.mocked(scmApi.priceComparisons.create).mockResolvedValueOnce({ success: false });
      vi.mocked(scmApi.priceComparisons.update).mockResolvedValueOnce({ success: false });
      vi.mocked(scmApi.priceComparisons.delete).mockResolvedValueOnce({ success: false });

      render(<ScmPriceComparisonPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
      await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
      await expect(props.apiAdapter.update('pc-1', {})).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('pc-1')).rejects.toThrow('删除失败');
    });
  });

  describe('ScmDeliveryAppointmentPage', () => {
    it('renders delivery appointment page through CrudPage with SCM breadcrumbs', () => {
      render(<ScmDeliveryAppointmentPage />);

      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { name: 'deliveryAppointmentSchema' },
          breadcrumbs: [{ label: 'SCM' }, { label: 'scm.scm_delivery_appointment_page.k24' }],
        })
      );
    });

    it('maps delivery appointment list params and unwraps response', async () => {
      render(<ScmDeliveryAppointmentPage />);
      const props = mockCrudPage.mock.calls[0][0];

      const result = await props.apiAdapter.list({ page: 1, pageSize: 50, status: 'scheduled' });

      expect(scmApi.deliveryAppointments.list).toHaveBeenCalledWith({
        page: 1,
        page_size: 50,
        status: 'scheduled',
      });
      expect(result).toEqual({
        data: [{ id: 'da-1', appointment_no: 'DA-001', status: 'scheduled' }],
        total: 1,
      });
    });

    it('delegates delivery appointment create, update and delete operations', async () => {
      vi.mocked(scmApi.deliveryAppointments.create).mockResolvedValue({
        success: true,
        data: { id: 'da-2', appointment_no: 'DA-002' },
      });
      vi.mocked(scmApi.deliveryAppointments.update).mockResolvedValue({
        success: true,
        data: { id: 'da-1', appointment_no: 'DA-001' },
      });
      vi.mocked(scmApi.deliveryAppointments.delete).mockResolvedValue({ success: true });

      render(<ScmDeliveryAppointmentPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.create({ appointment_no: 'DA-002' })).resolves.toEqual({
        id: 'da-2',
        appointment_no: 'DA-002',
      });
      await expect(props.apiAdapter.update('da-1', { appointment_no: 'DA-001' })).resolves.toEqual({
        id: 'da-1',
        appointment_no: 'DA-001',
      });
      await expect(props.apiAdapter.delete('da-1')).resolves.toBeUndefined();

      expect(scmApi.deliveryAppointments.create).toHaveBeenCalledWith({ appointment_no: 'DA-002' });
      expect(scmApi.deliveryAppointments.update).toHaveBeenCalledWith('da-1', {
        appointment_no: 'DA-001',
      });
      expect(scmApi.deliveryAppointments.delete).toHaveBeenCalledWith('da-1');
    });

    it('throws translated errors when delivery appointment API operations fail', async () => {
      vi.mocked(scmApi.deliveryAppointments.list).mockResolvedValueOnce({
        success: false,
        data: null,
      });
      vi.mocked(scmApi.deliveryAppointments.create).mockResolvedValueOnce({ success: false });
      vi.mocked(scmApi.deliveryAppointments.update).mockResolvedValueOnce({ success: false });
      vi.mocked(scmApi.deliveryAppointments.delete).mockResolvedValueOnce({ success: false });

      render(<ScmDeliveryAppointmentPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
      await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
      await expect(props.apiAdapter.update('da-1', {})).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('da-1')).rejects.toThrow('删除失败');
    });
  });
});
