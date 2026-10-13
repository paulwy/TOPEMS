# database/migrations-wip/ — 审计 WIP 迁移隔离区

> 本目录**不是**活动迁移链。`sqlx migrate run --source database/migrations` 只读取
> `database/migrations/`，本目录下的文件**不会被应用、不会被空库守卫重放**。
>
> 建立时间：2026-10-07（Round-2 第一梯队修复）。
> 隔离原因：这些文件属于**审计 Tier-2/3 工作（RLS 加固批次等）**，按用户原则
> "第二/三梯队只登记不动"、"演进库只进不出、不删用户数据"，**当前一律不应用**。
> 在此登记备查，待对应梯队排期后再评审、并入活动链。

## 隔离口径（事实复核 2026-10-07）

- 隔离前：`database/migrations/` 共 **354** 个 .sql，两库 `public._sqlx_migrations`
  账本均 **315** 行且全部 success=true、集合与 sha384 checksum 两库一致、与磁盘对齐。
- 未应用文件 = 354 − 315 的"版本差"共 **39** 个，其中：
  - **7 个 = 第一梯队（Round-2）新迁移**（保留在活动链）：
    `20261007000018~22`、`20261007000028`、`20261007000029`。
  - **32 个 = 审计 WIP（本目录）**：27 个独立未应用版本 + 5 个重复版本对的未应用成员。
- 隔离后：活动链 `database/migrations/` = **322** 个唯一版本文件（315 已应用 + 7 新）。

## 一、独立未应用版本（27 个，审计 Tier-2/3 RLS 加固批次）

| 版本 | 文件 | 隔离原因 |
|------|------|---------|
| 20261004000001 | b5_gis_rls_enable.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000000 | flow_schema_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000005 | wms_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000006 | mobile_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000007 | ehs_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000008 | mes_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000009 | lims_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000010 | crm_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000011 | srm_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000012 | qms_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000013 | scm_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000014 | doc_service_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000015 | integration_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000016 | portal_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000017 | public_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000018 | bi_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000019 | iam_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000020 | finance_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000021 | rs_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000022 | hrm_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000023 | mail_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000024 | master_data_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000025 | notification_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000026 | storage_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000027 | ai_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000028 | core_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |
| 20261006000029 | report_rls_guard_fix.sql | 审计 Tier-2/3 RLS 加固；未应用 |

## 二、重复版本对的未应用成员（5 个，已用 sha384 账本核对）

这 5 个版本号在隔离前各有**两个同名版本文件**。sqlx 按版本号记账，一个版本只
可能有一条账本记录。经 sha384 核对，每对中**一个已应用（保留在活动链）**，另一个
**未应用（本目录隔离）**。移出未应用成员后，活动链不再有重复版本号。

| 版本 | 本目录（未应用，移出） | 活动链保留（已应用，sha384 匹配账本） |
|------|------------------------|--------------------------------------|
| 20261005000001 | rd_status_default_active.sql | align_public_shadow_tables.sql |
| 20261005000002 | lims_qa_lab_fk_repoint.sql | align_public_core_dict_name_en.sql |
| 20261006000001 | scm_sync_records_status_relax.sql | b5_gis_rls_enable.sql |
| 20261006000003 | pm_rls_guard_fix.sql | u3_fake_sync_records_cleanup.sql |
| 20261006000004 | erp_rls_guard_fix.sql | b5b_gis_rls_allowall_policy.sql |

## 处置说明

- 本目录文件**不删除**，仅从活动链摘除；第二/三梯队评审通过后再决定并入顺序。
- 任何 `migrate run` / 空库守卫 / drift 扫描均不读本目录。
- `scripts/migration/validate.sh` 的 `MIGRATION_DIRS` 不含本目录，不会校验其 checksum。

## 三、P0-2 办理结果（2026-10-13，RLS guard fix 甄别）

针对 20261006 全库 RLS 治理产出的滞留 guard fix，连 5432 逐文件实测现网后甄别。
判定法：`DROP POLICY IF EXISTS` 目标 (schema.table.policy) 与现网 `pg_policies` LEFT JOIN 对比；
引用表与 `pg_class`（relkind='r'）对比。

- **现网实测结论**：218 个 DROP 目标策略全部已不存在（GONE），引用表 218/218 均存在；
  flow 的 `core_workflow_tasks.updated_at` 列已存在。即 10-06 治理 SQL 已直接在现网执行，
  guard fix 重跑为幂等 no-op（IF EXISTS / IF NOT EXISTS 守卫，无副作用）。
- **甄别标准**：幂等（IF EXISTS 守卫）+ 单职责（单 schema）→ 全部通过内容甄别。

### 已 promoted 入活动链（26 个，移入 database/migrations/ 并登记 checksums）

沿用 B5 半手工惯例：DDL 效果已在现网生效，文件入链 + 登记 checksums，
**不手工插入 `_sqlx_migrations` 账本**；后续 `sqlx migrate run` 自然以 no-op 重跑并补记账本。

| 版本 | 文件 |
|------|------|
| 20261006000000 | flow_schema_rls_guard_fix.sql |
| 20261006000005~000029 | wms/mobile/ehs/mes/lims/crm/srm/qms/scm/doc_service/integration/portal/public/bi/iam/finance/rs/hrm/mail/master_data/notification/storage/ai/core/report 各 rls_guard_fix.sql |

### 有意 skip（2 个，滞留本目录，不入链）

| 版本 | 文件 | skip 理由 |
|------|------|-----------|
| 20261006000003 | pm_rls_guard_fix.sql | 版本号与活动链已记账本 `20261006000003_u3_fake_sync_records_cleanup` 冲突，sqlx 不允许同版本双文件；DROP 效果已在现网生效（策略已 GONE），安全意图已满足，仅登记受阻 |
| 20261006000004 | erp_rls_guard_fix.sql | 版本号与活动链已记账本 `20261006000004_b5b_gis_rls_allowall_policy` 冲突；DROP 效果已在现网生效，安全意图已满足 |

> 另：`20261006000001_scm_sync_records_status_relax.sql` 为非 RLS 迁移，不在本批次范围；
> `20261004000001_b5_gis_rls_enable.sql` / `20261005000001` / `20261005000002` 为已落地迁移，不动。
