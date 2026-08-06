import type { EntitySchema } from '@/schema';
import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

const TYPE_LABELS: Record<string, string> = {
  system: '系统通知',
  workflow: '审批通知',
  reminder: '提醒通知',
  alert: '告警通知',
  message: '消息通知',
  info: '信息通知',
  success: '成功通知',
  warning: '警告通知',
  error: '错误通知',
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
  title: '归档通知',
  description: '查看和管理已归档的通知',

  api: {
    module: 'notification',
    resource: 'archivedNotifications',
  },

  fields: [
    {
      name: 'title',
      label: '通知标题',
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
      label: '类型',
      type: 'select',
      listWidth: 120,
      options: {
        type: 'static',
        options: [
          { value: 'system', label: '系统通知' },
          { value: 'workflow', label: '审批通知' },
          { value: 'reminder', label: '提醒通知' },
          { value: 'alert', label: '告警通知' },
          { value: 'message', label: '消息通知' },
          { value: 'info', label: '信息通知' },
          { value: 'success', label: '成功通知' },
          { value: 'warning', label: '警告通知' },
          { value: 'error', label: '错误通知' },
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
      label: '原创建时间',
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
      label: '归档时间',
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {new Date((row as unknown as ArchivedNotificationRow).archived_at).toLocaleString('zh-CN')}
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
  detailTitle: '归档通知详情',
};
