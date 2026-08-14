/**
 * 库位 Schema
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const locationSchema: EntitySchema = {
  entity: 'location',
  title: i18n.t('wms.location.k0'),
  description: i18n.t('wms.location.k1'),

  api: {
    module: 'wms',
    resource: 'locations',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('wms.location.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: i18n.t('wms.location.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'warehouse_id',
      label: i18n.t('wms.location.k4'),
      type: 'text',
      renderCell: (row: Record<string, unknown>) => {
        return (row as Record<string, unknown>)._warehouse_name
          ? String((row as Record<string, unknown>)._warehouse_name)
          : String(row.warehouse_id || '-');
      },
    },
    {
      name: 'zone_name',
      label: i18n.t('wms.location.k5'),
      type: 'text',
    },
    {
      name: 'location_type',
      label: i18n.t('wms.location.k6'),
      type: 'select',
      defaultValue: 'storage',
      options: {
        type: 'static',
        options: [
          { value: 'storage', label: i18n.t('wms.location.k7') },
          { value: 'picking', label: i18n.t('wms.location.k8') },
          { value: 'receiving', label: i18n.t('wms.location.k9') },
          { value: 'shipping', label: i18n.t('wms.location.k10') },
          { value: 'staging', label: i18n.t('wms.location.k11') },
          { value: 'quarantine', label: i18n.t('wms.location.k12') },
          { value: 'returned', label: i18n.t('wms.location.k13') },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const typeMap: Record<string, string> = {
          storage: i18n.t('wms.location.k14'),
          picking: i18n.t('wms.location.k15'),
          receiving: i18n.t('wms.location.k16'),
          shipping: i18n.t('wms.location.k17'),
          staging: i18n.t('wms.location.k18'),
          quarantine: i18n.t('wms.location.k19'),
          returned: i18n.t('wms.location.k20'),
        };
        return typeMap[row.location_type as string] || String(row.location_type || '-');
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'status',
      label: i18n.t('wms.location.k21'),
      type: 'text',
      readonly: true,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, string> = {
          empty: i18n.t('wms.location.k22'),
          partially_filled: i18n.t('wms.location.k23'),
          full: i18n.t('wms.location.k24'),
          inactive: i18n.t('wms.location.k25'),
        };
        return statusMap[row.status as string] || String(row.status || '-');
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'capacity',
      label: i18n.t('wms.location.k26'),
      type: 'number',
    },
    {
      name: 'occupied_quantity',
      label: i18n.t('wms.location.k27'),
      type: 'number',
      readonly: true,
    },
    {
      name: 'zone_id',
      label: i18n.t('wms.location.id_28'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'aisle',
      label: i18n.t('wms.location.k29'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'row',
      label: i18n.t('wms.location.k30'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'column',
      label: i18n.t('wms.location.k31'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'layer',
      label: i18n.t('wms.location.k32'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'volume',
      label: i18n.t('wms.location.k33'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'weight_limit',
      label: i18n.t('wms.location.k34'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'temperature_zone',
      label: i18n.t('wms.location.k35'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'barcode',
      label: i18n.t('wms.location.k36'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'rfid',
      label: 'RFID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'remarks',
      label: i18n.t('wms.location.k37'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'warehouse_id',
      'zone_name',
      'location_type',
      'status',
      'capacity',
      'occupied_quantity',
    ],
    searchFields: ['code', 'name'],
    pageSize: 10,
  },

  actions: ['create', 'edit', 'detail', 'delete'],
  formColCount: 2,
  createTitle: i18n.t('wms.location.k38'),
  editTitle: i18n.t('wms.location.k39'),
  detailTitle: i18n.t('wms.location.k40'),
};
