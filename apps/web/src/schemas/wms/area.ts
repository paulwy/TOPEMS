import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import i18n from '@/i18n';

export const areaSchema: EntitySchema & SchemaExtensions = {
  entity: 'wms_area',
  title: i18n.t('wms.area.k0'),
  description: i18n.t('wms.area.k1'),

  api: {
    module: 'wms',
    resource: 'areas',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('wms.area.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'code',
      label: i18n.t('wms.area.k3'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'area_type',
      label: i18n.t('wms.area.k4'),
      type: 'select',
      required: true,
      defaultValue: 'zone',
      options: {
        type: 'static',
        options: [
          { value: 'warehouse', label: i18n.t('wms.area.k5') },
          { value: 'zone', label: i18n.t('wms.area.k6') },
          { value: 'area', label: i18n.t('wms.area.k7') },
          { value: 'location', label: i18n.t('wms.area.k8') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'parentId',
      label: i18n.t('wms.area.k9'),
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'capacity',
      label: i18n.t('wms.area.k10'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('wms.area.k11'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('wms.area.k12') },
          { value: 'inactive', label: i18n.t('wms.area.k13') },
          { value: 'maintenance', label: i18n.t('wms.area.k14') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['name', 'code', 'area_type', 'capacity', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        maintenance: 'warning',
      },
      labelMap: {
        active: i18n.t('wms.area.k15'),
        inactive: i18n.t('wms.area.k16'),
        maintenance: i18n.t('wms.area.k17'),
      },
    },
  },

  tree: {
    keyField: 'id',
    parentField: 'parentId',
    labelField: 'name',
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('wms.area.k18'),
      fields: ['name', 'code', 'area_type'],
    },
    {
      title: i18n.t('wms.area.k19'),
      fields: ['parentId'],
    },
    {
      title: i18n.t('wms.area.k20'),
      fields: ['capacity', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('wms.area.k21'),
  editTitle: i18n.t('wms.area.k22'),
  detailTitle: i18n.t('wms.area.k23'),
};
