# W4-C StatusBadge 收口

日期：2026-11-21

## 结论

“11 个 StatusBadge 定义”不是 11 份重复渲染实现，而是两套设计体系加业务数据映射：

- MUI 体系：`packages/shared-components/src/components/StatusBadge.tsx` 单一实现 + 11 个 typed 包装（Employee/Leave/Payroll 等），包装只注入状态映射，不重复渲染；
- Tailwind 体系：`apps/web/src/components/common/StatusBadge.tsx` 单一渲染；
- `aps/qms/tms/wms` 的 `StatusBadge` 是薄包装，只提供 FSM 颜色与文案；
- `mes/StatusBadge.tsx` 是纯数据映射（扁平状态色板），复用 common；
- `ehs/EHSStatusBadge` 是 EHS 事件类型专用（hazard/incident 等），语义不同。

## 本批去重

1. **FSM 工厂**：common 新增 `createFsmStatusBadge<F>(fsmColors, labelMap, options?)`，统一渲染、大小写归一、未知状态回退；支持 `fallbackColor` / `className`。
2. `aps/qms/tms/wms` 删除各自重复的 8 行 wrapper 函数与局部 `StatusBadgeProps`，改为：
   ```ts
   export const StatusBadge = createFsmStatusBadge<ApsFsmType>(FSM_STATUS_COLORS, STATUS_LABELS);
   ```
   WMS 保留 `bg-yellow-50 text-yellow-700` 的未知态回退，通过 options 注入。
3. **统一色板**：common 导出 `STATUS_PALETTE`（gray/blue/orange/green/red/purple/indigo/cyan/yellow/amber）；四个 FSM 模块删除重复的 `const GRAY/BLUE/...` 字面量，统一引用 `STATUS_PALETTE.*`。

## 保留

- 两套设计体系（MUI / Tailwind）不合并：视觉语言与宿主组件不同。
- typed 包装与 MES/EHS 数据映射保留，它们不是渲染实现。
- `common/index.ts` 继续导出 shared-components 的 MUI `StatusBadge`；Tailwind 模块直接引用 `@/components/common/StatusBadge`，不混用入口。

## 验证

- web typecheck：0 error。
- ESLint：0 error。
- aps/qms/tms/wms/mes `StatusBadge` 测试：5 文件 / 94 用例通过。
- 渲染行为不变：颜色、文案、大小写归一、未知状态回退、WMS 黄色回退均由测试覆盖。
