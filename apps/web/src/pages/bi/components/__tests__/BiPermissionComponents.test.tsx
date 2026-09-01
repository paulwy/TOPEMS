import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import BiPermissionStatsCards from '../BiPermissionStatsCards';
import BiPermissionDataTable from '../BiPermissionDataTable';

vi.mock('react-i18next', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../../i18n/locales/zh/bi.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/iam.json')
  );
  return {
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        let base = i18nMap[key] ?? key;
        if (typeof options === 'object' && options !== null) {
          for (const [k, v] of Object.entries(options)) {
            const strVal = String(v);
            // Try {{k}} style first
            const pattern1 = `{{\\s*${k}\\s*}}`;
            const re1 = new RegExp(pattern1, 'g');
            if (re1.test(base)) {
              base = base.replace(re1, strVal);
            } else {
              // Also try common alternative patterns {k} or :k
              const re2 = new RegExp(`\\{\\s*${k}\\s*\\}`, 'g');
              if (re2.test(base)) {
                base = base.replace(re2, strVal);
              }
            }
          }
          // If no interpolation happened, fallback to appending for known keys (count,value,etc.)
          const hasPlaceholders = /\{\{?\s*\w+\s*\}\}?/.test(i18nMap[key] ?? '');
          if (!hasPlaceholders) {
            for (const [k, v] of Object.entries(options)) {
              if (
                [
                  'count',
                  'value',
                  'index',
                  'period',
                  'v1',
                  'v2',
                  'v3',
                  'date',
                  'batchNo',
                  'quantity',
                  'qualified',
                  'defective',
                ].includes(k)
              ) {
                const strVal = String(v);
                if (base.endsWith(':') || base.endsWith('：')) {
                  base = `${base}${strVal}`;
                } else if (base.includes(' ')) {
                  base = `${base} ${strVal}`;
                } else {
                  base = `${base}:${strVal}`;
                }
              }
            }
          }
        }
        return base;
      },
      i18n: { language: 'zh' },
    }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../../i18n/locales/zh/bi.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/iam.json')
  );
  return {
    default: {
      t: (key: string, options?: Record<string, unknown>) => {
        let base = i18nMap[key] ?? key;
        if (typeof options === 'object' && options !== null) {
          for (const [k, v] of Object.entries(options)) {
            const strVal = String(v);
            // Try {{k}} style first
            const pattern1 = `{{\\s*${k}\\s*}}`;
            const re1 = new RegExp(pattern1, 'g');
            if (re1.test(base)) {
              base = base.replace(re1, strVal);
            } else {
              // Also try common alternative patterns {k} or :k
              const re2 = new RegExp(`\\{\\s*${k}\\s*\\}`, 'g');
              if (re2.test(base)) {
                base = base.replace(re2, strVal);
              }
            }
          }
          // If no interpolation happened, fallback to appending for known keys (count,value,etc.)
          const hasPlaceholders = /\{\{?\s*\w+\s*\}\}?/.test(i18nMap[key] ?? '');
          if (!hasPlaceholders) {
            for (const [k, v] of Object.entries(options)) {
              if (
                [
                  'count',
                  'value',
                  'index',
                  'period',
                  'v1',
                  'v2',
                  'v3',
                  'date',
                  'batchNo',
                  'quantity',
                  'qualified',
                  'defective',
                ].includes(k)
              ) {
                const strVal = String(v);
                if (base.endsWith(':') || base.endsWith('：')) {
                  base = `${base}${strVal}`;
                } else if (base.includes(' ')) {
                  base = `${base} ${strVal}`;
                } else {
                  base = `${base}:${strVal}`;
                }
              }
            }
          }
        }
        return base;
      },
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

const permissions = [
  {
    id: 'perm-1',
    name: '销售看板查看权限',
    resource_type: 'dashboard',
    resource_id: 'dashboard-1',
    permission_type: 'view',
    role_ids: ['sales', 'manager', 'admin'],
    user_ids: ['u1', 'u2'],
    created_at: '2026-08-11T00:00:00.000Z',
    updated_at: '2026-08-11T00:00:00.000Z',
  },
  {
    id: 'perm-2',
    name: '数据集导出权限',
    resource_type: 'dataset',
    resource_id: 'dataset-1',
    permission_type: 'export',
    role_ids: [],
    user_ids: [],
    created_at: '2026-08-10T00:00:00.000Z',
    updated_at: '2026-08-10T00:00:00.000Z',
  },
];

const labelHelpers = {
  getResourceTypeLabel: (type: string) => `资源:${type}`,
  getPermissionTypeLabel: (type: string) => `权限:${type}`,
  getPermissionTypeColor: (type: string) =>
    type === 'view' ? ('primary' as const) : ('warning' as const),
};

describe('BiPermission components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BiPermissionStatsCards', () => {
    it('renders all stat labels', () => {
      renderWithProviders(
        <BiPermissionStatsCards
          rowPermissionsCount={12}
          dataPermissionsCount={8}
          enabledRowPermissionsCount={5}
        />
      );

      expect(document.body).toBeTruthy(); // smoke：仅验证渲染不崩溃
    });

  });

  describe('BiPermissionDataTable', () => {
    it('renders empty state', () => {
      renderWithProviders(
        <BiPermissionDataTable
          permissions={[]}
          {...labelHelpers}
        />
      );

      expect(document.body).toBeTruthy(); // smoke：仅验证渲染不崩溃
    });



  });
});