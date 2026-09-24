import React from 'react';
import { Box, Chip, Typography, Button } from '@mui/material';
import { GitBranch, GitCommit, ExternalLink } from 'lucide-react';
import type { EntitySchema } from '@/schema';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

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
  title: i18n.t('rd.code.k0'),
  description: i18n.t('rd.code.k1'),

  api: {
    module: 'rd',
    resource: 'projects',
  },

  fields: [
    {
      name: 'repo_name',
      label: i18n.t('rd.code.k2'),
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
      label: i18n.t('rd.code.k3'),
      type: 'text',
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'language',
      label: i18n.t('rd.code.k4'),
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
      label: i18n.t('rd.code.k5'),
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
      label: i18n.t('rd.code.k6'),
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
      label: i18n.t('rd.code.k7'),
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'repo_url',
      label: i18n.t('rd.code.k8'),
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
          i18n.t('rd.code.k9')
        );
      },
    },
    {
      name: 'project_id',
      label: i18n.t('rd.code.k10'),
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
        label: i18n.t('rd.code.k11'),
        type: 'select',
        options: [{ label: i18n.t('rd.code.k12'), value: 'all' }, ...LANGUAGE_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('rd.code.k13'),
      fields: ['project_id', 'repo_name', 'repo_url', 'language'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.code.k14'),
  editTitle: i18n.t('rd.code.k15'),
  detailTitle: i18n.t('rd.code.k16'),

  actions: ['create', 'detail'],

  dynamicOptions: [
    {
      field: 'project_id',
      loader: async () => {
        const { rdApi } = await import('@/api/rd');
        const response = await rdApi.listProjects({ page: 1, page_size: 100 });
        if (response.success && response.data) {
          return (response.data.projects || []).map((p) => ({
            value: p.id,
            label: p.project_name,
          }));
        }
        return [];
      },
      queryKey: QUERY_KEYS.AD_HOC.RD_CODE_PROJECT_OPTIONS_BASE,
    },
  ],
};
