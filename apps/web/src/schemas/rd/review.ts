import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { FileText, User, Clock } from 'lucide-react';
import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';

/**
 * 批 38：评审页数据源从 rd.builds 切换为 rs.formulas。
 * - api.resource: formulas（复用既有 /api/rd/formulas 端点）
 * - 字段对齐 rs.formulas：name/code/version/approval_status/approved_by/approved_at
 * - 删除 rd.builds 才有的死字段：reviewer/comment_count/branch/commit_hash/build_type/logs
 */

const APPROVAL_STATUS_COLOR_MAP: Record<
  string,
  'default' | 'primary' | 'success' | 'error' | 'warning'
> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  none: 'default',
};

function getApprovalStatusLabelMap(): Record<string, string> {
  return {
    pending: i18n.t('rd.review.k0'),
    approved: i18n.t('rd.review.k1'),
    rejected: i18n.t('rd.review.k2'),
    none: i18n.t('rd.review.k17'),
  };
}

export const reviewSchema: EntitySchema = {
  entity: 'rd_review',
  title: i18n.t('rd.review.k4'),
  description: i18n.t('rd.review.k5'),

  api: {
    module: 'rd',
    resource: 'formulas',
  },

  // 批 38：评审页读 rs.formulas，权限落在 rd:formula
  permissionResource: 'rd:formula',

  fields: [
    {
      name: 'name',
      label: i18n.t('rd.review.k6'),
      type: 'text',
      required: true,
      listWidth: 220,
      renderCell: (row: Record<string, unknown>) => {
        const name = String(row.name ?? '');
        const version = row.version ? ` · v${String(row.version)}` : '';
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(FileText, { size: 16, color: 'primary.main' }),
          React.createElement(
            Typography,
            { variant: 'body2', sx: { fontWeight: 500 } },
            `${name}${version}`
          )
        );
      },
    },
    {
      name: 'code',
      label: i18n.t('rd.review.k35'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => String(row.code ?? '-'),
    },
    {
      name: 'approval_status',
      label: i18n.t('rd.review.k10'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('rd.review.k11') },
          { value: 'approved', label: i18n.t('rd.review.k13') },
          { value: 'rejected', label: i18n.t('rd.review.k14') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const raw = String(row.approval_status ?? '').toLowerCase();
        const key = raw || 'none';
        const label = getApprovalStatusLabelMap()[key] || raw || '-';
        const color = APPROVAL_STATUS_COLOR_MAP[key] || 'default';
        return React.createElement(Chip, { label, size: 'small', color });
      },
    },
    {
      name: 'approved_by',
      label: i18n.t('rd.review.k7'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.approved_by ? String(row.approved_by) : i18n.t('rd.review.k8');
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(User, { size: 14 }),
          val
        );
      },
    },
    {
      name: 'approved_at',
      label: i18n.t('rd.review.k15'),
      type: 'datetime',
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.approved_at ?? row.created_at;
        if (!val) return '-';
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
          React.createElement(Clock, { size: 14 }),
          String(val)
        );
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
      name: 'description',
      label: i18n.t('rd.review.k24'),
      type: 'textarea',
      showInList: false,
      hideInForm: true,
    },
  ],

  list: {
    columns: ['name', 'code', 'approval_status', 'approved_by', 'approved_at'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    filters: [
      {
        id: 'approval_status',
        label: i18n.t('rd.review.k25'),
        type: 'select',
        options: [
          { label: i18n.t('rd.review.k26'), value: 'all' },
          { label: i18n.t('rd.review.k27'), value: 'pending' },
          { label: i18n.t('rd.review.k29'), value: 'approved' },
          { label: i18n.t('rd.review.k30'), value: 'rejected' },
        ],
        defaultValue: 'pending',
      },
    ],
    statusBadge: {
      field: 'approval_status',
      colorMap: APPROVAL_STATUS_COLOR_MAP,
      labelMap: getApprovalStatusLabelMap(),
    },
  },

  formSections: [
    {
      title: i18n.t('rd.review.k31'),
      fields: ['project_id', 'code', 'name'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.review.k32'),
  editTitle: i18n.t('rd.review.k33'),
  detailTitle: i18n.t('rd.review.k34'),

  actions: ['create', 'detail'],
};
