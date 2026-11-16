# B3 · RLS 宽松策略只读盘点 + 分批收口方案（M-1 / B4）

> 状态：**盘点完成、分批方案待评审**。本文件不产生任何生产变更，**未执行任何 DDL/DML**。
> 数据源：`topems_prod`（PostgreSQL 18.4），**仅 SELECT**：`pg_policies` / `pg_class` / `pg_namespace` / `information_schema.columns`。
> 口径来源：[scope-with-plan-20261116.md](./scope-with-plan-20261116.md) §7（**不改口径**，差异见「口径差异」节）。
> 生成时间：2026-11-16。配套脚本：`docs/database/rls-policy-backup-batch01.sql` … `batch08.sql`（仅本地，未执行）。

## 0. 结论与口径对齐

| 项 | 口径（§7） | 实测 | 一致 |
|---|---:|---:|:--:|
| `cmd IN (SELECT,ALL)` 且 `qual` 非空 | 1030 | **1030** | ✅ |
| 谓词含 `app.tenant_id` | 962 | **962** | ✅ |
| 非租户谓词（allow-all / `rls_system`-only） | 68 | **68** | ✅ |
| 有 `rls_system` 逃生口（正确态） | 579 | **579** | ✅ |
| 无逃生口 + 未设即放行 → **A 表级** | 370 | **370** | ✅ |
| 既有逃生口 + 放行 → **B 列级** | 12 | **12** | ⚠️ 标签与实测形态不符，见「口径差异」 |
| 无逃生口 + 未设即拒 | 1 | **1** | ⚠️ 该组实测 10 条，见「口径差异」 |
| 本次盘点对象 | 382 | **382** | ✅ |

> 注：A/B/C 的条数与 §7 对齐，但 **B 的「既有逃生口」标签在实测中不成立**（实测该形态 11 条且已被计入 579）。B 实际收纳的是「谓词不落在表级 `tenant_id` 等值上」的 12 条，详见「口径差异」。
>
> **定案（2026-11-16，用户裁决：采用重切口径）**：正式判据为「谓词是否落在表级 `tenant_id` 等值」——落在表级等值且有宽松分支的进 A，不落在表级等值的进 B（列级/函数级单独复核）。**A 表级 370 / B 列级 12 为正式数**，后续批次划分、回滚脚本与验证判据一律按此口径书写。字面口径的「11 条既有逃生口且放行 / 10 条未设即拒」保留为脚注（见「口径差异」），只用于解释与 §7 的差异来源，不再作为统计或判据引用。C 组的 1 条（`erp.event_idempotency`）仍单列待决策，不并入任何批次。

其余事实（只读实测）：

- 382 条分布在 **302 张表 / 18 个 schema**；其中 **80 张表有 2 条策略**（permissive 是 OR 关系，同表必须整表处理）。
- 382 条所在表的 `relrowsecurity` **全部为 on**，`relforcerowsecurity` **全部为 on** → 策略真实生效，负向判据可执行。
- 策略属性完全同质：`permissive` 全为 `PERMISSIVE`、`roles` 全为 `{public}`、目标对象全为普通表（`relkind='r'`）。
- **360 / 382 条所在表 `reltuples = -1`**（从未 ANALYZE），行数只能记「未统计」；仅 22 条有可用的估算值。

## 0.1 判定规则（可复核 SQL，全部只读）

分类不改 §7 的口径，只把「形态」落成可执行的字符串特征。记 `guc := current_setting('app.tenant_id', true)`：

| 特征 | 判定 |
|---|---|
| 逃生口 | `qual LIKE '%app.rls_system%'` |
| 未设即放行 | `qual` 含 `current_setting('app.tenant_id',true) IS NULL`、或 `= ''::text`、或 `= '00000000-…-000000000000'`（零 UUID）、或 `tenant_id IS NULL`、或 `tenant_uid IS NULL` |
| 未设即拒 | 以上五者**全不出现**，只有 `tenant_id = (NULLIF(guc,''))::uuid` 一类严格判等 |

```sql
-- ① 基数与分流（实测：1030 / 962 / 68）
SELECT count(*) AS policies_sel_all,
       count(*) FILTER (WHERE qual LIKE '%app.tenant_id%') AS tenant_pred,
       count(*) FILTER (WHERE qual NOT LIKE '%app.tenant_id%') AS non_tenant_pred
FROM pg_policies WHERE qual IS NOT NULL AND cmd IN ('SELECT','ALL');

-- ② 579 / 383（无逃生口）
SELECT count(*) FILTER (WHERE qual LIKE '%app.rls_system%') AS with_escape,
       count(*) FILTER (WHERE qual NOT LIKE '%app.rls_system%') AS without_escape
FROM pg_policies WHERE qual IS NOT NULL AND cmd IN ('SELECT','ALL')
  AND qual LIKE '%app.tenant_id%';

-- ③ A（370）：无逃生口 + 任一会话级/表级宽松分支
WITH t AS (SELECT qual FROM pg_policies WHERE qual IS NOT NULL AND cmd IN ('SELECT','ALL')
             AND qual LIKE '%app.tenant_id%' AND qual NOT LIKE '%app.rls_system%')
SELECT count(*) FROM t WHERE qual LIKE '%current_setting(''app.tenant_id''::text, true) IS NULL%'
   OR qual LIKE '%current_setting(''app.tenant_id''::text, true) = ''''::text%'
   OR qual LIKE '%00000000-0000-0000-0000-000000000000%'
   OR qual LIKE '%tenant_id IS NULL%';

-- ④ 残余 13 = B(12) + C(1)：无逃生口且无任何会话级宽松分支
WITH t AS (SELECT schemaname, tablename, policyname, qual FROM pg_policies
             WHERE qual IS NOT NULL AND cmd IN ('SELECT','ALL')
               AND qual LIKE '%app.tenant_id%' AND qual NOT LIKE '%app.rls_system%')
SELECT * FROM t WHERE qual NOT LIKE '%current_setting(''app.tenant_id''::text, true) IS NULL%'
   AND qual NOT LIKE '%current_setting(''app.tenant_id''::text, true) = ''''::text%'
   AND qual NOT LIKE '%00000000-0000-0000-0000-000000000000%'
   AND qual NOT LIKE '%tenant_id IS NULL%';   -- 期望 13 行
```

**摘要里的缩写**（A/B 清单 `USING 摘要` 列）：`guc` = `current_setting('app.tenant_id'::text, true)`；`tid` = `tenant_id`；`tuid` = `tenant_uid`；`rls_system` = `COALESCE(current_setting('app.rls_system'::text, true),'off')`；`zero-uuid` = `00000000-0000-0000-0000-000000000000`；`super-uuid` = `…000000000001`。为压缩长度，摘要省略了 `::uuid` / `::text` 隐式转换与可安全省略的冗余括号，并截断至 ≤120 字符；**原文（含空白与全部类型转换）完整保存在 8 个 backup SQL 里**。

## 口径差异（脚注：字面口径 11 / 10，不作为正式数）

> 本节仅为 §7 与实测差异的解释性脚注。正式统计与后续批次判据见 §0「定案」：**370 / 12**。

总量与主体分流**实测与 §7 完全一致**：1030 / 962 / 68 / 579 / 370 五项分毫不差。差异只在「12 / 1」这条**口径内部边界**上：总量 383 一致，差异在于这 383 条怎么切。

- **实测**：`无逃生口` 共 383 条 = **373 条宽松** + **10 条严格**。
- **口径**：383 条 = 370 宽松 + 12「既有逃生口且放行」+ 1「未设即拒」。

两处偏差与原因：

1. **口径的 12 条「既有逃生口且放行」按字面定义在目录里命中 11 条，而不是 12 条**：这 11 条全部是 `*_global_read` 的 `SELECT` 策略（`ai.ai_models`、`ai.ai_prompt_templates`、`finance.core_finance_currencies`、`finance.core_finance_report_line_map`、`mobile.sync_policies`、`pm.project_type_configs`、`public.core_dict_items`、`public.core_dict_types`、`public.core_menu_groups`、`public.core_menus`、`public.core_roles`），谓词为 `rls_system='on' OR tenant_id IS NULL`。它们因为**已有逃生口**，按 §7 口径已被计入 579；若再单独计数会与 579 重复。实测「同时具备逃生口与放行分支」的独立策略数 = **11**，且这 11 条**都不在 382 内**。
2. **「未设即拒」实测 10 条，口径记 1 条**：10 条全部在 `erp`（8 条 `erp.group_tenant_of()` 集团级改写 + 2 条纯 `tenant_id = (NULLIF(guc,''))::uuid`）。它们既无逃生口也无任何宽松分支，属「安全但系统通道不可用」。

**本清单如何对齐到 382（透明切分，可随时重切）**：

- A 表级 370 = 373 条宽松中**去掉** 3 条「宽松只由 `tenant_uid` 列承载、无任何会话级绕过」的策略（`master_data.mdm_v60_lineage_nodes/edges/graphs`），这 3 条转入 B。
- B 列级 12 = 上述 3 条 `tenant_uid` 列级 + 9 条 erp 严格/函数级（8 条 `group_tenant_of` + `erp.erp_production_orders`）。
- C（口径的「1 条未设即拒」）= `erp.event_idempotency`：既无逃生口也不缺租户谓词，**按 §B-附 单列例外**，不并入分批清单，保持原样待单独决策。

也就是说：**B 的 12 条里有 9 条实际是「严格型」而非「放行型」**，它们被纳入 B 的理由是「谓词不落在表级 `tenant_id` 等值上，需按列级/函数级判据单独复核」。这是一处**判断切分**，不是目录天然分界；重切只需改 §0.1 的 SQL ④，行数据不变。

## A. 表级 370 条清单

覆盖：**无 `rls_system` 逃生口**，且存在会话级/表级宽松分支（`guc IS NULL`、`guc = ''`、零 UUID `zero-uuid`、`tenant_id IS NULL`）。按 `schema.表` 排序，`批次` 见 §C。

| 序号 | schema.表 | 策略名 | cmd | RLS | FORCE | USING 摘要（≤120） | 估算行数 | 批次 |
|---:|---|---|---|---|---|---|---:|---|
| 1 | `analytics.analytics_comparison_analyses` | `tenant_isolation_analytics_comparison_analyses` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 2 | `analytics.analytics_comparison_results` | `tenant_isolation_analytics_comparison_results` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 3 | `analytics.analytics_dashboard_shares` | `tenant_isolation_analytics_dashboard_shares` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 4 | `analytics.analytics_dashboard_templates` | `tenant_isolation_analytics_dashboard_templates` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 5 | `analytics.analytics_dashboards` | `tenant_isolation_analytics_dashboards` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 6 | `analytics.analytics_datasources` | `tenant_isolation_analytics_datasources` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 7 | `analytics.analytics_drilldown_history` | `tenant_isolation_analytics_drilldown_history` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 8 | `analytics.analytics_drilldown_paths` | `tenant_isolation_analytics_drilldown_paths` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 9 | `analytics.analytics_row_level_permissions` | `tenant_isolation_analytics_row_level_permissions` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 10 | `analytics.analytics_self_service_reports` | `tenant_isolation_analytics_self_service_reports` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 11 | `analytics.analytics_widgets` | `tenant_isolation_analytics_widgets` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 12 | `bi.analytics_dashboards` | `tenant_isolation_analytics_dashboards` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 13 | `bi.analytics_datasets` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch02 |
| 14 | `bi.analytics_datasets` | `tenant_isolation_analytics_datasets` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 15 | `bi.analytics_datasources` | `tenant_isolation_analytics_datasources` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 16 | `bi.analytics_widgets` | `tenant_isolation_analytics_widgets` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 17 | `bi.report_schedules` | `rls_tenant_isolation` | ALL | on | on | `(COALESCE(guc, '') = 'zero-uuid' OR guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch02 |
| 18 | `bi.report_templates` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, '') OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch02 |
| 19 | `bi.report_templates` | `tenant_isolation_report_templates` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch02 |
| 20 | `bi.reports` | `rls_tenant_isolation` | ALL | on | on | `(COALESCE(guc, '') = 'zero-uuid' OR guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 1 | batch02 |
| 21 | `communication.core_email_templates` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch01 |
| 22 | `communication.core_notification_deliveries` | `notification_deliveries_tenant_isolation` | ALL | on | on | `(tid = NULLIF(guc, '') OR guc = '')` | 未统计 | batch01 |
| 23 | `communication.core_notification_preferences` | `notification_preferences_tenant_isolation` | ALL | on | on | `(tid = NULLIF(guc, '') OR guc = '')` | 未统计 | batch01 |
| 24 | `communication.core_notification_subscriptions` | `notification_subscriptions_tenant_isolation` | ALL | on | on | `(tid = NULLIF(guc, '') OR guc = '')` | 未统计 | batch01 |
| 25 | `communication.notification_channels` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch01 |
| 26 | `communication.notification_channels` | `tenant_isolation_notification_channels` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch01 |
| 27 | `core.ai_conversations` | `ai_conversations_tenant_isolation` | ALL | on | on | `(tid = NULLIF(guc, '') OR NULLIF(guc, '') = zero-uuid)` | 18 | batch02 |
| 28 | `core.ai_conversations` | `tenant_isolation_ai_conversations` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 18 | batch02 |
| 29 | `core.ai_faqs` | `tenant_isolation_core_ai_faqs` | ALL | on | on | `(COALESCE(guc, '') = 'zero-uuid' OR guc IS NULL OR guc = '' OR tid = zero-uuid OR tid = NULLIF(guc, ''))` | 15 | batch02 |
| 30 | `core.knowledge_bases` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch02 |
| 31 | `core.knowledge_chunks` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch02 |
| 32 | `core.knowledge_documents` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch02 |
| 33 | `core.knowledge_qa_history` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch02 |
| 34 | `core.user_preferences` | `tenant_isolation_user_preferences` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 35 | `crm.contacts` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 36 | `crm.contacts` | `tenant_isolation_contacts` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch03 |
| 37 | `crm.contracts` | `tenant_isolation_contracts` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch03 |
| 38 | `crm.customer_finance` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, '') OR NULLIF(guc, '') = 'zero-uuid')` | 1 | batch03 |
| 39 | `crm.customer_finance` | `tenant_isolation_customer_finance` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 1 | batch03 |
| 40 | `crm.customer_orders` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 41 | `crm.customer_recommendations` | `tenant_isolation_customer_recommendations` | ALL | on | on | `(tid = COALESCE(NULLIF(guc, ''), zero-uuid))` | 未统计 | batch03 |
| 42 | `crm.customer_scores` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 43 | `crm.customer_segments` | `tenant_isolation_customer_segments` | ALL | on | on | `(tid = COALESCE(NULLIF(guc, ''), zero-uuid))` | 未统计 | batch03 |
| 44 | `crm.customer_tags` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 45 | `crm.customer_tags` | `tenant_isolation_customer_tags` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch03 |
| 46 | `crm.interactions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 47 | `crm.interactions` | `tenant_isolation_interactions` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch03 |
| 48 | `crm.opportunities` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 49 | `crm.opportunities` | `tenant_isolation_opportunities` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch03 |
| 50 | `crm.return_items` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 51 | `crm.sales_forecasts` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 52 | `crm.sales_orders` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 53 | `crm.tags` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 54 | `crm.tags` | `tenant_isolation_tags` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch03 |
| 55 | `erp.announcements` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch08 |
| 56 | `erp.announcements` | `tenant_isolation_announcements` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch08 |
| 57 | `erp.assets` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch08 |
| 58 | `erp.assets` | `tenant_isolation_assets` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch08 |
| 59 | `erp.bank_accounts` | `tenant_isolation_bank_accounts` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch08 |
| 60 | `erp.documents` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch08 |
| 61 | `erp.fin_reconciliations` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch08 |
| 62 | `erp.fin_reconciliations` | `tenant_isolation_fin_reconciliations` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch08 |
| 63 | `erp.inventory` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch08 |
| 64 | `erp.inventory` | `tenant_isolation_inventory` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch08 |
| 65 | `erp.inventory_items` | `tenant_isolation_inventory_items` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch08 |
| 66 | `erp.materials` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch08 |
| 67 | `erp.materials` | `tenant_isolation_materials` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch08 |
| 68 | `erp.purchase_orders` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch08 |
| 69 | `erp.purchase_orders` | `tenant_isolation_purchase_orders` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch08 |
| 70 | `erp.voucher_items` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch08 |
| 71 | `erp.voucher_items` | `tenant_isolation_voucher_items` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch08 |
| 72 | `erp.vouchers` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch08 |
| 73 | `hrm.attendance_records` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 74 | `hrm.attendance_records` | `tenant_isolation_attendance_records` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 75 | `hrm.candidates` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 76 | `hrm.candidates` | `tenant_isolation_candidates` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 77 | `hrm.companies` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 1 | batch05 |
| 78 | `hrm.companies` | `tenant_isolation_companies` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 1 | batch05 |
| 79 | `hrm.contract_renewals` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 80 | `hrm.contract_renewals` | `tenant_isolation_contract_renewals` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 81 | `hrm.contracts` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 82 | `hrm.contracts` | `tenant_isolation_contracts` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 83 | `hrm.departments` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 1 | batch05 |
| 84 | `hrm.departments` | `tenant_isolation_departments` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 1 | batch05 |
| 85 | `hrm.employees` | `rls_tenant_isolation` | ALL | on | on | `(COALESCE(guc, '') = 'zero-uuid' OR guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 86 | `hrm.employees` | `tenant_isolation_employees` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 87 | `hrm.hrm_cache_invalidation_logs` | `tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 88 | `hrm.hrm_master_data_refs` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 89 | `hrm.initialization_status` | `tenant_isolation_initialization_status` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch05 |
| 90 | `hrm.interviews` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 91 | `hrm.interviews` | `tenant_isolation_interviews` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 92 | `hrm.job_openings` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 93 | `hrm.job_openings` | `tenant_isolation_job_openings` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 94 | `hrm.leave_records` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 95 | `hrm.leave_records` | `tenant_isolation_leave_records` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 96 | `hrm.module_settings` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, '') OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch05 |
| 97 | `hrm.payroll_details` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 98 | `hrm.payroll_details` | `tenant_isolation_payroll_details` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 99 | `hrm.payroll_items` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 100 | `hrm.payroll_items` | `tenant_isolation_payroll_items` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 101 | `hrm.payroll_records` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 102 | `hrm.payroll_records` | `tenant_isolation_payroll_records` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 103 | `hrm.payroll_runs` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 104 | `hrm.payroll_runs` | `tenant_isolation_payroll_runs` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 105 | `hrm.performance_goals` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 106 | `hrm.performance_goals` | `tenant_isolation_performance_goals` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 107 | `hrm.performance_records` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 108 | `hrm.performance_records` | `tenant_isolation_performance_records` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 109 | `hrm.performance_reviews` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 110 | `hrm.performance_reviews` | `tenant_isolation_performance_reviews` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 111 | `hrm.positions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 112 | `hrm.positions` | `tenant_isolation_positions` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 113 | `hrm.recruitment_applications` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 114 | `hrm.recruitment_applications` | `tenant_isolation_recruitment_applications` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 115 | `hrm.recruitment_records` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 116 | `hrm.recruitment_records` | `tenant_isolation_recruitment_records` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 117 | `hrm.salary_adjustments` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 118 | `hrm.salary_adjustments` | `tenant_isolation_salary_adjustments` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 119 | `hrm.training_courses` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 120 | `hrm.training_courses` | `tenant_isolation_training_courses` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 121 | `hrm.training_participants` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 122 | `hrm.training_participants` | `tenant_isolation_training_participants` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 123 | `hrm.training_plans` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 124 | `hrm.training_plans` | `tenant_isolation_training_plans` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 125 | `hrm.training_records` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch05 |
| 126 | `hrm.training_records` | `tenant_isolation_training_records` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch05 |
| 127 | `iam.crm_dashboard_snapshots` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 128 | `iam.data_permissions` | `tenant_isolation_data_permissions` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch03 |
| 129 | `iam.ehs_dashboard_snapshots` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 130 | `iam.hrm_dashboard_snapshots` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 131 | `iam.lims_dashboard_snapshots` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 132 | `iam.pdm_dashboard_snapshots` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 133 | `iam.permission_audit_logs` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 134 | `iam.permission_audit_logs` | `tenant_isolation_permission_audit_logs` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch03 |
| 135 | `iam.permission_templates` | `tenant_isolation_permission_templates` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch03 |
| 136 | `iam.position_permissions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 137 | `iam.position_permissions` | `tenant_isolation_position_permissions` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch03 |
| 138 | `iam.position_roles` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 139 | `iam.position_roles` | `tenant_isolation_position_roles` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch03 |
| 140 | `iam.positions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 141 | `iam.positions` | `tenant_isolation_positions` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch03 |
| 142 | `iam.resource_permissions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 143 | `iam.resource_permissions` | `tenant_isolation_resource_permissions` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch03 |
| 144 | `iam.tenant_users` | `tenant_isolation_tenant_users` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch03 |
| 145 | `iam.user_positions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 146 | `iam.user_positions` | `tenant_isolation_user_positions` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch03 |
| 147 | `iam.wms_dashboard_snapshots` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch03 |
| 148 | `master_data.materials` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 149 | `master_data.materials` | `tenant_isolation_materials` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 150 | `master_data.mdm_ai_models` | `tenant_isolation_mdm_ai_models` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch07 |
| 151 | `master_data.mdm_ai_models` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid IS NULL OR tid = zero-uuid OR tid = super-uuid OR tid = NULLIF(guc, '')))` | 未统计 | batch07 |
| 152 | `master_data.mdm_ai_suggestions` | `tenant_isolation_mdm_ai_suggestions` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch07 |
| 153 | `master_data.mdm_ai_suggestions` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid IS NULL OR tid = zero-uuid OR tid = super-uuid OR tid = NULLIF(guc, '')))` | 未统计 | batch07 |
| 154 | `master_data.mdm_api_exposures` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 155 | `master_data.mdm_api_products` | `mdm_api_products_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 156 | `master_data.mdm_assets` | `mdm_assets_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 157 | `master_data.mdm_audit_events` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 158 | `master_data.mdm_audit_export_logs` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 7 | batch07 |
| 159 | `master_data.mdm_auto_fix_actions` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 160 | `master_data.mdm_bc_tests` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 161 | `master_data.mdm_billing_records` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 162 | `master_data.mdm_change_events` | `mdm_change_events_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 163 | `master_data.mdm_classification_models` | `tenant_isolation_mdm_classification_models` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch07 |
| 164 | `master_data.mdm_classification_models` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid IS NULL OR tid = zero-uuid OR tid = super-uuid OR tid = NULLIF(guc, '')))` | 未统计 | batch07 |
| 165 | `master_data.mdm_classification_results` | `tenant_isolation_mdm_classification_results` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 4 | batch07 |
| 166 | `master_data.mdm_classification_results` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid IS NULL OR tid = zero-uuid OR tid = super-uuid OR tid = NULLIF(guc, '')))` | 4 | batch07 |
| 167 | `master_data.mdm_classifier_rules` | `tenant_isolation_mdm_classifier_rules` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch07 |
| 168 | `master_data.mdm_classifier_rules` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid IS NULL OR tid = zero-uuid OR tid = super-uuid OR tid = NULLIF(guc, '')))` | 未统计 | batch07 |
| 169 | `master_data.mdm_continuity_plans` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 170 | `master_data.mdm_critical_functions` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 171 | `master_data.mdm_data_asset_categories` | `mdm_data_asset_categories_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 172 | `master_data.mdm_data_contracts` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 173 | `master_data.mdm_data_permissions` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 174 | `master_data.mdm_data_products` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 2 | batch07 |
| 175 | `master_data.mdm_dimension_scores` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 176 | `master_data.mdm_failover_records` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 177 | `master_data.mdm_fix_strategies` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 178 | `master_data.mdm_governance_insights` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 179 | `master_data.mdm_governance_suggestions` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 180 | `master_data.mdm_graph_communities` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 181 | `master_data.mdm_graph_edges` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 182 | `master_data.mdm_graph_nodes` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 183 | `master_data.mdm_impact_analyses` | `mdm_impact_analyses_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 184 | `master_data.mdm_impact_simulations` | `mdm_impact_simulations_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 185 | `master_data.mdm_improvement_plans` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 186 | `master_data.mdm_interactions` | `mdm_interactions_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 187 | `master_data.mdm_kg_edges` | `mdm_kg_edges_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 188 | `master_data.mdm_kg_graphs` | `mdm_kg_graphs_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 189 | `master_data.mdm_kg_nodes` | `mdm_kg_nodes_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 190 | `master_data.mdm_lifecycle_history` | `tenant_isolation_policy` | ALL | on | on | `(tuid IS NULL OR tuid = '' OR tuid = super-uuid OR tuid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 191 | `master_data.mdm_lifecycle_policies` | `tenant_isolation_policy` | ALL | on | on | `(tuid IS NULL OR tuid = '' OR tuid = super-uuid OR tuid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 192 | `master_data.mdm_lifecycle_stages` | `tenant_isolation_policy` | ALL | on | on | `(tuid IS NULL OR tuid = '' OR tuid = super-uuid OR tuid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 193 | `master_data.mdm_lineage_edges` | `mdm_lineage_edges_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 194 | `master_data.mdm_lineage_graphs` | `mdm_lineage_graphs_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 1 | batch07 |
| 195 | `master_data.mdm_lineage_nodes` | `mdm_lineage_nodes_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 196 | `master_data.mdm_match_results` | `tenant_isolation_mdm_match_results` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch07 |
| 197 | `master_data.mdm_match_results` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid IS NULL OR tid = zero-uuid OR tid = super-uuid OR tid = NULLIF(guc, '')))` | 未统计 | batch07 |
| 198 | `master_data.mdm_match_rules` | `tenant_isolation_mdm_match_rules` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch07 |
| 199 | `master_data.mdm_match_rules` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid IS NULL OR tid = zero-uuid OR tid = super-uuid OR tid = NULLIF(guc, '')))` | 未统计 | batch07 |
| 200 | `master_data.mdm_maturity_assessments` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 201 | `master_data.mdm_maturity_history` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 202 | `master_data.mdm_metadata_attributes` | `tenant_isolation_policy` | ALL | on | on | `(tuid IS NULL OR tuid = '' OR tuid = super-uuid OR tuid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 203 | `master_data.mdm_metadata_objects` | `mdm_metadata_objects_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 2 | batch07 |
| 204 | `master_data.mdm_metadata_tags` | `tenant_isolation_policy` | ALL | on | on | `(tuid IS NULL OR tuid = '' OR tuid = super-uuid OR tuid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 205 | `master_data.mdm_permission_roles` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 206 | `master_data.mdm_propagation_logs` | `mdm_propagation_logs_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 207 | `master_data.mdm_propagation_rules` | `mdm_propagation_rules_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 208 | `master_data.mdm_quality_checks` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 209 | `master_data.mdm_quality_loop_configs` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 210 | `master_data.mdm_rate_cards` | `tenant_isolation_policy` | ALL | on | on | `(tuid IS NULL OR tuid = '' OR tuid = super-uuid OR tuid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 211 | `master_data.mdm_recommendations` | `mdm_recommendations_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 212 | `master_data.mdm_recovery_plans` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 213 | `master_data.mdm_recovery_points` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 214 | `master_data.mdm_region_configs` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 215 | `master_data.mdm_replication_configs` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 216 | `master_data.mdm_search_history` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 217 | `master_data.mdm_search_indexes` | `mdm_search_indexes_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 218 | `master_data.mdm_semantic_search_indexes` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 219 | `master_data.mdm_sla_configs` | `tenant_isolation_policy` | ALL | on | on | `(tuid IS NULL OR tuid = '' OR tuid = super-uuid OR tuid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 220 | `master_data.mdm_sla_incidents` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 221 | `master_data.mdm_sla_measurements` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 222 | `master_data.mdm_subscriptions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 223 | `master_data.mdm_supplier_categories` | `tenant_isolation_mdm_supplier_categories` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 224 | `master_data.mdm_suppliers` | `tenant_isolation_mdm_suppliers` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 225 | `master_data.mdm_sync_dead_letter` | `tenant_isolation_mdm_sync_dead_letter` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 226 | `master_data.mdm_tag_rules` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 227 | `master_data.mdm_tagged_entities` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 228 | `master_data.mdm_tags` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 229 | `master_data.mdm_usage_records` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 230 | `master_data.mdm_user_role_assignments` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 231 | `master_data.mdm_version_branches` | `tenant_isolation_policy` | ALL | on | on | `(tid IS NULL OR tid = '' OR tid = super-uuid OR tid = guc OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch07 |
| 232 | `master_data.mdm_version_snapshots` | `mdm_version_snapshots_tenant_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 233 | `master_data.mdm_workflow_history` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 234 | `master_data.mdm_workflow_templates` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 235 | `master_data.mdm_workflows` | `tenant_isolation_policy` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 236 | `master_data.samples` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 237 | `master_data.samples` | `tenant_isolation_samples` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 238 | `master_data.uoms` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 239 | `master_data.uoms` | `tenant_isolation_uoms` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch07 |
| 240 | `plugin_finance.accounting_subjects` | `tenant_isolation_accounting_subjects` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch01 |
| 241 | `plugin_finance.difference_adjustments` | `tenant_isolation_difference_adjustments` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch01 |
| 242 | `plugin_finance.reconciliation_item_snapshots` | `tenant_isolation_reconciliation_item_snapshots` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch01 |
| 243 | `plugin_finance.reconciliation_settlement_links` | `tenant_isolation_reconciliation_settlement_links` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch01 |
| 244 | `plugin_finance.reconciliation_snapshots` | `tenant_isolation_reconciliation_snapshots` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch01 |
| 245 | `plugin_finance.settlement_snapshots` | `tenant_isolation_settlement_snapshots` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch01 |
| 246 | `plugin_mes.audit_logs` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch01 |
| 247 | `portal.portal_dashboard_stats` | `tenant_isolation_portal_dashboard_stats` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch01 |
| 248 | `portal.portal_notifications` | `tenant_isolation_portal_notifications` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch01 |
| 249 | `public._archive_core_workflow_instances` | `tenant_isolation_core_workflow_instances` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch06 |
| 250 | `public._archive_core_workflow_versions` | `rls_tenant_isolation` | ALL | on | on | `(COALESCE(guc, '') = 'zero-uuid' OR guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 251 | `public._archive_core_workflow_versions` | `tenant_isolation_core_workflow_versions` | ALL | on | on | `(COALESCE(guc, '') = 'zero-uuid' OR guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 252 | `public.approval_records` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 253 | `public.approvals` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 254 | `public.automation_rules` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 255 | `public.automation_runs` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 256 | `public.automation_variables` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 257 | `public.core_doc_documents` | `tenant_isolation_core_doc_documents` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 258 | `public.core_doc_folders` | `tenant_isolation_core_doc_folders` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 259 | `public.core_doc_templates` | `tenant_isolation_core_doc_templates` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 260 | `public.core_email_queue` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 261 | `public.core_emails` | `tenant_isolation_core_emails` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch06 |
| 262 | `public.core_faqs` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 12 | batch06 |
| 263 | `public.core_file_folders` | `tenant_isolation_core_file_folders` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 264 | `public.core_files` | `tenant_isolation_core_files` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch06 |
| 265 | `public.core_finance_accounts` | `tenant_isolation_core_finance_accounts` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 266 | `public.core_finance_vouchers` | `tenant_isolation_core_finance_vouchers` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 267 | `public.core_flow_categories` | `tenant_isolation_core_flow_categories` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 268 | `public.core_guide_lessons` | `tenant_isolation_core_guide_lessons` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 269 | `public.core_guide_progress` | `tenant_isolation_core_guide_progress` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 270 | `public.core_guides` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 12 | batch06 |
| 271 | `public.core_inter_module_sync` | `tenant_isolation_core_inter_module_sync` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 272 | `public.core_master_data_change_log` | `tenant_isolation_core_master_data_change_log` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 273 | `public.core_master_data_refs` | `tenant_isolation_core_master_data_refs` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 274 | `public.core_mdm_approvals` | `tenant_isolation_core_mdm_approvals` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 275 | `public.core_mdm_reconciliation_log` | `tenant_isolation_core_mdm_reconciliation_log` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 276 | `public.core_migration_history` | `tenant_isolation_core_migration_history` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch06 |
| 277 | `public.core_notification_templates` | `tenant_isolation_core_notification_templates` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch06 |
| 278 | `public.core_notifications` | `tenant_isolation_core_notifications` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch06 |
| 279 | `public.core_tenant_modules` | `tenant_isolation_core_tenant_modules` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 280 | `public.core_tenant_usage` | `tenant_isolation_core_tenant_usage` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 281 | `public.core_workflow_instances` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 282 | `public.core_workflow_tasks` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 283 | `public.core_workflow_versions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 284 | `public.core_workflows` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 285 | `public.cqrs_events` | `tenant_isolation_cqrs_events` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 286 | `public.crm_dashboard_snapshots` | `tenant_isolation_crm_dashboard_snapshots` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch06 |
| 287 | `public.ehs_dashboard_snapshots` | `tenant_isolation_ehs_dashboard_snapshots` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch06 |
| 288 | `public.finance_voucher_templates` | `tenant_isolation_finance_voucher_templates` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 289 | `public.financial_reports` | `tenant_isolation_financial_reports` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 290 | `public.hrm_dashboard_snapshots` | `tenant_isolation_hrm_dashboard_snapshots` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch06 |
| 291 | `public.lims_dashboard_snapshots` | `tenant_isolation_lims_dashboard_snapshots` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch06 |
| 292 | `public.monitor_settings` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 293 | `public.pdm_change_notices` | `tenant_isolation_pdm_change_notices` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 294 | `public.pdm_dashboard_snapshots` | `tenant_isolation_pdm_dashboard_snapshots` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch06 |
| 295 | `public.pdm_materials` | `tenant_isolation_pdm_materials` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 296 | `public.pdm_products` | `tenant_isolation_pdm_products` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 297 | `public.permission_audit_logs` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 298 | `public.search_entity_projections` | `tenant_isolation_search_entity_projections` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch06 |
| 299 | `public.system_settings` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 300 | `public.tenant_permissions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch06 |
| 301 | `public.tenant_permissions` | `tenant_isolation_tenant_permissions` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL)` | 未统计 | batch06 |
| 302 | `public.wms_dashboard_snapshots` | `tenant_isolation_wms_dashboard_snapshots` | ALL | on | on | `(tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch06 |
| 303 | `qms.qa_alert_messages` | `tenant_isolation_qa_alert_messages` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch04 |
| 304 | `qms.qa_alert_rules` | `tenant_isolation_qa_alert_rules` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch04 |
| 305 | `qms.qa_approval_events` | `tenant_isolation_qa_approval_events` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch04 |
| 306 | `qms.qa_apqp_phases` | `tenant_isolation_qa_apqp_phases` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch04 |
| 307 | `qms.qa_apqp_projects` | `tenant_isolation_qa_apqp_projects` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch04 |
| 308 | `qms.qa_apqp_risks` | `tenant_isolation_qa_apqp_risks` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch04 |
| 309 | `qms.qa_apqp_tasks` | `tenant_isolation_qa_apqp_tasks` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch04 |
| 310 | `qms.qa_audit_findings` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 311 | `qms.qa_audit_findings` | `tenant_isolation_qa_audit_findings` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 312 | `qms.qa_audit_plans` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 313 | `qms.qa_audit_plans` | `tenant_isolation_qa_audit_plans` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 314 | `qms.qa_audit_tasks` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 315 | `qms.qa_audit_tasks` | `tenant_isolation_qa_audit_tasks` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 316 | `qms.qa_corrective_action_items` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 317 | `qms.qa_corrective_action_items` | `tenant_isolation_qa_corrective_action_items` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 318 | `qms.qa_corrective_actions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 319 | `qms.qa_corrective_actions` | `tenant_isolation_qa_corrective_actions` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 320 | `qms.qa_ehs_hazards` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, '') OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch04 |
| 321 | `qms.qa_eightd_audit_logs` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 0 | batch04 |
| 322 | `qms.qa_eightd_audit_logs` | `tenant_isolation_qa_eightd_audit_logs` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 0 | batch04 |
| 323 | `qms.qa_eightd_reports` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 1 | batch04 |
| 324 | `qms.qa_eightd_reports` | `tenant_isolation_qa_eightd_reports` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 1 | batch04 |
| 325 | `qms.qa_fmea_analyses` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 326 | `qms.qa_fmea_analyses` | `tenant_isolation_qa_fmea_analyses` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 327 | `qms.qa_fmea_items` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 328 | `qms.qa_fmea_items` | `tenant_isolation_qa_fmea_items` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 329 | `qms.qa_inspection_audits` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 330 | `qms.qa_inspection_audits` | `tenant_isolation_qa_inspection_audits` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 331 | `qms.qa_inspection_results` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 332 | `qms.qa_inspection_results` | `tenant_isolation_qa_inspection_results` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 333 | `qms.qa_qms_sync_records` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 334 | `qms.qa_qms_sync_records` | `tenant_isolation_qa_qms_sync_records` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 335 | `qms.qa_quality_costs` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 336 | `qms.qa_quality_costs` | `tenant_isolation_qa_quality_costs` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 337 | `qms.qa_quality_inspections` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 338 | `qms.qa_quality_inspections` | `tenant_isolation_qa_quality_inspections` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 339 | `qms.qa_quality_issues` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 340 | `qms.qa_quality_issues` | `tenant_isolation_qa_quality_issues` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 341 | `qms.qa_spc_charts` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 342 | `qms.qa_spc_charts` | `tenant_isolation_qa_spc_charts` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 343 | `qms.qa_spc_data_points` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 344 | `qms.qa_spc_data_points` | `tenant_isolation_qa_spc_data_points` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 345 | `qms.qa_standard_revisions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 346 | `qms.qa_standard_revisions` | `tenant_isolation_qa_standard_revisions` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 347 | `qms.qa_standards` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch04 |
| 348 | `qms.qa_standards` | `tenant_isolation_qa_standards` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch04 |
| 349 | `rs.audit_logs` | `rls_tenant_isolation` | ALL | on | on | `(COALESCE(guc, '') = 'zero-uuid' OR guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch02 |
| 350 | `rs.change_orders` | `tenant_isolation_change_orders` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 351 | `rs.change_requests` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch02 |
| 352 | `rs.change_requests` | `tenant_isolation_change_requests` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL))` | 未统计 | batch02 |
| 353 | `rs.experiments` | `rls_tenant_isolation` | ALL | on | on | `(COALESCE(guc, '') = 'zero-uuid' OR guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch02 |
| 354 | `rs.formula_versions` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch02 |
| 355 | `rs.formulas` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch02 |
| 356 | `rs.material_tests` | `tenant_isolation_material_tests` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 357 | `rs.module_settings` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR tid IS NULL OR tid = NULLIF(guc, '') OR NULLIF(guc, '') = 'zero-uuid')` | 未统计 | batch02 |
| 358 | `rs.project_members` | `tenant_isolation_project_members` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 359 | `rs.project_milestones` | `tenant_isolation_project_milestones` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 360 | `rs.project_phases` | `tenant_isolation_project_phases` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 361 | `rs.projects` | `tenant_isolation_projects` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 362 | `rs.rs_experiments` | `tenant_isolation_rs_experiments` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 363 | `rs.rs_formulas` | `tenant_isolation_rs_formulas` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 364 | `rs.rs_projects` | `tenant_isolation_rs_projects` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch02 |
| 365 | `ticket.ticket_attachments` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch01 |
| 366 | `tms.carriers` | `tenant_isolation_carriers` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch01 |
| 367 | `tms.drivers` | `tenant_isolation_drivers` | ALL | on | on | `(guc IS NULL OR guc = '' OR (tid = NULLIF(guc, '') OR tid IS NULL OR NULLIF(guc, '') = 'zero-uuid'))` | 未统计 | batch01 |
| 368 | `tms.tms_routes` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch01 |
| 369 | `tms.tms_shipments` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch01 |
| 370 | `unified_core.inter_module_sync` | `rls_tenant_isolation` | ALL | on | on | `(guc IS NULL OR guc = '' OR guc = 'zero-uuid' OR tid IS NULL OR tid = NULLIF(guc, ''))` | 未统计 | batch01 |

小计：**370 条 / 290 张表**，其中 80 张表在本清单内出现 2 次（同表双策略必须同批处理）。本清单另含 7 条 `tenant_uid` 列策略——它们除列级放宽外还有会话级「零 UUID 全局会话」绕过，故按「有会话级绕过」计入 A，纯列级放宽的 3 条见 §B。

## B. 列级 12 条清单

覆盖：**无 `rls_system` 逃生口**，且租户判定**不落在表级 `tenant_id` 等值**上。分三类：

| 类型 | 条数 | 涉及的列 / 表达式 | 判据要点 |
|---|---:|---|---|
| `tenant_uid` 列判定 | 3 | `tenant_uid`（非 `tenant_id`） | 谓词为 `tenant_uid IS NULL OR tenant_uid::text = '' OR tenant_uid = super-uuid OR tenant_uid::text = guc`：**空值即放行**，且带超级租户哨兵 |
| 集团级函数改写 | 8 | `erp.group_tenant_of(tenant_id)` | 租户被映射到集团，**有意跨租户共享**（合并报表/内部交易/抵消）；严格型，缺逃生口 |
| 严格判等（业务表） | 1 | `tenant_id` | `erp.erp_production_orders`：纯严格，缺逃生口 → 系统通道不可用 |

| 序号 | schema.表 | 策略名 | cmd | RLS | FORCE | USING 摘要（≤120） | WITH CHECK | 列级判据 / 涉及列 | 估算行数 | 批次 |
|---:|---|---|---|---|---|---|---|---|---:|---|
| 1 | `erp.company_relations` | `tenant_isolation_company_relations` | ALL | on | on | `(tid = erp.group_tenant_of(NULLIF(guc, '')))` | 有（与 USING 同形） | `erp.group_tenant_of(tenant)` 函数改写（集团级跨租户） | 未统计 | batch08 |
| 2 | `erp.consolidation_report_lines` | `tenant_isolation_consolidation_report_lines` | ALL | on | on | `(tid = erp.group_tenant_of(NULLIF(guc, '')))` | 有（与 USING 同形） | `erp.group_tenant_of(tenant)` 函数改写（集团级跨租户） | 未统计 | batch08 |
| 3 | `erp.consolidation_reports` | `tenant_isolation_consolidation_reports` | ALL | on | on | `(tid = erp.group_tenant_of(NULLIF(guc, '')))` | 有（与 USING 同形） | `erp.group_tenant_of(tenant)` 函数改写（集团级跨租户） | 未统计 | batch08 |
| 4 | `erp.consolidation_scope_companies` | `tenant_isolation_consolidation_scope_companies` | ALL | on | on | `(tid = erp.group_tenant_of(NULLIF(guc, '')))` | 有（与 USING 同形） | `erp.group_tenant_of(tenant)` 函数改写（集团级跨租户） | 未统计 | batch08 |
| 5 | `erp.consolidation_scopes` | `tenant_isolation_consolidation_scopes` | ALL | on | on | `(tid = erp.group_tenant_of(NULLIF(guc, '')))` | 有（与 USING 同形） | `erp.group_tenant_of(tenant)` 函数改写（集团级跨租户） | 未统计 | batch08 |
| 6 | `erp.elimination_candidates` | `tenant_isolation_elimination_candidates` | ALL | on | on | `(tid = erp.group_tenant_of(NULLIF(guc, '')))` | 有（与 USING 同形） | `erp.group_tenant_of(tenant)` 函数改写（集团级跨租户） | 未统计 | batch08 |
| 7 | `erp.elimination_rules` | `tenant_isolation_elimination_rules` | ALL | on | on | `(tid = erp.group_tenant_of(NULLIF(guc, '')))` | 有（与 USING 同形） | `erp.group_tenant_of(tenant)` 函数改写（集团级跨租户） | 未统计 | batch08 |
| 8 | `erp.erp_production_orders` | `tenant_isolation` | ALL | on | on | `tid = NULLIF(guc, '')` | 有（与 USING 同形） | 列 `tenant_id` 严格判等（缺 `rls_system` 逃生口 → 系统通道不可用） | 未统计 | batch08 |
| 9 | `erp.internal_transactions` | `tenant_isolation_internal_transactions` | ALL | on | on | `(tid = erp.group_tenant_of(NULLIF(guc, '')))` | 有（与 USING 同形） | `erp.group_tenant_of(tenant)` 函数改写（集团级跨租户） | 未统计 | batch08 |
| 10 | `master_data.mdm_v60_lineage_edges` | `tenant_isolation_policy` | ALL | on | on | `(tuid IS NULL OR tuid = '' OR tuid = super-uuid OR tuid = NULLIF(guc, ''))` | 有（与 USING 同形） | 列 `tenant_uid`（非 `tenant_id`）+ 空值/空串/超级租户 `…0001` 放行 | 未统计 | batch07 |
| 11 | `master_data.mdm_v60_lineage_graphs` | `tenant_isolation_policy` | ALL | on | on | `(tuid IS NULL OR tuid = '' OR tuid = super-uuid OR tuid = NULLIF(guc, ''))` | 有（与 USING 同形） | 列 `tenant_uid`（非 `tenant_id`）+ 空值/空串/超级租户 `…0001` 放行 | 未统计 | batch07 |
| 12 | `master_data.mdm_v60_lineage_nodes` | `tenant_isolation_policy` | ALL | on | on | `(tuid IS NULL OR tuid = '' OR tuid = super-uuid OR tuid = NULLIF(guc, ''))` | 有（与 USING 同形） | 列 `tenant_uid`（非 `tenant_id`）+ 空值/空串/超级租户 `…0001` 放行 | 未统计 | batch07 |

小计：**12 条 / 12 张表**（每条策略一张表）。

### B-附. 例外单列：`erp.event_idempotency`（不并入 382 分批清单）

- 策略：`erp.event_idempotency`（`cmd=ALL`，`relrowsecurity` / `relforcerowsecurity` 均 on），谓词为列 `tenant_id` 严格判等（`tid = NULLIF(guc, '')`）。
- 判定：**既不是逃生口，也不是缺租户谓词**——没有 `rls_system` 宽松分支（不进 A），谓词又确实落在表级 `tenant_id` 等值（不进 B），所以 §7 口径把它记为「未设即拒 1 条」。
- 用途：事件消费幂等去重表（基础设施表，一行一个已处理事件键），不是租户业务数据；缺租户时严格拒最符合其语义（避免跨租户读到/覆盖幂等键）。
- 处理：**单列为例外，不并入 382 条的分批清单（含 batch08）**。它的改造方向与其余表相反（后台系统通道要能写，只能补 `app.rls_system` 逃生口），需单独决策、单独备份与单独回滚脚本；本轮只读盘点不启动。
- 注意：现有 `rls-policy-backup-batch01..08.sql` **不含该表**，将来若处理须先单独补一份现状快照。

## C. 分批方案（batch01 – batch08）

分 8 批，**按服务（schema 前缀）切**，量级故意不均：批 01 用最小批跑通模板，批 07 靠模板统一而放大到 95 条，批 08 用最小但语义最难的批收尾。原则：

1. **同表多策略必须同批**（permissive = OR，漏改一条等于没改）→ 按 schema 切天然满足。
2. **按风险升序**：只读派生 → 单服务业务 → 共享核心 → 语义特殊（集团）。
3. **每批独立可回滚**：批间无共享事务，回滚只影响本批 schema。

| 批次 | 主题 | schema | 策略条数 | 表数 | 占 382 |
|---|---|---|---:|---:|---:|
| batch01 | 边缘服务冒烟批 | `portal`、`ticket`、`tms`、`unified_core`、`plugin_mes`、`plugin_finance`、`communication` | **21** | 20 | 5.5% |
| batch02 | 分析与只读派生层 | `analytics`、`bi`、`rs`、`core` | **44** | 40 | 11.5% |
| batch03 | 身份与客户 | `iam`、`crm` | **41** | 29 | 10.7% |
| batch04 | 质量管理 | `qms` | **46** | 27 | 12.0% |
| batch05 | 人力 | `hrm` | **54** | 29 | 14.1% |
| batch06 | 共享核心 public | `public` | **54** | 52 | 14.1% |
| batch07 | 主数据（含列级 `tenant_uid` 3 条） | `master_data` | **95** | 85 | 24.9% |
| batch08 | ERP（含集团级函数改写） | `erp` | **27** | 20 | 7.1% |
| **合计** | | **18 个 schema** | **382** | **302** | 100% |

### batch01 · 边缘服务冒烟批（21 条 / 20 表 / `communication`、`plugin_finance`、`plugin_mes`、`portal`、`ticket`、`tms`、`unified_core`）

**为什么这样分批**

- 体量最小（21 条 / 20 表，占 382 的 5.5%），且都**不在主交易链路**：门户聚合、待办、工单流转、运输、插件侧；单批失败只影响单服务。
- 一次覆盖 3 种谓词形态：`tenant_id IS NULL + 空串 + 零 UUID` 全宽松（communication 6 条）、仅空串放行（`core_notification_*` 3 条）、仅零 UUID 放行，用来在**最小爆炸半径**下跑通「改写模板 + 断言脚本」。
- 本批验收脚本固化为后续 7 批复用的模板（写在 §D.0）。

**前置检查**

- 确认 `plugin_mes` / `plugin_finance` 两个 schema 的实际读写方（插件表由 mes / finance 主服务访问），收口后主服务必须走 `scope_with` 或 `rls_system`。
- 取 portal / ticket / tms 的 QPS 低谷窗口，避开门户日报与工单批量归档。
- 确认 communication 的通知投递事件消费路径**不依赖**「未设上下文即放行」（它有 3 条仅空串放行的策略）。

**验收判据**：见 §D `batch01` 清单（结构断言 + 3 档 RLS 负向/正向判据 + 端点冒烟）。

**失败回滚触发条件**（命中任一即回滚本批，用 `rls-policy-backup-batch01.sql` 的回滚段）

- 任一表在 `app.rls_system=on` 下读不到数据（系统通道被打断）→ 立即回滚整批。
- 门户首页 / 待办列表出现 5xx 或空列表。
- 断言 ② 通过但断言 ③（真实租户 N 行）掉为 0 → 说明收口把正常路径也拒了。

### batch02 · 分析与只读派生层（44 条 / 40 表 / `analytics`、`bi`、`core`、`rs`）

**为什么这样分批**

- 44 条 / 40 表，绝大多数是读多写少的派生数据（dashboard、对比分析、报表模板），写入集中在夜间批量。
- `rs` 是 §7 点名的 fail-open 典型（[scope-with-plan-20261116.md](./scope-with-plan-20261116.md) §7 判据 ② 的样例 `rs.projects`），放在这里可最早暴露「未设即放行」的真实影响面。
- `core.ai_conversations` 形态与其余不同（零 UUID 判等而非空串判等），与 `rs` 同批便于对比改写前后差异。

**前置检查**

- 确认 analytics / bi / rs 的夜间批量任务窗口与本次执行窗口不重叠。
- 确认 `rs` 服务的 `scope_system` 调用点（推荐/规则计算链路）在收口后仍拿得到系统上下文。
- 记录 `rs.*` 与 `core.ai_conversations` 在真实租户下的基线行数，作为断言 ③ 的对照值。

**验收判据**：见 §D `batch02` 清单（结构断言 + 3 档 RLS 负向/正向判据 + 端点冒烟）。

**失败回滚触发条件**（命中任一即回滚本批，用 `rls-policy-backup-batch02.sql` 的回滚段）

- 夜间批量任务出现 `RLS context missing` 或行数异常下降。
- dashboard / 报表类端点在真实租户下返回空数据。
- `rs` 计算链路（推荐结果落库）写入被拒（WITH CHECK 阻断）。

### batch03 · 身份与客户（41 条 / 29 表 / `crm`、`iam`）

**为什么这样分批**

- 41 条 / 29 表。`iam` 是权限中枢（`position_roles` / `resource_permissions` 等 6 对双策略），`crm` 是核心客户数据（20 条），一次覆盖「权限」与「客户」两类最敏感写入。
- 两域合计 **12 张「同表双策略」表**（`iam` 6 张：`position_roles` / `position_permissions` / `user_positions` / `resource_permissions` / `permission_audit_logs` / `positions`；`crm` 6 张：`contacts` / `opportunities` / `interactions` / `tags` / `customer_tags` / `customer_finance`）。permissive 是 **OR** 关系，**只要同表还有一条宽松策略，整表依旧放行** → 同表策略必须在同一批、同一事务内一起改，否则出现「看起来改完了但仍放行」。
- IAM 改动会影响所有服务的鉴权解析，必须单独一批、单独回滚点。

**前置检查**

- 先跑一次「双策略同表清单」：`select schemaname, tablename, count(*) from pg_policies where ... group by 1,2 having count(*)>1`，确认本批内成对出现。
- 准备 IAM 登录/鉴权链路冒烟脚本（`POST /api/auth/login` → 取 token → 调一次受保护接口）。
- 确认 crm 的审批流（`/customers/{id}/approval/*`）在收口窗口无在途审批。

**验收判据**：见 §D `batch03` 清单（结构断言 + 3 档 RLS 负向/正向判据 + 端点冒烟）。

**失败回滚触发条件**（命中任一即回滚本批，用 `rls-policy-backup-batch03.sql` 的回滚段）

- 登录链路失败，或任一服务出现 `RLS context missing`（IAM 表被拒读）。
- 客户列表 / 机会漏斗在真实租户下为空。
- 同表双策略只改了一条（断言 ① 显示该表仍有缺逃生口的策略）→ 回滚该表两条。

### batch04 · 质量管理（46 条 / 27 表 / `qms`）

**为什么这样分批**

- 46 条 / 27 表，全部落在单一服务、单一谓词模板（`rls_tenant_isolation`），改动半径只到 QMS。
- QMS 就是 [TODO](../../TODO.md) §17.2「86 处 `.scope*()`」的真身；本批收口结论将直接作为 B4（请求事务统一）在上海/质量域的验收基线。
- 表数少（27）但策略多（46），其中 **19 张表是同表双策略**（占比 70%），是检验「批量改写脚本能否对同表多策略成对处理」的最佳批次。

**前置检查**

- 取 `qms` 服务的审计/巡检写链路（`quality-inspections`、`quality-issues`）基线计数。
- 确认 QMS 的定时统计任务（`dashboard_metrics`）在收口后仍能写入。

**验收判据**：见 §D `batch04` 清单（结构断言 + 3 档 RLS 负向/正向判据 + 端点冒烟）。

**失败回滚触发条件**（命中任一即回滚本批，用 `rls-policy-backup-batch04.sql` 的回滚段）

- 巡检/质量问题的创建或状态流转被 WITH CHECK 拒绝。
- `dashboard_metrics` 定时任务写入失败或指标清零。

### batch05 · 人力（54 条 / 29 表 / `hrm`）

**为什么这样分批**

- 54 条 / 29 表，其中 **25 张是同表双策略**（全 8 批中比例最高），`payroll_*` / `training_*` / `performance_*` 系列全部成对出现，必须整表处理。
- 薪酬与绩效是数据敏感度最高的一域；放在中后段，前面的批次已验证断言脚本与回滚流程。
- HRM 与刚清零的 `employees` / `departments` 跨 schema 歧义点同域（见 W2-B 记录），验证可复用。

**前置检查**

- 确认薪酬发放/计算任务不在窗口内（`payroll_runs` 有批量写）。
- 准备「员工列表 + 薪酬明细」两条只读基线（真实租户行数、首行 id）。
- 确认 HRM 的后台任务走 `scope_system` 而非请求上下文。

**验收判据**：见 §D `batch05` 清单（结构断言 + 3 档 RLS 负向/正向判据 + 端点冒烟）。

**失败回滚触发条件**（命中任一即回滚本批，用 `rls-policy-backup-batch05.sql` 的回滚段）

- 员工/合同/薪酬列表在真实租户下为空，或薪酬计算任务报 `RLS context missing`。
- 任一 `payroll_*` 表出现写入被拒（WITH CHECK）。

### batch06 · 共享核心 public（54 条 / 52 表 / `public`）

**为什么这样分批**

- 54 条 / 52 表，19 个 schema 中**改动半径最大**的一个：`public` 是 8 个服务共同读写的共享 schema（会话、字典、菜单、角色、租户）。
- 谓词模板最统一（几乎全是 `tenant_id IS NULL + 空串 + 零 UUID + 判等`），风险主要在「影响所有服务」而非「语义复杂」，因此单独成批、单独窗口。
- `public.core_sessions` / `core_refresh_tokens` 类策略与登录态强相关，回滚必须最快。

**前置检查**

- 选全系统最低谷窗口（凌晨），并提前通知：本批影响所有服务的登录态与字典读取。
- 准备登录 → 刷新 token → 登出 全链路冒烟。
- 确认 `public.core_tenants`（不在本批，68 条非租户谓词内）在收口后仍可读：系统通道依赖它。

**验收判据**：见 §D `batch06` 清单（结构断言 + 3 档 RLS 负向/正向判据 + 端点冒烟）。

**失败回滚触发条件**（命中任一即回滚本批，用 `rls-policy-backup-batch06.sql` 的回滚段）

- 任一服务登录失败 / token 刷新失败。
- 字典、菜单、角色等共享读接口大面积 5xx 或空返回。
- 出现跨服务的 `RLS context missing` 连锁报错。

### batch07 · 主数据（含列级 `tenant_uid` 3 条）（95 条 / 85 表 / `master_data`）

**为什么这样分批**

- 95 条 / 85 表，是单批最大的一批，但**只在 master_data 一个服务**、只有两个谓词模板（`rls_tenant_isolation` 与 `tenant_isolation_policy`），可脚本化批量改写，评审成本低。
- 本批含 B 组 3 条**列级**策略（`mdm_v60_lineage_nodes/edges/graphs`，判定列是 `tenant_uid` 而非 `tenant_id`，且带 `super-uuid` 超级租户放行）——它们不能用统一的字符串替换批量处理，必须逐条手改。
- 主数据被下游 6 个服务引用，但引用方都是**读**；释放顺序上游先改、下游无需改。

**前置检查**

- 先跑「模板归类」：确认 95 条里只有 2 种谓词骨架，并把 3 条 `tenant_uid` 单独摘出不参与批量替换。
- 确认 `mdm_v60_lineage_*` 的 `super-uuid`（`…0001`）写入方是谁——那是超级租户哨兵，收口时不能一并去掉。
- 记录主数据校验/同步任务的基线（`/checks`、`/rules`）。

**验收判据**：见 §D `batch07` 清单（结构断言 + 3 档 RLS 负向/正向判据 + 端点冒烟）。

**失败回滚触发条件**（命中任一即回滚本批，用 `rls-policy-backup-batch07.sql` 的回滚段）

- 主数据同步/校验任务失败，或下游服务的物料/供应商下拉为空。
- 3 条 `tenant_uid` 策略被误改成 `tenant_id`（断言 ① 会显示该表谓词不含 `tenant_uid`）。
- 血缘（lineage）查询返回空图。

### batch08 · ERP（含集团级函数改写）（27 条 / 20 表 / `erp`）

**为什么这样分批**

- 27 条 / 20 表，量不大但**语义最特殊**：8 条用 `erp.group_tenant_of(tenant)` 把租户映射到集团，属于**有意设计的跨租户共享**（合并报表、内部交易、抵消分录）。
- 另 1 条是纯严格判等（`erp.erp_production_orders`），本身不放行但**缺 `rls_system` 逃生口** → 系统通道与后台任务不可用，改动方向与其他批相反（补逃生口，不是收紧）。`erp.event_idempotency` 同类但已按 §B-附 单列例外，不计入本批 27 条。
- 合并报表/抵消逻辑一旦误伤，需要人工重算，成本最高 → 放最后，单独窗口，单独回滚。

**前置检查**

- 先单独确认 `erp.group_tenant_of()` 的语义与集团表数据（`core_tenants.group_id` 或等价列），确认收口**保留**集团级放宽。
- `erp.event_idempotency` 不在本批执行范围（§B-附 单列例外）；本批不修改它，写入方与系统通道问题留待例外单独立项。
- 准备合并报表（consolidation）与内部交易（internal_transactions）两条基线。

**验收判据**：见 §D `batch08` 清单（结构断言 + 3 档 RLS 负向/正向判据 + 端点冒烟）。

**失败回滚触发条件**（命中任一即回滚本批，用 `rls-policy-backup-batch08.sql` 的回滚段）

- 合并报表/抵消分录结果与收口前不一致（行数或金额）。
- 内部交易对账失败，或事件幂等写入冲突。
- `erp_production_orders` 生产订单列表在真实租户下为空。

## D. 每批验证判据（可执行清单）

> **本阶段不执行**：以下全部为 M-2 窗口的执行清单，本次盘点期间**一条都没跑**（本次唯一执行的 SQL 是 §0.1 的只读统计）。

### D.0 通用模板（四档判据）

| 档 | 判据 | 期望 | 说明 |
|---|---|---|---|
| ① 结构 | 本批每条 `app.tenant_id` 策略都含 `app.rls_system` | 0 行残留 | 证明「补逃生口」覆盖完整 |
| ② 未设即拒 | `app.tenant_id=''` 且 `rls_system=off` 时查询 | **0 行** | 本次收口的核心目标（当前 382 条全部违反） |
| ③ 假租户 | `app.tenant_id=00000000-0000-0000-0000-0000000000ff` | **0 行** | 单租户环境下「租户 A 看不到租户 B」的等价判据 |
| ④ 正向 | 真实租户 UUID | 行数 = 收口前基线（≠0）；`rls_system=on` 后 ≥ 基线 | 防「收得太紧把正常路径拒了」 |

断言 ② 若用「真空连接」验证（完全没有 `set_config` 过），需新开连接直接 `SELECT count(*)`；`SET LOCAL`/`set_config(...,true)` 在事务内无法真正「取消设置」，故统一用**空串**作等价输入（所有谓词都做了 `NULLIF(guc,'')` 归一）。

### D.01 `batch01`（21 条 / 20 表）

> **本阶段不执行**：以下 SQL 与冒烟项为 M-2 窗口的执行清单，当前仅定义、未运行。

**断言 ①（结构：本批已无「缺 `rls_system` 逃生口」的策略）**

```sql
-- 执行后期望：0 行
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname IN ('communication', 'plugin_finance', 'plugin_mes', 'portal', 'ticket', 'tms', 'unified_core')
  AND qual IS NOT NULL AND cmd IN ('SELECT','ALL')
  AND qual LIKE '%app.tenant_id%'
  AND qual NOT LIKE '%app.rls_system%';
```

**断言 ②（负向：未设租户上下文必须 0 行）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'communication, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '', true);   -- 空串等价于未设（谓词用 NULLIF(...,'') 归一）
SELECT count(*) FROM communication.core_email_templates;   -- 期望 0
SELECT count(*) FROM communication.core_notification_deliveries;   -- 期望 0
ROLLBACK;
```

**断言 ③（负向：假租户视角 0 行，等价于「租户 A 看不到租户 B」）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'communication, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-0000000000ff', true);
SELECT count(*) FROM communication.core_email_templates;   -- 期望 0
SELECT count(*) FROM communication.core_notification_deliveries;   -- 期望 0
ROLLBACK;
```

**断言 ④（正向：真实租户可见 + 系统通道可读）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'communication, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '<本批采集的真实租户 UUID>', true);
SELECT count(*) FROM communication.core_email_templates;   -- 期望 = 收口前基线（不得为 0）
SELECT count(*) FROM communication.core_notification_deliveries;   -- 期望 = 收口前基线（不得为 0）
SELECT set_config('app.rls_system', 'on', true);
SELECT count(*) FROM communication.core_email_templates;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
SELECT count(*) FROM communication.core_notification_deliveries;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
ROLLBACK;
```

**端点冒烟（真实租户 token，逐条 200 且返回体非空）**

- `GET /api/portal/todos`、`GET /api/portal/services`
- `GET /api/ticket/workflows`
- `GET /api/tms/shipments`、`GET /api/tms/vehicles`
- `GET /api/unified-core/tasks`、`GET /api/unified-core/approvals`
- communication 未见 GET 资源路由（仅 `/health` 与事件桥）→ 冒烟改为「通知投递仍可写入并落在本租户」

### D.02 `batch02`（44 条 / 40 表）

> **本阶段不执行**：以下 SQL 与冒烟项为 M-2 窗口的执行清单，当前仅定义、未运行。

**断言 ①（结构：本批已无「缺 `rls_system` 逃生口」的策略）**

```sql
-- 执行后期望：0 行
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname IN ('analytics', 'bi', 'core', 'rs')
  AND qual IS NOT NULL AND cmd IN ('SELECT','ALL')
  AND qual LIKE '%app.tenant_id%'
  AND qual NOT LIKE '%app.rls_system%';
```

**断言 ②（负向：未设租户上下文必须 0 行）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'analytics, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '', true);   -- 空串等价于未设（谓词用 NULLIF(...,'') 归一）
SELECT count(*) FROM core.ai_conversations;   -- 期望 0
SELECT count(*) FROM core.ai_faqs;   -- 期望 0
ROLLBACK;
```

**断言 ③（负向：假租户视角 0 行，等价于「租户 A 看不到租户 B」）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'analytics, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-0000000000ff', true);
SELECT count(*) FROM core.ai_conversations;   -- 期望 0
SELECT count(*) FROM core.ai_faqs;   -- 期望 0
ROLLBACK;
```

**断言 ④（正向：真实租户可见 + 系统通道可读）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'analytics, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '<本批采集的真实租户 UUID>', true);
SELECT count(*) FROM core.ai_conversations;   -- 期望 = 收口前基线（不得为 0）
SELECT count(*) FROM core.ai_faqs;   -- 期望 = 收口前基线（不得为 0）
SELECT set_config('app.rls_system', 'on', true);
SELECT count(*) FROM core.ai_conversations;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
SELECT count(*) FROM core.ai_faqs;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
ROLLBACK;
```

**端点冒烟（真实租户 token，逐条 200 且返回体非空）**

- `GET /api/analytics/dashboard`、`GET /api/analytics/metrics`
- `GET /api/bi/...`（bi schema 的服务归属需按路由表确认）
- `GET /api/rs/...`（rs 为规则/推荐 schema，端点按路由表确认）
- AI 会话：`GET /api/ai/...` 打开一次会话列表

### D.03 `batch03`（41 条 / 29 表）

> **本阶段不执行**：以下 SQL 与冒烟项为 M-2 窗口的执行清单，当前仅定义、未运行。

**断言 ①（结构：本批已无「缺 `rls_system` 逃生口」的策略）**

```sql
-- 执行后期望：0 行
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname IN ('crm', 'iam')
  AND qual IS NOT NULL AND cmd IN ('SELECT','ALL')
  AND qual LIKE '%app.tenant_id%'
  AND qual NOT LIKE '%app.rls_system%';
```

**断言 ②（负向：未设租户上下文必须 0 行）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'crm, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '', true);   -- 空串等价于未设（谓词用 NULLIF(...,'') 归一）
SELECT count(*) FROM crm.customer_finance;   -- 期望 0
SELECT count(*) FROM crm.contacts;   -- 期望 0
ROLLBACK;
```

**断言 ③（负向：假租户视角 0 行，等价于「租户 A 看不到租户 B」）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'crm, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-0000000000ff', true);
SELECT count(*) FROM crm.customer_finance;   -- 期望 0
SELECT count(*) FROM crm.contacts;   -- 期望 0
ROLLBACK;
```

**断言 ④（正向：真实租户可见 + 系统通道可读）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'crm, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '<本批采集的真实租户 UUID>', true);
SELECT count(*) FROM crm.customer_finance;   -- 期望 = 收口前基线（不得为 0）
SELECT count(*) FROM crm.contacts;   -- 期望 = 收口前基线（不得为 0）
SELECT set_config('app.rls_system', 'on', true);
SELECT count(*) FROM crm.customer_finance;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
SELECT count(*) FROM crm.contacts;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
ROLLBACK;
```

**端点冒烟（真实租户 token，逐条 200 且返回体非空）**

- `POST /api/auth/login` → `GET /api/auth/me`
- `GET /api/iam/roles`、`GET /api/iam/permissions`（按路由表确认前缀）
- `GET /api/crm/customers`、`GET /api/crm/opportunities/funnel`

### D.04 `batch04`（46 条 / 27 表）

> **本阶段不执行**：以下 SQL 与冒烟项为 M-2 窗口的执行清单，当前仅定义、未运行。

**断言 ①（结构：本批已无「缺 `rls_system` 逃生口」的策略）**

```sql
-- 执行后期望：0 行
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname IN ('qms')
  AND qual IS NOT NULL AND cmd IN ('SELECT','ALL')
  AND qual LIKE '%app.tenant_id%'
  AND qual NOT LIKE '%app.rls_system%';
```

**断言 ②（负向：未设租户上下文必须 0 行）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'qms, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '', true);   -- 空串等价于未设（谓词用 NULLIF(...,'') 归一）
SELECT count(*) FROM qms.qa_eightd_reports;   -- 期望 0
SELECT count(*) FROM qms.qa_eightd_audit_logs;   -- 期望 0
ROLLBACK;
```

**断言 ③（负向：假租户视角 0 行，等价于「租户 A 看不到租户 B」）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'qms, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-0000000000ff', true);
SELECT count(*) FROM qms.qa_eightd_reports;   -- 期望 0
SELECT count(*) FROM qms.qa_eightd_audit_logs;   -- 期望 0
ROLLBACK;
```

**断言 ④（正向：真实租户可见 + 系统通道可读）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'qms, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '<本批采集的真实租户 UUID>', true);
SELECT count(*) FROM qms.qa_eightd_reports;   -- 期望 = 收口前基线（不得为 0）
SELECT count(*) FROM qms.qa_eightd_audit_logs;   -- 期望 = 收口前基线（不得为 0）
SELECT set_config('app.rls_system', 'on', true);
SELECT count(*) FROM qms.qa_eightd_reports;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
SELECT count(*) FROM qms.qa_eightd_audit_logs;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
ROLLBACK;
```

**端点冒烟（真实租户 token，逐条 200 且返回体非空）**

- `GET /api/qms/quality-tasks`、`GET /api/qms/defect-records`
- `GET /api/qms/quality-inspections`

### D.05 `batch05`（54 条 / 29 表）

> **本阶段不执行**：以下 SQL 与冒烟项为 M-2 窗口的执行清单，当前仅定义、未运行。

**断言 ①（结构：本批已无「缺 `rls_system` 逃生口」的策略）**

```sql
-- 执行后期望：0 行
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname IN ('hrm')
  AND qual IS NOT NULL AND cmd IN ('SELECT','ALL')
  AND qual LIKE '%app.tenant_id%'
  AND qual NOT LIKE '%app.rls_system%';
```

**断言 ②（负向：未设租户上下文必须 0 行）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'hrm, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '', true);   -- 空串等价于未设（谓词用 NULLIF(...,'') 归一）
SELECT count(*) FROM hrm.companies;   -- 期望 0
SELECT count(*) FROM hrm.departments;   -- 期望 0
ROLLBACK;
```

**断言 ③（负向：假租户视角 0 行，等价于「租户 A 看不到租户 B」）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'hrm, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-0000000000ff', true);
SELECT count(*) FROM hrm.companies;   -- 期望 0
SELECT count(*) FROM hrm.departments;   -- 期望 0
ROLLBACK;
```

**断言 ④（正向：真实租户可见 + 系统通道可读）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'hrm, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '<本批采集的真实租户 UUID>', true);
SELECT count(*) FROM hrm.companies;   -- 期望 = 收口前基线（不得为 0）
SELECT count(*) FROM hrm.departments;   -- 期望 = 收口前基线（不得为 0）
SELECT set_config('app.rls_system', 'on', true);
SELECT count(*) FROM hrm.companies;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
SELECT count(*) FROM hrm.departments;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
ROLLBACK;
```

**端点冒烟（真实租户 token，逐条 200 且返回体非空）**

- `GET /api/hrm/employees`、`GET /api/hrm/contracts`
- `GET /api/hrm/payroll/records`（按路由表确认路径）

### D.06 `batch06`（54 条 / 52 表）

> **本阶段不执行**：以下 SQL 与冒烟项为 M-2 窗口的执行清单，当前仅定义、未运行。

**断言 ①（结构：本批已无「缺 `rls_system` 逃生口」的策略）**

```sql
-- 执行后期望：0 行
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname IN ('public')
  AND qual IS NOT NULL AND cmd IN ('SELECT','ALL')
  AND qual LIKE '%app.tenant_id%'
  AND qual NOT LIKE '%app.rls_system%';
```

**断言 ②（负向：未设租户上下文必须 0 行）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'public, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '', true);   -- 空串等价于未设（谓词用 NULLIF(...,'') 归一）
SELECT count(*) FROM public.core_faqs;   -- 期望 0
SELECT count(*) FROM public.core_guides;   -- 期望 0
ROLLBACK;
```

**断言 ③（负向：假租户视角 0 行，等价于「租户 A 看不到租户 B」）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'public, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-0000000000ff', true);
SELECT count(*) FROM public.core_faqs;   -- 期望 0
SELECT count(*) FROM public.core_guides;   -- 期望 0
ROLLBACK;
```

**断言 ④（正向：真实租户可见 + 系统通道可读）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'public, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '<本批采集的真实租户 UUID>', true);
SELECT count(*) FROM public.core_faqs;   -- 期望 = 收口前基线（不得为 0）
SELECT count(*) FROM public.core_guides;   -- 期望 = 收口前基线（不得为 0）
SELECT set_config('app.rls_system', 'on', true);
SELECT count(*) FROM public.core_faqs;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
SELECT count(*) FROM public.core_guides;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
ROLLBACK;
```

**端点冒烟（真实租户 token，逐条 200 且返回体非空）**

- `POST /api/auth/login`、`POST /api/auth/refresh`、`POST /api/auth/logout`
- `GET /api/core/dict/types`、`GET /api/core/menus`
- 任选 2 个业务服务各调 1 个列表接口，确认不受共享表影响

### D.07 `batch07`（95 条 / 85 表）

> **本阶段不执行**：以下 SQL 与冒烟项为 M-2 窗口的执行清单，当前仅定义、未运行。

**断言 ①（结构：本批已无「缺 `rls_system` 逃生口」的策略）**

```sql
-- 执行后期望：0 行
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname IN ('master_data')
  AND qual IS NOT NULL AND cmd IN ('SELECT','ALL')
  AND qual LIKE '%app.tenant_id%'
  AND qual NOT LIKE '%app.rls_system%';
```

**断言 ②（负向：未设租户上下文必须 0 行）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'master_data, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '', true);   -- 空串等价于未设（谓词用 NULLIF(...,'') 归一）
SELECT count(*) FROM master_data.mdm_audit_export_logs;   -- 期望 0
SELECT count(*) FROM master_data.mdm_classification_results;   -- 期望 0
ROLLBACK;
```

**断言 ③（负向：假租户视角 0 行，等价于「租户 A 看不到租户 B」）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'master_data, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-0000000000ff', true);
SELECT count(*) FROM master_data.mdm_audit_export_logs;   -- 期望 0
SELECT count(*) FROM master_data.mdm_classification_results;   -- 期望 0
ROLLBACK;
```

**断言 ④（正向：真实租户可见 + 系统通道可读）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'master_data, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '<本批采集的真实租户 UUID>', true);
SELECT count(*) FROM master_data.mdm_audit_export_logs;   -- 期望 = 收口前基线（不得为 0）
SELECT count(*) FROM master_data.mdm_classification_results;   -- 期望 = 收口前基线（不得为 0）
SELECT set_config('app.rls_system', 'on', true);
SELECT count(*) FROM master_data.mdm_audit_export_logs;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
SELECT count(*) FROM master_data.mdm_classification_results;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
ROLLBACK;
```

**端点冒烟（真实租户 token，逐条 200 且返回体非空）**

- `GET /api/master-data/checks`、`GET /api/master-data/rules`
- `GET /api/master-data/materials`（按路由表确认）
- 下游任选：`GET /api/scm/...` 物料下拉冒烟

### D.08 `batch08`（27 条 / 20 表）

> **本阶段不执行**：以下 SQL 与冒烟项为 M-2 窗口的执行清单，当前仅定义、未运行。

**断言 ①（结构：本批已无「缺 `rls_system` 逃生口」的策略）**

```sql
-- 执行后期望：0 行
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname IN ('erp')
  AND qual IS NOT NULL AND cmd IN ('SELECT','ALL')
  AND qual LIKE '%app.tenant_id%'
  AND qual NOT LIKE '%app.rls_system%';
```

**断言 ②（负向：未设租户上下文必须 0 行）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'erp, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '', true);   -- 空串等价于未设（谓词用 NULLIF(...,'') 归一）
SELECT count(*) FROM erp.announcements;   -- 期望 0
SELECT count(*) FROM erp.assets;   -- 期望 0
ROLLBACK;
```

**断言 ③（负向：假租户视角 0 行，等价于「租户 A 看不到租户 B」）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'erp, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-0000000000ff', true);
SELECT count(*) FROM erp.announcements;   -- 期望 0
SELECT count(*) FROM erp.assets;   -- 期望 0
ROLLBACK;
```

**断言 ④（正向：真实租户可见 + 系统通道可读）**

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', 'erp, public', true);
SELECT set_config('app.rls_system', 'off', true);
SELECT set_config('app.tenant_id', '<本批采集的真实租户 UUID>', true);
SELECT count(*) FROM erp.announcements;   -- 期望 = 收口前基线（不得为 0）
SELECT count(*) FROM erp.assets;   -- 期望 = 收口前基线（不得为 0）
SELECT set_config('app.rls_system', 'on', true);
SELECT count(*) FROM erp.announcements;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
SELECT count(*) FROM erp.assets;   -- 期望 >= 上一段，且后台任务不报 RLS context missing
ROLLBACK;
```

**端点冒烟（真实租户 token，逐条 200 且返回体非空）**

- `GET /api/erp/assets`、`GET /api/erp/documents`
- `GET /api/erp/production-orders`（按路由表确认）
- `GET /api/erp/consolidation/reports`（按路由表确认）

## E. 缺口与未决

**已确认的边界**

- **未执行任何生产 DDL、未执行任何 DML**：全程只有 `SELECT`（`pg_policies` / `pg_class` / `pg_namespace` / `information_schema.columns`），无 `CREATE` / `ALTER` / `DROP` / `INSERT` / `UPDATE` / `DELETE` / `COPY`，无 `BEGIN` 后的写操作。
- **8 个 backup SQL 仅落本地文件、未执行**，文件头已写明「仅本地备份/回滚脚本，勿在生产执行；执行窗口需另行审批（M-2 未定）」。
- **10 条严格型（缺逃生口）不在「放行」语义内**：`erp.event_idempotency`（口径的「1 条未设即拒」，单列于 C）+ `erp.erp_production_orders` + 8 条 `erp.group_tenant_of()` 集团级改写（这 9 条按列级/函数级判据纳入 B）。它们不带跨租户放行风险，但缺系统通道逃生口；本清单已收录其快照与回滚，**动作归属与集团语义一起在 M-2 定**（改错方向会让事件消费/后台任务报 `RLS context missing`）。
- **68 条非租户谓词不在本批范围**：其中 **56 条** 是 `*_allow_all_*`（`USING (true)`，整表放行）、**11 条** 是 `rls_system`-only（`public.core_sessions` / `core_refresh_tokens` / `core_login_logs` / `crm.audit_logs` 等）、**1 条** 是 `public.core_tenants.rls_global_read`（`rls_system` 或全局行）。它们既不满足「含 `app.tenant_id`」，也不属于本批的「未设即放行」形态；如要收口需另立 W7/known-gate 项（`USING (true)` 的 56 条尤其需要业务确认是否本就该全局可见）。
- **11 条 `rls_global_read` 的双旁路叠加**（`rls_system='on'` **且** `tenant_id IS NULL`）已被计入 579「正确态」。它们的设计意图是「全局行对所有租户可见」，不属于缺陷；若要收紧需产品决策，本批不动。

**未决 / 需上游输入**

- **执行窗口（M-2）未定**：8 个 backup 文件只是快照，收口 DDL 本身（补 `rls_system` 逃生口、去掉空串/零 UUID 放行）尚未起草——按任务边界，本轮只做盘点与方案。
- **行数估算不可用**：360/382 张表 `reltuples = -1`（从未 ANALYZE）。若要按数据量排优先级，需在 M-2 前对目标表做一次 `ANALYZE`（属 DDL 邻域，需授权）或用 `pg_class.relpages` 粗略估算。本清单统一记「未统计」。
- **`tenant_uid` 与 `tenant_id` 的双列并存**：`master_data` 有 14 张表带 `tenant_uid` 列，其中 10 张的策略直接判 `tenant_uid`。收口前需确认这两列的写入一致性（谁写 `tenant_uid`），否则加了逃生口也修不掉「换列即绕过」。
- **`super-uuid`（`00000000-…-000000000001`）哨兵语义未定**：3 条 `tenant_uid` 策略显式放行该值，收口时若一并去掉会打断超级租户链路。需确认该租户是否真实存在。
- **影子 schema 的同名废弃副本**（`rs` / `portal`）：属 W2-D 的数据侧问题，本批不处理，但 `rs` 在本批（batch02）内，执行时需注意解析目标不要落到副本表。
- **代码侧未动**：未改任何 Rust 文件、未改 hook、未动 `docs/quality` 下既有文档、未 `git commit` / `git push`。
