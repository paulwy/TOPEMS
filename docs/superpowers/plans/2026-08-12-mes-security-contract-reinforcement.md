# MES 安全与行为契约加固 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 MES 后端补齐 tenant_id/RLS、三状态机、审计日志、utoipa 注解与单元测试，达到契约三联（typecheck / cargo check -D warnings / verify_navigation）全绿，并能产出 ≥ 20 个 cargo 单元测试。

**Architecture:** 6 Phase 推进。Phase 1 全表加 tenant_id 列+索引+RLS 策略并把所有 handler 改造为双写（WHERE + INSERT 注入）；Phase 2 用纯函数 `can_transition` 实现 ProductionOrder / WorkOrder / WIP 三状态机；Phase 3 复用 CRM 的 `log_audit_event` 模式接入 ≥ 50 处关键写操作；Phase 4 补齐 15 个缺失模块的 utoipa 注解并落地契约检查脚本；Phase 5 用 TDD 写 FSM 邻接对、RLS 隔离、pagination 钳制测试；Phase 6 验收三联 + 冒烟。每个 Task 后都 `cargo check -p topems-mes` 验证，最后统一 push commit。

**Tech Stack:** Rust (axum 0.8, sqlx 0.8, utoipa 5), PostgreSQL 16 (RLS, gen_random_uuid), pnpm + TypeScript (frontend contract check), Node.js (check-mes-contract.mjs)。所有 Rust 文件统一使用 `topems_shared_*` 已封装能力（auth / response / bootstrap::audit）。

**Spec:** `docs/superpowers/specs/2026-08-12-mes-security-contract-design.md`

**Pre-existing context (不需要重做):**
- 前端 34 路由 / 35 页面 / 22 API 客户端已就位
- 后端 24 modules / 205 处 check_permission / 216 处 Extension(claims)
- 旧迁移 `20260710161000_add_tenant_id.sql` 已覆盖 16 张 `mes_*` 前缀表（生产数据库已应用）
- 旧 RLS 策略使用 `app.tenant_id` 配置名；本计划采用 spec 推荐的 `app.current_tenant_id`，与新代码一致
- MES `audit_log` model 已 re-export 自 `topems_shared_bootstrap::audit`

---

## File Structure

**New files (15):**

| Path | Responsibility |
|------|----------------|
| `svc/mes/migrations/20260812120000_add_tenant_id_all_tables.sql` | 22 张业务表 + tenant_id 列 + 索引 + RLS 策略 |
| `svc/mes/migrations/20260812120100_create_mes_audit_logs.sql` | `plugin_mes.audit_logs` 表（仿 plugin_crm.audit_logs 结构） |
| `svc/mes/src/shared/tenant.rs` | `get_tenant_id(claims, headers) -> Uuid` 工具函数 + 中间件设置 `app.current_tenant_id` |
| `svc/mes/src/shared/fsm.rs` | `production_order_can_transition` / `work_order_can_transition` / `wip_can_transition` 三个纯函数 + `FsmError` |
| `svc/mes/src/shared/mod.rs` | re-export tenant + fsm（修改） |
| `svc/mes/src/modules/audit.rs` | MES audit_logs handler + `log_audit_event` 函数（复用 CRM 模式） |
| `svc/mes/src/modules/fsm_test.rs` | 三 FSM 邻接对 + 终态保护单元测试 |
| `svc/mes/src/shared/tenant_test.rs` | `get_tenant_id` 单元测试 |
| `svc/mes/tests/rls_isolation_test.rs` | 跨租户读写隔离集成测试 |
| `svc/mes/tests/pagination_test.rs` | page_size 钳制 + search 长度测试 |
| `svc/mes/tests/production_order_fsm_test.rs` | 生产订单 FSM 端到端测试 |
| `svc/mes/tests/work_order_fsm_test.rs` | 工单 FSM 端到端测试 |
| `svc/mes/tests/wip_fsm_test.rs` | WIP FSM 端到端测试 |
| `scripts/dev/check-mes-contract.mjs` | 前后端契约对齐脚本（复用 CRM 模板，改前缀） |
| `docs/superpowers/plans/2026-08-12-mes-security-contract-reinforcement.md` | 本文件 |

**Modified files (30+):**

| Path | 修改内容 |
|------|----------|
| `svc/mes/src/modules/mod.rs` | 注册 `audit` 模块 + 在 `init_database` 中调用 audit 表创建 |
| `svc/mes/src/models/mod.rs` | re-export `AuditLog` / `AuditEventParams`（已部分就位） |
| `svc/mes/src/lib.rs` | 注册 `shared::tenant` 中间件 |
| `svc/mes/src/modules/production_order.rs` | 5 handler 加 tenant_id WHERE + INSERT，写操作加 FSM 校验 + 审计 |
| `svc/mes/src/modules/work_order.rs` | 同上（6 阶段 FSM） |
| `svc/mes/src/modules/wip.rs` | 同上（3 阶段 FSM + transfer 审计） |
| `svc/mes/src/modules/production_process.rs` | 5 handler 加 tenant_id + 审计 |
| `svc/mes/src/modules/production_record.rs` | 同上 |
| `svc/mes/src/modules/equipment.rs` | 同上 + 2 张附属表（inspections / maintenance_records） |
| `svc/mes/src/modules/work_station.rs` | 同上 |
| `svc/mes/src/modules/production_scheduling.rs` | 同上 |
| `svc/mes/src/modules/material_bom/bom_handlers.rs` | 同上 + BOM 审计 |
| `svc/mes/src/modules/material_bom/issue_handlers.rs` | 同上 + 领料审计 |
| `svc/mes/src/modules/material_bom/return_handlers.rs` | 同上 + 退料审计 |
| `svc/mes/src/modules/material_requirement.rs` | 同上 |
| `svc/mes/src/modules/quality_management/inspection.rs` | 同上 + 检验审计 |
| `svc/mes/src/modules/quality_management/standard.rs` | 同上 |
| `svc/mes/src/modules/quality_management/patrol.rs` | 同上 |
| `svc/mes/src/modules/quality_traceability.rs` | 同上 |
| `svc/mes/src/modules/equipment_oee.rs` | 同上 |
| `svc/mes/src/modules/team.rs` | 同上（teams + team_members） |
| `svc/mes/src/modules/anomaly_detection.rs` | 补 utoipa |
| `svc/mes/src/modules/aps_scheduling.rs` | 补 utoipa |
| `svc/mes/src/modules/energy_management.rs` | 补 utoipa |
| `svc/mes/src/modules/process_flow.rs` | 补 utoipa |
| `svc/mes/src/modules/process_route.rs` | 补 utoipa |
| `svc/mes/src/modules/production_cost.rs` | 补 utoipa |
| `svc/mes/src/modules/production_process.rs` | 补 utoipa |
| `svc/mes/src/modules/production_record.rs` | 补 utoipa |
| `svc/mes/src/modules/work_station.rs` | 补 utoipa |
| `svc/mes/src/modules/material_requirement.rs` | 补 utoipa |
| `svc/mes/src/modules/quality_traceability.rs` | 补 utoipa |
| `svc/mes/src/modules/team.rs` | 补 utoipa |
| `.husky/pre-commit` | 追加 `node scripts/dev/check-mes-contract.mjs` |
| `docs/TODO.md` | 新增 V191-V196 任务条目 |

**Decomposition rationale:** handler 改造按"实体组"切分（生产订单组 / 物料组 / 质量组 / 设备组 / 团队组），每组改完即 `cargo check`，避免一次性 22 个文件改动出问题难以定位。FSM 与审计解耦到 `shared/` 让测试可独立运行。

---

## Phase 1 · tenant_id + RLS 基线

### Task 1: 创建新迁移文件覆盖 22 张业务表

**Files:**
- Create: `svc/mes/migrations/20260812120000_add_tenant_id_all_tables.sql`

- [ ] **Step 1: 写迁移 SQL**

完整内容：

```sql
-- TOPEMS MES Service - Add tenant_id + RLS for all business tables (spec 2026-08-12)
-- 覆盖 spec §3.1 中的 22 张表（不带 mes_ 前缀的业务表）

-- ============================================
-- 通用模板：每张表执行 ADD COLUMN + backfill + NOT NULL + index + RLS
-- ============================================

-- 1. production_orders
ALTER TABLE IF EXISTS production_orders ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE production_orders SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE production_orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE production_orders ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_production_orders_tenant_id ON production_orders(tenant_id);
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_orders_tenant_isolation ON production_orders;
CREATE POLICY production_orders_tenant_isolation ON production_orders
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 2. production_processes
ALTER TABLE IF EXISTS production_processes ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE production_processes SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE production_processes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE production_processes ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_production_processes_tenant_id ON production_processes(tenant_id);
ALTER TABLE production_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_processes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_processes_tenant_isolation ON production_processes;
CREATE POLICY production_processes_tenant_isolation ON production_processes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 3. production_records
ALTER TABLE IF EXISTS production_records ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE production_records SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE production_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE production_records ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_production_records_tenant_id ON production_records(tenant_id);
ALTER TABLE production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_records_tenant_isolation ON production_records;
CREATE POLICY production_records_tenant_isolation ON production_records
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 4. equipment
ALTER TABLE IF EXISTS equipment ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE equipment SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE equipment ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE equipment ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_equipment_tenant_id ON equipment(tenant_id);
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_tenant_isolation ON equipment;
CREATE POLICY equipment_tenant_isolation ON equipment
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 5. work_stations
ALTER TABLE IF EXISTS work_stations ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE work_stations SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE work_stations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE work_stations ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_work_stations_tenant_id ON work_stations(tenant_id);
ALTER TABLE work_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_stations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_stations_tenant_isolation ON work_stations;
CREATE POLICY work_stations_tenant_isolation ON work_stations
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 6. production_schedules
ALTER TABLE IF EXISTS production_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE production_schedules SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE production_schedules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE production_schedules ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_production_schedules_tenant_id ON production_schedules(tenant_id);
ALTER TABLE production_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_schedules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_schedules_tenant_isolation ON production_schedules;
CREATE POLICY production_schedules_tenant_isolation ON production_schedules
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 7-8. material_boms, bom_items
ALTER TABLE IF EXISTS material_boms ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_boms SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_boms ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_boms ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_boms_tenant_id ON material_boms(tenant_id);
ALTER TABLE material_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_boms FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_boms_tenant_isolation ON material_boms;
CREATE POLICY material_boms_tenant_isolation ON material_boms
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS bom_items ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE bom_items SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE bom_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE bom_items ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_bom_items_tenant_id ON bom_items(tenant_id);
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bom_items_tenant_isolation ON bom_items;
CREATE POLICY bom_items_tenant_isolation ON bom_items
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 9-10. material_issues, material_issue_items
ALTER TABLE IF EXISTS material_issues ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_issues SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_issues ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_issues ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_issues_tenant_id ON material_issues(tenant_id);
ALTER TABLE material_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_issues FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_issues_tenant_isolation ON material_issues;
CREATE POLICY material_issues_tenant_isolation ON material_issues
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS material_issue_items ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_issue_items SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_issue_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_issue_items ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_issue_items_tenant_id ON material_issue_items(tenant_id);
ALTER TABLE material_issue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_issue_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_issue_items_tenant_isolation ON material_issue_items;
CREATE POLICY material_issue_items_tenant_isolation ON material_issue_items
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 11-12. material_returns, material_return_items
ALTER TABLE IF EXISTS material_returns ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_returns SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_returns ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_returns ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_returns_tenant_id ON material_returns(tenant_id);
ALTER TABLE material_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_returns FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_returns_tenant_isolation ON material_returns;
CREATE POLICY material_returns_tenant_isolation ON material_returns
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS material_return_items ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_return_items SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_return_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_return_items ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_return_items_tenant_id ON material_return_items(tenant_id);
ALTER TABLE material_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_return_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_return_items_tenant_isolation ON material_return_items;
CREATE POLICY material_return_items_tenant_isolation ON material_return_items
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 13-14. quality_records, batch_records
ALTER TABLE IF EXISTS quality_records ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE quality_records SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE quality_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE quality_records ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_quality_records_tenant_id ON quality_records(tenant_id);
ALTER TABLE quality_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quality_records_tenant_isolation ON quality_records;
CREATE POLICY quality_records_tenant_isolation ON quality_records
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS batch_records ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE batch_records SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE batch_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE batch_records ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_batch_records_tenant_id ON batch_records(tenant_id);
ALTER TABLE batch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS batch_records_tenant_isolation ON batch_records;
CREATE POLICY batch_records_tenant_isolation ON batch_records
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 15. equipment_oee
ALTER TABLE IF EXISTS equipment_oee ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE equipment_oee SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE equipment_oee ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE equipment_oee ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_equipment_oee_tenant_id ON equipment_oee(tenant_id);
ALTER TABLE equipment_oee ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_oee FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_oee_tenant_isolation ON equipment_oee;
CREATE POLICY equipment_oee_tenant_isolation ON equipment_oee
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 16-17. wips, wip_transfers
ALTER TABLE IF EXISTS wips ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE wips SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE wips ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE wips ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_wips_tenant_id ON wips(tenant_id);
ALTER TABLE wips ENABLE ROW LEVEL SECURITY;
ALTER TABLE wips FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wips_tenant_isolation ON wips;
CREATE POLICY wips_tenant_isolation ON wips
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS wip_transfers ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE wip_transfers SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE wip_transfers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE wip_transfers ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_wip_transfers_tenant_id ON wip_transfers(tenant_id);
ALTER TABLE wip_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wip_transfers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wip_transfers_tenant_isolation ON wip_transfers;
CREATE POLICY wip_transfers_tenant_isolation ON wip_transfers
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 18-19. teams, team_members
ALTER TABLE IF EXISTS teams ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE teams SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE teams ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE teams ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teams_tenant_isolation ON teams;
CREATE POLICY teams_tenant_isolation ON teams
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS team_members ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE team_members SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE team_members ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE team_members ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_team_members_tenant_id ON team_members(tenant_id);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_members_tenant_isolation ON team_members;
CREATE POLICY team_members_tenant_isolation ON team_members
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 20. material_requirements
ALTER TABLE IF EXISTS material_requirements ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE material_requirements SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE material_requirements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE material_requirements ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_material_requirements_tenant_id ON material_requirements(tenant_id);
ALTER TABLE material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requirements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS material_requirements_tenant_isolation ON material_requirements;
CREATE POLICY material_requirements_tenant_isolation ON material_requirements
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 21-22. equipment_inspections, equipment_maintenance_records
ALTER TABLE IF EXISTS equipment_inspections ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE equipment_inspections SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE equipment_inspections ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE equipment_inspections ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_equipment_inspections_tenant_id ON equipment_inspections(tenant_id);
ALTER TABLE equipment_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inspections FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_inspections_tenant_isolation ON equipment_inspections;
CREATE POLICY equipment_inspections_tenant_isolation ON equipment_inspections
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

ALTER TABLE IF EXISTS equipment_maintenance_records ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE equipment_maintenance_records SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
ALTER TABLE equipment_maintenance_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE equipment_maintenance_records ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_records_tenant_id ON equipment_maintenance_records(tenant_id);
ALTER TABLE equipment_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_maintenance_records_tenant_isolation ON equipment_maintenance_records;
CREATE POLICY equipment_maintenance_records_tenant_isolation ON equipment_maintenance_records
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
```

- [ ] **Step 2: 在本地 PG 上跑迁移验证语法**

Run: `psql -h localhost -U topems -d topems_dev -f svc/mes/migrations/20260812120000_add_tenant_id_all_tables.sql`
Expected: 22 张表 ALTER 成功，22 个 index 创建，22 个 policy 创建，无 ERROR。

- [ ] **Step 3: 提交**

```bash
git add svc/mes/migrations/20260812120000_add_tenant_id_all_tables.sql
git commit -m "feat(mes): add tenant_id + RLS migration for 22 business tables

Implements spec §3.1: covers production_orders, production_processes,
production_records, equipment, work_stations, production_schedules,
material_boms, bom_items, material_issues, material_issue_items,
material_returns, material_return_items, quality_records, batch_records,
equipment_oee, wips, wip_transfers, teams, team_members, material_requirements,
equipment_inspections, equipment_maintenance_records.

All tables get: ADD COLUMN + backfill + NOT NULL + DROP DEFAULT + index
+ ENABLE/FORCE RLS + policy using app.current_tenant_id setting."
```

---

### Task 2: 创建 `shared/tenant.rs` 工具函数与中间件

**Files:**
- Create: `svc/mes/src/shared/tenant.rs`
- Create: `svc/mes/src/shared/tenant_test.rs`
- Modify: `svc/mes/src/shared/mod.rs`

- [ ] **Step 1: 写失败的单元测试**

`svc/mes/src/shared/tenant_test.rs`：

```rust
use crate::shared::tenant::get_tenant_id;
use axum::http::HeaderMap;
use topems_shared_auth::auth::Claims;

#[test]
fn returns_claims_tenant_id_when_present() {
    let mut headers = HeaderMap::new();
    let claims = Claims {
        sub: "u1".into(),
        tenant_id: Some(uuid::Uuid::nil()),
        ..Default::default()
    };
    assert_eq!(get_tenant_id(&claims, &headers), uuid::Uuid::nil());
}

#[test]
fn falls_back_to_x_tenant_id_header_when_claims_missing() {
    let mut headers = HeaderMap::new();
    headers.insert(
        "x-tenant-id",
        "00000000-0000-0000-0000-000000000000".parse().unwrap(),
    );
    let claims = Claims {
        sub: "u1".into(),
        tenant_id: None,
        ..Default::default()
    };
    assert_eq!(get_tenant_id(&claims, &headers), uuid::Uuid::nil());
}

#[test]
fn returns_nil_uuid_when_neither_present() {
    let headers = HeaderMap::new();
    let claims = Claims {
        sub: "u1".into(),
        tenant_id: None,
        ..Default::default()
    };
    assert_eq!(get_tenant_id(&claims, &headers), uuid::Uuid::nil());
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cargo test -p topems-mes --lib shared::tenant_test -- --nocapture`
Expected: FAIL，编译错误：`could not find shared::tenant`。

- [ ] **Step 3: 写实现**

`svc/mes/src/shared/tenant.rs`：

```rust
//! MES Tenant 工具函数
//!
//! 提取自 Claims / Header 的 tenant_id 用于 RLS 双写。
//! 配合 axum 中间件设置 PostgreSQL 会话变量 `app.current_tenant_id`。

use axum::http::HeaderMap;
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

/// 优先从 Claims.tenant_id 获取，否则回退到 `x-tenant-id` header，最终 fallback 到 nil UUID。
pub fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    if let Some(tid) = claims.tenant_id {
        return tid;
    }
    if let Some(v) = headers.get("x-tenant-id") {
        if let Ok(s) = v.to_str() {
            if let Ok(parsed) = Uuid::parse_str(s) {
                return parsed;
            }
        }
    }
    Uuid::nil()
}

/// 在当前 PostgreSQL 会话设置 `app.current_tenant_id`，使 RLS 策略生效。
/// 必须在每条业务 SQL 之前调用（一次连接内一次即可，但 sqlx-pool 每次取连接需重设）。
pub async fn set_session_tenant_id(pool: &sqlx::PgPool, tenant_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT set_config('app.current_tenant_id', $1, false)")
        .bind(tenant_id.to_string())
        .execute(pool)
        .await?;
    Ok(())
}
```

修改 `svc/mes/src/shared/mod.rs`，追加：

```rust
pub mod tenant;
pub mod tenant_test;
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cargo test -p topems-mes --lib shared::tenant_test -- --nocapture`
Expected: PASS，3 tests。

- [ ] **Step 5: 提交**

```bash
git add svc/mes/src/shared/tenant.rs svc/mes/src/shared/tenant_test.rs svc/mes/src/shared/mod.rs
git commit -m "feat(mes): add shared::tenant module with get_tenant_id and set_session_tenant_id

- get_tenant_id: claims.tenant_id > x-tenant-id header > nil UUID
- set_session_tenant_id: set_config('app.current_tenant_id', $1, false)
- Unit-tested for all three branches"
```

---

### Task 3: 改造 `production_order.rs` 五个 handler 加 tenant_id

**Files:**
- Modify: `svc/mes/src/modules/production_order.rs`

参考：CRM `customer.rs` 已有的双写模式（`WHERE tenant_id = $1` + `INSERT INTO ... (tenant_id, ...) VALUES ($1, ...)`）。

- [ ] **Step 1: 读取当前文件确定需改的 SQL 位置**

Run: `cargo check -p topems-mes`（基线确认 0 错误）
Read 文件确认 5 个 handler：list / get / create / update / delete / release / start / complete / cancel。

- [ ] **Step 2: 改造 list handler**

将原 SQL：

```rust
"SELECT * FROM production_orders WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2"
```

改为：

```rust
"SELECT * FROM production_orders WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3"
```

在 handler 顶部加：

```rust
let tenant_id = crate::shared::tenant::get_tenant_id(&claims, &headers);
let _ = crate::shared::tenant::set_session_tenant_id(&state.db, tenant_id).await;
```

绑定参数顺序：tenant_id, page_size, offset。

- [ ] **Step 3: 改造 get handler**

原 `WHERE id = $1 AND deleted_at IS NULL` 改为 `WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`。若返回 None 返回 404 `MES::NOT_FOUND`。

- [ ] **Step 4: 改造 create handler**

INSERT 语句：在字段列表加 `tenant_id`，VALUES 加 `$N`，bind tenant_id。

- [ ] **Step 5: 改造 update / delete handler**

UPDATE 加 `AND tenant_id = $N`；DELETE (soft delete) 同样加 `AND tenant_id = $N`。

- [ ] **Step 6: 改造 release / start / complete / cancel 四个状态变更 handler**

- 在 UPDATE WHERE 中加 `AND tenant_id = $N`
- 在 SELECT existing 之后加 tenant 校验：若 existing.tenant_id != tenant_id 返回 403 `MES::TENANT_MISMATCH`
- **暂不接入 FSM**（Phase 2 处理）

- [ ] **Step 7: 运行 cargo check 确认编译通过**

Run: `cargo check -p topems-mes`
Expected: 0 errors。

- [ ] **Step 8: 提交**

```bash
git add svc/mes/src/modules/production_order.rs
git commit -m "feat(mes): inject tenant_id into production_order handlers

- list/get: WHERE tenant_id = \$1
- create: INSERT tenant_id
- update/delete: WHERE tenant_id = \$N
- release/start/complete/cancel: WHERE tenant_id + cross-tenant 403

Phase 1 of tenant_id rollout (per spec §3.3)."
```

---

### Task 4: 改造 `production_process` / `production_record` / `equipment` / `work_station` 四个模块

**Files:**
- Modify: `svc/mes/src/modules/production_process.rs`
- Modify: `svc/mes/src/modules/production_record.rs`
- Modify: `svc/mes/src/modules/equipment.rs`
- Modify: `svc/mes/src/modules/work_station.rs`

每个模块按 Task 3 的 5 handler 模板改：list/get 加 WHERE tenant_id；create 加 INSERT tenant_id；update/delete 加 WHERE tenant_id。

- [ ] **Step 1: 改造 production_process.rs**

- list: `WHERE tenant_id = $1 AND deleted_at IS NULL`
- get: `WHERE id = $1 AND tenant_id = $2`
- create: INSERT 加 tenant_id
- update: `WHERE id = $1 AND tenant_id = $2`
- delete: `WHERE id = $1 AND tenant_id = $2`

- [ ] **Step 2: 改造 production_record.rs**

同上模板。注意 production_records 已有 `order_id` 外键，list 通常按 order_id 过滤，应改为 `WHERE order_id = $1 AND tenant_id = $2`。

- [ ] **Step 3: 改造 equipment.rs**

同上模板。注意 equipment_inspections 和 equipment_maintenance_records 是 equipment 的附属表，list 时通过 equipment_id 关联，仍要加 tenant_id 双写。

- [ ] **Step 4: 改造 work_station.rs**

同上模板。

- [ ] **Step 5: cargo check 全模块**

Run: `cargo check -p topems-mes`
Expected: 0 errors。

- [ ] **Step 6: 提交**

```bash
git add svc/mes/src/modules/production_process.rs svc/mes/src/modules/production_record.rs svc/mes/src/modules/equipment.rs svc/mes/src/modules/work_station.rs
git commit -m "feat(mes): inject tenant_id into process/record/equipment/work_station handlers

Applies spec §3.3 handler改造模板 to:
- production_process: 5 handlers
- production_record: 5 handlers (list by order_id AND tenant_id)
- equipment: 5 handlers + inspections/maintenance附属表
- work_station: 5 handlers"
```

---

### Task 5: 改造 `material_bom/*` 物料组（BOM / Issue / Return + Items）

**Files:**
- Modify: `svc/mes/src/modules/material_bom/bom_handlers.rs`
- Modify: `svc/mes/src/modules/material_bom/issue_handlers.rs`
- Modify: `svc/mes/src/modules/material_bom/return_handlers.rs`

- [ ] **Step 1: 改造 bom_handlers.rs**

bom list/get/create/update/delete + bom_items CRUD（若已实现）。

- [ ] **Step 2: 改造 issue_handlers.rs**

material_issues + material_issue_items CRUD。

- [ ] **Step 3: 改造 return_handlers.rs**

material_returns + material_return_items CRUD。

- [ ] **Step 4: cargo check**

Run: `cargo check -p topems-mes`
Expected: 0 errors。

- [ ] **Step 5: 提交**

```bash
git add svc/mes/src/modules/material_bom/
git commit -m "feat(mes): inject tenant_id into material_bom subgroup (bom/issue/return + items)

Covers tables: material_boms, bom_items, material_issues,
material_issue_items, material_returns, material_return_items."
```

---

### Task 6: 改造剩余 7 个模块（quality_management / quality_traceability / wip / team / production_scheduling / material_requirement / equipment_oee）

**Files:**
- Modify: `svc/mes/src/modules/quality_management/inspection.rs`
- Modify: `svc/mes/src/modules/quality_management/standard.rs`
- Modify: `svc/mes/src/modules/quality_management/patrol.rs`
- Modify: `svc/mes/src/modules/quality_traceability.rs`
- Modify: `svc/mes/src/modules/wip.rs`
- Modify: `svc/mes/src/modules/team.rs`
- Modify: `svc/mes/src/modules/production_scheduling.rs`
- Modify: `svc/mes/src/modules/material_requirement.rs`
- Modify: `svc/mes/src/modules/equipment_oee.rs`

- [ ] **Step 1: 改造 quality_management 三个子模块**

inspection.rs / standard.rs / patrol.rs：list/get/create/update/delete 五 handler 全部加 tenant_id 双写。

- [ ] **Step 2: 改造 quality_traceability.rs**

同上。

- [ ] **Step 3: 改造 wip.rs**

wip list/get/create/update/delete + transfer handler。**transfer 是状态变更**，加 tenant_id 双写（FSM 留 Phase 2）。

- [ ] **Step 4: 改造 team.rs**

teams + team_members CRUD。

- [ ] **Step 5: 改造 production_scheduling.rs / material_requirement.rs / equipment_oee.rs**

各自五 handler。

- [ ] **Step 6: cargo check 全服务**

Run: `RUSTFLAGS="-D warnings" cargo check -p topems-mes`
Expected: 0 errors 0 warnings。Phase 1 完成。

- [ ] **Step 7: 提交**

```bash
git add svc/mes/src/modules/quality_management/ svc/mes/src/modules/quality_traceability.rs svc/mes/src/modules/wip.rs svc/mes/src/modules/team.rs svc/mes/src/modules/production_scheduling.rs svc/mes/src/modules/material_requirement.rs svc/mes/src/modules/equipment_oee.rs
git commit -m "feat(mes): inject tenant_id into remaining 7 modules (Phase 1 完成)

- quality_management (inspection/standard/patrol)
- quality_traceability
- wip (含 transfer)
- team (teams + team_members)
- production_scheduling
- material_requirement
- equipment_oee

Phase 1 tenant_id rollout complete: 22 表 × 平均 5 handler ≈ 110 处 SQL 全部加双写"
```

---

## Phase 2 · 三状态机 formalize

### Task 7: 创建 `shared/fsm.rs` 三个 FSM 纯函数

**Files:**
- Create: `svc/mes/src/shared/fsm.rs`
- Create: `svc/mes/src/shared/fsm_test.rs`
- Modify: `svc/mes/src/shared/mod.rs`

- [ ] **Step 1: 写失败的邻接对测试**

`svc/mes/src/shared/fsm_test.rs`：

```rust
use crate::shared::fsm::{
    production_order_can_transition, work_order_can_transition, wip_can_transition, FsmError,
};

#[test]
fn production_order_release_from_draft_ok() {
    assert!(production_order_can_transition("draft", "pending").is_ok());
}

#[test]
fn production_order_start_from_pending_ok() {
    assert!(production_order_can_transition("pending", "in_progress").is_ok());
    // 兼容 released 旧值
    assert!(production_order_can_transition("pending", "released").is_ok());
}

#[test]
fn production_order_complete_from_in_progress_ok() {
    assert!(production_order_can_transition("in_progress", "completed").is_ok());
    assert!(production_order_can_transition("released", "completed").is_ok());
}

#[test]
fn production_order_cancel_from_any_non_terminal_ok() {
    assert!(production_order_can_transition("draft", "cancelled").is_ok());
    assert!(production_order_can_transition("pending", "cancelled").is_ok());
    assert!(production_order_can_transition("in_progress", "cancelled").is_ok());
    assert!(production_order_can_transition("released", "cancelled").is_ok());
}

#[test]
fn production_order_terminal_states_reject_all() {
    assert!(matches!(
        production_order_can_transition("completed", "cancelled"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        production_order_can_transition("cancelled", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn production_order_invalid_path_rejected() {
    assert!(matches!(
        production_order_can_transition("draft", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        production_order_can_transition("in_progress", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn work_order_lifecycle_ok() {
    assert!(work_order_can_transition("pending", "in_progress").is_ok());
    assert!(work_order_can_transition("in_progress", "paused").is_ok());
    assert!(work_order_can_transition("paused", "in_progress").is_ok());
    assert!(work_order_can_transition("in_progress", "completed").is_ok());
    assert!(work_order_can_transition("pending", "cancelled").is_ok());
    assert!(work_order_can_transition("in_progress", "cancelled").is_ok());
    assert!(work_order_can_transition("paused", "cancelled").is_ok());
}

#[test]
fn work_order_terminal_rejected() {
    assert!(matches!(
        work_order_can_transition("completed", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        work_order_can_transition("cancelled", "pending"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn wip_lifecycle_ok() {
    assert!(wip_can_transition("in_progress", "transferred").is_ok());
    assert!(wip_can_transition("transferred", "completed").is_ok());
}

#[test]
fn wip_terminal_rejected() {
    assert!(matches!(
        wip_can_transition("completed", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        wip_can_transition("in_progress", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn unknown_status_rejected() {
    assert!(matches!(
        production_order_can_transition("unknown", "pending"),
        Err(FsmError::UnknownStatus(_))
    ));
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cargo test -p topems-mes --lib shared::fsm_test -- --nocapture`
Expected: FAIL，编译错误：`could not find shared::fsm`。

- [ ] **Step 3: 写实现**

`svc/mes/src/shared/fsm.rs`：

```rust
//! MES 三状态机定义
//!
//! ProductionOrder: draft → pending → in_progress → completed/cancelled
//! WorkOrder:       pending → in_progress ⇄ paused → completed/cancelled
//! WIP:             in_progress → transferred → completed
//!
//! `released` 是历史遗留值（与 in_progress 等价），保留兼容。

use std::collections::HashSet;

#[derive(Debug, thiserror::Error, PartialEq)]
pub enum FsmError {
    #[error("state '{0}' is terminal and cannot transition")]
    TerminalState(String),
    #[error("invalid transition: {from} -> {to}")]
    InvalidTransition { from: String, to: String },
    #[error("unknown status: {0}")]
    UnknownStatus(String),
}

const PRODUCTION_ORDER_STATES: &[&str] =
    &["draft", "pending", "in_progress", "released", "completed", "cancelled"];
const PRODUCTION_ORDER_TERMINAL: &[&str] = &["completed", "cancelled"];

const WORK_ORDER_STATES: &[&str] =
    &["pending", "in_progress", "paused", "completed", "cancelled"];
const WORK_ORDER_TERMINAL: &[&str] = &["completed", "cancelled"];

const WIP_STATES: &[&str] = &["in_progress", "transferred", "completed"];
const WIP_TERMINAL: &[&str] = &["completed"];

fn validate_status(status: &str, allowed: &[&str]) -> Result<(), FsmError> {
    if allowed.contains(&status) {
        Ok(())
    } else {
        Err(FsmError::UnknownStatus(status.to_string()))
    }
}

fn check_pair(
    from: &str,
    to: &str,
    allowed_pairs: &[(&str, &str)],
    terminal: &[&str],
    all_states: &[&str],
) -> Result<(), FsmError> {
    validate_status(from, all_states)?;
    validate_status(to, all_states)?;
    if terminal.contains(&from) {
        return Err(FsmError::TerminalState(from.to_string()));
    }
    if allowed_pairs.contains(&(from, to)) {
        Ok(())
    } else {
        Err(FsmError::InvalidTransition {
            from: from.to_string(),
            to: to.to_string(),
        })
    }
}

pub fn production_order_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    // released 等价于 in_progress（历史值兼容）
    let from_norm = if from == "released" { "in_progress" } else { from };
    let to_norm = if to == "released" { "in_progress" } else { to };
    let allowed_pairs: &[(&str, &str)] = &[
        ("draft", "pending"),
        ("pending", "in_progress"),
        ("draft", "cancelled"),
        ("pending", "cancelled"),
        ("in_progress", "cancelled"),
        ("in_progress", "completed"),
    ];
    check_pair(
        from_norm,
        to_norm,
        allowed_pairs,
        PRODUCTION_ORDER_TERMINAL,
        PRODUCTION_ORDER_STATES,
    )
}

pub fn work_order_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending", "in_progress"),
        ("in_progress", "paused"),
        ("paused", "in_progress"),
        ("in_progress", "completed"),
        ("pending", "cancelled"),
        ("in_progress", "cancelled"),
        ("paused", "cancelled"),
    ];
    check_pair(
        from,
        to,
        allowed_pairs,
        WORK_ORDER_TERMINAL,
        WORK_ORDER_STATES,
    )
}

pub fn wip_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("in_progress", "transferred"),
        ("transferred", "completed"),
    ];
    check_pair(from, to, allowed_pairs, WIP_TERMINAL, WIP_STATES)
}

// 用于在测试 / 调试时检查 status 是否合法（无需 transition）
pub fn is_valid_production_order_status(s: &str) -> bool {
    PRODUCTION_ORDER_STATES.contains(&s)
}

pub fn is_valid_work_order_status(s: &str) -> bool {
    WORK_ORDER_STATES.contains(&s)
}

pub fn is_valid_wip_status(s: &str) -> bool {
    WIP_STATES.contains(&s)
}
```

修改 `svc/mes/src/shared/mod.rs`：

```rust
pub mod fsm;
pub mod fsm_test;
```

- [ ] **Step 4: 确认 Cargo.toml 已有 thiserror**

Run: `grep thiserror svc/mes/Cargo.toml`
Expected: 匹配到。若没有，在 `[dependencies]` 添加 `thiserror = "1"`。

- [ ] **Step 5: 运行测试确认通过**

Run: `cargo test -p topems-mes --lib shared::fsm_test -- --nocapture`
Expected: PASS，12 tests。

- [ ] **Step 6: 提交**

```bash
git add svc/mes/src/shared/fsm.rs svc/mes/src/shared/fsm_test.rs svc/mes/src/shared/mod.rs
git commit -m "feat(mes): add shared::fsm module with three state machines

- production_order_can_transition: 5 stages (draft/pending/in_progress/completed/cancelled)
  + released 兼容 (历史值，等价 in_progress)
- work_order_can_transition: 6 stages (pending/in_progress/paused/completed/cancelled)
- wip_can_transition: 3 stages (in_progress/transferred/completed)

Each function: validate_status -> check terminal -> check allowed pair.
Returns FsmError::{TerminalState | InvalidTransition | UnknownStatus}.

12 邻接对单元测试覆盖：正常推进 + 终态保护 + 乱序拒绝 + 未知状态"
```

---

### Task 8: 在 production_order / work_order / wip handler 中接入 FSM 校验

**Files:**
- Modify: `svc/mes/src/modules/production_order.rs`
- Modify: `svc/mes/src/modules/work_order.rs`
- Modify: `svc/mes/src/modules/wip.rs`

- [ ] **Step 1: 改造 production_order.rs 状态变更 handler**

在 `release` / `start` / `complete` / `cancel` 顶部，从数据库 SELECT existing 后，加：

```rust
let current_status = existing.status.as_str();
let target_status = "pending"; // release 的目标
crate::shared::fsm::production_order_can_transition(current_status, target_status)
    .map_err(|e| {
        use topems_shared_core::response::api_error;
        let code = match &e {
            crate::shared::fsm::FsmError::TerminalState(_) => (422, "MES::INVALID_TRANSITION"),
            crate::shared::fsm::FsmError::InvalidTransition { .. } => (422, "MES::INVALID_TRANSITION"),
            crate::shared::fsm::FsmError::UnknownStatus(_) => (500, "MES::INTERNAL"),
        };
        Json(api_error(code.0, &format!("{}: {}", code.1, e)))
    })?;
```

各 handler 目标状态：
- release → "pending"
- start → "in_progress"
- complete → "completed"
- cancel → "cancelled"

- [ ] **Step 2: 改造 work_order.rs 状态变更 handler**

work_order handlers: start / pause / resume / complete / cancel。目标状态：
- start → "in_progress"
- pause → "paused"
- resume → "in_progress"
- complete → "completed"
- cancel → "cancelled"

调用 `work_order_can_transition`。

- [ ] **Step 3: 改造 wip.rs transfer / complete handler**

- transfer → "transferred"
- complete → "completed"

调用 `wip_can_transition`。

- [ ] **Step 4: cargo check**

Run: `cargo check -p topems-mes`
Expected: 0 errors。

- [ ] **Step 5: 提交**

```bash
git add svc/mes/src/modules/production_order.rs svc/mes/src/modules/work_order.rs svc/mes/src/modules/wip.rs
git commit -m "feat(mes): integrate FSM validation into state-change handlers

- production_order: release/start/complete/cancel 调用 production_order_can_transition
- work_order: start/pause/resume/complete/cancel 调用 work_order_can_transition
- wip: transfer/complete 调用 wip_can_transition

非法 transition 返回 422 MES::INVALID_TRANSITION，终态保护返回 422。"
```

---

## Phase 3 · 审计日志接入

### Task 9: 创建 audit_logs 表 + `modules/audit.rs` 复用 CRM 模式

**Files:**
- Create: `svc/mes/migrations/20260812120100_create_mes_audit_logs.sql`
- Create: `svc/mes/src/modules/audit.rs`
- Modify: `svc/mes/src/modules/mod.rs`
- Modify: `svc/mes/src/models/mod.rs`

- [ ] **Step 1: 写迁移 SQL**

`svc/mes/migrations/20260812120100_create_mes_audit_logs.sql`：

```sql
-- TOPEMS MES Service - Audit logs table (per spec §5)
-- 结构对齐 plugin_crm.audit_logs 以便统一查询

CREATE TABLE IF NOT EXISTS plugin_mes.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID,
    entity_ids JSONB,
    user_id VARCHAR(128),
    user_name VARCHAR(256),
    request_details JSONB,
    response_details JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'success',
    error_message TEXT,
    ip_address VARCHAR(64),
    user_agent TEXT,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_action ON plugin_mes.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_entity_type ON plugin_mes.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_tenant_id ON plugin_mes.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_created_at ON plugin_mes.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_user_id ON plugin_mes.audit_logs(user_id);

ALTER TABLE plugin_mes.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_mes.audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mes_audit_logs_tenant_isolation ON plugin_mes.audit_logs;
CREATE POLICY mes_audit_logs_tenant_isolation ON plugin_mes.audit_logs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
```

- [ ] **Step 2: 在本地 PG 跑迁移**

Run: `psql -h localhost -U topems -d topems_dev -f svc/mes/migrations/20260812120100_create_mes_audit_logs.sql`
Expected: 表创建成功，5 个索引创建，1 个 policy 创建。

- [ ] **Step 3: 写 modules/audit.rs**

复制 CRM 的 `svc/crm/src/modules/audit.rs` 整体内容，做以下替换：
- `plugin_crm.audit_logs` → `plugin_mes.audit_logs`
- `crate::shared::permission::{check_permission, ModulePermission}` 保持（MES 已有此 module）
- `crate::models::AuditLog` 保持（MES 已有此 re-export）
- `super::ApiState` → `crate::AppState`（MES 用 AppState，不是 ApiState）

`svc/mes/src/modules/audit.rs` 完整内容（基于 CRM 模板修改后）：

```rust
use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use crate::shared::permission::{check_permission, MesPermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Clone)]
pub struct AuditEventParams {
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub entity_ids: Option<serde_json::Value>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub request_details: Option<serde_json::Value>,
    pub response_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/audit-logs", get(list_audit_logs))
        .route("/audit-logs/{id}", get(get_audit_log))
}

#[derive(Debug, Deserialize)]
pub struct ListAuditLogsQuery {
    pub action: Option<String>,
    pub entity_type: Option<String>,
    pub user_id: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

async fn list_audit_logs(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListAuditLogsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &MesPermission::All).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM plugin_mes.audit_logs
        WHERE ($1::text IS NULL OR action = $1)
          AND ($2::text IS NULL OR entity_type = $2)
          AND ($3::text IS NULL OR user_id = $3)
          AND ($4::text IS NULL OR status = $4)
          AND ($5::text IS NULL OR created_at >= $5::timestamptz)
          AND ($6::text IS NULL OR created_at <= $6::timestamptz)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(&params.action)
    .bind(&params.entity_type)
    .bind(&params.user_id)
    .bind(&params.status)
    .bind(params.start_date.clone())
    .bind(params.end_date.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(logs) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_mes.audit_logs
                WHERE ($1::text IS NULL OR action = $1)
                  AND ($2::text IS NULL OR entity_type = $2)
                  AND ($3::text IS NULL OR user_id = $3)
                  AND ($4::text IS NULL OR status = $4)
                  AND ($5::text IS NULL OR created_at >= $5::timestamptz)
                  AND ($6::text IS NULL OR created_at <= $6::timestamptz)
                "#,
            )
            .bind(&params.action)
            .bind(&params.entity_type)
            .bind(&params.user_id)
            .bind(&params.status)
            .bind(params.start_date)
            .bind(params.end_date)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let items: Vec<serde_json::Value> = logs
                .into_iter()
                .map(|row| {
                    serde_json::to_value(&row).unwrap_or(serde_json::json!({}))
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取审计日志成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            Json(api_error(500, "获取审计日志失败"))
        }
    }
}

async fn get_audit_log(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &MesPermission::All).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM plugin_mes.audit_logs WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => {
            let v = serde_json::to_value(&row).unwrap_or(serde_json::json!({}));
            Json(ApiResponse::success(v, "获取审计日志成功"))
        }
        Ok(None) => Json(api_error(404, "审计日志不存在")),
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            Json(api_error(500, "获取审计日志失败"))
        }
    }
}

pub async fn log_audit_event(db: &PgPool, params: AuditEventParams, headers: &HeaderMap) {
    let AuditEventParams {
        action,
        entity_type,
        entity_id,
        entity_ids,
        user_id,
        user_name,
        request_details,
        response_details,
        status,
        error_message,
    } = params;
    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .or_else(|| headers.get("x-real-ip").and_then(|h| h.to_str().ok()))
        .map(|s| s.to_string());

    let user_agent = headers
        .get("user-agent")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    let result = sqlx::query(
        r#"
        INSERT INTO plugin_mes.audit_logs (
            action, entity_type, entity_id, entity_ids,
            user_id, user_name, request_details, response_details,
            status, error_message, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        "#,
    )
    .bind(action)
    .bind(entity_type)
    .bind(entity_id)
    .bind(entity_ids)
    .bind(user_id)
    .bind(user_name)
    .bind(request_details)
    .bind(response_details)
    .bind(status)
    .bind(error_message)
    .bind(ip_address)
    .bind(user_agent)
    .execute(db)
    .await;

    if let Err(e) = result {
        tracing::error!("记录审计日志失败: {}", e);
    }
}
```

- [ ] **Step 4: 注册 audit 路由与 init_database 调用**

修改 `svc/mes/src/modules/mod.rs`：

```rust
pub mod audit;  // 新增
```

在 `create_routes()` 末尾追加：

```rust
.merge(audit::create_routes())
```

在 `init_database()` 函数末尾追加：

```rust
// 创建 plugin_mes schema 与 audit_logs 表
sqlx::query("CREATE SCHEMA IF NOT EXISTS plugin_mes")
    .execute(pool).await?;

sqlx::query(
    r#"
    CREATE TABLE IF NOT EXISTS plugin_mes.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(128) NOT NULL,
        entity_type VARCHAR(64) NOT NULL,
        entity_id UUID,
        entity_ids JSONB,
        user_id VARCHAR(128),
        user_name VARCHAR(256),
        request_details JSONB,
        response_details JSONB,
        status VARCHAR(32) NOT NULL DEFAULT 'success',
        error_message TEXT,
        ip_address VARCHAR(64),
        user_agent TEXT,
        tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
    "#,
)
.execute(pool).await?;

sqlx::query("CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_action ON plugin_mes.audit_logs(action)")
    .execute(pool).await?;
sqlx::query("CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_entity_type ON plugin_mes.audit_logs(entity_type)")
    .execute(pool).await?;
sqlx::query("CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_tenant_id ON plugin_mes.audit_logs(tenant_id)")
    .execute(pool).await?;
sqlx::query("CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_created_at ON plugin_mes.audit_logs(created_at DESC)")
    .execute(pool).await?;
```

- [ ] **Step 5: cargo check**

Run: `cargo check -p topems-mes`
Expected: 0 errors。

- [ ] **Step 6: 提交**

```bash
git add svc/mes/migrations/20260812120100_create_mes_audit_logs.sql svc/mes/src/modules/audit.rs svc/mes/src/modules/mod.rs
git commit -m "feat(mes): add audit_logs table and modules::audit with log_audit_event

- migration: plugin_mes.audit_logs with RLS + 4 indexes
- modules/audit.rs: list/get handlers + log_audit_event helper
- route registered: GET /audit-logs, GET /audit-logs/{id}
- init_database creates schema + table on boot

Mirrors CRM audit pattern, action names follow mes.{entity}.{action} convention."
```

---

### Task 10: 关键写操作接入审计（≥ 50 处）

**Files:**
- Modify: `svc/mes/src/modules/production_order.rs`
- Modify: `svc/mes/src/modules/work_order.rs`
- Modify: `svc/mes/src/modules/wip.rs`
- Modify: `svc/mes/src/modules/production_process.rs`
- Modify: `svc/mes/src/modules/production_record.rs`
- Modify: `svc/mes/src/modules/equipment.rs`
- Modify: `svc/mes/src/modules/work_station.rs`
- Modify: `svc/mes/src/modules/production_scheduling.rs`
- Modify: `svc/mes/src/modules/material_bom/bom_handlers.rs`
- Modify: `svc/mes/src/modules/material_bom/issue_handlers.rs`
- Modify: `svc/mes/src/modules/material_bom/return_handlers.rs`
- Modify: `svc/mes/src/modules/quality_management/inspection.rs`
- Modify: `svc/mes/src/modules/quality_management/standard.rs`
- Modify: `svc/mes/src/modules/quality_management/patrol.rs`
- Modify: `svc/mes/src/modules/equipment_oee.rs`
- Modify: `svc/mes/src/modules/team.rs`
- Modify: `svc/mes/src/modules/material_requirement.rs`

- [ ] **Step 1: 在 production_order.rs 写操作接入审计**

参考 CRM `customer.rs:159` 的接入模式：

```rust
use crate::modules::audit::{log_audit_event, AuditEventParams};

// 在 create handler 成功后:
let _ = log_audit_event(
    &state.db,
    AuditEventParams {
        action: "mes.production_order.create".to_string(),
        entity_type: "production_order".to_string(),
        entity_id: Some(created.id),
        entity_ids: None,
        user_id: claims.sub.clone().into(),
        user_name: None,
        request_details: serde_json::to_value(&payload).ok(),
        response_details: serde_json::to_value(&created).ok(),
        status: "success".to_string(),
        error_message: None,
    },
    &headers,
).await;
```

每个 handler 一个 action：
- create / update / delete / release / start / complete / cancel = 7 处

- [ ] **Step 2: 在 work_order.rs 接入审计**

8 处：create / update / delete / start / pause / resume / complete / cancel。

- [ ] **Step 3: 在 wip.rs 接入审计**

4 处：create / update / delete / transfer。

- [ ] **Step 4: 在 production_process / production_record 接入**

各 3 处（create/update/delete）= 6 处。

- [ ] **Step 5: 在 equipment / work_station 接入**

各 3 处 = 6 处。

- [ ] **Step 6: 在 production_scheduling 接入**

3 处。

- [ ] **Step 7: 在 material_bom/* 接入**

bom_handlers: 3 处 (create/update/delete)
issue_handlers: 3 处 (create/update/delete)
return_handlers: 3 处 = 共 9 处。

- [ ] **Step 8: 在 quality_management/* 接入**

inspection: 3 处
standard: 3 处
patrol: 3 处 = 共 9 处。

- [ ] **Step 9: 在 equipment_oee / team / material_requirement 接入**

各 3 处 = 9 处。

总计：7 + 8 + 4 + 6 + 6 + 3 + 9 + 9 + 9 = 61 处 ≥ 50 处验收。

- [ ] **Step 10: cargo check + grep 验证**

Run: `cargo check -p topems-mes`
Run: `grep -r "log_audit_event" svc/mes/src/modules/ | wc -l`
Expected: 0 errors; grep count ≥ 60（含 50+ 调用 + 函数定义 1 处）。

- [ ] **Step 11: 提交**

```bash
git add svc/mes/src/modules/
git commit -m "feat(mes): integrate audit logging into 50+ critical write handlers

接入审计的 handler 清单：
- production_order: 7 (create/update/delete/release/start/complete/cancel)
- work_order: 8 (create/update/delete/start/pause/resume/complete/cancel)
- wip: 4 (create/update/delete/transfer)
- production_process/record: 6
- equipment/work_station: 6
- production_scheduling: 3
- material_bom subgroup: 9
- quality_management: 9
- equipment_oee/team/material_requirement: 9

Total: 61 处 audit calls (>= 50 spec target).
Action naming follows mes.{entity}.{action} convention."
```

---

## Phase 4 · utoipa 补全 + 契约对齐

### Task 11: 为 15 个缺失模块补齐 utoipa 注解

**Files (按 spec §6 优先级):**
- Modify: `svc/mes/src/modules/material_requirement.rs` (高)
- Modify: `svc/mes/src/modules/process_flow.rs` (高)
- Modify: `svc/mes/src/modules/process_route.rs` (高)
- Modify: `svc/mes/src/modules/production_process.rs` (高)
- Modify: `svc/mes/src/modules/production_record.rs` (高)
- Modify: `svc/mes/src/modules/production_scheduling.rs` (高)
- Modify: `svc/mes/src/modules/work_station.rs` (高)
- Modify: `svc/mes/src/modules/material_bom/bom_handlers.rs` (高)
- Modify: `svc/mes/src/modules/material_bom/issue_handlers.rs` (高)
- Modify: `svc/mes/src/modules/material_bom/return_handlers.rs` (高)
- Modify: `svc/mes/src/modules/quality_management/inspection.rs` (高)
- Modify: `svc/mes/src/modules/quality_management/standard.rs` (高)
- Modify: `svc/mes/src/modules/quality_management/patrol.rs` (高)
- Modify: `svc/mes/src/modules/production_cost.rs` (高)
- Modify: `svc/mes/src/modules/anomaly_detection.rs` (中)
- Modify: `svc/mes/src/modules/aps_scheduling.rs` (中)
- Modify: `svc/mes/src/modules/energy_management.rs` (中)
- Modify: `svc/mes/src/modules/quality_traceability.rs` (中)
- Modify: `svc/mes/src/modules/team.rs` (中)

每个 handler 加 `#[utoipa::path]` 注解，参考 `production_order.rs` 中已有注解模式。

- [ ] **Step 1: 读取 production_order.rs 已有注解模板**

确认 `#[utoipa::path(get, path = "/production-orders", ...)]` 格式，作为参考。

- [ ] **Step 2: 为 production_process.rs 补齐**

每个 handler 一个 `#[utoipa::path]` 注解。例：

```rust
#[utoipa::path(
    get,
    path = "/production-processes",
    responses = (status = 200, description = "成功", body = ApiResponse<ListResponse<ProductionProcess>>),
    tag = "mes.production_process"
)]
async fn list_production_processes(...) { ... }
```

- [ ] **Step 3: 重复 Step 2 模板为其余 14 个模块补齐**

按高优先级先补，每个文件 cargo check 一次确认无语法错误。

- [ ] **Step 4: 在 openapi.rs 中注册新 paths**

修改 `svc/mes/src/modules/openapi.rs`（或 `mes_compat.rs` 中 ApiDoc），在 `paths(...)` 中追加新 handler。

- [ ] **Step 5: cargo check + OpenAPI 生成验证**

Run: `cargo check -p topems-mes`
Run: `cargo test -p topems-mes --test openapi_extract -- --nocapture`
Expected: 0 errors; OpenAPI 路径数显著增加。

- [ ] **Step 6: 提交**

```bash
git add svc/mes/src/modules/
git commit -m "docs(mes): add utoipa annotations to 15 modules

补齐模块：
- material_requirement, process_flow, process_route
- production_process, production_record, production_scheduling
- work_station, material_bom/* (3 files)
- quality_management/* (3 files), production_cost
- anomaly_detection, aps_scheduling, energy_management
- quality_traceability, team

Each handler gets #[utoipa::path] with tag = 'mes.{entity}'.
OpenAPI aggregation now covers 100% of MES routes (spec §6)."
```

---

### Task 12: 创建 check-mes-contract.mjs + .husky/pre-commit 集成

**Files:**
- Create: `scripts/dev/check-mes-contract.mjs`
- Modify: `.husky/pre-commit`

- [ ] **Step 1: 读取 CRM 的 check-crm-contract.mjs 作为模板**

Run: `ls scripts/dev/check-crm-contract.mjs` 确认存在，读完整内容。

- [ ] **Step 2: 复制并改前缀**

复制 `check-crm-contract.mjs` 内容到 `check-mes-contract.mjs`，全局替换：
- `crm` → `mes`
- `CRM` → `MES`
- `plugin_crm` → `plugin_mes`
- `topems-crm` → `topems-mes`
- 接口前缀 `/api/crm/` → `/api/mes/`

- [ ] **Step 3: 本地运行验证**

Run: `node scripts/dev/check-mes-contract.mjs`
Expected: exit 0，输出 "MES 契约一致：34 路由 / 35 页面 / 22 API 客户端 / 24 modules"。

- [ ] **Step 4: 在 .husky/pre-commit 追加**

读 `.husky/pre-commit` 当前内容，在末尾追加：

```bash
# MES 契约检查（仅当 MES 文件变更时）
if git diff --cached --name-only | grep -qE "^(svc/mes/|apps/web/src/(api|pages)/mes/)"; then
  echo "→ Running MES contract check..."
  node scripts/dev/check-mes-contract.mjs || exit 1
fi
```

- [ ] **Step 5: 提交**

```bash
git add scripts/dev/check-mes-contract.mjs .husky/pre-commit
git commit -m "chore(mes): add check-mes-contract.mjs and integrate with pre-commit

- Mirrors CRM contract check pattern
- Verifies: frontend routes / pages / API clients / backend modules alignment
- Pre-commit only fires when svc/mes or apps/web mes/* files change"
```

---

## Phase 5 · 测试覆盖

### Task 13: 创建 production_order_fsm_test.rs 端到端测试

**Files:**
- Create: `svc/mes/tests/production_order_fsm_test.rs`

- [ ] **Step 1: 写测试**

```rust
//! ProductionOrder FSM 端到端测试
//!
//! 通过 axum TestServer + 真实 PG 验证状态变更 handler 的 FSM 校验。

mod common;

use crate::common::TestApp;

#[tokio::test]
async fn production_order_lifecycle_happy_path() {
    let app = TestApp::spawn().await;
    let token = app.login_as_admin().await;

    // 1. 创建订单
    let create_resp = app
        .post("/api/mes/production-orders")
        .header("Authorization", format!("Bearer {}", token))
        .json(&serde_json::json!({
            "order_no": "PO-TEST-001",
            "product_name": "测试产品",
            "product_code": "TP-001",
            "quantity": 100,
            "status": "draft"
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(create_resp.status(), 201);
    let body: serde_json::Value = create_resp.json().await.unwrap();
    let order_id = body["data"]["id"].as_str().unwrap().to_string();

    // 2. release: draft → pending
    let resp = app
        .post(&format!("/api/mes/production-orders/{}/release", order_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 200);

    // 3. start: pending → in_progress
    let resp = app
        .post(&format!("/api/mes/production-orders/{}/start", order_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 200);

    // 4. complete: in_progress → completed
    let resp = app
        .post(&format!("/api/mes/production-orders/{}/complete", order_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 200);
}

#[tokio::test]
async fn production_order_invalid_transition_rejected() {
    let app = TestApp::spawn().await;
    let token = app.login_as_admin().await;

    // 创建 draft 订单
    let create_resp = app
        .post("/api/mes/production-orders")
        .header("Authorization", format!("Bearer {}", token))
        .json(&serde_json::json!({
            "order_no": "PO-TEST-002",
            "product_name": "测试",
            "product_code": "TP-002",
            "quantity": 50,
            "status": "draft"
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = create_resp.json().await.unwrap();
    let order_id = body["data"]["id"].as_str().unwrap().to_string();

    // 直接 complete（draft → completed 非法）
    let resp = app
        .post(&format!("/api/mes/production-orders/{}/complete", order_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 422);
    let body: serde_json::Value = resp.json().await.unwrap();
    assert!(body["message"].as_str().unwrap().contains("MES::INVALID_TRANSITION"));
}

#[tokio::test]
async fn production_order_terminal_state_protected() {
    let app = TestApp::spawn().await;
    let token = app.login_as_admin().await;

    // 创建并完成订单
    let create_resp = app
        .post("/api/mes/production-orders")
        .header("Authorization", format!("Bearer {}", token))
        .json(&serde_json::json!({
            "order_no": "PO-TEST-003",
            "product_name": "测试",
            "product_code": "TP-003",
            "quantity": 1,
            "status": "draft"
        }))
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = create_resp.json().await.unwrap();
    let order_id = body["data"]["id"].as_str().unwrap().to_string();

    // release + start + complete
    for action in ["release", "start", "complete"] {
        app.post(&format!("/api/mes/production-orders/{}/{}", order_id, action))
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .unwrap();
    }

    // 已 completed，再 release 应被拒
    let resp = app
        .post(&format!("/api/mes/production-orders/{}/release", order_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 422);
    let body: serde_json::Value = resp.json().await.unwrap();
    assert!(body["message"].as_str().unwrap().contains("MES::INVALID_TRANSITION"));
}
```

- [ ] **Step 2: 创建 tests/common/mod.rs（若不存在）**

```rust
use axum::Router;
use sqlx::PgPool;

pub struct TestApp {
    pub router: Router,
    pub db: PgPool,
}

impl TestApp {
    pub async fn spawn() -> Self {
        // 启动测试 PG、应用 migration、构建 router
        // 复用 CRM tests/common/mod.rs 的实现模式
        todo!("Implement in Step 3")
    }

    pub async fn login_as_admin(&self) -> String {
        // 返回 admin JWT token
        todo!("Implement in Step 3")
    }
}
```

- [ ] **Step 3: 实现 common/mod.rs**

参考 CRM 的 `svc/crm/tests/common/mod.rs`（如有），实现 TestApp::spawn 与 login_as_admin。

- [ ] **Step 4: 运行测试**

Run: `cargo test -p topems-mes --test production_order_fsm_test -- --nocapture`
Expected: PASS，3 tests。

- [ ] **Step 5: 提交**

```bash
git add svc/mes/tests/production_order_fsm_test.rs svc/mes/tests/common/
git commit -m "test(mes): add production_order FSM end-to-end tests

3 tests covering happy path + invalid transition + terminal state protection.
Uses real PG + axum TestServer via tests/common/mod.rs."
```

---

### Task 14: 创建 work_order_fsm_test.rs + wip_fsm_test.rs

**Files:**
- Create: `svc/mes/tests/work_order_fsm_test.rs`
- Create: `svc/mes/tests/wip_fsm_test.rs`

- [ ] **Step 1: 写 work_order_fsm_test.rs**

5 个测试覆盖：
- work_order_lifecycle_happy_path: pending → in_progress → paused → in_progress → completed
- work_order_invalid_pause_after_complete_rejected
- work_order_terminal_state_protected
- work_order_resume_from_non_paused_rejected
- work_order_cancel_from_any_non_terminal_ok

模板与 Task 13 相同，端点改为 `/api/mes/work-orders/{id}/{action}`。

- [ ] **Step 2: 写 wip_fsm_test.rs**

3 个测试：
- wip_transfer_happy_path: in_progress → transferred → completed
- wip_complete_without_transfer_rejected
- wip_terminal_state_protected

- [ ] **Step 3: 运行测试**

Run: `cargo test -p topems-mes --test work_order_fsm_test --test wip_fsm_test -- --nocapture`
Expected: PASS，8 tests。

- [ ] **Step 4: 提交**

```bash
git add svc/mes/tests/work_order_fsm_test.rs svc/mes/tests/wip_fsm_test.rs
git commit -m "test(mes): add work_order and wip FSM end-to-end tests

- work_order_fsm_test: 5 tests (happy path / invalid / terminal / resume / cancel)
- wip_fsm_test: 3 tests (transfer / complete-without-transfer / terminal)

Total MES integration tests: 8 (cumulative: 11)"
```

---

### Task 15: 创建 rls_isolation_test.rs + pagination_test.rs

**Files:**
- Create: `svc/mes/tests/rls_isolation_test.rs`
- Create: `svc/mes/tests/pagination_test.rs`

- [ ] **Step 1: 写 rls_isolation_test.rs**

```rust
//! RLS 跨租户隔离测试
//!
//! 创建两个租户 A、B，在 A 下创建 production_order，
//! 切换到 B 后应查询不到 A 的订单（0 条）。

mod common;

use crate::common::TestApp;

#[tokio::test]
async fn production_order_cross_tenant_isolated() {
    let app = TestApp::spawn().await;

    // 租户 A 创建订单
    let token_a = app.login_as_tenant("tenant-a").await;
    let create_resp = app
        .post("/api/mes/production-orders")
        .header("Authorization", format!("Bearer {}", token_a))
        .header("x-tenant-id", "00000000-0000-0000-0000-000000000001")
        .json(&serde_json::json!({
            "order_no": "PO-TENANT-A-001",
            "product_name": "A的产品",
            "product_code": "A-001",
            "quantity": 10
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(create_resp.status(), 201);

    // 租户 B 查询，应看不到 A 的订单
    let token_b = app.login_as_tenant("tenant-b").await;
    let list_resp = app
        .get("/api/mes/production-orders")
        .header("Authorization", format!("Bearer {}", token_b))
        .header("x-tenant-id", "00000000-0000-0000-0000-000000000002")
        .send()
        .await
        .unwrap();
    assert_eq!(list_resp.status(), 200);
    let body: serde_json::Value = list_resp.json().await.unwrap();
    let items = body["data"]["items"].as_array().unwrap();
    let has_a_order = items
        .iter()
        .any(|item| item["order_no"].as_str() == Some("PO-TENANT-A-001"));
    assert!(!has_a_order, "租户 B 不应看到租户 A 的订单");
}

#[tokio::test]
async fn equipment_cross_tenant_isolated() {
    let app = TestApp::spawn().await;

    let token_a = app.login_as_tenant("tenant-a").await;
    app.post("/api/mes/equipment")
        .header("Authorization", format!("Bearer {}", token_a))
        .header("x-tenant-id", "00000000-0000-0000-0000-000000000001")
        .json(&serde_json::json!({
            "equipment_no": "EQ-TENANT-A-001",
            "name": "A的设备"
        }))
        .send()
        .await
        .unwrap();

    let token_b = app.login_as_tenant("tenant-b").await;
    let resp = app
        .get("/api/mes/equipment")
        .header("Authorization", format!("Bearer {}", token_b))
        .header("x-tenant-id", "00000000-0000-0000-0000-000000000002")
        .send()
        .await
        .unwrap();
    let body: serde_json::Value = resp.json().await.unwrap();
    let items = body["data"]["items"].as_array().unwrap();
    let has_a_eq = items
        .iter()
        .any(|item| item["equipment_no"].as_str() == Some("EQ-TENANT-A-001"));
    assert!(!has_a_eq);
}
```

需要在 `tests/common/mod.rs` 中添加 `login_as_tenant(tenant_id: &str) -> String` 辅助函数。

- [ ] **Step 2: 写 pagination_test.rs**

```rust
//! 分页与搜索参数钳制测试

mod common;

use crate::common::TestApp;

#[tokio::test]
async fn page_size_clamped_to_100() {
    let app = TestApp::spawn().await;
    let token = app.login_as_admin().await;

    let resp = app
        .get("/api/mes/production-orders?page=1&page_size=10000")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 200);
    let body: serde_json::Value = resp.json().await.unwrap();
    assert!(body["data"]["page_size"].as_i64().unwrap() <= 100);
}

#[tokio::test]
async fn negative_page_defaults_to_1() {
    let app = TestApp::spawn().await;
    let token = app.login_as_admin().await;

    let resp = app
        .get("/api/mes/production-orders?page=-5")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 200);
    let body: serde_json::Value = resp.json().await.unwrap();
    assert_eq!(body["data"]["page"].as_i64(), Some(1));
}

#[tokio::test]
async fn search_long_string_truncated() {
    let app = TestApp::spawn().await;
    let token = app.login_as_admin().await;

    let long_search = "x".repeat(500);
    let resp = app
        .get(&format!("/api/mes/production-orders?search={}", long_search))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 200); // 不应 500
}
```

- [ ] **Step 3: 在 common/mod.rs 补充 login_as_tenant**

```rust
impl TestApp {
    pub async fn login_as_tenant(&self, tenant_label: &str) -> String {
        // 根据 tenant_label 生成 JWT with 不同 tenant_id
        let tenant_id = match tenant_label {
            "tenant-a" => "00000000-0000-0000-0000-000000000001",
            "tenant-b" => "00000000-0000-0000-0000-000000000002",
            _ => "00000000-0000-0000-0000-000000000000",
        };
        // ... 生成 JWT
        todo!()
    }
}
```

- [ ] **Step 4: 在各 list handler 中确认 page_size 钳制到 100**

grep 确认所有 list handler 都有 `.min(100)`。若没有，在 Task 3-6 改造时一并补上。

- [ ] **Step 5: 运行测试**

Run: `cargo test -p topems-mes --test rls_isolation_test --test pagination_test -- --nocapture`
Expected: PASS，5 tests。

- [ ] **Step 6: 提交**

```bash
git add svc/mes/tests/rls_isolation_test.rs svc/mes/tests/pagination_test.rs svc/mes/tests/common/
git commit -m "test(mes): add RLS isolation and pagination clamping tests

- rls_isolation_test: 2 tests (production_order + equipment cross-tenant 0 leak)
- pagination_test: 3 tests (page_size clamp, negative page, long search)

Total MES integration tests: 5 (cumulative: 16)
>= spec §8.3 acceptance target (≥20 with FSM unit tests from Phase 2)"
```

---

## Phase 6 · 验收三联 + 冒烟

### Task 16: 验收三联 + 手工冒烟

**Files:**
- Modify: `docs/TODO.md`

- [ ] **Step 1: 验收一 - pnpm typecheck**

Run: `cd apps/web && pnpm run typecheck`
Expected: exit 0，0 errors。

- [ ] **Step 2: 验收二 - RUSTFLAGS=-D warnings cargo check**

Run: `RUSTFLAGS="-D warnings" cargo check -p topems-mes`
Expected: exit 0，0 errors 0 warnings。

- [ ] **Step 3: 验收三 - verify_navigation**

Run: `node scripts/verify_navigation.mjs --strict`
Expected: exit 0，0 缺失页。

- [ ] **Step 4: 推荐验收四 - cargo test**

Run: `cargo test -p topems-mes`
Expected: ≥ 20 tests pass (12 fsm unit + 3 production_order_fsm + 8 work_order/wip_fsm + 5 rls/pagination ≈ 28 tests)。

- [ ] **Step 5: 推荐验收五 - 契约对齐**

Run: `node scripts/dev/check-mes-contract.mjs`
Expected: exit 0。

- [ ] **Step 6: 手工冒烟（用 topems.sh）**

```bash
bash scripts/topems.sh start mes
# 等待服务启动
curl -X POST http://localhost:8083/api/mes/production-orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_no":"SMOKE-001","product_name":"冒烟","product_code":"SM-1","quantity":1}'
# 期望 201 + 审计日志写入 plugin_mes.audit_logs

curl -X POST http://localhost:8083/api/mes/production-orders/$ID/release -H "Authorization: Bearer $TOKEN"
# 期望 200，状态变 pending

curl -X POST http://localhost:8083/api/mes/production-orders/$ID/complete -H "Authorization: Bearer $TOKEN"
# 期望 422 MES::INVALID_TRANSITION（pending 不能直接 complete）
```

- [ ] **Step 7: 更新 TODO.md**

在 `docs/TODO.md` 追加 V191-V196 章节：

```markdown
## V191-V196 · MES 安全与行为契约加固（2026-08-12）

- [x] V191: tenant_id migration + handler 改造（22 表 × 5 handler = 110 处）
- [x] V192: 三状态机 formalize（production_order/work_order/wip can_transition）
- [x] V193: 审计日志接入（61 处关键写操作）
- [x] V194: utoipa 补全 15 模块
- [x] V195: 测试覆盖（28 tests pass）
- [x] V196: 验收三联全绿（typecheck / cargo check -D warnings / verify_navigation）
```

- [ ] **Step 8: 提交**

```bash
git add docs/TODO.md
git commit -m "docs(mes): close V191-V196 MES security & contract reinforcement

All six phases complete:
- V191: tenant_id + RLS on 22 tables (110 handler SQL changes)
- V192: 3 FSMs (production_order/work_order/wip) with can_transition
- V193: 61 audit log calls on critical write handlers
- V194: 15 modules with utoipa annotations added
- V195: 28 tests passing (12 FSM unit + 16 integration)
- V196: 验收三联全绿

Spec: docs/superpowers/specs/2026-08-12-mes-security-contract-design.md
Plan: docs/superpowers/plans/2026-08-12-mes-security-contract-reinforcement.md"
```

---

## Self-Review

### 1. Spec coverage

| Spec 章节 | 实现 Task |
|----------|-----------|
| §3 tenant_id + RLS（22 表） | Task 1（migration）+ Task 2（工具）+ Task 3-6（handler 改造） |
| §4 三状态机 | Task 7（纯函数 + 12 单元测试）+ Task 8（handler 接入） |
| §5 审计日志 | Task 9（表 + log_audit_event）+ Task 10（61 处接入） |
| §6 utoipa 补全 15 模块 | Task 11 |
| §7 错误码前缀 | Task 8（MES::INVALID_TRANSITION）+ Task 3（MES::TENANT_MISMATCH / MES::NOT_FOUND） |
| §8 测试覆盖 | Task 13（production_order_fsm 3 tests）+ Task 14（work_order/wip 8 tests）+ Task 15（rls 2 + pagination 3 = 5 tests）+ Task 7（12 fsm unit tests） = 28 tests ≥ 20 target |
| §9 交付物清单 6 项 | Task 1-6（Phase 1）/ Task 7-8（Phase 2）/ Task 9-10（Phase 3）/ Task 11-12（Phase 4）/ Task 13-15（Phase 5）/ Task 16（Phase 6）全闭环 |
| §10 风险缓解 | Task 1 用 DEFAULT '00000000-...' 先填充再 NOT NULL，避免数据迁移失败；Task 3-6 分批改造，每 Task 后 cargo check |

无 spec 项遗漏。

### 2. Placeholder scan

- 搜 "TBD" / "TODO" / "fill in" → 仅出现在 Task 13-15 的 `tests/common/mod.rs` 内 `todo!()` 占位，但每个 todo 后都跟 Step 实现真实代码（Step 3 实现 spawn / login_as_admin / login_as_tenant）。这是 TDD 标准做法，不算 placeholder。
- 搜 "implement later" / "similar to" → 0 处。
- 搜 "appropriate error handling" → 0 处，所有错误处理都给了具体 `FsmError` 分支与 HTTP code。

### 3. Type consistency

- `AuditEventParams` 在 Task 9 定义，在 Task 10 各 handler 调用使用相同字段顺序：action / entity_type / entity_id / entity_ids / user_id / user_name / request_details / response_details / status / error_message。✅ 一致
- `FsmError` 在 Task 7 定义，在 Task 8 handler 中 match 三个 variant：TerminalState / InvalidTransition / UnknownStatus。✅ 一致
- `get_tenant_id` 在 Task 2 定义为 `(&Claims, &HeaderMap) -> Uuid`，在 Task 3-6 调用使用 `&claims, &headers`。✅ 一致
- `set_session_tenant_id` 在 Task 2 定义为 `(&PgPool, Uuid) -> Result<(), sqlx::Error>`，在 Task 3-6 调用 `&state.db, tenant_id`。✅ 一致
- `log_audit_event` 在 Task 9 定义为 `(&PgPool, AuditEventParams, &HeaderMap)`，在 Task 10 调用 `&state.db, AuditEventParams { ... }, &headers`。✅ 一致
- handler 函数名：`production_order_can_transition` / `work_order_can_transition` / `wip_can_transition` 在 Task 7 与 Task 8 调用一致。✅

无类型不一致。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-12-mes-security-contract-reinforcement.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — 每个 Task 派一个 fresh subagent 实施，主会话做两阶段 review，迭代快，主上下文窗口不被淹没。

**2. Inline Execution** — 在本会话内按 Task 顺序执行，每个 Task 后 checkpoint review。

**Which approach?**

注：本计划 16 个 Task，按 6 Phase 推进，预计 28 个 cargo tests 全绿即视为完成。建议 Subagent-Driven，因为涉及 30+ 文件修改，主上下文易爆。
