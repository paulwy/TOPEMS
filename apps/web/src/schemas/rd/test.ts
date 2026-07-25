import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const PRIORITY_COLOR_MAP: Record<string, 'default' | 'warning' | 'error'> = {
  high: 'error',
  medium: 'warning',
  low: 'default',
};

const PRIORITY_LABEL_MAP: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const STATUS_COLOR_MAP: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  passed: 'success',
  failed: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待测试',
  passed: '通过',
  failed: '失败',
};

export const testSchema: EntitySchema = {
  entity: 'rd_test_case',
  title: '测试用例',
  description: '管理测试用例，包括用例编号、名称、类型、优先级、状态等',

  api: {
    module: 'rd',
    resource: 'tests',
  },

  fields: [
    {
      name: 'case_no',
      label: '用例编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'case_name',
      label: '用例名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 220,
    },
    {
      name: 'case_type',
      label: '用例类型',
      type: 'select',
      defaultValue: '功能测试',
      options: {
        type: 'static',
        options: [
          { value: '功能测试', label: '功能测试' },
          { value: '性能测试', label: '性能测试' },
          { value: '压力测试', label: '压力测试' },
          { value: 'UI测试', label: 'UI测试' },
          { value: '安全测试', label: '安全测试' },
        ],
      },
      listWidth: 120,
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
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.priority ?? '');
        const color = PRIORITY_COLOR_MAP[val] || 'default';
        const label = PRIORITY_LABEL_MAP[val] || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          color,
        });
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
          { value: 'pending', label: '待测试' },
          { value: 'passed', label: '通过' },
          { value: 'failed', label: '失败' },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'related_requirement',
      label: '关联需求',
      type: 'text',
      listWidth: 200,
    },
  ],

  list: {
    columns: ['case_no', 'case_name', 'case_type', 'priority', 'status', 'related_requirement'],
    searchFields: ['case_no', 'case_name', 'related_requirement'],
    pageSize: 10,
    filters: [
      {
        id: 'case_type',
        label: '用例类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '功能测试', value: '功能测试' },
          { label: '性能测试', value: '性能测试' },
          { label: '压力测试', value: '压力测试' },
          { label: 'UI测试', value: 'UI测试' },
          { label: '安全测试', value: '安全测试' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { label: '全部优先级', value: 'all' },
          { label: '高', value: 'high' },
          { label: '中', value: 'medium' },
          { label: '低', value: 'low' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待测试', value: 'pending' },
          { label: '通过', value: 'passed' },
          { label: '失败', value: 'failed' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['case_name', 'case_type', 'priority', 'status'],
    },
    {
      title: '关联信息',
      fields: ['related_requirement'],
    },
  ],

  formColCount: 2,
  createTitle: '新建测试用例',
  editTitle: '编辑测试用例',
  detailTitle: '用例详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
