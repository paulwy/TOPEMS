import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';
import { localizedName } from '@/utils/i18n';

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }
> = {
  draft: { label: i18n.t('srm.bidding.k0'), color: 'default' },
  published: { label: i18n.t('srm.bidding.k1'), color: 'primary' },
  bidding: { label: i18n.t('srm.bidding.k2'), color: 'warning' },
  opened: { label: i18n.t('srm.bidding.k3'), color: 'info' },
  evaluating: { label: i18n.t('srm.bidding.k4'), color: 'primary' },
  awarded: { label: i18n.t('srm.bidding.k5'), color: 'success' },
  cancelled: { label: i18n.t('srm.bidding.k6'), color: 'error' },
  completed: { label: i18n.t('srm.bidding.k7'), color: 'success' },
};

export const biddingSchema: EntitySchema = {
  entity: 'srm_bidding',
  title: i18n.t('srm.bidding.k8'),
  description: i18n.t('srm.bidding.k9'),

  api: {
    module: 'srm',
    resource: 'biddings',
  },

  fields: [
    {
      name: 'bidding_no',
      label: i18n.t('srm.bidding.k10'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: i18n.t('srm.bidding.k11'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'category',
      label: i18n.t('srm.bidding.k12'),
      type: 'select',
      required: true,
      defaultValue: 'equipment',
      options: {
        type: 'static',
        options: [
          { value: 'raw_material', label: i18n.t('srm.bidding.k13') },
          { value: 'component', label: i18n.t('srm.bidding.k14') },
          { value: 'equipment', label: i18n.t('srm.bidding.k15') },
          { value: 'service', label: i18n.t('srm.bidding.k16') },
          { value: 'engineering', label: i18n.t('srm.bidding.k17') },
          { value: 'other', label: i18n.t('srm.bidding.k18') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'bidding_type',
      label: i18n.t('srm.bidding.k19'),
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: {
        type: 'static',
        options: [
          { value: 'open', label: i18n.t('srm.bidding.k20') },
          { value: 'invite', label: i18n.t('srm.bidding.k21') },
          { value: 'competitive', label: i18n.t('srm.bidding.k22') },
          { value: 'single_source', label: i18n.t('srm.bidding.k23') },
          { value: 'inquiry', label: i18n.t('srm.bidding.k24') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'budget_amount',
      label: i18n.t('srm.bidding.k25'),
      type: 'number',
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.budget_amount as number | undefined;
        if (!amount) return '-';
        return React.createElement(
          'span',
          { style: { fontWeight: 600 } },
          `¥${amount.toLocaleString()}`
        );
      },
    },
    {
      name: 'currency',
      label: i18n.t('srm.bidding.k26'),
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: i18n.t('srm.bidding.cny_27') },
          { value: 'USD', label: i18n.t('srm.bidding.usd_28') },
          { value: 'EUR', label: i18n.t('srm.bidding.eur_29') },
        ],
      },
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'bid_deadline',
      label: i18n.t('srm.bidding.k30'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'open_date',
      label: i18n.t('srm.bidding.k31'),
      type: 'date',
      sortable: true,
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('srm.bidding.k32'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('srm.bidding.k33') },
          { value: 'published', label: i18n.t('srm.bidding.k34') },
          { value: 'bidding', label: i18n.t('srm.bidding.k35') },
          { value: 'opened', label: i18n.t('srm.bidding.k36') },
          { value: 'evaluating', label: i18n.t('srm.bidding.k37') },
          { value: 'awarded', label: i18n.t('srm.bidding.k38') },
          { value: 'cancelled', label: i18n.t('srm.bidding.k39') },
          { value: 'completed', label: i18n.t('srm.bidding.k40') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'supplier_count',
      label: i18n.t('srm.bidding.k41'),
      type: 'number',
      readonly: true,
      hideInForm: true,
      listWidth: 80,
    },
    {
      name: 'winner_supplier_name',
      label: i18n.t('srm.bidding.k42'),
      type: 'text',
      readonly: true,
      hideInForm: true,
      listWidth: 140,
      renderCell: (row, _index) =>
        localizedName(
          row.winner_supplier_name as string | null,
          row.winner_supplier_name_en as string | null
        ) || '-',
    },
    {
      name: 'description',
      label: i18n.t('srm.bidding.k43'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'remarks',
      label: i18n.t('srm.bidding.k44'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'bidding_no',
      'title',
      'category',
      'bidding_type',
      'budget_amount',
      'supplier_count',
      'status',
      'winner_supplier_name',
      'bid_deadline',
    ],
    searchFields: ['bidding_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        published: 'primary',
        bidding: 'warning',
        opened: 'info',
        evaluating: 'primary',
        awarded: 'success',
        cancelled: 'error',
        completed: 'success',
      },
      labelMap: Object.fromEntries(Object.entries(statusConfig).map(([k, v]) => [k, v.label])),
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('srm.bidding.k45'),
        type: 'select',
        options: [
          { label: i18n.t('srm.bidding.k46'), value: 'all' },
          ...Object.entries(statusConfig).map(([k, v]) => ({ label: v.label, value: k })),
        ],
      },
      {
        id: 'category',
        label: i18n.t('srm.bidding.k47'),
        type: 'select',
        options: [
          { label: i18n.t('srm.bidding.k48'), value: 'all' },
          { label: i18n.t('srm.bidding.k49'), value: 'raw_material' },
          { label: i18n.t('srm.bidding.k50'), value: 'component' },
          { label: i18n.t('srm.bidding.k51'), value: 'equipment' },
          { label: i18n.t('srm.bidding.k52'), value: 'service' },
          { label: i18n.t('srm.bidding.k53'), value: 'engineering' },
          { label: i18n.t('srm.bidding.k54'), value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('srm.bidding.k55'),
      fields: ['bidding_no', 'title', 'category', 'bidding_type', 'status'],
    },
    {
      title: i18n.t('srm.bidding.k56'),
      fields: ['budget_amount', 'currency', 'bid_deadline', 'open_date'],
    },
    {
      title: i18n.t('srm.bidding.k57'),
      fields: ['description', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('srm.bidding.k58'),
  editTitle: i18n.t('srm.bidding.k59'),
  detailTitle: i18n.t('srm.bidding.k60'),
};
