/**
 * 仪器维护记录 Schema — 驱动 LimsInstrumentMaintenancePage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const getMaintenanceTypeOptions = () => [
  { value: 'routine', label: i18n.t('lims.instrument_maintenance.k0') },
  { value: 'preventive', label: i18n.t('lims.instrument_maintenance.k1') },
  { value: 'corrective', label: i18n.t('lims.instrument_maintenance.k2') },
  { value: 'calibration', label: i18n.t('lims.instrument_maintenance.k3') },
  { value: 'other', label: i18n.t('lims.instrument_maintenance.k4') },
];

const renderBadge = (
  label: string,
  color: 'primary' | 'error' | 'success' | 'info' | 'warning' | 'default'
) => {
  const colorMap: Record<string, string> = {
    primary: `var(--color-primary-main, ${designTokens.colors.primary.dark})`,
    success: `var(--color-success-main, ${designTokens.colors.success.dark})`,
    error: `var(--color-error-main, ${designTokens.colors.error['800']})`,
    info: `var(--color-info-main, ${designTokens.colors.info[600]}`,
    warning: `var(--color-warning-main, ${designTokens.colors.warning[500]}`,
    default: `var(--color-text-secondary, ${designTokens.colors.cyber.metal.bottomShadow}`,
  };
  const bgColorMap: Record<string, string> = {
    primary: `var(--color-primary-lighter, ${designTokens.colors.primary['50']})`,
    success: `var(--color-success-lighter, ${designTokens.colors.success['50']})`,
    error: `var(--color-error-lighter, ${designTokens.colors.error[50]}`,
    info: `var(--color-info-lighter, ${designTokens.colors.info[50]}`,
    warning: `var(--color-warning-lighter, ${designTokens.colors.warning[50]}`,
    default: `var(--color-action-hover, ${designTokens.colors.action.hover}`,
  };
  return React.createElement(
    'span',
    {
      style: {
        display: 'inline-block',
        padding: `${designTokens.spacing.xs} 8px`,
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

const getMaintenanceTypeLabels = (): Record<string, string> => ({
  routine: i18n.t('lims.instrument_maintenance.k5'),
  preventive: i18n.t('lims.instrument_maintenance.k6'),
  corrective: i18n.t('lims.instrument_maintenance.k7'),
  calibration: i18n.t('lims.instrument_maintenance.k8'),
  other: i18n.t('lims.instrument_maintenance.k9'),
});

export const getInstrumentMaintenanceSchema = (): EntitySchema => {
  const MAINTENANCE_TYPE_OPTIONS = getMaintenanceTypeOptions();

  return {
    entity: 'limsInstrumentMaintenance',
    title: i18n.t('lims.instrument_maintenance.k10'),
  description: i18n.t('lims.instrument_maintenance.k11'),

  api: {
    module: 'lims',
    resource: 'maintenance',
  },

  fields: [
    {
      name: 'maintenance_type',
      label: i18n.t('lims.instrument_maintenance.k12'),
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
        const label = getMaintenanceTypeLabels()[type] || type;
        const color = MAINTENANCE_TYPE_COLORS[type] || 'default';
        return renderBadge(label, color);
      },
    },
    {
      name: 'description',
      label: i18n.t('lims.instrument_maintenance.k13'),
      type: 'text',
      required: true,
      sortable: false,
      listWidth: 200,
    },
    {
      name: 'performed_by',
      label: i18n.t('lims.instrument_maintenance.k14'),
      type: 'text',
      required: true,
      listWidth: 100,
    },
    {
      name: 'performed_at',
      label: i18n.t('lims.instrument_maintenance.k15'),
      type: 'datetime',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'next_maintenance_date',
      label: i18n.t('lims.instrument_maintenance.k16'),
      type: 'date',
      listWidth: 130,
    },
    {
      name: 'cost',
      label: i18n.t('lims.instrument_maintenance.k17'),
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
      label: i18n.t('lims.instrument_maintenance.id_18'),
      type: 'text',
      showInList: false,
      required: true,
    },
    {
      name: 'notes',
      label: i18n.t('lims.instrument_maintenance.k19'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('lims.instrument_maintenance.k20'),
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
        label: i18n.t('lims.instrument_maintenance.k21'),
        type: 'select',
        options: [
          { label: i18n.t('lims.instrument_maintenance.k22'), value: 'all' },
          ...MAINTENANCE_TYPE_OPTIONS,
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('lims.instrument_maintenance.k23'),
      fields: ['instrument_id', 'maintenance_type', 'description'],
    },
    {
      title: i18n.t('lims.instrument_maintenance.k24'),
      fields: ['performed_by', 'performed_at', 'next_maintenance_date', 'cost'],
    },
    {
      title: i18n.t('lims.instrument_maintenance.k25'),
      fields: ['notes'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('lims.instrument_maintenance.k26'),
  editTitle: i18n.t('lims.instrument_maintenance.k27'),
  detailTitle: i18n.t('lims.instrument_maintenance.k28'),
  };
};
