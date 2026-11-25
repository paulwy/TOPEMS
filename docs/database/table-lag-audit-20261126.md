# 表级落后审计（2026-11-26）

## 怎么做的

1. `schema-health.sh` 新增 `[2b]` 逐表落后校验（之前只在 schema 级整体落后时才算，导致 `public 领先 columns+2003` 盖住单表缺口）。
2. 基线库（`fixtures/full_schema_contract.sql`，2.3MB，约 20 天前的 pg_dump）装进临时库，与现库逐表比列。
3. 对每张落后表做「代码字面量核对」：抽出 `svc/**/*.rs` 里所有 SQL 字符串字面量，只保留提到该表名的，再看基线独有列是否真的在这些字面量里被引用。引用到了才算风险项，否则记血缘差异并写入 `database/schema-diff-waivers.tsv`。

结果：140 张表落后基线 → 113 张无代码引用（已 waive）→ 27 张有引用（本文件逐条定性）。

## 风险项（27）

| 表 | 类型 | 基线独有列（代码在用的） | 代码位置 | 建议 |
|---|---|---|---|---|
| `ai.model_usage_stats` | 列偏少 | cost, input_tokens, output_tokens, requests | requests | 现库是 `request_count`，代码用 `requests`：改代码 |
| `core.core_plugins` | 列偏少 | last_owner_tenant_id, owner_tenant_id, unpublished_at | last_owner_tenant_id, owner_tenant_id, unpublished_at | `owner_tenant_id` / `last_owner_tenant_id` / `unpublished_at`：tenant_plugins.rs 在用 → 加列或改模型 |
| `erp.erp_master_data_refs` | 列偏少 | deleted_at, id | id | `id` 在各表都有，疑为别名解析误判；人工复核后若无问题直接 waive |
| `erp.purchase_orders` | 列偏少 | company_id | company_id | 加列 `company_id` 或代码改按 tenant/company 双键；先确认该投影端点是否在用 |
| `erp.sales_order_items` | 表缺失 | amount, created_at, deleted_at, id, material_code, material_name… | created_at, deleted_at, id, material_code, material_name, quantity, specification, tenant_id, unit, updated_at, sales_order_id, amount, remark, unit_price | 已修：20261119120000 是 pending 迁移，本地 apply 后表已建（14 列，与代码完全对齐） |
| `erp.sales_orders` | 列偏少 | company_id | company_id | 同上（`searchable_projection.rs` 用到 company_id） |
| `iam.resource_permissions` | 列偏少 | effect, role_id, scope | effect, role_id, scope | `effect/role_id/scope`：`resource_permission.rs` 按这 3 列读写，需加列或改表模型 |
| `iam.tenant_permissions` | 表缺失 | active, created_at, deleted_at, id, role, tenant_id… | active, id, role, tenant_id, user_id, created_at, deleted_at, updated_at | 数据库版权限存储默认关闭（Memory），启用前需补 id 生成 + 建表迁移；不在本轮修 |
| `iam.tool_permissions` | 表缺失 | allowed_operations, created_at, denied_operations, id, max_permission, tenant_permission_id… | allowed_operations, denied_operations, max_permission, tenant_permission_id, tool_name | 同上，依赖 tenant_permissions.id |
| `mes.equipment` | 列偏少 | maintenance_cycle, name, warranty_end_date | name, maintenance_cycle | 现库是 `equipment_name` / `maintenance_frequency_days`，代码 `name` / `maintenance_cycle`：改代码对齐现库 |
| `mes.production_orders` | 列偏少 | product_id, qualified_quantity, source | product_id, source, qualified_quantity | `product_id/source/qualified_quantity`：改代码对齐现库（现库有 planned/completed 系列） |
| `mes.production_records` | 列偏少 | equipment_id, product_code, product_name, qualified_quantity, quantity, quantity_defective… | equipment_id, quantity_defective, quantity_produced, product_name | 实为别名（`NULL::uuid AS equipment_id`、`completed_quantity AS quantity_produced`），核对后 waive |
| `mes.work_stations` | 列偏少 | name | name | 同上，`name` → 现库应有 `station_name` 一类；改代码 |
| `mobile.oa_announcement_reads` | 列偏少 | created_at, tenant_id | tenant_id | 现库无 `tenant_id`，代码按 tenant 过滤：加列或改按 announcement 表过滤 |
| `plugin_finance.accounting_subjects` | 表缺失 | category, code, created_at, deleted_at, description, id… | id | 仅 doctest 引用 → waive |
| `pm.project_type_configs` | 列偏少 | name_en | name_en | `name_en`：project_type_config.rs 在用 → 加列（i18n 列，低成本） |
| `public.core_flow_delegates` | 列偏少 | tenant_id | tenant_id | 同上 |
| `public.core_flow_rules` | 列偏少 | tenant_id | tenant_id | 现库无 `tenant_id`，代码按 tenant 过滤 → 需确认 RLS/租户隔离方式，可能加列 |
| `public.core_flow_variable_history` | 列偏少 | tenant_id | tenant_id | 同上 |
| `public.core_flow_variables` | 列偏少 | tenant_id | tenant_id | 同上 |
| `public.core_tenant_modules` | 列偏少 | company_id | company_id | `company_id`：确认是否与 tenant_id 同义，改代码或加列 |
| `public.dynamic_data` | 列偏少 | tenant_id | tenant_id | 同上（schema_registry.rs 同时读 dynamic_data） |
| `public.monitor_settings` | 列偏少 | company_id, description, override_policy | company_id, override_policy | 同上（company_id/override_policy） |
| `public.schema_registry` | 列偏少 | tenant_id | tenant_id | 现库无 `tenant_id`：master-data 的 schema_registry 按 tenant 读写，需加列 |
| `public.search_recent` | 表缺失 | deleted_at, id, keyword, searched_at, user_id | keyword, searched_at, user_id | 表不存在（基线有 5 列），`svc/search/src/handlers.rs` 在用 → 需建表迁移 |
| `public.system_settings` | 列偏少 | company_id, is_active, override_policy | company_id, override_policy | 现库是 key/value 建模（tenant_id/key/value）；`settings.rs` 按 company_id/override_policy 取，属另一套模型 → 改代码读 key/value 或改用 monitor_settings |
| `wms.locations` | 列偏少 | address, code, name, properties | code, name | 现库是 `location_code` / `location_name`，代码用 `code` / `name`：改代码（可能已有别名，需看具体 SQL） |

## 结论与顺序

1. **已修 1 项**：`erp.sales_order_items` 不是血缘问题，而是 `20261119120000_erp_sales_order_items.sql` 一直处于 pending；`scripts/db/apply-pending.sh apply --only 20261119120000` 跑完后表 14 列与 `svc/erp` / `svc/scm` 代码完全对齐。这条正好证明逐表校验的价值——schema 级永远看不见它。
2. **改名类（改代码）优先**：`mes.equipment` / `mes.work_stations` / `mes.production_orders` / `wms.locations` / `ai.model_usage_stats` / `public.system_settings` 这一批是「现库叫 A，代码写 B」，改代码即可，不动表。
3. **缺列类（加列迁移）**：`public.core_flow_*` 的 `tenant_id`、`public.schema_registry` / `public.dynamic_data` 的 `tenant_id`、`iam.resource_permissions` 的 `effect/role_id/scope`、`pm.project_type_configs.name_en`、`mobile.oa_announcement_reads.tenant_id`。这批涉及租户隔离语义，加列前要先想清楚回填与 RLS，不能盲加。
4. **未启用功能**：`iam.tenant_permissions` / `iam.tool_permissions`（DatabasePermissionStore 默认 Memory）。
5. **要建表**：`public.search_recent`（基线 5 列，`svc/search` 在用）。

审计口径可复跑：`bash scripts/db/schema-health.sh` 看 `[2b]` 段；waive 清单在 `database/schema-diff-waivers.tsv`。

## 处置结果（同日落地）

27 个风险项按「先做止损、再做定性」处理完，只剩 8 个是别名误判，已全部 waive（`database/schema-diff-waivers.tsv`）：

**靠迁移修掉的（3 条，已本地 apply）**

| 迁移 | 作用 |
|---|---|
| `20261125140000_public_search_recent.sql` | 建 `public.search_recent`（id/tenant_id/user_id/keyword/searched_at/...）+ `(user_id,keyword)` 唯一索引 + 租户策略。`svc/search` 的最近搜索写入/读回之前全是静默失败 |
| `20261125150000_column_gap_backfill.sql` | 补齐 16 张表里代码真在用、anchor 血缘缺的列：`erp.sales_orders/ purchase_orders.company_id`、`iam.resource_permissions.effect/scope/role_id`、`core.core_plugins.owner_tenant_id/last_owner_tenant_id/unpublished_at`、`mobile.oa_announcement_reads.tenant_id`、`pm.project_type_configs.name_en`、`public.core_flow_{rules,delegates,variables,variable_history}.tenant_id`、`public.core_tenant_modules.company_id`、`public.schema_registry/dynamic_data.tenant_id`、`public.system_settings/monitor_settings.company_id/override_policy` |
| `20261119120000_erp_sales_order_items.sql` | 本来就是 pending，apply 后 `erp.sales_order_items` 14 列与 `svc/erp`+`svc/scm` 对齐 |

**验证**：11 条关键语句逐条 `PREPARE` 打真库 schema 全部通过（settings 参数分级 SELECT、project_type_configs 带 name_en 的检索、erp.sales_orders INSERT 13 参、core_flow_rules INSERT、resource_permissions UPDATE）；`search_recent` 用 `ON CONFLICT (user_id,keyword)` 实测 upsert 成功。

**waive 的 8 个（别名误判）**：`wms.locations`、`mes.equipment`、`mes.production_orders`、`mes.work_stations`、`ai.model_usage_stats`、`erp.erp_master_data_refs`、`public.monitor_settings`、`public.system_settings` —— 都是 `xxx AS name` / `AS requests` 这类列别名，以及事件处理器里的运行时自愈 DDL。
