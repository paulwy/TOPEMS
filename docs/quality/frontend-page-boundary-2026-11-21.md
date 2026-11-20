# 前端跨层 import 边界（W4-D）与页面内共享模块外移

日期：2026-11-21

## 结论

- `@/pages/*` 正式定义为**路由层私有实现**。业务代码（`components/`、`lib/`、`api/`、`hooks/` 等）不得直接 import 页面文件。
- 共享实现一律落在 `apps/web/src/components/**`，由页面与业务组件共同引用；页面本身仍由 `module-configs/**` / `routes/**` / `components/DynamicRoutes.tsx` 装配。
- ESLint 已接线：`no-restricted-imports` 禁止 `@/pages/*`，仅对路由装配与测试豁免；违规即 error，不依赖人工巡检。

## 规则位置与豁免

`eslint.config.js`：

- 作用域：`apps/web/src/**/*.{ts,tsx}`。
- 禁止：`@/pages/*`，提示改为在 `components/` 或 `api/` 抽取共享实现。
- 豁免：`apps/web/src/module-configs/**`、`apps/web/src/routes/**`、`apps/web/src/components/DynamicRoutes.tsx`、`__tests__/**`、`*.test.*`、`*.spec.*`。
- 动态 `import()` 同样命中该规则，避免以懒加载绕过边界。

## 页面内共享模块外移清单

| 原路径                                         | 新路径                                              | 原因                                                        |
| ---------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| `pages/im/MailPage/utils.ts`                   | `components/im/mail/utils.ts`                       | 被 `components/im/MailPageHooks.tsx` 跨层引用               |
| `pages/im/MailPage/constants.ts`               | `components/im/mail/constants.ts`                   | 同上                                                        |
| `pages/im/MailPage/types.ts`                   | `components/im/mail/types.ts`                       | 同上，且页面子组件共用                                      |
| `pages/workflow/WorkflowSettingsPage/types.ts` | `components/workflow/types.ts`                      | 被 `components/workflow/WorkflowSettingGroups.tsx` 引用     |
| `pages/mes/ProductionDashboardPage/types.ts`   | `components/mes/types.ts`                           | 被 `components/mes/ProductionDashboardConstants.ts` 引用    |
| `pages/hrm/setup/InitChecklistPanel.tsx`       | `components/hrm/InitChecklistPanel.tsx`             | 被 `pages/shared/HybridHomePage.tsx` 引用（页面间横向依赖） |
| `pages/shared/NotFoundPage.tsx`                | `components/common/NotFoundPage.tsx`                | 被 `lib/moduleRedirect.tsx` 与 DynamicRoutes 引用           |
| `pages/shared/__tests__/NotFoundPage.test.tsx` | `components/common/__tests__/NotFoundPage.test.tsx` | 随实现迁移，测试相对引用保持 `../NotFoundPage`              |

同步更新了页面内部相对引用：`WorkflowSettingsPage/index.tsx`、其 `components/*` 的 `../types`；`ProductionDashboardPage/index.tsx`、`utils.ts`、其 `components/*` 的 `../types`；`MailPage/components/SendEmailDialog.tsx` 的 `../types`。

## 验证

- `pnpm --dir apps/web typecheck`：0 error。
- `pnpm exec eslint apps/web/src --quiet`：0 error（新规则生效）。
- `pnpm exec vitest run src/components/common/__tests__/NotFoundPage.test.tsx src/lib/__tests__/moduleRedirect.test.tsx`：2 文件 / 13 用例通过。
- 残余跨层引用扫描（排除 `module-configs/**`、`routes/**`、`DynamicRoutes.tsx` 与测试）：**0 处**。

## 剩余口径

- W3-C 的生产代码跨层引用已清零；`module-configs/**` 内约 539 处 `@/pages/*` 属路由装配，保留。
- W3-B 未完成：`apps/web/src/pages` 仍有 41 个一级目录，本次只外移共享模块与组件，页面本体未迁。
- W3-D（`schema` / `schemas` 语义不同）、W4-A（4 个 `DataTable` 语义不同）仍未动，需按用途分批，不能直接合并。
