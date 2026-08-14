import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const typeLabels: Record<string, string> = {
  approval: i18n.t('shared.template.k0'),
  reimbursement: i18n.t('shared.template.k1'),
  purchase: i18n.t('shared.template.k2'),
  contract: i18n.t('shared.template.k3'),
};

const typeColorMap: Record<string, { bgcolor: string; color: string }> = {
  approval: { bgcolor: 'blue.100', color: 'blue.700' },
  reimbursement: { bgcolor: 'green.100', color: 'green.700' },
  purchase: { bgcolor: 'orange.100', color: 'orange.700' },
  contract: { bgcolor: 'purple.100', color: 'purple.700' },
};

const typeOptions = Object.entries(typeLabels).map(([value, label]) => ({
  value,
  label,
}));

export function renderTemplateTypeBadge(type: string): React.ReactNode {
  const config = typeColorMap[type] || { bgcolor: 'gray.100', color: 'gray.700' };
  const label = typeLabels[type] || type;
  return React.createElement(Chip, {
    size: 'small',
    sx: { bgcolor: config.bgcolor, color: config.color },
    label,
  });
}

export const workflowTemplateSchema: EntitySchema = {
  entity: 'workflow-template',
  title: i18n.t('shared.template.k4'),
  description: i18n.t('shared.template.k5'),

  api: {
    module: 'workflow',
    resource: 'workflows',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('shared.template.k6'),
      type: 'text',
      required: true,
      sortable: true,
      placeholder: i18n.t('shared.template.k7'),
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'type',
      label: i18n.t('shared.template.k8'),
      type: 'select',
      required: true,
      defaultValue: 'approval',
      options: {
        type: 'static',
        options: typeOptions,
      },
    },
    {
      name: 'scope',
      label: i18n.t('shared.template.k9'),
      type: 'text',
      defaultValue: i18n.t('shared.template.k10'),
      placeholder: i18n.t('shared.template.k11'),
    },
  ],

  list: {
    searchFields: ['name'],
    pageSize: 10,
    filters: [
      {
        id: 'type',
        label: i18n.t('shared.template.k12'),
        type: 'select',
        options: [{ label: i18n.t('shared.template.k13'), value: 'all' }, ...typeOptions],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.template.k14'),
      fields: ['name', 'type', 'scope'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.template.k15'),
  editTitle: i18n.t('shared.template.k16'),
  detailTitle: i18n.t('shared.template.k17'),
};
