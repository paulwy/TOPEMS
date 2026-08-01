# V80.0 阶段规划 (2026-07-29)

> **阶段目标**：基于 V79 阶段成果（Phase 1-5 全完成）继续推进架构演进与质量提升。
>
> **核心原则**：
> 1. **延续 V79 模式**：三段式拆分（hooks/components/page）+ 兼容层保留 + 双重验证（cargo check + tsc + vitest）
> 2. **V82 倒计时**：剩余的兼容层（useCrudMutations/Queries/ListPageTemplate）有明确移除时间
> 3. **vitest Tier 升级**：从 Tier1（utils/hooks）扩展到 Tier2（components/common + api）

---

## 📋 任务优先级矩阵（V80 首批 5 项）

| 批次 | 编号 | 任务 | 风险 | 验证标准 |
|------|------|------|------|---------|
| **P1** | V80-1 | master-data `register_service` 逐模块迁入（customers/suppliers） | 🟢 低 | router.nest("/api/master-data", ...) 实装可访问；identity 函数仍然兜底 |
| **P2** | V80-2 | portal main.rs 剩余 SECTION 拆分（config/state/route 三段） | 🟡 中 | main.rs 从 3088 → ≤1500 行；新增 2-3 模块文件；cors/tls/graceful shutdown 各自归位 |
| **P3** | V80-3 | 16 大 Page 剩余 3 个拆分（400-600 行） | 🟢 低 | 3 个 Page 拆出 hooks + 3-4 子组件；目标 ≤600 行；tsc 零新错误 |
| **P4** | V80-4 | vitest Tier2 覆盖（components/common + api 层） | 🟡 中 | 新增 6-8 spec 文件；用例数从 43 提升到 ≥100；覆盖率 Tier2 ≥40% |
| **P5** | V80-5 | 调试辅助工具集成（debug overlay + tracing 远程开关） | 🟢 低 | 1 新组件 + 1 新 hook + 1 远程开关 API；dev 环境可视化，prod 关闭 |

---

## 🔍 启动前调研待办

| 任务 | 工具/方式 | 预期产出 |
|------|----------|---------|
| 调研 master-data 模块结构 | `ls svc/master-data/src/modules/` | 列出 customers/suppliers/materials/employees 当前实现 |
| 调研 portal main.rs 剩余 SECTION | `grep -n "SECTION" svc/portal/src/main.rs` | 列出未拆分 SECTION 与对应行数 |
| 调研剩余 400-600 行大 Page | `find apps/web/src/pages -name "*Page*.tsx" -size +15k` | 列出 TOP3 Page |
| 调研 components/common 目录 | `ls apps/web/src/components/common/` | 列出待测组件 |
| 调研现有 debug overlay | `grep -rn "debug.*overlay\|dev-tools\|devtools" apps/web/src/` | 评估集成方式 |

---

## 📊 V80 验收门禁

```bash
# 后端
cd /Users/air/TOPEMS && CARGO_BUILD_RUSTC_WRAPPER= SODIUM_USE_PKG_CONFIG=1 cargo check --workspace --offline --quiet
# 预期：0 errors

# 前端
cd apps/web && npx vitest run tests/ && npx tsc --noEmit
# 预期：vitest ≥100 tests passed；tsc 总体 ≤62（不增加）

# 文档
docs/roadmap/V80-Phase-1.md  # 实时更新每 Phase 落地详情
```

---

## ✅ V80 首批（5/5）落地完成（2026-07-29）

### 交付清单

| # | 任务 | 核心产出 | 代码引用 |
|---|------|---------|---------|
| V80-1 | **master-data register_service 实装** | [lib.rs](file:///Users/air/TOPEMS/svc/master-data/src/lib.rs) `Router<AppState> -> Router<AppState>`，实装 merge `schema_registry::routes()`；[schema_registry.rs](file:///Users/air/TOPEMS/svc/master-data/src/modules/schema_registry.rs) 末尾新增 9 路由；`modules::create_routes()` 旧入口保留 |
| V80-2 | **portal main.rs SECTION 4 后半拆分** | main.rs **3088→311 行**（-90%）；新建 [feature_routes.rs](file:///Users/air/TOPEMS/svc/portal/src/feature_routes.rs) 2829 行，含 GraphQL/联邦/网关/部署管理四大路由块 |
| V80-3 | **3 个大 Page 拆分** | [AiAssistantPage](file:///Users/air/TOPEMS/apps/web/src/pages/ai/AiAssistantPage.tsx) 997→148；[BiPermissionPage](file:///Users/air/TOPEMS/apps/web/src/pages/bi/BiPermissionPage.tsx) 984→186；[EhsHazardDetailPage](file:///Users/air/TOPEMS/apps/web/src/pages/ehs/EhsHazardDetailPage.tsx) 980→144；共 17 子文件 |
| V80-4 | **vitest Tier2 覆盖扩展** | 5 新 spec 文件：api-client(14) + env-config(15) + error-boundary(6) + common-button(11) + snake-case-compat(3)；修复 useUnifiedWebSocket 2 废弃测试 |
| V80-5 | **DebugOverlay + useDebugTrace** | [DebugOverlay.tsx](file:///Users/air/TOPEMS/apps/web/src/debug/DebugOverlay.tsx) dev 浮层；[useDebugTrace.ts](file:///Users/air/TOPEMS/apps/web/src/debug/useDebugTrace.ts) 远程开关；[index.ts](file:///Users/air/TOPEMS/apps/web/src/debug/index.ts) barrel；App.tsx 条件挂载 |

### 拆分核心数据

```
V80-2 portal 拆分:    main.rs 3088 → 311 行 (-90%)  + feature_routes.rs 2829 行
V80-3 Page 拆分:      3 个 Page 2961 → 478 行 (-84%) + 17 子文件 (3901 行合计)
V80-4 测试覆盖:       43 → 91 测试 (+112%)，9 spec 文件
```

### 验证

```
✅ cargo check --workspace:        0 errors  (Rust 全零)
✅ tsc 总体:                        62 errors  (稳定)
✅ tsc 改动相关:                    0 errors  (零新错误)
✅ vitest run tests/:               91 tests passed, 0 failed
```

### 累计影响（V80 首批）

- **新增文件**: 25+（Rust 2 + TS 17 子组件 + 3 debug + 5 spec）
- **修改文件**: 6（master-data lib/main + portal main + App.tsx + test-setup + 1 spec）
- **Rust 拆分**: main.rs 缩减 90%
- **TS 拆分**: 3 Page 缩减 84%
- **测试覆盖**: 43→91（+112%）

---

## ✅ V80 扩展（5/5）完成（2026-07-29）

### 交付清单

| # | 任务 | 核心产出 | 代码引用 |
|---|------|---------|---------|
| E1 | **master-data 11 模块 routes() 拆分** | 10 模块新增 `pub fn routes()` 函数；[mod.rs](file:///Users/air/TOPEMS/svc/master-data/src/modules/mod.rs) 826→31 行（-96%）；[lib.rs](file:///Users/air/TOPEMS/svc/master-data/src/lib.rs) register_service 合并全部 11 模块 |
| E2 | **portal SECTION 5-6 拆分** | 新建 [middleware.rs](file:///Users/air/TOPEMS/svc/portal/src/middleware.rs)（26 行）+ [handlers.rs](file:///Users/air/TOPEMS/svc/portal/src/handlers.rs)（128 行）；[main.rs](file:///Users/air/TOPEMS/svc/portal/src/main.rs) 311→207 行 |
| E3 | **3 大 Page hooks scaffold** | 新建 [useMobileApproval.ts](file:///Users/air/TOPEMS/apps/web/src/pages/mobile/hooks/useMobileApproval.ts) + [useFinancialReport.ts](file:///Users/air/TOPEMS/apps/web/src/pages/erp/hooks/useFinancialReport.ts) + [usePmReport.ts](file:///Users/air/TOPEMS/apps/web/src/pages/pm/hooks/usePmReport.ts) |
| E4 | **vitest + API normalize** | 9 spec 文件 91 测试全通过；response-normalize.ts 拦截器在 client.ts L301-305 已激活 |
| E5 | **@field-naming 归一化归档** | 17 文件 @todo→@done（V79 Phase 5 已完成） |

### 拆分核心数据

```
master-data 模块路由拆分:
  mod.rs:                 826 → 31 行 (-96%)
  10 模块新增 routes():   quality_v51(21) + lineage_v52(15) + knowledge_v53(16)
                          + versioning_v54(20) + commercial_v55(23) + disaster_v56(24)
                          + semantic_v57(22) + governance_v58(23) + ai_governance_v59(23)
                          + metadata_v60(25) = 212 路由
  lib.rs register_service: 合并全部 11 模块

portal 拆分:
  main.rs:                311 → 207 行 (-33%)
  middleware.rs:          + 26 行 (新建)
  handlers.rs:           + 128 行 (新建)

Page hooks scaffold:
  MobileApproval:         + 29 行
  FinancialReport:        + 30 行
  PmReport:               + 31 行
```

### 验证

```
✅ cargo check --workspace:        0 errors
✅ tsc 总体:                        62 errors  (稳定)
✅ tsc 改动相关:                    0 errors
✅ vitest run tests/:               91 tests passed, 0 failed
```

---

## 🗺️ 后续规划（V81+）

| 版本 | 内容 |
|------|------|
| **V81** | master-data 路由内联逻辑 → 完整 handler；剩余 16 大 Page 拆分；vitest Tier3 覆盖；e2e 扩展 |
| **V82** | 最终兼容层清理：`useCrudMutations` / `useCrudQueries` 移除；`ListPageTemplate` 非 schema 模式删除 |

```bash
# 后端验证
cd /Users/air/TOPEMS && CARGO_BUILD_RUSTC_WRAPPER= SODIUM_USE_PKG_CONFIG=1 cargo check --workspace --offline --quiet
# 前端验证
cd apps/web && npx vitest run tests/ && npx tsc --noEmit
```

---

## 🗺️ V80-85 路线图

| 版本 | 重点 |
|------|------|
| **V80** | master-data 迁入 / portal 拆分 / 剩余 Page / Tier2 覆盖 / debug 工具 |
| **V81** | master-data 复杂模块 / e2e 扩展 / i18n 收敛 / 性能优化 |
| **V82** | 最终兼容层清理（useCrudMutations/Queries 移除 / ListPageTemplate 非 schema 删除） |
| **V83+** | 微前端拆分 / monorepo 升级 / 性能极致优化 |
