import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const contraindicationSchema: EntitySchema = {
  entity: 'ehsContraindication',
  title: i18n.t('ehs.contraindication.k0'),
  description: i18n.t('ehs.contraindication.k1'),

  api: {
    module: 'ehs',
    resource: 'contraindications',
  },

  // 批 17：写权限资源前缀（API 资源名 → DB 资源名语义映射）
  permissionResource: 'ehs:occupational_disease',

  fields: [
    {
      name: 'employee_name',
      label: i18n.t('ehs.contraindication.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'contraindication_type',
      label: i18n.t('ehs.contraindication.k3'),
      type: 'text',
      required: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'hazard_factor',
      label: i18n.t('ehs.contraindication.k4'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.hazard_factor as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'diagnosed_at',
      label: i18n.t('ehs.contraindication.k5'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.diagnosed_at as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'diagnosis_hospital',
      label: i18n.t('ehs.contraindication.k6'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.diagnosis_hospital as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'description',
      label: i18n.t('ehs.contraindication.k7'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'restrictions',
      label: i18n.t('ehs.contraindication.k8'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('ehs.contraindication.k9'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('ehs.contraindication.k10') },
          { value: 'recovered', label: i18n.t('ehs.contraindication.k11') },
          { value: 'permanent', label: i18n.t('ehs.contraindication.k12') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['employee_name', 'contraindication_type', 'hazard_factor', 'diagnosed_at', 'status'],
    searchFields: ['employee_name', 'contraindication_type'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'error',
        recovered: 'success',
        permanent: 'warning',
      },
      labelMap: {
        active: i18n.t('ehs.contraindication.k10'),
        recovered: i18n.t('ehs.contraindication.k11'),
        permanent: i18n.t('ehs.contraindication.k12'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('ehs.contraindication.k9'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.contraindication.k13'), value: 'all' },
          { label: i18n.t('ehs.contraindication.k10'), value: 'active' },
          { label: i18n.t('ehs.contraindication.k11'), value: 'recovered' },
          { label: i18n.t('ehs.contraindication.k12'), value: 'permanent' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.contraindication.k14'),
      fields: ['employee_name', 'contraindication_type', 'hazard_factor'],
    },
    {
      title: i18n.t('ehs.contraindication.k15'),
      fields: ['diagnosed_at', 'diagnosis_hospital', 'description'],
    },
    {
      title: i18n.t('ehs.contraindication.k16'),
      fields: ['restrictions', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.contraindication.k17'),
  editTitle: i18n.t('ehs.contraindication.k18'),
  detailTitle: i18n.t('ehs.contraindication.k19'),
};
