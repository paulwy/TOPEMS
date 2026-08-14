/**
 * 仓库管理 Schema — 驱动 WarehouseManagementPage 的完整 CRUD
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const warehouseSchema: EntitySchema = {
  entity: 'warehouse',
  title: i18n.t('wms.warehouse.k0'),
  description: i18n.t('wms.warehouse.k1'),

  api: {
    module: 'wms',
    resource: 'warehouses',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('wms.warehouse.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      tableEditable: true,
    },
    {
      name: 'code',
      label: i18n.t('wms.warehouse.k3'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'address',
      label: i18n.t('wms.warehouse.k4'),
      type: 'text',
      listWidth: 180,
      tableEditable: true,
    },
    {
      name: 'manager',
      label: i18n.t('wms.warehouse.k5'),
      type: 'text',
      listWidth: 100,
      tableEditable: true,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'phone',
      label: i18n.t('wms.warehouse.k6'),
      type: 'text',
      listWidth: 120,
      tableEditable: true,
    },
    {
      name: 'status',
      label: i18n.t('wms.warehouse.k7'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('wms.warehouse.k8') },
          { value: 'inactive', label: i18n.t('wms.warehouse.k9') },
          { value: 'maintenance', label: i18n.t('wms.warehouse.k10') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
  ],

  list: {
    columns: ['name', 'code', 'address', 'manager', 'phone', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    inlineEditable: true,
    inlineEditMode: 'cell',
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'info',
        maintenance: 'warning',
      },
      labelMap: {
        active: i18n.t('wms.warehouse.k11'),
        inactive: i18n.t('wms.warehouse.k12'),
        maintenance: i18n.t('wms.warehouse.k13'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('wms.warehouse.k14'),
        type: 'select',
        options: [
          { label: i18n.t('wms.warehouse.k15'), value: 'all' },
          { label: i18n.t('wms.warehouse.k16'), value: 'active' },
          { label: i18n.t('wms.warehouse.k17'), value: 'inactive' },
          { label: i18n.t('wms.warehouse.k18'), value: 'maintenance' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('wms.warehouse.k19'),
      fields: ['name', 'code'],
    },
    {
      title: i18n.t('wms.warehouse.k20'),
      fields: ['address', 'manager', 'phone'],
    },
    {
      title: i18n.t('wms.warehouse.k21'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('wms.warehouse.k22'),
  editTitle: i18n.t('wms.warehouse.k23'),
  detailTitle: i18n.t('wms.warehouse.k24'),
};
