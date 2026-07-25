import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const ptPlanStatusColorMap: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  待执行: 'default',
  执行中: 'primary',
  已完成: 'success',
  已评价: 'info',
};

const ptPlanStatusLabelMap: Record<string, string> = {
  待执行: '待执行',
  执行中: '执行中',
  已完成: '已完成',
  已评价: '已评价',
};

function renderPtPlanStatusCell(row: Record<string, unknown>) {
  const status = String(row.status ?? '');
  const color = ptPlanStatusColorMap[status] || 'default';
  return React.createElement(Chip, {
    label: status,
    size: 'small',
    color,
    variant: color === 'default' ? 'outlined' : 'filled',
    sx: { fontWeight: 500 },
  });
}

function renderDateCell(row: Record<string, unknown>, field: string) {
  const val = row[field] as string | null | undefined;
  if (!val) return '-';
  return new Date(val).toLocaleDateString('zh-CN');
}

export const ptPlanSchema: EntitySchema = {
  entity: 'limsPtPlan',
  title: '能力验证计划',
  description: '管理能力验证计划，包括计划信息、检测项目、方法和结果等',

  api: {
    module: 'lims',
    resource: 'ptPlans',
  },

  fields: [
    {
      name: 'plan_no',
      label: '计划编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      placeholder: '请输入计划编号',
    },
    {
      name: 'plan_name',
      label: '计划名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      placeholder: '请输入计划名称',
    },
    {
      name: 'provider',
      label: '提供方',
      type: 'text',
      listWidth: 140,
      showInList: false,
      placeholder: '请输入提供方',
    },
    {
      name: 'testitem',
      label: '检测项目',
      type: 'text',
      listWidth: 140,
      showInList: false,
      placeholder: '请输入检测项目',
    },
    {
      name: 'test_method',
      label: '检测方法',
      type: 'text',
      listWidth: 140,
      showInList: false,
      placeholder: '请输入检测方法',
    },
    {
      name: 'plan_year',
      label: '验证周期',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '月度', label: '月度' },
          { value: '季度', label: '季度' },
          { value: '年度', label: '年度' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'sample_type',
      label: '样品类型',
      type: 'text',
      listWidth: 120,
      showInList: false,
      placeholder: '请输入样品类型',
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: '待执行',
      options: {
        type: 'static',
        options: [
          { value: '待执行', label: '待执行' },
          { value: '执行中', label: '执行中' },
          { value: '已完成', label: '已完成' },
          { value: '已评价', label: '已评价' },
        ],
      },
      listWidth: 100,
      renderCell: renderPtPlanStatusCell,
    },
    {
      name: 'registration_date',
      label: '开始日期',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'registration_date'),
    },
    {
      name: 'test_deadline',
      label: '检测截止日期',
      type: 'date',
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'test_deadline'),
    },
    {
      name: 'report_deadline',
      label: '结束日期',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'report_deadline'),
    },
    {
      name: 'contact_person',
      label: '联系人',
      type: 'text',
      listWidth: 100,
      showInList: false,
      placeholder: '请输入联系人',
    },
    {
      name: 'contact_phone',
      label: '联系电话',
      type: 'text',
      listWidth: 120,
      showInList: false,
      placeholder: '请输入联系电话',
    },
    {
      name: 'notes',
      label: '备注',
      type: 'textarea',
      showInList: false,
      placeholder: '请输入备注',
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'date',
      readonly: true,
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'date',
      readonly: true,
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'updated_at'),
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['plan_no', 'plan_name'],
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待执行', value: '待执行' },
          { label: '执行中', value: '执行中' },
          { label: '已完成', value: '已完成' },
          { label: '已评价', value: '已评价' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'cycle',
        label: '验证周期',
        type: 'select',
        options: [
          { label: '全部周期', value: 'all' },
          { label: '月度', value: '月度' },
          { label: '季度', value: '季度' },
          { label: '年度', value: '年度' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: ptPlanStatusColorMap,
      labelMap: ptPlanStatusLabelMap,
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['plan_no', 'plan_name', 'plan_year', 'status'],
    },
    {
      title: '检测信息',
      fields: ['provider', 'testitem', 'test_method', 'sample_type'],
    },
    {
      title: '时间安排',
      fields: ['registration_date', 'test_deadline', 'report_deadline'],
    },
    {
      title: '联系信息',
      fields: ['contact_person', 'contact_phone'],
    },
    {
      title: '备注',
      fields: ['notes'],
    },
  ],

  formColCount: 2,
  createTitle: '新建能力验证计划',
  editTitle: '编辑能力验证计划',
  detailTitle: '能力验证计划详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
