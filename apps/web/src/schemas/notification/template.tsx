import React from 'react';
import type { EntitySchema } from '@/schema';
import { FileText } from 'lucide-react';
import { Chip, Box, Typography } from '@mui/material';
import i18n from '@/i18n';

const TYPE_LABELS: Record<string, string> = {
  system: i18n.t('shared.template.k0'),
  workflow: i18n.t('shared.template.k1'),
  reminder: i18n.t('shared.template.k2'),
  message: i18n.t('shared.template.k3'),
  info: i18n.t('shared.template.k4'),
  success: i18n.t('shared.template.k5'),
  warning: i18n.t('shared.template.k6'),
  error: i18n.t('shared.template.k7'),
  alert: i18n.t('shared.template.k8'),
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
  active: i18n.t('shared.template.k9'),
  inactive: i18n.t('shared.template.k10'),
  draft: i18n.t('shared.template.k11'),
  deprecated: i18n.t('shared.template.k12'),
};

const STATUS_COLORS: Record<string, 'success' | 'default' | 'warning' | 'error'> = {
  active: 'success',
  inactive: 'default',
  draft: 'warning',
  deprecated: 'error',
};

export const notificationTemplateSchema: EntitySchema = {
  entity: 'notification_template',
  title: i18n.t('shared.template.k13'),
  description: i18n.t('shared.template.k14'),

  api: {
    module: 'notification',
    resource: 'notification-templates',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('shared.template.k15'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 280,
      renderCell: (row: Record<string, unknown>) => {
        const type = String(row['notification_type'] || 'info');
        const name = String(row['name'] || '');
        const description = row['description'] as string | undefined;
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
                {name}
              </Typography>
              {description && (
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
                  {description}
                </Typography>
              )}
            </Box>
          </Box>
        );
      },
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'notification_type',
      label: i18n.t('shared.template.k16'),
      type: 'select',
      required: true,
      listWidth: 120,
      options: {
        type: 'static',
        options: [
          { value: 'system', label: i18n.t('shared.template.k17') },
          { value: 'workflow', label: i18n.t('shared.template.k18') },
          { value: 'reminder', label: i18n.t('shared.template.k19') },
          { value: 'message', label: i18n.t('shared.template.k20') },
          { value: 'info', label: i18n.t('shared.template.k21') },
          { value: 'success', label: i18n.t('shared.template.k22') },
          { value: 'warning', label: i18n.t('shared.template.k23') },
          { value: 'error', label: i18n.t('shared.template.k24') },
          { value: 'alert', label: i18n.t('shared.template.k25') },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const type = String(row['notification_type'] || 'info');
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
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'status',
      label: i18n.t('shared.template.k26'),
      type: 'select',
      required: true,
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('shared.template.k27') },
          { value: 'inactive', label: i18n.t('shared.template.k28') },
          { value: 'draft', label: i18n.t('shared.template.k29') },
          { value: 'deprecated', label: i18n.t('shared.template.k30') },
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
      label: i18n.t('shared.template.k31'),
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
      label: i18n.t('shared.template.k32'),
      type: 'textarea',
      showInList: false,
      rows: 2,
    },
    {
      name: 'title_template',
      label: i18n.t('shared.template.k33'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'content_template',
      label: i18n.t('shared.template.k34'),
      type: 'textarea',
      showInList: false,
      rows: 6,
    },
    {
      name: 'variables',
      label: i18n.t('shared.template.k35'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'default_priority',
      label: i18n.t('shared.template.k36'),
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
        label: i18n.t('shared.template.k37'),
        type: 'select',
        options: [
          { value: '', label: i18n.t('shared.template.k38') },
          { value: 'system', label: i18n.t('shared.template.k39') },
          { value: 'workflow', label: i18n.t('shared.template.k40') },
          { value: 'reminder', label: i18n.t('shared.template.k41') },
          { value: 'message', label: i18n.t('shared.template.k42') },
        ],
      },
      {
        id: 'status',
        label: i18n.t('shared.template.k43'),
        type: 'select',
        options: [
          { value: '', label: i18n.t('shared.template.k44') },
          { value: 'active', label: i18n.t('shared.template.k45') },
          { value: 'inactive', label: i18n.t('shared.template.k46') },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'delete', 'detail'],

  formColCount: 2,
  createTitle: i18n.t('shared.template.k47'),
  editTitle: i18n.t('shared.template.k48'),
  detailTitle: i18n.t('shared.template.k49'),
};
