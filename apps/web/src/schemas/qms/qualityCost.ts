import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const costTypeColorMap: Record<string, 'primary' | 'warning' | 'error' | 'secondary' | 'default'> =
  {
    prevention: 'primary',
    appraisal: 'warning',
    internal_failure: 'error',
    external_failure: 'secondary',
  };

const costTypeLabelMap: Record<string, string> = {
  prevention: i18n.t('qms.quality_cost.k0'),
  appraisal: i18n.t('qms.quality_cost.k1'),
  internal_failure: i18n.t('qms.quality_cost.k2'),
  external_failure: i18n.t('qms.quality_cost.k3'),
};

const costStatusColorMap: Record<string, 'default' | 'primary' | 'error' | 'success'> = {
  pending: 'default',
  approved: 'primary',
  rejected: 'error',
  closed: 'success',
};

const costStatusLabelMap: Record<string, string> = {
  pending: i18n.t('qms.quality_cost.k4'),
  approved: i18n.t('qms.quality_cost.k5'),
  rejected: i18n.t('qms.quality_cost.k6'),
  closed: i18n.t('qms.quality_cost.k7'),
};

export const qualityCostSchema: EntitySchema = {
  entity: 'quality_cost',
  title: i18n.t('qms.quality_cost.k8'),
  description: i18n.t('shared.quality_cost.k0'),

  api: {
    module: 'qms',
    resource: 'qualityCosts',
  },

  fields: [
    {
      name: 'costNo',
      label: i18n.t('qms.quality_cost.k9'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontWeight: 600, color: 'info.600' } },
          String(row.costNo ?? '')
        ),
    },
    {
      name: 'costType',
      label: i18n.t('qms.quality_cost.k10'),
      type: 'select',
      required: true,
      defaultValue: 'prevention',
      options: {
        type: 'static',
        options: [
          { value: 'prevention', label: i18n.t('qms.quality_cost.k11') },
          { value: 'appraisal', label: i18n.t('qms.quality_cost.k12') },
          { value: 'internal_failure', label: i18n.t('qms.quality_cost.k13') },
          { value: 'external_failure', label: i18n.t('qms.quality_cost.k14') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.costType ?? '');
        const color = costTypeColorMap[val] || 'default';
        const label = costTypeLabelMap[val] || val;
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
      name: 'costCategory',
      label: i18n.t('qms.quality_cost.k15'),
      type: 'text',
      listWidth: 140,
      placeholder: i18n.t('qms.quality_cost.k16'),
    },
    {
      name: 'amount',
      label: i18n.t('qms.quality_cost.k17'),
      type: 'number',
      required: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const currency = String(row.currency || '¥');
        const amount = Number(row.amount || 0).toLocaleString();
        return React.createElement('span', { style: { fontWeight: 500 } }, `${currency}${amount}`);
      },
    },
    {
      name: 'currency',
      label: i18n.t('qms.quality_cost.k18'),
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: i18n.t('qms.quality_cost.cny_19') },
          { value: 'USD', label: i18n.t('qms.quality_cost.usd_20') },
          { value: 'EUR', label: i18n.t('qms.quality_cost.eur_21') },
        ],
      },
      showInList: false,
    },
    {
      name: 'occurrenceDate',
      label: i18n.t('qms.quality_cost.k22'),
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'department',
      label: i18n.t('qms.quality_cost.k23'),
      type: 'text',
      listWidth: 120,
      placeholder: i18n.t('qms.quality_cost.k24'),
    },
    {
      name: 'relatedOrderNo',
      label: i18n.t('qms.quality_cost.k25'),
      type: 'text',
      showInList: false,
      placeholder: i18n.t('qms.quality_cost.k26'),
    },
    {
      name: 'responsiblePerson',
      label: i18n.t('qms.quality_cost.k27'),
      type: 'text',
      showInList: false,
      placeholder: i18n.t('qms.quality_cost.k28'),
    },
    {
      name: 'status',
      label: i18n.t('qms.quality_cost.k29'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('qms.quality_cost.k30') },
          { value: 'approved', label: i18n.t('qms.quality_cost.k31') },
          { value: 'rejected', label: i18n.t('qms.quality_cost.k32') },
          { value: 'closed', label: i18n.t('qms.quality_cost.k33') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.status ?? '');
        const color = costStatusColorMap[val] || 'default';
        const label = costStatusLabelMap[val] || val;
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
      name: 'description',
      label: i18n.t('qms.quality_cost.k34'),
      type: 'textarea',
      showInList: false,
      placeholder: i18n.t('shared.quality_cost.k1'),
    },
    {
      name: 'created_at',
      label: i18n.t('qms.quality_cost.k35'),
      type: 'date',
      readonly: true,
      showInList: false,
      sortable: true,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['costNo', 'costCategory', 'department'],
    filters: [
      {
        id: 'costType',
        label: i18n.t('qms.quality_cost.k36'),
        type: 'select',
        options: [
          { label: i18n.t('qms.quality_cost.k37'), value: 'all' },
          { label: i18n.t('qms.quality_cost.k38'), value: 'prevention' },
          { label: i18n.t('qms.quality_cost.k39'), value: 'appraisal' },
          { label: i18n.t('qms.quality_cost.k40'), value: 'internal_failure' },
          { label: i18n.t('qms.quality_cost.k41'), value: 'external_failure' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('qms.quality_cost.k42'),
        type: 'select',
        options: [
          { label: i18n.t('qms.quality_cost.k43'), value: 'all' },
          { label: i18n.t('qms.quality_cost.k44'), value: 'pending' },
          { label: i18n.t('qms.quality_cost.k45'), value: 'approved' },
          { label: i18n.t('qms.quality_cost.k46'), value: 'rejected' },
          { label: i18n.t('qms.quality_cost.k47'), value: 'closed' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: costStatusColorMap,
      labelMap: costStatusLabelMap,
    },
  },

  formSections: [
    {
      title: i18n.t('qms.quality_cost.k48'),
      fields: ['costNo', 'costType', 'costCategory', 'amount', 'currency'],
    },
    {
      title: i18n.t('qms.quality_cost.k49'),
      fields: ['occurrenceDate', 'department', 'relatedOrderNo', 'responsiblePerson', 'status'],
    },
    {
      title: i18n.t('qms.quality_cost.k50'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('qms.quality_cost.k51'),
  editTitle: i18n.t('qms.quality_cost.k52'),
  detailTitle: i18n.t('qms.quality_cost.k53'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
