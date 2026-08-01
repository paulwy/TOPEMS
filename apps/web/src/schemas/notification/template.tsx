import React from 'react';
import type { EntitySchema } from '@/schema';
import { FileText } from 'lucide-react';
import { Chip, Box, Typography } from '@mui/material';

const TYPE_LABELS: Record<string, string> = {
  system: '系统通知',
  workflow: '工作流',
  reminder: '提醒',
  message: '消息通知',
  info: '信息',
  success: '成功',
  warning: '警告',
  error: '错误',
  alert: '告警',
};

const TYPE_COLORS: Record<
  string,
  'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default'
> = {
  system: 'primary',
  workflow: 'secondary',
  reminder: 'warning',
  message: 'success',
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
  alert: 'error',
};

const STATUS_LABELS: Record<string, string> = {
  active: '启用',
  inactive: '禁用',
  draft: '草稿',
  deprecated: '已废弃',
};

const STATUS_COLORS: Record<string, 'success' | 'default' | 'warning' | 'error'> = {
  active: 'success',
  inactive: 'default',
  draft: 'warning',
  deprecated: 'error',
};

export const notificationTemplateSchema: EntitySchema = {
  entity: 'notification_template',
  title: '通知模板管理',
  description: '管理系统通知模板配置',

  api: {
    module: 'notification',
    resource: 'notification-templates',
  },

  fields: [
    {
      name: 'name',
      label: '模板名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 280,
      renderCell: (row: Record<string, unknown>) => {
        const t = row as any;
        const type = t.notification_type || 'info';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: `${TYPE_COLORS[type] || 'primary'}.100`,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText
                size={20}
                color='primary'
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.900' }}
              >
                {t.name}
              </Typography>
              {t.description && (
                <Typography
                  variant='caption'
                  sx={{
                    color: 'grey.500',
                    display: 'block',
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.description}
                </Typography>
              )}
            </Box>
          </Box>
        );
      },
    },
    {
      name: 'notification_type',
      label: '类型',
      type: 'select',
      required: true,
      listWidth: 120,
      options: {
        type: 'static',
        options: [
          { value: 'system', label: '系统通知' },
          { value: 'workflow', label: '工作流' },
          { value: 'reminder', label: '提醒' },
          { value: 'message', label: '消息通知' },
          { value: 'info', label: '信息' },
          { value: 'success', label: '成功' },
          { value: 'warning', label: '警告' },
          { value: 'error', label: '错误' },
          { value: 'alert', label: '告警' },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const type = (row as any).notification_type || 'info';
        const label = TYPE_LABELS[type] || type;
        const color = TYPE_COLORS[type] || 'primary';
        return (
          <Chip
            label={label}
            size='small'
            color={color}
            variant='outlined'
            sx={{ minWidth: 80 }}
          />
        );
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '禁用' },
          { value: 'draft', label: '草稿' },
          { value: 'deprecated', label: '已废弃' },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const status = (row as any).status || 'draft';
        const label = STATUS_LABELS[status] || status;
        const color = STATUS_COLORS[status] || 'default';
        const variant = status === 'active' ? 'filled' : 'outlined';
        return (
          <Chip
            label={label}
            size='small'
            color={color}
            variant={variant}
            sx={{ minWidth: 60 }}
          />
        );
      },
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {new Date((row as any).updated_at).toLocaleString('zh-CN')}
        </Typography>
      ),
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
      rows: 2,
    },
    {
      name: 'title_template',
      label: '标题模板',
      type: 'text',
      showInList: false,
    },
    {
      name: 'content_template',
      label: '内容模板',
      type: 'textarea',
      showInList: false,
      rows: 6,
    },
    {
      name: 'variables',
      label: '变量列表',
      type: 'text',
      showInList: false,
    },
    {
      name: 'default_priority',
      label: '默认优先级',
      type: 'number',
      showInList: false,
    },
  ],

  list: {
    columns: ['name', 'notification_type', 'status', 'updated_at'],
    searchFields: ['name', 'description'],
    pageSize: 10,
    filters: [
      {
        id: 'notification_type',
        label: '类型',
        type: 'select',
        options: [
          { value: '', label: '全部类型' },
          { value: 'system', label: '系统通知' },
          { value: 'workflow', label: '工作流' },
          { value: 'reminder', label: '提醒' },
          { value: 'message', label: '消息通知' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部状态' },
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '禁用' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'delete', 'detail'],

  formColCount: 2,
  createTitle: '新建模板',
  editTitle: '编辑模板',
  detailTitle: '模板详情',
};
