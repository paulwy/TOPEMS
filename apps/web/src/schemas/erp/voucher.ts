/**
 * 凭证管理 Schema — 驱动 VoucherManagementPage 的完整 CRUD
 *
 * Phase 3 PoC：集成向导表单 + 嵌套子表
 * - WizardBuilder：3 步向导（基本信息 → 凭证明细 → 确认提交）
 * - SubTableBuilder：凭证明细行（items）的编辑
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import { columnsFromFields } from '@/schema/schemaExtensions';
import type { NestedTableConfig, WizardConfig } from '@/schema/schemaExtensions';

// ============ 凭证明细子表配置 ============

const voucherItemsFields: NestedTableConfig['fields'] = [
  { name: 'line_number', label: '行号', type: 'number', required: true, listWidth: 60 },
  { name: 'subject_code', label: '科目编码', type: 'text', required: true, listWidth: 100 },
  { name: 'subject_name', label: '科目名称', type: 'text', listWidth: 120 },
  { name: 'summary', label: '摘要', type: 'text', listWidth: 150 },
  { name: 'debit_amount', label: '借方金额', type: 'number', required: true, listWidth: 110 },
  { name: 'credit_amount', label: '贷方金额', type: 'number', required: true, listWidth: 110 },
  { name: 'unit', label: '单位', type: 'text' },
  { name: 'quantity', label: '数量', type: 'number' },
  { name: 'price', label: '单价', type: 'number' },
];

const voucherItemsTable: NestedTableConfig = {
  field: 'items',
  title: '凭证明细',
  columns: columnsFromFields(voucherItemsFields, {
    debit_amount: { align: 'right' },
    credit_amount: { align: 'right' },
    quantity: { align: 'right' },
    price: { align: 'right' },
  }),
  fields: voucherItemsFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  allowDuplicate: true,
  addButtonText: '添加明细行',
  rowKeyField: 'line_number',
  minRows: 1,
  maxRows: 50,
  validate: (rows) => {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const row of rows) {
      totalDebit += Number(row.debit_amount) || 0;
      totalCredit += Number(row.credit_amount) || 0;
    }
    if (totalDebit !== totalCredit) {
      return `借贷不平衡：借方 ${totalDebit.toFixed(2)} ≠ 贷方 ${totalCredit.toFixed(2)}`;
    }
    return null;
  },
};

// ============ 向导配置 ============

const voucherWizard: WizardConfig = {
  steps: [
    {
      key: 'basic',
      title: '基本信息',
      description: '填写凭证的基本信息',
      fields: ['voucher_number', 'voucher_date', 'period', 'voucher_type', 'summary'],
      groupTitle: '凭证基本信息',
      validate: (values) => {
        if (!values.voucher_number) return '请填写凭证号';
        if (!values.voucher_date) return '请选择凭证日期';
        return null;
      },
    },
    {
      key: 'items',
      title: '凭证明细',
      description: '添加凭证的明细科目行',
      fields: ['items'],
      groupTitle: '凭证明细行',
      validate: () => null,
    },
    {
      key: 'confirm',
      title: '确认提交',
      description: '核对凭证信息并提交',
      fields: ['attachment_count'],
      groupTitle: '确认信息',
      isFinalStep: true,
    },
  ],
  title: '创建凭证',
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: '提交凭证',
  nextButtonText: '下一步',
  prevButtonText: '上一步',
};

// ============ 图标辅助 ============
const CheckIcon = () => React.createElement('span', { 'data-icon': 'check' }, '✓');

// ============ 主 Schema ============

export const voucherSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
} = {
  entity: 'voucher',
  title: '凭证管理',
  description: '管理财务凭证，包括创建、审核、过账等全流程',

  api: {
    module: 'erp',
    resource: 'vouchers',
  },

  fields: [
    {
      name: 'voucher_number',
      label: '凭证号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      showInList: true,
    },
    {
      name: 'voucher_date',
      label: '凭证日期',
      type: 'date',
      required: true,
      sortable: true,
      showInList: true,
    },
    {
      name: 'period',
      label: '会计期间',
      type: 'text',
      required: true,
      showInList: true,
    },
    {
      name: 'voucher_type',
      label: '凭证类型',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { label: '记账凭证', value: '记' },
          { label: '收款凭证', value: '收' },
          { label: '付款凭证', value: '付' },
          { label: '转账凭证', value: '转' },
        ],
      },
      defaultValue: '记',
      showInList: true,
    },
    {
      name: 'summary',
      label: '摘要',
      type: 'textarea',
      showInList: true,
    },
    {
      name: 'attachment_count',
      label: '附件数量',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: '草稿', value: 'draft' },
          { label: '已提交', value: 'submitted' },
          { label: '已审核', value: 'approved' },
          { label: '已过账', value: 'posted' },
          { label: '已作废', value: 'voided' },
        ],
      },
      showInList: true,
      filterable: true,
    },
  ],

  list: {
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已提交', value: 'submitted' },
          { label: '已审核', value: 'approved' },
          { label: '已过账', value: 'posted' },
          { label: '已作废', value: 'voided' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'voucher_type',
        label: '凭证类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '记账凭证', value: '记' },
          { label: '收款凭证', value: '收' },
          { label: '付款凭证', value: '付' },
          { label: '转账凭证', value: '转' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        submitted: 'info',
        approved: 'warning',
        posted: 'success',
        voided: 'error',
      },
      labelMap: {
        draft: '草稿',
        submitted: '已提交',
        approved: '已审核',
        posted: '已过账',
        voided: '已作废',
      },
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['voucher_number', 'voucher_date', 'period', 'voucher_type'],
    },
    {
      title: '其他信息',
      fields: ['summary', 'attachment_count'],
    },
  ],

  formColCount: 2,
  createTitle: '创建凭证',
  editTitle: '编辑凭证',
  detailTitle: '凭证详情',

  actions: ['create', 'edit', 'detail', 'delete'],

  batchActions: [
    {
      key: 'batchSubmit',
      label: '批量提交',
      icon: React.createElement(CheckIcon),
      color: 'primary',
      confirm: true,
      confirmMessage: '确定要批量提交选中的凭证吗？',
      onClick: (ids: string[]) => {
        console.log('批量提交凭证:', ids);
      },
    },
    {
      key: 'batchApprove',
      label: '批量审核',
      icon: React.createElement(CheckIcon),
      color: 'success',
      confirm: true,
      confirmMessage: '确定要批量审核选中的凭证吗？',
      onClick: (ids: string[]) => {
        console.log('批量审核凭证:', ids);
      },
    },
  ],

  // Phase 3 扩展：嵌套子表
  nestedTables: [voucherItemsTable],

  // Phase 3 扩展：向导表单
  wizard: voucherWizard,
};
