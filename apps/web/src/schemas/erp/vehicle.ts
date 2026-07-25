/**
 * 车辆管理 Schema — 驱动 VehiclePage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

export const vehicleSchema: EntitySchema = {
  entity: 'vehicle',
  title: '车辆管理',
  description: '管理公司车辆信息，包括车牌号、品牌、型号、驾驶员、状态等',

  api: {
    module: 'erp',
    resource: 'vehicles',
  },

  fields: [
    {
      name: 'plate_number',
      label: '车牌号',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'brand',
      label: '品牌',
      type: 'text',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'model',
      label: '型号',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'vehicle_type',
      label: '车辆类型',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'sedan', label: '轿车' },
          { value: 'suv', label: 'SUV' },
          { value: 'van', label: '面包车' },
          { value: 'truck', label: '卡车' },
          { value: 'bus', label: '巴士' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'driver',
      label: '驾驶员',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'mileage',
      label: '里程(km)',
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const mileage = row.mileage as number | undefined;
        return mileage !== undefined ? mileage.toLocaleString() : '-';
      },
    },
    {
      name: 'last_service',
      label: '上次保养',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'fuel_type',
      label: '燃料类型',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'gasoline', label: '汽油' },
          { value: 'diesel', label: '柴油' },
          { value: 'electric', label: '电动' },
          { value: 'hybrid', label: '混合动力' },
        ],
      },
      showInList: false,
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
          { value: 'in_use', label: '使用中' },
          { value: 'maintenance', label: '维护中' },
          { value: 'unavailable', label: '不可用' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'plate_number',
      'brand',
      'model',
      'vehicle_type',
      'driver',
      'mileage',
      'status',
      'last_service',
    ],
    searchFields: ['plate_number', 'brand'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        available: 'success',
        in_use: 'info',
        maintenance: 'warning',
        unavailable: 'error',
      },
      labelMap: {
        available: '可用',
        in_use: '使用中',
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
          { label: '使用中', value: 'in_use' },
          { label: '维护中', value: 'maintenance' },
          { label: '不可用', value: 'unavailable' },
        ],
      },
      {
        id: 'vehicle_type',
        label: '车辆类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '轿车', value: 'sedan' },
          { label: 'SUV', value: 'suv' },
          { label: '面包车', value: 'van' },
          { label: '卡车', value: 'truck' },
          { label: '巴士', value: 'bus' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '车辆信息',
      fields: ['plate_number', 'brand', 'model', 'vehicle_type', 'fuel_type'],
    },
    {
      title: '使用信息',
      fields: ['driver', 'mileage', 'last_service', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增车辆',
  editTitle: '编辑车辆',
  detailTitle: '车辆详情',
};
