import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const healthManagementSchema: EntitySchema = {
  entity: 'ehsHealthRecord',
  title: i18n.t('ehs.health_management.k0'),
  description: i18n.t('ehs.health_management.k1'),

  api: {
    module: 'ehs',
    resource: 'healthRecords',
  },

  fields: [
    {
      name: 'record_no',
      label: i18n.t('ehs.health_management.k2'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      hideInForm: true,
      visibleWhen: () => false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.record_no as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'employee_id',
      label: i18n.t('ehs.health_management.k3'),
      type: 'text',
      required: true,
      listWidth: 120,
      showInList: false,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'employee_name',
      label: i18n.t('ehs.health_management.k4'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'gender',
      label: i18n.t('ehs.health_management.k5'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'male', label: i18n.t('ehs.health_management.k6') },
          { value: 'female', label: i18n.t('ehs.health_management.k7') },
        ],
      },
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'birthday',
      label: i18n.t('ehs.health_management.k8'),
      type: 'date',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.birthday as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'department',
      label: i18n.t('ehs.health_management.k9'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.department as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'position',
      label: i18n.t('ehs.health_management.k10'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.position as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'workplace',
      label: i18n.t('ehs.health_management.k11'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.workplace as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'blood_type',
      label: i18n.t('ehs.health_management.k12'),
      type: 'text',
      listWidth: 80,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.blood_type as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'contact_info',
      label: i18n.t('ehs.health_management.k13'),
      type: 'text',
      listWidth: 140,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.contact_info as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'allergy_history',
      label: i18n.t('ehs.health_management.k14'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'medical_history',
      label: i18n.t('ehs.health_management.k15'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'hazard_factors',
      label: i18n.t('ehs.health_management.k16'),
      type: 'text',
      showInList: false,
      hideInForm: true,
      visibleWhen: () => false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.hazard_factors;
        return Array.isArray(v) ? v.join(', ') : '-';
      },
    },
    {
      name: 'status',
      label: i18n.t('ehs.health_management.k17'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('ehs.health_management.k18') },
          { value: 'inactive', label: i18n.t('ehs.health_management.k19') },
          { value: 'suspended', label: i18n.t('ehs.health_management.k20') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['record_no', 'employee_name', 'department', 'position', 'workplace', 'status'],
    searchFields: ['employee_name', 'record_no', 'employee_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
        suspended: 'warning',
      },
      labelMap: {
        active: i18n.t('ehs.health_management.k21'),
        inactive: i18n.t('ehs.health_management.k22'),
        suspended: i18n.t('ehs.health_management.k23'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('ehs.health_management.k24'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.health_management.k25'), value: 'all' },
          { label: i18n.t('ehs.health_management.k26'), value: 'active' },
          { label: i18n.t('ehs.health_management.k27'), value: 'inactive' },
          { label: i18n.t('ehs.health_management.k28'), value: 'suspended' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.health_management.k29'),
      fields: ['employee_id', 'employee_name', 'gender', 'birthday'],
    },
    {
      title: i18n.t('ehs.health_management.k30'),
      fields: ['department', 'position', 'workplace'],
    },
    {
      title: i18n.t('ehs.health_management.k31'),
      fields: ['blood_type', 'contact_info', 'allergy_history', 'medical_history'],
    },
    {
      title: i18n.t('ehs.health_management.k32'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.health_management.k33'),
  editTitle: i18n.t('ehs.health_management.k34'),
  detailTitle: i18n.t('ehs.health_management.k35'),
};
