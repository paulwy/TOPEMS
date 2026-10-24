import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScmIncomingInspectionPage from '../scm/ScmIncomingInspectionPage';
import ScmEvaluationPage from '../scm/ScmEvaluationPage';
import PurchaseContractPage from '../scm/PurchaseContractPage';
import { scmApi } from '@/api/scm';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api；
// 本文件专门验证真实适配器的参数归一化/响应解包/错误翻译，需恢复真实实现。
vi.unmock('@/schema/crudPageAdapter');

// 适配器直接用全局 i18n.t（非 react-i18next hook），此处显式提供 crud_page_adapter
// 翻译表；IncomingInspection 页面自有 k0-k3 不在表中，返回 key 本身（断言按 key）。
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
  incomingInspectionSchema: { name: 'incomingInspectionSchema' },
  evaluationSchema: { name: 'evaluationSchema' },
  purchaseContractSchema: { name: 'purchaseContractSchema' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: {
    incomingInspections: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      pass: vi.fn(),
      reject: vi.fn(),
    },
    evaluations: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    purchaseContracts: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('ScmCrudPages3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scmApi.incomingInspections.list).mockResolvedValue({
      success: true,
      data: { inspections: [{ id: 'ii-1', inspection_no: 'II-001', status: 'pending' }], total: 1 },
    });
    vi.mocked(scmApi.evaluations.list).mockResolvedValue({
      success: true,
      data: { items: [{ id: 'ev-1', evaluation_no: 'EV-001', status: 'completed' }], total: 1 },
    });
    vi.mocked(scmApi.purchaseContracts.list).mockResolvedValue({
      success: true,
      data: { items: [{ id: 'pc-1', contract_no: 'CT-001', status: 'active' }], total: 1 },
    });
  });

  describe('ScmIncomingInspectionPage（自定义适配器）', () => {
    it('renders incoming inspection page with SCM breadcrumbs', () => {
      render(<ScmIncomingInspectionPage />);

      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { name: 'incomingInspectionSchema' },
          breadcrumbs: [{ label: 'SCM' }, { label: 'scm.scm_incoming_inspection_page.k14' }],
        })
      );
    });

    it('unwraps custom inspections envelope (non-items) for CrudPage', async () => {
      render(<ScmIncomingInspectionPage />);
      const props = mockCrudPage.mock.calls[0][0];

      const result = await props.apiAdapter.list({ page: 1, pageSize: 20 });

      // 自定义适配器直接透传 params（无 createCrudPageAdapter 归一化层），
      // 真实行为为 pageSize 原样传递（区别于其余 CrudPage 包装页）
      expect(scmApi.incomingInspections.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
      expect(result).toEqual({
        data: [{ id: 'ii-1', inspection_no: 'II-001', status: 'pending' }],
        total: 1,
      });
    });

    it('delegates create/update and throws on unsupported delete', async () => {
      vi.mocked(scmApi.incomingInspections.create).mockResolvedValue({
        success: true,
        data: { id: 'ii-2', inspection_no: 'II-002' },
      });
      vi.mocked(scmApi.incomingInspections.update).mockResolvedValue({
        success: true,
        data: { id: 'ii-1', inspection_no: 'II-001' },
      });

      render(<ScmIncomingInspectionPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.create({ inspection_no: 'II-002' })).resolves.toEqual({
        id: 'ii-2',
        inspection_no: 'II-002',
      });
      await expect(props.apiAdapter.update('ii-1', { inspection_no: 'II-001' })).resolves.toEqual({
        id: 'ii-1',
        inspection_no: 'II-001',
      });

      expect(scmApi.incomingInspections.create).toHaveBeenCalledWith({ inspection_no: 'II-002' });
      expect(scmApi.incomingInspections.update).toHaveBeenCalledWith('ii-1', {
        inspection_no: 'II-001',
      });
      // 后端无 DELETE 路由，适配器恒定抛"不支持删除"（页面自有 key k3）
      await expect(props.apiAdapter.delete('ii-1')).rejects.toThrow(
        'scm.scm_incoming_inspection_page.k3'
      );
    });

    it('throws page-level translated error when incoming inspection list fails', async () => {
      vi.mocked(scmApi.incomingInspections.list).mockResolvedValueOnce({
        success: false,
        data: null,
      });

      render(<ScmIncomingInspectionPage />);
      const props = mockCrudPage.mock.calls[0][0];

      // 页面适配器用自有 key（k0），非 crud_page_adapter 翻译表
      await expect(props.apiAdapter.list({})).rejects.toThrow(
        'scm.scm_incoming_inspection_page.k0'
      );
    });
  });

  describe('ScmEvaluationPage', () => {
    it('renders evaluation page with SCM breadcrumbs', () => {
      render(<ScmEvaluationPage />);

      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { name: 'evaluationSchema' },
          breadcrumbs: [{ label: 'SCM' }, { label: 'scm.scm_evaluation_page.k0' }],
        })
      );
    });

    it('maps evaluation list params and unwraps response', async () => {
      render(<ScmEvaluationPage />);
      const props = mockCrudPage.mock.calls[0][0];

      const result = await props.apiAdapter.list({ page: 2, pageSize: 10, status: 'completed' });

      expect(scmApi.evaluations.list).toHaveBeenCalledWith({
        page: 2,
        page_size: 10,
        status: 'completed',
      });
      expect(result).toEqual({
        data: [{ id: 'ev-1', evaluation_no: 'EV-001', status: 'completed' }],
        total: 1,
      });
    });

    it('delegates evaluation create, update and delete operations', async () => {
      vi.mocked(scmApi.evaluations.create).mockResolvedValue({
        success: true,
        data: { id: 'ev-2', evaluation_no: 'EV-002' },
      });
      vi.mocked(scmApi.evaluations.update).mockResolvedValue({
        success: true,
        data: { id: 'ev-1', evaluation_no: 'EV-001' },
      });
      vi.mocked(scmApi.evaluations.delete).mockResolvedValue({ success: true });

      render(<ScmEvaluationPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.create({ evaluation_no: 'EV-002' })).resolves.toEqual({
        id: 'ev-2',
        evaluation_no: 'EV-002',
      });
      await expect(props.apiAdapter.update('ev-1', { evaluation_no: 'EV-001' })).resolves.toEqual({
        id: 'ev-1',
        evaluation_no: 'EV-001',
      });
      await expect(props.apiAdapter.delete('ev-1')).resolves.toBeUndefined();

      expect(scmApi.evaluations.create).toHaveBeenCalledWith({ evaluation_no: 'EV-002' });
      expect(scmApi.evaluations.update).toHaveBeenCalledWith('ev-1', { evaluation_no: 'EV-001' });
      expect(scmApi.evaluations.delete).toHaveBeenCalledWith('ev-1');
    });

    it('throws translated errors when evaluation API operations fail', async () => {
      vi.mocked(scmApi.evaluations.list).mockResolvedValueOnce({ success: false, data: null });
      vi.mocked(scmApi.evaluations.create).mockResolvedValueOnce({ success: false });
      vi.mocked(scmApi.evaluations.update).mockResolvedValueOnce({ success: false });
      vi.mocked(scmApi.evaluations.delete).mockResolvedValueOnce({ success: false });

      render(<ScmEvaluationPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
      await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
      await expect(props.apiAdapter.update('ev-1', {})).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('ev-1')).rejects.toThrow('删除失败');
    });
  });

  describe('PurchaseContractPage', () => {
    it('renders purchase contract page with SCM breadcrumbs', () => {
      render(<PurchaseContractPage />);

      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { name: 'purchaseContractSchema' },
          breadcrumbs: [{ label: 'SCM' }, { label: 'scm.purchase_contract_page.k0' }],
        })
      );
    });

    it('maps purchase contract list params and unwraps response', async () => {
      render(<PurchaseContractPage />);
      const props = mockCrudPage.mock.calls[0][0];

      const result = await props.apiAdapter.list({ page: 3, pageSize: 25 });

      expect(scmApi.purchaseContracts.list).toHaveBeenCalledWith({ page: 3, page_size: 25 });
      expect(result).toEqual({
        data: [{ id: 'pc-1', contract_no: 'CT-001', status: 'active' }],
        total: 1,
      });
    });

    it('delegates purchase contract create, update and delete operations', async () => {
      vi.mocked(scmApi.purchaseContracts.create).mockResolvedValue({
        success: true,
        data: { id: 'pc-2', contract_no: 'CT-002' },
      });
      vi.mocked(scmApi.purchaseContracts.update).mockResolvedValue({
        success: true,
        data: { id: 'pc-1', contract_no: 'CT-001' },
      });
      vi.mocked(scmApi.purchaseContracts.delete).mockResolvedValue({ success: true });

      render(<PurchaseContractPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.create({ contract_no: 'CT-002' })).resolves.toEqual({
        id: 'pc-2',
        contract_no: 'CT-002',
      });
      await expect(props.apiAdapter.update('pc-1', { contract_no: 'CT-001' })).resolves.toEqual({
        id: 'pc-1',
        contract_no: 'CT-001',
      });
      await expect(props.apiAdapter.delete('pc-1')).resolves.toBeUndefined();

      expect(scmApi.purchaseContracts.create).toHaveBeenCalledWith({ contract_no: 'CT-002' });
      expect(scmApi.purchaseContracts.update).toHaveBeenCalledWith('pc-1', {
        contract_no: 'CT-001',
      });
      expect(scmApi.purchaseContracts.delete).toHaveBeenCalledWith('pc-1');
    });

    it('throws translated errors when purchase contract API operations fail', async () => {
      vi.mocked(scmApi.purchaseContracts.list).mockResolvedValueOnce({
        success: false,
        data: null,
      });
      vi.mocked(scmApi.purchaseContracts.create).mockResolvedValueOnce({ success: false });
      vi.mocked(scmApi.purchaseContracts.update).mockResolvedValueOnce({ success: false });
      vi.mocked(scmApi.purchaseContracts.delete).mockResolvedValueOnce({ success: false });

      render(<PurchaseContractPage />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
      await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
      await expect(props.apiAdapter.update('pc-1', {})).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('pc-1')).rejects.toThrow('删除失败');
    });
  });
});
