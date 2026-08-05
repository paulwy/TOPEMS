import React from 'react';
import { Chip, Box, Typography, Button } from '@mui/material';
import { Tag, Calendar, User, Globe } from 'lucide-react';
import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  released: 'success',
  planning: 'warning',
  rolled_back: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  released: '已发布',
  planning: '规划中',
  rolled_back: '已回滚',
};

const ENV_COLOR_MAP: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  production: 'error',
  staging: 'warning',
  development: 'success',
};

const ENV_LABEL_MAP: Record<string, string> = {
  production: '生产环境',
  staging: '预发布环境',
  development: '开发环境',
};

export const releaseSchema: EntitySchema = {
  entity: 'rd_release',
  title: '配方发布',
  description: '管理配方发布流程，包括版本发布、环境部署、回滚操作等',

  api: {
    module: 'rd',
    resource: 'deploys',
  },

  fields: [
    {
      name: 'version',
      label: '版本号',
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
      label: '发布时间',
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
      label: '发布说明',
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
      label: '发布环境',
      type: 'select',
      defaultValue: 'staging',
      options: {
        type: 'static',
        options: [
          { value: 'production', label: '生产环境' },
          { value: 'staging', label: '预发布环境' },
          { value: 'development', label: '开发环境' },
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
      label: '状态',
      type: 'select',
      defaultValue: 'planning',
      options: {
        type: 'static',
        options: [
          { value: 'planning', label: '规划中' },
          { value: 'released', label: '已发布' },
          { value: 'rolled_back', label: '已回滚' },
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
      label: '发布人',
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
      label: '项目ID',
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'build_id',
      label: '构建ID',
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'env',
      label: '环境标识',
      type: 'text',
      showInList: false,
    },
    {
      name: 'deploy_type',
      label: '部署方式',
      type: 'select',
      defaultValue: 'full',
      options: {
        type: 'static',
        options: [
          { value: 'full', label: '全量部署' },
          { value: 'rolling', label: '滚动部署' },
          { value: 'blue-green', label: '蓝绿部署' },
          { value: 'canary', label: '灰度发布' },
        ],
      },
      showInList: false,
    },
    {
      name: 'app_name',
      label: '应用名称',
      type: 'text',
      showInList: false,
    },
    {
      name: 'target_url',
      label: '访问地址',
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
          '访问'
        );
      },
    },
    {
      name: 'logs',
      label: '发布日志',
      type: 'textarea',
      showInList: false,
      hideInForm: true,
    },
    {
      name: 'created_at',
      label: '创建时间',
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
        label: '环境',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '生产环境', value: 'production' },
          { label: '预发布环境', value: 'staging' },
          { label: '开发环境', value: 'development' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '已发布', value: 'released' },
          { label: '规划中', value: 'planning' },
          { label: '已回滚', value: 'rolled_back' },
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
      title: '发布信息',
      fields: ['version', 'environment', 'deploy_type'],
    },
    {
      title: '应用信息',
      fields: ['project_id', 'build_id', 'app_name'],
    },
    {
      title: '发布说明',
      fields: ['release_note'],
    },
  ],

  formColCount: 2,
  createTitle: '新建发布',
  editTitle: '编辑发布',
  detailTitle: '发布详情',

  actions: ['create', 'detail'],
};
