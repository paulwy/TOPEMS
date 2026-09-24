import type { EntitySchema } from '@/schema';
import { departmentApi } from '@/api/hrm';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const getStatusOptions = () => [
  { value: 'active', label: i18n.t('hrm.employee.k0') },
  { value: 'inactive', label: i18n.t('hrm.employee.k1') },
  { value: 'leave', label: i18n.t('hrm.employee.k2') },
];

const STATUS_COLOR_MAP: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  active: 'success',
  inactive: 'default',
  leave: 'warning',
};

const getStatusLabelMap = (): Record<string, string> => ({
  active: i18n.t('hrm.employee.k3'),
  inactive: i18n.t('hrm.employee.k4'),
  leave: i18n.t('hrm.employee.k5'),
});

const getGenderOptions = () => [
  { value: 'male', label: i18n.t('hrm.employee.k6') },
  { value: 'female', label: i18n.t('hrm.employee.k7') },
];

const getEducationOptions = () => [
  { value: 'high_school', label: i18n.t('hrm.employee.k8') },
  { value: 'college', label: i18n.t('hrm.employee.k9') },
  { value: 'bachelor', label: i18n.t('hrm.employee.k10') },
  { value: 'master', label: i18n.t('hrm.employee.k11') },
  { value: 'doctor', label: i18n.t('hrm.employee.k12') },
];

const getEmployeeTypeOptions = () => [
  { value: 'full_time', label: i18n.t('hrm.employee.k13') },
  { value: 'part_time', label: i18n.t('hrm.employee.k14') },
  { value: 'contractor', label: i18n.t('hrm.employee.k15') },
  { value: 'intern', label: i18n.t('hrm.employee.k16') },
];

export const getEmployeeSchema = (): EntitySchema => {
  const STATUS_OPTIONS = getStatusOptions();
  const STATUS_LABEL_MAP = getStatusLabelMap();
  const GENDER_OPTIONS = getGenderOptions();
  const EDUCATION_OPTIONS = getEducationOptions();
  const EMPLOYEE_TYPE_OPTIONS = getEmployeeTypeOptions();

  return {
    entity: 'hrm_employee',
    title: i18n.t('hrm.employee.k17'),
    description: i18n.t('hrm.employee.k18'),

    api: {
      module: 'hrm',
      resource: 'employees',
    },

    fields: [
      {
        name: 'employee_no',
        label: i18n.t('hrm.employee.k19'),
        type: 'text',
        required: true,
        readonlyOnEdit: true,
        sortable: true,
        listWidth: 120,
        validation: [{ type: 'maxLength', value: 50 }],
      },
      {
        name: 'name',
        label: i18n.t('hrm.employee.k20'),
        type: 'text',
        required: true,
        sortable: true,
        listWidth: 120,
        validation: [{ type: 'maxLength', value: 255 }],
      },
      {
        name: 'gender',
        label: i18n.t('hrm.employee.k21'),
        type: 'select',
        defaultValue: 'male',
        listWidth: 80,
        options: {
          type: 'static',
          options: GENDER_OPTIONS,
        },
        validation: [{ type: 'maxLength', value: 20 }],
      },
      {
        name: 'department_id',
        label: i18n.t('hrm.employee.k22'),
        type: 'select',
        listWidth: 140,
        options: {
          type: 'dynamic',
          resolver: 'departments',
        },
        renderCell: (row: Record<string, unknown>) => {
          return (row.department_name as string) || (row.department_id as string) || '-';
        },
      },
      {
        name: 'position',
        label: i18n.t('hrm.employee.k23'),
        type: 'text',
        listWidth: 120,
        validation: [{ type: 'maxLength', value: 255 }],
      },
      {
        name: 'joblevel',
        label: i18n.t('hrm.employee.k24'),
        type: 'text',
        listWidth: 100,
      },
      {
        name: 'email',
        label: i18n.t('hrm.employee.k25'),
        type: 'text',
        listWidth: 160,
        validation: [{ type: 'maxLength', value: 100 }],
      },
      {
        name: 'phone',
        label: i18n.t('hrm.employee.k26'),
        type: 'text',
        listWidth: 120,
        validation: [{ type: 'maxLength', value: 50 }],
      },
      {
        name: 'hire_date',
        label: i18n.t('hrm.employee.k27'),
        type: 'date',
        listWidth: 120,
      },
      {
        name: 'employee_type',
        label: i18n.t('hrm.employee.k28'),
        type: 'select',
        defaultValue: 'full_time',
        listWidth: 100,
        options: {
          type: 'static',
          options: EMPLOYEE_TYPE_OPTIONS,
        },
      },
      {
        name: 'education',
        label: i18n.t('hrm.employee.k29'),
        type: 'select',
        listWidth: 100,
        options: {
          type: 'static',
          options: EDUCATION_OPTIONS,
        },
        validation: [{ type: 'maxLength', value: 50 }],
      },
      {
        name: 'status',
        label: i18n.t('hrm.employee.k30'),
        type: 'select',
        defaultValue: 'active',
        options: {
          type: 'static',
          options: STATUS_OPTIONS,
        },
        listWidth: 100,
        validation: [{ type: 'maxLength', value: 20 }],
      },
    ],

    list: {
      columns: [
        'employee_no',
        'name',
        'department_id',
        'position',
        'email',
        'phone',
        'hire_date',
        'status',
      ],
      searchFields: ['employee_no', 'name', 'email'],
      pageSize: 10,
      statusBadge: {
        field: 'status',
        colorMap: STATUS_COLOR_MAP,
        labelMap: STATUS_LABEL_MAP,
      },
      filters: [
        {
          id: 'status',
          label: i18n.t('hrm.employee.k31'),
          type: 'select',
          options: [{ label: i18n.t('hrm.employee.k32'), value: 'all' }, ...STATUS_OPTIONS],
        },
      ],
    },

    actions: ['create', 'edit', 'detail', 'delete'],

    formSections: [
      {
        title: i18n.t('hrm.employee.k33'),
        fields: ['employee_no', 'name', 'gender', 'department_id', 'position', 'joblevel'],
      },
      {
        title: i18n.t('hrm.employee.k34'),
        fields: ['email', 'phone', 'hire_date', 'employee_type', 'education'],
      },
      {
        title: i18n.t('hrm.employee.k35'),
        fields: ['status'],
      },
    ],

    formColCount: 2,
    createTitle: i18n.t('hrm.employee.k36'),
    editTitle: i18n.t('hrm.employee.k37'),
    detailTitle: i18n.t('hrm.employee.k38'),

    dynamicOptions: [
      {
        field: 'department_id',
        queryKey: QUERY_KEYS.AD_HOC.HRM_DEPARTMENTS_BASE,
        loader: async () => {
          const res = await departmentApi.list({ page_size: 100 });
          if (res.success && res.data) {
            return (res.data.items || []).map((d: { id: string; name: string }) => ({
              value: d.id,
              label: d.name,
            }));
          }
          return [];
        },
      },
    ],
  };
};

export { getStatusOptions, STATUS_COLOR_MAP, getStatusLabelMap };
