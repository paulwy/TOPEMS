/**
 * 会计科目管理 Schema — 驱动 AccountManagementPage 的完整 CRUD
 *
 * 支持列表展示、创建、编辑、删除、筛选，支持多级科目结构。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import { accountApi } from '@/api/finance/account';
import i18n from '@/i18n';

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
  title: i18n.t('schema:admin.account.meta.title'),
  description: i18n.t('schema:admin.account.meta.description'),

  api: {
    module: 'finance',
    resource: 'accounts',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('schema:admin.account.code.label'),
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
      label: i18n.t('schema:admin.account.name.label'),
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
      label: i18n.t('schema:admin.account.type.label'),
      type: 'select',
      required: true,
      defaultValue: 'asset',
      options: {
        type: 'static',
        options: [
          { value: 'asset', label: i18n.t('schema:admin.account.type.option.asset') },
          { value: 'liability', label: i18n.t('schema:admin.account.type.option.liability') },
          { value: 'equity', label: i18n.t('schema:admin.account.type.option.equity') },
          { value: 'revenue', label: i18n.t('schema:admin.account.type.option.revenue') },
          { value: 'expense', label: i18n.t('schema:admin.account.type.option.expense') },
          { value: 'cost', label: i18n.t('schema:admin.account.type.option.cost') },
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
      label: i18n.t('schema:admin.account.balance_direction.label'),
      type: 'select',
      required: true,
      defaultValue: 'debit',
      options: {
        type: 'static',
        options: [
          { value: 'debit', label: i18n.t('schema:admin.account.balance_direction.option.debit') },
          {
            value: 'credit',
            label: i18n.t('schema:admin.account.balance_direction.option.credit'),
          },
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
      label: i18n.t('schema:admin.account.is_detail.label'),
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
      label: i18n.t('schema:admin.account.isactive.label'),
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
      name: 'parentId',
      label: i18n.t('schema:admin.account.parentId.label'),
      type: 'select',
      showInList: false,
      options: {
        type: 'api',
        loader: loadParentAccounts,
      },
    },
    {
      name: 'description',
      label: i18n.t('schema:admin.account.description.label'),
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
        label: i18n.t('schema:admin.account.filter.type.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:admin.account.filter.type.option.all'), value: 'all' },
          { label: i18n.t('schema:admin.account.filter.type.option.asset'), value: 'asset' },
          {
            label: i18n.t('schema:admin.account.filter.type.option.liability'),
            value: 'liability',
          },
          { label: i18n.t('schema:admin.account.filter.type.option.equity'), value: 'equity' },
          { label: i18n.t('schema:admin.account.filter.type.option.revenue'), value: 'revenue' },
          { label: i18n.t('schema:admin.account.filter.type.option.expense'), value: 'expense' },
          { label: i18n.t('schema:admin.account.filter.type.option.cost'), value: 'cost' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'is_detail',
        label: i18n.t('schema:admin.account.filter.is_detail.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:admin.account.filter.is_detail.option.all'), value: 'all' },
          { label: i18n.t('schema:admin.account.filter.is_detail.option.detail'), value: 'detail' },
          {
            label: i18n.t('schema:admin.account.filter.is_detail.option.summary'),
            value: 'summary',
          },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:admin.account.section.0.title'),
      fields: ['code', 'name', 'type', 'balance_direction'],
    },
    {
      title: i18n.t('schema:admin.account.section.1.title'),
      fields: ['parentId', 'is_detail', 'isactive', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:admin.account.meta.createTitle'),
  editTitle: i18n.t('schema:admin.account.meta.editTitle'),
  detailTitle: i18n.t('schema:admin.account.meta.detailTitle'),

  dynamicOptions: [
    {
      field: 'parentId',
      loader: loadParentAccounts,
      queryKey: ['admin-accounts', 'parents'],
    },
  ],
};
