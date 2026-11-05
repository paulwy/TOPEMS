# 数据库连接治理（A 全局预算 / B 单池 + ScopedConn）

> 状态：A 已实现并本地验证；B 设计完成、试点进行中。
> 关联：`docs/database/database-primary-instance.md`、`plan` 第四十九轮连接排查。

## 0. 结论速览

| 项 | 改前 | 改后 |
| --- | --- | --- |
| 进程总连接上限 | 无（各池 `max_connections` 相加，生产理论 ≈ 496） | **≤ `DB_TOTAL_CONNECTION_BUDGET`（默认 60）** |
| 生产实测峰值 | 73（`idle` 72，无 `idle in transaction`，稳定非泄漏） | 待重启后复测（代码层已硬性封顶） |
| 池实例数（嵌入模式） | 27 业务池 + 27 迁移池 + 1 个 ai 独立池（max 100 / min 10） | 27 业务池 + **1 个共享迁移池**；ai 复用 bootstrap 池 |
| application_name | 空（无法按模块归因） | 每池可区分（`DB_APPLICATION_NAME` / `TOPEMS_SERVICE_NAME`） |

A 的改动**需要重启服务才生效**；本次未重启、未部署 prod。

## A. 全局连接预算

### A.1 目标与取舍

**目标**：任何情况下，单进程对同一数据库的总连接数 ≤ 预算。预算只做**总额天花板**，
不替代 `DB_MODULE_MAX_CONNECTIONS` / `DB_MODULE_MIN_CONNECTIONS`：单池仍按自身配置申请，
建池时再被预算裁剪，所以 `Σ(各池 max_connections) ≤ 预算`，而每池实际连接 ≤ 该池 max。

**为什么不用 acquire 级信号量**：业务代码把 `PgPool` 直接当 `sqlx::Executor` 用，并大量
`pool.acquire()`；进程内没有统一的取连接拦截点。若在 acquire 层加信号量，需要把 `PgPool`
换成自定义 newtype 并改动 27 个模块的签名与调用点，风险高，且 early-return / panic 漏还
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
- `DB_EXPECTED_POOLS`：默认嵌入模式 28（27 个 real_module + 1 个共享迁移池）、独立部署 2
  （业务池 + 迁移池）。用于公平分摊，避免「先建池的吃光预算、后建池拿不到连接」。
- 例：嵌入模式 27 个业务池各申请 3 → 每池 2，Σ=54；共享迁移池再拿 2 → Σ=56 ≤ 60。
- 负向：把 `DB_MODULE_MAX_CONNECTIONS` 调到 50/1000，`grant` 仍被 `share` 与余额夹住。

### A.3 实现位置

| 位置 | 作用 |
| --- | --- |
| `lib/shared-db/src/database/budget.rs` | 账本 / 预约句柄 / 环境变量解析 / 单测 |
| `lib/shared-db/src/database/mod.rs` `create_database_pool` | 建池前 `reserve_pool`，成功 `commit` |
| `lib/shared-db/src/database/mod.rs` `create_migrate_pool` | 迁移池改为**进程内单例**并计入预算（原每模块一个 max=3 池，最多额外 81 连接） |
| `lib/shared-bootstrap/src/lib.rs` V1 遗留建池路径 | 同预算，避免绕过 |
| `svc/ai/src/services/db.rs` / `svc/ai/src/main.rs` / `svc/server/src/modules/ai_real_module.rs` | 删除 ai 自建的 `max=100/min=10` 第二池，复用 bootstrap 池 |

### A.4 验证

- **单元测试**（`cargo test -p topems-shared-db --lib database::budget`，8 passed）：
  27 池 Σ=54 ≤ 60；单池申请 1000 仍被预算卡住；40 池不超发；未 commit 的预约连续 3 轮
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
