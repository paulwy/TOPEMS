# 未限定 schema 的 `CREATE TABLE` 定性（2026-11-18）

> 范围：`database/migrations/**/*.sql` 迁移链中所有**未限定 schema** 的 `CREATE TABLE`（含 `IF NOT EXISTS` / `UNLOGGED`，不含 `TEMP`）。
> 口径：以「文件 + 表名」为一条，去重后 **78 条**、涉及 **75 张不同表**（`tool_permissions`、`tenant_permissions`、`permission_audit_logs` 各被两个迁移文件重复定义）。
> 全程只读：生产库查询均带 `PGOPTIONS='-cdefault_transaction_read_only=on'`，未做任何写入。

## 1. 结论摘要

| 分类 | 条数 | 含义 |
|---|---:|---|
| **真隐患** | **17** | 迁移默认落点（`public`）与生产权威 schema 不一致，且后续迁移没有把权威副本收敛到 `public`；全量重放会多建 `public` 副本、或在建后被删除，导致最终状态与生产不一致 |
| **需人工判断** | **2** | `tenant_permissions` 在两个迁移文件中重复定义，`iam` 与 `public` 双副本均 0 行、代码用裸名读写，权威归属需业务/架构确认 |
| **历史无害** | **59** | `public` 已是权威副本（有生产数据），或后续迁移已用限定建表 / `SET SCHEMA` / drop 把最终副本收敛到与默认落点一致 |
| **合计** | **78** | |

关键结论：**17 条真隐患集中在 6 处**——`007_communication.sql` 的聊天/邮件模板表、`010_billing.sql` 的 5 张计费表、`20260724000003` 的 `core_dashboard_refresh_log`、两份权限表迁移里的 `tool_permissions`、`20261021000006_mes_basics.sql` 的 4 张 MES 基础表、`009_sync.sql` 的 `core_mobile_offline_records`。其中 **MES 4 张表（`workshops` / `production_lines` / `shifts` / `work_calendars`）风险最高**：生产仅 `mes` 有表，代码 `svc/mes/src/modules/basics.rs` 全部用裸名读写，而迁移重放会在 `public` 建同名表。

## 2. 判定口径

### 2.1 「实际落点」如何确定

- **当前受支持路径**：`scripts/migration/apply-forward.sh` 在迁移进程入口强制 `search_path=public`（L158-L184），所以未限定名的表**一律落到 `public`**。
- **历史路径**：PostgreSQL 默认 `search_path = "$user", public`。当执行迁移的角色名恰好等于某个业务 schema（如 `iam`）且该 schema 存在时，会落到该业务 schema。生产里 `iam.*` / `flow.*` / `core.*` 等空副本即历史角色解析留下的痕迹。
- **运行期**：各服务按 `scripts/schema_boundary.json` 给连接池设置 `search_path`（如 `mes, public`、`communication, public`），裸名优先解析到业务 schema。**迁移落点与运行期解析不一致，正是真隐患的成因。**

### 2.2 生产侧证据

- 每张表在 `pg_class` / `pg_namespace` 中的真实 schema 与各副本行数（只读统计）。
- 后续迁移是否出现 `ALTER TABLE ... SET SCHEMA`、限定名 `CREATE TABLE <schema>.<table>`、或 `DROP TABLE`（按迁移版本号升序比对）。

### 2.3 分类判据

| 分类 | 判据 |
|---|---|
| 真隐患 | 默认落点 `public` ≠ 生产权威 schema；后续无 `SET SCHEMA` / 限定重建把权威副本放到 `public`；全量重放后权威 schema 无表或 `public` 多出副本 |
| 需人工判断 | 多 schema 同名、各副本均 0 行、代码裸名读写，无法用数据或迁移证据判定权威 |
| 历史无害 | `public` 有生产数据；或后续迁移已显式收敛（限定建表 public / `SET SCHEMA` / 删除业务副本），重放最终状态与生产一致 |

## 3. 完整清单（78 条）

| # | 迁移文件 | 表名 | 分类 | 实际落点 | 生产真实 schema（行数） | 后续显式化证据 | 判据 |
|---:|---|---|---|---|---|---|---|
| 1 | `007_communication.sql` | `core_chat_members` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0) | 限定建表：public（20261007000006）；后续 drop：public（20261105210000）；public（20261105230000） | 同上（重复定义） |
| 2 | `007_communication.sql` | `core_chat_messages` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0) | 限定建表：public（20261007000006）；后续 drop：public（20261105210000）；public（20261105230000） | 同上（重复定义） |
| 3 | `007_communication.sql` | `core_chat_rooms` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0) | 限定建表：public（20261007000006）；后续 drop：public（20261105210000）；public（20261105230000） | 预期 iam（生产仅 iam）；重放落 public 后被 20261105210000/230000 删除，最终缺失 |
| 4 | `007_communication.sql` | `core_email_templates` | 真隐患 | public（当前 search_path）；历史 `$user`→public | communication(0)/iam(0) | 限定建表：communication（20260921000107）；public（20261007000006）；communication（20261107000019）；后续 drop：public（20261105210000）；public（20261105230000）；communication（20261107000019） | 预期 iam（生产 iam+communication，均 0 行）；重放落 public 后被 20261105* 与 20261107000019 删除 |
| 5 | `009_sync.sql` | `core_mobile_offline_records` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0)/mobile(0) | 限定建表：public（20261007000006）；后续 drop：public（20261105210000）；public（20261105230000） | 预期 iam/mobile（生产双副本，均 0 行）；重放落 public 后被 20261105210000/230000 删除，最终缺失 |
| 6 | `010_billing.sql` | `core_billing_invoices` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0) | 限定建表：public（20261007000006） | 预期 iam（生产仅 iam，0 行）；重放落 public；无后续显式化 |
| 7 | `010_billing.sql` | `core_billing_plans` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0) | 限定建表：public（20261007000006） | 预期 iam（生产仅 iam，0 行）；重放落 public；无后续显式化 |
| 8 | `010_billing.sql` | `core_plugin_pricing` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0) | 限定建表：core（20261007000006）；后续 drop：public（20260901000021）；core（20261105100000） | 预期 iam（生产仅 iam，0 行）；重放落 public 后被 20260901000021 删除 |
| 9 | `010_billing.sql` | `core_subscriptions` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0) | 限定建表：public（20261007000006）；后续 drop：public（20261018000005） | 预期 iam；重放落 public 后被 20261018000005 删除，最终缺失 |
| 10 | `010_billing.sql` | `core_usage_records` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0) | 限定建表：public（20261007000006） | 预期 iam（生产仅 iam，0 行）；重放落 public；无后续显式化 |
| 11 | `20260724000003_create_dashboard_tables.sql` | `core_dashboard_refresh_log` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0) | 限定建表：public（20261007000006） | 预期 iam（生产仅 iam 有，public 无）；重放落 public；无后续显式化 |
| 12 | `20260825000000_rebuild_permission_tables.sql` | `tool_permissions` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0) | 限定建表：mes（20261007000006）；后续 drop：iam（20261007000012）；mes（20261105210000）；mes（20261105230000） | 预期 iam（生产仅 iam 有）；重放落 public；后续只清理 mes 副本 |
| 13 | `20260827000000_v448_permission_tables.sql` | `tool_permissions` | 真隐患 | public（当前 search_path）；历史 `$user`→public | iam(0) | 限定建表：mes（20261007000006）；后续 drop：iam（20261007000012）；mes（20261105210000）；mes（20261105230000） | 同上（重复定义） |
| 14 | `20261021000006_mes_basics.sql` | `production_lines` | 真隐患 | public（当前 search_path）；历史 `$user`→public | mes(0) | 无 | 预期 mes；重放落 public；后续无显式化；mes.basics.rs 裸名读写 |
| 15 | `20261021000006_mes_basics.sql` | `shifts` | 真隐患 | public（当前 search_path）；历史 `$user`→public | mes(0) | 无 | 预期 mes；重放落 public；后续无显式化；mes.basics.rs 裸名读写 |
| 16 | `20261021000006_mes_basics.sql` | `work_calendars` | 真隐患 | public（当前 search_path）；历史 `$user`→public | mes(0) | 无 | 预期 mes；重放落 public；后续无显式化；mes.basics.rs 裸名读写 |
| 17 | `20261021000006_mes_basics.sql` | `workshops` | 真隐患 | public（当前 search_path）；历史 `$user`→public | mes(0) | 无 | 预期 mes；重放落 public；后续无 SET SCHEMA/限定建表；mes.basics.rs 裸名读写 |
| 18 | `20260825000000_rebuild_permission_tables.sql` | `tenant_permissions` | 需人工判断 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：mes（20261007000006）；public（20261105235000）；后续 drop：iam（20261007000012）；mes（20261105100000） | iam 与 public 双副本均 0 行，代码裸名读写，权威未定 |
| 19 | `20260827000000_v448_permission_tables.sql` | `tenant_permissions` | 需人工判断 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：mes（20261007000006）；public（20261105235000）；后续 drop：iam（20261007000012）；mes（20261105100000） | 同上（重复定义） |
| 20 | `001_iam.sql` | `core_permissions` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(1157) | 限定建表：public（20261007000006）；后续 drop：iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 21 | `001_iam.sql` | `core_role_permissions` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(2917) | 限定建表：public（20261007000006）；后续 drop：iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 22 | `001_iam.sql` | `core_roles` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(17) | 限定建表：public（20261007000006）；后续 drop：iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 23 | `001_iam.sql` | `core_user_roles` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(3) | 限定建表：public（20261007000006）；后续 drop：iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 24 | `001_iam.sql` | `core_users` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：public（20261007000006）；后续 drop：iam（20261027200000）；mes（20261027200000）；public（20261028040000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 25 | `002_tenant.sql` | `core_tenant_modules` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(0) | 限定建表：public（20261007000006）；flow（20261007000009）；public（20261007000009）；后续 drop：flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | 后续重建已把 public 固定为最终副本 |
| 26 | `002_tenant.sql` | `core_tenant_settings` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(4) | 限定建表：public（20261007000006）；flow（20261007000009）；public（20261007000009）；后续 drop：flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 27 | `002_tenant.sql` | `core_tenant_usage` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(0) | 限定建表：public（20261007000006）；flow（20261007000009）；public（20261007000009）；后续 drop：flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | 后续重建已把 public 固定为最终副本 |
| 28 | `002_tenant.sql` | `core_tenant_users` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(3) | 限定建表：public（20261007000006）；flow（20261007000009）；后续 drop：flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 29 | `002_tenant.sql` | `core_tenants` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(1) | 限定建表：public（20261007000006）；flow（20261007000009）；后续 drop：flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 30 | `003_plugin.sql` | `core_plugin_categories` | 历史无害 | public（当前 search_path）；历史 `$user`→public | core(0)/iam(0)/public(0) | SET SCHEMA→core（20260908000001）；限定建表：core（20261007000006）；public（20261007000006）；后续 drop：public（20260901000023）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 31 | `003_plugin.sql` | `core_plugin_instances` | 历史无害 | public（当前 search_path）；历史 `$user`→public | core(0)/iam(0)/public(0) | SET SCHEMA→core（20260908000001）；限定建表：core（20261003000004）；core（20261007000006）；public（20261007000006）；后续 drop：public（20260901000023）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 32 | `003_plugin.sql` | `core_plugin_permissions` | 历史无害 | public（当前 search_path）；历史 `$user`→public | core(0)/iam(0)/public(0) | SET SCHEMA→core（20260908000001）；限定建表：core（20261003000004）；core（20261007000006）；public（20261007000006）；后续 drop：public（20260901000023）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 33 | `003_plugin.sql` | `core_plugin_reviews` | 历史无害 | public（当前 search_path）；历史 `$user`→public | core(0)/iam(0)/public(0) | SET SCHEMA→core（20260908000001）；限定建表：core（20261007000006）；public（20261007000006）；后续 drop：public（20260901000023）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 34 | `003_plugin.sql` | `core_plugin_versions` | 历史无害 | public（当前 search_path）；历史 `$user`→public | core(0)/iam(0)/public(0) | SET SCHEMA→core（20260908000001）；限定建表：core（20261007000006）；public（20261007000006）；后续 drop：public（20260901000023）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 35 | `003_plugin.sql` | `core_plugins` | 历史无害 | public（当前 search_path）；历史 `$user`→public | core(0)/iam(0)/public(0) | SET SCHEMA→core（20260908000001）；限定建表：core（20261007000006）；public（20261007000006）；后续 drop：public（20260901000023）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 36 | `003_plugin.sql` | `core_tenant_plugins` | 历史无害 | public（当前 search_path）；历史 `$user`→public | core(0)/iam(0)/public(0) | SET SCHEMA→core（20260908000001）；限定建表：core（20261007000006）；public（20261007000006）；后续 drop：public（20260901000023）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 37 | `004_dict.sql` | `core_dict_items` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(397) | 限定建表：public（20261005000002）；public（20261007000006）；后续 drop：public（20260901000020）；iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 38 | `004_dict.sql` | `core_dict_types` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(77) | 限定建表：public（20261005000002）；public（20261007000006）；后续 drop：public（20260901000020）；iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 39 | `005_help.sql` | `core_faqs` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/portal(0)/public(0) | 限定建表：public（20261007000006）；portal（20261007000009）；public（20261007000009）；后续 drop：public（20260901000021）；portal（20260917000006）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 40 | `005_help.sql` | `core_guide_lessons` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/portal(0)/public(0) | 限定建表：public（20261007000006）；portal（20261007000009）；public（20261007000009）；后续 drop：portal（20260917000006）；iam（20261027200000）；mes（20261027200000） | 后续重建已把 public 固定为最终副本 |
| 41 | `005_help.sql` | `core_guide_progress` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/portal(0)/public(0) | 限定建表：public（20261007000006）；portal（20261007000009）；public（20261007000009）；后续 drop：portal（20260917000006）；iam（20261027200000）；mes（20261027200000） | 后续重建已把 public 固定为最终副本 |
| 42 | `005_help.sql` | `core_guides` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/portal(0)/public(0) | 限定建表：public（20261007000006）；portal（20261007000009）；public（20261007000009）；后续 drop：public（20260901000021）；portal（20260917000006）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 43 | `006_flow.sql` | `core_workflow_instances` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(0) | 限定建表：public（20260908000011）；flow（20260919000000）；public（20261007000006）；flow（20261007000009）；后续 drop：public（20260908000011）；public（20260917000007）；flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 44 | `006_flow.sql` | `core_workflow_tasks` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(0) | 限定建表：public（20260908000011）；flow（20260919000000）；public（20261007000006）；flow（20261007000009）；后续 drop：public（20260908000011）；public（20260917000007）；flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 45 | `006_flow.sql` | `core_workflows` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(0) | 限定建表：flow（20260917000008）；public（20261007000006）；public（20261007000009）；后续 drop：flow（20260917000008）；public（20260917000008）；public（20260918000009）；flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 46 | `007_communication.sql` | `core_email_queue` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：public（20261007000006）；public（20261105235000） | 后续重建已把 public 固定为最终副本 |
| 47 | `007_communication.sql` | `core_emails` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：communication（20261007000006）；public（20261007000006）；后续 drop：communication（20260917000006）；communication（20261027200000）；iam（20261027200000）；mes（20261027200000） | 后续重建已把 public 固定为最终副本 |
| 48 | `007_communication.sql` | `core_notification_templates` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：communication（20261007000006）；public（20261007000006）；后续 drop：communication（20260917000006）；communication（20261027200000）；iam（20261027200000）；mes（20261027200000） | 后续重建已把 public 固定为最终副本 |
| 49 | `007_communication.sql` | `core_notifications` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：communication（20261007000006）；public（20261007000006）；后续 drop：communication（20260917000006）；communication（20261027200000）；iam（20261027200000）；mes（20261027200000） | 后续重建已把 public 固定为最终副本 |
| 50 | `008_file.sql` | `core_file_folders` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(0) | 限定建表：public（20261007000006）；flow（20261007000009）；后续 drop：flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | 后续重建已把 public 固定为最终副本 |
| 51 | `008_file.sql` | `core_files` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(0) | 限定建表：public（20261007000006）；flow（20261007000009）；后续 drop：flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | 后续重建已把 public 固定为最终副本 |
| 52 | `009_sync.sql` | `core_inter_module_sync` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/integration(0)/public(0) | 限定建表：public（20261007000006）；后续 drop：iam（20261027200000）；mes（20261027200000） | 后续重建已把 public 固定为最终副本 |
| 53 | `011_migration.sql` | `core_migration_history` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(0) | 限定建表：public（20261007000006）；flow（20261007000009）；后续 drop：flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | 后续重建已把 public 固定为最终副本 |
| 54 | `012_menu.sql` | `core_menu_groups` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(130) | 限定建表：public（20261007000006）；flow（20261007000009）；后续 drop：flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 55 | `012_menu.sql` | `core_menus` | 历史无害 | public（当前 search_path）；历史 `$user`→public | flow(0)/iam(0)/public(452) | 限定建表：public（20261007000006）；flow（20261007000009）；后续 drop：flow（20261027200000）；iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 56 | `013_login_log.sql` | `core_login_logs` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(137) | 限定建表：public（20261007000006）；后续 drop：iam（20261027200000）；mes（20261027200000） | public 有生产数据，权威副本即 public |
| 57 | `20260724000003_create_dashboard_tables.sql` | `crm_dashboard_snapshots` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：iam（20261007000006） | 后续迁移已收敛，重放落点与最终状态一致 |
| 58 | `20260724000003_create_dashboard_tables.sql` | `ehs_dashboard_snapshots` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：iam（20261007000006） | 后续迁移已收敛，重放落点与最终状态一致 |
| 59 | `20260724000003_create_dashboard_tables.sql` | `hrm_dashboard_snapshots` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：iam（20261007000006） | 后续迁移已收敛，重放落点与最终状态一致 |
| 60 | `20260724000003_create_dashboard_tables.sql` | `lims_dashboard_snapshots` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：iam（20261007000006） | 后续迁移已收敛，重放落点与最终状态一致 |
| 61 | `20260724000003_create_dashboard_tables.sql` | `pdm_dashboard_snapshots` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：iam（20261007000006） | 后续迁移已收敛，重放落点与最终状态一致 |
| 62 | `20260724000003_create_dashboard_tables.sql` | `wms_dashboard_snapshots` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：iam（20261007000006） | 后续迁移已收敛，重放落点与最终状态一致 |
| 63 | `20260725000001_create_schema_registry.sql` | `dynamic_data` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/master_data(0)/public(0) | 限定建表：public（20261005000001）；iam（20261007000006）；后续 drop：public（20260901000020） | 后续迁移已收敛，重放落点与最终状态一致 |
| 64 | `20260725000001_create_schema_registry.sql` | `schema_registry` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/master_data(0)/public(0) | 限定建表：public（20261005000001）；iam（20261007000006）；mes（20261007000006）；后续 drop：public（20260901000020）；mes（20261105210000）；mes（20261105230000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 65 | `20260825000000_rebuild_permission_tables.sql` | `permission_audit_logs` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：mes（20261007000006）；后续 drop：mes（20261105210000）；mes（20261105230000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 66 | `20260827000000_v448_permission_tables.sql` | `permission_audit_logs` | 历史无害 | public（当前 search_path）；历史 `$user`→public | iam(0)/public(0) | 限定建表：mes（20261007000006）；后续 drop：mes（20261105210000）；mes（20261105230000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 67 | `20260907000001_erp_public_business_tables.sql` | `dashboard_stats` | 历史无害 | public（当前 search_path）；历史 `$user`→public | mes(0) | 限定建表：mes（20261007000006） | 后续迁移已收敛，重放落点与最终状态一致 |
| 68 | `20260907000001_erp_public_business_tables.sql` | `financial_records` | 历史无害 | public（当前 search_path）；历史 `$user`→public | mes(0) | 限定建表：mes（20261007000006） | 后续迁移已收敛，重放落点与最终状态一致 |
| 69 | `20260907000001_erp_public_business_tables.sql` | `inspection_records` | 历史无害 | public（当前 search_path）；历史 `$user`→public | lims(0)/scm(0) | 限定建表：scm（20260910000001）；scm（20260918000060）；lims（20260926120000）；mes（20261007000006）；后续 drop：scm（20260910000001）；mes（20261105213000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 70 | `20260907000001_erp_public_business_tables.sql` | `production_plans` | 历史无害 | public（当前 search_path）；历史 `$user`→public | mes(0) | 限定建表：mes（20260926120000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 71 | `20260907000001_erp_public_business_tables.sql` | `supply_chain_orders` | 历史无害 | public（当前 search_path）；历史 `$user`→public | mes(0) | 限定建表：mes（20261007000006） | 后续迁移已收敛，重放落点与最终状态一致 |
| 72 | `20261021000007_qms_lims_inspection_tables.sql` | `qa_inspection_items` | 历史无害 | public（当前 search_path）；历史 `$user`→public | qms(0) | SET SCHEMA→qms（20261030160000）；限定建表：qms（20261105235000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 73 | `20261021000007_qms_lims_inspection_tables.sql` | `qa_inspection_plan_items` | 历史无害 | public（当前 search_path）；历史 `$user`→public | qms(0) | SET SCHEMA→qms（20261030160000）；限定建表：qms（20261105235000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 74 | `20261021000007_qms_lims_inspection_tables.sql` | `qa_inspection_plans` | 历史无害 | public（当前 search_path）；历史 `$user`→public | qms(0) | SET SCHEMA→qms（20261030160000）；限定建表：qms（20261105235000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 75 | `20261021000007_qms_lims_inspection_tables.sql` | `qa_lims_analytes` | 历史无害 | public（当前 search_path）；历史 `$user`→public | lims(0) | SET SCHEMA→lims（20261030161000）；限定建表：lims（20261105235000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 76 | `20261021000007_qms_lims_inspection_tables.sql` | `qa_sampling_plans` | 历史无害 | public（当前 search_path）；历史 `$user`→public | qms(0) | SET SCHEMA→qms（20261030160000）；限定建表：qms（20261105235000） | 后续迁移已收敛，重放落点与最终状态一致 |
| 77 | `20261021000008_crm_tags_erp_dictionaries.sql` | `erp_dictionaries` | 历史无害 | public（当前 search_path）；历史 `$user`→public | <absent> | 后续 drop：mes（20261105235600）；public（20261105235600） | 后续迁移已收敛，重放落点与最终状态一致 |
| 78 | `20261021000011_p2_11_remainder.sql` | `pdm_drawings` | 历史无害 | public（当前 search_path）；历史 `$user`→public | pdm(0) | SET SCHEMA→pdm（20261030161000）；限定建表：pdm（20261031200000）；pdm（20261105235000） | 后续迁移已收敛，重放落点与最终状态一致 |

## 4. 真隐患的通用修法（仅建议，未动手）

按风险分两档：

### 4.1 高危：MES 4 张基础表

`workshops`、`production_lines`、`shifts`、`work_calendars` 由 `20261021000006_mes_basics.sql` 裸名创建，生产只在 `mes` schema 存在，代码 `svc/mes/src/modules/basics.rs` 全程裸名读写。全量重放会：
1. 在 `public` 建同名表（迁移落点）；
2. 运行期连接 `search_path=mes, public` 仍读 `mes`，`public` 副本成为无人读写却带 RLS 缺口的影子表；
3. 若某环境 `search_path` 顺序变化，写入会落到错误的表。

**建议**：新增单独迁移，把 4 张表显式建到 `mes`（`CREATE TABLE IF NOT EXISTS mes.xxx (...)`），并在迁移头 `SET search_path = mes, public` 作为防御；不要改历史迁移文件（会破坏 checksum）。回滚只需 `DROP TABLE IF EXISTS public.xxx`（若未产生数据）。

### 4.2 中危：其余 13 条

统一模式是「生产权威在 `iam`/`mes`/`communication`，裸名重放落 `public`，部分随后被 drop」。建议按表新增幂等迁移：
- 对权威 schema 补 `CREATE TABLE IF NOT EXISTS <schema>.<table>`（结构复制自现状）；
- 对 `public` 影子副本加 `DROP TABLE IF EXISTS public.<table>`；
- 迁移头统一 `SET search_path = public`，表名一律带 schema 前缀。

不建议：
- 批量给历史迁移补 `SET search_path`：会改 checksum，且不同历史迁移意图不同；
- 用 `ALTER TABLE ... SET SCHEMA` 批量搬表：生产有数据/外键/RLS 策略依赖，风险高于新建。

### 4.3 需人工判断的 2 条

`tenant_permissions` 在 `20260825000000` 与 `20260827000000` 重复定义；`iam` 与 `public` 双副本均 0 行，`svc/unified-core/src/routes/business_tools/database_permission_store.rs` 用裸名读写。**需要架构确认权威 schema**（`iam` 还是 `public`），再决定收敛方向；本文件不预设答案。

## 5. 防回潮建议

1. **CI 门禁**：新增 `scripts/ci/check-unqualified-create-table.sh`，扫描 `database/migrations/**/*.sql`，命中未限定 `CREATE TABLE`（排除 `TEMP`）即 fail。可先以「新增迁移」为范围灰度，存量 78 条进白名单并逐批清理。
2. **迁移模板**：新迁移文件头固定 `SET search_path = public;`，并要求所有 DDL 使用 `schema.table`；模板放进 `database/migrations/TEMPLATE.sql`。
3. **命名约束**：迁移文件名带目标 schema（如 `20261118xxxxxx_mes__create_workshops.sql`），评审时一眼可查。
4. **演练断言**：在快照库跑全量重放后，断言「每个业务 schema 的表清单与生产一致、`public` 无业务表影子副本」，纳入 `run-migration-drill.sh`。

## 6. 复现命令

```bash
# 1) 提取未限定 CREATE TABLE（去注释、排除 TEMP、按 file+table 去重）
python3 /tmp/scan_unqualified_create.py

# 2) 生产 schema 与各副本行数（只读）
PGOPTIONS='-cdefault_transaction_read_only=on' \
  psql "postgres://<user>@localhost:5432/topems_prod" \
  -c "select c.relname, string_agg(n.nspname, ',' order by n.nspname)
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where c.relkind='r' and n.nspname not in ('pg_catalog','information_schema','pg_toast')
      group by 1 order by 1;"

# 3) 后续迁移显式化证据
python3 /tmp/trace_unqual.py
```
