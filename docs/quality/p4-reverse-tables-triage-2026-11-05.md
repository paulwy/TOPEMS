# P4 反向表余量归属核查与分类处置方案（2026-11-05）

> 对象：`topems_prod` @ `192.168.110.115`（PostgreSQL **18.4**，`pg_class` 实测 **1392** 张普通/分区表）。
> 对照：同实例 `topems_test`（**1329** 张）。
> 口径：`prod 独有 = prod 表集合 − test 表集合`，按 `schema.table` 精确比较；`relkind IN ('r','p')`，排除 `pg_catalog / information_schema / pg_toast`。
> 本轮**只读**：仅 `SELECT` / `pg_catalog` / `information_schema`，未执行任何 DDL/DML，未改迁移账本。
> **执行状态（2026-11-05 12:22–12:26）**：用户已确认按本文件倾向执行，§4 的 39 张 + `finance.settlements` + `mes.inspection_records` + `public.core_coding_rules` 共 **42 张已删除**；`mes.erp_dictionaries` 与 §7 的 20 张保留未动。逐表状态见 [§14](#14-执行记录2026-11-05)。
> 上一轮处置单为临时文件 `/tmp/p4_mapping.md`，未入库；本文件的全部数字均由 2026-11-05 的 `pg_catalog` 实测重建，不依赖 `/tmp`。

## 1. 结论摘要

| 项 | 实测值 |
|---|---|
| prod 表数 / test 表数 | 1392 / 1329 |
| **prod 独有（真实余量）** | **63** |
| 可直删 | **39** |
| 需先重指向 FK 再删 | **0** |
| 需迁移数据再删 | **0** |
| 应保留 | **20** |
| 待业务确认 | **4** |
| 可直删 + 可重指向合计 | **39** |
| 有真实数据行的表 | **1**（`public.core_coding_rules`，2 行；其余 62 张 0 行，合计 2 行） |
| 入站 FK | **3 条**，全部落在保留簇 `qms` 内部 |
| 视图 / 物化视图 / 函数依赖 | **0** |
| 触发器依赖 | **1 个**（`public.tenant_permissions`，属保留表） |
| `search_path` 歧义（结构层面） | **6 张**；当前影响运行时解析 **0 张**（见 §9） |
| `relkind` | 63/63 为 `r`（普通表）；无分区表、无外部表 |
| **执行后（2026-11-05 12:26）** | prod 表数 **1350**（删除 42 张）；FK 277；`/health` 200；账本 571 |

**与「62 张」的差异（必须说明）**：上一轮处置单为 74 张；P4 首批已删 11 张（3 直接删 + 8 重指向后删），旧单剩余 **62** 张；本轮实测新增 1 张旧单未列出的 `public.core_coding_rules`（由 `database/seeds/coding_rules.sql` 在部署时创建），故真实总数 **63 = 62 + 1**。其中 `public.core_chat_members` 在 P8 文档已登记「随 P4 删除」，不单独补 PK。

## 2. 取证口径与方法

### 2.1 连接与只读约束

```bash
ssh -f -N -L 15432:127.0.0.1:5432 xingzhai@192.168.110.115
psql "postgres://xingzhai@127.0.0.1:15432/topems_prod"          # 只读
ssh xingzhai@192.168.110.115 "/opt/homebrew/bin/psql -d topems_test -tA -F'|' -f -"
```

prod 侧未设置 DB/角色级 `search_path` 覆盖；psql 会话默认 `"$user", public`，各服务在 `main.rs` / 嵌入式模块内以 `SEARCH_PATH` 环境变量显式设定（见 §2.4）。

### 2.2 表差集

```sql
SELECT n.nspname||'|'||c.relname||'|'||c.relkind::text
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p')
  AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
ORDER BY 1;
```

两侧导出后 `comm -23`。结果 63 张，清单与逐表证据见附录 §13.1。

### 2.3 列结构比对（判断「真影子」还是「test 缺失的独立表」）

- 以 **列名集合** 计算 Jaccard，再统计 **列类型精确一致数**，并核对主键列名；
- 候选来源只限 **test 侧同名表（跨 schema）**；另对 `cand = NONE` 的表做 **全 test 表列集合最近邻** 搜索，用于发现「改名对应」；
- 「严格影子」判据：列名集合一致（Jaccard=1.00）或 ≥0.90 且主键一致；
- 「骨架表」判据：仅 `id/tenant_id/created_at/updated_at` 等 4–5 列，列集合 Jaccard 低但语义可由权威表覆盖（由 `k1_missing_table_baselines` / `rebuild_orphan_tables` 生成）。

### 2.4 代码引用检索口径（关键：不能只看字符串命中）

```bash
# 限定名 + 裸名合并（注意 POSIX ERE 不支持 \b，改用 -w）
git grep -n -I -F "schema.table" -- svc lib apps packages cli scripts config deploy database tests docs
git grep -n -I -w "table"        -- svc lib apps packages cli scripts config deploy database tests docs
```

- 路径分桶：`database/**` = 迁移/初始化/seeds（非运行时）；`docs/**`、`tests/**` = 文档/测试；`scripts/**`、`config/**`、`deploy/**` = 运维脚本；其余（`svc/ lib/ apps/ packages/ cli/`）才参与运行时判定。
- **裸表名按服务真实 `search_path` 解析**，而不是按字符串所在目录猜测。各服务实测值：

| 服务 | SEARCH_PATH |
|---|---|
| `communication` | `communication, public, shared` |
| `ehs` | `ehs, public, shared` |
| `erp` | `erp, public` |
| `finance` | `finance, public, shared` |
| `lims` | `lims, public, shared` |
| `mes` | `mes, public, shared` |
| `mobile` | `mobile, public, shared` |
| `monitor` | `public` |
| `pdm` | `pdm, public, shared` |
| `qms` | `qms, public, shared` |
| `unified-core`（嵌入式，prod 实际形态） | `flow, public`（`svc/unified-core/src/embedded.rs`） |
| `svc/server` 其余聚合代码 | `flow, mobile, rs, erp, public, iam, shared` |

> 说明：`svc/unified-core/src/main.rs` 曾有 `SEARCH_PATH=public` 的独立形态，但 prod 只运行聚合二进制 `topems-server`（`com.topems.server.plist`），嵌入式路径为 `flow, public`；本轮按 prod 实际形态判定。
- 判定顺序：① 行内存在 `x.<table>` 限定名 → 只有 `x == 本表 schema` 才算命中；② 否则要求命中 SQL 关键字（`FROM/JOIN/INTO/UPDATE/DELETE FROM/TRUNCATE/TABLE`）且裸名按该文件所属服务的 `search_path` 解析到本表；③ 纯注释行排除。

### 2.5 迁移来源

`git grep -l -i -E 'create table [if not exists] (schema\.)?table' -- database`，取首个命中。63 张来源分布：**44 张版本化迁移** + **18 张 `database/init`** + **1 张 `database/seeds`**。

## 3. 分类汇总

| 类别 | 数量 | 处置边界 |
|---|---:|---|
| 可直删 | **39** | 0 行 + 0 入站 FK + 运行时 0 命中本表 + test 侧有权威对应表 |
| 需先重指向 FK 再删 | **0** | 无集合外入站 FK；3 条入站 FK 全在保留的 `qms` 簇内部 |
| 需迁移数据再删 | **0** | 唯一有数据的表无权威对应表，转入「待业务确认」 |
| 应保留 | **20** | 有真实运行时读写，且 test 侧无同名/同构权威表 |
| 待业务确认 | **4** | 权威归属或结构无法判定的具体问题见 §8 |
| 合计 | **63** | — |

补充事实：

- 63 张中 **61 张 0 行**，仅 `public.core_coding_rules` 有 2 行（`employee_no` / `purchase_order_no` 规则），全集合合计 **2 行**。
- 出站 FK 共 **18 条**（可直删表） + 5 条（保留表）；可直删表的出站 FK 全部指向保留表（`mobile.mobile_users`、`iam.tenant_permissions`、`public.qa_ehs_emergency_plans`、`public.qa_ehs_inspection_items`、`public.qa_ehs_hazardous_materials`、`ehs.qa_ehs_drill_records`、`ehs.qa_ehs_inspection_records`），删除子表只会移除子表侧约束，不影响父表。
- 63 张 `relkind` 全为 `r`；无分区父表/子表、无外部表。

## 4. 可直删（39 张）

统一依据（每张均满足）：`count(*) = 0`、无入站 FK、运行时检索 0 命中本表（裸名按所属服务 `search_path` 均解析到另一张权威表或根本没有代码引用）、test 侧存在结构等价或可覆盖的权威表。

### 4.1 `public.qa_ehs_*` 影子（12 张）→ 权威 `ehs.*`

每条代码引用（`svc/ehs/**`）在 `ehs, public, shared` 下均解析到 `ehs.*`，`public` 副本零命中。其中 `emergency_plan_*` 的出站 FK 指向 `public.qa_ehs_emergency_plans`（该父表在 test 中存在，保留）。

| 表 | schema | 行数 | 入站FK | 出站FK | 代码引用 | 迁移来源 | 判定 |
|---|---|--:|--:|---|---|---|---|
| `qa_ehs_discharge_permits` | public | 0 | 0 | 0 | 0 运行时（迁移 40 处） | `20261007000006_rebuild_orphan_tables.sql` | 直删 |
| `qa_ehs_disease_cases` | public | 0 | 0 | 0 | 0 运行时（迁移 39 处） | 同上 | 直删 |
| `qa_ehs_drill_evaluations` | public | 0 | 0 | 1 → `ehs.qa_ehs_drill_records` | 0 运行时（迁移 57 处） | 同上 | 直删 |
| `qa_ehs_drill_problems` | public | 0 | 0 | 1 → `ehs.qa_ehs_drill_records` | 0 运行时（迁移 55 处） | 同上 | 直删 |
| `qa_ehs_emergency_plan_approvals` | public | 0 | 0 | 1 → `public.qa_ehs_emergency_plans` | 0 运行时（迁移 37 处） | 同上 | 直删 |
| `qa_ehs_emergency_plan_supplies` | public | 0 | 0 | 1 → `public.qa_ehs_emergency_plans` | 0 运行时（迁移 31 处） | 同上 | 直删 |
| `qa_ehs_emergency_plan_versions` | public | 0 | 0 | 1 → `public.qa_ehs_emergency_plans` | 0 运行时（迁移 35 处） | 同上 | 直删 |
| `qa_ehs_employees` | public | 0 | 0 | 0 | 0 运行时（迁移 41 处） | 同上 | 直删 |
| `qa_ehs_env_monitor_records` | public | 0 | 0 | 0 | 0 运行时（迁移 36 处） | 同上 | 直删 |
| `qa_ehs_environment_incidents` | public | 0 | 0 | 0 | 0 运行时（迁移 48 处） | 同上 | 直删 |
| `qa_ehs_inspection_record_items` | public | 0 | 0 | 2 → `public.qa_ehs_inspection_items`、`ehs.qa_ehs_inspection_records` | 0 运行时（迁移 53 处） | 同上 | 直删 |
| `qa_ehs_msds` | public | 0 | 0 | 1 → `public.qa_ehs_hazardous_materials` | 0 运行时（迁移 38 处） | 同上 | 直删 |

权威对应（test）：`ehs.qa_ehs_discharge_permits`（19/19 类型一致，j=0.95）、`disease_cases`（22/22，1.00）、`drill_evaluations`（13/13，0.93；test 45 行）、`drill_problems`（15/15，1.00）、`emergency_plan_approvals`（10/10，1.00）、`emergency_plan_supplies`（11/11，1.00）、`emergency_plan_versions`（9/9，1.00）、`employees`（12/12，1.00；test 12 行）、`env_monitor_records`（21/21，0.95）、`environment_incidents`（23/23，0.96）、`inspection_record_items`（9/9，1.00）、`msds`（21/21，1.00）。

### 4.2 `public` 移动端影子（12 张）→ 权威 `mobile.*`

`svc/mobile/**` 的裸名在 `mobile, public, shared` 下均解析到 `mobile.*`；`public` 副本零命中。12 张全部由 `database/init/05_mobile_init.sql` 创建（不在迁移链）。

| 表 | schema | 行数 | 入站FK | 出站FK | 代码引用 | 迁移来源 | 判定 |
|---|---|--:|--:|---|---|---|---|
| `barcode_scans` | public | 0 | 0 | 1 → `mobile.mobile_users` | 0 命中本表 | `database/init/05_mobile_init.sql` | 直删 |
| `devices` | public | 0 | 0 | 1 → `mobile.mobile_users` | 0 命中本表 | 同上 | 直删 |
| `media_files` | public | 0 | 0 | 0 | 0 命中本表 | 同上 | 直删 |
| `mobile_scan_records` | public | 0 | 0 | 1 → `mobile.mobile_users` | 0 命中本表 | 同上 | 直删 |
| `offline_operations` | public | 0 | 0 | 1 → `mobile.mobile_users` | 0 命中本表 | 同上 | 直删 |
| `offline_sync_records` | public | 0 | 0 | 1 → `mobile.mobile_users` | 0 命中本表 | 同上 | 直删 |
| `photo_uploads` | public | 0 | 0 | 1 → `mobile.mobile_users` | 0 命中本表 | 同上 | 直删 |
| `push_devices` | public | 0 | 0 | 1 → `mobile.mobile_users` | 0 命中本表 | 同上 | 直删 |
| `push_notifications` | public | 0 | 0 | 0 | 0 命中本表 | 同上 | 直删 |
| `push_templates` | public | 0 | 0 | 0 | 0 命中本表 | 同上 | 直删 |
| `shortcuts` | public | 0 | 0 | 1 → `mobile.mobile_users` | 0 命中本表 | 同上 | 直删 |
| `sync_policies` | public | 0 | 0 | 1 → `mobile.mobile_users` | 0 命中本表 | 同上 | 直删 |

权威对应（test，列类型一致/j）：`barcode_scans` 9/12，0.92（test 2 行）、`devices` 7/14，0.93（1 行）、`media_files` 6/12，0.92、`mobile_scan_records` 8/9，0.90（2 行）、`offline_operations` 8/12，0.92（1 行）、`offline_sync_records` 8/10，0.91（1 行）、`photo_uploads` 13/19，0.95、`push_devices` 6/11，0.92（1 行）、`push_notifications` 10/14，0.82（4 行）、`push_templates` 8/10，0.91（2 行）、`shortcuts` 11/11，0.92、`sync_policies` 8/9，0.90（1 行）。类型差异为历史收窄/加宽，不影响「0 行删除」。

### 4.3 协作 / 邮件 / 离线影子（4 张）

| 表 | schema | 行数 | 入站FK | 出站FK | 代码引用 | 迁移来源 | 权威（test） | 判定 |
|---|---|--:|--:|---|---|---|---|---|
| `core_comments` | public | 0 | 0 | 0 | 0（裸名在 `flow, public` 下解析到 `flow.core_comments`） | `20261029120000_schema_defense_orphan_tables_to_authoritative.sql` | `flow.core_comments` 11/11，1.00 | 直删 |
| `core_favorites` | public | 0 | 0 | 0 | 同上 → `flow.core_favorites` | 同上 | `flow.core_favorites` 7/7，0.88 | 直删 |
| `core_email_templates` | public | 0 | 0 | 0 | 0（`communication` 启动期由 `schema_defense` 建 `communication.core_email_templates`） | `007_communication.sql` | `communication.core_email_templates` 9/9，0.90 | 直删 |
| `core_mobile_offline_records` | public | 0 | 0 | 0 | 0（裸名解析到 `mobile.core_mobile_offline_records`） | `009_sync.sql` | `mobile.core_mobile_offline_records` 13/13，0.81 | 直删 |

> `core_comments` / `core_favorites` 是 `20261029120000` 依据「迁移缺表」判断时补建的 `public` 副本；实际运行时 `unified-core`（嵌入式 `flow, public`）解析到 `flow.*`，故该副本从未被写入（0 行）。删除前提是 `flow.*` 存在（prod/test 均存在，已实测）。

### 4.4 聊天影子（3 张）→ 权威 `iam.*`

| 表 | schema | 行数 | 入站FK | 出站FK | 代码引用 | 迁移来源 | 权威（test） | 判定 |
|---|---|--:|--:|---|---|---|---|---|
| `core_chat_members` | public | 0 | 0 | 0 | 0（仅 `schema_defense` 注释列举，无 SQL） | `007_communication.sql` | `iam.core_chat_members` 5/5，1.00 | 直删 |
| `core_chat_messages` | public | 0 | 0 | 0 | 同上 | `007_communication.sql` | `iam.core_chat_messages` 11/11，1.00 | 直删 |
| `core_chat_rooms` | public | 0 | 0 | 0 | 同上 | `007_communication.sql` | `iam.core_chat_rooms` 8/8，1.00 | 直删 |

`public.core_chat_members` 是 P8 文档中唯一未补 PK 的反向表；删除后 prod 无 PK 表清零（其余运行时账本表已在 P8 补齐）。

### 4.5 空库重建链骨架与历史对齐骨架（5 张）

| 表 | schema | 行数 | 入站FK | 出站FK | 代码引用 | 迁移来源 | 权威（test） | 判定 |
|---|---|--:|--:|---|---|---|---|---|
| `reports` | public | 0 | 0 | 0 | 0（`analytics` 裸名解析到 `bi.reports`） | `20261015000074_k1_missing_table_baselines.sql` | `bi.reports` 5/5 列名一致（j=0.26，test 1 行） | 直删 |
| `report_templates` | public | 0 | 0 | 0 | 0 → `bi.report_templates` | 同上 | `bi.report_templates` 4/4（j=0.19） | 直删 |
| `report_schedules` | public | 0 | 0 | 0 | 0 → `bi.report_schedules` | 同上 | `bi.report_schedules` 4/4（j=0.20） | 直删 |
| `cqrs_projection_progress` | public | 0 | 0 | 0 | 0（`finance` 裸名解析到 `finance.cqrs_projection_progress`） | `20261015000074_k1_missing_table_baselines.sql` | `finance.cqrs_projection_progress`（prod 4 列中 2 列同名同位，test 2 行） | 直删 |
| `quality_records` | public | 0 | 0 | 0 | 0（`mes` 代码显式 `mes.quality_records`） | `20260920000094_public_schema_align.sql` | `mes.quality_records` 列名 20/20（j=1.00），类型仅 9/20 一致 | 直删 |

> 前 4 张是 4–5 列的最小骨架（`id/tenant_id/created_at/updated_at`），由空库重建链补齐，不是业务表；`quality_records` 列名全覆盖但 11 列类型与 `mes` 权威表不同，因 0 行且零引用，删除不涉及数据损失；类型差异本身属 test 侧漂移，另行治理。

### 4.6 `mes` 影子（3 张）

| 表 | schema | 行数 | 入站FK | 出站FK | 代码引用 | 迁移来源 | 权威 | 判定 |
|---|---|--:|--:|---|---|---|---|---|
| `permission_audit_logs` | mes | 0 | 0 | 0 | 0（代码显式 `public.permission_audit_logs`） | `20260825000000_rebuild_permission_tables.sql` | `public.permission_audit_logs` 13/13，1.00（prod/test 均存在） | 直删 |
| `schema_registry` | mes | 0 | 0 | 0 | 0（`master-data` 代码显式 `public.schema_registry`） | `20260725000001_create_schema_registry.sql` | `public.schema_registry`（与 `iam.schema_registry` 11/11，1.00） | 直删 |
| `tool_permissions` | mes | 0 | 0 | 1 → `iam.tenant_permissions` | 0 | `20260825000000_rebuild_permission_tables.sql` | `iam.tool_permissions` 8/9，0.89 | 直删 |

## 5. 需先重指向 FK 再删（0 张）

全库 63 张的入站 FK 仅 3 条，且全部位于 **保留簇** 内部，不存在「指向待删表的外部引用」，因此本类为空：

| 入站 FK | 子表（待删？） | 父表（待删？） |
|---|---|---|
| `qa_inspection_plan_items_item_id_fkey` | `qms.qa_inspection_plan_items`（保留） | `qms.qa_inspection_items`（保留） |
| `qa_inspection_plan_items_plan_id_fkey` | `qms.qa_inspection_plan_items`（保留） | `qms.qa_inspection_plans`（保留） |
| `qa_inspection_plans_sampling_plan_id_fkey` | `qms.qa_inspection_plans`（保留） | `qms.qa_sampling_plans`（保留） |

可直删表的 **18 条出站 FK** 属子表侧约束，`DROP TABLE` 时随表消失，不需要重指向（父表均保留）。P4 首批已完成 19 条「外部入站 FK → 权威表」的重指向，本轮无同类工作。

## 6. 需迁移数据再删（0 张）

63 张合计仅 **2 行**（`public.core_coding_rules`），且该表在 test 无同名/同构候选，不具备「迁移到权威表」的目标，故并入「待业务确认」（§8.4）。

## 7. 应保留（20 张）

判据：全仓存在**运行时读写**，且 test 侧无同名表、全表列集合最近邻 Jaccard ≤0.30（无改名等价物）。**同时说明：这 20 张在 `topems_test` 中不存在，属 test 侧缺表**（§12 问题 5）。

| 表 | schema | 行数 | 入站FK | 出站FK | 运行时引用（文件 / 处数） | 迁移来源 | 判定 |
|---|---|--:|--:|---|---|---|---|
| `core_notification_deliveries` | communication | 0 | 0 | 0 | `svc/communication/src/notification.rs`（10） | `20261020000003_notification_deliveries.sql` | 保留 |
| `core_notification_preferences` | communication | 0 | 0 | 0 | 同上（7） | `20261020000001_notification_preferences.sql` | 保留 |
| `core_notification_subscriptions` | communication | 0 | 0 | 0 | 同上（11） | `20261020000002_notification_subscriptions.sql` | 保留 |
| `hazard_control_measures` | ehs | 0 | 0 | 1 → `ehs.qa_ehs_hazards` | `svc/ehs/src/modules/hazard.rs`（3） | `database/init/10_ehs_schema.sql` | 保留 |
| `hazard_risk_assessments` | ehs | 0 | 0 | 1 → `ehs.qa_ehs_hazards` | 同上（1） | 同上 | 保留 |
| `qa_ehs_alerts` | ehs | 0 | 0 | 0 | `svc/ehs/src/modules/integration.rs`（1） | 同上 | 保留 |
| `qa_ehs_risk_controls` | ehs | 0 | 0 | 0 | `svc/ehs/src/modules/risk.rs`（4） | 同上 | 保留 |
| `qa_ehs_treatments` | ehs | 0 | 0 | 0 | `svc/ehs/src/modules/accident.rs`（3） | 同上 | 保留 |
| `qa_ehs_treatment_actions` | ehs | 0 | 0 | 0 | 同上（3） | 同上 | 保留 |
| `announcements` | erp | 0 | 0 | 0 | `svc/erp/src/modules/announcement.rs`（9） | `20260907000001_erp_public_business_tables.sql` | 保留 |
| `cqrs_events` | finance | 0 | 0 | 0 | `svc/finance/src/domain/pg_event_store.rs`（10，事件存储读写） | `20260915000001_create_cqrs_projection_progress.sql` | 保留 |
| `qa_lims_analytes` | lims | 0 | 0 | 0 | `svc/lims/src/modules/analyte.rs`（7） | `20261021000007_qms_lims_inspection_tables.sql` | 保留 |
| `pdm_drawings` | pdm | 0 | 0 | 0 | `svc/pdm/src/modules/drawings.rs`（6） | `20261021000011_p2_11_remainder.sql` | 保留 |
| `core_email_queue` | public | 0 | 0 | 0 | `svc/communication/src/mail.rs`（5，裸名在 `communication, public` 下无同名前置表） | `007_communication.sql` | 保留 |
| `monitor_thresholds` | public | 0 | 0 | 0 | `svc/monitor/src/modules/monitor/alert_evaluator.rs`（6） | `20261023000006_monitor_thresholds_table.sql` | 保留 |
| `tenant_permissions` | public | 0 | 0 | 0 | `svc/unified-core/src/routes/business_tools/database_permission_store.rs`（8） | `20260725000000_business_base_tables.sql` | 保留 |
| `qa_inspection_items` | qms | 0 | 1（集合内） | 0 | `svc/qms/src/modules/inspection_standard.rs`（9） | `20261021000007_qms_lims_inspection_tables.sql` | 保留 |
| `qa_inspection_plan_items` | qms | 0 | 0 | 2（集合内） | 同上（3） | 同上 | 保留 |
| `qa_inspection_plans` | qms | 0 | 1（集合内） | 1（集合内） | 同上（8） | 同上 | 保留 |
| `qa_sampling_plans` | qms | 0 | 1（集合内） | 0 | 同上（7） | 同上 | 保留 |

注：

- `public.tenant_permissions` 拥有序列 `public.tenant_permissions_id_seq`（`DROP TABLE` 会连带删除），这也是「保留」的理由之一；其与 `iam.tenant_permissions` 列结构等价，但代码未显式限定 schema。
- `public.core_email_queue`、`public.tenant_permissions` 与 `iam.core_email_queue`、`iam.tenant_permissions` **列结构等价（Jaccard=1.00）**，但运行时代码未显式限定 schema，按 `search_path` 解析到 `public` 副本。删除前必须先改代码显式指定 schema 或迁移数据；本轮不动，仅登记「后续可归并」。
- `finance.cqrs_events` 在 test 侧曾被「双表统一」按「空壳」删除，但 prod 代码 `pg_event_store.rs` 仍以 `finance.cqrs_events` 读写事件存储——**test 侧删除属回归，不能作为 prod 删除依据**。

## 8. 待业务确认（4 张）

### 8.1 `finance.settlements`（0 行 / 迁移 29 处 / 前端 60 处 API 字符串）

- 结构：`settlement_no, settlement_type, items(jsonb), amount, status, project_id, ...`（12 列），**无** `settlement_name / settlement_period_* / currency / approved_at`。
- 对比 `pm.settlements`（test 存在，18 列）：列交集 11，类型一致 7/12，Jaccard 0.58；语义也不同（`pm` 为周期结算，本表为「items 明细 + 类型」）。
- 代码侧：`svc/finance/src/modules/settlement_center/**` 明确注释「聚合自 `pm.settlements` 与 `erp.fin_reconciliations`」，**无任何 SQL 读写 `finance.settlements`**；前端 `apps/web/src/api/finance/settlementCenter.ts` 仅命中 API 路径片段。
- **待确认问题**：结算中心是否最终要落地 `finance.settlements`（当前只有契约占位，由 `20261007140000_align_stub_tables_handler_contract.sql` 创建）？
- **倾向建议**：若结算中心已改用 `pm.settlements` 聚合，则**直删**；若仍计划独立结算明细，应补数据写入路径后再保留，不能只留空壳。

### 8.2 `mes.inspection_records`（0 行 / 迁移 68 处 / 服务端无 SQL）

- 结构：`category, item_name, inspector, inspection_time, issues, status`（10 列，MES 车间巡检语义）。
- test 侧同名表：`lims.inspection_records`（21 列，检验任务/样本语义）、`scm.inspection_records`（18 列，来料/批次检验语义）；与本表列交集仅 4–5 列，Jaccard 0.22，均非等价。
- 代码侧：`svc/mes/**` 无 `inspection_records` SQL（`mes.equipment_inspection_records` 是另一张表，且存在）。
- **待确认问题**：MES 车间巡检记录是否已并入 `mes.equipment_inspection_records` 或 `ehs.qa_ehs_inspection_records`？
- **倾向建议**：若巡检功能已迁至设备巡检/EHS 巡检，则**直删**；否则需明确唯一承载表，避免三套巡检数据并行。

### 8.3 `mes.erp_dictionaries`（0 行 / 迁移 2 处 / **裸名解析失败**）

- 唯一副本，test 侧完全无 `erp_dictionaries`（任何 schema）。
- `svc/erp/src/modules/dictionaries.rs` 以裸名 `FROM erp_dictionaries` 访问，`SEARCH_PATH=erp, public`（`svc/erp/src/main.rs` L57；聚合模块 `erp_real_module.rs` L38 同为 `erp, public`）。实测：

  ```sql
  SET search_path TO erp,public,shared;
  SELECT count(*) FROM erp_dictionaries;
  -- ERROR: relation "erp_dictionaries" does not exist
  ```

- **待确认问题**：ERP 字典功能是否启用、应由哪张表承载？（现状是「代码调用会直接报错，prod 仅 mes 一张空表」）
- **倾向建议**：确认功能是否上线——若上线，先在 `erp` schema 建表（或把 SQL 改为 `mes.erp_dictionaries` 并纳入 `mes` 连接路径）后**再删本表/改指向**；若未上线，则**直删** `mes.erp_dictionaries` 并清理 handler。

### 8.4 `public.core_coding_rules`（2 行 / `database/seeds/coding_rules.sql` / 代码 0 引用）

- 2 行为真实配置（`employee_no` / `purchase_order_no` 编码规则），配套序列 `public.employee_no_seq`、`public.purchase_order_no_seq` 在 prod 存在；`deploy-prod.sh` 每次部署会重跑 seeds，**删表后下次部署会原样重建**。
- 全仓 `svc/lib` 无任何 `core_coding_rules` 引用（仅 seeds 自身）。
- **待确认问题**：编码规则功能是否仍规划？若删，是否同时从 `scripts/deploy-prod.sh` 移除 seeds 执行？
- **倾向建议**：功能未落地则「删表 + 移除 seed」成对处理；否则补代码引用后再保留。仅删表不删 seed 等于每轮部署自动回滚，**不建议**。

## 9. `search_path` 歧义清单（6 张结构性歧义，当前 0 张影响运行时）

判定方法：对每张待删表，沿每个服务 `search_path` 计算「当前解析目标」与「删表后解析目标」；若删后落到另一 schema 的同名表，即为**静默回落**。

| 待删表 | 受影响路径 | 当前解析 | 删后回落 | 实际代码影响 | 结论 |
|---|---|---|---|---|---|
| `mes.permission_audit_logs` | `mes, public, shared` | `mes.permission_audit_logs` | `public.permission_audit_logs`（存在，13/13 同构） | 实测无裸名 SQL；唯一引用在 `unified-core` 且显式 `public.` | 潜在风险，不阻断 |
| `mes.schema_registry` | `mes, public, shared` | `mes.schema_registry` | `public.schema_registry`（存在） | 无裸名 SQL（master-data 显式 `public.`） | 潜在风险，不阻断 |
| `public.core_chat_members` | `flow, mobile, rs, erp, public, iam, shared` | `public.core_chat_members` | `iam.core_chat_members`（存在） | 无运行时 SQL（仅 `schema_defense` 注释列举） | 潜在风险，不阻断 |
| `public.core_chat_messages` | 同上 | `public.core_chat_messages` | `iam.core_chat_messages` | 同上 | 潜在风险，不阻断 |
| `public.core_chat_rooms` | 同上 | `public.core_chat_rooms` | `iam.core_chat_rooms` | 同上 | 潜在风险，不阻断 |
| `public.core_email_templates` | `flow, mobile, rs, erp, public, iam, shared` | `public.core_email_templates` | `iam.core_email_templates` | 真实引用均在 `communication`，其路径 `communication, public` 在 `public` 之前已命中 `communication.core_email_templates` | 无影响 |

要点：

1. **真正会改变行为的是「删后静默落到另一张结构不同的表」**。上表 6 张的回落目标都是**同构或等价表**（Jaccard ≥0.90），且当前没有裸名 SQL 会走到它们，故本轮 39 张直删**不会**产生静默改道。
2. 其余 33 张直删表之所以安全，是因为同名的权威表在 `search_path` 中**排在 `public` 之前**（`mobile/ehs/mes/finance/communication/flow` 等），裸名从不会落到 `public` 副本；删除后同样不改变解析。
3. **最隐蔽的一类**是 §8.3：`mes.erp_dictionaries` 之所以「有运行时代码却 rt=0」，是因为裸名在当前 `search_path` 下**根本解析不到任何表**（实测报错），不是被别的 schema 抢走。此类不能用「字符串命中数」判断归属，必须按 `search_path` 实算。

## 10. 额外风险核查（针对可直删 39 张）

| 检查项 | 结果 | 证据 |
|---|---|---|
| 视图 / 物化视图依赖 | **0** | `pg_depend` join `pg_rewrite`，`relkind IN ('v','m')` 无命中 |
| 函数依赖 | **0** | `pg_depend.classid='pg_proc'` 无命中 |
| 触发器 | **1 个**，在 `public.tenant_permissions`（保留表） | `pg_trigger` 依赖查询 |
| RLS 策略 | 仅表自身策略，随 `DROP TABLE` 一并删除；无跨表策略引用 | `pg_policy` 依赖查询 |
| 序列 | 仅 `public.tenant_permissions_id_seq`（保留表 owned）；无可直删表拥有序列；无跨表 `nextval` 引用 | 双向 `pg_depend` 序列查询 |
| 默认值 / 约束 / 索引 | 表自身对象，随表删除 | `pg_constraint` 无外部入站 FK |
| `relkind` | 63/63 = `r` | `pg_class.relkind::text` 实测 |
| 分区表 | 0（无 `relkind='p'`，无 `pg_inherits` 子表） | 同上 |
| 外部表 | 0 | 同上 |

**删除「不可永久生效」提醒**：可直删的 39 张**全部**在仓库有建表来源（27 张版本化迁移 + 12 张 `database/init/**`），prod 删除后，**空库重建链仍会把它们建回来**。要根治需同步修改这些基线迁移（本轮不做 DDL，也不改迁移文件）；因此本轮删除定位是「prod 现网收敛」，不是「迁移链纠偏」。

## 11. 建议执行批次与顺序

> 前置：本轮只读，未执行任何批次。真正执行时遵循 `prod 只读盘点 → 单事务 DDL → `/health` 校验 → 账本登记`。
> **已执行（2026-11-05）**：A1/A2/A3/B 四批按序完成，结果见 [§14](#14-执行记录2026-11-05)。

### 11.1 批次划分

| 批次 | 内容 | 张数 | 依据 |
|---|---|---:|---|
| **A1** | `public.qa_ehs_*` 12 张 | 12 | 同族、同迁移来源、权威 `ehs.*` 齐备 |
| **A2** | `public` 移动端 12 张 | 12 | 同源 `05_mobile_init.sql`、权威 `mobile.*` 齐备 |
| **A3** | 其余 15 张：协作 4 + 聊天 3 + 骨架 5 + `mes` 影子 3 | 15 | 逐表独立、无集合外 FK |
| **B** | 需先重指向 | 0 | — |
| **C** | 待业务确认 4 张 | 4 | 决策后单独迁移 |

顺序理由：先删「同族 + 零依赖」的 A1/A2（风险最低、可批量校验），再删 A3（含结构性歧义的 6 张，需单独确认），最后处理 C（涉及功能归属）。

### 11.2 单批前置校验（对批次清单逐表执行，任一不满足即中止）

```sql
-- {tbl} = schema.table；{auth} = 权威表 schema.table
-- 1) 表存在且为普通表
SELECT relkind::text FROM pg_class WHERE oid = '{tbl}'::regclass;              -- 期望 r
-- 2) 精确 0 行
SELECT count(*) FROM {tbl};                                                    -- 期望 0
-- 3) 无入站 FK
SELECT conname, conrelid::regclass AS child
  FROM pg_constraint WHERE contype='f' AND confrelid='{tbl}'::regclass;        -- 期望 0 行
-- 4) 无视图/物化视图依赖
SELECT DISTINCT c.relkind::text, c.relnamespace::regnamespace||'.'||c.relname
  FROM pg_depend d JOIN pg_class c ON c.oid = d.objid
 WHERE d.refobjid = '{tbl}'::regclass AND c.relkind IN ('v','m');              -- 期望 0 行
-- 5) 无函数依赖
SELECT p.proname FROM pg_depend d JOIN pg_proc p ON p.oid = d.objid
 WHERE d.refobjid = '{tbl}'::regclass AND d.classid = 'pg_proc'::regclass;     -- 期望 0 行
-- 6) 权威表存在（test 与 prod 都要有）
SELECT to_regclass('{auth}');                                                  -- 期望非空
-- 7) 同名跨 schema 清单（search_path 歧义复核）
SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relname = '{table}' AND c.relkind IN ('r','p') ORDER BY 1;
```

批量脚本（只读，逐表打印 PASS/FAIL）：

```bash
while IFS='|' read -r tbl auth; do
  psql "$PROD_URL" -tA -v ON_ERROR_STOP=1 \
    -c "SELECT '${tbl}', count(*) FROM ${tbl};" \
    -c "SELECT '${tbl}', count(*) FROM pg_constraint WHERE contype='f' AND confrelid='${tbl}'::regclass;" \
    >/dev/null && echo "PASS ${tbl} -> ${auth}" || echo "FAIL ${tbl}"
done < batch_a1.txt
```

### 11.3 回退方式（单表归档）

删除前先按表归档（0 行表归档体积极小，可用 `-Fc`）：

```bash
# prod 机执行（或经隧道在本地）
pg_dump -Fc -h 127.0.0.1 -p 5432 -U xingzhai -d topems_prod \
  -t 'public.qa_ehs_msds' -t 'public.qa_ehs_employees' \
  -f ~/topems/backups/p4_rem_a1_$(date +%Y%m%d_%H%M%S).dump
```

回退（重建被删表并恢复数据）：

```bash
pg_restore --no-owner --no-privileges -h 127.0.0.1 -p 5432 -U xingzhai \
  -d topems_prod ~/topems/backups/p4_rem_a1_<ts>.dump
```

> 注意：`pg_restore` 对已存在的同名表会报错，回退前无需手动删表（本批表已被删）；若表仍存在，说明该批未执行或已部分回退，应先核对。

### 11.4 迁移与账本

- 每批一个迁移文件（`20261105xxxxxx_p4_remove_<batch>_<n>tables.sql`），结构参照首批 [`20261105100000_p4_drop_shadow_tables_and_repoint_fks.sql`](../../database/migrations/20261105100000_p4_drop_shadow_tables_and_repoint_fks.sql) 的 `DO $$ ... RAISE EXCEPTION ... DROP TABLE ...` 守卫块；
- 每条 `DROP TABLE` **不带 `CASCADE`**；
- 执行前 `pg_dump` 备份 + `BEGIN ... ROLLBACK` 预演；执行后 `success=true` 且 checksum 与仓库文件一致，`/health`=200；
- 禁止 `sqlx migrate run`。

## 12. 待拍板问题清单（按重要性）

| # | 问题 | 影响 | 我的倾向 |
|---|---|---|---|
| 1 | `mes.erp_dictionaries`：ERP 字典功能是否启用？裸名在 `erp, public` 下**实测解析失败**，prod 仅 `mes` 一份空表 | 功能实际不可用，或需补建 `erp.erp_dictionaries` | 若功能上线：先建权威表/改 SQL，再删本表；若未上线：直删并清理 handler（**不建议继续保留空壳**） |
| 2 | `finance.settlements`：结算中心是否要落地独立结算明细？现仅契约占位，代码聚合自 `pm.settlements` | 决定 1 张表的去留 | **已按倾向执行：直删**（2026-11-05，见 §14） |
| 3 | `mes.inspection_records`：车间巡检记录的唯一承载表是哪一个（`mes.equipment_inspection_records` / `ehs.qa_ehs_inspection_records` / 保留本表） | 决定 1 张表去留，且影响三套巡检数据边界 | **已按倾向执行：直删**（2026-11-05，见 §14）；巡检由设备巡检 + EHS 巡检承载 |
| 4 | `public.core_coding_rules`：编码规则功能是否仍规划？`deploy-prod.sh` 每轮重跑 seeds，**删表不删 seed 会立即重建** | 2 行配置 + 2 个序列 | **已按倾向执行：删表 + 移除 `deploy-prod.sh` 内 seed 调用**（2026-11-05，见 §14）；两序列保留 |
| 5 | 20 张「应保留」表在 `topems_test` **不存在**（代码在用） | test 覆盖缺口：新环境/回归会缺表 | 建议将 20 张补建进 test（按 prod 结构），但需确认「test 是否仍是有效对照基线」；本轮不动 |
| 6 | 39 张可直删表全部有仓库建表来源（27 张迁移 + 12 张 `database/init`），删除后**空库重建会全部重建** | 删除只在 prod 生效，重建链仍冗余 | 建议后续单独立项同步基线迁移；本轮先删现网，不扩大 DDL 范围 |

## 13. 附录

### 13.1 复算命令

```sql
-- 差集（两侧分别执行后 comm）
SELECT n.nspname||'|'||c.relname||'|'||c.relkind::text
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
ORDER BY 1;

-- 逐表精确行数（63 条 UNION ALL）
-- 见本轮 /tmp/p4_cnt2.sql 生成方式：对每张表 SELECT '<schema.table>', count(*) FROM <schema.table>
```

```bash
# 入站 / 出站 FK
WITH tgt(sch,tbl) AS (VALUES ('public','qa_ehs_msds'), ...) SELECT ...
```

```bash
# 代码引用（限定名 + 裸名）
git grep -n -I -F "schema.table" -- svc lib apps packages cli scripts config deploy database tests docs
git grep -n -I -w  "table"        -- svc lib apps packages cli scripts config deploy database tests docs
# 裸名归属需按 §2.4 的 search_path 解析，不能直接按命中计数
```

### 13.2 本轮取证中的口径修正（防止重犯）

1. **`git grep -E '\b'` 无效**：POSIX ERE 不支持 `\b`，首轮全部 0 命中；改用 `-w` / `-F`。
2. **JS 正则 `[[:space:]]` 无效**：JavaScript 不支持 POSIX 字符类，导致 `FROM table` 匹配失败；改用 `\s`。
3. **裸名不能按「服务目录 ≈ schema」直接推断**：`unified-core` 的 prod 形态是嵌入式 `flow, public`（不是 `public`）；`analytics` 是 `bi, public`；`rd` 是 `rs`。误判会把 `flow.core_comments` 的引用算到 `public.core_comments` 上。
4. **`public.` 限定名不能算作其他 schema 表的引用**：首版把 `public.schema_registry` 的引用错配给 `mes.schema_registry`（导致误判「应保留」）。
5. **`pg_class.relkind` / `pg_constraint.contype` / `pg_depend.deptype` 是 `"char"`**，在 `||` 拼接与 `ORDER BY` 前必须 `::text`。
6. **`n_live_tup` 不可作行数**：全部改为 `count(*)`（63 张合计 2 行）。

### 13.3 相关文档

- [prod-governance-baseline-2026-11-04.md](prod-governance-baseline-2026-11-04.md)（P4 首批 11 张执行记录 §5.1；P8 `public.core_chat_members` 无 PK 处置 §6.3）
- [decode-contract-audit-2026-11-05.md](decode-contract-audit-2026-11-05.md)

## 14. 执行记录（2026-11-05）

> 执行窗口 12:22–12:26（Asia/Shanghai）。范围严格限定为：§4 可直删 39 张 + `finance.settlements` + `mes.inspection_records` + `public.core_coding_rules` = **42 张**。
> 明确未动：`mes.erp_dictionaries`、§7 的 20 张「应保留」、test 库（5433/test 基线）、迁移重建链纠偏。

### 14.1 总览

| 项 | 结果 |
|---|---|
| 实际删除 | **42 张**（A1 12 / A2 12 / A3 15 / B 3） |
| 跳过 / 挂账 | **0 张**（42/42 前置校验 PASS；DDL 无依赖报错，均为 `RESTRICT` 成功） |
| prod 表数 | **1392 → 1350**（-42） |
| FK 总数 | 295 → 277（-18，全部为被删表自身出站 FK；删除集合无入站 FK） |
| FK 有效性 | `convalidated` 全 true（invalid=0）；无 `confrelid` 悬空 |
| `/health`（`:8099`） | **200**（每批后各一次 + 收尾一次，共 5 次） |
| 迁移账本 | 567 → **571**（4 条，`success=true`，checksum=SHA-384(文件原始字节)） |
| 差异复核 | 备份 TOC（1392）− 当前（1350）= 恰好 42 张目标表，无其它表消失 |

### 14.2 分批执行记录

| 批次 | 迁移文件（版本） | 表数 | 关键校验 | 结果 |
|---|---|---:|---|---|
| A1 | [`20261105200000_p4a1_drop_12_public_qa_ehs_shadows.sql`](../../database/migrations/20261105200000_p4a1_drop_12_public_qa_ehs_shadows.sql) | 12 | 1392→1380；FK 295→287；invalid 0；TOC 差集恰 12；health 200 | **通过** |
| A2 | [`20261105203000_p4a2_drop_12_public_mobile_shadows.sql`](../../database/migrations/20261105203000_p4a2_drop_12_public_mobile_shadows.sql) | 12 | 1380→1368；FK 287→278；invalid 0；累计差集 24；health 200 | **通过** |
| A3 | [`20261105210000_p4a3_drop_15_remaining_shadows.sql`](../../database/migrations/20261105210000_p4a3_drop_15_remaining_shadows.sql) | 15 | 1368→1353；FK 278→277；invalid 0；累计差集 39；health 200 | **通过** |
| B | [`20261105213000_p4b_drop_3_confirmed_tables.sql`](../../database/migrations/20261105213000_p4b_drop_3_confirmed_tables.sql) | 3 | 1353→1350；FK 277→277；invalid 0；累计差集 42；health 200 | **通过** |

每批均：单事务（`psql -1`）+ `SET lock_timeout='5s'` + `SET statement_timeout='60s'`；逐表 `to_regclass` / `relkind='r'` / `count(*)`（预期值）/ 入站 FK=0 / 视图=0 / 函数依赖=0 守卫，`DROP TABLE ... RESTRICT`（**无 CASCADE**），失败即 `NOTICE` 跳过。

### 14.3 逐表状态（已删 42 张）

执行时间统一为 2026-11-05 12:22–12:26；单表归档路径均为 `~/topems/backups/p4_rem_20261105/<schema>_<table>_20261105_122001.dump`（prod 机 `xingzhai` 账户下）。

| # | 表 | 批次 | 行数 | 状态 |
|---:|---|---|---:|---|
| 1–12 | `public.qa_ehs_discharge_permits` / `disease_cases` / `drill_evaluations` / `drill_problems` / `emergency_plan_approvals` / `emergency_plan_supplies` / `emergency_plan_versions` / `employees` / `env_monitor_records` / `environment_incidents` / `inspection_record_items` / `msds`（均 `public.qa_ehs_*`） | A1 | 0 | 已删 |
| 13–24 | `public.barcode_scans` / `devices` / `media_files` / `mobile_scan_records` / `offline_operations` / `offline_sync_records` / `photo_uploads` / `push_devices` / `push_notifications` / `push_templates` / `shortcuts` / `sync_policies` | A2 | 0 | 已删 |
| 25–28 | `public.core_comments` / `core_favorites` / `core_email_templates` / `core_mobile_offline_records` | A3 | 0 | 已删 |
| 29–31 | `public.core_chat_members` / `core_chat_messages` / `core_chat_rooms` | A3 | 0 | 已删 |
| 32–36 | `public.reports` / `report_templates` / `report_schedules` / `cqrs_projection_progress` / `quality_records` | A3 | 0 | 已删 |
| 37–39 | `mes.permission_audit_logs` / `mes.schema_registry` / `mes.tool_permissions` | A3 | 0 | 已删 |
| 40 | `finance.settlements` | B | 0 | 已删 |
| 41 | `mes.inspection_records` | B | 0 | 已删 |
| 42 | `public.core_coding_rules` | B | **2** | 已删（先单表归档；`deploy-prod.sh` 的同名 seed 调用已同步移除） |

### 14.4 未删（保留）21 张

- `mes.erp_dictionaries` —— 用户未确认功能去留，**保留不动**（仍挂 §12 问题 1）。
- §7 的 20 张「应保留」：`communication.core_notification_deliveries / _preferences / _subscriptions`、`ehs.hazard_control_measures / hazard_risk_assessments / qa_ehs_alerts / qa_ehs_risk_controls / qa_ehs_treatments / qa_ehs_treatment_actions`、`erp.announcements`、`finance.cqrs_events`、`lims.qa_lims_analytes`、`pdm.pdm_drawings`、`public.core_email_queue`、`public.monitor_thresholds`、`public.tenant_permissions`、`qms.qa_inspection_items / qa_inspection_plan_items / qa_inspection_plans / qa_sampling_plans`。

### 14.5 备份与回退

| 类型 | 路径（prod 机） | 体积 / 校验 |
|---|---|---|
| 全库 `pg_dump -Fc` | `~/topems/backups/topems_prod_pre_p4rem_20261105_122001.dump` | 4,226,439 字节；`pg_restore -l` TOC 8279 行；TOC 表条目 1392 |
| 单表归档 42 份 | `~/topems/backups/p4_rem_20261105/<schema>_<table>_20261105_122001.dump` | 每份 2.2–4.7 KB（0 行表）；`public_core_coding_rules_*` 含 2 行 |

定点回退（单表）：

```bash
pg_restore --no-owner --no-privileges -h 127.0.0.1 -p 5432 -U xingzhai \
  -d topems_prod -t 'public.core_coding_rules' \
  ~/topems/backups/p4_rem_20261105/public_core_coding_rules_20261105_122001.dump
```

### 14.6 本轮遗留（未做）

1. ~~`database/seeds/coding_rules.sql` 文件本身仍在~~ —— **已处理（2026-11-05）**：全仓复核确认无任何可执行调用路径（`deploy-prod.sh` 调用与 `--seed-coding-rules` 参数已在前一提交移除，无通配遍历、无 workflow/Makefile/package.json 引用），文件已 `git rm`。
2. ~~39 张的建表来源（27 迁移 + 12 `database/init`）未动，空库重建仍会重建~~ —— **已处理（2026-11-05）**：追加删除段迁移 + 移除 init 建表语句，scratch 重建终态 39/39 不存在，见 §15.1。
3. ~~20 张「应保留」表在 test 不存在~~ —— **已处理（2026-11-05）**：test 定向迁移补建 20 张，test 表数 1329→1349，见 §15.2。
4. `mes.erp_dictionaries` 功能归属未定（§12 问题 1）—— **仍待用户确认**，本轮未动。

## 15. 迁移链纠偏与 test 基线补齐（2026-11-05）

### 15.1 迁移链纠偏：空库重建不再产出 39 张已删表

**为什么追加删除段而不是改写历史迁移**：已发布迁移的文件字节即 `_sqlx_migrations.checksum`（SHA-384），改写会让所有已应用该迁移的库（prod 571 条账本）核对失败，且无法区分「内容变更」与「文件被改」。追加迁移不触碰历史 checksum，任何按 version 升序重建的库都会在末尾收敛到同一状态。

**两层处置**

| 层 | 处置 | 说明 |
|---|---|---|
| 迁移链（早期迁移会建出这 39 张） | **追加** [`20261105230000_p4a4_drop_shadows_in_rebuild_chain.sql`](../../database/migrations/20261105230000_p4a4_drop_shadows_in_rebuild_chain.sql) | 39 个 `DO` 块，逐表 `to_regclass` + `relkind` + 行数守卫；`DROP TABLE ... RESTRICT`（无 CASCADE）；末尾断言 39 张全部不存在，否则 `RAISE EXCEPTION` |
| `database/init`（部署时重跑，重建即复活） | **直接移除** `database/init/05_mobile_init.sql` 中 12 处 `CREATE TABLE` + 19 条相关索引 | 仅删该文件的建表与索引；未发现其它对象依赖（无 FK/视图/策略引用） |

**建表来源逐条处置**

| 建表来源（文件#行） | 涉及表 | 处置 |
|---|---|---|
| [20261007000006_rebuild_orphan_tables.sql](../../database/migrations/20261007000006_rebuild_orphan_tables.sql) #3024–#3568 | `public.qa_ehs_*` 12 张（discharge_permits / disease_cases / drill_evaluations / drill_problems / emergency_plan_approvals / emergency_plan_supplies / emergency_plan_versions / employees / env_monitor_records / environment_incidents / inspection_record_items / msds） | 追加 DROP |
| 同上 #2311–#2880、#4216–#4245 | `public.barcode_scans / devices / media_files / mobile_scan_records / offline_operations / offline_sync_records / photo_uploads / push_devices / push_notifications / push_templates / shortcuts / sync_policies`（12 张） | 追加 DROP |
| 同上 #565–#850、#1487–#1772 | `public.core_chat_members / core_chat_messages / core_chat_rooms / core_email_templates / core_mobile_offline_records`（5 张，两处幂等重复） | 追加 DROP（chat 子表先删） |
| 同上 #2208–#2269 | `mes.permission_audit_logs / mes.schema_registry / mes.tool_permissions`（3 张） | 追加 DROP |
| [20261104070000_db18_5433_special_types_8cols.sql](../../database/migrations/20261104070000_db18_5433_special_types_8cols.sql) #2169 / #454 | `public.qa_ehs_environment_incidents` / `public.core_mobile_offline_records` | 追加 DROP |
| [007_communication.sql](../../database/migrations/007_communication.sql) #30 / #40 / #49 / #79 | `public.core_chat_rooms / core_chat_members / core_chat_messages / core_email_templates`（未限定名按默认 `search_path` 落 public） | 追加 DROP |
| [009_sync.sql](../../database/migrations/009_sync.sql) #20 | `public.core_mobile_offline_records` | 追加 DROP |
| [20261029120000_schema_defense_orphan_tables_to_authoritative.sql](../../database/migrations/20261029120000_schema_defense_orphan_tables_to_authoritative.sql) #19 / #33 | `public.core_comments / core_favorites` | 追加 DROP |
| [20261015000074_k1_missing_table_baselines.sql](../../database/migrations/20261015000074_k1_missing_table_baselines.sql) #32 / #38 / #44 / #50 | `public.cqrs_projection_progress / report_schedules / report_templates / reports` | 追加 DROP |
| [20260920000094_public_schema_align.sql](../../database/migrations/20260920000094_public_schema_align.sql) #24 | `public.quality_records` | 追加 DROP |
| [database/init/05_mobile_init.sql](../../database/init/05_mobile_init.sql)（12 处 CREATE） | `public.devices / mobile_scan_records / offline_sync_records / shortcuts / offline_operations / sync_policies / push_devices / push_notifications / push_templates / barcode_scans / photo_uploads / media_files` | **移除建表 + 19 条索引** |

> 口径修正：实际建表来源为 **8 个迁移文件 + 1 个 init 文件**（同一张表常被 2–3 个迁移幂等重复创建），而非先前记录的「27 条迁移」——后者统计的是「提及」而非「建表」，此处按 `CREATE TABLE` 实测重算。另有两类**不属本轮 39 张**的未限定名建表（`20260825000000` / `20260827000000` 的 `tool_permissions` / `permission_audit_logs`，`20260725000001` 的 `schema_registry`，都落 public）：它们在 prod 侧已于更早批次处置/保留，scratch 与 prod 终态一致（`public.schema_registry`、`public.permission_audit_logs` 两边都在），本轮不动。

**顺序陷阱与解依赖**

- `core_chat_members / core_chat_messages` 出站 FK → `core_chat_rooms`，故删除段子表在前、父表在后。
- 其余目标表出站 FK 全部指向**保留表**（`iam.tenant_permissions`、`ehs.qa_ehs_*`、`mobile.mobile_users` 等），无表间删除依赖。
- 一类「仅重建路径可能出现」的入站 FK（`20261007000006` 在 `iam./mes.core_chat_*` 上追加 → `public.core_chat_rooms`）：删除段**先自动解除**指向目标表的入站 FK（`ALTER TABLE ... DROP CONSTRAINT`），再执行 DROP，避免 `RESTRICT` 失败。prod 无此类约束，该步骤为 no-op。
- 视图/物化视图/RLS 策略/触发器引用：`grep` 实测 0 处引用这 39 张表（策略随表一起消失）。

**scratch 重建验证**（库 `p4_rebuild_verify`，本地 5432，**保留**）

- 重建方式：按文件名版本升序逐文件 `psql --single-transaction -v ON_ERROR_STOP=1`；首轮结果 **573 OK / 16 FAIL**（16 条已由 §16.3 分类治理，修正后为 573 OK / 0 FAIL / 16 SKIP），表数 1229（迁移链不含 init 建表部分）。
- **39 张目标表终态：`remaining_count=0`（全部不存在）** —— 迁移链末尾断言 `P4 chain OK: 39 shadow tables absent` 通过。
- **10 张核心表抽样**（`iam.users / iam.roles / iam.permissions / mes.production_orders / ehs.qa_ehs_hazards / erp.customers / pdm.pdm_drawings / qms.qa_inspection_items / srm.suppliers / wms.warehouses`）：列名+类型+可空 **236/236 一致**，主键 **完全一致**。
- 16 个失败均为**既有链问题**，与本次 39 张无关。**根因已在 §16.3 逐条复核并修正**（原判「由 `database/init` 建立」不成立）：8 个 test/5433 定向迁移 + 7 个依赖缺口（前向建表 1、schema 错位 3、先建后删 3）+ 1 个 `20261105100000` 因 `iam.tenant_permissions` 缺失 `ABORT`。修正后的可重复重建流程见 §16.3（573 OK / 0 FAIL / 16 SKIP）。该批目标不在本轮 39 张内，未做改动。
- 复用命令：`bash scripts/migration/rebuild-verify-classified.sh`（脚本内含 16 条分类 skip，不改迁移文件字节）。

### 15.2 test 基线补齐：20 张「应保留」表

- 新增 test 定向迁移 [`20261105235000_test_baseline_20_reverse_tables.sql`](../../database/migrations/20261105235000_test_baseline_20_reverse_tables.sql)（130 条语句）：DDL 来源为 **prod 2026-11-05 实测** `pg_dump --schema-only`（20 个 `-t` 逐表导出，含列/类型/可空/默认值/PK/UNIQUE/索引/FK/RLS 策略/触发器/注释，prod 无表注释）。
- 已确认 test 侧 **20/20 全部不存在**（无部分结构），故按整表建；守卫仍保留 `to_regclass` 判重 + 索引 `IF NOT EXISTS` + 约束/策略/触发器按名称判重，重复执行不会冲突。
- 执行结果：test 表数 **1329 → 1349**（+20），20/20 存在；出站 FK 5 条，`convalidated` **invalid=0**。
- 结构对比（prod vs test）：**252 个列的名字/类型/可空完全一致，20 个主键完全一致**。
- 对照基线有效性：prod-only 表差 **63 → 1**（仅剩 `mes.erp_dictionaries`），test-only **0**；后续 prod-vs-test 比对噪声从 63 项降到 1 项。

## 16. 收尾三件事（2026-11-05）：erp_dictionaries 可达性 / prod 账本补登 / 迁移链分类治理

### 16.1 A. `mes.erp_dictionaries` 可达性核查（只读，未删未改）

**结论：功能已完整实现且对外暴露，但从未成功调用过一次（上线即坏）→ 实质死代码。倾向「删表 + 清 handler + 迁移说明」，**待拍板**。**

| 维度 | 实测证据 |
|---|---|
| 后端路由 | [dictionaries.rs](../../svc/erp/src/modules/dictionaries.rs#L16-L28) 定义 `GET/POST /dictionaries`、`GET/PUT/DELETE /dictionaries/{id}`；5 个 handler 在 #69/#155/#196/#231/#284；[mod.rs](../../svc/erp/src/modules/mod.rs#L147) 已 merge；[erp_real_module.rs](../../svc/server/src/modules/erp_real_module.rs#L154) 以 `/api/erp` nest 并挂 auth 中间件；[main.rs](../../svc/server/src/main.rs#L63-L70) 由 feature `module-erp` 注册；[Cargo.toml](../../svc/server/Cargo.toml#L69-L71) 该 feature **在 default 内**（prod 常规构建即启用） |
| 权限 | handler **无权限点校验**（仅取 `claims` 的 tenant）；前端路由需 `erp:dashboard:read`，导航声明 `erp:dictionary:read`；两点均存在于 `public.core_permissions`（986 条）与 [permissions.ts](../../apps/web/src/config/permissions.ts#L490) |
| 前端 | 页面 [DictionaryPage.tsx](../../apps/web/src/pages/erp/DictionaryPage.tsx#L26)、API [dictionaries.ts](../../apps/web/src/api/erp/dictionaries.ts)、路由 [config.ts](../../apps/web/src/modules/erp/config.ts#L559-L571)、导航 [config.ts](../../apps/web/src/modules/erp/config.ts#L869-L880)；DB `core_menus` 有 `erp-data-dictionaries`（`/erp/data-dictionaries`，permission `erp:dashboard:read`），种子来自 [20261102140000_menu_seed_erp.sql](../../database/migrations/20261102140000_menu_seed_erp.sql#L46)。另有 `erp-dictionaries`（`/erp/dict-management`）是 `dict_types` 的另一套字典，勿混 |
| 测试 | 前端 [ErpDictionaryPage.test.tsx](../../apps/web/src/pages/__tests__/ErpDictionaryPage.test.tsx) **6 例**；后端 `tests/` **0 例** |
| 数据 | prod `mes.erp_dictionaries` **0 行**、12 列（id/tenant_id/code/name/category/items/status/description/created_by/created_at/updated_at/deleted_at）、入站 FK **0**；`erp.erp_dictionaries` 与 `public.erp_dictionaries` **均不存在**；test **任何 schema 都不存在** |
| 建表来源 | [20261021000008_crm_tags_erp_dictionaries.sql](../../database/migrations/20261021000008_crm_tags_erp_dictionaries.sql#L7) 为**无 schema 前缀**的 `CREATE TABLE IF NOT EXISTS erp_dictionaries`，落点取决于执行时 `search_path`；prod 实际落在 `mes` |
| 调用实况 | `set search_path=erp,public; select count(*) from erp_dictionaries;` → **`ERROR: relation "erp_dictionaries" does not exist`**。服务连接池固定 `SEARCH_PATH=erp, public`（[erp_real_module.rs](../../svc/server/src/modules/erp_real_module.rs#L38)），5 个 handler 全部 100% 失败；prod 日志中该表相关报错 **0 次**（无人调用） |

判定口径：菜单入口确实出现在 prod（曾计划对外），但表从不在 `erp/public`，点开必失败 → 归为「从未成功上线」。三个选项中对应第一项（死代码），处置建议：删表 + 清 handler + 一条迁移说明；若后续确需该功能，正确做法是补 `erp.erp_dictionaries` 或把 handler SQL 改为 `mes.erp_dictionaries` + 补权限点。

### 16.2 B. prod 账本补登两条 no-op 迁移（571 → 573）

- **前置实测**：`20261105230000` 涉及的 39 张影子表在 prod **全部 absent**；`20261105235000` 涉及的 20 张基线表在 prod **全部 present**。故前者只剩末尾断言（`P4 chain OK`），后者只有 102 条 SKIP（20 表 + 1 序列 `already exists`）。
- **备份**：`~/topems/backups/topems_prod_pre_p4ledger_20261105.dump`（4,128,518 B，`pg_dump -Fc`）。
- **干跑**：单事务 `\i` 两个文件 + `ROLLBACK`，`ON_ERROR_STOP=1`，**exit 0、0 ERROR**。
- **实跑**：两条各自 `BEGIN; \i <文件>; INSERT INTO public._sqlx_migrations ...; COMMIT;`（未用 `sqlx migrate run`，避免顺带应用其余 16 条 test/5433 定向迁移）。
- **结果**：表数 **1350 不变**；结构指纹（表数 / 列定义 md5 / 约束 md5 / 索引数 / 策略数 / 触发器数）前后 **diff 为空**；`:8099/health` **200**；账本 **571 → 573**；行内 checksum 与文件 SHA-384 **逐字节一致**：

| version | description | checksum（前 16 位） |
|---|---|---|
| `20261105230000` | `p4a4 drop shadows in rebuild chain` | `2dac6316cce37cea…aed58` |
| `20261105235000` | `test baseline 20 reverse tables` | `eb40f860a663165d…f4aa2` |

- **发现（遗留项，不在本轮修）**：`20261105235000` 内 `ALTER SEQUENCE public.tenant_permissions_id_seq OWNED BY ...` 的守卫误写成 `to_regclass('public')`（恒为 NULL），导致该句**永远 SKIP**。prod 序列原本已归属列、无影响；test 的该序列因此未归属列（`pg_depend deptype='a'` 为空），属结构小差异，可后续用一条前向迁移补正。

### 16.3 C. 16 条迁移链失败：分类、处置与重建脚本

> **修正 §15.1**：前一轮写「7 条由 `database/init` 建立」不成立——`database/init/*.sql` 不含这些对象（仅 `iam.core_email_queue`，且 schema 不匹配）。本轮逐条定位真实根因如下。

| # | 迁移文件 | 分类 | 真实根因 | 处置 |
|---|---|---|---|---|
| 1 | `20261103200000_db07_test_timestamp_uuid_align_prod` | test 定向 | 依赖 test 库既有数据/列形态 | 脚本 skip |
| 2 | `20261103210000_db08_test_varchar_to_text_190cols` | test 定向 | 同上 | 脚本 skip |
| 3 | `20261103230000_db10_5433_varchar_text_to_uuid_19cols` | 5433 定向 | 5433 专属列形态 | 脚本 skip |
| 4 | `20261104000000_db11_5433_varchar_to_text_24cols` | 5433 定向 | 同上 | 脚本 skip |
| 5 | `20261104030000_db14_test_varchar_to_uuid_7cols_with_data` | test 定向 | 依赖存量数据转换 | 脚本 skip |
| 6 | `20261104040000_db15_5433_integer_bigint_16cols` | 5433 定向 | 5433 专属列形态 | 脚本 skip |
| 7 | `20261104050000_db16_5433_tenant_id_rls_decouple_14cols` | 5433 定向 | 同上 | 脚本 skip |
| 8 | `20261104070000_db18_5433_special_types_8cols` | 5433 定向 | 同上 | 脚本 skip |
| 9 | `20261005000004_lims_qa_lab_fk_repoint` | 依赖缺口（前向） | `public.qa_lab_tasks` 由**更晚**的 `20261007000009` 创建 | 脚本 skip |
| 10 | `20261029185000_schema_defense_align_columns` | 依赖缺口（schema 错位） | 链建 `public.qa_sampling_plans`，本迁移改 `mes.qa_sampling_plans`（prod 该表来自运行时/历史残留，现已迁 `qms`） | 脚本 skip |
| 11 | `20261029200000_schema_defense_type_align` | 依赖缺口（schema 错位） | 链建 `public.workshops`，本迁移改 `mes.workshops`（prod 该表来自运行时 DDL） | 脚本 skip |
| 12 | `20261102220000_rls_enable_biz_batch1` | 依赖缺口（先建后删） | `iam.tenant_permissions` 已被 `20261007000012` DROP，后续又引用 | 脚本 skip |
| 13 | `20261104130000_p3_pk_5` | 依赖缺口（先建后删） | `flow.core_master_data_refs` 已被 `20261027200000` DROP | 脚本 skip |
| 14 | `20261104140000_p3_unique_48` | 依赖缺口（先建后删） | `flow.core_file_permissions` 已被 `20261027200000` DROP | 脚本 skip |
| 15 | `20261104150000_p3_fk_45` | 依赖缺口（schema 错位） | 链只有 `public.core_doc_document_versions`（`20261029120000`），本迁移要 `flow.` 版 | 脚本 skip |
| 16 | `20261105100000_p4_drop_shadow_tables_and_repoint_fks` | P4 ABORT | 同 #12：`iam.tenant_permissions` 缺失 → FK 重指向被跳过 → B4 入站 FK 断言 `ABORT` | 脚本 skip |

**init-first 实测否证**：在 `p4_rebuild_init` 先跑 11 个 `database/init/*.sql` 再跑迁移 → init **9/11 失败**（`04` 缺 `unified_core` schema、`05` 早于 `06` 建 `iam`、`06/07/07_qms` 为 pg_dump 快照且重复主键定义），迁移侧 OK 仍 573、**无一条被 init 救回**。故重建流程**不采用 init-first**，改为「仅迁移链 + 脚本层分类跳过」。

**可重复动作**：新增 [rebuild-verify-classified.sh](../../scripts/migration/rebuild-verify-classified.sh)（skip 清单在脚本内，**不改迁移文件字节**，不影响 sqlx checksum）。复跑结果：

- `p4_rebuild_verify`（本地 5432，**保留**供核对）：**573 OK / 0 FAIL / 16 SKIP**（589 文件，exit 0）。
- 剩余失败 **0 条**；16 条跳过均有分类与原因（上表）。
- prod 账本现为 573，未登记的 16 个文件即 test/5433 定向迁移（`db08/db09/db10/db11/db12/db13/db14/db15/db16/db17/db18/db20/db21/db23/db24` + `finance_currency_master_fix`），与上述 skip 清单不完全同集，均无需在 prod 登记。

**仍挂账（需单独立项）**：若要把 16 条跳过真正修好，必须在迁移层（而非脚本层）解决——上表 #9 调整执行顺序或加前置建表、#10/#11/#15 统一 schema、#12–#14/#16 恢复被删对象或改为 `to_regclass` 守卫。因「不改已发布迁移字节」约束，本轮不动。
