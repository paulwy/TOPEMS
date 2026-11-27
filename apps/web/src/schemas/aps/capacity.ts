import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';
import { workStationApi } from '@/api/mes/workStation';

export const capacitySchema: EntitySchema = {
  entity: 'capacity',
  title: i18n.t('aps.capacity_management_page.k4'),
  description: i18n.t('aps.capacity_management_page.k5'),

  api: {
    module: 'aps',
    resource: 'capacities',
    listMethod: 'list',
    getMethod: 'get',
    createMethod: 'create',
    updateMethod: 'update',
    deleteMethod: 'delete',
  },

  // 批 23：写权限资源前缀（DB 实查 create/update/delete 三码齐全）
  permissionResource: 'aps:capacity',

  dynamicOptions: [
    {
      field: 'work_center_id',
      queryKey: ['mes', 'workstations', 'forCapacity'],
      loader: async () => {
        const res = await workStationApi.list({ page: 1, page_size: 200 });
        const rows = res?.data?.workstations ?? [];
        return rows
          .filter((w) => w.id)
          .map((w) => ({
            value: w.id,
            label: (w.name && w.name.trim()) || (w.code && w.code.trim()) || w.id,
          }));
      },
    },
  ],

  fields: [
    {
      name: 'work_center_id',
      label: i18n.t('aps.capacity_management_page.k8'),
      // 工作中心从 mes.workstations 下拉选择（此前是手填 UUID，填不出合法值）
      type: 'select',
      required: true,
      showInList: false,
    },
    {
      name: 'work_center_name',
      label: i18n.t('aps.capacity_management_page.k8'),
      type: 'text',
      sortable: true,
      listWidth: 160,
      // 名称由后端按 work_center_id 反查 mes.work_stations 补全，表单里不再让用户手填
      hideInForm: true,
    },
    {
      name: 'capacity_date',
      label: i18n.t('aps.capacity_management_page.k9'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'available_hours',
      label: i18n.t('aps.capacity_management_page.k10'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'used_hours',
      label: i18n.t('aps.capacity_management_page.k11'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'utilization_rate',
      label: i18n.t('aps.capacity_management_page.k12'),
      type: 'number',
      readonly: true,
      hideInForm: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('aps.capacity_management_page.k13'),
      type: 'select',
      defaultValue: 'available',
      showInForm: false,
      options: {
        type: 'static',
        options: [
          { value: 'available', label: i18n.t('aps.capacity_management_page.k0') },
          { value: 'allocated', label: i18n.t('aps.capacity_management_page.k14') },
          { value: 'consumed', label: i18n.t('aps.capacity_management_page.k15') },
          { value: 'maintenance', label: i18n.t('aps.capacity_management_page.k2') },
          { value: 'released', label: i18n.t('aps.capacity_management_page.k16') },
        ],
      },
      listWidth: 110,
    },
  ],

  list: {
    columns: [
      'work_center_name',
      'capacity_date',
      'available_hours',
      'used_hours',
      'utilization_rate',
      'status',
    ],
    searchFields: ['work_center_name', 'work_center_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        available: 'success',
        allocated: 'info',
        consumed: 'success',
        maintenance: 'warning',
        released: 'info',
      },
      labelMap: {
        available: i18n.t('aps.capacity_management_page.k0'),
        allocated: i18n.t('aps.capacity_management_page.k14'),
        consumed: i18n.t('aps.capacity_management_page.k15'),
        maintenance: i18n.t('aps.capacity_management_page.k2'),
        released: i18n.t('aps.capacity_management_page.k16'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('aps.capacity_management_page.k13'),
        type: 'select',
        options: [
          { label: i18n.t('aps.capacity_management_page.k0'), value: 'available' },
          { label: i18n.t('aps.capacity_management_page.k14'), value: 'allocated' },
          { label: i18n.t('aps.capacity_management_page.k15'), value: 'consumed' },
          { label: i18n.t('aps.capacity_management_page.k2'), value: 'maintenance' },
          { label: i18n.t('aps.capacity_management_page.k16'), value: 'released' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formColCount: 2,
  createTitle: i18n.t('aps.capacity_management_page.k4'),
  editTitle: i18n.t('aps.capacity_management_page.k4'),
};
