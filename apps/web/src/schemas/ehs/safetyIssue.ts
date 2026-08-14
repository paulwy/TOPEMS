import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const safetyIssueSchema: EntitySchema = {
  entity: 'ehsSafetyIssue',
  title: i18n.t('ehs.safety_issue.k0'),
  description: i18n.t('ehs.safety_issue.k1'),

  api: {
    module: 'ehs',
    resource: 'safetyIssues',
  },

  fields: [
    {
      name: 'hazard_no',
      label: i18n.t('ehs.safety_issue.k2'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      showInForm: false,
    },
    {
      name: 'title',
      label: i18n.t('ehs.safety_issue.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'category',
      label: i18n.t('ehs.safety_issue.k4'),
      type: 'select',
      required: true,
      defaultValue: 'equipment',
      options: {
        type: 'static',
        options: [
          { value: 'equipment', label: i18n.t('ehs.safety_issue.k5') },
          { value: 'environment', label: i18n.t('ehs.safety_issue.k6') },
          { value: 'behavior', label: i18n.t('ehs.safety_issue.k7') },
          { value: 'management', label: i18n.t('ehs.safety_issue.k8') },
          { value: 'fire', label: i18n.t('ehs.safety_issue.k9') },
          { value: 'electrical', label: i18n.t('ehs.safety_issue.k10') },
          { value: 'chemical', label: i18n.t('ehs.safety_issue.k11') },
          { value: 'structural', label: i18n.t('ehs.safety_issue.k12') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.category as string;
        const map: Record<string, string> = {
          equipment: i18n.t('ehs.safety_issue.k13'),
          environment: i18n.t('ehs.safety_issue.k14'),
          behavior: i18n.t('ehs.safety_issue.k15'),
          management: i18n.t('ehs.safety_issue.k16'),
          fire: i18n.t('ehs.safety_issue.k17'),
          electrical: i18n.t('ehs.safety_issue.k18'),
          chemical: i18n.t('ehs.safety_issue.k19'),
          structural: i18n.t('ehs.safety_issue.k20'),
        };
        return map[v] || v || '-';
      },
    },
    {
      name: 'level',
      label: i18n.t('ehs.safety_issue.k21'),
      type: 'select',
      required: true,
      defaultValue: 'general',
      options: {
        type: 'static',
        options: [
          { value: 'major', label: i18n.t('ehs.safety_issue.k22') },
          { value: 'serious', label: i18n.t('ehs.safety_issue.k23') },
          { value: 'general', label: i18n.t('ehs.safety_issue.k24') },
          { value: 'minor', label: i18n.t('ehs.safety_issue.k25') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.level as string;
        const map: Record<string, string> = {
          major: i18n.t('ehs.safety_issue.k26'),
          serious: i18n.t('ehs.safety_issue.k27'),
          general: i18n.t('ehs.safety_issue.k28'),
          minor: i18n.t('ehs.safety_issue.k29'),
        };
        return map[v] || v || '-';
      },
    },
    {
      name: 'source',
      label: i18n.t('ehs.safety_issue.k30'),
      type: 'select',
      required: true,
      defaultValue: 'inspection',
      options: {
        type: 'static',
        options: [
          { value: 'inspection', label: i18n.t('ehs.safety_issue.k31') },
          { value: 'reporting', label: i18n.t('ehs.safety_issue.k32') },
          { value: 'audit', label: i18n.t('ehs.safety_issue.k33') },
          { value: 'accident', label: i18n.t('ehs.safety_issue.k34') },
          { value: 'monitoring', label: i18n.t('ehs.safety_issue.k35') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.source as string;
        const map: Record<string, string> = {
          inspection: i18n.t('ehs.safety_issue.k36'),
          reporting: i18n.t('ehs.safety_issue.k37'),
          audit: i18n.t('ehs.safety_issue.k38'),
          accident: i18n.t('ehs.safety_issue.k39'),
          monitoring: i18n.t('ehs.safety_issue.k40'),
        };
        return map[v] || v || '-';
      },
    },
    {
      name: 'location',
      label: i18n.t('ehs.safety_issue.k41'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.location as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'reported_by',
      label: i18n.t('ehs.safety_issue.k42'),
      type: 'text',
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.reported_by as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'reported_at',
      label: i18n.t('ehs.safety_issue.k43'),
      type: 'datetime',
      listWidth: 160,
      showInForm: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.reported_at as string | null | undefined;
        return v ? new Date(v).toLocaleString('zh-CN') : '-';
      },
    },
    {
      name: 'status',
      label: i18n.t('ehs.safety_issue.k44'),
      type: 'select',
      defaultValue: 'reported',
      options: {
        type: 'static',
        options: [
          { value: 'reported', label: i18n.t('ehs.safety_issue.k45') },
          { value: 'rectifying', label: i18n.t('ehs.safety_issue.k46') },
          { value: 'pending_verification', label: i18n.t('ehs.safety_issue.k47') },
          { value: 'verified', label: i18n.t('ehs.safety_issue.k48') },
          { value: 'closed', label: i18n.t('ehs.safety_issue.k49') },
          { value: 'rejected', label: i18n.t('ehs.safety_issue.k50') },
        ],
      },
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'description',
      label: i18n.t('ehs.safety_issue.k51'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
  ],

  list: {
    columns: [
      'hazard_no',
      'title',
      'level',
      'category',
      'location',
      'source',
      'reported_by',
      'status',
    ],
    searchFields: ['title', 'hazard_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        reported: 'error',
        rectifying: 'warning',
        pending_verification: 'info',
        verified: 'success',
        closed: 'default',
        rejected: 'error',
      },
      labelMap: {
        reported: i18n.t('ehs.safety_issue.k52'),
        rectifying: i18n.t('ehs.safety_issue.k53'),
        pending_verification: i18n.t('ehs.safety_issue.k54'),
        verified: i18n.t('ehs.safety_issue.k55'),
        closed: i18n.t('ehs.safety_issue.k56'),
        rejected: i18n.t('ehs.safety_issue.k57'),
      },
    },
    filters: [
      {
        id: 'level',
        label: i18n.t('ehs.safety_issue.k58'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.safety_issue.k59'), value: 'all' },
          { label: i18n.t('ehs.safety_issue.k60'), value: 'major' },
          { label: i18n.t('ehs.safety_issue.k61'), value: 'serious' },
          { label: i18n.t('ehs.safety_issue.k62'), value: 'general' },
          { label: i18n.t('ehs.safety_issue.k63'), value: 'minor' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('ehs.safety_issue.k64'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.safety_issue.k65'), value: 'all' },
          { label: i18n.t('ehs.safety_issue.k66'), value: 'reported' },
          { label: i18n.t('ehs.safety_issue.k67'), value: 'rectifying' },
          { label: i18n.t('ehs.safety_issue.k68'), value: 'pending_verification' },
          { label: i18n.t('ehs.safety_issue.k69'), value: 'verified' },
          { label: i18n.t('ehs.safety_issue.k70'), value: 'closed' },
          { label: i18n.t('ehs.safety_issue.k71'), value: 'rejected' },
        ],
      },
    ],
  },

  actions: ['create', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.safety_issue.k72'),
      fields: ['title', 'category', 'level'],
    },
    {
      title: i18n.t('ehs.safety_issue.k73'),
      fields: ['source', 'location', 'reported_by'],
    },
    {
      title: i18n.t('ehs.safety_issue.k74'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.safety_issue.k75'),
  editTitle: i18n.t('ehs.safety_issue.k76'),
  detailTitle: i18n.t('ehs.safety_issue.k77'),
};
