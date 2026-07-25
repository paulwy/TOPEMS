import React from 'react';
import type { EntitySchema } from '@/schema';

export const assetSchema: EntitySchema = {
  entity: 'finance_asset',
  title: '资产管理',
  description: '管理企业固定资产，计提折旧和处理报废',

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
          { style: { fontWeight: 600, color: 'var(--color-success-main, #2e7d32)' } },
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
      renderCell: (row: Record<string, unknown>) =>
        React.createElement('span', { style: { fontWeight: 500 } }, String(row.name || '')),
    },
    {
      name: 'category',
      label: '科目类别',
      type: 'select',
      required: true,
      defaultValue: 'asset',
      options: {
        type: 'static',
        options: [{ value: 'asset', label: '资产类' }],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          {
            style: {
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: 'var(--color-primary-lighter, #e3f2fd)',
              color: 'var(--color-primary-main, #1976d2)',
            },
          },
          row.category === 'asset' ? '资产类' : String(row.category || '')
        ),
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
          { value: 'debit', label: '借方' },
          { value: 'credit', label: '贷方' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const direction = String(row.balance_direction || '');
        const label = direction === 'debit' ? '借方' : direction === 'credit' ? '贷方' : direction;
        const color =
          direction === 'debit'
            ? 'var(--color-primary-main, #1976d2)'
            : 'var(--color-error-main, #c62828)';
        return React.createElement(
          'span',
          {
            style: {
              fontFamily: 'monospace',
              color,
            },
          },
          label
        );
      },
    },
    {
      name: 'level',
      label: '层级',
      type: 'select',
      required: true,
      defaultValue: 1,
      options: {
        type: 'static',
        options: [
          { value: 1, label: '1级' },
          { value: 2, label: '2级' },
          { value: 3, label: '3级' },
          { value: 4, label: '4级' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { color: 'var(--color-warning-main, #ed6c02)', fontFamily: 'monospace' } },
          String(row.level ?? '')
        ),
    },
    {
      name: 'haschildren',
      label: '有子科目',
      type: 'switch',
      defaultValue: false,
      listWidth: 110,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const hasChildren = row.haschildren === true;
        return React.createElement(
          'span',
          {
            style: {
              fontWeight: 700,
              color: hasChildren
                ? 'var(--color-success-main, #2e7d32)'
                : 'var(--color-text-secondary, rgba(0,0,0,0.6))',
            },
          },
          hasChildren ? '是' : '否'
        );
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '启用' },
          { value: 'disabled', label: '停用' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'category', 'balance_direction', 'level', 'haschildren', 'status'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        disabled: 'error',
      },
      labelMap: {
        active: '启用',
        disabled: '停用',
      },
    },
    filters: [
      {
        id: 'category',
        label: '科目类别',
        type: 'select',
        options: [{ label: '资产类', value: 'asset' }],
        defaultValue: 'asset',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'disabled' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'category', 'balance_direction', 'level', 'status'],
    },
    {
      title: '备注',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增资产科目',
  editTitle: '编辑资产科目',
  detailTitle: '资产科目详情',
};
