import React from 'react';
import type { EntitySchema } from '@/schema';
import { departmentApi } from '@/api/hrm';
import type { Department } from '@/api/hrm';


import { QUERY_KEYS } from '@/lib/reactQuery';

async function loadDepartments(): Promise<{ value: string; label: string }[]> {
  try {
    const res = await departmentApi.list();
    if (!res.success || !res.data) return [];
    const departments = (res.data.items || []) as Department[];
    return departments.map((dept) => ({
      value: dept.id,
      label: dept.name,
    }));
  } catch {
    return [];
  }
}

const BUDGET_TYPE_LABELS: Record<string, string> = {
  office: '办公费',
  marketing: '市场费',
  development: '研发费',
  travel: '差旅费',
  training: '培训费',
  other: '其他',
};

const STATUS_LABELS: Record<string, string> = {
  active: '执行中',
  frozen: '已冻结',
  exhausted: '已耗尽',
};

const STATUS_COLORS: Record<string, 'primary' | 'warning' | 'error' | 'default'> = {
  active: 'primary',
  frozen: 'warning',
  exhausted: 'error',
};

const formatMoney = (amount: number | undefined, color?: string) => {
  const style: React.CSSProperties = { fontWeight: 700 };
  if (color) (style as Record<string, string>).color = color;
  return React.createElement('span', { style }, `¥${(amount || 0).toLocaleString('zh-CN')}`);
};

const renderUsageBar = (row: Record<string, unknown>) => {
  const used = Number(row.used_amount ?? 0);
  const rate = Number(row.usage_rate ?? 0);
  const rateColor =
    rate >= 90
      ? 'var(--color-error-main, #c62828)'
      : rate >= 70
        ? 'var(--color-warning-main, #ed6c02)'
        : 'var(--color-primary-main, #1976d2)';

  return React.createElement(
    'div',
    { style: { width: '100%', maxWidth: 320 } },
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
      React.createElement(
        'span',
        { style: { fontSize: '0.75rem', color: 'var(--color-text-secondary, rgba(0,0,0,0.6))' } },
        `已用: ¥${used.toLocaleString('zh-CN')}`
      ),
      React.createElement(
        'span',
        {
          style: {
            fontWeight: 700,
            fontSize: '0.75rem',
            color:
              rate > 80 ? 'var(--color-error-main, #c62828)' : 'var(--color-primary-main, #1976d2)',
          },
        },
        `${rate.toFixed(1)}%`
      )
    ),
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          backgroundColor: 'var(--color-action-hover, rgba(0,0,0,0.08))',
          borderRadius: 4,
          height: 8,
        },
      },
      React.createElement('div', {
        style: {
          height: 8,
          borderRadius: 4,
          transition: 'width 0.3s',
          width: `${Math.min(rate, 100)}%`,
          backgroundColor: rateColor,
        },
      })
    )
  );
};

const renderStatusBadge = (row: Record<string, unknown>) => {
  const status = String(row.status ?? '');
  const label = STATUS_LABELS[status] || status;
  const color = STATUS_COLORS[status] || 'default';
  const colorMap: Record<string, string> = {
    primary: 'var(--color-primary-main, #1976d2)',
    warning: 'var(--color-warning-main, #ed6c02)',
    error: 'var(--color-error-main, #c62828)',
    default: 'var(--color-text-secondary, rgba(0,0,0,0.6))',
  };
  const bgColorMap: Record<string, string> = {
    primary: 'var(--color-primary-lighter, #e3f2fd)',
    warning: 'var(--color-warning-lighter, #fff3e0)',
    error: 'var(--color-error-lighter, #ffebee)',
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

export const budgetSchema: EntitySchema = {
  entity: 'finance_budget',
  title: '预算管理',
  description: '管理各部门预算，追踪预算使用情况',

  api: {
    module: 'erp',
    resource: 'budgets',
  },

  fields: [
    {
      name: 'department_id',
      label: '部门',
      type: 'select',
      listWidth: 160,
      options: {
        type: 'api',
        loader: loadDepartments,
      },
      renderCell: (row: Record<string, unknown>) => {
        const deptId = String(row.department_id || '');
        return React.createElement(
          'span',
          { style: { fontWeight: 500 } },
          (row._department_name as string) || deptId || '-'
        );
      },
    },
    {
      name: 'budget_type',
      label: '预算类型',
      type: 'select',
      defaultValue: 'office',
      options: {
        type: 'static',
        options: [
          { value: 'office', label: '办公费' },
          { value: 'marketing', label: '市场费' },
          { value: 'development', label: '研发费' },
          { value: 'travel', label: '差旅费' },
          { value: 'training', label: '培训费' },
          { value: 'other', label: '其他' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          null,
          BUDGET_TYPE_LABELS[String(row.budget_type || '')] || String(row.budget_type || '')
        ),
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'fiscal_year',
      label: '财年',
      type: 'text',
      defaultValue: new Date().getFullYear().toString(),
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement('span', null, `${row.fiscal_year ?? ''}年`),
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'total_budget',
      label: '预算总额',
      type: 'number',
      required: true,
      defaultValue: 0,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        formatMoney(row.total_budget as number | undefined, 'var(--color-primary-main, #1976d2)'),
    },
    {
      name: 'used_amount',
      label: '已使用',
      type: 'number',
      defaultValue: 0,
      listWidth: 280,
      hideInForm: false,
      renderCell: (row: Record<string, unknown>) => renderUsageBar(row),
    },
    {
      name: 'remaining_amount',
      label: '剩余预算',
      type: 'number',
      defaultValue: 0,
      listWidth: 140,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const remaining = Number(row.remaining_amount ?? 0);
        const total = Number(row.total_budget ?? 0);
        const color =
          remaining < total * 0.2
            ? 'var(--color-error-main, #c62828)'
            : 'var(--color-success-main, #2e7d32)';
        return formatMoney(remaining, color);
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '执行中' },
          { value: 'frozen', label: '已冻结' },
          { value: 'exhausted', label: '已耗尽' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => renderStatusBadge(row),
      validation: [{ type: 'maxLength', value: 50 }],
    },
  ],

  list: {
    columns: [
      'department_id',
      'budget_type',
      'fiscal_year',
      'total_budget',
      'used_amount',
      'remaining_amount',
      'status',
    ],
    searchFields: ['budget_type', 'fiscal_year'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '执行中', value: 'active' },
          { label: '已冻结', value: 'frozen' },
          { label: '已耗尽', value: 'exhausted' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'budget_type',
        label: '预算类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '办公费', value: 'office' },
          { label: '市场费', value: 'marketing' },
          { label: '研发费', value: 'development' },
          { label: '差旅费', value: 'travel' },
          { label: '培训费', value: 'training' },
          { label: '其他', value: 'other' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['department_id', 'budget_type', 'fiscal_year'],
    },
    {
      title: '预算金额',
      fields: ['total_budget', 'used_amount', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增预算',
  editTitle: '编辑预算',
  detailTitle: '预算详情',

  dynamicOptions: [
    {
      field: 'department_id',
      loader: loadDepartments,
      queryKey: QUERY_KEYS.AD_HOC.FINANCE_BUDGET_DEPARTMENTS_BASE,
    },
  ],
};
