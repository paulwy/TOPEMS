/**
 * 8D 报告 Schema — 驱动 QmsEightDPage 的完整 CRUD
 *
 * PoC：集成 WizardBuilder（8步向导）+ SubTableBuilder（子表）+ TreeBuilder（原因分析树）
 * - WizardBuilder：8 步向导（D1 团队 → D2 问题 → D3 临时措施 → D4 根因 → D5 永久措施 → D6 验证 → D7 预防 → D8 认可）
 * - SubTableBuilder：团队成员、临时措施、根因分析、永久措施子表
 * - TreeBuilder：D4 根因分析树形结构
 *
 * 注意：本文件为纯 Schema 定义，不含 JSX。自定义渲染函数在 QmsEightDPage.tsx 中定义并注入。
 */

import type { EntitySchema } from '@/schema';
import { columnsFromFields } from '@/schema/schemaExtensions';
import type {
  NestedTableConfig,
  WizardConfig,
  TreeConfig,
  WizardStepRenderProps,
} from '@/schema/schemaExtensions';
import type { TreeNode } from '@/components/templates/TreeBuilder';
import type { SchemaField } from '@/schema/types';

/** D4 根因分析自定义渲染函数类型 */
export type RootCauseRenderer = (props: WizardStepRenderProps) => React.ReactNode;

// ============ D1 团队成员子表 ============

const teamMembersFields: NestedTableConfig['fields'] = [
  { name: 'name', label: '姓名', type: 'text', required: true, listWidth: 120 },
  { name: 'role', label: '角色', type: 'select', listWidth: 120, options: {
    type: 'static',
    options: [
      { label: '团队负责人', value: 'leader' },
      { label: '质量代表', value: 'quality' },
      { label: '工程', value: 'engineering' },
      { label: '生产', value: 'production' },
      { label: '采购', value: 'procurement' },
      { label: '其他', value: 'other' },
    ],
  }},
  { name: 'department', label: '部门', type: 'text', listWidth: 120 },
  { name: 'contact', label: '联系方式', type: 'text', listWidth: 140 },
];

const teamMembersTable: NestedTableConfig = {
  field: 'team_members',
  title: '团队成员',
  columns: columnsFromFields(teamMembersFields),
  fields: teamMembersFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加成员',
  rowKeyField: 'id',
  minRows: 1,
};

// ============ D3 临时措施子表 ============

const containmentActionsFields: NestedTableConfig['fields'] = [
  { name: 'description', label: '措施描述', type: 'text', required: true, listWidth: 250 },
  { name: 'implement_date', label: '实施日期', type: 'date', listWidth: 130 },
  { name: 'owner', label: '负责人', type: 'text', listWidth: 100 },
  { name: 'effectiveness', label: '有效性', type: 'select', listWidth: 100, options: {
    type: 'static',
    options: [
      { label: '有效', value: 'effective' },
      { label: '部分有效', value: 'partial' },
      { label: '无效', value: 'ineffective' },
    ],
  }},
];

const containmentActionsTable: NestedTableConfig = {
  field: 'containment_actions',
  title: '临时措施',
  columns: columnsFromFields(containmentActionsFields),
  fields: containmentActionsFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加措施',
  rowKeyField: 'id',
  minRows: 1,
  validate: (rows) => {
    if (rows.length === 0) return '至少需要一项临时措施';
    return null;
  },
};

// ============ D4 根因分析子表 ============

const rootCausesFields: NestedTableConfig['fields'] = [
  { name: 'cause', label: '原因描述', type: 'text', required: true, listWidth: 200 },
  { name: 'category', label: '类别', type: 'select', listWidth: 100, options: {
    type: 'static',
    options: [
      { label: '人 (Man)', value: 'man' },
      { label: '机 (Machine)', value: 'machine' },
      { label: '料 (Material)', value: 'material' },
      { label: '法 (Method)', value: 'method' },
      { label: '环 (Environment)', value: 'environment' },
      { label: '测 (Measurement)', value: 'measurement' },
    ],
  }},
  { name: 'level', label: '层级', type: 'select', listWidth: 80, options: {
    type: 'static',
    options: [
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
      { label: '4', value: '4' },
      { label: '5 (根因)', value: '5' },
    ],
  }},
  { name: 'is_root', label: '是否根因', type: 'switch', listWidth: 80 },
  { name: 'analysis_method', label: '分析方法', type: 'select', listWidth: 120, options: {
    type: 'static',
    options: [
      { label: '5Why', value: '5why' },
      { label: '鱼骨图', value: 'fishbone' },
      { label: 'FMEA', value: 'fmea' },
      { label: 'Pareto', value: 'pareto' },
    ],
  }},
];

const rootCausesTable: NestedTableConfig = {
  field: 'root_causes',
  title: '原因分析',
  columns: columnsFromFields(rootCausesFields as SchemaField[]),
  fields: rootCausesFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加原因',
  rowKeyField: 'id',
  minRows: 1,
};

// ============ D5 永久措施子表 ============

const permanentActionsFields: NestedTableConfig['fields'] = [
  { name: 'action', label: '措施描述', type: 'text', required: true, listWidth: 200 },
  { name: 'target_date', label: '目标完成日期', type: 'date', listWidth: 130 },
  { name: 'owner', label: '负责人', type: 'text', listWidth: 100 },
  { name: 'verification_standard', label: '验证标准', type: 'text', listWidth: 180 },
  { name: 'status', label: '状态', type: 'select', listWidth: 100, options: {
    type: 'static',
    options: [
      { label: '待实施', value: 'pending' },
      { label: '实施中', value: 'in_progress' },
      { label: '已完成', value: 'completed' },
    ],
  }},
];

const permanentActionsTable: NestedTableConfig = {
  field: 'permanent_actions',
  title: '永久措施',
  columns: columnsFromFields(permanentActionsFields),
  fields: permanentActionsFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '添加措施',
  rowKeyField: 'id',
  minRows: 1,
  validate: (rows) => {
    if (rows.length === 0) return '至少需要一项永久措施';
    return null;
  },
};

// ============ 向导配置 ============

/**
 * 8D 向导步骤配置
 *
 * 使用前需在 QmsEightDPage.tsx 中注入 D4 的 renderContent：
 *   import { createRootCauseRenderer } from './rootCauseRenderer';
 *   eightDWizard.steps[3].renderContent = createRootCauseRenderer();
 */
export const eightDWizard: WizardConfig = {
  steps: [
    {
      key: 'd1',
      title: 'D1 团队建立',
      description: '组建跨职能团队，明确成员和职责',
      fields: ['team_leader', 'team_members'],
      groupTitle: '团队信息',
      validate: (values) => {
        if (!values.team_leader) return '请填写团队负责人';
        const members = (values.team_members as Record<string, unknown>[]) || [];
        if (members.length === 0) return '至少需要一名团队成员';
        return null;
      },
    },
    {
      key: 'd2',
      title: 'D2 问题描述',
      description: '详细描述问题现象、发生日期和影响范围',
      fields: ['title', 'problem_description', 'problem_date', 'impact_scope', 'severity'],
      groupTitle: '问题详情',
      validate: (values) => {
        if (!values.title) return '请填写问题标题';
        if (!values.problem_description) return '请填写问题描述';
        return null;
      },
    },
    {
      key: 'd3',
      title: 'D3 临时措施',
      description: '实施临时遏制措施，防止问题扩大',
      fields: ['containment_actions', 'd3_effectiveness_check'],
      groupTitle: '遏制措施',
      validate: (values) => {
        const actions = (values.containment_actions as Record<string, unknown>[]) || [];
        if (actions.length === 0) return '请至少添加一项临时措施';
        return null;
      },
    },
    {
      key: 'd4',
      title: 'D4 根本原因分析',
      description: '使用鱼骨图或 5Why 方法分析根本原因',
      fields: ['root_causes', 'root_cause_tree'],
      groupTitle: '根因分析',
      // renderContent 在页面初始化时由 QmsEightDPage.tsx 注入
      validate: (values) => {
        const causes = (values.root_causes as Record<string, unknown>[]) || [];
        const tree = (values.root_cause_tree as TreeNode[]) || [];
        if (causes.length === 0 && tree.length === 0) {
          return '请至少添加一项原因分析';
        }
        return null;
      },
    },
    {
      key: 'd5',
      title: 'D5 永久措施',
      description: '制定永久纠正措施并设定验证标准',
      fields: ['permanent_actions', 'd5_validation_standard'],
      groupTitle: '永久措施',
      validate: (values) => {
        const actions = (values.permanent_actions as Record<string, unknown>[]) || [];
        if (actions.length === 0) return '请至少添加一项永久措施';
        return null;
      },
    },
    {
      key: 'd6',
      title: 'D6 效果验证',
      description: '验证永久措施的实施效果，进行数据对比',
      fields: ['d6_verification_result', 'd6_data_comparison', 'd6_is_effective'],
      groupTitle: '效果验证',
      validate: (values) => {
        if (!values.d6_verification_result) return '请填写验证结果';
        return null;
      },
    },
    {
      key: 'd7',
      title: 'D7 预防措施',
      description: '制定预防再发措施，更新相关文档和流程',
      fields: ['d7_preventive_action', 'd7_updated_documents', 'd7_target_date'],
      groupTitle: '预防措施',
      validate: (values) => {
        if (!values.d7_preventive_action) return '请填写预防措施';
        return null;
      },
    },
    {
      key: 'd8',
      title: 'D8 团队认可',
      description: '团队签字确认，关闭 8D 报告',
      fields: ['d8_approver', 'd8_sign_off_date', 'd8_closure_summary'],
      groupTitle: '认可与关闭',
      isFinalStep: true,
      validate: (values) => {
        if (!values.d8_approver) return '请填写审批人';
        if (!values.d8_sign_off_date) return '请选择签字日期';
        return null;
      },
    },
  ],
  title: '8D 问题解决报告',
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: '提交 8D 报告',
  nextButtonText: '下一步',
  prevButtonText: '上一步',
};

// ============ 主 Schema ============

export const eightDSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
  tree: TreeConfig;
} = {
  entity: 'eightD',
  title: '8D 问题解决',
  description: 'Eight Disciplines Problem Solving — 结构化问题解决流程',

  api: {
    module: 'qms',
    resource: 'eightD',
  },

  fields: [
    // ── 基础信息 ──
    {
      name: 'report_no',
      label: '报告编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      showInList: true,
    },
    {
      name: 'title',
      label: '问题标题',
      type: 'text',
      required: true,
      sortable: true,
      showInList: true,
      listWidth: 200,
    },
    {
      name: 'problem_description',
      label: '问题描述',
      type: 'textarea',
      required: true,
      showInList: false,
    },
    {
      name: 'severity',
      label: '严重程度',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { label: '严重 (Critical)', value: 'critical' },
          { label: '高 (High)', value: 'high' },
          { label: '中 (Medium)', value: 'medium' },
          { label: '低 (Low)', value: 'low' },
        ],
      },
      defaultValue: 'medium',
      showInList: true,
      filterable: true,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: '待处理', value: 'open' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '已关闭', value: 'closed' },
        ],
      },
      defaultValue: 'open',
      showInList: true,
      filterable: true,
    },
    {
      name: 'source',
      label: '问题来源',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: '客户投诉', value: 'customer_complaint' },
          { label: '内部审核', value: 'internal_audit' },
          { label: '供应商', value: 'supplier' },
          { label: '生产异常', value: 'production' },
          { label: '其他', value: 'other' },
        ],
      },
    },
    {
      name: 'product_name',
      label: '产品',
      type: 'text',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'customer',
      label: '客户',
      type: 'text',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'team_leader',
      label: '团队负责人',
      type: 'text',
      showInList: true,
    },
    {
      name: 'due_date',
      label: '截止日期',
      type: 'date',
      showInList: true,
    },
    {
      name: 'created_at',
      label: '创建日期',
      type: 'date',
      readonly: true,
      showInList: true,
      sortable: true,
    },

    // ── D2 问题描述 ──
    {
      name: 'problem_date',
      label: '问题发生日期',
      type: 'date',
    },
    {
      name: 'impact_scope',
      label: '影响范围',
      type: 'textarea',
      placeholder: '描述问题影响的产品、流程、客户等',
    },

    // ── D3 临时措施 ──
    {
      name: 'd3_effectiveness_check',
      label: '措施有效性检查',
      type: 'textarea',
      placeholder: '描述临时措施的有效性检查结果',
    },

    // ── D5 永久措施 ──
    {
      name: 'd5_validation_standard',
      label: '验证标准',
      type: 'textarea',
      placeholder: '描述永久措施的验证标准',
    },

    // ── D6 效果验证 ──
    {
      name: 'd6_verification_result',
      label: '验证结果',
      type: 'textarea',
      placeholder: '描述永久措施实施后的验证结果',
    },
    {
      name: 'd6_data_comparison',
      label: '数据对比',
      type: 'textarea',
      placeholder: '记录措施实施前后的数据对比',
    },
    {
      name: 'd6_is_effective',
      label: '是否有效',
      type: 'switch',
      defaultValue: false,
    },

    // ── D7 预防措施 ──
    {
      name: 'd7_preventive_action',
      label: '预防再发措施',
      type: 'textarea',
      placeholder: '描述防止问题再次发生的预防措施',
    },
    {
      name: 'd7_updated_documents',
      label: '更新的文档',
      type: 'text',
      placeholder: '列出需要更新的 SOP、规范、流程等',
    },
    {
      name: 'd7_target_date',
      label: '预防措施目标日期',
      type: 'date',
    },

    // ── D8 团队认可 ──
    {
      name: 'd8_approver',
      label: '审批人',
      type: 'text',
      placeholder: '填写审批人姓名',
    },
    {
      name: 'd8_sign_off_date',
      label: '签字确认日期',
      type: 'date',
    },
    {
      name: 'd8_closure_summary',
      label: '关闭总结',
      type: 'textarea',
      placeholder: '总结整个 8D 过程和经验教训',
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['title', 'report_no', 'product_name'],
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待处理', value: 'open' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '已关闭', value: 'closed' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'severity',
        label: '严重程度',
        type: 'select',
        options: [
          { label: '全部等级', value: 'all' },
          { label: '严重', value: 'critical' },
          { label: '高', value: 'high' },
          { label: '中', value: 'medium' },
          { label: '低', value: 'low' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        open: 'error',
        in_progress: 'warning',
        completed: 'success',
        closed: 'default',
      },
      labelMap: {
        open: '待处理',
        in_progress: '进行中',
        completed: '已完成',
        closed: '已关闭',
      },
    },
  },

  formSections: [
    {
      title: '基础信息',
      fields: ['report_no', 'title', 'severity', 'status', 'source', 'product_name', 'customer', 'due_date'],
    },
    {
      title: '团队',
      fields: ['team_leader'],
    },
    {
      title: '问题描述',
      fields: ['problem_description', 'problem_date', 'impact_scope'],
    },
  ],

  formColCount: 2,
  createTitle: '新建 8D 报告',
  editTitle: '编辑 8D 报告',
  detailTitle: '8D 报告详情',

  actions: ['create', 'edit', 'detail', 'delete'],

  // Phase 3 扩展：嵌套子表
  nestedTables: [
    teamMembersTable,
    containmentActionsTable,
    rootCausesTable,
    permanentActionsTable,
  ],

  // Phase 3 扩展：向导表单
  wizard: eightDWizard,

  // Phase 3 扩展：树形结构（根因分析）
  tree: {
    keyField: 'id',
    parentField: 'parent_id',
    labelField: 'label',
    childrenField: 'children',
    expandable: true,
    defaultExpandAll: true,
    showLine: true,
  } as TreeConfig,
};

/** D4 步骤的 renderContent 延迟注入 */
export function injectRootCauseRenderer(renderer: RootCauseRenderer) {
  const d4Step = eightDWizard.steps.find((s) => s.key === 'd4');
  if (d4Step) {
    (d4Step as unknown as Record<string, unknown>).renderContent = renderer;
  }
}
