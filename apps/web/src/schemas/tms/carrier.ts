import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const carrierSchema: EntitySchema = {
  entity: 'carrier',
  title: i18n.t('tms.carrier_management_page.k14'),
  description: i18n.t('tms.carrier_management_page.k15'),

  api: {
    module: 'tms',
    resource: 'carriers',
    listMethod: 'list',
    getMethod: 'get',
    createMethod: 'create',
    updateMethod: 'update',
    deleteMethod: 'delete',
  },

  fields: [
    { name: 'carrier_no', label: i18n.t('tms.carrier_management_page.k30'), type: 'text', required: true, readonlyOnEdit: true, sortable: true, listWidth: 140 },
    { name: 'name', label: i18n.t('tms.carrier_management_page.k31'), type: 'text', required: true, listWidth: 160 },
    { name: 'contact_person', label: i18n.t('tms.carrier_management_page.k32'), type: 'text', listWidth: 120 },
    { name: 'contact_phone', label: i18n.t('tms.carrier_management_page.k33'), type: 'text', listWidth: 140 },
    { name: 'service_area', label: i18n.t('tms.carrier_management_page.k34'), type: 'text', listWidth: 140 },
    {
      name: 'status', label: i18n.t('tms.carrier_management_page.k35'), type: 'select', defaultValue: 'active',
      options: { type: 'static', options: [
        { value: 'active', label: i18n.t('tms.carrier_management_page.k0') },
        { value: 'inactive', label: i18n.t('tms.carrier_management_page.k1') },
      ]},
      listWidth: 100,
    },
  ],

  list: {
    columns: ['carrier_no', 'name', 'contact_person', 'contact_phone', 'service_area', 'status'],
    searchFields: ['carrier_no', 'name', 'contact_person'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: { active: 'success', inactive: 'default' },
      labelMap: { active: i18n.t('tms.carrier_management_page.k2'), inactive: i18n.t('tms.carrier_management_page.k3') },
    },
    filters: [
      { id: 'status', label: i18n.t('tms.carrier_management_page.k23'), type: 'select', options: [
        { label: i18n.t('tms.carrier_management_page.k0'), value: 'active' },
        { label: i18n.t('tms.carrier_management_page.k1'), value: 'inactive' },
      ]},
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],
  formColCount: 2,
  createTitle: i18n.t('tms.carrier_management_page.k29'),
  editTitle: i18n.t('tms.carrier_management_page.k28'),
};
