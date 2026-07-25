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

// ============ 物料明细子表配置 ============

const contractItemFields: NestedTableConfig['fields'] = [
  {
    name: 'product_code',
    label: '产品编码',
    type: 'text',
    required: true,
    listWidth: 140,
  },
  {
    name: 'product_name',
    label: '产品名称',
    type: 'text',
    required: true,
    listWidth: 180,
  },
  {
    name: 'quantity',
    label: '数量',
    type: 'number',
    required: true,
    defaultValue: 1,
    listWidth: 100,
  },
  {
    name: 'unit_price',
    label: '单价',
    type: 'number',
    required: true,
    defaultValue: 0,
    listWidth: 120,
  },
  {
    name: 'subtotal',
    label: '小计',
    type: 'number',
    readonly: true,
    defaultValue: 0,
    listWidth: 120,
  },
];

const contractItemsTable: NestedTableConfig = {
  field: 'items',
  title: '物料明细',
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
  addButtonText: '添加物料',
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
      title: '合同基本信息',
      description: '填写合同编号、供应商、金额等基本信息',
      fields: [
        'contract_no',
        'supplier_id',
        'supplier_name',
        'contract_type',
        'total_amount',
        'start_date',
        'end_date',
        'status',
      ],
      groupTitle: '合同基本信息',
      validate: (values) => {
        if (!values.contract_no) return '请填写合同编号';
        if (!values.supplier_id) return '请填写供应商ID';
        return null;
      },
    },
    {
      key: 'terms_and_items',
      title: '条款与明细',
      description: '填写合同条款和物料明细',
      fields: ['terms', 'items'],
      groupTitle: '合同条款与物料明细',
      validate: (values) => {
        if (!values.terms) return '请填写合同条款';
        return null;
      },
    },
    {
      key: 'review_and_sign',
      title: '评审与签署',
      description: '确认合同评审结果和签署信息',
      fields: ['reviewer_id', 'reviewer_name', 'review_comment', 'sign_date'],
      groupTitle: '评审与签署信息',
      isFinalStep: true,
      validate: (values) => {
        if (!values.reviewer_id) return '请选择评审人';
        return null;
      },
    },
  ],
  title: '采购合同评审流程',
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: '提交评审',
  nextButtonText: '下一步',
  prevButtonText: '上一步',
};

// ============ 主 Schema ============

export const purchaseContractWizardSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
} = {
  entity: 'scmPurchaseContractWizard',
  title: '采购合同评审',
  description: '采购合同评审签署流程，支持多步骤向导填写和物料明细录入',

  api: {
    module: 'scm',
    resource: 'purchaseContractWizards',
  },

  fields: [
    {
      name: 'contract_no',
      label: '合同编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'supplier_id',
      label: '供应商ID',
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'supplier_name',
      label: '供应商名称',
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'contract_type',
      label: '合同类型',
      type: 'select',
      defaultValue: 'purchase',
      listWidth: 120,
      options: {
        type: 'static',
        options: [
          { label: '采购合同', value: 'purchase' },
          { label: '供应合同', value: 'supply' },
          { label: '框架合同', value: 'framework' },
        ],
      },
    },
    {
      name: 'total_amount',
      label: '合同总金额',
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
      label: '生效日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: '到期日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      listWidth: 110,
      options: {
        type: 'static',
        options: [
          { label: '草稿', value: 'draft' },
          { label: '评审中', value: 'reviewing' },
          { label: '已批准', value: 'approved' },
          { label: '已签署', value: 'signed' },
          { label: '已到期', value: 'expired' },
          { label: '已终止', value: 'terminated' },
        ],
      },
    },
    {
      name: 'terms',
      label: '合同条款',
      type: 'textarea',
      showInList: false,
    },

    // ── 评审与签署步骤字段 ──
    {
      name: 'reviewer_id',
      label: '评审人ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'reviewer_name',
      label: '评审人姓名',
      type: 'text',
      showInList: false,
    },
    {
      name: 'review_comment',
      label: '评审意见',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'sign_date',
      label: '签署日期',
      type: 'date',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'contract_no',
      'supplier_name',
      'contract_type',
      'total_amount',
      'start_date',
      'end_date',
      'status',
    ],
    searchFields: ['contract_no', 'supplier_name'],
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
        draft: '草稿',
        reviewing: '评审中',
        approved: '已批准',
        signed: '已签署',
        expired: '已到期',
        terminated: '已终止',
      },
    },
    filters: [
      {
        id: 'contract_type',
        label: '合同类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '采购合同', value: 'purchase' },
          { label: '供应合同', value: 'supply' },
          { label: '框架合同', value: 'framework' },
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
          { label: '评审中', value: 'reviewing' },
          { label: '已批准', value: 'approved' },
          { label: '已签署', value: 'signed' },
          { label: '已到期', value: 'expired' },
          { label: '已终止', value: 'terminated' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: '合同基本信息',
      fields: ['contract_no', 'supplier_id', 'supplier_name', 'contract_type', 'status'],
    },
    {
      title: '金额与日期',
      fields: ['total_amount', 'start_date', 'end_date'],
    },
    {
      title: '合同条款',
      fields: ['terms'],
    },
  ],

  formColCount: 2,
  createTitle: '发起采购合同评审',
  editTitle: '编辑采购合同评审',
  detailTitle: '采购合同评审详情',

  actions: ['create', 'edit', 'detail', 'delete'],

  // Phase 3 扩展：嵌套物料明细子表
  nestedTables: [contractItemsTable],

  // Phase 3 扩展：3 步向导表单
  wizard: purchaseContractWizard,
};
