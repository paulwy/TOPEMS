import React from 'react';
import type { EntitySchema } from '@/schema';

export const vehicleRequestSchema: EntitySchema = {
  entity: 'vehicleRequest',
  title: '车辆申请',
  description: '管理车辆申请信息，包括申请人、车辆、用途、时间等',

  api: {
    module: 'erp',
    resource: 'vehicleRequests',
  },

  fields: [
    {
      name: 'vehicle_plate',
      label: '车牌号',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'requester',
      label: '申请人',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'purpose',
      label: '用途',
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'start_time',
      label: '开始时间',
      type: 'datetime',
      required: true,
      listWidth: 160,
    },
    {
      name: 'end_time',
      label: '结束时间',
      type: 'datetime',
      required: true,
      listWidth: 160,
    },
    {
      name: 'driver_required',
      label: '需要司机',
      type: 'switch',
      defaultValue: false,
      listWidth: 100,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待审批' },
          { value: 'approved', label: '已批准' },
          { value: 'rejected', label: '已拒绝' },
          { value: 'completed', label: '已完成' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['vehicle_plate', 'requester', 'purpose', 'start_time', 'status'],
    searchFields: ['vehicle_plate', 'requester', 'purpose'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        approved: 'success',
        rejected: 'error',
        completed: 'default',
      },
      labelMap: {
        pending: '待审批',
        approved: '已批准',
        rejected: '已拒绝',
        completed: '已完成',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待审批', value: 'pending' },
          { label: '已批准', value: 'approved' },
          { label: '已拒绝', value: 'rejected' },
          { label: '已完成', value: 'completed' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '申请信息',
      fields: ['vehicle_plate', 'requester', 'purpose', 'driver_required'],
    },
    {
      title: '时间与状态',
      fields: ['start_time', 'end_time', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增车辆申请',
  editTitle: '编辑车辆申请',
  detailTitle: '车辆申请详情',
};
