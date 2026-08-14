import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { GitPullRequest, User } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  in_progress: 'primary',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: i18n.t('rd.review.k0'),
  approved: i18n.t('rd.review.k1'),
  rejected: i18n.t('rd.review.k2'),
  in_progress: i18n.t('rd.review.k3'),
};

export const reviewSchema: EntitySchema = {
  entity: 'rd_review',
  title: i18n.t('rd.review.k4'),
  description: i18n.t('rd.review.k5'),

  api: {
    module: 'rd',
    resource: 'builds',
  },

  fields: [
    {
      name: 'title',
      label: i18n.t('rd.review.k6'),
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
      label: i18n.t('rd.review.k7'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.reviewer ?? i18n.t('rd.review.k8'));
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
      label: i18n.t('rd.review.k9'),
      type: 'text',
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        return String(row.project_name ?? row.author ?? '-');
      },
    },
    {
      name: 'status',
      label: i18n.t('rd.review.k10'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('rd.review.k11') },
          { value: 'in_progress', label: i18n.t('rd.review.k12') },
          { value: 'approved', label: i18n.t('rd.review.k13') },
          { value: 'rejected', label: i18n.t('rd.review.k14') },
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
      label: i18n.t('rd.review.k15'),
      type: 'datetime',
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.created_at || row.create_time;
        return val ? String(val) : '-';
      },
    },
    {
      name: 'comment_count',
      label: i18n.t('rd.review.k16'),
      type: 'number',
      listWidth: 80,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.comment_count ?? 0;
        return String(val);
      },
    },
    {
      name: 'project_id',
      label: i18n.t('rd.review.id_17'),
      type: 'text',
      required: true,
      showInList: false,
    },
    {
      name: 'branch',
      label: i18n.t('rd.review.k18'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'commit_hash',
      label: i18n.t('rd.review.k19'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'build_type',
      label: i18n.t('rd.review.k20'),
      type: 'select',
      defaultValue: 'manual',
      options: {
        type: 'static',
        options: [
          { value: 'manual', label: i18n.t('rd.review.k21') },
          { value: 'auto', label: i18n.t('rd.review.k22') },
          { value: 'scheduled', label: i18n.t('rd.review.k23') },
        ],
      },
      showInList: false,
    },
    {
      name: 'logs',
      label: i18n.t('rd.review.k24'),
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
        label: i18n.t('rd.review.k25'),
        type: 'select',
        options: [
          { label: i18n.t('rd.review.k26'), value: 'all' },
          { label: i18n.t('rd.review.k27'), value: 'pending' },
          { label: i18n.t('rd.review.k28'), value: 'in_progress' },
          { label: i18n.t('rd.review.k29'), value: 'approved' },
          { label: i18n.t('rd.review.k30'), value: 'rejected' },
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
      title: i18n.t('rd.review.k31'),
      fields: ['project_id', 'branch', 'commit_hash', 'build_type'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.review.k32'),
  editTitle: i18n.t('rd.review.k33'),
  detailTitle: i18n.t('rd.review.k34'),

  actions: ['create', 'detail'],
};
