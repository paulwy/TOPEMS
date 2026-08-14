import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import { FlaskConical } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  testing: 'warning',
  approved: 'success',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  draft: i18n.t('rd.formula.k0'),
  testing: i18n.t('rd.formula.k1'),
  approved: i18n.t('rd.formula.k2'),
};

export const formulaSchema: EntitySchema = {
  entity: 'rd_formula',
  title: i18n.t('rd.formula.k3'),
  description: i18n.t('rd.formula.k4'),

  api: {
    module: 'rd',
    resource: 'formulas',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('rd.formula.k5'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(FlaskConical, { size: 16, color: 'primary.main' }),
          React.createElement(
            Typography,
            { variant: 'body2', sx: { fontWeight: 500 } },
            String(row.code ?? '')
          )
        );
      },
    },
    {
      name: 'name',
      label: i18n.t('rd.formula.k6'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'version',
      label: i18n.t('rd.formula.k7'),
      type: 'text',
      required: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.version ?? '');
        if (!val) return '-';
        return React.createElement(Chip, { label: val, size: 'small' });
      },
    },
    {
      name: 'project_id',
      label: i18n.t('rd.formula.k8'),
      type: 'text',
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.project_id ?? '');
        return val || '-';
      },
    },
    {
      name: 'category',
      label: i18n.t('rd.formula.k9'),
      type: 'text',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('rd.formula.k10'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('rd.formula.k11') },
          { value: 'testing', label: i18n.t('rd.formula.k12') },
          { value: 'approved', label: i18n.t('rd.formula.k13') },
        ],
      },
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'approval_status',
      label: i18n.t('rd.formula.k14'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'approved_by',
      label: i18n.t('rd.formula.k15'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'approved_at',
      label: i18n.t('rd.formula.k16'),
      type: 'datetime',
      showInList: false,
    },
    {
      name: 'effective_date',
      label: i18n.t('rd.formula.k17'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'expiration_date',
      label: i18n.t('rd.formula.k18'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'description',
      label: i18n.t('rd.formula.k19'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'process_steps',
      label: i18n.t('rd.formula.k20'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'created_by',
      label: i18n.t('rd.formula.k21'),
      type: 'text',
      readonly: true,
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'created_at',
      label: i18n.t('rd.formula.k22'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 130,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('rd.formula.k23'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'version', 'project_id', 'status', 'created_by', 'created_at'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: i18n.t('rd.formula.k24'),
        type: 'select',
        options: [
          { label: i18n.t('rd.formula.k25'), value: 'all' },
          { label: i18n.t('rd.formula.k26'), value: 'draft' },
          { label: i18n.t('rd.formula.k27'), value: 'testing' },
          { label: i18n.t('rd.formula.k28'), value: 'approved' },
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
      title: i18n.t('rd.formula.k29'),
      fields: ['code', 'name', 'version', 'project_id', 'category', 'status'],
    },
    {
      title: i18n.t('rd.formula.k30'),
      fields: ['effective_date', 'expiration_date'],
    },
    {
      title: i18n.t('rd.formula.k31'),
      fields: ['description', 'process_steps'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.formula.k32'),
  editTitle: i18n.t('rd.formula.k33'),
  detailTitle: i18n.t('rd.formula.k34'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
