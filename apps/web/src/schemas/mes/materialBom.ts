import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const materialBomSchema: EntitySchema = {
  entity: 'mes_material_bom',
  title: i18n.t('mes.material_bom.bom_0'),
  description: i18n.t('mes.material_bom.k1'),

  api: {
    module: 'mes',
    resource: 'boms',
  },

  fields: [
    {
      name: 'product_code',
      label: i18n.t('mes.material_bom.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'product_name',
      label: i18n.t('mes.material_bom.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'version',
      label: i18n.t('mes.material_bom.k4'),
      type: 'text',
      sortable: true,
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'status',
      label: i18n.t('mes.material_bom.k5'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('mes.material_bom.k6') },
          { value: 'active', label: i18n.t('mes.material_bom.k7') },
          { value: 'inactive', label: i18n.t('mes.material_bom.k8') },
          { value: 'obsolete', label: i18n.t('mes.material_bom.k9') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          draft: { label: i18n.t('mes.material_bom.k10'), bg: 'grey.100', color: 'text.secondary' },
          active: {
            label: i18n.t('mes.material_bom.k11'),
            bg: 'success.lighter',
            color: 'success.700',
          },
          inactive: {
            label: i18n.t('mes.material_bom.k12'),
            bg: 'warning.light',
            color: 'warning.700',
          },
          obsolete: {
            label: i18n.t('mes.material_bom.k13'),
            bg: 'error.lighter',
            color: 'error.dark',
          },
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
      name: 'items_count',
      label: i18n.t('mes.material_bom.k14'),
      type: 'number',
      readonly: true,
      listWidth: 80,
      renderCell: (row: Record<string, unknown>) =>
        (row.items as unknown[] | undefined)?.length || 0,
    },
    {
      name: 'description',
      label: i18n.t('mes.material_bom.k15'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'items',
      label: i18n.t('shared.material_bom.bom_0'),
      type: 'textarea',
      showInList: false,
      showInForm: false,
    },
    {
      name: 'created_at',
      label: i18n.t('mes.material_bom.k16'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'updated_at',
      label: i18n.t('mes.material_bom.k17'),
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['product_code', 'product_name', 'version', 'status', 'items_count', 'created_at'],
    searchFields: ['product_code', 'product_name'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.material_bom.k18'),
        type: 'select',
        options: [
          { label: i18n.t('mes.material_bom.k19'), value: 'all' },
          { label: i18n.t('mes.material_bom.k20'), value: 'draft' },
          { label: i18n.t('mes.material_bom.k21'), value: 'active' },
          { label: i18n.t('mes.material_bom.k22'), value: 'inactive' },
          { label: i18n.t('mes.material_bom.k23'), value: 'obsolete' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.material_bom.k24'),
      fields: ['product_code', 'product_name', 'version', 'status'],
    },
    {
      title: i18n.t('mes.material_bom.k25'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.material_bom.bom_26'),
  editTitle: i18n.t('mes.material_bom.bom_27'),
  detailTitle: i18n.t('shared.material_bom.bom_1'),
};
