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
import i18n from '@/i18n';
import type { TreeNode } from '@/components/templates/TreeBuilder';
import type { SchemaField } from '@/schema/types';
/** D4 根因分析自定义渲染函数类型 */
export type RootCauseRenderer = (props: WizardStepRenderProps) => React.ReactNode;
// ============ D1 团队成员子表 ============
const teamMembersFields: NestedTableConfig['fields'] = [
  { name: 'name', label: i18n.t('qms.eight_d.k0'), type: 'text', required: true, listWidth: 120 },
  {
    name: 'role',
    label: i18n.t('qms.eight_d.k1'),
    type: 'select',
    listWidth: 120,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('qms.eight_d.k2'), value: 'leader' },
        { label: i18n.t('qms.eight_d.k3'), value: 'quality' },
        { label: i18n.t('qms.eight_d.k4'), value: 'engineering' },
        { label: i18n.t('qms.eight_d.k5'), value: 'production' },
        { label: i18n.t('qms.eight_d.k6'), value: 'procurement' },
        { label: i18n.t('qms.eight_d.k7'), value: 'other' },
      ],
    },
  },
  { name: 'department', label: i18n.t('qms.eight_d.k8'), type: 'text', listWidth: 120 },
  { name: 'contact', label: i18n.t('qms.eight_d.k9'), type: 'text', listWidth: 140 },
];
const teamMembersTable: NestedTableConfig = {
  field: 'team_members',
  title: i18n.t('qms.eight_d.k10'),
  columns: columnsFromFields(teamMembersFields),
  fields: teamMembersFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.eight_d.k11'),
  rowKeyField: 'id',
  minRows: 1,
};
// ============ D3 临时措施子表 ============
const containmentActionsFields: NestedTableConfig['fields'] = [
  { name: 'description', label: i18n.t('qms.eight_d.k12'), type: 'text', required: true, listWidth: 250 },
  { name: 'implement_date', label: i18n.t('qms.eight_d.k13'), type: 'date', listWidth: 130 },
  { name: 'owner', label: i18n.t('qms.eight_d.k14'), type: 'text', listWidth: 100 },
  {
    name: 'effectiveness',
    label: i18n.t('qms.eight_d.k15'),
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('qms.eight_d.k16'), value: 'effective' },
        { label: i18n.t('qms.eight_d.k17'), value: 'partial' },
        { label: i18n.t('qms.eight_d.k18'), value: 'ineffective' },
      ],
    },
  },
];
const containmentActionsTable: NestedTableConfig = {
  field: 'containment_actions',
  title: i18n.t('qms.eight_d.k19'),
  columns: columnsFromFields(containmentActionsFields),
  fields: containmentActionsFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.eight_d.k20'),
  rowKeyField: 'id',
  minRows: 1,
  validate: (rows) => {
    if (rows.length === 0) return i18n.t('qms.eight_d.k21');
    return null;
  },
};
// ============ D4 根因分析子表 ============
const rootCausesFields: NestedTableConfig['fields'] = [
  { name: 'cause', label: i18n.t('qms.eight_d.k22'), type: 'text', required: true, listWidth: 200 },
  {
    name: 'category',
    label: i18n.t('qms.eight_d.k23'),
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('qms.eight_d.man_24'), value: 'man' },
        { label: i18n.t('qms.eight_d.machine_25'), value: 'machine' },
        { label: i18n.t('qms.eight_d.material_26'), value: 'material' },
        { label: i18n.t('qms.eight_d.method_27'), value: 'method' },
        { label: i18n.t('qms.eight_d.environment_28'), value: 'environment' },
        { label: i18n.t('qms.eight_d.measurement_29'), value: 'measurement' },
      ],
    },
  },
  {
    name: 'level',
    label: i18n.t('qms.eight_d.k30'),
    type: 'select',
    listWidth: 80,
    options: {
      type: 'static',
      options: [
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3', value: '3' },
        { label: '4', value: '4' },
        { label: i18n.t('shared.eight_d.5_0'), value: '5' },
      ],
    },
  },
  { name: 'is_root', label: i18n.t('qms.eight_d.k31'), type: 'switch', listWidth: 80 },
  {
    name: 'analysis_method',
    label: i18n.t('qms.eight_d.k32'),
    type: 'select',
    listWidth: 120,
    options: {
      type: 'static',
      options: [
        { label: '5Why', value: '5why' },
        { label: i18n.t('qms.eight_d.k33'), value: 'fishbone' },
        { label: 'FMEA', value: 'fmea' },
        { label: 'Pareto', value: 'pareto' },
      ],
    },
  },
];
const rootCausesTable: NestedTableConfig = {
  field: 'root_causes',
  title: i18n.t('qms.eight_d.k34'),
  columns: columnsFromFields(rootCausesFields as SchemaField[]),
  fields: rootCausesFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.eight_d.k35'),
  rowKeyField: 'id',
  minRows: 1,
};
// ============ D5 永久措施子表 ============
const permanentActionsFields: NestedTableConfig['fields'] = [
  { name: 'action', label: i18n.t('qms.eight_d.k36'), type: 'text', required: true, listWidth: 200 },
  { name: 'target_date', label: i18n.t('qms.eight_d.k37'), type: 'date', listWidth: 130 },
  { name: 'owner', label: i18n.t('qms.eight_d.k38'), type: 'text', listWidth: 100 },
  { name: 'verification_standard', label: i18n.t('qms.eight_d.k39'), type: 'text', listWidth: 180 },
  {
    name: 'status',
    label: i18n.t('qms.eight_d.k40'),
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('qms.eight_d.k41'), value: 'pending' },
        { label: i18n.t('qms.eight_d.k42'), value: 'in_progress' },
        { label: i18n.t('qms.eight_d.k43'), value: 'completed' },
      ],
    },
  },
];
const permanentActionsTable: NestedTableConfig = {
  field: 'permanent_actions',
  title: i18n.t('qms.eight_d.k44'),
  columns: columnsFromFields(permanentActionsFields),
  fields: permanentActionsFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.eight_d.k45'),
  rowKeyField: 'id',
  minRows: 1,
  validate: (rows) => {
    if (rows.length === 0) return i18n.t('qms.eight_d.k46');
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
      title: i18n.t('shared.eight_d.d1_1'),
      description: i18n.t('qms.eight_d.k47'),
      fields: ['team_leader', 'team_members'],
      groupTitle: i18n.t('qms.eight_d.k48'),
      validate: (values) => {
        if (!values.team_leader) return i18n.t('qms.eight_d.k49');
        const members = (values.team_members as Record<string, unknown>[]) || [];
        if (members.length === 0) return i18n.t('qms.eight_d.k50');
        return null;
      },
    },
    {
      key: 'd2',
      title: i18n.t('shared.eight_d.d2_2'),
      description: i18n.t('qms.eight_d.k51'),
      fields: ['title', 'problem_description', 'problem_date', 'impact_scope', 'severity'],
      groupTitle: i18n.t('qms.eight_d.k52'),
      validate: (values) => {
        if (!values.title) return i18n.t('qms.eight_d.k53');
        if (!values.problem_description) return i18n.t('qms.eight_d.k54');
        return null;
      },
    },
    {
      key: 'd3',
      title: i18n.t('shared.eight_d.d3_3'),
      description: i18n.t('qms.eight_d.k55'),
      fields: ['containment_actions', 'd3_effectiveness_check'],
      groupTitle: i18n.t('qms.eight_d.k56'),
      validate: (values) => {
        const actions = (values.containment_actions as Record<string, unknown>[]) || [];
        if (actions.length === 0) return i18n.t('qms.eight_d.k57');
        return null;
      },
    },
    {
      key: 'd4',
      title: i18n.t('shared.eight_d.d4_4'),
      description: i18n.t('qms.eight_d.5why_58'),
      fields: ['root_causes', 'root_cause_tree'],
      groupTitle: i18n.t('qms.eight_d.k59'),
      // renderContent 在页面初始化时由 QmsEightDPage.tsx 注入
      validate: (values) => {
        const causes = (values.root_causes as Record<string, unknown>[]) || [];
        const tree = (values.root_cause_tree as TreeNode[]) || [];
        if (causes.length === 0 && tree.length === 0) {
          return i18n.t('qms.eight_d.k60');
        }
        return null;
      },
    },
    {
      key: 'd5',
      title: i18n.t('shared.eight_d.d5_5'),
      description: i18n.t('qms.eight_d.k61'),
      fields: ['permanent_actions', 'd5_validation_standard'],
      groupTitle: i18n.t('qms.eight_d.k62'),
      validate: (values) => {
        const actions = (values.permanent_actions as Record<string, unknown>[]) || [];
        if (actions.length === 0) return i18n.t('qms.eight_d.k63');
        return null;
      },
    },
    {
      key: 'd6',
      title: i18n.t('shared.eight_d.d6_6'),
      description: i18n.t('qms.eight_d.k64'),
      fields: ['d6_verification_result', 'd6_data_comparison', 'd6_is_effective'],
      groupTitle: i18n.t('qms.eight_d.k65'),
      validate: (values) => {
        if (!values.d6_verification_result) return i18n.t('qms.eight_d.k66');
        return null;
      },
    },
    {
      key: 'd7',
      title: i18n.t('shared.eight_d.d7_7'),
      description: i18n.t('qms.eight_d.k67'),
      fields: ['d7_preventive_action', 'd7_updated_documents', 'd7_target_date'],
      groupTitle: i18n.t('qms.eight_d.k68'),
      validate: (values) => {
        if (!values.d7_preventive_action) return i18n.t('qms.eight_d.k69');
        return null;
      },
    },
    {
      key: 'd8',
      title: i18n.t('shared.eight_d.d8_8'),
      description: i18n.t('qms.eight_d.8d_70'),
      fields: ['d8_approver', 'd8_sign_off_date', 'd8_closure_summary'],
      groupTitle: i18n.t('qms.eight_d.k71'),
      isFinalStep: true,
      validate: (values) => {
        if (!values.d8_approver) return i18n.t('qms.eight_d.k72');
        if (!values.d8_sign_off_date) return i18n.t('qms.eight_d.k73');
        return null;
      },
    },
  ],
  title: i18n.t('shared.eight_d.8d_9'),
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: i18n.t('qms.eight_d.8d_74'),
  nextButtonText: i18n.t('qms.eight_d.k75'),
  prevButtonText: i18n.t('qms.eight_d.k76'),
};
// ============ 主 Schema ============
export const eightDSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
  tree: TreeConfig;
} = {
  entity: 'eightD',
  title: i18n.t('shared.eight_d.8d_10'),
  description: i18n.t('shared.eight_d.k11'),
  api: {
    module: 'qms',
    resource: 'eightD',
  },
  fields: [
    // ── 基础信息 ──
    {
      name: 'report_no',
      label: i18n.t('qms.eight_d.k77'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      showInList: true,
    },
    {
      name: 'title',
      label: i18n.t('qms.eight_d.k78'),
      type: 'text',
      required: true,
      sortable: true,
      showInList: true,
      listWidth: 200,
    },
    {
      name: 'problem_description',
      label: i18n.t('qms.eight_d.k79'),
      type: 'textarea',
      required: true,
      showInList: false,
    },
    {
      name: 'severity',
      label: i18n.t('qms.eight_d.k80'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { label: i18n.t('qms.eight_d.critical_81'), value: 'critical' },
          { label: i18n.t('qms.eight_d.high_82'), value: 'high' },
          { label: i18n.t('qms.eight_d.medium_83'), value: 'medium' },
          { label: i18n.t('qms.eight_d.low_84'), value: 'low' },
        ],
      },
      defaultValue: 'medium',
      showInList: true,
      filterable: true,
    },
    {
      name: 'status',
      label: i18n.t('qms.eight_d.k85'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: i18n.t('qms.eight_d.k86'), value: 'open' },
          { label: i18n.t('qms.eight_d.k87'), value: 'in_progress' },
          { label: i18n.t('qms.eight_d.k88'), value: 'completed' },
          { label: i18n.t('qms.eight_d.k89'), value: 'closed' },
        ],
      },
      defaultValue: 'open',
      showInList: true,
      filterable: true,
    },
    {
      name: 'source',
      label: i18n.t('qms.eight_d.k90'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: i18n.t('qms.eight_d.k91'), value: 'customer_complaint' },
          { label: i18n.t('qms.eight_d.k92'), value: 'internal_audit' },
          { label: i18n.t('qms.eight_d.k93'), value: 'supplier' },
          { label: i18n.t('qms.eight_d.k94'), value: 'production' },
          { label: i18n.t('qms.eight_d.k95'), value: 'other' },
        ],
      },
    },
    {
      name: 'product_name',
      label: i18n.t('qms.eight_d.k96'),
      type: 'text',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'customer',
      label: i18n.t('qms.eight_d.k97'),
      type: 'text',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'team_leader',
      label: i18n.t('qms.eight_d.k98'),
      type: 'text',
      showInList: true,
    },
    {
      name: 'due_date',
      label: i18n.t('qms.eight_d.k99'),
      type: 'date',
      showInList: true,
    },
    {
      name: 'created_at',
      label: i18n.t('qms.eight_d.k100'),
      type: 'date',
      readonly: true,
      showInList: true,
      sortable: true,
    },
    // ── D2 问题描述 ──
    {
      name: 'problem_date',
      label: i18n.t('qms.eight_d.k101'),
      type: 'date',
    },
    {
      name: 'impact_scope',
      label: i18n.t('qms.eight_d.k102'),
      type: 'textarea',
      placeholder: i18n.t('qms.eight_d.k103'),
    },
    // ── D3 临时措施 ──
    {
      name: 'd3_effectiveness_check',
      label: i18n.t('qms.eight_d.k104'),
      type: 'textarea',
      placeholder: i18n.t('qms.eight_d.k105'),
    },
    // ── D5 永久措施 ──
    {
      name: 'd5_validation_standard',
      label: i18n.t('qms.eight_d.k106'),
      type: 'textarea',
      placeholder: i18n.t('qms.eight_d.k107'),
    },
    // ── D6 效果验证 ──
    {
      name: 'd6_verification_result',
      label: i18n.t('qms.eight_d.k108'),
      type: 'textarea',
      placeholder: i18n.t('qms.eight_d.k109'),
    },
    {
      name: 'd6_data_comparison',
      label: i18n.t('qms.eight_d.k110'),
      type: 'textarea',
      placeholder: i18n.t('qms.eight_d.k111'),
    },
    {
      name: 'd6_is_effective',
      label: i18n.t('qms.eight_d.k112'),
      type: 'switch',
      defaultValue: false,
    },
    // ── D7 预防措施 ──
    {
      name: 'd7_preventive_action',
      label: i18n.t('qms.eight_d.k113'),
      type: 'textarea',
      placeholder: i18n.t('qms.eight_d.k114'),
    },
    {
      name: 'd7_updated_documents',
      label: i18n.t('qms.eight_d.k115'),
      type: 'text',
      placeholder: i18n.t('qms.eight_d.sop_116'),
    },
    {
      name: 'd7_target_date',
      label: i18n.t('qms.eight_d.k117'),
      type: 'date',
    },
    // ── D8 团队认可 ──
    {
      name: 'd8_approver',
      label: i18n.t('qms.eight_d.k118'),
      type: 'text',
      placeholder: i18n.t('qms.eight_d.k119'),
    },
    {
      name: 'd8_sign_off_date',
      label: i18n.t('qms.eight_d.k120'),
      type: 'date',
    },
    {
      name: 'd8_closure_summary',
      label: i18n.t('qms.eight_d.k121'),
      type: 'textarea',
      placeholder: i18n.t('qms.eight_d.8d_122'),
    },
  ],
  list: {
    pageSize: 10,
    searchFields: ['title', 'report_no', 'product_name'],
    filters: [
      {
        id: 'status',
        label: i18n.t('qms.eight_d.k123'),
        type: 'select',
        options: [
          { label: i18n.t('qms.eight_d.k124'), value: 'all' },
          { label: i18n.t('qms.eight_d.k125'), value: 'open' },
          { label: i18n.t('qms.eight_d.k126'), value: 'in_progress' },
          { label: i18n.t('qms.eight_d.k127'), value: 'completed' },
          { label: i18n.t('qms.eight_d.k128'), value: 'closed' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'severity',
        label: i18n.t('qms.eight_d.k129'),
        type: 'select',
        options: [
          { label: i18n.t('qms.eight_d.k130'), value: 'all' },
          { label: i18n.t('qms.eight_d.k131'), value: 'critical' },
          { label: i18n.t('qms.eight_d.k132'), value: 'high' },
          { label: i18n.t('qms.eight_d.k133'), value: 'medium' },
          { label: i18n.t('qms.eight_d.k134'), value: 'low' },
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
        open: i18n.t('qms.eight_d.k135'),
        in_progress: i18n.t('qms.eight_d.k136'),
        completed: i18n.t('qms.eight_d.k137'),
        closed: i18n.t('qms.eight_d.k138'),
      },
    },
  },
  formSections: [
    {
      title: i18n.t('qms.eight_d.k139'),
      fields: [
        'report_no',
        'title',
        'severity',
        'status',
        'source',
        'product_name',
        'customer',
        'due_date',
      ],
    },
    {
      title: i18n.t('qms.eight_d.k140'),
      fields: ['team_leader'],
    },
    {
      title: i18n.t('qms.eight_d.k141'),
      fields: ['problem_description', 'problem_date', 'impact_scope'],
    },
  ],
  formColCount: 2,
  createTitle: i18n.t('qms.eight_d.8d_142'),
  editTitle: i18n.t('qms.eight_d.8d_143'),
  detailTitle: i18n.t('shared.eight_d.8d_12'),
  actions: ['create', 'edit', 'detail', 'delete'],
  // Phase 3 扩展：嵌套子表
  nestedTables: [teamMembersTable, containmentActionsTable, rootCausesTable, permanentActionsTable],
  // Phase 3 扩展：向导表单
  wizard: eightDWizard,
  // Phase 3 扩展：树形结构（根因分析）
  tree: {
    keyField: 'id',
    parentField: 'parentId',
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