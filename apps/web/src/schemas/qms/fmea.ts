import type { EntitySchema } from '@/schema';
import { columnsFromFields } from '@/schema/schemaExtensions';
import type { NestedTableConfig, WizardConfig } from '@/schema/schemaExtensions';
import i18n from '@/i18n';

const fmeaItemFields: NestedTableConfig['fields'] = [
  { name: 'itemNo', label: i18n.t('qms.fmea.k0'), type: 'text', listWidth: 80 },
  { name: 'functionDescription', label: i18n.t('qms.fmea.k1'), type: 'text', listWidth: 150 },
  { name: 'failureMode', label: i18n.t('qms.fmea.k2'), type: 'text', required: true, listWidth: 180 },
  { name: 'failureEffect', label: i18n.t('qms.fmea.k3'), type: 'text', required: true, listWidth: 200 },
  { name: 'failureCause', label: i18n.t('qms.fmea.k4'), type: 'text', required: true, listWidth: 200 },
  {
    name: 'severity',
    label: i18n.t('qms.fmea.s_5'),
    type: 'select',
    required: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('shared.fmea.1_0'), value: '1' },
        { label: i18n.t('shared.fmea.2_1'), value: '2' },
        { label: i18n.t('shared.fmea.3_2'), value: '3' },
        { label: i18n.t('shared.fmea.4_3'), value: '4' },
        { label: i18n.t('shared.fmea.5_4'), value: '5' },
        { label: i18n.t('shared.fmea.6_5'), value: '6' },
        { label: i18n.t('shared.fmea.7_6'), value: '7' },
        { label: i18n.t('shared.fmea.8_7'), value: '8' },
        { label: i18n.t('shared.fmea.9_8'), value: '9' },
        { label: i18n.t('shared.fmea.10_9'), value: '10' },
      ],
    },
  },
  {
    name: 'occurrence',
    label: i18n.t('qms.fmea.o_6'),
    type: 'select',
    required: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('shared.fmea.1_10'), value: '1' },
        { label: i18n.t('shared.fmea.2_11'), value: '2' },
        { label: i18n.t('shared.fmea.3_12'), value: '3' },
        { label: i18n.t('shared.fmea.4_13'), value: '4' },
        { label: i18n.t('shared.fmea.5_14'), value: '5' },
        { label: i18n.t('shared.fmea.6_15'), value: '6' },
        { label: i18n.t('shared.fmea.7_16'), value: '7' },
        { label: i18n.t('shared.fmea.8_17'), value: '8' },
        { label: i18n.t('shared.fmea.9_18'), value: '9' },
        { label: i18n.t('shared.fmea.10_19'), value: '10' },
      ],
    },
  },
  {
    name: 'detection',
    label: i18n.t('qms.fmea.d_7'),
    type: 'select',
    required: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('shared.fmea.1_20'), value: '1' },
        { label: i18n.t('shared.fmea.2_21'), value: '2' },
        { label: i18n.t('shared.fmea.3_22'), value: '3' },
        { label: i18n.t('shared.fmea.4_23'), value: '4' },
        { label: i18n.t('shared.fmea.5_24'), value: '5' },
        { label: i18n.t('shared.fmea.6_25'), value: '6' },
        { label: i18n.t('shared.fmea.7_26'), value: '7' },
        { label: i18n.t('shared.fmea.8_27'), value: '8' },
        { label: i18n.t('shared.fmea.9_28'), value: '9' },
        { label: i18n.t('shared.fmea.10_29'), value: '10' },
      ],
    },
  },
  { name: 'rpn', label: 'RPN', type: 'number', listWidth: 80, readonly: true },
  { name: 'recommendedActions', label: i18n.t('qms.fmea.k8'), type: 'text', listWidth: 200 },
  { name: 'responsibility', label: i18n.t('qms.fmea.k9'), type: 'text', listWidth: 100 },
  { name: 'targetDate', label: i18n.t('qms.fmea.k10'), type: 'date', listWidth: 120 },
  {
    name: 'status',
    label: i18n.t('qms.fmea.k11'),
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('qms.fmea.k12'), value: 'pending' },
        { label: i18n.t('qms.fmea.k13'), value: 'in_progress' },
        { label: i18n.t('qms.fmea.k14'), value: 'completed' },
      ],
    },
  },
];

const fmeaItemsTable: NestedTableConfig = {
  field: 'items',
  title: i18n.t('qms.fmea.k15'),
  columns: columnsFromFields(fmeaItemFields),
  fields: fmeaItemFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.fmea.k16'),
  rowKeyField: 'id',
  minRows: 0,
};

const improvementActionsFields: NestedTableConfig['fields'] = [
  { name: 'action', label: i18n.t('qms.fmea.k17'), type: 'text', required: true, listWidth: 250 },
  { name: 'owner', label: i18n.t('qms.fmea.k18'), type: 'text', listWidth: 100 },
  { name: 'dueDate', label: i18n.t('qms.fmea.k19'), type: 'date', listWidth: 120 },
  {
    name: 'status',
    label: i18n.t('qms.fmea.k20'),
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('qms.fmea.k21'), value: 'planned' },
        { label: i18n.t('qms.fmea.k22'), value: 'in_progress' },
        { label: i18n.t('qms.fmea.k23'), value: 'completed' },
      ],
    },
  },
];

const improvementActionsTable: NestedTableConfig = {
  field: 'improvementActions',
  title: i18n.t('qms.fmea.k24'),
  columns: columnsFromFields(improvementActionsFields),
  fields: improvementActionsFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.fmea.k25'),
  rowKeyField: 'id',
  minRows: 0,
};

const fmeaWizard: WizardConfig = {
  steps: [
    {
      key: 'basic',
      title: i18n.t('qms.fmea.k26'),
      description: i18n.t('qms.fmea.fmea_27'),
      fields: [
        'fmeaName',
        'fmeaType',
        'productId',
        'productName',
        'processId',
        'processName',
        'version',
        'status',
        'description',
      ],
      groupTitle: i18n.t('qms.fmea.k28'),
      validate: (values) => {
        if (!values.fmeaName) return i18n.t('qms.fmea.fmea_29');
        if (!values.fmeaType) return i18n.t('qms.fmea.fmea_30');
        return null;
      },
    },
    {
      key: 'failureModes',
      title: i18n.t('qms.fmea.k31'),
      description: i18n.t('qms.fmea.k32'),
      fields: ['items'],
      groupTitle: i18n.t('qms.fmea.k33'),
      validate: (values) => {
        const items = (values.items as Record<string, unknown>[]) || [];
        if (items.length === 0) return i18n.t('qms.fmea.k34');
        return null;
      },
    },
    {
      key: 'improvement',
      title: i18n.t('qms.fmea.k35'),
      description: i18n.t('qms.fmea.k36'),
      fields: ['improvementActions'],
      groupTitle: i18n.t('qms.fmea.k37'),
      validate: (_values) => {
        return null;
      },
    },
    {
      key: 'review',
      title: i18n.t('qms.fmea.k38'),
      description: i18n.t('qms.fmea.fmea_39'),
      fields: ['reviewer', 'reviewDate', 'status'],
      groupTitle: i18n.t('qms.fmea.k40'),
      isFinalStep: true,
      validate: (values) => {
        if (!values.reviewer) return i18n.t('qms.fmea.k41');
        if (!values.reviewDate) return i18n.t('qms.fmea.k42');
        return null;
      },
    },
  ],
  title: i18n.t('shared.fmea.fmea_30'),
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: i18n.t('qms.fmea.fmea_43'),
  nextButtonText: i18n.t('qms.fmea.k44'),
  prevButtonText: i18n.t('qms.fmea.k45'),
};

export const fmeaSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
} = {
  entity: 'fmea',
  title: i18n.t('shared.fmea.fmea_31'),
  description: i18n.t('shared.fmea.k32'),

  api: {
    module: 'qms',
    resource: 'fmea',
  },

  fields: [
    {
      name: 'fmeaNo',
      label: i18n.t('shared.fmea.fmea_33'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'fmeaName',
      label: i18n.t('shared.fmea.fmea_34'),
      type: 'text',
      required: true,
      sortable: true,
      showInList: true,
      listWidth: 200,
    },
    {
      name: 'fmeaType',
      label: i18n.t('shared.fmea.fmea_35'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { label: i18n.t('qms.fmea.fmeadfmea_46'), value: 'design' },
          { label: i18n.t('qms.fmea.fmeapfmea_47'), value: 'process' },
          { label: i18n.t('qms.fmea.fmeasfmea_48'), value: 'system' },
        ],
      },
      showInList: true,
      filterable: true,
      listWidth: 140,
    },
    {
      name: 'productId',
      label: i18n.t('qms.fmea.id_49'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'productName',
      label: i18n.t('qms.fmea.k50'),
      type: 'text',
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'processId',
      label: i18n.t('qms.fmea.id_51'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'processName',
      label: i18n.t('qms.fmea.k52'),
      type: 'text',
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'version',
      label: i18n.t('qms.fmea.k53'),
      type: 'text',
      defaultValue: '1.0',
      showInList: true,
      listWidth: 80,
    },
    {
      name: 'status',
      label: i18n.t('qms.fmea.k54'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: i18n.t('qms.fmea.k55'), value: 'draft' },
          { label: i18n.t('qms.fmea.k56'), value: 'in_progress' },
          { label: i18n.t('qms.fmea.k57'), value: 'reviewed' },
          { label: i18n.t('qms.fmea.k58'), value: 'approved' },
        ],
      },
      defaultValue: 'draft',
      showInList: true,
      filterable: true,
    },
    {
      name: 'scope',
      label: i18n.t('qms.fmea.k59'),
      type: 'textarea',
      placeholder: i18n.t('qms.fmea.fmea_60'),
      showInList: false,
    },
    {
      name: 'teamLeader',
      label: i18n.t('qms.fmea.k61'),
      type: 'text',
      showInList: true,
    },
    {
      name: 'teamMembers',
      label: i18n.t('qms.fmea.k62'),
      type: 'text',
      placeholder: i18n.t('qms.fmea.k63'),
      showInList: false,
    },
    {
      name: 'description',
      label: i18n.t('qms.fmea.k64'),
      type: 'textarea',
      placeholder: i18n.t('qms.fmea.fmea_65'),
      showInList: false,
    },
    {
      name: 'reviewer',
      label: i18n.t('qms.fmea.k66'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'reviewDate',
      label: i18n.t('qms.fmea.k67'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'createdAt',
      label: i18n.t('qms.fmea.k68'),
      type: 'date',
      readonly: true,
      showInList: true,
      sortable: true,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['fmeaNo', 'fmeaName', 'productName', 'processName'],
    filters: [
      {
        id: 'fmeaType',
        label: i18n.t('shared.fmea.fmea_36'),
        type: 'select',
        options: [
          { label: i18n.t('qms.fmea.k69'), value: 'all' },
          { label: i18n.t('qms.fmea.fmea_70'), value: 'design' },
          { label: i18n.t('qms.fmea.fmea_71'), value: 'process' },
          { label: i18n.t('qms.fmea.fmea_72'), value: 'system' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('qms.fmea.k73'),
        type: 'select',
        options: [
          { label: i18n.t('qms.fmea.k74'), value: 'all' },
          { label: i18n.t('qms.fmea.k75'), value: 'draft' },
          { label: i18n.t('qms.fmea.k76'), value: 'in_progress' },
          { label: i18n.t('qms.fmea.k77'), value: 'reviewed' },
          { label: i18n.t('qms.fmea.k78'), value: 'approved' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        in_progress: 'warning',
        reviewed: 'info',
        approved: 'success',
      },
      labelMap: {
        draft: i18n.t('qms.fmea.k79'),
        in_progress: i18n.t('qms.fmea.k80'),
        reviewed: i18n.t('qms.fmea.k81'),
        approved: i18n.t('qms.fmea.k82'),
      },
    },
  },

  formSections: [
    {
      title: i18n.t('qms.fmea.k83'),
      fields: ['fmeaNo', 'fmeaName', 'fmeaType', 'productName', 'processName', 'version', 'status'],
    },
    {
      title: i18n.t('qms.fmea.k84'),
      fields: ['teamLeader', 'teamMembers', 'scope'],
    },
    {
      title: i18n.t('qms.fmea.k85'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('qms.fmea.fmea_86'),
  editTitle: i18n.t('qms.fmea.fmea_87'),
  detailTitle: i18n.t('shared.fmea.fmea_37'),

  actions: ['create', 'edit', 'detail', 'delete'],

  nestedTables: [fmeaItemsTable, improvementActionsTable],

  wizard: fmeaWizard,
};
