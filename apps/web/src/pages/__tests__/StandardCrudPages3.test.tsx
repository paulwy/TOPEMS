import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ForecastManagementPage from '../aps/ForecastManagementPage';
import ProductionPlanPage from '../aps/ProductionPlanPage';
import QmsApqpPage from '../qms/QmsApqpPage';
import FinanceExpenseApprovalPage from '../finance/FinanceExpenseApprovalPage';
import ScmPurchaseContractPage from '../scm/ScmPurchaseContractPage';
import VehicleRequestPage from '../erp/VehicleRequestPage';
import MeetingRoomPage from '../erp/MeetingRoomPage';
import PdmProductCategoryPage from '../pdm/PdmProductCategoryPage';
import PdmStepPage from '../pdm/PdmStepPage';
import { forecastApi, productionPlanApi } from '@/api/aps';
import { qmsApi } from '@/api/qms';
import { financeApi } from '@/api/finance';
import { scmApi } from '@/api/scm';
import { vehicleRequestApi, meetingRoomApi } from '@/api/erp';
import { documentApi, pdmApi } from '@/api/pdm';

// 与 CrmCrudPages 冻结范本同构：验证真实 createCrudPageAdapter 的参数归一化/响应解包/错误翻译
vi.unmock('@/schema-dsl/crudPageAdapter');

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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  },
}));

vi.mock('@/schemas/aps', () => ({
  forecastSchema: { name: 'forecastSchema' },
  productionPlanSchema: { name: 'productionPlanSchema' },
}));

vi.mock('@/schemas/qms/apqp', () => ({
  apqpSchema: { name: 'apqpSchema' },
}));

vi.mock('@/schemas/finance', () => ({
  expenseApprovalSchema: { name: 'expenseApprovalSchema' },
}));

vi.mock('@/schemas/scm', () => ({
  purchaseContractWizardSchema: { name: 'purchaseContractWizardSchema' },
}));

vi.mock('@/schemas/erp/vehicleRequest', () => ({
  vehicleRequestSchema: { name: 'vehicleRequestSchema' },
}));

vi.mock('@/schemas/erp/meetingRoom', () => ({
  meetingRoomSchema: { name: 'meetingRoomSchema' },
}));

vi.mock('@/schemas/pdm', () => ({
  productCategorySchema: { name: 'productCategorySchema' },
  stepSchema: { name: 'stepSchema' },
}));

const makeEntityApi = vi.hoisted(() => () => ({
  list: vi.fn().mockResolvedValue({
    success: true,
    data: { items: [{ id: 'row-1', name: '记录甲' }], total: 1 },
  }),
  create: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 'row-2', name: '记录乙' },
  }),
  update: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 'row-1', name: '记录丙' },
  }),
  delete: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/api/aps', () => ({
  forecastApi: makeEntityApi(),
  productionPlanApi: makeEntityApi(),
}));

vi.mock('@/api/qms', () => ({
  qmsApi: {
    listApqpProjects: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'apqp-1', name: 'APQP甲' }], total: 1 },
    }),
    createApqpProject: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'row-2', name: '记录乙' },
    }),
    updateApqpProject: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'row-1', name: '记录丙' },
    }),
    deleteApqpProject: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/api/finance', () => ({
  financeApi: {
    expenseApproval: makeEntityApi(),
  },
}));

vi.mock('@/api/scm', () => ({
  scmApi: {
    purchaseContracts: makeEntityApi(),
  },
}));

vi.mock('@/api/erp', () => ({
  vehicleRequestApi: makeEntityApi(),
  meetingRoomApi: makeEntityApi(),
}));

vi.mock('@/api/pdm', () => ({
  documentApi: makeEntityApi(),
  pdmApi: {
    listSteps: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'step-1', name: '工序甲' }], total: 1 },
    }),
    createStep: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'row-2', name: '记录乙' },
    }),
    updateStep: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'row-1', name: '记录丙' },
    }),
    deleteStep: vi.fn().mockResolvedValue({ success: true }),
  },
}));

const pages = [
  {
    name: 'ForecastManagementPage',
    Page: ForecastManagementPage,
    schema: { name: 'forecastSchema' },
    breadcrumbs: [{ label: 'APS' }, { label: 'pages.forecast_management_page.k3' }],
    api: forecastApi,
  },
  {
    name: 'ProductionPlanPage',
    Page: ProductionPlanPage,
    schema: { name: 'productionPlanSchema' },
    breadcrumbs: [{ label: 'APS' }, { label: 'aps.production_plan_page.k8' }],
    api: productionPlanApi,
  },
  {
    name: 'QmsApqpPage',
    Page: QmsApqpPage,
    schema: { name: 'apqpSchema' },
    breadcrumbs: [{ label: 'QMS' }, { label: 'pages.qms_apqp_page.apqp_0' }],
    api: {
      list: qmsApi.listApqpProjects,
      create: qmsApi.createApqpProject,
      update: qmsApi.updateApqpProject,
      delete: qmsApi.deleteApqpProject,
    },
  },
  {
    name: 'FinanceExpenseApprovalPage',
    Page: FinanceExpenseApprovalPage,
    schema: { name: 'expenseApprovalSchema' },
    breadcrumbs: [
      { label: 'finance.finance_expense_approval_page.k1' },
      { label: 'finance.finance_expense_approval_page.k0' },
    ],
    api: financeApi.expenseApproval,
  },
  {
    name: 'ScmPurchaseContractPage',
    Page: ScmPurchaseContractPage,
    schema: { name: 'purchaseContractWizardSchema' },
    breadcrumbs: [
      { label: 'scm.scm_purchase_contract_page.k1' },
      { label: 'scm.scm_purchase_contract_page.k0' },
    ],
    api: scmApi.purchaseContracts,
  },
  {
    name: 'VehicleRequestPage',
    Page: VehicleRequestPage,
    schema: { name: 'vehicleRequestSchema' },
    breadcrumbs: [
      { label: 'erp.vehicle_request_page.k4', href: '/dashboard' },
      { label: 'ERP', href: '/erp' },
      { label: 'erp.vehicle_request_page.k5' },
    ],
    api: vehicleRequestApi,
  },
  {
    name: 'MeetingRoomPage',
    Page: MeetingRoomPage,
    schema: { name: 'meetingRoomSchema' },
    breadcrumbs: [
      { label: 'erp.meeting_room_page.k4', href: '/dashboard' },
      { label: 'ERP', href: '/erp' },
      { label: 'erp.meeting_room_page.k5' },
    ],
    api: meetingRoomApi,
  },
  {
    name: 'PdmProductCategoryPage',
    Page: PdmProductCategoryPage,
    schema: { name: 'productCategorySchema' },
    breadcrumbs: [{ label: 'PDM' }, { label: 'pdm.pdm_product_category_page.k0' }],
    api: documentApi,
  },
  {
    name: 'PdmStepPage',
    Page: PdmStepPage,
    schema: { name: 'stepSchema' },
    breadcrumbs: [{ label: 'PDM' }, { label: 'pdm.pdm_step_page.k0' }],
    api: {
      list: pdmApi.listSteps,
      create: pdmApi.createStep,
      update: pdmApi.updateStep,
      delete: pdmApi.deleteStep,
    },
  },
];

describe.each(pages)(
  '$name（标准 CrudPage 包装页真断言）',
  ({ name, Page, schema, breadcrumbs, api }) => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it(`${name} 经 CrudPage 渲染（schema + breadcrumbs）`, () => {
      render(<Page />);

      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(expect.objectContaining({ schema, breadcrumbs }));
    });

    it(`${name} list 参数归一化 + 响应解包`, async () => {
      render(<Page />);
      const props = mockCrudPage.mock.calls[0][0];

      const result = await props.apiAdapter.list({ page: 2, pageSize: 20, search: '甲' });

      expect(api.list).toHaveBeenCalledWith({ page: 2, page_size: 20, search: '甲' });
      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
      });
    });

    it(`${name} create/update/delete 委托 payload`, async () => {
      render(<Page />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.create({ name: '新记录' })).resolves.toEqual({
        id: 'row-2',
        name: '记录乙',
      });
      await expect(props.apiAdapter.update('row-1', { name: '改记录' })).resolves.toEqual({
        id: 'row-1',
        name: '记录丙',
      });
      await expect(props.apiAdapter.delete('row-1')).resolves.toBeUndefined();

      expect(api.create).toHaveBeenCalledWith({ name: '新记录' });
      expect(api.update).toHaveBeenCalledWith('row-1', { name: '改记录' });
      expect(api.delete).toHaveBeenCalledWith('row-1');
    });

    it(`${name} 四档错误翻译`, async () => {
      api.list.mockResolvedValueOnce({ success: false, data: null });
      api.create.mockResolvedValueOnce({ success: false, data: null });
      api.update.mockResolvedValueOnce({ success: false, data: null });
      api.delete.mockResolvedValueOnce({ success: false, data: null });

      render(<Page />);
      const props = mockCrudPage.mock.calls[0][0];

      await expect(props.apiAdapter.list({ page: 1, pageSize: 10 })).rejects.toThrow(
        '加载列表失败'
      );
      await expect(props.apiAdapter.create({ name: 'x' })).rejects.toThrow('创建失败');
      await expect(props.apiAdapter.update('row-1', { name: 'x' })).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('row-1')).rejects.toThrow('删除失败');
    });
  }
);
