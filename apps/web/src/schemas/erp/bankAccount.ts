/**
 * 银行账户管理 Schema — 驱动 BankAccountPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

export const bankAccountSchema: EntitySchema = {
  entity: 'bank_account',
  title: '银行账户管理',
  description: '管理公司银行账户信息，包括开户行、账号、余额、状态等',

  api: {
    module: 'erp',
    resource: 'bankAccounts',
  },

  fields: [
    {
      name: 'bank_name',
      label: '银行名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'branch_name',
      label: '支行名称',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'account_name',
      label: '账户名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'account_number',
      label: '账号',
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'account_type',
      label: '账户类型',
      type: 'select',
      defaultValue: 'basic',
      options: {
        type: 'static',
        options: [
          { value: 'basic', label: '基本账户' },
          { value: 'general', label: '一般账户' },
          { value: 'special', label: '专用账户' },
          { value: 'temporary', label: '临时账户' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'balance',
      label: '账户余额',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const balance = row.balance as number | undefined;
        return balance !== undefined
          ? `¥${balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
          : '-';
      },
    },
    {
      name: 'currency',
      label: '货币',
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: '人民币 (CNY)' },
          { value: 'USD', label: '美元 (USD)' },
          { value: 'EUR', label: '欧元 (EUR)' },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '正常' },
          { value: 'frozen', label: '冻结' },
          { value: 'closed', label: '已注销' },
          { value: 'pending', label: '待审核' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'account_name',
      'bank_name',
      'account_number',
      'account_type',
      'currency',
      'balance',
      'status',
    ],
    searchFields: ['account_name', 'bank_name', 'account_number'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        frozen: 'warning',
        closed: 'error',
        pending: 'info',
      },
      labelMap: {
        active: '正常',
        frozen: '冻结',
        closed: '已注销',
        pending: '待审核',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '正常', value: 'active' },
          { label: '冻结', value: 'frozen' },
          { label: '已注销', value: 'closed' },
          { label: '待审核', value: 'pending' },
        ],
      },
      {
        id: 'account_type',
        label: '账户类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '基本账户', value: 'basic' },
          { label: '一般账户', value: 'general' },
          { label: '专用账户', value: 'special' },
          { label: '临时账户', value: 'temporary' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '账户基本信息',
      fields: ['bank_name', 'branch_name', 'account_name', 'account_number'],
    },
    {
      title: '账户属性',
      fields: ['account_type', 'currency', 'balance', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增银行账户',
  editTitle: '编辑银行账户',
  detailTitle: '银行账户详情',
};
