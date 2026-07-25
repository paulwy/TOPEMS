import React from 'react';
import { Box, Typography } from '@mui/material';
import { Shield } from 'lucide-react';
import type { EntitySchema } from '@/schema';

export const roleSchema: EntitySchema = {
  entity: 'role',
  title: '角色管理',
  description: '管理用户角色、权限配置',

  api: {
    module: 'iam',
    resource: 'roles',
  },

  fields: [
    {
      name: 'name',
      label: '角色名称',
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
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      listWidth: 250,
    },
    {
      name: 'created_at',
      label: '创建时间',
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
      title: '基本信息',
      fields: ['name', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '创建角色',
  editTitle: '编辑角色',
  detailTitle: '角色详情',
};
