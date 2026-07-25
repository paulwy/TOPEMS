import type { EntitySchema } from '@/schema';
import { columnsFromFields } from '@/schema/schemaExtensions';
import type { NestedTableConfig, WizardConfig } from '@/schema/schemaExtensions';

const spcDataPointFields: NestedTableConfig['fields'] = [
  { name: 'sampleNo', label: '样本号', type: 'text', listWidth: 100 },
  { name: 'sampleTime', label: '采样时间', type: 'datetime', listWidth: 160 },
  { name: 'values', label: '测量值', type: 'text', listWidth: 150 },
  { name: 'mean', label: '均值', type: 'number', listWidth: 80 },
  { name: 'range', label: '极差', type: 'number', listWidth: 80 },
  { name: 'operator', label: '操作员', type: 'text', listWidth: 100 },
  { name: 'remark', label: '备注', type: 'text', listWidth: 200 },
];

const spcDataPointsTable: NestedTableConfig = {
  field: 'dataPoints',
  title: '数据点',
  columns: columnsFromFields(spcDataPointFields),
  fields: spcDataPointFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加数据点',
  rowKeyField: 'id',
  minRows: 0,
};

const spcWizard: WizardConfig = {
  steps: [
    {
      key: 'config',
      title: '控制图配置',
      description: '设置控制图类型、产品和规格限',
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
      groupTitle: '控制图基本配置',
      validate: (values) => {
        if (!values.chartName) return '请填写控制图名称';
        if (!values.chartType) return '请选择控制图类型';
        if (!values.characteristic) return '请填写质量特性';
        return null;
      },
    },
    {
      key: 'dataEntry',
      title: '数据点录入',
      description: '录入原始数据点用于控制图分析',
      fields: ['dataPoints'],
      groupTitle: '数据录入',
      validate: (values) => {
        const dataPoints = (values.dataPoints as Record<string, unknown>[]) || [];
        if (dataPoints.length < 2) return '请至少录入 2 个数据点';
        return null;
      },
    },
    {
      key: 'controlLimits',
      title: '控制限计算与确认',
      description: '计算控制限并确认控制图状态',
      fields: ['ucl', 'lcl', 'cl', 'status'],
      groupTitle: '控制限',
      isFinalStep: true,
      validate: (values) => {
        if (values.ucl === undefined || values.ucl === null) return '请确认上控制限 (UCL)';
        if (values.lcl === undefined || values.lcl === null) return '请确认下控制限 (LCL)';
        return null;
      },
    },
  ],
  title: 'SPC 统计过程控制',
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: '提交控制图',
  nextButtonText: '下一步',
  prevButtonText: '上一步',
};

export const spcSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
} = {
  entity: 'spc',
  title: 'SPC 统计过程控制',
  description: 'Statistical Process Control — 基于控制图的过程稳定性监控',

  api: {
    module: 'qms',
    resource: 'spc',
  },

  fields: [
    {
      name: 'chartNo',
      label: '控制图编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'chartName',
      label: '控制图名称',
      type: 'text',
      required: true,
      sortable: true,
      showInList: true,
      listWidth: 200,
    },
    {
      name: 'chartType',
      label: '控制图类型',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { label: 'X-bar R (均值-极差图)', value: 'x-bar-r' },
          { label: 'X-bar S (均值-标准差图)', value: 'x-bar-s' },
          { label: 'I-MR (单值-移动极差图)', value: 'i-mr' },
          { label: 'P 图 (不合格率)', value: 'p' },
          { label: 'C 图 (缺陷数)', value: 'c' },
          { label: 'U 图 (单位缺陷数)', value: 'u' },
          { label: 'NP 图 (不合格品数)', value: 'np' },
        ],
      },
      showInList: true,
      filterable: true,
      listWidth: 160,
    },
    {
      name: 'productId',
      label: '产品 ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'productName',
      label: '产品名称',
      type: 'text',
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'processId',
      label: '过程 ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'processName',
      label: '过程名称',
      type: 'text',
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'characteristic',
      label: '质量特性',
      type: 'text',
      required: true,
      showInList: true,
      listWidth: 160,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      defaultValue: 'mm',
      showInList: true,
      listWidth: 80,
    },
    {
      name: 'usl',
      label: '上规格限 (USL)',
      type: 'number',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'lsl',
      label: '下规格限 (LSL)',
      type: 'number',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'target',
      label: '目标值',
      type: 'number',
      showInList: true,
      listWidth: 100,
    },
    {
      name: 'ucl',
      label: '上控制限 (UCL)',
      type: 'number',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'lcl',
      label: '下控制限 (LCL)',
      type: 'number',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'cl',
      label: '中心线 (CL)',
      type: 'number',
      showInList: true,
      listWidth: 100,
    },
    {
      name: 'sampleSize',
      label: '样本大小',
      type: 'number',
      defaultValue: 5,
      showInList: false,
    },
    {
      name: 'samplingFrequency',
      label: '采样频率',
      type: 'text',
      placeholder: '如：每小时一次',
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: '草稿', value: 'draft' },
          { label: '进行中', value: 'in_progress' },
          { label: '已稳定', value: 'stable' },
          { label: '失控', value: 'out_of_control' },
          { label: '已归档', value: 'archived' },
        ],
      },
      defaultValue: 'draft',
      showInList: true,
      filterable: true,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      placeholder: '请描述控制图的用途和范围',
      showInList: false,
    },
    {
      name: 'createdAt',
      label: '创建日期',
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
        label: '控制图类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: 'X-bar R', value: 'x-bar-r' },
          { label: 'X-bar S', value: 'x-bar-s' },
          { label: 'I-MR', value: 'i-mr' },
          { label: 'P 图', value: 'p' },
          { label: 'C 图', value: 'c' },
          { label: 'U 图', value: 'u' },
          { label: 'NP 图', value: 'np' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '进行中', value: 'in_progress' },
          { label: '已稳定', value: 'stable' },
          { label: '失控', value: 'out_of_control' },
          { label: '已归档', value: 'archived' },
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
        draft: '草稿',
        in_progress: '进行中',
        stable: '已稳定',
        out_of_control: '失控',
        archived: '已归档',
      },
    },
  },

  formSections: [
    {
      title: '基础信息',
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
      title: '规格限',
      fields: ['usl', 'lsl', 'target'],
    },
    {
      title: '采样设置',
      fields: ['sampleSize', 'samplingFrequency'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新建 SPC 控制图',
  editTitle: '编辑 SPC 控制图',
  detailTitle: 'SPC 控制图详情',

  actions: ['create', 'edit', 'detail', 'delete'],

  nestedTables: [spcDataPointsTable],

  wizard: spcWizard,
};
