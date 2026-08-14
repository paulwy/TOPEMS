import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { Database, Server, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';
import i18n from '@/i18n';

export const DATA_SOURCE_STATUS_CONFIG: Record<
  string,
  { color: 'success' | 'default' | 'error' | 'warning' | 'info' | 'primary'; label: string }
> = {
  active: { color: 'success', label: i18n.t('shared.data_source.k0') },
  inactive: { color: 'default', label: i18n.t('shared.data_source.k1') },
  error: { color: 'error', label: i18n.t('shared.data_source.k2') },
};

export const DATA_SOURCE_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  postgresql: { icon: '🐘', label: 'PostgreSQL' },
  mysql: { icon: '🐬', label: 'MySQL' },
  mongodb: { icon: '🍃', label: 'MongoDB' },
  redis: { icon: '🔴', label: 'Redis' },
  elasticsearch: { icon: '🔍', label: 'Elasticsearch' },
  api: { icon: '🌐', label: 'API' },
  file: { icon: '📁', label: i18n.t('shared.data_source.k3') },
};

const dataSourceFields: SchemaField[] = [
  {
    name: 'name',
    label: i18n.t('shared.data_source.k4'),
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
    label: i18n.t('shared.data_source.k5'),
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
        icon: React.createElement('span', null, cfg.icon),
        label: cfg.label,
        size: 'small',
        variant: 'outlined',
      });
    },
  },
  {
    name: 'status',
    label: i18n.t('shared.data_source.k6'),
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
    label: i18n.t('shared.data_source.k7'),
    type: 'text',
    required: true,
    showInList: false,
  },
  {
    name: 'port',
    label: i18n.t('shared.data_source.k8'),
    type: 'number',
    showInList: false,
  },
  {
    name: 'database',
    label: i18n.t('shared.data_source.k9'),
    type: 'text',
    showInList: false,
  },
  {
    name: 'username',
    label: i18n.t('shared.data_source.k10'),
    type: 'text',
    showInList: false,
  },
  {
    name: 'connection_string',
    label: i18n.t('shared.data_source.k11'),
    type: 'textarea',
    showInList: false,
  },
  {
    name: 'description',
    label: i18n.t('shared.data_source.k12'),
    type: 'textarea',
    showInList: false,
  },
  {
    name: 'last_sync',
    label: i18n.t('shared.data_source.k13'),
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
        : React.createElement(Typography, { variant: 'body2', color: 'text.secondary' }, i18n.t('shared.data_source.k14')),
  },
  {
    name: 'data_volume',
    label: i18n.t('shared.data_source.k15'),
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
    label: i18n.t('shared.data_source.k16'),
    type: 'text',
    showInList: false,
  },
  {
    name: 'isEnabled',
    label: i18n.t('shared.data_source.k17'),
    type: 'switch',
    showInList: false,
  },
  {
    name: 'created_at',
    label: i18n.t('shared.data_source.k18'),
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
  title: i18n.t('shared.data_source.bi_0'),
  description: i18n.t('shared.data_source.bi_19'),

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
        label: i18n.t('shared.data_source.k20'),
        type: 'select',
        options: [
          { label: i18n.t('shared.data_source.k21'), value: 'all' },
          ...Object.entries(DATA_SOURCE_TYPE_CONFIG).map(([value, cfg]) => ({
            label: cfg.label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: i18n.t('shared.data_source.k22'),
        type: 'select',
        options: [
          { label: i18n.t('shared.data_source.k23'), value: 'all' },
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
      title: i18n.t('shared.data_source.k24'),
      fields: ['name', 'type', 'description', 'isEnabled'],
    },
    {
      title: i18n.t('shared.data_source.k25'),
      fields: ['host', 'port', 'database', 'username', 'connection_string'],
    },
    {
      title: i18n.t('shared.data_source.k26'),
      fields: ['sync_frequency'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.data_source.k27'),
  editTitle: i18n.t('shared.data_source.k28'),
  detailTitle: i18n.t('shared.data_source.k29'),
};
