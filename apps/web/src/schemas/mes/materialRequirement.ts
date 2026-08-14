import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const materialRequirementSchema: EntitySchema = {
  entity: 'mes_material_requirement',
  title: i18n.t('mes.material_requirement.k0'),
  description: i18n.t('mes.material_requirement.k1'),

  api: {
    module: 'mes',
    resource: 'materialRequirements',
  },

  fields: [
    {
      name: 'mrp_no',
      label: i18n.t('mes.material_requirement.k2'),
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'order_number',
      label: i18n.t('mes.material_requirement.k3'),
      type: 'text',
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'product_code',
      label: i18n.t('mes.material_requirement.k4'),
      type: 'text',
      required: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'product_name',
      label: i18n.t('mes.material_requirement.k5'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'material_code',
      label: i18n.t('mes.material_requirement.k6'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'material_name',
      label: i18n.t('mes.material_requirement.k7'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'specification',
      label: i18n.t('mes.material_requirement.k8'),
      type: 'text',
      sortable: true,
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'unit',
      label: i18n.t('mes.material_requirement.k9'),
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'required_quantity',
      label: i18n.t('mes.material_requirement.k10'),
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'available_quantity',
      label: i18n.t('mes.material_requirement.k11'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'shortfall_quantity',
      label: i18n.t('mes.material_requirement.k12'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'required_date',
      label: i18n.t('mes.material_requirement.k13'),
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'priority',
      label: i18n.t('mes.material_requirement.k14'),
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: i18n.t('mes.material_requirement.k15') },
          { value: 'normal', label: i18n.t('mes.material_requirement.k16') },
          { value: 'high', label: i18n.t('mes.material_requirement.k17') },
          { value: 'urgent', label: i18n.t('mes.material_requirement.k18') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const priorityMap: Record<string, { label: string; bg: string; color: string }> = {
          urgent: { label: i18n.t('mes.material_requirement.k19'), bg: 'error.lighter', color: 'error.dark' },
          high: { label: i18n.t('mes.material_requirement.k20'), bg: 'warning.light', color: 'warning.700' },
          normal: { label: i18n.t('mes.material_requirement.k21'), bg: 'primary.100', color: 'primary.dark' },
          low: { label: i18n.t('mes.material_requirement.k22'), bg: 'grey.100', color: 'text.secondary' },
        };
        const p = priorityMap[(row.priority as string) || 'normal'] || priorityMap.normal;
        return React.createElement(Chip, {
          size: 'small',
          label: p.label,
          sx: { backgroundColor: p.bg, color: p.color, fontWeight: 500 },
        });
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'status',
      label: i18n.t('mes.material_requirement.k23'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('mes.material_requirement.k24') },
          { value: 'confirmed', label: i18n.t('mes.material_requirement.k25') },
          { value: 'released', label: i18n.t('mes.material_requirement.k26') },
          { value: 'completed', label: i18n.t('mes.material_requirement.k27') },
          { value: 'cancelled', label: i18n.t('mes.material_requirement.k28') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          draft: { label: i18n.t('mes.material_requirement.k29'), bg: 'grey.100', color: 'text.secondary' },
          confirmed: { label: i18n.t('mes.material_requirement.k30'), bg: 'primary.100', color: 'primary.dark' },
          released: { label: i18n.t('mes.material_requirement.k31'), bg: 'warning.light', color: 'warning.700' },
          completed: { label: i18n.t('mes.material_requirement.k32'), bg: 'success.lighter', color: 'success.700' },
          cancelled: { label: i18n.t('mes.material_requirement.k33'), bg: 'error.lighter', color: 'error.dark' },
        };
        const s = statusMap[(row.status as string) || 'draft'] || {
          label: row.status,
          bg: 'grey.100',
          color: 'text.secondary',
        };
        return React.createElement(Chip, {
          size: 'small',
          label: s.label,
          sx: { backgroundColor: s.bg, color: s.color, fontWeight: 500 },
        });
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'source_type',
      label: i18n.t('mes.material_requirement.k34'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'remark',
      label: i18n.t('mes.material_requirement.k35'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('mes.material_requirement.k36'),
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
    {
      name: 'updated_at',
      label: i18n.t('mes.material_requirement.k37'),
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'mrp_no',
      'order_number',
      'product_name',
      'material_name',
      'material_code',
      'specification',
      'required_quantity',
      'available_quantity',
      'shortfall_quantity',
      'required_date',
      'priority',
      'status',
    ],
    searchFields: ['mrp_no', 'product_name', 'material_name', 'material_code'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.material_requirement.k38'),
        type: 'select',
        options: [
          { label: i18n.t('mes.material_requirement.k39'), value: 'all' },
          { label: i18n.t('mes.material_requirement.k40'), value: 'draft' },
          { label: i18n.t('mes.material_requirement.k41'), value: 'confirmed' },
          { label: i18n.t('mes.material_requirement.k42'), value: 'released' },
          { label: i18n.t('mes.material_requirement.k43'), value: 'completed' },
          { label: i18n.t('mes.material_requirement.k44'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.material_requirement.k45'),
      fields: [
        'product_code',
        'product_name',
        'material_code',
        'material_name',
        'specification',
        'unit',
      ],
    },
    {
      title: i18n.t('mes.material_requirement.k46'),
      fields: ['required_quantity', 'required_date', 'priority', 'status'],
    },
    {
      title: i18n.t('mes.material_requirement.k47'),
      fields: ['source_type', 'remark'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.material_requirement.k48'),
  editTitle: i18n.t('mes.material_requirement.k49'),
  detailTitle: i18n.t('mes.material_requirement.k50'),
};
