import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  draft: { label: i18n.t('srm.inquiry.k0'), color: 'default' },
  published: { label: i18n.t('srm.inquiry.k1'), color: 'primary' },
  in_progress: { label: i18n.t('srm.inquiry.k2'), color: 'warning' },
  closed: { label: i18n.t('srm.inquiry.k3'), color: 'default' },
  awarded: { label: i18n.t('srm.inquiry.k4'), color: 'success' },
  cancelled: { label: i18n.t('srm.inquiry.k5'), color: 'error' },
};

const urgencyConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  low: { label: i18n.t('srm.inquiry.k6'), color: 'default' },
  normal: { label: i18n.t('srm.inquiry.k7'), color: 'primary' },
  high: { label: i18n.t('srm.inquiry.k8'), color: 'warning' },
  urgent: { label: i18n.t('srm.inquiry.k9'), color: 'error' },
};

export const inquirySchema: EntitySchema = {
  entity: 'srm_inquiry',
  title: i18n.t('srm.inquiry.k10'),
  description: i18n.t('srm.inquiry.k11'),

  api: {
    module: 'srm',
    resource: 'inquiries',
  },

  fields: [
    {
      name: 'inquiry_no',
      label: i18n.t('srm.inquiry.k12'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'title',
      label: i18n.t('srm.inquiry.k13'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'category',
      label: i18n.t('srm.inquiry.k14'),
      type: 'select',
      required: true,
      defaultValue: 'raw_material',
      options: {
        type: 'static',
        options: [
          { value: 'raw_material', label: i18n.t('srm.inquiry.k15') },
          { value: 'component', label: i18n.t('srm.inquiry.k16') },
          { value: 'equipment', label: i18n.t('srm.inquiry.k17') },
          { value: 'service', label: i18n.t('srm.inquiry.k18') },
          { value: 'packaging', label: i18n.t('srm.inquiry.k19') },
          { value: 'other', label: i18n.t('srm.inquiry.k20') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'urgency',
      label: i18n.t('srm.inquiry.k21'),
      type: 'select',
      required: true,
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: i18n.t('srm.inquiry.k22') },
          { value: 'normal', label: i18n.t('srm.inquiry.k23') },
          { value: 'high', label: i18n.t('srm.inquiry.k24') },
          { value: 'urgent', label: i18n.t('srm.inquiry.k25') },
        ],
      },
      listWidth: 90,
    },
    {
      name: 'status',
      label: i18n.t('srm.inquiry.k26'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('srm.inquiry.k27') },
          { value: 'published', label: i18n.t('srm.inquiry.k28') },
          { value: 'in_progress', label: i18n.t('srm.inquiry.k29') },
          { value: 'closed', label: i18n.t('srm.inquiry.k30') },
          { value: 'awarded', label: i18n.t('srm.inquiry.k31') },
          { value: 'cancelled', label: i18n.t('srm.inquiry.k32') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'quotation_count',
      label: i18n.t('srm.inquiry.k33'),
      type: 'number',
      readonly: true,
      hideInForm: true,
      listWidth: 80,
    },
    {
      name: 'creator',
      label: i18n.t('srm.inquiry.k34'),
      type: 'text',
      readonly: true,
      hideInForm: true,
      listWidth: 100,
    },
    {
      name: 'deadline',
      label: i18n.t('srm.inquiry.k35'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'description',
      label: i18n.t('srm.inquiry.k36'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'remarks',
      label: i18n.t('srm.inquiry.k37'),
      type: 'text',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'inquiry_no',
      'title',
      'category',
      'urgency',
      'status',
      'quotation_count',
      'creator',
      'deadline',
    ],
    searchFields: ['inquiry_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: Object.fromEntries(Object.entries(statusConfig).map(([k, v]) => [k, v.color])),
      labelMap: Object.fromEntries(Object.entries(statusConfig).map(([k, v]) => [k, v.label])),
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('srm.inquiry.k38'),
        type: 'select',
        options: [
          { label: i18n.t('srm.inquiry.k39'), value: 'all' },
          ...Object.entries(statusConfig).map(([k, v]) => ({ label: v.label, value: k })),
        ],
      },
      {
        id: 'urgency',
        label: i18n.t('srm.inquiry.k40'),
        type: 'select',
        options: [
          { label: i18n.t('srm.inquiry.k41'), value: 'all' },
          ...Object.entries(urgencyConfig).map(([k, v]) => ({ label: v.label, value: k })),
        ],
      },
      {
        id: 'category',
        label: i18n.t('srm.inquiry.k42'),
        type: 'select',
        options: [
          { label: i18n.t('srm.inquiry.k43'), value: 'all' },
          { label: i18n.t('srm.inquiry.k44'), value: 'raw_material' },
          { label: i18n.t('srm.inquiry.k45'), value: 'component' },
          { label: i18n.t('srm.inquiry.k46'), value: 'equipment' },
          { label: i18n.t('srm.inquiry.k47'), value: 'service' },
          { label: i18n.t('srm.inquiry.k48'), value: 'packaging' },
          { label: i18n.t('srm.inquiry.k49'), value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('srm.inquiry.k50'),
      fields: ['inquiry_no', 'title', 'category', 'urgency'],
    },
    {
      title: i18n.t('srm.inquiry.k51'),
      fields: ['deadline', 'status'],
    },
    {
      title: i18n.t('srm.inquiry.k52'),
      fields: ['description', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('srm.inquiry.k53'),
  editTitle: i18n.t('srm.inquiry.k54'),
  detailTitle: i18n.t('srm.inquiry.k55'),
};
