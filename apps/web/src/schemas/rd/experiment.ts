import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const PHASE_COLOR_MAP: Record<string, 'info' | 'warning' | 'error' | 'default'> = {
  [i18n.t('schemas.experiment.k0')]: 'info',
  [i18n.t('schemas.experiment.k1')]: 'warning',
  [i18n.t('schemas.experiment.k2')]: 'error',
};

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  [i18n.t('schemas.experiment.k3')]: 'primary',
  [i18n.t('schemas.experiment.k4')]: 'success',
  [i18n.t('schemas.experiment.k5')]: 'warning',
  [i18n.t('schemas.experiment.k6')]: 'error',
};

export const experimentSchema: EntitySchema = {
  entity: 'rd_experiment',
  title: i18n.t('rd.experiment.k0'),
  description: i18n.t('rd.experiment.k1'),

  api: {
    module: 'rd',
    resource: 'experiments',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('rd.experiment.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('rd.experiment.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'project_id',
      label: i18n.t('rd.experiment.k4'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.project_name || row.project_id;
        return val ? String(val) : '-';
      },
    },
    {
      name: 'phase',
      label: i18n.t('rd.experiment.k5'),
      type: 'select',
      defaultValue: i18n.t('rd.experiment.k6'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('rd.experiment.k7'), label: i18n.t('rd.experiment.k8') },
          { value: i18n.t('rd.experiment.k9'), label: i18n.t('rd.experiment.k10') },
          { value: i18n.t('rd.experiment.k11'), label: i18n.t('rd.experiment.k12') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.phase ?? '');
        const color = PHASE_COLOR_MAP[val] || 'default';
        return React.createElement(Chip, { label: val, size: 'small', color });
      },
    },
    {
      name: 'status',
      label: i18n.t('rd.experiment.k13'),
      type: 'select',
      defaultValue: i18n.t('rd.experiment.k14'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('rd.experiment.k15'), label: i18n.t('rd.experiment.k16') },
          { value: i18n.t('rd.experiment.k17'), label: i18n.t('rd.experiment.k18') },
          { value: i18n.t('rd.experiment.k19'), label: i18n.t('rd.experiment.k20') },
          { value: i18n.t('rd.experiment.k21'), label: i18n.t('rd.experiment.k22') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.status ?? '');
        const color = STATUS_COLOR_MAP[val] || 'default';
        return React.createElement(Chip, { label: val, size: 'small', color });
      },
    },
    {
      name: 'experimenter',
      label: i18n.t('rd.experiment.k23'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'started_at',
      label: i18n.t('rd.experiment.k24'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'batch_number',
      label: i18n.t('rd.experiment.k25'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.batch_number;
        return val ? String(val) : '-';
      },
    },
    {
      name: 'experiment_type',
      label: i18n.t('rd.experiment.k26'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'objective',
      label: i18n.t('rd.experiment.k27'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'method',
      label: i18n.t('rd.experiment.k28'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'results',
      label: i18n.t('rd.experiment.k29'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'conclusions',
      label: i18n.t('rd.experiment.k30'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'scale',
      label: i18n.t('rd.experiment.k31'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'scale_unit',
      label: i18n.t('rd.experiment.k32'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'completed_at',
      label: i18n.t('rd.experiment.k33'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('rd.experiment.k34'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 130,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('rd.experiment.k35'),
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
      'project_id',
      'phase',
      'status',
      'experimenter',
      'started_at',
      'batch_number',
    ],
    searchFields: ['code', 'name', 'experimenter'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: i18n.t('rd.experiment.k36'),
        type: 'select',
        options: [
          { label: i18n.t('rd.experiment.k37'), value: 'all' },
          { label: i18n.t('rd.experiment.k38'), value: i18n.t('rd.experiment.k39') },
          { label: i18n.t('rd.experiment.k40'), value: i18n.t('rd.experiment.k41') },
          { label: i18n.t('rd.experiment.k42'), value: i18n.t('rd.experiment.k43') },
          { label: i18n.t('rd.experiment.k44'), value: i18n.t('rd.experiment.k45') },
        ],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('rd.experiment.k46'),
      fields: ['code', 'name', 'project_id', 'phase', 'status'],
    },
    {
      title: i18n.t('rd.experiment.k47'),
      fields: [
        'experiment_type',
        'objective',
        'method',
        'experimenter',
        'started_at',
        'batch_number',
      ],
    },
    {
      title: i18n.t('rd.experiment.k48'),
      fields: ['scale', 'scale_unit', 'results', 'conclusions', 'completed_at'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.experiment.k49'),
  editTitle: i18n.t('rd.experiment.k50'),
  detailTitle: i18n.t('rd.experiment.k51'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
