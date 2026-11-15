库身份：dev `postgresql:///topems?host=/tmp&user=air`（PostgreSQL 18.4）账本 **699 行 / max 20261115141100**；prod `xingzhai@192.168.3.129` → `topems_prod`（只读会话，PGOPTIONS `default_transaction_read_only=on`）账本 **684 行 / max 20261115130000 / failed 0**。

# 表族清理 batch1 计划与执行记录（2026-11-15）

范围：A1+A2 组「需处置的非权威成员」中的两批——12 张需先迁数据的表、9 张仅 prod 归档的表。145 张可删空表不在本批，删除那批单独立项。

## 0. 结论摘要

1. **12 张数据迁移：10 张已应用，2 张 hold。** dev 侧版本 `20261115140000`–`20261115140700`、`20261115141000`–`20261115141100` 已入账；`20261115140800`（tenant_plugins）、`20261115140900`（tenant_users）因外键/依赖阻塞未应用，保持 pending 并已在 manifest 标 `hold`。
2. **后置断言全过**：源行数与目标命中行数逐表对齐、目标表 0 重复主键、抽样字段比对 0 不一致（唯一“差异”是预期内的较新者胜）。
3. **prod 归档：11 条登记，0 写操作。** 族清单 §5 写 9 张，按族处置字段逐成员实测为 **11 张**（差额见 §4.1），本文以实测为准并标注口径差异。
4. dev 上任何写操作前均做了并发检查（活动查询 0 + 账本水位复核），未与另一会话的 B 类演练抢水位。
5. 未提交、未 push、未 force、未用 `--no-verify`、未改任何已推送的历史迁移；prod 未执行任何 DDL/DML。

## 1. 执行前的并发检查（每批都做）

| 时点 | `pg_stat_activity`（同库、非本会话、非 idle） | 账本 max | 判定 |
|---|---|---|---|
| 第二批前 | 0 | 20261115140500 | 空闲，可写 |
| 第三批前 | 0 | 20261115140700 | 空闲，可写 |

`apply-forward.sh` 自身也要求 `--anchor` 与账本 max 严格相等，若另一会话在此期间抬高水位会直接拒绝执行（零 DDL），因此即使并发也不会抢水位。

## 2. 依赖顺序

同一批内存在两组“同主键空间、较新者胜”的依赖，必须按序：

1. `storage.files` → `public.core_files`（140600）**先于** `doc_service.files` → `public.core_files`（140700）。
   两者有 9 个 id 重叠，路由规则是“updated_at 较新者胜”，storage 全部较新且先落库，doc_service 靠 `ON CONFLICT (id) DO NOTHING` 自然丢弃更旧版本。
2. `flow.core_workflows` → `public.core_workflows`（141000）**先于** `flow.workflows` → `public.core_workflows`（141100）。
   18 个 id 重叠，实测 18/18 都是 `flow.core_workflows` 的 `updated_at` 更新，因此后者的期望插入数为 0。

跨族依赖（本轮未执行，见 §5）：`flow.core_tenants` → `public.core_tenants`（F105）必须先于 `flow.core_tenant_users`（140900）；`iam.core_tenants` 的处置决定必须先于 `core.core_tenant_plugins`（140800）。

## 3. 12 张数据迁移逐表

列映射表中“同名”表示源列与目标列同一列名、同类型或可隐式转换。所有迁移都是 `INSERT ... SELECT ... ON CONFLICT (id) DO NOTHING`，每文件一个事务（由 `apply-forward.sh` 外层包裹，文件内无 BEGIN/COMMIT），回滚文件按源 id 删除。

### 3.1 `public.assets` → `erp.assets`（F014 组内、版本 20261115140000）

- 族：`assets`；权威：`erp.assets`（唯一 schema 限定引用）；非权威成员：`public.assets`。
- 行数：源 1 / 目标既有 1；主键冲突 1，逐列比对一致。
- 列映射：31 列全部同名（无重命名、无转换）。
- 动作：noop 迁移；`DO` 块断言行数相等。处置：dev 侧不再保留 `public.assets`（删除单独立项）。
- 结果：**已应用**，源行数 1、目标命中 1。

### 3.2 `public.employees` → `hrm.employees`（版本 20261115140100）

- 族：`employees`；权威：`hrm.employees`；非权威：`public.employees`。
- 行数：源 19 / 目标 19；19 个主键全部冲突且逐列一致。
- 列映射：41 列同名。
- 动作：noop；`DO` 块断言行数相等。结果：**已应用**，19/19。

### 3.3 `mail.emails` → `public.core_emails`（版本 20261115140200）

- 族：`emails`；权威：`public.core_emails`；非权威：`mail.emails`。
- 行数：源 23 / 目标既有 0；主键冲突 0。
- 列映射（13 列，源 27 列中 14 列不迁：status/priority/retry 等为投递态，权威表无对应语义）：

| 目标列 | 源表达式 |
|---|---|
| id | id |
| from_email | from_address |
| to_email | `COALESCE(string_agg(jsonb_array_elements_text(to_addresses), ','), '')` |
| subject / body / sent_at / deleted_at / created_at / tenant_id | 同名 |
| html_body | body_html |
| cc / bcc | jsonb 数组 → `text[]`（NULL 保持 NULL） |
| is_read | 常量 false |

- 结果：**已应用**，23/23；抽样 from_address↔from_email、body_html↔html_body 不一致 0 行。

### 3.4 `public.erp_connections` → `integration.erp_connections`（版本 20261115140300）

- 族：`erp_connections`；权威：`integration.erp_connections`；非权威：`public.erp_connections`。
- 行数：源 38 / 目标既有 57；主键冲突 0。
- 列映射：16 列同名。结果：**已应用**，38/38，目标 95 行；name/status 抽样不一致 0。

### 3.5 `public.erp_mappings` → `integration.erp_mappings`（版本 20261115140400）

- 族：`erp_mappings`；权威：`integration.erp_mappings`；非权威：`public.erp_mappings`。
- 行数：源 31 / 目标既有 55；冲突 0。列映射：15 列同名。
- 结果：**已应用**，31/31，目标 86 行；local_code/external_code 抽样 0 不一致。

### 3.6 `public.external_erp_sync_logs` → `integration.external_erp_sync_logs`（版本 20261115140500）

- 族：`external_erp_sync_logs`；权威：`integration.external_erp_sync_logs`；非权威：`public.external_erp_sync_logs`。
- 行数：源 315 / 目标既有 477；冲突 0。列映射：13 列同名。
- 结果：**已应用**，315/315，目标 792 行；status/total_records 抽样 0 不一致。

### 3.7 `storage.files` → `public.core_files`（版本 20261115140600）

- 族：`files`；权威：`public.core_files`；非权威：`storage.files`。
- 行数：源 43 / 目标既有 0；冲突 0。
- 列映射（13 列）：

| 目标列 | 源表达式 |
|---|---|
| id / created_at / updated_at / tenant_id / deleted_at | 同名 |
| name | filename |
| path | storage_path |
| size | file_size |
| mime_type | content_type |
| extension | 常量 NULL（源无此列） |
| folder_id | parent_id |
| uploader_id | owner_id |
| status | `CASE WHEN status='deleted' THEN 'archived' ELSE status END` |

- 关键判据：`core_files` 有 `ck_core_files_status_standard`（只允许 active/inactive/archived）。源 43 行中 `active` 35、`deleted` 8，8 行 `deleted_at` 均非空。首次执行因此约束失败（事务回滚、账本未写），修正映射为 `deleted→archived` 后重跑成功；**删除语义由同行的 `deleted_at` 承载，未丢信息**。
- 结果：**已应用**，43/43；6 个重命名列抽样 0 不一致；`status='archived' 且 deleted_at 非空` 恰为 8 行，与源 deleted 数对齐。

### 3.8 `doc_service.files` → `public.core_files`（版本 20261115140700）

- 族、权威同上；非权威：`doc_service.files`。
- 行数：源 9；9 个 id **全部**已被 storage 覆盖且 storage 更新更晚 → 期望插入 0。
- 列映射：id / name / size / folder_id / created_at / updated_at / tenant_id / deleted_at 同名；storage_path→path；content_type→mime_type；extension 常量 NULL；status 常量 NULL；uploader_id ← `(SELECT id FROM public.core_users WHERE username='admin')`（源是文本 `created_by='admin'`）。
- 结果：**已应用**，实际插入 0，目标仍 43 行（与期望一致）。admin 兜底映射为 **待 owner 确认**项。

### 3.9 `core.core_tenant_plugins` → `iam.core_tenant_plugins`（版本 20261115140800）— **HOLD**

- 族：`tenant_plugins`；权威：`iam.core_tenant_plugins`（3 处 schema 限定引用）；非权威：`core.core_tenant_plugins`（dev 4 行）。
- 行数：源 4 / 目标 0；冲突 0。列映射：14 列，仅 `purchase_order_id` 由 uuid 转 `::text`，其余同名。
- 阻塞：目标 `core_tenant_plugins_tenant_id_fkey → iam.core_tenants(id)`，而 `iam.core_tenants` 实测 **0 行**；族清单 F105 已判 `iam.core_tenants` 为空壳、dev 侧删除。两者不能同时成立。
- 动作：文件保留、账本未写、manifest 标 `hold`。**需 owner 裁决**（见 §5）。

### 3.10 `flow.core_tenant_users` → `public.core_tenant_users`（版本 20261115140900）— **HOLD**

- 族：`tenant_users`；权威：`public.core_tenant_users`；非权威：`flow.core_tenant_users`（dev 1 行）。
- 行数：源 1 / 目标既有 27；冲突 0。列映射：9 列同名；`status='active'` 满足目标 CHECK。
- 阻塞：目标 `core_tenant_users_tenant_id_fkey → public.core_tenants(id)`；源行 `tenant_id=05a97d16-8e26-4a39-9147-c02df29ef1e4` 只存在于 `flow.core_tenants`（1 行），`public.core_tenants` 无此行。
- 依赖：必须先执行 F105 的 `flow.core_tenants → public.core_tenants`，而 F105 不在本轮 12 张清单内。
- 动作：文件保留、账本未写、manifest 标 `hold`。

### 3.11 `flow.core_workflows` → `public.core_workflows`（版本 20261115141000）

- 族：`workflows`；权威：`public.core_workflows`；非权威：`flow.core_workflows`。
- 行数：源 20 / 目标既有 1；冲突 0。列映射：14 列同名（`name_en` 源 255→目标 128，实测取值长度 0，无截断）。
- 结果：**已应用**，20/20，目标 21 行；name/status 抽样 0 不一致。

### 3.12 `flow.workflows` → `public.core_workflows`（版本 20261115141100）

- 族、权威同上；非权威：`flow.workflows`。
- 行数：源 18；18 个 id 全部被 3.11 刚迁入的行覆盖，实测 18/18 `updated_at` 更旧 → 期望插入 0。
- 列映射：id / name / description / definition / created_at / updated_at / deleted_at / tenant_id 同名；`status ← CASE WHEN is_active THEN 'active' ELSE 'inactive' END`；`version` 常量 1；`created_by ← COALESCE(created_by, admin)`（源 18 行全 NULL）；`published_at/code/name_en` 常量 NULL。
- 结果：**已应用**，实际插入 0，目标仍 21 行（与期望一致）。`is_active→status` 与 admin 兜底均为 **待 owner 确认**项。

## 4. prod 侧“归档标记”的设计

### 4.1 为什么不用现有约定

- `ALTER TABLE ... RENAME TO _archive_<name>`：改表名/结构，会让在跑二进制按原名失败，且必须写 prod —— 违反“不删、不改类型、不停写”。
- `database/migration_manifest.yaml`：登记对象是迁移版本，没有表级处置字段。
- `database/migration-debt-register.md`：迁移链技术债，语义不适用。

结论：新增**仓库侧逻辑归档登记** [database/table_archive_register.yaml](../../database/table_archive_register.yaml)，prod 零写入。标记语义 = 该表已判非权威、不得作为新迁移写入目标、不得新增读写；物理下线另立项。

### 4.2 11 条归档登记（prod 实测均为 0 行）

| 族 | 成员（仅 prod） | 权威表 | prod 行数 |
|---|---|---|---|
| F001 refresh_tokens | `iam.refresh_tokens` | `public.core_refresh_tokens` | 0 |
| F001 refresh_tokens | `public.refresh_tokens` | `public.core_refresh_tokens` | 0 |
| F002 sessions | `iam.sessions` | `public.core_sessions` | 0 |
| F014 equipment | `public.equipment` | `mes.equipment` | 0 |
| F014 equipment | `rs.equipment` | `mes.equipment` | 0 |
| F031 subscriptions | `iam.core_subscriptions` | 族清单 F031 | 0 |
| F038 tenant_usage | `iam.core_tenant_usage` | 族清单 F038 | 0 |
| F081 tenant_modules | `flow.core_tenant_modules` | 族清单 F081 | 0 |
| F101 tenant_permissions | `iam.tenant_permissions` | 族清单 F101 | 0 |
| F111 accounting_subjects | `plugin_erp.accounting_subjects` | `finance.accounting_subjects` | 0 |
| F111 accounting_subjects | `plugin_finance.accounting_subjects` | `finance.accounting_subjects` | 0 |

**9 vs 11 的口径差**：族清单 §5 按“族”汇总，F001 与 F014 各有两个 prod-only 成员却各只计 1，故写 9。逐成员实测 11。本文与登记表按 11 条落地，差异待 owner 确认；若要求严格 9 条，需指定这两族里哪两条不进归档。

## 5. 前置/后置断言

前置（逐迁移在应用前人工+SQL 校验）：表存在、权威表存在、映射覆盖全部目标 NOT NULL 无默认列、目标列类型兼容。

- 类型不兼容仅 3 处，均已在迁移中显式处理：`purchase_order_id` uuid→text、`status` 有 CHECK 需映射、`name_en` varchar(255)→varchar(128)（实测 0 长）。
- 目标 NOT NULL 无默认列覆盖情况：`core_files(name,path,size,uploader_id)`、`core_tenant_users(tenant_id,user_id,email)`、`core_workflows(name,definition,created_by)`、`iam.core_tenant_plugins(tenant_id,plugin_id)`，全部有对应源值或兜底表达式；实测源侧这些列无 NULL。
- 目标 `id` 均有主键，`ON CONFLICT (id)` 可用。

后置（结果见 `database/backup/batch1_family_cleanup_20261115/post_assert_20261115_batch1.txt`）：

- 行数：10 张全部 `源行数 = 目标命中源 id 数`；两张期望 0 插入的表实际插入 0。
- 重复：8 张目标表按 id 分组无重复（PK 兜底，仍逐表复查为 0）。
- 抽样：重命名/转换列逐列比对不一致 0；`flow.workflows` 的 18 行 status 与目标不同属预期（较新的 `flow.core_workflows` 版本胜出）。

前置快照：`database/backup/batch1_family_cleanup_20261115/pre_snapshot_20261115_150430.txt`。

## 6. 文件与登记

- 迁移：`database/migrations/20261115140000`–`20261115141100_family_*.sql`（12 个）。
- 回滚：`database/rollback/2026111514*.rollback.sql`（12 个；有实际插入的 8 个按源 id DELETE，4 个空操作为 `SELECT 1`）。
- manifest：`pending_forward_patches` 追加 12 条（10 条 `to_apply`、2 条 `hold` 并写明阻塞原因）；`ledger_evidence.current_prod` 刷新为 684 行 / max `20261115130000`（prod 只读实测）。
- checksums：`scripts/migration/validate.sh` 重算 `database/checksums.txt`，checksum errors 0 / explicit transaction blocks 0 / errors 0。
- manifest 漂移：`scripts/migration/gen-manifest.sh --check` → `unregistered_pending=0`、`checksum_mismatch=0`、`missing_on_disk=0`，无漂移。

## 7. 待 owner 决策

1. `iam.core_tenants` 与 `iam.core_tenant_plugins` 的矛盾：前者被判空壳待删，后者靠它的外键。三选一：a) 把租户数据先落到 `iam.core_tenants`；b) 改判 `iam.core_tenant_plugins` 的权威地位；c) 该表暂不迁移。
2. `flow.core_tenant_users` 依赖 F105（`flow.core_tenants` 1 行）先迁到 `public.core_tenants`；是否把 F105 纳入本步。
3. 两处兜底假设：`created_by='admin'` / 全 NULL → `public.core_users.username='admin'`（id `2eb884ef-…`）。
4. `storage.files.deleted → archived` 的语义替代（删除语义靠 `deleted_at`）是否认可。
5. prod 归档 9 vs 11 的口径差异。

## 8. 2026-11-15 owner 五条裁决的落地记录

**① `core.core_tenant_plugins` 继续 hold，不迁。** 取证结果：`iam.core_tenant_plugins` 有 15 处运行期 SQL（`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs` 与 `simple_api.rs`，含 INSERT/UPDATE/SELECT）；`core.core_tenant_plugins` 只有 1 处注释（`marketplace.rs:50`）与 fixtures，零运行期引用。dev 行数 core 4 / iam 0。因 iam 侧并非零引用，**不转 D 类“待下线候选”**，保持 hold。`iam.core_tenants` 0 行与 F105 的冲突不在迁移里绕过。

**② F105 不并入本步。** `flow.core_tenant_users` 保持 hold；manifest 里记录依赖（F105）与解除条件（F105 完成 + RLS/claims/缓存影响面核查通过）。租户集变化、令牌/claims 带租户的核查单独立项。

**③ 取消 admin 兜底，改为真实值 + 隔离表。** 已删除两处 `core_users.username='admin'` 子查询：

- `doc_service.files`：`created_by` 是 varchar 自由文本。仅当它是合法 UUID 文本（`pg_input_is_valid(...,'uuid')`）时按真实值写入 `uploader_id`；否则该行（且目标中尚不存在）写入 `public.migration_quarantine_rows`。dev 实际隔离 **0 条**（9 个 id 都已被 storage 版本覆盖，外层去重后无可插入行）。
- `flow.workflows`：`created_by` 为 uuid 且 18 行全 NULL。NULL 且目标 `NOT NULL` → 隔离；有真实值 → 真实值迁移。dev 实际隔离 **0 条**（18 个 id 均被 `flow.core_workflows` 新版本覆盖）。
- 隔离表字段：`migration_version / source_table / source_pk / missing_fields / row_json / created_at`，唯一键 `(version, source_table, source_pk)`，可重复执行。

重跑方式：先按回滚文件撤销 140600/140700/141000/141100 的写入（43 + 20 行，其余为 0），从 dev 账本摘除这 4 个版本（未推送、刚应用、数据效果已撤销），再用修正后的文件按原版本号重放；账本现为 **699 行 / max `20261115141100`**，与重跑前水位一致。

**④ `deleted→archived` 留痕。** 新增 `public.migration_column_rewrites`，140600 在写入前逐行登记「源主键 → 原 status → 新值 + 理由」。dev 实测 8 条，全部 `old_value='deleted'`、`new_value='archived'`；复原语句：

```sql
SELECT row_pk, old_value, new_value, reason
FROM public.migration_column_rewrites
WHERE migration_version = '20261115140600' ORDER BY row_pk;
```

本批 8 个源主键（dev）：`2303ad45-e47d-4159-ac76-1f17c8e86fa3`、`4d58261b-e0b4-4478-bd8b-0226c2a6ee24`、`52c69fdb-7318-4ccb-bcf3-0c5a139c1ecb`、`8ca3e42b-3de6-452c-8cfa-d9735cdd7a36`、`936e25de-4f62-43d7-87f1-5ac55a12565d`、`d1b6278f-b956-429f-9cfd-8acea3a54114`、`de7d3aca-8253-4cc6-ac05-d66422bdbb3b`、`fbebfd19-e388-49de-8728-7122a5a98a7a`。

对 prod 同样成立：140600 先跑，写入前按同一逻辑登记，任何人事后可复原“这行原本是 deleted”。

**⑤ 归档按 11 条。** 见 `database/table_archive_register.yaml`。文中已注明：9 是数族的汇总口径，11 是逐成员实测口径，以实测为准；F001（`iam.refresh_tokens` + `public.refresh_tokens`）与 F014（`public.equipment` + `rs.equipment`）各有两个 prod-only 成员，族汇总时各只计 1。

### 8.1 重跑后断言

见 `database/backup/batch1_family_cleanup_20261115/post_assert_20261115_batch1_rerun.txt`：`core_files=43`（命中原源 43）、`core_workflows=21`（命中 20 + 既有 1）、两表 0 重复、留痕 8/8、隔离 0/0。
