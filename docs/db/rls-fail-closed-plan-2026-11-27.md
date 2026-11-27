# RLS fail-closed 改造：前置阻塞点与实施方案（2026-11-27）

## 1. 结论先行

B 组（业务表 tenant_id 回填 + SET NOT NULL）已在 **dev 与生产双端落地**。
fail-closed（消除 `app.tenant_id` 空/空串/零 UUID/`tenant_id IS NULL` 全开方言）**不能只靠改策略文本**：
实测在应用角色 `topems_app`（无 BYPASSRLS）下，**不带任何 GUC** 直接查 `mes.production_orders` 返回 30 行——
说明策略放行完全依赖“未设 GUC 即全开”的空分支。若此时把 487 条策略的空分支删掉，
所有未在事务内 `set_config('app.tenant_id', ...)` 的查询都会**读到 0 行**，线上大面积失能。

## 2. 量化证据（dev）

| 指标 | 数值 |
|---|---|
| 含 `tenant_id IS NULL` 片段的策略 | 487 条（368 张表） |
| 已显式 `app.rls_system` 的策略 | 583 条 |
| `state.pool` 直接取连接查询点 | 414 处 / 79 个文件 |
| 调用 `set_config('app.tenant_id', ...)` 的文件 | 16 个 |
| 连接池创建点（`PgPoolOptions`） | 18 处（含测试） |
| 应用角色 `topems_app` 的 `rolbypassrls` | false（RLS 真实生效） |

414 个查询点里只有一小部分在事务内 `SET LOCAL` 租户上下文，其余全靠空分支放行。

## 3. 根因

`middleware/tenant_rls.rs` 的做法是：`pool.acquire()` 独占一条连接 → 在这条连接上 `set_config` →
`next.run(req)`。但 handler 里用的是 `state.pool`，**借到的是另一条连接**，GUC 不在其上。
所以“请求级租户上下文”其实从未贯通，RLS 目前只是“恰好没拦住”的纵深摆设。

## 4. 推荐方案（三步，按序不可颠倒）

### 第 1 步：请求级租户上下文贯通（代码改造，不加策略变更）
- 在 shared 层引入 `tokio::task_local! TenantCtx`（tenant_id + is_superuser）。
- 中间件：鉴权完成后 `TenantCtx::scope(ctx, next.run(req))`，不再手动 acquire 连接设 GUC。
- 连接池统一构造：`before_acquire` 里读 task-local，对每条被借出的连接执行
  `SELECT set_config('app.tenant_id', $1, false), set_config('app.rls_system', $2, false)`；
  `after_release` 里 `RESET` 两个 GUC（防串号）。
- 兼容期保留空分支放行（策略不动），先验证：健康检查、登录、各模块读写端点在“GUC 必然存在”下行为不变。
- 验收：把中间件临时改回不设 GUC，业务端点应能观察到差异（证明贯通生效）。

### 第 2 步：策略分批收口（迁移，prod 同步）
- 一批：NULL 行已清零的 18 张 B 组表之外的**业务表**（按 schema 分波：mes/erp/wms → crm/qms/finance → 其余）。
- 每波：快照原表达式 → 删空分支 → 统一加 `COALESCE(current_setting('app.rls_system', true), 'off') = 'on'` 超管分支 →
  后置断言（无 `tenant_id IS NULL` 片段且每表至少一条策略）。
- 豁免：`*_public_read`、`rls_platform_read`、`rls_global_read`、`*_platform_maintain`、
  平台目录表（core_permissions / core_role_permissions / core_roles / core_tenants / iam.permissions /
  core_menus / core_menu_groups / system_settings / monitor_settings 等 A 档，仍在表内保留 NULL 行）。

### 第 3 步：门禁
- CI 加检查：新增策略若含 `current_setting('app.tenant_id'...) IS NULL` 全开方言则失败。
- CI 加检查：业务模块新增 `state.pool` 查询的文件必须出现 `TenantCtx` 或事务内 `SET LOCAL` 标记。

## 5. 已完成的前置代码改动

`svc/unified-core/src/middleware/tenant_rls.rs`：
- 新增 `rls_system_value(is_superuser)`：超管 `on` / 普通用户 `off`。
- `set_rls_policy_conn` 增加 `app.rls_system` 注入；请求结束同时 `RESET app.rls_system`。
- 单测覆盖。此改动在当前策略下**不改变可见性**（空分支仍放行），仅为第 2 步收口做铺垫。

## 6. 风险与回滚

- 第 1 步失败面：连接池 hook 抛错会导致全站取连接失败 → 必须 `if let Err` 记日志而非中断，先灰度 dev 全端点冒烟。
- 第 2 步失败面：漏掉某些表的前端/任务读写 → 每波迁移配 rollback（按快照还原表达式），并跑 login + 各模块列表冒烟。
- 生产：策略收口与代码同批发布，先 dev 冒烟 24h，再 prod；prod 当前仅 15 条旁路策略（平台菜单 + 0 行表），改造风险远小于 dev。
