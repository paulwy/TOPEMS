/**
 * 资产管理 Schema — 驱动 AssetManagementPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const assetSchema: EntitySchema = {
  entity: 'asset',
  title: i18n.t('schema:erp.asset.meta.title'),
  description: i18n.t('schema:erp.asset.meta.description'),

  api: {
    module: 'erp',
    resource: 'assets',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('schema:erp.asset.name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'asset_number',
      label: i18n.t('schema:erp.asset.asset_number.label'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'category',
      label: i18n.t('schema:erp.asset.category.label'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'brand',
      label: i18n.t('schema:erp.asset.brand.label'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'model',
      label: i18n.t('schema:erp.asset.model.label'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'serial_number',
      label: i18n.t('schema:erp.asset.serial_number.label'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'manufacturer',
      label: i18n.t('schema:erp.asset.manufacturer.label'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'department',
      label: i18n.t('schema:erp.asset.department.label'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'location',
      label: i18n.t('schema:erp.asset.location.label'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'responsible_id',
      label: i18n.t('schema:erp.asset.responsible_id.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'purchase_date',
      label: i18n.t('schema:erp.asset.purchase_date.label'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'purchase_amount',
      label: i18n.t('schema:erp.asset.purchase_amount.label'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.purchase_amount as number | undefined;
        return amount ? `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '-';
      },
    },
    {
      name: 'rated_power',
      label: i18n.t('schema:erp.asset.rated_power.label'),
      type: 'number',
      defaultValue: 0,
      showInList: false,
    },
    {
      name: 'rated_voltage',
      label: i18n.t('schema:erp.asset.rated_voltage.label'),
      type: 'number',
      defaultValue: 0,
      showInList: false,
    },
    {
      name: 'rated_current',
      label: i18n.t('schema:erp.asset.rated_current.label'),
      type: 'number',
      defaultValue: 0,
      showInList: false,
    },
    {
      name: 'specifications',
      label: i18n.t('schema:erp.asset.specifications.label'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.asset.status.label'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:erp.asset.status.option.active') },
          { value: 'idle', label: i18n.t('schema:erp.asset.status.option.idle') },
          { value: 'maintenance', label: i18n.t('schema:erp.asset.status.option.maintenance') },
          { value: 'retired', label: i18n.t('schema:erp.asset.status.option.retired') },
          { value: 'transferred', label: i18n.t('schema:erp.asset.status.option.transferred') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
  ],

  list: {
    columns: ['name', 'asset_number', 'category', 'department', 'purchase_amount', 'status'],
    searchFields: ['name', 'asset_number', 'category'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        idle: 'warning',
        maintenance: 'info',
        retired: 'error',
        transferred: 'default',
      },
      labelMap: {
        active: i18n.t('schema:erp.asset.status.option.active'),
        idle: i18n.t('schema:erp.asset.status.option.idle'),
        maintenance: i18n.t('schema:erp.asset.status.option.maintenance'),
        retired: i18n.t('schema:erp.asset.status.option.retired'),
        transferred: i18n.t('schema:erp.asset.status.option.transferred'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.asset.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.asset.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.asset.filter.status.option.active'), value: 'active' },
          { label: i18n.t('schema:erp.asset.filter.status.option.idle'), value: 'idle' },
          {
            label: i18n.t('schema:erp.asset.filter.status.option.maintenance'),
            value: 'maintenance',
          },
          { label: i18n.t('schema:erp.asset.filter.status.option.retired'), value: 'retired' },
          {
            label: i18n.t('schema:erp.asset.filter.status.option.transferred'),
            value: 'transferred',
          },
        ],
      },
      {
        id: 'category',
        label: i18n.t('schema:erp.asset.filter.category.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.asset.filter.category.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.asset.filter.category.option.电子设备'), value: i18n.t('shared.asset.k0') },
          { label: i18n.t('schema:erp.asset.filter.category.option.机械设备'), value: i18n.t('shared.asset.k1') },
          { label: i18n.t('schema:erp.asset.filter.category.option.办公设备'), value: i18n.t('shared.asset.k2') },
          { label: i18n.t('schema:erp.asset.filter.category.option.家具'), value: i18n.t('shared.asset.k3') },
          { label: i18n.t('schema:erp.asset.filter.category.option.其他'), value: i18n.t('shared.asset.k4') },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.asset.section.0.title'),
      fields: [
        'name',
        'asset_number',
        'category',
        'brand',
        'model',
        'serial_number',
        'manufacturer',
      ],
    },
    {
      title: i18n.t('schema:erp.asset.section.1.title'),
      fields: ['department', 'location', 'responsible_id'],
    },
    {
      title: i18n.t('schema:erp.asset.section.2.title'),
      fields: ['purchase_date', 'purchase_amount'],
    },
    {
      title: i18n.t('schema:erp.asset.section.3.title'),
      fields: ['rated_power', 'rated_voltage', 'rated_current', 'specifications'],
    },
    {
      title: i18n.t('schema:erp.asset.section.4.title'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.asset.meta.createTitle'),
  editTitle: i18n.t('schema:erp.asset.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.asset.meta.detailTitle'),
};
