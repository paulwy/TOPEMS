# 迁移链挂账登记（Migration Debt Register）

> 状态：**登记文档，不改 SQL、不跑迁移、不连库**。
> 快照日期：2026-11-05；快照基线：`bash scripts/migration/validate.sh` 退出码 0。
> 用途：把「已知但暂不整改」的迁移链问题逐条登记，供 review/排期时当 checklist 用。
> 红线：本文件不授权执行 `sqlx migrate run/revert`，不授权修改 `database/migrations/*.sql`、
> 文件名版本号或 `database/checksums.txt` 既有记录。

## 0. 当前基线（2026-11-05 实测，先看这里再看明细）

| 指标 | 实测值 | 口径 |
| --- | --- | --- |
| 活动链迁移文件 | **592**（短版本 14 + 时间戳 578） | `ls database/migrations/*.sql` |
| Checksum errors | **0** | validate.sh 三方核对通过 |
| 版本顺序告警 | **39** | 见第 1 节（本次点名 2 条） |
| Idempotency warnings | **102** | 无 `IF NOT EXISTS`/`IF EXISTS`/`OR REPLACE` 守卫的语句 |
| Multi-responsibility warnings | **125** | 单文件跨多对象/多 schema |
| Missing down migrations | **592** | 全链无 down 段，项目既有约定 |
| validate 退出码 | **0** | 告警不阻断 |

**为什么和 577 / 102 / 122 对不上**：577/102/122 是上一快照（约 577 个迁移）的数字。
本快照新增 15 个迁移文件后，Missing down 随文件数同步 +15 → 592，Multi-responsibility +3 → 125，
Idempotency 不变 → 102。**这是文件增长带来的自然放大，不是退化**；后续对比请以
「同一文件数快照」为准，或直接看增量。

## 1. 版本号违序（登记的 2 条典型 + 39 条总量说明）

均属「文件在后续提交中补录，版本号早于已提交的更大版本」——`validate.sh` 按 **git 添加顺序** 比较，
而 `sqlx` 按 **版本号数值升序** 执行，两者不同。故这类告警影响的是审计信号，不是重放顺序。

| ID | 对象 | 实际作用 | 是否已应用（不连库推断） | 结论 | 下一步 | 责任/排期 |
| --- | --- | --- | --- | --- | --- | --- |
| V-01 | `20260725000002_hrm_employee_add_fields.sql`（git 添加 2026-08-14，晚于 `20260810000003`） | 给 `hrm.employees` 补 10 个列（`regular_date`/`probation_period`/`joblevel`/`work_location`/`report_to_name`/`emergency_relation`/`hukou_location`/`remark`/`employee_type`/`user_id`），全部 `ADD COLUMN IF NOT EXISTS`，幂等 | **已应用**：`database/checksums.txt:435` 有条目；不在 TODO 记录的 prod 未登记清单（17 条，均为 5433/test 定向）；`apps/web/src/api/hrm/types.ts`、`svc/hrm/src/schema_defense.rs` 均引用这些列，缺列则现网 HRM 页面/接口不可用 | **已应用，序号仅影响审计排序，不影响重放**。sqlx 重放时 20260725 排在 20260810 之前，语义顺序正确（列在依赖它的迁移前就绪） | 无需动作；禁止改文件名/版本号 | 待定 |
| V-02 | `000_create_schemas.sql`（git 添加 2026-08-24，晚于 `20260821200000`） | 48 条 `CREATE SCHEMA IF NOT EXISTS`（iam/doc/flow/unified_core/erp/finance/hrm/crm/ai/pm/rs/lims/pdm/mes 等），幂等 | **已应用**：`checksums.txt:575` 有条目；`docs/quality/prod-governance-baseline-2026-11-04.md` 明确 14 个短版本（000–013）与生产账本一致 | **已应用，序号仅影响审计排序，不影响重放**。版本 000 数值最小，重放必排最前，正确 | 无需动作；新增短版本号前需评估排序语义 | 待定 |

**39 条总量说明**：除上述 2 条外，其余 37 条同属跨提交补录/改名造成的「版本数值序 ≠ git 添加序」，
本次不逐条整改；若未来把该检查升为阻断，需先做一次性基线重建（另开任务，不在本登记范围）。

## 2. 孤儿迁移 `20261103000005`

| ID | 对象 | 结论 | 依据 | 下一步 | 责任/排期 |
| --- | --- | --- | --- | --- | --- |
| O-01 | 版本号 `20261103000005` | **仓库侧已闭环：无文件、无对象、无重放影响；生产账本行已于 2026-11-05 删除** | ① `database/migrations/` 无该版本文件，`git log --all -- database/migrations/20261103000005*` 无任何提交记录；② 无 DDL/对象可查，`rg '20261103000005'` 在源码/迁移/init 中 0 命中；③ `database/init/` 无等价 DDL（init 无该版本对应脚本）；④ `docs/quality/prod-governance-baseline-2026-11-04.md:75` 记录「installed_on 2026-11-03 10:02，无对应文件，待确认不 DELETE」；⑤ `deploy-notes.md:210` 记录 2026-11-05 部署时已删除该账本行，原行留档 `/tmp/ledger_orphan_20261103000005.txt`（临时目录，易失） | 若需长期审计留痕，把 `/tmp` 留档转存到 `docs/quality/`；同时更新 `TODO.md:97` 的过期口径（仍写「保留待确认」） | 待定 |

**为什么不是「未应用且会导致新环境重放失败」**：它从来没有对应的 `.sql` 文件，空库重放时 sqlx
的待执行集合里根本不含这个版本；它只是生产账本里一行手工补录（db governance check backfill）。
删除该行不改变任何对象状态；保留它也不会让新环境重放失败，只会让「账本 ↔ 磁盘」核对长期漂移。

## 3. `database/migrations-wip/` 六个隔离文件

隔离背景见 [migrations-wip/README.md](migrations-wip/README.md)：2026-10-07 审计时按「只登记、不动活动链」
原则把 32 个 WIP 中无法安全入链的保留在此，其余已并入。活动链版本冲突是它们不能直接搬回的主因。

| ID | 文件 | 想解决什么 | 为何被隔离 | 替代方案 / 现状 | 结论 |
| --- | --- | --- | --- | --- | --- |
| W-01 | `20261004000001_b5_gis_rls_enable.sql` | 为 gis 相关表启用 RLS | 与活动链 `20261006000001_b5_gis_rls_enable.sql` **完全重复**（去注释后 diff 为空） | 已有活动链同内容副本，且已登记应用 | **永久废弃**（保留文件作审计，不入链） |
| W-02 | `20261005000001_rd_status_default_active.sql` | 修正 `rd.*` 表 `status` 默认值 | 版本号与活动链 `20261005000001_align_public_shadow_tables.sql` 冲突 | **已以新版本并入**：`20261005000003_rd_status_default_active.sql`（去注释后内容一致），checksums 已登记 | **永久废弃**（已并入，禁止再动） |
| W-03 | `20261005000002_lims_qa_lab_fk_repoint.sql` | 把 lims 采样单 FK 指向 `qa_lab` | 版本号与 `20261005000002_align_public_core_dict_name_en.sql` 冲突 | **已以新版本并入**：`20261005000004_lims_qa_lab_fk_repoint.sql`（改写为循环幂等实现，checksums 已登记） | **永久废弃**（已并入） |
| W-04 | `20261006000001_scm_sync_records_status_relax.sql` | 放宽 `scm.sync_records` 的 `ck_sync_records_status_standard` 窄约束（P3-2 误加，导致 `status='pending/running/completed'` 写入 500） | 版本号与 `20261006000001_b5_gis_rls_enable.sql` 冲突；修复已现网手工生效 | 重放路径**不会产生**该窄约束：`20260809000002` 的动态加约束执行时 `scm.sync_records` 尚未创建（该表由更晚的 `20261007000009` 创建且无 CHECK）；`20261103000002` 全局清理同类误用 CHECK 的清单也不含该表 | **永久废弃**（新环境无此约束可放宽；若未来改用生产 schema dump 重建，需重新评估） |
| W-05 | `20261006000003_pm_rls_guard_fix.sql` | DROP `pm` schema 中无 `NULLIF` 防护的 14+ 条冗余 RLS 策略（空串 `::uuid` 会报错） | 版本号与活动链 `20261006000003_u3_fake_sync_records_cleanup.sql` 冲突；效果已现网生效 | 活动链与 `database/init/` 均无这些策略名的创建语句（`rg` 0 命中），空库重放不会重建它们 | **待排期**（若要求「任意重建路径（含 schema dump）等价」则以新版本并入，否则可改判永久废弃） |
| W-06 | `20261006000004_erp_rls_guard_fix.sql` | 同 W-05，针对 `erp` schema 冗余 RLS 策略 | 版本号与活动链 `20261006000004_b5b_gis_rls_allowall_policy.sql` 冲突；效果已现网生效 | 活动链无这些策略名创建语句（`20261006000024` 仅覆盖 `master_data`，不等于 erp）；`database/init/` 无对应 DDL | **待排期**（同 W-05 判定条件） |

> 注意：W-05/W-06 的「待排期」不是指线上有问题，而是指**是否要求重建等价性**尚未定案。
> 在定案前维持隔离，禁止把文件直接搬回 `database/migrations/`（会撞版本号并破坏 sort 假设）。

## 4. 维护约定

1. 新增挂账：在上表追加一行，保留 ID 段位（V-/O-/W-），不要改已有条目结论。
2. 整改完成：把「结论」改为「已闭环」并注明日期与对应提交/新迁移版本号，不删除历史记录。
3. 基线刷新：任何新增迁移都会让 Missing down、Multi-responsibility 数字自然增长；
   刷新本文件第 0 节时写清「文件数 + 日期」，避免把增长误读为退化。
4. 严禁把本文件内容写入 `database/checksums.txt`，也不要为「让数字好看」而修改既有迁移或 checksums。
