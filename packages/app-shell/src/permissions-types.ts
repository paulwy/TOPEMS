/**
 * 从 apps/web/src/config/permissions.ts 抽取的纯类型/数据定义。
 *
 * 本文件仅包含不依赖 i18n.t() 运行时翻译的部分：
 *   - PermissionAction 类型
 *   - MODULES 常量（纯字符串值）
 *   - ModuleCode 类型
 *   - PERMISSIONS 常量（纯字符串值）
 *   - getModulePermissions 函数（只依赖 PERMISSIONS）
 *
 * 依赖 i18n.t() 的部分（ACTIONS, PERMISSION_GROUPS, MODULE_INFO, ROLES,
 * ROLE_PERMISSIONS, PERMISSION_DEFS, PERMISSION_CODES_BY_MODULE, hasPermission
 * 等函数）仍保留在 web 端的 permissions.ts 中。
 */

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

export const getModulePermissions = (module: ModuleCode): string[] => {
  return Object.values(PERMISSIONS[module] || {});
};
