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
import { voucherApi } from '@/api/finance/voucher';

// ============ 凭证明细子表配置 ============

const voucherItemsFields: NestedTableConfig['fields'] = [
  { name: 'line_number', label: i18n.t('shared.voucher.k0'), type: 'number', required: true, listWidth: 60 },
  { name: 'subject_code', label: i18n.t('shared.voucher.k1'), type: 'text', required: true, listWidth: 100 },
  { name: 'subject_name', label: i18n.t('shared.voucher.k2'), type: 'text', listWidth: 120 },
  { name: 'summary', label: i18n.t('shared.voucher.k3'), type: 'text', listWidth: 150 },
  { name: 'debit_amount', label: i18n.t('shared.voucher.k4'), type: 'number', required: true, listWidth: 110 },
  { name: 'credit_amount', label: i18n.t('shared.voucher.k5'), type: 'number', required: true, listWidth: 110 },
  { name: 'unit', label: i18n.t('shared.voucher.k6'), type: 'text' },
  { name: 'quantity', label: i18n.t('shared.voucher.k7'), type: 'number' },
  { name: 'price', label: i18n.t('shared.voucher.k8'), type: 'number' },
];

const voucherItemsTable: NestedTableConfig = {
  field: 'items',
  title: i18n.t('shared.voucher.k9'),
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
  addButtonText: i18n.t('shared.voucher.k10'),
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
      return `${i18n.t('shared.voucher.k0')}${totalDebit.toFixed(2)}${i18n.t('shared.voucher.k1')}${totalCredit.toFixed(2)}`;
    }
    return null;
  },
};

// ============ 向导配置 ============

const voucherWizard: WizardConfig = {
  steps: [
    {
      key: 'basic',
      title: i18n.t('shared.voucher.k11'),
      description: i18n.t('shared.voucher.k12'),
      fields: ['voucher_number', 'voucher_date', 'period', 'voucher_type', 'summary'],
      groupTitle: i18n.t('shared.voucher.k13'),
      validate: (values) => {
        if (!values.voucher_number) return i18n.t('shared.voucher.k14');
        if (!values.voucher_date) return i18n.t('shared.voucher.k15');
        return null;
      },
    },
    {
      key: 'items',
      title: i18n.t('shared.voucher.k16'),
      description: i18n.t('shared.voucher.k17'),
      fields: ['items'],
      groupTitle: i18n.t('shared.voucher.k18'),
      validate: () => null,
    },
    {
      key: 'confirm',
      title: i18n.t('shared.voucher.k19'),
      description: i18n.t('shared.voucher.k20'),
      fields: ['attachment_count'],
      groupTitle: i18n.t('shared.voucher.k21'),
      isFinalStep: true,
    },
  ],
  title: i18n.t('shared.voucher.k22'),
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: i18n.t('shared.voucher.k23'),
  nextButtonText: i18n.t('shared.voucher.k24'),
  prevButtonText: i18n.t('shared.voucher.k25'),
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
          { label: i18n.t('schema:erp.voucher.voucher_type.option.记'), value: i18n.t('shared.voucher.k2') },
          { label: i18n.t('schema:erp.voucher.voucher_type.option.收'), value: i18n.t('shared.voucher.k3') },
          { label: i18n.t('schema:erp.voucher.voucher_type.option.付'), value: i18n.t('shared.voucher.k4') },
          { label: i18n.t('schema:erp.voucher.voucher_type.option.转'), value: i18n.t('shared.voucher.k5') },
        ],
      },
      defaultValue: i18n.t('shared.voucher.k26'),
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
          {
            label: i18n.t('schema:erp.voucher.filter.status.option.submitted'),
            value: 'submitted',
          },
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
          { label: i18n.t('schema:erp.voucher.filter.voucher_type.option.记'), value: i18n.t('shared.voucher.k6') },
          { label: i18n.t('schema:erp.voucher.filter.voucher_type.option.收'), value: i18n.t('shared.voucher.k7') },
          { label: i18n.t('schema:erp.voucher.filter.voucher_type.option.付'), value: i18n.t('shared.voucher.k8') },
          { label: i18n.t('schema:erp.voucher.filter.voucher_type.option.转'), value: i18n.t('shared.voucher.k9') },
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
      onClick: async (ids: string[]) => {
        if (!ids.length) return;
        try {
          const res = await voucherApi.batchSubmit(ids);
          if (res.code === 0 || res.success) {
            alert(
              i18n.t('schema:erp.voucher.batchAction.batchSubmit.success', {
                defaultValue: i18n.t('shared.voucher.k27'),
              })
            );
          } else {
            alert(
              i18n.t('schema:erp.voucher.batchAction.batchSubmit.fail', {
                defaultValue: res.message || i18n.t('shared.voucher.k28'),
              })
            );
          }
        } catch (e: any) {
          alert(
            i18n.t('schema:erp.voucher.batchAction.batchSubmit.error', {
              defaultValue: String(e?.message || i18n.t('shared.voucher.k29')),
            })
          );
        }
      },
    },
    {
      key: 'batchApprove',
      label: i18n.t('schema:erp.voucher.batchAction.batchApprove.label'),
      icon: React.createElement(CheckIcon),
      color: 'success',
      confirm: true,
      confirmMessage: i18n.t('schema:erp.voucher.batchAction.batchApprove.confirmMessage'),
      onClick: async (ids: string[]) => {
        if (!ids.length) return;
        try {
          const res = await voucherApi.batchApprove(ids);
          if (res.code === 0 || res.success) {
            alert(
              i18n.t('schema:erp.voucher.batchAction.batchApprove.success', {
                defaultValue: i18n.t('shared.voucher.k30'),
              })
            );
          } else {
            alert(
              i18n.t('schema:erp.voucher.batchAction.batchApprove.fail', {
                defaultValue: res.message || i18n.t('shared.voucher.k31'),
              })
            );
          }
        } catch (e: any) {
          alert(
            i18n.t('schema:erp.voucher.batchAction.batchApprove.error', {
              defaultValue: String(e?.message || i18n.t('shared.voucher.k32')),
            })
          );
        }
      },
    },
  ],

  // Phase 3 扩展：嵌套子表
  nestedTables: [voucherItemsTable],

  // Phase 3 扩展：向导表单
  wizard: voucherWizard,
};
