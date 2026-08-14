import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const drillSchema: EntitySchema = {
  entity: 'ehsDrill',
  title: i18n.t('ehs.drill.k0'),
  description: i18n.t('ehs.drill.k1'),

  api: {
    module: 'ehs',
    resource: 'drills',
  },

  fields: [
    {
      name: 'drill_no',
      label: i18n.t('ehs.drill.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'drill_name',
      label: i18n.t('ehs.drill.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'drill_date',
      label: i18n.t('ehs.drill.k4'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.drill_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'duration_hours',
      label: i18n.t('ehs.drill.k5'),
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
      label: i18n.t('ehs.drill.k6'),
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
      label: i18n.t('ehs.drill.k7'),
      type: 'textarea',
      showInList: false,
      placeholder: i18n.t('ehs.drill.k8'),
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
      label: i18n.t('ehs.drill.k9'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'issues_found',
      label: i18n.t('ehs.drill.k10'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'improvements',
      label: i18n.t('ehs.drill.k11'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'status',
      label: i18n.t('ehs.drill.k12'),
      type: 'select',
      defaultValue: 'scheduled',
      options: {
        type: 'static',
        options: [
          { value: 'scheduled', label: i18n.t('ehs.drill.k13') },
          { value: 'in_progress', label: i18n.t('ehs.drill.k14') },
          { value: 'completed', label: i18n.t('ehs.drill.k15') },
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
        scheduled: 'info',
        in_progress: 'warning',
        completed: 'success',
      },
      labelMap: {
        scheduled: i18n.t('ehs.drill.k16'),
        in_progress: i18n.t('ehs.drill.k17'),
        completed: i18n.t('ehs.drill.k18'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('ehs.drill.k19'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.drill.k20'), value: 'all' },
          { label: i18n.t('ehs.drill.k21'), value: 'scheduled' },
          { label: i18n.t('ehs.drill.k22'), value: 'in_progress' },
          { label: i18n.t('ehs.drill.k23'), value: 'completed' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.drill.k24'),
      fields: ['drill_no', 'drill_name', 'drill_date', 'duration_hours'],
    },
    {
      title: i18n.t('ehs.drill.k25'),
      fields: ['location', 'status'],
    },
    {
      title: i18n.t('ehs.drill.k26'),
      fields: ['participants', 'summary', 'issues_found', 'improvements'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.drill.k27'),
  editTitle: i18n.t('ehs.drill.k28'),
  detailTitle: i18n.t('ehs.drill.k29'),
};
