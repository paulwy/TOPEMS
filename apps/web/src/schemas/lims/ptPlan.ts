import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const ptPlanStatusColorMap: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  [i18n.t('schemas.pt_plan.k0')]: 'default',
  [i18n.t('schemas.pt_plan.k1')]: 'primary',
  [i18n.t('schemas.pt_plan.k2')]: 'success',
  [i18n.t('schemas.pt_plan.k3')]: 'info',
};

const ptPlanStatusLabelMap: Record<string, string> = {
  [i18n.t('schemas.pt_plan.k4')]: i18n.t('lims.pt_plan.k0'),
  [i18n.t('schemas.pt_plan.k5')]: i18n.t('lims.pt_plan.k1'),
  [i18n.t('schemas.pt_plan.k6')]: i18n.t('lims.pt_plan.k2'),
  [i18n.t('schemas.pt_plan.k7')]: i18n.t('lims.pt_plan.k3'),
};

function renderPtPlanStatusCell(row: Record<string, unknown>) {
  const status = String(row.status ?? '');
  const color = ptPlanStatusColorMap[status] || 'default';
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

export const ptPlanSchema: EntitySchema = {
  entity: 'limsPtPlan',
  title: i18n.t('lims.pt_plan.k4'),
  description: i18n.t('lims.pt_plan.k5'),

  api: {
    module: 'lims',
    resource: 'ptPlans',
  },

  fields: [
    {
      name: 'plan_no',
      label: i18n.t('lims.pt_plan.k6'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      placeholder: i18n.t('lims.pt_plan.k7'),
    },
    {
      name: 'plan_name',
      label: i18n.t('lims.pt_plan.k8'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      placeholder: i18n.t('lims.pt_plan.k9'),
    },
    {
      name: 'provider',
      label: i18n.t('lims.pt_plan.k10'),
      type: 'text',
      listWidth: 140,
      showInList: false,
      placeholder: i18n.t('lims.pt_plan.k11'),
    },
    {
      name: 'testitem',
      label: i18n.t('lims.pt_plan.k12'),
      type: 'text',
      listWidth: 140,
      showInList: false,
      placeholder: i18n.t('lims.pt_plan.k13'),
    },
    {
      name: 'test_method',
      label: i18n.t('lims.pt_plan.k14'),
      type: 'text',
      listWidth: 140,
      showInList: false,
      placeholder: i18n.t('lims.pt_plan.k15'),
    },
    {
      name: 'plan_year',
      label: i18n.t('lims.pt_plan.k16'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: i18n.t('lims.pt_plan.k17'), label: i18n.t('lims.pt_plan.k18') },
          { value: i18n.t('lims.pt_plan.k19'), label: i18n.t('lims.pt_plan.k20') },
          { value: i18n.t('lims.pt_plan.k21'), label: i18n.t('lims.pt_plan.k22') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'sample_type',
      label: i18n.t('lims.pt_plan.k23'),
      type: 'text',
      listWidth: 120,
      showInList: false,
      placeholder: i18n.t('lims.pt_plan.k24'),
    },
    {
      name: 'status',
      label: i18n.t('lims.pt_plan.k25'),
      type: 'select',
      defaultValue: i18n.t('lims.pt_plan.k26'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('lims.pt_plan.k27'), label: i18n.t('lims.pt_plan.k28') },
          { value: i18n.t('lims.pt_plan.k29'), label: i18n.t('lims.pt_plan.k30') },
          { value: i18n.t('lims.pt_plan.k31'), label: i18n.t('lims.pt_plan.k32') },
          { value: i18n.t('lims.pt_plan.k33'), label: i18n.t('lims.pt_plan.k34') },
        ],
      },
      listWidth: 100,
      renderCell: renderPtPlanStatusCell,
    },
    {
      name: 'registration_date',
      label: i18n.t('lims.pt_plan.k35'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'registration_date'),
    },
    {
      name: 'test_deadline',
      label: i18n.t('lims.pt_plan.k36'),
      type: 'date',
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'test_deadline'),
    },
    {
      name: 'report_deadline',
      label: i18n.t('lims.pt_plan.k37'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'report_deadline'),
    },
    {
      name: 'contact_person',
      label: i18n.t('lims.pt_plan.k38'),
      type: 'text',
      listWidth: 100,
      showInList: false,
      placeholder: i18n.t('lims.pt_plan.k39'),
    },
    {
      name: 'contact_phone',
      label: i18n.t('lims.pt_plan.k40'),
      type: 'text',
      listWidth: 120,
      showInList: false,
      placeholder: i18n.t('lims.pt_plan.k41'),
    },
    {
      name: 'notes',
      label: i18n.t('lims.pt_plan.k42'),
      type: 'textarea',
      showInList: false,
      placeholder: i18n.t('lims.pt_plan.k43'),
    },
    {
      name: 'created_at',
      label: i18n.t('lims.pt_plan.k44'),
      type: 'date',
      readonly: true,
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'updated_at',
      label: i18n.t('lims.pt_plan.k45'),
      type: 'date',
      readonly: true,
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'updated_at'),
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['plan_no', 'plan_name'],
    filters: [
      {
        id: 'status',
        label: i18n.t('lims.pt_plan.k46'),
        type: 'select',
        options: [
          { label: i18n.t('lims.pt_plan.k47'), value: 'all' },
          { label: i18n.t('lims.pt_plan.k48'), value: i18n.t('lims.pt_plan.k49') },
          { label: i18n.t('lims.pt_plan.k50'), value: i18n.t('lims.pt_plan.k51') },
          { label: i18n.t('lims.pt_plan.k52'), value: i18n.t('lims.pt_plan.k53') },
          { label: i18n.t('lims.pt_plan.k54'), value: i18n.t('lims.pt_plan.k55') },
        ],
        defaultValue: 'all',
      },
      {
        id: 'cycle',
        label: i18n.t('lims.pt_plan.k56'),
        type: 'select',
        options: [
          { label: i18n.t('lims.pt_plan.k57'), value: 'all' },
          { label: i18n.t('lims.pt_plan.k58'), value: i18n.t('lims.pt_plan.k59') },
          { label: i18n.t('lims.pt_plan.k60'), value: i18n.t('lims.pt_plan.k61') },
          { label: i18n.t('lims.pt_plan.k62'), value: i18n.t('lims.pt_plan.k63') },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: ptPlanStatusColorMap,
      labelMap: ptPlanStatusLabelMap,
    },
  },

  formSections: [
    {
      title: i18n.t('lims.pt_plan.k64'),
      fields: ['plan_no', 'plan_name', 'plan_year', 'status'],
    },
    {
      title: i18n.t('lims.pt_plan.k65'),
      fields: ['provider', 'testitem', 'test_method', 'sample_type'],
    },
    {
      title: i18n.t('lims.pt_plan.k66'),
      fields: ['registration_date', 'test_deadline', 'report_deadline'],
    },
    {
      title: i18n.t('lims.pt_plan.k67'),
      fields: ['contact_person', 'contact_phone'],
    },
    {
      title: i18n.t('lims.pt_plan.k68'),
      fields: ['notes'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('lims.pt_plan.k69'),
  editTitle: i18n.t('lims.pt_plan.k70'),
  detailTitle: i18n.t('lims.pt_plan.k71'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
