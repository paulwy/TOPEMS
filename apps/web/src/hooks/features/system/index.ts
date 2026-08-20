/**
 * Features - System
 *
 * 系统级能力：服务状态、编码规则、UI 通用状态
 */

// ServiceStatus - 服务状态监控
export { useServiceStatus } from '../../useServiceStatus';
export type { ServiceInfo } from '../../useServiceStatus';

// Code - 编码规则与生成
export { useBatchNextCodes, useValidateCode, usePreviewCode, codeApi } from '../../useCode';
export type {
  ModuleType,
  EntityType,
  CodeRule,
  GenerateCodeResponse,
  BatchGenerateCodeResponse,
} from '../../useCode';

// UiState - 通用 UI 状态（Modal/Drawer/Tabs/Sort/Filter/Toast 等）
export { useToast } from '../../useUiState';
export type { ModalState, SortOrder, SortState, ToastMessage } from '../../useUiState';
