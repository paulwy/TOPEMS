import type { EntitySchema } from '@/schema';
import { columnsFromFields } from '@/schema/schemaExtensions';
import type { NestedTableConfig, WizardConfig } from '@/schema/schemaExtensions';

const fmeaItemFields: NestedTableConfig['fields'] = [
  { name: 'itemNo', label: '编号', type: 'text', listWidth: 80 },
  { name: 'functionDescription', label: '功能描述', type: 'text', listWidth: 150 },
  { name: 'failureMode', label: '失效模式', type: 'text', required: true, listWidth: 180 },
  { name: 'failureEffect', label: '失效影响', type: 'text', required: true, listWidth: 200 },
  { name: 'failureCause', label: '失效原因', type: 'text', required: true, listWidth: 200 },
  {
    name: 'severity',
    label: '严重度 (S)',
    type: 'select',
    required: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: '1 - 无影响', value: '1' },
        { label: '2 - 轻微', value: '2' },
        { label: '3 - 中等', value: '3' },
        { label: '4 - 较高', value: '4' },
        { label: '5 - 高', value: '5' },
        { label: '6 - 严重', value: '6' },
        { label: '7 - 重大', value: '7' },
        { label: '8 - 严重', value: '8' },
        { label: '9 - 灾难性', value: '9' },
        { label: '10 - 极严重', value: '10' },
      ],
    },
  },
  {
    name: 'occurrence',
    label: '频度 (O)',
    type: 'select',
    required: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: '1 - 极少', value: '1' },
        { label: '2 - 很少', value: '2' },
        { label: '3 - 偶尔', value: '3' },
        { label: '4 - 较少', value: '4' },
        { label: '5 - 中等', value: '5' },
        { label: '6 - 较多', value: '6' },
        { label: '7 - 频繁', value: '7' },
        { label: '8 - 经常', value: '8' },
        { label: '9 - 很高', value: '9' },
        { label: '10 - 极高', value: '10' },
      ],
    },
  },
  {
    name: 'detection',
    label: '探测度 (D)',
    type: 'select',
    required: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: '1 - 几乎确定', value: '1' },
        { label: '2 - 很可能', value: '2' },
        { label: '3 - 可能', value: '3' },
        { label: '4 - 偶尔', value: '4' },
        { label: '5 - 较少', value: '5' },
        { label: '6 - 中等', value: '6' },
        { label: '7 - 较多', value: '7' },
        { label: '8 - 频繁', value: '8' },
        { label: '9 - 经常', value: '9' },
        { label: '10 - 无法探测', value: '10' },
      ],
    },
  },
  { name: 'rpn', label: 'RPN', type: 'number', listWidth: 80, readonly: true },
  { name: 'recommendedActions', label: '建议措施', type: 'text', listWidth: 200 },
  { name: 'responsibility', label: '责任人', type: 'text', listWidth: 100 },
  { name: 'targetDate', label: '完成日期', type: 'date', listWidth: 120 },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: '待处理', value: 'pending' },
        { label: '进行中', value: 'in_progress' },
        { label: '已完成', value: 'completed' },
      ],
    },
  },
];

const fmeaItemsTable: NestedTableConfig = {
  field: 'items',
  title: '失效模式分析项',
  columns: columnsFromFields(fmeaItemFields),
  fields: fmeaItemFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加失效模式',
  rowKeyField: 'id',
  minRows: 0,
};

const improvementActionsFields: NestedTableConfig['fields'] = [
  { name: 'action', label: '改进措施', type: 'text', required: true, listWidth: 250 },
  { name: 'owner', label: '责任人', type: 'text', listWidth: 100 },
  { name: 'dueDate', label: '完成日期', type: 'date', listWidth: 120 },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: '计划中', value: 'planned' },
        { label: '进行中', value: 'in_progress' },
        { label: '已完成', value: 'completed' },
      ],
    },
  },
];

const improvementActionsTable: NestedTableConfig = {
  field: 'improvementActions',
  title: '改进措施',
  columns: columnsFromFields(improvementActionsFields),
  fields: improvementActionsFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加改进措施',
  rowKeyField: 'id',
  minRows: 0,
};

const fmeaWizard: WizardConfig = {
  steps: [
    {
      key: 'basic',
      title: '基本信息',
      description: '填写 FMEA 分析的基础信息',
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
      groupTitle: '基础信息',
      validate: (values) => {
        if (!values.fmeaName) return '请填写 FMEA 名称';
        if (!values.fmeaType) return '请选择 FMEA 类型';
        return null;
      },
    },
    {
      key: 'failureModes',
      title: '失效模式分析',
      description: '录入所有可能的失效模式及其影响、原因和风险评估',
      fields: ['items'],
      groupTitle: '失效模式与影响分析',
      validate: (values) => {
        const items = (values.items as Record<string, unknown>[]) || [];
        if (items.length === 0) return '请至少添加一项失效模式';
        return null;
      },
    },
    {
      key: 'improvement',
      title: '改进措施',
      description: '针对高风险项制定改进措施和责任人',
      fields: ['improvementActions'],
      groupTitle: '改进措施规划',
      validate: (_values) => {
        return null;
      },
    },
    {
      key: 'review',
      title: '评审确认',
      description: '由评审人确认 FMEA 分析结果',
      fields: ['reviewer', 'reviewDate', 'status'],
      groupTitle: '评审与确认',
      isFinalStep: true,
      validate: (values) => {
        if (!values.reviewer) return '请填写评审人';
        if (!values.reviewDate) return '请选择评审日期';
        return null;
      },
    },
  ],
  title: 'FMEA 失效模式与影响分析',
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: '提交 FMEA 分析',
  nextButtonText: '下一步',
  prevButtonText: '上一步',
};

export const fmeaSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
} = {
  entity: 'fmea',
  title: 'FMEA 失效模式与影响分析',
  description: 'Failure Mode and Effects Analysis — 结构化的风险分析工具',

  api: {
    module: 'qms',
    resource: 'fmea',
  },

  fields: [
    {
      name: 'fmeaNo',
      label: 'FMEA 编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'fmeaName',
      label: 'FMEA 名称',
      type: 'text',
      required: true,
      sortable: true,
      showInList: true,
      listWidth: 200,
    },
    {
      name: 'fmeaType',
      label: 'FMEA 类型',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { label: '设计 FMEA (DFMEA)', value: 'design' },
          { label: '过程 FMEA (PFMEA)', value: 'process' },
          { label: '系统 FMEA (SFMEA)', value: 'system' },
        ],
      },
      showInList: true,
      filterable: true,
      listWidth: 140,
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
      name: 'version',
      label: '版本',
      type: 'text',
      defaultValue: '1.0',
      showInList: true,
      listWidth: 80,
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
          { label: '已评审', value: 'reviewed' },
          { label: '已批准', value: 'approved' },
        ],
      },
      defaultValue: 'draft',
      showInList: true,
      filterable: true,
    },
    {
      name: 'scope',
      label: '范围',
      type: 'textarea',
      placeholder: '描述 FMEA 分析的范围',
      showInList: false,
    },
    {
      name: 'teamLeader',
      label: '团队负责人',
      type: 'text',
      showInList: true,
    },
    {
      name: 'teamMembers',
      label: '团队成员',
      type: 'text',
      placeholder: '多人用逗号分隔',
      showInList: false,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      placeholder: '请描述 FMEA 分析的目的和背景',
      showInList: false,
    },
    {
      name: 'reviewer',
      label: '评审人',
      type: 'text',
      showInList: false,
    },
    {
      name: 'reviewDate',
      label: '评审日期',
      type: 'date',
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
    searchFields: ['fmeaNo', 'fmeaName', 'productName', 'processName'],
    filters: [
      {
        id: 'fmeaType',
        label: 'FMEA 类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '设计 FMEA', value: 'design' },
          { label: '过程 FMEA', value: 'process' },
          { label: '系统 FMEA', value: 'system' },
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
          { label: '已评审', value: 'reviewed' },
          { label: '已批准', value: 'approved' },
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
        draft: '草稿',
        in_progress: '进行中',
        reviewed: '已评审',
        approved: '已批准',
      },
    },
  },

  formSections: [
    {
      title: '基础信息',
      fields: ['fmeaNo', 'fmeaName', 'fmeaType', 'productName', 'processName', 'version', 'status'],
    },
    {
      title: '团队与范围',
      fields: ['teamLeader', 'teamMembers', 'scope'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新建 FMEA 分析',
  editTitle: '编辑 FMEA 分析',
  detailTitle: 'FMEA 分析详情',

  actions: ['create', 'edit', 'detail', 'delete'],

  nestedTables: [fmeaItemsTable, improvementActionsTable],

  wizard: fmeaWizard,
};
