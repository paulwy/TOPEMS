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
  high: i18n.t('qms.nonconformance.k0'),
  critical: i18n.t('qms.nonconformance.k1'),
  medium: i18n.t('qms.nonconformance.k2'),
  low: i18n.t('qms.nonconformance.k3'),
};

export const nonconformanceSchema: EntitySchema = {
  entity: 'quality_issue',
  title: i18n.t('qms.nonconformance.k4'),
  description: i18n.t('qms.nonconformance.k5'),

  api: {
    module: 'qms',
    resource: 'issues',
    listMethod: 'listIssues',
    createMethod: 'createIssue',
    updateMethod: 'updateIssue',
    deleteMethod: 'deleteIssue',
  },

  fields: [
    {
      name: 'issue_no',
      label: i18n.t('qms.nonconformance.k6'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      placeholder: 'NC-XXXX-XXX',
    },
    {
      name: 'title',
      label: i18n.t('qms.nonconformance.k7'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      placeholder: i18n.t('qms.nonconformance.k8'),
    },
    {
      name: 'category',
      label: i18n.t('qms.nonconformance.k9'),
      type: 'text',
      listWidth: 120,
      placeholder: i18n.t('qms.nonconformance.k10'),
    },
    {
      name: 'severity',
      label: i18n.t('qms.nonconformance.k11'),
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: i18n.t('qms.nonconformance.k12') },
          { value: 'medium', label: i18n.t('qms.nonconformance.k13') },
          { value: 'low', label: i18n.t('qms.nonconformance.k14') },
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
      label: i18n.t('qms.nonconformance.k15'),
      type: 'select',
      defaultValue: 'open',
      options: {
        type: 'static',
        options: [
          { value: 'open', label: i18n.t('qms.nonconformance.k16') },
          { value: 'in_progress', label: i18n.t('qms.nonconformance.k17') },
          { value: 'closed', label: i18n.t('qms.nonconformance.k18') },
          { value: 'resolved', label: i18n.t('qms.nonconformance.k19') },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'assignee',
      label: i18n.t('qms.nonconformance.k20'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'description',
      label: i18n.t('qms.nonconformance.k21'),
      type: 'textarea',
      placeholder: i18n.t('shared.nonconformance.k0'),
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('qms.nonconformance.k22'),
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'updated_at',
      label: i18n.t('qms.nonconformance.k23'),
      type: 'date',
      readonly: true,
      showInList: false,
    },
    {
      name: 'due_date',
      label: i18n.t('qms.nonconformance.k24'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'resolution',
      label: i18n.t('qms.nonconformance.k25'),
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
        label: i18n.t('qms.nonconformance.k26'),
        type: 'select',
        options: [
          { label: i18n.t('qms.nonconformance.k27'), value: 'all' },
          { label: i18n.t('qms.nonconformance.k28'), value: 'high' },
          { label: i18n.t('qms.nonconformance.k29'), value: 'medium' },
          { label: i18n.t('qms.nonconformance.k30'), value: 'low' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('qms.nonconformance.k31'),
        type: 'select',
        options: [
          { label: i18n.t('qms.nonconformance.k32'), value: 'all' },
          { label: i18n.t('qms.nonconformance.k33'), value: 'open' },
          { label: i18n.t('qms.nonconformance.k34'), value: 'in_progress' },
          { label: i18n.t('qms.nonconformance.k35'), value: 'closed' },
          { label: i18n.t('qms.nonconformance.k36'), value: 'resolved' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        open: 'error',
        in_progress: 'warning',
        closed: 'default',
        resolved: 'success',
      },
      labelMap: {
        open: i18n.t('qms.nonconformance.k37'),
        in_progress: i18n.t('qms.nonconformance.k38'),
        closed: i18n.t('qms.nonconformance.k39'),
        resolved: i18n.t('qms.nonconformance.k40'),
      },
    },
  },

  formSections: [
    {
      title: i18n.t('qms.nonconformance.k41'),
      fields: ['issue_no', 'title', 'category', 'severity', 'status'],
    },
    {
      title: i18n.t('qms.nonconformance.k42'),
      fields: ['description', 'assignee', 'due_date'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('qms.nonconformance.k43'),
  editTitle: i18n.t('qms.nonconformance.k44'),
  detailTitle: i18n.t('qms.nonconformance.k45'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
