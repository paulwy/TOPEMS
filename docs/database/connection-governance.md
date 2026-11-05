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
  本次复跑（2026-11-06）实测输出：
  `[budget] total=6 allocated=6 pools=3 peak=6` / `[load] ok=60 err=0 observed_peak_connections=6 budget=6` /
  `[early-return round 0] allocated=6`、`[early-return round 1] allocated=6`（两轮不递减）。
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

1. **绕过池直接拿连接**：改造前 33 处 / 32 文件。**已消除 28 处**——27 个 `*_real_module.rs`
   与 `server/modules/subscription_module.rs` 的启动探测（原为 `let _conn = ctx.db.acquire().await?;`，
   变量绑定使连接持有到 `build()` 结束），统一收敛到 `shared-db::database::probe_connection`
   （`SELECT 1` 后立即归还，失败 `?` 传播保持 fail-fast）。
   **保留 5 处**（B 全量范畴，已进 CI 白名单）：`analytics/bi/dataset.rs`（BI 动态 SQL）、
   `erp/searchable_projection.rs`（erp 未纳入 Db）、`mes/work_report.rs`（spawn 后台任务，
   已改为查询后立即 `drop(conn)`）、`unified-core/middleware/tenant_rls.rs`（请求级会话 GUC）、
   `shared-db/src/rls.rs`（共享 RLS 中间件基础设施）。详见 C.4。
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
| `GET /api/search?keyword=SCHEMA_PROBE` | 200，**只命中 `public.core_files` 的行，`iam` 同名行未命中** | 未限定表名按作用域 `search_path` 解析（见下方落点证据） |
| `GET /api/search/?keyword=test` | 200（尾斜杠形态） | 全路径 merge 后两种形态都通 |
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

**schema 落点证据（运行时，非代码推断）**：`search_documents` 用的是未限定表名
`FROM core_files`，而 test 库中 `public.core_files` / `flow.core_files` / `iam.core_files`
三处同名（`public` 与 `iam` 列结构一致，均含 `tenant_id`）。做法：两个 schema 各插一行
名字可区分的数据（`SCHEMA_PROBE_PUBLIC` / `SCHEMA_PROBE_IAM`），经真实服务检索，实测返回
**仅 `public` 那行**（`{"id":"cccccccc-…","title":"**SCHEMA_PROBE**_PUBLIC","module":"document"}`），
`iam` 行未出现 → 证明未限定表名确实按作用域 `search_path=public` 解析，`SET LOCAL` 在真实
请求路径上生效（请求结束后连接恢复基线由集成测试 `after commit/rollback` 断言覆盖）。
探针行已清理。

**共存期风险（需在 B 全量前处理）**：同一未限定表名在不同 `search_path` 下会解析到不同
schema——会话基线 `iam,shared,public` 下 `core_files` → `iam.core_files`，作用域 `public`
下 → `public.core_files`。本试点按 `public` 语义验证通过（两处列结构一致、test 库两表均空），
但**生产数据实际落点必须在切换前逐模块核对**；B 全量阶段的正确做法是迁移时把未限定表名
全部显式加 schema 前缀，而不是依赖作用域默认值（否则等于把数据源隐式改掉）。

## C. schema 前缀规则（可执行门禁）

### C.1 规则

**模块内 SQL 的表引用一律显式 `<schema>.<table>`**，不依赖 `search_path` 默认值。

`ScopedTxn` 的 `SET LOCAL search_path` 只是**兜底**，不作为正确性依据：裸表名一旦依赖它，
改动 search_path（试点、模块裁剪、多租户隔离）就会静默改变数据源，且 SQL 不报错——
同名表跨 schema 时（如 `core_files` 在 `public` / `flow` / `iam` 各一份）会读到另一份数据。

### C.2 例外（不算违规）

| 场景 | 处理 |
| --- | --- |
| 动态表名（`format!` 拼接 / 绑定参数 / `{}` 占位） | 静态不可判定，扫描跳过；要求调用点显式拼接 `schema.`，并在 code review 中人工确认 |
| CTE 名（`WITH x AS (...)`）、子查询、表别名 | 不是物理表，跳过 |
| `pg_catalog` / `information_schema` 系统表 | 允许裸写（PostgreSQL 保证可见），也可显式前缀 |
| `unnest` / `generate_series` / `json_each` 等集合函数 | 不是表，跳过 |
| 跨 schema JOIN | 两侧都必须显式前缀（这是本规则的高危场景，不允许"一侧显式一侧裸"） |
| DDL / 建表 | 由 `database/migrations/**` 管理，不在模块代码内；迁移文件不属本规则范围 |

### C.3 检查口径（`scripts/ci/check-schema-prefix.mjs`）

- 扫描范围：`svc/*/src/**/*.rs`，排除 `tests/`、`*_test.rs`、`*_tests.rs`、`test_*.rs`
  与 `#[cfg(test)] mod` 块（保持行号）。
- 识别 SQL：仅处理同时满足「结构像 SQL」的字面量（`SELECT … FROM` / `INSERT INTO` /
  `UPDATE … SET` / `DELETE FROM` / `JOIN`），避免把日志文案（如 `creating report from template`）误报。
- 抽取表引用：`FROM` / `JOIN` / `INTO` / `UPDATE` / `REFERENCES` 后的首个标识符
  （含 `"quoted"` 形式）；名字中含 `.` 视为已限定，直接放行。
- 判定分级（危险度从高到低）：

| 级别 | 含义 |
| --- | --- |
| `AMBIGUOUS` | 表名在多 schema 同名（事实源 `scripts/schema_boundary_tables.json#ambiguous`）——search_path 一变就读错表 |
| `CROSS_SCHEMA` | 静态归属 schema 不在该服务的 `search_path` / `allow` 内——当前就依赖隐式解析 |
| `SEARCH_PATH_DEPENDENT` | 归属 schema 恰在 `search_path` 内，今天能跑通纯属巧合 |
| `UNKNOWN` | 静态归属表里查不到（新表/视图未登记），按违规计 |

- 基线：`scripts/ci/schema-prefix-baseline.json`，键为 `文件::表名`。既存违规放行，
  新增文件或新表名阻断（退出码 1）。同一文件内新增同表名的新语句不会阻断（文件级粒度，
  与仓库既有基线机制一致）——这是已知限制，靠 review 补齐。

```bash
node scripts/ci/check-schema-prefix.mjs                 # 全量（CI）
node scripts/ci/check-schema-prefix.mjs --changed-only  # 仅暂存文件（pre-commit）
node scripts/ci/check-schema-prefix.mjs --report-only   # 只报告
node scripts/ci/check-schema-prefix.mjs --json
```

### C.4 绕过池的调用白名单（`scripts/ci/check-pool-acquire.mjs`）

`svc/**` 内禁止 `.acquire(` / `.acquire_timeout(`；`lib/shared-db/**` 是连接治理基础设施层
（建池、`scope`、RLS 中间件），不在扫描范围。白名单
`scripts/ci/pool-acquire-baseline.json` 现有 4 条（均带 reason）：

| 文件 | 保留原因 |
| --- | --- |
| `svc/analytics/src/modules/bi/dataset.rs` | BI 动态 SQL，目标 schema 由用户配置决定，不在本进程 search_path 语义内 |
| `svc/erp/src/modules/searchable_projection.rs` | erp 尚未纳入 `Db` 试点；该处为启动期快照补写的独立只读借用，语义等价 `scope_read` |
| `svc/mes/src/modules/work_report.rs` | `tokio::spawn` 后台任务，请求事务已提交，无法复用请求级 scope；已改为查询后立即归还 |
| `svc/unified-core/src/middleware/tenant_rls.rs` | 请求级**会话级**租户 GUC，需跨 `next.run` 持有；与 shared-auth 的事务级 RLS 并存 |

另有 1 处不在扫描范围但同样保留：`lib/shared-db/src/rls.rs::rls_middleware`
（共享 RLS 中间件，归还前显式 `RESET app.tenant_id`）。

### C.5 首次全量扫描结果（2026-11-06）

- 扫描 1,424 个文件 / 6,325 条 SQL 字面量；**违规 1,673 处**，已全部进基线（339 个 `文件::表` 键），全量扫描退出码 0。
- 分级：`AMBIGUOUS` 49、`CROSS_SCHEMA` 2、`SEARCH_PATH_DEPENDENT` 884、`UNKNOWN` 738。
- 按模块（Top）：`mes` 308、`unified-core` 273、`finance` 234、`lims` 174、`analytics` 166、
  `pdm` 151、`erp` 106、`communication` 101，其余 ≤ 46。
- **最危险（优先处理）**：
  1. `CROSS_SCHEMA`（2 处，均在 `svc/monitor/src/modules/monitor/metrics.rs#899`）：
     `employees`、`departments` 裸引用，实际归属 `hrm`——monitor 的 search_path 不含 hrm，
     一旦切换作用域即失败或读到同名表。
  2. `AMBIGUOUS`（49 处 / 8 个表名）：
     `audit_logs`（crm/mes/srm/wms/hrm/erp/scm/bi 各有，8 个 owner）、
     `suppliers`（scm/srm/erp）、`inventory`（erp/wms）、`projects`/`project_members`/
     `project_phases`/`project_milestones`（rd 与 pm）、`budgets`（finance 与 pm）。
     `unified-core` 与 `monitor` 是主要引用方，二者都没有自己的 schema，最容易读错。

#### C.5.1 复核（2026-11-06 第二次扫描，已修复后）

- **违规 1,627 处**（较首扫 −46），基线 339 → 327 个键；全量扫描退出码 0、`new_violations=0`。
- 分级：`AMBIGUOUS` **3**（全在 monitor 演示串）、`CROSS_SCHEMA` **2**（同上）、
  `SEARCH_PATH_DEPENDENT` 884、`UNKNOWN` 738。
- 按模块变化：`rd` 38→16、`unified-core` 273→262、`finance` 234→228、`scm` 2→0、`srm` 5→0；
  `monitor` 仍为 10（见下）。
- 修复口径（每处都按调用方 schema 显式限定，不跨服务猜）：
  | 表名 | 处理 | 依据 |
  | --- | --- | --- |
  | `projects` 等 4 张项目表 | rd 侧补 `rs.`（22 处） | rd 的 `SEARCH_PATH=rs, public`；列集与 `rs.*` 一致；FK 全部同 schema 内；pm 侧本就显式 `pm.*` |
  | `budgets` | finance 侧补 `finance.`（6 处） | 列集 `department_id/fiscal_year/total_budget` 仅 `finance.budgets` 有；`pm.budgets` 是项目预算（23 列） |
  | `suppliers` | scm/srm 各自补 `scm.`/`srm.`（7 处） | 两服务各有独立表与写入方（`sync_from_*` 同步列），不合并；两个 schema 都在各自 allow 内 |
  | `audit_logs` | unified-core 补 `public.`（11 处） | 该服务唯一审计写入方 `middleware/audit_log.rs` 写 `public.audit_logs`；其余 17 份副本**无写入方** |
  | `employees` / `departments` / `inventory` / `projects`（monitor） | **不修改** | 见下 |

**monitor 的 5 处为什么保留**（不是漏修）：

1. `metrics.rs#778/#879/#889/#899` 的 SQL 是**演示数据字符串**，`get_slow_queries` 等 handler
   取 `State(_state)` 但从不查库，SQL 文本不会被发送到任何连接。
2. monitor 的边界配置是 `schema=public, search_path=public, allow=[]`；显式 `hrm.`/`pm.`/`wms.`
   会被 `scripts/check_schema_boundary.py` 判为未授权跨 schema 而**硬失败**——加前缀属于
   「为了过静态扫描而塞入真实不允许的引用」，比保留裸表名更糟。
3. 既有 `schema_boundary.json#bare_ref_baseline` 已为 monitor 的这 4 个表名登记理由
   （「SQL 模板（监控规则配置），非 monitor 自身跨域直读」）。因此维持现状，由基线放行；
   若未来把它们改成可执行查询，正确做法是走对应服务接口/独立数据源，而不是在 monitor 内跨 schema。

> 注：`audit_logs` 的实际副本数（本地迁移库 18 个 schema）多于事实源的 8 个——
> `scripts/schema_boundary_tables.json` 生成于 2026-08-31，已滞后于迁移；判定以真实库为准。



### C.6 基线更新流程

1. 先按规则修 SQL（显式 `schema.table`），不要直接加基线；
2. 仅当"确实无法静态限定"（如动态表名）才 `node scripts/ci/check-schema-prefix.mjs --update-baseline`
   重生成基线；
3. `git diff` 必须只新增预期的 `文件::表名` 条目，`git add` 后随同一 commit 提交；
4. CI（`connection-governance` job）与 pre-commit 都会跑全量/增量校验，基线膨胀同样会进 review。
