/**
 * 资产管理 Schema — 驱动 AssetManagementPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

export const assetSchema: EntitySchema = {
  entity: 'asset',
  title: '资产管理',
  description: '管理公司流动资产，包括设备、工具、办公用品等',

  api: {
    module: 'erp',
    resource: 'assets',
  },

  fields: [
    {
      name: 'name',
      label: '资产名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'asset_number',
      label: '资产编号',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'category',
      label: '类别',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'brand',
      label: '品牌',
      type: 'text',
      showInList: false,
    },
    {
      name: 'model',
      label: '型号',
      type: 'text',
      showInList: false,
    },
    {
      name: 'serial_number',
      label: '序列号',
      type: 'text',
      showInList: false,
    },
    {
      name: 'manufacturer',
      label: '制造商',
      type: 'text',
      showInList: false,
    },
    {
      name: 'department',
      label: '所属部门',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'location',
      label: '存放位置',
      type: 'text',
      showInList: false,
    },
    {
      name: 'responsible_id',
      label: '负责人ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'purchase_date',
      label: '购置日期',
      type: 'date',
      showInList: false,
    },
    {
      name: 'purchase_amount',
      label: '购置金额',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.purchase_amount as number | undefined;
        return amount ? `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '-';
      },
    },
    {
      name: 'rated_power',
      label: '额定功率(kW)',
      type: 'number',
      defaultValue: 0,
      showInList: false,
    },
    {
      name: 'rated_voltage',
      label: '额定电压(V)',
      type: 'number',
      defaultValue: 0,
      showInList: false,
    },
    {
      name: 'rated_current',
      label: '额定电流(A)',
      type: 'number',
      defaultValue: 0,
      showInList: false,
    },
    {
      name: 'specifications',
      label: '规格说明',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '在用' },
          { value: 'idle', label: '闲置' },
          { value: 'maintenance', label: '维修中' },
          { value: 'retired', label: '已报废' },
          { value: 'transferred', label: '已转移' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['name', 'asset_number', 'category', 'department', 'purchase_amount', 'status'],
    searchFields: ['name', 'asset_number', 'category'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        idle: 'warning',
        maintenance: 'info',
        retired: 'error',
        transferred: 'default',
      },
      labelMap: {
        active: '在用',
        idle: '闲置',
        maintenance: '维修中',
        retired: '已报废',
        transferred: '已转移',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '在用', value: 'active' },
          { label: '闲置', value: 'idle' },
          { label: '维修中', value: 'maintenance' },
          { label: '已报废', value: 'retired' },
          { label: '已转移', value: 'transferred' },
        ],
      },
      {
        id: 'category',
        label: '类别',
        type: 'select',
        options: [
          { label: '全部类别', value: 'all' },
          { label: '电子设备', value: '电子设备' },
          { label: '机械设备', value: '机械设备' },
          { label: '办公设备', value: '办公设备' },
          { label: '家具', value: '家具' },
          { label: '其他', value: '其他' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: [
        'name',
        'asset_number',
        'category',
        'brand',
        'model',
        'serial_number',
        'manufacturer',
      ],
    },
    {
      title: '位置与责任人',
      fields: ['department', 'location', 'responsible_id'],
    },
    {
      title: '采购信息',
      fields: ['purchase_date', 'purchase_amount'],
    },
    {
      title: '技术参数',
      fields: ['rated_power', 'rated_voltage', 'rated_current', 'specifications'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增资产',
  editTitle: '编辑资产',
  detailTitle: '资产详情',
};
