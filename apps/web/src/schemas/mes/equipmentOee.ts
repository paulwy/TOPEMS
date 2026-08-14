import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

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
  title: i18n.t('mes.equipment_oee.oee_0'),
  description: i18n.t('mes.equipment_oee.k1'),

  api: {
    module: 'mes',
    resource: 'equipmentOee',
  },

  fields: [
    {
      name: 'equipment_code',
      label: i18n.t('mes.equipment_oee.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'equipment_name',
      label: i18n.t('mes.equipment_oee.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'record_date',
      label: i18n.t('mes.equipment_oee.k4'),
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'shift',
      label: i18n.t('mes.equipment_oee.k5'),
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'availability',
      label: i18n.t('mes.equipment_oee.k6'),
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
      label: i18n.t('mes.equipment_oee.k7'),
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
      label: i18n.t('mes.equipment_oee.k8'),
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
      label: i18n.t('mes.equipment_oee.oee_9'),
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
      label: i18n.t('mes.equipment_oee.k10'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'run_time',
      label: i18n.t('mes.equipment_oee.k11'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'downtime',
      label: i18n.t('mes.equipment_oee.k12'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'ideal_cycle_time',
      label: i18n.t('mes.equipment_oee.k13'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'total_count',
      label: i18n.t('mes.equipment_oee.k14'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'good_count',
      label: i18n.t('mes.equipment_oee.k15'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'reject_count',
      label: i18n.t('mes.equipment_oee.k16'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('mes.equipment_oee.k17'),
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
    {
      name: 'updated_at',
      label: i18n.t('mes.equipment_oee.k18'),
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
      title: i18n.t('mes.equipment_oee.k19'),
      fields: ['equipment_code', 'equipment_name', 'record_date', 'shift'],
    },
    {
      title: i18n.t('mes.equipment_oee.k20'),
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
      title: i18n.t('shared.equipment_oee.oee_0'),
      fields: ['availability', 'performance', 'quality', 'oee'],
    },
  ],

  formColCount: 2,
  detailTitle: i18n.t('shared.equipment_oee.oee_1'),
};
