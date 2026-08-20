import { MODULES, ACTIONS, type ModuleCode, type PermissionAction } from './permissions';

interface PermissionMapping {
  id: string;
  name: string;
  resource: string;
  action: PermissionAction;
  module: ModuleCode;
}

const generatePermissionId = (module: ModuleCode, action: PermissionAction): string => {
  const moduleIndex = Object.values(MODULES).indexOf(module);
  const actionIndex = ACTIONS.findIndex((a) => a.action === action);

  const modulePart = String(moduleIndex + 1).padStart(8, '0');
  const actionPart = String(actionIndex + 1).padStart(12, '0');

  return `${modulePart}-0000-0000-0000-${actionPart}`;
};

const PERMISSION_MAPPING: Record<string, PermissionMapping> = (() => {
  const mapping: Record<string, PermissionMapping> = {};

  Object.values(MODULES).forEach((module) => {
    ACTIONS.forEach((actionItem) => {
      const action = actionItem.action;
      const id = generatePermissionId(module, action);
      const name = `${module}:${action}`;

      mapping[id] = {
        id,
        name,
        resource: module,
        action,
        module,
      };
    });
  });

  return mapping;
})();

const mapPermissionIdToName = (permissionId: string): string | null => {
  const mapping = PERMISSION_MAPPING[permissionId];
  return mapping ? mapping.name : null;
};

const mapPermissionIdsToNames = (permissionIds: string[]): string[] => {
  return permissionIds
    .map((id) => mapPermissionIdToName(id))
    .filter((name): name is string => name !== null);
};

const mapPermissionNameToId = (permissionName: string): string | null => {
  for (const [id, mapping] of Object.entries(PERMISSION_MAPPING)) {
    if (mapping.name === permissionName) {
      return id;
    }
  }
  return null;
};

const getPermissionByModule = (module: ModuleCode): PermissionMapping[] => {
  return Object.values(PERMISSION_MAPPING).filter((p) => p.module === module);
};

const getPermissionByAction = (action: PermissionAction): PermissionMapping[] => {
  return Object.values(PERMISSION_MAPPING).filter((p) => p.action === action);
};

const ALL_ADMIN_PERMISSIONS = Object.values(MODULES).map((module) => {
  return generatePermissionId(module, 'admin');
});

const IAM_ADMIN_PERMISSION_ID = generatePermissionId(MODULES.IAM, 'admin');

const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: Object.values(PERMISSION_MAPPING).map((p) => p.id),
  MANAGER: [
    ...getPermissionByModule(MODULES.HRM).map((p) => p.id),
    ...getPermissionByModule(MODULES.PM).map((p) => p.id),
    ...getPermissionByModule(MODULES.RS).map((p) => p.id),
  ],
  USER: [
    ...getPermissionByModule(MODULES.HRM)
      .filter((p) => p.action === 'read')
      .map((p) => p.id),
    ...getPermissionByModule(MODULES.PM)
      .filter((p) => p.action === 'read')
      .map((p) => p.id),
    ...getPermissionByModule(MODULES.DOC).map((p) => p.id),
    ...getPermissionByModule(MODULES.FILE).map((p) => p.id),
    ...getPermissionByModule(MODULES.WORKFLOW)
      .filter((p) => p.action === 'read' || p.action === 'approve')
      .map((p) => p.id),
  ],
  GUEST: [
    ...getPermissionByModule(MODULES.DOC)
      .filter((p) => p.action === 'read')
      .map((p) => p.id),
  ],
};
