import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { FileText, User, Calendar } from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';

export const REPORT_TYPE_CONFIG: Record<
  string,
  { color: 'primary' | 'success' | 'warning' | 'secondary' | 'info' | 'default'; label: string }
> = {
  daily: { color: 'info', label: '日报' },
  weekly: { color: 'success', label: '周报' },
  monthly: { color: 'warning', label: '月报' },
  quarterly: { color: 'secondary', label: '季报' },
  annual: { color: 'primary', label: '年报' },
  custom: { color: 'default', label: '自定义' },
};

export const REPORT_STATUS_CONFIG: Record<
  string,
  { color: 'success' | 'warning' | 'default' | 'error' | 'info' | 'primary'; label: string }
> = {
  active: { color: 'success', label: '启用' },
  draft: { color: 'warning', label: '草稿' },
  archived: { color: 'default', label: '归档' },
};

const reportFields: SchemaField[] = [
  {
    name: 'name',
    label: '报表名称',
    type: 'text',
    required: true,
    sortable: true,
    listWidth: 280,
    renderCell: (row: Record<string, unknown>) =>
      React.createElement(
        Box,
        { sx: { display: 'flex', alignItems: 'center', gap: 1.5 } },
        React.createElement(FileText, { size: 18, color: 'grey.600' }),
        React.createElement(
          Box,
          null,
          React.createElement(
            Typography,
            { variant: 'body2', sx: { fontWeight: 500 } },
            String(row.name ?? '')
          ),
          React.createElement(
            Typography,
            { variant: 'caption', color: 'text.secondary' },
            String(row.description ?? '暂无描述')
          )
        )
      ),
  },
  {
    name: 'description',
    label: '描述',
    type: 'textarea',
    showInList: false,
  },
  {
    name: 'report_type',
    label: '报表类型',
    type: 'select',
    required: true,
    listWidth: 110,
    options: {
      type: 'static',
      options: Object.entries(REPORT_TYPE_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = REPORT_TYPE_CONFIG[row.report_type as string] || {
        label: String(row.report_type ?? ''),
        color: 'default' as const,
      };
      return React.createElement(Chip, {
        size: 'small',
        color: cfg.color,
        label: cfg.label,
        variant: 'outlined',
      });
    },
  },
  {
    name: 'created_by',
    label: '创建人',
    type: 'text',
    listWidth: 120,
    renderCell: (row: Record<string, unknown>) =>
      React.createElement(
        Box,
        { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
        React.createElement(User, { size: 14, color: 'grey.600' }),
        React.createElement(Typography, { variant: 'body2' }, String(row.created_by ?? '未知'))
      ),
  },
  {
    name: 'created_at',
    label: '创建时间',
    type: 'datetime',
    sortable: true,
    listWidth: 140,
    renderCell: (row: Record<string, unknown>) =>
      React.createElement(
        Box,
        { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
        React.createElement(Calendar, { size: 14, color: 'grey.600' }),
        React.createElement(
          Typography,
          { variant: 'body2', color: 'text.secondary' },
          new Date(String(row.created_at)).toLocaleDateString('zh-CN')
        )
      ),
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: Object.entries(REPORT_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = REPORT_STATUS_CONFIG[row.status as string] || {
        label: String(row.status ?? ''),
        color: 'default' as const,
      };
      return React.createElement(Chip, {
        size: 'small',
        color: cfg.color,
        label: cfg.label,
      });
    },
  },
];

export const reportSchema: EntitySchema = {
  entity: 'bi_report',
  title: 'BI 报表',
  description: '创建和管理 BI 报表',

  api: {
    module: 'bi',
    resource: 'reports',
  },

  fields: reportFields,

  list: {
    searchFields: ['name', 'created_by'],
    pageSize: 10,
    filters: [
      {
        id: 'reportType',
        label: '报表类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(REPORT_TYPE_CONFIG).map(([value, cfg]) => ({
            label: cfg.label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          ...Object.entries(REPORT_STATUS_CONFIG).map(([value, cfg]) => ({
            label: cfg.label,
            value,
          })),
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'description', 'report_type', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新建报表',
  editTitle: '编辑报表',
  detailTitle: '报表详情',
};
