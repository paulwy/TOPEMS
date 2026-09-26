# V70-2 Step2 topems_shared 去门面化最终闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 替换 5 个服务中最后 8 条对 COMPAT 区符号的引用为直接子 crate 路径，删除 lib.rs 全部 COMPAT 区，实现 topems_shared 去门面化彻底闭环，最终 pub use 数量 ≤ 30。

**Architecture:** Step1 已删除 101 条 0 引用 re-export 并补全依赖。Step2 先批量替换 5 个服务的实际引用路径（并行无冲突），再整体移除 COMPAT 区，最后通过 workspace cargo check + 前端质量门禁验证闭环。

**Tech Stack:** Rust workspace (29 crates), axum 0.8.x, sqlx 0.8, Node 22 + pnpm 10, TypeScript 5.9 + React 19 + MUI 7

---

## 文件结构与变更矩阵

| # | 文件 | 变更类型 | 变更内容 |
|---|------|---------|---------|
| 1 | `svc/crm/src/modules/mod.rs` | 改 | L36-39, L56: `topems_shared::event::`→`topems_shared_event::event::`；`topems_shared::service_client::`→`topems_shared_service_client::service_client::` |
| 2 | `svc/crm/src/modules/aftersales.rs` | 改 | L1325: `topems_shared::service_client::WmsServiceClient`→直接子 crate 路径 |
| 3 | `svc/mes/src/modules/production_order.rs` | 改 | L18: `use topems_shared::event::`→`use topems_shared_event::event::` |
| 4 | `svc/rd/src/modules/mod.rs` | 改 | L5: 删除重复 `use topems_shared::SystemMetrics;`（L9 已用直接路径） |
| 5 | `svc/gis/Cargo.toml` | 改 | 新增 `topems-shared-observability = { workspace = true }` |
| 6 | `svc/gis/src/main.rs` | 改 | L25: `use topems_shared::telemetry_middleware`→`use topems_shared_observability::telemetry::telemetry_middleware` |
| 7 | `svc/integration/Cargo.toml` | 改 | 新增 `topems-shared-observability = { path = "../../lib/shared-observability" }` |
| 8 | `svc/integration/src/routes.rs` | 改 | L7: `use topems_shared::telemetry_middleware`→直接子 crate 路径 |
| 9 | `lib/src/lib.rs` | 改 | 删除 L79-L102 整个 COMPAT 区（6模块级+7条目级=13条）；重写文件头注释为 A4.3 最终完成态；最终 pub use 条目数 ≤ 30 |

---

### Task 1: CRM 服务引用路径替换（2 文件 × 6 处）

**Files:**
- Modify: `svc/crm/src/modules/mod.rs:36-56`
- Modify: `svc/crm/src/modules/aftersales.rs:1325`
- Test: `cargo check -p topems-crm` (SQLX_OFFLINE=true)

- [ ] **Step 1: 替换 mod.rs 中 5 处类型引用**

```
L36:  topems_shared::event::publisher::EventPublisher
  →  topems_shared_event::event::publisher::EventPublisher
L37:  topems_shared::service_client::ErpServiceClient
  →  topems_shared_service_client::service_client::ErpServiceClient
L38:  topems_shared::service_client::WmsServiceClient
  →  topems_shared_service_client::service_client::WmsServiceClient
L39:  topems_shared::service_client::WorkflowServiceClient
  →  topems_shared_service_client::service_client::WorkflowServiceClient
L56:  topems_shared::service_client::WorkflowServiceClient (impl FromRef)
  →  topems_shared_service_client::service_client::WorkflowServiceClient
```

- [ ] **Step 2: 替换 aftersales.rs L1325 类型注解**

```
L1325: let wms_client: &Arc<topems_shared::service_client::WmsServiceClient>
    → let wms_client: &Arc<topems_shared_service_client::service_client::WmsServiceClient>
```

- [ ] **Step 3: 单服务 cargo check 验证无 E0432/E0599**

Run: `SQLX_OFFLINE=true cargo check -p topems-crm 2>&1 | grep -E '^error' | head -20`
Expected: 空（0 个 import 错误）

---

### Task 2: MES / RD / GIS / Integration 服务引用替换（并行）

#### 2a. MES production_order.rs

**Files:** Modify `svc/mes/src/modules/production_order.rs:18`

- [ ] **Step 1: 替换 event 导入路径**

```
L18: use topems_shared::event::{EventType, ProductionOrderCreatedPayload};
  → use topems_shared_event::event::{EventType, ProductionOrderCreatedPayload};
```

- [ ] **Step 2: cargo check -p topems-mes** — E0432=0

#### 2b. RD modules/mod.rs（去重）

**Files:** Modify `svc/rd/src/modules/mod.rs:5`

- [ ] **Step 1: 删除重复导入**

L5 `use topems_shared::SystemMetrics;` 与 L9 `use topems_shared_core::health::SystemMetrics;` 重复。删除 L5。

- [ ] **Step 2: cargo check -p topems-rd** — E0432=0

#### 2c. GIS（补依赖 + 替换）

**Files:**
- Modify `svc/gis/Cargo.toml` (dependencies 段末尾追加)
- Modify `svc/gis/src/main.rs:25`

- [ ] **Step 1: Cargo.toml 追加 observability 依赖**

在 `[dependencies]` 段追加：
```
topems-shared-observability = { workspace = true }
```

- [ ] **Step 2: 替换 main.rs 导入**

```
L25: use topems_shared::telemetry_middleware;
  → use topems_shared_observability::telemetry::telemetry_middleware;
```

- [ ] **Step 3: cargo check -p topems-gis** — E0432=0

#### 2d. Integration（补依赖 + 替换）

**Files:**
- Modify `svc/integration/Cargo.toml`
- Modify `svc/integration/src/routes.rs:7`

- [ ] **Step 1: Cargo.toml 追加 observability 依赖**

在 `[dependencies]` 段追加：
```
topems-shared-observability = { path = "../../lib/shared-observability" }
```

- [ ] **Step 2: 替换 routes.rs 导入**

```
L7: use topems_shared::telemetry_middleware;
  → use topems_shared_observability::telemetry::telemetry_middleware;
```

- [ ] **Step 3: cargo check -p topems-integration** — E0432=0

---

### Task 3: 删除 lib.rs COMPAT 区 + 重写文件头（最终里程碑）

**Files:** Modify `lib/src/lib.rs:1-102`

- [ ] **Step 1: 重写文件头注释（A4.3 最终态）**

```
// =============================================================================
// topems_shared 门面 Crate — A4.3 闭环完成
// =============================================================================
//
// V70-2 里程碑：所有 29 服务已完成去门面化迁移，直接依赖子 crate。
// 本文件仅保留 KEEP 区（≤30 条）高频、跨服务通用的 re-export。
// - AI Form Assistant 内部模块通过 pub mod 暴露，非子 crate re-export。
// - 扩展 trait（AuditContextExt）继续在此处提供兼容。
//
// 子 crate 清单（服务直接依赖，不经本门面）：
//   topems-shared-auth, topems-shared-bootstrap, topems-shared-core,
//   topems-shared-db, topems-shared-event, topems-shared-observability,
//   topems-shared-service-client
// =============================================================================
```

- [ ] **Step 2: 删除 COMPAT 整块（L75-L102，注释 + pub use 共 ~28 行）**

删除从 `// =============================================================================` (COMPAT 分隔注释) 到 `pub use topems_shared_observability::telemetry::telemetry_middleware;` 的全部内容。

- [ ] **Step 3: 清点 pub use 数量，验证 ≤ 30**

KEEP 区实际条目统计（含行号基准）：
- 模块级 (auth/middleware/permission/security/tenant, bootstrap *, config/error/health/logging/response/service_config/service_port/validation, audit/database/schema, LocalInMemoryCache/common_types/l2_cache/list_resp) ≈ 18 条
- 条目级 (auth::, api_version::, cors::create_cors_layer, error::, audit::, database::) ≈ 8 条
- 合计 ≤ 28 条，满足 ≤ 30 要求

---

### Task 4: 全量 Workspace 编译验证

- [ ] **Step 1: cargo check workspace，过滤 import/方法错误**

Run:
```bash
SQLX_OFFLINE=true cargo check --workspace 2>&1 \
  | grep -E '^error\[E(0432|0433|0599)\]' | head -50
```
Expected: 空输出（0 个 import / unresolved import / no method 错误）

- [ ] **Step 2: 记录总错误数（含 SQLX offline），确认仅允许 SQLX 离线类 warning**

Run:
```bash
SQLX_OFFLINE=true cargo check --workspace 2>&1 | grep -cE '^error\['
```
Expected: 0（SQLX offline 无网络错误已通过 .sqlx/ 缓存规避）

---

### Task 5: 前端质量门禁（与 Task 4 并行）

- [ ] **Step 1: pnpm lint**

Run: `cd frontend && pnpm lint 2>&1 | tail -5`
Expected: `0 errors`

- [ ] **Step 2: tsc 类型检查**

Run: `cd frontend && pnpm tsc --noEmit 2>&1 | tail -5`
Expected: exit 0, 无 type error

- [ ] **Step 3: 8 项 CI 脚本跑通**

Run:
```bash
cd frontend
for s in scripts/ci/{check-nav-tree-triples.mjs,check-l4-labels.mjs,check-homepage-modules.mjs,check-header-toolbar-order.mjs,check-single-primary-button.mjs,check-mobile-overflow.mjs,check-ai-context-injection.mjs,check-backbutton-backhref.mjs,check-breadcrumb-detailname.mjs}; do
  echo "== $s =="; node $s --strict 2>&1 | tail -2
done
```
Expected: 全部 PASS，exit 0

---

### Task 6: Conventional Commits 提交 + 推送

- [ ] **Step 1: 确认 git status 变更清单**

预期文件列表（共 10 个）：
```
lib/src/lib.rs
svc/crm/src/modules/mod.rs
svc/crm/src/modules/aftersales.rs
svc/mes/src/modules/production_order.rs
svc/rd/src/modules/mod.rs
svc/gis/Cargo.toml
svc/gis/src/main.rs
svc/integration/Cargo.toml
svc/integration/src/routes.rs
TODO.md
```

- [ ] **Step 2: 语义 commit**

```
refactor(lib): V70-2 Step2 · 去门面化彻底闭环；COMPAT区全删；5服务改直接路径

- crm/mes/rd: event/service_client/SystemMetrics 3符号改直接子crate引用
- gis/integration: 补 observability 依赖；telemetry_middleware 改直接路径
- lib.rs: 删除 COMPAT 区全部 13 条 re-export（6模块级+7条目级）
- 文件头更新为 A4.3 闭环完成态；最终 pub use ≤28 条
- workspace cargo check E0432/E0433/E0599 = 0

Closes: V70-2 topems_shared 去门面化彻底闭环
```

- [ ] **Step 3: git push 至 main 分支**

---

### Task 7: TODO.md 更新

- [ ] **Step 1: 定位 V70-2 条目，标记完成**

在 TODO.md 中找到 V70-2（topems_shared 去门面化最终闭环）条目，更新状态为 ✅ 100%，记录完成日期、关键验收数字（pub use ≤28、workspace cargo check 0 import errors、29 服务全迁移）。

---

## 验收标准清单

| # | 验收项 | 通过条件 |
|---|--------|---------|
| 1 | lib.rs pub use 数 | grep -c '^pub use' lib/src/lib.rs ≤ 30 |
| 2 | COMPAT 区残留 | grep -c 'COMPAT' lib/src/lib.rs = 0（注释中历史说明除外） |
| 3 | 无门面残留引用 | grep -rn 'topems_shared::event\|topems_shared::service_client\|topems_shared::telemetry_middleware\|topems_shared::SystemMetrics' svc/ = 0 |
| 4 | cargo check 无 import 错误 | E0432/E0433/E0599 计数 = 0 |
| 5 | 前端质量门禁 | lint=0, tsc=0, 8CI 脚本全部 PASS |
| 6 | 提交记录 | git log -1 符合 Conventional Commits 规范 |
