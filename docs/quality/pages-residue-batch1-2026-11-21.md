# W3-B 页面残留清理（第一批）

日期：2026-11-21

## 结论

`apps/web/src/pages` 一级目录由 41 个降到 **33 个**。本批把 8 个无 `components/<module>` 冲突的小/中模块实现整体迁到 `components/<module>`，路由装配改为引用组件层，符合 W3-A 后“页面实现与路由装配分离”的口径。

## 迁移清单

| 模块     | 原路径              | 新路径                   | 代码文件 |
| -------- | ------------------- | ------------------------ | -------- |
| OA       | `pages/oa`          | `components/oa`          | 5        |
| 工单     | `pages/ticket`      | `components/ticket`      | 2        |
| 性能测试 | `pages/performance` | `components/performance` | 1        |
| 桌面监控 | `pages/desktop`     | `components/desktop`     | 2        |
| 资产     | `pages/asset`       | `components/asset`       | 5        |
| 帮助     | `pages/help`        | `components/help`        | 3        |
| IAM      | `pages/iam`         | `components/iam`         | 5        |
| SCM      | `pages/scm`         | `components/scm`         | 20       |

同步规则：

- `@/pages/<module>/...` → `@/components/<module>/...`；
- 相对引用 `../pages/<module>/...` / `./pages/<module>/...` → `../components/...` / `./components/...`；
- CSS Module、目录内 `__tests__` 随目录整体迁移，相对路径不变；
- 路由入口仍只出现在 `module-configs` / `routes` / `main.tsx`，页面实现不再被业务代码以 `@/pages` 跨层引用。

## 验证

- `pnpm --dir apps/web typecheck`：0 error。
- `pnpm exec eslint apps/web/src --quiet`：0 error。
- `vitest`：OA / IAM / SCM 26 文件 / 43 用例通过。
- 上述 8 个模块的旧 `@/pages` 与 `pages/<module>/` 引用：0。

## 剩余

33 个一级目录中，18 个已存在 `components/<same-module>`（`ai/aps/bi/ehs/gis/hrm/im/mes/mobile/notification/plugin/pm/qms/report/tms/wms/workflow` 等），需要按文件合并而不是整目录 `git mv`；其余 `admin/automation/crm/doc/erp/finance/master/rd/shared/srm/system` 可继续按批迁移。

下一批优先处理“目录存在但实现已部分迁移”的模块，先解冲突再迁；不再做一次性全量搬迁。
