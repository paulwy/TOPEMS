# W0 基线冻结（2026-11-16，只读批次）

> 依据 [TODO.md](../../TODO.md) §3 W2-0、§2 W1-2a、§17.1。本批次**不写生产库、不改业务代码**：
> 仅一次门禁脚本改造（高危级别硬失败）+ 三份取数快照。
> 代码基线：`f9ce1b495`（origin/main，2026-11-15）。

## 1. 结论摘要

| 项 | 取数结果 | 与 TODO 旧口径对比 |
|---|---|---|
| schema-prefix 违规 | **1540**（AMBIGUOUS 3 / CROSS_SCHEMA 2 / SEARCH_PATH_DEPENDENT 874 / UNKNOWN 661）；W2-B0 修复后 **1535**（高危 0） | TODO 记 1551；差额来自 11-07 后的真实收敛，非口径变化 |
| AMBIGUOUS + CROSS_SCHEMA | **5 条，全在 `svc/monitor/.../metrics.rs`** | 数量与 TODO 一致（3 + 2） |
| search_path 语句门禁 | **0 处**（基线放行 0、新增 0） | TODO 未记录此数，属本次新增证据 |
| 权限码 DB 集合 | **1021** | TODO 记 1109 |
| 权限码 BE 集合 | **619** | TODO 记 593 |
| FE ∩ BE | **138** | TODO 记 133 |
| FE 集合 | **445** | TODO 记 448/449 |

## 2. W2-0 门禁改造（已落地）

改动文件：[scripts/ci/check-schema-prefix.mjs](../../scripts/ci/check-schema-prefix.mjs)

- 新增 `HARD_FAIL_LEVELS = {AMBIGUOUS, CROSS_SCHEMA}`：这两级**不受基线豁免**，只要出现即 `exit 1`。
- 新增 `summary.hard_fail` 字段（JSON 输出可机读）。
- 在人类可读输出中逐条打印 CROSS_SCHEMA，并单独打印高危计数。
- `--report-only` 仍可只报告不阻断；`--update-baseline` 不会把高危级别写进基线（高危根本走不到基线判定）。

行为验证（同一工作区，改造后）：

```
$ node scripts/ci/check-schema-prefix.mjs
[schema-prefix] 违规 1540（AMBIGUOUS=3 CROSS_SCHEMA=2 ...），基线内 1540，新增 0
[schema-prefix] 高危 5 条不可基线豁免（AMBIGUOUS/CROSS_SCHEMA），必须改全限定名后才能通过
[schema-prefix] FAILED：5 条高危违规（AMBIGUOUS=3 CROSS_SCHEMA=2）不可基线豁免，须改为 schema.table 全限定名
exit 1

$ node scripts/ci/check-schema-prefix.mjs --report-only   → exit 0
$ node scripts/ci/check-schema-prefix.mjs --changed-only  → exit 0（干净工作区无暂存文件）
```

**当前门禁为红是预期状态**：5 条高危全部由 W2-B0（monitor 5 条改全限定名）清零，清零后自然转绿。

### 2.1 关于「按模块拆分基线文件」的处理

TODO 原文为「按模块拆分基线文件」。核实后**未拆分**，理由：

1. 现有基线键是 `文件::表名`，新增任意裸表名都会命中 `freshDedup` 并阻断——**"只减不增"已由键控基线保证**，按模块拆文件不增加任何约束力。
2. 拆分需改门禁读取多文件 + 重排 326 条记录，属纯重构；改动门禁脚本本身的风险大于收益（此脚本是 1540 条违规的唯一度量口径）。
3. 替代做法：在 JSON 输出中已有 `by_module` 明细，本文件 §3 落盘完整分模块快照，可作逐模块对账依据。

如要求物理拆分，作为独立批次处理，不混入本次门禁语义变更。

## 3. schema-prefix 基线快照（W2-B0 后：1535 条 / 308 键）

> W2-B0 修复后执行了一次 `--update-baseline` 刷新账本：326 → 308 键，删 18 条失效键。
> 其中 2 条是本次修复的 monitor `employees`/`departments`（另 3 条 AMBIGUOUS 键因表名归一后不再命中），
> 其余 16 条是 11-07 生成基线后上游已收敛/迁移、但账本未核销的陈旧键（communication 4、master-data 4、
> erp 1、finance 1、其余散点）。刷新前后 `new_violations` 均为 0，说明这 18 条是"已消失"而非"改名后新增"。

按模块（`by_module`，含各级别）：

```
mes=313  unified-core=247  finance=227  lims=174  analytics=166  pdm=152
erp=105  integration=46  communication=44  portal=22  rd=16  monitor=10
pm=10  ehs=2  ai=1  gis=1  hrm=1  qms=1  search=1  wms=1
```

高危 5 条（本次门禁唯一阻断项）：

| 级别 | 位置 | 表名 | 归属冲突 |
|---|---|---|---|
| AMBIGUOUS | `svc/monitor/src/modules/monitor/metrics.rs#786` | `projects` | rs / pm |
| AMBIGUOUS | `svc/monitor/src/modules/monitor/metrics.rs#887` | `projects` | rs / pm |
| AMBIGUOUS | `svc/monitor/src/modules/monitor/metrics.rs#897` | `inventory` | erp / wms |
| CROSS_SCHEMA | `svc/monitor/src/modules/monitor/metrics.rs#907` | `employees` | hrm（monitor 的 search_path 为 public） |
| CROSS_SCHEMA | `svc/monitor/src/modules/monitor/metrics.rs#907` | `departments` | hrm（同上） |

扫描规模：1431 个 `.rs` 文件 / 6492 条 SQL 字面量 / 基线 326 键。

## 4. W1-2a 权限码三端快照

来源：`python3 scripts/audit_permission_codes.py --json`，`db_source: live`（读 `public.core_permissions`，**只读 SELECT**）。
机读快照：[permission-codes-snapshot-20261116.json](./permission-codes-snapshot-20261116.json)

```
FE 445 | BE 619 | DB 1021 | FE∩BE 138
漂移：SQL 声明(init) 12 | live DB 1021 | 交集 12 | SQL-only 0 | DB-only 1009
历史迁移(migrations) 1117 条；仅历史孤立字面量 96 条；仍为现行码的历史引入点 1021 条
① be_only 481   ② fe_only 307   ④ fe_orphan 32   db_only 558   ③ 命名不一致组 0
fe_orphan 模块分布（前 10）: lowcode 5 / network 3 / core 2 / finance 2 / session 2 / admin 1 / ai 1 / bi 1 / crm 1 / doc 1
```

与 TODO W1-2 的差异需要**在 W1-2b/2c 开工前用它覆盖旧数**：

- DB 由 1109 → 1021（-88），BE 由 593 → 619（+26），交集 133 → 138（+5）。
- 因此「仅 DB 976 / 仅后端 460 / 菜单 448 码匹配 109」三组数**已过期**：现口径为 DB-only 558、be_only 481、FE 445。

复现命令（只读，勿加写参数）：

```bash
python3 scripts/audit_permission_codes.py --summary
python3 scripts/audit_permission_codes.py --json > docs/quality/permission-codes-snapshot-<date>.json
```

## 5. §17.1 连接容量测算

### 5.1 当前事实（代码 + 只读查库）

| 项 | 值 | 来源 |
|---|---|---|
| 嵌入模式物理池预算单位 | **31** | `svc/server/src/main.rs::derived_db_pools` = 1（迁移池）+ 12（独立模块池）+ 2（master-data/analytics）+ 14（`SHARED_POOL_MODULE_WEIGHT`）+ 2（unified-core） |
| 每池默认连接数 | **2** | `lib/shared-db/src/database/budget.rs::DEFAULT_CONNECTIONS_PER_POOL` |
| 进程总预算（默认） | **62** | `31 × 2`；未设置 `DB_TOTAL_CONNECTION_BUDGET` |
| 单池实际授予 | **2** | `grant = min(申请 3, share 62/31=2, 余额)` |
| 每写请求连接数 | **2** | 请求事务（`tenant_middleware` 的 `pool.begin()`）+ handler 内 `Db::scope*` 再开一条 |
| PG `max_connections` | **100** | `SHOW max_connections`（localhost:5432/topems_prod，只读） |
| 当前 `pg_stat_activity` | **17** | 只读计数 |

### 5.2 测算结论

- 现状：`Σ池上限 = 62 ≤ PG 100`，余量 38。按「写请求 2 条连接」折算，**全局同时只能支撑约 31 个写请求**（62 / 2）。
- 若 §17.2 收敛到 `scope_with`（复用请求事务），写请求降为 **1 条连接**，同样预算下并发翻倍到 **62**，且不需要改任何池参数。
- 因此**不建议现在上调 `DB_TOTAL_CONNECTION_BUDGET`**：
  1. 用户已定 `scope_with` 路线，抬预算属于会被立即回退的临时补丁；
  2. 当前实测 activity 17，距 62 仍有 3.6 倍余量；
  3. 抬到 90 会把 PG 余量压到 10，运维/迁移/其他进程一旦并发即触发 `FATAL: too many clients`，风险大于收益。
- 保留的观测判据（出现任一条才考虑上调，且需先出 PR 说明）：
  - 日志出现 `[db-budget-exhausted]`；
  - `pg_stat_activity` 峰值持续 > 80（占 `max_connections` 80%）；
  - 池等待（`acquire_timeout`）在业务高峰出现。

即：**§17.1 的"重算"在当前事实下结论是「维持 62」，真正的解法是 §17.2 的 `scope_with`，而不是加大池子。**

## 6. 本批未做 / 明确不做

- 未拆基线文件（理由见 §2.1）。
- 未修改任何 `max_connections` 参数、未改 `.env`。
- 未对生产库执行任何写操作（仅 `SHOW max_connections` 与 `pg_stat_activity` 计数）。
- 未提交、未推送。
