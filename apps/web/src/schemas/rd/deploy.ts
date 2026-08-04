import React from 'react';
import { Chip, Box, Button, Typography } from '@mui/material';
import { Rocket, CheckCircle, XCircle, Clock, Globe } from 'lucide-react';
import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  success: 'success',
  failed: 'error',
  running: 'warning',
  pending: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  success: '成功',
  failed: '失败',
  running: '进行中',
  pending: '待部署',
};

const ENV_COLOR_MAP: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  prod: 'error',
  staging: 'warning',
  test: 'default',
  dev: 'success',
};

const ENV_LABEL_MAP: Record<string, string> = {
  prod: '生产环境',
  staging: '预发布环境',
  test: '测试环境',
  dev: '开发环境',
};

const DEPLOY_TYPE_LABEL_MAP: Record<string, string> = {
  full: '全量部署',
  rolling: '滚动部署',
  'blue-green': '蓝绿部署',
  canary: '灰度发布',
};

export const deploySchema: EntitySchema = {
  entity: 'rd_deploy',
  title: '部署管理',
  description: '管理应用部署和发布流程',

  api: {
    module: 'rd',
    resource: 'deploys',
  },

  fields: [
    {
      name: 'deploy_no',
      label: '部署编号',
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
      label: '项目',
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'env',
      label: '环境',
      type: 'select',
      defaultValue: 'prod',
      options: {
        type: 'static',
        options: [
          { value: 'prod', label: '生产环境' },
          { value: 'staging', label: '预发布环境' },
          { value: 'test', label: '测试环境' },
          { value: 'dev', label: '开发环境' },
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
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.deploy_type ?? '');
        const label = DEPLOY_TYPE_LABEL_MAP[val] || val;
        return React.createElement(Chip, { label, size: 'small', variant: 'outlined' });
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待部署' },
          { value: 'running', label: '进行中' },
          { value: 'success', label: '成功' },
          { value: 'failed', label: '失败' },
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
      label: '部署人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'deploy_time',
      label: '部署时间',
      type: 'datetime',
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.deploy_time || row.created_at;
        return val ? String(val) : '-';
      },
    },
    {
      name: 'target_url',
      label: '访问地址',
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
          '访问'
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
      name: 'environment',
      label: '环境标识',
      type: 'text',
      showInList: false,
    },
    {
      name: 'app_name',
      label: '应用名称',
      type: 'text',
      showInList: false,
    },
    {
      name: 'version',
      label: '版本号',
      type: 'text',
      showInList: false,
    },
    {
      name: 'logs',
      label: '部署日志',
      type: 'textarea',
      showInList: false,
      readonly: true,
    },
    {
      name: 'created_at',
      label: '创建时间',
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
        label: '环境',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '生产环境', value: 'prod' },
          { label: '预发布环境', value: 'staging' },
          { label: '测试环境', value: 'test' },
          { label: '开发环境', value: 'dev' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '成功', value: 'success' },
          { label: '失败', value: 'failed' },
          { label: '进行中', value: 'running' },
          { label: '待部署', value: 'pending' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: '部署信息',
      fields: ['project_id', 'build_id', 'env', 'deploy_type'],
    },
    {
      title: '应用信息',
      fields: ['app_name', 'version', 'environment'],
    },
  ],

  formColCount: 2,
  createTitle: '发起部署',
  editTitle: '编辑部署',
  detailTitle: '部署详情',

  actions: ['create', 'detail'],
};
