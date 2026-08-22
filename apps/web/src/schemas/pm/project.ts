import { designTokens } from '@topems/tokens';
import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  pending: 'warning',
  approved: 'primary',
  active: 'success',
  completed: 'primary',
  cancelled: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  draft: i18n.t('shared.project.k0'),
  pending: i18n.t('shared.project.k1'),
  approved: i18n.t('shared.project.k2'),
  active: i18n.t('shared.project.k3'),
  completed: i18n.t('shared.project.k4'),
  cancelled: i18n.t('shared.project.k5'),
};

const PROJECT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'research', label: i18n.t('shared.project.k6') },
  { value: 'production', label: i18n.t('shared.project.k7') },
  { value: 'construction', label: i18n.t('shared.project.k8') },
  { value: 'design', label: i18n.t('shared.project.k9') },
  { value: 'service', label: i18n.t('shared.project.k10') },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: i18n.t('shared.project.k11') },
  { value: 'pending', label: i18n.t('shared.project.k12') },
  { value: 'approved', label: i18n.t('shared.project.k13') },
  { value: 'active', label: i18n.t('shared.project.k14') },
  { value: 'completed', label: i18n.t('shared.project.k15') },
  { value: 'cancelled', label: i18n.t('shared.project.k16') },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
});

export const projectSchema: EntitySchema = {
  entity: 'pm_project',
  title: i18n.t('shared.project.k17'),
  description: i18n.t('shared.project.k18'),

  api: {
    module: 'pm',
    resource: 'projects',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('shared.project.k19'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'code',
      label: i18n.t('shared.project.k20'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'project_type',
      label: i18n.t('shared.project.k21'),
      type: 'select',
      required: true,
      defaultValue: 'research',
      options: { type: 'static', options: PROJECT_TYPE_OPTIONS },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'status',
      label: i18n.t('shared.project.k22'),
      type: 'select',
      defaultValue: 'draft',
      options: { type: 'static', options: STATUS_OPTIONS },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'progress',
      label: i18n.t('shared.project.k23'),
      type: 'number',
      defaultValue: 0,
      listWidth: 180,
      renderCell: (row: Record<string, unknown>) => {
        const val = Number(row.progress ?? 0);
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1.5 } },
          React.createElement(
            Box,
            { sx: { width: 96 } },
            React.createElement(LinearProgress, {
              variant: 'determinate',
              value: val,
              sx: { height: 8, borderRadius: 4 },
            })
          ),
          React.createElement(
            Typography,
            { sx: { fontSize: designTokens.typography.fontSize.scale['0.875rem'], color: 'grey.600' } },
            `${val}%`
          )
        );
      },
    },
    {
      name: 'budget',
      label: i18n.t('shared.project.k24'),
      type: 'number',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.budget as number | undefined;
        if (!val) return '-';
        return CURRENCY_FORMATTER.format(val);
      },
    },
    {
      name: 'leader',
      label: i18n.t('shared.project.k25'),
      type: 'text',
      listWidth: 100,
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'start_date',
      label: i18n.t('shared.project.k26'),
      type: 'date',
      listWidth: 150,
    },
    {
      name: 'end_date',
      label: i18n.t('shared.project.k27'),
      type: 'date',
      listWidth: 150,
    },
    {
      name: 'description',
      label: i18n.t('shared.project.k28'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('shared.project.k29'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 150,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('shared.project.k30'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'name',
      'code',
      'project_type',
      'status',
      'progress',
      'budget',
      'start_date',
      'end_date',
    ],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
    filters: [
      {
        id: 'project_type',
        label: i18n.t('shared.project.k31'),
        type: 'select',
        options: [{ label: i18n.t('shared.project.k32'), value: 'all' }, ...PROJECT_TYPE_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('shared.project.k33'),
        type: 'select',
        options: [{ label: i18n.t('shared.project.k34'), value: 'all' }, ...STATUS_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('shared.project.k35'),
      fields: ['name', 'code', 'project_type', 'status', 'leader'],
    },
    {
      title: i18n.t('shared.project.k36'),
      fields: ['start_date', 'end_date', 'budget', 'progress'],
    },
    {
      title: i18n.t('shared.project.k37'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.project.k38'),
  editTitle: i18n.t('shared.project.k39'),
  detailTitle: i18n.t('shared.project.k40'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
