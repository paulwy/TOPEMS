import React from 'react';
import type { EntitySchema } from '@/schema';

type NotificationType = 'system' | 'approval' | 'task' | 'message';
type NotificationPriority = 'high' | 'medium' | 'low';

const TYPE_LABELS: Record<NotificationType, string> = {
  system: '系统',
  approval: '审批',
  task: '任务',
  message: '消息',
};

const PRIORITY_COLORS: Record<NotificationPriority, 'error' | 'warning' | 'info'> = {
  high: 'error',
  medium: 'warning',
  low: 'info',
};

export const notificationSchema: EntitySchema = {
  entity: 'mobile_notification',
  title: '消息通知',
  description: '查看和管理移动端消息通知',

  api: {
    module: 'mobile',
    resource: 'notifications',
  },

  fields: [
    {
      name: 'title',
      label: '通知标题',
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'content',
      label: '通知内容',
      type: 'textarea',
      readonly: true,
      listWidth: 300,
    },
    {
      name: 'type',
      label: '类型',
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: [
          { value: 'system', label: '系统' },
          { value: 'approval', label: '审批' },
          { value: 'task', label: '任务' },
          { value: 'alert', label: '告警' },
          { value: 'message', label: '消息' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        TYPE_LABELS[row.type as NotificationType] || String(row.type ?? ''),
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: [
          { value: 'high', label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low', label: '低' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'read',
      label: '已读',
      type: 'switch',
      readonly: true,
      defaultValue: false,
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['title', 'type', 'priority', 'read', 'created_at'],
    searchFields: ['title', 'content'],
    pageSize: 10,
    statusBadge: {
      field: 'read',
      colorMap: {
        true: 'default',
        false: 'primary',
      },
      labelMap: {
        true: '已读',
        false: '未读',
      },
    },
    filters: [
      {
        id: 'type',
        label: '类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '系统', value: 'system' },
          { label: '审批', value: 'approval' },
          { label: '任务', value: 'task' },
          { label: '消息', value: 'message' },
        ],
      },
      {
        id: 'read',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '未读', value: 'unread' },
          { label: '已读', value: 'read' },
        ],
      },
    ],
  },

  actions: ['detail', 'delete'],

  formColCount: 2,
  detailTitle: '通知详情',
};
