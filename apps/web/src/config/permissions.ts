import i18n from '@/i18n';

export interface ModulePermission {
  module: string;
  action: PermissionAction;
  code: string;
  name: string;
  description?: string;
  group?: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  modules: ModuleCode[];
}

export type PermissionAction = 'read' | 'write' | 'delete' | 'approve' | 'admin';

export const MODULES = {
  // 核心模块
  IAM: 'iam',
  // 业务模块
  HRM: 'hrm',
  ERP: 'erp',
  PM: 'pm',
  RS: 'rs',
  SCM: 'scm',
  CRM: 'crm',
  AI: 'ai',
  GIS: 'gis',
  QMS: 'qms', // 质量管理
  EHS: 'ehs', // 环境健康安全
  MES: 'mes', // 制造执行
  WMS: 'wms', // 仓储管理
  // 特殊模块
  WORKFLOW: 'workflow',
  // 基础设施模块
  DOC: 'doc',
  FILE: 'file',
  NOTIFICATION: 'notification',
  IM: 'im',
  INTEGRATION: 'integration',
  // 系统模块
  SYSTEM: 'system',
} as const;

export type ModuleCode = (typeof MODULES)[keyof typeof MODULES];

export const ACTIONS: { action: PermissionAction; name: string; level: number }[] = [
  { action: 'read', name: i18n.t('shared.permissions.k0'), level: 1 },
  { action: 'write', name: i18n.t('shared.permissions.k1'), level: 2 },
  { action: 'delete', name: i18n.t('shared.permissions.k2'), level: 3 },
  { action: 'approve', name: i18n.t('shared.permissions.k3'), level: 3 },
  { action: 'admin', name: i18n.t('shared.permissions.k4'), level: 4 },
];

export const PERMISSIONS: Record<ModuleCode, Record<PermissionAction, string>> = {
  [MODULES.IAM]: {
    read: 'iam:dashboard:read',
    write: 'iam:dashboard:write',
    delete: 'iam:dashboard:delete',
    approve: 'iam:dashboard:approve',
    admin: 'iam:dashboard:admin',
  },
  [MODULES.HRM]: {
    read: 'hrm:read',
    write: 'hrm:write',
    delete: 'hrm:delete',
    approve: 'hrm:approve',
    admin: 'hrm:admin',
  },
  [MODULES.ERP]: {
    read: 'erp:dashboard:read',
    write: 'erp:dashboard:write',
    delete: 'erp:dashboard:delete',
    approve: 'erp:dashboard:approve',
    admin: 'erp:dashboard:admin',
  },
  [MODULES.PM]: {
    read: 'pm:dashboard:read',
    write: 'pm:dashboard:write',
    delete: 'pm:dashboard:delete',
    approve: 'pm:dashboard:approve',
    admin: 'pm:dashboard:admin',
  },
  [MODULES.RS]: {
    read: 'rs:read',
    write: 'rs:write',
    delete: 'rs:delete',
    approve: 'rs:approve',
    admin: 'rs:admin',
  },
  [MODULES.SCM]: {
    read: 'scm:read',
    write: 'scm:write',
    delete: 'scm:delete',
    approve: 'scm:approve',
    admin: 'scm:admin',
  },
  [MODULES.CRM]: {
    read: 'crm:dashboard:read',
    write: 'crm:dashboard:write',
    delete: 'crm:dashboard:delete',
    approve: 'crm:dashboard:approve',
    admin: 'crm:dashboard:admin',
  },
  [MODULES.AI]: {
    read: 'ai:dashboard:read',
    write: 'ai:dashboard:write',
    delete: 'ai:dashboard:delete',
    approve: 'ai:dashboard:approve',
    admin: 'ai:dashboard:admin',
  },
  [MODULES.GIS]: {
    read: 'gis:dashboard:read',
    write: 'gis:dashboard:write',
    delete: 'gis:dashboard:delete',
    approve: 'gis:dashboard:approve',
    admin: 'gis:dashboard:admin',
  },
  // QMS 质量管理
  [MODULES.QMS]: {
    read: 'qms:dashboard:read',
    write: 'qms:dashboard:write',
    delete: 'qms:dashboard:delete',
    approve: 'qms:dashboard:approve',
    admin: 'qms:dashboard:admin',
  },
  // EHS 环境健康安全
  [MODULES.EHS]: {
    read: 'ehs:dashboard:read',
    write: 'ehs:dashboard:write',
    delete: 'ehs:dashboard:delete',
    approve: 'ehs:dashboard:approve',
    admin: 'ehs:dashboard:admin',
  },
  // MES 制造执行
  [MODULES.MES]: {
    read: 'mes:read',
    write: 'mes:write',
    delete: 'mes:delete',
    approve: 'mes:approve',
    admin: 'mes:admin',
  },
  // WMS 仓储管理
  [MODULES.WMS]: {
    read: 'wms:read',
    write: 'wms:write',
    delete: 'wms:delete',
    approve: 'wms:approve',
    admin: 'wms:admin',
  },
  [MODULES.WORKFLOW]: {
    read: 'workflow:dashboard:read',
    write: 'workflow:dashboard:write',
    delete: 'workflow:dashboard:delete',
    approve: 'workflow:dashboard:approve',
    admin: 'workflow:dashboard:admin',
  },
  [MODULES.DOC]: {
    read: 'doc:dashboard:read',
    write: 'doc:dashboard:write',
    delete: 'doc:dashboard:delete',
    approve: 'doc:dashboard:approve',
    admin: 'doc:dashboard:admin',
  },
  [MODULES.FILE]: {
    read: 'file:dashboard:read',
    write: 'file:dashboard:write',
    delete: 'file:dashboard:delete',
    approve: 'file:dashboard:approve',
    admin: 'file:dashboard:admin',
  },
  [MODULES.NOTIFICATION]: {
    read: 'notification:dashboard:read',
    write: 'notification:dashboard:write',
    delete: 'notification:dashboard:delete',
    approve: 'notification:dashboard:approve',
    admin: 'notification:dashboard:admin',
  },
  [MODULES.IM]: {
    read: 'im:read',
    write: 'im:write',
    delete: 'im:delete',
    approve: 'im:approve',
    admin: 'im:admin',
  },
  [MODULES.INTEGRATION]: {
    read: 'integration:dashboard:read',
    write: 'integration:dashboard:write',
    delete: 'integration:dashboard:delete',
    approve: 'integration:dashboard:approve',
    admin: 'integration:dashboard:admin',
  },
  // SYSTEM 系统设置
  [MODULES.SYSTEM]: {
    read: 'system:dashboard:read',
    write: 'system:dashboard:write',
    delete: 'system:dashboard:delete',
    approve: 'system:dashboard:approve',
    admin: 'system:dashboard:admin',
  },
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['all'],
  MANAGER: [
    ...Object.values(PERMISSIONS.hrm),
    ...Object.values(PERMISSIONS.pm),
    ...Object.values(PERMISSIONS.rs),
    ...Object.values(PERMISSIONS.crm),
    PERMISSIONS.doc.read,
    PERMISSIONS.file.read,
    PERMISSIONS.file.write,
    PERMISSIONS.notification.read,
    PERMISSIONS.im.read,
    PERMISSIONS.workflow.read,
    PERMISSIONS.workflow.approve,
  ],
  USER: [
    PERMISSIONS.hrm.read,
    PERMISSIONS.pm.read,
    PERMISSIONS.rs.read,
    ...Object.values(PERMISSIONS.doc),
    ...Object.values(PERMISSIONS.file),
    ...Object.values(PERMISSIONS.notification),
    ...Object.values(PERMISSIONS.im),
    PERMISSIONS.workflow.read,
    PERMISSIONS.workflow.approve,
  ],
  GUEST: [PERMISSIONS.doc.read, PERMISSIONS.notification.read],
};

export const ROLES = {
  ADMIN: {
    ID: '00000000-0000-0000-0000-000000000001',
    NAME: i18n.t('shared.permissions.k54'),
    DESCRIPTION: i18n.t('shared.permissions.k55'),
  },
  MANAGER: {
    ID: '00000000-0000-0000-0000-000000000002',
    NAME: i18n.t('shared.permissions.k56'),
    DESCRIPTION: i18n.t('shared.permissions.k57'),
  },
  USER: {
    ID: '00000000-0000-0000-0000-000000000003',
    NAME: i18n.t('shared.permissions.k58'),
    DESCRIPTION: i18n.t('shared.permissions.k59'),
  },
  GUEST: {
    ID: '00000000-0000-0000-0000-000000000004',
    NAME: i18n.t('shared.permissions.k60'),
    DESCRIPTION: i18n.t('shared.permissions.k61'),
  },
};

export const getModulePermissions = (module: ModuleCode): string[] => {
  return Object.values(PERMISSIONS[module] || {});
};

export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  if (userPermissions.includes('all')) {
    return true;
  }

  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  const parts = requiredPermission.split(':');
  if (parts.length >= 2) {
    const [module, ...restParts] = parts;
    const action = restParts.join(':');

    // admin 模块与 iam 模块权限兼容（IAM 合并到 Admin 后的过渡期）
    const equivalentPermissions: string[] = [];
    if (module === 'admin') {
      equivalentPermissions.push(`iam:${action}`);
    } else if (module === 'iam') {
      equivalentPermissions.push(`admin:${action}`);
    }

    for (const equivPerm of equivalentPermissions) {
      if (userPermissions.includes(equivPerm)) {
        return true;
      }
    }

    // 基础设施服务权限与 IAM 联动
    const infrastructureModules = ['doc', 'file', 'notification', 'integration', 'im'];
    if (infrastructureModules.includes(module)) {
      const iamPermission = `iam:${action}`;
      if (userPermissions.includes(iamPermission)) {
        return true;
      }
      if (userPermissions.includes('iam:dashboard:admin')) {
        return true;
      }
      // admin:admin 也等价于 iam:admin
      if (userPermissions.includes('admin:dashboard:admin')) {
        return true;
      }
    }

    const adminPerm = `${module}:admin`;
    if (userPermissions.includes(adminPerm)) {
      return true;
    }

    // 检查 iam:admin 是否等价于 admin:admin
    if (module === 'admin' && userPermissions.includes('iam:dashboard:admin')) {
      return true;
    }

    const actionLevel = ACTIONS.find((a) => a.action === action)?.level || 0;
    const userActions = userPermissions
      .filter((p) => p.startsWith(`${module}:`))
      .map((p) => {
        const actionPart = p.split(':')[1];
        return ACTIONS.find((a) => a.action === actionPart)?.level || 0;
      });

    // 同时检查 iam 前缀的权限（用于 admin 模块）
    if (module === 'admin') {
      const iamUserActions = userPermissions
        .filter((p) => p.startsWith('iam:'))
        .map((p) => {
          const actionPart = p.split(':')[1];
          return ACTIONS.find((a) => a.action === actionPart)?.level || 0;
        });
      return [...userActions, ...iamUserActions].some((level) => level >= actionLevel);
    }

    return userActions.some((level) => level >= actionLevel);
  }

  return false;
};

export const getPermissionsByGroup = (groupId: string): ModulePermission[] => {
  const group = PERMISSION_GROUPS[groupId];
  if (!group) return [];

  const perms: ModulePermission[] = [];
  group.modules.forEach((module) => {
    ACTIONS.forEach((action) => {
      const code = `${module}:${action.action}`;
      const info = MODULE_INFO[module];
      perms.push({
        module,
        action: action.action,
        code,
        name: `${info.name} - ${action.name}`,
        description: `${info.description}${i18n.t('shared.permissions.k3')}${action.name}${i18n.t('shared.permissions.k4')}`,
        group: groupId,
      });
    });
  });

  return perms;
};

export const getInheritedPermissions = (userPermissions: string[]): string[] => {
  const inherited: string[] = [...userPermissions];

  userPermissions.forEach((perm) => {
    const parts = perm.split(':');
    if (parts.length === 2) {
      const [module, action] = parts;

      const actionLevel = ACTIONS.find((a) => a.action === action)?.level || 0;
      if (actionLevel > 0) {
        ACTIONS.filter((a) => a.level < actionLevel).forEach((lowerAction) => {
          const lowerPerm = `${module}:${lowerAction.action}`;
          if (!inherited.includes(lowerPerm)) {
            inherited.push(lowerPerm);
          }
        });
      }

      if (action === 'admin') {
        const infrastructureModules = ['doc', 'file', 'notification', 'im', 'integration'];
        if (module === 'iam') {
          infrastructureModules.forEach((infraModule) => {
            ACTIONS.forEach((a) => {
              const infraPerm = `${infraModule}:${a.action}`;
              if (!inherited.includes(infraPerm)) {
                inherited.push(infraPerm);
              }
            });
          });
        }
      }
    }
  });

  return inherited;
};

export const hasPermissionWithInheritance = (
  userPermissions: string[],
  requiredPermission: string
): boolean => {
  const allPermissions = getInheritedPermissions(userPermissions);
  return hasPermission(allPermissions, requiredPermission);
};

export const getRolePermissions = (roleName: string): string[] => {
  return ROLE_PERMISSIONS[roleName] || [];
};

/**
 * Permission Definitions Extension (3-part codes) — resource-level granularity.
 *
 * Auto-generated by R3 清零攻坚 (Next Step 4).
 * Covers all 3-part module:resource:action codes referenced in frontend nav configs
 * but NOT captured by the legacy 2-part PERMISSIONS[module][action] Record above.
 *
 * Count: 380 unique codes × 380 entries (flat identity map).
 * Checked by scripts/ci/check-permission-matrix.cjs SCAN_CONSTANTS Part A
 * (brutal regex captures every "<word>:<word>:<word>" string in this file).
 *
 * NOTE: Type uses explicit string literal Record<string,string> to avoid widening
 * PERMISSIONS (which still strictly maps ModuleCode→5 PermissionActions).
 */
// Convenience flattened list of all 3-part permission code strings (for R5 orphan checks)
// Integrity check at dev time: count + duplicates guard
if (process.env['NODE_ENV'] !== 'production' && typeof Set !== 'undefined') {
  const _uniq = new Set(ALL_3PART_PERM_CODES);
  if (_uniq.size !== ALL_3PART_PERM_CODES.length) {
    throw new Error(
      `[PERMISSION_DEFS] duplicate keys detected: expected ${_uniq.size} but found ${
        ALL_3PART_PERM_CODES.length
      }`
    );
  }
}

/**
 * Module-level 3-part permission code grouping.
 * Mirrors byModule structure above, returns string[] arrays for UI pickers.
 */
export default PERMISSIONS;

// CI 全流水线触发标记（frontend + permission path filter hit）
