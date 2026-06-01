export const PERMISSIONS = {
  RS: {
    READ: 'rs:read',
    WRITE: 'rs:write',
    DELETE: 'rs:delete',
    ADMIN: 'rs:admin',
  },
  LIMS: {
    READ: 'lims:read',
    WRITE: 'lims:write',
    DELETE: 'lims:delete',
    ADMIN: 'lims:admin',
  },
  QMS: {
    READ: 'qms:read',
    WRITE: 'qms:write',
    DELETE: 'qms:delete',
    ADMIN: 'qms:admin',
  },
  EHS: {
    READ: 'ehs:read',
    WRITE: 'ehs:write',
    DELETE: 'ehs:delete',
    ADMIN: 'ehs:admin',
  },
  SRM: {
    READ: 'srm:read',
    WRITE: 'srm:write',
    DELETE: 'srm:delete',
    ADMIN: 'srm:admin',
  },
  PDM: {
    READ: 'pdm:read',
    WRITE: 'pdm:write',
    DELETE: 'pdm:delete',
    ADMIN: 'pdm:admin',
  },
  WORKFLOW: {
    READ: 'workflow:read',
    WRITE: 'workflow:write',
    APPROVE: 'workflow:approve',
    REJECT: 'workflow:reject',
    ADMIN: 'workflow:admin',
  },
  DOC: {
    READ: 'doc:read',
    WRITE: 'doc:write',
    DELETE: 'doc:delete',
    ADMIN: 'doc:admin',
  },
  AI: {
    READ: 'ai:read',
    WRITE: 'ai:write',
    DELETE: 'ai:delete',
    ADMIN: 'ai:admin',
  },
  HRM: {
    READ: 'hrm:read',
    WRITE: 'hrm:write',
    DELETE: 'hrm:delete',
    ADMIN: 'hrm:admin',
  },
  USER: {
    READ: 'user:read',
    WRITE: 'user:write',
    DELETE: 'user:delete',
    ADMIN: 'user:admin',
  },
  ROLE: {
    READ: 'role:read',
    WRITE: 'role:write',
    DELETE: 'role:delete',
    ADMIN: 'role:admin',
  },
  SYSTEM: {
    READ: 'system:read',
    WRITE: 'system:write',
    ADMIN: 'system:admin',
  },
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
    DESCRIPTION: '部门经理，拥有本部门所有权限',
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

export const MODULES = {
  RS: 'rs',
  LIMS: 'lims',
  QMS: 'qms',
  EHS: 'ehs',
  SRM: 'srm',
  PDM: 'pdm',
  WORKFLOW: 'workflow',
  DOC: 'doc',
  AI: 'ai',
  HRM: 'hrm',
};

export const MODULE_PERMISSIONS = {
  [MODULES.RS]: [PERMISSIONS.RS.READ, PERMISSIONS.RS.WRITE, PERMISSIONS.RS.DELETE, PERMISSIONS.RS.ADMIN],
  [MODULES.LIMS]: [PERMISSIONS.LIMS.READ, PERMISSIONS.LIMS.WRITE, PERMISSIONS.LIMS.DELETE, PERMISSIONS.LIMS.ADMIN],
  [MODULES.QMS]: [PERMISSIONS.QMS.READ, PERMISSIONS.QMS.WRITE, PERMISSIONS.QMS.DELETE, PERMISSIONS.QMS.ADMIN],
  [MODULES.EHS]: [PERMISSIONS.EHS.READ, PERMISSIONS.EHS.WRITE, PERMISSIONS.EHS.DELETE, PERMISSIONS.EHS.ADMIN],
  [MODULES.SRM]: [PERMISSIONS.SRM.READ, PERMISSIONS.SRM.WRITE, PERMISSIONS.SRM.DELETE, PERMISSIONS.SRM.ADMIN],
  [MODULES.PDM]: [PERMISSIONS.PDM.READ, PERMISSIONS.PDM.WRITE, PERMISSIONS.PDM.DELETE, PERMISSIONS.PDM.ADMIN],
  [MODULES.WORKFLOW]: [PERMISSIONS.WORKFLOW.READ, PERMISSIONS.WORKFLOW.WRITE, PERMISSIONS.WORKFLOW.APPROVE, PERMISSIONS.WORKFLOW.REJECT, PERMISSIONS.WORKFLOW.ADMIN],
  [MODULES.DOC]: [PERMISSIONS.DOC.READ, PERMISSIONS.DOC.WRITE, PERMISSIONS.DOC.DELETE, PERMISSIONS.DOC.ADMIN],
  [MODULES.AI]: [PERMISSIONS.AI.READ, PERMISSIONS.AI.WRITE, PERMISSIONS.AI.DELETE, PERMISSIONS.AI.ADMIN],
  [MODULES.HRM]: [PERMISSIONS.HRM.READ, PERMISSIONS.HRM.WRITE, PERMISSIONS.HRM.DELETE, PERMISSIONS.HRM.ADMIN],
};

export const getModulePermissions = (module: string) => {
  return MODULE_PERMISSIONS[module] || [];
};

export const getModuleActions = (module: string) => {
  const permissions = getModulePermissions(module);
  return {
    canRead: permissions.includes(`${module}:read`),
    canWrite: permissions.includes(`${module}:write`),
    canDelete: permissions.includes(`${module}:delete`),
    canAdmin: permissions.includes(`${module}:admin`),
  };
};

export default PERMISSIONS;
