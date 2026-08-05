import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { GitPullRequest, User } from 'lucide-react';
import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  in_progress: 'primary',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待评审',
  approved: '已通过',
  rejected: '已拒绝',
  in_progress: '评审中',
};

export const reviewSchema: EntitySchema = {
  entity: 'rd_review',
  title: '配方评审',
  description: '管理配方评审流程，包括评审申请、评审意见、审批状态等',

  api: {
    module: 'rd',
    resource: 'builds',
  },

  fields: [
    {
      name: 'title',
      label: '评审标题',
      type: 'text',
      required: true,
      listWidth: 250,
      renderCell: (row: Record<string, unknown>) => {
        const title =
          row.build_no && row.project_name
            ? `${row.build_no} - ${row.project_name}`
            : String(row.title ?? row.build_no ?? '');
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(GitPullRequest, { size: 16, color: 'primary.main' }),
          React.createElement(Typography, { variant: 'body2' }, title)
        );
      },
    },
    {
      name: 'reviewer',
      label: '评审人',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.reviewer ?? '系统自动');
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(User, { size: 14 }),
          val
        );
      },
    },
    {
      name: 'author',
      label: '作者',
      type: 'text',
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        return String(row.project_name ?? row.author ?? '-');
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
          { value: 'pending', label: '待评审' },
          { value: 'in_progress', label: '评审中' },
          { value: 'approved', label: '已通过' },
          { value: 'rejected', label: '已拒绝' },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        let status = String(row.status ?? '');
        if (status === 'success') status = 'approved';
        else if (status === 'failed') status = 'rejected';
        else if (status === 'running') status = 'in_progress';
        const label = STATUS_LABEL_MAP[status] || status;
        const color = STATUS_COLOR_MAP[status] || 'default';
        return React.createElement(Chip, { label, size: 'small', color });
      },
    },
    {
      name: 'create_time',
      label: '创建时间',
      type: 'datetime',
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.created_at || row.create_time;
        return val ? String(val) : '-';
      },
    },
    {
      name: 'comment_count',
      label: '评论数',
      type: 'number',
      listWidth: 80,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.comment_count ?? 0;
        return String(val);
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
      name: 'branch',
      label: '分支',
      type: 'text',
      showInList: false,
    },
    {
      name: 'commit_hash',
      label: '提交',
      type: 'text',
      showInList: false,
    },
    {
      name: 'build_type',
      label: '构建类型',
      type: 'select',
      defaultValue: 'manual',
      options: {
        type: 'static',
        options: [
          { value: 'manual', label: '手动' },
          { value: 'auto', label: '自动' },
          { value: 'scheduled', label: '定时' },
        ],
      },
      showInList: false,
    },
    {
      name: 'logs',
      label: '日志',
      type: 'textarea',
      showInList: false,
      hideInForm: true,
    },
  ],

  list: {
    columns: ['title', 'reviewer', 'author', 'status', 'create_time', 'comment_count'],
    searchFields: ['title', 'author', 'reviewer'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '待评审', value: 'pending' },
          { label: '评审中', value: 'in_progress' },
          { label: '已通过', value: 'approved' },
          { label: '已拒绝', value: 'rejected' },
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
      title: '评审信息',
      fields: ['project_id', 'branch', 'commit_hash', 'build_type'],
    },
  ],

  formColCount: 2,
  createTitle: '新建评审',
  editTitle: '编辑评审',
  detailTitle: '评审详情',

  actions: ['create', 'detail'],
};
