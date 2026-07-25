import React from 'react';
import { Box, Chip, Typography, Button } from '@mui/material';
import { GitBranch, GitCommit, ExternalLink } from 'lucide-react';
import type { EntitySchema } from '@/schema';

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'Python', label: 'Python' },
  { value: 'Java', label: 'Java' },
  { value: 'Go', label: 'Go' },
  { value: 'Rust', label: 'Rust' },
  { value: 'PHP', label: 'PHP' },
];

export const codeSchema: EntitySchema = {
  entity: 'rd_code_repo',
  title: '代码库',
  description: '管理代码仓库和版本控制',

  api: {
    module: 'rd',
    resource: 'projects',
  },

  fields: [
    {
      name: 'repo_name',
      label: '仓库名称',
      type: 'text',
      sortable: true,
      listWidth: 200,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(GitBranch, { size: 16, color: 'primary.main' }),
          React.createElement(
            Typography,
            { variant: 'body2', sx: { fontWeight: 500 } },
            String(row.repo_name ?? '')
          )
        ),
    },
    {
      name: 'project_name',
      label: '关联项目',
      type: 'text',
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'language',
      label: '语言',
      type: 'select',
      defaultValue: 'JavaScript',
      options: { type: 'static', options: LANGUAGE_OPTIONS },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(Chip, {
          label: String(row.language ?? ''),
          size: 'small',
          variant: 'outlined',
        }),
    },
    {
      name: 'branch_count',
      label: '分支数',
      type: 'number',
      listWidth: 100,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
          React.createElement(GitBranch, { size: 14 }),
          React.createElement(Typography, { variant: 'body2' }, String(row.branch_count ?? 0))
        ),
    },
    {
      name: 'commit_count',
      label: '提交数',
      type: 'number',
      listWidth: 100,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
          React.createElement(GitCommit, { size: 14 }),
          React.createElement(Typography, { variant: 'body2' }, String(row.commit_count ?? 0))
        ),
    },
    {
      name: 'last_commit',
      label: '最后提交',
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'repo_url',
      label: '仓库链接',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const url = String(row.repo_url ?? '');
        if (!url) return '-';
        return React.createElement(
          Button,
          {
            component: 'a',
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
            size: 'small',
            startIcon: React.createElement(ExternalLink, { size: 14 }),
          } as React.ComponentProps<typeof Button> & { component: React.ElementType; href: string },
          '访问'
        );
      },
    },
    {
      name: 'project_id',
      label: '关联项目',
      type: 'select',
      required: true,
      showInList: false,
      options: { type: 'static', options: [] },
    },
  ],

  list: {
    columns: [
      'repo_name',
      'project_name',
      'language',
      'branch_count',
      'commit_count',
      'last_commit',
      'repo_url',
    ],
    searchFields: ['repo_name', 'project_name'],
    pageSize: 10,
    filters: [
      {
        id: 'language',
        label: '语言',
        type: 'select',
        options: [{ label: '全部', value: 'all' }, ...LANGUAGE_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['project_id', 'repo_name', 'repo_url', 'language'],
    },
  ],

  formColCount: 2,
  createTitle: '添加代码仓库',
  editTitle: '编辑代码仓库',
  detailTitle: '仓库详情',

  actions: ['create', 'detail'],

  dynamicOptions: [
    {
      field: 'project_id',
      loader: async () => {
        const { rdApi } = await import('@/api/rd');
        const response = await rdApi.listProjects({ page: 1, pagesize: 100 });
        if (response.success && response.data) {
          return (response.data.projects || []).map((p) => ({
            value: p.id,
            label: p.project_name,
          }));
        }
        return [];
      },
      queryKey: ['rd-code-project-options'],
    },
  ],
};
