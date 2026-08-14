import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const inspectionPlanSchema: EntitySchema = {
  entity: 'ehsInspectionPlan',
  title: i18n.t('ehs.check.k0'),
  description: i18n.t('ehs.check.k1'),

  api: {
    module: 'ehs',
    resource: 'inspectionPlans',
  },

  fields: [
    {
      name: 'plan_no',
      label: i18n.t('ehs.check.k2'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'title',
      label: i18n.t('ehs.check.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'inspection_type',
      label: i18n.t('ehs.check.k4'),
      type: 'select',
      required: true,
      defaultValue: 'daily',
      options: {
        type: 'static',
        options: [
          { value: 'daily', label: i18n.t('ehs.check.k5') },
          { value: 'weekly', label: i18n.t('ehs.check.k6') },
          { value: 'monthly', label: i18n.t('ehs.check.k7') },
          { value: 'quarterly', label: i18n.t('ehs.check.k8') },
          { value: 'yearly', label: i18n.t('ehs.check.k9') },
          { value: 'special', label: i18n.t('ehs.check.k10') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.inspection_type as string;
        const map: Record<string, string> = {
          daily: i18n.t('ehs.check.k11'),
          weekly: i18n.t('ehs.check.k12'),
          monthly: i18n.t('ehs.check.k13'),
          quarterly: i18n.t('ehs.check.k14'),
          yearly: i18n.t('ehs.check.k15'),
          special: i18n.t('ehs.check.k16'),
        };
        return map[v] || v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'frequency',
      label: i18n.t('ehs.check.k17'),
      type: 'select',
      required: true,
      defaultValue: 'daily',
      options: {
        type: 'static',
        options: [
          { value: 'daily', label: i18n.t('ehs.check.k18') },
          { value: 'weekly', label: i18n.t('ehs.check.k19') },
          { value: 'monthly', label: i18n.t('ehs.check.k20') },
          { value: 'quarterly', label: i18n.t('ehs.check.k21') },
          { value: 'yearly', label: i18n.t('ehs.check.k22') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.frequency as string;
        const map: Record<string, string> = {
          daily: i18n.t('ehs.check.k23'),
          weekly: i18n.t('ehs.check.k24'),
          monthly: i18n.t('ehs.check.k25'),
          quarterly: i18n.t('ehs.check.k26'),
          yearly: i18n.t('ehs.check.k27'),
        };
        return map[v] || v || '-';
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'inspector',
      label: i18n.t('ehs.check.k28'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.inspector as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'start_date',
      label: i18n.t('ehs.check.k29'),
      type: 'date',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.start_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'end_date',
      label: i18n.t('ehs.check.k30'),
      type: 'date',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.end_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'status',
      label: i18n.t('ehs.check.k31'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('ehs.check.k32') },
          { value: 'inactive', label: i18n.t('ehs.check.k33') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('ehs.check.k34'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
  ],

  list: {
    columns: ['plan_no', 'title', 'inspection_type', 'frequency', 'inspector', 'status'],
    searchFields: ['plan_no', 'title', 'inspector'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
      },
      labelMap: {
        active: i18n.t('ehs.check.k35'),
        inactive: i18n.t('ehs.check.k36'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('ehs.check.k37'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.check.k38'), value: 'all' },
          { label: i18n.t('ehs.check.k39'), value: 'active' },
          { label: i18n.t('ehs.check.k40'), value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.check.k41'),
      fields: ['title', 'description', 'inspection_type', 'frequency'],
    },
    {
      title: i18n.t('ehs.check.k42'),
      fields: ['start_date', 'end_date', 'inspector'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.check.k43'),
  editTitle: i18n.t('ehs.check.k44'),
  detailTitle: i18n.t('ehs.check.k45'),
};

export const inspectionRecordSchema: EntitySchema = {
  entity: 'ehsInspectionRecord',
  title: i18n.t('ehs.check.k46'),
  description: i18n.t('ehs.check.k47'),

  api: {
    module: 'ehs',
    resource: 'inspectionRecords',
  },

  fields: [
    {
      name: 'record_no',
      label: i18n.t('ehs.check.k48'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'title',
      label: i18n.t('ehs.check.k49'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'inspection_type',
      label: i18n.t('ehs.check.k50'),
      type: 'select',
      required: true,
      defaultValue: 'daily',
      options: {
        type: 'static',
        options: [
          { value: 'daily', label: i18n.t('ehs.check.k51') },
          { value: 'weekly', label: i18n.t('ehs.check.k52') },
          { value: 'monthly', label: i18n.t('ehs.check.k53') },
          { value: 'quarterly', label: i18n.t('ehs.check.k54') },
          { value: 'yearly', label: i18n.t('ehs.check.k55') },
          { value: 'special', label: i18n.t('ehs.check.k56') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.inspection_type as string;
        const map: Record<string, string> = {
          daily: i18n.t('ehs.check.k57'),
          weekly: i18n.t('ehs.check.k58'),
          monthly: i18n.t('ehs.check.k59'),
          quarterly: i18n.t('ehs.check.k60'),
          yearly: i18n.t('ehs.check.k61'),
          special: i18n.t('ehs.check.k62'),
        };
        return map[v] || v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'location',
      label: i18n.t('ehs.check.k63'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.location as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'inspector',
      label: i18n.t('ehs.check.k64'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.inspector as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'inspected_at',
      label: i18n.t('ehs.check.k65'),
      type: 'date',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.inspected_at as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'result',
      label: i18n.t('ehs.check.k66'),
      type: 'text',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.result as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'status',
      label: i18n.t('ehs.check.k67'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('ehs.check.k68') },
          { value: 'in_progress', label: i18n.t('ehs.check.k69') },
          { value: 'completed', label: i18n.t('ehs.check.k70') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
  ],

  list: {
    columns: [
      'record_no',
      'title',
      'inspection_type',
      'location',
      'inspector',
      'inspected_at',
      'status',
    ],
    searchFields: ['record_no', 'title', 'inspector'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'error',
        in_progress: 'warning',
        completed: 'success',
      },
      labelMap: {
        pending: i18n.t('ehs.check.k71'),
        in_progress: i18n.t('ehs.check.k72'),
        completed: i18n.t('ehs.check.k73'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('ehs.check.k74'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.check.k75'), value: 'all' },
          { label: i18n.t('ehs.check.k76'), value: 'pending' },
          { label: i18n.t('ehs.check.k77'), value: 'in_progress' },
          { label: i18n.t('ehs.check.k78'), value: 'completed' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formSections: [
    {
      title: i18n.t('ehs.check.k79'),
      fields: ['record_no', 'title', 'inspection_type', 'status'],
    },
    {
      title: i18n.t('ehs.check.k80'),
      fields: ['location', 'inspector', 'inspected_at', 'result'],
    },
  ],

  formColCount: 2,
  detailTitle: i18n.t('ehs.check.k81'),
};
