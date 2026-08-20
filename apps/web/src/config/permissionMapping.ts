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
