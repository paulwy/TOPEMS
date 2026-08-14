import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const PRIORITY_COLOR_MAP: Record<string, 'default' | 'warning' | 'error'> = {
  high: 'error',
  medium: 'warning',
  low: 'default',
};

const PRIORITY_LABEL_MAP: Record<string, string> = {
  high: i18n.t('rd.test.k0'),
  medium: i18n.t('rd.test.k1'),
  low: i18n.t('rd.test.k2'),
};

const STATUS_COLOR_MAP: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  passed: 'success',
  failed: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: i18n.t('rd.test.k3'),
  passed: i18n.t('rd.test.k4'),
  failed: i18n.t('rd.test.k5'),
};

export const testSchema: EntitySchema = {
  entity: 'rd_test_case',
  title: i18n.t('rd.test.k6'),
  description: i18n.t('rd.test.k7'),

  api: {
    module: 'rd',
    resource: 'tests',
  },

  fields: [
    {
      name: 'case_no',
      label: i18n.t('rd.test.k8'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'case_name',
      label: i18n.t('rd.test.k9'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 220,
    },
    {
      name: 'case_type',
      label: i18n.t('rd.test.k10'),
      type: 'select',
      defaultValue: i18n.t('rd.test.k11'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('rd.test.k12'), label: i18n.t('rd.test.k13') },
          { value: i18n.t('rd.test.k14'), label: i18n.t('rd.test.k15') },
          { value: i18n.t('rd.test.k16'), label: i18n.t('rd.test.k17') },
          { value: i18n.t('shared.test.ui_0'), label: i18n.t('shared.test.ui_1') },
          { value: i18n.t('rd.test.k18'), label: i18n.t('rd.test.k19') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'priority',
      label: i18n.t('rd.test.k20'),
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: i18n.t('rd.test.k21') },
          { value: 'medium', label: i18n.t('rd.test.k22') },
          { value: 'low', label: i18n.t('rd.test.k23') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.priority ?? '');
        const color = PRIORITY_COLOR_MAP[val] || 'default';
        const label = PRIORITY_LABEL_MAP[val] || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          color,
        });
      },
    },
    {
      name: 'status',
      label: i18n.t('rd.test.k24'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('rd.test.k25') },
          { value: 'passed', label: i18n.t('rd.test.k26') },
          { value: 'failed', label: i18n.t('rd.test.k27') },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'related_requirement',
      label: i18n.t('rd.test.k28'),
      type: 'text',
      listWidth: 200,
    },
  ],

  list: {
    columns: ['case_no', 'case_name', 'case_type', 'priority', 'status', 'related_requirement'],
    searchFields: ['case_no', 'case_name', 'related_requirement'],
    pageSize: 10,
    filters: [
      {
        id: 'case_type',
        label: i18n.t('rd.test.k29'),
        type: 'select',
        options: [
          { label: i18n.t('rd.test.k30'), value: 'all' },
          { label: i18n.t('rd.test.k31'), value: i18n.t('rd.test.k32') },
          { label: i18n.t('rd.test.k33'), value: i18n.t('rd.test.k34') },
          { label: i18n.t('rd.test.k35'), value: i18n.t('rd.test.k36') },
          { label: i18n.t('shared.test.ui_2'), value: i18n.t('shared.test.ui_3') },
          { label: i18n.t('rd.test.k37'), value: i18n.t('rd.test.k38') },
        ],
        defaultValue: 'all',
      },
      {
        id: 'priority',
        label: i18n.t('rd.test.k39'),
        type: 'select',
        options: [
          { label: i18n.t('rd.test.k40'), value: 'all' },
          { label: i18n.t('rd.test.k41'), value: 'high' },
          { label: i18n.t('rd.test.k42'), value: 'medium' },
          { label: i18n.t('rd.test.k43'), value: 'low' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('rd.test.k44'),
        type: 'select',
        options: [
          { label: i18n.t('rd.test.k45'), value: 'all' },
          { label: i18n.t('rd.test.k46'), value: 'pending' },
          { label: i18n.t('rd.test.k47'), value: 'passed' },
          { label: i18n.t('rd.test.k48'), value: 'failed' },
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
      title: i18n.t('rd.test.k49'),
      fields: ['case_name', 'case_type', 'priority', 'status'],
    },
    {
      title: i18n.t('rd.test.k50'),
      fields: ['related_requirement'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.test.k51'),
  editTitle: i18n.t('rd.test.k52'),
  detailTitle: i18n.t('rd.test.k53'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
