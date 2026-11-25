# 运行期 DDL 收敛计划（属主治理配套）

> 背景：`topems_app` 只在 `public, erp, finance, master_data, hrm` 保留 `CREATE`（见
> `docs/database/role-ownership.md`）。运行期建表越少，能收回的 schema 越多，属主漂移面越小。
> 现状冻结已生效：`scripts/ci/check-runtime-ddl.mjs`（基线 `scripts/ci/runtime-ddl-baseline.json`，
> 10 文件 / ddl=22，只减不增）已在 CI 跑。本文件只排改造顺序，不改代码。

## 1. 存量盘点（`svc/*/src` + `lib/*/src`，含 `src/tests`）

| 文件 | CREATE 语句数 | 性质 |
| --- | --- | --- |
| `svc/erp/src/modules/consolidation/elimination_flow.rs` | 10 | 请求链路自愈（合并抵消流程） |
| `lib/shared-db/src/audit.rs` | 7 | 全局审计表兜底 |
| `svc/finance/src/modules/forecast_v53.rs` | 4 | 请求链路自愈（v53 预测表） |
| `svc/unified-core/src/modules/tenant/handlers.rs` | 3 | 建 `hrm.companies` 等 |
| `svc/erp/src/modules/consolidation/common.rs` | 3 | 请求链路自愈 |
| `svc/erp/src/event_handlers/mod.rs` | 3 | 事件处理自愈 |
| `svc/crm/src/event_handlers/mod.rs` | 3 | 事件处理自愈 |
| `svc/crm/src/tests/rls_isolation_test.rs` | 3 | 测试内建表（可留） |
| `lib/shared-db/src/schema.rs` | 3 | `TABLE_DEFS` 驱动的 schema 防御 |
| `svc/erp/src/modules/vehicles.rs` | 2 | 请求链路自愈 |
| `lib/shared-bootstrap/src/lib.rs` | 2 | 启动期 schema 引导 |
| `svc/search/src/projection.rs` | 1 | 投影表自愈 |
| `svc/master-data/src/modules/schema_registry.rs` | 1 | 注册表自愈 |
| `svc/erp/src/modules/holidays.rs` | 1 | 请求链路自愈 |
| `svc/crm/src/modules/analytics.rs` | 1 | 请求链路自愈 |
| `lib/shared-db/src/database/mod.rs` | 1 | 连接后 schema 兜底 |

两条通用事实：
1. `CREATE TABLE IF NOT EXISTS` 即使表已存在，也要求 schema 的 `CREATE` 权限——所以“先把表建好再授权”这条路不通，只能删语句或换身份执行。
2. 请求链路里的建表会在高并发下反复抢 DDL 锁，是潜在卡顿源；这本身也是要收敛的理由。

## 2. 改造顺序（按“请求链路 > 事件链路 > 启动兜底 > 测试”）

**P0｜请求链路（3 个模块，4 文件）**
`svc/erp/src/modules/{holidays,vehicles}.rs`、`consolidation/{common,elimination_flow}.rs`、
`svc/finance/src/modules/forecast_v53.rs`。
做法：把 `ensure_*` 里的建表挪进对应 `svc/<svc>/migrations` 的幂等迁移；运行时只保留
“查表/查列是否就绪”的只读探测，缺表时返回 503 并打点，而不是自己 DDL。
完成判据：`topems_app` 在 `erp/finance` 无建表动作，接口 200 且 P95 不劣化。

**P1｜事件链路（2 文件）**
`svc/erp/src/event_handlers/mod.rs`、`svc/crm/src/event_handlers/{mod,analytics}.rs`。
做法同上；事件消费者启动时做一次“结构自检”，缺表即告警并停止消费，避免半可用。

**P2｜启动兜底（5 文件）**
`lib/shared-db/src/{schema,audit,database/mod}.rs`、`lib/shared-bootstrap/src/lib.rs`、
`svc/master-data/src/modules/schema_registry.rs`、`svc/search/src/projection.rs`。
做法：`schema_defense` 退化为“只校验不建”，建表真源完全交给迁移；启动期只允许一次
`topems_owner` 身份的结构对齐（可选开关，默认关）。

**P3｜测试代码**
`svc/crm/src/tests/rls_isolation_test.rs` 等测试内建表保留，但应改用迁移 fixture，避免测试
依赖运行期 DDL 行为。

## 3. 与权限收回的联动

- 每完成一个模块，`database/scripts/converge_owner.sql` 里的 CREATE 例外名单不减，但该模块
  的 `ensure` 语句要删干净；CI 的 `runtime-ddl-baseline.json` 用 `--update-baseline` 核销下降。
- 当 `erp` 与 `finance` 的 P0 完成、且 CI 基线里相关文件降到 0，再从
  `GRANT CREATE ON SCHEMA erp, finance` 里移除这两个 schema。
- `public` 与 `hrm`、`master_data` 放最后，因为 `shared-db` 与 `unified-core` 的兜底面最广。

## 4. 验收

```bash
node scripts/ci/check-runtime-ddl.mjs          # 应输出“未增加”，核销后 ddl 总数下降
./scripts/db/owner-sweep.sh                    # 0 漂移
psql -d topems -c "select nspname, has_schema_privilege('topems_app', nspname,'CREATE') from pg_namespace where nspname in ('public','erp','finance');"
```

## 5. 不做的事

- 不做一次性“删掉所有 ensure_*”的批量改造：61 处分布在 19 个文件，且多数与业务错误码耦合，
  一刀切会把“缺表”从自愈变成 500。
- 不为了收回 CREATE 而给运行期加 `SET ROLE topems_owner`：那是方案 A 的翻版，DDL 权限又回到
  运行时连接上。
