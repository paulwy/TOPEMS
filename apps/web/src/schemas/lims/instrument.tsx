/**
 * 仪器管理 Schema — 驱动 InstrumentPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

export const instrumentSchema: EntitySchema = {
  entity: 'limsInstrument',
  title: '仪器管理',
  description: '管理仪器基础信息，包括仪器编号、名称、型号、厂商、位置、状态、校准日期等',

  api: {
    module: 'lims',
    resource: 'instruments',
  },

  fields: [
    {
      name: 'code',
      label: '仪器编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '仪器名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'type',
      label: '类型',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'model',
      label: '型号',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'manufacturer',
      label: '生产厂家',
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'serial_number',
      label: '序列号',
      type: 'text',
      listWidth: 130,
    },
    {
      name: 'location',
      label: '存放位置',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 200 }],
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
          { value: '校准中', label: '校准中' },
          { value: '维修中', label: '维修中' },
          { value: '停用', label: '停用' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'purchase_date',
      label: '购买日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'calibration_date',
      label: '最近校准日期',
      type: 'date',
      listWidth: 130,
    },
    {
      name: 'next_calibration_date',
      label: '下次校准日期',
      type: 'date',
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => {
        const value = row.next_calibration_date;
        if (!value) return '-';
        const date = new Date(value as string);
        const now = new Date();
        const needsCalibration = date < now;
        return React.createElement(
          'span',
          {
            style: {
              color: needsCalibration ? 'var(--mui-palette-warning-main)' : 'inherit',
            },
          },
          date.toLocaleDateString('zh-CN')
        );
      },
    },
    {
      name: 'responsible_person',
      label: '负责人',
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'description',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'type',
      'manufacturer',
      'location',
      'status',
      'next_calibration_date',
    ],
    searchFields: ['code', 'name', 'type'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        正常: 'success',
        校准中: 'info',
        维修中: 'warning',
        停用: 'default',
      },
      labelMap: {
        正常: '正常',
        校准中: '校准中',
        维修中: '维修中',
        停用: '停用',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '正常', value: '正常' },
          { label: '校准中', value: '校准中' },
          { label: '维修中', value: '维修中' },
          { label: '停用', value: '停用' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'type', 'model'],
    },
    {
      title: '生产与存放',
      fields: ['manufacturer', 'serial_number', 'location', 'responsible_person'],
    },
    {
      title: '状态与日期',
      fields: ['status', 'purchase_date', 'calibration_date', 'next_calibration_date'],
    },
    {
      title: '其他',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增仪器',
  editTitle: '编辑仪器',
  detailTitle: '仪器详情',
};
