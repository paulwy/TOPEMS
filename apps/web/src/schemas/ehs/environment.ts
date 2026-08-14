import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const environmentMonitorSchema: EntitySchema = {
  entity: 'ehsEnvironmentMonitor',
  title: i18n.t('ehs.environment.k0'),
  description: i18n.t('ehs.environment.k1'),

  api: {
    module: 'ehs',
    resource: 'environmentMonitors',
  },

  fields: [
    {
      name: 'monitor_no',
      label: i18n.t('ehs.environment.k2'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'name',
      label: i18n.t('ehs.environment.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'monitor_type',
      label: i18n.t('ehs.environment.k4'),
      type: 'select',
      required: true,
      defaultValue: i18n.t('ehs.environment.k5'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('ehs.environment.k6'), label: i18n.t('ehs.environment.k7') },
          { value: i18n.t('ehs.environment.k8'), label: i18n.t('ehs.environment.k9') },
          { value: i18n.t('ehs.environment.k10'), label: i18n.t('ehs.environment.k11') },
          { value: i18n.t('ehs.environment.k12'), label: i18n.t('ehs.environment.k13') },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'location',
      label: i18n.t('ehs.environment.k14'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.location as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'monitor_frequency',
      label: i18n.t('ehs.environment.k15'),
      type: 'text',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.monitor_frequency as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'standard_value',
      label: i18n.t('ehs.environment.k16'),
      type: 'text',
      listWidth: 100,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.standard_value as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'unit',
      label: i18n.t('ehs.environment.k17'),
      type: 'text',
      listWidth: 80,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.unit as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'warning_threshold',
      label: i18n.t('ehs.environment.k18'),
      type: 'number',
      listWidth: 100,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.warning_threshold as number | null | undefined;
        return v != null ? String(v) : '-';
      },
    },
    {
      name: 'alarm_threshold',
      label: i18n.t('ehs.environment.k19'),
      type: 'number',
      listWidth: 100,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.alarm_threshold as number | null | undefined;
        return v != null ? String(v) : '-';
      },
    },
    {
      name: 'status',
      label: i18n.t('ehs.environment.k20'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('ehs.environment.k21') },
          { value: 'inactive', label: i18n.t('ehs.environment.k22') },
          { value: 'maintenance', label: i18n.t('ehs.environment.k23') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('ehs.environment.k24'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
  ],

  list: {
    columns: ['monitor_no', 'name', 'monitor_type', 'location', 'status'],
    searchFields: ['name', 'monitor_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
        maintenance: 'warning',
      },
      labelMap: {
        active: i18n.t('ehs.environment.k25'),
        inactive: i18n.t('ehs.environment.k26'),
        maintenance: i18n.t('ehs.environment.k27'),
      },
    },
    filters: [
      {
        id: 'monitor_type',
        label: i18n.t('ehs.environment.k28'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.environment.k29'), value: 'all' },
          { label: i18n.t('ehs.environment.k30'), value: i18n.t('ehs.environment.k31') },
          { label: i18n.t('ehs.environment.k32'), value: i18n.t('ehs.environment.k33') },
          { label: i18n.t('ehs.environment.k34'), value: i18n.t('ehs.environment.k35') },
          { label: i18n.t('ehs.environment.k36'), value: i18n.t('ehs.environment.k37') },
        ],
      },
      {
        id: 'status',
        label: i18n.t('ehs.environment.k38'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.environment.k39'), value: 'all' },
          { label: i18n.t('ehs.environment.k40'), value: 'active' },
          { label: i18n.t('ehs.environment.k41'), value: 'inactive' },
          { label: i18n.t('ehs.environment.k42'), value: 'maintenance' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.environment.k43'),
      fields: ['name', 'monitor_type', 'location', 'status'],
    },
    {
      title: i18n.t('ehs.environment.k44'),
      fields: [
        'monitor_frequency',
        'standard_value',
        'unit',
        'warning_threshold',
        'alarm_threshold',
      ],
    },
    {
      title: i18n.t('ehs.environment.k45'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.environment.k46'),
  editTitle: i18n.t('ehs.environment.k47'),
  detailTitle: i18n.t('ehs.environment.k48'),
};
