# database/migrations-wip/ — 审计 WIP 迁移隔离区（现状快照 2026-10-20）

> 本目录**不是**活动迁移链。`sqlx migrate run --source database/migrations` 只读取
> `database/migrations/`，本目录下的文件**不会被应用、不会被空库守卫重放**。
>
> 建立时间：2026-10-07（Round-2 第一梯队修复）。
> 隔离原因：这些文件属于**审计 Tier-2/3 工作（RLS 加固批次等）**，按用户原则
> "第二/三梯队只登记不动"、"演进库只进不出、不删用户数据"，**当前一律不应用**。
> 在此登记备查，待对应梯队排期后再评审、并入活动链。

## 现状（2026-10-20 复核回写）

本目录现存 **6 个 SQL + 本 README**。历史 README 按 2026-10-07/10-13 状态叙述
（32/39 文件、27 个独立未应用版本等），与现状不符，已回写为当前快照。

历史沿革（简要）：2026-10-07 隔离 32 个审计 WIP 迁移（commit `37b7719725`）；
2026-10-13 P0-2 连 5432 现网实测甄别后，**26 个 RLS guard fix 已 promoted 入活动链**
（commit `092d91c469`，DDL 效果已在现网生效，入链登记 checksums，不手工插账本）。
本目录剩余 6 个均**无法入链**，保持登记备查，处置约定见文末。

## 现存 6 个 SQL 逐文件状态（2026-10-20 核实）

| 文件 | 状态 | 处置 |
|------|------|------|
| `20261004000001_b5_gis_rls_enable.sql` | **重复草稿**：剔除注释后正文与活动链 `20261006000001_b5_gis_rls_enable.sql` diff=0（同内容、旧编号）；活动链版本已应用 | 不删除、不再次入链；如需追溯旧编号可保留 |
| `20261005000001_rd_status_default_active.sql` | 已 live ALTER 生效（2026-10-04）；版本号与活动链 `20261005000001_align_public_shadow_tables.sql` 冲突 | 已生效仅登记受阻，不入链 |
| `20261005000002_lims_qa_lab_fk_repoint.sql` | 已落地（U3b FK 改指 + 骨架表 DROP 闭环）；版本号与活动链 `20261005000002_align_public_core_dict_name_en.sql` 冲突 | 已生效仅登记受阻，不入链 |
| `20261006000001_scm_sync_records_status_relax.sql` | 非 RLS 迁移（约束放宽）；版本号与活动链 `20261006000001_b5_gis_rls_enable.sql` 冲突 | 已现网生效，登记受阻，不入链 |
| `20261006000003_pm_rls_guard_fix.sql` | 有意 skip：DROP 效果已现网生效（策略 GONE）；版本号与活动链 `20261006000003_u3_fake_sync_records_cleanup.sql` 冲突 | 有意 skip，不删除 |
| `20261006000004_erp_rls_guard_fix.sql` | 有意 skip：DROP 效果已现网生效（策略 GONE）；版本号与活动链 `20261006000004_b5b_gis_rls_allowall_policy.sql` 冲突 | 有意 skip，不删除 |

## 处置约定

- 本目录文件**不删除**，仅从活动链摘除/未入链；第二/三梯队评审通过后再决定并入顺序。
- 任何 `migrate run` / 空库守卫 / drift 扫描均不读本目录。
- `scripts/migration/validate.sh` 的 `MIGRATION_DIRS` 不含本目录，不会校验其 checksum。
- 入链惯例（B5 半手工）：DDL 效果已在现网生效的文件，入链 + 登记 checksums，
  **不手工插入 `_sqlx_migrations` 账本**；后续 `sqlx migrate run` 自然以 no-op 重跑并补记账本。
- 若未来活动链对应版本重构/版本号冲突解除，可评审后入链；否则保持登记即可。

## 历史沿革（完整记录）

- **2026-10-07**：隔离 32 个审计 WIP 迁移至本目录（commit `37b7719725`），活动链 354−315=39 版本差中 7 个第一梯队新迁移保留在活动链，32 个移入本目录（27 独立 + 5 重复版本对成员）。
- **2026-10-13**：P0-2 逐文件连 5432 现网实测（`pg_policies` LEFT JOIN + `pg_class` 对比），218 个 DROP 目标策略全部已 GONE、引用表 218/218 存在、flow `core_workflow_tasks.updated_at` 已存在 → guard fix 重跑为幂等 no-op。
  - **promoted 入活动链（26 个）**：`20261006000000`（flow）+ `20261006000005~000029`（wms/mobile/ehs/mes/lims/crm/srm/qms/scm/doc_service/integration/portal/public/bi/iam/finance/rs/hrm/mail/master_data/notification/storage/ai/core/report 各 rls_guard_fix）。
  - **有意 skip（2 个，滞留本目录）**：`20261006000003_pm_rls_guard_fix.sql`（版本号与活动链 `u3_fake_sync_records_cleanup` 冲突）、`20261006000004_erp_rls_guard_fix.sql`（与 `b5b_gis_rls_allowall_policy` 冲突）；DROP 效果均已现网生效，安全意图已满足。
  - **非本批范围（1 个）**：`20261006000001_scm_sync_records_status_relax.sql`（非 RLS）。
  - **已落地迁移（3 个，不动）**：`20261004000001_b5_gis_rls_enable.sql` / `20261005000001_rd_status_default_active.sql` / `20261005000002_lims_qa_lab_fk_repoint.sql`。
- **2026-10-20**：全面审计复核（git 全量审计 + WIP 目录审计）确认 6 文件现状与活动链无重复落地/分叉；本 README 回写为现状快照。
