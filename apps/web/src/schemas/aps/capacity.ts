import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

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

  fields: [
    {
      name: 'work_center_id',
      label: i18n.t('aps.capacity_management_page.k8'),
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'work_center_name',
      label: i18n.t('aps.capacity_management_page.k8'),
      type: 'text',
      sortable: true,
      listWidth: 160,
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
      options: {
        type: 'static',
        options: [
          { value: 'available', label: i18n.t('aps.capacity_management_page.k0') },
          { value: 'busy', label: i18n.t('aps.capacity_management_page.k1') },
          { value: 'maintenance', label: i18n.t('aps.capacity_management_page.k2') },
          { value: 'offline', label: i18n.t('aps.capacity_management_page.k3') },
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
        busy: 'warning',
        maintenance: 'info',
        offline: 'default',
      },
      labelMap: {
        available: i18n.t('aps.capacity_management_page.k0'),
        busy: i18n.t('aps.capacity_management_page.k1'),
        maintenance: i18n.t('aps.capacity_management_page.k2'),
        offline: i18n.t('aps.capacity_management_page.k3'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('aps.capacity_management_page.k13'),
        type: 'select',
        options: [
          { label: i18n.t('aps.capacity_management_page.k0'), value: 'available' },
          { label: i18n.t('aps.capacity_management_page.k1'), value: 'busy' },
          { label: i18n.t('aps.capacity_management_page.k2'), value: 'maintenance' },
          { label: i18n.t('aps.capacity_management_page.k3'), value: 'offline' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formColCount: 2,
  createTitle: i18n.t('aps.capacity_management_page.k4'),
  editTitle: i18n.t('aps.capacity_management_page.k4'),
};
