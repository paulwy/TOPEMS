export const PERMISSION_MAPPING: Record<string, { name: string; resource: string; action: string }> = {
  // User Management
  '00000000-0000-0000-0000-000000000010': { name: 'user:read', resource: 'user', action: 'read' },
  '00000000-0000-0000-0000-000000000011': { name: 'user:write', resource: 'user', action: 'write' },
  '00000000-0000-0000-0000-000000000012': { name: 'user:delete', resource: 'user', action: 'delete' },
  '00000000-0000-0000-0000-000000000013': { name: 'user:admin', resource: 'user', action: 'admin' },

  // Role Management
  '00000000-0000-0000-0000-000000000014': { name: 'role:read', resource: 'role', action: 'read' },
  '00000000-0000-0000-0000-000000000015': { name: 'role:write', resource: 'role', action: 'write' },
  '00000000-0000-0000-0000-000000000016': { name: 'role:delete', resource: 'role', action: 'delete' },
  '00000000-0000-0000-0000-000000000017': { name: 'role:admin', resource: 'role', action: 'admin' },

  // System
  '00000000-0000-0000-0000-000000000020': { name: 'system:read', resource: 'system', action: 'read' },
  '00000000-0000-0000-0000-000000000021': { name: 'system:write', resource: 'system', action: 'write' },
  '00000000-0000-0000-0000-000000000022': { name: 'system:admin', resource: 'system', action: 'admin' },

  // RS (Research System)
  '00000001-0000-0000-0000-000000000001': { name: 'rs:read', resource: 'rs', action: 'read' },
  '00000001-0000-0000-0000-000000000002': { name: 'rs:write', resource: 'rs', action: 'write' },
  '00000001-0000-0000-0000-000000000003': { name: 'rs:delete', resource: 'rs', action: 'delete' },
  '00000001-0000-0000-0000-000000000004': { name: 'rs:admin', resource: 'rs', action: 'admin' },

  // LIMS (Laboratory Information Management System)
  '00000002-0000-0000-0000-000000000001': { name: 'lims:read', resource: 'lims', action: 'read' },
  '00000002-0000-0000-0000-000000000002': { name: 'lims:write', resource: 'lims', action: 'write' },
  '00000002-0000-0000-0000-000000000003': { name: 'lims:delete', resource: 'lims', action: 'delete' },
  '00000002-0000-0000-0000-000000000004': { name: 'lims:admin', resource: 'lims', action: 'admin' },

  // QMS (Quality Management System)
  '00000003-0000-0000-0000-000000000001': { name: 'qms:read', resource: 'qms', action: 'read' },
  '00000003-0000-0000-0000-000000000002': { name: 'qms:write', resource: 'qms', action: 'write' },
  '00000003-0000-0000-0000-000000000003': { name: 'qms:delete', resource: 'qms', action: 'delete' },
  '00000003-0000-0000-0000-000000000004': { name: 'qms:admin', resource: 'qms', action: 'admin' },

  // EHS (Environment, Health, Safety)
  '00000004-0000-0000-0000-000000000001': { name: 'ehs:read', resource: 'ehs', action: 'read' },
  '00000004-0000-0000-0000-000000000002': { name: 'ehs:write', resource: 'ehs', action: 'write' },
  '00000004-0000-0000-0000-000000000003': { name: 'ehs:delete', resource: 'ehs', action: 'delete' },
  '00000004-0000-0000-0000-000000000004': { name: 'ehs:admin', resource: 'ehs', action: 'admin' },

  // SRM (Supplier Relationship Management)
  '00000005-0000-0000-0000-000000000001': { name: 'srm:read', resource: 'srm', action: 'read' },
  '00000005-0000-0000-0000-000000000002': { name: 'srm:write', resource: 'srm', action: 'write' },
  '00000005-0000-0000-0000-000000000003': { name: 'srm:delete', resource: 'srm', action: 'delete' },
  '00000005-0000-0000-0000-000000000004': { name: 'srm:admin', resource: 'srm', action: 'admin' },

  // PDM (Product Data Management)
  '00000006-0000-0000-0000-000000000001': { name: 'pdm:read', resource: 'pdm', action: 'read' },
  '00000006-0000-0000-0000-000000000002': { name: 'pdm:write', resource: 'pdm', action: 'write' },
  '00000006-0000-0000-0000-000000000003': { name: 'pdm:delete', resource: 'pdm', action: 'delete' },
  '00000006-0000-0000-0000-000000000004': { name: 'pdm:admin', resource: 'pdm', action: 'admin' },

  // Workflow
  '00000007-0000-0000-0000-000000000001': { name: 'workflow:read', resource: 'workflow', action: 'read' },
  '00000007-0000-0000-0000-000000000002': { name: 'workflow:write', resource: 'workflow', action: 'write' },
  '00000007-0000-0000-0000-000000000003': { name: 'workflow:approve', resource: 'workflow', action: 'approve' },
  '00000007-0000-0000-0000-000000000004': { name: 'workflow:reject', resource: 'workflow', action: 'reject' },
  '00000007-0000-0000-0000-000000000005': { name: 'workflow:admin', resource: 'workflow', action: 'admin' },

  // Document
  '00000008-0000-0000-0000-000000000001': { name: 'doc:read', resource: 'doc', action: 'read' },
  '00000008-0000-0000-0000-000000000002': { name: 'doc:write', resource: 'doc', action: 'write' },
  '00000008-0000-0000-0000-000000000003': { name: 'doc:delete', resource: 'doc', action: 'delete' },
  '00000008-0000-0000-0000-000000000004': { name: 'doc:admin', resource: 'doc', action: 'admin' },

  // AI
  '00000009-0000-0000-0000-000000000001': { name: 'ai:read', resource: 'ai', action: 'read' },
  '00000009-0000-0000-0000-000000000002': { name: 'ai:write', resource: 'ai', action: 'write' },
  '00000009-0000-0000-0000-000000000003': { name: 'ai:delete', resource: 'ai', action: 'delete' },
  '00000009-0000-0000-0000-000000000004': { name: 'ai:admin', resource: 'ai', action: 'admin' },

  // IM (Instant Messaging)
  '00000010-0000-0000-0000-000000000001': { name: 'im:read', resource: 'im', action: 'read' },
  '00000010-0000-0000-0000-000000000002': { name: 'im:write', resource: 'im', action: 'write' },
  '00000010-0000-0000-0000-000000000003': { name: 'im:admin', resource: 'im', action: 'admin' },

  // Mail
  '00000011-0000-0000-0000-000000000001': { name: 'mail:read', resource: 'mail', action: 'read' },
  '00000011-0000-0000-0000-000000000002': { name: 'mail:write', resource: 'mail', action: 'write' },
  '00000011-0000-0000-0000-000000000003': { name: 'mail:admin', resource: 'mail', action: 'admin' },

  // GIS
  '00000012-0000-0000-0000-000000000001': { name: 'gis:read', resource: 'gis', action: 'read' },
  '00000012-0000-0000-0000-000000000002': { name: 'gis:write', resource: 'gis', action: 'write' },
  '00000012-0000-0000-0000-000000000003': { name: 'gis:admin', resource: 'gis', action: 'admin' },

  // Notification
  '00000013-0000-0000-0000-000000000001': { name: 'notification:read', resource: 'notification', action: 'read' },
  '00000013-0000-0000-0000-000000000002': { name: 'notification:write', resource: 'notification', action: 'write' },

  // PM (Project Management)
  '00000014-0000-0000-0000-000000000001': { name: 'pm:read', resource: 'pm', action: 'read' },
  '00000014-0000-0000-0000-000000000002': { name: 'pm:write', resource: 'pm', action: 'write' },
  '00000014-0000-0000-0000-000000000003': { name: 'pm:admin', resource: 'pm', action: 'admin' },

  // Integration
  '00000015-0000-0000-0000-000000000001': { name: 'integration:read', resource: 'integration', action: 'read' },
  '00000015-0000-0000-0000-000000000002': { name: 'integration:write', resource: 'integration', action: 'write' },
  '00000015-0000-0000-0000-000000000003': { name: 'integration:admin', resource: 'integration', action: 'admin' },
};

export const mapPermissionIdToName = (permissionId: string): string | null => {
  const mapping = PERMISSION_MAPPING[permissionId];
  return mapping ? mapping.name : null;
};

export const mapPermissionIdsToNames = (permissionIds: string[]): string[] => {
  return permissionIds.map((id) => mapPermissionIdToName(id)).filter((name): name is string => name !== null);
};

export const ALL_ADMIN_PERMISSIONS = [
  '00000000-0000-0000-0000-000000000013', // user:admin
  '00000000-0000-0000-0000-000000000017', // role:admin
  '00000000-0000-0000-0000-000000000022', // system:admin
];

export const IAM_ADMIN_PERMISSION_ID = '00000000-0000-0000-0000-000000000013';
