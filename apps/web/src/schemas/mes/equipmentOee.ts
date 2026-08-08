import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const getOEEColorHex = (value: number | undefined | null) => {
  if (value == null || isNaN(value)) return 'text.primary';
  if (value >= 85) return 'success.700';
  if (value >= 70) return 'warning.700';
  return 'error.700';
};

const getOEEBgColor = (value: number | undefined | null) => {
  if (value == null || isNaN(value)) return 'grey.100';
  if (value >= 85) return 'success.lighter';
  if (value >= 70) return 'warning.light';
  return 'error.lighter';
};

const formatPercent = (value: number | undefined | null) => {
  if (value == null || isNaN(value)) return '-';
  return `${value.toFixed(1)}%`;
};

export const equipmentOeeSchema: EntitySchema = {
  entity: 'mes_equipment_oee',
  title: '设备OEE',
  description: '管理设备综合效率（OEE）记录，包括可用率、性能率、质量率等指标',

  api: {
    module: 'mes',
    resource: 'equipmentOee',
  },

  fields: [
    {
      name: 'equipment_code',
      label: '设备编号',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'equipment_name',
      label: '设备名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'record_date',
      label: '记录日期',
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'shift',
      label: '班次',
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'availability',
      label: '可用率',
      type: 'number',
      readonly: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(Chip, {
          size: 'small',
          label: formatPercent(row.availability as number),
          sx: {
            backgroundColor: getOEEBgColor(row.availability as number),
            color: getOEEColorHex(row.availability as number),
            fontWeight: 500,
          },
        }),
    },
    {
      name: 'performance',
      label: '性能率',
      type: 'number',
      readonly: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(Chip, {
          size: 'small',
          label: formatPercent(row.performance as number),
          sx: {
            backgroundColor: getOEEBgColor(row.performance as number),
            color: getOEEColorHex(row.performance as number),
            fontWeight: 500,
          },
        }),
    },
    {
      name: 'quality',
      label: '质量率',
      type: 'number',
      readonly: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(Chip, {
          size: 'small',
          label: formatPercent(row.quality as number),
          sx: {
            backgroundColor: getOEEBgColor(row.quality as number),
            color: getOEEColorHex(row.quality as number),
            fontWeight: 500,
          },
        }),
    },
    {
      name: 'oee',
      label: '综合OEE',
      type: 'number',
      readonly: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(Chip, {
          size: 'small',
          label: formatPercent(row.oee as number),
          sx: {
            backgroundColor: getOEEBgColor(row.oee as number),
            color: getOEEColorHex(row.oee as number),
            fontWeight: 600,
          },
        }),
    },
    {
      name: 'planned_production_time',
      label: '计划生产时间(分钟)',
      type: 'number',
      showInList: false,
    },
    {
      name: 'run_time',
      label: '运行时间(分钟)',
      type: 'number',
      showInList: false,
    },
    {
      name: 'downtime',
      label: '停机时间(分钟)',
      type: 'number',
      showInList: false,
    },
    {
      name: 'ideal_cycle_time',
      label: '理想周期时间(秒)',
      type: 'number',
      showInList: false,
    },
    {
      name: 'total_count',
      label: '总产量(件)',
      type: 'number',
      showInList: false,
    },
    {
      name: 'good_count',
      label: '合格数量(件)',
      type: 'number',
      showInList: false,
    },
    {
      name: 'reject_count',
      label: '不良数量(件)',
      type: 'number',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'equipment_code',
      'equipment_name',
      'record_date',
      'shift',
      'availability',
      'performance',
      'quality',
      'oee',
    ],
    searchFields: ['equipment_code', 'equipment_name'],
    pageSize: 10,
    selectable: true,
    filters: [],
  },

  actions: ['detail'],

  formSections: [
    {
      title: '基本信息',
      fields: ['equipment_code', 'equipment_name', 'record_date', 'shift'],
    },
    {
      title: '生产数据',
      fields: [
        'planned_production_time',
        'run_time',
        'downtime',
        'ideal_cycle_time',
        'total_count',
        'good_count',
        'reject_count',
      ],
    },
    {
      title: 'OEE指标',
      fields: ['availability', 'performance', 'quality', 'oee'],
    },
  ],

  formColCount: 2,
  detailTitle: 'OEE记录详情',
};
