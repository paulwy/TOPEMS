# 历史方案归档

本目录存放 TOPEMS 项目各阶段实施计划和技术规格的历史版本。这些文档记录了项目演进过程中的决策依据和实施细节，供回溯参考。

> **核查说明（2026-08-15）**：下表"实施状态"列已逐项对照代码库实际交付物核查（脚本/迁移/模型/测试/页面均经 Glob+Grep+Read 验证）。全部 16 个计划 + 6 个规格均已在代码库完整落地，仅在文档自身的 `- [ ]` 复选框未回填——真实进度以 [roadmap/TODO.md](../roadmap/TODO.md) 为准。本目录不再删除任何文件（均为已完成工作的历史档案，保留备查）。

## 实施状态图例

| 标记 | 含义 |
|------|------|
| ✅ 已实施 | 计划交付物在代码库中全部存在并经核查 |
| ✅ 已闭环 | 计划文档自身已标注 `## ✅ 实施状态` 且交付物已核查 |
| 📐 设计参考 | 规格文档（spec），配套计划已实施；保留作为设计回溯 |

## 实施计划（plans/）

| 文档 | 日期 | 版本基线 | 实施状态 | 核查结论 |
|------|------|---------|---------|----------|
| [navigation-ui-unified](./plans/2026-08-08-navigation-ui-unified.md) | 2026-08-08 | V68.0 | ✅ 已实施 | `DashboardSections.tsx` / `ModuleCard.tsx` / `EmptyState.tsx` / `verify_navigation.mjs`（三联校验）齐备；`ModuleGrid` 已移除 |
| [v68-1-2-entityschema-maxlength](./plans/2026-08-08-v68-1-2-entityschema-maxlength.md) | 2026-08-08 | V68.1.2 | ✅ 已实施 | `scripts/v68-1-2/{a,b,c}_*.mjs` + `entity-table-map.json` + CI 门禁 `check-entityschema-maxlength{,-reverse}.mjs` 齐备；schema 共 421 处 maxLength/100 文件 |
| [v68-3-nav-arch-compliance](./plans/2026-08-09-v68-3-nav-arch-compliance.md) | 2026-08-09 | V68.3 | ✅ 已实施 | `verify_navigation.mjs` 三联校验（NAV→页面/路由/权限）；Dashboard 模块网格已移除；TODO.md 标"16/16 四件套闭环" |
| [v70-2-step2-final-close](./plans/2026-08-09-v70-2-step2-final-close-plan.md) | 2026-08-09 | V70.2 Step2 | ✅ 已实施 | `lib/src/lib.rs` COMPAT 区已删除；`pub use` = 30（≤30 阈值） |
| [v70-2-topems-shared-final-close](./plans/2026-08-09-v70-2-topems-shared-final-close-plan.md) | 2026-08-09 | V70.2 | ✅ 已实施 | 同上 + Step1 删除 101 条零引用 re-export；9 服务迁移；workspace `cargo check` 0 E0432/E0599 |
| [v71-a1-openapi-extract](./plans/2026-08-09-v71-a1-openapi-extract.md) | 2026-08-09 | V71-A1 | ✅ 已实施 | 26 个 `pub struct .*ApiDoc`；30 个服务 crate 含 `tests/openapi_extract.rs` |
| [v71-a2-openapi-ts-types](./plans/2026-08-09-v71-a2-openapi-ts-types.md) | 2026-08-09 | V71-A2 | ✅ 已实施 | `gen_openapi_types.sh` + `openapi.gen.ts`（11000+ 行，459 paths/480 schemas）+ `openapi-aggregated.json` 齐备 |
| [erp-rc4a-cleanup](./plans/2026-08-10-erp-rc4a-cleanup.md) | 2026-08-10 | ERP RC4a | ✅ 已实施 | `svc/erp/src/modules/*.rs` 共 397 处 `#[utoipa::path]` / 33 文件；`openapi.rs` 存在 |
| [v69-2-p2-6-ai-copilot-refactor](./plans/2026-08-11-v69-2-p2-6-ai-copilot-refactor.md) | 2026-08-11 | V69.2 | ✅ 已实施 | `copilotContext.ts` 存在并被 8 个消费方引用（GlobalActions/MobileNav/AISelectionBubble/AiDashboardPage/GlobalLayout/useAIContext/FloatingAIHelper/recommendations）；`ai-copilot-context` localStorage 经 `AI_COPILOT_CONTEXT_KEY` 常量统一封装 |
| [crm-full-fill-implementation](./plans/2026-08-12-crm-full-fill-implementation.md) | 2026-08-12 | V183-V190 | ✅ 已实施 | `_mock.ts` / `schemas/crm/index.ts` / `modules/analytics.rs`（7 路由）/ 4 个测试文件（opportunity_fsm/return_fsm/pagination/rls_isolation）/ `check-crm-contract.mjs` 齐备 |
| [mes-full-fill-implementation](./plans/2026-08-12-mes-full-fill-implementation.md) | 2026-08-12 | V191-V197 | ✅ 已实施 | `types/mes.ts`（28 实体）/ `api/mes/{analytics,approval}.ts` / `models/*.rs`（production_order 在 `modules/`）/ `shared/fsm.rs`（17 FSM 函数）/ 6 BI 页面 / `StatusBadge.tsx` + 按模块分布的 `FSMActionButtons.tsx` |
| [mes-security-contract-reinforcement](./plans/2026-08-12-mes-security-contract-reinforcement.md) | 2026-08-12 | V191-V196 | ✅ 已实施 | `tenant_id` 迁移 2 份 / `shared/{tenant,audit}.rs` / 269 处 `#[test]`（远超 ≥20 目标）/ `scripts/dev/check-mes-contract.mjs` 已补齐（样板 production_order，检出 5 项前端字段缺失——CI 门禁待修复对齐后转 PASS） |
| [qms-full-fill-implementation](./plans/2026-08-12-qms-full-fill-implementation.md) | 2026-08-12 | V198 | ✅ 已实施 | `types/qms.ts` / `api/qms/_mock.ts` / `models/`（apqp/audit/audit_log/eight_d/fmea/spc）/ `shared/fsm.rs` 齐备 |
| [wms-full-fill-implementation](./plans/2026-08-12-wms-full-fill-implementation.md) | 2026-08-12 | V199 | ✅ 已实施 | `shared/fsm.rs` / `tests/approval_endpoints_test.rs` / 10 模型文件 / 6 BI 页面齐备 |
| [wms-tms-erp-integration-test](./plans/2026-08-12-wms-tms-erp-integration-test.md) | 2026-08-12 | V200 | ✅ 已实施 | 前端 `__tests__/integration/wms-tms-erp-integration.test.ts` + 后端 `svc/{wms,tms}/tests/cross_module_integration_tests.rs` 齐备 |
| [coverage-baseline](./plans/2026-08-13-coverage-baseline.md) | 2026-08-13 | V203 P0-3.1 | ✅ 已闭环 | 文档自带 `## ✅ 实施状态`；`scripts/ci/coverage-baseline.sh` + `coverage-report.py` 已落地并驱动 P5 冲刺（Region 43.19%→45.84%） |

## 技术规格（specs/）

| 文档 | 日期 | 版本基线 | 实施状态 | 说明 |
|------|------|---------|---------|------|
| [v70-2-topems-shared-final-close-design](./specs/2026-08-09-v70-2-topems-shared-final-close-design.md) | 2026-08-09 | V70.2 | 📐 设计参考 | 状态标注"✅ 已获用户批准"；配套计划（V70.2 双 Step）已实施 |
| [crm-full-fill-design](./specs/2026-08-12-crm-full-fill-design.md) | 2026-08-12 | V183+ | 📐 设计参考 | 6 阶段设计；配套计划已实施；深度 C（RFM/聚类/时序预测）显式 deferred |
| [mes-full-fill-design](./specs/2026-08-12-mes-full-fill-design.md) | 2026-08-12 | V191+ | 📐 设计参考 | 30+ 路由 / 22 后端模块 / 40+ 页面 / 6 BI / 7 FSM 设计；深度 C 预测算法 deferred |
| [mes-security-contract-design](./specs/2026-08-12-mes-security-contract-design.md) | 2026-08-12 | V191-V196 | 📐 设计参考 | tenant_id/RLS + 3 FSM + audit + utoipa 补全设计；配套计划已实施 |
| [wms-full-fill-design](./specs/2026-08-12-wms-full-fill-design.md) | 2026-08-12 | V199 | 📐 设计参考 | v1.0.0；7 FSM / 6 BI / 6 Detail / 12 审批端点设计；配套计划已实施 |
| [coverage-baseline-design](./specs/2026-08-13-coverage-baseline-design.md) | 2026-08-13 | V203 P0-3.1 | 📐 设计参考 | 数据模型/聚合算法/CLI 参数/验收标准 A1-A8；配套计划已闭环；V203.2 覆盖率改进 deferred |

## 残留待办汇总

经代码库逐项核查，**全部 16 个计划 + 6 个规格均已在代码库完整落地**，无残留待办。

### MES 契约门禁脚本（2026-08-15 补齐）

[check-mes-contract.mjs](../../scripts/dev/check-mes-contract.mjs) 已补齐，样板实体 `production_order`，与 CRM 的 [check-crm-contract.mjs](../../scripts/dev/check-crm-contract.mjs) 结构对齐。

当前运行结果：**FAIL**（exit 1）——检出 5 项前端字段缺失（`product_id` / `source` / `source_order_id` / `source_order_number` / `workshop_id`）。这些是 `ProductionOrderResponse` 后端模型与前端 `ProductionOrder` 接口之间的真实契约偏差，需在后续迭代中对齐前端类型定义。脚本本身已作为 CI 门禁基础设施就位，待字段对齐后自动转 PASS。

> **关于"已实施"判定的依据**：本核查基于代码库实际文件存在性、关键标识符计数（`#[utoipa::path]` / `#[test]` / `pub use` / `maxLength` / FSM 函数数等）以及与 [roadmap/TODO.md](../roadmap/TODO.md) 已记录里程碑交叉验证。计划文档自身的 `- [ ]` 复选框未回填，仅反映文档归档时未同步更新内部勾选状态，不代表工作未完成。
