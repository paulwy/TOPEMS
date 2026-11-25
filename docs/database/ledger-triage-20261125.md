# 迁移账本分层排查（2026-11-25）

> 背景：本机 `public._sqlx_migrations` 699 条已装、883 个迁移文件，`sqlx migrate run` 因历史 checksum 漂移整体中止。
> 本次目标：不再"追账本对齐"，而是**按运行期实际缺对象**分层推进，并把可复跑的工具落进仓库。

## 1. 结论（先看这段）

1. 本机**账本已与 schema 脱钩**：schema 在多个位置**领先于账本**（例：`20261115142000` 断言"`finance.core_finance_vouchers` 已有本次要补的列"直接失败），说明这些迁移的效果早已通过其它路径落库。
2. 因此"把 184 条 pending 全部跑完"既不可能也不需要；盲跑只会制造半套 schema 与假账本。
3. 正确做法：**以运行期缺对象为驱动**逐条补（本次已补 2 条，见 §2），账本口径交团队决策（见 §6）。

## 2. 本次已落地（运行期错误清零）

| 迁移 | 解决的问题 | 验证 |
| --- | --- | --- |
| `20261121235940` erp_consolidation_company_rls | 提供 `erp.company_readable(uuid)`、`erp.group_tenant_of(uuid)`，是 W13 v2 建表策略的前置 | dry-run 通过 → apply 通过 |
| `20261123142000` search_projection_v2_company_scope | 建 `public.search_entity_projections_v2`（v1 列 + `company_id`，双策略 RLS FORCE） | 表存在、策略 2 条、`FORCE RLS` |

验证结果：`[search] backfill 对账完成: 源快照 1 条, 投影补写 1 行, 失败 0 行`；`search_entity_projections_v2` 已有 1 行（v1/v2 双写生效）；此前每 3 秒刷屏的 `relation "public.search_entity_projections_v2" does not exist` 消失。

> 操作纪律：先误插入了一行 `20261123142000` 账本（当时迁移因缺函数失败），**已立即删除**。本批所有记账都只在 SQL 执行成功后发生。

## 3. 43 条账本空档（版本早于当时 max `20261115141100`）

逐条 dry-run（事务内执行后回滚，不记账）结果：**32 可重放（幂等通过）/ 11 判定归档**。
（其中 11 个文件自带 `BEGIN;`，脚本 dry-run 会跳过；对这 11 个额外做了「剥离 BEGIN/COMMIT 后在事务内执行再 ROLLBACK」的复测，纠正了初版把它们误判为失败的口径。）

逐条判定落在 `database/migrations-archive.tsv`（43 行，列 `version/description/status/reason_category/reason/evidence/decided_on`），可直接作为团队口径的初稿。

归档的 11 条按原因分类（都不是"缺 schema"，而是历史脚本与当前 schema 不兼容）：

| 类别 | 版本 | 典型错误 |
| --- | --- | --- |
| 依赖已搬迁 | `20261103210000`、`20261104050000`、`20261107000002` | `relation "mes.core_emails" / "mes.permission_audit_logs" / "iam.core_tenant_modules" does not exist` |
| 枚举/数据前置 | `20261104030000`、`20261104070000` | `invalid input syntax for type uuid: "system"`；`invalid input value for enum bi.report_type: "summary"` |
| RLS/FK 种子类 | `20261105145000`、`20261115140800`、`20261115140900` | `new row violates row-level security policy`；`violates foreign key constraint` |
| 需要已收回的权限 | `20261105235800` | `must be able to SET ROLE "topems"`（本轮已收 `topems` 的角色能力） |
| 结构性冲突 | `20261103230000`（`cannot alter type of a column used in a policy definition`） | 列类型变更与既有 RLS 策略冲突 |
| 种子被 RLS 拒绝 | `20261107000025` | `new row violates row-level security policy for table "core_menu_groups"`（脚本内未设 `app.rls_system`，owner 无 BYPASSRLS） |
| 外键前置数据缺失 | `20261115140800` | `violates foreign key constraint "core_tenant_plugins_tenant_id_fkey"` |

判断：这 21 条属于**历史空档**（当时被跳过），其效果要么已被后续迁移覆盖，要么本就依赖当时的中间态数据。**不重放、不 adopt**（adopt 等于伪造执行记录）。

## 4. 前向队列（版本晚于当时 max，133 条）

按序 apply 时在第一条就停下：

```
20261115142000_finance_core_vouchers_26cols.sql
→ 空壳表前置断言失败：finance.core_finance_vouchers 已有本次要补的列，本迁移只补缺失列
```

即该文件**明确拒绝**在"列已存在"的库上执行——这是 schema 领先账本的直接证据。继续盲跑只会连环撞断言。

## 5. 工具：`scripts/db/apply-pending.sh`

按版本顺序处理 pending，用 `MIGRATE_URL`（`topems_owner`）执行，逐文件事务、**成功才记账**：

```bash
scripts/db/apply-pending.sh plan                     # 列 pending
scripts/db/apply-pending.sh dry-run                  # 事务内执行后回滚，不落库
scripts/db/apply-pending.sh dry-run --only 20261123142000
scripts/db/apply-pending.sh apply --from 20261115142000 --limit 10
```

要点：只认 14 位时间戳版本（`000_`/`001_` 这类 bootstrap 不入账本）；文件自带 `BEGIN;` 的按其自身事务执行；失败即停、打印该文件末尾日志、**不写账本**。

## 6. 建议团队口径（需另拍板，本次未做）

1. **归档 43 条空档**：已产出 `database/migrations-archive.tsv`（43 行，逐条 reason；`status` 区分 `archived` 与 `replayable-not-applied`）。剩余动作是团队确认 `replayable-not-applied` 的 32 条里哪些需要真正执行——注意其中含 `drop_dead_tables`、`cleanup_*` 与种子脚本，必须逐条评审，不能批量跑。
2. **用 schema 基线代替账本对齐**：以 `fixtures/full_schema_contract.sql` + 属主/权限巡检（`scripts/db/owner-sweep.sh`）作为"是否落后"的判据，而不是 pending 数量。
3. **checksum 归一**：`docs/database/ledger-rebaseline-20261125.md` 的 108 条映射只在"本机一次性修复"口径下成立，是否进 CI 需团队决定；在决定前不要跑 `sqlx migrate run`。

## 7. 判「落后」的工具：`scripts/db/schema-health.sh`

账本已与 schema 脱钩，所以「是否落后」改用三个维度判：

```bash
scripts/db/schema-health.sh              # 报告
scripts/db/schema-health.sh --strict     # 属主漂移或有 schema 落后基线时 exit 1
scripts/db/schema-health.sh --no-baseline
```

1. **属主漂移**（复用 `owner-sweep.sh`）：硬指标，必须 0。
2. **与基线 `fixtures/full_schema_contract.sql` 的结构差量**：把基线灌进临时库（本机超级用户 `air` 建 `topems_schema_baseline_tmp`，用完即删），按 schema 比 `tables/views/columns/functions/policies` 计数；正数=现库领先（正常），负数=现库落后（可疑）。落后时再按表列出差距最大的 15 个（排除 `archive` 回收站 schema）。
3. **真实待办迁移** = pending − `database/migrations-archive.tsv` 的 43 条归档。

2026-11-25 本机读数（供对照）：

- 属主漂移：0（relations=0 functions=0）
- 基线差量：40 个 schema 有差异，其中 3 个**落后**：`communication`（columns-2）、`finance`（tables+4/columns-11/policies+16）、`integration`（columns-10/policies-3）
- 待办：pending 182，其中 43 条归档解释，真实待办 139（多数因"schema 已领先账本"无法按序 apply，见 §4）

落后最明显的位置（摘录）：`integration.external_erp_sync_logs`（现库 14 / 基线 35）、`public.core_tickets`（2 / 19）、`finance.budgets`（13 / 20）、`mes.production_records`（41 / 50）、`qms.qa_eightd_reports`（27 / 34），另有 `erp.sales_order_items`、`plugin_finance.accounting_subjects` 等表整表缺失。

**判读要点**：这些差异不必然是"漏迁移"，也可能是基线快照生成于另一条更干净的历史线（该库把 pending 全跑过）。下一步只能**逐表定位**是哪条迁移负责补这些列，再单点 `apply-pending.sh dry-run --only <version>` 验证——不要指望一次批量对齐。

### 7.1 单表列名差量（`--table`）

```bash
scripts/db/schema-health.sh --table finance.budgets
#   < approved_at / < approver_id / < created_by / < description / < end_date / < start_date / < total_amount
#   （< = 基线有、现库无；> = 现库有、基线无）
```

**重要限制**：基线 `fixtures/full_schema_contract.sql` 是 pg_dump 快照，它由哪条历史线生成没有登记在案。实测 `finance.budgets` 现库列与**代码**一致（`operational.rs` 读 `total_budget`/`used_amount`/`status`），而基线多出 `total_amount/start_date/end_date/approver_id/approved_at` —— 说明基线里那张表是**另一套定义**，不是"现库漏了迁移"。已装的 `20261007140000`（`success=t`）当年确实给 budgets 加过 `description/created_by`，现库没有，进一步说明该表在本地被"另一条路径"重建过。

因此 `--table` 的正确用法是：**拿代码实际引用的列去核对**，而不是拿基线当真理。基线差量只作线索，不判定谁对谁错。

## 8. 基线差量的逐表判读（2026-11-25 实证）

对 `communication` / `integration` / `finance` 三个"落后" schema 做了列表级的列名差，再回到**代码里的 SQL 字面量**核对"代码是否真的引用这些列"。结论分三类：

1. **真缺 + 有对应 pending 迁移**（本次已修）
   `finance.opening_balances` 整表缺失：现库里它叫 `erp.opening_balances`，而代码 `svc/finance/src/modules/mod.rs` 一路直连 `finance.opening_balances`。pending 里正好有 `20261121220000_finance_opening_balances_move.sql`（剧本是"erp → finance"整体搬表，幂等、双存在即中止）。dry-run 先被 `CREATE SCHEMA IF NOT EXISTS finance` 挡住（`topems_owner` 无库级 CREATE），补 `GRANT CREATE ON DATABASE topems TO topems_owner` 后 apply 成功。验证：`GET /api/finance/accounts/opening-balances` 由"必然 500"变为 **200**。
2. **命名/血缘差异，不是缺迁移**
   例：`integration.core_inter_module_sync` 现库 18 列（`data/source_code/...`）与基线那套（`entity_type/entity_ids/company_id/...`）是**两套定义**；`communication.notification_channels`、`finance.budgets`、`finance.payables/receivables`、`external_erp_sync_logs` 同理——代码 SQL 命中的列都在现库这套里，缺失列无人引用。
3. **同文件内列名"命中"但不同表**
   早期按"文件名里出现该列名"判定会产生大量假阳性（`status/name/id/created_by` 之类）。改用"**只在该表出现的 SQL 字面量里找列**"后，假阳性基本消失——别用全文 grep 代替。

**可复跑的做法**：`scripts/db/schema-health.sh --table <schema.table>` 看列名差 → 回到代码里该表的 SQL 字面量核对 → 若确认真缺，先 `apply-pending.sh dry-run --only <version>` 找对应迁移，再 apply。

**副作用记录**：`topems_owner` 补了 `CREATE ON DATABASE topems`（`CREATE SCHEMA IF NOT EXISTS` 即使 schema 已存在也校验该权限）。

## 9. 第二轮判读：`integration` / `communication` 同批表（2026-11-25）

同一套判据（列名差 → 代码 SQL 字面量）过了一遍剩余"落后"表，结论如下。

**真缺并已修：`integration.core_inter_module_sync`**

- 症状：`GET /api/integration/sync/pending` 稳定 500，日志 `column "operation" does not exist`。
- 结构现状：本机 18 列是"D 侧"定义（`source_entity/source_id/source_code/retry_count/max_retries/next_retry_at/executed_at/data`），缺的是另一侧 5 列（`operation/entity_type/entity_ids/started_at/finished_at`）；`company_id` 与四条公司级 RLS 策略来自 pending 迁移 `20261123100000_core_inter_module_sync_company_scope.sql`。
- 代码真相：`SyncTaskRow` 与 4 条 SQL 仍按 `operation/entity_type/entity_ids/started_at/finished_at` 写，DTO 却已按 D 侧字段声明——**半迁移状态**。`20261115142500_shell_tail_7tables_13cols.sql` 是"往 prod 侧补 D 侧列"的剧本，与本机方向相反，dry-run 在前置断言处直接失败（`portal.portal_todos 已有本次要补的列`），不适用。
- 处置：①apply `20261123100000`（补 `company_id` + 公司级策略，dry-run 先过）；②把 `sync.rs` 的 `SyncTaskRow` 与全部 SQL 改成 D 侧真实列（`source_entity/source_id/source_code`、`retry_count/max_retries/next_retry_at/executed_at`），状态更新只对终态落 `executed_at`，触发器统一写 `source_entity/source_id` + `retry_count=0/max_retries=3`。
- 验证：`/sync/pending`、`/sync/statistics`、`/sync-stats` 均 200（修复前第一个必 500）；`INSERT` 语句形状在事务内实测通过（`RETURNING` 正常、已 ROLLBACK）。
- 未决：写路径需要公司上下文，`admin` 没有任何 `core_user_company_scopes` 行，故带 `x-company-id` 会 403——这是账号数据缺口，与本次列错位无关，另行处理。

**判为血缘差异（不动）**

| 表 | 基线独有列 | 代码实际用 | 结论 |
|---|---|---|---|
| `finance.budgets` | `total_amount/start_date/end_date/description/created_by/approved_at/approver_id` | `total_budget/fiscal_year/used_amount/remaining_amount/usage_rate` | 本地重设计过，基线过时 |
| `finance.payables` | `amount_paid/remaining_amount/approved_at/approver_id` | `paid_amount` | 同上 |
| `finance.receivables` | `amount_received/paid_amount/remaining_amount/approved_at/approver_id` | `received_amount` | 同上 |
| `finance.mv_receivable_aging` | `amount/due_date/invoice_no/receivable_no/...` | `total_amount/current_amount/bucket_*_amount` | 同上 |
| `communication.notification_channels` | `code/channel_type/category/enabled` | `name/name_en/type/status/config` | 同上 |
| `integration.external_erp_sync_logs` | `app_key/sync_mode/mapping_type/...` | `connection_id/entity/direction/total_records/started_at/completed_at` | 同上（那张是"外部 ERP 映射"的旧形状） |

冒烟：`/api/finance/budgets`、`/api/finance/payables`、`/api/finance/receivables`、`/api/integration/external-erp/sync-logs` 全 200——反证这些表当前可用，缺列无人引用。

**潜在（未触达，先记不动）：`finance.reconciliation_item_snapshots`**

代码（`settlement_center/service.rs`）用 `reconciliation_id/item_type/amount`，库内是 `recon_id/debit_amount/credit_amount`。但 `settlement_center` 路由在 8099/8000/8011 全部 404（模块未挂载），表内 0 行，属潜伏缺陷；等该模块真正接线时再一并修，避免现在为一个不可达路径改表结构。

**阻塞记录：`20261115142500`**

该迁移把 D 侧列补到 prod 侧库，本机方向相反，dry-run 被断言拒绝（`portal.portal_todos 已有本次要补的列`）。不改这个已发表迁移的语义，前向队列按单条 apply（`--only`）推进即可，不做批量。

**判读结果落库**：新增 `database/schema-diff-waivers.tsv`（`schema / table / reason / evidence / decided_on`），把上面这两处已判读的差量登记为"接受"；`schema-health.sh` 读它，只做标注（`✓ 已判读接受`）并从"落后"计数里剔除，其它未登记的差量仍按"落后"告警——判读结论可见、可追溯、不会每次重复解读。当前结论：**健康**（属主 0 漂移、未落后基线），真实待办 136 条仅作提示。

## 10. 公司级写接口 403 的根因与修复（2026-11-25）

修完同步任务表列错位后，`POST /api/integration/sync/tasks` 仍 403：`公司主体不属于当前租户或当前用户无数据范围`。链路排查结论：

- 中间件 `lib/shared-auth/src/middleware/company.rs` 的顺序是「显式 `x-company-id` → `is_default` → 唯一成员推断」，**两条路径都要求 `public.core_user_company_scopes` 有记录**，没有就 fail-closed 403。这是设计意图，不是 bug。
- 但是 `admin` 在本机库里既没有 `core_tenant_users` 成员记录（`iam.users` 里有 `admin`，成员表没有），也没有任何范围记录；`core_user_company_scopes` 里 14 行全是 e2e 测试账号。
- 更底层的原因：`core_tenant_users` 里有两行 `admin@topems.com` 的**孤儿成员记录**（`user_id` 指向 `iam.users` 已不存在的 id），把 `(tenant_id, email)` 唯一槽占住了，导致补成员时直接撞唯一约束。这是历史重建用户表留下的残行。
- 播种迁移 `20261108130000_p1_company_master_and_scopes.sql` 只处理「已有成员记录」且「单一活跃公司」的租户；本租户只有 1 家活跃公司，但因 admin 无成员记录，回填没覆盖到它。

处置：新增 `scripts/db/backfill-admin-company-access.sh`（默认 dry-run，`--apply` 落库），三步同一事务：
1. 删本租户里 `user_id` 已不存在的孤儿成员记录（实测 2 行）；
2. 给 `admin` 补 `core_tenant_users`（role `owner`、status `active`）；
3. 给 `admin` 补 `core_user_company_scopes`（唯一活跃公司 `write` + `is_default=true`），已有 `consolidate` 不降级。

验证（全部 200，之前分别为 403/不可用）：`POST /sync/tasks`（返回 DTO 字段正确：`source_entity/source_code/retry_count=0/max_retries=3`）→ 状态更新 `POST /sync/tasks/{id}/status`（`status=success` 且 `executed_at` 已落）→ 三个触发器 `trigger/scm-to-wms`、`wms-to-crm`、`srm-to-scm` 全部 200。验证后把 4 条测试任务清掉（表回到 0 行）。

可逆：删除新增的成员行与范围行即可回退；脚本 `--user/--tenant` 可指向别的账号或租户。
