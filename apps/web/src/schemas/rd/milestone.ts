import React from 'react';
import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
  completed: 'success',
  active: 'primary',
  planning: 'warning',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  completed: i18n.t('rd.milestone.k0'),
  active: i18n.t('rd.milestone.k1'),
  planning: i18n.t('rd.milestone.k2'),
};

export const milestoneSchema: EntitySchema = {
  entity: 'rd_milestone',
  title: i18n.t('rd.milestone.k3'),
  description: i18n.t('rd.milestone.k4'),

  api: {
    module: 'rd',
    resource: 'milestones',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('rd.milestone.k5'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 220,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'start_date',
      label: i18n.t('rd.milestone.k6'),
      type: 'date',
      listWidth: 130,
    },
    {
      name: 'end_date',
      label: i18n.t('rd.milestone.k7'),
      type: 'date',
      listWidth: 130,
    },
    {
      name: 'progress',
      label: i18n.t('rd.milestone.k8'),
      type: 'number',
      defaultValue: 0,
      listWidth: 170,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const val = Number(row.progress ?? 0);
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 } },
          React.createElement(LinearProgress, {
            variant: 'determinate',
            value: val,
            sx: { flex: 1, height: 8, borderRadius: 4 },
          }),
          React.createElement(Typography, { variant: 'caption' }, `${val}%`)
        );
      },
    },
    {
      name: 'related_project',
      label: i18n.t('rd.milestone.k9'),
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'status',
      label: i18n.t('rd.milestone.k10'),
      type: 'select',
      defaultValue: 'planning',
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'completed', label: i18n.t('rd.milestone.k11') },
          { value: 'active', label: i18n.t('rd.milestone.k12') },
          { value: 'planning', label: i18n.t('rd.milestone.k13') },
        ],
      },
      listWidth: 110,
      validation: [{ type: 'maxLength', value: 50 }],
    },
  ],

  list: {
    columns: ['name', 'start_date', 'end_date', 'progress', 'related_project', 'status'],
    searchFields: ['name', 'related_project'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: i18n.t('rd.milestone.k14'),
        type: 'select',
        options: [
          { label: i18n.t('rd.milestone.k15'), value: 'all' },
          { label: i18n.t('rd.milestone.k16'), value: 'active' },
          { label: i18n.t('rd.milestone.k17'), value: 'completed' },
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
      title: i18n.t('rd.milestone.k18'),
      fields: ['name', 'start_date', 'end_date', 'related_project'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.milestone.k19'),
  editTitle: i18n.t('rd.milestone.k20'),
  detailTitle: i18n.t('rd.milestone.k21'),

  actions: ['create', 'detail'],

  renderDetail: (row) => {
    const status = String(row.status ?? '');
    const progress = Number(row.progress ?? 0);
    const statusLabel = STATUS_LABEL_MAP[status] || status;
    const statusColor = STATUS_COLOR_MAP[status] || 'default';

    return React.createElement(
      Box,
      { sx: { py: 2 } },
      React.createElement(
        Typography,
        { variant: 'h6', sx: { fontWeight: 'bold' } },
        String(row.name ?? '')
      ),
      React.createElement(
        Stack,
        { direction: 'row', spacing: 2, sx: { mt: 2 } },
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
          i18n.t('rd.milestone.k22')
        ),
        React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 2, mt: 1 } },
          React.createElement(LinearProgress, {
            variant: 'determinate',
            value: progress,
            sx: { flex: 1, height: 10, borderRadius: 4 },
          }),
          React.createElement(
            Typography,
            { variant: 'body1', sx: { fontWeight: 'bold' } },
            `${progress}%`
          )
        )
      ),
      React.createElement(
        Stack,
        { direction: 'row', spacing: 4, sx: { mt: 3 } },
        React.createElement(
          Box,
          null,
          React.createElement(
            Typography,
            { variant: 'caption', color: 'text.secondary' },
            i18n.t('rd.milestone.k23')
          ),
          React.createElement(
            Typography,
            { variant: 'body1', sx: { fontWeight: 'bold' } },
            String(row.start_date ?? '-')
          )
        ),
        React.createElement(
          Box,
          null,
          React.createElement(
            Typography,
            { variant: 'caption', color: 'text.secondary' },
            i18n.t('rd.milestone.k24')
          ),
          React.createElement(
            Typography,
            { variant: 'body1', sx: { fontWeight: 'bold' } },
            String(row.end_date ?? '-')
          )
        ),
        React.createElement(
          Box,
          null,
          React.createElement(
            Typography,
            { variant: 'caption', color: 'text.secondary' },
            i18n.t('rd.milestone.k25')
          ),
          React.createElement(
            Typography,
            { variant: 'body1', sx: { fontWeight: 'bold' } },
            String(row.related_project ?? '-')
          )
        )
      )
    );
  },
};
