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
import i18n from '@/i18n';

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
  title: i18n.t('schema:erp.voucher.meta.title'),
  description: i18n.t('schema:erp.voucher.meta.description'),

  api: {
    module: 'erp',
    resource: 'vouchers',
  },

  fields: [
    {
      name: 'voucher_number',
      label: i18n.t('schema:erp.voucher.voucher_number.label'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      showInList: true,
    },
    {
      name: 'voucher_date',
      label: i18n.t('schema:erp.voucher.voucher_date.label'),
      type: 'date',
      required: true,
      sortable: true,
      showInList: true,
    },
    {
      name: 'period',
      label: i18n.t('schema:erp.voucher.period.label'),
      type: 'text',
      required: true,
      showInList: true,
    },
    {
      name: 'voucher_type',
      label: i18n.t('schema:erp.voucher.voucher_type.label'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { label: i18n.t('schema:erp.voucher.voucher_type.option.记'), value: '记' },
          { label: i18n.t('schema:erp.voucher.voucher_type.option.收'), value: '收' },
          { label: i18n.t('schema:erp.voucher.voucher_type.option.付'), value: '付' },
          { label: i18n.t('schema:erp.voucher.voucher_type.option.转'), value: '转' },
        ],
      },
      defaultValue: '记',
      showInList: true,
    },
    {
      name: 'summary',
      label: i18n.t('schema:erp.voucher.summary.label'),
      type: 'textarea',
      showInList: true,
    },
    {
      name: 'attachment_count',
      label: i18n.t('schema:erp.voucher.attachment_count.label'),
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.voucher.status.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { label: i18n.t('schema:erp.voucher.status.option.draft'), value: 'draft' },
          { label: i18n.t('schema:erp.voucher.status.option.submitted'), value: 'submitted' },
          { label: i18n.t('schema:erp.voucher.status.option.approved'), value: 'approved' },
          { label: i18n.t('schema:erp.voucher.status.option.posted'), value: 'posted' },
          { label: i18n.t('schema:erp.voucher.status.option.voided'), value: 'voided' },
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
        label: i18n.t('schema:erp.voucher.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.voucher.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.voucher.filter.status.option.draft'), value: 'draft' },
          { label: i18n.t('schema:erp.voucher.filter.status.option.submitted'), value: 'submitted' },
          { label: i18n.t('schema:erp.voucher.filter.status.option.approved'), value: 'approved' },
          { label: i18n.t('schema:erp.voucher.filter.status.option.posted'), value: 'posted' },
          { label: i18n.t('schema:erp.voucher.filter.status.option.voided'), value: 'voided' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'voucher_type',
        label: i18n.t('schema:erp.voucher.filter.voucher_type.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.voucher.filter.voucher_type.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.voucher.filter.voucher_type.option.记'), value: '记' },
          { label: i18n.t('schema:erp.voucher.filter.voucher_type.option.收'), value: '收' },
          { label: i18n.t('schema:erp.voucher.filter.voucher_type.option.付'), value: '付' },
          { label: i18n.t('schema:erp.voucher.filter.voucher_type.option.转'), value: '转' },
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
        draft: i18n.t('schema:erp.voucher.status.option.draft'),
        submitted: i18n.t('schema:erp.voucher.status.option.submitted'),
        approved: i18n.t('schema:erp.voucher.status.option.approved'),
        posted: i18n.t('schema:erp.voucher.status.option.posted'),
        voided: i18n.t('schema:erp.voucher.status.option.voided'),
      },
    },
  },

  formSections: [
    {
      title: i18n.t('schema:erp.voucher.section.0.title'),
      fields: ['voucher_number', 'voucher_date', 'period', 'voucher_type'],
    },
    {
      title: i18n.t('schema:erp.voucher.section.1.title'),
      fields: ['summary', 'attachment_count'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.voucher.meta.createTitle'),
  editTitle: i18n.t('schema:erp.voucher.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.voucher.meta.detailTitle'),

  actions: ['create', 'edit', 'detail', 'delete'],

  batchActions: [
    {
      key: 'batchSubmit',
      label: i18n.t('schema:erp.voucher.batchAction.batchSubmit.label'),
      icon: React.createElement(CheckIcon),
      color: 'primary',
      confirm: true,
      confirmMessage: i18n.t('schema:erp.voucher.batchAction.batchSubmit.confirmMessage'),
      onClick: (ids: string[]) => {
        // TODO: 实现批量提交凭证逻辑
      },
    },
    {
      key: 'batchApprove',
      label: i18n.t('schema:erp.voucher.batchAction.batchApprove.label'),
      icon: React.createElement(CheckIcon),
      color: 'success',
      confirm: true,
      confirmMessage: i18n.t('schema:erp.voucher.batchAction.batchApprove.confirmMessage'),
      onClick: (ids: string[]) => {
        // TODO: 实现批量审核凭证逻辑
      },
    },
  ],

  // Phase 3 扩展：嵌套子表
  nestedTables: [voucherItemsTable],

  // Phase 3 扩展：向导表单
  wizard: voucherWizard,
};
