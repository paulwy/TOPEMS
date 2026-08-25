import { designTokens } from '@topems/tokens';
import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { Clock } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

// ============ 分类与等级配色 ============

const categoryColorMap: Record<string, 'error' | 'warning' | 'secondary' | 'info'> = {
  [i18n.t('schemas.hazardous_material.k0')]: 'error',
  [i18n.t('schemas.hazardous_material.k1')]: 'warning',
  [i18n.t('schemas.hazardous_material.k2')]: 'secondary',
  [i18n.t('schemas.hazardous_material.k3')]: 'info',
  [i18n.t('schemas.hazardous_material.k4')]: 'warning',
  [i18n.t('schemas.hazardous_material.k5')]: 'secondary',
};

function renderCategoryCell(row: Record<string, unknown>, _index: number) {
  const category = row.category as string | null | undefined;
  if (!category) return '-';
  const color = categoryColorMap[category];
  if (!color) {
    return React.createElement(Chip, {
      label: category,
      size: 'small',
      variant: 'outlined',
    });
  }
  return React.createElement(Chip, {
    label: category,
    size: 'small',
    color,
    variant: 'filled',
    sx: { fontWeight: 500 },
  });
}

function renderCasNoCell(row: Record<string, unknown>, _index: number) {
  const v = row.cas_no as string | null | undefined;
  if (!v) return '-';
  return React.createElement(Typography, {
    sx: { fontFamily: 'monospace', fontSize: designTokens.typography.fontSize.scale['0.8rem'] },
    children: v,
  });
}

function renderQuantityCell(row: Record<string, unknown>, _index: number) {
  const q = row.quantity as number | null | undefined;
  const u = row.unit as string | null | undefined;
  return React.createElement(Typography, {
    sx: { fontWeight: 500 },
    children: `${q ?? 0} ${u || ''}`.trim(),
  });
}

function renderMaterialCodeCell(row: Record<string, unknown>, _index: number) {
  const v = row.material_code as string | null | undefined;
  if (!v) return '-';
  return React.createElement(Typography, {
    sx: { fontFamily: 'monospace', fontSize: designTokens.typography.fontSize.scale['0.875rem'] },
    children: v,
  });
}

function renderNameCell(row: Record<string, unknown>, _index: number) {
  const v = row.name as string | null | undefined;
  return React.createElement(Typography, { sx: { fontWeight: 500 }, children: v || '-' });
}

function renderStorageLocationCell(row: Record<string, unknown>, _index: number) {
  const v = row.storage_location as string | null | undefined;
  return v || '-';
}

// ============ 有效期状态 ============

function getExpiryStatus(
  expiryDate: string | null | undefined
): { text: string; color: 'error' | 'warning' } | null {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return null;
  const daysDiff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 0) return { text: i18n.t('ehs.hazardous_material.k0'), color: 'error' };
  if (daysDiff <= 30) return { text: i18n.t('ehs.hazardous_material.k1'), color: 'warning' };
  return null;
}

function renderExpiryCell(row: Record<string, unknown>, _index: number) {
  const expiryDate = row.expiry_date as string | null | undefined;
  const status = getExpiryStatus(expiryDate);
  const dateText = expiryDate ? new Date(expiryDate).toLocaleDateString('zh-CN') : '-';

  const children: React.ReactNode[] = [
    React.createElement(Clock, {
      key: 'icon',
      style: { width: 14, height: 14 },
    }),
    React.createElement(
      Typography,
      { key: 'date', sx: { fontSize: designTokens.typography.fontSize.scale['0.875rem'] } },
      dateText
    ),
  ];

  if (status) {
    children.push(
      React.createElement(Chip, {
        key: 'status',
        label: status.text,
        size: 'small',
        color: status.color,
        sx: {
          height: 20,
          fontSize: designTokens.typography.fontSize.scale['0.7rem'],
          fontWeight: 500,
        },
      })
    );
  }

  return React.createElement(
    Box,
    { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
    ...children
  );
}

// ============ Schema 定义 ============

export const hazardousMaterialSchema: EntitySchema = {
  entity: 'ehsHazardousMaterial',
  title: i18n.t('ehs.hazardous_material.k2'),
  description: i18n.t('ehs.hazardous_material.k3'),

  api: {
    module: 'ehs',
    resource: 'hazardousMaterials',
  },

  fields: [
    {
      name: 'material_code',
      label: i18n.t('ehs.hazardous_material.k4'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 130,
      renderCell: renderMaterialCodeCell,
    },
    {
      name: 'name',
      label: i18n.t('ehs.hazardous_material.k5'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 150,
      renderCell: renderNameCell,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'category',
      label: i18n.t('ehs.hazardous_material.k6'),
      type: 'select',
      required: true,
      defaultValue: i18n.t('ehs.hazardous_material.k7'),
      options: {
        type: 'static',
        options: [
          {
            value: i18n.t('ehs.hazardous_material.k8'),
            label: i18n.t('ehs.hazardous_material.k9'),
          },
          {
            value: i18n.t('ehs.hazardous_material.k10'),
            label: i18n.t('ehs.hazardous_material.k11'),
          },
          {
            value: i18n.t('ehs.hazardous_material.k12'),
            label: i18n.t('ehs.hazardous_material.k13'),
          },
          {
            value: i18n.t('ehs.hazardous_material.k14'),
            label: i18n.t('ehs.hazardous_material.k15'),
          },
          {
            value: i18n.t('ehs.hazardous_material.k16'),
            label: i18n.t('ehs.hazardous_material.k17'),
          },
          {
            value: i18n.t('ehs.hazardous_material.k18'),
            label: i18n.t('ehs.hazardous_material.k19'),
          },
        ],
      },
      listWidth: 100,
      align: 'center',
      renderCell: renderCategoryCell,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'cas_no',
      label: i18n.t('shared.hazardous_material.cas_0'),
      type: 'text',
      listWidth: 120,
      renderCell: renderCasNoCell,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'quantity',
      label: i18n.t('ehs.hazardous_material.k20'),
      type: 'number',
      listWidth: 100,
      align: 'right',
      renderCell: renderQuantityCell,
    },
    {
      name: 'unit',
      label: i18n.t('ehs.hazardous_material.k21'),
      type: 'select',
      defaultValue: 'kg',
      options: {
        type: 'static',
        options: [
          { value: 'kg', label: 'kg' },
          { value: 'L', label: 'L' },
          {
            value: i18n.t('ehs.hazardous_material.k22'),
            label: i18n.t('ehs.hazardous_material.k23'),
          },
          {
            value: i18n.t('ehs.hazardous_material.k24'),
            label: i18n.t('ehs.hazardous_material.k25'),
          },
          {
            value: i18n.t('ehs.hazardous_material.k26'),
            label: i18n.t('ehs.hazardous_material.k27'),
          },
          {
            value: i18n.t('ehs.hazardous_material.k28'),
            label: i18n.t('ehs.hazardous_material.k29'),
          },
        ],
      },
      showInList: false,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'storage_location',
      label: i18n.t('ehs.hazardous_material.k30'),
      type: 'text',
      required: true,
      listWidth: 140,
      renderCell: renderStorageLocationCell,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'danger_level',
      label: i18n.t('ehs.hazardous_material.k31'),
      type: 'select',
      defaultValue: i18n.t('ehs.hazardous_material.k32'),
      options: {
        type: 'static',
        options: [
          {
            value: i18n.t('ehs.hazardous_material.k33'),
            label: i18n.t('ehs.hazardous_material.k34'),
          },
          {
            value: i18n.t('ehs.hazardous_material.k35'),
            label: i18n.t('ehs.hazardous_material.k36'),
          },
          {
            value: i18n.t('ehs.hazardous_material.k37'),
            label: i18n.t('ehs.hazardous_material.k38'),
          },
          {
            value: i18n.t('ehs.hazardous_material.k39'),
            label: i18n.t('ehs.hazardous_material.k40'),
          },
        ],
      },
      listWidth: 100,
      align: 'center',
    },
    {
      name: 'expiry_date',
      label: i18n.t('ehs.hazardous_material.k41'),
      type: 'date',
      listWidth: 130,
      sortable: true,
      renderCell: renderExpiryCell,
    },
    {
      name: 'hazard_class',
      label: i18n.t('ehs.hazardous_material.k42'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'description',
      label: i18n.t('ehs.hazardous_material.k43'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'material_code',
      'name',
      'category',
      'cas_no',
      'quantity',
      'storage_location',
      'danger_level',
      'expiry_date',
    ],
    searchFields: ['material_code', 'name', 'cas_no', 'storage_location'],
    pageSize: 10,
    statusBadge: {
      field: 'danger_level',
      colorMap: {
        [i18n.t('schemas.hazardous_material.k6')]: 'error',
        [i18n.t('schemas.hazardous_material.k7')]: 'warning',
        [i18n.t('schemas.hazardous_material.k8')]: 'primary',
        [i18n.t('schemas.hazardous_material.k9')]: 'success',
      },
      labelMap: {
        [i18n.t('schemas.hazardous_material.k10')]: i18n.t('ehs.hazardous_material.k44'),
        [i18n.t('schemas.hazardous_material.k11')]: i18n.t('ehs.hazardous_material.k45'),
        [i18n.t('schemas.hazardous_material.k12')]: i18n.t('ehs.hazardous_material.k46'),
        [i18n.t('schemas.hazardous_material.k13')]: i18n.t('ehs.hazardous_material.k47'),
      },
    },
    filters: [
      {
        id: 'category',
        label: i18n.t('ehs.hazardous_material.k48'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.hazardous_material.k49'), value: 'all' },
          {
            label: i18n.t('ehs.hazardous_material.k50'),
            value: i18n.t('ehs.hazardous_material.k51'),
          },
          {
            label: i18n.t('ehs.hazardous_material.k52'),
            value: i18n.t('ehs.hazardous_material.k53'),
          },
          {
            label: i18n.t('ehs.hazardous_material.k54'),
            value: i18n.t('ehs.hazardous_material.k55'),
          },
          {
            label: i18n.t('ehs.hazardous_material.k56'),
            value: i18n.t('ehs.hazardous_material.k57'),
          },
          {
            label: i18n.t('ehs.hazardous_material.k58'),
            value: i18n.t('ehs.hazardous_material.k59'),
          },
          {
            label: i18n.t('ehs.hazardous_material.k60'),
            value: i18n.t('ehs.hazardous_material.k61'),
          },
        ],
      },
      {
        id: 'danger_level',
        label: i18n.t('ehs.hazardous_material.k62'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.hazardous_material.k63'), value: 'all' },
          {
            label: i18n.t('ehs.hazardous_material.k64'),
            value: i18n.t('ehs.hazardous_material.k65'),
          },
          {
            label: i18n.t('ehs.hazardous_material.k66'),
            value: i18n.t('ehs.hazardous_material.k67'),
          },
          {
            label: i18n.t('ehs.hazardous_material.k68'),
            value: i18n.t('ehs.hazardous_material.k69'),
          },
          {
            label: i18n.t('ehs.hazardous_material.k70'),
            value: i18n.t('ehs.hazardous_material.k71'),
          },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.hazardous_material.k72'),
      fields: ['material_code', 'name', 'category', 'hazard_class'],
    },
    {
      title: i18n.t('ehs.hazardous_material.k73'),
      fields: ['cas_no', 'quantity', 'unit', 'storage_location'],
    },
    {
      title: i18n.t('ehs.hazardous_material.k74'),
      fields: ['danger_level', 'expiry_date'],
    },
    {
      title: i18n.t('ehs.hazardous_material.k75'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.hazardous_material.k76'),
  editTitle: i18n.t('ehs.hazardous_material.k77'),
  detailTitle: i18n.t('ehs.hazardous_material.k78'),
};
