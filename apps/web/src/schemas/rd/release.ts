import React from 'react';
import { Chip, Box, Typography, Button } from '@mui/material';
import { Tag, Calendar, User, Globe, FlaskConical } from 'lucide-react';
import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';

/**
 * 批 38：发布页保留 rd.deploys 作为数据源。
 * - 新增「发布配方」列，展示 LEFT JOIN rs.formulas 带出的 formula_name（为空显示 —）。
 * - 状态列按 rd.deploys.status 真实值（active/inactive/archived）展示，
 *   删除 success→已发布 / failed→已回滚 / 默认规划中 的硬凑映射。
 * - 删除 release_note 字段（rd.deploys 表无此列，原来 fallback 到 app_name）。
 */

const DEPLOY_STATUS_COLOR_MAP: Record<
  string,
  'default' | 'primary' | 'success' | 'error' | 'warning'
> = {
  active: 'success',
  inactive: 'warning',
  archived: 'default',
};

function getDeployStatusLabelMap(): Record<string, string> {
  return {
    active: i18n.t('rd.release.k40'),
    inactive: i18n.t('rd.release.k41'),
    archived: i18n.t('rd.release.k42'),
  };
}

const ENV_COLOR_MAP: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  production: 'error',
  staging: 'warning',
  development: 'success',
};

function getEnvLabelMap(): Record<string, string> {
  return {
    production: i18n.t('rd.release.k3'),
    staging: i18n.t('rd.release.k4'),
    development: i18n.t('rd.release.k5'),
  };
}

export const releaseSchema: EntitySchema = {
  entity: 'rd_release',
  title: i18n.t('rd.release.k6'),
  description: i18n.t('rd.release.k7'),

  api: {
    module: 'rd',
    resource: 'deploys',
  },

  // 批 24：按真实数据源接入（/api/rd/deploys → rd.deploys），不造 rd:release 码
  permissionResource: 'rd:deploy',

  fields: [
    {
      name: 'version',
      label: i18n.t('rd.release.k8'),
      type: 'text',
      required: true,
      listWidth: 140,
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
      name: 'formula_name',
      label: i18n.t('rd.release.k43'),
      type: 'text',
      listWidth: 200,
      renderCell: (row: Record<string, unknown>) => {
        const name = row.formula_name ? String(row.formula_name) : '';
        const code = row.formula_code ? String(row.formula_code) : '';
        if (!name) {
          return React.createElement(Typography, { variant: 'body2', color: 'text.disabled' }, '—');
        }
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(FlaskConical, { size: 14, color: 'secondary.main' }),
          React.createElement(Typography, { variant: 'body2' }, code ? `${name} (${code})` : name)
        );
      },
    },
    {
      name: 'deploy_time',
      label: i18n.t('rd.release.k9'),
      type: 'datetime',
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.deploy_time || row.created_at || '';
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
          React.createElement(Calendar, { size: 14 }),
          val ? String(val) : '-'
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
        const label = getEnvLabelMap()[env] || env || '-';
        const color = ENV_COLOR_MAP[env] || 'default';
        return React.createElement(Chip, { label, size: 'small', color });
      },
    },
    {
      name: 'status',
      label: i18n.t('rd.release.k15'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('rd.release.k40') },
          { value: 'inactive', label: i18n.t('rd.release.k41') },
          { value: 'archived', label: i18n.t('rd.release.k42') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const status = String(row.status ?? '');
        const label = getDeployStatusLabelMap()[status] || status || '-';
        const color = DEPLOY_STATUS_COLOR_MAP[status] || 'default';
        return React.createElement(Chip, { label, size: 'small', color });
      },
    },
    {
      name: 'deployer',
      label: i18n.t('rd.release.k19'),
      type: 'text',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.deployer || row.operator || '';
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
          React.createElement(User, { size: 14 }),
          String(val || '-')
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
      name: 'formula_id',
      label: i18n.t('rd.release.k43'),
      type: 'text',
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
    columns: ['version', 'formula_name', 'deploy_time', 'environment', 'status', 'deployer'],
    searchFields: ['version', 'deploy_no', 'app_name'],
    pageSize: 10,
    filters: [
      {
        id: 'environment',
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
          { label: i18n.t('rd.release.k40'), value: 'active' },
          { label: i18n.t('rd.release.k41'), value: 'inactive' },
          { label: i18n.t('rd.release.k42'), value: 'archived' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: DEPLOY_STATUS_COLOR_MAP,
      labelMap: getDeployStatusLabelMap(),
    },
  },

  formSections: [
    {
      title: i18n.t('rd.release.k44'),
      fields: ['version', 'environment', 'deploy_type', 'formula_id'],
    },
    {
      title: i18n.t('rd.release.k45'),
      fields: ['project_id', 'build_id', 'app_name'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.release.k46'),
  editTitle: i18n.t('rd.release.k47'),
  detailTitle: i18n.t('rd.release.k48'),

  actions: ['create', 'detail'],
};
