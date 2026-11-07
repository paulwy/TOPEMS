import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { GitBranch } from 'lucide-react';
import type { EntitySchema } from '@/schema';

import i18n from '@/i18n';

// 批24/批33：本页无真实 code_repos 实体，复用 rs.projects 顶上。
// 不展示仓库URL/语言/分支数/提交数等假指标，只展示项目真实业务字段。
export const codeSchema: EntitySchema = {
  entity: 'rd_code_repo',
  title: i18n.t('rd.code.k0'),
  description: i18n.t('rd.code.k1'),

  api: {
    module: 'rd',
    resource: 'projects',
  },

  // 批24：按真实数据源接入（/api/rd/projects → rs.projects），不造 rd:code 码
  permissionResource: 'rd:project',

  fields: [
    {
      name: 'project_name',
      label: i18n.t('rd.code.k2'),
      type: 'text',
      sortable: true,
      listWidth: 220,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(GitBranch, { size: 16, color: 'primary.main' }),
          React.createElement(
            Typography,
            { variant: 'body2', sx: { fontWeight: 500 } },
            String(row.project_name ?? '')
          )
        ),
    },
    {
      name: 'code',
      label: i18n.t('rd.code.k3'),
      type: 'text',
      listWidth: 140,
      hideInForm: true,
    },
    {
      name: 'leader',
      label: i18n.t('rd.code.k4'),
      type: 'text',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'status',
      label: i18n.t('rd.code.k5'),
      type: 'text',
      listWidth: 100,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.status ?? '');
        if (!val) return null;
        return React.createElement(Chip, {
          label: val,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'progress',
      label: i18n.t('rd.code.k6'),
      type: 'number',
      listWidth: 100,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.progress;
        if (val === undefined || val === null) return null;
        return React.createElement(Typography, { variant: 'body2' }, `${Number(val)}%`);
      },
    },
    {
      name: 'start_date',
      label: i18n.t('rd.code.k7'),
      type: 'date',
      listWidth: 120,
      hideInForm: true,
    },
    {
      name: 'risklevel',
      label: i18n.t('rd.code.k8'),
      type: 'text',
      listWidth: 100,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.risklevel ?? '');
        if (!val) return null;
        return React.createElement(Chip, {
          label: val,
          size: 'small',
          color: val === 'high' || val === 'extreme' ? 'error' : 'default',
          variant: 'outlined',
        });
      },
    },
  ],

  list: {
    columns: ['project_name', 'code', 'leader', 'status', 'progress', 'start_date', 'risklevel'],
    searchFields: ['project_name', 'code'],
    pageSize: 10,
  },

  // 无 create / edit：后端不支持仓库字段，提供表单只会写不落库
  actions: ['detail'],

  detailTitle: i18n.t('rd.code.k16'),
};
