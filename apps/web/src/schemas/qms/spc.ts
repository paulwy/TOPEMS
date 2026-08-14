import type { EntitySchema } from '@/schema';
import { columnsFromFields } from '@/schema/schemaExtensions';
import type { NestedTableConfig, WizardConfig } from '@/schema/schemaExtensions';
import i18n from '@/i18n';

const spcDataPointFields: NestedTableConfig['fields'] = [
  { name: 'sampleNo', label: i18n.t('qms.spc.k0'), type: 'text', listWidth: 100 },
  { name: 'sampleTime', label: i18n.t('qms.spc.k1'), type: 'datetime', listWidth: 160 },
  { name: 'values', label: i18n.t('qms.spc.k2'), type: 'text', listWidth: 150 },
  { name: 'mean', label: i18n.t('qms.spc.k3'), type: 'number', listWidth: 80 },
  { name: 'range', label: i18n.t('qms.spc.k4'), type: 'number', listWidth: 80 },
  { name: 'operator', label: i18n.t('qms.spc.k5'), type: 'text', listWidth: 100 },
  { name: 'remark', label: i18n.t('qms.spc.k6'), type: 'text', listWidth: 200 },
];

const spcDataPointsTable: NestedTableConfig = {
  field: 'dataPoints',
  title: i18n.t('qms.spc.k7'),
  columns: columnsFromFields(spcDataPointFields),
  fields: spcDataPointFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.spc.k8'),
  rowKeyField: 'id',
  minRows: 0,
};

const spcWizard: WizardConfig = {
  steps: [
    {
      key: 'config',
      title: i18n.t('qms.spc.k9'),
      description: i18n.t('qms.spc.k10'),
      fields: [
        'chartName',
        'chartType',
        'productId',
        'productName',
        'characteristic',
        'unit',
        'usl',
        'lsl',
        'target',
        'sampleSize',
        'samplingFrequency',
        'status',
      ],
      groupTitle: i18n.t('qms.spc.k11'),
      validate: (values) => {
        if (!values.chartName) return i18n.t('qms.spc.k12');
        if (!values.chartType) return i18n.t('qms.spc.k13');
        if (!values.characteristic) return i18n.t('qms.spc.k14');
        return null;
      },
    },
    {
      key: 'dataEntry',
      title: i18n.t('qms.spc.k15'),
      description: i18n.t('qms.spc.k16'),
      fields: ['dataPoints'],
      groupTitle: i18n.t('qms.spc.k17'),
      validate: (values) => {
        const dataPoints = (values.dataPoints as Record<string, unknown>[]) || [];
        if (dataPoints.length < 2) return i18n.t('qms.spc.2_18');
        return null;
      },
    },
    {
      key: 'controlLimits',
      title: i18n.t('qms.spc.k19'),
      description: i18n.t('qms.spc.k20'),
      fields: ['ucl', 'lcl', 'cl', 'status'],
      groupTitle: i18n.t('qms.spc.k21'),
      isFinalStep: true,
      validate: (values) => {
        if (values.ucl === undefined || values.ucl === null) return i18n.t('qms.spc.ucl_22');
        if (values.lcl === undefined || values.lcl === null) return i18n.t('qms.spc.lcl_23');
        return null;
      },
    },
  ],
  title: i18n.t('shared.spc.spc_0'),
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: i18n.t('qms.spc.k24'),
  nextButtonText: i18n.t('qms.spc.k25'),
  prevButtonText: i18n.t('qms.spc.k26'),
};

export const spcSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
} = {
  entity: 'spc',
  title: i18n.t('shared.spc.spc_1'),
  description: i18n.t('shared.spc.k2'),

  api: {
    module: 'qms',
    resource: 'spc',
  },

  fields: [
    {
      name: 'chartNo',
      label: i18n.t('qms.spc.k27'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'chartName',
      label: i18n.t('qms.spc.k28'),
      type: 'text',
      required: true,
      sortable: true,
      showInList: true,
      listWidth: 200,
    },
    {
      name: 'chartType',
      label: i18n.t('qms.spc.k29'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { label: i18n.t('shared.spc.xbarr_3'), value: 'x-bar-r' },
          { label: i18n.t('shared.spc.xbars_4'), value: 'x-bar-s' },
          { label: i18n.t('shared.spc.imr_5'), value: 'i-mr' },
          { label: i18n.t('shared.spc.p_6'), value: 'p' },
          { label: i18n.t('shared.spc.c_7'), value: 'c' },
          { label: i18n.t('shared.spc.u_8'), value: 'u' },
          { label: i18n.t('shared.spc.np_9'), value: 'np' },
        ],
      },
      showInList: true,
      filterable: true,
      listWidth: 160,
    },
    {
      name: 'productId',
      label: i18n.t('qms.spc.id_30'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'productName',
      label: i18n.t('qms.spc.k31'),
      type: 'text',
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'processId',
      label: i18n.t('qms.spc.id_32'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'processName',
      label: i18n.t('qms.spc.k33'),
      type: 'text',
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'characteristic',
      label: i18n.t('qms.spc.k34'),
      type: 'text',
      required: true,
      showInList: true,
      listWidth: 160,
    },
    {
      name: 'unit',
      label: i18n.t('qms.spc.k35'),
      type: 'text',
      defaultValue: 'mm',
      showInList: true,
      listWidth: 80,
    },
    {
      name: 'usl',
      label: i18n.t('qms.spc.usl_36'),
      type: 'number',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'lsl',
      label: i18n.t('qms.spc.lsl_37'),
      type: 'number',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'target',
      label: i18n.t('qms.spc.k38'),
      type: 'number',
      showInList: true,
      listWidth: 100,
    },
    {
      name: 'ucl',
      label: i18n.t('qms.spc.ucl_39'),
      type: 'number',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'lcl',
      label: i18n.t('qms.spc.lcl_40'),
      type: 'number',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'cl',
      label: i18n.t('qms.spc.cl_41'),
      type: 'number',
      showInList: true,
      listWidth: 100,
    },
    {
      name: 'sampleSize',
      label: i18n.t('qms.spc.k42'),
      type: 'number',
      defaultValue: 5,
      showInList: false,
    },
    {
      name: 'samplingFrequency',
      label: i18n.t('qms.spc.k43'),
      type: 'text',
      placeholder: i18n.t('qms.spc.k44'),
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('qms.spc.k45'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: i18n.t('qms.spc.k46'), value: 'draft' },
          { label: i18n.t('qms.spc.k47'), value: 'in_progress' },
          { label: i18n.t('qms.spc.k48'), value: 'stable' },
          { label: i18n.t('qms.spc.k49'), value: 'out_of_control' },
          { label: i18n.t('qms.spc.k50'), value: 'archived' },
        ],
      },
      defaultValue: 'draft',
      showInList: true,
      filterable: true,
    },
    {
      name: 'description',
      label: i18n.t('qms.spc.k51'),
      type: 'textarea',
      placeholder: i18n.t('qms.spc.k52'),
      showInList: false,
    },
    {
      name: 'createdAt',
      label: i18n.t('qms.spc.k53'),
      type: 'date',
      readonly: true,
      showInList: true,
      sortable: true,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['chartNo', 'chartName', 'productName', 'characteristic'],
    filters: [
      {
        id: 'chartType',
        label: i18n.t('qms.spc.k54'),
        type: 'select',
        options: [
          { label: i18n.t('qms.spc.k55'), value: 'all' },
          { label: 'X-bar R', value: 'x-bar-r' },
          { label: 'X-bar S', value: 'x-bar-s' },
          { label: 'I-MR', value: 'i-mr' },
          { label: i18n.t('shared.spc.p_10'), value: 'p' },
          { label: i18n.t('shared.spc.c_11'), value: 'c' },
          { label: i18n.t('shared.spc.u_12'), value: 'u' },
          { label: i18n.t('shared.spc.np_13'), value: 'np' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('qms.spc.k56'),
        type: 'select',
        options: [
          { label: i18n.t('qms.spc.k57'), value: 'all' },
          { label: i18n.t('qms.spc.k58'), value: 'draft' },
          { label: i18n.t('qms.spc.k59'), value: 'in_progress' },
          { label: i18n.t('qms.spc.k60'), value: 'stable' },
          { label: i18n.t('qms.spc.k61'), value: 'out_of_control' },
          { label: i18n.t('qms.spc.k62'), value: 'archived' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        in_progress: 'warning',
        stable: 'success',
        out_of_control: 'error',
        archived: 'default',
      },
      labelMap: {
        draft: i18n.t('qms.spc.k63'),
        in_progress: i18n.t('qms.spc.k64'),
        stable: i18n.t('qms.spc.k65'),
        out_of_control: i18n.t('qms.spc.k66'),
        archived: i18n.t('qms.spc.k67'),
      },
    },
  },

  formSections: [
    {
      title: i18n.t('qms.spc.k68'),
      fields: [
        'chartNo',
        'chartName',
        'chartType',
        'productName',
        'characteristic',
        'unit',
        'status',
      ],
    },
    {
      title: i18n.t('qms.spc.k69'),
      fields: ['usl', 'lsl', 'target'],
    },
    {
      title: i18n.t('qms.spc.k70'),
      fields: ['sampleSize', 'samplingFrequency'],
    },
    {
      title: i18n.t('qms.spc.k71'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('qms.spc.spc_72'),
  editTitle: i18n.t('qms.spc.spc_73'),
  detailTitle: i18n.t('shared.spc.spc_14'),

  actions: ['create', 'edit', 'detail', 'delete'],

  nestedTables: [spcDataPointsTable],

  wizard: spcWizard,
};
