# 数据库连接治理（A 全局预算 / B 单池 + ScopedConn）

> 状态：A 已实现并本地验证；B 设计完成，试点（search）与**批次 1**（subscription / monitor /
> plugin-registry）已完成并本地验证；剩余 25 个 svc 模块分 5 批（见 B.9）。
> 关联：`docs/database/database-primary-instance.md`、`plan` 第四十九轮连接排查。

## 0. 结论速览

| 项 | 改前 | 改后 |
| --- | --- | --- |
| 进程总连接上限 | 无（各池 `max_connections` 相加，生产理论 ≈ 496） | **≤ `DB_TOTAL_CONNECTION_BUDGET`（嵌入默认 = 池数 × 2 = 62）** |
| 生产实测峰值 | 73（`idle` 72，无 `idle in transaction`，稳定非泄漏） | 待重启后复测（代码层已硬性封顶） |
| 池实例数（嵌入模式） | 28 业务池 + 28 迁移池 + 1 个 ai 独立池（max 100 / min 10） | **28 业务池 + 1 共享迁移池 = 31**；ai 复用 bootstrap 池。批次 1 后：**27 业务池 + 1 共享运行时池 + 1 迁移池 = 29** |
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

- `DB_TOTAL_CONNECTION_BUDGET`：嵌入模式（topems-server）默认 = **推导池数 × 2**（当前 31 × 2 = **62**）；
  独立部署默认 `60`。
- 池数**不再手工配置**：由 `svc/server/src/main.rs::derived_db_pools()` 从模块 build 列表推导
  （规则见 A.6）。`DB_EXPECTED_POOLS` 降级为**一致性校验**：与推导值不一致时打印
  「配置值 vs 推导值」告警，并**采用推导值**。
- 例：嵌入模式 31 个池各申请 3 → 每池 2，Σ=62 = 预算 62，全部池拿得到额度。
- 负向：预算 61 → 公平份额降到 1，31 池各得 1（Σ=31）仍不耗尽；预算 30（= 池数 - 1）
  → 前 30 池各得 1，第 31 个池显式报额度不足（见 A.6）。
- 负向：把 `DB_MODULE_MAX_CONNECTIONS` 调到 50/1000，`grant` 仍被 `share` 与余额夹住。
- 不超 `max_connections=100`：62 为上限，PG 另有 3 条 superuser reserved，剩余约 35 条
  留给迁移/运维/其他进程，满足「含运维余量」。

### A.3 实现位置

| 位置 | 作用 |
| --- | --- |
| `lib/shared-db/src/database/budget.rs` | 账本 / 预约句柄 / 环境变量解析 / 池数配置 / 单测 |
| `svc/server/src/main.rs::derived_db_pools()` | 池数**唯一事实来源**：按模块 build 列表 cfg 推导（当前 31） |
| `svc/server/src/registry.rs` | 降级状态增加 `kind`（`budget` / `database` / `build`），健康检查可区分原因 |
| `lib/shared-db/src/database/mod.rs` `create_database_pool` | 建池前 `reserve_pool`，成功 `commit` |
| `lib/shared-db/src/database/mod.rs` `create_migrate_pool` | 迁移池改为**进程内单例**并计入预算（原每模块一个 max=3 池，最多额外 84 连接） |
| `lib/shared-bootstrap/src/lib.rs` V1 遗留建池路径 | 同预算，避免绕过 |
| `svc/ai/src/services/db.rs` / `svc/ai/src/main.rs` / `svc/server/src/modules/ai_real_module.rs` | 删除 ai 自建的 `max=100/min=10` 第二池，复用 bootstrap 池 |

### A.4 验证

- **单元测试**（`cargo test -p topems-shared-db --lib database::budget`，11 passed）：
  31 池 × 2 = 62 全部拿到额度；预算 30 / 31 池时第 31 池显式报
  `[db-budget-exhausted] 需要 1，剩余 0，预算 30`；预算 0 时首个池即失败且原因含「预算 0」；
  单池申请 1000 仍被预算卡住；40 池不超发；未 commit 的预约连续 3 轮归还且 allocated 不递减；
  `catch_unwind` 验证 panic 路径归还；30 线程并发预约 Σ ≤ 预算。
- **真实启动（默认配置，2026-11-06 实测）**：`derived=31`、预算 62、31 池全部 `granted=2`，
  `启动核对：推导 31，实际建池 31，降级 0，预算 62，已分配 62`；
  `/api/server/health` = 200 且 `degraded_count=0`，`/api/server/ready` = **200**。
- **预算 30（= 池数 - 1）实测**：第 31 个池（subscription）构建失败，
  日志 `ERROR [db-budget-exhausted] 池 business 额度不足：需要 3，剩余 0，预算 30，已分配 30`；
  degraded 项 `{"name":"subscription","kind":"budget","error":"...剩余 0，预算 30..."}`；
  `/health` 仍 200（`degraded_count=1`），`/ready` **503**。
- **预算 61（= 62 - 1）实测**：公平份额 `share=61/31=1`，31 池各得 1（Σ=31），
  无池耗尽、`/ready` 200。说明「少 1」若指少 1 条连接，只会降低每池并发，不会触发降级；
  触发额度不足的阈值是 `预算 < 池数`。
- **预算 0 实测**：所有池 `kind=budget` 降级（29 个池所属模块），
  原因均为 `[db-budget-exhausted] 需要 3，剩余 0，预算 0`；`/ready` 503。
- **`DB_EXPECTED_POOLS=30` 错配实测**：日志
  `WARN DB_EXPECTED_POOLS=30 与注册表推导值 31 不一致；采用推导值`，
  实际仍按 31 池 / 预算 62 启动，`/ready` 200。
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

- 预算在**进程首次建池时**读取环境变量（`main()` 已提前加载 dotenv，早于首个池）；
  调大/调小需重启。
- 成功创建的池会永久占用额度（池与进程同生命周期）；这是设计预期，避免重复建池时超发。
- `DB_EXPECTED_POOLS` 只做一致性校验，不再影响分配；**不要再用它手工对齐池数**。
  若模块数变化，更新 `derived_db_pools()`；启动末尾的「启动核对」日志会打印
  推导值 / 实际建池 / 降级数，偏差时告警。
- 预算耗尽时建池返回明确错误（`[db-budget-exhausted]`），模块构建失败并进入 degraded，
  不会静默超发、也不会静默少一个模块。

### A.6 池数推导与额度耗尽语义

**池数推导（唯一事实来源：`svc/server/src/main.rs` 的模块 build 列表）**

| 来源 | 计数（预算单位） |
| --- | --- |
| 每个 `*_real_module`（finance/erp/...，共 **23** 个未迁移的默认启用单池模块） | 各 +1 |
| 共享运行时池（monitor / plugin-registry / subscription 已迁移，合并为 **1 个物理池**） | +`SHARED_POOL_MODULE_WEIGHT`（当前 3） |
| `module-advanced`：master-data + analytics | +2 |
| `module-core`（unified-core）：自身 bootstrap + `build_router_embedded` 内部再次 bootstrap | +2 |
| 进程级共享迁移池（`create_migrate_pool` 单例，`MIGRATE_URL` 为空时不建） | +1 |
| `platform` / `dashboard`（纯聚合模块，不建池） | 显式排除 |
| **默认合计（预算单位）** | **31** |
| **默认物理池数（启动核对口径）** | **29** = 31 − (3 − 1) |

- 推导函数按 cfg feature 门控，与 build 列表**同源**；新增/移除模块必须同步修改。
- `derived_db_pools()` 返回**预算单位**；物理池数 = 预算单位 − (`SHARED_POOL_MODULE_WEIGHT` − 1)，
  启动核对按物理池数比较（`snapshot.physical_pools`）。
- 一致性校验：`DB_EXPECTED_POOLS` 与推导值不符 → 告警「配置值 vs 推导值」，采用推导值；
  启动末尾再用实际建池数核对（实际 > 推导 → 漏计告警；无降级却少于推导 → 未建池告警）。
- 默认预算 `31 × 2 = 62`：28 个普通物理池各得 2（56）+ 共享池按权重 3 得 6 = **62**，
  `/ready` = 200（批次 1 实测）。

**额度耗尽语义（fail-fast，不静默降级）**

- 单池申请失败 → `reserve_pool` 返回 `TopemsError::Database`，错误文本固定包含
  `[db-budget-exhausted] 数据库连接预算不足：池 <label> 需要 N，剩余 M，预算 B，已分配 A`。
- 该模块 `build()` 直接失败（不注册半成品模块），由 `note_degraded` 记入 degraded 列表：
  `kind=budget`，`error` 保留完整数字。
- 为什么允许进程继续启动：模块化单体的既有约定是「单模块失败不阻塞其它模块」，
  且必须保证 `/health` 与 `/ready` 可被观测；若进程直接退出，运维只能看到 crash
  而看不到具体是哪个池、缺多少额度。因此选择「该模块失败 + 进程继续 + `/ready` 503」。
- 必须失败的场景：数据库连不上 / DSN 错误时同样只降级该模块（`kind=database`），
  但 `/ready` 为 503；只要 DB 可达，预算不足不会拖垮全部模块以外的部分。
- **可区分性**：`kind=budget` 与 `kind=database` 写在 `/api/server/health` 与
  `/api/server/ready` 的 `degraded_modules[].kind`；日志前缀也不同
  （「因数据库连接预算不足降级」vs「构建失败（kind=database）」）。
- `DB_TOTAL_CONNECTION_BUDGET=0` 视为显式「预算耗尽」（不是未配置），所有池 fail-fast，
  `/ready` 503，原因含「预算 0」。

**`/ready` 接入 prod 探针的前置条件（待 prod 验证后方可接入）**

1. prod 按默认配置启动后，`/api/server/health` 200 且 `degraded_count=0`；
2. prod `/api/server/ready` 200 且无 `kind=budget` 降级；
3. 灰度观察一轮重启，确认 `启动核对` 日志中「实际建池 = 推导值」；
4. 满足以上三点后才可把 `/ready` 接入 k8s/负载均衡探针；在此之前**不接入**。

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
| 1（逐模块） | 每个模块：state 改 `Db`；handler 入参改 `&mut ScopedTxn`；删 `pool.acquire()` | 未迁移模块仍各自建池；已迁移模块（批次 1 起）共用 `shared-runtime` 物理池（见 B.9） |
| 2（封口） | `ModuleContext { db: PgPool }` 改为 `db: Db`；`create_database_pool` 返回类型改为 `Db`（不再对外暴露 `PgPool`） | **编译期堵死**：任何 `ctx.db` 当 `Executor`/`acquire()` 的写法直接 E0277/E0599，不靠约定 |
| 3（收尾） | 删除 `SEARCH_PATH` 会话级 `after_connect` 设置；CI 扫描 `SET `/`SET LOCAL`/`set_config(`/`.acquire()` | 会话级 search_path 彻底退出 |

运行期补充（阶段 1 起可用）：`Db::new` 打点 `service` + `search_path`；`scope` 首次使用时
在 `tracing::debug` 打印 `SHOW search_path`，便于抽样核对（不做强断言，避免生产噪音）。

### B.7 剩余工作量估算

统计口径：`grep -c "sqlx::query"`（每处 = 一个需要换 `Executor` 入参的调用点）。

- **已完成：3 / 28**（`svc/search` 13 处 SQL；`svc/monitor` 13 处；`svc/plugin-registry` 70 处）；
  另 `subscription`（server 内嵌模块，无独立 svc，不在 28 个 svc 清单内）已随批次 1 迁移；
- **剩余：25 个 svc 模块**（原 27 个减去 monitor / plugin-registry），累计约 6,000 处调用点；

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

**双路径共存实测（更正）**：试点模块 `search` 当时仍走自己的 `bootstrap_service` 池，
与会话级 `PgPool` 写法并存但**指向不同物理池**（A 只把进程总额封顶）；`search_path`
的作用域化只影响本模块自身事务，不改其他模块的会话基线。真正的物理池合并从批次 1
开始（3 个模块共 1 池，见 B.9），`search` 自身并池放到批 2 收口。

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

### B.9 批次进度与分批计划（批次 1 完成，2026-11-06）

#### B.9.1 风险排序依据（静态扫描，近似值）

| 维度 | 统计口径 | 为什么影响风险 |
| --- | --- | --- |
| SQL 调用点 | `sqlx::query*` 行数 | 决定改签名的面；>400 时 helper 层层传 `&mut ScopedTxn` 易漏 |
| 跨 schema 业务 JOIN | 同模块内出现 ≥2 个业务 schema 的限定引用 | `search_path` 只决定**未限定**表名；跨 schema 部分改作用域后仍按前缀解析，但事务/隔离语义更易出错 |
| 动态表名 | `format!` 拼 SQL 的行数 | 无法静态核对表名，落点只能靠运行期证据 |
| 会话级 `SET` | 生产代码 | 本次扫描生产代码 **0 处**；仅 `svc/ehs/tests`、`svc/qms/tests` 使用，迁移时改 `SET LOCAL` |
| schema 前缀固化率 | 限定引用 /（限定 + 裸 `FROM`） | 固化率越低，行为越依赖 `search_path`，越不能动原有路径顺序 |

#### B.9.2 已完成批次

| 批次 | 模块 | 原 `SEARCH_PATH` | SQL 点 | 风险备注 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 0 | `search` | `public` | 13 | 试点；代码已迁 `Db`，但**仍自建池**，批 2 并池收口 | 代码完成 |
| 1 | `subscription`（server 内嵌，无独立 svc） | `public` | 3 | 仅 1 张表、无 JOIN、无动态 SQL | 完成 |
| 1 | `monitor` | `public` | 13 | 单 schema、无动态 SQL、2 处 JOIN 均同 schema | 完成 |
| 1 | `plugin-registry` | `public` | 70 | 单 schema（`core` 已显式前缀）、无动态 SQL | 完成 |

批次 1 的 3 个模块统一走 `bootstrap_service_shared` + `Db::new(ctx.db.clone(), "public")`，
不再各自 `bootstrap_service`；三者合计 **3 个物理池 → 1 个 `shared-runtime` 池**。

#### B.9.3 剩余 25 个 svc 模块分批计划（5 批，每批 5 个，风险由低到高）

| 批次 | 模块（SQL 点 / 动态 SQL / 前缀固化率 / 跨 schema） | 选入理由 |
| --- | --- | --- |
| 2（最低） | `tms`(76/0/96%)、`ticket`(102/0/97%)、`gis`(140/0/97%)、`pm`(194/0/95%)、`mobile`(192/0/100%) | 单业务 schema、0 动态 SQL、前缀固化 ≥95%；`mobile` 全限定但需先显式声明 `SEARCH_PATH`（见 B.9.4） |
| 3 | `portal`(37/5/48%)、`pdm`(163/0/7%)、`integration`(174/0/80%)、`ai`(157/1/89%，→`core`)、`communication`(120/13/31%，→`iam`) | SQL 少但依赖裸表名或动态 SQL；`portal` 嵌入路径顺序特殊；`ai`/`communication` 首次出现跨 schema |
| 4 | `rd`(206/2/93%，`rs`/`rd` 双 schema)、`ehs`(261/0/96%)、`lims`(264/1/51%)、`scm`(261/7/97%)、`hrm`(240/0/100%，→`iam`) | 中量 SQL + 裸表名/跨 schema/动态 SQL 混合；`rd` 需先确认 `rs` 与 `rd` 的实际落点 |
| 5 | `srm`(233/0/98%，→`unified_core`)、`crm`(286/0/95%，→`erp`)、`qms`(333/13/93%)、`master-data`(382/2/98%)、`wms`(462/0/~100%，→`scm`/`unified_core`) | 跨 schema JOIN 增多、体量上升；`crm`/`erp` 互相引用需成对验证 |
| 6（最高） | `analytics`(212/32/32%，7 schema)、`mes`(603/7/68%)、`erp`(445/1/82%，→`crm`/`finance`)、`finance`(715/4/79%，→`erp`)、`unified-core`(677/5/67%，7 schema/124 JOIN) | 动态 SQL 或裸表名占比最高、跨 schema 最复杂；`finance`/`erp`/`unified-core` 必须走 `scope_with` 复用请求 RLS 事务 |
| 批 2 附加 | `search` 并池收口 | 代码已迁 `Db`，仅需把 `bootstrap_service` 换成 `bootstrap_service_shared`，物理池 −1 |

剩余批次：**5 批**（批 2–批 6）；若批 5/6 出现回归问题，可再按模块拆分，不改变风险排序。

#### B.9.4 原 `SEARCH_PATH` 与 schema 归属核对（不一致清单）

扫描口径：嵌入形态取 `svc/server/src/modules/*_real_module.rs` 中 `SEARCH_PATH` /
`Db::new` 实参；独立部署取 `svc/*/src/main.rs`。**本批未连 prod**（无 prod 只读凭据），
prod 归属核对为批 2 前置项；本地库 `information_schema.schemata` 已全量比对。

| 模块 | 嵌入形态 | 独立部署 | 核对结论 / 处理 |
| --- | --- | --- | --- |
| `portal` | `public, portal` | `portal, public, shared` | **顺序相反**（嵌入 public 优先）。按各自形态保留原值，禁止统一为 `portal, public` |
| `mobile` | **未设置**（继承 `.env` `iam,shared,public`） | `mobile, public, shared` | 嵌入实际 `iam` 优先，与独立部署不一致；其 SQL 100% 带前缀，影响面小，批 2 先显式声明为 `iam,shared,public` 再迁移 |
| `tms` | `tms, public` | `tms, public, shared` | 嵌入缺 `shared`；保留嵌入原值 |
| `ticket` | `ticket, public` | `ticket, public, shared` | 同上 |
| `gis` | `gis, public` | `gis, public, shared` | 同上 |
| `pdm` | `pdm, public` | `pdm, public, shared` | 同上（且裸表名 93%，路径顺序不可动） |
| `lims` | `lims, public` | `lims, public, shared` | 同上 |
| `ehs` | `ehs, public` | `ehs, public, shared` | 同上 |
| `erp` | `erp, public` | `erp, public, shared` | 同上 |
| `finance` | `finance, public` | `finance, public, shared` | 同上 |
| `ai` | `ai, public` | `ai, public, shared` | 同上 |
| `communication` | `communication, public` | `communication, public, shared` | 同上 |
| `analytics` | `bi, public` | `bi, public, shared` | 同上；schema 名为 `bi` 而非 `analytics` |
| `rd` | `rs, public` | `rs, public` | 两者一致，但本地库同时存在 `rd` 与 `rs`，静态扫描两 schema 都有引用 → 批 4 前须确认表实际落点 |
| `integration` | `integration, public` | `integration, public` | 一致 |
| `unified-core` | `public` | `public` | 一致（`core`/`iam`/`flow` 均显式前缀） |
| `crm`/`hrm`/`scm`/`pm`/`wms`/`srm`/`master-data` | `…, public, shared` | `…, public, shared` | 一致 |
| `monitor`/`plugin-registry`/`subscription` | `public` | `public`（或仅嵌入） | 一致（批次 1） |

本地库 schema 清单已覆盖所有首 schema（`ai/bi/communication/crm/ehs/erp/finance/gis/hrm/
integration/lims/master_data/mes/mobile/pdm/pm/portal/qms/rd/rs/scm/srm/ticket/tms/wms/
unified_core/core/public`），无缺失。**prod 归属未在本批核对**，不得默认与本地一致。

#### B.9.5 批次 1 验收结果

**池数与预算（真实启动，默认配置）**

- 物理池 **31 → 29**（3 个模块合并为 1 个 `shared-runtime` 池，−2）；预算单位仍 31（共享池按权重 3 参与公平分摊）。
- 启动日志：`shared-runtime 预约额度 granted=6/9（权重 3）`；末尾
  `启动核对：注册表推导 31 预算单位（物理池 29），实际建池 29，降级 0，预算 62，已分配 62`。
- 默认预算自洽：28 个非共享物理池 × 2 = 56 + 共享池 6 = **62**；`/api/server/health` 200（`degraded=0`），`/api/server/ready` **200**。

**端点与落点（真实请求，本地 8099）**

| 模块 | 请求 | 结果 | 落点证据（psql 实测） |
| --- | --- | --- | --- |
| monitor | `GET /api/monitor/settings` | 200，返回 `batch1_probe`/`batch1_run3` | `public.monitor_settings`（tenant 1，更新于 05:49:52） |
| monitor | `PUT /api/monitor/settings`（batch_update） | 200，`{"updated":1,...}` | 同上，`updated_at` 前进 |
| subscription | `POST /api/subscriptions`（upsert） | 200 | `public.subscriptions` tenant 1 `advanced/active`，更新于 05:49:52 |
| subscription | `GET /api/subscriptions/current`（tenant A / B） | 200：A=`advanced`，B=`free`/`none` | 显式 `tenant_id` 谓词隔离生效 |
| plugin-registry | `GET /api/plugin/marketplace` | 200，36 个插件 | — |
| plugin-registry | `POST /api/plugin/runtime/ai/unregister` | 200 | `core.core_plugin_instances` 该插件 `runtime_status=stopped`、`stopped_at` 非空 |

三个模块均在 `search_path=public` 下运行（原值），`current_schema()` 实测为 `public`（
`lib/shared-db/tests/scope_search_path_it.rs` 3 passed，含 `SHOW search_path = public`、
commit/rollback 后恢复基线、`scope_with` 复用请求事务时 `app.tenant_id` 保留）。
**租户隔离说明**：这 3 个模块改造前就是「池 autocommit + 显式 `tenant_id` 谓词」，
不走请求级 RLS 事务；改造后语义不变，隔离由双租户实测证明。`scope_with` 路径的
`app.tenant_id` 保真由上述集成测试覆盖（批 6 的 RLS 模块将直接复用该路径）。

**连接占用（270 个并发请求，3 轮 × 90）**

- 请求全部 200（270/270）；`pg_stat_activity` 采样总连接 **8–9**（空闲模块池已按 `idle_timeout` 回收），
  `topems-shared-runtime` 峰值 **2** 条（1 active + 1 idle），远低于 grant 6。
- 说明：并发 90 未把共享池压满，故未触发排队；上限由池 `max=6` 与预算双重约束。

**回归**：`cargo check --workspace`、`cargo clippy --workspace --all-targets -- -D warnings` 通过；
单测 `topems-shared-db --lib` 176、`topems-monitor --lib` 140、`topems-plugin-registry --lib` 249
全部通过；`scope_search_path_it` 3 passed。

**白名单**：批次 1 **未新增绕过项**，3 个模块的全部 SQL 都经 `Db::scope`/`scope_read`；
唯一保留的 `PgPool` 入参是 `tenant_middleware`（需要 `begin` 请求事务，设计内，见 B.8）。
C.4 的既有 5 项白名单未变。

**本批遗留风险**

1. `search` 仍自建池（批 2 收口），当前物理池 29 中仍含它。
2. `mobile` 嵌入形态未声明 `SEARCH_PATH`，现依赖 `.env` 的 `iam,shared,public`；批 2 必须先固化再迁移。
3. `portal` 嵌入/独立路径顺序相反、`rd` 的 `rs`/`rd` 双 schema、多处嵌入缺 `shared`，
   均需按 B.9.4 逐模块确认，不能套用 `public`。
4. 本批未连 prod 核对 schema 归属；批 2 开始前需用 prod 只读账号跑一次 `information_schema` 比对。
5. 若批 2 把 `search` 并入共享池：需同时把 `SHARED_POOL_MODULE_WEIGHT` 改为 4、从
   `derived_db_pools()` 去掉 `search` 的 `+1`。届时预算单位仍 31、物理池降为 28、
   共享池 grant = (62/28).max(1) × 4 = 8（27 个非共享池 × 2 + 8 = 62），否则会出现
   「池数降了但预算分配仍按旧 weight」的不自洽。

### B.10 批次前置：search_path 归属核对（2026-11-06，仅核对不改代码）

#### B.10.1 证据来源与限制

| 证据 | 来源 | 性质 |
| --- | --- | --- |
| prod 表存在性 / 列结构 | `database/baseline/prod_schema_20261105235700.sql.gz`（prod `pg_dump`，2026-11-05 23:57） | **prod 快照**，非本地库 |
| prod 活数据（行数 / 最近写入） | SSH `xingzhai@192.168.110.115` → 远端 `/opt/homebrew/bin/psql -d topems_prod`，仅 `SELECT`（2026-11-06 06:40 CST） | **prod 实测** |
| prod 运行形态 | 远端 `launchctl list` / `ps aux` / plist `EnvironmentVariables` / `pg_stat_activity`（同上时刻） | **prod 实测** |
| 代码引用的表 | 仓库 SQL 字符串静态扫描（`FROM/JOIN/INSERT INTO/UPDATE/DELETE FROM`），按各模块嵌入路径解析 | 代码事实 |

**访问方式（修正）**：prod PostgreSQL 只监听 `localhost:5432`，不对内网开放，因此 `pg_isready 192.168.110.115:5432` 必然无响应——这不等于不可达。
既有做法是 SSH 到 prod 主机后在本机用 psql 连接（也可用 `ssh -L 15432:127.0.0.1:5432` 隧道）；凭据来自 launchd plist 的内联 `DATABASE_URL`，不是仓库内的 DSN。
本轮按此执行：**仅 `SELECT` / `information_schema` / `pg_catalog`，未执行任何 DDL/DML，未重启、未部署**。本地库未参与本轮结论。

**prod 运行形态实测**：

- `launchctl list` 仅 `com.topems.server`（PID 1243），进程为 `/Users/xingzhai/topems/bin/topems-server`；无独立 portal / lims / analytics 进程，nginx 与 vite 除外。
- plist `EnvironmentVariables`：`SEARCH_PATH = flow, mobile, rs, erp, public, iam, shared`、`DATABASE_URL` 指向 `localhost:5432/topems_prod`、`DB_MAX_CONNECTIONS = 8`。
  → 该基线**不含 `portal`**，portal 模块的裸 `core_*` 只能落到 `public`，与 B.10.5 的实测行数一致。
- `pg_stat_activity`：76 个 client backend 全部来自 `::1`（同一进程），但 **`application_name` 全部为空**——prod 运行的二进制早于批 1 的命名下发，无法按模块归因；
  “单一聚合形态”由进程清单与 plist 证明，不依赖 `application_name`。

#### B.10.2 逐模块核对结果（19 个，已去重）

| 模块 | 原嵌入路径 | 原独立路径 | prod 归属（代码实际读写的表） | 建议固化值 | 会改变解析？ | 风险 / 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| subscription | `public` | `public` | `public.subscriptions` | `public` | 否 | 一致 |
| monitor | `public` | `public` | `public.alerts` / `monitor_settings` / `monitor_thresholds` | `public` | 否 | 裸表为远端模块 SQL 模板，不在本库执行 |
| plugin-registry | `public` | `public` | `core.core_plugin_*`（8 张全限定） | `public` | 否 | 全部 `core.` 限定；`schema_boundary.json` 的 `core, public` 仅为门禁配置，非运行值 |
| search | `public`（`Db::new`） | `public` | `public.search_entity_projections`、`iam.users`、裸 `core_files`→`public.core_files` | `public` | 否 | `iam.core_files` 为 prod-only（迁移链未回放）；[handlers.rs#L211](../../svc/search/src/handlers.rs#L211) 已注明归属 public |
| tms | `tms, public` | `tms, public, shared` | `tms.tms_*`（5）+ 裸 `vehicles`→`public.vehicles` | `tms, public` | 否（prod 不变；独立去 shared 无差异） | [main.rs#L124](../../svc/tms/src/main.rs#L124) 预热查 `vehicles`，而业务表是 `tms.tms_vehicles`，需确认是否有意 |
| ticket | `ticket, public` | `ticket, public, shared` | `ticket.*`（7） | `ticket, public` | 否 | `sla` 命中为注释，非表 |
| gis | `gis, public` | `gis, public, shared` | `gis.*`（19）+ `gis.gis_map_markers` | `gis, public` | 否 | 单 schema |
| pm | `pm, public, shared` | `pm, public, shared` | `pm.*`（34）+ `pm.pm_budget_items`/`pm_tasks` | `pm, public, shared` | 否 | 一致 |
| mobile | **未声明**（继承进程 env） | `mobile, public, shared` | `mobile.*`（24 张，**全部限定**） | `mobile, public, shared` | 否 | 嵌入态实际基线随构建顺序变化（prod 聚合 `flow,mobile,rs,erp,public,iam,shared`）；全限定故当前无影响，但需显式固化 |
| portal | `public, portal` | `portal, public, shared` | 裸 `core_faqs`/`core_guides`/`core_guide_lessons`→**public**（活数据 12/12 行）；`portal.portal_todos/quick_actions/announcements/user_preferences` 空表 | `public, portal`（两种形态统一） | **是（仅独立形态）** | prod 实测：`public` 是活数据（12 条 FAQ + 12 条指南，均非空业务列，2026-10-26 写入）；`portal` 与 `iam` 副本 **0 行**（空壳）。嵌入写 public 与 prod 一致；独立 `portal, public` 会读到空表 |
| pdm | `pdm, public` | `pdm, public, shared` | `pdm.*`（19）+ 裸 `pdm_products`/`pdm_materials`/`pdm_change_notices`→**pdm** | `pdm, public` | 否 | `public.pdm_products` 列不同（`name/code` vs `product_no/version`），**不是同一模型**，不可合并 |
| lims | `lims, public` | `lims, public, shared` | `lims.*` + `public.qa_lab_*`（显式）+ 裸 `qa_lab_*`→**lims** | `lims, public` | 否（路径不变） | **模块内已分裂**：裸写 `qa_lab_instruments`→lims；[inspection_task.rs#L229](../../svc/lims/src/modules/inspection_task.rs#L229) 显式写 `public.qa_lab_records`，[inspection_record.rs#L130](../../svc/lims/src/modules/inspection_record.rs#L130) 裸写→lims；统计读 `public.qa_lab_instruments`。**prod 实测两侧全为 0 行**（见 B.10.5.2），分裂仅存于代码 |
| ehs | `ehs, public` | `ehs, public, shared` | `ehs.*`（36 张全限定） | `ehs, public` | 否 | 裸表命中均为别名/注释；`schema_boundary.json` 记 `schema=public` 已过时 |
| erp | `erp, public` | `erp, public, shared` | `erp.*`（32）+ 显式 `crm.core_crm_customers`/`finance.core_finance_accounts`/`public.audit_logs`；裸 `announcements`/`vehicles`/`meeting_*`→erp | `erp, public` | 否 | 裸同名表 erp/public 并存，erp 优先是既有语义 |
| finance | `finance, public` | `finance, public, shared` | `finance.*`（约 68）+ 显式 `erp.opening_balances`；裸 `payables`/`receivables`/`expenses`→**finance** | `finance, public` | 否 | 写入方为 finance（[operational.rs#L1055](../../svc/finance/src/modules/operational.rs#L1055)）；erp 另有同名副本，二者独立 |
| ai | `ai, public` | `ai, public, shared` | `ai.*`（11）+ `core.*`（6）+ `public.audit_logs` | `ai, public` | 否 | 裸 `FROM users` 只出现在注入测试/示例串，非真实查询；`schema_boundary.json` 的 `ai_service` 已过时 |
| communication | `communication, public` | `communication, public, shared` | `communication.core_notifications/templates/geofences`（裸写）+ `public.core_emails` + `iam.users` + 裸 `core_users`→**public.core_users** | `communication, public` | 否 | **身份源两套**：显式 `iam.users` 与裸 `public.core_users` 并存。prod 实测 `iam.users` **5 行且今日仍在更新**，`public.core_users` **0 行** → `iam.users` 为权威；`core_notifications`/`core_emails` 两侧均 0 行 |
| analytics | `bi, public` | `bi, public, shared` | 裸 `analytics_*`→**bi**（写入）；显式 `analytics.report_execution_records`（写入）；裸 `core_users/roles`→public | `bi, public` | 否 | 双表：`bi.report_execution_records` 无人使用（重复）；`public.core_roles` 由 unified-core 写；`iam.users` 另存。**prod 实测 `bi` 与 `analytics` 两侧相关表全为 0 行**（B.10.5.3），该模块 prod 从未产生数据 |
| rd | `rs, public` | `rs, public` | `rs.*`（16）+ 显式 `rd.bugs` | `rs, rd, public` | 否（当前无裸 `bugs`） | `rs` 是权威业务 schema；`rd` schema 仅 4 张表，`bugs` 由其承载（[rd_ci_cd.rs#L202](../../svc/rd/src/rd_ci_cd.rs#L202)） |

#### B.10.3 差异清单（会改变行为的逐条说明）

1. **portal（唯一会改变解析的模块）**：3 张裸表 `core_faqs`/`core_guides`/`core_guide_lessons` 在 `iam`、`portal`、`public` 三处都存在。
   嵌入 `public, portal` → public；独立 `portal, public, shared` → portal。prod 实测 **public 12/12 行（活）**，`portal` 与 `iam` 均 **0 行**。
   统一为 `public, portal` 后：prod 不变；独立部署会把读写从空壳 `portal` 切到有数据的 `public`，**方向是“空 → 活”，不需要搬数据**（详见 B.10.5.5）。
2. **`shared` 缺失（tms/ticket/gis/pdm/lims/ehs/erp/finance/ai/communication/analytics）**：prod `shared` 只有 `audit_logs`，而这些模块都没有裸查 `audit_logs`（erp/finance/analytics 用的是显式 `public.audit_logs`）。**去掉 `shared` 不改变任何解析**，属纯配置收敛。
3. **mobile 未声明**：嵌入态没有模块级 `SEARCH_PATH`，基线取决于前面模块对进程 env 的覆盖（prod 聚合为 `flow,mobile,rs,erp,public,iam,shared`），独立态为 `mobile, public, shared`。因 24 张表全部 `mobile.*` 限定，**当前解析不受影响**；但这是顺序依赖隐患，批 2 必须显式固化。
4. **rd / rs 落点（明确结论）**：**`rs` 是权威**（16 张 `rs.*` 全限定 + 裸 `rs_*` 解析到 rs）；**`rd` 只承载 `bugs`**（4 张表，代码仅一处显式读）。建议 `rs, rd, public`：`rs` 优先保证既有解析，`rd` 仅作补充；当前没有裸 `bugs`，所以**不改变现有结果**。
5. **lims 的内部裂开（不是路径问题）**：`qa_lab_instruments` 写在 `lims`，但部分查询显式读 `public.qa_lab_instruments`；`qa_lab_records` 同一模块内一处写 `public.`、一处写裸名（→lims）。
   prod 实测 **两侧全部 0 行**（`public.qa_lab_*` 11 张、`lims.qa_lab_*` 9 张，`qa_lab_samples`/`qa_lab_tasks` 仅 public 存在），说明 prod 从未产生 lims 数据，
   分裂只是代码隐患而非数据分裂。批 4 前统一前缀即可，**无需数据合并**。
6. **analytics 双表**：`bi.analytics_dashboards` 等由裸名写入（权威）；`analytics.report_execution_records` 由显式写入（权威）；`bi.report_execution_records` 无任何引用（重复表）。
   prod 实测 `bi.report_execution_records`、`analytics.report_execution_records` 以及两侧 `analytics_*` 均为 **0 行**，故“取舍”是纯代码/迁移清理，无数据风险。
7. **communication / analytics 的身份源**：`iam.users`（显式）与 `public.core_users`（裸名）并存。prod 实测 **`iam.users` 5 行（今日 05:27 仍在更新，全部 active）、`public.core_users` 0 行、`iam.core_users` 0 行** → **`iam.users` 是唯一活的身份源**，`public.core_users` 是空壳。
   角色数据落 `public.core_roles`（15 行）/`public.core_role_permissions`（653 行），`iam.core_roles` 为 0 行——身份与角色分属两处，路径保持现状即可，代码侧应把裸 `core_users` 改为显式 `iam.users`。

#### B.10.4 先修配置 vs 先修代码

| 类别 | 模块 | 动作 |
| --- | --- | --- |
| **先修配置**（仅固化路径，无 SQL 改动） | tms、ticket、gis、pm、mobile、ehs、erp、finance、ai、communication、analytics、pdm、lims、rd | 把路径写死到 `Db::new`；停止 `std::env::set_var("SEARCH_PATH", …)` 的进程级突变（B 的 `SET LOCAL` 已按作用域生效） |
| **先修代码**（路径解决不了） | lims（前缀统一）、analytics（重复表取舍）、communication（裸 `core_users`→`iam.users`）、tms（`vehicles` 是否应为 `tms.tms_vehicles`）、portal 独立形态（注释标注 `portal.core_*` 废弃） | 各自排入所属批次前置；不得用改 search_path 掩盖 |
| ~~必须先补 prod 凭据~~ | ~~portal、lims、analytics、communication~~ | 已于 2026-11-06 经 SSH 只读实测补齐，结论见 B.10.5 |

#### B.10.5 活数据实测结论（prod 只读，2026-11-06 06:40 CST）

> 来源：SSH `xingzhai@192.168.110.115` → 本机 `/opt/homebrew/bin/psql -d topems_prod`，仅 `SELECT`；**不是本地库**。
> 原“待确认”5 项已全部关闭。

##### B.10.5.1 portal（`core_faqs` / `core_guides` / `core_guide_lessons`）

| 表 | 行数 | `max(updated_at)` | 非空业务列 | tenant 数 |
| --- | --: | --- | --: | --: |
| `public.core_faqs` | **12** | 2026-10-26 14:19:13.94399+08 | 12（question+answer 均非空） | 1 |
| `public.core_guides` | **12** | 2026-10-26 14:19:13.946214+08 | 12（title 非空） | 1 |
| `portal.core_faqs` / `core_guides` | **0** / **0** | — | 0 | — |
| `iam.core_faqs` / `core_guides` | **0** / **0** | — | 0 | — |
| `public.core_guide_lessons` / `portal.*` / `iam.*` | 0 / 0 / 0 | — | 0 | — |
| `portal.portal_todos` / `quick_actions` / `announcements` / `user_preferences` / `health_checks` / `dashboard_stats` / `federation_transactions` | **全部 0** | — | — | — |

判定：**`public` 是唯一活副本；`portal` 与 `iam` 的 `core_*` 是空壳**。prod plist 的 `SEARCH_PATH` 不含 `portal`，与“写入落在 public”完全吻合。

##### B.10.5.2 lims（`public.qa_lab_*` vs `lims.qa_lab_*`）

| 表 | public 行数 | lims 行数 |
| --- | --: | --: |
| `qa_lab_records` | 0 | 0 |
| `qa_lab_instruments` | 0 | 0 |
| `qa_lab_calibration_records` | 0 | 0 |
| `qa_lab_inspection_reports` | 0 | 0 |
| `qa_lab_processes` | 0 | 0 |
| `qa_lab_reagents` / `reagent_alerts` / `reagent_history` / `sample_lifecycle` | 各 0 | 各 0 |
| `qa_lab_samples` / `qa_lab_tasks` | 0 / 0 | **不存在**（仅 public） |

判定：**不是并行双写，是两侧全空**。代码里 `public.` 与裸名并存确实存在，但 prod 从未写入 lims 业务；结构差异仍在（`lims.qa_lab_instruments` 15 列含 `name_en`/`organization_id`，`lims.qa_lab_records` 含 `organization_id`，public 为 13/9 列），但无数据可合并。

##### B.10.5.3 analytics（`bi` 双表）

| 表 | 行数 | 最近写入 |
| --- | --: | --- |
| `bi.report_execution_records` | **0** | 无（`started_at`/`completed_at` 全空） |
| `analytics.report_execution_records` | **0** | 无 |
| `bi.analytics_dashboards` / `datasets` / `self_service_reports` / `sync_records` | 各 0 | 无 |
| `analytics.analytics_dashboards` / `datasets` / `self_service_reports` / `sync_records` | 各 0 | 无 |

判定：**`bi.report_execution_records` 从未被写入**，与“无任何代码引用”一致，属可直接下线的重复表；`analytics.*` 侧同样为空，说明 prod 未使用该模块。

##### B.10.5.4 communication 身份源

| 表 | 行数 | `max(updated_at)` | 活跃行 |
| --- | --: | --- | --: |
| `iam.users` | **5** | **2026-11-06 05:27:44.38938+08** | 5（`is_active`） |
| `public.core_users` | **0** | — | 0 |
| `iam.core_users` | **0** | — | 0 |
| `public.core_roles` / `core_role_permissions` | 15 / 653 | — | — |
| `iam.core_roles` / `core_role_permissions` | 0 / 0 | — | — |
| `communication.core_notifications` / `public.core_notifications` | 0 / 0 | — | — |
| `communication.core_emails` / `public.core_emails` | 0 / 0 | — | — |

判定：**`iam.users` 是唯一权威身份源**（prod 仍在写入）；`public.core_users` 空壳。角色/权限仍在 `public`，身份与角色分属两个 schema，属既有设计，不要合并。

##### B.10.5.5 portal 处置建议（推荐：认定 `portal` 副本废弃，不搬数据）

**推荐做法**：把 portal 模块的固化值统一为 **`public, portal`**；`portal` schema 内的 4 张 `core_*` 保留空表但标注废弃（代码注释 + 本文档 + 后续迁移不引用），**不做反向数据迁移**。

理由：

1. 方向只能是 `portal → public`（`portal` 0 行），而 0 行没有可搬的数据；搬数据等于空操作。
2. prod 已长期以 `public` 为活数据（12 条 FAQ / 12 条指南，2026-10-26 写入，租户 1）；固化 `public, portal` 与 prod 现状**完全一致**，不改变任何 prod 解析。
3. `portal.portal_*`（todos/quick_actions/announcements/user_preferences 等）在 `public` 没有同名表，仍由第二顺位 `portal` 承载，功能不受影响。
4. 独立部署若继续用 `portal, public, shared`，会在空表上读写并与 prod 数据分叉；统一后独立部署第一次启动就能看到 prod 的 12+12 条数据。

影响面：仅 portal 模块的 `core_faqs`/`core_guides`/`core_guide_lessons`/`core_guide_progress` 4 张表；无数据丢失（源为空），无 schema 变更（不 DROP），`iam.core_*` 空壳同样不删。
后续若要彻底清理，可在独立迁移中 `DROP TABLE portal.core_*`（需另行评审，本轮不做 DDL）。

#### B.10.6 批 2 前置结论

- **19 个模块的固化值可以全部落地**：prod 解析结果除“独立 portal 形态”外全部不变；该形态的变化已证明是“空 → 活”，无数据风险。
- **批 2 可以开始**：5 个模块（tms/ticket/gis/pm/mobile）+ search 并池按 B.10.2 执行。
- `mobile` 必须显式声明 `mobile, public, shared`，不得继续依赖进程 env。
- `tms` 固化值必须保留 `public`（否则 `main.rs#L124` 的裸 `vehicles` 会解析失败/改变）；`vehicles` 选表问题仍列为批 2 前置代码项（需确认预热是否有意读 `public.vehicles`）。
- `search` 并池同时把 `SHARED_POOL_MODULE_WEIGHT` 改 4、`derived_db_pools()` 去掉 search 的 `+1`。
- **仍需改代码、但不阻塞批 2 的项**：见下表。

| 项 | 模块 | 批 | prod 实测依据 |
| --- | --- | --- | --- |
| 前缀统一（`public.` 与裸名并存） | lims | 批 4 | 两侧 0 行，改前缀无数据影响 |
| 重复表取舍（`bi.report_execution_records` 无引用） | analytics | 批 6 | 0 行，无写入 |
| 裸 `core_users` → 显式 `iam.users` | communication | 批 3 | `iam.users` 5 行活 / `public.core_users` 0 行 |
| `portal.core_*` 标注废弃 + 固化 `public, portal` | portal | 批 3 | `portal` 0 行、`public` 12+12 行 |
| `vehicles` 选表确认 | tms | 批 2 | 未实测（需业务确认） |

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
