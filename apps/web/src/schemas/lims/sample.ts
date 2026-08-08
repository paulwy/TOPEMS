/**
 * 样品管理 Schema — 驱动 SampleReceivePage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

export const sampleSchema: EntitySchema = {
  entity: 'limsSample',
  title: '样本接收',
  description: '管理样品接收、登记、状态流转及生命周期追踪',

  api: {
    module: 'lims',
    resource: 'samples',
  },

  fields: [
    {
      name: 'sample_no',
      label: '样品编号',
      type: 'text',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => String(row.sample_no || row.id || '-'),
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: '样品名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'description',
      label: '检测项目',
      type: 'textarea',
      listWidth: 180,
      renderCell: (row: Record<string, unknown>) => String(row.description || '-'),
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: '待登记',
      options: {
        type: 'static',
        options: [
          { value: '待登记', label: '待登记' },
          { value: '待接收', label: '待接收' },
          { value: '已接收', label: '已接收' },
          { value: '待确认', label: '待确认' },
          { value: '已确认', label: '已确认' },
          { value: '检测中', label: '检测中' },
          { value: '已完成', label: '已完成' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'received_date',
      label: '接收日期',
      type: 'date',
      listWidth: 130,
    },
    {
      name: 'sample_type',
      label: '样品类型',
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'source',
      label: '来源',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'quantity',
      label: '数量',
      type: 'number',
      listWidth: 80,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 70,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'location',
      label: '存放位置',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'responsible_person',
      label: '负责人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'storage_condition',
      label: '储存条件',
      type: 'text',
      showInList: false,
    },
  ],

  list: {
    columns: ['sample_no', 'name', 'description', 'status', 'received_date', 'location'],
    searchFields: ['sample_no', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        待登记: 'default',
        待接收: 'warning',
        已接收: 'primary',
        待确认: 'info',
        已确认: 'success',
        检测中: 'info',
        已完成: 'success',
      },
      labelMap: {
        待登记: '待登记',
        待接收: '待接收',
        已接收: '已接收',
        待确认: '待确认',
        已确认: '已确认',
        检测中: '检测中',
        已完成: '已完成',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待登记', value: '待登记' },
          { label: '待接收', value: '待接收' },
          { label: '已接收', value: '已接收' },
          { label: '待确认', value: '待确认' },
          { label: '已确认', value: '已确认' },
          { label: '检测中', value: '检测中' },
          { label: '已完成', value: '已完成' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'description', 'sample_type', 'source'],
    },
    {
      title: '状态与日期',
      fields: ['status', 'received_date'],
    },
    {
      title: '存储与数量',
      fields: ['quantity', 'unit', 'storage_condition', 'location', 'responsible_person'],
    },
  ],

  formColCount: 2,
  createTitle: '样本登记',
  editTitle: '编辑样品',
  detailTitle: '样本详情',
};
