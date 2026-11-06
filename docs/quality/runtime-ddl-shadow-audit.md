# 运行期 DDL 影子表审计（只读）

- 审计日期：2026-11-06
- 范围：`svc/*/src` 全部 `schema_defense` / 运行期建表点；`database/migrations/*.sql`；prod `topems_prod` 只读目录
- 性质：仅静态分析 + 只读 SQL，未修改任何源码、迁移或 checksums

## 一、摘要

| 项 | 数量 |
|---|---|
| 扫描服务 | 26 个（含 `gis` 的 `db/schema.rs`、`tms/models` 等非标准路径） |
| `TABLE_DEFS` 表定义 | 607 条（580 个唯一表名；`portal` 内部有 3 个重复名） |
| `schema_defense` 之外的模块级 DDL | 约 55 处（finance 51、shared-db 3、master-data 动态建表 1） |
| 迁移文件 / 唯一表 / `DROP TABLE` | 598 / 1007 / 592 |
| prod 中运行期定义表的存在性 | **607 / 607 存在，0 缺失** |
| 危险度 | **高 4、中 16、低 587** |

关键共性数据（对 607 条定义与 prod 交叉统计）：

- 184 张表在 prod 中存在同名跨 schema 副本；
- 179 张表 `relrowsecurity = false`；
- 151 张表无 `tenant_id` 列；
- 仅 10 张表 `n_live_tup > 0`（绝大多数影子表为空壳）。

结论：communication 的 `core_notifications` 复活不是孤例。**仍有 22 个服务的启动代码调用 `run_schema_migration_and_verify`，其中统一的 `CREATE TABLE IF NOT EXISTS {schema}.{table} (id ...)` 循环会把任何被迁移链 `DROP` 的表在下次启动时复活**。当前最危险的是 `master_data` 的两张字典表（无 `tenant_id` + `allow_all` 策略 + 裸名 SQL 命中）与 communication 的两张已删表（已在 prod 被复活）。

## 二、高危清单

判据：与权威表同名 + 被裸名 SQL 命中 + 缺关键列（`tenant_id`）或 RLS 关闭。

| 服务 | schema.表名 | 迁移史（含 DROP） | prod 行数 | RLS | 权威表位置 / tenant_id | 代码引用（裸名/全限定） | 代表位置 | 建议处置 |
|---|---|---|---|---|---|---|---|---|
| master-data | `master_data.core_dict_types` | 副本由 `20260725000000_business_base_tables.sql#3202` 建；权威在 `004_dict.sql#1`（public）；未被 DROP | **0**（public 6） | `relrowsecurity=true`，但策略 `master_data_allow_all_core_dict_types`（等同全放行）；**无 tenant_id** | `public.core_dict_types`：有 `tenant_id` + `rls_tenant_isolation` | 8 / 0 | `svc/master-data/src/modules/dict/handlers.rs#75`（`SELECT COUNT(*) FROM core_dict_types`）、`#200`（INSERT 显式写 `tenant_id`） | 删 `schema_defense.rs#19` 定义；SQL 改 `public.core_dict_types`；前向迁移 DROP 副本。**不要给副本补 tenant_id** |
| master-data | `master_data.core_dict_items` | 副本 `20260725000000#3201`；权威 `004_dict.sql#13`；未 DROP | **0**（public 24） | 同上，策略 `master_data_allow_all_core_dict_items`；**无 tenant_id** | `public.core_dict_items`：有 `tenant_id` + `rls_tenant_isolation` | 9 / 0 | `handlers.rs#353`、`#478`（INSERT 含 `tenant_id`） | 同上 |
| communication | `communication.core_notification_templates` | 建：`20260725000000#3012`、`20261007000006#406`；DROP：`20260917000006#24`、`20261027200000_core_schema_duplicates_cleanup.sql#32`；启动期复活 | **0**（public 0） | `false`；communication 无策略 | `public.core_notification_templates`：有 `tenant_id` + `tenant_isolation_...` 策略 | 7 / 0 | `svc/communication/src/notification.rs#2735`（`UPDATE core_notification_templates ...` 软删写到空副本）、`#2848`、`#2310` 等 | 删 `schema_defense.rs#30`；SQL 显式 `public.`；前向迁移把该表并入 `20261107000003` 的 DROP 清单 |
| communication | `communication.core_geofences` | 仅 `20261027200000_core_schema_duplicates_cleanup.sql#31` DROP；无 communication 迁移建表 → 纯启动期自造 | **0**（public 0） | `false`；无 tenant_id | `public.core_geofences`（同样无 tenant_id/RLS，历史遗留；但它是唯一非运行期实体） | 8 / 0 | `svc/communication/src/im_location.rs#281、#378、#426、#468、#497、#569、#597、#668` 全部裸名 | 删 `schema_defense.rs#71`；SQL 显式 `public.`；前向迁移 DROP communication 副本 |

> 租户隔离失效判断：**存在**。`master_data.core_dict_*` 的副本既无 `tenant_id` 又使用 allow-all 策略，读走空副本、写会因缺列报错或绕过租户过滤；`communication.core_notification_templates` 的副本 RLS 关闭，裸名读写完全绕过 `public` 的租户策略。

## 三、中危简表

| 分组 | schema.表名 | 迁移史 | prod 行数 | RLS / tenant_id | 权威表 | 代码引用（裸/全） | 说明与处置 |
|---|---|---|---|---|---|---|---|
| portal 帮助中心 | `portal.core_faqs`、`core_guides`、`core_guide_lessons`、`core_guide_progress` | 权威 `005_help.sql#1/#14/#28/#40`（public）；`20260917000006#33-36` DROP portal 副本；`20261007000009#1364-1398` 又重建 portal 副本；启动期再次保证 | portal 全 0；public 12/12/0/0 | 全 `false` / 无 tenant_id | public：有 `tenant_id` + `rls_tenant_isolation` | 裸名 10/7/2/0；`faq.rs#96/#237`、`guide.rs#288` | 当前 portal 显式使用 `search_path="public, portal"`（`svc/portal/src/main.rs#75`），裸名暂命中 public，故未列高危；但这是**靠顺序兜底**。建议删 4 条定义 + 前向 DROP portal 副本，并保留该顺序不变 |
| portal 联邦/网关 | `portal.federation_subgraphs`、`federation_query_plans`、`federation_execution_logs`、`federation_transactions`、`federation_transaction_steps`、`federation_compensation_logs`、`gateway_routes`、`gateway_protocols`、`gateway_degradation_policies`、`gateway_health_metrics` | `20261007000009` 建（1412-1516），`20261014000000_drop_federation_gateway_tables.sql#14-24` 整体 DROP；启动期复活 | 全 0 | 全 `false` / 无 tenant_id | 无同名权威表（死功能） | 0 / 0 | 删 `models/schema_defense.rs#390-448`（联邦 6 条）与 `#976-1025`（网关 4 条）；库内空副本可选再 DROP |
| master-data 自造 | `master_data.schema_registry`、`master_data.dynamic_data` | master_data schema 在迁移链中**从未建表**；同名表仅在 `iam`/`public` | 全 0 | 全 `false` / 无 tenant_id | public 同名表（也无 tenant） | 0 裸 / 全限定 `public.`（`schema_registry.rs#220、#383、#706`） | 删 `svc/master-data/src/schema_defense.rs#48/#62` 两条定义，避免继续自造空表 |

## 四、低危简表

587 张表满足：同 schema 的迁移链最后事件为 `CREATE`，运行期 `CREATE TABLE IF NOT EXISTS` 纯冗余，无“被删后复活”证据。`RLS 关闭 / 无 tenant_id / 同名跨 schema` 的统计值见摘要，但均不构成“裸名命中错误实体”。

| 服务（schema） | 表数 | 服务（schema） | 表数 |
|---|---|---|---|
| ai（ai） | 4 | pm（pm） | 18 |
| analytics（bi） | 4 | portal（portal） | 112 |
| communication（communication） | 3 | qms（qms） | 30 |
| crm（crm） | 12 | rd（rs） | 6 |
| ehs（ehs） | 43 | scm（scm） | 27 |
| erp（erp） | 25 | srm（srm） | 16 |
| finance（finance） | 66 | ticket（ticket） | 7 |
| gis（gis） | 20 | tms（tms） | 5 |
| hrm（hrm） | 28 | unified-core（public） | 28 |
| integration（integration） | 8 | wms（wms） | 33 |
| lims（lims） | 42 | master-data（master_data） | 7 |
| mes（mes） | 14 | pdm（pdm） | 18 |
| mobile（mobile） | 23 | plugin-registry（core） | 8 |

其余低危运行期 DDL：

- `lib/shared-db/src/schema.rs#194`：`schema_defense_ledger`，纯运行期台账，无同名权威表。
- `lib/shared-db/src/database/mod.rs#275`：`ensure_master_data_refs_table` 动态建 `{service}_master_data_refs`；迁移链已有同 schema 版本（如 `pdm.pdm_master_data_refs`），属冗余通道。
- `lib/shared-db/src/audit.rs#407`：`{prefix}.audit_logs` 建表；未发现 `ensure_table()` 调用方。
- `svc/finance/src/modules/{risk_v54,settlement_v55,tax_v56,reports_v57,treasury_v58,risk_v59,decision_v60}.rs` 共 51 处 `CREATE TABLE IF NOT EXISTS finance_v*`：`init_*_tables` **均无调用方**，当前为死代码；对应表在迁移链均已存在。
- `svc/finance/src/services/finance/database.rs#52/#76`：`init_reconciliation_tables` 同样无调用方。
- `svc/master-data/src/modules/schema_registry.rs#799`：按租户 `schema_json` 动态生成表，**这是仍在使用的“自造表”通道**（`create_schema` 路由 `#194` 调用）；建议纳入迁移/DDL 治理。
- `tools/migration-sdk/src/history.rs#32`：迁移工具自身建表，不属服务运行期。
- `mes` 的 `workshops/production_lines/shifts/work_calendars`：迁移 `20261021000006_mes_basics.sql` 无前缀建表，注释写 public，但 prod 仅 `mes` 存在；属注释与落地 schema 漂移，运行期 DDL 冗余但无同名实体，暂列低危。
- `portal` 的 `TABLE_DEFS` 中 `portal_routing_decisions`、`portal_cache_entries`、`portal_security_policies` 各出现两次，启动循环会重复执行，建议去重。

## 五、方法与局限

- **静态侧**：脚本解析各 `schema_defense.rs` / `gis/src/db/schema.rs` 的 `TABLE_DEFS`（表名 + 文件行号）；迁移链按文件名排序，用最后一条 `CREATE/DROP` 事件判定“是否被删后复活”。无 schema 前缀的迁移 `CREATE` 先按 public 近似，再用 prod 实体修正（如 `mes_basics` 四表实际落在 `mes`）。
- **prod 侧**：仅 `ssh -o BatchMode=yes xingzhai@192.168.110.115 '/opt/homebrew/bin/psql -d topems_prod -X -A -F"|"'` + stdin heredoc；只执行 `SELECT`、`information_schema`、`pg_catalog`、`pg_stat_user_tables`，无任何 DDL/DML。
- 高危/中危表使用 `SELECT count(*)` 精确计数；全量 607 表使用 `pg_stat_user_tables.n_live_tup`（统计窗口内近似值，故摘要中的“非空表”数字只作趋势参考）。
- `core_migration_history` 在 prod 的 `public`/`flow`/`iam` 三处均为 **0 行**，无法用台账确认迁移应用版本；“是否已 DROP”以 prod 实体是否存在为最终证据，文件行号仅代表迁移链意图。
- `only_own_schema_query!` 只是 schema 断言宏（`lib/shared-boundary/src/lib.rs#288`），**不会改写 SQL**；裸名仍按会话/事务 `search_path` 解析（见 `lib/shared-db/src/database/mod.rs#101`）。
- 未审计非 Rust 运行期建表（如前端/脚本中的 SQL）；未覆盖 `tests/` 与 `#[cfg(test)]` 中的 `CREATE TABLE`。

## 六、建议处置顺序

1. **先停重建**：把各服务 `run_schema_migration_and_verify` 中“建空壳表 `CREATE TABLE IF NOT EXISTS {schema}.{table} (id ...)`”这一阶段整体移除，只保留列补齐与一致性校验；迁移链作为唯一建表权威。`svc/communication` 由另一条工作线处理，本审计不触碰。
2. **高危代码去裸名**：`master_data` 字典模块改为 `public.core_dict_types/core_dict_items`；communication 的模板软删与地理围栏 SQL 改为 `public.` 显式前缀。仅加 RLS 不能解决“命中错误实体”。
3. **前向迁移删影子**：`master_data.core_dict_types/items`、`communication.core_notification_templates/core_geofences`、`portal` 帮助中心 4 张 portal 副本；联邦/网关 10 张已 DROP，只需停止重建（可选清理空副本）。
4. **清 `TABLE_DEFS`**：删除上述条目、去重 portal 三个重复名；让 `TABLE_DEFS` 只承载真实业务表。
5. **禁止补列**：不要给影子表补 `tenant_id` 或开 RLS 来“洗白”，否则会形成第二个权威。
6. **治理旁路建表**：`master-data` 动态建表通道与 finance 死代码 `init_*_tables` 纳入迁移链或删除。
7. **加 CI 门禁**：`TABLE_DEFS` 中每张表必须能在迁移链**同 schema** 找到 `CREATE`，且其后不得存在 `DROP`；`svc/*/src` 新增 `CREATE TABLE` 需白名单。
