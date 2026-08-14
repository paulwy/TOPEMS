import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const statusColorMap: Record<string, 'default' | 'primary' | 'success'> = {
  [i18n.t('schemas.uncertainty.k0')]: 'default',
  [i18n.t('schemas.uncertainty.k1')]: 'primary',
  [i18n.t('schemas.uncertainty.k2')]: 'success',
};

function renderStatusCell(row: Record<string, unknown>) {
  const status = String(row.status ?? '');
  const color = statusColorMap[status] || 'default';
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

function renderCombinedUncertaintyCell(row: Record<string, unknown>) {
  const val = row.combined_uncertainty as number | null | undefined;
  if (val === undefined || val === null) return '-';
  return val.toFixed(4);
}

export const uncertaintyProjectSchema: EntitySchema = {
  entity: 'limsUncertaintyProject',
  title: i18n.t('lims.uncertainty.k0'),
  description: i18n.t('lims.uncertainty.k1'),

  api: {
    module: 'lims',
    resource: 'uncertaintyProjects',
    listMethod: 'listUncertaintyProjects',
    createMethod: 'createUncertaintyProject',
    updateMethod: 'updateUncertaintyProject',
    deleteMethod: 'deleteUncertaintyProject',
  },

  fields: [
    {
      name: 'project_no',
      label: i18n.t('lims.uncertainty.k2'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      placeholder: i18n.t('lims.uncertainty.k3'),
    },
    {
      name: 'project_name',
      label: i18n.t('lims.uncertainty.k4'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      placeholder: i18n.t('lims.uncertainty.k5'),
    },
    {
      name: 'method_name',
      label: i18n.t('lims.uncertainty.k6'),
      type: 'text',
      listWidth: 180,
      placeholder: i18n.t('lims.uncertainty.k7'),
    },
    {
      name: 'testitem',
      label: i18n.t('lims.uncertainty.k8'),
      type: 'text',
      showInList: false,
      placeholder: i18n.t('lims.uncertainty.k9'),
    },
    {
      name: 'measurand',
      label: i18n.t('lims.uncertainty.k10'),
      type: 'text',
      showInList: false,
      placeholder: i18n.t('lims.uncertainty.k11'),
    },
    {
      name: 'measurement_range',
      label: i18n.t('lims.uncertainty.k12'),
      type: 'text',
      showInList: false,
      placeholder: i18n.t('lims.uncertainty.k13'),
    },
    {
      name: 'unit',
      label: i18n.t('lims.uncertainty.k14'),
      type: 'text',
      showInList: false,
      placeholder: i18n.t('lims.uncertainty.k15'),
    },
    {
      name: 'combined_uncertainty',
      label: i18n.t('lims.uncertainty.k16'),
      type: 'number',
      readonly: true,
      listWidth: 120,
      renderCell: renderCombinedUncertaintyCell,
    },
    {
      name: 'expanded_uncertainty',
      label: i18n.t('lims.uncertainty.k17'),
      type: 'number',
      readonly: true,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'coverage_factor',
      label: i18n.t('lims.uncertainty.k18'),
      type: 'number',
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'confidencelevel',
      label: i18n.t('lims.uncertainty.k19'),
      type: 'number',
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'status',
      label: i18n.t('lims.uncertainty.k20'),
      type: 'select',
      defaultValue: i18n.t('lims.uncertainty.k21'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('lims.uncertainty.k22'), label: i18n.t('lims.uncertainty.k23') },
          { value: i18n.t('lims.uncertainty.k24'), label: i18n.t('lims.uncertainty.k25') },
          { value: i18n.t('lims.uncertainty.k26'), label: i18n.t('lims.uncertainty.k27') },
        ],
      },
      listWidth: 100,
      renderCell: renderStatusCell,
    },
    {
      name: 'evaluator',
      label: i18n.t('lims.uncertainty.k28'),
      type: 'text',
      listWidth: 100,
      showInList: false,
      placeholder: i18n.t('lims.uncertainty.k29'),
    },
    {
      name: 'evaluation_date',
      label: i18n.t('lims.uncertainty.k30'),
      type: 'date',
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'evaluation_date'),
    },
    {
      name: 'created_at',
      label: i18n.t('lims.uncertainty.k31'),
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'notes',
      label: i18n.t('lims.uncertainty.k32'),
      type: 'textarea',
      showInList: false,
      placeholder: i18n.t('lims.uncertainty.k33'),
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['project_no', 'project_name'],
    filters: [
      {
        id: 'status',
        label: i18n.t('lims.uncertainty.k34'),
        type: 'select',
        options: [
          { label: i18n.t('lims.uncertainty.k35'), value: 'all' },
          { label: i18n.t('lims.uncertainty.k36'), value: i18n.t('lims.uncertainty.k37') },
          { label: i18n.t('lims.uncertainty.k38'), value: i18n.t('lims.uncertainty.k39') },
          { label: i18n.t('lims.uncertainty.k40'), value: i18n.t('lims.uncertainty.k41') },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: statusColorMap,
      labelMap: {
        [i18n.t('schemas.uncertainty.k3')]: i18n.t('lims.uncertainty.k42'),
        [i18n.t('schemas.uncertainty.k4')]: i18n.t('lims.uncertainty.k43'),
        [i18n.t('schemas.uncertainty.k5')]: i18n.t('lims.uncertainty.k44'),
      },
    },
  },

  formSections: [
    {
      title: i18n.t('lims.uncertainty.k45'),
      fields: ['project_no', 'project_name', 'method_name', 'status'],
    },
    {
      title: i18n.t('lims.uncertainty.k46'),
      fields: [
        'testitem',
        'measurand',
        'measurement_range',
        'unit',
        'evaluator',
        'evaluation_date',
      ],
    },
    {
      title: i18n.t('lims.uncertainty.k47'),
      fields: [
        'combined_uncertainty',
        'expanded_uncertainty',
        'coverage_factor',
        'confidencelevel',
      ],
    },
    {
      title: i18n.t('lims.uncertainty.k48'),
      fields: ['notes'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('lims.uncertainty.k49'),
  editTitle: i18n.t('lims.uncertainty.k50'),
  detailTitle: i18n.t('lims.uncertainty.k51'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
