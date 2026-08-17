import React from 'react';
import { Chip, Box } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const materialReturnSchema: EntitySchema = {
  entity: 'mes_material_return',
  title: i18n.t('mes.material_return.k0'),
  description: i18n.t('mes.material_return.k1'),

  api: {
    module: 'mes',
    resource: 'materialReturns',
  },

  fields: [
    {
      name: 'return_no',
      label: i18n.t('mes.material_return.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'order_number',
      label: i18n.t('mes.material_return.k3'),
      type: 'text',
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'operator',
      label: i18n.t('mes.material_return.k4'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'return_time',
      label: i18n.t('mes.material_return.k5'),
      type: 'datetime',
      listWidth: 160,
    },
    {
      name: 'items_count',
      label: i18n.t('mes.material_return.k6'),
      type: 'number',
      listWidth: 80,
      readonly: true,
      renderCell: (row: Record<string, unknown>) =>
        (row.items as unknown[] | undefined)?.length || 0,
    },
    {
      name: 'reason',
      label: i18n.t('mes.material_return.k7'),
      type: 'text',
      listWidth: 180,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Box,
          {
            sx: {
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
          (row.reason as string) || '-'
        ),
    },
    {
      name: 'status',
      label: i18n.t('mes.material_return.k8'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('mes.material_return.k9') },
          { value: 'approved', label: i18n.t('mes.material_return.k10') },
          { value: 'returned', label: i18n.t('mes.material_return.k11') },
          { value: 'cancelled', label: i18n.t('mes.material_return.k12') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          pending: {
            label: i18n.t('mes.material_return.k13'),
            bg: 'warning.light',
            color: 'warning.700',
          },
          approved: {
            label: i18n.t('mes.material_return.k14'),
            bg: 'secondary.100',
            color: 'secondary.700',
          },
          returned: {
            label: i18n.t('mes.material_return.k15'),
            bg: 'success.lighter',
            color: 'success.700',
          },
          cancelled: {
            label: i18n.t('mes.material_return.k16'),
            bg: 'error.lighter',
            color: 'error.dark',
          },
        };
        const s = statusMap[(row.status as string) || 'pending'] || {
          label: row.status,
          bg: 'grey.100',
          color: 'text.secondary',
        };
        return React.createElement(Chip, {
          size: 'small',
          label: s.label,
          sx: { backgroundColor: s.bg, color: s.color, fontWeight: 500 },
        });
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'work_station_id',
      label: i18n.t('mes.material_return.id_17'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'items',
      label: i18n.t('mes.material_return.k18'),
      type: 'textarea',
      showInList: false,
      showInForm: false,
    },
    {
      name: 'created_at',
      label: i18n.t('mes.material_return.k19'),
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'return_no',
      'order_number',
      'operator',
      'return_time',
      'items_count',
      'reason',
      'status',
    ],
    searchFields: ['return_no', 'order_number', 'operator'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.material_return.k20'),
        type: 'select',
        options: [
          { label: i18n.t('mes.material_return.k21'), value: 'all' },
          { label: i18n.t('mes.material_return.k22'), value: 'pending' },
          { label: i18n.t('mes.material_return.k23'), value: 'approved' },
          { label: i18n.t('mes.material_return.k24'), value: 'returned' },
          { label: i18n.t('mes.material_return.k25'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'detail'],

  formSections: [
    {
      title: i18n.t('mes.material_return.k26'),
      fields: ['return_no', 'order_number', 'operator', 'work_station_id'],
    },
    {
      title: i18n.t('mes.material_return.k27'),
      fields: ['reason', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.material_return.k28'),
  detailTitle: i18n.t('mes.material_return.k29'),
};
