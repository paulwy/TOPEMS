import type { EntitySchema } from '@/schema';
import {
  Settings,
  CheckSquare,
  Calendar,
  MessageSquare,
} from 'lucide-react';
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

const TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'error' | 'default'> = {
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
  system: { bg: 'rgba(59, 130, 246, 0.1)', color: 'primary.main' },
  workflow: { bg: 'rgba(245, 158, 11, 0.1)', color: 'warning.main' },
  reminder: { bg: 'rgba(245, 158, 11, 0.1)', color: 'warning.main' },
  alert: { bg: 'rgba(239, 68, 68, 0.1)', color: 'error.main' },
  message: { bg: 'rgba(14, 165, 233, 0.1)', color: 'info.main' },
  info: { bg: 'rgba(14, 165, 233, 0.1)', color: 'info.main' },
  success: { bg: 'rgba(34, 197, 94, 0.1)', color: 'success.main' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', color: 'warning.main' },
  error: { bg: 'rgba(239, 68, 68, 0.1)', color: 'error.main' },
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

export const notificationSchema: EntitySchema = {
  entity: 'notification',
  title: '通知',
  description: '查看和管理您的所有通知',

  api: {
    module: 'notification',
    resource: 'notifications',
  },

  fields: [
    {
      name: 'title',
      label: '通知标题',
      type: 'text',
      listWidth: 280,
      renderCell: (row) => {
        const n = row as any;
        const type = n.notification_type || 'info';
        const bgColor = TYPE_BG_COLORS[type]?.bg || 'rgba(14, 165, 233, 0.1)';
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
      renderCell: (row) => {
        const type = (row as any).notification_type || 'info';
        const color = TYPE_COLORS[type] || 'default';
        const label = TYPE_LABELS[type] || type;
        return (
          <Chip
            size='small'
            color={color as any}
            label={label}
            variant='outlined'
          />
        );
      },
    },
    {
      name: 'is_read',
      label: '状态',
      type: 'switch',
      listWidth: 100,
      renderCell: (row) => (
        <Chip
          size='small'
          label={(row as any).is_read ? '已读' : '未读'}
          color={(row as any).is_read ? 'default' : 'primary'}
          variant='outlined'
        />
      ),
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'number',
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'created_at',
      label: '发送时间',
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
      renderCell: (row) => (
        <Typography variant='body2' color='text.secondary'>
          {new Date((row as any).created_at).toLocaleString('zh-CN')}
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
        label: '通知类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '系统通知', value: 'system' },
          { label: '审批通知', value: 'workflow' },
          { label: '提醒通知', value: 'reminder' },
          { label: '告警通知', value: 'alert' },
          { label: '消息通知', value: 'message' },
          { label: '信息通知', value: 'info' },
          { label: '成功通知', value: 'success' },
          { label: '警告通知', value: 'warning' },
          { label: '错误通知', value: 'error' },
        ],
      },
    ],
  },

  actions: ['detail', 'delete'],

  formColCount: 2,
  detailTitle: '通知详情',
};
