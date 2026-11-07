# RLS 租户隔离改造：变基后重做定性与批次建议（2026-11-08）

> 背景：批 43 的 `begin_tenant_txn` 方案在推送到远端前发现 `stale-base`，已整体撤销（提交 `0933d0be1`，
> 归档见 `artifacts/wip-archive-20261108/`）。本文在**本地已 rebase 到 `origin/main@926fe1af2`** 的代码上，
> 重新确认租户事务接口现状，给出可复用度与重做批次。相关原始记录见 `TODO.md §11`。

## 1. 结论

**旧改动不可直接拣回（cherry-pick），但 80% 以上是机械映射，重做成本以「改签名」为主、不含重新设计。**

原因：远端 `origin/main` 已落地一套更完整的租户上下文方案，接口形状与批 43 不同——
不是「同名函数换了实现」，而是**租户来源从「调用方传参」变成「请求上下文隐式读取」**。
强行拣回会同时存在两套事务工厂，属于重复造轮子。

## 2. 当前接口形态（已核实存在于 rebase 后代码）

`lib/shared-db/src/scope.rs` 的 `Db`：

| 接口 | 语义 | 事务类型 |
|---|---|---|
| `db.scope()` | 读写 + `search_path` + 请求租户 GUC | 读写事务，需 `commit()` |
| `db.scope_read()` | 只读 + `search_path` + 请求租户 GUC | 只读事务 |
| `db.scope_system()` | 读写 + 显式 nil 租户 + `app.rls_system='on'` | 读写事务 |
| `db.scope_read_system()` | 只读 + 显式 nil 租户 + `app.rls_system='on'` | 只读事务 |
| `db.scope_with(&mut txn)` | 复用请求级 RLS 事务，只叠加 search_path | 借用，不接管提交 |

关键差异（决定重做方式）：

1. `scope()` 的租户**不来自参数**，而是 `apply_request_tenant()` 读取
   `topems_shared_auth::middleware::tenant::current_request_tenant()`（由 `tenant_middleware` 写入的 task-local）。
   批 43 在 handler 里 `opt_tenant(&claims)` 显式传参的写法，**必须改为确认该端点确实经过 `tenant_middleware`**，
   否则租户上下文为空 → `scope()` 不落 GUC → 行为与 fail-closed 预期相反。
2. `ScopedTxn` **不暴露 `PgConnection`**（只实现 `Executor`）。批 43 里所有
   `async fn xxx(tx: &mut Transaction<'_, Postgres>)` 的辅助函数签名，需改成
   `&mut ScopedTxn<'_>` 或在调用前解构，这是最耗工的部分。
3. `lib/shared-db/src/rls.rs` 现在只有 `RlsConfig` / `RlsMiddleware` / `TenantContext` /
   `rls_middleware`，**没有** `begin_tenant_txn`，也没有 `ScopedPool`（已于 `859cb9e56` 退役）。

## 3. 旧改动可复用度

| 旧写法（批 43 归档补丁） | 可复用度 | 重做方式 |
|---|---|---|
| `begin_tenant_txn(&state.pool, opt_tenant(&claims))` | 机械可映射 | `state.db.scope()`；先确认 `AppState` 已持有 `Db` |
| `let mut tx = ...; ... ; tx.commit().await` | 机械可映射 | `let mut scope = ...; ...; scope.commit().await` |
| `sqlx::query(..).fetch_all(&mut *tx)` | **直接可复用** | 一字不改（`ScopedTxn` 实现 `Executor`），把 `tx` 换成 `scope` 即可 |
| `async fn helper(tx: &mut Transaction<'_, Postgres>)` | 需改签名 | 改 `&mut ScopedTxn<'_>`；若 helper 内要拿连接则必须重构 |
| 只读列表查询改 `begin_tenant_txn` | 用 `scope_read()` | 语义更精确（`SET TRANSACTION READ ONLY`） |
| 系统/超管旁路（`opt_tenant` 为 `None`） | 用 `scope_read_system()` | 不再手写 nil UUID；但注意 `None` 与「系统态」不等价，需逐个判断是「跨租户只读」还是「后台任务」 |
| 各域自造 `open_admin_txn` / `rls_tenant()` 薄封装 | 作废 | 统一用 `Db::scope*`，不保留域内私有封装 |
| `rls_err!(..)` 宏 | 可复用 | 与事务工厂无关，纯错误处理 |

## 4. 各域前置条件（rebase 后实测）

| 域 | `AppState` 是否已注入 `Db` | 裸池引用（`&state.pool`/`&self.pool`，粗口径） | 备注 |
|---|---|---|---|
| mes | ✅ 已注入（`main.rs` `Db::new(..., "mes, public, shared")`） | 553 | 已有 3 个文件用 `scope*`，可作打样样板 |
| integration | ✅ 已注入（2 处 `db: Db`） | 14 | 规模小，适合首个整域清零 |
| analytics | ❌ 仅 `pool: PgPool` | 169 | 需先改 `AppState` 与 `main.rs` |
| finance | ❌ 仅 `pool: PgPool` | 278 | 同上 |
| lims | ❌ 仅 `pool: PgPool` | 202 | 同上；批 43 曾补 `topems-shared-db` 依赖，需重做 |
| unified-core | ❌ 仅 `pool: PgPool` | 566 | 批 43 整体回滚，本轮仍未改（407 处缺陷原样） |
| qms | ❌ 仅 `pool: PgPool` | 297 | 未开工 |
| ehs | ❌ 仅 `pool: PgPool` | 208 | 未开工 |
| erp | ❌ 仅 `pool: PgPool` | 2 | 规模最小，可与 integration 合并 |

> 「裸池引用」是 grep 粗口径，含本来就该走系统作用域或已带内联租户谓词的合法用法，
> 不能直接当缺陷数；权威基线仍为批 43 的 1620 处（`artifacts/batch43/b43_nosql_recheck.csv`）。

## 5. 建议批次（W7）

| 批次 | 范围 | 前置动作 | 验收 |
|---|---|---|---|
| W7-0 | 打样 | 取 `settings/smtp.rs` 或 `erp`（2 处）做单文件范式，确认 `Db::scope*` + `ScopedTxn` 在真实 handler 中可用 | `cargo check` + 该端点 smoke 通过 |
| W7-1 | integration + erp（16 处） | 二者已/易注入 `Db` | 整域裸池清零，`cargo check`/`clippy` 干净 |
| W7-2 | mes 剩余（553 粗口径） | 复用已有 3 个 `scope*` 文件的写法 | 每 3–5 文件滚动 `cargo check` |
| W7-3 | analytics + finance | 先改 `AppState`/`main.rs` 注入 `Db` | 同上 |
| W7-4 | lims + qms + ehs | 先改 `AppState` | 同上 |
| W7-5 | unified-core（407 处，最大块） | 先改 `AppState`；按 `artifacts/batch43/FIX_SPEC.md` 的文件序 | 禁止一次性铺 22 文件（批 43 教训） |

## 6. 重做时必须守住的验证

1. 每个批次结束跑 `cargo check` / `clippy -D warnings` / `fmt`；
2. 至少对一个端点做**双租户实测**（租户 A 可见、租户 B 不可见、超管可见），不能只靠编译通过；
3. 每次改动后跑 `web-contract-smoke`（4501 项，基线已在本机 BFF 打通）；
4. 不得再引入 `begin_tenant_txn` 一类并行事务工厂。

## 7. 与本次收口的关系

本次收口（W2-A search_path）**没有实施任何 RLS 改造**，只是把批 43 的残留归档并撤销。
`origin/main` 的 RLS 机制与 `search_path` 治理正交：前者管租户可见性（事务级 `app.tenant_id`），
后者管表解析（会话级 `search_path`），二者可共存且本次已验证共存无编译问题。
