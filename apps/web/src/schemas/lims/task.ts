/**
 * 检测任务 Schema — 驱动 LimsTaskPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

export const taskSchema: EntitySchema = {
  entity: 'limsTask',
  title: '检测任务',
  description: '管理检测任务基础信息，包括任务编号、样品、方法、执行人、优先级、状态、截止日期等',

  api: {
    module: 'lims',
    resource: 'tasks',
  },

  fields: [
    {
      name: 'task_code',
      label: '任务编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'task_name',
      label: '任务名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'sample_id',
      label: '样品编号',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'sample_name',
      label: '样品名称',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'method_id',
      label: '方法编号',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'method_name',
      label: '方法名称',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'assignee',
      label: '执行人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low', label: '低' },
          { value: 'urgent', label: '紧急' },
        ],
      },
      listWidth: 90,
      renderCell: (row: Record<string, unknown>) => {
        const map: Record<string, string> = {
          high: '高',
          medium: '中',
          low: '低',
          urgent: '紧急',
        };
        return map[String(row.priority || '')] || String(row.priority || '-');
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待处理' },
          { value: 'in_progress', label: '进行中' },
          { value: 'paused', label: '已暂停' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'due_date',
      label: '截止日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'task_code',
      'task_name',
      'sample_name',
      'assignee',
      'priority',
      'status',
      'due_date',
    ],
    searchFields: ['task_code', 'task_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'default',
        in_progress: 'warning',
        paused: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: '待处理',
        in_progress: '进行中',
        paused: '已暂停',
        completed: '已完成',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { label: '全部优先级', value: 'all' },
          { label: '高', value: 'high' },
          { label: '中', value: 'medium' },
          { label: '低', value: 'low' },
          { label: '紧急', value: 'urgent' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待处理', value: 'pending' },
          { label: '进行中', value: 'in_progress' },
          { label: '已暂停', value: 'paused' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['task_code', 'task_name', 'sample_id', 'method_id'],
    },
    {
      title: '分配与时间',
      fields: ['assignee', 'priority', 'due_date'],
    },
    {
      title: '状态与描述',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增检测任务',
  editTitle: '编辑检测任务',
  detailTitle: '检测任务详情',
};
