/**
 * 会计科目管理 Schema — 驱动 AccountManagementPage 的完整 CRUD
 *
 * 支持列表展示、创建、编辑、删除、筛选，支持多级科目结构。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import { accountApi } from '@/api/finance/account';

/**
 * 加载可用的上级科目（仅总账科目）
 */
async function loadParentAccounts(): Promise<{ value: string; label: string }[]> {
  try {
    const response = await accountApi.list({ pagesize: 1000 });
    if (!response.success || !response.data?.items) {
      return [];
    }
    return response.data.items
      .filter((a) => !a.is_detail)
      .map((a) => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
      }));
  } catch {
    return [];
  }
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: '资产',
  liability: '负债',
  equity: '权益',
  revenue: '收入',
  expense: '费用',
  cost: '成本',
};

const ACCOUNT_TYPE_COLORS: Record<
  string,
  'primary' | 'error' | 'success' | 'info' | 'warning' | 'default'
> = {
  asset: 'primary',
  liability: 'error',
  equity: 'success',
  revenue: 'info',
  expense: 'warning',
  cost: 'default',
};

const BALANCE_DIRECTION_LABELS: Record<string, string> = {
  debit: '借',
  credit: '贷',
};

const BALANCE_DIRECTION_COLORS: Record<string, 'primary' | 'error'> = {
  debit: 'primary',
  credit: 'error',
};

const renderBadge = (
  label: string,
  color: 'primary' | 'error' | 'success' | 'info' | 'warning' | 'default'
) => {
  const colorMap: Record<string, string> = {
    primary: 'var(--color-primary-main, #1976d2)',
    success: 'var(--color-success-main, #2e7d32)',
    error: 'var(--color-error-main, #c62828)',
    info: 'var(--color-info-main, #0288d1)',
    warning: 'var(--color-warning-main, #ed6c02)',
    default: 'var(--color-text-secondary, rgba(0,0,0,0.6))',
  };
  const bgColorMap: Record<string, string> = {
    primary: 'var(--color-primary-lighter, #e3f2fd)',
    success: 'var(--color-success-lighter, #e8f5e9)',
    error: 'var(--color-error-lighter, #ffebee)',
    info: 'var(--color-info-lighter, #e1f5fe)',
    warning: 'var(--color-warning-lighter, #fff3e0)',
    default: 'var(--color-action-hover, rgba(0,0,0,0.04))',
  };
  return React.createElement(
    'span',
    {
      style: {
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: bgColorMap[color],
        color: colorMap[color],
      },
    },
    label
  );
};

export const accountSchema: EntitySchema = {
  entity: 'admin_account',
  title: '会计科目',
  description: '管理企业会计科目体系，支持多级科目结构',

  api: {
    module: 'finance',
    resource: 'accounts',
  },

  fields: [
    {
      name: 'code',
      label: '科目编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontFamily: 'monospace', fontSize: '0.875rem' } },
          String(row.code || '')
        ),
    },
    {
      name: 'name',
      label: '科目名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      renderCell: (row: Record<string, unknown>) => {
        const name = String(row.name || '');
        const isDetail = row.is_detail === true;
        return React.createElement('span', { style: { fontWeight: isDetail ? 400 : 500 } }, name);
      },
    },
    {
      name: 'type',
      label: '科目类型',
      type: 'select',
      required: true,
      defaultValue: 'asset',
      options: {
        type: 'static',
        options: [
          { value: 'asset', label: '资产' },
          { value: 'liability', label: '负债' },
          { value: 'equity', label: '权益' },
          { value: 'revenue', label: '收入' },
          { value: 'expense', label: '费用' },
          { value: 'cost', label: '成本' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const accountType = String(row.type || '');
        const label = ACCOUNT_TYPE_LABELS[accountType] || accountType;
        const color = ACCOUNT_TYPE_COLORS[accountType] || 'default';
        return renderBadge(label, color);
      },
    },
    {
      name: 'balance_direction',
      label: '余额方向',
      type: 'select',
      required: true,
      defaultValue: 'debit',
      options: {
        type: 'static',
        options: [
          { value: 'debit', label: '借' },
          { value: 'credit', label: '贷' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const direction = String(row.balance_direction || '');
        const label = BALANCE_DIRECTION_LABELS[direction] || direction;
        const color = BALANCE_DIRECTION_COLORS[direction] || 'primary';
        return renderBadge(label, color);
      },
    },
    {
      name: 'is_detail',
      label: '明细',
      type: 'switch',
      defaultValue: true,
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const isDetail = row.is_detail === true;
        return React.createElement(
          'span',
          {
            style: {
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              border: `1px solid ${isDetail ? 'var(--color-primary-main, #1976d2)' : 'var(--color-divider, rgba(0,0,0,0.12))'}`,
              backgroundColor: isDetail ? 'var(--color-primary-lighter, #e3f2fd)' : 'transparent',
              color: isDetail
                ? 'var(--color-primary-main, #1976d2)'
                : 'var(--color-text-secondary, rgba(0,0,0,0.6))',
            },
          },
          isDetail ? '明细科目' : '总账科目'
        );
      },
    },
    {
      name: 'isactive',
      label: '状态',
      type: 'switch',
      defaultValue: true,
      listWidth: 90,
      renderCell: (row: Record<string, unknown>) => {
        const isActive = row.isactive !== false;
        const colorMap: Record<string, string> = {
          success: 'var(--color-success-main, #2e7d32)',
          default: 'var(--color-text-secondary, rgba(0,0,0,0.6))',
        };
        const bgColorMap: Record<string, string> = {
          success: 'var(--color-success-lighter, #e8f5e9)',
          default: 'var(--color-action-hover, rgba(0,0,0,0.04))',
        };
        return React.createElement(
          'span',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: bgColorMap[isActive ? 'success' : 'default'],
              color: colorMap[isActive ? 'success' : 'default'],
            },
          },
          React.createElement('span', {
            style: {
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: colorMap[isActive ? 'success' : 'default'],
            },
          }),
          isActive ? '启用' : '停用'
        );
      },
    },
    {
      name: 'parent_id',
      label: '上级科目',
      type: 'select',
      showInList: false,
      options: {
        type: 'api',
        loader: loadParentAccounts,
      },
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'type', 'balance_direction', 'is_detail', 'isactive'],
    searchFields: ['code', 'name'],
    pageSize: 20,
    filters: [
      {
        id: 'type',
        label: '科目类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '资产', value: 'asset' },
          { label: '负债', value: 'liability' },
          { label: '权益', value: 'equity' },
          { label: '收入', value: 'revenue' },
          { label: '费用', value: 'expense' },
          { label: '成本', value: 'cost' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'is_detail',
        label: '明细类型',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '明细科目', value: 'detail' },
          { label: '总账科目', value: 'summary' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'type', 'balance_direction'],
    },
    {
      title: '科目属性',
      fields: ['parent_id', 'is_detail', 'isactive', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增科目',
  editTitle: '编辑科目',
  detailTitle: '科目详情',

  dynamicOptions: [
    {
      field: 'parent_id',
      loader: loadParentAccounts,
      queryKey: ['admin-accounts', 'parents'],
    },
  ],
};
