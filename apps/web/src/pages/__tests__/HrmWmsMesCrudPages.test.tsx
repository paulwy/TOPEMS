import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WmsAreaPage from '../wms/WmsAreaPage';
import HrmTrainingPage from '../hrm/HrmTrainingPage';
import HrmRecruitmentPage from '../hrm/HrmRecruitmentPage';
import HrmPerformancePage from '../hrm/HrmPerformancePage';
import HrmOrganizationPage from '../hrm/HrmOrganizationPage';
import MesQualityPage from '../mes/MesQualityPage';
import { wmsApi } from '@/api/wms';
import { hrmApi } from '@/api/hrm';
import { qualityApi } from '@/api/mes';

// 与 CrmCrudPages 冻结范本同构：验证真实 createCrudPageAdapter 的参数归一化/响应解包/错误翻译
vi.unmock('@/schema/crudPageAdapter');

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

vi.mock('@/schemas/wms', () => ({
  areaSchema: { name: 'areaSchema' },
}));

vi.mock('@/schemas/hrm', () => ({
  trainingSchema: { name: 'trainingSchema' },
  recruitmentSchema: { name: 'recruitmentSchema' },
  performanceSchema: { name: 'performanceSchema' },
  organizationSchema: { name: 'organizationSchema' },
}));

vi.mock('@/schemas/mes', () => ({
  qualitySchema: { name: 'qualitySchema' },
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

vi.mock('@/api/wms', () => ({
  wmsApi: {
    locations: makeEntityApi(),
  },
}));

vi.mock('@/api/hrm', () => ({
  hrmApi: {
    trainingPlans: makeEntityApi(),
    jobOpenings: makeEntityApi(),
    performanceReviews: makeEntityApi(),
    departments: makeEntityApi(),
  },
}));

vi.mock('@/api/mes', () => ({
  qualityApi: {
    listInspections: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'insp-1', name: '检验甲' }], total: 1 },
    }),
    createInspection: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'row-2', name: '记录乙' },
    }),
    updateInspection: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'row-1', name: '记录丙' },
    }),
    deleteInspection: vi.fn().mockResolvedValue({ success: true }),
  },
}));

const pages = [
  {
    name: 'WmsAreaPage',
    Page: WmsAreaPage,
    schema: { name: 'areaSchema' },
    breadcrumbs: [{ label: 'WMS' }, { label: 'pages.wms_area_page.k0' }],
    api: wmsApi.locations,
  },
  {
    name: 'HrmTrainingPage',
    Page: HrmTrainingPage,
    schema: { name: 'trainingSchema' },
    breadcrumbs: [{ label: 'HRM' }, { label: 'hrm.hrm_training_page.k0' }],
    api: hrmApi.trainingPlans,
  },
  {
    name: 'HrmRecruitmentPage',
    Page: HrmRecruitmentPage,
    schema: { name: 'recruitmentSchema' },
    breadcrumbs: [{ label: 'HRM' }, { label: 'hrm.hrm_recruitment_page.k0' }],
    api: hrmApi.jobOpenings,
  },
  {
    name: 'HrmPerformancePage',
    Page: HrmPerformancePage,
    schema: { name: 'performanceSchema' },
    breadcrumbs: [{ label: 'HRM' }, { label: 'hrm.hrm_performance_page.k0' }],
    api: hrmApi.performanceReviews,
  },
  {
    name: 'HrmOrganizationPage',
    Page: HrmOrganizationPage,
    schema: { name: 'organizationSchema' },
    breadcrumbs: [{ label: 'HRM' }, { label: 'hrm.hrm_organization_page.k0' }],
    api: hrmApi.departments,
  },
  {
    name: 'MesQualityPage',
    Page: MesQualityPage,
    schema: { name: 'qualitySchema' },
    breadcrumbs: [{ label: 'MES' }, { label: 'mes.mes_quality_page.k0' }],
    api: {
      list: qualityApi.listInspections,
      create: qualityApi.createInspection,
      update: qualityApi.updateInspection,
      delete: qualityApi.deleteInspection,
    },
  },
];

describe.each(pages)(
  '$name（Hrm/Wms/Mes CrudPage 包装页真断言）',
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
