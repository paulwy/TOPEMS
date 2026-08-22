import { designTokens } from '@topems/tokens';
import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { GitBranch, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_COLOR_MAP: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  success: 'success',
  failed: 'error',
  running: 'warning',
  pending: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  success: i18n.t('rd.build.k0'),
  failed: i18n.t('rd.build.k1'),
  running: i18n.t('rd.build.k2'),
  pending: i18n.t('rd.build.k3'),
};

const BUILD_TYPE_LABEL_MAP: Record<string, string> = {
  manual: i18n.t('rd.build.k4'),
  auto: i18n.t('rd.build.k5'),
  scheduled: i18n.t('rd.build.k6'),
};

export const buildSchema: EntitySchema = {
  entity: 'rd_build',
  title: i18n.t('rd.build.k7'),
  description: i18n.t('rd.build.k8'),

  api: {
    module: 'rd',
    resource: 'builds',
  },

  fields: [
    {
      name: 'build_no',
      label: i18n.t('rd.build.k9'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(GitBranch, {
            size: 16,
            color: 'primary.main',
          }),
          React.createElement(
            Typography,
            { variant: 'body2', sx: { fontWeight: 500 } },
            String(row.build_no ?? '')
          )
        );
      },
    },
    {
      name: 'project_id',
      label: i18n.t('rd.build.id_10'),
      type: 'text',
      required: true,
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'project_name',
      label: i18n.t('rd.build.k11'),
      type: 'text',
      listWidth: 150,
      hideInForm: true,
    },
    {
      name: 'branch',
      label: i18n.t('rd.build.k12'),
      type: 'text',
      required: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.branch ?? '');
        if (!val) return '-';
        return React.createElement(Chip, {
          label: val,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'commit_hash',
      label: i18n.t('rd.build.k13'),
      type: 'text',
      required: true,
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.commit_hash ?? '');
        if (!val) return '-';
        return React.createElement(
          Typography,
          { variant: 'body2', sx: { fontFamily: 'monospace', fontSize: designTokens.typography.fontSize.scale['0.75rem'] } },
          val.length > 8 ? `${val.slice(0, 8)}...` : val
        );
      },
    },
    {
      name: 'build_type',
      label: i18n.t('rd.build.k14'),
      type: 'select',
      defaultValue: 'manual',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'manual', label: i18n.t('rd.build.k15') },
          { value: 'auto', label: i18n.t('rd.build.k16') },
          { value: 'scheduled', label: i18n.t('rd.build.k17') },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.build_type ?? '');
        const label = BUILD_TYPE_LABEL_MAP[val] || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'status',
      label: i18n.t('rd.build.k18'),
      type: 'select',
      defaultValue: 'pending',
      listWidth: 130,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'success', label: i18n.t('rd.build.k19') },
          { value: 'failed', label: i18n.t('rd.build.k20') },
          { value: 'running', label: i18n.t('rd.build.k21') },
          { value: 'pending', label: i18n.t('rd.build.k22') },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.status ?? '');
        const label = STATUS_LABEL_MAP[val] || val;
        const color = STATUS_COLOR_MAP[val] || 'default';
        const icon =
          val === 'success'
            ? React.createElement(CheckCircle, { size: 14, color: 'success.main' })
            : val === 'failed'
              ? React.createElement(XCircle, { size: 14, color: 'error.main' })
              : val === 'running'
                ? React.createElement(Clock, { size: 14, color: 'warning.main' })
                : null;
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
          icon,
          React.createElement(Chip, {
            label,
            size: 'small',
            color,
          })
        );
      },
    },
    {
      name: 'duration',
      label: i18n.t('rd.build.k23'),
      type: 'text',
      listWidth: 100,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.duration;
        return val == null ? '-' : String(val);
      },
    },
    {
      name: 'created_at',
      label: i18n.t('rd.build.k24'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'logs',
      label: i18n.t('rd.build.k25'),
      type: 'textarea',
      showInList: false,
      hideInForm: true,
    },
  ],

  list: {
    columns: [
      'build_no',
      'project_name',
      'branch',
      'commit_hash',
      'build_type',
      'status',
      'duration',
    ],
    searchFields: ['build_no', 'project_name'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: i18n.t('rd.build.k26'),
        type: 'select',
        options: [
          { label: i18n.t('rd.build.k27'), value: 'all' },
          { label: i18n.t('rd.build.k28'), value: 'success' },
          { label: i18n.t('rd.build.k29'), value: 'failed' },
          { label: i18n.t('rd.build.k30'), value: 'running' },
          { label: i18n.t('rd.build.k31'), value: 'pending' },
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
      title: i18n.t('rd.build.k32'),
      fields: ['project_id', 'branch', 'commit_hash', 'build_type'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.build.k33'),
  editTitle: i18n.t('rd.build.k34'),
  detailTitle: i18n.t('rd.build.k35'),

  actions: ['create', 'detail'],

  renderDetail: (row) => {
    const status = String(row.status ?? '');
    const statusLabel = STATUS_LABEL_MAP[status] || status;
    const statusColor = STATUS_COLOR_MAP[status] || 'default';

    return React.createElement(
      Box,
      { sx: { py: 2 } },
      React.createElement(
        Typography,
        { variant: 'h6', sx: { fontWeight: 'bold' } },
        String(row.build_no ?? '')
      ),
      React.createElement(
        Box,
        { sx: { display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' } },
        React.createElement(Chip, {
          label: String(row.project_name ?? ''),
          size: 'small',
          variant: 'outlined',
        }),
        React.createElement(Chip, {
          label: String(row.branch ?? ''),
          size: 'small',
          variant: 'outlined',
        }),
        React.createElement(Chip, {
          label: statusLabel,
          size: 'small',
          color: statusColor,
        })
      ),
      React.createElement(
        Box,
        { sx: { mt: 3 } },
        React.createElement(
          Typography,
          { variant: 'subtitle2', color: 'text.secondary' },
          `${i18n.t('shared.build.k0')}${row.commit_hash ?? '-'}`
        ),
        React.createElement(
          Typography,
          { variant: 'subtitle2', color: 'text.secondary', sx: { mt: 1 } },
          `${i18n.t('shared.build.k1')}${row.duration ?? '-'}`
        ),
        React.createElement(
          Typography,
          { variant: 'subtitle2', color: 'text.secondary', sx: { mt: 1 } },
          `${i18n.t('shared.build.k2')}${row.created_at ?? '-'}`
        )
      ),
      row.logs
        ? React.createElement(
            Box,
            { sx: { mt: 3 } },
            React.createElement(
              Typography,
              { variant: 'subtitle2', color: 'text.secondary' },
              i18n.t('rd.build.k36')
            ),
            React.createElement(
              Box,
              {
                sx: {
                  mt: 1,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                  maxHeight: 200,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                },
              },
              String(row.logs)
            )
          )
        : null
    );
  },
};
