# 前端 schema 与 DataTable 职责收口（W3-D / W4-A 口径修正）

日期：2026-11-21

## W3-D：`schema` 与 `schemas` 不合并

实测两者不是同层概念：

- `apps/web/src/schemas/**`（258 文件）：按业务模块组织的**页面 schema / 表单与列表声明**，是页面数据源；
- `apps/web/src/schema/**`（7 文件）：通用 **schema DSL 适配层**（`adapterFactory` / `crudPageAdapter` / `listPageCrudAdapter` / `schemaExtensions` / `types` / `index`），被 414 处 import 引用；
- `apps/web/src/types.ts` 只有 `export {}`，全仓零引用，属自动生成空壳。

拍板：不把两目录合并。为避免长期歧义，DSL 目录改名为 `apps/web/src/schema-dsl`，页面 schema 目录继续叫 `schemas`；删除空壳 `types.ts`。

落地：

- `git mv apps/web/src/schema apps/web/src/schema-dsl`；
- 全量替换 `@/schema` / `@/schema/*` → `@/schema-dsl` / `@/schema-dsl/*`，共 414 处；
- 删除 `apps/web/src/types.ts`；
- `vitest.config.ts` 的 unit 项目 include 同步改为 `src/schema-dsl/__tests__/**`，避免测试被漏跑。

## W4-A：`DataTable` 不是 4 个重复实现

实测四种用途不同：

| 位置                                                                       | 性质                                                                | 处置                    |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------- |
| `packages/shared-components/src/components/DataTable.tsx`                  | MUI 高级表：筛选、导出、行内编辑、展开行等                          | 保留，跨应用主实现      |
| `apps/web/src/components/redesign/data/DataTable.tsx`                      | 轻量语义化 `<table>`，Tailwind/CSS Module 风格                      | 保留，redesign 页面专用 |
| `apps/web/src/pages/gis/components/DataTable.tsx`                          | GIS 按 Tab 选列的旧包装；页面已改为内联表格，组件除自身测试外零引用 | **删除**（含测试）      |
| `apps/web/src/components/templates/DashboardTemplate.tsx` 内部 `DataTable` | Dashboard 配置驱动渲染，非公开表格组件                              | 保留，不参与去重        |

拍板：不强行 4→1。删除死代码后，公开 `DataTable` 只保留两套按设计体系区分的实现；Dashboard 内部件不作为公共组件。

## 验证

- `pnpm --dir apps/web typecheck`：0 error（414 处改名全部解析成功）。
- `pnpm exec eslint apps/web/src --quiet`：0 error。
- `vitest`：`schema-dsl/toColumnDef` 13 用例、redesign/common `DataTable` 13 用例通过。
- 全仓 `@/schema` 旧引用：0。
- GIS `DataTable` 引用：0（组件与测试已删除）。
