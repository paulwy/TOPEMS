import type { EntitySchema } from '@/schema';
import { Settings, CheckSquare, Calendar, MessageSquare } from 'lucide-react';
import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const TYPE_LABELS: Record<string, string> = {
  system: i18n.t('shared.notification.k0'),
  workflow: i18n.t('shared.notification.k1'),
  reminder: i18n.t('shared.notification.k2'),
  alert: i18n.t('shared.notification.k3'),
  message: i18n.t('shared.notification.k4'),
  info: i18n.t('shared.notification.k5'),
  success: i18n.t('shared.notification.k6'),
  warning: i18n.t('shared.notification.k7'),
  error: i18n.t('shared.notification.k8'),
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

const TYPE_BG_COLORS: Record<string, { bg: string; color: string }> = {
  system: { bg: 'glass.line', color: 'primary.main' },
  workflow: { bg: designTokens.colors.warning[100], color: 'warning.main' },
  reminder: { bg: designTokens.colors.warning[100], color: 'warning.main' },
  alert: { bg: designTokens.colors.error[100], color: 'error.main' },
  message: { bg: designTokens.colors.info[100], color: 'info.main' },
  info: { bg: designTokens.colors.info[100], color: 'info.main' },
  success: { bg: 'rgba(34, 197, 94, 0.1)', color: 'success.main' },
  warning: { bg: designTokens.colors.warning[100], color: 'warning.main' },
  error: { bg: designTokens.colors.error[100], color: 'error.main' },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  system: <Settings size={16} />,
  workflow: <CheckSquare size={16} />,
  reminder: <Calendar size={16} />,
  alert: <MessageSquare size={16} />,
  message: <MessageSquare size={16} />,
  info: <MessageSquare size={16} />,
  success: <MessageSquare size={16} />,
  warning: <MessageSquare size={16} />,
  error: <MessageSquare size={16} />,
};

interface NotificationRow {
  notification_type: string;
  is_read: boolean;
  title: string;
  content: string;
  created_at: string;
}

export const notificationSchema: EntitySchema = {
  entity: 'notification',
  title: i18n.t('shared.notification.k9'),
  description: i18n.t('shared.notification.k10'),

  api: {
    module: 'notification',
    resource: 'notifications',
  },

  fields: [
    {
      name: 'title',
      label: i18n.t('shared.notification.k11'),
      type: 'text',
      listWidth: 280,
      renderCell: (row: Record<string, unknown>) => {
        const n = row as unknown as NotificationRow;
        const type = n.notification_type || 'info';
        const bgColor = TYPE_BG_COLORS[type]?.bg || designTokens.colors.info[100];
        const iconColor = TYPE_BG_COLORS[type]?.color || 'info.main';
        const icon = TYPE_ICONS[type] || <MessageSquare size={16} />;

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconColor,
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: !n.is_read ? 600 : 400,
                  color: !n.is_read ? 'text.primary' : 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {n.title}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {n.content}
              </Typography>
            </Box>
          </Box>
        );
      },
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'notification_type',
      label: i18n.t('shared.notification.k12'),
      type: 'select',
      listWidth: 120,
      options: {
        type: 'static',
        options: [
          { value: 'system', label: i18n.t('shared.notification.k13') },
          { value: 'workflow', label: i18n.t('shared.notification.k14') },
          { value: 'reminder', label: i18n.t('shared.notification.k15') },
          { value: 'alert', label: i18n.t('shared.notification.k16') },
          { value: 'message', label: i18n.t('shared.notification.k17') },
          { value: 'info', label: i18n.t('shared.notification.k18') },
          { value: 'success', label: i18n.t('shared.notification.k19') },
          { value: 'warning', label: i18n.t('shared.notification.k20') },
          { value: 'error', label: i18n.t('shared.notification.k21') },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const type = (row as unknown as NotificationRow).notification_type || 'info';
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
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'is_read',
      label: i18n.t('shared.notification.k22'),
      type: 'switch',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => (
        <Chip
          size='small'
          label={(row as unknown as NotificationRow).is_read ? i18n.t('shared.notification.k24') : i18n.t('shared.notification.k23')}
          color={(row as unknown as NotificationRow).is_read ? 'default' : 'primary'}
          variant='outlined'
        />
      ),
    },
    {
      name: 'priority',
      label: i18n.t('shared.notification.k25'),
      type: 'number',
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('shared.notification.k26'),
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {new Date((row as unknown as NotificationRow).created_at).toLocaleString('zh-CN')}
        </Typography>
      ),
    },
  ],

  list: {
    searchFields: ['title', 'content'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'notification_type',
        label: i18n.t('shared.notification.k27'),
        type: 'select',
        options: [
          { label: i18n.t('shared.notification.k28'), value: 'all' },
          { label: i18n.t('shared.notification.k29'), value: 'system' },
          { label: i18n.t('shared.notification.k30'), value: 'workflow' },
          { label: i18n.t('shared.notification.k31'), value: 'reminder' },
          { label: i18n.t('shared.notification.k32'), value: 'alert' },
          { label: i18n.t('shared.notification.k33'), value: 'message' },
          { label: i18n.t('shared.notification.k34'), value: 'info' },
          { label: i18n.t('shared.notification.k35'), value: 'success' },
          { label: i18n.t('shared.notification.k36'), value: 'warning' },
          { label: i18n.t('shared.notification.k37'), value: 'error' },
        ],
      },
    ],
  },

  actions: ['detail', 'delete'],

  formColCount: 2,
  detailTitle: i18n.t('shared.notification.k38'),
};
