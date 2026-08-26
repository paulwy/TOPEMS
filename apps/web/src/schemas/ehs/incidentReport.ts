import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const incidentReportSchema: EntitySchema = {
  entity: 'ehsIncident',
  title: i18n.t('ehs.incident_report.k0'),
  description: i18n.t('ehs.incident_report.k1'),

  api: {
    module: 'ehs',
    resource: 'incidents',
  },

  fields: [
    {
      name: 'incident_no',
      label: i18n.t('ehs.incident_report.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'title',
      label: i18n.t('ehs.incident_report.k3'),
      type: 'text',
      required: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'type',
      label: i18n.t('ehs.incident_report.k4'),
      type: 'select',
      required: true,
      defaultValue: 'injury',
      options: {
        type: 'static',
        options: [
          { value: 'injury', label: i18n.t('ehs.incident_report.k5') },
          { value: 'illness', label: i18n.t('ehs.incident_report.k6') },
          { value: 'environment', label: i18n.t('ehs.incident_report.k7') },
          { value: 'property', label: i18n.t('ehs.incident_report.k8') },
          { value: 'near_miss', label: i18n.t('ehs.incident_report.k9') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'severity',
      label: i18n.t('ehs.incident_report.k10'),
      type: 'select',
      required: true,
      defaultValue: 'minor',
      options: {
        type: 'static',
        options: [
          { value: 'minor', label: i18n.t('ehs.incident_report.k11') },
          { value: 'serious', label: i18n.t('ehs.incident_report.k12') },
          { value: 'critical', label: i18n.t('ehs.incident_report.k13') },
          { value: 'fatal', label: i18n.t('ehs.incident_report.k14') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'location',
      label: i18n.t('ehs.incident_report.k15'),
      type: 'text',
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'department_id',
      label: i18n.t('ehs.incident_report.k16'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'reporter',
      label: i18n.t('ehs.incident_report.k17'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'report_date',
      label: i18n.t('ehs.incident_report.k18'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('ehs.incident_report.k19'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('ehs.incident_report.k20') },
          { value: 'submitted', label: i18n.t('ehs.incident_report.k21') },
          { value: 'investigating', label: i18n.t('ehs.incident_report.k22') },
          { value: 'closed', label: i18n.t('ehs.incident_report.k23') },
          { value: 'escalated', label: i18n.t('ehs.incident_report.k24') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('ehs.incident_report.k25'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['incident_no', 'title', 'type', 'severity', 'location', 'report_date', 'status'],
    searchFields: ['incident_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'severity',
      colorMap: {
        minor: 'success',
        serious: 'warning',
        critical: 'error',
        fatal: 'error',
      },
      labelMap: {
        minor: i18n.t('ehs.incident_report.k26'),
        serious: i18n.t('ehs.incident_report.k27'),
        critical: i18n.t('ehs.incident_report.k28'),
        fatal: i18n.t('ehs.incident_report.k29'),
      },
    },
    filters: [
      {
        id: 'type',
        label: i18n.t('ehs.incident_report.k30'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.incident_report.k31'), value: 'all' },
          { label: i18n.t('ehs.incident_report.k32'), value: 'injury' },
          { label: i18n.t('ehs.incident_report.k33'), value: 'illness' },
          { label: i18n.t('ehs.incident_report.k34'), value: 'environment' },
          { label: i18n.t('ehs.incident_report.k35'), value: 'property' },
          { label: i18n.t('ehs.incident_report.k36'), value: 'near_miss' },
        ],
      },
      {
        id: 'severity',
        label: i18n.t('ehs.incident_report.k37'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.incident_report.k38'), value: 'all' },
          { label: i18n.t('ehs.incident_report.k39'), value: 'minor' },
          { label: i18n.t('ehs.incident_report.k40'), value: 'serious' },
          { label: i18n.t('ehs.incident_report.k41'), value: 'critical' },
          { label: i18n.t('ehs.incident_report.k42'), value: 'fatal' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.incident_report.k43'),
      fields: ['incident_no', 'title', 'type', 'severity'],
    },
    {
      title: i18n.t('ehs.incident_report.k44'),
      fields: ['location', 'department_id', 'reporter', 'report_date'],
    },
    {
      title: i18n.t('ehs.incident_report.k45'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.incident_report.k46'),
  editTitle: i18n.t('ehs.incident_report.k47'),
  detailTitle: i18n.t('ehs.incident_report.k48'),
};
