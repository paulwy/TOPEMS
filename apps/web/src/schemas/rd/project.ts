import React from 'react';
import { Chip, LinearProgress, Stack, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  pending: 'default',
  in_progress: 'primary',
  completed: 'success',
  paused: 'warning',
  cancelled: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: i18n.t('rd.project.k0'),
  in_progress: i18n.t('rd.project.k1'),
  completed: i18n.t('rd.project.k2'),
  paused: i18n.t('rd.project.k3'),
  cancelled: i18n.t('rd.project.k4'),
};

export const projectSchema: EntitySchema = {
  entity: 'rd_project',
  title: i18n.t('rd.project.k5'),
  description: i18n.t('rd.project.k6'),

  api: {
    module: 'rd',
    resource: 'projects',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('rd.project.k7'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'name',
      label: i18n.t('rd.project.k8'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'project_type',
      label: i18n.t('rd.project.k9'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: i18n.t('rd.project.k10'), label: i18n.t('rd.project.k11') },
          { value: i18n.t('rd.project.k12'), label: i18n.t('rd.project.k13') },
          { value: i18n.t('rd.project.k14'), label: i18n.t('rd.project.k15') },
          { value: i18n.t('rd.project.k16'), label: i18n.t('rd.project.k17') },
          { value: i18n.t('rd.project.k18'), label: i18n.t('rd.project.k19') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.project_type ?? '');
        if (!val) return '-';
        return React.createElement(Chip, {
          label: val,
          size: 'small',
          variant: 'outlined',
        });
      },
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'leader',
      label: i18n.t('rd.project.k20'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'status',
      label: i18n.t('rd.project.k21'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('rd.project.k22') },
          { value: 'in_progress', label: i18n.t('rd.project.k23') },
          { value: 'completed', label: i18n.t('rd.project.k24') },
          { value: 'paused', label: i18n.t('rd.project.k25') },
          { value: 'cancelled', label: i18n.t('rd.project.k26') },
        ],
      },
      listWidth: 110,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'progress',
      label: i18n.t('rd.project.k27'),
      type: 'number',
      defaultValue: 0,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const val = Number(row.progress ?? 0);
        return React.createElement(
          Stack,
          { direction: 'row', spacing: 1, sx: { alignItems: 'center' } },
          React.createElement(LinearProgress, {
            variant: 'determinate',
            value: val,
            sx: { width: 80 },
          }),
          React.createElement(Typography, { variant: 'body2' }, `${val}%`)
        );
      },
    },
    {
      name: 'start_date',
      label: i18n.t('rd.project.k28'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('rd.project.k29'),
      type: 'date',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'budget',
      label: i18n.t('rd.project.k30'),
      type: 'number',
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.budget;
        if (val == null) return '-';
        return (Number(val) / 10000).toFixed(1);
      },
    },
    {
      name: 'description',
      label: i18n.t('rd.project.k31'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('rd.project.k32'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 130,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('rd.project.k33'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'project_type',
      'leader',
      'status',
      'progress',
      'start_date',
      'budget',
    ],
    searchFields: ['code', 'name', 'leader'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: i18n.t('rd.project.k34'),
        type: 'select',
        options: [
          { label: i18n.t('rd.project.k35'), value: 'all' },
          { label: i18n.t('rd.project.k36'), value: 'pending' },
          { label: i18n.t('rd.project.k37'), value: 'in_progress' },
          { label: i18n.t('rd.project.k38'), value: 'completed' },
          { label: i18n.t('rd.project.k39'), value: 'paused' },
          { label: i18n.t('rd.project.k40'), value: 'cancelled' },
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
      title: i18n.t('rd.project.k41'),
      fields: ['code', 'name', 'project_type', 'leader', 'status'],
    },
    {
      title: i18n.t('rd.project.k42'),
      fields: ['start_date', 'end_date', 'budget', 'progress'],
    },
    {
      title: i18n.t('rd.project.k43'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.project.k44'),
  editTitle: i18n.t('rd.project.k45'),
  detailTitle: i18n.t('rd.project.k46'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
