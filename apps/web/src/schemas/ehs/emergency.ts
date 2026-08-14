import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const emergencyDrillSchema: EntitySchema = {
  entity: 'ehsEmergencyDrill',
  title: i18n.t('ehs.emergency.k0'),
  description: i18n.t('ehs.emergency.k1'),

  api: {
    module: 'ehs',
    resource: 'drills',
  },

  fields: [
    {
      name: 'drill_no',
      label: i18n.t('ehs.emergency.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'drill_name',
      label: i18n.t('ehs.emergency.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'drill_date',
      label: i18n.t('ehs.emergency.k4'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.drill_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'duration_hours',
      label: i18n.t('ehs.emergency.k5'),
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.duration_hours as number | null | undefined;
        return v != null ? String(v) : '-';
      },
    },
    {
      name: 'location',
      label: i18n.t('ehs.emergency.k6'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.location as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'participants',
      label: i18n.t('ehs.emergency.k7'),
      type: 'textarea',
      showInList: false,
      placeholder: i18n.t('ehs.emergency.k8'),
      colSpan: 2,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.participants;
        if (Array.isArray(v)) return v.join(', ') || '-';
        if (typeof v === 'string') return v || '-';
        return '-';
      },
    },
    {
      name: 'summary',
      label: i18n.t('ehs.emergency.k9'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'issues_found',
      label: i18n.t('ehs.emergency.k10'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'improvements',
      label: i18n.t('ehs.emergency.k11'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'status',
      label: i18n.t('ehs.emergency.k12'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('ehs.emergency.k13') },
          { value: 'planned', label: i18n.t('ehs.emergency.k14') },
          { value: 'ongoing', label: i18n.t('ehs.emergency.k15') },
          { value: 'completed', label: i18n.t('ehs.emergency.k16') },
          { value: 'cancelled', label: i18n.t('ehs.emergency.k17') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
  ],

  list: {
    columns: ['drill_no', 'drill_name', 'drill_date', 'duration_hours', 'location', 'status'],
    searchFields: ['drill_no', 'drill_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        planned: 'info',
        ongoing: 'warning',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('ehs.emergency.k18'),
        planned: i18n.t('ehs.emergency.k19'),
        ongoing: i18n.t('ehs.emergency.k20'),
        completed: i18n.t('ehs.emergency.k21'),
        cancelled: i18n.t('ehs.emergency.k22'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('ehs.emergency.k23'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.emergency.k24'), value: 'all' },
          { label: i18n.t('ehs.emergency.k25'), value: 'draft' },
          { label: i18n.t('ehs.emergency.k26'), value: 'planned' },
          { label: i18n.t('ehs.emergency.k27'), value: 'ongoing' },
          { label: i18n.t('ehs.emergency.k28'), value: 'completed' },
          { label: i18n.t('ehs.emergency.k29'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.emergency.k30'),
      fields: ['drill_no', 'drill_name', 'drill_date', 'duration_hours'],
    },
    {
      title: i18n.t('ehs.emergency.k31'),
      fields: ['location', 'status'],
    },
    {
      title: i18n.t('ehs.emergency.k32'),
      fields: ['participants', 'summary', 'issues_found', 'improvements'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.emergency.k33'),
  editTitle: i18n.t('ehs.emergency.k34'),
  detailTitle: i18n.t('ehs.emergency.k35'),
};
