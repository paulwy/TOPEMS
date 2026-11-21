# W3-B `pages/` 残留清零（最终批）

日期：2026-11-21

## 结论

`apps/web/src/pages` 目录已整体移除，一级目录从 41 降到 **0**。页面实现、页面测试、演示页全部落到 `components/**`，路由与 `module-configs` 只做装配。

## 三批合并

| 批次   | 模块                                                                                                                                    | 方式                                               |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 第一批 | OA、ticket、performance、desktop、asset、help、IAM、SCM                                                                                 | 无同名 components，整目录迁移                      |
| 第二批 | admin、automation、crm、doc、erp、finance、master、rd、shared、srm、system                                                              | 无同名 components，整目录迁移                      |
| 第三批 | ai、aps、bi、ehs、gis、hrm、im、integration、lims、mes、mobile、monitor、notification、pdm、plugin、pm、qms、report、tms、wms、workflow | 已有 `components/<module>`，按文件合并，零同名冲突 |

另：`pages/RedesignDemo.tsx` + CSS 迁到 `components/redesign/`，`appRoutes` 导入同步。

## 测试迁移

- `apps/web/src/pages/__tests__` 的 **130 个页面测试**整体迁到 `components/__tests__`；测试内的 `../<module>/...` 相对引用在新位置仍指向 `components/<module>`，无需逐文件改写。
- `vitest.config.ts` 的 CRM 项目 include 从 `src/pages/__tests__/Crm*` / `Customer*` 改为 `src/components/__tests__/...`。
- `smoke-batch` 只保留 `components` 全量 glob，删除已无实际内容的 `pages` glob。

## 引用收口

- `@/pages/*`、`../pages/*`、`./pages/*` 本地引用：**0**。
- 唯一剩余 `./pages/` 是 `lib/plugin-loader/DynamicRouter.tsx` 的远程插件组件路径默认值，属于远程模块内部路径，不是本地 `src/pages`。
- `module-configs/registry/core-modules.ts` 的 `componentPath` 已同步到 `./components/...`。

## 验证

- `pnpm --dir apps/web typecheck`：0 error。
- `pnpm exec eslint apps/web/src --quiet`：0 error。
- `vitest src/components/__tests__`：139 文件 / 779 用例通过。
- 迁移模块测试：第一批 OA/IAM/SCM 26 文件 / 43 用例；第二批 78 文件 / 127 用例；第三批 70 文件 / 215 用例均通过。
- 未执行任何生产发布，仅前端目录与引用结构调整。
