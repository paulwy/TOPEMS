# #1 系统通道改造 + #4 迁移定稿（2026-11-18）

> 本轮范围：①#1 `core_tenants` handler 改显式系统通道并本地验证超管路径；②#4 迁移按 GUC 非空兜底口径定稿；③`20261118130000` 登记待上生产；④#2/#5 只补证据。
> 约束遵守：未 push、生产零写入、未改历史迁移、未改 `migration_manifest.yaml` / `checksums.txt`、未动工作树中他人改动。
> 前置：[五项方案](./rls-five-decision-options-2026-11-18.md)、[上轮证据与 #3/#4 演练](./rls-decision-execution-2026-11-18.md)。

---

## 0. 摘要

| 项 | 本轮结果 |
|---|---|
| #1 代码 | 新增 `Db::scope_with_system` / `Db::scope_savepoint_system`；`tenant/handlers.rs` **30 处**改为显式系统通道；另有 12 处租户业务表作用域未动（原因见 §1.3） |
| #1 验证 | 本地 scratch 模拟 D 策略：旧上下文全 0，新上下文列表/详情/by-code/my/analytics/写路径全部非空；`cargo check` 通过 |
| 注释 | `handlers.rs:263` 注释已改正，与中间件「超管 = nil + `system=off`」一致 |
| #4 | 迁移保持「GUC 非空兜底」，演练读数 0/0/1/2/1/2，回滚可用 |
| 待上生产 | `20261118130000` 登记为本窗口第 12 条；manifest 未改 |
| #2 / #5 | 各补 2 条新证据，未动手 |

---

## 1. #1 `public.core_tenants`：系统通道改造

### 1.1 新增 API

[scope.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/scope.rs#L311-L341) 新增两个方法：

| 方法 | 语义 | 用途 |
|---|---|---|
| `Db::scope_with_system(&mut txn)` | 复用请求事务，强制 `app.tenant_id=nil`、`app.rls_system='on'` | 平台目录读/写 |
| `Db::scope_savepoint_system(&mut txn)` | 同上，但开 SAVEPOINT，支持部分回滚 | 租户开通 |

与 `scope_with` 的关键差别：**不继承请求上下文**。超管 JWT 的请求上下文是 nil + `system=off`（[middleware/tenant.rs:56-71](file:///Users/xingzhai/TOPEMS/lib/shared-auth/src/middleware/tenant.rs#L56-L71)），继续用 `scope_with` 就会在 D 策略下读到 0 行。

### 1.2 改造清单（30 处）

原判断依据统一为：`core_tenants` 现在靠 `rls_global_read` 的 `tenant_id IS NULL` 分支可见，写靠 `rls_system_only`；D 之后前者失效、后者仍要求显式系统通道。

| # | Handler | 原判断依据（依赖） | 改成 | 读/写表 |
|---|---|---|---|---|
| 1 | `list_tenants` | `tenant_id IS NULL` fail-open | `scope_with_system` | core_tenants |
| 2 | `get_tenant` | 同上 | 同上 | core_tenants |
| 3 | `get_tenant_by_code` | 同上 | 同上 | core_tenants |
| 4 | `get_tenant_by_slug` | 同上 | 同上 | core_tenants |
| 5 | `get_my_tenants` | 超管 `$2=NULL` 全量（SQL 内仍按 user_id 过滤） | 同上 | core_tenants ⋈ core_tenant_users |
| 6 | `switch_tenant` | 先验成员关系，再读租户 | 同上 | core_tenant_users + core_tenants |
| 7 | `get_tenant_quota` | 同上 | 同上 | core_tenants |
| 8 | `get_tenant_stats` | 同上 | 同上 | core_tenants + core_tenant_users/usage |
| 9 | `get_usage_metrics` | 同上 | 同上 | 同上 |
| 10 | `get_billing_info` | 同上 | 同上 | core_tenants |
| 11 | `create_tenant` | `rls_system_only` 写 | 同上 | core_tenants（INSERT） |
| 12 | `update_tenant` | 同上 | 同上 | core_tenants（UPDATE） |
| 13 | `activate_tenant` | 同上 | 同上 | core_tenants（UPDATE） |
| 14 | `suspend_tenant` | 同上 | 同上 | core_tenants（UPDATE） |
| 15 | `delete_tenant` | 同上 | 同上 | core_tenants（软删） |
| 16 | `tenant_features_read`（helper） | 同上 | 同上 | core_tenants.features |
| 17 | `tenant_features_write`（helper） | 同上 | 同上 | core_tenants.features |
| 18 | `onboard_tenant` | 同上 | **`scope_savepoint_system`** | core_tenants + core_tenant_users/modules |
| 19 | `ensure_tenant_exists`（helper） | 同上 | `scope_with_system` | core_tenants |
| 20 | `tenant_billing_default`（helper） | 同上 | 同上 | core_tenants |
| 21 | `get_tenant_analytics_overview` | 跨租户聚合 | 同上 | core_tenant_usage/users/modules |
| 22 | `get_tenant_usage` | 同上 | 同上 | core_tenant_usage |
| 23 | `get_tenant_api_usage` | 同上 | 同上 | core_tenant_usage |
| 24 | `get_tenant_activity` | 同上 | 同上 | core_tenant_usage |
| 25 | `get_tenant_top_endpoints` | 同上 | 同上 | core_tenant_usage |
| 26 | `get_tenant_user_stats` | 同上 | 同上 | core_tenant_users |
| 27 | `get_tenant_real_time` | 同上 | 同上 | core_tenant_users |
| 28 | `get_governance_trends` | 同上 | 同上 | core_tenant_usage（全平台） |
| 29 | `refresh_governance` | 同上 | 同上 | core_tenants + usage |
| 30 | `collect_tenant_usage`（内层） | 同上 | 同上 | core_tenant_usage |

行号见 [handlers.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs) 对应函数；全部路由在 [master.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/routes/master.rs#L9-L168) 由 `iam:tenant:read` / `admin:iam:tenant:write` 保护，系统通道不放宽授权。

### 1.3 未改的 12 处（租户业务表，非 `core_tenants`）

`scope_with` 保留在：`list_tenant_modules`、`activate_module`、`deactivate_module`、`get_tenant_users`、`invite_member`、`remove_member`、`update_member_role`、`get_current_tenant_context`、`tenant_setting_get/put/array`、`tenant_coll_write`。

原因：这些只操作 `core_tenant_modules` / `core_tenant_users` / `core_tenant_settings`，三张表已是严格策略（系统通道 OR 本租户），不属于 #1 的 `core_tenants` 收口面。

**但需登记一个既有缺口**：其中 `/tenant/{id}/users`、`/tenant/tenants/{id}/modules/*`、成员邀请/移除/改角色都是平台路由，超管 JWT 下 `scope_with` 仍是 nil+off，今天就读 0 行 / 写 0 行。这与 D 无关，是现网既有行为；本轮按「只做 #1」未扩大改动，建议下一轮按同样方式改系统通道（路径里的 `tenant_id` 已在 SQL 显式绑定，改后不放松隔离）。

`get_current_tenant_context` 必须保持 `scope_with`：它是租户用户读自己成员关系的路径。

### 1.4 注释修正

[handlers.rs:263-266](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L263-L266) 原文称「仅超管请求上下文会打开 `app.rls_system='on'`」，与中间件行为相反。已改为：

```rust
// tenant-system: core_tenants 的全局行 tenant_id 为 NULL，只允许系统通道写入。
// 注意：认证中间件对超管 JWT 给的是 nil 租户 + `system=off`（只有 service token
// 才 `system=on`），因此这里必须显式使用 `scope_with_system()`，不能依赖请求上下文；
// 该路由本身由 iam:tenant:write 平台权限保护，系统通道不放宽授权。
```

---

## 2. 本地验证

### 2.1 环境与方法

- 库：`topems_rls_scratch_20261118_r5`（克隆自 `topems_snap_20261118`，1 个租户、与生产快照同基线）。
- 模拟 D 落地：`UPDATE core_tenants SET tenant_id = id`；删除 `rls_global_read` / `rls_system_only`，建 `rls_tenant_isolation(ALL) = system OR tenant_id = GUC`。
- 身份：`SET ROLE topems_prod`（表属主 + FORCE RLS），避免超级用户绕过。
- 旧上下文 = `tenant_id=nil, rls_system=off`（超管现状）；新上下文 = `tenant_id=nil, rls_system=on`（`scope_with_system`）。

### 2.2 读数

| 路径（按 handler SQL 同构） | 旧上下文 | 新上下文 |
|---|---|---|
| 租户列表 `list_tenants` | 0 | 1 |
| 详情 `get_tenant` | 0 | 1 |
| by-code `get_tenant_by_code` | 0 | 1 |
| by-slug `get_tenant_by_slug`（同 `code` 谓词） | 0 | 1 |
| my `get_my_tenants`（按 user_id） | 0 | 1 |
| analytics `get_tenant_user_stats`（读 core_tenant_users） | 0 | 3 |
| 写：`UPDATE core_tenants` | 0 行 | 1 行 |
| 写：`INSERT core_tenants`（事务内回滚） | — | 1 行 |

验证后已还原 scratch 基线：`core_tenants` 1 行、`tenant_id` 全部 NULL、策略恢复 `rls_global_read` + `rls_system_only`。

### 2.3 编译

`cargo check -p topems-shared-db -p topems-unified-core` → **Finished**。

---

## 3. #4 `erp.holidays` 迁移定稿（GUC 非空兜底）

文件：

- 迁移：[20261118130000_erp_holidays_platform_corpus.sql](file:///Users/xingzhai/TOPEMS/database/migrations/20261118130000_erp_holidays_platform_corpus.sql)
- 回滚：[20261118130000_erp_holidays_platform_corpus.rollback.sql](file:///Users/xingzhai/TOPEMS/database/rollback/20261118130000_erp_holidays_platform_corpus.rollback.sql)

定稿谓词（与 `20261118110000` 同口径，未设租户读 0 行）：

```sql
-- ALL（写只允许本租户；平台行写入走系统通道）
COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid

-- SELECT（平台行额外要求 GUC 非空）
COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
OR (tenant_id IS NULL
    AND NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL)
OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
```

本轮仅补可空 `tenant_id`；`year/kind/name` 仍留 B 类，代码继续 L2 静态兜底，不动。

### 3.1 演练读数（保留）

| 档位 | T0 | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|---|
| holidays 可见行数（1 平台行 + 1 租户A行） | 0 | 0 | 1 | 2 | 1 | 2 |

写断言：T3 插平台行被拒、改平台行 0 行、插本租户行成功；T5 可清理。回滚后恢复 `erp_allow_all_holidays`，0 行且列全 NULL 时删列；迁移可重复执行。

---

## 4. 待上生产清单

本窗口（截至本轮）应为 **12 条**：

| # | 版本 | 文件 | 状态 |
|---|---|---|---|
| 1–11 | `20261118090000` … `20261118124000` | 见 [repo-wide-rls-pool-closure-2026-11-18.md](file:///Users/xingzhai/TOPEMS/docs/database/repo-wide-rls-pool-closure-2026-11-18.md) 「同窗口清单」 | 他人维护，本文不改 |
| 12 | `20261118130000` | [20261118130000_erp_holidays_platform_corpus.sql](file:///Users/xingzhai/TOPEMS/database/migrations/20261118130000_erp_holidays_platform_corpus.sql) + 同名 rollback | **to_apply（本轮登记）** |

说明：

- **未改** `database/migration_manifest.yaml`，`20261118130000` 未写入 manifest。
- manifest 目前已有 `20261118110000` / `20261118124000` 条目（他人改动），未动。
- 该文件清单在收口文档里因其工作树已有他人未提交修改，本文不追加进去，避免混写；以上表为最终登记口径。

---

## 5. #2 / #5 只补证据（未动手）

### 5.1 #2 `core_menus` / `core_menu_groups` 新增证据

| # | 证据 | 结果 |
|---|---|---|
| 9 | 超级管理员分支的菜单查询谓词 | [handlers.rs:46-50](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/menu/handlers.rs#L46-L50) 超管 `tenant_opt=None`，SQL 为 `($3::uuid IS NULL OR tenant_id = $3)`，即**超管依赖 RLS 放行全量**；A 方案落地后必须走系统通道，否则平台菜单页为空 |
| 10 | `flow.core_menu*` 引用面 | 运行时源码 0 引用；仅 [menu_e2e.rs:311-326](file:///Users/xingzhai/TOPEMS/svc/unified-core/tests/menu_e2e.rs#L311-L326) 测试会临时建 `flow.core_menu_groups` / `flow.core_menus` 并计数——#5 RENAME 时该测试需同步改，否则测试失败 |

### 5.2 #5 `flow` 影子表新增证据

| # | 证据 | 结果 |
|---|---|---|
| 9 | schema 实测 | 生产只读：`flow` schema 共 **37 张表，全部 0 行**；§5.5 的 18 张属于其中「菜单/流程/租户/文档」影子族，其余为 approvals/audit/files/master_data 等同性质影子 |
| 10 | `schema_boundary.json` | `flow` 出现次数 **0**；运行时仅 [menu/handlers.rs:26-27](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/menu/handlers.rs#L26-L27) 有历史注释提到嵌入式 `search_path=flow,public`，无表级引用 |

其余清单沿用[上轮 §5/§6](./rls-decision-execution-2026-11-18.md#5-core_menus--core_menu_groups-证据清单未动手)。

---

## 6. 下一轮顺序（已定，不在本轮）

1. **#1 收紧**：`UPDATE core_tenants SET tenant_id = id WHERE tenant_id IS NULL`；策略改为 `rls_system='on' OR tenant_id = GUC`，删除 `rls_global_read`；六档断言 T0/T1=0、T2/T3=1、T4=0、T5=1。
2. 同步 `global_row_metrics` 的 `tenant_id IS NULL` 口径（D 后恒为 0）。
3. 决定 §1.3 的 12 处平台路由是否一并改系统通道（成员/模块/设置）。
4. #4 待生产执行；#2/#5 等证据齐后再排。
