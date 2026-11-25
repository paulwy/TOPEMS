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

逐条 dry-run（事务内执行后回滚，不记账）结果：**22 通过 / 21 失败**。

失败的 21 条按原因分类（都不是"缺 schema"，而是历史脚本与当前 schema 不兼容）：

| 类别 | 版本 | 典型错误 |
| --- | --- | --- |
| 依赖已搬迁 | `20261103210000`、`20261104050000`、`20261107000002` | `relation "mes.core_emails" / "mes.permission_audit_logs" / "iam.core_tenant_modules" does not exist` |
| 枚举/数据前置 | `20261104030000`、`20261104070000` | `invalid input syntax for type uuid: "system"`；`invalid input value for enum bi.report_type: "summary"` |
| RLS/FK 种子类 | `20261105145000`、`20261115140800`、`20261115140900` | `new row violates row-level security policy`；`violates foreign key constraint` |
| 需要已收回的权限 | `20261105235800` | `must be able to SET ROLE "topems"`（本轮已收 `topems` 的角色能力） |
| 结构性冲突/其它断言 | `20261103230000`（`cannot alter type of a column used in a policy definition`）、`20261106000001`、`20261107000025`~`00033`、`00036` | 断言失败或空输出 |

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

1. **归档 43 条空档**：在 `_sqlx_migrations` 之外维护 `database/migrations-archive.tsv`，逐条写 reason（本轮 §3 的分类可直接作为初稿），避免每次 `migrate info` 都被它们污染。
2. **用 schema 基线代替账本对齐**：以 `fixtures/full_schema_contract.sql` + 属主/权限巡检（`scripts/db/owner-sweep.sh`）作为"是否落后"的判据，而不是 pending 数量。
3. **checksum 归一**：`docs/database/ledger-rebaseline-20261125.md` 的 108 条映射只在"本机一次性修复"口径下成立，是否进 CI 需团队决定；在决定前不要跑 `sqlx migrate run`。
