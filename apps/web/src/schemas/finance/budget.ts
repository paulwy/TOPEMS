import React from 'react';
import type { EntitySchema } from '@/schema';
import { departmentApi } from '@/api/hrm';
import type { Department } from '@/api/hrm';


import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

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
  office: i18n.t('finance.budget.k0'),
  marketing: i18n.t('finance.budget.k1'),
  development: i18n.t('finance.budget.k2'),
  travel: i18n.t('finance.budget.k3'),
  training: i18n.t('finance.budget.k4'),
  other: i18n.t('finance.budget.k5'),
};

const STATUS_LABELS: Record<string, string> = {
  active: i18n.t('finance.budget.k6'),
  frozen: i18n.t('finance.budget.k7'),
  exhausted: i18n.t('finance.budget.k8'),
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
      ? `var(--color-error-main, ${designTokens.colors.error['800']})`
      : rate >= 70
        ? `var(--color-warning-main, ${designTokens.colors.warning[500]}`
        : `var(--color-primary-main, ${designTokens.colors.primary.dark})`;

  return React.createElement(
    'div',
    { style: { width: '100%', maxWidth: 320 } },
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
      React.createElement(
        'span',
        { style: { fontSize: '0.75rem', color: `var(--color-text-secondary, ${designTokens.colors.cyber.metal.bottomShadow}` } },
        `${i18n.t('shared.budget.k0')}${used.toLocaleString('zh-CN')}`
      ),
      React.createElement(
        'span',
        {
          style: {
            fontWeight: 700,
            fontSize: '0.75rem',
            color:
              rate > 80 ? `var(--color-error-main, ${designTokens.colors.error['800']})` : `var(--color-primary-main, ${designTokens.colors.primary.dark})`,
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
          backgroundColor: `var(--color-action-hover, ${designTokens.colors.action.selected}`,
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
    primary: `var(--color-primary-main, ${designTokens.colors.primary.dark})`,
    warning: `var(--color-warning-main, ${designTokens.colors.warning[500]}`,
    error: `var(--color-error-main, ${designTokens.colors.error['800']})`,
    default: `var(--color-text-secondary, ${designTokens.colors.cyber.metal.bottomShadow}`,
  };
  const bgColorMap: Record<string, string> = {
    primary: `var(--color-primary-lighter, ${designTokens.colors.primary['50']})`,
    warning: `var(--color-warning-lighter, ${designTokens.colors.warning[50]}`,
    error: `var(--color-error-lighter, ${designTokens.colors.error[50]}`,
    default: `var(--color-action-hover, ${designTokens.colors.action.hover}`,
  };
  return React.createElement(
    'span',
    {
      style: {
        display: 'inline-block',
        padding: `${designTokens.spacing.xs} 8px`,
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
  title: i18n.t('finance.budget.k9'),
  description: i18n.t('finance.budget.k10'),

  api: {
    module: 'erp',
    resource: 'budgets',
  },

  fields: [
    {
      name: 'department_id',
      label: i18n.t('finance.budget.k11'),
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
      label: i18n.t('finance.budget.k12'),
      type: 'select',
      defaultValue: 'office',
      options: {
        type: 'static',
        options: [
          { value: 'office', label: i18n.t('finance.budget.k13') },
          { value: 'marketing', label: i18n.t('finance.budget.k14') },
          { value: 'development', label: i18n.t('finance.budget.k15') },
          { value: 'travel', label: i18n.t('finance.budget.k16') },
          { value: 'training', label: i18n.t('finance.budget.k17') },
          { value: 'other', label: i18n.t('finance.budget.k18') },
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
      label: i18n.t('finance.budget.k19'),
      type: 'text',
      defaultValue: new Date().getFullYear().toString(),
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement('span', null, `${row.fiscal_year ?? ''}${i18n.t('shared.budget.k1')}`),
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'total_budget',
      label: i18n.t('finance.budget.k20'),
      type: 'number',
      required: true,
      defaultValue: 0,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        formatMoney(row.total_budget as number | undefined, `var(--color-primary-main, ${designTokens.colors.primary.dark})`),
    },
    {
      name: 'used_amount',
      label: i18n.t('finance.budget.k21'),
      type: 'number',
      defaultValue: 0,
      listWidth: 280,
      hideInForm: false,
      renderCell: (row: Record<string, unknown>) => renderUsageBar(row),
    },
    {
      name: 'remaining_amount',
      label: i18n.t('finance.budget.k22'),
      type: 'number',
      defaultValue: 0,
      listWidth: 140,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const remaining = Number(row.remaining_amount ?? 0);
        const total = Number(row.total_budget ?? 0);
        const color =
          remaining < total * 0.2
            ? `var(--color-error-main, ${designTokens.colors.error['800']})`
            : `var(--color-success-main, ${designTokens.colors.success.dark})`;
        return formatMoney(remaining, color);
      },
    },
    {
      name: 'status',
      label: i18n.t('finance.budget.k23'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('finance.budget.k24') },
          { value: 'frozen', label: i18n.t('finance.budget.k25') },
          { value: 'exhausted', label: i18n.t('finance.budget.k26') },
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
        label: i18n.t('finance.budget.k27'),
        type: 'select',
        options: [
          { label: i18n.t('finance.budget.k28'), value: 'all' },
          { label: i18n.t('finance.budget.k29'), value: 'active' },
          { label: i18n.t('finance.budget.k30'), value: 'frozen' },
          { label: i18n.t('finance.budget.k31'), value: 'exhausted' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'budget_type',
        label: i18n.t('finance.budget.k32'),
        type: 'select',
        options: [
          { label: i18n.t('finance.budget.k33'), value: 'all' },
          { label: i18n.t('finance.budget.k34'), value: 'office' },
          { label: i18n.t('finance.budget.k35'), value: 'marketing' },
          { label: i18n.t('finance.budget.k36'), value: 'development' },
          { label: i18n.t('finance.budget.k37'), value: 'travel' },
          { label: i18n.t('finance.budget.k38'), value: 'training' },
          { label: i18n.t('finance.budget.k39'), value: 'other' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.budget.k40'),
      fields: ['department_id', 'budget_type', 'fiscal_year'],
    },
    {
      title: i18n.t('finance.budget.k41'),
      fields: ['total_budget', 'used_amount', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.budget.k42'),
  editTitle: i18n.t('finance.budget.k43'),
  detailTitle: i18n.t('finance.budget.k44'),

  dynamicOptions: [
    {
      field: 'department_id',
      loader: loadDepartments,
      queryKey: QUERY_KEYS.AD_HOC.FINANCE_BUDGET_DEPARTMENTS_BASE,
    },
  ],
};
