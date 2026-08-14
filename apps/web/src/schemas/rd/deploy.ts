import React from 'react';
import { Chip, Box, Button, Typography } from '@mui/material';
import { Rocket, CheckCircle, XCircle, Clock, Globe } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_COLOR_MAP: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  success: 'success',
  failed: 'error',
  running: 'warning',
  pending: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  success: i18n.t('rd.deploy.k0'),
  failed: i18n.t('rd.deploy.k1'),
  running: i18n.t('rd.deploy.k2'),
  pending: i18n.t('rd.deploy.k3'),
};

const ENV_COLOR_MAP: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  prod: 'error',
  staging: 'warning',
  test: 'default',
  dev: 'success',
};

const ENV_LABEL_MAP: Record<string, string> = {
  prod: i18n.t('rd.deploy.k4'),
  staging: i18n.t('rd.deploy.k5'),
  test: i18n.t('rd.deploy.k6'),
  dev: i18n.t('rd.deploy.k7'),
};

const DEPLOY_TYPE_LABEL_MAP: Record<string, string> = {
  full: i18n.t('rd.deploy.k8'),
  rolling: i18n.t('rd.deploy.k9'),
  'blue-green': i18n.t('rd.deploy.k10'),
  canary: i18n.t('rd.deploy.k11'),
};

export const deploySchema: EntitySchema = {
  entity: 'rd_deploy',
  title: i18n.t('rd.deploy.k12'),
  description: i18n.t('rd.deploy.k13'),

  api: {
    module: 'rd',
    resource: 'deploys',
  },

  fields: [
    {
      name: 'deploy_no',
      label: i18n.t('rd.deploy.k14'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(Rocket, { size: 16, color: 'primary.main' }),
          React.createElement(
            Typography,
            { variant: 'body2', sx: { fontWeight: 500 } },
            String(row.deploy_no ?? '')
          )
        );
      },
    },
    {
      name: 'project_name',
      label: i18n.t('rd.deploy.k15'),
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'env',
      label: i18n.t('rd.deploy.k16'),
      type: 'select',
      defaultValue: 'prod',
      options: {
        type: 'static',
        options: [
          { value: 'prod', label: i18n.t('rd.deploy.k17') },
          { value: 'staging', label: i18n.t('rd.deploy.k18') },
          { value: 'test', label: i18n.t('rd.deploy.k19') },
          { value: 'dev', label: i18n.t('rd.deploy.k20') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.env ?? '');
        const label = ENV_LABEL_MAP[val] || val;
        const color = ENV_COLOR_MAP[val] || 'default';
        return React.createElement(Chip, { label, size: 'small', color });
      },
    },
    {
      name: 'deploy_type',
      label: i18n.t('rd.deploy.k21'),
      type: 'select',
      defaultValue: 'full',
      options: {
        type: 'static',
        options: [
          { value: 'full', label: i18n.t('rd.deploy.k22') },
          { value: 'rolling', label: i18n.t('rd.deploy.k23') },
          { value: 'blue-green', label: i18n.t('rd.deploy.k24') },
          { value: 'canary', label: i18n.t('rd.deploy.k25') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.deploy_type ?? '');
        const label = DEPLOY_TYPE_LABEL_MAP[val] || val;
        return React.createElement(Chip, { label, size: 'small', variant: 'outlined' });
      },
    },
    {
      name: 'status',
      label: i18n.t('rd.deploy.k26'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('rd.deploy.k27') },
          { value: 'running', label: i18n.t('rd.deploy.k28') },
          { value: 'success', label: i18n.t('rd.deploy.k29') },
          { value: 'failed', label: i18n.t('rd.deploy.k30') },
        ],
      },
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.status ?? '');
        const label = STATUS_LABEL_MAP[val] || val;
        const color = STATUS_COLOR_MAP[val] || 'default';
        let icon: React.ReactNode = null;
        if (val === 'success') {
          icon = React.createElement(CheckCircle, { size: 14, color: 'success.main' });
        } else if (val === 'failed') {
          icon = React.createElement(XCircle, { size: 14, color: 'error.main' });
        } else if (val === 'running') {
          icon = React.createElement(Clock, { size: 14, color: 'warning.main' });
        }
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
          icon,
          React.createElement(Chip, { label, size: 'small', color })
        );
      },
    },
    {
      name: 'deployer',
      label: i18n.t('rd.deploy.k31'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'deploy_time',
      label: i18n.t('rd.deploy.k32'),
      type: 'datetime',
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.deploy_time || row.created_at;
        return val ? String(val) : '-';
      },
    },
    {
      name: 'target_url',
      label: i18n.t('rd.deploy.k33'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const url = row.target_url ? String(row.target_url) : '';
        if (!url) return '-';
        return React.createElement(
          Button,
          {
            component: 'a',
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
            size: 'small',
            startIcon: React.createElement(Globe, { size: 14 }),
          } as React.ComponentProps<typeof Button> & { component: React.ElementType; href: string },
          i18n.t('rd.deploy.k34')
        );
      },
    },
    {
      name: 'project_id',
      label: i18n.t('rd.deploy.id_35'),
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'build_id',
      label: i18n.t('rd.deploy.id_36'),
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'environment',
      label: i18n.t('rd.deploy.k37'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'app_name',
      label: i18n.t('rd.deploy.k38'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'version',
      label: i18n.t('rd.deploy.k39'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'logs',
      label: i18n.t('rd.deploy.k40'),
      type: 'textarea',
      showInList: false,
      readonly: true,
    },
    {
      name: 'created_at',
      label: i18n.t('rd.deploy.k41'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'deploy_no',
      'project_name',
      'env',
      'deploy_type',
      'status',
      'deployer',
      'deploy_time',
      'target_url',
    ],
    searchFields: ['deploy_no', 'project_name'],
    pageSize: 10,
    filters: [
      {
        id: 'env',
        label: i18n.t('rd.deploy.k42'),
        type: 'select',
        options: [
          { label: i18n.t('rd.deploy.k43'), value: 'all' },
          { label: i18n.t('rd.deploy.k44'), value: 'prod' },
          { label: i18n.t('rd.deploy.k45'), value: 'staging' },
          { label: i18n.t('rd.deploy.k46'), value: 'test' },
          { label: i18n.t('rd.deploy.k47'), value: 'dev' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('rd.deploy.k48'),
        type: 'select',
        options: [
          { label: i18n.t('rd.deploy.k49'), value: 'all' },
          { label: i18n.t('rd.deploy.k50'), value: 'success' },
          { label: i18n.t('rd.deploy.k51'), value: 'failed' },
          { label: i18n.t('rd.deploy.k52'), value: 'running' },
          { label: i18n.t('rd.deploy.k53'), value: 'pending' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('rd.deploy.k54'),
      fields: ['project_id', 'build_id', 'env', 'deploy_type'],
    },
    {
      title: i18n.t('rd.deploy.k55'),
      fields: ['app_name', 'version', 'environment'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.deploy.k56'),
  editTitle: i18n.t('rd.deploy.k57'),
  detailTitle: i18n.t('rd.deploy.k58'),

  actions: ['create', 'detail'],
};
