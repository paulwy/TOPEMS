import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

// ============ 流程类型 ============

const categoryLabels: Record<string, string> = {
  approval: i18n.t('shared.definition.k0'),
  business: i18n.t('shared.definition.k1'),
  notification: i18n.t('shared.definition.k2'),
  automation: i18n.t('shared.definition.k3'),
};

const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({
  value,
  label,
}));

// ============ 流程状态 ============

const statusLabels: Record<string, string> = {
  active: i18n.t('shared.definition.k4'),
  draft: i18n.t('shared.definition.k5'),
  archived: i18n.t('shared.definition.k6'),
  disabled: i18n.t('shared.definition.k7'),
};

const statusColorMap: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  active: 'success',
  draft: 'default',
  archived: 'warning',
  disabled: 'error',
};

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
  value,
  label,
}));

// ============ Schema 定义 ============

export const workflowDefinitionSchema: EntitySchema = {
  entity: 'workflow-definition',
  title: i18n.t('shared.definition.k8'),
  description: i18n.t('shared.definition.k9'),

  api: {
    module: 'workflow',
    resource: 'workflows',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('shared.definition.k10'),
      type: 'text',
      required: true,
      sortable: true,
      placeholder: i18n.t('shared.definition.k11'),
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'code',
      label: i18n.t('shared.definition.k12'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      placeholder: i18n.t('shared.definition.k13'),
    },
    {
      name: 'category',
      label: i18n.t('shared.definition.k14'),
      type: 'select',
      required: true,
      defaultValue: 'approval',
      options: {
        type: 'static',
        options: categoryOptions,
      },
    },
    {
      name: 'version',
      label: i18n.t('shared.definition.k15'),
      type: 'text',
      defaultValue: 'v1.0',
      placeholder: i18n.t('shared.definition.k16'),
    },
    {
      name: 'status',
      label: i18n.t('shared.definition.k17'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: statusOptions,
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('shared.definition.k18'),
      type: 'textarea',
      placeholder: i18n.t('shared.definition.k19'),
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'node_count',
      label: i18n.t('shared.definition.k20'),
      type: 'number',
      defaultValue: 0,
      readonlyOnEdit: true,
    },
    {
      name: 'instance_count',
      label: i18n.t('shared.definition.k21'),
      type: 'number',
      defaultValue: 0,
      readonlyOnEdit: true,
    },
  ],

  list: {
    searchFields: ['name', 'code'],
    pageSize: 10,
    filters: [
      {
        id: 'category',
        label: i18n.t('shared.definition.k22'),
        type: 'select',
        options: [{ label: i18n.t('shared.definition.k23'), value: 'all' }, ...categoryOptions],
      },
      {
        id: 'status',
        label: i18n.t('shared.definition.k24'),
        type: 'select',
        options: [{ label: i18n.t('shared.definition.k25'), value: 'all' }, ...statusOptions],
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: statusColorMap,
      labelMap: statusLabels,
    },
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.definition.k26'),
      fields: ['name', 'code', 'category', 'version', 'status', 'description'],
    },
    {
      title: i18n.t('shared.definition.k27'),
      fields: ['node_count', 'instance_count'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.definition.k28'),
  editTitle: i18n.t('shared.definition.k29'),
  detailTitle: i18n.t('shared.definition.k30'),
};
