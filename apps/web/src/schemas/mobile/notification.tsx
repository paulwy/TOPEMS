import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

type NotificationType = 'system' | 'approval' | 'task' | 'message';
type NotificationPriority = 'high' | 'medium' | 'low';

const TYPE_LABELS: Record<NotificationType, string> = {
  system: i18n.t('shared.notification.k0'),
  approval: i18n.t('shared.notification.k1'),
  task: i18n.t('shared.notification.k2'),
  message: i18n.t('shared.notification.k3'),
};

const PRIORITY_COLORS: Record<NotificationPriority, 'error' | 'warning' | 'info'> = {
  high: 'error',
  medium: 'warning',
  low: 'info',
};

export const notificationSchema: EntitySchema = {
  entity: 'mobile_notification',
  title: i18n.t('shared.notification.k4'),
  description: i18n.t('shared.notification.k5'),

  api: {
    module: 'mobile',
    resource: 'notifications',
  },

  fields: [
    {
      name: 'title',
      label: i18n.t('shared.notification.k6'),
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'content',
      label: i18n.t('shared.notification.k7'),
      type: 'textarea',
      readonly: true,
      listWidth: 300,
    },
    {
      name: 'type',
      label: i18n.t('shared.notification.k8'),
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: [
          { value: 'system', label: i18n.t('shared.notification.k9') },
          { value: 'approval', label: i18n.t('shared.notification.k10') },
          { value: 'task', label: i18n.t('shared.notification.k11') },
          { value: 'alert', label: i18n.t('shared.notification.k12') },
          { value: 'message', label: i18n.t('shared.notification.k13') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        TYPE_LABELS[row.type as NotificationType] || String(row.type ?? ''),
    },
    {
      name: 'priority',
      label: i18n.t('shared.notification.k14'),
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: [
          { value: 'high', label: i18n.t('shared.notification.k15') },
          { value: 'medium', label: i18n.t('shared.notification.k16') },
          { value: 'low', label: i18n.t('shared.notification.k17') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'read',
      label: i18n.t('shared.notification.k18'),
      type: 'switch',
      readonly: true,
      defaultValue: false,
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: i18n.t('shared.notification.k19'),
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
        true: i18n.t('shared.notification.k20'),
        false: i18n.t('shared.notification.k21'),
      },
    },
    filters: [
      {
        id: 'type',
        label: i18n.t('shared.notification.k22'),
        type: 'select',
        options: [
          { label: i18n.t('shared.notification.k23'), value: 'all' },
          { label: i18n.t('shared.notification.k24'), value: 'system' },
          { label: i18n.t('shared.notification.k25'), value: 'approval' },
          { label: i18n.t('shared.notification.k26'), value: 'task' },
          { label: i18n.t('shared.notification.k27'), value: 'message' },
        ],
      },
      {
        id: 'read',
        label: i18n.t('shared.notification.k28'),
        type: 'select',
        options: [
          { label: i18n.t('shared.notification.k29'), value: 'all' },
          { label: i18n.t('shared.notification.k30'), value: 'unread' },
          { label: i18n.t('shared.notification.k31'), value: 'read' },
        ],
      },
    ],
  },

  actions: ['detail', 'delete'],

  formColCount: 2,
  detailTitle: i18n.t('shared.notification.k32'),
};
