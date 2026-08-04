import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const costTypeColorMap: Record<string, 'primary' | 'warning' | 'error' | 'secondary' | 'default'> =
  {
    prevention: 'primary',
    appraisal: 'warning',
    internal_failure: 'error',
    external_failure: 'secondary',
  };

const costTypeLabelMap: Record<string, string> = {
  prevention: '预防成本',
  appraisal: '鉴定成本',
  internal_failure: '内部损失',
  external_failure: '外部损失',
};

const costStatusColorMap: Record<string, 'default' | 'primary' | 'error' | 'success'> = {
  pending: 'default',
  approved: 'primary',
  rejected: 'error',
  closed: 'success',
};

const costStatusLabelMap: Record<string, string> = {
  pending: '待审核',
  approved: '已审核',
  rejected: '已驳回',
  closed: '已关闭',
};

export const qualityCostSchema: EntitySchema = {
  entity: 'quality_cost',
  title: '质量成本',
  description: 'Quality Cost Analysis — 质量成本核算与分析，跟踪预防、鉴定、内外部损失成本',

  api: {
    module: 'qms',
    resource: 'qualityCosts',
  },

  fields: [
    {
      name: 'costNo',
      label: '成本编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontWeight: 600, color: 'info.600' } },
          String(row.costNo ?? '')
        ),
    },
    {
      name: 'costType',
      label: '成本类型',
      type: 'select',
      required: true,
      defaultValue: 'prevention',
      options: {
        type: 'static',
        options: [
          { value: 'prevention', label: '预防成本' },
          { value: 'appraisal', label: '鉴定成本' },
          { value: 'internal_failure', label: '内部损失' },
          { value: 'external_failure', label: '外部损失' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.costType ?? '');
        const color = costTypeColorMap[val] || 'default';
        const label = costTypeLabelMap[val] || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          color,
          variant: 'filled',
        });
      },
      filterable: true,
    },
    {
      name: 'costCategory',
      label: '成本类别',
      type: 'text',
      listWidth: 140,
      placeholder: '如：培训费、检测费',
    },
    {
      name: 'amount',
      label: '金额',
      type: 'number',
      required: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const currency = String(row.currency || '¥');
        const amount = Number(row.amount || 0).toLocaleString();
        return React.createElement('span', { style: { fontWeight: 500 } }, `${currency}${amount}`);
      },
    },
    {
      name: 'currency',
      label: '币种',
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: '人民币 (CNY)' },
          { value: 'USD', label: '美元 (USD)' },
          { value: 'EUR', label: '欧元 (EUR)' },
        ],
      },
      showInList: false,
    },
    {
      name: 'occurrenceDate',
      label: '发生日期',
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'department',
      label: '部门',
      type: 'text',
      listWidth: 120,
      placeholder: '请输入部门名称',
    },
    {
      name: 'relatedOrderNo',
      label: '关联订单号',
      type: 'text',
      showInList: false,
      placeholder: '请输入关联订单号',
    },
    {
      name: 'responsiblePerson',
      label: '负责人',
      type: 'text',
      showInList: false,
      placeholder: '请输入负责人姓名',
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待审核' },
          { value: 'approved', label: '已审核' },
          { value: 'rejected', label: '已驳回' },
          { value: 'closed', label: '已关闭' },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.status ?? '');
        const color = costStatusColorMap[val] || 'default';
        const label = costStatusLabelMap[val] || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          color,
          variant: 'filled',
        });
      },
      filterable: true,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
      placeholder: '请描述成本的具体情况...',
    },
    {
      name: 'created_at',
      label: '创建日期',
      type: 'date',
      readonly: true,
      showInList: false,
      sortable: true,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['costNo', 'costCategory', 'department'],
    filters: [
      {
        id: 'costType',
        label: '成本类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '预防成本', value: 'prevention' },
          { label: '鉴定成本', value: 'appraisal' },
          { label: '内部损失', value: 'internal_failure' },
          { label: '外部损失', value: 'external_failure' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待审核', value: 'pending' },
          { label: '已审核', value: 'approved' },
          { label: '已驳回', value: 'rejected' },
          { label: '已关闭', value: 'closed' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: costStatusColorMap,
      labelMap: costStatusLabelMap,
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['costNo', 'costType', 'costCategory', 'amount', 'currency'],
    },
    {
      title: '归属与日期',
      fields: ['occurrenceDate', 'department', 'relatedOrderNo', 'responsiblePerson', 'status'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '添加质量成本记录',
  editTitle: '编辑质量成本记录',
  detailTitle: '质量成本详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
