import type { EntitySchema } from '@/schema';
import { employeeApi } from '@/api/hrm';
import type { Employee } from '@/api/hrm/types';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

async function loadEmployeeOptions(): Promise<{ value: string; label: string }[]> {
  try {
    const response = await employeeApi.list({ page: 1, pagesize: 100 });
    if (response.code === 0 && response.data) {
      const items = response.data.items || [];
      return items.map((e: Employee) => ({ value: e.id, label: e.name }));
    }
  } catch {
    // ignore
  }
  return [];
}

export const contractSchema: EntitySchema = {
  entity: 'hrm_contract',
  title: i18n.t('hrm.contract.k0'),
  description: i18n.t('hrm.contract.k1'),

  api: {
    module: 'hrm',
    resource: 'contracts',
  },

  fields: [
    {
      name: 'contractNo',
      label: i18n.t('hrm.contract.k2'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 128,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'employee_id',
      label: i18n.t('hrm.contract.k3'),
      type: 'select',
      required: true,
      listWidth: 120,
    },
    {
      name: 'contract_type',
      label: i18n.t('hrm.contract.k4'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'labor', label: i18n.t('hrm.contract.k5') },
          { value: 'probation', label: i18n.t('hrm.contract.k6') },
          { value: 'part-time', label: i18n.t('hrm.contract.k7') },
          { value: 'project', label: i18n.t('hrm.contract.k8') },
          { value: 'consulting', label: i18n.t('hrm.contract.k9') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'party_a_name',
      label: i18n.t('hrm.contract.k10'),
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'party_a_contact',
      label: i18n.t('hrm.contract.k11'),
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'party_b_name',
      label: i18n.t('hrm.contract.k12'),
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'party_b_contact',
      label: i18n.t('hrm.contract.k13'),
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'start_date',
      label: i18n.t('hrm.contract.k14'),
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('hrm.contract.k15'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'salary',
      label: i18n.t('hrm.contract.k16'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'probation_period_days',
      label: i18n.t('hrm.contract.k17'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'reminder_days',
      label: i18n.t('hrm.contract.k18'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('hrm.contract.k19'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('hrm.contract.k20') },
          { value: 'expired', label: i18n.t('hrm.contract.k21') },
          { value: 'terminated', label: i18n.t('hrm.contract.k22') },
          { value: 'pending', label: i18n.t('hrm.contract.k23') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'contract_file_path',
      label: i18n.t('hrm.contract.k24'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'notes',
      label: i18n.t('hrm.contract.k25'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('hrm.contract.k26'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('hrm.contract.k27'),
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
      'contractNo',
      'employee_id',
      'contract_type',
      'salary',
      'start_date',
      'end_date',
      'status',
    ],
    searchFields: ['contractNo'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        expired: 'error',
        terminated: 'default',
        pending: 'warning',
      },
      labelMap: {
        active: i18n.t('hrm.contract.k28'),
        expired: i18n.t('hrm.contract.k29'),
        terminated: i18n.t('hrm.contract.k30'),
        pending: i18n.t('hrm.contract.k31'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('hrm.contract.k32'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.contract.k33'), value: 'all' },
          { label: i18n.t('hrm.contract.k34'), value: 'active' },
          { label: i18n.t('hrm.contract.k35'), value: 'expired' },
          { label: i18n.t('hrm.contract.k36'), value: 'terminated' },
          { label: i18n.t('hrm.contract.k37'), value: 'pending' },
        ],
      },
    ],
  },

  dynamicOptions: [
    {
      field: 'employee_id',
      loader: loadEmployeeOptions,
      queryKey: QUERY_KEYS.AD_HOC.HRM_EMPLOYEES_BASE,
    },
  ],

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('hrm.contract.k38'),
      fields: ['contractNo', 'employee_id', 'contract_type', 'status'],
    },
    {
      title: i18n.t('hrm.contract.k39'),
      fields: ['party_a_name', 'party_a_contact'],
    },
    {
      title: i18n.t('hrm.contract.k40'),
      fields: ['party_b_name', 'party_b_contact'],
    },
    {
      title: i18n.t('hrm.contract.k41'),
      fields: ['start_date', 'end_date', 'salary', 'probation_period_days', 'reminder_days'],
    },
    {
      title: i18n.t('hrm.contract.k42'),
      fields: ['contract_file_path', 'notes'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.contract.k43'),
  editTitle: i18n.t('hrm.contract.k44'),
  detailTitle: i18n.t('hrm.contract.k45'),
};
