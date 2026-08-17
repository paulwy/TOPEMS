import type { EntitySchema } from '@/schema';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export const leaveSchema: EntitySchema = {
  entity: 'hrm_leave',
  title: i18n.t('hrm.leave.k0'),
  description: i18n.t('hrm.leave.k1'),

  api: {
    module: 'hrm',
    resource: 'leaveRequests',
  },

  fields: [
    {
      name: 'employee_id',
      label: i18n.t('hrm.leave.k2'),
      type: 'select',
      required: true,
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'employee_name',
      label: i18n.t('hrm.leave.k3'),
      type: 'text',
      listWidth: 140,
      showInForm: false,
    },
    {
      name: 'leave_type',
      label: i18n.t('hrm.leave.k4'),
      type: 'select',
      required: true,
      defaultValue: 'annual',
      options: {
        type: 'static',
        options: [
          { value: 'annual', label: i18n.t('hrm.leave.k5') },
          { value: 'sick', label: i18n.t('hrm.leave.k6') },
          { value: 'personal', label: i18n.t('hrm.leave.k7') },
          { value: 'maternity', label: i18n.t('hrm.leave.k8') },
          { value: 'paternity', label: i18n.t('hrm.leave.k9') },
          { value: 'other', label: i18n.t('hrm.leave.k10') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'start_date',
      label: i18n.t('hrm.leave.k11'),
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('hrm.leave.k12'),
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'days',
      label: i18n.t('hrm.leave.k13'),
      type: 'number',
      defaultValue: 0,
      listWidth: 80,
    },
    {
      name: 'status',
      label: i18n.t('hrm.leave.k14'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('hrm.leave.k15') },
          { value: 'approved', label: i18n.t('hrm.leave.k16') },
          { value: 'rejected', label: i18n.t('hrm.leave.k17') },
          { value: 'cancelled', label: i18n.t('hrm.leave.k18') },
        ],
      },
      listWidth: 100,
      showInForm: false,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'reason',
      label: i18n.t('hrm.leave.k19'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'approver_id',
      label: i18n.t('hrm.leave.k20'),
      type: 'text',
      listWidth: 100,
      showInForm: false,
    },
    {
      name: 'rejection_reason',
      label: i18n.t('hrm.leave.k21'),
      type: 'text',
      showInList: false,
      showInForm: false,
    },
    {
      name: 'created_at',
      label: i18n.t('hrm.leave.k22'),
      type: 'date',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'updated_at',
      label: i18n.t('hrm.leave.k23'),
      type: 'date',
      showInList: false,
      showInForm: false,
    },
  ],

  list: {
    searchFields: ['employee_name', 'leave_type'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        approved: 'success',
        rejected: 'error',
        cancelled: 'default',
      },
      labelMap: {
        pending: i18n.t('hrm.leave.k24'),
        approved: i18n.t('hrm.leave.k25'),
        rejected: i18n.t('hrm.leave.k26'),
        cancelled: i18n.t('hrm.leave.k27'),
      },
    },
    filters: [
      {
        id: 'leave_type',
        label: i18n.t('hrm.leave.k28'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.leave.k29'), value: 'all' },
          { value: 'annual', label: i18n.t('hrm.leave.k30') },
          { value: 'sick', label: i18n.t('hrm.leave.k31') },
          { value: 'personal', label: i18n.t('hrm.leave.k32') },
          { value: 'maternity', label: i18n.t('hrm.leave.k33') },
          { value: 'paternity', label: i18n.t('hrm.leave.k34') },
          { value: 'other', label: i18n.t('hrm.leave.k35') },
        ],
      },
      {
        id: 'status',
        label: i18n.t('hrm.leave.k36'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.leave.k37'), value: 'all' },
          { value: 'pending', label: i18n.t('hrm.leave.k38') },
          { value: 'approved', label: i18n.t('hrm.leave.k39') },
          { value: 'rejected', label: i18n.t('hrm.leave.k40') },
          { value: 'cancelled', label: i18n.t('hrm.leave.k41') },
        ],
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('hrm.leave.k42'),
      fields: ['employee_id'],
    },
    {
      title: i18n.t('hrm.leave.k43'),
      fields: ['leave_type', 'start_date', 'end_date', 'days'],
    },
    {
      title: i18n.t('hrm.leave.k44'),
      fields: ['reason'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.leave.k45'),
  editTitle: i18n.t('hrm.leave.k46'),
  detailTitle: i18n.t('hrm.leave.k47'),

  dynamicOptions: [
    {
      field: 'employee_id',
      loader: async () => {
        const { employeeApi } = await import('@/api/hrm');
        const response = await employeeApi.list();
        const items = (response.data?.items || response.data || []) as Array<{
          id: string;
          name: string;
        }>;
        if (Array.isArray(items)) {
          return items.map((e) => ({ value: e.id, label: e.name }));
        }
        return [];
      },
      queryKey: QUERY_KEYS.AD_HOC.HRM_LEAVE_EMPLOYEES_BASE,
    },
  ],

  actions: ['create', 'edit', 'detail', 'delete'],
};
