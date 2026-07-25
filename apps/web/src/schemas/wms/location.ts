/**
 * 库位 Schema
 */

import type { EntitySchema } from '@/schema';

export const locationSchema: EntitySchema = {
  entity: 'location',
  title: '库位',
  description: '管理仓库库位信息',

  api: {
    module: 'wms',
    resource: 'locations',
  },

  fields: [
    {
      name: 'code',
      label: '库位编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: '库位名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'warehouse_id',
      label: '所属仓库',
      type: 'text',
      renderCell: (row: Record<string, unknown>) => {
        return (row as Record<string, unknown>)._warehouse_name
          ? String((row as Record<string, unknown>)._warehouse_name)
          : String(row.warehouse_id || '-');
      },
    },
    {
      name: 'zone_name',
      label: '库区',
      type: 'text',
    },
    {
      name: 'location_type',
      label: '库位类型',
      type: 'select',
      defaultValue: 'storage',
      options: {
        type: 'static',
        options: [
          { value: 'storage', label: '存储' },
          { value: 'picking', label: '拣货' },
          { value: 'receiving', label: '收货' },
          { value: 'shipping', label: '发货' },
          { value: 'staging', label: '暂存' },
          { value: 'quarantine', label: '待检' },
          { value: 'returned', label: '退货' },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const typeMap: Record<string, string> = {
          storage: '存储',
          picking: '拣货',
          receiving: '收货',
          shipping: '发货',
          staging: '暂存',
          quarantine: '待检',
          returned: '退货',
        };
        return typeMap[row.location_type as string] || String(row.location_type || '-');
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'text',
      readonly: true,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, string> = {
          empty: '空闲',
          partially_filled: '部分占用',
          full: '已满',
          inactive: '停用',
        };
        return statusMap[row.status as string] || String(row.status || '-');
      },
    },
    {
      name: 'capacity',
      label: '容量',
      type: 'number',
    },
    {
      name: 'occupied_quantity',
      label: '已占用数量',
      type: 'number',
      readonly: true,
    },
    {
      name: 'zone_id',
      label: '库区ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'aisle',
      label: '通道',
      type: 'text',
      showInList: false,
    },
    {
      name: 'row',
      label: '行',
      type: 'text',
      showInList: false,
    },
    {
      name: 'column',
      label: '列',
      type: 'text',
      showInList: false,
    },
    {
      name: 'layer',
      label: '层',
      type: 'text',
      showInList: false,
    },
    {
      name: 'volume',
      label: '容积',
      type: 'number',
      showInList: false,
    },
    {
      name: 'weight_limit',
      label: '重量限制',
      type: 'number',
      showInList: false,
    },
    {
      name: 'temperature_zone',
      label: '温度区域',
      type: 'text',
      showInList: false,
    },
    {
      name: 'barcode',
      label: '条码',
      type: 'text',
      showInList: false,
    },
    {
      name: 'rfid',
      label: 'RFID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'warehouse_id',
      'zone_name',
      'location_type',
      'status',
      'capacity',
      'occupied_quantity',
    ],
    searchFields: ['code', 'name'],
    pageSize: 10,
  },

  actions: ['create', 'edit', 'detail', 'delete'],
  formColCount: 2,
  createTitle: '新增库位',
  editTitle: '编辑库位',
  detailTitle: '库位详情',
};
