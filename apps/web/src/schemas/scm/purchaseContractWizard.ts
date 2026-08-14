/**
 * Purchase Contract Wizard Schema — 驱动采购合同评审流程的完整 CRUD
 *
 * Phase 3 WizardBuilder 迁移：集成 3 步向导 + 嵌套物料明细子表
 * - WizardBuilder：3 步向导（合同基本信息 → 条款与明细 → 评审与签署）
 * - NestedTableConfig：物料明细行（items）的编辑
 *
 * 注意：本文件为纯 Schema 定义，不含 JSX。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import { columnsFromFields } from '@/schema/schemaExtensions';
import type { NestedTableConfig, WizardConfig } from '@/schema/schemaExtensions';
import i18n from '@/i18n';

// ============ 物料明细子表配置 ============

const contractItemFields: NestedTableConfig['fields'] = [
  {
    name: 'product_code',
    label: i18n.t('scm.purchase_contract_wizard.k0'),
    type: 'text',
    required: true,
    listWidth: 140,
  },
  {
    name: 'product_name',
    label: i18n.t('scm.purchase_contract_wizard.k1'),
    type: 'text',
    required: true,
    listWidth: 180,
  },
  {
    name: 'quantity',
    label: i18n.t('scm.purchase_contract_wizard.k2'),
    type: 'number',
    required: true,
    defaultValue: 1,
    listWidth: 100,
  },
  {
    name: 'unit_price',
    label: i18n.t('scm.purchase_contract_wizard.k3'),
    type: 'number',
    required: true,
    defaultValue: 0,
    listWidth: 120,
  },
  {
    name: 'subtotal',
    label: i18n.t('scm.purchase_contract_wizard.k4'),
    type: 'number',
    readonly: true,
    defaultValue: 0,
    listWidth: 120,
  },
];

const contractItemsTable: NestedTableConfig = {
  field: 'items',
  title: i18n.t('scm.purchase_contract_wizard.k5'),
  columns: columnsFromFields(contractItemFields, {
    quantity: { align: 'right' },
    unit_price: { align: 'right' },
    subtotal: { align: 'right' },
  }),
  fields: contractItemFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  allowDuplicate: true,
  addButtonText: i18n.t('scm.purchase_contract_wizard.k6'),
  rowKeyField: 'id',
  minRows: 0,
  maxRows: 200,
  formColCount: 2,
};

// ============ 向导配置 ============

const purchaseContractWizard: WizardConfig = {
  steps: [
    {
      key: 'basic_info',
      title: i18n.t('scm.purchase_contract_wizard.k7'),
      description: i18n.t('scm.purchase_contract_wizard.k8'),
      fields: [
        'contractNo',
        'supplier_id',
        'supplier_name',
        'contract_type',
        'total_amount',
        'start_date',
        'end_date',
        'status',
      ],
      groupTitle: i18n.t('scm.purchase_contract_wizard.k9'),
      validate: (values) => {
        if (!values.contractNo) return i18n.t('scm.purchase_contract_wizard.k10');
        if (!values.supplier_id) return i18n.t('scm.purchase_contract_wizard.id_11');
        return null;
      },
    },
    {
      key: 'terms_and_items',
      title: i18n.t('scm.purchase_contract_wizard.k12'),
      description: i18n.t('scm.purchase_contract_wizard.k13'),
      fields: ['terms', 'items'],
      groupTitle: i18n.t('scm.purchase_contract_wizard.k14'),
      validate: (values) => {
        if (!values.terms) return i18n.t('scm.purchase_contract_wizard.k15');
        return null;
      },
    },
    {
      key: 'review_and_sign',
      title: i18n.t('scm.purchase_contract_wizard.k16'),
      description: i18n.t('scm.purchase_contract_wizard.k17'),
      fields: ['reviewer_id', 'reviewer_name', 'review_comment', 'sign_date'],
      groupTitle: i18n.t('scm.purchase_contract_wizard.k18'),
      isFinalStep: true,
      validate: (values) => {
        if (!values.reviewer_id) return i18n.t('scm.purchase_contract_wizard.k19');
        return null;
      },
    },
  ],
  title: i18n.t('scm.purchase_contract_wizard.k20'),
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: i18n.t('scm.purchase_contract_wizard.k21'),
  nextButtonText: i18n.t('scm.purchase_contract_wizard.k22'),
  prevButtonText: i18n.t('scm.purchase_contract_wizard.k23'),
};

// ============ 主 Schema ============

export const purchaseContractWizardSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
} = {
  entity: 'scmPurchaseContractWizard',
  title: i18n.t('scm.purchase_contract_wizard.k24'),
  description: i18n.t('scm.purchase_contract_wizard.k25'),

  api: {
    module: 'scm',
    resource: 'purchaseContractWizards',
  },

  fields: [
    {
      name: 'contractNo',
      label: i18n.t('scm.purchase_contract_wizard.k26'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'supplier_id',
      label: i18n.t('scm.purchase_contract_wizard.id_27'),
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'supplier_name',
      label: i18n.t('scm.purchase_contract_wizard.k28'),
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'contract_type',
      label: i18n.t('scm.purchase_contract_wizard.k29'),
      type: 'select',
      defaultValue: 'purchase',
      listWidth: 120,
      options: {
        type: 'static',
        options: [
          { label: i18n.t('scm.purchase_contract_wizard.k30'), value: 'purchase' },
          { label: i18n.t('scm.purchase_contract_wizard.k31'), value: 'supply' },
          { label: i18n.t('scm.purchase_contract_wizard.k32'), value: 'framework' },
        ],
      },
    },
    {
      name: 'total_amount',
      label: i18n.t('scm.purchase_contract_wizard.k33'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.total_amount as number | undefined;
        return React.createElement(
          'span',
          { style: { fontWeight: 600 } },
          `¥${(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
        );
      },
    },
    {
      name: 'start_date',
      label: i18n.t('scm.purchase_contract_wizard.k34'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('scm.purchase_contract_wizard.k35'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('scm.purchase_contract_wizard.k36'),
      type: 'select',
      defaultValue: 'draft',
      listWidth: 110,
      options: {
        type: 'static',
        options: [
          { label: i18n.t('scm.purchase_contract_wizard.k37'), value: 'draft' },
          { label: i18n.t('scm.purchase_contract_wizard.k38'), value: 'reviewing' },
          { label: i18n.t('scm.purchase_contract_wizard.k39'), value: 'approved' },
          { label: i18n.t('scm.purchase_contract_wizard.k40'), value: 'signed' },
          { label: i18n.t('scm.purchase_contract_wizard.k41'), value: 'expired' },
          { label: i18n.t('scm.purchase_contract_wizard.k42'), value: 'terminated' },
        ],
      },
    },
    {
      name: 'terms',
      label: i18n.t('scm.purchase_contract_wizard.k43'),
      type: 'textarea',
      showInList: false,
    },

    // ── 评审与签署步骤字段 ──
    {
      name: 'reviewer_id',
      label: i18n.t('scm.purchase_contract_wizard.id_44'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'reviewer_name',
      label: i18n.t('scm.purchase_contract_wizard.k45'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'review_comment',
      label: i18n.t('scm.purchase_contract_wizard.k46'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'sign_date',
      label: i18n.t('scm.purchase_contract_wizard.k47'),
      type: 'date',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'contractNo',
      'supplier_name',
      'contract_type',
      'total_amount',
      'start_date',
      'end_date',
      'status',
    ],
    searchFields: ['contractNo', 'supplier_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        reviewing: 'warning',
        approved: 'info',
        signed: 'success',
        expired: 'default',
        terminated: 'error',
      },
      labelMap: {
        draft: i18n.t('scm.purchase_contract_wizard.k48'),
        reviewing: i18n.t('scm.purchase_contract_wizard.k49'),
        approved: i18n.t('scm.purchase_contract_wizard.k50'),
        signed: i18n.t('scm.purchase_contract_wizard.k51'),
        expired: i18n.t('scm.purchase_contract_wizard.k52'),
        terminated: i18n.t('scm.purchase_contract_wizard.k53'),
      },
    },
    filters: [
      {
        id: 'contract_type',
        label: i18n.t('scm.purchase_contract_wizard.k54'),
        type: 'select',
        options: [
          { label: i18n.t('scm.purchase_contract_wizard.k55'), value: 'all' },
          { label: i18n.t('scm.purchase_contract_wizard.k56'), value: 'purchase' },
          { label: i18n.t('scm.purchase_contract_wizard.k57'), value: 'supply' },
          { label: i18n.t('scm.purchase_contract_wizard.k58'), value: 'framework' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('scm.purchase_contract_wizard.k59'),
        type: 'select',
        options: [
          { label: i18n.t('scm.purchase_contract_wizard.k60'), value: 'all' },
          { label: i18n.t('scm.purchase_contract_wizard.k61'), value: 'draft' },
          { label: i18n.t('scm.purchase_contract_wizard.k62'), value: 'reviewing' },
          { label: i18n.t('scm.purchase_contract_wizard.k63'), value: 'approved' },
          { label: i18n.t('scm.purchase_contract_wizard.k64'), value: 'signed' },
          { label: i18n.t('scm.purchase_contract_wizard.k65'), value: 'expired' },
          { label: i18n.t('scm.purchase_contract_wizard.k66'), value: 'terminated' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('scm.purchase_contract_wizard.k67'),
      fields: ['contractNo', 'supplier_id', 'supplier_name', 'contract_type', 'status'],
    },
    {
      title: i18n.t('scm.purchase_contract_wizard.k68'),
      fields: ['total_amount', 'start_date', 'end_date'],
    },
    {
      title: i18n.t('scm.purchase_contract_wizard.k69'),
      fields: ['terms'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.purchase_contract_wizard.k70'),
  editTitle: i18n.t('scm.purchase_contract_wizard.k71'),
  detailTitle: i18n.t('scm.purchase_contract_wizard.k72'),

  actions: ['create', 'edit', 'detail', 'delete'],

  // Phase 3 扩展：嵌套物料明细子表
  nestedTables: [contractItemsTable],

  // Phase 3 扩展：3 步向导表单
  wizard: purchaseContractWizard,
};
