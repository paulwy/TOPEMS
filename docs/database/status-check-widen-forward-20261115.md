# 20261115000000：`status` CHECK 扩容前向补丁（替代 20261114100000）

- 新版本：`20261115000000_w7_b4_status_check_widen_forward.sql`
- 回滚：`database/rollback/20261115000000_w7_b4_status_check_widen_forward.rollback.sql`
- owner：`platform-db`
- ticket：`TOPEMS-W7-B4-STATUS-WIDEN-20261115`
- 状态：已合入 main；**生产未投递**，等单独窗口放行

## 1. 结论

`20261114100000` 不可投递，保留原文件与旧回滚不动，manifest 状态改为 `superseded`；
由 `20261115000000` 前向承接同一目标，并做了两处修正：

1. **约束不存在则创建**，不再对 prod 缺失约束 `RAISE EXCEPTION`；
2. **六张表按代码实际写入扩容**，并对存量行做收窄保护。

新迁移是幂等的：定义已一致则跳过，值域不符则 `DROP + ADD`；前置/后置断言均 fail-closed。

## 2. 旧版本为什么不可投递

| 问题 | 事实 | 后果 |
| --- | --- | --- |
| prod 缺前置约束 | `crm.billing_records`、`iam.users`、`analytics.report_execution_records` 上 `ck_*_status_standard` 为 0 条 | 旧迁移第一处断言直接 `RAISE EXCEPTION`，整笔回滚 |
| 值域窄于代码写入 | 下表六张表的新增值不在旧目标集合 | 即使约束存在，真实业务写入也会 `23514 check_violation` |

旧版本、旧回滚、旧 checksum 均未修改。详见
[schema-baseline-drift-2026-11-14.md](schema-baseline-drift-2026-11-14.md) 的
「`20261114100000` 定性」专节。

## 3. 新版本设计

文件：`database/migrations/20261115000000_w7_b4_status_check_widen_forward.sql`

- 覆盖 18 张表，目标值域逐表登记在 DO 块的 `VALUES` 矩阵里；
- 前置断言：
  - 表存在；
  - `status` 列存在且为字符类型（`text` / `varchar` / `char`），否则拒绝自动处理；
  - 存量行不得出现目标集合外的值，否则 `RAISE` 并打印最多 20 个越界值；
  - 同表其他引用 `status` 列的 CHECK 必须接受全部目标值，否则说明扩容无效，`RAISE`；
  - 同名约束存在但不是 CHECK 时 `RAISE`；
- 应用：
  - 解析 `pg_get_constraintdef`，与目标集合完全一致则 `NOTICE SKIP`；
  - 否则 `DROP CONSTRAINT` + `ADD CONSTRAINT ... CHECK (status IS NULL OR status = ANY (...))`；
- 后置断言：
  - 约束存在、保留 `status IS NULL` 语义；
  - 对实际落地的约束表达式逐值求值，目标值必须全部为真；
  - 存量行不得有越界值；
- 文件内没有 `BEGIN/COMMIT/ROLLBACK`，由 `apply-forward.sh --single-transaction`
  把 DDL 与 `_sqlx_migrations` 写在同一个事务里。

## 4. 六表「实际写值 vs 约束值域」

> 说明：标记「预留」的值在本次 grep 中没有找到落到该表的写入点，按需求作为
> 合理未来扩展纳入，不影响现有写入。

| 表 | 代码实际写入（证据） | 新约束值域 | 旧值域缺口 |
| --- | --- | --- | --- |
| `tms.tms_carriers` | `active`（创建 `carrier.rs:260`，审批 `:687`）；`rejected`（驳回 `:782`）；`pending_review` / `suspended` / `blacklisted`（FSM `shared/fsm.rs:5,70-86`；通用更新 `carrier.rs:416` 直接绑定 `req.status`） | `active,inactive,archived,pending_review,suspended,blacklisted,rejected` | `pending_review,suspended,blacklisted` |
| `finance.finance_v60_alerts` | `active`（DDL 默认值 `decision_v60.rs:332`，插入 `:1020`）；`acknowledged`（`:1104`）；`resolved`（`:1126`） | `active,inactive,archived,draft,pending,acknowledged,resolved` | `draft,pending`（预留） |
| `qms.qa_alert_messages` | `active`（插入 `quality_dashboard.rs:764`）；`acknowledged`（`:820`） | `active,inactive,archived,open,pending,acknowledged` | `open,pending`（预留） |
| `integration.integration_sync_logs` | `triggered`（`event_handlers/mod.rs:97` 插入，`:163/:188/:213` 三处调用） | `active,inactive,archived,pending,triggered,success,failed` | `pending,success,failed`（预留） |
| `integration.mes_erp_sync_logs` | `success`（`mes_erp_sync.rs:176,342`）；`failed`（`:200,364`） | `active,inactive,archived,pending,success,failed` | `pending`（预留） |
| `analytics.report_execution_records` | `running`（`scheduler.rs:237`）；`completed`（`:251`）；`failed`（`:280`） | `active,inactive,archived,running,completed,failed` | `completed,failed` |

六表列类型均已核对：`status` 全部是字符类型（`text` / `varchar`），无枚举列，
新增值长度均落在现有 `varchar` 上限内。

## 5. 全量 18 表目标值域

| schema.table | 约束 | 目标值域 | 本次动作（dev） |
| --- | --- | --- | --- |
| ehs.qa_ehs_disease_cases | ck_qa_ehs_disease_cases_status_standard | active,inactive,archived,suspected | SKIP |
| ehs.qa_ehs_environmental_regulations | ck_qa_ehs_environmental_regulations_status_standard | active,inactive,archived,draft | SKIP |
| ehs.health_records | ck_health_records_status_standard | active,inactive,archived,pending | SKIP |
| finance.reconciliation_snapshots | ck_reconciliation_snapshots_status_standard | active,inactive,archived,draft,approved | SKIP |
| finance.settlement_snapshots | ck_settlement_snapshots_status_standard | active,inactive,archived,draft,approved,rejected | SKIP |
| finance.finance_v60_alerts | ck_finance_v60_alerts_status_standard | +draft,pending | 重建 |
| crm.billing_records | ck_billing_records_status_standard | active,inactive,archived,pending,paid | SKIP |
| erp.erp_master_data_refs | ck_erp_master_data_refs_status_standard | active,inactive,archived,pending_destruction,destroyed | SKIP |
| master_data.mdm_subscriptions | ck_mdm_subscriptions_status_standard | active,inactive,archived,cancelled | SKIP |
| qms.qa_alert_messages | ck_qa_alert_messages_status_standard | +open,pending | 重建 |
| tms.tms_carriers | ck_tms_carriers_status_standard | +pending_review,suspended,blacklisted | 重建 |
| tms.tms_drivers | ck_tms_drivers_status_standard | active,inactive,archived,suspended | SKIP |
| tms.tms_vehicles | ck_tms_vehicles_status_standard | active,inactive,archived,maintenance | SKIP |
| wms.purchase_order_snapshots | ck_purchase_order_snapshots_status_standard | active,inactive,archived,pending,approved | SKIP |
| integration.integration_sync_logs | ck_integration_sync_logs_status_standard | +pending,success,failed | 重建 |
| integration.mes_erp_sync_logs | ck_mes_erp_sync_logs_status_standard | +pending | 重建 |
| iam.users | ck_users_status_standard | active,inactive,archived,pending | SKIP |
| analytics.report_execution_records | ck_report_execution_records_status_standard | +completed,failed | 重建 |

生产侧预期：15 条已存在（按需重建），3 条缺失（`crm.billing_records`、`iam.users`、
`analytics.report_execution_records`）会被新建。

## 6. dev 演练

库：`topems`（dev，`_sqlx_migrations` max = `20261114170000`）。

> **账本说明**：本次 dev 演练**没有写 `_sqlx_migrations`**。原因是 dev 还欠
> `20261114180000`～`20261114202000` 五笔迁移，若把 `20261115000000` 先入账会抬高
> 账本水位，导致这五笔在常规 anchor 模式下被永久跳过。因此演练用
> `psql --single-transaction -f` 直接执行同一份迁移文件，效果与 `apply-forward`
> 的 DDL 部分一致；正式投递仍走 `apply-forward.sh`。

### 6.1 正向应用

```bash
psql -h /tmp -U air -d topems -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261115000000_w7_b4_status_check_widen_forward.sql
```

输出要点（完整 24 行）：

```text
NOTICE: status-widen SKIP: ehs.ck_qa_ehs_disease_cases_status_standard（定义已与目标一致）
...
NOTICE: status-widen OK: finance.ck_finance_v60_alerts_status_standard 重建（原定义：CHECK (...'{active,inactive,archived,acknowledged,resolved}'...)）
NOTICE: status-widen OK: qms.ck_qa_alert_messages_status_standard 重建（原定义：...'{active,inactive,archived,acknowledged}'...）
NOTICE: status-widen OK: tms.ck_tms_carriers_status_standard 重建（原定义：...'{active,inactive,archived,rejected}'...）
NOTICE: status-widen OK: integration.ck_integration_sync_logs_status_standard 重建（原定义：...'{active,inactive,archived,triggered}'...）
NOTICE: status-widen OK: integration.ck_mes_erp_sync_logs_status_standard 重建（原定义：...'{active,inactive,archived,success,failed}'...）
NOTICE: status-widen OK: analytics.ck_report_execution_records_status_standard 重建（原定义：...'{active,inactive,archived,running}'...）
NOTICE: status-widen APPLY OK: 18 张表的约束均已落地并通过逐值验证
NOTICE: status-widen VERIFY OK: 18 条约束存在、值域覆盖目标、存量无越界
```

12 条 SKIP、6 条重建，符合预期。

### 6.2 六表逐值验证（实际约束表达式求值）

脚本从 `pg_constraint` 取**实际落地的表达式**，用合成行逐值求值：
目标值必须 `true`，`__illegal_status__` 必须 `false`，NULL 必须 `true`。

```text
--- tms.tms_carriers ---
expr: ((status IS NULL) OR (status = ANY ('{active,inactive,archived,pending_review,suspended,blacklisted,rejected}'::text[])))
ACCEPT | active / inactive / archived / pending_review / suspended / blacklisted / rejected | accepted=t
REJECT | __illegal_status__ | accepted=f
NULL   | <null> | accepted=t

--- finance.finance_v60_alerts ---
expr: ((status IS NULL) OR ((status)::text = ANY ('{active,inactive,archived,draft,pending,acknowledged,resolved}'::text[])))
ACCEPT | active / inactive / archived / draft / pending / acknowledged / resolved | accepted=t
REJECT | __illegal_status__ | accepted=f
NULL   | <null> | accepted=t

--- qms.qa_alert_messages ---
expr: ((status IS NULL) OR ((status)::text = ANY ('{active,inactive,archived,open,pending,acknowledged}'::text[])))
ACCEPT | active / inactive / archived / open / pending / acknowledged | accepted=t
REJECT | __illegal_status__ | accepted=f
NULL   | <null> | accepted=t

--- integration.integration_sync_logs ---
expr: ((status IS NULL) OR (status = ANY ('{active,inactive,archived,pending,triggered,success,failed}'::text[])))
ACCEPT | active / inactive / archived / pending / triggered / success / failed | accepted=t
REJECT | __illegal_status__ | accepted=f
NULL   | <null> | accepted=t

--- integration.mes_erp_sync_logs ---
expr: ((status IS NULL) OR ((status)::text = ANY ('{active,inactive,archived,pending,success,failed}'::text[])))
ACCEPT | active / inactive / archived / pending / success / failed | accepted=t
REJECT | __illegal_status__ | accepted=f
NULL   | <null> | accepted=t

--- analytics.report_execution_records ---
expr: ((status IS NULL) OR (status = ANY ('{active,inactive,archived,running,completed,failed}'::text[])))
ACCEPT | active / inactive / archived / running / completed / failed | accepted=t
REJECT | __illegal_status__ | accepted=f
NULL   | <null> | accepted=t

DRILL OK: 六表全部目标值被接受，非法值被拒绝，NULL 语义保留
```

### 6.3 真实 DML 探针（`analytics.report_execution_records`）

事务内真实插入 `status='completed'` 成功，再插入非法值被约束拒绝，最后整体回滚：

```text
BEGIN
INSERT 0 1
 probe                 | rows
-----------------------+------
 real_insert_new_value |    1

SAVEPOINT
ERROR:  new row for relation "report_execution_records" violates check constraint
        "ck_report_execution_records_status_standard"
描述:  Failing row contains (..., __illegal_status__, ...).
ROLLBACK
```

### 6.4 回滚

```bash
psql -h /tmp -U air -d topems -X -v ON_ERROR_STOP=1 \
  -f database/rollback/20261115000000_w7_b4_status_check_widen_forward.rollback.sql
```

```text
NOTICE: status-unwiden OK: ... tms.ck_tms_carriers_status_standard → [{active,inactive,archived,rejected}]
...
NOTICE: status-unwiden ROLLBACK OK: 18 条约束已恢复到 20261114100000 目标定义
COMMIT
```

回滚后对 18 条约束做 `pg_get_constraintdef` 快照，与演练前基线 `diff` **完全一致**
（仅 psql 的「不使用分页器.」提示行不同，已剔除）。

### 6.5 回滚后再正向应用

再次执行正向迁移，6 条约束重新重建、12 条 SKIP，逐值验证再次通过；
dev 最终停留在「新值域」状态，且 `_sqlx_migrations` 未改动。

## 7. 生产投递前置（等放行，本次不做）

1. 生产窗口先停写 8099，确认无连接后再执行（`ADD CONSTRAINT` 取 ACCESS EXCLUSIVE）；
2. 用 `apply-forward.sh --apply-deferred 20261115000000 --ticket <工单>` 单版本投递，
   不要与 `20261114180000`～`20261114202000` 混批；
3. 投递后核对：账本 +1、18 条约束存在、六表新增值可写、无 `23514`；
4. 若需回滚：先停写并清理新增值，再执行回滚文件；`analytics` 回滚后只允许 `running`，
   必须同步回退二进制，否则 `completed/failed` 写入会失败。

## 8. 文件清单

- `database/migrations/20261115000000_w7_b4_status_check_widen_forward.sql`
- `database/rollback/20261115000000_w7_b4_status_check_widen_forward.rollback.sql`
- `database/migration_manifest.yaml`（旧版本 `superseded` + 新版本 `to_apply`）
- `database/checksums.txt`（validate.sh 自动更新）
- `docs/database/status-check-widen-forward-20261115.md`（本文）
- `docs/database/schema-baseline-drift-2026-11-14.md`（补充取代结论）
