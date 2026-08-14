import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const REPORT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'rs_project_progress', label: i18n.t('shared.report.k0') },
  { value: 'rs_experiment_record', label: i18n.t('shared.report.k1') },
  { value: 'lims_inspection_stats', label: i18n.t('shared.report.k2') },
  { value: 'lims_sample_summary', label: i18n.t('shared.report.k3') },
  { value: 'qms_quality_analysis', label: i18n.t('shared.report.k4') },
  { value: 'qms_defect_stats', label: i18n.t('shared.report.k5') },
  { value: 'ehs_safety_check', label: i18n.t('shared.report.k6') },
  { value: 'ehs_risk_assessment', label: i18n.t('shared.report.k7') },
  { value: 'srm_supplier_eval', label: i18n.t('shared.report.k8') },
  { value: 'srm_purchase_stats', label: i18n.t('shared.report.k9') },
  { value: 'pdm_production_stats', label: i18n.t('shared.report.k10') },
  { value: 'pdm_process_summary', label: i18n.t('shared.report.k11') },
];

function getConfig(row: Record<string, unknown>): {
  title?: string;
  report_type?: string;
} {
  const config = row.config as { title?: string; report_type?: string } | undefined;
  return config ?? {};
}

export const reportSchema: EntitySchema = {
  entity: 'report',
  title: i18n.t('shared.report.k12'),
  description: i18n.t('shared.report.k13'),

  api: {
    module: 'report',
    resource: 'reports',
  },

  fields: [
    {
      name: 'id',
      label: i18n.t('shared.report.id_14'),
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'title',
      label: i18n.t('shared.report.k15'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 220,
      renderCell: (row: Record<string, unknown>) => {
        const title = getConfig(row).title ?? '-';
        return React.createElement('span', null, title);
      },
    },
    {
      name: 'report_type',
      label: i18n.t('shared.report.k16'),
      type: 'select',
      required: true,
      defaultValue: 'rs_project_progress',
      options: { type: 'static', options: REPORT_TYPE_OPTIONS },
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        const reportType = getConfig(row).report_type ?? '';
        const label = REPORT_TYPE_OPTIONS.find((o) => o.value === reportType)?.label || reportType;
        return React.createElement(Chip, {
          label,
          size: 'small',
          variant: 'outlined',
        });
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'row_count',
      label: i18n.t('shared.report.k17'),
      type: 'number',
      sortable: true,
      listWidth: 100,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.row_count as number | undefined;
        return val != null ? String(val) : '-';
      },
    },
    {
      name: 'created_at',
      label: i18n.t('shared.report.k18'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 180,
      hideInForm: true,
    },
  ],

  list: {
    columns: ['id', 'title', 'report_type', 'row_count', 'created_at'],
    searchFields: ['title'],
    pageSize: 10,
    filters: [
      {
        id: 'report_type',
        label: i18n.t('shared.report.k19'),
        type: 'select',
        options: [{ label: i18n.t('shared.report.k20'), value: 'all' }, ...REPORT_TYPE_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['detail', 'delete'],

  createTitle: i18n.t('shared.report.k21'),
  editTitle: i18n.t('shared.report.k22'),
  detailTitle: i18n.t('shared.report.k23'),
};
