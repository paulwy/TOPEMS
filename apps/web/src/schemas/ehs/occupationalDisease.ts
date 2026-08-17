import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const occupationalDiseaseSchema: EntitySchema = {
  entity: 'ehsOccupationalDiseaseCase',
  title: i18n.t('ehs.occupational_disease.k0'),
  description: i18n.t('ehs.occupational_disease.k1'),

  api: {
    module: 'ehs',
    resource: 'occupationalDiseases',
  },

  fields: [
    {
      name: 'case_no',
      label: i18n.t('ehs.occupational_disease.k2'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 150,
      showInForm: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.case_no as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'employee_name',
      label: i18n.t('ehs.occupational_disease.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'employee_id',
      label: i18n.t('ehs.occupational_disease.k4'),
      type: 'text',
      listWidth: 120,
      showInList: false,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'department',
      label: i18n.t('ehs.occupational_disease.k5'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.department as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'hazard_factor',
      label: i18n.t('ehs.occupational_disease.k6'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          {
            value: i18n.t('ehs.occupational_disease.k7'),
            label: i18n.t('ehs.occupational_disease.k8'),
          },
          {
            value: i18n.t('ehs.occupational_disease.k9'),
            label: i18n.t('ehs.occupational_disease.k10'),
          },
          {
            value: i18n.t('ehs.occupational_disease.k11'),
            label: i18n.t('ehs.occupational_disease.k12'),
          },
          {
            value: i18n.t('ehs.occupational_disease.k13'),
            label: i18n.t('ehs.occupational_disease.k14'),
          },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.hazard_factor as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'diagnosis_date',
      label: i18n.t('ehs.occupational_disease.k15'),
      type: 'date',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.diagnosis_date as string | null | undefined;
        return v ? new Date(v).toLocaleDateString('zh-CN') : '-';
      },
    },
    {
      name: 'disease_name',
      label: i18n.t('ehs.occupational_disease.k16'),
      type: 'text',
      required: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.disease_name as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'disease_type',
      label: i18n.t('ehs.occupational_disease.k17'),
      type: 'text',
      listWidth: 120,
      showInList: false,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'severity',
      label: i18n.t('ehs.occupational_disease.k18'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'mild', label: i18n.t('ehs.occupational_disease.k19') },
          { value: 'moderate', label: i18n.t('ehs.occupational_disease.k20') },
          { value: 'severe', label: i18n.t('ehs.occupational_disease.k21') },
          { value: 'fatal', label: i18n.t('ehs.occupational_disease.k22') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.severity as string;
        const map: Record<string, string> = {
          mild: i18n.t('ehs.occupational_disease.k23'),
          moderate: i18n.t('ehs.occupational_disease.k24'),
          severe: i18n.t('ehs.occupational_disease.k25'),
          fatal: i18n.t('ehs.occupational_disease.k26'),
        };
        return map[v] || v || '-';
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'status',
      label: i18n.t('ehs.occupational_disease.k27'),
      type: 'select',
      defaultValue: 'suspected',
      options: {
        type: 'static',
        options: [
          { value: 'suspected', label: i18n.t('ehs.occupational_disease.k28') },
          { value: 'confirmed', label: i18n.t('ehs.occupational_disease.k29') },
          { value: 'recovered', label: i18n.t('ehs.occupational_disease.k30') },
          { value: 'chronic', label: i18n.t('ehs.occupational_disease.k31') },
          { value: 'deceased', label: i18n.t('ehs.occupational_disease.k32') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.status as string;
        const map: Record<string, string> = {
          suspected: i18n.t('ehs.occupational_disease.k33'),
          confirmed: i18n.t('ehs.occupational_disease.k34'),
          recovered: i18n.t('ehs.occupational_disease.k35'),
          chronic: i18n.t('ehs.occupational_disease.k36'),
          deceased: i18n.t('ehs.occupational_disease.k37'),
        };
        return map[v] || v || '-';
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'diagnosis_hospital',
      label: i18n.t('ehs.occupational_disease.k38'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'treatment',
      label: i18n.t('ehs.occupational_disease.k39'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'description',
      label: i18n.t('ehs.occupational_disease.k40'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
  ],

  list: {
    columns: [
      'case_no',
      'employee_name',
      'department',
      'hazard_factor',
      'diagnosis_date',
      'disease_name',
      'severity',
      'status',
    ],
    searchFields: ['case_no', 'employee_name', 'disease_name', 'department'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        suspected: 'warning',
        confirmed: 'error',
        recovered: 'success',
        chronic: 'info',
        deceased: 'default',
      },
      labelMap: {
        suspected: i18n.t('ehs.occupational_disease.k41'),
        confirmed: i18n.t('ehs.occupational_disease.k42'),
        recovered: i18n.t('ehs.occupational_disease.k43'),
        chronic: i18n.t('ehs.occupational_disease.k44'),
        deceased: i18n.t('ehs.occupational_disease.k45'),
      },
    },
    filters: [
      {
        id: 'severity',
        label: i18n.t('ehs.occupational_disease.k46'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.occupational_disease.k47'), value: 'all' },
          { label: i18n.t('ehs.occupational_disease.k48'), value: 'mild' },
          { label: i18n.t('ehs.occupational_disease.k49'), value: 'moderate' },
          { label: i18n.t('ehs.occupational_disease.k50'), value: 'severe' },
          { label: i18n.t('ehs.occupational_disease.k51'), value: 'fatal' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('ehs.occupational_disease.k52'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.occupational_disease.k53'), value: 'all' },
          { label: i18n.t('ehs.occupational_disease.k54'), value: 'suspected' },
          { label: i18n.t('ehs.occupational_disease.k55'), value: 'confirmed' },
          { label: i18n.t('ehs.occupational_disease.k56'), value: 'recovered' },
          { label: i18n.t('ehs.occupational_disease.k57'), value: 'chronic' },
          { label: i18n.t('ehs.occupational_disease.k58'), value: 'deceased' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.occupational_disease.k59'),
      fields: ['employee_name', 'employee_id', 'department'],
    },
    {
      title: i18n.t('ehs.occupational_disease.k60'),
      fields: [
        'hazard_factor',
        'diagnosis_date',
        'disease_name',
        'disease_type',
        'diagnosis_hospital',
      ],
    },
    {
      title: i18n.t('ehs.occupational_disease.k61'),
      fields: ['severity', 'status'],
    },
    {
      title: i18n.t('ehs.occupational_disease.k62'),
      fields: ['treatment', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.occupational_disease.k63'),
  editTitle: i18n.t('ehs.occupational_disease.k64'),
  detailTitle: i18n.t('ehs.occupational_disease.k65'),
};
