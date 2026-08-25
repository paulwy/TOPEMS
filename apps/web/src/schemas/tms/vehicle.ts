import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const vehicleSchema: EntitySchema = {
  entity: 'vehicle',
  title: i18n.t('tms.vehicle_management_page.k15'),
  description: i18n.t('tms.vehicle_management_page.k16'),

  api: {
    module: 'tms',
    resource: 'vehicles',
    listMethod: 'list',
    getMethod: 'get',
    createMethod: 'create',
    updateMethod: 'update',
    deleteMethod: 'delete',
  },

  fields: [
    {
      name: 'vehicle_no',
      label: i18n.t('tms.vehicle_management_page.k31'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'plate_number',
      label: i18n.t('tms.vehicle_management_page.k32'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'vehicle_type',
      label: i18n.t('tms.vehicle_management_page.k33'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'capacity',
      label: i18n.t('tms.vehicle_management_page.k34'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'carrier_id',
      label: i18n.t('tms.vehicle_management_page.id_35'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'status',
      label: i18n.t('tms.vehicle_management_page.k36'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('tms.vehicle_management_page.k0') },
          { value: 'inactive', label: i18n.t('tms.vehicle_management_page.k1') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'notes',
      label: i18n.t('tms.vehicle_management_page.k37'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['vehicle_no', 'plate_number', 'vehicle_type', 'capacity', 'carrier_id', 'status'],
    searchFields: ['vehicle_no', 'plate_number', 'vehicle_type'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: { active: 'success', inactive: 'default', maintenance: 'warning' },
      labelMap: {
        active: i18n.t('tms.vehicle_management_page.k2'),
        inactive: i18n.t('tms.vehicle_management_page.k3'),
        maintenance: i18n.t('tms.vehicle_management_page.k4'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('tms.vehicle_management_page.k24'),
        type: 'select',
        options: [
          { label: i18n.t('tms.vehicle_management_page.k0'), value: 'active' },
          { label: i18n.t('tms.vehicle_management_page.k1'), value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],
  formColCount: 2,
  createTitle: i18n.t('tms.vehicle_management_page.k30'),
  editTitle: i18n.t('tms.vehicle_management_page.k29'),
};
