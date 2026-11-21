# W4-B 表单字段共享实现收口

日期：2026-11-21

## 盘点结论

全仓没有第二套“字段组件”实现，真正重复的是两个表单引擎各自内联渲染 MUI `TextField`：

- `components/common/FormBuilder.tsx`：自持表单状态的高级表单引擎，用于 schema / wizard / 独立表单；
- `components/templates/list/CrudAutoForm.tsx`：ListPageTemplate 的外部受控表单引擎，状态由列表页统一管理；
- 两者状态模型不同，不能合并成一个组件；可共享的是**字段控件本身**。

## 落地

已存在的共享字段组件 `packages/shared-components/src/components/FormField.tsx`（经 `apps/web/src/components/common/FormField.tsx` 再导出）补齐移动端尺寸、标签与 helperText 样式，具备复用条件。

本批改动：

- `FormBuilder` 的 `text` / `email` / `password` / `number` / `textarea` 分支改用共享 `FormField`，删除三处内联 `TextField` 样式重复；
- `CrudAutoForm` 的 `text` / `email` / `password` / `number` / `textarea` 分支同样改用共享 `FormField`；
- `numberRange` 两个输入、`select`、`switch`、`checkbox`、`radio`、`date` 保留各自引擎实现：它们需要外部状态、区间值或组合控件，强行抽成单一字段会引入适配层；
- `Autocomplete` 仍用 `TextField` 作为 `renderInput`，由组件库参数结构决定，不套 `FormField`；
- `pages/admin/SystemSettingsPage.tsx` 内的局部 `FormField` 只是「label + children」页面样式壳，不渲染控件，不是重复字段实现，保留。

## 验证

- `pnpm --dir apps/web typecheck`：0 error。
- `pnpm exec eslint apps/web/src --quiet`：0 error。
- `vitest`：`ListPageTemplate` + `FormField` 2 文件 / 18 用例通过。

## 剩余

`FormBuilder` 与 `CrudAutoForm` 仍是两个引擎，各自承担不同状态模型；如后续要合一，需先把 ListPageTemplate 的受控状态迁进 FormBuilder 的 controlled 模式，属独立批次，不在本批强行合并。
