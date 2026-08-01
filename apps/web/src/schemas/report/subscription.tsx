import React from 'react';
import type { EntitySchema } from '@/schema';
import type { SubscriptionFrequency } from '@/api/report';

const FREQUENCY_OPTIONS: { value: SubscriptionFrequency; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
];

const getFrequencyLabel = (frequency: SubscriptionFrequency) => {
  return FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label || frequency;
};

export const subscriptionSchema: EntitySchema = {
  entity: 'report_subscription',
  title: '报表订阅管理',
  description: '管理报表订阅，设置订阅者、订阅方式和订阅频率',

  api: {
    module: 'report',
    resource: 'subscriptions',
  },

  fields: [
    {
      name: 'template_name',
      label: '报表模板',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'template_id',
      label: '模板ID',
      type: 'text',
      required: true,
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'user_id',
      label: '用户ID',
      type: 'text',
      required: true,
      listWidth: 120,
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'text',
      listWidth: 200,
    },
    {
      name: 'frequency',
      label: '订阅频率',
      type: 'select',
      required: true,
      defaultValue: 'weekly',
      options: {
        type: 'static',
        options: FREQUENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => getFrequencyLabel(row.frequency as SubscriptionFrequency),
    },
    {
      name: 'enabled',
      label: '状态',
      type: 'switch',
      defaultValue: true,
      listWidth: 120,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) =>
        row.created_at ? new Date(row.created_at as string).toLocaleString('zh-CN') : '-',
    },
  ],

  list: {
    columns: ['template_name', 'user_id', 'email', 'frequency', 'enabled', 'created_at'],
    searchFields: ['template_name', 'template_id', 'email', 'user_id'],
    pageSize: 10,
    statusBadge: {
      field: 'enabled',
      colorMap: {
        true: 'success',
        false: 'default',
      },
      labelMap: {
        true: '已启用',
        false: '已禁用',
      },
    },
    filters: [
      {
        id: 'frequency',
        label: '订阅频率',
        type: 'select',
        options: [
          { label: '全部频率', value: 'all' },
          ...FREQUENCY_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '已启用', value: 'enabled' },
          { label: '已禁用', value: 'disabled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['template_id', 'template_name', 'user_id', 'email'],
    },
    {
      title: '订阅设置',
      fields: ['frequency', 'enabled'],
    },
  ],

  formColCount: 2,
  createTitle: '新建订阅',
  editTitle: '编辑订阅',
  detailTitle: '订阅详情',
};
