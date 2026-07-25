# TOPEMS 数据库迁移清单与安全校验报告

> 生成日期：2026-07-24
> 校验脚本：`scripts/verify_migrations.sh`
> CI 工作流：`.github/workflows/migration-test.yml`

---

## 1. 概览

本仓库在 `svc/` 下共有 **23 个服务**、**127 个 SQL 迁移文件**。迁移采用 [sqlx](https://github.com/launchbadge/sqlx) 风格的命名约定：`YYYYMMDDhhmmss_<描述>.sql`，其中文件名开头的 14 位数字时间戳即为迁移版本号（version）。

### 关于「V51–V60」

任务描述要求「文档化 V51–V60 新增表」。经全量检索（按文件名与文件内容匹配 `V51`–`V60`），**`svc/` 下不存在任何以 V51–V60 命名的 SQL 迁移文件**：

- 迁移文件统一使用日期时间戳命名（如 `20260720000001`），不存在 `V51`、`V52`…`V60` 这类版本号。
- `V51`–`V60` 仅出现在 Rust 源码模块名中（如 `svc/finance/src/modules/audit_v52.rs`、`svc/portal/src/modules/gateway_v51.rs`），属于应用层模块版本，与数据库迁移无关。
- 部分迁移 SQL 的注释里出现的版本标识为 `V15`、`V19.2`、`V19.5`、`V19.6` 等（应用发版标识），同样不是迁移文件名。

因此，下文「近期新增表」一节改为记录最近一批（2026-07-20 至 2026-07-23）通过迁移引入的新表，作为最贴近「新增表」语义的内容。

---

## 2. 各服务迁移文件数量

| 服务 | 迁移数 | 说明 |
|----------|:------:|------|
| mes      | 16 | 制造执行系统，迁移最多（含多轮表/列补齐） |
| erp      | 14 | 企业资源计划（⚠️ 存在重复版本号） |
| wms      | 10 | 仓储管理 |
| scm      | 9  | 供应链管理 |
| rd       | 9  | 研发管理 |
| finance  | 9  | 财务（含 CQRS 事件存储） |
| srm      | 7  | 供应商关系管理 |
| unified-core | 6 | 统一核心（多租户/权限/帮助表） |
| integration | 5 | 集成服务（⚠️ 存在重复版本号） |
| portal   | 4  | 门户（待办、快捷操作） |
| pm       | 4  | 项目管理 |
| mobile   | 4  | 移动端 |
| gis      | 4  | 地理信息 |
| ai       | 4  | AI 问答/向量 |
| lims     | 3  | 实验室信息管理 |
| hrm      | 3  | 人力资源 |
| ehs      | 3  | 环境健康安全 |
| crm      | 3  | 客户关系管理 |
| analytics| 3  | 数据分析 |
| qms      | 2  | 质量管理 |
| monitor  | 2  | 监控 |
| doc      | 2  | 文档管理 |
| pdm      | 1  | 产品数据管理 |
| **合计** | **127** | |

---

## 3. 近期新增表（2026-07-20 ~ 2026-07-23）

> 注：因不存在 V51–V60 迁移，此处记录最近一批迁移引入的新表。

| 服务 | 表名 | 迁移文件 | 用途 |
|------|------|----------|------|
| finance | `cqrs_events` | `20260723000001_event_store.sql` | CQRS 事件存储（聚合事件流） |
| finance | `cqrs_snapshots` | `20260723000001_event_store.sql` | CQRS 聚合快照 |
| finance | `cqrs_projection_progress` | `20260723000001_event_store.sql` | 投影器消费进度跟踪 |
| finance | `mv_voucher_summary` | `20260723000001_event_store.sql` | 凭证汇总物化视图表 |
| finance | `mv_receivable_aging` | `20260723000001_event_store.sql` | 应收账龄分析视图表 |
| erp | `erp.archive_marks` | `20260722130000_archive_hr_data.sql` | HR 数据归档标记表（HRM 独立后归档 ERP 遗留 HR 数据） |
| erp | `erp.v_archived_data`（视图） | `20260722130000_archive_hr_data.sql` | 已归档数据查询视图 |
| portal | `portal_todos` | `20260722123000_add_portal_todos.sql` | 门户本地待办事项（含 RLS 多租户隔离） |
| portal | `portal_quick_actions` | `20260722120000_add_quick_actions.sql` | 门户快捷操作配置（含 RLS 多租户隔离） |
| erp | `erp.fin_reconciliations` | `20260720000001_create_finance_reconciliation_tables.sql` | 财务对账主表 |
| erp | `erp.fin_reconciliation_records` | `20260720000001_create_finance_reconciliation_tables.sql` | 对账明细记录表 |
| erp | `erp.fin_reconciliation_rules` | `20260720000001_create_finance_reconciliation_tables.sql` | 对账匹配规则表 |
| crm | `crm.returns` | `20260721000002_create_crm_returns_tables.sql` | 退换货主表 |
| crm | `crm.return_items` | `20260721000002_create_crm_returns_tables.sql` | 退换货明细表 |
| erp | `erp.accounting_periods` | `20260721000001_create_accounting_periods_table.sql` | 会计期间表（开/关账管理） |
| wms | `wms.inventory_movements` | `20260721000003_create_inventory_movements_table.sql` | 库存移动记录表（入/出/调拨/退/调整） |

> 同期还有若干「幂等性补丁」迁移（`*_add_*_idempotency.sql`），用于为各服务补充幂等键与唯一索引，未新增表，故未列入上表。

---

## 4. CI 迁移测试现状（`.github/workflows/migration-test.yml`）

### 已覆盖的能力

- **触发条件**：PR 命中 `svc/**/migrations/**`、`database/migrations/**`、`lib/src/migration*/**` 或手动触发。
- **环境**：PostgreSQL 16 Alpine + sqlx-cli（postgres、rustls）。
- **Up-Replay 测试**：对每个服务的 `migrations` 目录执行 `sqlx migrate run`；随后 `DROP SCHEMA` 重置再重跑一次，验证可重放性。
- **多租户校验**：单独运行 `svc/unified-core/migrations`，并查询 RLS 启用情况与 `tenant_id` 列覆盖情况。
- **校验和报告**：输出 `_sqlx_migrations` 表内容到 `$GITHUB_STEP_SUMMARY`。
- **失败门禁**：汇总里出现 `❌` 即 `exit 1`。

### 缺口与改进建议

| 缺口 | 影响 | 建议 |
|------|------|------|
| **无真正的 Down（回滚）测试** | 当前「Down」实际是 `DROP SCHEMA` 后重跑 Up，并未验证每个迁移的回滚 SQL。sqlx 可逆迁移（`up.sql`/`down.sql`）或 `sqlx migrate revert` 未被覆盖。 | 引入 `sqlx migrate revert` 循环回滚，或采用 `_up.sql`/`_down.sql` 双文件约定并增加 revert 步骤。 |
| **重复版本号未被 CI 拦截** | 见下文问题 1/2：erp 与 integration 各有一对同版本号文件。sqlx 在同一 source 下遇到重复版本会报错，导致该服务 Up 阶段失败，但 CI 的 `continue` 逻辑会让该服务被记为 ❌ 后继续，问题被「记录」而非「阻断合并」。 | 在 PR 阶段先运行 `scripts/verify_migrations.sh` 静态校验，提前阻断重复版本号。 |
| **未覆盖 `database/migrations/` 与根 `migrations/` 的 sqlx 测试** | `database/migrations/`（如 `001-iam.sql`、`20260716000004_create_audit_logs_table.sql`）与根 `migrations/`（如 `005_create_iam_schema.sql`）只在触发路径里出现，但 `Run migration tests` 步骤只遍历 `svc/**/migrations`。 | 补充对 `database/migrations` 与根 `migrations` 的迁移测试。 |
| **依赖 `gen_random_uuid()` / `uuid_generate_v4()` 未统一** | finance 用 `gen_random_uuid()`（pgcrypto 内置），erp 用 `uuid_generate_v4()`（需 `uuid-ossp` 扩展）。CI 未显式 `CREATE EXTENSION`，可能导致 erp 归档迁移在干净库上失败。 | 在测试初始化阶段统一 `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS pgcrypto;` |
| **schema 命名不一致** | portal 用 `SET search_path TO portal` + 无 schema 前缀的 `CREATE TABLE`；erp/finance 多用 `erp.`/`core_finance_` 前缀。CI 用服务名建 schema，但 finance 部分迁移写到 `public`（如 `core_finance_vouchers`）。 | 统一 schema 策略，避免部分表落到 `public`。 |

---

## 5. 静态校验发现的问题

运行 `scripts/verify_migrations.sh`（结果：**127 文件，2 问题，退出码 1**）：

### 问题 1：erp 重复迁移版本号 `20260720000001`（严重）

- `svc/erp/migrations/20260720000001_create_finance_reconciliation_tables.sql`
- `svc/erp/migrations/20260720000001_create_budgets_table.sql`

两个文件共享同一版本前缀。sqlx 以文件名数字前缀作为版本号，**同版本号会导致 `sqlx migrate run` 报错**（`migration X was already applied` 或版本冲突），使整个 erp 服务的迁移无法前进。

**修复建议**：将其中之一重命名为下一个可用时间戳，例如把 `create_budgets_table.sql` 改为 `20260720000010_create_budgets_table.sql`（确保晚于同批次其它文件）。

### 问题 2：integration 重复迁移版本号 `20260625000001`（严重）

- `svc/integration/migrations/20260625000001_enhance_mes_erp_sync.sql`
- `svc/integration/migrations/20260625000001_create_mes_qms_sync.sql`

同样的问题：同一版本号被两个文件占用，sqlx 会拒绝执行。

**修复建议**：将 `create_mes_qms_sync.sql` 重命名为 `20260625000002_create_mes_qms_sync.sql`。

### 语法层面

除上述重复版本号外，对近期 9 个建表/改表迁移逐条人工复核，PostgreSQL 语法均合法：

- `CREATE TABLE IF NOT EXISTS` 语句括号平衡、列定义完整、主键/唯一约束/外键均正确。
- 索引定义（含部分索引 `WHERE deleted_at IS NULL`）语法正确。
- `DO $$ ... $$` 块、`CREATE OR REPLACE FUNCTION/TRIGGER`、`CREATE OR REPLACE VIEW` 均以分号结尾。
- portal 迁移正确使用 `SET search_path` / `RESET search_path` 与 `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY`。

---

## 6. 迁移安全建议

1. **立即修复两个重复版本号**（见问题 1、2），否则 erp 与 integration 的迁移在干净环境上无法应用。
2. **在 CI 中接入静态校验**：将 `scripts/verify_migrations.sh` 作为 `migration-test.yml` 的前置步骤（或独立 job），在运行 sqlx 之前拦截重复版本号、括号不匹配、缺分号等问题，快速失败。
3. **补充真正的回滚测试**：引入 `sqlx migrate revert` 或 `_down.sql` 约定，验证每个迁移可逆，避免「只能前进、无法回滚」的风险。
4. **统一 UUID 生成函数**：全量改用 `gen_random_uuid()`（PostgreSQL 13+ 内置，无需扩展），或在初始化脚本统一 `CREATE EXTENSION`。
5. **统一 schema 归属**：避免部分表写入 `public`，所有业务表应落在以服务名命名的 schema 内，便于隔离与 `DROP SCHEMA` 重置。
6. **覆盖 `database/migrations` 与根 `migrations`**：当前 CI 只测 `svc/**/migrations`，根级与 database 级迁移缺测试覆盖。
7. **为迁移文件加 checksum 校验**：`database/migrations/checksums.txt` 已存在但未在 CI 中校验，建议在迁移应用后比对 checksum 防止漂移。

---

## 7. 复现方式

```bash
# 静态校验（无需数据库）
sh scripts/verify_migrations.sh
# 期望输出：127 文件，2 问题（重复版本号），退出码 1
```
