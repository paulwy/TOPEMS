import React from 'react';
import { Chip, Box } from '@mui/material';
import type { EntitySchema } from '@/schema';

export const materialReturnSchema: EntitySchema = {
  entity: 'mes_material_return',
  title: '物料退回',
  description: '管理物料退库单，包括退库单号、工单、退库人、退库时间、原因、状态等',

  api: {
    module: 'mes',
    resource: 'materialReturns',
  },

  fields: [
    {
      name: 'return_no',
      label: '退库单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'order_number',
      label: '工单号',
      type: 'text',
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'operator',
      label: '退库人',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'return_time',
      label: '退库时间',
      type: 'datetime',
      listWidth: 160,
    },
    {
      name: 'items_count',
      label: '物料数',
      type: 'number',
      listWidth: 80,
      readonly: true,
      renderCell: (row: Record<string, unknown>) =>
        (row.items as unknown[] | undefined)?.length || 0,
    },
    {
      name: 'reason',
      label: '退库原因',
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
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待审核' },
          { value: 'approved', label: '已审核' },
          { value: 'returned', label: '已退库' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          pending: { label: '待审核', bg: 'warning.light', color: 'warning.700' },
          approved: { label: '已审核', bg: 'secondary.100', color: 'secondary.700' },
          returned: { label: '已退库', bg: 'success.lighter', color: 'success.700' },
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
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'work_station_id',
      label: '工位ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'items',
      label: '物料明细',
      type: 'textarea',
      showInList: false,
      showInForm: false,
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
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待审核', value: 'pending' },
          { label: '已审核', value: 'approved' },
          { label: '已退库', value: 'returned' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'detail'],

  formSections: [
    {
      title: '基本信息',
      fields: ['return_no', 'order_number', 'operator', 'work_station_id'],
    },
    {
      title: '原因与状态',
      fields: ['reason', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增物料退库',
  detailTitle: '物料退库详情',
};
