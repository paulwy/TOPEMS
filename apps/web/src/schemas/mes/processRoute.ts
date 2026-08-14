import type React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const processRouteSchema: EntitySchema = {
  entity: 'mesProcessRoute',
  title: i18n.t('mes.process_route.k0'),
  description: i18n.t('mes.process_route.k1'),

  api: {
    module: 'mes',
    resource: 'processRoutes',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('mes.process_route.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'name',
      label: i18n.t('mes.process_route.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'version',
      label: i18n.t('mes.process_route.k4'),
      type: 'text',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'process_count',
      label: i18n.t('mes.process_route.k5'),
      type: 'number',
      sortable: true,
      listWidth: 100,
      readonly: true,
    },
    {
      name: 'total_standard_time',
      label: i18n.t('mes.process_route.k6'),
      type: 'number',
      sortable: true,
      listWidth: 140,
      readonly: true,
      renderCell: (row: Record<string, unknown>): React.ReactNode => {
        const t = (row as Record<string, unknown>).total_standard_time as number | undefined;
        return t || 0;
      },
    },
    {
      name: 'standard_time',
      label: i18n.t('mes.process_route.k7'),
      type: 'number',
      listWidth: 130,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('mes.process_route.k8'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('mes.process_route.k9') },
          { value: 'inactive', label: i18n.t('mes.process_route.k10') },
          { value: 'draft', label: i18n.t('mes.process_route.k11') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('mes.process_route.k12'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('mes.process_route.k13'),
      type: 'datetime',
      sortable: true,
      listWidth: 160,
      showInForm: false,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'version',
      'process_count',
      'total_standard_time',
      'status',
      'created_at',
    ],
    searchFields: ['code', 'name'],
    pageSize: 10,
    selectable: true,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        draft: 'warning',
      },
      labelMap: {
        active: i18n.t('mes.process_route.k14'),
        inactive: i18n.t('mes.process_route.k15'),
        draft: i18n.t('mes.process_route.k16'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.process_route.k17'),
        type: 'select',
        options: [
          { label: i18n.t('mes.process_route.k18'), value: 'all' },
          { label: i18n.t('mes.process_route.k19'), value: 'active' },
          { label: i18n.t('mes.process_route.k20'), value: 'inactive' },
          { label: i18n.t('mes.process_route.k21'), value: 'draft' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.process_route.k22'),
      fields: ['code', 'name', 'version', 'status'],
    },
    {
      title: i18n.t('mes.process_route.k23'),
      fields: ['standard_time'],
    },
    {
      title: i18n.t('mes.process_route.k24'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.process_route.k25'),
  editTitle: i18n.t('mes.process_route.k26'),
  detailTitle: i18n.t('mes.process_route.k27'),
};
