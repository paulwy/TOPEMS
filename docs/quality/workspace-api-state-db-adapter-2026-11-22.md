# 统一入口 ApiState 数据库适配修复（B104）

日期：2026-11-22
范围：`svc/server/src/modules/{crm,erp,hrm,rd,scm,srm}_real_module.rs`
基线：B103 `4480f69a2`

## 命中问题

`cargo check --workspace` 在 `main` 上失败（39 个错误），与 B101～B103 无关，属仓库级既有回归。根因是 `svc/server` 的统一入口 real module 没有跟上服务侧 `ApiState` 改造：

- `ApiState.db` 已由 `sqlx::PgPool` 改为 `topems_shared_db::scope::Db`，并新增 `system_pool: PgPool`。
- 六个 real module 仍写 `db: ctx.db.clone()`，触发 19 个 E0308、5 个 E0063。
- 健康检查与日志仍调用 `state.db.size()`，而 `Db` 只有 `stats() -> DbPoolStats`，触发 12 个 E0599。
- ERP 的 `tenant_middleware` 仍传 `api_state.db`（`Db`），中间件需要 `PgPool`，触发 1 个 E0277。
- 独立部署的 `svc/<service>/src/main.rs` 早已采用标准写法，统一入口未同步，导致 `cargo-check-workspace` 预推送门禁被阻断。

## 修复口径

统一入口按独立部署 main 的标准写法对齐，不改变请求事务与租户隔离语义。为避免六个模块各自构造 `Db`、后续口径漂移，在 `modules/mod.rs` 增加唯一工厂：

```rust
pub(crate) fn request_scope_db(
    ctx: &ServiceContext,
    search_path: &str,
) -> topems_shared_db::scope::Db {
    topems_shared_db::scope::Db::new(ctx.db.clone(), search_path)
        .deny_request_own_txn()
        .deny_request_tenant_scope()
}
```

六个模块只调用工厂并传入自己的 search_path：

```rust
let request_db =
    crate::modules::request_scope_db(&ctx, "<schema>, public, shared");

let state = ApiState {
    db: request_db,
    system_pool: ctx.db.clone(),
    // 其余字段不变
};
```

- `ApiState.db` 用请求作用域 `Db`，保留 `deny_request_own_txn` / `deny_request_tenant_scope`，防止业务代码绕过请求事务或丢失租户上下文。
- `system_pool` 用原始 `PgPool`，供审计落库与健康探针走系统通道。
- `tenant_middleware` 仍绑定原始 `PgPool`，它负责把请求事务与租户作用域注入 extensions，不能换成 `Db`。
- 健康检查与日志：`ApiState.db` 用 `stats().size`；仍是 `PgPool` 的 `ctx.db` / `self.db` 保持 `size()`。
- `scope-api` 基线 `db_new` 从 143 调至 144，仅新增 `svc/server/src/modules/mod.rs` 工厂这一处；六个 real module 不再各自出现 `Db::new`。这是启动期模块装配，不是请求 handler 内重建 `Db`。

各模块 search_path：

| 模块 | search_path |
|---|---|
| CRM | `crm, public, shared` |
| ERP | `erp, public, shared` |
| HRM | `hrm, public, shared` |
| RD | `rs, public, shared` |
| SCM | `scm, public, shared` |
| SRM | `srm, public, shared` |

SRM 不是 `ApiState` 模式，路由创建函数直接接收 `PgPool`。本批为其新增 `request_db` 与 `system_pool`：

- `create_supplier_routes(request_db, system_pool, event_publisher, workflow_client, supplier_cache)`
- `create_data_sync_routes(request_db, system_pool, event_publisher)`
- 其余 `create_*_routes` 全部改传 `request_db.clone()`
- `tenant_middleware` 仍用原始 `db.clone()`
- 健康检查里的 `ctx.db` / `self.db` 仍是 `PgPool`，保持 `size()`

## 验证

- `cargo fmt --all`：通过
- `cargo check --workspace`：通过（修复前 39 个错误，收口到 0）
- `cargo clippy -p topems-server --all-targets -- -D warnings`：通过
- `node scripts/ci/check-request-txn.mjs --changed-only`：通过，未新增裸事务
- `node scripts/ci/check-scope-api.mjs --changed-only`：通过；`Db::new` 仅 `mod.rs` 工厂 1 处，已按启动期装配登记基线
- `node scripts/ci/check-scope-api.mjs`：通过，`Db::new 144/基线 144`
- `python3 scripts/ci/check-txn-write-non2xx.py --changed-only`：通过

## 未做

- 仅完成编译与静态门禁验证，未启动统一入口做运行时冒烟；请求事务注入、租户隔离与审计落库的实际行为待集成环境验证。
- 未修改各服务独立部署 main，它们已是标准写法。
- 未调整状态盘点与候选约束，本批不涉及业务状态值。
