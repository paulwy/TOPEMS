/**
 * 检验任务 Schema — 驱动 InspectionTaskPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

const statusColorMap: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  待分配: 'warning',
  已分配: 'info',
  进行中: 'primary',
  已完成: 'success',
  已终止: 'error',
  pending: 'warning',
  assigned: 'info',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'error',
};

const statusLabelMap: Record<string, string> = {
  待分配: '待分配',
  已分配: '已分配',
  进行中: '进行中',
  已完成: '已完成',
  已终止: '已终止',
  pending: '待分配',
  assigned: '已分配',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已终止',
};

export const inspectionTaskSchema: EntitySchema = {
  entity: 'limsInspectionTask',
  title: '检验任务',
  description: '管理检验任务分配、执行与记录',

  api: {
    module: 'lims',
    resource: 'inspection-tasks',
  },

  fields: [
    {
      name: 'task_no',
      label: '任务编号',
      type: 'text',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => String(row.task_no || row.id || '-'),
    },
    {
      name: 'sample_id',
      label: '样品',
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'process_id',
      label: '检验流程',
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'current_step',
      label: '当前步骤',
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const step = row.current_step;
        if (step === undefined || step === null) return '-';
        return `第 ${step} 步`;
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: '待分配',
      options: {
        type: 'static',
        options: [
          { value: '待分配', label: '待分配' },
          { value: '已分配', label: '已分配' },
          { value: '进行中', label: '进行中' },
          { value: '已完成', label: '已完成' },
          { value: '已终止', label: '已终止' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'inspector',
      label: '检验员',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'started_at',
      label: '开始时间',
      type: 'date',
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        const value = row.started_at;
        if (!value) return '-';
        return new Date(value as string).toLocaleDateString('zh-CN');
      },
    },
    {
      name: 'completed_at',
      label: '完成时间',
      type: 'date',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'date',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'task_no',
      'sample_id',
      'process_id',
      'current_step',
      'status',
      'inspector',
      'started_at',
    ],
    searchFields: ['task_no', 'sample_id'],
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
          { label: '待分配', value: '待分配' },
          { label: '已分配', value: '已分配' },
          { label: '进行中', value: '进行中' },
          { label: '已完成', value: '已完成' },
          { label: '已终止', value: '已终止' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['sample_id', 'process_id'],
    },
    {
      title: '分配信息',
      fields: ['inspector'],
    },
  ],

  formColCount: 2,
  createTitle: '新建检验任务',
  editTitle: '编辑检验任务',
  detailTitle: '检验任务详情',
};
