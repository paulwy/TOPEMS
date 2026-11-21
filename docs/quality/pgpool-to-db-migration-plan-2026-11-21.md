# crm / erp / hrm / rd / scm / srm 的 `PgPool → Db` 迁移排期方案（2026-11-21）

> 性质：**只读摸底 + 排期方案，不改实现、不建迁移**。
> 前置结论来自 [scope-api-convergence-mapping-2026-11-21.md §7.3](file:///Users/xingzhai/TOPEMS/docs/quality/scope-api-convergence-mapping-2026-11-21.md)：这 6 个服务的请求 state 仍持裸 `PgPool`，守卫加不上去。
> 取数方式：按服务静态扫描 `State<...>`、`state.db`、`RlsTxnCell`、`check_permission`、`scope_*_for_tenant`、`master_data_refs`，未连库。

## 0. 目标

在不改变业务语义的前提下，把 6 个服务的请求 state 从裸 `PgPool` 切到 `Db`，让 `deny_request_own_txn()` + `deny_request_tenant_scope()` 真正生效，然后逐服务冒烟、逐服务提交。

## 1. 摸底结论（决定工作量与顺序）

1. **请求事务已经存在**：6 个服务都挂 `tenant_middleware`，handler 普遍已取 `Extension<RlsTxnCell>` 并直接用 `&mut *txn` 查询。也就是说，“请求内自开事务/自开租户作用域”的主要收口在历史上已经做过一轮。
2. **守卫缺位的原因不是 handler 乱开事务，而是 state 类型**：守卫只能挂在 `Db` 上；`ApiState.db` / 模块 state 是 `PgPool`，既没有守卫，也没有 `scope_with` 可用。
3. **请求面没有同步 `scope_for_tenant` / `scope_read_for_tenant`**：6 个服务的未标记点全部位于 `event_handlers`、`tokio::spawn`、启动预热、后台同步。开守卫不会误拦现有请求。
4. **迁移不是“换类型”一步**：`Db` 不实现 `sqlx::Executor`，也不暴露底层 pool。所有 `&state.db`、`state.db.begin()`、`check_permission(&state.db, ...)` 都必须改到请求事务上，否则编译不过或继续多占连接。
5. **最大共性改造点是本地权限 helper**：6 个服务各有一份 `shared/permission.rs::check_permission<T>(db: &PgPool, ...)`，调用点合计 381 处，必须提供事务版并批量替换。
6. **三个服务有结构性特例**：
   - `rd`：另有 `repositories/project_repository.rs` 持 `PgPool`；`batch_create_projects` 在已持请求事务时又 `state.db.begin()` 开第二个事务（[project.rs](file:///Users/xingzhai/TOPEMS/svc/rd/src/modules/project.rs#L670-L696)）。
   - `srm`：`main.rs` 用 17 个 `create_*_routes(ctx.db.clone())` 注入 17 个模块 state，要改 17 个结构体。
   - `erp`：master_data 系列重度依赖 shared-db `MasterDataRefs`（20 处引用），需要 `_in_scope` 读变体；`settings` 还有 6 处 `State<PgPool>`。

## 2. 逐服务改造面

计数口径：`state.db` 列为 `state.db` / `self.db` / `db.begin()` / `db.acquire()` 出现次数；`RlsTxnCell` 为已接入请求事务的提取/使用次数；`check_permission` 为 `check_permission(&state.db, ...)` 调用次数。均为静态近似值，含少量测试/后台代码。

| 服务 | 请求 state 持有方式 | `State<...>` 提取器（≈handler） | `state.db` 等直用 | 已用 `RlsTxnCell` | `check_permission(&PgPool)` | 请求面 `scope_*_for_tenant` | 特例 |
|---|---|---:|---:|---:|---:|---:|---|
| hrm | `ApiState.db: PgPool`（[mod.rs](file:///Users/xingzhai/TOPEMS/svc/hrm/src/modules/mod.rs#L39)） | 146 | 61 / 14 文件 | 159 | 23 / 5 文件 | 0 | `services/employee_service.rs` 持 pool |
| rd | `ApiState.db: PgPool`（[mod.rs](file:///Users/xingzhai/TOPEMS/svc/rd/src/modules/mod.rs#L33)） | 27 | 47 / 9 文件 | 125 | 0（权限走中间件） | 0 | repository 层持 pool；1 处请求内嵌套 `begin()` |
| srm | 17 个模块 state（`create_*_routes(PgPool)`） | 114（多为 `State<Arc<...>>`） | 105 / 14 文件 | 131 | 85 / 12 文件 | 0（`supplier.rs` 后台 spawn） | 17 个 state 结构体逐个改 |
| crm | `ApiState.db: PgPool`（[app_state.rs](file:///Users/xingzhai/TOPEMS/svc/crm/src/models/app_state.rs#L7)、[modules/mod.rs](file:///Users/xingzhai/TOPEMS/svc/crm/src/modules/mod.rs#L39)） | 126 | 175 / 20 文件 | 139 | 116 / 16 文件 | 0 | 两处同名 `db` 字段需同步 |
| scm | `ApiState.db: PgPool`（[mod.rs](file:///Users/xingzhai/TOPEMS/svc/scm/src/modules/mod.rs#L34)） | 138 | 174 / 20 文件 | 153 | 94 / 12 文件 | 0 | 后台 `master_data_refs` 1 处 |
| erp | `ApiState.db: PgPool`（[modules/mod.rs](file:///Users/xingzhai/TOPEMS/svc/erp/src/modules/mod.rs#L91)） | 426 | 171 / 25 文件 | 266 | 63 / 9 文件 | 0 | `MasterDataRefs` 20 处；`State<PgPool>` 6 处 |

补充：

- 6 个服务请求面均无 `scope_for_tenant` / `scope_read_for_tenant`；未标记点全部在后台路径，开守卫安全。
- `master_data_refs` / `reconciliation_log` 只在 erp（重度）与 crm/scm（各 1 处后台）出现；`_in_scope` 变体已在 B4 补齐，迁移时直接复用。
- 全部服务已在 `main.rs` 用 `ctx.db.clone()` 构造 state；切 `Db` 的落点集中，不涉及 bootstrap 层。

## 3. 每服务标准改造步骤

1. **state 换类型**：`ApiState.db`（或 srm 的模块 state 字段）改为 `topems_shared_db::scope::Db`；`main.rs` 构造改为
   `Db::new(ctx.db.clone(), "<svc>, public, shared").deny_request_own_txn().deny_request_tenant_scope()`。
2. **同步 `FromRef`**：把 `FromRef<ApiState> for PgPool` 改为 `for Db`（crm 已有，其他服务按需补）。
3. **handler 查询改走请求事务**：已取 `RlsTxnCell` 的，把 `&state.db` 换成 `&mut **txn`；未取的在参数里补 `Extension<RlsTxnCell>`。需要 `Db` 语义的用 `state.db.scope_with(&mut txn)`（nil 租户走 `scope_with_system`）。
4. **消除请求内嵌套事务**：`state.db.begin()`（如 rd `batch_create_projects`）改为复用请求事务，删掉内层 `begin()/commit()`；确认失败回滚粒度可接受。
5. **权限 helper 事务化**：新增 `check_permission_txn(&mut PgConnection, ...)`（或把现有签名改为 `&mut PgConnection`），批量替换 `check_permission(&state.db, ...)`；保留旧签名给后台/测试。
6. **后台路径不动**：`event_handlers`、`tokio::spawn`、启动预热继续用 `scope_system` / `scope_for_tenant` / 自建 `Db::new`，不接守卫。
7. **清零裸 pool 直用**：请求模块内 `state.db` 不再作为 Executor 出现（后台/测试除外），用 grep 复核。

## 4. 风险点与对策

| 风险 | 说明 | 对策 |
|---|---|---|
| 守卫拦不住裸 pool | `deny_request_tenant_scope` 只拦 `scope_*_for_tenant`，不拦 `&PgPool` 直查 | 迁移后 grep `state.db` 在请求模块清零；门禁只做增量约束 |
| 连接双占 | 残留 `&state.db` 会让请求事务 + 额外连接并存 | 逐 handler 改到 `txn`；压测连接数 |
| 提交语义变化 | 原本自开事务的逻辑并入请求事务后，部分失败会整体回滚 | 逐 handler 确认原子性要求；批量/跨模块写重点评审 |
| 权限校验副作用 | 权限查询进入请求事务后，403 前可能已有写入 | 确认权限校验只读；必要时用 `scope_read_system` 或事务外只读连接 |
| 长请求占用事务 | 批量接口持有请求事务更久 | 已有 30s `statement_timeout`；rd 批量、erp/srm 导入类接口压测 |
| srm 机械遗漏 | 17 个模块 state 结构相似 | 按 `create_*_routes` 清单逐个勾销，clippy 兜底 |
| erp `_in_scope` 覆盖不全 | master_data 读方法多 | 以 B4 的 `_in_scope` 清单为准，缺的补 helper，不在 handler 里自开 scope |

## 5. 批次顺序与工作量判断

按“改动面小 → 大、结构特例少 → 多”排序，每个批次只做一个服务，独立构建 + 独立冒烟 + 独立提交。

| 批次 | 服务 | 主要理由 | 预估工作量 |
|---|---|---|---|
| B1 | hrm | 直用 61/14 文件、5 个权限调用文件、无 repository、无 shared helper | 小（1 批） |
| B2 | rd | 直用 47/9 文件、无 `check_permission`；但需处理 repository 层 + 1 处嵌套事务 | 小-中（1 批，repository 单独审） |
| B3 | srm | 17 个 state 机械改造、85 处权限调用 | 中（建议拆 2 批：核心 supplier/order 一批，其余模块一批） |
| B4 | crm | 175 处直用、116 处权限调用、两处同名 state | 中-大（1-2 批） |
| B5 | scm | 174 处直用、94 处权限调用、后台 master_data | 中-大（1-2 批） |
| B6 | erp | handler 最多（426）、266 处事务接入、master_data `_in_scope`、`State<PgPool>` | 大（2-3 批，先 master_data 与 settings） |

依赖：先做 B1/B2 验证“Db + 权限 helper 事务化”的通用模式，再复制到 B3-B6；erp 放最后，避免最大面先动。

## 6. 每服务验收清单

1. `cargo build -p topems-<svc>` 通过。
2. `cargo clippy -p topems-<svc> --all-targets -- -D warnings` 通过。
3. 独立端口启动，`/health` 返回 200。
4. `node scripts/ci/check-scope-api.mjs`：未标记调用与 `Db::new` 不增加（基线不回归）。
5. 请求模块内 `state.db` / `&state.db` 清零（后台、事件、测试除外）。
6. 一次性本地验证：在任一 handler 故意调用 `scope_for_tenant`，应报 `Protocol`（确认守卫真实生效后移除）。
7. 生产前置：按服务补连接预算/并发压测，未压测不得以守卫开启认定容量安全。

## 7. 不在本方案范围

- 生产 DDL 与生产授权变更（一律停手请示）。
- EHS/WMS 书面豁免、integration/gis 的独立阻塞项（见主文档 §7.3）。
- 共享池容量调参（`max_db_connections`）。
