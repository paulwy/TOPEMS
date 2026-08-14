import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import { Shield } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const categoryLabels: Record<string, string> = {
  doc: i18n.t('shared.permission.k0'),
  ai: 'AI',
  workflow: i18n.t('shared.permission.k1'),
  iam: 'IAM',
  rs: i18n.t('shared.permission.k2'),
  lims: 'LIMS',
  qms: i18n.t('shared.permission.k3'),
  ehs: 'EHS',
  srm: i18n.t('shared.permission.k4'),
  pdm: i18n.t('shared.permission.k5'),
  gis: 'GIS',
  im: i18n.t('shared.permission.k6'),
  mail: i18n.t('shared.permission.k7'),
  system: i18n.t('shared.permission.k8'),
  crm: 'CRM',
  pm: i18n.t('shared.permission.k9'),
  integration: i18n.t('shared.permission.k10'),
};

const categoryColorMap: Record<string, { bgcolor: string; color: string }> = {
  doc: { bgcolor: 'blue.100', color: 'blue.700' },
  ai: { bgcolor: 'purple.100', color: 'purple.700' },
  workflow: { bgcolor: 'green.100', color: 'green.700' },
  iam: { bgcolor: 'yellow.100', color: 'yellow.700' },
  rs: { bgcolor: 'orange.100', color: 'orange.700' },
  lims: { bgcolor: 'cyan.100', color: 'cyan.700' },
  qms: { bgcolor: 'teal.100', color: 'teal.700' },
  ehs: { bgcolor: 'red.100', color: 'red.700' },
  srm: { bgcolor: 'violet.100', color: 'violet.700' },
  pdm: { bgcolor: 'amber.100', color: 'amber.700' },
  gis: { bgcolor: 'emerald.100', color: 'emerald.700' },
  im: { bgcolor: 'rose.100', color: 'rose.700' },
  mail: { bgcolor: 'indigo.100', color: 'indigo.700' },
  system: { bgcolor: 'gray.100', color: 'gray.700' },
  crm: { bgcolor: 'pink.100', color: 'pink.700' },
  pm: { bgcolor: 'lime.100', color: 'lime.700' },
  integration: { bgcolor: 'sky.100', color: 'sky.700' },
};

const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({
  value,
  label,
}));

function renderCategoryBadge(row: Record<string, unknown>): React.ReactNode {
  const category = String(row.category || '');
  const config = categoryColorMap[category] || {
    bgcolor: 'gray.100',
    color: 'gray.700',
  };
  const label = categoryLabels[category] || category;
  return React.createElement(Chip, {
    size: 'small',
    sx: { bgcolor: config.bgcolor, color: config.color },
    label,
  });
}

export const permissionSchema: EntitySchema = {
  entity: 'permission',
  title: i18n.t('shared.permission.k11'),
  description: i18n.t('shared.permission.k12'),

  api: {
    module: 'iam',
    resource: 'permissions',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('shared.permission.k13'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      renderCell: (row: Record<string, unknown>) => {
        const name = String(row.name || '');
        const description = String(row.description || '');
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1.5 } },
          React.createElement(
            Box,
            {
              sx: {
                width: 36,
                height: 36,
                bgcolor: 'purple.100',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              },
            },
            React.createElement(Shield, {
              sx: { width: 18, height: 18, color: 'purple.600' },
            })
          ),
          React.createElement(
            Box,
            null,
            React.createElement(
              Typography,
              { variant: 'subtitle2', sx: { fontWeight: 600 } },
              name
            ),
            description
              ? React.createElement(
                  Typography,
                  { variant: 'caption', color: 'text.secondary' },
                  description
                )
              : null
          )
        );
      },
    },
    {
      name: 'code',
      label: i18n.t('shared.permission.k14'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Typography,
          {
            variant: 'body2',
            sx: { fontFamily: 'monospace', color: 'text.secondary' },
          },
          String(row.code || '')
        ),
    },
    {
      name: 'category',
      label: i18n.t('shared.permission.k15'),
      type: 'select',
      required: true,
      sortable: true,
      defaultValue: 'system',
      options: {
        type: 'static',
        options: categoryOptions,
      },
      listWidth: 120,
      renderCell: renderCategoryBadge,
      filterable: true,
    },
    {
      name: 'description',
      label: i18n.t('shared.permission.k16'),
      type: 'textarea',
      listWidth: 200,
    },
    {
      name: 'resource',
      label: i18n.t('shared.permission.k17'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'action',
      label: i18n.t('shared.permission.k18'),
      type: 'text',
      showInList: false,
    },
  ],

  list: {
    columns: ['name', 'code', 'category', 'description'],
    searchFields: ['name', 'code', 'category', 'description'],
    pageSize: 10,
    filters: [
      {
        id: 'category',
        label: i18n.t('shared.permission.k19'),
        type: 'select',
        options: [{ label: i18n.t('shared.permission.k20'), value: 'all' }, ...categoryOptions],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.permission.k21'),
      fields: ['name', 'code', 'category', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.permission.k22'),
  editTitle: i18n.t('shared.permission.k23'),
  detailTitle: i18n.t('shared.permission.k24'),
};
