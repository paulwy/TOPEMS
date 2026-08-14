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
import i18n from '@/i18n';

// ============ 阶段任务子表通用字段 ============

const phaseTaskFields: NestedTableConfig['fields'] = [
  { name: 'task_name', label: i18n.t('qms.apqp.k0'), type: 'text', required: true, listWidth: 200 },
  {
    name: 'task_type',
    label: i18n.t('qms.apqp.k1'),
    type: 'select',
    listWidth: 120,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('qms.apqp.k2'), value: 'core' },
        { label: i18n.t('qms.apqp.k3'), value: 'support' },
        { label: i18n.t('qms.apqp.k4'), value: 'review' },
        { label: i18n.t('qms.apqp.k5'), value: 'validation' },
      ],
    },
  },
  { name: 'deliverable', label: i18n.t('qms.apqp.k6'), type: 'text', listWidth: 180 },
  { name: 'assignee', label: i18n.t('qms.apqp.k7'), type: 'text', listWidth: 100 },
  { name: 'due_date', label: i18n.t('qms.apqp.k8'), type: 'date', listWidth: 130 },
  {
    name: 'status',
    label: i18n.t('qms.apqp.k9'),
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('qms.apqp.k10'), value: 'pending' },
        { label: i18n.t('qms.apqp.k11'), value: 'in_progress' },
        { label: i18n.t('qms.apqp.k12'), value: 'completed' },
        { label: i18n.t('qms.apqp.k13'), value: 'delayed' },
      ],
    },
  },
];

// ============ 5 个阶段任务子表 ============

const phase1TasksTable: NestedTableConfig = {
  field: 'phase1_tasks',
  title: i18n.t('qms.apqp.1_14'),
  columns: columnsFromFields(phaseTaskFields),
  fields: phaseTaskFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.apqp.k15'),
  rowKeyField: 'id',
  minRows: 0,
};

const phase2TasksTable: NestedTableConfig = {
  field: 'phase2_tasks',
  title: i18n.t('qms.apqp.2_16'),
  columns: columnsFromFields(phaseTaskFields),
  fields: phaseTaskFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.apqp.k17'),
  rowKeyField: 'id',
  minRows: 0,
};

const phase3TasksTable: NestedTableConfig = {
  field: 'phase3_tasks',
  title: i18n.t('qms.apqp.3_18'),
  columns: columnsFromFields(phaseTaskFields),
  fields: phaseTaskFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.apqp.k19'),
  rowKeyField: 'id',
  minRows: 0,
};

const phase4TasksTable: NestedTableConfig = {
  field: 'phase4_tasks',
  title: i18n.t('qms.apqp.4_20'),
  columns: columnsFromFields(phaseTaskFields),
  fields: phaseTaskFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.apqp.k21'),
  rowKeyField: 'id',
  minRows: 0,
};

const phase5TasksTable: NestedTableConfig = {
  field: 'phase5_tasks',
  title: i18n.t('qms.apqp.5_22'),
  columns: columnsFromFields(phaseTaskFields),
  fields: phaseTaskFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('qms.apqp.k23'),
  rowKeyField: 'id',
  minRows: 0,
};

// ============ 向导配置 ============

export const apqpWizard: WizardConfig = {
  steps: [
    {
      key: 'phase1',
      title: i18n.t('qms.apqp.1_24'),
      description: i18n.t('qms.apqp.k25'),
      fields: ['phase1_deliverables', 'phase1_owner', 'phase1_due_date', 'phase1_tasks'],
      groupTitle: i18n.t('qms.apqp.k26'),
      validate: (values) => {
        if (!values.phase1_deliverables) return i18n.t('qms.apqp.1_27');
        return null;
      },
    },
    {
      key: 'phase2',
      title: i18n.t('qms.apqp.2_28'),
      description: i18n.t('qms.apqp.k29'),
      fields: ['phase2_deliverables', 'phase2_owner', 'phase2_due_date', 'phase2_tasks'],
      groupTitle: i18n.t('qms.apqp.k30'),
      validate: (values) => {
        if (!values.phase2_deliverables) return i18n.t('qms.apqp.2_31');
        return null;
      },
    },
    {
      key: 'phase3',
      title: i18n.t('qms.apqp.3_32'),
      description: i18n.t('qms.apqp.k33'),
      fields: ['phase3_deliverables', 'phase3_owner', 'phase3_due_date', 'phase3_tasks'],
      groupTitle: i18n.t('qms.apqp.k34'),
      validate: (values) => {
        if (!values.phase3_deliverables) return i18n.t('qms.apqp.3_35');
        return null;
      },
    },
    {
      key: 'phase4',
      title: i18n.t('qms.apqp.4_36'),
      description: i18n.t('qms.apqp.k37'),
      fields: ['phase4_deliverables', 'phase4_owner', 'phase4_due_date', 'phase4_tasks'],
      groupTitle: i18n.t('qms.apqp.k38'),
      validate: (values) => {
        if (!values.phase4_deliverables) return i18n.t('qms.apqp.4_39');
        return null;
      },
    },
    {
      key: 'phase5',
      title: i18n.t('qms.apqp.5_40'),
      description: i18n.t('qms.apqp.k41'),
      fields: ['phase5_deliverables', 'phase5_owner', 'phase5_due_date', 'phase5_tasks'],
      groupTitle: i18n.t('qms.apqp.k42'),
      isFinalStep: true,
      validate: (values) => {
        if (!values.phase5_deliverables) return i18n.t('qms.apqp.5_43');
        return null;
      },
    },
  ],
  title: i18n.t('shared.apqp.apqp5_0'),
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: i18n.t('qms.apqp.apqp_44'),
  nextButtonText: i18n.t('qms.apqp.k45'),
  prevButtonText: i18n.t('qms.apqp.k46'),
};

// ============ 主 Schema ============

export const apqpSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
} = {
  entity: 'apqp',
  title: i18n.t('shared.apqp.apqp_1'),
  description: i18n.t('shared.apqp.k2'),

  api: {
    module: 'qms',
    resource: 'apqp',
  },

  fields: [
    {
      name: 'project_no',
      label: i18n.t('qms.apqp.k47'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'project_name',
      label: i18n.t('qms.apqp.k48'),
      type: 'text',
      required: true,
      sortable: true,
      showInList: true,
      listWidth: 200,
    },
    {
      name: 'customer',
      label: i18n.t('qms.apqp.k49'),
      type: 'text',
      showInList: true,
      listWidth: 140,
    },
    {
      name: 'status',
      label: i18n.t('qms.apqp.k50'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: i18n.t('qms.apqp.k51'), value: 'planning' },
          { label: i18n.t('qms.apqp.k52'), value: 'designing' },
          { label: i18n.t('qms.apqp.k53'), value: 'validating' },
          { label: i18n.t('qms.apqp.k54'), value: 'confirmed' },
          { label: i18n.t('qms.apqp.k55'), value: 'completed' },
        ],
      },
      defaultValue: 'planning',
      showInList: true,
      filterable: true,
    },
    {
      name: 'current_phase',
      label: i18n.t('qms.apqp.k56'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: i18n.t('qms.apqp.1_57'), value: 'phase1' },
          { label: i18n.t('qms.apqp.2_58'), value: 'phase2' },
          { label: i18n.t('qms.apqp.3_59'), value: 'phase3' },
          { label: i18n.t('qms.apqp.4_60'), value: 'phase4' },
          { label: i18n.t('qms.apqp.5_61'), value: 'phase5' },
        ],
      },
      defaultValue: 'phase1',
      showInList: true,
      filterable: true,
    },
    {
      name: 'start_date',
      label: i18n.t('qms.apqp.k62'),
      type: 'date',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'target_date',
      label: i18n.t('qms.apqp.k63'),
      type: 'date',
      showInList: true,
      listWidth: 120,
    },
    {
      name: 'team',
      label: i18n.t('qms.apqp.k64'),
      type: 'text',
      placeholder: i18n.t('qms.apqp.k65'),
      showInList: false,
    },
    {
      name: 'description',
      label: i18n.t('qms.apqp.k66'),
      type: 'textarea',
      placeholder: i18n.t('qms.apqp.k67'),
      showInList: false,
    },

    // ── 阶段1：计划与立项 ──
    {
      name: 'phase1_deliverables',
      label: i18n.t('qms.apqp.1_68'),
      type: 'textarea',
      placeholder: i18n.t('qms.apqp.k69'),
      showInList: false,
    },
    {
      name: 'phase1_owner',
      label: i18n.t('qms.apqp.1_70'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'phase1_due_date',
      label: i18n.t('qms.apqp.1_71'),
      type: 'date',
      showInList: false,
    },

    // ── 阶段2：产品设计与开发 ──
    {
      name: 'phase2_deliverables',
      label: i18n.t('qms.apqp.2_72'),
      type: 'textarea',
      placeholder: i18n.t('qms.apqp.bomdfmea_73'),
      showInList: false,
    },
    {
      name: 'phase2_owner',
      label: i18n.t('qms.apqp.2_74'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'phase2_due_date',
      label: i18n.t('qms.apqp.2_75'),
      type: 'date',
      showInList: false,
    },

    // ── 阶段3：过程设计与开发 ──
    {
      name: 'phase3_deliverables',
      label: i18n.t('qms.apqp.3_76'),
      type: 'textarea',
      placeholder: i18n.t('qms.apqp.pfmea_77'),
      showInList: false,
    },
    {
      name: 'phase3_owner',
      label: i18n.t('qms.apqp.3_78'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'phase3_due_date',
      label: i18n.t('qms.apqp.3_79'),
      type: 'date',
      showInList: false,
    },

    // ── 阶段4：产品与过程确认 ──
    {
      name: 'phase4_deliverables',
      label: i18n.t('qms.apqp.4_80'),
      type: 'textarea',
      placeholder: i18n.t('qms.apqp.k81'),
      showInList: false,
    },
    {
      name: 'phase4_owner',
      label: i18n.t('qms.apqp.4_82'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'phase4_due_date',
      label: i18n.t('qms.apqp.4_83'),
      type: 'date',
      showInList: false,
    },

    // ── 阶段5：反馈、评价与改进 ──
    {
      name: 'phase5_deliverables',
      label: i18n.t('qms.apqp.5_84'),
      type: 'textarea',
      placeholder: i18n.t('qms.apqp.k85'),
      showInList: false,
    },
    {
      name: 'phase5_owner',
      label: i18n.t('qms.apqp.5_86'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'phase5_due_date',
      label: i18n.t('qms.apqp.5_87'),
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
        label: i18n.t('qms.apqp.k88'),
        type: 'select',
        options: [
          { label: i18n.t('qms.apqp.k89'), value: 'all' },
          { label: i18n.t('qms.apqp.k90'), value: 'planning' },
          { label: i18n.t('qms.apqp.k91'), value: 'designing' },
          { label: i18n.t('qms.apqp.k92'), value: 'validating' },
          { label: i18n.t('qms.apqp.k93'), value: 'confirmed' },
          { label: i18n.t('qms.apqp.k94'), value: 'completed' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'current_phase',
        label: i18n.t('qms.apqp.k95'),
        type: 'select',
        options: [
          { label: i18n.t('qms.apqp.k96'), value: 'all' },
          { label: i18n.t('qms.apqp.1_97'), value: 'phase1' },
          { label: i18n.t('qms.apqp.2_98'), value: 'phase2' },
          { label: i18n.t('qms.apqp.3_99'), value: 'phase3' },
          { label: i18n.t('qms.apqp.4_100'), value: 'phase4' },
          { label: i18n.t('qms.apqp.5_101'), value: 'phase5' },
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
        planning: i18n.t('qms.apqp.k102'),
        designing: i18n.t('qms.apqp.k103'),
        validating: i18n.t('qms.apqp.k104'),
        confirmed: i18n.t('qms.apqp.k105'),
        completed: i18n.t('qms.apqp.k106'),
      },
    },
  },

  formSections: [
    {
      title: i18n.t('qms.apqp.k107'),
      fields: ['project_no', 'project_name', 'customer', 'status', 'current_phase'],
    },
    {
      title: i18n.t('qms.apqp.k108'),
      fields: ['start_date', 'target_date', 'team'],
    },
    {
      title: i18n.t('qms.apqp.k109'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('qms.apqp.apqp_110'),
  editTitle: i18n.t('qms.apqp.apqp_111'),
  detailTitle: i18n.t('shared.apqp.apqp_3'),

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
