# 生产 RLS 策略 vs 仓库迁移最终态 全量差分普查（2026-11-18）

> 只读普查：生产连接仅 `SELECT` / `pg_dump --schema-only`，`SHOW transaction_read_only = on`；
> 未写入生产、未改迁移、未开窗。所有重放发生在本地一次性 scratch 库。

## 0. 结论先行

**若今天按仓库迁移重建一套库，有 318 张表的 RLS 策略会比线上生产更宽松。**

- 生产 `pg_policies` 共 **1050** 条 / 957 张表（原始导出 1050 条）。
- 仓库迁移按版本顺序重放后共 **1181** 条 / 1031 张表（含少数只存在于仓库的新表）。
- 逐条完全一致 **676** 条；同名但定义不同 **271** 条；仓库独有 **234** 条；生产独有 **103** 条。
- 按表合并同表多条策略后，**391** 张表出现「仓库侧存在线上没有的开放分支」；
  其中排除 flow 影子副本改名产物（18 张）与生产 RLS 关闭、仓库加策略反而更严的 55 张后，
  **严格口径为 318 张表**。
- 反向（生产比仓库更松）只有 **1 张表**：`bi.audit_logs`，生产仍是 `USING (true)` 的 allow_all。

这个数字说明：**「迁移是唯一源」目前不成立**。生产上 2026-11 的一批线下收紧，
大部分没有对应的、可重复执行的仓库迁移；按迁移重建会把这些收紧全部丢掉。

## 1. 口径与方法

### 1.1 生产侧（只读）

```sql
SHOW transaction_read_only;  -- on
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies;
```
结果导出为本地 TSV：1050 条策略、957 张表、38 个 schema。`pg_class.relrowsecurity` /
`relforcerowsecurity` 另行导出，用于区分「有策略且启用」与「无策略且关闭」。

### 1.2 仓库侧（按 version 顺序取最终态）

不做逐文件比对。方法：

1. `pg_dump --schema-only topems_prod` 建本地 scratch 库（只含结构，不读业务数据）；
2. 清空 scratch 库全部策略，得到「零策略基线」；
3. 按 `database/migrations` 的 version 升序，抽取 184 个含策略 DDL 的迁移文件中的
   `CREATE/ALTER/DROP POLICY` 语句（含 `DO $$ ... EXECUTE format(...)` 动态块），逐条重放；
4. 再从 `pg_policies` 导出仓库侧最终态，与生产侧按 `(schema, table, policyname)` 对齐比较。

快照文件（`docs/database/rls-policy-backup-batch*.sql`、`fixtures/full_schema_contract.sql`）
只用于第 5 类「仅在快照夹具中存在」的判定，**不作仓库侧真相**。

### 1.3 宽松度判定

对 `qual` 提取开放特征（`with_check` 同口径）：
- `ALLOW_TRUE`：`true`（allow_all）；
- `NULL_ROW`：`tenant_id IS NULL` / `tenant_uid IS NULL` 作为 OR 分支；
- `ZERO_TENANT`：GUC 等于 `00000000-0000-0000-0000-00000000000N` 的全局通道分支；
- `EMPTY_GUC`：`current_setting('app.tenant_id', true) = ''` 直接放行；
- `STALE_GUC`：引用 `app.current_tenant_id` 旧契约；
- `SYSTEM`：`app.rls_system = 'on'` 系统通道（视为受控通道，不计入开放特征）。

**仓库更宽松** = 仓库侧开放特征集合 ⊃ 生产侧开放特征集合（按表对多条策略取并集）。

## 2. 分类统计

| 分类 | 策略条数 | 表数 | 说明 |
|---|---:|---:|---|
| 完全一致 | 676 | 631 | 名称、cmd、roles、qual、with_check 全同 |
| 线上更严（仓库更宽松，线下收紧未回迁） | 263 | 318 | **本次重点**，见 §3.2 |
| 线上更松（危险） | 0 | 1 | `bi.audit_logs` allow_all，见 §3.1 |
| 同档位定义漂移 | 8 | — | 无开放特征差异但表达式不同，需人工定性 |
| 仓库有线上无 | 234 | — | 同名表名称漂移 / flow 影子副本，见 §3.3 |
| 生产有仓库无 | 103 | — | 同上，生产 rename 后的严格策略，见 §3.3 |
| 只在快照夹具中存在 | 36 | — | 见 §3.4 |

## 3. 分类明细

### 3.1 线上更松（危险，优先）

只有 1 张表：`bi.audit_logs`。生产仍保留 `bi_allow_all_audit_logs USING (true)`，
仓库迁移已把它改成租户策略。按迁移重建后该表反而更严；但**生产当前对所有租户全开**，
应优先处理，不属于「线下收紧未回迁」，属于「收紧尚未上生产」。

```sql
-- 生产
CREATE POLICY bi_allow_all_audit_logs ON bi.audit_logs FOR ALL USING (true);
-- 仓库迁移最终态
CREATE POLICY tenant_isolation_audit_logs ON bi.audit_logs FOR ALL
  USING (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))
         OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text));
```

### 3.2 线上更严（线下收紧、仓库缺失）

**318 张表**。按 schema 分布：

| schema | 表数 |
|---|---:|
| master_data | 84 |
| public | 57 |
| hrm | 29 |
| qms | 27 |
| erp | 18 |
| iam | 15 |
| crm | 14 |
| rs | 14 |
| analytics | 12 |
| mes | 12 |
| bi | 8 |
| core | 7 |
| plugin_finance | 6 |
| communication | 5 |
| tms | 4 |
| portal | 3 |
| plugin_mes | 1 |
| ticket | 1 |
| unified_core | 1 |

按仓库侧表达式的开放模板分：

| 模板 | 表数 | 含义 |
|---|---:|---|
| T-null-or-zero | 216 | `tenant_id = GUC OR tenant_id IS NULL OR GUC = 全零租户` |
| T-empty-guc | 76 | 额外 `OR current_setting('app.tenant_id') = ''` 直接放行 |
| T-mdm-sentinel | 26 | `tenant_uid IS NULL OR ... = '' OR ... = '...0001'` |
| OTHER | 0 | 名称漂移行的代表表达式，见附录 |

> `T-mdm-sentinel` 的 26 张表集中在 `master_data`（MDM v60），仓库侧用 `tenant_uid IS NULL` +
> 哨兵租户 `...0001` 表达「平台语料 + 租户自有」。如果平台读取确实依赖该通道，
> 线上改严格后可能已经读空；这类表不能简单按「仓库更宽松」回迁，需与 DEC-15 平台语料归一一起定性。

三类典型差异（表达式原样引用）：

```sql
-- 生产（严格，系统通道 + 租户等值）
USING ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
       OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))

-- 仓库（宽松，多出 NULL 行 + 全零租户两个开放分支）
USING ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid)
       OR (tenant_id IS NULL)
       OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))

-- 仓库（更宽松，GUC 为空串时整表放行）
USING ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
       OR (current_setting('app.tenant_id'::text, true) = ''::text))
```

> 上面第三类在 `communication.core_notification_deliveries` / `core_notification_preferences` /
> `core_notification_subscriptions` 三张表上原样存在：任何连接只要把 `app.tenant_id` 显式设为空串，
> `current_setting(...) = ''` 分支即为真，整表对所有租户可见（未设置时为 NULL，仍按拒绝处理）。

**需业务判断的 8 张（不计入 318）**：`erp` 合并报表族使用 `tenant_id = erp.group_tenant_of(GUC)`，
生产是单租户等值。仓库侧让集团租户看到成员租户数据，可能是**仓库更正确**（生产会看不到合并数据），
也可能是越权，需要业务定性后再决定回迁方向：

| schema.table | 生产 qual | 仓库 qual |
|---|---|---|
| `erp.company_relations` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.consolidation_report_lines` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.consolidation_reports` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.consolidation_scope_companies` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.consolidation_scopes` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.elimination_candidates` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.elimination_rules` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.internal_transactions` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |

前 20 条明细（每 schema 至少 1 条）：

| # | schema.table | 生产策略名 | 仓库策略名 | 生产 qual | 仓库 qual |
|---:|---|---|---|---|---|
| 1 | `analytics.analytics_comparison_analyses` | `tenant_isolation_analytics_comparison_analyses` | `tenant_isolation_analytics_comparison_analyses` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` |
| 2 | `bi.analytics_dashboards` | `tenant_isolation_analytics_dashboards` | `tenant_isolation_analytics_dashboards` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` |
| 3 | `communication.core_email_templates` | `rls_tenant_isolation` | `tenant_isolation_core_email_templates` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` |
| 4 | `core.ai_conversations` | `ai_conversations_tenant_isolation,tenant_isolation_ai_conversations` | `ai_conversations_tenant_isolation,tenant_isolation_ai_conversations` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` |
| 5 | `crm.contacts` | `rls_tenant_isolation,tenant_isolation_contacts` | `tenant_isolation_contacts` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` |
| 6 | `erp.announcements` | `rls_tenant_isolation,tenant_isolation_announcements` | `rls_tenant_isolation,tenant_isolation_announcements` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| 7 | `hrm.attendance_records` | `rls_tenant_isolation,tenant_isolation_attendance_records` | `tenant_isolation_attendance_records` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` |
| 8 | `iam.crm_dashboard_snapshots` | `rls_tenant_isolation` | `rls_tenant_isolation,tenant_isolation_crm_dashboard_snapshots` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| 9 | `master_data.materials` | `rls_tenant_isolation,tenant_isolation_materials` | `rls_tenant_isolation,tenant_isolation_materials` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| 10 | `mes.equipment` | `rls_tenant_isolation` | `rls_tenant_isolation,tenant_isolation_equipment` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` |
| 11 | `plugin_finance.accounting_subjects` | `tenant_isolation_accounting_subjects` | `tenant_isolation_accounting_subjects` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` |
| 12 | `plugin_mes.audit_logs` | `rls_tenant_isolation` | `tenant_isolation_audit_logs` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` |
| 13 | `portal.portal_announcements` | `rls_tenant_isolation` | `rls_tenant_isolation,tenant_isolation_portal_announcements` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` |
| 14 | `public._archive_core_workflow_instances` | `tenant_isolation_core_workflow_instances` | `tenant_isolation__archive_core_workflow_instances` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` |
| 15 | `qms.qa_alert_messages` | `tenant_isolation_qa_alert_messages` | `tenant_isolation_qa_alert_messages` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` |
| 16 | `rs.audit_logs` | `rls_tenant_isolation` | `tenant_isolation_audit_logs` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` |
| 17 | `ticket.ticket_attachments` | `rls_tenant_isolation` | `rls_tenant_isolation,tenant_isolation_ticket_attachments` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| 18 | `tms.carriers` | `tenant_isolation_carriers` | `tenant_isolation_carriers` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` |
| 19 | `unified_core.inter_module_sync` | `rls_tenant_isolation` | `tenant_isolation_inter_module_sync` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` |
| 20 | `analytics.analytics_comparison_results` | `tenant_isolation_analytics_comparison_results` | `tenant_isolation_analytics_comparison_results` | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` |

### 3.3 仓库有线上无 / 生产有仓库无（名称漂移）

- 仓库独有 **234** 条，其中 11 条是 `flow.*` 影子副本策略，
  会被 `20261118160000_flow_shadow_copies_rename_deprecated.sql` 连表改名为 `_deprecated_*`，
  不代表新增隔离；其余 223 条都是**同表策略改名**（`tenant_isolation_<t>` ↔ `rls_tenant_isolation`）。
- 生产独有 **103** 条，全部在仓库侧存在同表但不同名的策略——
  即生产线下收紧时把策略名从 `tenant_isolation_<t>` 改成了 `rls_tenant_isolation`，仓库未同步。
  这 103 条中的 102 条已折算进 §3.2 的宽松表统计；`bi.audit_logs` 例外（§3.1）。

典型名称漂移：

| schema.table | 生产策略 | 仓库策略 |
|---|---|---|
| `bi.audit_logs` | `bi_allow_all_audit_logs` | `tenant_isolation_audit_logs` |
| `bi.report_schedules` | `rls_tenant_isolation` | `tenant_isolation_report_schedules` |
| `bi.report_templates` | `rls_tenant_isolation` | `tenant_isolation_report_templates` |
| `bi.reports` | `rls_tenant_isolation` | `tenant_isolation_reports` |
| `communication.core_email_templates` | `rls_tenant_isolation` | `tenant_isolation_core_email_templates` |
| `core.knowledge_bases` | `rls_tenant_isolation` | `tenant_isolation_knowledge_bases` |
| `core.knowledge_chunks` | `rls_tenant_isolation` | `tenant_isolation_knowledge_chunks` |
| `core.knowledge_documents` | `rls_tenant_isolation` | `tenant_isolation_knowledge_documents` |
| `core.knowledge_qa_history` | `rls_tenant_isolation` | `tenant_isolation_knowledge_qa_history` |
| `crm.contacts` | `rls_tenant_isolation` | `tenant_isolation_contacts` |
| `crm.customer_orders` | `rls_tenant_isolation` | `tenant_isolation_customer_orders` |
| `crm.customer_scores` | `rls_tenant_isolation` | `tenant_isolation_customer_scores` |

（完整 103 条见附录 B。）

### 3.4 只在快照夹具中存在

快照与夹具共解析出 1032 条策略，其中 **36 条既不在生产也不在仓库**：

| schema.table | 策略 | 来源 |
|---|---|---|
| `ai.ai_models` | `rls_global_read` | full_schema_contract.sql |
| `ai.ai_prompt_templates` | `rls_global_read` | full_schema_contract.sql |
| `bi.analytics_datasets` | `tenant_isolation_analytics_datasets` | full_schema_contract.sql, rls-policy-backup-batch02.sql |
| `core.core_plugins` | `core_allow_all_core_plugins` | full_schema_contract.sql |
| `crm.core_crm_customers` | `rls_tenant_isolation` | full_schema_contract.sql |
| `erp.core_erp_suppliers` | `rls_tenant_isolation` | full_schema_contract.sql |
| `erp.dict_items` | `erp_allow_all_dict_items` | full_schema_contract.sql |
| `erp.dict_types` | `erp_allow_all_dict_types` | full_schema_contract.sql |
| `erp.holidays` | `erp_allow_all_holidays` | full_schema_contract.sql |
| `finance.core_finance_currencies` | `rls_global_read` | full_schema_contract.sql |
| `finance.core_finance_report_line_map` | `rls_global_read` | full_schema_contract.sql |
| `gis.geodata` | `gis_allow_all_geodata` | full_schema_contract.sql |
| `gis.geofeatures` | `gis_allow_all_geofeatures` | full_schema_contract.sql |
| `gis.map_layers` | `gis_allow_all_map_layers` | full_schema_contract.sql |
| `gis.spatial_analysis` | `gis_allow_all_spatial_analysis` | full_schema_contract.sql |
| `hrm.initialization_logs` | `hrm_allow_all_initialization_logs` | full_schema_contract.sql |
| `master_data.mdm_metadata_objects` | `mdm_metadata_objects_tenant_policy` | full_schema_contract.sql, rls-policy-backup-batch07.sql |
| `mobile.sync_policies` | `rls_global_read` | full_schema_contract.sql |
| `pm.project_type_configs` | `rls_global_read` | full_schema_contract.sql |
| `portal.portal_quick_actions` | `portal_allow_all_portal_quick_actions` | full_schema_contract.sql |
| `public.alert_rules` | `public_allow_all_alert_rules` | full_schema_contract.sql |
| `public.alerts` | `public_allow_all_alerts` | full_schema_contract.sql |
| `public.core_dict_items` | `rls_global_read` | full_schema_contract.sql |
| `public.core_dict_types` | `rls_global_read` | full_schema_contract.sql |
| `public.core_files` | `tenant_isolation_core_files` | full_schema_contract.sql, rls-policy-backup-batch06.sql |
| `public.core_operation_logs` | `public_allow_all_core_operation_logs` | full_schema_contract.sql |
| `public.core_roles` | `rls_global_read` | full_schema_contract.sql |
| `public.core_tenants` | `rls_global_read` | full_schema_contract.sql |
| `public.core_tenants` | `rls_system_only` | full_schema_contract.sql |
| `public.navigation_menu` | `public_allow_all_navigation_menu` | full_schema_contract.sql |
| `public.pinned_apps` | `public_allow_all_pinned_apps` | full_schema_contract.sql |
| `public.subscriptions` | `public_allow_all_subscriptions` | full_schema_contract.sql |
| `public.todos` | `public_allow_all_todos` | full_schema_contract.sql |
| `qms.quality_inspections` | `qms_allow_all_quality_inspections` | full_schema_contract.sql |
| `qms.quality_standards` | `qms_allow_all_quality_standards` | full_schema_contract.sql |
| `rs.formulas` | `rs_allow_all_formulas` | full_schema_contract.sql |

这些是快照滞后产生的陈旧定义（`rls_global_read`、`*_allow_all_*`、已改名表），**不得作为回迁依据**。

## 4. 方法与已知偏差

1. 重放基于生产最终 schema。老迁移里 `tenant_id = current_setting(...)` 在 uuid 列上会报
   `operator does not exist: uuid = text`（4 个文件），这些策略随后被更新迁移覆盖，故不影响最终态；
   未覆盖的个别表会表现为「生产独有」，已归入 §3.3。
2. 少数最新迁移带「前置断言」，依赖生产当时的策略状态；在 scratch 重放时会中止该断言块，
   但同一文件里独立的 `CREATE POLICY` 块仍会执行。已知受影响的只有 `20261118150000` 的 3 张表
   及其断言，不影响本报告主口径。
3. flow 12 张影子副本的 `RENAME` 未在「仅策略 DDL」重放中执行，故 §3.2 的 391 张原始统计里
   包含 18 张 `flow.*`；严格口径已剔除。
4. 生产 RLS 关闭、仓库只新增策略的 55 张表不计入「更宽松」：重建后如果有 `ENABLE RLS`，
   行为反而更严；需在回迁迁移里逐表确认 `ENABLE/FORCE` 与代码路径。
5. `public.core_doc_documents` 在仓库重建链上会回落为宽松策略，生产则已是严格范式：
   - `20260908000016_rls_enable_all.sql` 创建 `rls_tenant_isolation`，基于
     `app.current_tenant_id`，未设置即放行；
   - `20261015000076_rls_tenant_policy_batch_app.sql` 又追加
     `tenant_isolation_core_doc_documents`，保留 `tenant_id IS NULL` 与 nil 租户放行分支；
   - 两条 FOR ALL 策略按 **OR 合并**，任一命中即放行；且都不含 `app.rls_system` 系统通道。
   生产实际只有严格版 `tenant_isolation_core_doc_documents`
   （`COALESCE(app.rls_system,'off')='on' OR tenant_id = NULLIF(app.tenant_id,'')::uuid`，
   ENABLE/FORCE 均为 true），因此重建库比生产更宽松。回迁时需 DROP 旧的
   `rls_tenant_isolation` 并按 §5.2 模板收敛。

## 5. 回迁建议（仅登记，不在本轮实施）

1. **不要按快照回迁**，按本报告 §3.2 的表清单逐表生成前向迁移：
   `DROP POLICY tenant_isolation_<t>` + `CREATE POLICY rls_tenant_isolation ... `
   （或保留原名 `ALTER POLICY ... USING (...)`，优先后者，避免代码/审计按名引用断链）。
2. 统一模板采用生产的严格范式：`app.rls_system` 通道 + `tenant_id = NULLIF(app.tenant_id, '')::uuid`，
   **不保留** `tenant_id IS NULL` 与全零租户分支；平台语料表单独走哨兵租户 + 平台通道白名单。
3. 这批迁移会**改动生产策略**，必须单独开窗、分批 apply、每批 A/B 对抗读数；本轮只登记 TODO，不实施。
4. 回迁前先确认 55 张「生产 RLS 关闭」表的真实访问路径，避免只补策略未启 RLS 造成假隔离。

## 附录 A：仓库更宽松的 318 张表

| schema.table | 仓库开放特征 | 生产开放特征 | 生产策略 | 仓库策略 |
|---|---|---|---|---|
| `analytics.analytics_comparison_analyses` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_comparison_analyses | tenant_isolation_analytics_comparison_analyses |
| `analytics.analytics_comparison_results` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_comparison_results | tenant_isolation_analytics_comparison_results |
| `analytics.analytics_dashboard_shares` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_dashboard_shares | tenant_isolation_analytics_dashboard_shares |
| `analytics.analytics_dashboard_templates` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_dashboard_templates | tenant_isolation_analytics_dashboard_templates |
| `analytics.analytics_dashboards` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_dashboards | tenant_isolation_analytics_dashboards |
| `analytics.analytics_datasources` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_datasources | tenant_isolation_analytics_datasources |
| `analytics.analytics_drilldown_history` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_drilldown_history | tenant_isolation_analytics_drilldown_history |
| `analytics.analytics_drilldown_paths` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_drilldown_paths | tenant_isolation_analytics_drilldown_paths |
| `analytics.analytics_row_level_permissions` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_row_level_permissions | tenant_isolation_analytics_row_level_permissions |
| `analytics.analytics_self_service_reports` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_self_service_reports | tenant_isolation_analytics_self_service_reports |
| `analytics.analytics_widgets` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_widgets | tenant_isolation_analytics_widgets |
| `analytics.report_execution_records` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_report_execution_records |
| `bi.analytics_dashboards` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_dashboards | tenant_isolation_analytics_dashboards |
| `bi.analytics_datasources` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_datasources | tenant_isolation_analytics_datasources |
| `bi.analytics_widgets` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_analytics_widgets | tenant_isolation_analytics_widgets |
| `bi.audit_logs` | NULL_ROW,ZERO_TENANT | ALLOW_TRUE | bi_allow_all_audit_logs | tenant_isolation_audit_logs |
| `bi.report_schedules` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_report_schedules |
| `bi.report_subscriptions` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_report_subscriptions |
| `bi.report_templates` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_report_templates | tenant_isolation_report_templates |
| `bi.reports` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_reports |
| `communication.core_email_templates` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_core_email_templates |
| `communication.core_notification_deliveries` | EMPTY_GUC,NULL_ROW | — | notification_deliveries_tenant_isolation | notification_deliveries_tenant_isolation,tenant_isolation_core_notification_deliveries |
| `communication.core_notification_preferences` | EMPTY_GUC,NULL_ROW | — | notification_preferences_tenant_isolation | notification_preferences_tenant_isolation,tenant_isolation_core_notification_preferences |
| `communication.core_notification_subscriptions` | EMPTY_GUC,NULL_ROW | — | notification_subscriptions_tenant_isolation | notification_subscriptions_tenant_isolation,tenant_isolation_core_notification_subscriptions |
| `communication.notification_channels` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_notification_channels | rls_tenant_isolation,tenant_isolation_notification_channels |
| `core.ai_conversations` | NULL_ROW,ZERO_TENANT | — | ai_conversations_tenant_isolation,tenant_isolation_ai_conversations | ai_conversations_tenant_isolation,tenant_isolation_ai_conversations |
| `core.ai_faqs` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_ai_faqs | tenant_isolation_ai_faqs,tenant_isolation_core_ai_faqs |
| `core.knowledge_bases` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_knowledge_bases |
| `core.knowledge_chunks` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_knowledge_chunks |
| `core.knowledge_documents` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_knowledge_documents |
| `core.knowledge_qa_history` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_knowledge_qa_history |
| `core.user_preferences` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_user_preferences | tenant_isolation_user_preferences |
| `crm.contacts` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_contacts | tenant_isolation_contacts |
| `crm.contracts` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_contracts | tenant_isolation_contracts |
| `crm.customer_finance` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_customer_finance | rls_tenant_isolation,tenant_isolation_customer_finance |
| `crm.customer_orders` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_customer_orders |
| `crm.customer_recommendations` | NULL_ROW | — | tenant_isolation_customer_recommendations | tenant_isolation_customer_recommendations |
| `crm.customer_scores` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_customer_scores |
| `crm.customer_segments` | NULL_ROW | — | tenant_isolation_customer_segments | tenant_isolation_customer_segments |
| `crm.customer_tags` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_customer_tags | tenant_isolation_customer_tags |
| `crm.interactions` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_interactions | tenant_isolation_interactions |
| `crm.opportunities` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_opportunities | tenant_isolation_opportunities |
| `crm.return_items` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_return_items |
| `crm.sales_forecasts` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_sales_forecasts |
| `crm.sales_orders` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_sales_orders |
| `crm.tags` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_tags | tenant_isolation_tags |
| `erp.announcements` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_announcements | rls_tenant_isolation,tenant_isolation_announcements |
| `erp.assets` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_assets | tenant_isolation_assets |
| `erp.bank_accounts` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_bank_accounts | tenant_isolation_bank_accounts |
| `erp.documents` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_documents |
| `erp.erp_production_orders` | NULL_ROW | — | tenant_isolation | tenant_isolation_erp_production_orders |
| `erp.event_idempotency` | NULL_ROW | — | tenant_isolation | tenant_isolation_event_idempotency |
| `erp.expenses` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_expenses |
| `erp.fin_reconciliations` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_fin_reconciliations | tenant_isolation_fin_reconciliations |
| `erp.inventory` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_inventory | tenant_isolation_inventory |
| `erp.inventory_items` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_inventory_items | tenant_isolation_inventory_items |
| `erp.materials` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_materials | tenant_isolation_materials |
| `erp.meeting_bookings` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_meeting_bookings |
| `erp.meeting_rooms` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_meeting_rooms |
| `erp.purchase_orders` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_purchase_orders | tenant_isolation_purchase_orders |
| `erp.vehicle_requests` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_vehicle_requests |
| `erp.vehicles` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_vehicles |
| `erp.voucher_items` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_voucher_items | rls_tenant_isolation,tenant_isolation_voucher_items |
| `erp.vouchers` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_vouchers |
| `hrm.attendance_records` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_attendance_records | tenant_isolation_attendance_records |
| `hrm.candidates` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_candidates | tenant_isolation_candidates |
| `hrm.companies` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_companies | tenant_isolation_companies |
| `hrm.contract_renewals` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_contract_renewals | tenant_isolation_contract_renewals |
| `hrm.contracts` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_contracts | tenant_isolation_contracts |
| `hrm.departments` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_departments | tenant_isolation_departments |
| `hrm.employees` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_employees | rls_tenant_isolation,tenant_isolation_employees |
| `hrm.hrm_cache_invalidation_logs` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation | tenant_isolation,tenant_isolation_hrm_cache_invalidation_logs |
| `hrm.hrm_master_data_refs` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_hrm_master_data_refs |
| `hrm.initialization_status` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_initialization_status | tenant_isolation_initialization_status |
| `hrm.interviews` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_interviews | tenant_isolation_interviews |
| `hrm.job_openings` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_job_openings | tenant_isolation_job_openings |
| `hrm.leave_records` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_leave_records | tenant_isolation_leave_records |
| `hrm.module_settings` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_module_settings |
| `hrm.payroll_details` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_payroll_details | tenant_isolation_payroll_details |
| `hrm.payroll_items` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_payroll_items | tenant_isolation_payroll_items |
| `hrm.payroll_records` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_payroll_records | tenant_isolation_payroll_records |
| `hrm.payroll_runs` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_payroll_runs | tenant_isolation_payroll_runs |
| `hrm.performance_goals` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_performance_goals | tenant_isolation_performance_goals |
| `hrm.performance_records` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_performance_records | tenant_isolation_performance_records |
| `hrm.performance_reviews` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_performance_reviews | tenant_isolation_performance_reviews |
| `hrm.positions` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_positions | tenant_isolation_positions |
| `hrm.recruitment_applications` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_recruitment_applications | tenant_isolation_recruitment_applications |
| `hrm.recruitment_records` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_recruitment_records | tenant_isolation_recruitment_records |
| `hrm.salary_adjustments` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_salary_adjustments | tenant_isolation_salary_adjustments |
| `hrm.training_courses` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_training_courses | tenant_isolation_training_courses |
| `hrm.training_participants` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_training_participants | tenant_isolation_training_participants |
| `hrm.training_plans` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_training_plans | tenant_isolation_training_plans |
| `hrm.training_records` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_training_records | tenant_isolation_training_records |
| `iam.crm_dashboard_snapshots` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_crm_dashboard_snapshots |
| `iam.data_permissions` | NULL_ROW | — | tenant_isolation_data_permissions | tenant_isolation_data_permissions |
| `iam.ehs_dashboard_snapshots` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_ehs_dashboard_snapshots |
| `iam.hrm_dashboard_snapshots` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_hrm_dashboard_snapshots |
| `iam.lims_dashboard_snapshots` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_lims_dashboard_snapshots |
| `iam.pdm_dashboard_snapshots` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_pdm_dashboard_snapshots |
| `iam.permission_audit_logs` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_permission_audit_logs | rls_tenant_isolation,tenant_isolation_permission_audit_logs |
| `iam.permission_templates` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_permission_templates | tenant_isolation_permission_templates |
| `iam.position_permissions` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_position_permissions | tenant_isolation_position_permissions |
| `iam.position_roles` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_position_roles | tenant_isolation_position_roles |
| `iam.positions` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_positions | tenant_isolation_positions |
| `iam.resource_permissions` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_resource_permissions | tenant_isolation_resource_permissions |
| `iam.tenant_users` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_tenant_users | tenant_isolation_tenant_users |
| `iam.user_positions` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_user_positions | tenant_isolation_user_positions |
| `iam.wms_dashboard_snapshots` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_wms_dashboard_snapshots |
| `master_data.materials` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_materials | rls_tenant_isolation,tenant_isolation_materials |
| `master_data.mdm_ai_models` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_mdm_ai_models,tenant_isolation_policy | tenant_isolation_mdm_ai_models,tenant_isolation_policy |
| `master_data.mdm_ai_suggestions` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_mdm_ai_suggestions,tenant_isolation_policy | tenant_isolation_mdm_ai_suggestions,tenant_isolation_policy |
| `master_data.mdm_api_exposures` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_api_exposures,tenant_isolation_policy |
| `master_data.mdm_api_products` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | mdm_api_products_tenant_policy | mdm_api_products_tenant_policy,tenant_isolation_mdm_api_products |
| `master_data.mdm_assets` | NULL_ROW | — | mdm_assets_tenant_policy | tenant_isolation_mdm_assets |
| `master_data.mdm_audit_events` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_audit_events,tenant_isolation_policy |
| `master_data.mdm_audit_export_logs` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_audit_export_logs,tenant_isolation_policy |
| `master_data.mdm_auto_fix_actions` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_auto_fix_actions,tenant_isolation_policy |
| `master_data.mdm_bc_tests` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_bc_tests,tenant_isolation_policy |
| `master_data.mdm_billing_records` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_mdm_billing_records,tenant_isolation_policy |
| `master_data.mdm_change_events` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | mdm_change_events_tenant_policy | mdm_change_events_tenant_policy,tenant_isolation_mdm_change_events |
| `master_data.mdm_classification_models` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_mdm_classification_models,tenant_isolation_policy | tenant_isolation_mdm_classification_models,tenant_isolation_policy |
| `master_data.mdm_classification_results` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_mdm_classification_results,tenant_isolation_policy | tenant_isolation_mdm_classification_results,tenant_isolation_policy |
| `master_data.mdm_classifier_rules` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_mdm_classifier_rules,tenant_isolation_policy | tenant_isolation_mdm_classifier_rules,tenant_isolation_policy |
| `master_data.mdm_continuity_plans` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_continuity_plans,tenant_isolation_policy |
| `master_data.mdm_critical_functions` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_critical_functions,tenant_isolation_policy |
| `master_data.mdm_data_asset_categories` | NULL_ROW | — | mdm_data_asset_categories_tenant_policy | tenant_isolation_mdm_data_asset_categories |
| `master_data.mdm_data_contracts` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_data_contracts,tenant_isolation_policy |
| `master_data.mdm_data_permissions` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_data_permissions,tenant_isolation_policy |
| `master_data.mdm_data_products` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_data_products,tenant_isolation_policy |
| `master_data.mdm_dimension_scores` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_dimension_scores,tenant_isolation_policy |
| `master_data.mdm_failover_records` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_failover_records,tenant_isolation_policy |
| `master_data.mdm_fix_strategies` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_fix_strategies,tenant_isolation_policy |
| `master_data.mdm_governance_insights` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_governance_insights,tenant_isolation_policy |
| `master_data.mdm_governance_suggestions` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_governance_suggestions,tenant_isolation_policy |
| `master_data.mdm_graph_communities` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_graph_communities,tenant_isolation_policy |
| `master_data.mdm_graph_edges` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_graph_edges,tenant_isolation_policy |
| `master_data.mdm_graph_nodes` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_graph_nodes,tenant_isolation_policy |
| `master_data.mdm_impact_analyses` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | mdm_impact_analyses_tenant_policy | mdm_impact_analyses_tenant_policy,tenant_isolation_mdm_impact_analyses |
| `master_data.mdm_impact_simulations` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | mdm_impact_simulations_tenant_policy | mdm_impact_simulations_tenant_policy,tenant_isolation_mdm_impact_simulations |
| `master_data.mdm_improvement_plans` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_improvement_plans,tenant_isolation_policy |
| `master_data.mdm_interactions` | NULL_ROW | — | mdm_interactions_tenant_policy | tenant_isolation_mdm_interactions |
| `master_data.mdm_kg_edges` | NULL_ROW | — | mdm_kg_edges_tenant_policy | tenant_isolation_mdm_kg_edges |
| `master_data.mdm_kg_graphs` | NULL_ROW | — | mdm_kg_graphs_tenant_policy | tenant_isolation_mdm_kg_graphs |
| `master_data.mdm_kg_nodes` | NULL_ROW | — | mdm_kg_nodes_tenant_policy | tenant_isolation_mdm_kg_nodes |
| `master_data.mdm_lifecycle_history` | ALLOW_TRUE,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | master_data_allow_all_mdm_lifecycle_history,tenant_isolation_policy |
| `master_data.mdm_lifecycle_policies` | ALLOW_TRUE,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | master_data_allow_all_mdm_lifecycle_policies,tenant_isolation_policy |
| `master_data.mdm_lifecycle_stages` | ALLOW_TRUE,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | master_data_allow_all_mdm_lifecycle_stages,tenant_isolation_policy |
| `master_data.mdm_lineage_edges` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | mdm_lineage_edges_tenant_policy | mdm_lineage_edges_tenant_policy,tenant_isolation_mdm_lineage_edges |
| `master_data.mdm_lineage_graphs` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | mdm_lineage_graphs_tenant_policy | mdm_lineage_graphs_tenant_policy,tenant_isolation_mdm_lineage_graphs |
| `master_data.mdm_lineage_nodes` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | mdm_lineage_nodes_tenant_policy | mdm_lineage_nodes_tenant_policy,tenant_isolation_mdm_lineage_nodes |
| `master_data.mdm_match_results` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_mdm_match_results,tenant_isolation_policy | tenant_isolation_mdm_match_results,tenant_isolation_policy |
| `master_data.mdm_match_rules` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_mdm_match_rules,tenant_isolation_policy | tenant_isolation_mdm_match_rules,tenant_isolation_policy |
| `master_data.mdm_maturity_assessments` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_maturity_assessments,tenant_isolation_policy |
| `master_data.mdm_maturity_history` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_maturity_history,tenant_isolation_policy |
| `master_data.mdm_metadata_attributes` | ALLOW_TRUE,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | master_data_allow_all_mdm_metadata_attributes,tenant_isolation_policy |
| `master_data.mdm_metadata_tags` | ALLOW_TRUE,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | master_data_allow_all_mdm_metadata_tags,tenant_isolation_policy |
| `master_data.mdm_permission_roles` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_permission_roles,tenant_isolation_policy |
| `master_data.mdm_propagation_logs` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | mdm_propagation_logs_tenant_policy | mdm_propagation_logs_tenant_policy,tenant_isolation_mdm_propagation_logs |
| `master_data.mdm_propagation_rules` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | mdm_propagation_rules_tenant_policy | mdm_propagation_rules_tenant_policy,tenant_isolation_mdm_propagation_rules |
| `master_data.mdm_quality_checks` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_quality_checks,tenant_isolation_policy |
| `master_data.mdm_quality_loop_configs` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_quality_loop_configs,tenant_isolation_policy |
| `master_data.mdm_rate_cards` | ALLOW_TRUE,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | master_data_allow_all_mdm_rate_cards,tenant_isolation_policy |
| `master_data.mdm_recommendations` | NULL_ROW | — | mdm_recommendations_tenant_policy | tenant_isolation_mdm_recommendations |
| `master_data.mdm_recovery_plans` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_recovery_plans,tenant_isolation_policy |
| `master_data.mdm_recovery_points` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_recovery_points,tenant_isolation_policy |
| `master_data.mdm_region_configs` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_region_configs,tenant_isolation_policy |
| `master_data.mdm_replication_configs` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_replication_configs,tenant_isolation_policy |
| `master_data.mdm_search_history` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_search_history,tenant_isolation_policy |
| `master_data.mdm_search_indexes` | NULL_ROW | — | mdm_search_indexes_tenant_policy | tenant_isolation_mdm_search_indexes |
| `master_data.mdm_semantic_search_indexes` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_semantic_search_indexes,tenant_isolation_policy |
| `master_data.mdm_sla_configs` | ALLOW_TRUE,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | master_data_allow_all_mdm_sla_configs,tenant_isolation_policy |
| `master_data.mdm_sla_incidents` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_mdm_sla_incidents,tenant_isolation_policy |
| `master_data.mdm_sla_measurements` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_mdm_sla_measurements,tenant_isolation_policy |
| `master_data.mdm_subscriptions` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | mdm_subscriptions_tenant_policy,tenant_isolation_mdm_subscriptions |
| `master_data.mdm_supplier_categories` | NULL_ROW | — | tenant_isolation_mdm_supplier_categories | tenant_isolation_mdm_supplier_categories |
| `master_data.mdm_suppliers` | NULL_ROW | — | tenant_isolation_mdm_suppliers | tenant_isolation_mdm_suppliers |
| `master_data.mdm_sync_dead_letter` | NULL_ROW | — | tenant_isolation_mdm_sync_dead_letter | tenant_isolation_mdm_sync_dead_letter |
| `master_data.mdm_tag_rules` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_tag_rules,tenant_isolation_policy |
| `master_data.mdm_tagged_entities` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_tagged_entities,tenant_isolation_policy |
| `master_data.mdm_tags` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_tags,tenant_isolation_policy |
| `master_data.mdm_usage_records` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_mdm_usage_records,tenant_isolation_policy |
| `master_data.mdm_user_role_assignments` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_user_role_assignments,tenant_isolation_policy |
| `master_data.mdm_v60_lineage_edges` | ALLOW_TRUE,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | master_data_allow_all_mdm_v60_lineage_edges,tenant_isolation_policy |
| `master_data.mdm_v60_lineage_graphs` | ALLOW_TRUE,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | master_data_allow_all_mdm_v60_lineage_graphs,tenant_isolation_policy |
| `master_data.mdm_v60_lineage_nodes` | ALLOW_TRUE,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | master_data_allow_all_mdm_v60_lineage_nodes,tenant_isolation_policy |
| `master_data.mdm_version_branches` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_version_branches,tenant_isolation_policy |
| `master_data.mdm_version_snapshots` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | mdm_version_snapshots_tenant_policy | mdm_version_snapshots_tenant_policy,tenant_isolation_mdm_version_snapshots |
| `master_data.mdm_workflow_history` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_workflow_history,tenant_isolation_policy |
| `master_data.mdm_workflow_templates` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_workflow_templates,tenant_isolation_policy |
| `master_data.mdm_workflows` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | tenant_isolation_policy | tenant_isolation_mdm_workflows,tenant_isolation_policy |
| `master_data.samples` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_samples | rls_tenant_isolation,tenant_isolation_samples |
| `master_data.uoms` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_uoms | rls_tenant_isolation,tenant_isolation_uoms |
| `mes.equipment` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_equipment |
| `mes.equipment_inspection_records` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_equipment_inspection_records |
| `mes.equipment_maintenance_records` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_equipment_maintenance_records |
| `mes.material_plans` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_material_plans |
| `mes.module_settings` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_module_settings |
| `mes.process_route_steps` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_process_route_steps |
| `mes.process_routes` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_process_routes |
| `mes.production_orders` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_production_orders |
| `mes.production_processes` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_production_processes |
| `mes.production_records` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_production_records |
| `mes.quality_standards` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_quality_standards |
| `mes.work_stations` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_work_stations |
| `plugin_finance.accounting_subjects` | NULL_ROW | — | tenant_isolation_accounting_subjects | tenant_isolation_accounting_subjects |
| `plugin_finance.difference_adjustments` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_difference_adjustments | tenant_isolation_difference_adjustments |
| `plugin_finance.reconciliation_item_snapshots` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_reconciliation_item_snapshots | tenant_isolation_reconciliation_item_snapshots |
| `plugin_finance.reconciliation_settlement_links` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_reconciliation_settlement_links | tenant_isolation_reconciliation_settlement_links |
| `plugin_finance.reconciliation_snapshots` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_reconciliation_snapshots | tenant_isolation_reconciliation_snapshots |
| `plugin_finance.settlement_snapshots` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_settlement_snapshots | tenant_isolation_settlement_snapshots |
| `plugin_mes.audit_logs` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_audit_logs |
| `portal.portal_announcements` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_portal_announcements |
| `portal.portal_dashboard_stats` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_portal_dashboard_stats | tenant_isolation_portal_dashboard_stats |
| `portal.portal_notifications` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_portal_notifications | tenant_isolation_portal_notifications |
| `public._archive_core_workflow_instances` | NULL_ROW | — | tenant_isolation_core_workflow_instances | tenant_isolation__archive_core_workflow_instances |
| `public._archive_core_workflow_versions` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_core_workflow_versions | rls_tenant_isolation,tenant_isolation__archive_core_workflow_versions,tenant_isolation_core_workflow_versions |
| `public.alerts` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_alerts |
| `public.approval_records` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_approval_records |
| `public.approvals` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_approvals |
| `public.automation_rules` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_automation_rules |
| `public.automation_runs` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_automation_runs |
| `public.automation_variables` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_automation_variables |
| `public.core_doc_documents` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_doc_documents | tenant_isolation_core_doc_documents |
| `public.core_doc_folders` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_doc_folders | tenant_isolation_core_doc_folders |
| `public.core_doc_templates` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_doc_templates | tenant_isolation_core_doc_templates |
| `public.core_email_queue` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_core_email_queue |
| `public.core_emails` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_emails | tenant_isolation_core_emails |
| `public.core_faqs` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_core_faqs |
| `public.core_file_folders` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_file_folders | tenant_isolation_core_file_folders |
| `public.core_finance_accounts` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_finance_accounts | tenant_isolation_core_finance_accounts |
| `public.core_finance_vouchers` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_finance_vouchers | tenant_isolation_core_finance_vouchers |
| `public.core_flow_categories` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_flow_categories | tenant_isolation_core_flow_categories |
| `public.core_flow_delegates` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_core_flow_delegates |
| `public.core_flow_rules` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_core_flow_rules |
| `public.core_flow_variable_history` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_core_flow_variable_history |
| `public.core_flow_variables` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_core_flow_variables |
| `public.core_guide_lessons` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_guide_lessons | tenant_isolation_core_guide_lessons |
| `public.core_guide_progress` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_guide_progress | tenant_isolation_core_guide_progress |
| `public.core_guides` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_core_guides |
| `public.core_inter_module_sync` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_inter_module_sync | tenant_isolation_core_inter_module_sync |
| `public.core_master_data_change_log` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_master_data_change_log | tenant_isolation_core_master_data_change_log |
| `public.core_master_data_refs` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_master_data_refs | tenant_isolation_core_master_data_refs |
| `public.core_mdm_approvals` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_mdm_approvals | tenant_isolation_core_mdm_approvals |
| `public.core_mdm_reconciliation_log` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_mdm_reconciliation_log | tenant_isolation_core_mdm_reconciliation_log |
| `public.core_migration_history` | NULL_ROW | — | tenant_isolation_core_migration_history | tenant_isolation_core_migration_history |
| `public.core_notification_templates` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_notification_templates | tenant_isolation_core_notification_templates |
| `public.core_notifications` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_notifications | tenant_isolation_core_notifications |
| `public.core_tenant_modules` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_tenant_modules | tenant_isolation_core_tenant_modules |
| `public.core_tenant_usage` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_core_tenant_usage | tenant_isolation_core_tenant_usage |
| `public.core_workflow_versions` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_core_workflow_versions |
| `public.core_workflows` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_core_workflows |
| `public.cqrs_events` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_cqrs_events | tenant_isolation_cqrs_events |
| `public.crm_dashboard_snapshots` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_crm_dashboard_snapshots | tenant_isolation_crm_dashboard_snapshots |
| `public.dynamic_data` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_dynamic_data |
| `public.ehs_dashboard_snapshots` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_ehs_dashboard_snapshots | tenant_isolation_ehs_dashboard_snapshots |
| `public.finance_voucher_templates` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_finance_voucher_templates | tenant_isolation_finance_voucher_templates |
| `public.financial_reports` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_financial_reports | tenant_isolation_financial_reports |
| `public.hrm_dashboard_snapshots` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_hrm_dashboard_snapshots | tenant_isolation_hrm_dashboard_snapshots |
| `public.lims_dashboard_snapshots` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_lims_dashboard_snapshots | tenant_isolation_lims_dashboard_snapshots |
| `public.monitor_settings` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_monitor_settings |
| `public.pdm_change_notices` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_pdm_change_notices | tenant_isolation_pdm_change_notices |
| `public.pdm_dashboard_snapshots` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_pdm_dashboard_snapshots | tenant_isolation_pdm_dashboard_snapshots |
| `public.pdm_materials` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_pdm_materials | tenant_isolation_pdm_materials |
| `public.pdm_products` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_pdm_products | tenant_isolation_pdm_products |
| `public.permission_audit_logs` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_permission_audit_logs |
| `public.schema_registry` | NULL_ROW | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_schema_registry |
| `public.search_entity_projections` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_search_entity_projections | tenant_isolation_search_entity_projections |
| `public.search_logs` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_search_logs |
| `public.system_settings` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_system_settings |
| `public.tenant_permissions` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation,tenant_isolation_tenant_permissions | rls_tenant_isolation,tenant_isolation_tenant_permissions |
| `public.wms_dashboard_snapshots` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_wms_dashboard_snapshots | tenant_isolation_wms_dashboard_snapshots |
| `qms.qa_alert_messages` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_qa_alert_messages | tenant_isolation_qa_alert_messages |
| `qms.qa_alert_rules` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_qa_alert_rules | tenant_isolation_qa_alert_rules |
| `qms.qa_approval_events` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_qa_approval_events | tenant_isolation_qa_approval_events |
| `qms.qa_apqp_phases` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_qa_apqp_phases | tenant_isolation_qa_apqp_phases |
| `qms.qa_apqp_projects` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_qa_apqp_projects | tenant_isolation_qa_apqp_projects |
| `qms.qa_apqp_risks` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_qa_apqp_risks | tenant_isolation_qa_apqp_risks |
| `qms.qa_apqp_tasks` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_qa_apqp_tasks | tenant_isolation_qa_apqp_tasks |
| `qms.qa_audit_findings` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_audit_findings | tenant_isolation_qa_audit_findings |
| `qms.qa_audit_plans` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_audit_plans | tenant_isolation_qa_audit_plans |
| `qms.qa_audit_tasks` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_audit_tasks | tenant_isolation_qa_audit_tasks |
| `qms.qa_corrective_action_items` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_corrective_action_items | tenant_isolation_qa_corrective_action_items |
| `qms.qa_corrective_actions` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_corrective_actions | tenant_isolation_qa_corrective_actions |
| `qms.qa_ehs_hazards` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_qa_ehs_hazards |
| `qms.qa_eightd_audit_logs` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_eightd_audit_logs | tenant_isolation_qa_eightd_audit_logs |
| `qms.qa_eightd_reports` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_eightd_reports | tenant_isolation_qa_eightd_reports |
| `qms.qa_fmea_analyses` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_fmea_analyses | tenant_isolation_qa_fmea_analyses |
| `qms.qa_fmea_items` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_fmea_items | tenant_isolation_qa_fmea_items |
| `qms.qa_inspection_audits` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_inspection_audits | tenant_isolation_qa_inspection_audits |
| `qms.qa_inspection_results` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_inspection_results | tenant_isolation_qa_inspection_results |
| `qms.qa_qms_sync_records` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_qms_sync_records | tenant_isolation_qa_qms_sync_records |
| `qms.qa_quality_costs` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_quality_costs | tenant_isolation_qa_quality_costs |
| `qms.qa_quality_inspections` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_quality_inspections | tenant_isolation_qa_quality_inspections |
| `qms.qa_quality_issues` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_quality_issues | tenant_isolation_qa_quality_issues |
| `qms.qa_spc_charts` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_spc_charts | tenant_isolation_qa_spc_charts |
| `qms.qa_spc_data_points` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_spc_data_points | tenant_isolation_qa_spc_data_points |
| `qms.qa_standard_revisions` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_standard_revisions | tenant_isolation_qa_standard_revisions |
| `qms.qa_standards` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_qa_standards | tenant_isolation_qa_standards |
| `rs.audit_logs` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_audit_logs |
| `rs.change_orders` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_change_orders | tenant_isolation_change_orders |
| `rs.change_requests` | NULL_ROW | — | rls_tenant_isolation,tenant_isolation_change_requests | tenant_isolation_change_requests |
| `rs.experiments` | NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | tenant_isolation_experiments |
| `rs.formula_versions` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_formula_versions |
| `rs.material_tests` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_material_tests | tenant_isolation_material_tests |
| `rs.module_settings` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_module_settings |
| `rs.project_members` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_project_members | tenant_isolation_project_members |
| `rs.project_milestones` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_project_milestones | tenant_isolation_project_milestones |
| `rs.project_phases` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_project_phases | tenant_isolation_project_phases |
| `rs.projects` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_projects | tenant_isolation_projects |
| `rs.rs_experiments` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_rs_experiments | tenant_isolation_rs_experiments |
| `rs.rs_formulas` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_rs_formulas | tenant_isolation_rs_formulas |
| `rs.rs_projects` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_rs_projects | tenant_isolation_rs_projects |
| `ticket.ticket_attachments` | EMPTY_GUC,NULL_ROW,ZERO_TENANT | — | rls_tenant_isolation | rls_tenant_isolation,tenant_isolation_ticket_attachments |
| `tms.carriers` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_carriers | tenant_isolation_carriers |
| `tms.drivers` | NULL_ROW,ZERO_TENANT | — | tenant_isolation_drivers | tenant_isolation_drivers |
| `tms.tms_routes` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_tms_routes |
| `tms.tms_shipments` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_tms_shipments |
| `unified_core.inter_module_sync` | NULL_ROW | — | rls_tenant_isolation | tenant_isolation_inter_module_sync |

## 附录 B：生产独有 / 仓库独有策略清单

### B.1 生产独有（仓库侧同表不同名）

| schema.table | 策略 | cmd | qual |
|---|---|---|---|
| `bi.audit_logs` | `bi_allow_all_audit_logs` | ALL | `true` |
| `bi.report_schedules` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `bi.report_templates` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `bi.reports` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `communication.core_email_templates` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `core.knowledge_bases` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `core.knowledge_chunks` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `core.knowledge_documents` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `core.knowledge_qa_history` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `crm.contacts` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `crm.customer_orders` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `crm.customer_scores` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `crm.customer_tags` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `crm.interactions` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `crm.opportunities` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `crm.return_items` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `crm.sales_forecasts` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `crm.tags` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.assets` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.erp_production_orders` | `tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.event_idempotency` | `tenant_isolation` | ALL | `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)` |
| `erp.fin_reconciliations` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.inventory` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.materials` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `erp.purchase_orders` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.attendance_records` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.candidates` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.companies` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.contract_renewals` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.contracts` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.departments` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.hrm_master_data_refs` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.interviews` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.job_openings` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.leave_records` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.payroll_details` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.payroll_items` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.payroll_records` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.payroll_runs` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.performance_goals` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.performance_records` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.performance_reviews` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.positions` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.recruitment_applications` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.recruitment_records` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.salary_adjustments` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.training_courses` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.training_participants` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.training_plans` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `hrm.training_records` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `iam.position_permissions` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `iam.position_roles` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `iam.positions` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `iam.resource_permissions` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `iam.user_positions` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_assets` | `mdm_assets_tenant_policy` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_billing_records` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_data_asset_categories` | `mdm_data_asset_categories_tenant_policy` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_interactions` | `mdm_interactions_tenant_policy` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_kg_edges` | `mdm_kg_edges_tenant_policy` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_kg_graphs` | `mdm_kg_graphs_tenant_policy` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_kg_nodes` | `mdm_kg_nodes_tenant_policy` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_recommendations` | `mdm_recommendations_tenant_policy` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_search_indexes` | `mdm_search_indexes_tenant_policy` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_sla_incidents` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_sla_measurements` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_subscriptions` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `master_data.mdm_usage_records` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `plugin_mes.audit_logs` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `public._archive_core_workflow_instances` | `tenant_isolation_core_workflow_instances` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `public.automation_rules` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `public.automation_runs` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `public.automation_variables` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `public.core_faqs` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `public.core_guides` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `public.system_settings` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_audit_findings` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_audit_plans` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_audit_tasks` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_corrective_action_items` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_corrective_actions` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_ehs_hazards` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_eightd_audit_logs` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_eightd_reports` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_fmea_analyses` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_fmea_items` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_inspection_audits` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_inspection_results` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_qms_sync_records` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_quality_costs` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_quality_inspections` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_quality_issues` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_spc_charts` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_spc_data_points` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_standard_revisions` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `qms.qa_standards` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `rs.audit_logs` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `rs.change_requests` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `rs.experiments` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `rs.formula_versions` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `tms.tms_routes` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `tms.tms_shipments` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |
| `unified_core.inter_module_sync` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` |

### B.2 仓库独有

| schema.table | 策略 | cmd | qual | 影子副本 |
|---|---|---|---|---|
| `analytics.report_execution_records` | `tenant_isolation_report_execution_records` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `bi.audit_logs` | `tenant_isolation_audit_logs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `bi.report_schedules` | `tenant_isolation_report_schedules` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `bi.report_subscriptions` | `tenant_isolation_report_subscriptions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `bi.reports` | `tenant_isolation_reports` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `communication.core_email_templates` | `tenant_isolation_core_email_templates` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `communication.core_notification_deliveries` | `tenant_isolation_core_notification_deliveries` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `communication.core_notification_preferences` | `tenant_isolation_core_notification_preferences` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `communication.core_notification_subscriptions` | `tenant_isolation_core_notification_subscriptions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `core.ai_faqs` | `tenant_isolation_ai_faqs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `core.knowledge_bases` | `tenant_isolation_knowledge_bases` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `core.knowledge_chunks` | `tenant_isolation_knowledge_chunks` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `core.knowledge_documents` | `tenant_isolation_knowledge_documents` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `core.knowledge_qa_history` | `tenant_isolation_knowledge_qa_history` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `crm.customer_orders` | `tenant_isolation_customer_orders` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `crm.customer_scores` | `tenant_isolation_customer_scores` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `crm.return_items` | `tenant_isolation_return_items` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `crm.sales_forecasts` | `tenant_isolation_sales_forecasts` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `crm.sales_orders` | `tenant_isolation_sales_orders` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `erp.documents` | `tenant_isolation_documents` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `erp.erp_production_orders` | `tenant_isolation_erp_production_orders` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `erp.event_idempotency` | `tenant_isolation_event_idempotency` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `erp.expenses` | `tenant_isolation_expenses` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `erp.meeting_bookings` | `tenant_isolation_meeting_bookings` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `erp.meeting_rooms` | `tenant_isolation_meeting_rooms` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `erp.vehicle_requests` | `tenant_isolation_vehicle_requests` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `erp.vehicles` | `tenant_isolation_vehicles` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `erp.vouchers` | `tenant_isolation_vouchers` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `flow.core_doc_documents` | `tenant_isolation_core_doc_documents` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | Y |
| `flow.core_doc_folders` | `tenant_isolation_core_doc_folders` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | Y |
| `flow.core_doc_templates` | `tenant_isolation_core_doc_templates` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | Y |
| `flow.core_flow_categories` | `tenant_isolation_core_flow_categories` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | Y |
| `flow.core_master_data_change_log` | `tenant_isolation_core_master_data_change_log` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | Y |
| `flow.core_master_data_refs` | `tenant_isolation_core_master_data_refs` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `flow.core_mdm_approvals` | `tenant_isolation_core_mdm_approvals` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | Y |
| `flow.core_mdm_reconciliation_log` | `tenant_isolation_core_mdm_reconciliation_log` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `flow.core_menu_groups` | `tenant_isolation_core_menu_groups` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `flow.core_menus` | `tenant_isolation_core_menus` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `flow.core_operation_logs` | `tenant_isolation_core_operation_logs` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | Y |
| `flow.core_tenant_modules` | `tenant_isolation_core_tenant_modules` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | Y |
| `flow.core_tenant_settings` | `tenant_isolation_core_tenant_settings` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | Y |
| `flow.core_tenant_usage` | `tenant_isolation_core_tenant_usage` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | Y |
| `flow.core_tenant_users` | `tenant_isolation_core_tenant_users` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | Y |
| `flow.core_workflow_instances` | `tenant_isolation_core_workflow_instances` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `flow.core_workflow_versions` | `tenant_isolation_core_workflow_versions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `flow.core_workflows` | `tenant_isolation_core_workflows` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `gis.schema_defense_ledger` | `gis_allow_all_schema_defense_ledger` | ALL | `true` | N |
| `hrm.hrm_cache_invalidation_logs` | `tenant_isolation_hrm_cache_invalidation_logs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `hrm.hrm_master_data_refs` | `tenant_isolation_hrm_master_data_refs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `hrm.module_settings` | `tenant_isolation_module_settings` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_billing_invoices` | `tenant_isolation_core_billing_invoices` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.core_billing_plans` | `tenant_isolation_core_billing_plans` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.core_chat_members` | `tenant_isolation_core_chat_members` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_chat_messages` | `tenant_isolation_core_chat_messages` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_chat_rooms` | `tenant_isolation_core_chat_rooms` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_dashboard_refresh_log` | `tenant_isolation_core_dashboard_refresh_log` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.core_dict_items` | `tenant_isolation_core_dict_items` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_dict_types` | `tenant_isolation_core_dict_types` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_email_queue` | `tenant_isolation_core_email_queue` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.core_email_templates` | `tenant_isolation_core_email_templates` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_emails` | `tenant_isolation_core_emails` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_faqs` | `tenant_isolation_core_faqs` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_file_folders` | `tenant_isolation_core_file_folders` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_files` | `tenant_isolation_core_files` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_guide_lessons` | `tenant_isolation_core_guide_lessons` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_guide_progress` | `tenant_isolation_core_guide_progress` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_guides` | `tenant_isolation_core_guides` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_inter_module_sync` | `tenant_isolation_core_inter_module_sync` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_login_logs` | `tenant_isolation_core_login_logs` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_menu_groups` | `tenant_isolation_core_menu_groups` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_menus` | `tenant_isolation_core_menus` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_migration_history` | `tenant_isolation_core_migration_history` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_mobile_offline_records` | `tenant_isolation_core_mobile_offline_records` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_notification_templates` | `tenant_isolation_core_notification_templates` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_notifications` | `tenant_isolation_core_notifications` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_plugin_categories` | `tenant_isolation_core_plugin_categories` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_plugin_instances` | `tenant_isolation_core_plugin_instances` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_plugin_permissions` | `tenant_isolation_core_plugin_permissions` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_plugin_pricing` | `tenant_isolation_core_plugin_pricing` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.core_plugin_reviews` | `tenant_isolation_core_plugin_reviews` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_plugins` | `tenant_isolation_core_plugins` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_roles` | `tenant_isolation_core_roles` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_subscriptions` | `tenant_isolation_core_subscriptions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.core_tenant_modules` | `tenant_isolation_core_tenant_modules` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_tenant_plugins` | `rls_tenant_isolation` | ALL | `((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | N |
| `iam.core_tenant_settings` | `tenant_isolation_core_tenant_settings` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_tenant_usage` | `tenant_isolation_core_tenant_usage` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_tenant_users` | `tenant_isolation_core_tenant_users` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_usage_records` | `tenant_isolation_core_usage_records` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.core_users` | `tenant_isolation_core_users` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_workflow_instances` | `tenant_isolation_core_workflow_instances` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_workflow_tasks` | `tenant_isolation_core_workflow_tasks` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.core_workflows` | `tenant_isolation_core_workflows` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `iam.crm_dashboard_snapshots` | `tenant_isolation_crm_dashboard_snapshots` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.ehs_dashboard_snapshots` | `tenant_isolation_ehs_dashboard_snapshots` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.hrm_dashboard_snapshots` | `tenant_isolation_hrm_dashboard_snapshots` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.lims_dashboard_snapshots` | `tenant_isolation_lims_dashboard_snapshots` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.pdm_dashboard_snapshots` | `tenant_isolation_pdm_dashboard_snapshots` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `iam.tenant_permissions` | `rls_tenant_isolation` | ALL | `((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | N |
| `iam.wms_dashboard_snapshots` | `tenant_isolation_wms_dashboard_snapshots` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_api_exposures` | `tenant_isolation_mdm_api_exposures` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_api_products` | `tenant_isolation_mdm_api_products` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_assets` | `tenant_isolation_mdm_assets` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_audit_events` | `tenant_isolation_mdm_audit_events` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_audit_export_logs` | `tenant_isolation_mdm_audit_export_logs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_auto_fix_actions` | `tenant_isolation_mdm_auto_fix_actions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_bc_tests` | `tenant_isolation_mdm_bc_tests` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_billing_records` | `tenant_isolation_mdm_billing_records` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_billing_records` | `tenant_isolation_policy` | ALL | `((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `master_data.mdm_change_events` | `tenant_isolation_mdm_change_events` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_continuity_plans` | `tenant_isolation_mdm_continuity_plans` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_critical_functions` | `tenant_isolation_mdm_critical_functions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_data_asset_categories` | `tenant_isolation_mdm_data_asset_categories` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_data_contracts` | `tenant_isolation_mdm_data_contracts` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_data_permissions` | `tenant_isolation_mdm_data_permissions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_data_products` | `tenant_isolation_mdm_data_products` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_dimension_scores` | `tenant_isolation_mdm_dimension_scores` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_failover_records` | `tenant_isolation_mdm_failover_records` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_fix_strategies` | `tenant_isolation_mdm_fix_strategies` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_governance_insights` | `tenant_isolation_mdm_governance_insights` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_governance_suggestions` | `tenant_isolation_mdm_governance_suggestions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_graph_communities` | `tenant_isolation_mdm_graph_communities` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_graph_edges` | `tenant_isolation_mdm_graph_edges` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_graph_nodes` | `tenant_isolation_mdm_graph_nodes` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_impact_analyses` | `tenant_isolation_mdm_impact_analyses` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_impact_simulations` | `tenant_isolation_mdm_impact_simulations` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_improvement_plans` | `tenant_isolation_mdm_improvement_plans` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_interactions` | `tenant_isolation_mdm_interactions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_kg_edges` | `tenant_isolation_mdm_kg_edges` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_kg_graphs` | `tenant_isolation_mdm_kg_graphs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_kg_nodes` | `tenant_isolation_mdm_kg_nodes` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_lifecycle_history` | `master_data_allow_all_mdm_lifecycle_history` | ALL | `true` | N |
| `master_data.mdm_lifecycle_policies` | `master_data_allow_all_mdm_lifecycle_policies` | ALL | `true` | N |
| `master_data.mdm_lifecycle_stages` | `master_data_allow_all_mdm_lifecycle_stages` | ALL | `true` | N |
| `master_data.mdm_lineage_edges` | `tenant_isolation_mdm_lineage_edges` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_lineage_graphs` | `tenant_isolation_mdm_lineage_graphs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_lineage_nodes` | `tenant_isolation_mdm_lineage_nodes` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_maturity_assessments` | `tenant_isolation_mdm_maturity_assessments` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_maturity_history` | `tenant_isolation_mdm_maturity_history` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_metadata_attributes` | `master_data_allow_all_mdm_metadata_attributes` | ALL | `true` | N |
| `master_data.mdm_metadata_tags` | `master_data_allow_all_mdm_metadata_tags` | ALL | `true` | N |
| `master_data.mdm_permission_roles` | `tenant_isolation_mdm_permission_roles` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_propagation_logs` | `tenant_isolation_mdm_propagation_logs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_propagation_rules` | `tenant_isolation_mdm_propagation_rules` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_quality_checks` | `tenant_isolation_mdm_quality_checks` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_quality_loop_configs` | `tenant_isolation_mdm_quality_loop_configs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_rate_cards` | `master_data_allow_all_mdm_rate_cards` | ALL | `true` | N |
| `master_data.mdm_recommendations` | `tenant_isolation_mdm_recommendations` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_recovery_plans` | `tenant_isolation_mdm_recovery_plans` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_recovery_points` | `tenant_isolation_mdm_recovery_points` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_region_configs` | `tenant_isolation_mdm_region_configs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_replication_configs` | `tenant_isolation_mdm_replication_configs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_search_history` | `tenant_isolation_mdm_search_history` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_search_indexes` | `tenant_isolation_mdm_search_indexes` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_semantic_search_indexes` | `tenant_isolation_mdm_semantic_search_indexes` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_sla_configs` | `master_data_allow_all_mdm_sla_configs` | ALL | `true` | N |
| `master_data.mdm_sla_incidents` | `tenant_isolation_mdm_sla_incidents` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_sla_incidents` | `tenant_isolation_policy` | ALL | `((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `master_data.mdm_sla_measurements` | `tenant_isolation_mdm_sla_measurements` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_sla_measurements` | `tenant_isolation_policy` | ALL | `((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `master_data.mdm_subscriptions` | `mdm_subscriptions_tenant_policy` | ALL | `((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (db_tenant_id IS NULL) OR (db_tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | N |
| `master_data.mdm_subscriptions` | `tenant_isolation_mdm_subscriptions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_tag_rules` | `tenant_isolation_mdm_tag_rules` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_tagged_entities` | `tenant_isolation_mdm_tagged_entities` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_tags` | `tenant_isolation_mdm_tags` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_usage_records` | `tenant_isolation_mdm_usage_records` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_usage_records` | `tenant_isolation_policy` | ALL | `((tenant_uid IS NULL) OR ((tenant_uid)::text = ''::text) OR (tenant_uid = '00000000-0000-0000-0000-000000000001'::uuid) OR ((tenant_uid)::text = current_setting('app.tenant_id'::text, true)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `master_data.mdm_user_role_assignments` | `tenant_isolation_mdm_user_role_assignments` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_v60_lineage_edges` | `master_data_allow_all_mdm_v60_lineage_edges` | ALL | `true` | N |
| `master_data.mdm_v60_lineage_graphs` | `master_data_allow_all_mdm_v60_lineage_graphs` | ALL | `true` | N |
| `master_data.mdm_v60_lineage_nodes` | `master_data_allow_all_mdm_v60_lineage_nodes` | ALL | `true` | N |
| `master_data.mdm_version_branches` | `tenant_isolation_mdm_version_branches` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_version_snapshots` | `tenant_isolation_mdm_version_snapshots` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_workflow_history` | `tenant_isolation_mdm_workflow_history` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_workflow_templates` | `tenant_isolation_mdm_workflow_templates` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `master_data.mdm_workflows` | `tenant_isolation_mdm_workflows` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `mes.equipment` | `tenant_isolation_equipment` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `mes.equipment_inspection_records` | `tenant_isolation_equipment_inspection_records` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `mes.equipment_maintenance_records` | `tenant_isolation_equipment_maintenance_records` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `mes.material_plans` | `tenant_isolation_material_plans` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))` | N |
| `mes.module_settings` | `tenant_isolation_module_settings` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `mes.process_route_steps` | `tenant_isolation_process_route_steps` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `mes.process_routes` | `tenant_isolation_process_routes` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `mes.production_orders` | `tenant_isolation_production_orders` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `mes.production_processes` | `tenant_isolation_production_processes` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `mes.production_records` | `tenant_isolation_production_records` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `mes.quality_standards` | `tenant_isolation_quality_standards` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `mes.work_stations` | `tenant_isolation_work_stations` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `plugin_erp.accounting_subjects` | `rls_tenant_isolation` | ALL | `((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))` | N |
| `plugin_erp.accounting_subjects` | `tenant_isolation_accounting_subjects` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `plugin_mes.audit_logs` | `tenant_isolation_audit_logs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `portal.portal_announcements` | `tenant_isolation_portal_announcements` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `public._archive_core_workflow_instances` | `tenant_isolation__archive_core_workflow_instances` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public._archive_core_workflow_versions` | `tenant_isolation__archive_core_workflow_versions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.alerts` | `tenant_isolation_alerts` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.analytics_sync_records` | `tenant_isolation_analytics_sync_records` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `public.approval_records` | `tenant_isolation_approval_records` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.approvals` | `tenant_isolation_approvals` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.automation_rules` | `tenant_isolation_automation_rules` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `public.automation_runs` | `tenant_isolation_automation_runs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `public.automation_variables` | `tenant_isolation_automation_variables` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `public.conversion_executions` | `tenant_isolation_conversion_executions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.conversion_rules` | `tenant_isolation_conversion_rules` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_email_queue` | `tenant_isolation_core_email_queue` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_faqs` | `tenant_isolation_core_faqs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_flow_delegates` | `tenant_isolation_core_flow_delegates` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_flow_rules` | `tenant_isolation_core_flow_rules` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_flow_variable_history` | `tenant_isolation_core_flow_variable_history` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_flow_variables` | `tenant_isolation_core_flow_variables` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_guides` | `tenant_isolation_core_guides` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_ticket_activities` | `tenant_isolation_core_ticket_activities` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_ticket_comments` | `tenant_isolation_core_ticket_comments` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_ticket_sla_escalations` | `tenant_isolation_core_ticket_sla_escalations` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_ticket_sla_policies` | `tenant_isolation_core_ticket_sla_policies` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_tickets` | `tenant_isolation_core_tickets` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_workflow_versions` | `tenant_isolation_core_workflow_versions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.core_workflows` | `tenant_isolation_core_workflows` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.dynamic_data` | `tenant_isolation_dynamic_data` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.monitor_settings` | `tenant_isolation_monitor_settings` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `public.permission_audit_logs` | `tenant_isolation_permission_audit_logs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.pm_master_data_refs` | `tenant_isolation_pm_master_data_refs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.qa_qms_sync_records` | `tenant_isolation_qa_qms_sync_records` | ALL | `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `public.schema_registry` | `tenant_isolation_schema_registry` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `public.search_logs` | `tenant_isolation_search_logs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `public.system_settings` | `tenant_isolation_system_settings` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `qms.qa_ehs_hazards` | `tenant_isolation_qa_ehs_hazards` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `rs.audit_logs` | `tenant_isolation_audit_logs` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `rs.experiments` | `tenant_isolation_experiments` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `rs.formula_versions` | `tenant_isolation_formula_versions` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `rs.module_settings` | `tenant_isolation_module_settings` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))` | N |
| `ticket.ticket_attachments` | `tenant_isolation_ticket_attachments` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `tms.tms_routes` | `tenant_isolation_tms_routes` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `tms.tms_shipments` | `tenant_isolation_tms_shipments` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
| `unified_core.inter_module_sync` | `tenant_isolation_inter_module_sync` | ALL | `(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text), ''::text)) OR (tenant_id IS NULL))` | N |
