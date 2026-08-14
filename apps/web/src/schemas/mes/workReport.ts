import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const workReportSchema: EntitySchema = {
  entity: 'mes_work_report',
  title: i18n.t('mes.work_report.k0'),
  description: i18n.t('mes.work_report.k1'),

  api: {
    module: 'mes',
    resource: 'workReports',
  },

  fields: [
    {
      name: 'report_no',
      label: i18n.t('mes.work_report.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'order_number',
      label: i18n.t('mes.work_report.k3'),
      type: 'text',
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'process_name',
      label: i18n.t('mes.work_report.k4'),
      type: 'text',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'work_station_name',
      label: i18n.t('mes.work_report.k5'),
      type: 'text',
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'team_name',
      label: i18n.t('mes.work_report.k6'),
      type: 'text',
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'worker_name',
      label: i18n.t('mes.work_report.k7'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'quantity_good',
      label: i18n.t('mes.work_report.k8'),
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'quantity_bad',
      label: i18n.t('mes.work_report.k9'),
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'quantity_total',
      label: i18n.t('mes.work_report.k10'),
      type: 'number',
      sortable: true,
      listWidth: 100,
      readonly: true,
    },
    {
      name: 'start_time',
      label: i18n.t('mes.work_report.k11'),
      type: 'datetime',
      required: true,
      listWidth: 160,
    },
    {
      name: 'end_time',
      label: i18n.t('mes.work_report.k12'),
      type: 'datetime',
      required: true,
      listWidth: 160,
    },
    {
      name: 'actual_duration',
      label: i18n.t('mes.work_report.k13'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'standard_duration',
      label: i18n.t('mes.work_report.k14'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('mes.work_report.k15'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('mes.work_report.k16') },
          { value: 'submitted', label: i18n.t('mes.work_report.k17') },
          { value: 'approved', label: i18n.t('mes.work_report.k18') },
          { value: 'rejected', label: i18n.t('mes.work_report.k19') },
          { value: 'cancelled', label: i18n.t('mes.work_report.k20') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          draft: { label: i18n.t('mes.work_report.k21'), bg: 'grey.100', color: 'text.secondary' },
          submitted: { label: i18n.t('mes.work_report.k22'), bg: 'primary.100', color: 'primary.dark' },
          approved: { label: i18n.t('mes.work_report.k23'), bg: 'success.lighter', color: 'success.700' },
          rejected: { label: i18n.t('mes.work_report.k24'), bg: 'error.lighter', color: 'error.dark' },
          cancelled: { label: i18n.t('mes.work_report.k25'), bg: 'grey.100', color: 'text.secondary' },
        };
        const s = statusMap[(row.status as string) || 'draft'] || {
          label: row.status,
          bg: 'grey.100',
          color: 'text.secondary',
        };
        return React.createElement(Chip, {
          size: 'small',
          label: s.label,
          sx: { backgroundColor: s.bg, color: s.color, fontWeight: 500 },
        });
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'report_type',
      label: i18n.t('mes.work_report.k26'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'remark',
      label: i18n.t('mes.work_report.k27'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('mes.work_report.k28'),
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
    {
      name: 'updated_at',
      label: i18n.t('mes.work_report.k29'),
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'report_no',
      'order_number',
      'process_name',
      'work_station_name',
      'worker_name',
      'quantity_good',
      'quantity_bad',
      'quantity_total',
      'start_time',
      'end_time',
      'status',
    ],
    searchFields: ['report_no', 'order_number', 'worker_name'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.work_report.k30'),
        type: 'select',
        options: [
          { label: i18n.t('mes.work_report.k31'), value: 'all' },
          { label: i18n.t('mes.work_report.k32'), value: 'draft' },
          { label: i18n.t('mes.work_report.k33'), value: 'submitted' },
          { label: i18n.t('mes.work_report.k34'), value: 'approved' },
          { label: i18n.t('mes.work_report.k35'), value: 'rejected' },
          { label: i18n.t('mes.work_report.k36'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.work_report.k37'),
      fields: ['report_no', 'order_number', 'process_name', 'work_station_name', 'team_name'],
    },
    {
      title: i18n.t('mes.work_report.k38'),
      fields: ['worker_name'],
    },
    {
      title: i18n.t('mes.work_report.k39'),
      fields: ['quantity_good', 'quantity_bad', 'quantity_total'],
    },
    {
      title: i18n.t('mes.work_report.k40'),
      fields: ['start_time', 'end_time', 'actual_duration', 'standard_duration'],
    },
    {
      title: i18n.t('mes.work_report.k41'),
      fields: ['status', 'report_type', 'remark'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.work_report.k42'),
  editTitle: i18n.t('mes.work_report.k43'),
  detailTitle: i18n.t('mes.work_report.k44'),
};
