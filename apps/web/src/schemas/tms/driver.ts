import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const driverSchema: EntitySchema = {
  entity: 'driver',
  title: i18n.t('tms.driver_management_page.k14'),
  description: i18n.t('tms.driver_management_page.k15'),

  api: {
    module: 'tms',
    resource: 'drivers',
    listMethod: 'list',
    getMethod: 'get',
    createMethod: 'create',
    updateMethod: 'update',
    deleteMethod: 'delete',
  },

  fields: [
    {
      name: 'driver_no',
      label: i18n.t('tms.driver_management_page.k30'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('tms.driver_management_page.k31'),
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'phone',
      label: i18n.t('tms.driver_management_page.k32'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'license_no',
      label: i18n.t('tms.driver_management_page.k33'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'license_type',
      label: i18n.t('tms.driver_management_page.k34'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('tms.driver_management_page.k35'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('tms.driver_management_page.k0') },
          { value: 'inactive', label: i18n.t('tms.driver_management_page.k1') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['driver_no', 'name', 'phone', 'license_no', 'license_type', 'status'],
    searchFields: ['driver_no', 'name', 'phone'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: { active: 'success', inactive: 'default' },
      labelMap: {
        active: i18n.t('tms.driver_management_page.k2'),
        inactive: i18n.t('tms.driver_management_page.k3'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('tms.driver_management_page.k23'),
        type: 'select',
        options: [
          { label: i18n.t('tms.driver_management_page.k0'), value: 'active' },
          { label: i18n.t('tms.driver_management_page.k1'), value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],
  formColCount: 2,
  createTitle: i18n.t('tms.driver_management_page.k29'),
  editTitle: i18n.t('tms.driver_management_page.k28'),
};
