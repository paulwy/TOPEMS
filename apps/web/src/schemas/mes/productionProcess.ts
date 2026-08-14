import type React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const productionProcessSchema: EntitySchema = {
  entity: 'productionProcess',
  title: i18n.t('mes.production_process.k0'),
  description: i18n.t('mes.production_process.k1'),

  api: {
    module: 'mes',
    resource: 'processes',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('mes.production_process.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'code',
      label: i18n.t('mes.production_process.k3'),
      type: 'text',
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'sequence',
      label: i18n.t('mes.production_process.k4'),
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 80,
    },
    {
      name: 'standard_time',
      label: i18n.t('mes.production_process.h_5'),
      type: 'number',
      listWidth: 110,
      renderCell: (row: Record<string, unknown>): React.ReactNode => {
        const t = row.standard_time as number | undefined;
        return t ? `${t}h` : '-';
      },
    },
    {
      name: 'work_station_id',
      label: i18n.t('mes.production_process.k6'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>): React.ReactNode => {
        const ws = row.work_station_id as string | undefined;
        return ws || '-';
      },
    },
    {
      name: 'status',
      label: i18n.t('mes.production_process.k7'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('mes.production_process.k8') },
          { value: 'inactive', label: i18n.t('mes.production_process.k9') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('mes.production_process.k10'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['name', 'code', 'sequence', 'standard_time', 'work_station_id', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
      },
      labelMap: {
        active: i18n.t('mes.production_process.k11'),
        inactive: i18n.t('mes.production_process.k12'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.production_process.k13'),
        type: 'select',
        options: [
          { label: i18n.t('mes.production_process.k14'), value: '' },
          { label: i18n.t('mes.production_process.k15'), value: 'active' },
          { label: i18n.t('mes.production_process.k16'), value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.production_process.k17'),
      fields: ['name', 'code', 'sequence'],
    },
    {
      title: i18n.t('mes.production_process.k18'),
      fields: ['standard_time', 'work_station_id'],
    },
    {
      title: i18n.t('mes.production_process.k19'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.production_process.k20'),
  editTitle: i18n.t('mes.production_process.k21'),
  detailTitle: i18n.t('mes.production_process.k22'),
};
