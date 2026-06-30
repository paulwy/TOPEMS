import { iamNavConfig } from './iam.nav';
import { workflowNavConfig } from './workflow.nav';
import type { ModuleNavConfig } from '../types';

export const coreModuleNavConfigs: ModuleNavConfig[] = [
  iamNavConfig,
  workflowNavConfig,
];

export { iamNavConfig, workflowNavConfig };
