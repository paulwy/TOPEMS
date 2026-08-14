import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const attendanceSchema: EntitySchema = {
  entity: 'hrm_attendance',
  title: i18n.t('hrm.attendance.k0'),
  description: i18n.t('hrm.attendance.k1'),

  api: {
    module: 'hrm',
    resource: 'attendance',
  },

  fields: [
    {
      name: 'employee_id',
      label: i18n.t('hrm.attendance.id_2'),
      type: 'text',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'employee_name',
      label: i18n.t('hrm.attendance.k3'),
      type: 'text',
      listWidth: 150,
      showInForm: false,
    },
    {
      name: 'date',
      label: i18n.t('hrm.attendance.k4'),
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'check_in',
      label: i18n.t('hrm.attendance.k5'),
      type: 'datetime',
      listWidth: 120,
    },
    {
      name: 'check_out',
      label: i18n.t('hrm.attendance.k6'),
      type: 'datetime',
      listWidth: 120,
    },
    {
      name: 'check_in_time',
      label: i18n.t('hrm.attendance.k7'),
      type: 'text',
      showInList: false,
      showInForm: false,
    },
    {
      name: 'check_out_time',
      label: i18n.t('hrm.attendance.k8'),
      type: 'text',
      showInList: false,
      showInForm: false,
    },
    {
      name: 'work_hours',
      label: i18n.t('hrm.attendance.k9'),
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('hrm.attendance.k10'),
      type: 'select',
      required: true,
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'normal', label: i18n.t('hrm.attendance.k11') },
          { value: 'late', label: i18n.t('hrm.attendance.k12') },
          { value: 'early_leave', label: i18n.t('hrm.attendance.k13') },
          { value: 'absent', label: i18n.t('hrm.attendance.k14') },
          { value: 'leave', label: i18n.t('hrm.attendance.k15') },
          { value: 'business_trip', label: i18n.t('hrm.attendance.k16') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'attendance_status',
      label: i18n.t('hrm.attendance.k17'),
      type: 'text',
      showInList: false,
      showInForm: false,
    },
    {
      name: 'created_at',
      label: i18n.t('hrm.attendance.k18'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('hrm.attendance.k19'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: ['employee_name', 'date', 'check_in', 'check_out', 'work_hours', 'status'],
    searchFields: ['employee_name', 'employee_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        normal: 'success',
        late: 'warning',
        early_leave: 'warning',
        absent: 'error',
        leave: 'info',
        business_trip: 'primary',
      },
      labelMap: {
        normal: i18n.t('hrm.attendance.k20'),
        late: i18n.t('hrm.attendance.k21'),
        early_leave: i18n.t('hrm.attendance.k22'),
        absent: i18n.t('hrm.attendance.k23'),
        leave: i18n.t('hrm.attendance.k24'),
        business_trip: i18n.t('hrm.attendance.k25'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('hrm.attendance.k26'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.attendance.k27'), value: 'all' },
          { value: 'normal', label: i18n.t('hrm.attendance.k28') },
          { value: 'late', label: i18n.t('hrm.attendance.k29') },
          { value: 'early_leave', label: i18n.t('hrm.attendance.k30') },
          { value: 'absent', label: i18n.t('hrm.attendance.k31') },
          { value: 'leave', label: i18n.t('hrm.attendance.k32') },
          { value: 'business_trip', label: i18n.t('hrm.attendance.k33') },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('hrm.attendance.k34'),
      fields: ['employee_id', 'date', 'status'],
    },
    {
      title: i18n.t('hrm.attendance.k35'),
      fields: ['check_in', 'check_out', 'work_hours'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.attendance.k36'),
  editTitle: i18n.t('hrm.attendance.k37'),
  detailTitle: i18n.t('hrm.attendance.k38'),
};
