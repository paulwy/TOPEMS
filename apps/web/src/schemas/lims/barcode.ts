/**
 * 条码管理 Schema — 驱动 BarcodePage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

const statusColorMap: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  正常: 'success',
  已打印: 'info',
  已扫描: 'primary',
  停用: 'default',
  normal: 'success',
  printed: 'info',
  scanned: 'primary',
  disabled: 'default',
};

const statusLabelMap: Record<string, string> = {
  正常: '正常',
  已打印: '已打印',
  已扫描: '已扫描',
  停用: '停用',
  normal: '正常',
  printed: '已打印',
  scanned: '已扫描',
  disabled: '停用',
};

export const barcodeSchema: EntitySchema = {
  entity: 'limsBarcode',
  title: '条码管理',
  description: '管理条码生成、打印、扫描及全流程追踪',

  api: {
    module: 'lims',
    resource: 'barcodes',
  },

  fields: [
    {
      name: 'barcode',
      label: '条码',
      type: 'text',
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'barcode_type',
      label: '条码类型',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'format',
      label: '格式',
      type: 'select',
      defaultValue: 'CODE128',
      options: {
        type: 'static',
        options: [
          { value: 'CODE128', label: 'CODE128' },
          { value: 'CODE39', label: 'CODE39' },
          { value: 'EAN13', label: 'EAN13' },
          { value: 'EAN8', label: 'EAN8' },
          { value: 'UPC', label: 'UPC' },
          { value: 'QR_CODE', label: '二维码' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'sample_name',
      label: '关联样品',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => String(row.sample_name || '-'),
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: '正常',
      options: {
        type: 'static',
        options: [
          { value: '正常', label: '正常' },
          { value: '已打印', label: '已打印' },
          { value: '已扫描', label: '已扫描' },
          { value: '停用', label: '停用' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'content',
      label: '条码内容',
      type: 'text',
      showInList: false,
    },
    {
      name: 'generated_at',
      label: '生成时间',
      type: 'date',
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => {
        const value = row.generated_at;
        if (!value) return '-';
        return new Date(value as string).toLocaleDateString('zh-CN');
      },
    },
    {
      name: 'printed_at',
      label: '打印时间',
      type: 'date',
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => {
        const value = row.printed_at;
        if (!value) return '-';
        return new Date(value as string).toLocaleDateString('zh-CN');
      },
    },
    {
      name: 'scanned_at',
      label: '扫描时间',
      type: 'date',
      showInList: false,
    },
    {
      name: 'created_by',
      label: '创建人',
      type: 'text',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'date',
      showInList: false,
    },
    {
      name: 'quantity',
      label: '数量',
      type: 'number',
      defaultValue: 1,
      showInList: false,
    },
    {
      name: 'prefix',
      label: '前缀',
      type: 'text',
      showInList: false,
    },
    {
      name: 'sample_id',
      label: '关联样品ID',
      type: 'text',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'barcode',
      'barcode_type',
      'format',
      'sample_name',
      'status',
      'generated_at',
      'printed_at',
    ],
    searchFields: ['barcode', 'sample_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: statusColorMap,
      labelMap: statusLabelMap,
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '正常', value: '正常' },
          { label: '已打印', value: '已打印' },
          { label: '已扫描', value: '已扫描' },
          { label: '停用', value: '停用' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '条码信息',
      fields: ['barcode_type', 'format', 'quantity', 'prefix'],
    },
    {
      title: '关联信息',
      fields: ['sample_id', 'content'],
    },
  ],

  formColCount: 2,
  createTitle: '生成条码',
  editTitle: '编辑条码',
  detailTitle: '条码详情',
};
