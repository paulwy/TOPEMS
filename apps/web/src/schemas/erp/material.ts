/**
 * 物料管理 Schema — 驱动 MaterialManagementPage 的完整 CRUD
 *
 * 包含表单分组、状态徽章、筛选、自定义头部统计等高级功能。
 */

import React from 'react';
import type { EntitySchema, SchemaField } from '@/schema';
import i18n from '@/i18n';

/**
 * 物料管理 Schema
 */
export const materialSchema: EntitySchema = {
  entity: 'material',
  title: i18n.t('schema:erp.material.meta.title'),
  description: i18n.t('schema:erp.material.meta.description'),

  api: {
    module: 'erp',
    resource: 'materials',
  },

  fields: [
    {
      name: 'material_code',
      label: i18n.t('schema:erp.material.material_code.label'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'material_name',
      label: i18n.t('schema:erp.material.material_name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'specification',
      label: i18n.t('schema:erp.material.specification.label'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'category',
      label: i18n.t('schema:erp.material.category.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '电子元件', label: i18n.t('schema:erp.material.category.option.电子元件') },
          { value: '机械零件', label: i18n.t('schema:erp.material.category.option.机械零件') },
          { value: '原材料', label: i18n.t('schema:erp.material.category.option.原材料') },
          { value: '包装材料', label: i18n.t('schema:erp.material.category.option.包装材料') },
          { value: '辅助材料', label: i18n.t('schema:erp.material.category.option.辅助材料') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'unit',
      label: i18n.t('schema:erp.material.unit.label'),
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'unit_price',
      label: i18n.t('schema:erp.material.unit_price.label'),
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const price = row.unit_price as number | undefined;
        return price ? `¥${price.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '-';
      },
    },
    {
      name: 'supplier_id',
      label: i18n.t('schema:erp.material.supplier_id.label'),
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'supplier_name',
      label: i18n.t('schema:erp.material.supplier_name.label'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.material.status.label'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:erp.material.status.option.active') },
          { value: 'inactive', label: i18n.t('schema:erp.material.status.option.inactive') },
          { value: 'obsolete', label: i18n.t('schema:erp.material.status.option.obsolete') },
        ],
      },
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'barcode',
      label: i18n.t('schema:erp.material.barcode.label'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'weight',
      label: i18n.t('schema:erp.material.weight.label'),
      type: 'number',
      defaultValue: 0,
      showInList: false,
    },
    {
      name: 'volume',
      label: i18n.t('schema:erp.material.volume.label'),
      type: 'number',
      defaultValue: 0,
      showInList: false,
    },
    {
      name: 'description',
      label: i18n.t('schema:erp.material.description.label'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'material_code',
      'material_name',
      'specification',
      'category',
      'unit',
      'unit_price',
      'supplier_name',
      'status',
    ],
    searchFields: ['material_code', 'material_name', 'barcode'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        obsolete: 'error',
      },
      labelMap: {
        active: i18n.t('schema:erp.material.status.option.active'),
        inactive: i18n.t('schema:erp.material.status.option.inactive'),
        obsolete: i18n.t('schema:erp.material.status.option.obsolete'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.material.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.material.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.material.filter.status.option.active'), value: 'active' },
          { label: i18n.t('schema:erp.material.filter.status.option.inactive'), value: 'inactive' },
          { label: i18n.t('schema:erp.material.filter.status.option.obsolete'), value: 'obsolete' },
        ],
      },
      {
        id: 'category',
        label: i18n.t('schema:erp.material.filter.category.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.material.filter.category.option.all'), value: 'all' },
          {
            label: i18n.t('schema:erp.material.filter.category.option.电子元件'),
            value: '电子元件',
          },
          {
            label: i18n.t('schema:erp.material.filter.category.option.机械零件'),
            value: '机械零件',
          },
          { label: i18n.t('schema:erp.material.filter.category.option.原材料'), value: '原材料' },
          {
            label: i18n.t('schema:erp.material.filter.category.option.包装材料'),
            value: '包装材料',
          },
          {
            label: i18n.t('schema:erp.material.filter.category.option.辅助材料'),
            value: '辅助材料',
          },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.material.section.0.title'),
      fields: ['material_code', 'material_name', 'specification', 'category', 'unit'],
    },
    {
      title: i18n.t('schema:erp.material.section.1.title'),
      fields: ['unit_price', 'supplier_name', 'barcode'],
    },
    {
      title: i18n.t('schema:erp.material.section.2.title'),
      fields: ['weight', 'volume'],
    },
    {
      title: i18n.t('schema:erp.material.section.3.title'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.material.meta.createTitle'),
  editTitle: i18n.t('schema:erp.material.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.material.meta.detailTitle'),
};
