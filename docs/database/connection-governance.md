# 数据库连接治理（A 全局预算 / B 单池 + ScopedConn）

> 状态：A 已实现并本地验证；B 设计完成、试点（search）已完成并验证。
> 关联：`docs/database/database-primary-instance.md`、`plan` 第四十九轮连接排查。

## 0. 结论速览

| 项 | 改前 | 改后 |
| --- | --- | --- |
| 进程总连接上限 | 无（各池 `max_connections` 相加，生产理论 ≈ 496） | **≤ `DB_TOTAL_CONNECTION_BUDGET`（默认 60）** |
| 生产实测峰值 | 73（`idle` 72，无 `idle in transaction`，稳定非泄漏） | 待重启后复测（代码层已硬性封顶） |
| 池实例数（嵌入模式） | 28 业务池 + 28 迁移池 + 1 个 ai 独立池（max 100 / min 10） | 28 业务池 + **1 个共享迁移池**；ai 复用 bootstrap 池 |
| application_name | 空（无法按模块归因） | 每池可区分（`DB_APPLICATION_NAME` / `TOPEMS_SERVICE_NAME`） |

A 的改动**需要重启服务才生效**；本次未重启、未部署 prod。

## A. 全局连接预算

### A.1 目标与取舍

**目标**：任何情况下，单进程对同一数据库的总连接数 ≤ 预算。预算只做**总额天花板**，
不替代 `DB_MODULE_MAX_CONNECTIONS` / `DB_MODULE_MIN_CONNECTIONS`：单池仍按自身配置申请，
建池时再被预算裁剪，所以 `Σ(各池 max_connections) ≤ 预算`，而每池实际连接 ≤ 该池 max。

**为什么不用 acquire 级信号量**：业务代码把 `PgPool` 直接当 `sqlx::Executor` 用，并大量
`pool.acquire()`；进程内没有统一的取连接拦截点。若在 acquire 层加信号量，需要把 `PgPool`
换成自定义 newtype 并改动 28 个模块的签名与调用点，风险高，且 early-return / panic 漏还
许可会让配额逐步泄漏（比现状更糟）。

**采用**：建池期记账 + RAII 预约（`PoolReservation`）。额度在池创建前预留，写进
`PgPoolOptions::max_connections`；创建成功 `commit`（永久归该池），失败 / 提前返回 /
panic 展开时 `Drop` 自动归还。运行期不存在「许可」对象，因此不存在运行期泄漏路径。

### A.2 额度算法

```text
denom = max(DB_EXPECTED_POOLS, 已提交池数 + 1)
share = max(1, 预算 / denom)
grant = min(申请值, share, 预算 - 已分配)
grant == 0 → 返回错误（fail-fast，绝不超发）
```

- `DB_TOTAL_CONNECTION_BUDGET`：默认 `60`（给 PG `max_connections=100` 留约 40 的运维余量）。
- `DB_EXPECTED_POOLS`：默认嵌入模式 29（28 个 real_module + 1 个共享迁移池）、独立部署 2
  （业务池 + 迁移池）。用于公平分摊，避免「先建池的吃光预算、后建池拿不到连接」。
- 例：嵌入模式 28 个业务池各申请 3 → 每池 2，Σ=56；共享迁移池再拿 2 → Σ=58 ≤ 60。
- 负向：把 `DB_MODULE_MAX_CONNECTIONS` 调到 50/1000，`grant` 仍被 `share` 与余额夹住。

### A.3 实现位置

| 位置 | 作用 |
| --- | --- |
| `lib/shared-db/src/database/budget.rs` | 账本 / 预约句柄 / 环境变量解析 / 单测 |
| `lib/shared-db/src/database/mod.rs` `create_database_pool` | 建池前 `reserve_pool`，成功 `commit` |
| `lib/shared-db/src/database/mod.rs` `create_migrate_pool` | 迁移池改为**进程内单例**并计入预算（原每模块一个 max=3 池，最多额外 84 连接） |
| `lib/shared-bootstrap/src/lib.rs` V1 遗留建池路径 | 同预算，避免绕过 |
| `svc/ai/src/services/db.rs` / `svc/ai/src/main.rs` / `svc/server/src/modules/ai_real_module.rs` | 删除 ai 自建的 `max=100/min=10` 第二池，复用 bootstrap 池 |

### A.4 验证

- **单元测试**（`cargo test -p topems-shared-db --lib database::budget`，8 passed）：
  28 池 Σ=56 ≤ 60；单池申请 1000 仍被预算卡住；40 池不超发；未 commit 的预约连续 3 轮
  归还且 allocated 不递减；`catch_unwind` 验证 panic 路径归还；30 线程并发预约 Σ ≤ 预算。
- **集成测试**（`lib/shared-db/tests/connection_budget_it.rs`，真实 test 库）：
  预算 6 / 3 池 / 每池申请 100，60 个并发 `pg_sleep` 查询；
  `pg_stat_activity` 采样峰值 = **6 / 6**，查询全部成功（60 ok / 0 err）；
  两次无效 DSN 建池失败后 allocated 保持 6（RAII 归还）。
  运行命令：
  ```bash
  TOPEMS_IT_DATABASE_URL='postgresql://xingzhai@127.0.0.1:15432/topems_test' \
    cargo test -p topems-shared-db --test connection_budget_it -- --nocapture
  ```

### A.5 运维注意

- 预算在**进程首次建池时**读取环境变量（此刻 dotenv 已加载）；调大/调小需重启。
- 成功创建的池会永久占用额度（池与进程同生命周期）；这是设计预期，避免重复建池时超发。
- 若模块数增长导致 `DB_EXPECTED_POOLS` 与实际池数偏离，可显式设置该变量；
  预算耗尽时建池返回明确错误（模块初始化失败可见，不会静默超发）。

## B. 单池 + 事务级 `search_path`（设计）

> 本节只做设计与 1 个模块试点；28 个模块全量迁移另行排期。

### B.1 目标

全进程只保留 **bootstrap 建的那一个业务池**；模块不再持有 `PgPool`，只能通过
「作用域连接」取用，`search_path` 由作用域在事务内 `SET LOCAL` 设定。收益：

- 连接数上限与并发需求解耦（不再 28 个池各留一份空闲余量）；
- schema 归属从「连接会话状态」变为「作用域属性」，模块之间不可能互相污染；
- 未限定表名的解析结果变得可预测（每个模块一个显式 schema 串）。

### B.2 API 形状

实现：`lib/shared-db/src/scope.rs`。

```rust
pub struct Db { pool: PgPool, search_path: Arc<str> }   // 字段私有，无 Deref，无 as_pool()

impl Db {
    pub fn new(pool: PgPool, search_path: impl Into<String>) -> Self;
    pub async fn scope(&self)      -> sqlx::Result<ScopedTxn<'_>>;  // 读写事务
    pub async fn scope_read(&self) -> sqlx::Result<ScopedTxn<'_>>;  // 只读事务
    pub async fn scope_with<'a>(&self, tx: &'a mut Transaction<'static, Postgres>)
        -> sqlx::Result<ScopedTxn<'a>>;                          // 复用请求级 RLS 事务
    pub async fn check_health(&self) -> sqlx::Result<()>;
}

pub struct ScopedTxn<'a> { inner: TxRef<'a>, search_path: Arc<str> }
impl<'c> Executor<'c> for &'c mut ScopedTxn<'_> { /* 委托给 &mut PgConnection */ }
```

要点：

- **模块拿不到连接**：`Db` 不暴露 `pool()`，`ScopedTxn` 不暴露 `conn_mut()`（私有）；
  也不实现 `Deref`/`AsRef<PgPool>`，`pool.acquire()` 在类型层面不可达。
- **SQL 写法不变**：`ScopedTxn` 实现 `sqlx::Executor`，模块沿用
  `sqlx::query(..).fetch_all(&mut *scope)`，只把 `&PgPool`/`&mut PgConnection` 换成
  `&mut ScopedTxn`。
- **提交语义**：`ScopedTxn::commit()` 只对自有事务生效；`scope_with` 借用的事务提交/回滚
  仍由 `tenant_middleware` 统一处理（空操作），避免「两层提交」。
- **Drop 安全**：自有事务未 commit 时 `sqlx::Transaction` 的 Drop 即 ROLLBACK，
  与 `PoolConnection` 的 Drop 归还连接一致，无泄漏。

### B.3 为什么 `SET LOCAL` 是正确选择

- `SET LOCAL` 等价于 `set_config('search_path', $1, true)`，作用域是**当前事务**；
  事务 `COMMIT`/`ROLLBACK` 后 PostgreSQL 自动恢复连接上的会话级值。
- 因此连接归还池时**不会残留**本次作用域的值，而是回到池的基线
  （`create_database_pool` 的 `after_connect` 按 `SEARCH_PATH` 设置的会话级值）。
  不需要 `after_release` 清理，也就没有「清理语句失败 → 脏连接」这一类故障模式。
- 反例（会话级 `SET search_path`）：它会越过事务存活，污染同一连接的下一个使用者。
  本设计中：模块拿不到连接对象，无法执行这种语句的「连接级」形态；即使模块自己拼出
  `SET search_path` 字符串（运行期仍可能），**下一个作用域开头会重新 `SET LOCAL`**，
  污染窗口被压缩到「同一事务内该模块自身后续语句」，不会跨模块、跨请求传播。
- 兜底策略（全量阶段启用，成本可忽略）：CI 静态扫描 `svc/*/src` 中的
  `SET ` / `SET LOCAL` / `set_config(` 裸 SQL（测试除外），命中即失败。

### B.4 非事务只读查询怎么处理

`SET LOCAL` 依附事务；autocommit 下单条语句结束即失效，无法「先 SET 再查」。
因此只读路径也用**只读事务**：`BEGIN` → `SET TRANSACTION READ ONLY` → `SET LOCAL search_path`
→ 查询 → `COMMIT`。

- 代价：每次读多一次 BEGIN/COMMIT 往返（同连接的本地往返，通常 < 0.1ms），换来
  「所有查询都有一致的 schema 作用域 + 无需会话状态 + 池可任意复用」。
- 为什么不用「会话级 SET + after_release RESET」：每个 release 多一次网络往返，
  且一旦 RESET 失败或漏调，就是跨租户/跨模块的 schema 污染；`SET LOCAL` 由 PG
  保证，不依赖客户端正确性。
- `scope_read` 还顺带提供只读保护：写语句在只读事务中由 PG 直接拒绝。

### B.5 单池 `PgPoolOptions` 取值建议（B 全量切换时）

| 参数 | 建议值 | 依据 |
| --- | --- | --- |
| `max_connections` | **80**（= `DB_TOTAL_CONNECTION_BUDGET`） | prod 实测峰值 73（28 池叠加）；单池必须 ≥ 实测峰值才不排队。PG `max_connections=100`，扣 3 个 superuser reserved 与迁移/运维余量后 80 仍安全 |
| `min_connections` | **5** | 预热常用连接即可；单池 min 过大等于启动瞬间占满额度（预算不会因此失效，但会挤占迁移池） |
| `acquire_timeout` | **5s** | 单池排队时快速失败优于长挂起；旧 30s 会把上游请求拖成雪崩 |
| `idle_timeout` | 300s（沿用） | 与 A 现状一致 |
| `max_lifetime` | 1800s（沿用） | 同上，配合 PG 端连接回收 |
| `test_before_acquire` | true（sqlx 默认，保留） | 单池下一条坏连接影响面 = 全进程 |

**切换前必须先修一个 A 的分配细节**：A 的公平份额是 `share = budget / max(DB_EXPECTED_POOLS, pools+1)`。
单池模式下只剩「业务池 + 迁移池」两个池，`DB_EXPECTED_POOLS=2` 会把业务池切到 `budget/2`
（默认 60 → 30），与上面 80 的目标冲突。两种可行方案（实现时二选一，不改算法语义）：

1. **固定预留**：迁移池先按 3 固定预留，业务池份额按 `budget - reserve` 计算；
2. **权重**：`DB_EXPECTED_POOLS` 只计业务池（=1），迁移池走固定 2–3 的小额预留。

本次试点**不新增池**（`Db::new(ctx.db.clone(), "public")` 复用 bootstrap 池），故不受影响。

### B.6 迁移路径与「旧路径堵死」

| 阶段 | 动作 | 旧路径状态 |
| --- | --- | --- |
| 0（本次） | 试点 1 个模块（search）改 `Db`/`ScopedTxn` | 其余 26 模块继续 `PgPool`；双路径并存 |
| 1（逐模块） | 每个模块：state 改 `Db`；handler 入参改 `&mut ScopedTxn`；删 `pool.acquire()` | 同进程内两套写法并存，但都指向同一 bootstrap 池 |
| 2（封口） | `ModuleContext { db: PgPool }` 改为 `db: Db`；`create_database_pool` 返回类型改为 `Db`（不再对外暴露 `PgPool`） | **编译期堵死**：任何 `ctx.db` 当 `Executor`/`acquire()` 的写法直接 E0277/E0599，不靠约定 |
| 3（收尾） | 删除 `SEARCH_PATH` 会话级 `after_connect` 设置；CI 扫描 `SET `/`SET LOCAL`/`set_config(`/`.acquire()` | 会话级 search_path 彻底退出 |

运行期补充（阶段 1 起可用）：`Db::new` 打点 `service` + `search_path`；`scope` 首次使用时
在 `tracing::debug` 打印 `SHOW search_path`，便于抽样核对（不做强断言，避免生产噪音）。

### B.7 剩余工作量估算

统计口径：`grep -c "sqlx::query"`（每处 = 一个需要换 `Executor` 入参的调用点）。

- **已完成：1 / 28**（`svc/search`，13 处 SQL、4 个 HTTP 入口 + 3 个 MCP 工具）；
- **剩余：27 个模块**，累计约 6,000 处调用点，按量分三批：

| 批次 | 模块（SQL 处数） | 难度 |
| --- | --- | --- |
| 小（< 200 处，9 个，含已完成的 search） | monitor(14)、portal(37)、plugin-registry(70)、tms(76)、ticket(102)、gis(133)、ai(141)、mobile(188) | 低：多为直接 handler→pool，改签名即可 |
| 中（200–450 处，10 个） | pm(194)、analytics(192)、rd(184)、integration(174)、pdm(148)、communication(120)、scm(247)、ehs(242)、hrm(240)、lims(239)、srm(229) | 中：部分内部 helper 收 `&PgPool`，需逐层换 `&mut ScopedTxn` |
| 大（> 450 处，8 个） | erp(445)、mes(383)、master-data(382)、wms(339)、qms(293)、crm(270)、unified-core(648)、finance(713) | 高：跨 schema JOIN / 未限定表名依赖 `SEARCH_PATH` / 请求级 RLS 事务复用 |

具体难点分类（已实测扫描）：

1. **绕过池直接拿连接**：`pool.acquire()` 共 33 处 / 32 文件——28 个 `*_real_module.rs` 中
   除 search（试点已移除）外的 27 个各 1 处（健康/就绪探测），另有 `analytics/bi/dataset.rs`、
   `erp/searchable_projection.rs`、`mes/work_report.rs`、`unified-core/middleware/tenant_rls.rs`（2 处）。
2. **未限定表名依赖会话 `search_path`**：`SEARCH_PATH` 默认 `rs, erp, public`，erp/unified-core
   有大量裸表名；改作用域后每个模块必须显式给 schema 串（不能照搬全局默认）。
3. **会话级 `SET search_path`**：**生产代码 0 处**，仅 `svc/ehs/tests`、`svc/qms/tests` 用；
   全量阶段只需把测试辅助改成 `SET LOCAL`。
4. **自建池**：`svc/ai` 的 `max=100/min=10` 第二池已在 A 中删除；`analytics` 的
   `bi/datasource.rs` 是**用户配置的外部数据源**（不在本进程预算内，需单独治理）；
   `shared-db/src/rls.rs` 的 `max=5` 池无调用方（死代码，可删）。
5. **事务嵌套**：`tenant_middleware` 每请求已 `BEGIN`，必须走 `scope_with`（已实现），
   否则会二次 BEGIN（sqlx 会开新连接，等于多占 1 连接且丢失 `app.tenant_id`）。
6. **`ReadWritePool`**：只是对已有 `PgPool` 的包装（无副本时零新增池），迁移时改为持有 `Db`
   即可，不构成额外工作量。

### B.8 试点验证（search，2026-11-06）

范围：`svc/search` 双形态（standalone `svc/search` + 嵌入 `svc/server/modules/search_real_module.rs`），
13 处 SQL 全部改走 `ScopedTxn`；模块 state 只持有 `Db`（`PgPool` 字段私有、不实现 `Deref`，
编译期拿不到池）。`tenant_middleware` 仍收 `ctx.db: PgPool`（中间件需要 `begin` 请求事务），属设计内。

**DB 层集成测试**（`lib/shared-db/tests/scope_search_path_it.rs`，3 passed，真实 test 库）：

- `scope_sets_and_restores_search_path`：基线 `SHOW search_path = iam,shared,public` →
  scope（读/写）内 `= public`、`current_schema() = public` → commit/rollback 后同一物理连接
  恢复基线（`SET LOCAL` 不残留，max_connections=1 保证同一条连接）。
- `concurrent_scopes_do_not_leak_schema`：`public` 与 `information_schema` 两个 `Db` 并发
  各取连接，互不串味。
- `scope_with_reuses_request_txn`：复用外部事务时 `SHOW search_path = public` 且
  `current_setting('app.tenant_id')` 保留（RLS 上下文不丢）；`commit` 为空操作，由中间件提交。

运行命令：

```bash
TOPEMS_IT_DATABASE_URL='postgresql://xingzhai@127.0.0.1:15432/topems_test' \
  cargo test -p topems-shared-db --test scope_search_path_it -- --nocapture
```

**HTTP 端到端**（standalone，18082 端口，test 库 + HS256 测试 JWT，实测响应摘录）：

| 请求 | 结果 | 覆盖路径 |
| --- | --- | --- |
| `GET /api/search?keyword=test` | 200，命中 1 条投影数据（含高亮/facets/suggestions） | `scope_with`（复用 RLS 请求事务） |
| `GET /api/search/suggestions?q=t` | 200 `{"suggestions":[]}` | `scope_read` |
| `GET /api/search/recent`（搜索后） | 200 `["test"]` | 写入链路 `scope()` + `commit`（fire-and-forget） |
| `DELETE /api/search/recent` | 200 `"cleared"` | `scope()` + `commit` |
| `POST /mcp` initialize / `search.global` / `search.suggest` | 200，`search.global` 命中同一条数据 | `scope_read`（MCP server-token 面） |
| 无 JWT 请求受保护端点 | 401 | 认证链未受改造影响 |
| MCP 无 token | 401 `-32001` | fail-closed 未变 |
| `pg_stat_activity`（`application_name='search-service'`） | 2 连接 | 远低于预算 grant，池未膨胀 |

**试点中发现的既有 bug（非本次改动引入，已随试点修复）**：standalone `GET /api/search`
此前稳定 500。根因：axum `nest` 剥离前缀后内层路径为 `/`，命中 `is_public_path` 的 `/`
公开豁免 → `tenant_middleware` 跳过注入请求级 RLS 事务 → `search_handler` 提取
`Extension<RlsTxnArc>` 失败（改动前 HEAD 代码同样依赖该扩展，嵌入形态走全路径挂载不受影响，
故仅 standalone 触发）。修复：根检索端点改为 `build_application` 之后全路径 merge
（`/api/search` + `/api/search/`），与嵌入形态 `search_real_module` 挂载方式一致；
修复后同请求 200 且真实命中。

**双路径共存实测**：试点模块与其余 27 个模块同进程运行时共用同一 bootstrap 池
（A 已把总额封顶），`Db` 与直接 `PgPool` 写法并存但指向同一池，未发现连接归属冲突；
`search_path` 的作用域化只影响本模块自身事务，不改其他模块的会话基线。
