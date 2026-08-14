/**
 * 仪器管理 Schema — 驱动 InstrumentPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const instrumentSchema: EntitySchema = {
  entity: 'limsInstrument',
  title: i18n.t('shared.instrument.k0'),
  description: i18n.t('shared.instrument.k1'),

  api: {
    module: 'lims',
    resource: 'instruments',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('shared.instrument.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('shared.instrument.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'type',
      label: i18n.t('shared.instrument.k4'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'model',
      label: i18n.t('shared.instrument.k5'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'manufacturer',
      label: i18n.t('shared.instrument.k6'),
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'serial_number',
      label: i18n.t('shared.instrument.k7'),
      type: 'text',
      listWidth: 130,
    },
    {
      name: 'location',
      label: i18n.t('shared.instrument.k8'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'status',
      label: i18n.t('shared.instrument.k9'),
      type: 'select',
      defaultValue: i18n.t('shared.instrument.k10'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('shared.instrument.k11'), label: i18n.t('shared.instrument.k12') },
          { value: i18n.t('shared.instrument.k13'), label: i18n.t('shared.instrument.k14') },
          { value: i18n.t('shared.instrument.k15'), label: i18n.t('shared.instrument.k16') },
          { value: i18n.t('shared.instrument.k17'), label: i18n.t('shared.instrument.k18') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'purchase_date',
      label: i18n.t('shared.instrument.k19'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'calibration_date',
      label: i18n.t('shared.instrument.k20'),
      type: 'date',
      listWidth: 130,
    },
    {
      name: 'next_calibration_date',
      label: i18n.t('shared.instrument.k21'),
      type: 'date',
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => {
        const value = row.next_calibration_date;
        if (!value) return '-';
        const date = new Date(value as string);
        const now = new Date();
        const needsCalibration = date < now;
        return React.createElement(
          'span',
          {
            style: {
              color: needsCalibration ? 'var(--mui-palette-warning-main)' : 'inherit',
            },
          },
          date.toLocaleDateString('zh-CN')
        );
      },
    },
    {
      name: 'responsible_person',
      label: i18n.t('shared.instrument.k22'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'description',
      label: i18n.t('shared.instrument.k23'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'type',
      'manufacturer',
      'location',
      'status',
      'next_calibration_date',
    ],
    searchFields: ['code', 'name', 'type'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        [i18n.t('schemas.instrument.k0')]: 'success',
        [i18n.t('schemas.instrument.k1')]: 'info',
        [i18n.t('schemas.instrument.k2')]: 'warning',
        [i18n.t('schemas.instrument.k3')]: 'default',
      },
      labelMap: {
        [i18n.t('schemas.instrument.k4')]: i18n.t('shared.instrument.k24'),
        [i18n.t('schemas.instrument.k5')]: i18n.t('shared.instrument.k25'),
        [i18n.t('schemas.instrument.k6')]: i18n.t('shared.instrument.k26'),
        [i18n.t('schemas.instrument.k7')]: i18n.t('shared.instrument.k27'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('shared.instrument.k28'),
        type: 'select',
        options: [
          { label: i18n.t('shared.instrument.k29'), value: 'all' },
          { label: i18n.t('shared.instrument.k30'), value: i18n.t('shared.instrument.k31') },
          { label: i18n.t('shared.instrument.k32'), value: i18n.t('shared.instrument.k33') },
          { label: i18n.t('shared.instrument.k34'), value: i18n.t('shared.instrument.k35') },
          { label: i18n.t('shared.instrument.k36'), value: i18n.t('shared.instrument.k37') },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.instrument.k38'),
      fields: ['code', 'name', 'type', 'model'],
    },
    {
      title: i18n.t('shared.instrument.k39'),
      fields: ['manufacturer', 'serial_number', 'location', 'responsible_person'],
    },
    {
      title: i18n.t('shared.instrument.k40'),
      fields: ['status', 'purchase_date', 'calibration_date', 'next_calibration_date'],
    },
    {
      title: i18n.t('shared.instrument.k41'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.instrument.k42'),
  editTitle: i18n.t('shared.instrument.k43'),
  detailTitle: i18n.t('shared.instrument.k44'),
};
