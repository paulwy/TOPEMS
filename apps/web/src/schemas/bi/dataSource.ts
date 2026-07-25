import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { Database, Server, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';

export const DATA_SOURCE_STATUS_CONFIG: Record<
  string,
  { color: 'success' | 'default' | 'error' | 'warning' | 'info' | 'primary'; label: string }
> = {
  active: { color: 'success', label: '已连接' },
  inactive: { color: 'default', label: '未激活' },
  error: { color: 'error', label: '异常' },
};

export const DATA_SOURCE_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  postgresql: { icon: '🐘', label: 'PostgreSQL' },
  mysql: { icon: '🐬', label: 'MySQL' },
  mongodb: { icon: '🍃', label: 'MongoDB' },
  redis: { icon: '🔴', label: 'Redis' },
  elasticsearch: { icon: '🔍', label: 'Elasticsearch' },
  api: { icon: '🌐', label: 'API' },
  file: { icon: '📁', label: '文件' },
};

const dataSourceFields: SchemaField[] = [
  {
    name: 'name',
    label: '数据源名称',
    type: 'text',
    required: true,
    sortable: true,
    listWidth: 260,
    renderCell: (row: Record<string, unknown>) =>
      React.createElement(
        Box,
        { sx: { display: 'flex', alignItems: 'center', gap: 1.5 } },
        React.createElement(Database, { size: 18, color: 'grey.600' }),
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
            {
              variant: 'caption',
              color: 'text.secondary',
              sx: { display: 'flex', alignItems: 'center', gap: 0.5 },
            },
            React.createElement(Server, { size: 12 }),
            ' ',
            String(row.host ?? '')
          )
        )
      ),
  },
  {
    name: 'type',
    label: '数据源类型',
    type: 'select',
    required: true,
    listWidth: 130,
    options: {
      type: 'static',
      options: Object.entries(DATA_SOURCE_TYPE_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = DATA_SOURCE_TYPE_CONFIG[row.type as string] || {
        icon: '💾',
        label: String(row.type ?? ''),
      };
      return React.createElement(Chip, {
        icon: React.createElement(Typography, { component: 'span' }, cfg.icon),
        label: cfg.label,
        size: 'small',
        variant: 'outlined',
      });
    },
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    listWidth: 110,
    options: {
      type: 'static',
      options: Object.entries(DATA_SOURCE_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = DATA_SOURCE_STATUS_CONFIG[row.status as string] || {
        color: 'default' as const,
        label: String(row.status ?? ''),
      };
      const StatusIcon =
        row.status === 'active' ? CheckCircle : row.status === 'error' ? XCircle : Clock;
      return React.createElement(Chip, {
        icon: React.createElement(StatusIcon, { size: 14 }),
        label: cfg.label,
        size: 'small',
        color: cfg.color,
      });
    },
  },
  {
    name: 'host',
    label: '主机地址',
    type: 'text',
    required: true,
    showInList: false,
  },
  {
    name: 'port',
    label: '端口',
    type: 'number',
    showInList: false,
  },
  {
    name: 'database',
    label: '数据库名',
    type: 'text',
    showInList: false,
  },
  {
    name: 'username',
    label: '用户名',
    type: 'text',
    showInList: false,
  },
  {
    name: 'connection_string',
    label: '连接字符串',
    type: 'textarea',
    showInList: false,
  },
  {
    name: 'description',
    label: '描述',
    type: 'textarea',
    showInList: false,
  },
  {
    name: 'last_sync',
    label: '最后同步时间',
    type: 'datetime',
    listWidth: 160,
    renderCell: (row: Record<string, unknown>) =>
      row.last_sync
        ? React.createElement(
            Typography,
            {
              variant: 'body2',
              color: 'text.secondary',
              sx: { display: 'flex', alignItems: 'center', gap: 0.5 },
            },
            React.createElement(Clock, { size: 12 }),
            ' ',
            new Date(String(row.last_sync)).toLocaleString('zh-CN')
          )
        : React.createElement(Typography, { variant: 'body2', color: 'text.secondary' }, '未同步'),
  },
  {
    name: 'data_volume',
    label: '数据量',
    type: 'number',
    listWidth: 100,
    align: 'right',
    renderCell: (row: Record<string, unknown>) =>
      React.createElement(
        Typography,
        { variant: 'body2' },
        row.data_volume ? `${(Number(row.data_volume) / 1000).toFixed(1)}K` : '-'
      ),
  },
  {
    name: 'sync_frequency',
    label: '同步频率',
    type: 'text',
    showInList: false,
  },
  {
    name: 'is_enabled',
    label: '是否启用',
    type: 'switch',
    showInList: false,
  },
  {
    name: 'created_at',
    label: '创建时间',
    type: 'datetime',
    sortable: true,
    listWidth: 160,
    hideInForm: true,
    renderCell: (row: Record<string, unknown>) =>
      React.createElement(
        Typography,
        { variant: 'body2', color: 'text.secondary' },
        new Date(String(row.created_at)).toLocaleString('zh-CN')
      ),
  },
];

export const dataSourceSchema: EntitySchema = {
  entity: 'bi_data_source',
  title: 'BI 数据源',
  description: '管理 BI 数据源连接',

  api: {
    module: 'bi',
    resource: 'dataSources',
  },

  fields: dataSourceFields,

  list: {
    searchFields: ['name', 'host'],
    pageSize: 10,
    filters: [
      {
        id: 'type',
        label: '数据源类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(DATA_SOURCE_TYPE_CONFIG).map(([value, cfg]) => ({
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
          ...Object.entries(DATA_SOURCE_STATUS_CONFIG).map(([value, cfg]) => ({
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
      fields: ['name', 'type', 'description', 'is_enabled'],
    },
    {
      title: '连接配置',
      fields: ['host', 'port', 'database', 'username', 'connection_string'],
    },
    {
      title: '同步配置',
      fields: ['sync_frequency'],
    },
  ],

  formColCount: 2,
  createTitle: '新建数据源',
  editTitle: '编辑数据源',
  detailTitle: '数据源详情',
};
