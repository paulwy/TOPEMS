import type { EntitySchema } from '@/schema';
import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import i18n from '@/i18n';

const TYPE_LABELS: Record<string, string> = {
  system: i18n.t('shared.archive.k0'),
  workflow: i18n.t('shared.archive.k1'),
  reminder: i18n.t('shared.archive.k2'),
  alert: i18n.t('shared.archive.k3'),
  message: i18n.t('shared.archive.k4'),
  info: i18n.t('shared.archive.k5'),
  success: i18n.t('shared.archive.k6'),
  warning: i18n.t('shared.archive.k7'),
  error: i18n.t('shared.archive.k8'),
};

const TYPE_COLORS: Record<
  string,
  'primary' | 'success' | 'warning' | 'info' | 'error' | 'default'
> = {
  system: 'primary',
  workflow: 'warning',
  reminder: 'warning',
  alert: 'error',
  message: 'info',
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

interface ArchivedNotificationRow {
  notification_type: string;
  title: string;
  content: string;
  created_at: string;
  archived_at: string;
}

export const archiveNotificationSchema: EntitySchema = {
  entity: 'archivedNotification',
  title: i18n.t('shared.archive.k9'),
  description: i18n.t('shared.archive.k10'),

  api: {
    module: 'notification',
    resource: 'archivedNotifications',
  },

  fields: [
    {
      name: 'title',
      label: i18n.t('shared.archive.k11'),
      type: 'text',
      listWidth: 280,
      renderCell: (row: Record<string, unknown>) => {
        const n = row as unknown as ArchivedNotificationRow;
        return (
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, color: 'grey.900' }}
            >
              {n.title}
            </Typography>
            <Typography
              variant='caption'
              sx={{
                color: 'grey.500',
                maxWidth: 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {n.content}
            </Typography>
          </Box>
        );
      },
    },
    {
      name: 'notification_type',
      label: i18n.t('shared.archive.k12'),
      type: 'select',
      listWidth: 120,
      options: {
        type: 'static',
        options: [
          { value: 'system', label: i18n.t('shared.archive.k13') },
          { value: 'workflow', label: i18n.t('shared.archive.k14') },
          { value: 'reminder', label: i18n.t('shared.archive.k15') },
          { value: 'alert', label: i18n.t('shared.archive.k16') },
          { value: 'message', label: i18n.t('shared.archive.k17') },
          { value: 'info', label: i18n.t('shared.archive.k18') },
          { value: 'success', label: i18n.t('shared.archive.k19') },
          { value: 'warning', label: i18n.t('shared.archive.k20') },
          { value: 'error', label: i18n.t('shared.archive.k21') },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const type = (row as unknown as ArchivedNotificationRow).notification_type || 'info';
        const color = TYPE_COLORS[type] || 'default';
        const label = TYPE_LABELS[type] || type;
        return (
          <Chip
            size='small'
            color={color}
            label={label}
            variant='outlined'
          />
        );
      },
    },
    {
      name: 'created_at',
      label: i18n.t('shared.archive.k22'),
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {new Date((row as unknown as ArchivedNotificationRow).created_at).toLocaleString('zh-CN')}
        </Typography>
      ),
    },
    {
      name: 'archived_at',
      label: i18n.t('shared.archive.k23'),
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {new Date((row as unknown as ArchivedNotificationRow).archived_at).toLocaleString(
            'zh-CN'
          )}
        </Typography>
      ),
    },
  ],

  list: {
    searchFields: ['title', 'content'],
    pageSize: 20,
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: i18n.t('shared.archive.k24'),
};
