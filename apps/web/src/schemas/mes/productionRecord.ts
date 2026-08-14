import React from 'react';
import { Chip, Stack, Box } from '@mui/material';
import { User, Package } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const productionRecordSchema: EntitySchema = {
  entity: 'mes_production_record',
  title: i18n.t('mes.production_record.k0'),
  description: i18n.t('mes.production_record.k1'),

  api: {
    module: 'mes',
    resource: 'records',
  },

  fields: [
    {
      name: 'order_id',
      label: i18n.t('mes.production_record.id_2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(Box, { sx: { fontWeight: 500 } }, String(row.order_id ?? '')),
    },
    {
      name: 'process_id',
      label: i18n.t('mes.production_record.k3'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'work_station_id',
      label: i18n.t('mes.production_record.k4'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'operator',
      label: i18n.t('mes.production_record.k5'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Stack,
          { direction: 'row', spacing: 0.5, sx: { alignItems: 'center' } },
          React.createElement(User, { size: 14 }),
          String(row.operator ?? '')
        ),
    },
    {
      name: 'quantity_completed',
      label: i18n.t('mes.production_record.k6'),
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Stack,
          { direction: 'row', spacing: 0.5, sx: { alignItems: 'center' } },
          React.createElement(Package, { size: 14 }),
          String(row.quantity_completed ?? '')
        ),
    },
    {
      name: 'quantity_rejected',
      label: i18n.t('mes.production_record.k7'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'start_time',
      label: i18n.t('mes.production_record.k8'),
      type: 'datetime',
      required: true,
      readonlyOnEdit: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) =>
        row.start_time ? new Date(row.start_time as string).toLocaleString('zh-CN') : '-',
    },
    {
      name: 'end_time',
      label: i18n.t('mes.production_record.k9'),
      type: 'datetime',
      listWidth: 160,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('mes.production_record.k10'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('mes.production_record.k11') },
          { value: 'in_progress', label: i18n.t('mes.production_record.k12') },
          { value: 'completed', label: i18n.t('mes.production_record.k13') },
          { value: 'cancelled', label: i18n.t('mes.production_record.k14') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          pending: { label: i18n.t('mes.production_record.k15'), bg: 'warning.light', color: 'warning.700' },
          in_progress: { label: i18n.t('mes.production_record.k16'), bg: 'primary.100', color: 'primary.dark' },
          completed: { label: i18n.t('mes.production_record.k17'), bg: 'success.lighter', color: 'success.700' },
          cancelled: { label: i18n.t('mes.production_record.k18'), bg: 'error.lighter', color: 'error.dark' },
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
      name: 'notes',
      label: i18n.t('mes.production_record.k19'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('mes.production_record.k20'),
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'order_id',
      'process_id',
      'work_station_id',
      'operator',
      'quantity_completed',
      'quantity_rejected',
      'start_time',
      'status',
    ],
    searchFields: ['order_id', 'operator'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.production_record.k21'),
        type: 'select',
        options: [
          { label: i18n.t('mes.production_record.k22'), value: '' },
          { label: i18n.t('mes.production_record.k23'), value: 'pending' },
          { label: i18n.t('mes.production_record.k24'), value: 'in_progress' },
          { label: i18n.t('mes.production_record.k25'), value: 'completed' },
          { label: i18n.t('mes.production_record.k26'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.production_record.k27'),
      fields: ['order_id', 'process_id', 'work_station_id', 'operator'],
    },
    {
      title: i18n.t('mes.production_record.k28'),
      fields: ['quantity_completed', 'quantity_rejected'],
    },
    {
      title: i18n.t('mes.production_record.k29'),
      fields: ['start_time', 'end_time'],
    },
    {
      title: i18n.t('mes.production_record.k30'),
      fields: ['status', 'notes'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.production_record.k31'),
  editTitle: i18n.t('mes.production_record.k32'),
  detailTitle: i18n.t('mes.production_record.k33'),
};
