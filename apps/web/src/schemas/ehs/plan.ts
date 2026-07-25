import React from 'react';
import type { EntitySchema } from '@/schema';

export const planSchema: EntitySchema = {
  entity: 'ehsPlan',
  title: '安全计划',
  description: '管理企业安全计划信息，包括计划类型、负责人、进度、状态等',

  api: {
    module: 'ehs',
    resource: 'plans',
  },

  fields: [
    {
      name: 'plan_no',
      label: '计划编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'plan_name',
      label: '计划名称',
      type: 'text',
      required: true,
      listWidth: 180,
    },
    {
      name: 'plan_type',
      label: '计划类型',
      type: 'select',
      required: true,
      defaultValue: 'inspection',
      options: {
        type: 'static',
        options: [
          { value: 'training', label: '培训教育' },
          { value: 'inspection', label: '安全检查' },
          { value: 'audit', label: '安全审计' },
          { value: 'drill', label: '应急演练' },
          { value: 'improvement', label: '安全改进' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'department_id',
      label: '所属部门',
      type: 'text',
      showInList: false,
    },
    {
      name: 'department_name',
      label: '部门名称',
      type: 'text',
      showInList: false,
    },
    {
      name: 'responsible',
      label: '负责人',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'planned',
      options: {
        type: 'static',
        options: [
          { value: 'planned', label: '已计划' },
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'delayed', label: '已延期' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'progress',
      label: '进度',
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        return React.createElement('span', null, `${row.progress || 0}%`);
      },
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
      'plan_no',
      'plan_name',
      'plan_type',
      'responsible',
      'start_date',
      'end_date',
      'status',
    ],
    searchFields: ['plan_no', 'plan_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        planned: 'default',
        in_progress: 'primary',
        completed: 'success',
        delayed: 'warning',
        cancelled: 'error',
      },
      labelMap: {
        planned: '已计划',
        in_progress: '进行中',
        completed: '已完成',
        delayed: '已延期',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'plan_type',
        label: '计划类型',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '培训教育', value: 'training' },
          { label: '安全检查', value: 'inspection' },
          { label: '安全审计', value: 'audit' },
          { label: '应急演练', value: 'drill' },
          { label: '安全改进', value: 'improvement' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '已计划', value: 'planned' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '已延期', value: 'delayed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['plan_no', 'plan_name', 'plan_type', 'department_id'],
    },
    {
      title: '负责人与时间',
      fields: ['responsible', 'start_date', 'end_date'],
    },
    {
      title: '状态与描述',
      fields: ['status', 'progress', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新建安全计划',
  editTitle: '编辑安全计划',
  detailTitle: '安全计划详情',
};
