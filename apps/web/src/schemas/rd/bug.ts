import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const SEVERITY_COLOR_MAP: Record<string, 'default' | 'error' | 'warning'> = {
  critical: 'error',
  major: 'warning',
  minor: 'default',
};

const SEVERITY_LABEL_MAP: Record<string, string> = {
  critical: i18n.t('rd.bug.k0'),
  major: i18n.t('rd.bug.k1'),
  minor: i18n.t('rd.bug.k2'),
};

const PRIORITY_LABEL_MAP: Record<string, string> = {
  high: i18n.t('rd.bug.k3'),
  medium: i18n.t('rd.bug.k4'),
  low: i18n.t('rd.bug.k5'),
};

const STATUS_COLOR_MAP: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  open: i18n.t('rd.bug.k6'),
  in_progress: i18n.t('rd.bug.k7'),
  resolved: i18n.t('rd.bug.k8'),
  closed: i18n.t('rd.bug.k9'),
};

export const bugSchema: EntitySchema = {
  entity: 'rd_bug',
  title: i18n.t('rd.bug.k10'),
  description: i18n.t('rd.bug.bug_11'),

  api: {
    module: 'rd',
    resource: 'bugs',
  },

  fields: [
    {
      name: 'bug_no',
      label: i18n.t('rd.bug.k12'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      hideInForm: true,
    },
    {
      name: 'bug_title',
      label: i18n.t('rd.bug.k13'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 250,
    },
    {
      name: 'severity',
      label: i18n.t('rd.bug.k14'),
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'critical', label: i18n.t('rd.bug.k15') },
          { value: 'major', label: i18n.t('rd.bug.k16') },
          { value: 'minor', label: i18n.t('rd.bug.k17') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.severity ?? '');
        return React.createElement(Chip, {
          label: SEVERITY_LABEL_MAP[val] || val,
          size: 'small',
          color: SEVERITY_COLOR_MAP[val] || 'default',
        });
      },
    },
    {
      name: 'priority',
      label: i18n.t('rd.bug.k18'),
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: i18n.t('rd.bug.k19') },
          { value: 'medium', label: i18n.t('rd.bug.k20') },
          { value: 'low', label: i18n.t('rd.bug.k21') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.priority ?? '');
        return React.createElement(Chip, {
          label: PRIORITY_LABEL_MAP[val] || val,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'status',
      label: i18n.t('rd.bug.k22'),
      type: 'select',
      defaultValue: 'open',
      options: {
        type: 'static',
        options: [
          { value: 'open', label: i18n.t('rd.bug.k23') },
          { value: 'in_progress', label: i18n.t('rd.bug.k24') },
          { value: 'resolved', label: i18n.t('rd.bug.k25') },
          { value: 'closed', label: i18n.t('rd.bug.k26') },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'assignee',
      label: i18n.t('rd.bug.k27'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'create_time',
      label: i18n.t('rd.bug.k28'),
      type: 'datetime',
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'description',
      label: i18n.t('rd.bug.k29'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['bug_no', 'bug_title', 'severity', 'priority', 'status', 'assignee', 'create_time'],
    searchFields: ['bug_no', 'bug_title'],
    pageSize: 10,
    filters: [
      {
        id: 'severity',
        label: i18n.t('rd.bug.k30'),
        type: 'select',
        options: [
          { label: i18n.t('rd.bug.k31'), value: 'all' },
          { label: i18n.t('rd.bug.k32'), value: 'critical' },
          { label: i18n.t('rd.bug.k33'), value: 'major' },
          { label: i18n.t('rd.bug.k34'), value: 'minor' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'priority',
        label: i18n.t('rd.bug.k35'),
        type: 'select',
        options: [
          { label: i18n.t('rd.bug.k36'), value: 'all' },
          { label: i18n.t('rd.bug.k37'), value: 'high' },
          { label: i18n.t('rd.bug.k38'), value: 'medium' },
          { label: i18n.t('rd.bug.k39'), value: 'low' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('rd.bug.k40'),
        type: 'select',
        options: [
          { label: i18n.t('rd.bug.k41'), value: 'all' },
          { label: i18n.t('rd.bug.k42'), value: 'open' },
          { label: i18n.t('rd.bug.k43'), value: 'in_progress' },
          { label: i18n.t('rd.bug.k44'), value: 'resolved' },
          { label: i18n.t('rd.bug.k45'), value: 'closed' },
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
      title: i18n.t('rd.bug.k46'),
      fields: ['bug_title', 'severity', 'priority', 'status', 'assignee'],
    },
    {
      title: i18n.t('rd.bug.k47'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.bug.k48'),
  editTitle: i18n.t('rd.bug.k49'),
  detailTitle: i18n.t('rd.bug.k50'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
