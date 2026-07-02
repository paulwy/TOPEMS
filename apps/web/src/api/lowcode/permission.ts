import type { RolePermission, DataPermissionRule, FieldPermissionRule } from './types';

const mockRolePermissions: RolePermission[] = [
  {
    id: 'rp-001',
    roleId: 'role-admin',
    roleName: '管理员',
    appId: 'app-001',
    permissions: ['app:read', 'app:write', 'app:admin', 'data:read', 'data:write', 'data:delete'],
    dataPermissions: [],
    fieldPermissions: [],
  },
  {
    id: 'rp-002',
    roleId: 'role-sales',
    roleName: '销售',
    appId: 'app-001',
    permissions: ['app:read', 'data:read', 'data:write'],
    dataPermissions: [
      {
        id: 'dp-001',
        name: '仅看自己的客户',
        modelId: 'dm-001',
        condition: 'createdBy = currentUser',
        field: 'createdBy',
        operator: 'eq',
        value: 'currentUser',
      },
    ],
    fieldPermissions: [
      {
        id: 'fp-001',
        modelId: 'dm-001',
        fieldId: 'f-011',
        roleId: 'role-sales',
        visible: false,
        editable: false,
      },
    ],
  },
  {
    id: 'rp-003',
    roleId: 'role-manager',
    roleName: '经理',
    appId: 'app-001',
    permissions: ['app:read', 'data:read', 'data:write', 'data:delete'],
    dataPermissions: [
      {
        id: 'dp-002',
        name: '看本部门客户',
        modelId: 'dm-001',
        condition: 'department = currentUser.department',
        field: 'department',
        operator: 'eq',
        value: 'currentUser.department',
      },
    ],
    fieldPermissions: [],
  },
  {
    id: 'rp-004',
    roleId: 'role-hr',
    roleName: 'HR专员',
    appId: 'app-002',
    permissions: ['app:read', 'app:write', 'data:read', 'data:write'],
    dataPermissions: [],
    fieldPermissions: [
      {
        id: 'fp-002',
        modelId: 'dm-004',
        fieldId: 'f-049',
        roleId: 'role-hr',
        visible: true,
        editable: true,
      },
    ],
  },
  {
    id: 'rp-005',
    roleId: 'role-viewer',
    roleName: '查看者',
    appId: 'app-002',
    permissions: ['app:read', 'data:read'],
    dataPermissions: [],
    fieldPermissions: [
      {
        id: 'fp-003',
        modelId: 'dm-004',
        fieldId: 'f-049',
        roleId: 'role-viewer',
        visible: false,
        editable: false,
      },
    ],
  },
];

export async function listRolePermissions(params?: { appId?: string; roleId?: string }) {
  let data = [...mockRolePermissions];

  if (params?.appId) {
    data = data.filter((p) => p.appId === params.appId);
  }

  if (params?.roleId) {
    data = data.filter((p) => p.roleId === params.roleId);
  }

  return {
    code: 0,
    success: true,
    data,
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function getRolePermission(id: string) {
  const permission = mockRolePermissions.find((p) => p.id === id);
  return {
    code: 0,
    success: true,
    data: permission,
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function updateRolePermissions(roleId: string, appId: string, permissions: string[]) {
  const index = mockRolePermissions.findIndex((p) => p.roleId === roleId && p.appId === appId);
  if (index !== -1) {
    mockRolePermissions[index].permissions = permissions;
  } else {
    mockRolePermissions.push({
      id: `rp-${Date.now()}`,
      roleId,
      appId,
      permissions,
      dataPermissions: [],
      fieldPermissions: [],
    });
  }
  return {
    code: 0,
    success: true,
    data: null,
    message: '权限更新成功',
    timestamp: new Date().toISOString(),
  };
}

export async function listDataPermissions(modelId: string) {
  const allDataPermissions: DataPermissionRule[] = [];
  mockRolePermissions.forEach((rp) => {
    if (rp.dataPermissions) {
      rp.dataPermissions.forEach((dp) => {
        if (dp.modelId === modelId) {
          allDataPermissions.push(dp);
        }
      });
    }
  });

  return {
    code: 0,
    success: true,
    data: allDataPermissions,
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function listFieldPermissions(modelId: string) {
  const allFieldPermissions: FieldPermissionRule[] = [];
  mockRolePermissions.forEach((rp) => {
    if (rp.fieldPermissions) {
      rp.fieldPermissions.forEach((fp) => {
        if (fp.modelId === modelId) {
          allFieldPermissions.push(fp);
        }
      });
    }
  });

  return {
    code: 0,
    success: true,
    data: allFieldPermissions,
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function updateFieldPermission(
  permission: Partial<FieldPermissionRule> & { modelId: string; fieldId: string; roleId: string }
) {
  for (const rp of mockRolePermissions) {
    if (rp.roleId === permission.roleId) {
      rp.fieldPermissions = rp.fieldPermissions || [];
      const idx = rp.fieldPermissions.findIndex(
        (fp) => fp.modelId === permission.modelId && fp.fieldId === permission.fieldId
      );
      if (idx !== -1) {
        rp.fieldPermissions[idx] = { ...rp.fieldPermissions[idx], ...permission };
      } else {
        rp.fieldPermissions.push({
          id: `fp-${Date.now()}`,
          modelId: permission.modelId,
          fieldId: permission.fieldId,
          roleId: permission.roleId,
          visible: permission.visible ?? true,
          editable: permission.editable ?? false,
        });
      }
      break;
    }
  }

  return {
    code: 0,
    success: true,
    data: null,
    message: '字段权限更新成功',
    timestamp: new Date().toISOString(),
  };
}
