import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const routeSchema: EntitySchema = {
  entity: 'route',
  title: i18n.t('tms.route_management_page.k14'),
  description: i18n.t('tms.route_management_page.k15'),

  api: {
    module: 'tms',
    resource: 'routes',
    listMethod: 'list',
    getMethod: 'get',
    createMethod: 'create',
    updateMethod: 'update',
    deleteMethod: 'delete',
  },

  fields: [
    { name: 'route_no', label: i18n.t('tms.route_management_page.k31'), type: 'text', required: true, readonlyOnEdit: true, sortable: true, listWidth: 140 },
    { name: 'name', label: i18n.t('tms.route_management_page.k32'), type: 'text', required: true, listWidth: 160 },
    { name: 'origin', label: i18n.t('tms.route_management_page.k33'), type: 'text', listWidth: 140 },
    { name: 'destination', label: i18n.t('tms.route_management_page.k34'), type: 'text', listWidth: 140 },
    { name: 'distance_km', label: i18n.t('tms.route_management_page.km_35'), type: 'number', listWidth: 120 },
    { name: 'estimated_hours', label: i18n.t('tms.route_management_page.h_36'), type: 'number', listWidth: 120 },
    {
      name: 'status', label: i18n.t('tms.route_management_page.k37'), type: 'select', defaultValue: 'active',
      options: { type: 'static', options: [
        { value: 'active', label: i18n.t('tms.route_management_page.k0') },
        { value: 'inactive', label: i18n.t('tms.route_management_page.k1') },
      ]},
      listWidth: 100,
    },
  ],

  list: {
    columns: ['route_no', 'name', 'origin', 'destination', 'distance_km', 'estimated_hours', 'status'],
    searchFields: ['route_no', 'name', 'origin', 'destination'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: { active: 'success', inactive: 'default' },
      labelMap: { active: i18n.t('tms.route_management_page.k2'), inactive: i18n.t('tms.route_management_page.k3') },
    },
    filters: [
      { id: 'status', label: i18n.t('tms.route_management_page.k24'), type: 'select', options: [
        { label: i18n.t('tms.route_management_page.k0'), value: 'active' },
        { label: i18n.t('tms.route_management_page.k1'), value: 'inactive' },
      ]},
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],
  formColCount: 2,
  createTitle: i18n.t('tms.route_management_page.k30'),
  editTitle: i18n.t('tms.route_management_page.k29'),
};
