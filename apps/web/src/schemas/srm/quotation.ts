import React from 'react';
import type { EntitySchema } from '@/schema';
import { columnsFromFields } from '@/schema/schemaExtensions';
import type { NestedTableConfig } from '@/schema/schemaExtensions';
import type { SchemaField } from '@/schema/types';
import i18n from '@/i18n';

const quotationItemFields: SchemaField[] = [
  {
    name: 'sku',
    label: i18n.t('srm.quotation.k0'),
    type: 'text',
    required: true,
    listWidth: 120,
  },
  {
    name: 'material_name',
    label: i18n.t('srm.quotation.k1'),
    type: 'text',
    required: true,
    listWidth: 160,
  },
  {
    name: 'specification',
    label: i18n.t('srm.quotation.k2'),
    type: 'text',
    listWidth: 140,
  },
  {
    name: 'quantity',
    label: i18n.t('srm.quotation.k3'),
    type: 'number',
    required: true,
    defaultValue: 1,
    listWidth: 80,
  },
  {
    name: 'unit_price',
    label: i18n.t('srm.quotation.k4'),
    type: 'number',
    required: true,
    defaultValue: 0,
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const val = row.unit_price as number | undefined;
      return val != null ? val.toFixed(2) : '-';
    },
  },
  {
    name: 'subtotal',
    label: i18n.t('srm.quotation.k5'),
    type: 'number',
    defaultValue: 0,
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const val = row.subtotal as number | undefined;
      return val != null ? val.toFixed(2) : '-';
    },
  },
  {
    name: 'delivery_time',
    label: i18n.t('srm.quotation.k6'),
    type: 'text',
    listWidth: 120,
  },
];

const quotationItemNestedTable: NestedTableConfig = {
  field: 'items',
  title: i18n.t('srm.quotation.k7'),
  columns: columnsFromFields(quotationItemFields),
  fields: quotationItemFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  allowDuplicate: true,
  addButtonText: i18n.t('srm.quotation.k8'),
  rowKeyField: 'id',
  minRows: 0,
  formColCount: 2,
  collapsible: false,
  defaultExpanded: true,
};

export const quotationSchema: EntitySchema & { nestedTables: NestedTableConfig[] } = {
  entity: 'quotation',
  title: i18n.t('srm.quotation.k9'),
  description: i18n.t('srm.quotation.k10'),

  api: {
    module: 'srm',
    resource: 'quotations',
    listMethod: 'listQuotations',
    getMethod: 'getQuotation',
    createMethod: 'createQuotation',
    updateMethod: 'updateQuotation',
    deleteMethod: 'deleteQuotation',
  },

  fields: [
    {
      name: 'quotation_no',
      label: i18n.t('srm.quotation.k11'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'supplier_id',
      label: i18n.t('srm.quotation.k12'),
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: i18n.t('srm.quotation.k13'),
      type: 'text',
      listWidth: 180,
    },
    {
      name: 'total_amount',
      label: i18n.t('srm.quotation.k14'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.total_amount as number | undefined;
        const currency = row.currency as string | undefined;
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '¥';
        return React.createElement(
          'span',
          { style: { fontWeight: 600 } },
          `${symbol}${(amount || 0).toLocaleString()}`
        );
      },
    },
    {
      name: 'currency',
      label: i18n.t('srm.quotation.k15'),
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: i18n.t('srm.quotation.cny_16') },
          { value: 'USD', label: i18n.t('srm.quotation.usd_17') },
          { value: 'EUR', label: i18n.t('srm.quotation.eur_18') },
        ],
      },
      listWidth: 90,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('srm.quotation.k19'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('srm.quotation.k20') },
          { value: 'submitted', label: i18n.t('srm.quotation.k21') },
          { value: 'accepted', label: i18n.t('srm.quotation.k22') },
          { value: 'rejected', label: i18n.t('srm.quotation.k23') },
          { value: 'awarded', label: i18n.t('srm.quotation.k24') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'valid_until',
      label: i18n.t('srm.quotation.k25'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'delivery_time',
      label: i18n.t('srm.quotation.k26'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'payment_terms',
      label: i18n.t('srm.quotation.k27'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'remarks',
      label: i18n.t('srm.quotation.k28'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['quotation_no', 'supplier_id', 'title', 'total_amount', 'status', 'valid_until'],
    searchFields: ['quotation_no', 'supplier_id', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        submitted: 'warning',
        accepted: 'info',
        rejected: 'error',
        awarded: 'success',
      },
      labelMap: {
        draft: i18n.t('srm.quotation.k29'),
        submitted: i18n.t('srm.quotation.k30'),
        accepted: i18n.t('srm.quotation.k31'),
        rejected: i18n.t('srm.quotation.k32'),
        awarded: i18n.t('srm.quotation.k33'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('srm.quotation.k34'),
        type: 'select',
        options: [
          { label: i18n.t('srm.quotation.k35'), value: 'all' },
          { label: i18n.t('srm.quotation.k36'), value: 'draft' },
          { label: i18n.t('srm.quotation.k37'), value: 'submitted' },
          { label: i18n.t('srm.quotation.k38'), value: 'accepted' },
          { label: i18n.t('srm.quotation.k39'), value: 'rejected' },
          { label: i18n.t('srm.quotation.k40'), value: 'awarded' },
        ],
      },
      {
        id: 'currency',
        label: i18n.t('srm.quotation.k41'),
        type: 'select',
        options: [
          { label: i18n.t('srm.quotation.k42'), value: 'all' },
          { label: i18n.t('srm.quotation.k43'), value: 'CNY' },
          { label: i18n.t('srm.quotation.k44'), value: 'USD' },
          { label: i18n.t('srm.quotation.k45'), value: 'EUR' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('srm.quotation.k46'),
      fields: ['quotation_no', 'supplier_id', 'title', 'status'],
    },
    {
      title: i18n.t('srm.quotation.k47'),
      fields: ['total_amount', 'currency', 'valid_until', 'delivery_time'],
    },
    {
      title: i18n.t('srm.quotation.k48'),
      fields: ['payment_terms', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('srm.quotation.k49'),
  editTitle: i18n.t('srm.quotation.k50'),
  detailTitle: i18n.t('srm.quotation.k51'),

  nestedTables: [quotationItemNestedTable],
};
