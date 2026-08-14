import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const materialIssueSchema: EntitySchema = {
  entity: 'mes_material_issue',
  title: i18n.t('mes.material_issue.k0'),
  description: i18n.t('mes.material_issue.k1'),

  api: {
    module: 'mes',
    resource: 'materialIssues',
  },

  fields: [
    {
      name: 'issue_no',
      label: i18n.t('mes.material_issue.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'order_number',
      label: i18n.t('mes.material_issue.k3'),
      type: 'text',
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'operator',
      label: i18n.t('mes.material_issue.k4'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'issue_time',
      label: i18n.t('mes.material_issue.k5'),
      type: 'datetime',
      listWidth: 160,
    },
    {
      name: 'items_count',
      label: i18n.t('mes.material_issue.k6'),
      type: 'number',
      listWidth: 80,
      readonly: true,
      renderCell: (row: Record<string, unknown>) =>
        (row.items as unknown[] | undefined)?.length || 0,
    },
    {
      name: 'status',
      label: i18n.t('mes.material_issue.k7'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('mes.material_issue.k8') },
          { value: 'approved', label: i18n.t('mes.material_issue.k9') },
          { value: 'issued', label: i18n.t('mes.material_issue.k10') },
          { value: 'cancelled', label: i18n.t('mes.material_issue.k11') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          pending: { label: i18n.t('mes.material_issue.k12'), bg: 'warning.light', color: 'warning.700' },
          approved: { label: i18n.t('mes.material_issue.k13'), bg: 'secondary.100', color: 'secondary.700' },
          issued: { label: i18n.t('mes.material_issue.k14'), bg: 'success.lighter', color: 'success.700' },
          cancelled: { label: i18n.t('mes.material_issue.k15'), bg: 'error.lighter', color: 'error.dark' },
        };
        const s = statusMap[(row.status as string) || 'pending'] || {
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
      name: 'work_station_id',
      label: i18n.t('mes.material_issue.id_16'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'remark',
      label: i18n.t('mes.material_issue.k17'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'items',
      label: i18n.t('mes.material_issue.k18'),
      type: 'textarea',
      showInList: false,
      showInForm: false,
    },
    {
      name: 'created_at',
      label: i18n.t('mes.material_issue.k19'),
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['issue_no', 'order_number', 'operator', 'issue_time', 'items_count', 'status'],
    searchFields: ['issue_no', 'order_number', 'operator'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.material_issue.k20'),
        type: 'select',
        options: [
          { label: i18n.t('mes.material_issue.k21'), value: 'all' },
          { label: i18n.t('mes.material_issue.k22'), value: 'pending' },
          { label: i18n.t('mes.material_issue.k23'), value: 'approved' },
          { label: i18n.t('mes.material_issue.k24'), value: 'issued' },
          { label: i18n.t('mes.material_issue.k25'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'detail'],

  formSections: [
    {
      title: i18n.t('mes.material_issue.k26'),
      fields: ['issue_no', 'order_number', 'operator', 'work_station_id'],
    },
    {
      title: i18n.t('mes.material_issue.k27'),
      fields: ['status', 'remark'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.material_issue.k28'),
  detailTitle: i18n.t('mes.material_issue.k29'),
};
