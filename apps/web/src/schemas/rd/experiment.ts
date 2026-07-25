import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const PHASE_COLOR_MAP: Record<string, 'info' | 'warning' | 'error' | 'default'> = {
  小试: 'info',
  中试: 'warning',
  放大: 'error',
};

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  进行中: 'primary',
  已完成: 'success',
  暂停: 'warning',
  失败: 'error',
};

export const experimentSchema: EntitySchema = {
  entity: 'rd_experiment',
  title: '试验管理',
  description: '管理研发试验、记录数据、追踪批次',

  api: {
    module: 'rd',
    resource: 'experiments',
  },

  fields: [
    {
      name: 'code',
      label: '试验编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '试验名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'project_id',
      label: '所属项目',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.project_name || row.project_id;
        return val ? String(val) : '-';
      },
    },
    {
      name: 'phase',
      label: '阶段',
      type: 'select',
      defaultValue: '小试',
      options: {
        type: 'static',
        options: [
          { value: '小试', label: '小试' },
          { value: '中试', label: '中试' },
          { value: '放大', label: '放大' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.phase ?? '');
        const color = PHASE_COLOR_MAP[val] || 'default';
        return React.createElement(Chip, { label: val, size: 'small', color });
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: '进行中',
      options: {
        type: 'static',
        options: [
          { value: '进行中', label: '进行中' },
          { value: '已完成', label: '已完成' },
          { value: '暂停', label: '暂停' },
          { value: '失败', label: '失败' },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.status ?? '');
        const color = STATUS_COLOR_MAP[val] || 'default';
        return React.createElement(Chip, { label: val, size: 'small', color });
      },
    },
    {
      name: 'experimenter',
      label: '实验员',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'started_at',
      label: '开始日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'batch_number',
      label: '批次号',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.batch_number;
        return val ? String(val) : '-';
      },
    },
    {
      name: 'experiment_type',
      label: '试验类型',
      type: 'text',
      showInList: false,
    },
    {
      name: 'objective',
      label: '试验目标',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'method',
      label: '试验方法',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'results',
      label: '试验结果',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'conclusions',
      label: '结论',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'scale',
      label: '规模',
      type: 'number',
      showInList: false,
    },
    {
      name: 'scale_unit',
      label: '单位',
      type: 'text',
      showInList: false,
    },
    {
      name: 'completed_at',
      label: '完成日期',
      type: 'date',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 130,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'project_id',
      'phase',
      'status',
      'experimenter',
      'started_at',
      'batch_number',
    ],
    searchFields: ['code', 'name', 'experimenter'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '进行中', value: '进行中' },
          { label: '已完成', value: '已完成' },
          { label: '暂停', value: '暂停' },
          { label: '失败', value: '失败' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'project_id', 'phase', 'status'],
    },
    {
      title: '试验详情',
      fields: [
        'experiment_type',
        'objective',
        'method',
        'experimenter',
        'started_at',
        'batch_number',
      ],
    },
    {
      title: '结果与结论',
      fields: ['scale', 'scale_unit', 'results', 'conclusions', 'completed_at'],
    },
  ],

  formColCount: 2,
  createTitle: '新建试验',
  editTitle: '编辑试验',
  detailTitle: '试验详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
