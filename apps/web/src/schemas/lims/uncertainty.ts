import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const statusColorMap: Record<string, 'default' | 'primary' | 'success'> = {
  草稿: 'default',
  计算中: 'primary',
  已完成: 'success',
};

function renderStatusCell(row: Record<string, unknown>) {
  const status = String(row.status ?? '');
  const color = statusColorMap[status] || 'default';
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

function renderCombinedUncertaintyCell(row: Record<string, unknown>) {
  const val = row.combined_uncertainty as number | null | undefined;
  if (val === undefined || val === null) return '-';
  return val.toFixed(4);
}

export const uncertaintyProjectSchema: EntitySchema = {
  entity: 'limsUncertaintyProject',
  title: '不确定度评定',
  description: '管理不确定度评定项目，包括项目信息、检测方法、被测量、测量范围和评定结果等',

  api: {
    module: 'lims',
    resource: 'uncertaintyProjects',
    listMethod: 'listUncertaintyProjects',
    createMethod: 'createUncertaintyProject',
    updateMethod: 'updateUncertaintyProject',
    deleteMethod: 'deleteUncertaintyProject',
  },

  fields: [
    {
      name: 'project_no',
      label: '项目编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      placeholder: '请输入项目编号',
    },
    {
      name: 'project_name',
      label: '项目名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      placeholder: '请输入项目名称',
    },
    {
      name: 'method_name',
      label: '检测方法',
      type: 'text',
      listWidth: 180,
      placeholder: '请输入检测方法',
    },
    {
      name: 'testitem',
      label: '检测项目',
      type: 'text',
      showInList: false,
      placeholder: '请输入检测项目',
    },
    {
      name: 'measurand',
      label: '被测量',
      type: 'text',
      showInList: false,
      placeholder: '请输入被测量',
    },
    {
      name: 'measurement_range',
      label: '测量范围',
      type: 'text',
      showInList: false,
      placeholder: '请输入测量范围',
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      showInList: false,
      placeholder: '请输入单位',
    },
    {
      name: 'combined_uncertainty',
      label: '合成不确定度',
      type: 'number',
      readonly: true,
      listWidth: 120,
      renderCell: renderCombinedUncertaintyCell,
    },
    {
      name: 'expanded_uncertainty',
      label: '扩展不确定度',
      type: 'number',
      readonly: true,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'coverage_factor',
      label: '包含因子',
      type: 'number',
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'confidencelevel',
      label: '置信水平',
      type: 'number',
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: '草稿',
      options: {
        type: 'static',
        options: [
          { value: '草稿', label: '草稿' },
          { value: '计算中', label: '计算中' },
          { value: '已完成', label: '已完成' },
        ],
      },
      listWidth: 100,
      renderCell: renderStatusCell,
    },
    {
      name: 'evaluator',
      label: '评定人',
      type: 'text',
      listWidth: 100,
      showInList: false,
      placeholder: '请输入评定人',
    },
    {
      name: 'evaluation_date',
      label: '评定日期',
      type: 'date',
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'evaluation_date'),
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'notes',
      label: '备注',
      type: 'textarea',
      showInList: false,
      placeholder: '请输入备注',
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['project_no', 'project_name'],
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: '草稿' },
          { label: '计算中', value: '计算中' },
          { label: '已完成', value: '已完成' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: statusColorMap,
      labelMap: {
        草稿: '草稿',
        计算中: '计算中',
        已完成: '已完成',
      },
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['project_no', 'project_name', 'method_name', 'status'],
    },
    {
      title: '评定信息',
      fields: [
        'testitem',
        'measurand',
        'measurement_range',
        'unit',
        'evaluator',
        'evaluation_date',
      ],
    },
    {
      title: '结果信息',
      fields: [
        'combined_uncertainty',
        'expanded_uncertainty',
        'coverage_factor',
        'confidencelevel',
      ],
    },
    {
      title: '其他',
      fields: ['notes'],
    },
  ],

  formColCount: 2,
  createTitle: '新建不确定度项目',
  editTitle: '编辑不确定度项目',
  detailTitle: '不确定度项目详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
