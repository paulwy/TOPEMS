import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const regulationSchema: EntitySchema = {
  entity: 'ehs_regulation',
  title: i18n.t('ehs.compliance.k0'),
  description: i18n.t('ehs.compliance.k1'),

  api: {
    module: 'ehs',
    resource: 'compliance',
    listMethod: 'listEnvironmentalRegulations',
    createMethod: 'createEnvironmentalRegulation',
    updateMethod: 'updateEnvironmentalRegulation',
    deleteMethod: 'deleteEnvironmentalRegulation',
    getMethod: 'getEnvironmentalRegulation',
  },

  fields: [
    {
      name: 'regulation_no',
      label: i18n.t('ehs.compliance.k2'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: i18n.t('ehs.compliance.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'category',
      label: i18n.t('ehs.compliance.k4'),
      type: 'select',
      required: true,
      defaultValue: 'environmental',
      options: {
        type: 'static',
        options: [
          { value: 'environmental', label: i18n.t('ehs.compliance.k5') },
          { value: 'safety', label: i18n.t('ehs.compliance.k6') },
          { value: 'health', label: i18n.t('ehs.compliance.k7') },
          { value: 'chemical', label: i18n.t('ehs.compliance.k8') },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'regulation_type',
      label: i18n.t('ehs.compliance.k9'),
      type: 'select',
      required: true,
      defaultValue: 'law',
      options: {
        type: 'static',
        options: [
          { value: 'law', label: i18n.t('ehs.compliance.k10') },
          { value: 'regulation', label: i18n.t('ehs.compliance.k11') },
          { value: 'standard', label: i18n.t('ehs.compliance.k12') },
          { value: 'policy', label: i18n.t('ehs.compliance.k13') },
          { value: 'notice', label: i18n.t('ehs.compliance.k14') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'issuing_authority',
      label: i18n.t('ehs.compliance.k15'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        row.issuing_authority ? String(row.issuing_authority) : '-',
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'issue_date',
      label: i18n.t('ehs.compliance.k16'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => (row.issue_date ? String(row.issue_date) : '-'),
    },
    {
      name: 'effective_date',
      label: i18n.t('ehs.compliance.k17'),
      type: 'date',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'content',
      label: i18n.t('ehs.compliance.k18'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('ehs.compliance.k19'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('ehs.compliance.k20') },
          { value: 'published', label: i18n.t('ehs.compliance.k21') },
          { value: 'effective', label: i18n.t('ehs.compliance.k22') },
          { value: 'expired', label: i18n.t('ehs.compliance.k23') },
          { value: 'archived', label: i18n.t('ehs.compliance.k24') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
  ],

  list: {
    columns: [
      'regulation_no',
      'title',
      'regulation_type',
      'issuing_authority',
      'issue_date',
      'status',
    ],
    searchFields: ['title', 'regulation_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        published: 'info',
        effective: 'success',
        expired: 'error',
        archived: 'default',
      },
      labelMap: {
        draft: i18n.t('ehs.compliance.k25'),
        published: i18n.t('ehs.compliance.k26'),
        effective: i18n.t('ehs.compliance.k27'),
        expired: i18n.t('ehs.compliance.k28'),
        archived: i18n.t('ehs.compliance.k29'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('ehs.compliance.k30'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.compliance.k31'), value: 'all' },
          { label: i18n.t('ehs.compliance.k32'), value: 'draft' },
          { label: i18n.t('ehs.compliance.k33'), value: 'published' },
          { label: i18n.t('ehs.compliance.k34'), value: 'effective' },
          { label: i18n.t('ehs.compliance.k35'), value: 'expired' },
          { label: i18n.t('ehs.compliance.k36'), value: 'archived' },
        ],
      },
      {
        id: 'category',
        label: i18n.t('ehs.compliance.k37'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.compliance.k38'), value: 'all' },
          { label: i18n.t('ehs.compliance.k39'), value: 'environmental' },
          { label: i18n.t('ehs.compliance.k40'), value: 'safety' },
          { label: i18n.t('ehs.compliance.k41'), value: 'health' },
          { label: i18n.t('ehs.compliance.k42'), value: 'chemical' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.compliance.k43'),
      fields: ['regulation_no', 'title', 'category', 'regulation_type'],
    },
    {
      title: i18n.t('ehs.compliance.k44'),
      fields: ['issuing_authority', 'issue_date', 'effective_date'],
    },
    {
      title: i18n.t('ehs.compliance.k45'),
      fields: ['content', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.compliance.k46'),
  editTitle: i18n.t('ehs.compliance.k47'),
  detailTitle: i18n.t('ehs.compliance.k48'),
};

export const assessmentSchema: EntitySchema = {
  entity: 'ehs_assessment',
  title: i18n.t('ehs.compliance.k49'),
  description: i18n.t('ehs.compliance.k50'),

  api: {
    module: 'ehs',
    resource: 'compliance',
    listMethod: 'listComplianceAssessments',
    createMethod: 'createComplianceAssessment',
    updateMethod: 'updateComplianceAssessment',
    deleteMethod: 'deleteComplianceAssessment',
    getMethod: 'getComplianceAssessment',
  },

  fields: [
    {
      name: 'assessment_no',
      label: i18n.t('ehs.compliance.k51'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: i18n.t('ehs.compliance.k52'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'assessment_type',
      label: i18n.t('ehs.compliance.k53'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'assessor',
      label: i18n.t('ehs.compliance.k54'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => (row.assessor ? String(row.assessor) : '-'),
    },
    {
      name: 'assessment_date',
      label: i18n.t('ehs.compliance.k55'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        row.assessment_date ? String(row.assessment_date) : '-',
    },
    {
      name: 'result',
      label: i18n.t('ehs.compliance.k56'),
      type: 'select',
      defaultValue: 'compliant',
      options: {
        type: 'static',
        options: [
          { value: 'compliant', label: i18n.t('ehs.compliance.k57') },
          { value: 'partially_compliant', label: i18n.t('ehs.compliance.k58') },
          { value: 'non_compliant', label: i18n.t('ehs.compliance.k59') },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'status',
      label: i18n.t('ehs.compliance.k60'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('ehs.compliance.k61') },
          { value: 'in_progress', label: i18n.t('ehs.compliance.k62') },
          { value: 'completed', label: i18n.t('ehs.compliance.k63') },
          { value: 'approved', label: i18n.t('ehs.compliance.k64') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
  ],

  list: {
    columns: [
      'assessment_no',
      'title',
      'assessment_type',
      'assessor',
      'assessment_date',
      'result',
      'status',
    ],
    searchFields: ['title', 'assessment_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        in_progress: 'warning',
        completed: 'success',
        approved: 'primary',
      },
      labelMap: {
        draft: i18n.t('ehs.compliance.k65'),
        in_progress: i18n.t('ehs.compliance.k66'),
        completed: i18n.t('ehs.compliance.k67'),
        approved: i18n.t('ehs.compliance.k68'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('ehs.compliance.k69'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.compliance.k70'), value: 'all' },
          { label: i18n.t('ehs.compliance.k71'), value: 'draft' },
          { label: i18n.t('ehs.compliance.k72'), value: 'in_progress' },
          { label: i18n.t('ehs.compliance.k73'), value: 'completed' },
          { label: i18n.t('ehs.compliance.k74'), value: 'approved' },
        ],
      },
      {
        id: 'result',
        label: i18n.t('ehs.compliance.k75'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.compliance.k76'), value: 'all' },
          { label: i18n.t('ehs.compliance.k77'), value: 'compliant' },
          { label: i18n.t('ehs.compliance.k78'), value: 'partially_compliant' },
          { label: i18n.t('ehs.compliance.k79'), value: 'non_compliant' },
        ],
      },
    ],
  },

  actions: ['detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.compliance.k80'),
      fields: ['assessment_no', 'title', 'assessment_type'],
    },
    {
      title: i18n.t('ehs.compliance.k81'),
      fields: ['assessor', 'assessment_date', 'result'],
    },
    {
      title: i18n.t('ehs.compliance.k82'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  detailTitle: i18n.t('ehs.compliance.k83'),
};

export const permitSchema: EntitySchema = {
  entity: 'ehs_permit',
  title: i18n.t('ehs.compliance.k84'),
  description: i18n.t('ehs.compliance.k85'),

  api: {
    module: 'ehs',
    resource: 'compliance',
    listMethod: 'listDischargePermits',
    createMethod: 'createDischargePermit',
    updateMethod: 'updateDischargePermit',
    deleteMethod: 'deleteDischargePermit',
    getMethod: 'getDischargePermit',
  },

  fields: [
    {
      name: 'permit_no',
      label: i18n.t('ehs.compliance.k86'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'title',
      label: i18n.t('ehs.compliance.k87'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'permit_type',
      label: i18n.t('ehs.compliance.k88'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'permit_category',
      label: i18n.t('ehs.compliance.k89'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'holder',
      label: i18n.t('ehs.compliance.k90'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => (row.holder ? String(row.holder) : '-'),
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'expiry_date',
      label: i18n.t('ehs.compliance.k91'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        row.expiry_date ? String(row.expiry_date) : '-',
    },
    {
      name: 'status',
      label: i18n.t('ehs.compliance.k92'),
      type: 'select',
      defaultValue: 'valid',
      options: {
        type: 'static',
        options: [
          { value: 'valid', label: i18n.t('ehs.compliance.k93') },
          { value: 'expired', label: i18n.t('ehs.compliance.k94') },
          { value: 'revoked', label: i18n.t('ehs.compliance.k95') },
          { value: 'pending_renewal', label: i18n.t('ehs.compliance.k96') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
  ],

  list: {
    columns: [
      'permit_no',
      'title',
      'permit_type',
      'permit_category',
      'holder',
      'expiry_date',
      'status',
    ],
    searchFields: ['title', 'permit_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        valid: 'success',
        expired: 'error',
        revoked: 'error',
        pending_renewal: 'warning',
      },
      labelMap: {
        valid: i18n.t('ehs.compliance.k97'),
        expired: i18n.t('ehs.compliance.k98'),
        revoked: i18n.t('ehs.compliance.k99'),
        pending_renewal: i18n.t('ehs.compliance.k100'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('ehs.compliance.k101'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.compliance.k102'), value: 'all' },
          { label: i18n.t('ehs.compliance.k103'), value: 'valid' },
          { label: i18n.t('ehs.compliance.k104'), value: 'expired' },
          { label: i18n.t('ehs.compliance.k105'), value: 'revoked' },
          { label: i18n.t('ehs.compliance.k106'), value: 'pending_renewal' },
        ],
      },
    ],
  },

  actions: ['detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.compliance.k107'),
      fields: ['permit_no', 'title', 'permit_type', 'permit_category'],
    },
    {
      title: i18n.t('ehs.compliance.k108'),
      fields: ['holder', 'expiry_date'],
    },
    {
      title: i18n.t('ehs.compliance.k109'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  detailTitle: i18n.t('ehs.compliance.k110'),
};
