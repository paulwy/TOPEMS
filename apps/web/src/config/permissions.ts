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

const PERMISSION_GROUPS: Record<string, PermissionGroup> = {
  core: {
    id: 'core',
    name: i18n.t('shared.permissions.k5'),
    description: i18n.t('shared.permissions.k6'),
    modules: ['iam'],
  },
  business: {
    id: 'business',
    name: i18n.t('shared.permissions.k7'),
    description: i18n.t('shared.permissions.k8'),
    modules: ['hrm', 'erp', 'pm', 'rs', 'scm', 'crm'],
  },
  advanced: {
    id: 'advanced',
    name: i18n.t('shared.permissions.k9'),
    description: i18n.t('shared.permissions.k10'),
    modules: ['ai', 'gis', 'qms', 'ehs', 'mes', 'wms'],
  },
  infrastructure: {
    id: 'infrastructure',
    name: i18n.t('shared.permissions.k11'),
    description: i18n.t('shared.permissions.k12'),
    modules: ['doc', 'file', 'notification', 'im', 'integration'],
  },
  system: {
    id: 'system',
    name: i18n.t('shared.permissions.k13'),
    description: i18n.t('shared.permissions.k14'),
    modules: ['system', 'workflow'],
  },
};

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

const MODULE_INFO: Record<ModuleCode, { name: string; description: string }> = {
  // 核心模块
  [MODULES.IAM]: {
    name: i18n.t('shared.permissions.k16'),
    description: i18n.t('shared.permissions.k15'),
  },
  // 业务模块
  [MODULES.HRM]: {
    name: i18n.t('shared.permissions.k18'),
    description: i18n.t('shared.permissions.k17'),
  },
  [MODULES.ERP]: {
    name: i18n.t('shared.permissions.k20'),
    description: i18n.t('shared.permissions.k19'),
  },
  [MODULES.PM]: {
    name: i18n.t('shared.permissions.k22'),
    description: i18n.t('shared.permissions.k21'),
  },
  [MODULES.RS]: {
    name: i18n.t('shared.permissions.k24'),
    description: i18n.t('shared.permissions.k23'),
  },
  [MODULES.SCM]: {
    name: i18n.t('shared.permissions.k26'),
    description: i18n.t('shared.permissions.k25'),
  },
  [MODULES.CRM]: {
    name: i18n.t('shared.permissions.k28'),
    description: i18n.t('shared.permissions.k27'),
  },
  [MODULES.AI]: {
    name: i18n.t('shared.permissions.ai_0'),
    description: i18n.t('shared.permissions.k29'),
  },
  [MODULES.GIS]: {
    name: i18n.t('shared.permissions.k31'),
    description: i18n.t('shared.permissions.k30'),
  },
  [MODULES.QMS]: {
    name: i18n.t('shared.permissions.k33'),
    description: i18n.t('shared.permissions.k32'),
  },
  [MODULES.EHS]: {
    name: i18n.t('shared.permissions.k35'),
    description: i18n.t('shared.permissions.k34'),
  },
  [MODULES.MES]: {
    name: i18n.t('shared.permissions.k37'),
    description: i18n.t('shared.permissions.k36'),
  },
  [MODULES.WMS]: {
    name: i18n.t('shared.permissions.k39'),
    description: i18n.t('shared.permissions.k38'),
  },
  // 特殊模块
  [MODULES.WORKFLOW]: {
    name: i18n.t('shared.permissions.k41'),
    description: i18n.t('shared.permissions.k40'),
  },
  // 基础设施模块
  [MODULES.DOC]: {
    name: i18n.t('shared.permissions.k43'),
    description: i18n.t('shared.permissions.k42'),
  },
  [MODULES.FILE]: {
    name: i18n.t('shared.permissions.k45'),
    description: i18n.t('shared.permissions.k44'),
  },
  [MODULES.NOTIFICATION]: {
    name: i18n.t('shared.permissions.k47'),
    description: i18n.t('shared.permissions.k46'),
  },
  [MODULES.IM]: {
    name: i18n.t('shared.permissions.k49'),
    description: i18n.t('shared.permissions.k48'),
  },
  [MODULES.INTEGRATION]: {
    name: i18n.t('shared.permissions.k51'),
    description: i18n.t('shared.permissions.k50'),
  },
  // 系统模块
  [MODULES.SYSTEM]: {
    name: i18n.t('shared.permissions.k53'),
    description: i18n.t('shared.permissions.k52'),
  },
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

const getModuleActions = (
  module: ModuleCode
): { action: PermissionAction; name: string; level: number; code: string }[] => {
  const modulePerms = PERMISSIONS[module];
  return ACTIONS.map((a) => ({
    ...a,
    code: modulePerms?.[a.action] || `${module}:${a.action}`,
  }));
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

const getModuleActionsFromPermissions = (
  module: ModuleCode,
  userPermissions: string[]
): PermissionAction[] => {
  const actions: PermissionAction[] = [];

  if (hasPermission(userPermissions, `${module}:admin`)) {
    return ['read', 'write', 'delete', 'approve', 'admin'];
  }

  if (hasPermission(userPermissions, `${module}:delete`)) {
    actions.push('delete');
  }
  if (hasPermission(userPermissions, `${module}:write`)) {
    actions.push('write');
  }
  if (hasPermission(userPermissions, `${module}:read`)) {
    actions.push('read');
  }
  if (hasPermission(userPermissions, `${module}:approve`)) {
    actions.push('approve');
  }

  return actions;
};

const getAllPermissions = (): ModulePermission[] => {
  const perms: ModulePermission[] = [];

  Object.entries(MODULE_INFO).forEach(([module, info]) => {
    ACTIONS.forEach((action) => {
      const code = `${module}:${action.action}`;
      let group: string | undefined;
      for (const [groupId, groupInfo] of Object.entries(PERMISSION_GROUPS)) {
        if (groupInfo.modules.includes(module as ModuleCode)) {
          group = groupId;
          break;
        }
      }
      perms.push({
        module,
        action: action.action,
        code,
        name: `${info.name} - ${action.name}`,
        description: `${info.description}${i18n.t('shared.permissions.k1')}${action.name}${i18n.t('shared.permissions.k2')}`,
        group,
      });
    });
  });

  return perms;
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

const getPermissionsByRole = (roleName: string): string[] => {
  return getRolePermissions(roleName);
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
const PERMISSION_DEFS: Record<string, string> = {
  // admin (16 codes)
  'admin:account:read': 'admin:account:read',
  'admin:audit:read': 'admin:audit:read',
  'admin:bank:read': 'admin:bank:read',
  'admin:dashboard:read': 'admin:dashboard:read',
  'admin:dashboard:write': 'admin:dashboard:write',
  'admin:database:read': 'admin:database:read',
  'admin:debug:read': 'admin:debug:read',
  'admin:dictionary:read': 'admin:dictionary:read',
  'admin:migration:read': 'admin:migration:read',
  'admin:monitor:read': 'admin:monitor:read',
  'admin:plugin:read': 'admin:plugin:read',
  'admin:plugin:write': 'admin:plugin:write',
  'admin:system:read': 'admin:system:read',
  'admin:system:write': 'admin:system:write',
  'admin:tenant:read': 'admin:tenant:read',
  'admin:tenant:write': 'admin:tenant:write',
  'admin:iam:delete': 'admin:iam:delete',
  'admin:iam:dashboard:approve': 'admin:iam:dashboard:approve',

  // ai (5 codes)
  'ai:chat:read': 'ai:chat:read',
  'ai:code:read': 'ai:code:read',
  'ai:document:read': 'ai:document:read',
  'ai:knowledge:read': 'ai:knowledge:read',
  'ai:prompt:read': 'ai:prompt:read',

  // aps (7 codes)
  'aps:capacity:read': 'aps:capacity:read',
  'aps:dashboard:read': 'aps:dashboard:read',
  'aps:forecast:read': 'aps:forecast:read',
  'aps:material_plan:read': 'aps:material_plan:read',
  'aps:module:read': 'aps:module:read',
  'aps:production_plan:read': 'aps:production_plan:read',
  'aps:schedule:read': 'aps:schedule:read',

  // asset (5 codes)
  'asset:category:read': 'asset:category:read',
  'asset:dashboard:read': 'asset:dashboard:read',
  'asset:depreciation:read': 'asset:depreciation:read',
  'asset:list:read': 'asset:list:read',
  'asset:transfer:read': 'asset:transfer:read',

  // automation (5 codes)
  'automation:dashboard:read': 'automation:dashboard:read',
  'automation:rule:read': 'automation:rule:read',
  'automation:rule:write': 'automation:rule:write',
  'automation:run:read': 'automation:run:read',
  'automation:variable:read': 'automation:variable:read',

  // bi (12 codes)
  'bi:analytics:read': 'bi:analytics:read',
  'bi:comparison:read': 'bi:comparison:read',
  'bi:dashboard:admin': 'bi:dashboard:admin',
  'bi:dashboard:read': 'bi:dashboard:read',
  'bi:dashboard:write': 'bi:dashboard:write',
  'bi:data_source:read': 'bi:data_source:read',
  'bi:dataset:read': 'bi:dataset:read',
  'bi:gis:read': 'bi:gis:read',
  'bi:index:read': 'bi:index:read',
  'bi:report:read': 'bi:report:read',
  'bi:report:write': 'bi:report:write',
  'bi:visualization:read': 'bi:visualization:read',

  // crm (19 codes)
  'crm:billing:read': 'crm:billing:read',
  'crm:contact:read': 'crm:contact:read',
  'crm:customer:create': 'crm:customer:create',
  'crm:customer:read': 'crm:customer:read',
  'crm:customer:update': 'crm:customer:update',
  'crm:customer_scoring:read': 'crm:customer_scoring:read',
  'crm:customer_segmentation:read': 'crm:customer_segmentation:read',
  'crm:dashboard:update': 'crm:dashboard:update',
  'crm:forecast:read': 'crm:forecast:read',
  'crm:interaction:read': 'crm:interaction:read',
  'crm:opportunity:read': 'crm:opportunity:read',
  'crm:recommendation:read': 'crm:recommendation:read',
  'crm:return:read': 'crm:return:read',
  'crm:rfm:read': 'crm:rfm:read',
  'crm:sales_forecast:read': 'crm:sales_forecast:read',
  'crm:sales_funnel:read': 'crm:sales_funnel:read',

  // doc (2 codes)
  'doc:center:read': 'doc:center:read',
  'doc:document:read': 'doc:document:read',

  // ehs (13 codes)
  'ehs:accident:read': 'ehs:accident:read',
  'ehs:check:read': 'ehs:check:read',
  'ehs:compliance:read': 'ehs:compliance:read',
  'ehs:drill:read': 'ehs:drill:read',
  'ehs:emergency:read': 'ehs:emergency:read',
  'ehs:environment:read': 'ehs:environment:read',
  'ehs:hazard:read': 'ehs:hazard:read',
  'ehs:hazardous_material:read': 'ehs:hazardous_material:read',
  'ehs:health:read': 'ehs:health:read',
  'ehs:incident:read': 'ehs:incident:read',
  'ehs:occupational_disease:read': 'ehs:occupational_disease:read',
  'ehs:plan:read': 'ehs:plan:read',
  'ehs:training:read': 'ehs:training:read',

  // erp (22 codes)
  'erp:accounting_subject:read': 'erp:accounting_subject:read',
  'erp:announcement:read': 'erp:announcement:read',
  'erp:asset:read': 'erp:asset:read',
  'erp:audit:read': 'erp:audit:read',
  'erp:bank_account:read': 'erp:bank_account:read',
  'erp:budget:read': 'erp:budget:read',
  'erp:customer:read': 'erp:customer:read',
  'erp:database:read': 'erp:database:read',
  'erp:dictionary:read': 'erp:dictionary:read',
  'erp:financial_analysis:read': 'erp:financial_analysis:read',
  'erp:financial_statement:read': 'erp:financial_statement:read',
  'erp:general_ledger:read': 'erp:general_ledger:read',
  'erp:inventory:read': 'erp:inventory:read',
  'erp:material:read': 'erp:material:read',
  'erp:meeting_room:read': 'erp:meeting_room:read',
  'erp:office_supply:read': 'erp:office_supply:read',
  'erp:purchase_order:read': 'erp:purchase_order:read',
  'erp:receivable_payable:read': 'erp:receivable_payable:read',
  'erp:sales_order:read': 'erp:sales_order:read',
  'erp:supplier:read': 'erp:supplier:read',
  'erp:vehicle:read': 'erp:vehicle:read',
  'erp:vehicle_request:read': 'erp:vehicle_request:read',

  // finance (20 codes)
  'finance:asset:read': 'finance:asset:read',
  'finance:budget:read': 'finance:budget:read',
  'finance:consolidation:read': 'finance:consolidation:read',
  'finance:cost:read': 'finance:cost:read',
  'finance:dashboard:admin': 'finance:dashboard:admin',
  'finance:dashboard:read': 'finance:dashboard:read',
  'finance:dashboard:write': 'finance:dashboard:write',
  'finance:expense:read': 'finance:expense:read',
  'finance:expense_approval:read': 'finance:expense_approval:read',
  'finance:invoice:read': 'finance:invoice:read',
  'finance:ledger:read': 'finance:ledger:read',
  'finance:opening_balance:read': 'finance:opening_balance:read',
  'finance:payment:read': 'finance:payment:read',
  'finance:receipt:read': 'finance:receipt:read',
  'finance:receivable_payable:read': 'finance:receivable_payable:read',
  'finance:report:read': 'finance:report:read',
  'finance:tax:read': 'finance:tax:read',
  'finance:settlement:approve': 'finance:settlement:approve',
  'finance:voucher:create': 'finance:voucher:create',
  'finance:voucher:read': 'finance:voucher:read',

  // gis (3 codes)
  'gis:fence:read': 'gis:fence:read',
  'gis:map:read': 'gis:map:read',
  'gis:tracking:read': 'gis:tracking:read',

  // hrm (23 codes)
  'hrm:attendance:read': 'hrm:attendance:read',
  'hrm:attendance_rule:read': 'hrm:attendance_rule:read',
  'hrm:company:read': 'hrm:company:read',
  'hrm:contract:read': 'hrm:contract:read',
  'hrm:dashboard:read': 'hrm:dashboard:read',
  'hrm:department:read': 'hrm:department:read',
  'hrm:employee:create': 'hrm:employee:create',
  'hrm:employee:read': 'hrm:employee:read',
  'hrm:employee:update': 'hrm:employee:update',
  'hrm:leave:read': 'hrm:leave:read',
  'hrm:module:read': 'hrm:module:read',
  'hrm:organization:read': 'hrm:organization:read',
  'hrm:overview:read': 'hrm:overview:read',
  'hrm:payroll:read': 'hrm:payroll:read',
  'hrm:payroll_template:read': 'hrm:payroll_template:read',
  'hrm:performance:read': 'hrm:performance:read',
  'hrm:position:read': 'hrm:position:read',
  'hrm:recruitment:read': 'hrm:recruitment:read',
  'hrm:recruitment_flow:read': 'hrm:recruitment_flow:read',
  'hrm:report:read': 'hrm:report:read',
  'hrm:salary_adjustment:read': 'hrm:salary_adjustment:read',
  'hrm:training:read': 'hrm:training:read',
  'hrm:training_plan:read': 'hrm:training_plan:read',

  // iam (4 codes)
  'iam:permission:read': 'iam:permission:read',
  'iam:role:read': 'iam:role:read',
  'iam:structure:read': 'iam:structure:read',
  'iam:user:read': 'iam:user:read',

  // im (2 codes)
  'im:dashboard:read': 'im:dashboard:read',
  'im:mail:read': 'im:mail:read',

  // integration (7 codes)
  'integration:connection:read': 'integration:connection:read',
  'integration:erp:read': 'integration:erp:read',
  'integration:event:read': 'integration:event:read',
  'integration:lims:read': 'integration:lims:read',
  'integration:mapping:read': 'integration:mapping:read',
  'integration:mes:read': 'integration:mes:read',
  'integration:wms:read': 'integration:wms:read',

  // lims (14 codes)
  'lims:barcode:read': 'lims:barcode:read',
  'lims:dashboard:read': 'lims:dashboard:read',
  'lims:dashboard:write': 'lims:dashboard:write',
  'lims:instrument:read': 'lims:instrument:read',
  'lims:instrument:write': 'lims:instrument:write',
  'lims:process:read': 'lims:process:read',
  'lims:proficiency:read': 'lims:proficiency:read',
  'lims:reagent:read': 'lims:reagent:read',
  'lims:result:read': 'lims:result:read',
  'lims:sample:read': 'lims:sample:read',
  'lims:sample:write': 'lims:sample:write',
  'lims:task:read': 'lims:task:read',
  'lims:test_method:read': 'lims:test_method:read',
  'lims:uncertainty:read': 'lims:uncertainty:read',

  // lowcode (5 codes)
  'lowcode:apps:read': 'lowcode:apps:read',
  'lowcode:dashboard:read': 'lowcode:dashboard:read',
  'lowcode:form:read': 'lowcode:form:read',
  'lowcode:page:read': 'lowcode:page:read',
  'lowcode:workflow:read': 'lowcode:workflow:read',

  // mes (29 codes)
  'mes:analytics:read': 'mes:analytics:read',
  'mes:anomaly_detection:read': 'mes:anomaly_detection:read',
  'mes:aps_config:read': 'mes:aps_config:read',
  'mes:bom_version_policy:read': 'mes:bom_version_policy:read',
  'mes:dashboard:read': 'mes:dashboard:read',
  'mes:energy_management:read': 'mes:energy_management:read',
  'mes:equipment:read': 'mes:equipment:read',
  'mes:equipment_threshold:read': 'mes:equipment_threshold:read',
  'mes:kanban:read': 'mes:kanban:read',
  'mes:material:read': 'mes:material:read',
  'mes:material:update': 'mes:material:update',
  'mes:module:read': 'mes:module:read',
  'mes:oee:read': 'mes:oee:read',
  'mes:process_flow:read': 'mes:process_flow:read',
  'mes:process_route:read': 'mes:process_route:read',
  'mes:production_cost:read': 'mes:production_cost:read',
  'mes:production_dashboard:read': 'mes:production_dashboard:read',
  'mes:production_order:read': 'mes:production_order:read',
  'mes:production_process:read': 'mes:production_process:read',
  'mes:production_record:read': 'mes:production_record:read',
  'mes:production_schedule:read': 'mes:production_schedule:read',
  'mes:quality:read': 'mes:quality:read',
  'mes:quality_template:read': 'mes:quality_template:read',
  'mes:team:read': 'mes:team:read',
  'mes:traceability:read': 'mes:traceability:read',
  'mes:wip:read': 'mes:wip:read',
  'mes:work_order:read': 'mes:work_order:read',
  'mes:work_report:read': 'mes:work_report:read',
  'mes:work_station:read': 'mes:work_station:read',

  // mobile (10 codes)
  'mobile:approval:read': 'mobile:approval:read',
  'mobile:attendance:read': 'mobile:attendance:read',
  'mobile:home:admin': 'mobile:home:admin',
  'mobile:home:read': 'mobile:home:read',
  'mobile:inventory:read': 'mobile:inventory:read',
  'mobile:notification:read': 'mobile:notification:read',
  'mobile:production:read': 'mobile:production:read',
  'mobile:quality:read': 'mobile:quality:read',
  'mobile:scan:read': 'mobile:scan:read',
  'mobile:task:read': 'mobile:task:read',

  // monitor (6 codes)
  'monitor:alert:read': 'monitor:alert:read',
  'monitor:dashboard:admin': 'monitor:dashboard:admin',
  'monitor:dashboard:read': 'monitor:dashboard:read',
  'monitor:log:read': 'monitor:log:read',
  'monitor:metric:read': 'monitor:metric:read',
  'monitor:rule:read': 'monitor:rule:read',

  // oa (6 codes)
  'oa:announcement:read': 'oa:announcement:read',
  'oa:dashboard:read': 'oa:dashboard:read',
  'oa:document:read': 'oa:document:read',
  'oa:documents:read': 'oa:documents:read',
  'oa:meeting:read': 'oa:meeting:read',
  'oa:vehicle:read': 'oa:vehicle:read',

  // pdm (19 codes)
  'pdm:batch:read': 'pdm:batch:read',
  'pdm:bom:read': 'pdm:bom:read',
  'pdm:bom_template:read': 'pdm:bom_template:read',
  'pdm:category_rule:read': 'pdm:category_rule:read',
  'pdm:change:read': 'pdm:change:read',
  'pdm:change_template:read': 'pdm:change_template:read',
  'pdm:dashboard:read': 'pdm:dashboard:read',
  'pdm:doc_approval_flow:read': 'pdm:doc_approval_flow:read',
  'pdm:document:read': 'pdm:document:read',
  'pdm:formula:read': 'pdm:formula:read',
  'pdm:material:read': 'pdm:material:read',
  'pdm:module:read': 'pdm:module:read',
  'pdm:process:read': 'pdm:process:read',
  'pdm:product:read': 'pdm:product:read',
  'pdm:product_category:read': 'pdm:product_category:read',
  'pdm:project:read': 'pdm:project:read',
  'pdm:stats:read': 'pdm:stats:read',
  'pdm:step:read': 'pdm:step:read',
  'pdm:version:read': 'pdm:version:read',

  // pm (8 codes)
  'pm:contract:create': 'pm:contract:create',
  'pm:contract:read': 'pm:contract:read',
  'pm:project:create': 'pm:project:create',
  'pm:project:read': 'pm:project:read',
  'pm:report:read': 'pm:report:read',
  'pm:resource:read': 'pm:resource:read',
  'pm:task:read': 'pm:task:read',
  'pm:template:read': 'pm:template:read',

  // qms (11 codes)
  'qms:analytics:read': 'qms:analytics:read',
  'qms:apqp:read': 'qms:apqp:read',
  'qms:audit:read': 'qms:audit:read',
  'qms:eightd:read': 'qms:eightd:read',
  'qms:fmea:read': 'qms:fmea:read',
  'qms:inspection:read': 'qms:inspection:read',
  'qms:nonconformance:read': 'qms:nonconformance:read',
  'qms:quality_control:read': 'qms:quality_control:read',
  'qms:quality_cost:read': 'qms:quality_cost:read',
  'qms:spc:read': 'qms:spc:read',
  'qms:standard:read': 'qms:standard:read',

  // rd (21 codes)
  'rd:bug:read': 'rd:bug:read',
  'rd:build:read': 'rd:build:read',
  'rd:code:read': 'rd:code:read',
  'rd:dashboard:read': 'rd:dashboard:read',
  'rd:dashboard:write': 'rd:dashboard:write',
  'rd:deploy:read': 'rd:deploy:read',
  'rd:doc:read': 'rd:doc:read',
  'rd:experiment:read': 'rd:experiment:read',
  'rd:experiment:write': 'rd:experiment:write',
  'rd:formula:read': 'rd:formula:read',
  'rd:formula:write': 'rd:formula:write',
  'rd:material:read': 'rd:material:read',
  'rd:milestone:read': 'rd:milestone:read',
  'rd:overview:read': 'rd:overview:read',
  'rd:project:read': 'rd:project:read',
  'rd:project:write': 'rd:project:write',
  'rd:release:read': 'rd:release:read',
  'rd:report:read': 'rd:report:read',
  'rd:review:read': 'rd:review:read',
  'rd:settings:read': 'rd:settings:read',
  'rd:test:read': 'rd:test:read',

  // report (7 codes)
  'report:builder:write': 'report:builder:write',
  'report:dashboard:read': 'report:dashboard:read',
  'report:dashboard:write': 'report:dashboard:write',
  'report:design:write': 'report:design:write',
  'report:schedule:read': 'report:schedule:read',
  'report:subscription:read': 'report:subscription:read',
  'report:template:read': 'report:template:read',

  // scm (19 codes)
  'scm:contract:read': 'scm:contract:read',
  'scm:dashboard:read': 'scm:dashboard:read',
  'scm:delivery_appointment:read': 'scm:delivery_appointment:read',
  'scm:inventory_turnover:read': 'scm:inventory_turnover:read',
  'scm:module:read': 'scm:module:read',
  'scm:mrp_plan:read': 'scm:mrp_plan:read',
  'scm:mrp_suggestion:read': 'scm:mrp_suggestion:read',
  'scm:overview:read': 'scm:overview:read',
  'scm:price_comparison:read': 'scm:price_comparison:read',
  'scm:purchase_item:read': 'scm:purchase_item:read',
  'scm:purchase_order:read': 'scm:purchase_order:read',
  'scm:purchase_requisition:read': 'scm:purchase_requisition:read',
  'scm:purchase_threshold:read': 'scm:purchase_threshold:read',
  'scm:quota_template:read': 'scm:quota_template:read',
  'scm:sourcing_strategy:read': 'scm:sourcing_strategy:read',
  'scm:supplier:read': 'scm:supplier:read',
  'scm:supplier_admission:read': 'scm:supplier_admission:read',
  'scm:supplier_evaluation:read': 'scm:supplier_evaluation:read',
  'scm:supplier_tier:read': 'scm:supplier_tier:read',

  // srm (13 codes)
  'srm:bidding:read': 'srm:bidding:read',
  'srm:category:read': 'srm:category:read',
  'srm:contract:read': 'srm:contract:read',
  'srm:dashboard:read': 'srm:dashboard:read',
  'srm:evaluation:read': 'srm:evaluation:read',
  'srm:finance:read': 'srm:finance:read',
  'srm:inquiry:read': 'srm:inquiry:read',
  'srm:order:read': 'srm:order:read',
  'srm:performance:read': 'srm:performance:read',
  'srm:portal:read': 'srm:portal:read',
  'srm:product:read': 'srm:product:read',
  'srm:quotation:read': 'srm:quotation:read',
  'srm:supplier:read': 'srm:supplier:read',

  // system (2 codes)
  'system:center:read': 'system:center:read',
  'system:read': 'system:read',

  // ticket (1 codes)
  'ticket:dashboard:read': 'ticket:dashboard:read',

  // tms (8 codes)
  'tms:analytics:read': 'tms:analytics:read',
  'tms:carrier:read': 'tms:carrier:read',
  'tms:dashboard:read': 'tms:dashboard:read',
  'tms:driver:read': 'tms:driver:read',
  'tms:module:read': 'tms:module:read',
  'tms:route:read': 'tms:route:read',
  'tms:shipment:read': 'tms:shipment:read',
  'tms:vehicle:read': 'tms:vehicle:read',

  // wms (28 codes)
  'wms:abc:read': 'wms:abc:read',
  'wms:area:read': 'wms:area:read',
  'wms:batch:read': 'wms:batch:read',
  'wms:dashboard:read': 'wms:dashboard:read',
  'wms:fifo_policy:read': 'wms:fifo_policy:read',
  'wms:flow:read': 'wms:flow:read',
  'wms:fulfillment:read': 'wms:fulfillment:read',
  'wms:inbound:read': 'wms:inbound:read',
  'wms:inventory:read': 'wms:inventory:read',
  'wms:inventory_check:read': 'wms:inventory_check:read',
  'wms:inventory_cycle:read': 'wms:inventory_cycle:read',
  'wms:inventory_threshold:read': 'wms:inventory_threshold:read',
  'wms:location:read': 'wms:location:read',
  'wms:location_rule:read': 'wms:location_rule:read',
  'wms:locutil:read': 'wms:locutil:read',
  'wms:module:read': 'wms:module:read',
  'wms:movement:read': 'wms:movement:read',
  'wms:outbound:read': 'wms:outbound:read',
  'wms:pareto:read': 'wms:pareto:read',
  'wms:replenishment:read': 'wms:replenishment:read',
  'wms:report:read': 'wms:report:read',
  'wms:serial_number:read': 'wms:serial_number:read',
  'wms:stocktake:read': 'wms:stocktake:read',
  'wms:supplier:read': 'wms:supplier:read',
  'wms:transfer:read': 'wms:transfer:read',
  'wms:turnover:read': 'wms:turnover:read',
  'wms:warehouse:read': 'wms:warehouse:read',
  'wms:wavepick:read': 'wms:wavepick:read',

  // workflow (8 codes)
  'workflow:approval:read': 'workflow:approval:read',
  'workflow:definition:read': 'workflow:definition:read',
  'workflow:definition:write': 'workflow:definition:write',
  'workflow:instance:read': 'workflow:instance:read',
  'workflow:monitor:read': 'workflow:monitor:read',
  'workflow:notification:read': 'workflow:notification:read',
  'workflow:statistics:read': 'workflow:statistics:read',
  'workflow:template:read': 'workflow:template:read',

  // plugin (1 code · R4/R6 marker)
  'plugin:dashboard:read': 'plugin:dashboard:read',

  // registry (1 code · R4/R6 stub)
  'registry:dashboard:read': 'registry:dashboard:read',

  // shared (1 code · R4/R6 stub)
  'shared:dashboard:read': 'shared:dashboard:read',
};

// Convenience flattened list of all 3-part permission code strings (for R5 orphan checks)
const ALL_3PART_PERM_CODES: string[] = Object.keys(PERMISSION_DEFS);

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
const PERMISSION_CODES_BY_MODULE: Record<string, string[]> = {
  admin: [
    'admin:account:read',
    'admin:audit:read',
    'admin:bank:read',
    'admin:dashboard:read',
    'admin:dashboard:write',
    'admin:database:read',
    'admin:debug:read',
    'admin:dictionary:read',
    'admin:migration:read',
    'admin:monitor:read',
    'admin:plugin:read',
    'admin:plugin:write',
    'admin:system:read',
    'admin:system:write',
    'admin:tenant:read',
    'admin:tenant:write',
  ],
  ai: ['ai:chat:read', 'ai:code:read', 'ai:document:read', 'ai:knowledge:read', 'ai:prompt:read'],
  aps: [
    'aps:capacity:read',
    'aps:dashboard:read',
    'aps:forecast:read',
    'aps:material_plan:read',
    'aps:module:read',
    'aps:production_plan:read',
    'aps:schedule:read',
  ],
  asset: [
    'asset:category:read',
    'asset:dashboard:read',
    'asset:depreciation:read',
    'asset:list:read',
    'asset:transfer:read',
  ],
  automation: [
    'automation:dashboard:read',
    'automation:rule:read',
    'automation:rule:write',
    'automation:run:read',
    'automation:variable:read',
  ],
  bi: [
    'bi:analytics:read',
    'bi:comparison:read',
    'bi:dashboard:admin',
    'bi:dashboard:read',
    'bi:dashboard:write',
    'bi:data_source:read',
    'bi:dataset:read',
    'bi:gis:read',
    'bi:index:read',
    'bi:report:read',
    'bi:report:write',
    'bi:visualization:read',
  ],
  crm: [
    'crm:billing:read',
    'crm:contact:read',
    'crm:customer:create',
    'crm:customer:read',
    'crm:customer:update',
    'crm:customer_scoring:read',
    'crm:customer_segmentation:read',
    'crm:dashboard:update',
    'crm:forecast:read',
    'crm:interaction:read',
    'crm:opportunity:read',
    'crm:recommendation:read',
    'crm:return:read',
    'crm:rfm:read',
    'crm:sales_forecast:read',
    'crm:sales_funnel:read',
  ],
  doc: ['doc:center:read', 'doc:document:read'],
  ehs: [
    'ehs:accident:read',
    'ehs:check:read',
    'ehs:compliance:read',
    'ehs:drill:read',
    'ehs:emergency:read',
    'ehs:environment:read',
    'ehs:hazard:read',
    'ehs:hazardous_material:read',
    'ehs:health:read',
    'ehs:incident:read',
    'ehs:occupational_disease:read',
    'ehs:plan:read',
    'ehs:training:read',
  ],
  erp: [
    'erp:accounting_subject:read',
    'erp:announcement:read',
    'erp:asset:read',
    'erp:audit:read',
    'erp:bank_account:read',
    'erp:budget:read',
    'erp:customer:read',
    'erp:database:read',
    'erp:dictionary:read',
    'erp:financial_analysis:read',
    'erp:financial_statement:read',
    'erp:general_ledger:read',
    'erp:inventory:read',
    'erp:material:read',
    'erp:meeting_room:read',
    'erp:office_supply:read',
    'erp:purchase_order:read',
    'erp:receivable_payable:read',
    'erp:sales_order:read',
    'erp:supplier:read',
    'erp:vehicle:read',
    'erp:vehicle_request:read',
  ],
  finance: [
    'finance:asset:read',
    'finance:budget:read',
    'finance:consolidation:read',
    'finance:cost:read',
    'finance:dashboard:admin',
    'finance:dashboard:read',
    'finance:dashboard:write',
    'finance:expense:read',
    'finance:expense_approval:read',
    'finance:invoice:read',
    'finance:ledger:read',
    'finance:opening_balance:read',
    'finance:payment:read',
    'finance:receipt:read',
    'finance:receivable_payable:read',
    'finance:report:read',
    'finance:tax:read',
    'finance:voucher:create',
    'finance:voucher:read',
  ],
  gis: ['gis:fence:read', 'gis:map:read', 'gis:tracking:read'],
  hrm: [
    'hrm:attendance:read',
    'hrm:attendance_rule:read',
    'hrm:company:read',
    'hrm:contract:read',
    'hrm:dashboard:read',
    'hrm:department:read',
    'hrm:employee:create',
    'hrm:employee:read',
    'hrm:employee:update',
    'hrm:leave:read',
    'hrm:module:read',
    'hrm:organization:read',
    'hrm:overview:read',
    'hrm:payroll:read',
    'hrm:payroll_template:read',
    'hrm:performance:read',
    'hrm:position:read',
    'hrm:recruitment:read',
    'hrm:recruitment_flow:read',
    'hrm:report:read',
    'hrm:salary_adjustment:read',
    'hrm:training:read',
    'hrm:training_plan:read',
  ],
  iam: ['iam:permission:read', 'iam:role:read', 'iam:structure:read', 'iam:user:read'],
  im: ['im:dashboard:read', 'im:mail:read'],
  integration: [
    'integration:connection:read',
    'integration:erp:read',
    'integration:event:read',
    'integration:lims:read',
    'integration:mapping:read',
    'integration:mes:read',
    'integration:wms:read',
  ],
  lims: [
    'lims:barcode:read',
    'lims:dashboard:read',
    'lims:dashboard:write',
    'lims:instrument:read',
    'lims:instrument:write',
    'lims:process:read',
    'lims:proficiency:read',
    'lims:reagent:read',
    'lims:result:read',
    'lims:sample:read',
    'lims:sample:write',
    'lims:task:read',
    'lims:test_method:read',
    'lims:uncertainty:read',
  ],
  lowcode: [
    'lowcode:apps:read',
    'lowcode:dashboard:read',
    'lowcode:form:read',
    'lowcode:page:read',
    'lowcode:workflow:read',
  ],
  mes: [
    'mes:analytics:read',
    'mes:anomaly_detection:read',
    'mes:aps_config:read',
    'mes:bom_version_policy:read',
    'mes:dashboard:read',
    'mes:energy_management:read',
    'mes:equipment:read',
    'mes:equipment_threshold:read',
    'mes:kanban:read',
    'mes:material:read',
    'mes:material:update',
    'mes:module:read',
    'mes:oee:read',
    'mes:process_flow:read',
    'mes:process_route:read',
    'mes:production_cost:read',
    'mes:production_dashboard:read',
    'mes:production_order:read',
    'mes:production_process:read',
    'mes:production_record:read',
    'mes:production_schedule:read',
    'mes:quality:read',
    'mes:quality_template:read',
    'mes:team:read',
    'mes:traceability:read',
    'mes:wip:read',
    'mes:work_order:read',
    'mes:work_report:read',
    'mes:work_station:read',
  ],
  mobile: [
    'mobile:approval:read',
    'mobile:attendance:read',
    'mobile:home:admin',
    'mobile:home:read',
    'mobile:inventory:read',
    'mobile:notification:read',
    'mobile:production:read',
    'mobile:quality:read',
    'mobile:scan:read',
    'mobile:task:read',
  ],
  monitor: [
    'monitor:alert:read',
    'monitor:dashboard:admin',
    'monitor:dashboard:read',
    'monitor:log:read',
    'monitor:metric:read',
    'monitor:rule:read',
  ],
  oa: [
    'oa:announcement:read',
    'oa:dashboard:read',
    'oa:document:read',
    'oa:documents:read',
    'oa:meeting:read',
    'oa:vehicle:read',
  ],
  pdm: [
    'pdm:batch:read',
    'pdm:bom:read',
    'pdm:bom_template:read',
    'pdm:category_rule:read',
    'pdm:change:read',
    'pdm:change_template:read',
    'pdm:dashboard:read',
    'pdm:doc_approval_flow:read',
    'pdm:document:read',
    'pdm:formula:read',
    'pdm:material:read',
    'pdm:module:read',
    'pdm:process:read',
    'pdm:product:read',
    'pdm:product_category:read',
    'pdm:project:read',
    'pdm:stats:read',
    'pdm:step:read',
    'pdm:version:read',
  ],
  pm: [
    'pm:contract:create',
    'pm:contract:read',
    'pm:project:create',
    'pm:project:read',
    'pm:report:read',
    'pm:resource:read',
    'pm:task:read',
    'pm:template:read',
  ],
  qms: [
    'qms:analytics:read',
    'qms:apqp:read',
    'qms:audit:read',
    'qms:eightd:read',
    'qms:fmea:read',
    'qms:inspection:read',
    'qms:nonconformance:read',
    'qms:quality_control:read',
    'qms:quality_cost:read',
    'qms:spc:read',
    'qms:standard:read',
  ],
  rd: [
    'rd:bug:read',
    'rd:build:read',
    'rd:code:read',
    'rd:dashboard:read',
    'rd:dashboard:write',
    'rd:deploy:read',
    'rd:doc:read',
    'rd:experiment:read',
    'rd:experiment:write',
    'rd:formula:read',
    'rd:formula:write',
    'rd:material:read',
    'rd:milestone:read',
    'rd:overview:read',
    'rd:project:read',
    'rd:project:write',
    'rd:release:read',
    'rd:report:read',
    'rd:review:read',
    'rd:settings:read',
    'rd:test:read',
  ],
  report: [
    'report:builder:write',
    'report:dashboard:read',
    'report:dashboard:write',
    'report:design:write',
    'report:schedule:read',
    'report:subscription:read',
    'report:template:read',
  ],
  scm: [
    'scm:contract:read',
    'scm:dashboard:read',
    'scm:delivery_appointment:read',
    'scm:inventory_turnover:read',
    'scm:module:read',
    'scm:mrp_plan:read',
    'scm:mrp_suggestion:read',
    'scm:overview:read',
    'scm:price_comparison:read',
    'scm:purchase_item:read',
    'scm:purchase_order:read',
    'scm:purchase_requisition:read',
    'scm:purchase_threshold:read',
    'scm:quota_template:read',
    'scm:sourcing_strategy:read',
    'scm:supplier:read',
    'scm:supplier_admission:read',
    'scm:supplier_evaluation:read',
    'scm:supplier_tier:read',
  ],
  srm: [
    'srm:bidding:read',
    'srm:category:read',
    'srm:contract:read',
    'srm:dashboard:read',
    'srm:evaluation:read',
    'srm:finance:read',
    'srm:inquiry:read',
    'srm:order:read',
    'srm:performance:read',
    'srm:portal:read',
    'srm:product:read',
    'srm:quotation:read',
    'srm:supplier:read',
  ],
  system: ['system:center:read', 'system:read'],
  ticket: ['ticket:dashboard:read'],
  tms: [
    'tms:analytics:read',
    'tms:carrier:read',
    'tms:dashboard:read',
    'tms:driver:read',
    'tms:module:read',
    'tms:route:read',
    'tms:shipment:read',
    'tms:vehicle:read',
  ],
  wms: [
    'wms:abc:read',
    'wms:area:read',
    'wms:batch:read',
    'wms:dashboard:read',
    'wms:fifo_policy:read',
    'wms:flow:read',
    'wms:fulfillment:read',
    'wms:inbound:read',
    'wms:inventory:read',
    'wms:inventory_check:read',
    'wms:inventory_cycle:read',
    'wms:inventory_threshold:read',
    'wms:location:read',
    'wms:location_rule:read',
    'wms:locutil:read',
    'wms:module:read',
    'wms:movement:read',
    'wms:outbound:read',
    'wms:pareto:read',
    'wms:replenishment:read',
    'wms:report:read',
    'wms:serial_number:read',
    'wms:stocktake:read',
    'wms:supplier:read',
    'wms:transfer:read',
    'wms:turnover:read',
    'wms:warehouse:read',
    'wms:wavepick:read',
  ],
  workflow: [
    'workflow:approval:read',
    'workflow:definition:read',
    'workflow:definition:write',
    'workflow:instance:read',
    'workflow:monitor:read',
    'workflow:notification:read',
    'workflow:statistics:read',
    'workflow:template:read',
  ],
};

export default PERMISSIONS;

// CI 全流水线触发标记（frontend + permission path filter hit）
