import React from 'react';
import type { EntitySchema } from '@/schema';

export const meetingRoomSchema: EntitySchema = {
  entity: 'meetingRoom',
  title: '会议室管理',
  description: '管理会议室基础信息，包括名称、位置、容纳人数、设施等',

  api: {
    module: 'erp',
    resource: 'meetingRooms',
  },

  fields: [
    {
      name: 'name',
      label: '会议室名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'location',
      label: '位置',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'capacity',
      label: '容纳人数',
      type: 'number',
      defaultValue: 10,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'facilities',
      label: '设施',
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'available',
      options: {
        type: 'static',
        options: [
          { value: 'available', label: '可用' },
          { value: 'occupied', label: '占用中' },
          { value: 'maintenance', label: '维护中' },
          { value: 'unavailable', label: '不可用' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['name', 'location', 'capacity', 'facilities', 'status'],
    searchFields: ['name', 'location'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        available: 'success',
        occupied: 'warning',
        maintenance: 'info',
        unavailable: 'error',
      },
      labelMap: {
        available: '可用',
        occupied: '占用中',
        maintenance: '维护中',
        unavailable: '不可用',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '可用', value: 'available' },
          { label: '占用中', value: 'occupied' },
          { label: '维护中', value: 'maintenance' },
          { label: '不可用', value: 'unavailable' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'location', 'capacity'],
    },
    {
      title: '设施与状态',
      fields: ['facilities', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增会议室',
  editTitle: '编辑会议室',
  detailTitle: '会议室详情',
};
