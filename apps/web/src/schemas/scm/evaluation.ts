import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const evaluationSchema: EntitySchema = {
  entity: 'evaluation',
  title: i18n.t('scm.evaluation.k0'),
  description: i18n.t('scm.evaluation.k1'),

  api: {
    module: 'scm',
    resource: 'evaluations',
  },

  fields: [
    {
      name: 'evaluation_no',
      label: i18n.t('scm.evaluation.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'supplier_id',
      label: i18n.t('scm.evaluation.k3'),
      type: 'text',
      required: true,
      listWidth: 160,
    },
    {
      name: 'evaluation_date',
      label: i18n.t('scm.evaluation.k4'),
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'evaluator',
      label: i18n.t('scm.evaluation.k5'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'quality_score',
      label: i18n.t('scm.evaluation.k6'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.quality_score as number | undefined;
        return val != null ? val.toFixed(1) : '-';
      },
    },
    {
      name: 'delivery_score',
      label: i18n.t('scm.evaluation.k7'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.delivery_score as number | undefined;
        return val != null ? val.toFixed(1) : '-';
      },
    },
    {
      name: 'service_score',
      label: i18n.t('scm.evaluation.k8'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.service_score as number | undefined;
        return val != null ? val.toFixed(1) : '-';
      },
    },
    {
      name: 'price_score',
      label: i18n.t('scm.evaluation.k9'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.price_score as number | undefined;
        return val != null ? val.toFixed(1) : '-';
      },
    },
    {
      name: 'overall_score',
      label: i18n.t('scm.evaluation.k10'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.overall_score as number | undefined;
        const style: React.CSSProperties = { fontWeight: 600 };
        return React.createElement('span', { style }, val != null ? val.toFixed(1) : '-');
      },
    },
    {
      name: 'status',
      label: i18n.t('scm.evaluation.k11'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('scm.evaluation.k12') },
          { value: 'submitted', label: i18n.t('scm.evaluation.k13') },
          { value: 'approved', label: i18n.t('scm.evaluation.k14') },
          { value: 'completed', label: i18n.t('scm.evaluation.k15') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'comments',
      label: i18n.t('scm.evaluation.k16'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'evaluation_no',
      'supplier_id',
      'evaluation_date',
      'quality_score',
      'delivery_score',
      'service_score',
      'price_score',
      'overall_score',
      'evaluator',
      'status',
    ],
    searchFields: ['evaluation_no', 'supplier_id', 'evaluator'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        submitted: 'warning',
        approved: 'info',
        completed: 'success',
      },
      labelMap: {
        draft: i18n.t('scm.evaluation.k17'),
        submitted: i18n.t('scm.evaluation.k18'),
        approved: i18n.t('scm.evaluation.k19'),
        completed: i18n.t('scm.evaluation.k20'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('scm.evaluation.k21'),
        type: 'select',
        options: [
          { label: i18n.t('scm.evaluation.k22'), value: 'all' },
          { label: i18n.t('scm.evaluation.k23'), value: 'draft' },
          { label: i18n.t('scm.evaluation.k24'), value: 'submitted' },
          { label: i18n.t('scm.evaluation.k25'), value: 'approved' },
          { label: i18n.t('scm.evaluation.k26'), value: 'completed' },
        ],
      },
      {
        id: 'supplier_id',
        label: i18n.t('scm.evaluation.k27'),
        type: 'select',
        options: [],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('scm.evaluation.k28'),
      fields: ['evaluation_no', 'supplier_id', 'evaluation_date', 'evaluator', 'status'],
    },
    {
      title: i18n.t('scm.evaluation.k29'),
      fields: ['quality_score', 'delivery_score', 'service_score', 'price_score', 'overall_score'],
    },
    {
      title: i18n.t('scm.evaluation.k30'),
      fields: ['comments'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.evaluation.k31'),
  editTitle: i18n.t('scm.evaluation.k32'),
  detailTitle: i18n.t('scm.evaluation.k33'),
};
