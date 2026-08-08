import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

export const materialIssueSchema: EntitySchema = {
  entity: 'mes_material_issue',
  title: '物料发放',
  description: '管理物料领用单，包括领用单号、工单、领用人、领用时间、状态等',

  api: {
    module: 'mes',
    resource: 'materialIssues',
  },

  fields: [
    {
      name: 'issue_no',
      label: '领用单号',
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
      label: '领用人',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'issue_time',
      label: '领用时间',
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
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待审核' },
          { value: 'approved', label: '已审核' },
          { value: 'issued', label: '已出库' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          pending: { label: '待审核', bg: 'warning.light', color: 'warning.700' },
          approved: { label: '已审核', bg: 'secondary.100', color: 'secondary.700' },
          issued: { label: '已出库', bg: 'success.lighter', color: 'success.700' },
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
      name: 'remark',
      label: '备注',
      type: 'textarea',
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
    columns: ['issue_no', 'order_number', 'operator', 'issue_time', 'items_count', 'status'],
    searchFields: ['issue_no', 'order_number', 'operator'],
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
          { label: '已出库', value: 'issued' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'detail'],

  formSections: [
    {
      title: '基本信息',
      fields: ['issue_no', 'order_number', 'operator', 'work_station_id'],
    },
    {
      title: '状态与备注',
      fields: ['status', 'remark'],
    },
  ],

  formColCount: 2,
  createTitle: '新增物料领用',
  detailTitle: '物料领用详情',
};
