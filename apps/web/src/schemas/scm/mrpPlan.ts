import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const statusColorConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  draft: { label: '草稿', color: 'default' },
  calculated: { label: '已运算', color: 'success' },
  processing: { label: '处理中', color: 'warning' },
  cancelled: { label: '已取消', color: 'error' },
};

export const mrpPlanSchema: EntitySchema = {
  entity: 'mrpPlan',
  title: 'MRP计划',
  description: 'MRP物料需求计划管理，包括计划创建、MRP运算、结果查看',

  api: {
    module: 'scm',
    resource: 'mrpPlans',
  },

  fields: [
    {
      name: 'plan_code',
      label: '计划编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'plan_name',
      label: '计划名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      hideInForm: true,
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'calculated', label: '已运算' },
          { value: 'processing', label: '处理中' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const value = String(row.status ?? 'draft');
        const config = statusColorConfig[value] || statusColorConfig.draft;
        return React.createElement(Chip, {
          label: config.label,
          size: 'small',
          color: config.color,
          variant: 'outlined',
        });
      },
    },
    {
      name: 'calculated_at',
      label: '运算时间',
      type: 'text',
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.calculated_at as string | undefined;
        return val ? new Date(val).toLocaleString('zh-CN') : '-';
      },
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
  ],

  list: {
    columns: [
      'plan_code',
      'plan_name',
      'start_date',
      'end_date',
      'status',
      'calculated_at',
      'description',
    ],
    searchFields: ['plan_name', 'plan_code', 'description'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        calculated: 'success',
        processing: 'warning',
        cancelled: 'error',
      },
      labelMap: {
        draft: '草稿',
        calculated: '已运算',
        processing: '处理中',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已运算', value: 'calculated' },
          { label: '处理中', value: 'processing' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['plan_name', 'plan_code', 'start_date', 'end_date'],
    },
    {
      title: '其他',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新建MRP计划',
  editTitle: '编辑MRP计划',
  detailTitle: 'MRP计划详情',
};
