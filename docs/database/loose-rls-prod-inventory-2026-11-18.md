# 生产库宽松 RLS 策略盘点与收紧分批建议（2026-11-18）

> 范围：只读盘点 + 代码侧静态核查；不写迁移、不改代码。
> 基准库：本地 `topems_prod`（PostgreSQL 5432），连接角色 `topems_prod`（`rolsuper=f`、`rolbypassrls=f`），全部查询为 `SELECT` / `pg_catalog` 读取，无临时表、无任何写入。
> 判据以本次生产实测为准；与既有文档的差异及成因见第 7 节。

---

## 1. 结论摘要

- 含 `tenant_id` / `tenant_uid` 的普通表共 **992** 张，分布如下：

| 形态 | 张数 | 说明 |
|---|---:|---|
| 严格策略（`rls_tenant_isolation` 等，含 `rls_system` + 租户等值分支） | 874 | 已收口 |
| 其他严格形态（纯系统分支 / 纯租户分支） | 7 | 见 2.3 |
| `allow_all`（`USING(true)` 实际全放行） | 16 | 见第 4 节 |
| 宽松（`rls_global_read` 与严格策略并存，`OR tenant_id IS NULL`） | 8 | 见第 3 节 |
| 含 `tenant_id` 但无策略且未开 RLS | 87 | 见第 5 节 |
| 合计 | 992 | |

- **真正待处理面 = 111 张**（8 宽松 + 16 `allow_all` + 87 无 RLS），另有 2 张「RLS 已开未 FORCE」的防御台账（第 6 节）。
- 111 张中**仅 10 张有数据**；加上非租户的 `iam.roles`（4 行）共 11 张有数据，其余 100 张全为 0 行。
- 8 张宽松表的**全部行都是 `tenant_id IS NULL` 平台行**（零租户哨兵行为 0 条），没有任何「已按租户落库但被全放行」的行；16 张 `allow_all` 中仅 `hrm.initialization_logs` 有 1 行，且租户真实。
- 按设计将来会装租户数据、目前 0 行但策略全放行的表：`bi.audit_logs`、`gis.geodata/geofeatures/map_layers/spatial_analysis`、`public.core_operation_logs`、`public.subscriptions`、`qms.quality_inspections/quality_standards` —— **标记中高优先级，功能上线前必须先收紧**（当前无数据，故不是现网泄漏）。
- **未发现「现网已有租户数据却全放行」的高优先级泄漏点。** 唯一有真实租户行的 `allow_all` 表是 `hrm.initialization_logs`（1 行），代码已显式绑定租户，可直接收紧。
- 8 张宽松表已有 5 张被 `20261118110000_platform_corpus_rls_strict.sql`（`to_apply`）覆盖，需连同代码同窗口执行；剩余 3 张（`core_menus` / `core_menu_groups` / `core_tenants`）**无迁移覆盖**，是真正的空白项。

---

## 2. 盘点方法与口径

### 2.1 目标集合

`pg_class.relkind='r'`，排除 `pg_catalog` / `information_schema` / `pg_toast`，且存在 `tenant_id` 或 `tenant_uid` 列（按列名识别，不按 schema 白名单）。已额外检查 `relkind in ('p','f')`：生产无带租户列的分区表/外部表，故目标集合完整。

### 2.2 形态判定

| 形态 | 判定表达式 |
|---|---|
| 严格 | `rls_system` 判定 + `tenant_id/tenant_uid = current_setting('app.tenant_id')` 等值，且无 NULL/空串/全零/`true` 放行分支 |
| 宽松（fail-open） | 策略表达式含 `OR tenant_id IS NULL`（对本库 8 张表而言即 `rls_global_read`），与严格策略按命令 OR 合并 |
| `allow_all` | 策略名含 `allow_all`，或 `qual='true'` 且 `with_check='true'` |
| 无 RLS | `relrowsecurity=f` 且无任何策略 |

### 2.3 7 张「其他严格形态」（非宽松，列出以闭合口径）

| 表 | 策略 | 形态 |
|---|---|---|
| `crm.audit_logs` | `rls_tenant_isolation` | 仅 `rls_system='on'`（系统审计通道） |
| `erp.audit_logs` | `rls_tenant_isolation` | 同上 |
| `hrm.audit_logs` | `rls_tenant_isolation` | 同上 |
| `public.core_refresh_tokens` | `rls_system_only` | 同上（认证系统通道） |
| `public.core_sessions` | `rls_system_only` | 同上（认证系统通道） |
| `scm.schema_defense_ledger` | `rls_tenant_isolation` | 同上，且 **未 FORCE**（见第 6 节） |
| `erp.event_idempotency` | `tenant_isolation` | 纯租户等值，无系统分支（语义上严格） |

### 2.4 数据维度

对每张目标表统计：`count(*)`、`tenant_id IS NULL` 行数、`tenant_id='00000000-0000-0000-0000-000000000000'` 行数、真实租户行数。全部为单条 `SELECT` 联合查询。

---

## 3. 8 张宽松表（含 `rls_global_read` 的 `tenant_id IS NULL` 放行分支）

策略表达式（其中 7 张完全一致；`public.core_tenants` 的 ALL 策略为 `rls_system_only`，表达式仅 `rls_system='on'`）：

- `rls_global_read`（SELECT，PERMISSIVE）：
  `rls_system='on' OR tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid OR tenant_id IS NULL`
- `rls_tenant_isolation`（ALL，PERMISSIVE）：
  `rls_system='on' OR tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid`

8 张表 `relrowsecurity=t`、`relforcerowsecurity=t`，属主 `topems_prod`，FORCE 已开（属主连接同样受策略约束）。

> 策略名/类型：下表 8 张中 **7 张**为 `rls_global_read`（SELECT，PERMISSIVE）+ `rls_tenant_isolation`（ALL，PERMISSIVE）；`public.core_tenants` 为 `rls_global_read`（SELECT，PERMISSIVE）+ `rls_system_only`（ALL，PERMISSIVE）。均为 PERMISSIVE，无 RESTRICTIVE 策略；7 张的收紧动作 = 删除前者，`core_tenants` 见该行说明。

| schema.table | 行数 | NULL 租户 | 全零租户 | 代码读写路径 | 访问通道 | 判定 | 依据 |
|---|---:|---:|---:|---|---|---|---|
| `finance.core_finance_currencies` | 8 | 8 | 0 | `svc/finance/src/modules/currencies.rs`（list/get/create/update/delete） | 请求事务作用域 `scope_with(txn)`；list 无租户谓词、靠策略；create 绑租户/平台常量 | **需先补平台读** | 8 行全为全局币种语料（NULL）。收紧后若不加平台读，所有租户币种列表归零。已被 `20261118110000` 覆盖（回填 8 行→全零 + `rls_platform_read`） |
| `finance.core_finance_report_line_map` | 48 | 48 | 0 | `svc/finance/src/services/finance/report.rs:666,778`（报表 join LATERAL） | 请求事务作用域 `read_scope(txn)` | **需先回填 + 补平台读** | 48 行全为法定报表行映射模板。代码谓词已是 `tenant_id = 全零 OR tenant_id = $1`，**当前 NULL 行反而不命中**（映射实际失效），回填为全零同时修复功能缺陷。已被 `20261118110000` 覆盖 |
| `public.core_roles` | 16 | 16 | 0 | `svc/unified-core/src/modules/iam/role.rs:116/135/410`、`global_row_metrics.rs` | 请求事务作用域；超管分支无租户谓词、租户分支 `tenant_id=$1 OR tenant_id IS NULL` | **需先回填 + 补平台读** | 16 行为平台角色模板。代码的超管分支无谓词，收紧后靠 `rls_platform_read` 兜底；租户分支需把 `IS NULL` 改为全零。已被 `20261118110000` 覆盖（注意生产仅 16 行，克隆库演练时为 17 行，见 7.2 第 5 条） |
| `public.core_menus` | 452 | 452 | 0 | `svc/unified-core/src/modules/menu/handlers.rs:39,92`、`menu/cache.rs:143` | 请求事务作用域；超管无租户谓词，租户分支 `tenant_id=$1` | **需先回填 + 补平台读（高）** | 452 行为全量平台菜单定义；租户分支按 `tenant_id=$1` 查询，收紧后 NULL 行不可见 → **所有租户菜单/缓存为空**。**未被任何迁移覆盖**，需新开 |
| `public.core_menu_groups` | 130 | 130 | 0 | 同 `core_menus`（同文件同分支） | 同上 | **需先回填 + 补平台读（高）** | 130 行为平台菜单分组，同上。**无迁移覆盖** |
| `public.core_tenants` | 1 | 1 | 0 | `svc/unified-core/src/modules/tenant/handlers.rs:30,44,267` | 请求事务作用域；写为超管/平台流程 | **建议保持宽松（待产品确认）** | 策略为 `rls_global_read`(SELECT, `tenant_id IS NULL`) + `rls_system_only`(ALL)。即「全员可读租户目录、仅系统通道可写」，属**有意的平台目录**；但当前实现是任何租户上下文都能看到全部租户行（跨租户元数据可见）。若产品要求「租户只能看到自己」需新策略，不能直接套 `rls_platform_read` |
| `mobile.sync_policies` | 1 | 1 | 0 | `svc/mobile/src/modules/offline_sync.rs:591,719`；`svc/mobile/src/db/repository.rs:516`（无调用方） | 请求事务作用域；读写均带 `user_id` 谓词，写绑租户（超管绑平台常量） | **需先回填（实为清理孤儿行）** | 唯一 1 行的 `user_id=e91e2228-…` 在 `iam.users` 与 `iam.core_tenant_users` 中均不存在 → 孤儿测试行。清理后可直接收紧；`20261118110000` 的「不加平台读」不会误伤真实用户 |
| `pm.project_type_configs` | 1 | 1 | 0 | `svc/pm/src/modules/project_type_config.rs:110,141,236,273` | 请求事务作用域；读写均无显式 NULL 谓词，靠策略兜底 | **需先回填/清理** | 唯一 1 行为 `type_code='L1-T9' / 'L1 类型v2'` 的测试残留（NULL 租户）。回填到真实租户或删除后可直接收紧。已被 `20261118110000` 覆盖 |

> 说明：8 张表的宽松策略**只影响 SELECT**，写路径已被 `rls_tenant_isolation` 严格约束；因此收紧动作 = 删除 `rls_global_read`（`core_tenants` 为改策略形态），不需要重建写策略。回滚同理只需重建 SELECT 策略。

---

## 4. 16 张 `allow_all` 表（含 `tenant_id`）

### 4.0 策略名与类型（16 张全列）

| schema.table | 策略名（命令，permissive） |
|---|---|
| `bi.audit_logs` | `bi_allow_all_audit_logs`（ALL, PERMISSIVE） |
| `core.core_plugins` | `core_allow_all_core_plugins`（ALL, PERMISSIVE） |
| `erp.dict_items` | `erp_allow_all_dict_items`（ALL, PERMISSIVE） |
| `erp.dict_types` | `erp_allow_all_dict_types`（ALL, PERMISSIVE） |
| `gis.geodata` | `gis_allow_all_geodata`（ALL, PERMISSIVE） |
| `gis.geofeatures` | `gis_allow_all_geofeatures`（ALL, PERMISSIVE） |
| `gis.map_layers` | `gis_allow_all_map_layers`（ALL, PERMISSIVE） |
| `gis.spatial_analysis` | `gis_allow_all_spatial_analysis`（ALL, PERMISSIVE） |
| `hrm.initialization_logs` | `hrm_allow_all_initialization_logs`（ALL, PERMISSIVE） |
| `pdm.pdm_master_data_refs` | `pdm_master_data_refs_read`（SELECT）+ `pdm_master_data_refs_write`（ALL），均 PERMISSIVE |
| `portal.portal_quick_actions` | `portal_allow_all_portal_quick_actions`（ALL, PERMISSIVE） |
| `public.core_operation_logs` | `public_allow_all_core_operation_logs`（ALL, PERMISSIVE） |
| `public.subscriptions` | `public_allow_all_subscriptions`（ALL, PERMISSIVE） |
| `qms.quality_inspections` | `qms_allow_all_quality_inspections`（ALL, PERMISSIVE） |
| `qms.quality_standards` | `qms_allow_all_quality_standards`（ALL, PERMISSIVE） |
| `rs.formulas` | `rs_allow_all_formulas`（ALL, PERMISSIVE）**与** `rls_tenant_isolation`（ALL, PERMISSIVE）并存 |

> `rs.formulas` 是「`allow_all` 与严格策略并存」的唯一一张：按 OR 合并后仍等价全放行，收紧时需同时删除 `rs_allow_all_formulas`。`pdm.pdm_master_data_refs` 为读写分离两条宽松策略。

### 4.1 逐表清单

| schema.table | 行数 | NULL 租户 | 全零租户 | 数据性质 | 读写路径 | 通道 | 判定 |
|---|---:|---:|---:|---|---|---|---|
| `hrm.initialization_logs` | 1 | 0 | 0 | 租户数据（租户 `…0001`） | `svc/hrm/src/modules/setup.rs:368` 仅 INSERT，显式绑定 `claims` 租户；无 SELECT | 请求事务作用域 | **可直接收紧**（`20261118103000` 覆盖，代码已改绑） |
| `bi.audit_logs` | 0 | 0 | 0 | 租户审计（按设计） | `svc/analytics/**` 审计写入 | 请求事务作用域 | **可直接收紧**（`20261118093000` 覆盖）；上线前必须 |
| `public.core_operation_logs` | 0 | 0 | 0 | 租户操作审计（按设计） | `svc/unified-core/src/modules/audit/**`（读取端支持平台跨租户视图） | 写：请求作用域；读：系统通道 | **可直接收紧**（`20261118090000` 覆盖；该迁移在本库 `to_apply`，故当前仍 `allow_all`）；上线前必须 |
| `public.subscriptions` | 0 | 0 | 0 | 租户订阅/计费（按设计） | `svc/unified-core/src/routes/subscription.rs` | 请求作用域 + 系统写 | **可直接收紧**（`20261118090000` 覆盖）；上线前必须 |
| `qms.quality_inspections` | 0 | 0 | 0 | 租户质量检验（按设计） | 无代码引用（幻影表） | — | **可直接收紧**（`20261118103000` 覆盖） |
| `qms.quality_standards` | 0 | 0 | 0 | 租户质量标准（按设计） | 无代码引用（幻影表） | — | **可直接收紧**（`20261118103000` 覆盖） |
| `gis.geodata` | 0 | 0 | 0 | 租户 GIS 数据 | `svc/gis/src/modules/geodata.rs` | 请求事务作用域 | **可直接收紧**（`20261118112000` 覆盖）；上线前必须 |
| `gis.geofeatures` | 0 | 0 | 0 | 租户 GIS 要素 | `svc/gis/src/modules/spatial.rs` | 请求事务作用域 | 同上 |
| `gis.map_layers` | 0 | 0 | 0 | 租户地图图层 | `svc/gis/src/modules/map.rs` | 请求事务作用域 | 同上 |
| `gis.spatial_analysis` | 0 | 0 | 0 | 租户空间分析 | `svc/gis/src/modules/spatial.rs` | 请求事务作用域 | 同上 |
| `portal.portal_quick_actions` | 0 | 0 | 0 | 租户门户配置 | `svc/portal/src/modules/quick_actions.rs` | 请求事务作用域 | **可直接收紧**（`20261118113000` 覆盖） |
| `core.core_plugins` | 0 | 0 | 0 | **平台语料 + 租户草稿**（已发布条目只存全零哨兵租户） | `svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs`（查询显式 `tenant_id='000…000'`） | 请求作用域 + 系统写 | **可直接收紧**（`20261118123000` 覆盖）；代码已按哨兵语义编写 |
| `erp.dict_items` | 0 | 0 | 0 | 平台字典项语料（影子副本，0 行） | 无 `erp.dict_*` 运行时引用；权威字典读 `public.core_dict_types` | — | **可直接收紧**（`20261118120000` 覆盖）。若确认无写入方，优先按 DROP 候选处理 |
| `erp.dict_types` | 0 | 0 | 0 | 平台字典类型语料（影子副本，0 行） | 同上 | — | 同上 |
| `rs.formulas` | 0 | 0 | 0 | 平台公式 corpus + 租户自定义 | `svc/rd/src/modules/formula.rs` | 请求作用域 | **可直接收紧**（`20261118120000` 覆盖） |
| `pdm.pdm_master_data_refs` | 0 | 0 | 0 | 平台主数据引用（按设计） | `lib/shared-db/src/master_data_refs.rs`、`svc/pdm/src/event_handlers/mod.rs` | 平台/系统写 + 普通读 | **需先补平台读**（否则引用解析归零） |

**高优先级判定**：16 张里没有任何一张当前装着真实租户数据却被全放行（唯一有数据的 `hrm.initialization_logs` 只有 1 行且代码已修）。但 `gis.*`、`bi.audit_logs`、`public.core_operation_logs`、`public.subscriptions`、`qms.*` 按设计就是租户数据表，**在对应功能产生数据前必须完成收紧**，否则一上线即成为全放行租户数据。

### 4.2 非租户 `allow_all` 表（37 张，单独说明）

这些表**没有 `tenant_id` 列**，因而不进 992 目标集，但同样挂着 `allow_all` 策略。逐类核查结论：

| schema.table | 行数 | 实际用途 | 结论 |
|---|---:|---|---|
| `iam.roles` | 4 | 全局平台角色目录（`super_admin/tenant_admin/dept_manager/employee`），`is_system` 标记；`iam.users.role_id` 外键指向它。全仓 Rust **无 `iam.roles` 直接引用**，仅由迁移/种子写入 | **平台语料**。可保持 `allow_all`（只读目录），或改 `rls_system_only` 读；无运行时风险 |
| `iam.permissions` / `iam.audit_logs` | 0 / 0 | `iam` schema 的影子副本；运行时用 `public.core_permissions` / `public.core_login_logs` | 空影子表，可 DROP 候选 |
| `doc.*`（4 张） / `doc_service.*`（4 张） | 0 | 历史文档服务影子 schema。`doc_service.files` 曾在 2026-10 合并进 `public.core_files`；权威表为 `public.core_doc_documents/folders/templates`。全仓无代码引用 | **影子/历史**，可 DROP 候选 |
| `mail.emails` / `mail.templates` | 0 | `shared-db` 的 `mail_table()` 仅被**单元测试**使用，运行时无调用；权威表为 `communication.core_emails/core_email_templates` | **影子/历史**，可 DROP 候选 |
| `notification.notifications` | 0 | 影子；权威表 `public.core_notifications`（另有 `communication.core_notification_templates`） | **影子/历史** |
| `flow.workflows` / `flow.notifications` / `flow.audit_logs` | 0 | 影子 schema。历史上嵌入式部署 `search_path=flow,public` 会优先命中同名空副本；当前 `scripts/schema_boundary.json` 已无任何服务使用 `flow` | **影子/历史**；建议先确认嵌入式部署已停用，再 DROP |
| `erp.holidays` | 0 | 跨租户共享法定节假日日历。`svc/erp/src/modules/holidays.rs:85-135` 用**裸池**读取，`tenant_id` 为 `Option`：`None` 时无谓词做全局统计，`Some` 时按租户过滤 | **平台语料 + 裸池**。当前 0 行；收紧会令 `None` 分支归零（静默回退 L2 静态数据）。建议保持 `allow_all`，或改系统通道读 |
| `erp.core_erp_materials` / `pm.service_integrations` / `portal.user_preferences` / `mobile.oa_announcement_reads` / `public.navigation_menu` / `public.pinned_apps` / `public.todos` / `public.user_settings` / `report.reports` / `storage.files` / `qms.*`(8 张非租户)/`gis.*`(4 张非租户)/`core.core_tenant_plugins` | 0（`iam.roles` 除外） | 用户维度或个人配置类表（无租户列）；`core.core_tenant_plugins` 为 `plugin-registry` 的 `core` schema 影子副本（代码显式用 `iam.core_tenant_plugins`） | **建议保持现状**；后续如需收紧，应走 `app.user_id` 维度而非租户维度 |

> `gis.track_positions` 是异常项：挂着 `allow_all` 策略但 `relrowsecurity=f`，策略实际不生效。属历史遗留，建议单独确认后清理策略或开 RLS。

---

## 5. 87 张「含 `tenant_id` 但无策略、未开 RLS」

全部 87 张均为 0 行，`relrowsecurity=f`、无任何策略、属主 `topems_prod`。

### 5.1 `bi`（8 张）——可直接收紧

`svc/analytics` 的 `search_path=bi,public`，这些表是 analytics 实际使用的表；代码已改为请求作用域（`20261118093000_bi_rls_strict.sql` 待应用）。

| 表 | 代码位置 |
|---|---|
| `bi.analytics_comparison_analyses` | `svc/analytics/src/modules/bi/comparison_analysis.rs` |
| `bi.analytics_comparison_results` | 同上 |
| `bi.analytics_dashboard_shares` | `.../dashboard/share.rs` |
| `bi.analytics_dashboard_templates` | `.../dashboard/templates.rs` |
| `bi.analytics_drilldown_history` | `.../data_drilldown.rs` |
| `bi.analytics_drilldown_paths` | 同上 |
| `bi.analytics_row_level_permissions` | `.../row_level_permission.rs` |
| `bi.analytics_self_service_reports` | `.../self_service_report.rs` |

判定：**可直接收紧**（0 行、代码已作用域化、迁移已在册）。

### 5.2 `qms`（3 张）——可直接收紧

| 表 | 代码位置 | 说明 |
|---|---|---|
| `qms.qa_inspection_items` | `svc/qms/src/modules/inspection_standard.rs:257,329` | 显式 `qms.` 限定；读走 `read_scope_for_claims`，列表/详情均带 `tenant_id` 过滤；写走同一事务作用域 |
| `qms.qa_inspection_plans` | 同上 | 同上 |
| `qms.qa_sampling_plans` | 同上 | 同上 |

判定：**可直接收紧**（0 行，读写均已在请求事务作用域内并带租户过滤）。

### 5.3 `public`（13 张）——2 张可直接收紧，11 张为影子

| 表 | 判定 | 依据 |
|---|---|---|
| `public.core_file_permissions` | **可直接收紧** | `svc/unified-core/src/modules/file/manage.rs:1292` 显式 `INSERT … (file_id,user_id,permission,tenant_id) VALUES (…,$4)` 绑定租户；0 行 |
| `public.monitor_thresholds` | **可直接收紧** | `svc/monitor/src/modules/monitor/alert_evaluator.rs:337-351` `scope_with(txn)` + `WHERE tenant_id=$1`；0 行 |
| `public.core_tickets` | 影子（权威 `ticket.core_tickets`） | `svc/ticket` 的 `search_path=ticket,public`，未限定表名时优先命中 `ticket` 副本 |
| `public.core_ticket_activities` / `core_ticket_comments` / `core_ticket_sla_escalations` / `core_ticket_sla_policies` | 影子（权威 `ticket.*`） | 同上 |
| `public.conversion_rules` / `conversion_executions` | 影子（权威 `integration.*`） | `svc/integration` 的 `search_path=integration,public` |
| `public.analytics_sync_records` | 影子（权威 `bi.*`；另有 `analytics.*` 历史副本） | — |
| `public.pm_master_data_refs` | 影子（权威 `pm.*`） | — |
| `public.qa_qms_sync_records` | 影子（权威 `qms.*`） | — |
| `public.core_users` | 影子（用户权威为 `iam.users` + `iam.core_tenant_users`） | `iam.users` 无 `tenant_id`，当前为空副本 |

判定：影子表可**直接补严格 RLS（空表、零代码命中）**，但更推荐登记为 **DROP 候选**，避免继续维护双份表。

### 5.4 `iam`（44 张）——1 张活表 + 43 张影子

- **活表**：`iam.core_tenant_plugins`。`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs` 等 19 处显式 `iam.core_tenant_plugins` 读写，走请求事务作用域。已有 `20261118124000_iam_tenant_plugins_rls_strict.sql`（`to_apply`）覆盖 → **可直接收紧（待迁移应用）**。
- **影子 43 张**：`core_billing_invoices`、`core_billing_plans`、`core_chat_*`、`core_dict_*`、`core_email*`、`core_faqs`、`core_file_folders/files`、`core_guide_*`、`core_menus/menu_groups`、`core_migration_history`、`core_notification*`、`core_plugin_categories/instances/permissions/pricing/reviews`、`core_roles`、`core_subscriptions`、`core_tenant_modules/settings/usage/users`、`core_usage_records`、`core_users`、`core_workflow*`、`tenant_permissions`、`core_dashboard_refresh_log`、`core_inter_module_sync`、`core_mobile_offline_records`。
  - 依据：`scripts/schema_boundary.json` 中没有任何服务把 `iam` 放进 `search_path`；全仓唯一的 `iam.` 限定引用就是 `iam.core_tenant_plugins`；且 43 张全部 0 行。
  - 判定：**建议保持现状并登记 DROP 候选**；若要先补 RLS，开「无策略 = 全拒绝」也不会影响任何代码路径。

### 5.5 `flow`（18 张）——影子，建议暂缓

`core_doc_*`、`core_flow_categories`、`core_master_data*`、`core_mdm_*`、`core_menu*`、`core_operation_logs`、`core_tenant_*`、`core_workflow*`。

- `flow` 不在当前任何服务的 `search_path`；运行时均使用 `public.*` 权威表。
- 但 `svc/unified-core/src/modules/menu/handlers.rs` 的注释指出「嵌入部署连接池 `search_path=flow,public` 时会优先命中 `flow` 下的同名空副本」，说明历史上确有部署形态使用 `flow`。
- 判定：**建议保持宽松/暂缓**。先确认嵌入式部署是否已全部迁移；确认后再统一 DROP 或补 RLS，避免误伤旧部署的菜单/流程读取。

### 5.6 `plugin_erp`（1 张）

`plugin_erp.accounting_subjects` —— `finance.accounting_subjects` 的影子副本（另有 `plugin_finance.accounting_subjects`），0 行，无代码限定引用（`svc/finance` 走 `finance,public`）。判定：**DROP 候选**，不建议单独补策略。

---

## 6. 2 张「RLS 已开但未 FORCE」的防御台账

| 表 | 行数 | 租户列 | 策略 | 属主 | RLS / FORCE |
|---|---:|---|---|---|---|
| `scm.schema_defense_ledger` | 1（`tenant_id IS NULL`） | `tenant_id` | `rls_tenant_isolation`（仅 `rls_system='on'`） | `topems_prod` | `t` / **`f`** |
| `wms.schema_defense_ledger` | 0 | 无 | `rls_tenant_isolation`（仅 `rls_system='on'`） | `topems_prod` | `t` / **`f`** |

**属主是谁**：两张表属主均为 `topems_prod`，与应用连接串使用的角色**完全相同**（本次盘点连接 `current_user = topems_prod`）。

**为什么没 FORCE**：这两张表不是迁移建表，而是服务启动期由 `lib/shared-db/src/schema.rs` 的 `ensure_schema_defense_ledger()` / `upsert_ledger()` 用**裸池、无租户 GUC** 自建并 UPSERT 的运维台账（记录 schema 版本/校验和）。若 FORCE，属主连接也受策略约束，启动期 UPSERT 会被拒（`42501`），最终降级为「每次启动全量回放 schema 检查」，台账失去版本门禁意义。RLS 在这里的作用是防**非属主**角色误读，而不是防属主。

**是否会被属主连接绕过**：**会，且当前就是绕过的**。`relforcerowsecurity=f` + 连接角色 = 属主，等价于 RLS 对应用连接完全不生效；任何以 `topems_prod` 连接执行的查询（包括业务裸池）都能读全表。所以这两张表的 RLS 是「防其他角色的装饰」，不是有效的运行时隔离。

**建议**：保持现状（不 FORCE），但在文档中明确记为「系统通道 / 台账例外」；若将来要 FORCE，必须先把 bootstrap 连接切到 `app.rls_system='on'` 的专用通道，或改用 `BYPASSRLS` 的独立运维角色，不能只改 `ALTER TABLE ... FORCE ROW LEVEL SECURITY`。

---

## 7. 与既有文档口径的差异及成因

### 7.1 数字对照

| 口径 | 既有文档 | 本次生产实测 | 差异 |
|---|---:|---:|---:|
| 含租户列的目标表 | 990 | **992** | +2（新增表，生产已领先快照） |
| 严格 B 范式 | 573 | **874** | +301 |
| 宽松 fail-open | 290 | **8** | −282 |
| `allow_all` | 13 | **16**（仅租户表） | +3 |
| 无策略、未开 RLS | 92 | **87** | −5 |
| 仍宽松合计 | 303 | **24**（8 + 16） | −279 |

### 7.2 成因

1. **既有两份文档的读数来自克隆库 `m2_dryrun_20261116`**（2026-11-16 快照），该库只有 **480 张**含租户列的目标表、**418 张**有策略、**62 张**无策略——与文档里的 990/573/290 并非同一次测量，文档的 990 规模更像是更早的生产快照。
2. **生产在快照之后已批量收紧**：`_sqlx_migrations` 最高已应用版本为 `20261117235500`，此前已落地多批按 schema 展开的严格化迁移（如 `20261015000081_plan_c_batch2e_rls_nil_policy_all`、`20261015000083_rls_insert_tenant_backfill`、`20261104120000_p2_nullif_29policies` 等），覆盖 `master_data` / `hrm` / `qms` / `crm` / `scm` 的大批表；`20261117234000_legacy_permissive_rls_to_strict` 本身只处理 `public.core_files`、`bi.analytics_datasets`、`master_data.mdm_metadata_objects` 三张，不应把 290→8 的变化归到它名下。此外多张表出现 `rls_tenant_isolation` 与 `tenant_isolation_<table>` 双份同表达式策略，是历史批次重命名时保留旧策略造成的目录冗余（语义等价、无风险，建议后续清理）。
3. **`allow_all` 13 → 16**：`public.core_operation_logs`、`public.subscriptions`、`pdm.pdm_master_data_refs` 在旧文档中被单独归入「系统通道 / 读写分离」类，本次按「`WITH CHECK` 是否为 `true`」统一口径重新计入 `allow_all`。
4. **`20261118090000 / 093000 / 100000 / 103000 / 110000 / 120000 / 123000 / 124000` 在本库均未应用**（manifest `to_apply`，`_sqlx_migrations` 无对应版本），对应表也确为 `allow_all` / 宽松态——说明生产策略状态与代码侧已改好的语义存在**同窗口部署耦合**，不能只上其中一半。
5. **数据面不是漂移，是读取口径错误（2026-11-18 复核修正）**：本文正文「`core_finance_currencies` 8 行全 NULL / `core_roles` 16 行全 NULL」是**盘点时以属主 `topems_prod` 连接、在 FORCE RLS 生效且未设置 `app.tenant_id` 的情况下读数**导致的：宽松策略只能看到 `tenant_id IS NULL` 的行。生产实测真实行数为 `core_finance_currencies` **16 行（8 NULL + 8 租户 `…0001`）**、`core_roles` **17 行（16 NULL + 1 租户 `…0001`）**，`m2_dryrun_20261116` 克隆库读数一致（16/17），且 2026-11-10 的 W7-B5 文档已记录 16 行（8 全局 + 8 租户）。**结论：租户行不是这两天新增的；后续所有盘点必须用超级用户或显式系统通道计数，不能用业务角色裸读。**

### 7.3 今后口径

- 以**生产 `topems_prod` 实测**为唯一基准；克隆库只用于演练，不再作为清单来源。
- 每次盘点记录三件事：`_sqlx_migrations` 最高版本、目标表数、四类形态计数，便于判断是代码/策略/数据哪一侧发生漂移。

---

## 8. 分类判据汇总

| 分类 | 判据 |
|---|---|
| **可直接收紧** | 表 0 行或数据已是真实租户；代码读写均走请求事务作用域且已显式绑定/过滤租户；无需新增平台读；有对应待应用迁移或可直接 DDL |
| **需先补平台读** | 表内是全局语料（全部行 `tenant_id IS NULL` 或全零哨兵），且业务要求「平台行 + 本租户行」同时可见；收紧前必须先把 NULL 回填为全零哨兵并新增 `rls_platform_read`（`tenant_id = 全零 AND GUC 非空`） |
| **属平台语料** | 全局字典/菜单/角色模板/插件目录；数据不属于任何租户，写操作只应由平台/系统通道发起 |
| **属系统通道** | 认证会话/刷新令牌/审计（`core_sessions`、`core_refresh_tokens`、`*audit_logs`）与启动期台账（`schema_defense_ledger`）；租户上下文建立前访问，只能用 `rls_system='on'` |
| **需先回填数据** | 存在 NULL 租户行但有明确归属（可回填到真实租户）或可判定为测试残留/孤儿行（清理） |
| **建议保持宽松** | 平台目录有意全租户可见（`core_tenants`）；或旧部署 search_path 可能命中同名空副本（`flow.*`）；或无租户列、按用户维度设计（`iam.roles`、`public.user_settings`） |

---

## 9. 建议批次（风险从低到高）

### 批 0｜无 RLS 的活表补齐（14 张，风险最低）

- 表：`bi.*` 8 张、`qms.qa_inspection_items/plans/sampling_plans` 3 张、`public.core_file_permissions`、`public.monitor_thresholds`、`iam.core_tenant_plugins`。
- 依据：全部 0 行；代码已在请求事务作用域并带租户过滤/绑定；`bi`、`qms.qa_*`、`iam.core_tenant_plugins` 已有待应用迁移（`20261118093000`、`20261118100000`、`20261118124000`）。
- 验证（六档，逐表断言可见行数）：
  - T0 未设 GUC / T1 空串 GUC / T2 全零 GUC → **0/0/0**（无策略时 `ENABLE RLS` 即默认拒绝）；
  - T3 租户 A / T4 租户 B → **A/B 各只见自有行**（夹具 A 1 行、B 1 行 + 全零 1 行时，T3=1、T4=1、T5=2）；
  - T5 A + `app.rls_system='on'` → 全量可见；
  - 写断言：A 更新 B 行 0 行、A 插入 B 行 `42501`、A 插入自有行成功。
- 回滚：`DROP POLICY rls_tenant_isolation ON <t>; ALTER TABLE <t> DISABLE ROW LEVEL SECURITY;`（不反向回填，因为本批不改数据）。

### 批 1｜`allow_all` 租户数据表（11 张：10 张 0 行、1 张 1 行）

- 表：`bi.audit_logs`、`gis.geodata/geofeatures/map_layers/spatial_analysis`、`portal.portal_quick_actions`、`public.core_operation_logs`、`public.subscriptions`、`qms.quality_inspections/quality_standards`、`hrm.initialization_logs`。
- 依据：按设计是租户数据，当前 0 行（`hrm` 仅 1 行且租户真实）；迁移 `090000/093000/103000/112000/113000` 已在册。
- 验证：
  - T0/T1/T2 → **0 行**（T2 全零上下文若表内有平台哨兵行则应为「哨兵行数」，本批均为 0）；
  - T3/T4 → 各自租户行；T5 → 全量；
  - `core_operation_logs` / `subscriptions` 若读取端保留平台跨租户视图，需在 T5 断言全量、T3 断言仅本租户；写断言同上（跨租户 UPDATE/DELETE 0 行、INSERT 他人 `42501`）；
  - `hrm.initialization_logs` 额外断言：`setup.rs` 的 INSERT 在新策略下成功且写入 `claims` 租户。
- 回滚：`DROP POLICY <strict>; CREATE POLICY <name>_allow_all ON <t> FOR ALL USING (true) WITH CHECK (true);`；`hrm` 需同时回滚代码绑定（同窗口）。

### 批 2｜`allow_all` 平台语料表（5 张，0 行）

- 表：`core.core_plugins`、`erp.dict_items`、`erp.dict_types`、`pdm.pdm_master_data_refs`、`rs.formulas`。
- 依据：`core.core_plugins`（平台插件目录 + 租户草稿，代码已按全零哨兵查询）、`pdm.pdm_master_data_refs`（平台主数据引用，需平台读）、`rs.formulas`（平台公式 + 租户自定义）；`erp.dict_items/dict_types` 经核查是 `master_data` / `public.core_dict_*` 的影子副本（0 行、无 `erp.dict_*` 限定引用），随 `20261118120000` 一并收紧或改列 DROP 候选。
- 验证：
  - T0/T1 → **0 行**；
  - T2 全零 → 平台语料全量；
  - T3/T4 → **平台语料 + 本租户行**（不得见 B 的行）；
  - T5 → 全量；
  - `core.core_plugins` 断言 `is_published=true` 的哨兵行在 T3 可见（插件市场不空）；`pdm` 断言引用解析不归零。
- 回滚：恢复 `allow_all`；若已回填 NULL→全零，需评估是否反回填（有新增哨兵行时反回填会误伤，建议只回策略不回数据）。

### 批 3｜需回填 + 平台读的 5 张宽松表（风险中高，数据存在）

- 表：`finance.core_finance_currencies`(8)、`finance.core_finance_report_line_map`(48)、`public.core_roles`(16)、`mobile.sync_policies`(1)、`pm.project_type_configs`(1)。
- 已有迁移：`20261118110000_platform_corpus_rls_strict.sql`（`to_apply`，含 74 行 NULL→全零回填与前 4 表 `rls_platform_read`）。**必须先在生产快照重跑六档**：生产 8/48/16/1/1，与克隆库演练的 16/48/17/1/1 不一致。
- 验证（按生产实际行数断言）：
  - T0/T1 → **0/0/0/0/0**（唯一被收掉的 fail-open）；
  - T2 → **8/48/16/1/1**（平台上下文不变）；
  - T3/T4 → **8/48/16/1/0**（平台语料可见，`sync_policies` 净减少 1）；
  - T5 → **8/48/16/1/1**；
  - 写断言：A 插入哨兵行 `42501`、A 更新平台行 0 行；全零上下文插入成功；`sync_policies` 的孤儿行在收紧后对所有租户不可见（预期）。
- 前置清理：删除 `mobile.sync_policies` 的孤儿行（`user_id=e91e2228-…` 不存在）与 `pm.project_type_configs` 的 `L1-T9` 测试行，或明确回填归属，避免把测试数据当平台语料全租户可见。
- 回滚：重建 `rls_global_read`；数据反回填（全零→NULL）仅在本批后无新增全零业务行时成立；**建议回滚前先快照 5 表行数与 `tenant_id` 分布**。

### 批 4｜平台元数据 3 张（风险最高，需产品确认）

- 表：`public.core_menus`(452)、`public.core_menu_groups`(130)、`public.core_tenants`(1)。
- 现状：`core_menus/core_menu_groups` 的 452/130 行全为 NULL 平台语料，租户分支按 `tenant_id=$1` 查询；**一旦删 `rls_global_read` 而不回填，所有租户菜单为空**。`core_tenants` 是「全员可读租户目录 + 系统写」的有意设计，但当前任何租户上下文都能看到全部租户。
- 前置（必须先拍板）：
  1. `core_menus/core_menu_groups`：确认「平台菜单全租户可见」语义 → NULL 回填为全零 + `rls_platform_read`；
  2. `core_tenants`：确认租户目录可见范围（全员 / 仅超管 / 仅自己）→ 可能需要新策略而非复用 `rls_platform_read`；
  3. 清理 `core_menus` 的 `flow.*` 空副本依赖，避免旧部署读取落空。
- 验证：T0/T1 → 0；T2 → 452/130/1；T3/T4 → 452/130/1（平台语料可见）；T5 → 全量；菜单接口在 T3 返回非空（关键断言）。
- 回滚：重建 `rls_global_read` + 反回填；菜单为全局读，回滚风险低，但回填后新增平台行的处理需预先约定。

### 批 5｜影子表与 DROP 候选（73 张，建议不补策略）

- 表：`public` 影子 11 张、`iam` 影子 43 张、`flow` 影子 18 张、`plugin_erp.accounting_subjects` 1 张。
- 做法：先确认无部署/工具依赖，再按 DROP 候选排期；在 DROP 前**不要**贸然 `ENABLE ROW LEVEL SECURITY`（`flow.*` 可能被旧部署 search_path 命中，误伤菜单/流程）。
- 验证：DROP 前跑仓库现有探针 `scripts/check_schema_boundary.py`、`scripts/check-schema-defense-drift.py`、`scripts/schema-drift-scan.sh` + 服务启动 smoke；断言各服务 `schema_defense` 不报警、`flow` 不在任何 `schema_boundary.json`。
- 回滚：DROP 走标准备份/导出流程；本批不涉及策略回滚。

### 批 6｜不纳入收紧（保持现状）

- `scm.schema_defense_ledger` / `wms.schema_defense_ledger`：系统台账，保持「RLS 开、不 FORCE」，属主绕过为已知设计（第 6 节）。
- `public.core_tenants` 若产品确认「全员可见租户目录」则留在批 4 之外。
- 非租户 `allow_all`（`iam.roles`、`public.user_settings`、`mobile.oa_announcement_reads`、`erp.holidays` 等）：无租户列，按用户维度或平台语料处理，不套租户策略。

---

## 10. 需要业务/产品拍板的事项

1. `public.core_tenants` 的可见范围：全员可见租户目录，还是仅超管/仅自己？（决定批 4 的策略形态）
2. `core_menus` / `core_menu_groups` 是否确认「平台菜单全租户可见」？（决定能否直接 NULL→全零 + 平台读）
3. `finance.core_finance_report_line_map` 当前 NULL 行在代码谓词下**本就取不到**（法定报表映射可能已失效）——是否按「回填为全零 + 平台读」修复，还是确认该功能已下线？
4. `erp.holidays` 的 `None` 租户全局统计分支是否仍被使用？（决定是否可改系统通道）
5. `flow` schema 的嵌入式部署是否已全部停用？（决定 18 张影子表能否 DROP）

---

## 附录 A｜本次只读核查使用的 SQL 骨架

```sql
-- A1 目标表与策略
SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) AS owner,
       (SELECT json_agg(json_build_object(
          'name', p.policyname, 'cmd', p.cmd, 'permissive', p.permissive,
          'qual', coalesce(p.qual,''), 'with_check', coalesce(p.with_check,'')))
        FROM pg_policies p
        WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policies
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
  AND EXISTS (SELECT 1 FROM information_schema.columns col
              WHERE col.table_schema = n.nspname AND col.table_name = c.relname
                AND col.column_name IN ('tenant_id','tenant_uid'));

-- A2 数据分布（逐表）
SELECT count(*)                                              AS rows,
       count(*) FILTER (WHERE tenant_id IS NULL)             AS null_tenant,
       count(*) FILTER (WHERE tenant_id = '00000000-0000-0000-0000-000000000000') AS zero_tenant
FROM <schema>.<table>;
```

## 附录 B｜核查用到的代码位置

| 表 | 文件 |
|---|---|
| `finance.core_finance_currencies` | `svc/finance/src/modules/currencies.rs` |
| `finance.core_finance_report_line_map` | `svc/finance/src/services/finance/report.rs:666,778` |
| `public.core_roles` | `svc/unified-core/src/modules/iam/role.rs:116,135,410`、`iam/global_row_metrics.rs` |
| `public.core_menus` / `core_menu_groups` | `svc/unified-core/src/modules/menu/handlers.rs:39,92`、`menu/cache.rs:143` |
| `public.core_tenants` | `svc/unified-core/src/modules/tenant/handlers.rs:30,44,267` |
| `mobile.sync_policies` | `svc/mobile/src/modules/offline_sync.rs:591,719`、`db/repository.rs:516` |
| `pm.project_type_configs` | `svc/pm/src/modules/project_type_config.rs:110,141,236,273` |
| `hrm.initialization_logs` | `svc/hrm/src/modules/setup.rs:368` |
| `scm/wms.schema_defense_ledger` | `lib/shared-db/src/schema.rs`（`ensure_schema_defense_ledger` / `upsert_ledger`） |
| `core.core_plugins` | `svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs:48-284` |
| `qms.qa_inspection_*` / `qa_sampling_plans` | `svc/qms/src/modules/inspection_standard.rs:257,329` |
| `public.core_file_permissions` | `svc/unified-core/src/modules/file/manage.rs:1292` |
| `public.monitor_thresholds` | `svc/monitor/src/modules/monitor/alert_evaluator.rs:337-351` |
| `erp.holidays` | `svc/erp/src/modules/holidays.rs:85-135` |
| `mobile.oa_announcement_reads` | `svc/mobile/src/modules/oa.rs:1630-1670` |
| `iam.core_tenant_plugins` | `svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs`（19 处） |

## 附录 C｜111 张待处理表机器可读清单

本段是 `scripts/dev/rls-baseline-rebuild.sh` 的唯一表清单来源，标记段内每行一张 `schema.table`，请勿手工改写格式；增删表必须同步更新数量断言（默认 111）。

### C.1 8 张宽松表

<!-- rls-baseline:begin -->
finance.core_finance_currencies
finance.core_finance_report_line_map
public.core_roles
public.core_menus
public.core_menu_groups
public.core_tenants
mobile.sync_policies
pm.project_type_configs

### C.2 16 张 `allow_all` 表

bi.audit_logs
core.core_plugins
erp.dict_items
erp.dict_types
gis.geodata
gis.geofeatures
gis.map_layers
gis.spatial_analysis
hrm.initialization_logs
pdm.pdm_master_data_refs
portal.portal_quick_actions
public.core_operation_logs
public.subscriptions
qms.quality_inspections
qms.quality_standards
rs.formulas

### C.3 87 张无策略、未开 RLS

bi.analytics_comparison_analyses
bi.analytics_comparison_results
bi.analytics_dashboard_shares
bi.analytics_dashboard_templates
bi.analytics_drilldown_history
bi.analytics_drilldown_paths
bi.analytics_row_level_permissions
bi.analytics_self_service_reports
flow.core_doc_documents
flow.core_doc_folders
flow.core_doc_templates
flow.core_flow_categories
flow.core_master_data_change_log
flow.core_master_data_refs
flow.core_mdm_approvals
flow.core_mdm_reconciliation_log
flow.core_menu_groups
flow.core_menus
flow.core_operation_logs
flow.core_tenant_modules
flow.core_tenant_settings
flow.core_tenant_usage
flow.core_tenant_users
flow.core_workflow_instances
flow.core_workflow_versions
flow.core_workflows
iam.core_billing_invoices
iam.core_billing_plans
iam.core_chat_members
iam.core_chat_messages
iam.core_chat_rooms
iam.core_dashboard_refresh_log
iam.core_dict_items
iam.core_dict_types
iam.core_email_queue
iam.core_email_templates
iam.core_emails
iam.core_faqs
iam.core_file_folders
iam.core_files
iam.core_guide_lessons
iam.core_guide_progress
iam.core_guides
iam.core_inter_module_sync
iam.core_login_logs
iam.core_menu_groups
iam.core_menus
iam.core_migration_history
iam.core_mobile_offline_records
iam.core_notification_templates
iam.core_notifications
iam.core_plugin_categories
iam.core_plugin_instances
iam.core_plugin_permissions
iam.core_plugin_pricing
iam.core_plugin_reviews
iam.core_plugins
iam.core_roles
iam.core_subscriptions
iam.core_tenant_modules
iam.core_tenant_plugins
iam.core_tenant_settings
iam.core_tenant_usage
iam.core_tenant_users
iam.core_usage_records
iam.core_users
iam.core_workflow_instances
iam.core_workflow_tasks
iam.core_workflows
iam.tenant_permissions
plugin_erp.accounting_subjects
public.analytics_sync_records
public.conversion_executions
public.conversion_rules
public.core_file_permissions
public.core_ticket_activities
public.core_ticket_comments
public.core_ticket_sla_escalations
public.core_ticket_sla_policies
public.core_tickets
public.core_users
public.monitor_thresholds
public.pm_master_data_refs
public.qa_qms_sync_records
qms.qa_inspection_items
qms.qa_inspection_plans
qms.qa_sampling_plans
<!-- rls-baseline:end -->

---

## 10. 六档验收基线（111 张，2026-11-18 生产快照）

### 10.1 复现方式

```bash
scripts/dev/rls-baseline-rebuild.sh --target-db topems_rls_baseline_all111_20261118 --recreate
```

- 脚本从**附录 C** 解析表清单（数量断言 111），fail-closed：缺 `pg_dump`、生产库不可达、清单缺表/重复/数量不符、探针角色缺失或带 `SUPERUSER/BYPASSRLS`、导入后表数不一致、逐表行数与生产不一致，均直接退出并报明原因；目标库已存在时必须显式 `--recreate`。
- 六档：`unset`（未设置）/ `empty`（空串）/ `zero`（全零 `…0000`）/ `tenantA`（`…0001`）/ `tenantB`（`…0002`，生产不存在，作对照）/ `tenantA_system`（租户A + `app.rls_system='on'`）。
- 探针以非超级用户 `rls_test_user` 执行 `SET LOCAL ROLE`；生产只做 `pg_dump --schema-only` 与目标表 `--data-only`。
- 本轮隔离库：`topems_rls_baseline_all111_20261118`（结构 1345 张表全量导入，0 报错；111 张表行数逐表与生产一致）。
- 明细存档：`artifacts/rls-baseline/topems_rls_baseline_all111_20261118/matrix.tsv`（含 `rls_on` / `policies` / 六档读数 / 报错码 / 分类）。

### 10.2 分类计数

| 分类 | 张数 | 含义 |
|---|---:|---|
| `EMPTY` | 102 | 0 行：空表等值，**无可观测证据**；其中 87 张同时是 `rls_on=f`、`policies=0` |
| `NO_ISOLATION` | 7 | 有数据且六档读数完全相同（当前无隔离） |
| `ISOLATED` | 2 | 六档读数有差异 |
| 报错 | 0 | 111 × 6 = 666 次探针全部无 SQLSTATE（空串档未出现 `22P02`，策略统一 `NULLIF(...)`） |

### 10.3 有数据的 9 张（六档可见行数）

| schema.table | unset | empty | zero | tenantA | tenantB | tenantA+system | 总行数 | 判定 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| finance.core_finance_currencies | 8 | 8 | 8 | **16** | 8 | **16** | 16 | ISOLATED |
| public.core_roles | 16 | 16 | 16 | **17** | 16 | **17** | 17 | ISOLATED |
| finance.core_finance_report_line_map | 48 | 48 | 48 | 48 | 48 | 48 | 48 | NO_ISOLATION |
| public.core_menus | 452 | 452 | 452 | 452 | 452 | 452 | 452 | NO_ISOLATION |
| public.core_menu_groups | 130 | 130 | 130 | 130 | 130 | 130 | 130 | NO_ISOLATION |
| public.core_tenants | 1 | 1 | 1 | 1 | 1 | 1 | 1 | NO_ISOLATION |
| mobile.sync_policies | 1 | 1 | 1 | 1 | 1 | 1 | 1 | NO_ISOLATION |
| pm.project_type_configs | 1 | 1 | 1 | 1 | 1 | 1 | 1 | NO_ISOLATION |
| hrm.initialization_logs | 1 | 1 | 1 | 1 | 1 | 1 | 1 | NO_ISOLATION |

- `NO_ISOLATION` 的 7 张：前 6 张为 `tenant_id IS NULL` 平台行被 `rls_global_read` 的 `OR tenant_id IS NULL` 分支全放行；`hrm.initialization_logs` 为 `allow_all` 且仅 1 行真实租户行。
- 其余 102 张 `EMPTY` 的空表读数不具备验收意义，待各表首次落数据后用同一脚本 `--recreate` 重跑即可（脚本无需改动）。

---

## 11. 数据归因：currencies / core_roles 的租户行是谁写入的

**结论先说：不是近两天新增，也不是应用运行期新写。正文 7.2.5 的「全 NULL」是盘点读取口径错误。**

| 表 | 真实内容 | 写入证据 | 写入方 / 通道 | 是否带租户上下文 |
|---|---|---|---|---|
| `finance.core_finance_currencies` | 16 行 = 8 NULL + 8 `…0001` | 16 行 `created_at` 完全相同（`2026-10-26 14:03:20.516746`）、`xmin` 同为 `3871`，即**单事务批量写入**；`m2_dryrun_20261116` 克隆库同为 16 行；`docs/quality/w7-b5-finance-impact-2026-11-10.md` 已记录「8 全局 NULL + 8 租户」 | 生产基线数据一次性导入（10-26），非迁移/非运行期代码。`20261105145000_finance_currency_master_fix.sql` 的种子 id 与生产行 id 完全不同且 `ON CONFLICT DO NOTHING`，在生产中是空操作 | 批量导入时直接按租户 `…0001` 落了两份目录行；当前运行期 `create_currency` 已改为写全零哨兵 `PLATFORM_TENANT_ID`，不再产生 NULL 行 |
| `public.core_roles` | 17 行 = 16 NULL + 1 `…0001` | 租户行为 `f1_prod_check_1111210231`，`created_at=2026-11-11 21:02:33.69`、`updated_at=21:02:42.87`；同分钟登录日志：`admin` 21:02:31.50、`tenant_admin` 21:02:31.78、`f1_prod_1111210231` 21:02:32.72 / 21:02:33.46、`tenant_admin` 21:02:50.74 | 2026-11-11 21:02 的一次**生产冒烟验证**：admin 建测试用户 → 该用户登录 → 通过 IAM 接口创建 `f1_prod_check_*` 角色并更新；代码路径 `svc/unified-core/src/modules/iam/role.rs` `create_role`（`iam_write_scope` → 租户分支 `scope_with(txn)`，`INSERT` 的第 4 个参数即 claims 租户） | **是**。租户管理员通道写入的就是 claims 租户 `…0001`；平台分支才走 `scope_system()` 且绑定 claims 租户或全零 |

**为什么盘点时看起来“全 NULL”**：8 张宽松表均为 `FORCE RLS`，本文盘点连接用的正是属主角色 `topems_prod`。属主在 FORCE 下同样受策略约束，未设置 `app.tenant_id` 时只能命中 `rls_global_read` 的 `tenant_id IS NULL` 分支。实测复现：

```sql
BEGIN; SET LOCAL ROLE topems_prod;   -- 属主 + FORCE RLS + 无 GUC
SELECT count(*) FROM finance.core_finance_currencies;  -- 8（真实 16）
SELECT count(*) FROM public.core_roles;                -- 16（真实 17）
ROLLBACK;
```

**口径修正**：今后盘点数据面必须用超级用户计数，或显式 `app.rls_system='on'` 的统计通道；不能用业务/属主角色裸读，否则会把「策略过滤后的可见行」误记为「表内真实行」，并据此误判为数据漂移。

---

## 12. 批 0：87 张无策略表的逐表定性与本地演练（2026-11-18）

### 12.1 定性结果

| 分类 | 张数 | 说明 |
|---|---:|---|
| 租户表 | **15** | 运行期有代码读写且带租户上下文 |
| 平台语料 | 0 | 本批未发现 |
| 全局配置 | 0 | 本批未发现 |
| 待核实 | **72** | 均为影子/副本表，运行期无读者，无法判定归属维度 |

**租户表 15 张**（迁移覆盖）：

| 表 | 依据（读 / 写） | 迁移 |
|---|---|---|
| `bi.analytics_comparison_analyses` 等 bi 8 张 | `svc/analytics/src/modules/bi/**` 请求事务作用域 + `tenant_id` 谓词 | `20261118093000`（既有待应用） |
| `qms.qa_inspection_items` / `qa_inspection_plans` / `qa_sampling_plans` | `svc/qms/src/modules/inspection_standard.rs:276,333` `read_scope_for_claims` + 显式 `qms.` 限定 + `tenant_id` 过滤 | `20261118100000`（既有待应用） |
| `iam.core_tenant_plugins` | `svc/plugin-registry/**/tenant_plugins.rs` 19 处显式 `iam.` 限定，请求事务作用域 | `20261118124000`（既有待应用） |
| `public.core_file_permissions` | 写 `svc/unified-core/src/modules/file/manage.rs:1292` 显式绑定租户；无跨租户读 | **`20261118150000`（本批新增）** |
| `public.monitor_thresholds` | `svc/monitor/src/modules/monitor/alert_evaluator.rs:337-351` `scope_with` + 租户谓词 | **`20261118150000`（本批新增）** |
| `public.core_users` | 读 `svc/analytics/src/main.rs:308-430` 带 `tenant_id` 谓词；全仓无写入方 | **`20261118150000`（本批新增）** |

> 修正 §5.3：`public.core_users` 不是纯影子表——analytics 的 reports-center / user-growth / role-distribution 以 `TenantScope::from_claims` + `open_read_scope` 读取并显式过滤 `tenant_id`，因此按租户表处理；但它没有写入方，收紧后看板用户计数仍为 0（现状即 0）。

**待核实 72 张**（理由分组）：

| 组 | 张数 | 依据 |
|---|---:|---|
| `flow.*` | 18 | `flow` 不在任何服务 `search_path`（`scripts/schema_boundary.json`）；运行时统一读 `public.*` 权威表。`menu/handlers.rs:26` 记录嵌入部署历史 `search_path=flow,public`，需确认旧部署是否仍存在，故不判 |
| `iam.*` 影子（除 `core_tenant_plugins`） | 43 | `iam` 不在任何 `search_path`；全仓唯一 `iam.` 限定引用是 `iam.core_tenant_plugins`（已归租户表）。其中 34 张在 `public`/`core`/`portal`/`communication` 等同名权威表；其余 9 张（billing/chat/subscriptions 等）只存在于 `iam`，全仓仅有 `schema_defense.rs` 注释引用，无运行期读者 |
| `public.*` 影子 | 10 | 权威表分别在 `ticket.*`（5）、`integration.*`（2）、`bi.*`（1）、`pm.*`（1）、`qms.*`（1），代码均显式限定权威 schema |
| `plugin_erp.accounting_subjects` | 1 | 权威表为 `finance.accounting_subjects`，`svc/finance` 走 `finance,public` |

这 72 张本轮**不启用 RLS**：空表无读者，贸然收紧不会产生收益；`flow.*` 还需排除旧嵌入部署命中风险。建议路径仍是 §9 批 5 的 DROP 候选，先确认无部署/工具依赖。

### 12.2 本地演练（隔离库 `topems_rls_baseline_all111_20261118`）

- 夹具：每表手工插入租户 A、租户 B 各 1 行（含 `bi.analytics_dashboards`、`iam.core_tenants` 父行），探针角色 `rls_test_user`（NOSUPERUSER / NOBYPASSRLS）。
- 六档读数：15 张全部为 `unset=0 / empty=0 / zero=0 / tenantA=1 / tenantB=1 / A+system=2`，无报错。
- 写断言 60 项全通过：A 插自有行成功；A 插 B 行 `42501`；A 更新/删除 B 行命中 0；A 更新自有行命中 ≥1。
- 新迁移 `20261118150000` 在隔离库实跑通过（前置断言、策略/RLS 后置断言、索引），随后用回滚文件恢复到「RLS 关闭、0 策略、索引删除」。
- 演练后已清理夹具与父行，15 张表均回到 0 行；隔离库结构与基线一致。
- 产物：`artifacts/rls-batch0/drill.log`（15 张六档 + 写断言）、`artifacts/rls-batch0/migration_check.log`（3 张迁移后复验）。

其余约束遵守情况：生产零写入（仅此前的只读盘点）；未改历史迁移、`migration_manifest.yaml`、`checksums.txt`；有数据的表本轮未碰。

---

## 13. 批 0 后续核查（2026-11-18）

### 13.1 `public.core_users` 真相：独立的看板功能缺陷

结论：**权威身份表是 `iam.users`，`public.core_users` 是 0 行、无写入方的孤儿镜像；analytics 看板因此恒为 0，与 RLS 无关。**

| 事实 | 证据 |
|---|---|
| 登录/注册/改密/登录时间全部读写 `iam.users`（5 行） | `svc/unified-core/src/modules/iam/auth.rs:270`（`FROM iam.users` 登录）、`:774`（`INSERT INTO iam.users`）、`:529`、`:1633` |
| 租户-用户映射在 `public.core_tenant_users`（3 行，均租户 `…0001`） | `svc/unified-core/src/modules/tenant/handlers.rs:371,1294,1347,1391`；未限定名按 `public` 解析 |
| `public.core_users` 0 行，全仓无 INSERT/UPDATE/DELETE | `rg 'INSERT INTO .*core_users'` 仅命中 analytics 的 SELECT |
| analytics 读 `public.core_users` | `svc/analytics/src/main.rs:328-329`（`totalUsers`/`activeUsers`）、`:385-388`（`userGrowth`）、`:426`（`roleDistribution`）；`search_path = bi, public` |
| 影响接口 | `GET /api/bi/reports-center/stats` 恒返回 `totalUsers=0`、`activeUsers=0`、`userGrowth` 各月 0、`roleDistribution` 各角色 `user_count=0`；导出接口 `:507-521` 已是 501，不在影响面 |

**修法建议（另单跟踪，本轮不修）**：analytics 改读 `iam.users` ⨝ `public.core_tenant_users`（`iam.users` 无 `tenant_id`，不能单独按租户统计）；或建立 `public.core_users` 的可靠写入/回填链路。两者都要先定「用户-租户」唯一口径。

### 13.2 72 张影子表的 search_path 可达性核查

**结论：不能进 DROP 候选。生产进程本身就是 `SEARCH_PATH=flow, …, iam, …`，flow/iam 仍可能被裸池查询命中。**

| 档 | 表 | 依据 |
|---|---|---|
| **仍可能** | `flow.*` 18 张 | 见下方现役证据；`flow` 还排在 `public` 之前 |
| **仍可能** | `iam.*` 43 张 | 同上；`sqlx` 的 monolith 路径 `iam` 排第一 |
| **确认无** | `public.*` 影子 10 张 | 代码均显式限定权威 schema：`ticket.`（5）、`integration.`（2）、`bi.`、`pm.`、`qms.`；无未限定引用 |
| **确认无** | `plugin_erp.accounting_subjects` | `svc/finance` 走 `finance,public`，查询显式 `finance.` |
| 查不清 | 无 | — |

现役证据（均指向 flow/iam 在 search_path 内）：

- `deploy-notes.md:39`：生产 macOS launchd 环境 `SEARCH_PATH=flow, mobile, rs, erp, public, iam, shared`。
- 运行中 `topems-server` 进程环境实测含 `SEARCH_PATH=flow,...`（只读 `ps` 观测）。
- `scripts/run_monolith.sh:42,73`：单体启动/提示同一取值。
- `scripts/db/sqlx-search-path.map:34`：`topems-server=iam,…,flow,…`；`:26`：`topems-unified-core=iam,shared,public`。
- `.github/workflows/e2e.yml:151,309`、`e2e-web.yml:134`：CI 端到端同样注入该值。
- `scripts/p5/rollback_iam_replicas.sh:41`：回滚动作会把 `.env` 改回 `SEARCH_PATH=iam,shared,public`。
- `database/init/06_iam_schema.sql:26`：`CREATE SCHEMA iam`，iam 仍是初始化结构的一部分。

不设 `SEARCH_PATH` 的部署面：`deploy/k8s/base/configmap.yaml`、`deploy/docker/docker-compose.monolith.yml`（但两者也没有反向排除 flow/iam）。

减轻因素（不足以判「确认无」）：单体 15 个模块显式传独立 `search_path`，其余模块多用 `Db::new(ctx.db, "public")` 作用域；但未证明所有裸池查询都带 schema 前缀，故保持「仍可能」。

### 13.3 对 72 张表 `REVOKE ALL` 的过渡保护评估（只评估，不执行）

**关键事实：应用/迁移角色 `topems_prod` 同时是这 87 张表的 owner；`topems_app` 在这些表上的授权数为 0（ACL 仅 owner，无 PUBLIC、无其他角色）。**

- 对 `topems_app` 执行 `REVOKE ALL`：**当前是 no-op**，零风险也零即时收益。它的价值仅在将来生产切到非 owner 的 `topems_app` 之后（`docs/project/TODO.md` 的 V521 遗留项），可作为前置护栏先落。
- 对 `topems_prod` 执行 `REVOKE ALL`：技术上可行（owner 可撤销自身，且保留隐式 grant option，`GRANT ALL` 可立即回滚），但有下述耦合：

| 影响面 | 评估 |
|---|---|
| 业务读写 | 72 张当前无读者，预期无影响；但 flow/iam 若被旧部署命中，会从「静默读到空表」变成 `42501` 报错（噪声变大，非数据损坏） |
| `schema_defense` verify | 走 `information_schema`，**不受影响** |
| `schema_defense` 自愈 | `harden_new_tenant_tables` 会 `SELECT count(*)`（`lib/shared-db/src/schema.rs:564`）→ 撤销后 `42501`，仅 WARN 并跳过自愈，不阻断启动 |
| 迁移/DDL | 建表、加列、建策略靠 ownership，不靠表 ACL → **不受影响** |
| 备份 | `backup-topems.sh:16` 用 `xingzhai` 超级用户 → 不受影响；`scripts/deploy/production-deploy.sh:306` 用 `DATABASE_URL`（`topems_prod`）→ 会因无 SELECT 失败/告警（表为空，数据面无损） |
| 入向 FK | 31 条约束；RI 内部检查不以调用者权限执行，预期不受影响，仍需演练确认 |
| 依赖对象 | `pg_depend` 查无视图/物化视图依赖 |

**建议（不执行）**：

1. 先落零风险项：对 `topems_app` 做幂等 `REVOKE ALL`，并在迁移里注明「防未来非 owner 切换」。
2. 暂缓对 `topems_prod` 撤销，直到 §13.2 的 flow/iam 可达性收敛（旧部署确认下线或 `SEARCH_PATH` 去除）。
3. 若最终执行，配套：`GRANT ALL` 回滚脚本、隔离库演练（启动 + 迁移 + 备份 + FK 写入）、备份路径固定超级用户。
4. 不推荐用「FORCE RLS + deny-all」替代：owner 同样被拦，影响面与 REVOKE 接近，却多一层策略维护。

