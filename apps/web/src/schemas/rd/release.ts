import React from 'react';
import { Chip, Box, Typography, Button } from '@mui/material';
import { Tag, Calendar, User, Globe } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_COLOR_MAP: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  released: 'success',
  planning: 'warning',
  rolled_back: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  released: i18n.t('rd.release.k0'),
  planning: i18n.t('rd.release.k1'),
  rolled_back: i18n.t('rd.release.k2'),
};

const ENV_COLOR_MAP: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  production: 'error',
  staging: 'warning',
  development: 'success',
};

const ENV_LABEL_MAP: Record<string, string> = {
  production: i18n.t('rd.release.k3'),
  staging: i18n.t('rd.release.k4'),
  development: i18n.t('rd.release.k5'),
};

export const releaseSchema: EntitySchema = {
  entity: 'rd_release',
  title: i18n.t('rd.release.k6'),
  description: i18n.t('rd.release.k7'),

  api: {
    module: 'rd',
    resource: 'deploys',
  },

  fields: [
    {
      name: 'version',
      label: i18n.t('rd.release.k8'),
      type: 'text',
      required: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.version || row.deploy_no || '';
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(Tag, { size: 16, color: 'primary.main' }),
          React.createElement(
            Typography,
            { variant: 'body2', sx: { fontWeight: 500 } },
            String(val)
          )
        );
      },
    },
    {
      name: 'release_time',
      label: i18n.t('rd.release.k9'),
      type: 'datetime',
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.deploy_time || row.release_time || row.created_at || '';
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
          React.createElement(Calendar, { size: 14 }),
          val ? String(val) : '-'
        );
      },
    },
    {
      name: 'release_note',
      label: i18n.t('rd.release.k10'),
      type: 'textarea',
      listWidth: 250,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.app_name || row.release_note || row.deploy_no || '';
        return React.createElement(
          Box,
          {
            sx: {
              maxWidth: 250,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
          String(val)
        );
      },
    },
    {
      name: 'environment',
      label: i18n.t('rd.release.k11'),
      type: 'select',
      defaultValue: 'staging',
      options: {
        type: 'static',
        options: [
          { value: 'production', label: i18n.t('rd.release.k12') },
          { value: 'staging', label: i18n.t('rd.release.k13') },
          { value: 'development', label: i18n.t('rd.release.k14') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const env = (row.environment || row.env || '') as string;
        const label = ENV_LABEL_MAP[env] || env;
        const color = ENV_COLOR_MAP[env] || 'default';
        return React.createElement(Chip, { label, size: 'small', color });
      },
    },
    {
      name: 'status',
      label: i18n.t('rd.release.k15'),
      type: 'select',
      defaultValue: 'planning',
      options: {
        type: 'static',
        options: [
          { value: 'planning', label: i18n.t('rd.release.k16') },
          { value: 'released', label: i18n.t('rd.release.k17') },
          { value: 'rolled_back', label: i18n.t('rd.release.k18') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        let status = String(row.status ?? '');
        if (status === 'success') status = 'released';
        else if (status === 'failed') status = 'rolled_back';
        const label = STATUS_LABEL_MAP[status] || status;
        const color = STATUS_COLOR_MAP[status] || 'default';
        return React.createElement(Chip, { label, size: 'small', color });
      },
    },
    {
      name: 'release_by',
      label: i18n.t('rd.release.k19'),
      type: 'text',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.deployer || row.operator || row.release_by || '';
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
          React.createElement(User, { size: 14 }),
          (val || '-') as string
        );
      },
    },
    {
      name: 'project_id',
      label: i18n.t('rd.release.id_20'),
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'build_id',
      label: i18n.t('rd.release.id_21'),
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'env',
      label: i18n.t('rd.release.k22'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'deploy_type',
      label: i18n.t('rd.release.k23'),
      type: 'select',
      defaultValue: 'full',
      options: {
        type: 'static',
        options: [
          { value: 'full', label: i18n.t('rd.release.k24') },
          { value: 'rolling', label: i18n.t('rd.release.k25') },
          { value: 'blue-green', label: i18n.t('rd.release.k26') },
          { value: 'canary', label: i18n.t('rd.release.k27') },
        ],
      },
      showInList: false,
    },
    {
      name: 'app_name',
      label: i18n.t('rd.release.k28'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'target_url',
      label: i18n.t('rd.release.k29'),
      type: 'text',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const url = row.target_url ? String(row.target_url) : '';
        if (!url) return '-';
        return React.createElement(
          Button,
          {
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
            size: 'small',
            startIcon: React.createElement(Globe, { size: 14 }),
          } as React.ComponentProps<typeof Button>,
          i18n.t('rd.release.k30')
        );
      },
    },
    {
      name: 'logs',
      label: i18n.t('rd.release.k31'),
      type: 'textarea',
      showInList: false,
      hideInForm: true,
    },
    {
      name: 'created_at',
      label: i18n.t('rd.release.k32'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['version', 'release_time', 'release_note', 'environment', 'status', 'release_by'],
    searchFields: ['version', 'release_note', 'release_by'],
    pageSize: 10,
    filters: [
      {
        id: 'env',
        label: i18n.t('rd.release.k33'),
        type: 'select',
        options: [
          { label: i18n.t('rd.release.k34'), value: 'all' },
          { label: i18n.t('rd.release.k35'), value: 'production' },
          { label: i18n.t('rd.release.k36'), value: 'staging' },
          { label: i18n.t('rd.release.k37'), value: 'development' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('rd.release.k38'),
        type: 'select',
        options: [
          { label: i18n.t('rd.release.k39'), value: 'all' },
          { label: i18n.t('rd.release.k40'), value: 'released' },
          { label: i18n.t('rd.release.k41'), value: 'planning' },
          { label: i18n.t('rd.release.k42'), value: 'rolled_back' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
  },

  formSections: [
    {
      title: i18n.t('rd.release.k43'),
      fields: ['version', 'environment', 'deploy_type'],
    },
    {
      title: i18n.t('rd.release.k44'),
      fields: ['project_id', 'build_id', 'app_name'],
    },
    {
      title: i18n.t('rd.release.k45'),
      fields: ['release_note'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.release.k46'),
  editTitle: i18n.t('rd.release.k47'),
  detailTitle: i18n.t('rd.release.k48'),

  actions: ['create', 'detail'],
};
