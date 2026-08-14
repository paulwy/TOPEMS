import type React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const processSchema: EntitySchema = {
  entity: 'limsProcess',
  title: i18n.t('lims.process.k0'),
  description: i18n.t('lims.process.k1'),

  api: {
    module: 'lims',
    resource: 'processes',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('lims.process.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'description',
      label: i18n.t('lims.process.k3'),
      type: 'textarea',
      listWidth: 250,
    },
    {
      name: 'steps',
      label: i18n.t('lims.process.k4'),
      type: 'number',
      sortable: true,
      listWidth: 100,
      readonly: true,
      renderCell: (row: Record<string, unknown>): React.ReactNode => {
        const steps = (row as Record<string, unknown>).steps as Array<unknown> | undefined;
        return steps?.length || 0;
      },
    },
    {
      name: 'status',
      label: i18n.t('lims.process.k5'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('lims.process.k6') },
          { value: 'inactive', label: i18n.t('lims.process.k7') },
          { value: 'draft', label: i18n.t('lims.process.k8') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: i18n.t('lims.process.k9'),
      type: 'datetime',
      sortable: true,
      listWidth: 130,
      showInForm: false,
    },
  ],

  list: {
    columns: ['name', 'description', 'steps', 'status', 'created_at'],
    searchFields: ['name', 'description'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'warning',
        draft: 'default',
      },
      labelMap: {
        active: i18n.t('lims.process.k10'),
        inactive: i18n.t('lims.process.k11'),
        draft: i18n.t('lims.process.k12'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('lims.process.k13'),
        type: 'select',
        options: [
          { label: i18n.t('lims.process.k14'), value: '' },
          { label: i18n.t('lims.process.k15'), value: 'active' },
          { label: i18n.t('lims.process.k16'), value: 'inactive' },
          { label: i18n.t('lims.process.k17'), value: 'draft' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formSections: [
    {
      title: i18n.t('lims.process.k18'),
      fields: ['name', 'description', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('lims.process.k19'),
  editTitle: i18n.t('lims.process.k20'),
  detailTitle: i18n.t('lims.process.k21'),
};
