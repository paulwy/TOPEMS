import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const trainingRecordSchema: EntitySchema = {
  entity: 'ehsTrainingRecord',
  title: i18n.t('ehs.training.k0'),
  description: i18n.t('ehs.training.k1'),

  api: {
    module: 'ehs',
    resource: 'trainingRecords',
  },

  fields: [
    {
      name: 'record_no',
      label: i18n.t('ehs.training.k2'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: i18n.t('ehs.training.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'training_type',
      label: i18n.t('ehs.training.k4'),
      type: 'select',
      required: true,
      defaultValue: 'safety',
      options: {
        type: 'static',
        options: [
          { value: 'safety', label: i18n.t('ehs.training.k5') },
          { value: 'professional', label: i18n.t('ehs.training.k6') },
          { value: 'skill', label: i18n.t('ehs.training.k7') },
          { value: 'awareness', label: i18n.t('ehs.training.k8') },
          { value: 'emergency', label: i18n.t('ehs.training.k9') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.training_type as string;
        const map: Record<string, string> = {
          safety: i18n.t('ehs.training.k10'),
          professional: i18n.t('ehs.training.k11'),
          skill: i18n.t('ehs.training.k12'),
          awareness: i18n.t('ehs.training.k13'),
          emergency: i18n.t('ehs.training.k14'),
        };
        return map[v] || v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'trainer',
      label: i18n.t('ehs.training.k15'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.trainer as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'training_date',
      label: i18n.t('ehs.training.k16'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.training_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'duration_hours',
      label: i18n.t('ehs.training.k17'),
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.duration_hours as number | null | undefined;
        return v != null ? String(v) : '-';
      },
    },
    {
      name: 'status',
      label: i18n.t('ehs.training.k18'),
      type: 'select',
      defaultValue: 'ongoing',
      options: {
        type: 'static',
        options: [
          { value: 'ongoing', label: i18n.t('ehs.training.k19') },
          { value: 'completed', label: i18n.t('ehs.training.k20') },
          { value: 'failed', label: i18n.t('ehs.training.k21') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'content',
      label: i18n.t('ehs.training.k22'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'result',
      label: i18n.t('ehs.training.k23'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'pass_rate',
      label: i18n.t('ehs.training.k24'),
      type: 'number',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'record_no',
      'title',
      'training_type',
      'trainer',
      'training_date',
      'duration_hours',
      'status',
    ],
    searchFields: ['record_no', 'title', 'trainer'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        ongoing: 'warning',
        completed: 'success',
        failed: 'error',
      },
      labelMap: {
        ongoing: i18n.t('ehs.training.k25'),
        completed: i18n.t('ehs.training.k26'),
        failed: i18n.t('ehs.training.k27'),
      },
    },
    filters: [
      {
        id: 'training_type',
        label: i18n.t('ehs.training.k28'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.training.k29'), value: 'all' },
          { label: i18n.t('ehs.training.k30'), value: 'safety' },
          { label: i18n.t('ehs.training.k31'), value: 'professional' },
          { label: i18n.t('ehs.training.k32'), value: 'skill' },
          { label: i18n.t('ehs.training.k33'), value: 'awareness' },
          { label: i18n.t('ehs.training.k34'), value: 'emergency' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('ehs.training.k35'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.training.k36'), value: 'all' },
          { label: i18n.t('ehs.training.k37'), value: 'ongoing' },
          { label: i18n.t('ehs.training.k38'), value: 'completed' },
          { label: i18n.t('ehs.training.k39'), value: 'failed' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formSections: [
    {
      title: i18n.t('ehs.training.k40'),
      fields: ['record_no', 'title', 'training_type', 'status'],
    },
    {
      title: i18n.t('ehs.training.k41'),
      fields: ['trainer', 'training_date', 'duration_hours'],
    },
    {
      title: i18n.t('ehs.training.k42'),
      fields: ['content', 'result', 'pass_rate'],
    },
  ],

  formColCount: 2,
  detailTitle: i18n.t('ehs.training.k43'),
};

export const trainingCertificateSchema: EntitySchema = {
  entity: 'ehsTrainingCertificate',
  title: i18n.t('ehs.training.k44'),
  description: i18n.t('ehs.training.k45'),

  api: {
    module: 'ehs',
    resource: 'trainingCertificates',
  },

  fields: [
    {
      name: 'certificate_no',
      label: i18n.t('ehs.training.k46'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'employee_name',
      label: i18n.t('ehs.training.k47'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'training_type',
      label: i18n.t('ehs.training.k48'),
      type: 'select',
      required: true,
      defaultValue: 'safety',
      options: {
        type: 'static',
        options: [
          { value: 'safety', label: i18n.t('ehs.training.k49') },
          { value: 'professional', label: i18n.t('ehs.training.k50') },
          { value: 'skill', label: i18n.t('ehs.training.k51') },
          { value: 'awareness', label: i18n.t('ehs.training.k52') },
          { value: 'emergency', label: i18n.t('ehs.training.k53') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.training_type as string;
        const map: Record<string, string> = {
          safety: i18n.t('ehs.training.k54'),
          professional: i18n.t('ehs.training.k55'),
          skill: i18n.t('ehs.training.k56'),
          awareness: i18n.t('ehs.training.k57'),
          emergency: i18n.t('ehs.training.k58'),
        };
        return map[v] || v || '-';
      },
    },
    {
      name: 'certificate_type',
      label: i18n.t('ehs.training.k59'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'issue_date',
      label: i18n.t('ehs.training.k60'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.issue_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'expiry_date',
      label: i18n.t('ehs.training.k61'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.expiry_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'issuing_authority',
      label: i18n.t('ehs.training.k62'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('ehs.training.k63'),
      type: 'select',
      defaultValue: 'valid',
      options: {
        type: 'static',
        options: [
          { value: 'valid', label: i18n.t('ehs.training.k64') },
          { value: 'expired', label: i18n.t('ehs.training.k65') },
          { value: 'revoked', label: i18n.t('ehs.training.k66') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'certificate_no',
      'employee_name',
      'training_type',
      'certificate_type',
      'issue_date',
      'expiry_date',
      'status',
    ],
    searchFields: ['certificate_no', 'employee_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        valid: 'success',
        expired: 'warning',
        revoked: 'error',
      },
      labelMap: {
        valid: i18n.t('ehs.training.k67'),
        expired: i18n.t('ehs.training.k68'),
        revoked: i18n.t('ehs.training.k69'),
      },
    },
    filters: [
      {
        id: 'training_type',
        label: i18n.t('ehs.training.k70'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.training.k71'), value: 'all' },
          { label: i18n.t('ehs.training.k72'), value: 'safety' },
          { label: i18n.t('ehs.training.k73'), value: 'professional' },
          { label: i18n.t('ehs.training.k74'), value: 'skill' },
          { label: i18n.t('ehs.training.k75'), value: 'awareness' },
          { label: i18n.t('ehs.training.k76'), value: 'emergency' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('ehs.training.k77'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.training.k78'), value: 'all' },
          { label: i18n.t('ehs.training.k79'), value: 'valid' },
          { label: i18n.t('ehs.training.k80'), value: 'expired' },
          { label: i18n.t('ehs.training.k81'), value: 'revoked' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formSections: [
    {
      title: i18n.t('ehs.training.k82'),
      fields: ['certificate_no', 'employee_name', 'training_type', 'certificate_type'],
    },
    {
      title: i18n.t('ehs.training.k83'),
      fields: ['issue_date', 'expiry_date', 'issuing_authority', 'status'],
    },
  ],

  formColCount: 2,
  detailTitle: i18n.t('ehs.training.k84'),
};

export const trainingPlanSchema: EntitySchema = {
  entity: 'ehsTrainingPlan',
  title: i18n.t('ehs.training.k85'),
  description: i18n.t('ehs.training.k86'),

  api: {
    module: 'ehs',
    resource: 'trainingPlans',
  },

  fields: [
    {
      name: 'plan_no',
      label: i18n.t('ehs.training.k87'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'title',
      label: i18n.t('ehs.training.k88'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'training_type',
      label: i18n.t('ehs.training.k89'),
      type: 'select',
      required: true,
      defaultValue: 'safety',
      options: {
        type: 'static',
        options: [
          { value: 'safety', label: i18n.t('ehs.training.k90') },
          { value: 'professional', label: i18n.t('ehs.training.k91') },
          { value: 'skill', label: i18n.t('ehs.training.k92') },
          { value: 'awareness', label: i18n.t('ehs.training.k93') },
          { value: 'emergency', label: i18n.t('ehs.training.k94') },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'category',
      label: i18n.t('ehs.training.k95'),
      type: 'select',
      required: true,
      defaultValue: 'mandatory',
      options: {
        type: 'static',
        options: [
          { value: 'mandatory', label: i18n.t('ehs.training.k96') },
          { value: 'optional', label: i18n.t('ehs.training.k97') },
          { value: 'onboarding', label: i18n.t('ehs.training.k98') },
          { value: 'special', label: i18n.t('ehs.training.k99') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'trainer',
      label: i18n.t('ehs.training.k100'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.trainer as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'location',
      label: i18n.t('ehs.training.k101'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.location as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'start_date',
      label: i18n.t('ehs.training.k102'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.start_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'end_date',
      label: i18n.t('ehs.training.k103'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.end_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'duration_hours',
      label: i18n.t('ehs.training.k104'),
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.duration_hours as number | null | undefined;
        return v != null ? String(v) : '-';
      },
    },
    {
      name: 'max_participants',
      label: i18n.t('ehs.training.k105'),
      type: 'number',
      listWidth: 100,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.max_participants as number | null | undefined;
        return v != null ? String(v) : '-';
      },
    },
    {
      name: 'status',
      label: i18n.t('ehs.training.k106'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('ehs.training.k107') },
          { value: 'published', label: i18n.t('ehs.training.k108') },
          { value: 'ongoing', label: i18n.t('ehs.training.k109') },
          { value: 'completed', label: i18n.t('ehs.training.k110') },
          { value: 'cancelled', label: i18n.t('ehs.training.k111') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('ehs.training.k112'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['title', 'training_type', 'category', 'trainer', 'start_date', 'status'],
    searchFields: ['title', 'trainer'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        published: 'info',
        ongoing: 'warning',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('ehs.training.k113'),
        published: i18n.t('ehs.training.k114'),
        ongoing: i18n.t('ehs.training.k115'),
        completed: i18n.t('ehs.training.k116'),
        cancelled: i18n.t('ehs.training.k117'),
      },
    },
    filters: [
      {
        id: 'training_type',
        label: i18n.t('ehs.training.k118'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.training.k119'), value: 'all' },
          { label: i18n.t('ehs.training.k120'), value: 'safety' },
          { label: i18n.t('ehs.training.k121'), value: 'professional' },
          { label: i18n.t('ehs.training.k122'), value: 'skill' },
          { label: i18n.t('ehs.training.k123'), value: 'awareness' },
          { label: i18n.t('ehs.training.k124'), value: 'emergency' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('ehs.training.k125'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.training.k126'), value: 'all' },
          { label: i18n.t('ehs.training.k127'), value: 'draft' },
          { label: i18n.t('ehs.training.k128'), value: 'published' },
          { label: i18n.t('ehs.training.k129'), value: 'ongoing' },
          { label: i18n.t('ehs.training.k130'), value: 'completed' },
          { label: i18n.t('ehs.training.k131'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.training.k132'),
      fields: ['title', 'training_type', 'category'],
    },
    {
      title: i18n.t('ehs.training.k133'),
      fields: ['trainer', 'location', 'duration_hours', 'max_participants'],
    },
    {
      title: i18n.t('ehs.training.k134'),
      fields: ['start_date', 'end_date'],
    },
    {
      title: i18n.t('ehs.training.k135'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.training.k136'),
  editTitle: i18n.t('ehs.training.k137'),
  detailTitle: i18n.t('ehs.training.k138'),
};
