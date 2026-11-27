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

### 5.1 中间件显式系统标记
`svc/unified-core/src/middleware/tenant_rls.rs`：新增 `rls_system_value(is_superuser)`（超管 `on` / 普通 `off`），
请求结束一并 `RESET`。在当前策略下不改变可见性。

### 5.2 请求级租户上下文贯通（灰度）
- 新增 `lib/shared-db/src/tenant_ctx.rs`：`TenantScopeCtx`（tenant / system）、`scope()`、`current()`、
  `apply_pool_hooks(options, default_tenant)`。
  - `before_acquire`：有上下文则单条查询写入 `app.tenant_id` + `app.rls_system`（一次往返）；
    无上下文回落 `DEFAULT_TENANT_ID`（多租户部署为空）；
  - `after_release`：归还前把两个 GUC 置空/`off`，防池化串号；
  - 钩子内错误只记日志不阻断取连接（否则等于全站断连）。
- 挂载点：`lib/shared-db/src/database/mod.rs`（主业务池）与 `lib/shared-bootstrap/src/lib.rs`（quick bootstrap 池）。
- 中间件改为 `tenant_ctx::scope(ctx, next.run(req))`，不再自行 acquire 连接设 GUC（旧实现设在无人使用的连接上）。
- 灰度开关 `TOPEMS_RLS_CTX`（1/true 开启）：未开启时 `current()` 恒返回 `None`，行为与改造前完全一致。
  dev `.env` 已置 `TOPEMS_RLS_CTX=1`；prod 待发版后单独打开。

### 5.3 实测证据（`lib/shared-db/examples/tenant_ctx_probe.rs`）

以应用角色 `topems_app` 连 dev 库、`TOPEMS_RLS_CTX=1`：

```
outside scope      : ("<null>", "<null>")
inside tenant scope: ("00000000-0000-0000-0000-000000000001", "off")
inside system scope: ("<null>", "on")
after scopes       : ("<null>", "off")
```

说明 task-local 确实在 `before_acquire` 可见（sqlx 在调用方任务内 await hook），
且作用域外/归还后不留任何租户状态。

### 5.4 尚未覆盖的池
以下自建池未挂 hook（多为模块内独立连接或测试）：`ehs/event_handlers`、`ehs/integration`、
`communication/{notification,mail,im}`、`rd/project_repository`、`analytics/bi/datasource`、
`unified-core/routes/business_tools/database_permission_store`（后者是用户库目标，不应受本库租户上下文影响）。
收口这些模块的策略前，需要把它们并入共享池或同样挂 hook。

## 7. 第一波（mes/erp）演练结果（2026-11-27/28）

迁移 `20261127260000_rls_failclose_wave1_mes_erp.sql`（已推送 `99fe5bea0`，尚未投 dev/prod）。

- 演练环境：`topems_fc`（从 dev 全量 pg_dump 还原的克隆库，564MB），不触碰 dev 在用库。
- 投放：收紧 **39 条**、跳过 5 条（平台共享策略）、失败 0 条；两条后置断言通过。
- 回滚：`DROP + CREATE` 按快照还原 39 条，表达式回到带 `tenant_id IS NULL` 原样；再投放复验通过，
  说明 snapshot 结构（polcmd/permissive/roles/qual/with_check）足以精确重建。
- 语义实测（角色 `topems_app`，`erp.materials` 等收紧表）：
  无 GUC → **0 行**；本租户 GUC → 自有行；`app.rls_system='on'` → 全量。
- 端到端（新二进制 `topems-server`，`TOPEMS_RLS_CTX=1`，连克隆库，端口 8123）：
  `health 200`、`login 200`、`/api/core/iam/users`、`/api/core/menus`、`/api/crm/customers`、
  `/api/mes/{teams,production-plans,audit-logs}`、`/api/erp/materials` 全部 200 且有数据，
  与 `TOPEMS_RLS_CTX=0` 的对照实例（8124）在本次抽样的接口上无差异。
- 局限（下一波要补的验证）：本轮 HTTP 抽样命中的读路径多为平台/未收紧表，尚未对「收紧表 + 普通租户用户」
  组合做端点级差分；第二波起按「先挑收紧表对应的真实路由 → 造普通租户 token → 对比 0 行/自有行」做验证。

## 8. 第二波（crm/qms/finance/hrm）与数据侧新发现

- `20261127270000`（已推送 `84f8813267`，未投 dev/prod）：克隆库收紧 **140 条**、跳过 2 条（finance 两张表 56 行 NULL）、0 失败。
- 端点差分（8123，克隆库，超管 vs 铸造的普通租户 token）：
  `/api/crm/customers` 超管 **275** 行、普通租户 **0** 行。
- 根因不是策略写错，而是**数据归属**：业务行大量挂在零 UUID 租户下。全库零租户行（表有 tenant_id 列）：
  `mes` 20128 行、`wms` 12844、`public` 9926、`scm` 4895、`crm` 3871、`ehs` 3185、`hrm` 2312、`master_data` 2311、`erp` 1630 …
- 已收紧表里零租户行只有 7 张 / 1042 行：`mes.core_menus` 902（历史菜单副本）、`mes.core_menu_groups` 130、
  `hrm.attendance_records` 5、`erp.materials` 2、`crm.customer_finance` 1、`hrm.initialization_logs` 1、`erp.assets` 1。
- 含义：**fail-closed 必须配一轮 B2 数据归一化**（零 UUID 业务行 → 真实租户），否则收口后普通租户看到的业务数据会「凭空消失」。
  平台共享主数据（master_data.*、菜单/权限目录等）仍应留零 UUID，靠 `*_platform_read` 策略或 `rls_system` 通道读。
- 第三波（public 83 张 / 100 条）**必须排在 B2 之后**：public 是业务主战场，9926 行零租户数据如果先收口会直接清空业务视角。

## 6. 风险与回滚

- 第 1 步失败面：连接池 hook 抛错会导致全站取连接失败 → 必须 `if let Err` 记日志而非中断，先灰度 dev 全端点冒烟。
- 第 2 步失败面：漏掉某些表的前端/任务读写 → 每波迁移配 rollback（按快照还原表达式），并跑 login + 各模块列表冒烟。
- 生产：策略收口与代码同批发布，先 dev 冒烟 24h，再 prod；prod 当前仅 15 条旁路策略（平台菜单 + 0 行表），改造风险远小于 dev。
