import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  available: 'success',
  in_use: 'warning',
  maintenance: 'error',
  retired: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  available: i18n.t('shared.resource.k0'),
  in_use: i18n.t('shared.resource.k1'),
  maintenance: i18n.t('shared.resource.k2'),
  retired: i18n.t('shared.resource.k3'),
};

const RESOURCE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'server', label: i18n.t('shared.resource.k4') },
  { value: 'database', label: i18n.t('shared.resource.k5') },
  { value: 'workstation', label: i18n.t('shared.resource.k6') },
  { value: 'hardware', label: i18n.t('shared.resource.k7') },
  { value: 'software', label: i18n.t('shared.resource.k8') },
  { value: 'network', label: i18n.t('shared.resource.k9') },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'available', label: i18n.t('shared.resource.k10') },
  { value: 'in_use', label: i18n.t('shared.resource.k11') },
  { value: 'maintenance', label: i18n.t('shared.resource.k12') },
  { value: 'retired', label: i18n.t('shared.resource.k13') },
];

export const resourceSchema: EntitySchema = {
  entity: 'pm_resource',
  title: i18n.t('shared.resource.k14'),
  description: i18n.t('shared.resource.k15'),

  api: {
    module: 'pm',
    resource: 'resources',
  },

  fields: [
    {
      name: 'resource_id',
      label: i18n.t('shared.resource.k16'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'resource_type',
      label: i18n.t('shared.resource.k17'),
      type: 'select',
      required: true,
      defaultValue: 'server',
      options: { type: 'static', options: RESOURCE_TYPE_OPTIONS },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'resource_service',
      label: i18n.t('shared.resource.k18'),
      type: 'text',
      listWidth: 150,
    },
    {
      name: 'role',
      label: i18n.t('shared.resource.k19'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'allocation_percent',
      label: i18n.t('shared.resource.k20'),
      type: 'number',
      defaultValue: 100,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.allocation_percent as number | undefined;
        if (val === undefined || val === null) return '-';
        return `${val}%`;
      },
    },
    {
      name: 'status',
      label: i18n.t('shared.resource.k21'),
      type: 'select',
      defaultValue: 'available',
      options: { type: 'static', options: STATUS_OPTIONS },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'start_date',
      label: i18n.t('shared.resource.k22'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('shared.resource.k23'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'actual_hours',
      label: i18n.t('shared.resource.k24'),
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'actual_cost',
      label: i18n.t('shared.resource.k25'),
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'created_at',
      label: i18n.t('shared.resource.k26'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 150,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('shared.resource.k27'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'resource_id',
      'resource_type',
      'resource_service',
      'role',
      'allocation_percent',
      'status',
      'start_date',
      'end_date',
      'created_at',
    ],
    searchFields: ['resource_id', 'resource_service', 'resource_type'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
    filters: [
      {
        id: 'resource_type',
        label: i18n.t('shared.resource.k28'),
        type: 'select',
        options: [{ label: i18n.t('shared.resource.k29'), value: 'all' }, ...RESOURCE_TYPE_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('shared.resource.k30'),
        type: 'select',
        options: [{ label: i18n.t('shared.resource.k31'), value: 'all' }, ...STATUS_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('shared.resource.k32'),
      fields: ['resource_id', 'resource_type', 'resource_service', 'role'],
    },
    {
      title: i18n.t('shared.resource.k33'),
      fields: ['allocation_percent', 'status', 'start_date', 'end_date'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.resource.k34'),
  editTitle: i18n.t('shared.resource.k35'),
  detailTitle: i18n.t('shared.resource.k36'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
