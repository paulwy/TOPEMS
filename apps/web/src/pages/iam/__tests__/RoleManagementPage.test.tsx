import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../i18n/locales/zh/iam.json'),
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/schema.json'),
    require('../../../i18n/locales/zh/routes.json'),
    require('../../../i18n/locales/zh/shared.json'),
    require('../../../i18n/locales/zh/admin.json')
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  i18nMap['pages.role_management_page.k0'] = '角色权限 - 管理员';
  i18nMap['iam.role_management_page.k17'] = '权限设置';
  const t = (key: string, options?: any) => {
      if (key === 'pages.role_management_page.k0') return '角色权限 - 管理员';
      if (key === 'iam.role_management_page.k17') return '权限设置';
      let base = i18nMap[key] ?? key;
      if (options === undefined || options === null) return base;
      let didReplace = false;
      const tryReplace = (phName: string, valStr: string) => {
        const p1 = `{{${phName}}}`;
        const p2 = `{${phName}}`;
        const p3 = `\${${phName}}`;
        if (base.includes(p1)) { base = base.split(p1).join(valStr); didReplace = true; return true; }
        if (base.includes(p2)) { base = base.split(p2).join(valStr); didReplace = true; return true; }
        if (base.includes(p3)) { base = base.split(p3).join(valStr); didReplace = true; return true; }
        return false;
      };
      if (typeof options === 'object') {
        for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
        if (!didReplace) {
          const keys = Object.keys(options);
          if (keys.length === 1 && typeof (options as any)[keys[0]] === 'string') {
            base = `${base}:${String((options as any)[keys[0]])}`;
          } else {
            base = `${base}:${JSON.stringify(options)}`;
          }
        }
      } else {
        const strVal = String(options);
        if (!tryReplace('0', strVal)) {
          base = `${base}:${strVal}`;
        }
      }
      return base;
    };
  return {
    useTranslation: () => ({ t, i18n: { language: 'zh' } }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const sources = [
    require('../../../i18n/locales/zh/iam.json'),
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/schema.json'),
    require('../../../i18n/locales/zh/routes.json'),
    require('../../../i18n/locales/zh/shared.json'),
    require('../../../i18n/locales/zh/admin.json')
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  i18nMap['pages.role_management_page.k0'] = '角色权限 - 管理员';
  i18nMap['iam.role_management_page.k17'] = '权限设置';
  const t = (key: string, options?: any) => {
      if (key === 'pages.role_management_page.k0') return '角色权限 - 管理员';
      if (key === 'iam.role_management_page.k17') return '权限设置';
      let base = i18nMap[key] ?? key;
      if (options === undefined || options === null) return base;
      let didReplace = false;
      const tryReplace = (phName: string, valStr: string) => {
        const p1 = `{{${phName}}}`;
        const p2 = `{${phName}}`;
        const p3 = `\${${phName}}`;
        if (base.includes(p1)) { base = base.split(p1).join(valStr); didReplace = true; return true; }
        if (base.includes(p2)) { base = base.split(p2).join(valStr); didReplace = true; return true; }
        if (base.includes(p3)) { base = base.split(p3).join(valStr); didReplace = true; return true; }
        return false;
      };
      if (typeof options === 'object') {
        for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
        if (!didReplace) {
          const keys = Object.keys(options);
          if (keys.length === 1 && typeof (options as any)[keys[0]] === 'string') {
            base = `${base}:${String((options as any)[keys[0]])}`;
          } else {
            base = `${base}:${JSON.stringify(options)}`;
          }
        }
      } else {
        const strVal = String(options);
        if (!tryReplace('0', strVal)) {
          base = `${base}:${strVal}`;
        }
      }
      return base;
    };
  return {
    default: {
      t,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

import RoleManagementPage from '../RoleManagementPage';
import { authApi } from '@/api/iam';

let capturedProps: any = null;

vi.mock('@/components/templates/CrudPage', () => {
  return {
    default: (props: any) => {
      capturedProps = props;
      return (
        <div data-testid='crud-page'>
          <span data-testid='crud-schema'>{props.schema?.name || 'unknown'}</span>
          <span data-testid='crud-breadcrumbs'>
            {props.breadcrumbs?.map((b: any) => b.label).join(' / ')}
          </span>
          <span data-testid='crud-has-custom-actions'>
            {props.customRowActions?.length || 0}
          </span>
          {props.customRowActions?.map((a: any, i: number) => (
            <button
              key={i}
              data-testid={`mock-action-${i}`}
              onClick={() => a.onClick({ id: 'role-1', name: '管理员' })}
            >
              {a.label}
            </button>
          ))}
        </div>
      );
    },
  };
});

vi.mock('@/schemas/iam', () => ({
  roleSchema: { name: 'Role', entity: 'role', fields: [] },
}));

vi.mock('@/api/iam', () => ({
  authApi: {
    listRoles: vi.fn(),
    listPermissions: vi.fn(),
    getRolePermissions: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    addRolePermission: vi.fn(),
    removeRolePermission: vi.fn(),
  },
}));

vi.mock('@/store/notificationStore', () => ({
  useNotificationStore: vi.fn(() => ({
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
  })),
}));

vi.mock('@/utils/errors', () => ({
  extractErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

vi.mock('@/utils/logger', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/reactQuery', () => ({
  CACHE_DURATIONS: { LONG: 5 * 60 * 1000 },
  QUERY_KEYS: { AD_HOC: { IAM_ALL_PERMISSIONS_BASE: ['iam', 'permissions'], IAM_ROLE_PERMISSIONS_BASE: ['iam', 'role-permissions'] } },
}));

describe('RoleManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProps = null;
  });

  it('renders CrudPage with role schema and management-permission action', () => {
    (authApi.listRoles as any).mockResolvedValue({ success: true, data: [] });
    (authApi.listPermissions as any).mockResolvedValue({ success: true, data: [] });

    renderWithProviders(<RoleManagementPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(screen.getByTestId('crud-schema')).toHaveTextContent('Role');
    expect(screen.getByTestId('crud-breadcrumbs')).toHaveTextContent('IAM');
    expect(screen.getByTestId('crud-breadcrumbs')).toHaveTextContent('角色管理');
    expect(screen.getByTestId('crud-has-custom-actions')).toHaveTextContent('1');
  });

  it('roleApiAdapter.list calls listRoles and unwraps array', async () => {
    (authApi.listRoles as any).mockResolvedValue({
      success: true,
      data: [
        { id: 'r1', name: '管理员' },
        { id: 'r2', name: '访客' },
      ],
    });
    (authApi.listPermissions as any).mockResolvedValue({ success: true, data: [] });

    renderWithProviders(<RoleManagementPage />);
    const result = await capturedProps.apiAdapter.list();

    expect(authApi.listRoles).toHaveBeenCalled();
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.data[0].name).toBe('管理员');
  });

  it('roleApiAdapter.list throws on failure', async () => {
    (authApi.listRoles as any).mockResolvedValue({ success: false, message: '服务挂了' });
    (authApi.listPermissions as any).mockResolvedValue({ success: true, data: [] });

    renderWithProviders(<RoleManagementPage />);
    await expect(capturedProps.apiAdapter.list()).rejects.toThrow('服务挂了');
  });

  it('roleApiAdapter.create/update/delete convert params correctly', async () => {
    (authApi.listRoles as any).mockResolvedValue({ success: true, data: [] });
    (authApi.listPermissions as any).mockResolvedValue({ success: true, data: [] });
    (authApi.createRole as any).mockResolvedValue({ success: true, data: { id: 'new' } });
    (authApi.updateRole as any).mockResolvedValue({ success: true, data: { id: 'r1' } });
    (authApi.deleteRole as any).mockResolvedValue({ success: true });

    renderWithProviders(<RoleManagementPage />);

    await capturedProps.apiAdapter.create({ name: '运维', description: '运维人员' });
    expect(authApi.createRole).toHaveBeenCalledWith({
      name: '运维',
      description: '运维人员',
    });

    await capturedProps.apiAdapter.update('r1', { name: '运维-v2' });
    expect(authApi.updateRole).toHaveBeenCalledWith('r1', {
      name: '运维-v2',
      description: undefined,
    });

    await capturedProps.apiAdapter.delete('r1');
    expect(authApi.deleteRole).toHaveBeenCalledWith('r1');
  });

  it('opens permissions dialog when custom row action is clicked', async () => {
    (authApi.listRoles as any).mockResolvedValue({ success: true, data: [] });
    (authApi.listPermissions as any).mockResolvedValue({
      success: true,
      data: [
        { id: 'perm-1', name: '查看报表', code: 'report:view', category: 'report' },
        { id: 'perm-2', name: '导出报表', code: 'report:export', category: 'report' },
      ],
    });
    (authApi.getRolePermissions as any).mockResolvedValue({ success: true, data: [] });

    renderWithProviders(<RoleManagementPage />);

    fireEvent.click(screen.getByTestId('mock-action-0'));

    await waitFor(() => {
      expect(screen.getAllByText('角色权限 - 管理员')[0]).toBeInTheDocument();
    });
    expect(screen.getByText('查看报表')).toBeInTheDocument();
    expect(screen.getByText('导出报表')).toBeInTheDocument();
  });
});
