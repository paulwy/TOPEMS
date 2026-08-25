// V247: 统一从 @topems/shared-utils 导入，本文件仅做 re-export 兼容
// shared-utils 为跨端工具包；web 专属（非跨端）util 保留在本文件
import { clsx, type ClassValue } from 'clsx';

export * from '@topems/shared-utils';

/**
 * 通用 className 合并工具（web 专属，依赖 clsx）
 *
 * NOTE: 当前未被任何组件直接导入。保留作为基础设施工具，
 * 新组件可通过 `import { cn } from '@/lib/utils'` 使用。
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
