// C3 §5 P1: 为 lucide-react 子路径 .mjs 图标文件提供通配类型声明
// 因为 lucide-react 只为 dist/lucide-react.d.ts 发布整库声明，
// 而我们的 barrel 直接 import 子路径 .mjs，TS 无法找到对应 .d.ts，
// 所以需要在此 shim：每个子路径模块导出一个 LucideIcon 类型的默认组件。
declare module 'lucide-react/dist/esm/icons/*.mjs' {
  import type { LucideIcon } from 'lucide-react/dist/lucide-react';
  const component: LucideIcon;
  export default component;
}
