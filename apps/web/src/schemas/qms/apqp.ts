/**
 * APQP Schema — 驱动 QmsApqpPage 的完整 CRUD
 *
 * PoC：集成 WizardBuilder（5阶段向导）+ NestedTableConfig（阶段任务子表）
 * - WizardBuilder：5 步向导（阶段1计划立项 → 阶段2产品设计 → 阶段3过程设计 → 阶段4产品确认 → 阶段5反馈改进）
 * - NestedTableConfig：每个阶段的任务子表
 *
 * 注意：本文件为纯 Schema 定义，不含 JSX。
 */

import type { EntitySchema } from '@/schema';
import { columnsFromFields } from '@/schema/schemaExtensions';
import type { NestedTableConfig, WizardConfig } from '@/schema/schemaExtensions';

// ============ 阶段任务子表通用字段 ============

const phaseTaskFields: NestedTableConfig['fields'] = [
  { name: 'task_name', label: '任务名称', type: 'text', required: true, listWidth: 200 },
  {
    name: 'task_type',
    label: '任务类型',
    type: 'select',
    listWidth: 120,
    options: {
      type: 'static',
      options: [
        { label: '核心任务', value: 'core' },
        { label: '支持任务', value: 'support' },
        { label: '评审任务', value: 'review' },
        { label: '验证任务', value: 'validation' },
      ],
    },
  },
  { name: 'deliverable', label: '交付物', type: 'text', listWidth: 180 },
  { name: 'assignee', label: '负责人', type: 'text', listWidth: 100 },
  { name: 'due_date', label: '截止日期', type: 'date', listWidth: 130 },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: '待开始', value: 'pending' },
        { label: '进行中', value: 'in_progress' },
        { label: '已完成', value: 'completed' },
        { label: '已延期', value: 'delayed' },
      ],
    },
  },
];

// ============ 5 个阶段任务子表 ============

const phase1TasksTable: NestedTableConfig = {
  field: 'phase1_tasks',
  title: '阶段1 - 计划与立项任务',
  columns: columnsFromFields(phaseTaskFields),
  fields: phaseTaskFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加任务',
  rowKeyField: 'id',
  minRows: 0,
};

const phase2TasksTable: NestedTableConfig = {
  field: 'phase2_tasks',
  title: '阶段2 - 产品设计与开发任务',
  columns: columnsFromFields(phaseTaskFields),
  fields: phaseTaskFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加任务',
  rowKeyField: 'id',
  minRows: 0,
};

const phase3TasksTable: NestedTableConfig = {
  field: 'phase3_tasks',
  title: '阶段3 - 过程设计与开发任务',
  columns: columnsFromFields(phaseTaskFields),
  fields: phaseTaskFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加任务',
  rowKeyField: 'id',
  minRows: 0,
};

const phase4TasksTable: NestedTableConfig = {
  field: 'phase4_tasks',
  title: '阶段4 - 产品与过程确认任务',
  columns: columnsFromFields(phaseTaskFields),
  fields: phaseTaskFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加任务',
  rowKeyField: 'id',
  minRows: 0,
};

const phase5TasksTable: NestedTableConfig = {
  field: 'phase5_tasks',
  title: '阶段5 - 反馈、评价与改进任务',
  columns: columnsFromFields(phaseTaskFields),
  fields: phaseTaskFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加任务',
  rowKeyField: 'id',
  minRows: 0,
};

// ============ 向导配置 ============

export const apqpWizard: WizardConfig = {
  steps: [
    {
      key: 'phase1',
      title: '阶段1：计划与立项',
      description: '制定项目计划，明确项目目标和资源需求',
      fields: ['phase1_deliverables', 'phase1_owner', 'phase1_due_date', 'phase1_tasks'],
      groupTitle: '计划与立项',
      validate: (values) => {
        if (!values.phase1_deliverables) return '请填写阶段1交付物';
        return null;
      },
    },
    {
      key: 'phase2',
      title: '阶段2：产品设计与开发',
      description: '完成产品设计、验证产品设计可行性',
      fields: ['phase2_deliverables', 'phase2_owner', 'phase2_due_date', 'phase2_tasks'],
      groupTitle: '产品设计与开发',
      validate: (values) => {
        if (!values.phase2_deliverables) return '请填写阶段2交付物';
        return null;
      },
    },
    {
      key: 'phase3',
      title: '阶段3：过程设计与开发',
      description: '完成制造过程设计、开发工装和设备',
      fields: ['phase3_deliverables', 'phase3_owner', 'phase3_due_date', 'phase3_tasks'],
      groupTitle: '过程设计与开发',
      validate: (values) => {
        if (!values.phase3_deliverables) return '请填写阶段3交付物';
        return null;
      },
    },
    {
      key: 'phase4',
      title: '阶段4：产品与过程确认',
      description: '进行产品和过程确认、通过生产件批准',
      fields: ['phase4_deliverables', 'phase4_owner', 'phase4_due_date', 'phase4_tasks'],
      groupTitle: '产品与过程确认',
      validate: (values) => {
        if (!values.phase4_deliverables) return '请填写阶段4交付物';
        return null;
      },
    },
    {
      key: 'phase5',
      title: '阶段5：反馈、评价与改进',
      description: '收集反馈、评价改进、持续优化',
      fields: ['phase5_deliverables', 'phase5_owner', 'phase5_due_date', 'phase5_tasks'],
      groupTitle: '反馈、评价与改进',
      isFinalStep: true,
      validate: (values) => {
        if (!values.phase5_deliverables) return '请填写阶段5交付物';
        return null;
      },
    },
  ],
  title: 'APQP 5阶段质量策划',
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: '提交APQP项目',
  nextButtonText: '下一步',
  prevButtonText: '上一步',
};

// ============ 主 Schema ============

export const apqpSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
} = {
  entity: 'apqp',
  title: 'APQP 产品质量先期策划',
  description: 'Advanced Product Quality Planning — 结构化的产品质量策划流程',

  api: {
    module: 'qms',
    resource: 'apqp',
  },

  fields: [
    {
      name: 'project_no',
      label: '项目编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'project_name',
      label: '项目名称',
      type: 'text',
      required: true,
      sortable: true,
      showInList: true,
      listWidth: 200,
    },
    {
      name: 'customer',
      label: '客户',
      type: 'text',
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: '策划中', value: 'planning' },
          { label: '设计中', value: 'designing' },
          { label: '验证中', value: 'validating' },
          { label: '已确认', value: 'confirmed' },
          { label: '已完成', value: 'completed' },
        ],
      },
      defaultValue: 'planning',
      showInList: true,
      filterable: true,
    },
    {
      name: 'current_phase',
      label: '当前阶段',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: '阶段1：计划与立项', value: 'phase1' },
          { label: '阶段2：产品设计与开发', value: 'phase2' },
          { label: '阶段3：过程设计与开发', value: 'phase3' },
          { label: '阶段4：产品与过程确认', value: 'phase4' },
          { label: '阶段5：反馈、评价与改进', value: 'phase5' },
        ],
      },
      defaultValue: 'phase1',
      showInList: true,
      filterable: true,
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'target_date',
      label: '目标日期',
      type: 'date',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'team',
      label: '团队成员',
      type: 'text',
      placeholder: '多人用逗号分隔',
      showInList: false,
    },
    {
      name: 'description',
      label: '项目描述',
      type: 'textarea',
      placeholder: '请描述项目的目的和范围',
      showInList: false,
    },

    // ── 阶段1：计划与立项 ──
    {
      name: 'phase1_deliverables',
      label: '阶段1交付物',
      type: 'textarea',
      placeholder: '如：项目计划书、可行性分析报告等',
      showInList: false,
    },
    {
      name: 'phase1_owner',
      label: '阶段1负责人',
      type: 'text',
      showInList: false,
    },
    {
      name: 'phase1_due_date',
      label: '阶段1截止日期',
      type: 'date',
      showInList: false,
    },

    // ── 阶段2：产品设计与开发 ──
    {
      name: 'phase2_deliverables',
      label: '阶段2交付物',
      type: 'textarea',
      placeholder: '如：设计图纸、BOM、DFMEA等',
      showInList: false,
    },
    {
      name: 'phase2_owner',
      label: '阶段2负责人',
      type: 'text',
      showInList: false,
    },
    {
      name: 'phase2_due_date',
      label: '阶段2截止日期',
      type: 'date',
      showInList: false,
    },

    // ── 阶段3：过程设计与开发 ──
    {
      name: 'phase3_deliverables',
      label: '阶段3交付物',
      type: 'textarea',
      placeholder: '如：流程图、PFMEA、控制计划等',
      showInList: false,
    },
    {
      name: 'phase3_owner',
      label: '阶段3负责人',
      type: 'text',
      showInList: false,
    },
    {
      name: 'phase3_due_date',
      label: '阶段3截止日期',
      type: 'date',
      showInList: false,
    },

    // ── 阶段4：产品与过程确认 ──
    {
      name: 'phase4_deliverables',
      label: '阶段4交付物',
      type: 'textarea',
      placeholder: '如：试生产报告、尺寸测量报告、性能测试报告等',
      showInList: false,
    },
    {
      name: 'phase4_owner',
      label: '阶段4负责人',
      type: 'text',
      showInList: false,
    },
    {
      name: 'phase4_due_date',
      label: '阶段4截止日期',
      type: 'date',
      showInList: false,
    },

    // ── 阶段5：反馈、评价与改进 ──
    {
      name: 'phase5_deliverables',
      label: '阶段5交付物',
      type: 'textarea',
      placeholder: '如：PPAP文件包、经验教训报告、改进计划等',
      showInList: false,
    },
    {
      name: 'phase5_owner',
      label: '阶段5负责人',
      type: 'text',
      showInList: false,
    },
    {
      name: 'phase5_due_date',
      label: '阶段5截止日期',
      type: 'date',
      showInList: false,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['project_no', 'project_name', 'customer'],
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '策划中', value: 'planning' },
          { label: '设计中', value: 'designing' },
          { label: '验证中', value: 'validating' },
          { label: '已确认', value: 'confirmed' },
          { label: '已完成', value: 'completed' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'current_phase',
        label: '当前阶段',
        type: 'select',
        options: [
          { label: '全部阶段', value: 'all' },
          { label: '阶段1', value: 'phase1' },
          { label: '阶段2', value: 'phase2' },
          { label: '阶段3', value: 'phase3' },
          { label: '阶段4', value: 'phase4' },
          { label: '阶段5', value: 'phase5' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        planning: 'primary',
        designing: 'warning',
        validating: 'info',
        confirmed: 'success',
        completed: 'default',
      },
      labelMap: {
        planning: '策划中',
        designing: '设计中',
        validating: '验证中',
        confirmed: '已确认',
        completed: '已完成',
      },
    },
  },

  formSections: [
    {
      title: '基础信息',
      fields: ['project_no', 'project_name', 'customer', 'status', 'current_phase'],
    },
    {
      title: '时间与团队',
      fields: ['start_date', 'target_date', 'team'],
    },
    {
      title: '项目描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新建 APQP 项目',
  editTitle: '编辑 APQP 项目',
  detailTitle: 'APQP 项目详情',

  actions: ['create', 'edit', 'detail', 'delete'],

  // Phase 3 扩展：5 个阶段任务子表
  nestedTables: [
    phase1TasksTable,
    phase2TasksTable,
    phase3TasksTable,
    phase4TasksTable,
    phase5TasksTable,
  ],

  // Phase 3 扩展：5 步向导表单
  wizard: apqpWizard,
};
