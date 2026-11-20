import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';

export const healthCheckRecordSchema: EntitySchema = {
  entity: 'ehsHealthCheckRecord',
  title: i18n.t('ehs.health_check_record.k0'),
  description: i18n.t('ehs.health_check_record.k1'),

  api: {
    module: 'ehs',
    resource: 'checkRecords',
  },

  // 批 17：写权限资源前缀（API 资源名 → DB 资源名语义映射）
  permissionResource: 'ehs:check',

  fields: [
    {
      name: 'record_no',
      label: i18n.t('ehs.health_check_record.k2'),
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
      name: 'employee_name',
      label: i18n.t('ehs.health_check_record.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'check_type',
      label: i18n.t('ehs.health_check_record.k4'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.check_type as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'check_date',
      label: i18n.t('ehs.health_check_record.k5'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.check_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'hospital',
      label: i18n.t('ehs.health_check_record.k6'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.hospital as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'conclusion',
      label: i18n.t('ehs.health_check_record.k7'),
      type: 'textarea',
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.conclusion as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'abnormalitems',
      label: i18n.t('ehs.health_check_record.k8'),
      type: 'textarea',
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.abnormalitems;
        return Array.isArray(v) ? v.join(', ') || '-' : '-';
      },
    },
    {
      name: 'suggestions',
      label: i18n.t('ehs.health_check_record.k9'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'follow_up_required',
      label: i18n.t('ehs.health_check_record.k10'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'true', label: i18n.t('ehs.health_check_record.k11') },
          { value: 'false', label: i18n.t('ehs.health_check_record.k12') },
        ],
      },
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('ehs.health_check_record.k13'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('ehs.health_check_record.k14') },
          { value: 'completed', label: i18n.t('ehs.health_check_record.k15') },
          { value: 'abnormal', label: i18n.t('ehs.health_check_record.k16') },
          { value: 'follow_up', label: i18n.t('ehs.health_check_record.k17') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['record_no', 'employee_name', 'check_type', 'check_date', 'status'],
    searchFields: ['employee_name', 'record_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        completed: 'success',
        abnormal: 'error',
        follow_up: 'info',
      },
      labelMap: {
        pending: i18n.t('ehs.health_check_record.k14'),
        completed: i18n.t('ehs.health_check_record.k15'),
        abnormal: i18n.t('ehs.health_check_record.k16'),
        follow_up: i18n.t('ehs.health_check_record.k17'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('ehs.health_check_record.k13'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.health_check_record.k18'), value: 'all' },
          { label: i18n.t('ehs.health_check_record.k14'), value: 'pending' },
          { label: i18n.t('ehs.health_check_record.k15'), value: 'completed' },
          { label: i18n.t('ehs.health_check_record.k16'), value: 'abnormal' },
          { label: i18n.t('ehs.health_check_record.k17'), value: 'follow_up' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.health_check_record.k19'),
      fields: ['employee_name', 'check_type', 'check_date', 'hospital'],
    },
    {
      title: i18n.t('ehs.health_check_record.k20'),
      fields: ['conclusion', 'abnormalitems', 'suggestions', 'follow_up_required'],
    },
    {
      title: i18n.t('ehs.health_check_record.k21'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.health_check_record.k22'),
  editTitle: i18n.t('ehs.health_check_record.k23'),
  detailTitle: i18n.t('ehs.health_check_record.k24'),
};
