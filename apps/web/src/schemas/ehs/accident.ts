import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const accidentSchema: EntitySchema = {
  entity: 'ehsAccident',
  title: i18n.t('ehs.accident.k0'),
  description: i18n.t('ehs.accident.k1'),

  api: {
    module: 'ehs',
    resource: 'accidents',
  },

  fields: [
    {
      name: 'accident_no',
      label: i18n.t('ehs.accident.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'title',
      label: i18n.t('ehs.accident.k3'),
      type: 'text',
      required: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'category',
      label: i18n.t('ehs.accident.k4'),
      type: 'select',
      required: true,
      defaultValue: 'safety',
      options: {
        type: 'static',
        options: [
          { value: 'safety', label: i18n.t('ehs.accident.k5') },
          { value: 'environment', label: i18n.t('ehs.accident.k6') },
          { value: 'health', label: i18n.t('ehs.accident.k7') },
          { value: 'property', label: i18n.t('ehs.accident.k8') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'level',
      label: i18n.t('ehs.accident.k9'),
      type: 'select',
      required: true,
      defaultValue: i18n.t('ehs.accident.k10'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('ehs.accident.k11'), label: i18n.t('ehs.accident.k12') },
          { value: i18n.t('ehs.accident.k13'), label: i18n.t('ehs.accident.k14') },
          { value: i18n.t('ehs.accident.k15'), label: i18n.t('ehs.accident.k16') },
          { value: i18n.t('ehs.accident.k17'), label: i18n.t('ehs.accident.k18') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'location',
      label: i18n.t('ehs.accident.k19'),
      type: 'text',
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'department_id',
      label: i18n.t('ehs.accident.k20'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'casualties',
      label: i18n.t('ehs.accident.k21'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'direct_loss',
      label: i18n.t('ehs.accident.k22'),
      type: 'number',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        return React.createElement(
          'span',
          { style: { fontWeight: 'medium' } },
          `¥${(row.direct_loss || 0).toLocaleString()}`
        );
      },
    },
    {
      name: 'accident_date',
      label: i18n.t('ehs.accident.k23'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('ehs.accident.k24'),
      type: 'select',
      defaultValue: i18n.t('ehs.accident.k25'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('ehs.accident.k26'), label: i18n.t('ehs.accident.k27') },
          { value: i18n.t('ehs.accident.k28'), label: i18n.t('ehs.accident.k29') },
          { value: i18n.t('ehs.accident.k30'), label: i18n.t('ehs.accident.k31') },
          { value: i18n.t('ehs.accident.k32'), label: i18n.t('ehs.accident.k33') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('ehs.accident.k34'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['accident_no', 'title', 'category', 'level', 'location', 'accident_date', 'status'],
    searchFields: ['accident_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        [i18n.t('schemas.accident.k0')]: 'warning',
        [i18n.t('schemas.accident.k1')]: 'primary',
        [i18n.t('schemas.accident.k2')]: 'success',
        [i18n.t('schemas.accident.k3')]: 'default',
      },
      labelMap: {
        [i18n.t('schemas.accident.k4')]: i18n.t('ehs.accident.k35'),
        [i18n.t('schemas.accident.k5')]: i18n.t('ehs.accident.k36'),
        [i18n.t('schemas.accident.k6')]: i18n.t('ehs.accident.k37'),
        [i18n.t('schemas.accident.k7')]: i18n.t('ehs.accident.k38'),
      },
    },
    filters: [
      {
        id: 'category',
        label: i18n.t('ehs.accident.k39'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.accident.k40'), value: 'all' },
          { label: i18n.t('ehs.accident.k41'), value: 'safety' },
          { label: i18n.t('ehs.accident.k42'), value: 'environment' },
          { label: i18n.t('ehs.accident.k43'), value: 'health' },
          { label: i18n.t('ehs.accident.k44'), value: 'property' },
        ],
      },
      {
        id: 'level',
        label: i18n.t('ehs.accident.k45'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.accident.k46'), value: 'all' },
          { label: i18n.t('ehs.accident.k47'), value: i18n.t('ehs.accident.k48') },
          { label: i18n.t('ehs.accident.k49'), value: i18n.t('ehs.accident.k50') },
          { label: i18n.t('ehs.accident.k51'), value: i18n.t('ehs.accident.k52') },
          { label: i18n.t('ehs.accident.k53'), value: i18n.t('ehs.accident.k54') },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.accident.k55'),
      fields: ['accident_no', 'title', 'category', 'level'],
    },
    {
      title: i18n.t('ehs.accident.k56'),
      fields: ['location', 'department_id', 'accident_date'],
    },
    {
      title: i18n.t('ehs.accident.k57'),
      fields: ['casualties', 'direct_loss', 'status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.accident.k58'),
  editTitle: i18n.t('ehs.accident.k59'),
  detailTitle: i18n.t('ehs.accident.k60'),
};
