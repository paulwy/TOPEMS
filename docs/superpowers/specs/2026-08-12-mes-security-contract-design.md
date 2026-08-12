# TOPEMS · MES 模块安全与行为契约加固设计规格

> **版本**: 1.0
> **日期**: 2026-08-12
> **作者**: TraeCode Agent
> **范围**: MES 模块全量安全加固（22 路由组 / 24 modules / 20+ DB 表）
> **填充深度**: B — 安全层 + 状态机 + 审计 + 契约对齐 + 测试
> **前序 spec**: CRM 全量填充（已完成 V183-V190）

---

## 1. 背景与目标

### 1.1 现状

MES 模块前端 34 路由 / 35 页面 / 20 schema / 22 API 客户端已全部真实实现（无占位页）。后端 24 modules / 25000 行 Rust / cargo check exit 0。但缺少四大基础设施：

| 缺口 | 严重度 | 现状 |
|------|--------|------|
| **tenant_id / RLS** | 🔴 严重 | 0 处——所有 handler 无租户隔离，跨租户数据泄漏风险 |
| **审计日志** | 🟡 高 | 0 处——audit_log model 存在但无人调用，无法追溯操作 |
| **状态机校验** | 🟡 高 | 0 处——ProductionOrder/WorkOrder/WIP 有隐式 status 转换但无 can_transition 校验，乱序操作可绕过 |
| **utoipa 补全** | 🟢 中 | 168 注解 / 9 文件有，15 文件缺失——OpenAPI 聚合不完整 |
| **测试覆盖** | 🟡 高 | 0 单元测试（oee_logic_tests 独立存在） |

**已有良好基础**（不需重做）：
- ✅ 权限检查：205 处 check_permission 调用 / 25 文件 / 30+ MesPermission 枚举
- ✅ Claims 注入：216 处 Extension(claims) / 27 文件
- ✅ 前端 typecheck 0 错误
- ✅ 后端 cargo check 0 错误

### 1.2 目标

1. **tenant_id + RLS**：20+ DB 表添加 tenant_id 列 + handler 双写 WHERE + RLS 策略
2. **状态机**：ProductionOrder（5 阶段）、WorkOrder（6 阶段）、WIP（3 阶段）can_transition 函数 + handler 校验
3. **审计日志**：关键写操作（create/update/delete/status_change/transfer）接入 audit_log
4. **utoipa 补全**：15 个缺失模块补齐 #[utoipa::path] 注解
5. **契约对齐**：check-mes-contract.mjs 脚本 + pre-commit hook
6. **测试**：FSM 单元测试 + pagination 钳制 + RLS 隔离测试 ≥ 70% 覆盖
7. **验收三联**：typecheck / cargo check -D warnings / verify_navigation 全绿

### 1.3 非目标

- 不重写已有页面/后端逻辑（前端已就位、后端 handler 已有真实 SQL）
- 不做分析页 Mock 层（MES 分析页已有真实后端聚合 SQL，不需 mock）
- 不做审批骨架（MES 无审批需求，状态机即行为契约）
- 深度 C（APS 优化算法、OEE 实时采集、能耗预测模型）→ 后续 spec

---

## 2. 方案概述

### 2.1 实施路径（6 Phase）

```
Phase 1 · tenant_id + RLS 基线（全表）
  ├── DB migration: 20+ 表添加 tenant_id UUID NOT NULL + 索引 + RLS 策略
  ├── handler 改造: 所有 list/get 加 WHERE tenant_id = $1 + 所有 create/insert 注入 tenant_id
  ├── AppState 已有 Claims → 提取 tenant_id 工具函数
  └── 验收: RLS 跨租户隔离测试 0 条泄漏

Phase 2 · 三状态机 formalize
  ├── ProductionOrder: draft → pending → released → in_progress → completed/cancelled
  ├── WorkOrder: pending → started → paused → completed/cancelled
  ├── WIP: in_progress → transferred → completed
  ├── can_transition(from, to) 函数 + handler 内调用
  └── 验收: FSM 邻接对单元测试全覆盖

Phase 3 · 审计日志接入
  ├── 关键写操作: create/update/delete/release/start/complete/cancel/pause/transfer
  ├── 复用 CRM 的 log_audit_event 模式
  ├── action 命名: mes.{entity}.{action}
  └── 验收: grep 审计调用 ≥ 50 处

Phase 4 · utoipa 补全 + 契约对齐
  ├── 15 个缺失模块补 #[utoipa::path] 注解
  ├── check-mes-contract.mjs 脚本（复用 CRM 模板）
  ├── .husky/pre-commit 追加 MES 契约检查
  └── 验收: OpenAPI 聚合 0 缺失路由

Phase 5 · 测试覆盖
  ├── production_order_fsm_test.rs
  ├── work_order_fsm_test.rs
  ├── wip_fsm_test.rs
  ├── pagination_test.rs
  ├── rls_isolation_test.rs
  └── 验收: cargo test ≥ 20 tests pass

Phase 6 · 验收三联 + 冒烟
  ├── pnpm typecheck / cargo check -D warnings / verify_navigation
  └── 手工冒烟: 生产订单全流程 / 工单状态流转 / WIP 转移 / 越权 403
```

---

## 3. tenant_id + RLS 设计

### 3.1 受影响表清单（20 表）

| # | 表名 | 模块 | 当前 tenant_id | 改造方式 |
|---|------|------|----------------|---------|
| 1 | production_orders | production_order | ❌ | ADD COLUMN + index + RLS |
| 2 | production_processes | production_process | ❌ | 同上 |
| 3 | production_records | production_record | ❌ | 同上 |
| 4 | equipment | equipment | ❌ | 同上 |
| 5 | work_stations | work_station | ❌ | 同上 |
| 6 | production_schedules | production_scheduling | ❌ | 同上 |
| 7 | material_boms | material_bom | ❌ | 同上 |
| 8 | bom_items | material_bom | ❌ | 同上 |
| 9 | material_issues | material_bom | ❌ | 同上 |
| 10 | material_issue_items | material_bom | ❌ | 同上 |
| 11 | material_returns | material_bom | ❌ | 同上 |
| 12 | material_return_items | material_bom | ❌ | 同上 |
| 13 | quality_records | quality_management | ❌ | 同上 |
| 14 | batch_records | quality_management | ❌ | 同上 |
| 15 | equipment_oee | equipment_oee | ❌ | 同上 |
| 16 | wips | wip | ❌ | 同上 |
| 17 | wip_transfers | wip | ❌ | 同上 |
| 18 | teams | team | ❌ | 同上 |
| 19 | team_members | team | ❌ | 同上 |
| 20 | material_requirements | material_requirement | ❌ | 同上 |
| 21 | equipment_inspections | equipment | ❌ | 同上 |
| 22 | equipment_maintenance_records | equipment | ❌ | 同上 |

### 3.2 Migration SQL 模板

```sql
-- svc/mes/migrations/20260812120000_add_tenant_id_all_tables.sql
-- 对每张表执行:
ALTER TABLE {table} ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
CREATE INDEX IF NOT EXISTS idx_{table}_tenant_id ON {table}(tenant_id);
-- RLS
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {table} FORCE ROW LEVEL SECURITY;
CREATE POLICY {table}_tenant_isolation ON {table}
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
```

### 3.3 Handler 改造模板

```rust
// 从 Claims 提取 tenant_id（复用 CRM 模式）
pub fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    claims.tenant_id
        .or_else(|| headers.get("x-tenant-id").and_then(|v| v.to_str().ok()).and_then(|s| Uuid::parse_str(s).ok()))
        .unwrap_or(Uuid::nil())
}

// list handler 改造
let tenant_id = get_tenant_id(&claims, &headers);
sqlx::query_as::<_, ProductionOrder>(
    "SELECT * FROM production_orders WHERE tenant_id = $1 AND deleted_at IS NULL ..."
).bind(tenant_id)

// create handler 改造
sqlx::query(
    "INSERT INTO production_orders (tenant_id, ...) VALUES ($1, ...)"
).bind(tenant_id)
```

---

## 4. 三状态机设计

### 4.1 ProductionOrder FSM（5 阶段 2 终态）

```
① 草稿 · draft
  ↓ release
② 待生产 · pending
  ↓ start
③ 生产中 · in_progress (released in current code)
  ↓ complete
④ 已完成 · completed        终态
  ↑
  ②①②③ ──▶ ❌ 已取消 · cancelled   终态（从 draft/pending/in_progress 可取消）
```

**can_transition 规则：**
- draft → pending (release)
- pending → in_progress (start)
- in_progress → completed (complete)
- draft/pending/in_progress → cancelled (cancel)
- completed/cancelled → * 拒绝（终态保护）

### 4.2 WorkOrder FSM（6 阶段 2 终态）

```
① 待开始 · pending
  ↓ start
② 进行中 · in_progress
  ↓ pause           ↑ resume
③ 已暂停 · paused
  ↓ complete
④ 已完成 · completed    终态
  ①②③ ──▶ ❌ 已取消 · cancelled   终态
```

### 4.3 WIP FSM（3 阶段）

```
① 在制 · in_progress
  ↓ transfer
② 已转移 · transferred
  ↓ complete
③ 已完成 · completed    终态
```

### 4.4 接口契约

```rust
// 每个实体在 modules/{entity}.rs 中定义
pub fn can_transition(from: &str, to: &str) -> Result<(), &'static str> {
    // 邻接对校验
    // 终态保护
    // 乱序拒绝
}

// handler 内调用
let current = existing.status.as_str();
let target = "released";
can_transition(current, target).map_err(|e| {
    api_error(422, &format!("MES::INVALID_TRANSITION: {}", e))
})?;
```

---

## 5. 审计日志设计

### 5.1 action 命名规范

```
mes.production_order.{create|update|delete|release|start|complete|cancel}
mes.work_order.{create|update|delete|start|pause|resume|complete|cancel}
mes.wip.{create|update|delete|transfer}
mes.equipment.{create|update|delete|maintenance}
mes.material_bom.{create|update|delete|issue|return}
mes.quality.{create_inspection|update_inspection|create_standard|...}
```

### 5.2 审计字段

```json
{
  "action": "mes.production_order.release",
  "entity_type": "production_order",
  "entity_id": "UUID",
  "request_details": { /* 原请求体 */ },
  "response_details": { "old_status": "pending", "new_status": "released" },
  "status": "success",
  "user_id": "from claims.sub"
}
```

---

## 6. utoipa 补全清单

| # | 模块 | 当前注解数 | 需补 | 优先级 |
|---|------|-----------|------|--------|
| 1 | anomaly_detection | 0 | 全部 | 中 |
| 2 | aps_scheduling | 0 | 全部 | 中 |
| 3 | dashboard_ws | 0 | 全部 | 低（WebSocket） |
| 4 | energy_management | 0 | 全部 | 中 |
| 5 | material_requirement | 0 | 全部 | 高 |
| 6 | mes_plugin | 0 | 全部 | 低 |
| 7 | oee_logic | 0 | N/A（逻辑模块） | — |
| 8 | process_flow | 0 | 全部 | 高 |
| 9 | process_route | 0 | 全部 | 高 |
| 10 | production_process | 0 | 全部 | 高 |
| 11 | production_record | 0 | 全部 | 高 |
| 12 | production_scheduling | 0 | 全部 | 高 |
| 13 | quality_management/* | 0 | 全部 | 高 |
| 14 | quality_traceability | 0 | 全部 | 中 |
| 15 | team | 0 | 全部 | 中 |
| 16 | work_station | 0 | 全部 | 高 |
| 17 | material_bom/* | 0 | 全部 | 高 |
| ✅ | equipment | 12 | — | 已有 |
| ✅ | equipment_oee | 7 | — | 已有 |
| ✅ | production_order | 10 | — | 已有 |
| ✅ | production_kanban | 5 | — | 已有 |
| ✅ | work_order | 10 | — | 已有 |
| ✅ | work_report | 8 | — | 已有 |
| ✅ | wip | 8 | — | 已有 |
| ✅ | production_scheduling | 7 | — | 已有 |
| ✅ | production_cost | 0→补 | 补 | 高 |
| ✅ | mes_compat | 101 | — | OpenAPI-only stub |

---

## 7. 错误码前缀

| 错误码 | HTTP | 含义 |
|--------|------|------|
| `MES::TENANT_MISMATCH` | 403 | 跨租户访问 |
| `MES::INVALID_TRANSITION` | 422 | 状态机非法推进 |
| `MES::VALIDATION_ERROR` | 422 | 字段校验失败 |
| `MES::NOT_FOUND` | 404 | 实体不存在 |
| `MES::INTERNAL` | 500 | 兜底 |

---

## 8. 测试策略

### 8.1 后端单元测试（cargo test，目标 ≥ 20 tests）

- `production_order_fsm_test.rs`：can_transition 邻接对 + 终态保护 + 乱序拒绝
- `work_order_fsm_test.rs`：同上
- `wip_fsm_test.rs`：同上
- `pagination_test.rs`：page_size 钳制 + search 长度
- `rls_isolation_test.rs`：跨租户 0 条 + 双写 WHERE 生效

### 8.2 契约一致性

- `scripts/dev/check-mes-contract.mjs`（复用 CRM 模板，改前缀）
- `.husky/pre-commit` 追加 MES 契约检查 hook

### 8.3 验收标准

```
必过三联:
1. pnpm typecheck                    exit 0
2. RUSTFLAGS="-D warnings" cargo check -p topems-mes   exit 0
3. node scripts/verify_navigation.mjs --strict        exit 0

推荐二联:
4. cargo test -p topems-mes           ≥ 20 tests pass
5. node scripts/dev/check-mes-contract.mjs   exit 0
```

---

## 9. 交付物清单

- [ ] Phase 1: tenant_id migration + handler 改造 + RLS 隔离测试
- [ ] Phase 2: 3 FSM can_transition + handler 校验 + 邻接对测试
- [ ] Phase 3: 审计日志接入（≥ 50 处关键写操作）
- [ ] Phase 4: utoipa 补全 15 模块 + check-mes-contract.mjs + pre-commit
- [ ] Phase 5: 测试覆盖 ≥ 20 tests
- [ ] Phase 6: 验收三联通过

---

## 10. 风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| tenant_id 列添加导致已有数据 NOT NULL 约束失败 | 高 | 数据迁移中断 | 使用 DEFAULT '00000000-...' 先填充再改 NOT NULL |
| handler 改造数量大（22 表 × 平均 5 handler = 110 处） | 高 | 回归风险 | 分批改造，每批验证 cargo check |
| utoipa 补全后 OpenAPI spec 变化大 | 中 | 前端类型需重新生成 | 契约对齐脚本兜底 |
| RLS 策略与已有 handler WHERE 双写性能 | 低 | 查询慢 | 优先安全，benchmark 后优化 |

---

**_End of MES security & contract spec v1.0_**
