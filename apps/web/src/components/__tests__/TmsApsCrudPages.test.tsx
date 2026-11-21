import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DriverManagementPage from '../tms/DriverManagementPage';
import RouteManagementPage from '../tms/RouteManagementPage';
import CarrierManagementPage from '../tms/CarrierManagementPage';
import ScheduleManagementPage from '../aps/ScheduleManagementPage';
import CapacityManagementPage from '../aps/CapacityManagementPage';
import MaterialPlanPage from '../aps/MaterialPlanPage';
import { driverApi, routeApi, carrierApi } from '@/api/tms';
import { scheduleApi, capacityApi, materialPlanApi } from '@/api/aps';

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

vi.mock('@/schemas/tms', () => ({
  driverSchema: { name: 'driverSchema' },
  routeSchema: { name: 'routeSchema' },
  carrierSchema: { name: 'carrierSchema' },
}));

vi.mock('@/schemas/aps', () => ({
  scheduleSchema: { name: 'scheduleSchema' },
  capacitySchema: { name: 'capacitySchema' },
  materialPlanSchema: { name: 'materialPlanSchema' },
}));

vi.mock('@/api/tms', () => ({
  driverApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'driver-1', name: '司机甲' }], total: 1 },
    }),
    create: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'driver-2', name: '司机乙' },
    }),
    update: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'driver-1', name: '司机丙' },
    }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  routeApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'route-1', name: '干线A' }], total: 1 },
    }),
    create: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'route-2', name: '干线B' },
    }),
    update: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'route-1', name: '干线C' },
    }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  carrierApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'carrier-1', name: '承运商甲' }], total: 1 },
    }),
    create: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'carrier-2', name: '承运商乙' },
    }),
    update: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'carrier-1', name: '承运商丙' },
    }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/api/aps', () => ({
  scheduleApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'schedule-1', name: '排产A' }], total: 1 },
    }),
    create: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'schedule-2', name: '排产B' },
    }),
    update: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'schedule-1', name: '排产C' },
    }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  capacityApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'capacity-1', name: '产能A' }], total: 1 },
    }),
    create: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'capacity-2', name: '产能B' },
    }),
    update: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'capacity-1', name: '产能C' },
    }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  materialPlanApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'plan-1', name: '物料计划A' }], total: 1 },
    }),
    create: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'plan-2', name: '物料计划B' },
    }),
    update: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'plan-1', name: '物料计划C' },
    }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

const pages = [
  {
    name: 'DriverManagementPage',
    Page: DriverManagementPage,
    schema: { name: 'driverSchema' },
    breadcrumbs: [{ label: 'TMS' }, { label: 'tms.driver_management_page.k14' }],
    api: driverApi,
  },
  {
    name: 'RouteManagementPage',
    Page: RouteManagementPage,
    schema: { name: 'routeSchema' },
    breadcrumbs: [{ label: 'TMS' }, { label: 'tms.route_management_page.k14' }],
    api: routeApi,
  },
  {
    name: 'CarrierManagementPage',
    Page: CarrierManagementPage,
    schema: { name: 'carrierSchema' },
    breadcrumbs: [{ label: 'TMS' }, { label: 'tms.carrier_management_page.k14' }],
    api: carrierApi,
  },
  {
    name: 'ScheduleManagementPage',
    Page: ScheduleManagementPage,
    schema: { name: 'scheduleSchema' },
    breadcrumbs: [{ label: 'APS' }, { label: 'aps.schedule_management_page.k5' }],
    api: scheduleApi,
  },
  {
    name: 'CapacityManagementPage',
    Page: CapacityManagementPage,
    schema: { name: 'capacitySchema' },
    breadcrumbs: [{ label: 'APS' }, { label: 'aps.capacity_management_page.k4' }],
    api: capacityApi,
  },
  {
    name: 'MaterialPlanPage',
    Page: MaterialPlanPage,
    schema: { name: 'materialPlanSchema' },
    breadcrumbs: [{ label: 'APS' }, { label: 'aps.material_plan_page.k6' }],
    api: materialPlanApi,
  },
];

describe.each(pages)(
  '$name（Tms/Aps CrudPage 包装页真断言）',
  ({ name, Page, schema, breadcrumbs, api }) => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it(`${name} 经 CrudPage 渲染（schema + breadcrumbs）`, () => {
      render(<Page />);

      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
      expect(mockCrudPage).toHaveBeenCalledWith(
        expect.objectContaining({
          schema,
          breadcrumbs,
        })
      );
    });

    it(`${name} list 参数归一化 + 响应解包`, async () => {
      render(<Page />);
      const props = mockCrudPage.mock.calls[0][0];

      const result = await props.apiAdapter.list({
        page: 2,
        pageSize: 20,
        search: '甲',
      });

      expect(api.list).toHaveBeenCalledWith({
        page: 2,
        page_size: 20,
        search: '甲',
      });
      // 真实适配器把 {items,total} 解包为 {data,total}
      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
      });
    });

    it(`${name} create/update/delete 委托 payload`, async () => {
      render(<Page />);
      const props = mockCrudPage.mock.calls[0][0];

      await props.apiAdapter.create({ name: '新记录' });
      expect(api.create).toHaveBeenCalledWith({ name: '新记录' });

      await props.apiAdapter.update('id-1', { name: '改记录' });
      expect(api.update).toHaveBeenCalledWith('id-1', { name: '改记录' });

      await props.apiAdapter.delete('id-1');
      expect(api.delete).toHaveBeenCalledWith('id-1');
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
      await expect(props.apiAdapter.update('id-1', { name: 'x' })).rejects.toThrow('更新失败');
      await expect(props.apiAdapter.delete('id-1')).rejects.toThrow('删除失败');
    });
  }
);
