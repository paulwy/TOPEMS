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
  { action: 'read', name: '只读', level: 1 },
  { action: 'write', name: '写入', level: 2 },
  { action: 'delete', name: '删除', level: 3 },
  { action: 'approve', name: '审批', level: 3 },
  { action: 'admin', name: '管理', level: 4 },
];

export const PERMISSION_GROUPS: Record<string, PermissionGroup> = {
  core: {
    id: 'core',
    name: '核心模块',
    description: '系统核心功能模块',
    modules: ['iam'],
  },
  business: {
    id: 'business',
    name: '业务模块',
    description: '核心业务管理模块',
    modules: ['hrm', 'erp', 'pm', 'rs', 'scm', 'crm'],
  },
  advanced: {
    id: 'advanced',
    name: '高级模块',
    description: '高级功能模块',
    modules: ['ai', 'gis', 'qms', 'ehs', 'mes', 'wms'],
  },
  infrastructure: {
    id: 'infrastructure',
    name: '基础设施',
    description: '系统基础设施模块',
    modules: ['doc', 'file', 'notification', 'im', 'integration'],
  },
  system: {
    id: 'system',
    name: '系统管理',
    description: '系统配置与管理',
    modules: ['system', 'workflow'],
  },
};

export const PERMISSIONS: Record<ModuleCode, Record<PermissionAction, string>> = {
  [MODULES.IAM]: {
    read: 'iam:read',
    write: 'iam:write',
    delete: 'iam:delete',
    approve: 'iam:approve',
    admin: 'iam:admin',
  },
  [MODULES.HRM]: {
    read: 'hrm:read',
    write: 'hrm:write',
    delete: 'hrm:delete',
    approve: 'hrm:approve',
    admin: 'hrm:admin',
  },
  [MODULES.ERP]: {
    read: 'erp:read',
    write: 'erp:write',
    delete: 'erp:delete',
    approve: 'erp:approve',
    admin: 'erp:admin',
  },
  [MODULES.PM]: {
    read: 'pm:read',
    write: 'pm:write',
    delete: 'pm:delete',
    approve: 'pm:approve',
    admin: 'pm:admin',
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
    read: 'crm:read',
    write: 'crm:write',
    delete: 'crm:delete',
    approve: 'crm:approve',
    admin: 'crm:admin',
  },
  [MODULES.AI]: {
    read: 'ai:read',
    write: 'ai:write',
    delete: 'ai:delete',
    approve: 'ai:approve',
    admin: 'ai:admin',
  },
  [MODULES.GIS]: {
    read: 'gis:read',
    write: 'gis:write',
    delete: 'gis:delete',
    approve: 'gis:approve',
    admin: 'gis:admin',
  },
  // QMS 质量管理
  [MODULES.QMS]: {
    read: 'qms:read',
    write: 'qms:write',
    delete: 'qms:delete',
    approve: 'qms:approve',
    admin: 'qms:admin',
  },
  // EHS 环境健康安全
  [MODULES.EHS]: {
    read: 'ehs:read',
    write: 'ehs:write',
    delete: 'ehs:delete',
    approve: 'ehs:approve',
    admin: 'ehs:admin',
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
    read: 'workflow:read',
    write: 'workflow:write',
    delete: 'workflow:delete',
    approve: 'workflow:approve',
    admin: 'workflow:admin',
  },
  [MODULES.DOC]: {
    read: 'doc:read',
    write: 'doc:write',
    delete: 'doc:delete',
    approve: 'doc:approve',
    admin: 'doc:admin',
  },
  [MODULES.FILE]: {
    read: 'file:read',
    write: 'file:write',
    delete: 'file:delete',
    approve: 'file:approve',
    admin: 'file:admin',
  },
  [MODULES.NOTIFICATION]: {
    read: 'notification:read',
    write: 'notification:write',
    delete: 'notification:delete',
    approve: 'notification:approve',
    admin: 'notification:admin',
  },
  [MODULES.IM]: {
    read: 'im:read',
    write: 'im:write',
    delete: 'im:delete',
    approve: 'im:approve',
    admin: 'im:admin',
  },
  [MODULES.INTEGRATION]: {
    read: 'integration:read',
    write: 'integration:write',
    delete: 'integration:delete',
    approve: 'integration:approve',
    admin: 'integration:admin',
  },
  // SYSTEM 系统设置
  [MODULES.SYSTEM]: {
    read: 'system:read',
    write: 'system:write',
    delete: 'system:delete',
    approve: 'system:approve',
    admin: 'system:admin',
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
  GUEST: [
    PERMISSIONS.doc.read,
    PERMISSIONS.notification.read,
  ],
};

export const MODULE_INFO: Record<ModuleCode, { name: string; description: string }> = {
  // 核心模块
  [MODULES.IAM]: { name: '身份管理', description: '用户、角色、权限管理' },
  // 业务模块
  [MODULES.HRM]: { name: '人力资源', description: '员工、公司、部门管理' },
  [MODULES.ERP]: { name: '企业资源', description: '财务、库存、销售管理' },
  [MODULES.PM]: { name: '项目管理', description: '项目、任务、时间线' },
  [MODULES.RS]: { name: '研发管理', description: '研发项目、文档、测试' },
  [MODULES.SCM]: { name: '供应链', description: '供应商、采购、仓储' },
  [MODULES.CRM]: { name: '客户关系', description: '客户、商机、活动' },
  [MODULES.AI]: { name: 'AI助手', description: '智能对话、数据分析' },
  [MODULES.GIS]: { name: '地理信息', description: '地图、图层、空间分析' },
  [MODULES.QMS]: { name: '质量管理', description: '质量标准、审核记录' },
  [MODULES.EHS]: { name: '环境健康安全', description: '环境、安全、健康管理' },
  [MODULES.MES]: { name: '制造执行', description: '生产执行、工序管理' },
  [MODULES.WMS]: { name: '仓储管理', description: '仓库、库存、入库出库' },
  // 特殊模块
  [MODULES.WORKFLOW]: { name: '工作流', description: '流程定义、审批' },
  // 基础设施模块
  [MODULES.DOC]: { name: '文档管理', description: '文档存储、协作' },
  [MODULES.FILE]: { name: '文件服务', description: '文件上传、存储' },
  [MODULES.NOTIFICATION]: { name: '通知服务', description: '消息通知、推送' },
  [MODULES.IM]: { name: '即时通讯', description: '即时消息、群聊' },
  [MODULES.INTEGRATION]: { name: '系统集成', description: '第三方系统集成' },
  // 系统模块
  [MODULES.SYSTEM]: { name: '系统设置', description: '系统配置、监控、审计' },
};

export const ROLES = {
  ADMIN: {
    ID: '00000000-0000-0000-0000-000000000001',
    NAME: '管理员',
    DESCRIPTION: '系统管理员，拥有所有权限',
  },
  MANAGER: {
    ID: '00000000-0000-0000-0000-000000000002',
    NAME: '部门经理',
    DESCRIPTION: '部门经理，拥有本部门管理权限',
  },
  USER: {
    ID: '00000000-0000-0000-0000-000000000003',
    NAME: '普通员工',
    DESCRIPTION: '普通员工，拥有基础操作权限',
  },
  GUEST: {
    ID: '00000000-0000-0000-0000-000000000004',
    NAME: '访客',
    DESCRIPTION: '访客，只读权限',
  },
};

export const getModulePermissions = (module: ModuleCode): string[] => {
  return Object.values(PERMISSIONS[module] || {});
};

export const getModuleActions = (
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
  if (parts.length === 2) {
    const [module, action] = parts;

    // 基础设施服务权限与 IAM 联动
    const infrastructureModules = ['doc', 'file', 'notification', 'integration', 'im'];
    if (infrastructureModules.includes(module)) {
      // 有 IAM 同级权限自动获得基础设施权限
      const iamPermission = `iam:${action}`;
      if (userPermissions.includes(iamPermission)) {
        return true;
      }
      // 有 IAM:admin 自动获得所有基础设施权限
      if (userPermissions.includes('iam:admin')) {
        return true;
      }
    }

    const adminPerm = `${module}:admin`;
    if (userPermissions.includes(adminPerm)) {
      return true;
    }

    const actionLevel = ACTIONS.find((a) => a.action === action)?.level || 0;
    const userActions = userPermissions
      .filter((p) => p.startsWith(`${module}:`))
      .map((p) => {
        const actionPart = p.split(':')[1];
        return ACTIONS.find((a) => a.action === actionPart)?.level || 0;
      });

    return userActions.some((level) => level >= actionLevel);
  }

  return false;
};

export const getModuleActionsFromPermissions = (
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

export const getAllPermissions = (): ModulePermission[] => {
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
        description: `${info.description}的${action.name}权限`,
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
        description: `${info.description}的${action.name}权限`,
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

export const hasPermissionWithInheritance = (userPermissions: string[], requiredPermission: string): boolean => {
  const allPermissions = getInheritedPermissions(userPermissions);
  return hasPermission(allPermissions, requiredPermission);
};

export const getRolePermissions = (roleName: string): string[] => {
  return ROLE_PERMISSIONS[roleName] || [];
};

export const getPermissionsByRole = (roleName: string): string[] => {
  return getRolePermissions(roleName);
};

export default PERMISSIONS;
