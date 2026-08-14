import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { FileText, User, Calendar } from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';
import i18n from '@/i18n';

export const REPORT_TYPE_CONFIG: Record<
  string,
  { color: 'primary' | 'success' | 'warning' | 'secondary' | 'info' | 'default'; label: string }
> = {
  daily: { color: 'info', label: i18n.t('shared.report.k0') },
  weekly: { color: 'success', label: i18n.t('shared.report.k1') },
  monthly: { color: 'warning', label: i18n.t('shared.report.k2') },
  quarterly: { color: 'secondary', label: i18n.t('shared.report.k3') },
  annual: { color: 'primary', label: i18n.t('shared.report.k4') },
  custom: { color: 'default', label: i18n.t('shared.report.k5') },
};

export const REPORT_STATUS_CONFIG: Record<
  string,
  { color: 'success' | 'warning' | 'default' | 'error' | 'info' | 'primary'; label: string }
> = {
  active: { color: 'success', label: i18n.t('shared.report.k6') },
  draft: { color: 'warning', label: i18n.t('shared.report.k7') },
  archived: { color: 'default', label: i18n.t('shared.report.k8') },
};

const reportFields: SchemaField[] = [
  {
    name: 'name',
    label: i18n.t('shared.report.k9'),
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
            String(row.description ?? i18n.t('shared.report.k10'))
          )
        )
      ),
  },
  {
    name: 'description',
    label: i18n.t('shared.report.k11'),
    type: 'textarea',
    showInList: false,
  },
  {
    name: 'report_type',
    label: i18n.t('shared.report.k12'),
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
    label: i18n.t('shared.report.k13'),
    type: 'text',
    listWidth: 120,
    renderCell: (row: Record<string, unknown>) =>
      React.createElement(
        Box,
        { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
        React.createElement(User, { size: 14, color: 'grey.600' }),
        React.createElement(Typography, { variant: 'body2' }, String(row.created_by ?? i18n.t('shared.report.k14')))
      ),
  },
  {
    name: 'created_at',
    label: i18n.t('shared.report.k15'),
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
    label: i18n.t('shared.report.k16'),
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
  title: i18n.t('shared.report.bi_0'),
  description: i18n.t('shared.report.bi_17'),

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
        label: i18n.t('shared.report.k18'),
        type: 'select',
        options: [
          { label: i18n.t('shared.report.k19'), value: 'all' },
          ...Object.entries(REPORT_TYPE_CONFIG).map(([value, cfg]) => ({
            label: cfg.label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: i18n.t('shared.report.k20'),
        type: 'select',
        options: [
          { label: i18n.t('shared.report.k21'), value: 'all' },
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
      title: i18n.t('shared.report.k22'),
      fields: ['name', 'description', 'report_type', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.report.k23'),
  editTitle: i18n.t('shared.report.k24'),
  detailTitle: i18n.t('shared.report.k25'),
};
