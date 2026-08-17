import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const inspectionTypeMap: Record<string, string> = {
  incoming: i18n.t('qms.inspection.k0'),
  process: i18n.t('qms.inspection.k1'),
  final: i18n.t('qms.inspection.k2'),
  routine: i18n.t('qms.inspection.k3'),
};

export const inspectionSchema: EntitySchema = {
  entity: 'quality_check',
  title: i18n.t('qms.inspection.k4'),
  description: i18n.t('qms.inspection.k5'),

  api: {
    module: 'qms',
    resource: 'inspection',
    listMethod: 'listChecks',
    createMethod: 'createCheck',
    updateMethod: 'updateCheck',
    deleteMethod: 'deleteCheck',
  },

  fields: [
    {
      name: 'inspection_no',
      label: i18n.t('qms.inspection.k6'),
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'inspection_type',
      label: i18n.t('qms.inspection.k7'),
      type: 'select',
      required: true,
      defaultValue: 'incoming',
      options: {
        type: 'static',
        options: [
          { value: 'incoming', label: i18n.t('qms.inspection.k8') },
          { value: 'process', label: i18n.t('qms.inspection.k9') },
          { value: 'final', label: i18n.t('qms.inspection.k10') },
          { value: 'routine', label: i18n.t('qms.inspection.k11') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.inspection_type ?? '');
        const label = inspectionTypeMap[val] || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'product_name',
      label: i18n.t('qms.inspection.k12'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      placeholder: i18n.t('qms.inspection.k13'),
    },
    {
      name: 'quantity',
      label: i18n.t('qms.inspection.k14'),
      type: 'number',
      defaultValue: 100,
      listWidth: 100,
    },
    {
      name: 'qualified_quantity',
      label: i18n.t('qms.inspection.k15'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'unqualified_quantity',
      label: i18n.t('qms.inspection.k16'),
      type: 'number',
      listWidth: 110,
    },
    {
      name: 'qualification_rate',
      label: i18n.t('qms.inspection.k17'),
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const rate = Number(row.qualification_rate ?? 0);
        const color =
          rate >= 95
            ? 'success.dark'
            : rate >= 90
              ? designTokens.colors.warning[600]
              : 'error.dark';
        return React.createElement(
          'span',
          { style: { color, fontWeight: 500 } },
          rate !== undefined && rate !== null ? `${rate.toFixed(1)}%` : '-'
        );
      },
    },
    {
      name: 'assignee',
      label: i18n.t('qms.inspection.k18'),
      type: 'text',
      listWidth: 110,
    },
    {
      name: 'inspector',
      label: i18n.t('qms.inspection.k19'),
      type: 'text',
      listWidth: 110,
    },
    {
      name: 'inspected_at',
      label: i18n.t('qms.inspection.k20'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('qms.inspection.k21'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('qms.inspection.k22') },
          { value: 'in_progress', label: i18n.t('qms.inspection.k23') },
          { value: 'pending_audit', label: i18n.t('qms.inspection.k24') },
          { value: 'completed', label: i18n.t('qms.inspection.k25') },
          { value: 'rejected', label: i18n.t('qms.inspection.k26') },
        ],
      },
      listWidth: 110,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'result',
      label: i18n.t('qms.inspection.k27'),
      type: 'text',
      showInList: false,
      showInDetail: true,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'memo',
      label: i18n.t('qms.inspection.k28'),
      type: 'textarea',
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'created_at',
      label: i18n.t('qms.inspection.k29'),
      type: 'date',
      readonly: true,
      sortable: true,
      showInList: false,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['product_name', 'inspection_no'],
    filters: [
      {
        id: 'inspection_type',
        label: i18n.t('qms.inspection.k30'),
        type: 'select',
        options: [
          { label: i18n.t('qms.inspection.k31'), value: 'all' },
          { label: i18n.t('qms.inspection.k32'), value: 'incoming' },
          { label: i18n.t('qms.inspection.k33'), value: 'process' },
          { label: i18n.t('qms.inspection.k34'), value: 'final' },
          { label: i18n.t('qms.inspection.k35'), value: 'routine' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('qms.inspection.k36'),
        type: 'select',
        options: [
          { label: i18n.t('qms.inspection.k37'), value: 'all' },
          { label: i18n.t('qms.inspection.k38'), value: 'pending' },
          { label: i18n.t('qms.inspection.k39'), value: 'in_progress' },
          { label: i18n.t('qms.inspection.k40'), value: 'pending_audit' },
          { label: i18n.t('qms.inspection.k41'), value: 'completed' },
          { label: i18n.t('qms.inspection.k42'), value: 'rejected' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        in_progress: 'primary',
        pending_audit: 'secondary',
        completed: 'success',
        rejected: 'error',
      },
      labelMap: {
        pending: i18n.t('qms.inspection.k43'),
        in_progress: i18n.t('qms.inspection.k44'),
        pending_audit: i18n.t('qms.inspection.k45'),
        completed: i18n.t('qms.inspection.k46'),
        rejected: i18n.t('qms.inspection.k47'),
      },
    },
  },

  formSections: [
    {
      title: i18n.t('qms.inspection.k48'),
      fields: ['inspection_type', 'product_name', 'quantity'],
    },
    {
      title: i18n.t('qms.inspection.k49'),
      fields: ['qualified_quantity', 'unqualified_quantity', 'memo'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('qms.inspection.k50'),
  editTitle: i18n.t('qms.inspection.k51'),
  detailTitle: i18n.t('qms.inspection.k52'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
