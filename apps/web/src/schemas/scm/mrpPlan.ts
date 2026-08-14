import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const statusColorConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  draft: { label: i18n.t('scm.mrp_plan.k0'), color: 'default' },
  calculated: { label: i18n.t('scm.mrp_plan.k1'), color: 'success' },
  processing: { label: i18n.t('scm.mrp_plan.k2'), color: 'warning' },
  cancelled: { label: i18n.t('scm.mrp_plan.k3'), color: 'error' },
};

export const mrpPlanSchema: EntitySchema = {
  entity: 'mrpPlan',
  title: i18n.t('shared.mrp_plan.mrp_0'),
  description: i18n.t('shared.mrp_plan.k1'),

  api: {
    module: 'scm',
    resource: 'mrpPlans',
  },

  fields: [
    {
      name: 'plan_code',
      label: i18n.t('scm.mrp_plan.k4'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'plan_name',
      label: i18n.t('scm.mrp_plan.k5'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'start_date',
      label: i18n.t('scm.mrp_plan.k6'),
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('scm.mrp_plan.k7'),
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('scm.mrp_plan.k8'),
      type: 'select',
      hideInForm: true,
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('scm.mrp_plan.k9') },
          { value: 'calculated', label: i18n.t('scm.mrp_plan.k10') },
          { value: 'processing', label: i18n.t('scm.mrp_plan.k11') },
          { value: 'cancelled', label: i18n.t('scm.mrp_plan.k12') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const value = String(row.status ?? 'draft');
        const config = statusColorConfig[value] || statusColorConfig.draft;
        return React.createElement(Chip, {
          label: config.label,
          size: 'small',
          color: config.color,
          variant: 'outlined',
        });
      },
    },
    {
      name: 'calculated_at',
      label: i18n.t('scm.mrp_plan.k13'),
      type: 'text',
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.calculated_at as string | undefined;
        return val ? new Date(val).toLocaleString('zh-CN') : '-';
      },
    },
    {
      name: 'description',
      label: i18n.t('scm.mrp_plan.k14'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
  ],

  list: {
    columns: [
      'plan_code',
      'plan_name',
      'start_date',
      'end_date',
      'status',
      'calculated_at',
      'description',
    ],
    searchFields: ['plan_name', 'plan_code', 'description'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        calculated: 'success',
        processing: 'warning',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('scm.mrp_plan.k15'),
        calculated: i18n.t('scm.mrp_plan.k16'),
        processing: i18n.t('scm.mrp_plan.k17'),
        cancelled: i18n.t('scm.mrp_plan.k18'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('scm.mrp_plan.k19'),
        type: 'select',
        options: [
          { label: i18n.t('scm.mrp_plan.k20'), value: 'all' },
          { label: i18n.t('scm.mrp_plan.k21'), value: 'draft' },
          { label: i18n.t('scm.mrp_plan.k22'), value: 'calculated' },
          { label: i18n.t('scm.mrp_plan.k23'), value: 'processing' },
          { label: i18n.t('scm.mrp_plan.k24'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('scm.mrp_plan.k25'),
      fields: ['plan_name', 'plan_code', 'start_date', 'end_date'],
    },
    {
      title: i18n.t('scm.mrp_plan.k26'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.mrp_plan.mrp_27'),
  editTitle: i18n.t('scm.mrp_plan.mrp_28'),
  detailTitle: i18n.t('shared.mrp_plan.mrp_2'),
};
