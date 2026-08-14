import type { EntitySchema } from '@/schema';
import { departmentApi, type Department } from '@/api/hrm';


import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

async function loadDepartmentOptions(): Promise<{ value: string; label: string }[]> {
  try {
    const response = await departmentApi.list();
    if (response.code === 200 && response.data) {
      const items = response.data.items || [];
      return items.map((d: Department) => ({ value: d.id, label: d.name }));
    }
  } catch {
    // ignore
  }
  return [];
}

export const positionSchema: EntitySchema = {
  entity: 'hrm_position',
  title: i18n.t('hrm.position.k0'),
  description: i18n.t('hrm.position.k1'),

  api: {
    module: 'hrm',
    resource: 'positions',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('hrm.position.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'code',
      label: i18n.t('hrm.position.k3'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'department_id',
      label: i18n.t('hrm.position.k4'),
      type: 'select',
      listWidth: 140,
    },
    {
      name: 'level',
      label: i18n.t('hrm.position.k5'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'min_salary',
      label: i18n.t('hrm.position.k6'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'max_salary',
      label: i18n.t('hrm.position.k7'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'employee_count',
      label: i18n.t('hrm.position.k8'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('hrm.position.k9'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('hrm.position.k10') },
          { value: 'inactive', label: i18n.t('hrm.position.k11') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'description',
      label: i18n.t('hrm.position.k12'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'requirements',
      label: i18n.t('hrm.position.k13'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('hrm.position.k14'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('hrm.position.k15'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'name',
      'code',
      'department_id',
      'level',
      'min_salary',
      'max_salary',
      'employee_count',
      'status',
    ],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
      },
      labelMap: {
        active: i18n.t('hrm.position.k16'),
        inactive: i18n.t('hrm.position.k17'),
      },
    },
    filters: [
      {
        id: 'department_id',
        label: i18n.t('hrm.position.k18'),
        type: 'select',
        paramName: 'department_id',
        options: [{ label: i18n.t('hrm.position.k19'), value: 'all' }],
      },
      {
        id: 'status',
        label: i18n.t('hrm.position.k20'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.position.k21'), value: 'all' },
          { label: i18n.t('hrm.position.k22'), value: 'active' },
          { label: i18n.t('hrm.position.k23'), value: 'inactive' },
        ],
      },
    ],
  },

  dynamicOptions: [
    {
      field: 'department_id',
      loader: loadDepartmentOptions,
      queryKey: QUERY_KEYS.AD_HOC.HRM_DEPARTMENTS_BASE,
    },
  ],

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('hrm.position.k24'),
      fields: ['name', 'code', 'department_id', 'level', 'status'],
    },
    {
      title: i18n.t('hrm.position.k25'),
      fields: ['min_salary', 'max_salary'],
    },
    {
      title: i18n.t('hrm.position.k26'),
      fields: ['description', 'requirements'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.position.k27'),
  editTitle: i18n.t('hrm.position.k28'),
  detailTitle: i18n.t('hrm.position.k29'),
};
