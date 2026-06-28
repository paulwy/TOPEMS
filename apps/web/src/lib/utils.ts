/**
 * 通用 className 合并工具
 *
 * NOTE: 当前未被任何组件直接导入。保留作为基础设施工具，
 * 新组件可通过 `import { cn } from '@/lib/utils'` 使用。
 */
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
