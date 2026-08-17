// C3 §5 P1: 自定义 LazyIcon 组件，替代 lucide-react/dynamic 的 DynamicIcon
// DynamicIcon 使用 glob import 导致 lucide 整库 1564 个图标全量拆分为独立 chunk（1828 个小文件）
// LazyIcon 从 barrel 导入仅 350 个实际使用的图标，消除全量 chunk 膨胀
import React from 'react';
import * as IconExports from '@/components/icons';
import type { LucideProps } from '@/components/icons';
import i18n from '@/i18n';

// 构建 PascalCase → Component 映射
const iconMap: Record<string, React.ComponentType<LucideProps>> = {};
for (const [name, Comp] of Object.entries(IconExports)) {
  // 跳过 type 导出（LucideIcon/LucideProps/IconNode 是 type-only，编译后不存在）
  if (typeof Comp === 'function' || typeof Comp === 'object') {
    iconMap[name] = Comp as React.ComponentType<LucideProps>;
  }
}

// kebab-case → PascalCase 转换（DynamicIcon 接收 kebab-case，我们的 iconMap 用 PascalCase）
function toPascal(kebab: string): string {
  return kebab
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

export interface LazyIconProps extends LucideProps {
  /** 图标名称，支持 kebab-case 或 PascalCase */
  name: string;
}

/**
 * 根据图标名称动态渲染图标组件。
 *
 * 替代 lucide-react/dynamic 的 DynamicIcon：
 * - DynamicIcon 通过 glob import 为 lucide 整库 1564 个图标生成独立 chunk
 * - LazyIcon 仅从 barrel 导入项目实际使用的 350 个图标，无多余 chunk
 *
 * @param name - 图标名称（kebab-case 或 PascalCase 均可）
 * @param props - 透传给 Lucide 图标组件的属性（size, color, className 等）
 */
export const LazyIcon: React.FC<LazyIconProps> = ({ name, ...props }) => {
  const pascalName = name.includes('-') ? toPascal(name) : name;
  const IconComp = iconMap[pascalName];
  if (!IconComp) {
    if (import.meta.env.DEV) {
      console.warn(
        `${i18n.t('components.lazy_icon.lazyicon_0')}${name}" (PascalCase: "${pascalName}${i18n.t('components.lazy_icon.barrel_1')}`
      );
    }
    return null;
  }
  return React.createElement(IconComp, props);
};

export default LazyIcon;
