import React from 'react';
import { Chip, Stack, Box } from '@mui/material';
import { User, Package, Clock } from 'lucide-react';
import type { EntitySchema } from '@/schema';

export const productionRecordSchema: EntitySchema = {
  entity: 'mes_production_record',
  title: '生产记录',
  description: '管理生产记录，包括订单、工序、工位、操作员、完成数量、不良数量等',

  api: {
    module: 'mes',
    resource: 'records',
  },

  fields: [
    {
      name: 'order_id',
      label: '订单ID',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => React.createElement(Box, { sx: { fontWeight: 500 } }, row.order_id),
    },
    {
      name: 'process_id',
      label: '工序',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'work_station_id',
      label: '工作站',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'operator',
      label: '操作员',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Stack,
          { direction: 'row', spacing: 0.5, sx: { alignItems: 'center' } },
          React.createElement(User, { size: 14 }),
          row.operator
        ),
    },
    {
      name: 'quantity_completed',
      label: '完成数量',
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Stack,
          { direction: 'row', spacing: 0.5, sx: { alignItems: 'center' } },
          React.createElement(Package, { size: 14 }),
          row.quantity_completed
        ),
    },
    {
      name: 'quantity_rejected',
      label: '不良数量',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'start_time',
      label: '开始时间',
      type: 'datetime',
      required: true,
      readonlyOnEdit: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) =>
        row.start_time ? new Date(row.start_time as string).toLocaleString('zh-CN') : '-',
    },
    {
      name: 'end_time',
      label: '结束时间',
      type: 'datetime',
      listWidth: 160,
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待处理' },
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          pending: { label: '待处理', bg: 'warning.light', color: 'warning.700' },
          in_progress: { label: '进行中', bg: 'primary.100', color: 'primary.dark' },
          completed: { label: '已完成', bg: 'success.lighter', color: 'success.700' },
          cancelled: { label: '已取消', bg: 'error.lighter', color: 'error.dark' },
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
    },
    {
      name: 'notes',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
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
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: '' },
          { label: '待处理', value: 'pending' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['order_id', 'process_id', 'work_station_id', 'operator'],
    },
    {
      title: '数量信息',
      fields: ['quantity_completed', 'quantity_rejected'],
    },
    {
      title: '时间信息',
      fields: ['start_time', 'end_time'],
    },
    {
      title: '状态与备注',
      fields: ['status', 'notes'],
    },
  ],

  formColCount: 2,
  createTitle: '新增生产记录',
  editTitle: '编辑生产记录',
  detailTitle: '生产记录详情',
};
