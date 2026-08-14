import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const severityColorMap: Record<string, 'error' | 'warning' | 'success'> = {
  high: 'error',
  critical: 'error',
  medium: 'warning',
  low: 'success',
};

const severityLabelMap: Record<string, string> = {
  high: i18n.t('qms.quality_control.k0'),
  critical: i18n.t('qms.quality_control.k1'),
  medium: i18n.t('qms.quality_control.k2'),
  low: i18n.t('qms.quality_control.k3'),
};

const issueStatusColorMap: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  open: 'error',
  in_progress: 'warning',
  closed: 'default',
  resolved: 'success',
};

const issueStatusLabelMap: Record<string, string> = {
  open: i18n.t('qms.quality_control.k4'),
  in_progress: i18n.t('qms.quality_control.k5'),
  closed: i18n.t('qms.quality_control.k6'),
  resolved: i18n.t('qms.quality_control.k7'),
};

const auditStatusColorMap: Record<string, 'primary' | 'warning' | 'success' | 'default'> = {
  scheduled: 'primary',
  planning: 'primary',
  in_progress: 'warning',
  completed: 'success',
};

const auditStatusLabelMap: Record<string, string> = {
  scheduled: i18n.t('qms.quality_control.k8'),
  planning: i18n.t('qms.quality_control.k9'),
  in_progress: i18n.t('qms.quality_control.k10'),
  completed: i18n.t('qms.quality_control.k11'),
};

export const qualityIssueSchema: EntitySchema = {
  entity: 'quality_issue',
  title: i18n.t('qms.quality_control.k12'),
  description: i18n.t('qms.quality_control.k13'),

  api: {
    module: 'qms',
    resource: 'issues',
  },

  fields: [
    {
      name: 'issue_no',
      label: i18n.t('qms.quality_control.k14'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      placeholder: 'NC-XXXX-XXX',
    },
    {
      name: 'title',
      label: i18n.t('qms.quality_control.k15'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      placeholder: i18n.t('qms.quality_control.k16'),
    },
    {
      name: 'category',
      label: i18n.t('qms.quality_control.k17'),
      type: 'text',
      listWidth: 120,
      placeholder: i18n.t('qms.quality_control.k18'),
    },
    {
      name: 'severity',
      label: i18n.t('qms.quality_control.k19'),
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: i18n.t('qms.quality_control.k20') },
          { value: 'medium', label: i18n.t('qms.quality_control.k21') },
          { value: 'low', label: i18n.t('qms.quality_control.k22') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.severity ?? '');
        const color = severityColorMap[val] || 'default';
        const label = severityLabelMap[val] || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          color,
          variant: 'filled',
        });
      },
      filterable: true,
    },
    {
      name: 'status',
      label: i18n.t('qms.quality_control.k23'),
      type: 'select',
      defaultValue: 'open',
      options: {
        type: 'static',
        options: [
          { value: 'open', label: i18n.t('qms.quality_control.k24') },
          { value: 'in_progress', label: i18n.t('qms.quality_control.k25') },
          { value: 'closed', label: i18n.t('qms.quality_control.k26') },
          { value: 'resolved', label: i18n.t('qms.quality_control.k27') },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'assignee',
      label: i18n.t('qms.quality_control.k28'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'description',
      label: i18n.t('qms.quality_control.k29'),
      type: 'textarea',
      placeholder: i18n.t('shared.quality_control.k0'),
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('qms.quality_control.k30'),
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'updated_at',
      label: i18n.t('qms.quality_control.k31'),
      type: 'date',
      readonly: true,
      showInList: false,
    },
    {
      name: 'due_date',
      label: i18n.t('qms.quality_control.k32'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'resolution',
      label: i18n.t('qms.quality_control.k33'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['title', 'issue_no'],
    filters: [
      {
        id: 'severity',
        label: i18n.t('qms.quality_control.k34'),
        type: 'select',
        options: [
          { label: i18n.t('qms.quality_control.k35'), value: 'all' },
          { label: i18n.t('qms.quality_control.k36'), value: 'high' },
          { label: i18n.t('qms.quality_control.k37'), value: 'medium' },
          { label: i18n.t('qms.quality_control.k38'), value: 'low' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('qms.quality_control.k39'),
        type: 'select',
        options: [
          { label: i18n.t('qms.quality_control.k40'), value: 'all' },
          { label: i18n.t('qms.quality_control.k41'), value: 'open' },
          { label: i18n.t('qms.quality_control.k42'), value: 'in_progress' },
          { label: i18n.t('qms.quality_control.k43'), value: 'closed' },
          { label: i18n.t('qms.quality_control.k44'), value: 'resolved' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: issueStatusColorMap,
      labelMap: issueStatusLabelMap,
    },
  },

  formSections: [
    {
      title: i18n.t('qms.quality_control.k45'),
      fields: ['issue_no', 'title', 'category', 'severity', 'status'],
    },
    {
      title: i18n.t('qms.quality_control.k46'),
      fields: ['description', 'assignee', 'due_date'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('qms.quality_control.k47'),
  editTitle: i18n.t('qms.quality_control.k48'),
  detailTitle: i18n.t('qms.quality_control.k49'),

  actions: ['create', 'edit', 'detail', 'delete'],
};

export const auditPlanSchema: EntitySchema = {
  entity: 'audit_plan',
  title: i18n.t('qms.quality_control.k50'),
  description: i18n.t('qms.quality_control.k51'),

  api: {
    module: 'qms',
    resource: 'auditPlans',
  },

  fields: [
    {
      name: 'plan_no',
      label: i18n.t('qms.quality_control.k52'),
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: i18n.t('qms.quality_control.k53'),
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'audit_type',
      label: i18n.t('qms.quality_control.k54'),
      type: 'text',
      readonly: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.audit_type ?? '');
        const label = val === 'internal' ? i18n.t('qms.quality_control.k56') : val === 'external' ? i18n.t('qms.quality_control.k55') : val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          color: val === 'internal' ? 'primary' : 'secondary',
          variant: 'filled',
        });
      },
    },
    {
      name: 'status',
      label: i18n.t('qms.quality_control.k57'),
      type: 'select',
      defaultValue: 'scheduled',
      options: {
        type: 'static',
        options: [
          { value: 'scheduled', label: i18n.t('qms.quality_control.k58') },
          { value: 'planning', label: i18n.t('qms.quality_control.k59') },
          { value: 'in_progress', label: i18n.t('qms.quality_control.k60') },
          { value: 'completed', label: i18n.t('qms.quality_control.k61') },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'auditor',
      label: i18n.t('qms.quality_control.k62'),
      type: 'text',
      readonly: true,
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: i18n.t('qms.quality_control.k63'),
      type: 'date',
      readonly: true,
      listWidth: 120,
    },
    {
      name: 'departments',
      label: i18n.t('qms.quality_control.k64'),
      type: 'text',
      readonly: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const depts = (row.departments as string[]) || [];
        return depts.join(', ') || '-';
      },
    },
    {
      name: 'description',
      label: i18n.t('qms.quality_control.k65'),
      type: 'textarea',
      readonly: true,
      showInList: false,
    },
    {
      name: 'scope',
      label: i18n.t('qms.quality_control.k66'),
      type: 'textarea',
      readonly: true,
      showInList: false,
    },
    {
      name: 'end_date',
      label: i18n.t('qms.quality_control.k67'),
      type: 'date',
      readonly: true,
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('qms.quality_control.k68'),
      type: 'date',
      readonly: true,
      showInList: false,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['title', 'plan_no'],
    filters: [
      {
        id: 'status',
        label: i18n.t('qms.quality_control.k69'),
        type: 'select',
        options: [
          { label: i18n.t('qms.quality_control.k70'), value: 'all' },
          { label: i18n.t('qms.quality_control.k71'), value: 'scheduled' },
          { label: i18n.t('qms.quality_control.k72'), value: 'planning' },
          { label: i18n.t('qms.quality_control.k73'), value: 'in_progress' },
          { label: i18n.t('qms.quality_control.k74'), value: 'completed' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: auditStatusColorMap,
      labelMap: auditStatusLabelMap,
    },
  },

  formSections: [
    {
      title: i18n.t('qms.quality_control.k75'),
      fields: ['plan_no', 'title', 'audit_type', 'status', 'auditor'],
    },
    {
      title: i18n.t('qms.quality_control.k76'),
      fields: ['start_date', 'end_date', 'departments', 'scope', 'description'],
    },
  ],

  formColCount: 2,
  detailTitle: i18n.t('qms.quality_control.k77'),

  actions: ['detail'],
};
