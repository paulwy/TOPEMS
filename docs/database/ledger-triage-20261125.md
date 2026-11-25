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
