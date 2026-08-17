import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const auditStatusColorMap: Record<string, 'primary' | 'warning' | 'success' | 'default'> = {
  scheduled: 'primary',
  planning: 'primary',
  in_progress: 'warning',
  completed: 'success',
};

const auditStatusLabelMap: Record<string, string> = {
  scheduled: i18n.t('qms.audit.k0'),
  planning: i18n.t('qms.audit.k1'),
  in_progress: i18n.t('qms.audit.k2'),
  completed: i18n.t('qms.audit.k3'),
};

export const auditSchema: EntitySchema = {
  entity: 'audit_plan',
  title: i18n.t('qms.audit.k4'),
  description: i18n.t('shared.audit.k0'),

  api: {
    module: 'qms',
    resource: 'auditPlans',
  },

  fields: [
    {
      name: 'plan_no',
      label: i18n.t('qms.audit.k5'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: i18n.t('qms.audit.k6'),
      type: 'text',
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'audit_type',
      label: i18n.t('qms.audit.k7'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.audit_type ?? '');
        const label =
          val === 'internal'
            ? i18n.t('qms.audit.k9')
            : val === 'external'
              ? i18n.t('qms.audit.k8')
              : val;
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
      label: i18n.t('qms.audit.k10'),
      type: 'select',
      defaultValue: 'scheduled',
      options: {
        type: 'static',
        options: [
          { value: 'scheduled', label: i18n.t('qms.audit.k11') },
          { value: 'planning', label: i18n.t('qms.audit.k12') },
          { value: 'in_progress', label: i18n.t('qms.audit.k13') },
          { value: 'completed', label: i18n.t('qms.audit.k14') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.status ?? '');
        const color = auditStatusColorMap[val] || 'default';
        const label = auditStatusLabelMap[val] || val;
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
      name: 'auditor',
      label: i18n.t('qms.audit.k15'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: i18n.t('qms.audit.k16'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'departments',
      label: i18n.t('qms.audit.k17'),
      type: 'text',
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const depts = (row.departments as string[]) || [];
        return depts.join(', ') || '-';
      },
    },
    {
      name: 'description',
      label: i18n.t('qms.audit.k18'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'scope',
      label: i18n.t('qms.audit.k19'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'end_date',
      label: i18n.t('qms.audit.k20'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('qms.audit.k21'),
      type: 'date',
      readonly: true,
      showInList: false,
      sortable: true,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['title', 'plan_no'],
    filters: [
      {
        id: 'status',
        label: i18n.t('qms.audit.k22'),
        type: 'select',
        options: [
          { label: i18n.t('qms.audit.k23'), value: 'all' },
          { label: i18n.t('qms.audit.k24'), value: 'scheduled' },
          { label: i18n.t('qms.audit.k25'), value: 'planning' },
          { label: i18n.t('qms.audit.k26'), value: 'in_progress' },
          { label: i18n.t('qms.audit.k27'), value: 'completed' },
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
      title: i18n.t('qms.audit.k28'),
      fields: ['plan_no', 'title', 'audit_type', 'status', 'auditor'],
    },
    {
      title: i18n.t('qms.audit.k29'),
      fields: ['start_date', 'end_date', 'departments', 'scope', 'description'],
    },
  ],

  formColCount: 2,
  detailTitle: i18n.t('qms.audit.k30'),

  actions: ['detail'],
};
