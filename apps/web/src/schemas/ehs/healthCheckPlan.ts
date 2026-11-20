import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';

export const healthCheckPlanSchema: EntitySchema = {
  entity: 'ehsHealthCheckPlan',
  title: i18n.t('ehs.health_check_plan.k0'),
  description: i18n.t('ehs.health_check_plan.k1'),

  api: {
    module: 'ehs',
    resource: 'checkPlans',
  },

  // 批 17：写权限资源前缀（API 资源名 → DB 资源名语义映射）
  permissionResource: 'ehs:check',

  fields: [
    {
      name: 'plan_no',
      label: i18n.t('ehs.health_check_plan.k2'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      hideInForm: true,
      visibleWhen: () => false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.plan_no as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'title',
      label: i18n.t('ehs.health_check_plan.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'check_type',
      label: i18n.t('ehs.health_check_plan.k4'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.check_type as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'category',
      label: i18n.t('ehs.health_check_plan.k5'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.category as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'check_date',
      label: i18n.t('ehs.health_check_plan.k6'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.check_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'end_date',
      label: i18n.t('ehs.health_check_plan.k7'),
      type: 'date',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.end_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'location',
      label: i18n.t('ehs.health_check_plan.k8'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.location as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'hospital',
      label: i18n.t('ehs.health_check_plan.k9'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.hospital as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'participants',
      label: i18n.t('ehs.health_check_plan.k10'),
      type: 'textarea',
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.participants;
        return Array.isArray(v) ? v.join(', ') || '-' : '-';
      },
    },
    {
      name: 'hazard_factors',
      label: i18n.t('ehs.health_check_plan.k11'),
      type: 'textarea',
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.hazard_factors;
        return Array.isArray(v) ? v.join(', ') || '-' : '-';
      },
    },
    {
      name: 'checkitems',
      label: i18n.t('ehs.health_check_plan.k12'),
      type: 'textarea',
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.checkitems;
        return Array.isArray(v) ? v.join(', ') || '-' : '-';
      },
    },
    {
      name: 'status',
      label: i18n.t('ehs.health_check_plan.k13'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('ehs.health_check_plan.k14') },
          { value: 'published', label: i18n.t('ehs.health_check_plan.k15') },
          { value: 'ongoing', label: i18n.t('ehs.health_check_plan.k16') },
          { value: 'completed', label: i18n.t('ehs.health_check_plan.k17') },
          { value: 'cancelled', label: i18n.t('ehs.health_check_plan.k18') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['plan_no', 'title', 'check_type', 'check_date', 'status'],
    searchFields: ['title', 'plan_no', 'check_type'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        published: 'info',
        ongoing: 'warning',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('ehs.health_check_plan.k14'),
        published: i18n.t('ehs.health_check_plan.k15'),
        ongoing: i18n.t('ehs.health_check_plan.k16'),
        completed: i18n.t('ehs.health_check_plan.k17'),
        cancelled: i18n.t('ehs.health_check_plan.k18'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('ehs.health_check_plan.k13'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.health_check_plan.k19'), value: 'all' },
          { label: i18n.t('ehs.health_check_plan.k14'), value: 'draft' },
          { label: i18n.t('ehs.health_check_plan.k15'), value: 'published' },
          { label: i18n.t('ehs.health_check_plan.k16'), value: 'ongoing' },
          { label: i18n.t('ehs.health_check_plan.k17'), value: 'completed' },
          { label: i18n.t('ehs.health_check_plan.k18'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.health_check_plan.k20'),
      fields: ['title', 'check_type', 'category', 'check_date', 'end_date'],
    },
    {
      title: i18n.t('ehs.health_check_plan.k21'),
      fields: ['location', 'hospital', 'participants', 'hazard_factors', 'checkitems'],
    },
    {
      title: i18n.t('ehs.health_check_plan.k22'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.health_check_plan.k23'),
  editTitle: i18n.t('ehs.health_check_plan.k24'),
  detailTitle: i18n.t('ehs.health_check_plan.k25'),
};
