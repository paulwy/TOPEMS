import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

export const workOrderSchema: EntitySchema = {
  entity: 'mes_work_order',
  title: '工单管理',
  description: '管理生产工单，包括工单号、产品、数量、计划时间、实际时间、状态等',

  api: {
    module: 'mes',
    resource: 'workOrders',
  },

  fields: [
    {
      name: 'work_order_no',
      label: '工单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'order_number',
      label: '生产订单号',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'process_name',
      label: '工序',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'work_station_name',
      label: '工位',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'team_name',
      label: '班组',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'quantity',
      label: '计划数量',
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'completed_quantity',
      label: '已完成数量',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'good_quantity',
      label: '合格数量',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'bad_quantity',
      label: '不合格数量',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'planned_start_time',
      label: '计划开始',
      type: 'datetime',
      listWidth: 150,
    },
    {
      name: 'planned_end_time',
      label: '计划结束',
      type: 'datetime',
      listWidth: 150,
    },
    {
      name: 'actual_start_time',
      label: '实际开始',
      type: 'datetime',
      listWidth: 150,
    },
    {
      name: 'actual_end_time',
      label: '实际结束',
      type: 'datetime',
      listWidth: 150,
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: '低' },
          { value: 'normal', label: '普通' },
          { value: 'high', label: '高' },
          { value: 'urgent', label: '紧急' },
        ],
      },
      listWidth: 80,
      renderCell: (row: Record<string, unknown>) => {
        const priorityMap: Record<string, { label: string; bg: string; color: string }> = {
          urgent: { label: '紧急', bg: 'error.lighter', color: 'error.dark' },
          high: { label: '高', bg: 'warning.light', color: 'warning.700' },
          normal: { label: '普通', bg: 'primary.100', color: 'primary.dark' },
          low: { label: '低', bg: 'grey.100', color: 'text.secondary' },
        };
        const p = priorityMap[(row.priority as string) || 'normal'] || priorityMap.normal;
        return React.createElement(Chip, {
          size: 'small',
          label: p.label,
          sx: { backgroundColor: p.bg, color: p.color, fontWeight: 500 },
        });
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待开始' },
          { value: 'in_progress', label: '进行中' },
          { value: 'paused', label: '已暂停' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'remark',
      label: '备注',
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
        pending: '待开始',
        in_progress: '进行中',
        paused: '已暂停',
        completed: '已完成',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待开始', value: 'pending' },
          { label: '进行中', value: 'in_progress' },
          { label: '已暂停', value: 'paused' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { label: '全部优先级', value: 'all' },
          { label: '低', value: 'low' },
          { label: '普通', value: 'normal' },
          { label: '高', value: 'high' },
          { label: '紧急', value: 'urgent' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['work_order_no', 'order_number', 'process_name', 'work_station_name', 'team_name'],
    },
    {
      title: '数量信息',
      fields: ['quantity', 'completed_quantity', 'good_quantity', 'bad_quantity'],
    },
    {
      title: '时间计划',
      fields: ['planned_start_time', 'planned_end_time', 'actual_start_time', 'actual_end_time'],
    },
    {
      title: '状态与备注',
      fields: ['priority', 'status', 'remark'],
    },
  ],

  formColCount: 2,
  createTitle: '新增工单',
  editTitle: '编辑工单',
  detailTitle: '工单详情',
};
