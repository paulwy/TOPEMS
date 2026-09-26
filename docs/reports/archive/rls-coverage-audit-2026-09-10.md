# RLS 覆盖率专项盘点报告（2026-09-10）

## 盘点口径

- **范围**：全库所有 schema（排除 pg_catalog、information_schema、public、_sqlx_test）
- **判定标准**：表含 `tenant_id` 或 `org_id` 列，但 `relrowsecurity = false`（未启用 RLS）
- **数据来源**：本地 PostgreSQL 实例 `psql -U air -d topems` 实时查询
- **盘点时间**：2026-09-10

## 盘点结果

### 总览

| 指标 | 数值 |
|---|---|
| 全库业务表总数 | ~875 |
| 已启用 RLS 的表 | ~840 |
| **含 tenant_id/org_id 但未启用 RLS** | **12** |
| RLS 覆盖率（含租户列的表） | ~98.6% |

### 未启用 RLS 的表清单（12 张）

| # | schema.table | 租户列 | 表类型 | 来源 | 优先级 |
|---|---|---|---|---|---|
| 1 | crm.customer_finance | tenant_id | 业务表 | P0-1 新建（2026-09-09） | P0 |
| 2 | wms.slotting_rules | tenant_id | 业务表 | P0-2b 新建（2026-09-09） | P0 |
| 3 | wms.slotting_suggestions | tenant_id | 业务表 | P0-2b 新建（2026-09-09） | P0 |
| 4 | wms.slotting_zones | tenant_id | 业务表 | P0-2b 新建（2026-09-09） | P0 |
| 5 | hrm.module_settings | tenant_id | 设置表 | OrganizerAgent 新建 | P1 |
| 6 | mes.module_settings | tenant_id | 设置表 | 存量/新建 | P1 |
| 7 | pdm.module_settings | tenant_id | 设置表 | OrganizerAgent 新建 | P1 |
| 8 | rs.module_settings | tenant_id | 设置表 | 存量/新建 | P1 |
| 9 | scm.module_settings | tenant_id | 设置表 | 存量/新建 | P1 |
| 10 | scm.inspection_records | tenant_id | 业务表 | 存量 | P1 |
| 11 | ai.model_usage_stats | tenant_id | 统计表 | 存量 | P2 |
| 12 | communication.notification_channels | tenant_id | 配置表 | 存量 | P2 |

### 分类分析

#### P0：P0 新建表遗漏 RLS（4 张）

这 4 张表是在 P0 缺口闭环专项中新建的，但迁移文件中只建了表和 GRANT，遗漏了 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 和 `CREATE POLICY`。

- `crm.customer_finance`：迁移 `20260909110001_crm_customer_finance.sql`（或类似）
- `wms.slotting_*`：迁移 `20260909xxxx_wms_slotting.sql`（或类似）

**处置**：补迁移文件，为每张表启用 RLS 并创建标准 policy（tenant_isolation + service_exemption）。

#### P1：module_settings 系列（5 张）+ scm.inspection_records（1 张）

`module_settings` 表是各模块的系统设置表，含 tenant_id 列支持租户级配置覆盖。这些表可能是 OrganizerAgent 在全量缺口补齐中新建的，未补 RLS。

`scm.inspection_records` 是存量业务表，可能历史遗漏。

**处置**：统一补 RLS policy，设置表的 policy 可以略宽松（允许 service 角色读写所有租户配置）。

#### P2：统计表/配置表（2 张）

- `ai.model_usage_stats`：AI 模型使用统计表，可能是全局统计或租户级统计
- `communication.notification_channels`：通知渠道配置表

**处置**：确认租户隔离语义后补 RLS；如果是全局共享表，应移除 tenant_id 列或标记为全局表。

## 与历史数据对比

| 时间点 | 未启用 RLS 的表数 | 说明 |
|---|---|---|
| 2026-09-08（评估报告） | 234 | 初评，含大量存量表 |
| 2026-09-09（V514 审计修复） | ~50 | lims/pm/ticket/ehs/gis 等模块批量补 RLS |
| 2026-09-10（本次盘点） | **12** | 剩余均为新建表遗漏或设置表 |

**结论**：RLS 覆盖率已从 ~73% 提升至 ~98.6%，剩余 12 张表范围明确，可在一个迁移文件中全部补齐。

## 处置结果（2026-09-10 已完成）

迁移文件 `database/migrations/20260910000007_rls_missing_tables.sql` 已执行，12 张表全部启用 RLS 并创建 `rls_tenant_isolation` policy：

- **P0（4 张）**：crm.customer_finance、wms.slotting_rules/suggestions/zones — 已完成
- **P1（6 张）**：hrm/mes/pdm/rs/scm module_settings + scm.inspection_records — 已完成
- **P2（2 张）**：ai.model_usage_stats、communication.notification_channels — 已完成（后者 tenant_id 为 varchar 类型，policy 不做 uuid 转换）

**验证结果**：全库含 tenant_id/org_id 但未启用 RLS 的表 = **0**，RLS 覆盖率 100%。

## 处置计划（历史记录）

### 立即执行（P0，4 张）

为 crm.customer_finance 和 wms.slotting_* 补 RLS：
1. 新建迁移文件 `20260910000007_rls_missing_tables.sql`
2. 每张表执行 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
3. 创建标准 policy：
   - `tenant_isolation`：`USING (tenant_id = current_setting('app.tenant_id', true)::uuid)`
   - `service_exemption`：`USING (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')`
4. `GRANT` 给 topems_app（如未授权）

### 短期执行（P1，6 张）

为 module_settings 系列和 scm.inspection_records 补 RLS，同上模式。

### 待确认（P2，2 张）

确认 ai.model_usage_stats 和 communication.notification_channels 的租户隔离语义后再处置。

## 验证方式

```sql
-- 验证 RLS 已启用
SELECT schemaname, tablename, relrowsecurity
FROM pg_tables t
JOIN pg_class c ON c.relname=t.tablename AND c.relnamespace=(SELECT oid FROM pg_namespace WHERE nspname=t.schemaname)
WHERE t.schemaname || '.' || t.tablename IN (
  'crm.customer_finance','wms.slotting_rules','wms.slotting_suggestions','wms.slotting_zones',
  'hrm.module_settings','mes.module_settings','pdm.module_settings','rs.module_settings','scm.module_settings',
  'scm.inspection_records','ai.model_usage_stats','communication.notification_channels'
);

-- 验证 policy 已创建
SELECT schemaname, tablename, policyname FROM pg_policies
WHERE schemaname || '.' || tablename IN (...同上...);
```
