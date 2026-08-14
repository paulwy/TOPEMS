import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const workOrderSchema: EntitySchema = {
  entity: 'mes_work_order',
  title: i18n.t('mes.work_order.k0'),
  description: i18n.t('mes.work_order.k1'),

  api: {
    module: 'mes',
    resource: 'workOrders',
  },

  fields: [
    {
      name: 'work_order_no',
      label: i18n.t('mes.work_order.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'order_number',
      label: i18n.t('mes.work_order.k3'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'process_name',
      label: i18n.t('mes.work_order.k4'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'work_station_name',
      label: i18n.t('mes.work_order.k5'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'team_name',
      label: i18n.t('mes.work_order.k6'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'quantity',
      label: i18n.t('mes.work_order.k7'),
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'completed_quantity',
      label: i18n.t('mes.work_order.k8'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'good_quantity',
      label: i18n.t('mes.work_order.k9'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'bad_quantity',
      label: i18n.t('mes.work_order.k10'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'planned_start_time',
      label: i18n.t('mes.work_order.k11'),
      type: 'datetime',
      listWidth: 150,
    },
    {
      name: 'planned_end_time',
      label: i18n.t('mes.work_order.k12'),
      type: 'datetime',
      listWidth: 150,
    },
    {
      name: 'actual_start_time',
      label: i18n.t('mes.work_order.k13'),
      type: 'datetime',
      listWidth: 150,
    },
    {
      name: 'actual_end_time',
      label: i18n.t('mes.work_order.k14'),
      type: 'datetime',
      listWidth: 150,
    },
    {
      name: 'priority',
      label: i18n.t('mes.work_order.k15'),
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: i18n.t('mes.work_order.k16') },
          { value: 'normal', label: i18n.t('mes.work_order.k17') },
          { value: 'high', label: i18n.t('mes.work_order.k18') },
          { value: 'urgent', label: i18n.t('mes.work_order.k19') },
        ],
      },
      listWidth: 80,
      renderCell: (row: Record<string, unknown>) => {
        const priorityMap: Record<string, { label: string; bg: string; color: string }> = {
          urgent: { label: i18n.t('mes.work_order.k20'), bg: 'error.lighter', color: 'error.dark' },
          high: { label: i18n.t('mes.work_order.k21'), bg: 'warning.light', color: 'warning.700' },
          normal: { label: i18n.t('mes.work_order.k22'), bg: 'primary.100', color: 'primary.dark' },
          low: { label: i18n.t('mes.work_order.k23'), bg: 'grey.100', color: 'text.secondary' },
        };
        const p = priorityMap[(row.priority as string) || 'normal'] || priorityMap.normal;
        return React.createElement(Chip, {
          size: 'small',
          label: p.label,
          sx: { backgroundColor: p.bg, color: p.color, fontWeight: 500 },
        });
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'status',
      label: i18n.t('mes.work_order.k24'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('mes.work_order.k25') },
          { value: 'in_progress', label: i18n.t('mes.work_order.k26') },
          { value: 'paused', label: i18n.t('mes.work_order.k27') },
          { value: 'completed', label: i18n.t('mes.work_order.k28') },
          { value: 'cancelled', label: i18n.t('mes.work_order.k29') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'remark',
      label: i18n.t('mes.work_order.k30'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'work_order_no',
      'order_number',
      'process_name',
      'work_station_name',
      'team_name',
      'quantity',
      'completed_quantity',
      'priority',
      'status',
    ],
    searchFields: ['work_order_no', 'order_number'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'default',
        in_progress: 'info',
        paused: 'warning',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: i18n.t('mes.work_order.k31'),
        in_progress: i18n.t('mes.work_order.k32'),
        paused: i18n.t('mes.work_order.k33'),
        completed: i18n.t('mes.work_order.k34'),
        cancelled: i18n.t('mes.work_order.k35'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.work_order.k36'),
        type: 'select',
        options: [
          { label: i18n.t('mes.work_order.k37'), value: 'all' },
          { label: i18n.t('mes.work_order.k38'), value: 'pending' },
          { label: i18n.t('mes.work_order.k39'), value: 'in_progress' },
          { label: i18n.t('mes.work_order.k40'), value: 'paused' },
          { label: i18n.t('mes.work_order.k41'), value: 'completed' },
          { label: i18n.t('mes.work_order.k42'), value: 'cancelled' },
        ],
      },
      {
        id: 'priority',
        label: i18n.t('mes.work_order.k43'),
        type: 'select',
        options: [
          { label: i18n.t('mes.work_order.k44'), value: 'all' },
          { label: i18n.t('mes.work_order.k45'), value: 'low' },
          { label: i18n.t('mes.work_order.k46'), value: 'normal' },
          { label: i18n.t('mes.work_order.k47'), value: 'high' },
          { label: i18n.t('mes.work_order.k48'), value: 'urgent' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.work_order.k49'),
      fields: ['work_order_no', 'order_number', 'process_name', 'work_station_name', 'team_name'],
    },
    {
      title: i18n.t('mes.work_order.k50'),
      fields: ['quantity', 'completed_quantity', 'good_quantity', 'bad_quantity'],
    },
    {
      title: i18n.t('mes.work_order.k51'),
      fields: ['planned_start_time', 'planned_end_time', 'actual_start_time', 'actual_end_time'],
    },
    {
      title: i18n.t('mes.work_order.k52'),
      fields: ['priority', 'status', 'remark'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.work_order.k53'),
  editTitle: i18n.t('mes.work_order.k54'),
  detailTitle: i18n.t('mes.work_order.k55'),
};
