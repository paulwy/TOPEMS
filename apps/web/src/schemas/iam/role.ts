import React from 'react';
import { Box, Typography } from '@mui/material';
import { Shield } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const roleSchema: EntitySchema = {
  entity: 'role',
  title: i18n.t('shared.role.k0'),
  description: i18n.t('shared.role.k1'),

  api: {
    module: 'iam',
    resource: 'roles',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('shared.role.k2'),
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
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
            },
            React.createElement(Shield, { size: 20, color: 'primary.light' })
          ),
          React.createElement(
            Box,
            null,
            React.createElement(Typography, { variant: 'body2', sx: { fontWeight: 500 } }, name),
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
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'description',
      label: i18n.t('shared.role.k3'),
      type: 'textarea',
      listWidth: 250,
    },
    {
      name: 'created_at',
      label: i18n.t('shared.role.k4'),
      type: 'datetime',
      sortable: true,
      listWidth: 180,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Typography,
          { variant: 'body2', color: 'text.secondary' },
          row.created_at ? new Date(String(row.created_at)).toLocaleString('zh-CN') : '-'
        ),
    },
  ],

  list: {
    columns: ['name', 'description', 'created_at'],
    searchFields: ['name', 'description'],
    pageSize: 10,
  },

  actions: ['create', 'edit', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.role.k5'),
      fields: ['name', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.role.k6'),
  editTitle: i18n.t('shared.role.k7'),
  detailTitle: i18n.t('shared.role.k8'),
};
