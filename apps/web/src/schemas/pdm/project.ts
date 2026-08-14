import type { EntitySchema, BadgeColor } from '@/schema';
import i18n from '@/i18n';

const STATUS_OPTIONS = [
  { value: 'planning', label: i18n.t('pdm.project.k0') },
  { value: 'active', label: i18n.t('pdm.project.k1') },
  { value: 'on_hold', label: i18n.t('pdm.project.k2') },
  { value: 'completed', label: i18n.t('pdm.project.k3') },
  { value: 'cancelled', label: i18n.t('pdm.project.k4') },
];

const STATUS_COLOR_MAP: Record<string, BadgeColor> = {
  planning: 'warning',
  active: 'success',
  on_hold: 'warning',
  completed: 'primary',
  cancelled: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  planning: i18n.t('pdm.project.k5'),
  active: i18n.t('pdm.project.k6'),
  on_hold: i18n.t('pdm.project.k7'),
  completed: i18n.t('pdm.project.k8'),
  cancelled: i18n.t('pdm.project.k9'),
};

const PHASE_OPTIONS = [
  { value: 'initiation', label: i18n.t('pdm.project.k10') },
  { value: 'planning', label: i18n.t('pdm.project.k11') },
  { value: 'execution', label: i18n.t('pdm.project.k12') },
  { value: 'monitoring', label: i18n.t('pdm.project.k13') },
  { value: 'closing', label: i18n.t('pdm.project.k14') },
];

const PHASE_COLOR_MAP: Record<string, string> = {
  initiation: 'default',
  planning: 'warning',
  execution: 'primary',
  monitoring: 'success',
  closing: 'secondary',
};

const PHASE_LABEL_MAP: Record<string, string> = {
  initiation: i18n.t('pdm.project.k15'),
  planning: i18n.t('pdm.project.k16'),
  execution: i18n.t('pdm.project.k17'),
  monitoring: i18n.t('pdm.project.k18'),
  closing: i18n.t('pdm.project.k19'),
};

export const pdmProjectSchema: EntitySchema = {
  entity: 'pdm_project',
  title: i18n.t('shared.project.pdm_0'),
  description: i18n.t('pdm.project.k20'),

  api: {
    module: 'pdm',
    resource: 'projects',
  },

  fields: [
    {
      name: 'project_no',
      label: i18n.t('pdm.project.k21'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: i18n.t('pdm.project.k22'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'description',
      label: i18n.t('pdm.project.k23'),
      type: 'textarea',
      listWidth: 200,
      hideInList: true,
    },
    {
      name: 'status',
      label: i18n.t('pdm.project.k24'),
      type: 'select',
      defaultValue: 'planning',
      listWidth: 100,
      options: {
        type: 'static',
        options: STATUS_OPTIONS,
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'phase',
      label: i18n.t('pdm.project.k25'),
      type: 'select',
      defaultValue: 'initiation',
      listWidth: 100,
      options: {
        type: 'static',
        options: PHASE_OPTIONS,
      },
    },
    {
      name: 'start_date',
      label: i18n.t('pdm.project.k26'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('pdm.project.k27'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'budget',
      label: i18n.t('pdm.project.k28'),
      type: 'number',
      listWidth: 120,
      align: 'right',
      renderCell: (row: Record<string, unknown>) => {
        const value = row.budget as number;
        return value ? `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '-';
      },
    },
    {
      name: 'progress',
      label: i18n.t('pdm.project.k29'),
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => `${(row.progress as number) || 0}%`,
    },
    {
      name: 'member_count',
      label: i18n.t('pdm.project.k30'),
      type: 'number',
      listWidth: 80,
      align: 'center',
    },
  ],

  list: {
    columns: [
      'project_no',
      'name',
      'status',
      'phase',
      'start_date',
      'end_date',
      'progress',
      'member_count',
    ],
    searchFields: ['project_no', 'name', 'description'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('pdm.project.k31'),
        type: 'select',
        options: [{ label: i18n.t('pdm.project.k32'), value: 'all' }, ...STATUS_OPTIONS],
      },
      {
        id: 'phase',
        label: i18n.t('pdm.project.k33'),
        type: 'select',
        options: [{ label: i18n.t('pdm.project.k34'), value: 'all' }, ...PHASE_OPTIONS],
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('pdm.project.k35'),
      fields: ['project_no', 'name', 'description'],
    },
    {
      title: i18n.t('pdm.project.k36'),
      fields: ['status', 'phase', 'start_date', 'end_date'],
    },
    {
      title: i18n.t('pdm.project.k37'),
      fields: ['budget', 'progress'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.project.k38'),
  editTitle: i18n.t('pdm.project.k39'),
  detailTitle: i18n.t('pdm.project.k40'),

  actions: ['create', 'edit', 'detail', 'delete'],
};

export {
  STATUS_OPTIONS,
  STATUS_COLOR_MAP,
  STATUS_LABEL_MAP,
  PHASE_OPTIONS,
  PHASE_COLOR_MAP,
  PHASE_LABEL_MAP,
};
