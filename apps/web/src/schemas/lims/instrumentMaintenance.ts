/**
 * 仪器维护记录 Schema — 驱动 LimsInstrumentMaintenancePage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import { designTokens } from '@topems/tokens';

const MAINTENANCE_TYPE_OPTIONS = [
  { value: 'routine', label: '日常维护' },
  { value: 'preventive', label: '预防性维护' },
  { value: 'corrective', label: '故障维修' },
  { value: 'calibration', label: '校准维护' },
  { value: 'other', label: '其他' },
];

const renderBadge = (
  label: string,
  color: 'primary' | 'error' | 'success' | 'info' | 'warning' | 'default'
) => {
  const colorMap: Record<string, string> = {
    primary: `var(--color-primary-main, ${designTokens.colors.primary.dark})`,
    success: `var(--color-success-main, ${designTokens.colors.success.dark})`,
    error: `var(--color-error-main, ${designTokens.colors.error['800']})`,
    info: 'var(--color-info-main, #0288d1)',
    warning: 'var(--color-warning-main, #ed6c02)',
    default: 'var(--color-text-secondary, rgba(0,0,0,0.6))',
  };
  const bgColorMap: Record<string, string> = {
    primary: `var(--color-primary-lighter, ${designTokens.colors.primary['50']})`,
    success: `var(--color-success-lighter, ${designTokens.colors.success['50']})`,
    error: 'var(--color-error-lighter, #ffebee)',
    info: 'var(--color-info-lighter, #e1f5fe)',
    warning: 'var(--color-warning-lighter, #fff3e0)',
    default: 'var(--color-action-hover, rgba(0,0,0,0.04))',
  };
  return React.createElement(
    'span',
    {
      style: {
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: bgColorMap[color],
        color: colorMap[color],
      },
    },
    label
  );
};

const MAINTENANCE_TYPE_COLORS: Record<
  string,
  'primary' | 'success' | 'warning' | 'error' | 'info' | 'default'
> = {
  routine: 'info',
  preventive: 'success',
  corrective: 'warning',
  calibration: 'primary',
  other: 'default',
};

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  routine: '日常维护',
  preventive: '预防性维护',
  corrective: '故障维修',
  calibration: '校准维护',
  other: '其他',
};

export const instrumentMaintenanceSchema: EntitySchema = {
  entity: 'limsInstrumentMaintenance',
  title: '仪器维护记录',
  description: '管理仪器维护记录，包括维护类型、描述、执行人、执行时间、费用等信息',

  api: {
    module: 'lims',
    resource: 'maintenance',
  },

  fields: [
    {
      name: 'maintenance_type',
      label: '维护类型',
      type: 'select',
      required: true,
      defaultValue: 'routine',
      options: {
        type: 'static',
        options: MAINTENANCE_TYPE_OPTIONS,
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const type = String(row.maintenance_type || '');
        const label = MAINTENANCE_TYPE_LABELS[type] || type;
        const color = MAINTENANCE_TYPE_COLORS[type] || 'default';
        return renderBadge(label, color);
      },
    },
    {
      name: 'description',
      label: '维护描述',
      type: 'text',
      required: true,
      sortable: false,
      listWidth: 200,
    },
    {
      name: 'performed_by',
      label: '执行人',
      type: 'text',
      required: true,
      listWidth: 100,
    },
    {
      name: 'performed_at',
      label: '执行时间',
      type: 'datetime',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'next_maintenance_date',
      label: '下次维护日期',
      type: 'date',
      listWidth: 130,
    },
    {
      name: 'cost',
      label: '维护费用',
      type: 'number',
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const cost = row.cost;
        if (cost === undefined || cost === null) return '-';
        return `¥${Number(cost).toFixed(2)}`;
      },
    },
    {
      name: 'instrument_id',
      label: '仪器ID',
      type: 'text',
      showInList: false,
      required: true,
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
      'maintenance_type',
      'description',
      'performed_by',
      'performed_at',
      'next_maintenance_date',
      'cost',
    ],
    searchFields: ['description', 'performed_by'],
    pageSize: 10,
    filters: [
      {
        id: 'maintenance_type',
        label: '维护类型',
        type: 'select',
        options: [{ label: '全部类型', value: 'all' }, ...MAINTENANCE_TYPE_OPTIONS],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['instrument_id', 'maintenance_type', 'description'],
    },
    {
      title: '执行信息',
      fields: ['performed_by', 'performed_at', 'next_maintenance_date', 'cost'],
    },
    {
      title: '其他信息',
      fields: ['notes'],
    },
  ],

  formColCount: 2,
  createTitle: '新增维护记录',
  editTitle: '编辑维护记录',
  detailTitle: '维护记录详情',
};
