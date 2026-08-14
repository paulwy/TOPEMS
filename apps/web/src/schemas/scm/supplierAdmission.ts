import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const riskLevelConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  low: { label: i18n.t('scm.supplier_admission.k0'), color: 'success' },
  medium: { label: i18n.t('scm.supplier_admission.k1'), color: 'warning' },
  high: { label: i18n.t('scm.supplier_admission.k2'), color: 'error' },
};

export const supplierAdmissionSchema: EntitySchema = {
  entity: 'supplierAdmission',
  title: i18n.t('scm.supplier_admission.k3'),
  description: i18n.t('scm.supplier_admission.k4'),

  api: {
    module: 'scm',
    resource: 'supplierAdmissions',
  },

  fields: [
    {
      name: 'admission_no',
      label: i18n.t('scm.supplier_admission.k5'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'supplier_name',
      label: i18n.t('scm.supplier_admission.k6'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'short_name',
      label: i18n.t('scm.supplier_admission.k7'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'supplier_category',
      label: i18n.t('scm.supplier_admission.k8'),
      type: 'select',
      defaultValue: 'raw_material',
      options: {
        type: 'static',
        options: [
          { value: 'raw_material', label: i18n.t('scm.supplier_admission.k9') },
          { value: 'component', label: i18n.t('scm.supplier_admission.k10') },
          { value: 'equipment', label: i18n.t('scm.supplier_admission.k11') },
          { value: 'service', label: i18n.t('scm.supplier_admission.k12') },
          { value: 'packaging', label: i18n.t('scm.supplier_admission.k13') },
          { value: 'other', label: i18n.t('scm.supplier_admission.k14') },
        ],
      },
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'contact_person',
      label: i18n.t('scm.supplier_admission.k15'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'contact_phone',
      label: i18n.t('scm.supplier_admission.k16'),
      type: 'text',
      listWidth: 130,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'contact_email',
      label: i18n.t('scm.supplier_admission.k17'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'applicant',
      label: i18n.t('scm.supplier_admission.k18'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'address',
      label: i18n.t('scm.supplier_admission.k19'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'business_license',
      label: i18n.t('scm.supplier_admission.k20'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'tax_registration',
      label: i18n.t('scm.supplier_admission.k21'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'organization_code',
      label: i18n.t('scm.supplier_admission.k22'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'legal_representative',
      label: i18n.t('scm.supplier_admission.k23'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'registered_capital',
      label: i18n.t('scm.supplier_admission.k24'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'established_date',
      label: i18n.t('scm.supplier_admission.k25'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'business_scope',
      label: i18n.t('scm.supplier_admission.k26'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'remarks',
      label: i18n.t('scm.supplier_admission.k27'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'risk_level',
      label: i18n.t('scm.supplier_admission.k28'),
      type: 'select',
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'low', label: i18n.t('scm.supplier_admission.k29') },
          { value: 'medium', label: i18n.t('scm.supplier_admission.k30') },
          { value: 'high', label: i18n.t('scm.supplier_admission.k31') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const value = String(row.risk_level ?? 'medium');
        const config = riskLevelConfig[value] || riskLevelConfig.medium;
        return React.createElement(Chip, {
          label: config.label,
          size: 'small',
          color: config.color,
          variant: 'outlined',
        });
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'status',
      label: i18n.t('scm.supplier_admission.k32'),
      type: 'select',
      hideInForm: true,
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('scm.supplier_admission.k33') },
          { value: 'pending', label: i18n.t('scm.supplier_admission.k34') },
          { value: 'auditing', label: i18n.t('scm.supplier_admission.k35') },
          { value: 'approved', label: i18n.t('scm.supplier_admission.k36') },
          { value: 'rejected', label: i18n.t('scm.supplier_admission.k37') },
          { value: 'active', label: i18n.t('scm.supplier_admission.k38') },
          { value: 'cancelled', label: i18n.t('scm.supplier_admission.k39') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'application_date',
      label: i18n.t('scm.supplier_admission.k40'),
      type: 'date',
      hideInForm: true,
      sortable: true,
      listWidth: 120,
    },
  ],

  list: {
    columns: [
      'admission_no',
      'supplier_name',
      'supplier_category',
      'contact_person',
      'contact_phone',
      'risk_level',
      'status',
      'applicant',
      'application_date',
    ],
    searchFields: ['admission_no', 'supplier_name', 'contact_person'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        auditing: 'primary',
        approved: 'success',
        rejected: 'error',
        active: 'success',
        cancelled: 'default',
      },
      labelMap: {
        draft: i18n.t('scm.supplier_admission.k41'),
        pending: i18n.t('scm.supplier_admission.k42'),
        auditing: i18n.t('scm.supplier_admission.k43'),
        approved: i18n.t('scm.supplier_admission.k44'),
        rejected: i18n.t('scm.supplier_admission.k45'),
        active: i18n.t('scm.supplier_admission.k46'),
        cancelled: i18n.t('scm.supplier_admission.k47'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('scm.supplier_admission.k48'),
        type: 'select',
        options: [
          { label: i18n.t('scm.supplier_admission.k49'), value: 'all' },
          { label: i18n.t('scm.supplier_admission.k50'), value: 'draft' },
          { label: i18n.t('scm.supplier_admission.k51'), value: 'pending' },
          { label: i18n.t('scm.supplier_admission.k52'), value: 'auditing' },
          { label: i18n.t('scm.supplier_admission.k53'), value: 'approved' },
          { label: i18n.t('scm.supplier_admission.k54'), value: 'rejected' },
          { label: i18n.t('scm.supplier_admission.k55'), value: 'active' },
          { label: i18n.t('scm.supplier_admission.k56'), value: 'cancelled' },
        ],
      },
      {
        id: 'supplier_category',
        label: i18n.t('scm.supplier_admission.k57'),
        type: 'select',
        options: [
          { label: i18n.t('scm.supplier_admission.k58'), value: 'all' },
          { label: i18n.t('scm.supplier_admission.k59'), value: 'raw_material' },
          { label: i18n.t('scm.supplier_admission.k60'), value: 'component' },
          { label: i18n.t('scm.supplier_admission.k61'), value: 'equipment' },
          { label: i18n.t('scm.supplier_admission.k62'), value: 'service' },
          { label: i18n.t('scm.supplier_admission.k63'), value: 'packaging' },
          { label: i18n.t('scm.supplier_admission.k64'), value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('scm.supplier_admission.k65'),
      fields: [
        'admission_no',
        'supplier_name',
        'short_name',
        'supplier_category',
        'contact_person',
        'contact_phone',
        'contact_email',
        'applicant',
        'address',
      ],
    },
    {
      title: i18n.t('scm.supplier_admission.k66'),
      fields: [
        'business_license',
        'tax_registration',
        'organization_code',
        'legal_representative',
        'registered_capital',
        'established_date',
        'business_scope',
      ],
    },
    {
      title: i18n.t('scm.supplier_admission.k67'),
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.supplier_admission.k68'),
  editTitle: i18n.t('scm.supplier_admission.k69'),
  detailTitle: i18n.t('scm.supplier_admission.k70'),
};
