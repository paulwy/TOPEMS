# TOPEMS 报告与评估索引

本目录统一存放 TOPEMS 的**审计操作手册、活注册表和历史一次性报告**。
按活跃度分为三个分区：`audit/`（审计系统）、`registries/`（活注册表）、`archive/`（历史报告归档）。

---

## 一、audit/ — 审计系统

审计层聚合了 `audit_logs`、`permission_audit_logs`、`login_logs`、`operation_logs` 四个数据源，
通过统一 API `/api/core/iam/v1/audit/*` 暴露查询、统计与导出能力。

| 文件 | 说明 |
|------|------|
| [audit/README.md](./audit/README.md) | **审计系统操作手册**（数据源、查询参数、统计/导出 API、两套报告生成器用法、模板结构） |
| [audit/templates/compliance-report.md](./audit/templates/compliance-report.md) | 合规报告模板（`{{placeholder}}` 静态替换语法） |
| audit/*.json | 审计脚本产出的结构化数据（OpenAPI 覆盖率、P04 triage、V73 deadcode 等） |

### 快速使用

```bash
# 在线模式：通过 HTTP API 生成 Markdown 报告
./scripts/audit/generate-report.sh \
  --start-date 2026-01-01 --end-date 2026-01-31 \
  --format markdown --output docs/reports/audit/reports/compliance-report.md

# 离线模式：直连 PostgreSQL 生成报告 + 导出原始日志 CSV
DATABASE_URL=postgresql://user:pass@host:5432/topems \
  python3 scripts/audit/generate_audit_report.py \
    --start-date 2026-07-01 --end-date 2026-08-01 \
    --output docs/reports/audit/reports/audit-report.md --format md
```

> 完整参数、数据源表映射、CSV 导出格式与未使用 Exports 清理工具链详见 [audit/README.md](./audit/README.md)。

---

## 二、registries/ — 活注册表

以下文档是**持续维护的活文档**，记录系统中正在生效的版本与 API 生命周期状态，会随代码演进而更新。

| 文件 | 说明 |
|------|------|
| [registries/api-lifecycle-registry-2026-09-09.md](./registries/api-lifecycle-registry-2026-09-09.md) | 版本化 API 生命周期登记表 |
| [registries/version-lifecycle-registry-2026-09-09.md](./registries/version-lifecycle-registry-2026-09-09.md) | 版本生命周期登记表（V54-V79 预埋观察、finance/risk 待评审） |
| [registries/pending-initiatives-2026-09-09.md](./registries/pending-initiatives-2026-09-09.md) | 预埋立项卡（IM 白板/呼叫、master data AssetCatalog、WMS 拣货 wave_pick） |

---

## 三、archive/ — 历史一次性报告

`archive/` 存放已完成使命的一次性评估、审计、测试、性能与交付报告（共 64 份）。
这些报告结论已收口或迁移至注册表，仅作历史追溯参考，不再更新。

### 3.1 架构与模块评估

| 报告 | 日期 | 说明 |
|------|------|------|
| [architecture-assessment-2026-09-07.html](./archive/architecture-assessment-2026-09-07.html) | 2026-09-07 | 模块/服务级架构完整度评估 |
| [project-assessment-2026-09-07.html](./archive/project-assessment-2026-09-07.html) | 2026-09-07 | 全局项目状态评估 |
| [project-assessment-2026-09-14.md](./archive/project-assessment-2026-09-14.md) | 2026-09-14 | 项目状态复评 |
| [frontend-backend-mapping-assessment-2026-09-08.html](./archive/frontend-backend-mapping-assessment-2026-09-08.html) | 2026-09-08 | 前后端映射主报告（P0×13 / P1×52 / P2×41 / P3×28 已全部收口） |
| [module-completeness-reassessment-2026-09-09.html](./archive/module-completeness-reassessment-2026-09-09.html) | 2026-09-09 | 49 模块 × 5 维全量实测重评估 |
| [external-erp-deepening-assessment-2026-09-11.md](./archive/external-erp-deepening-assessment-2026-09-11.md) | 2026-09-11 | 外部 ERP 深化评估 |
| [prebuilt-api-assessment-2026-09-11.md](./archive/prebuilt-api-assessment-2026-09-11.md) | 2026-09-11 | 预构建 API 评估 |
| [wms-prebuilt-api-archive-2026-09-11.md](./archive/wms-prebuilt-api-archive-2026-09-11.md) | 2026-09-11 | WMS 预构建 API 归档 |
| [workflow-split-assessment.md](./archive/workflow-split-assessment.md) | — | 工作流拆分评估 |
| [component-duplication-analysis.md](./archive/component-duplication-analysis.md) | — | 组件重复度分析 |
| [frontend-test-roi-review.md](./archive/frontend-test-roi-review.md) | — | 前端测试 ROI 评审 |
| [portal-gateway-modules-review.md](./archive/portal-gateway-modules-review.md) | — | 门户网关模块评审 |
| [analytics-mock-to-real-api-plan-2026-09-11.md](./archive/analytics-mock-to-real-api-plan-2026-09-11.md) | 2026-09-11 | Analytics Mock→Real API 计划 |
| [bi-report-duplicate-merge-assessment-2026-09-11.md](./archive/bi-report-duplicate-merge-assessment-2026-09-11.md) | 2026-09-11 | BI 报表重复合并评估 |

### 3.2 审计与技术债

| 报告 | 日期 | 说明 |
|------|------|------|
| [debt-audit-2026-08-13.md](./archive/debt-audit-2026-08-13.md) | 2026-08-13 | 技术债务全量审计与分级 |
| [core-platform-master-data-audit-2026-09-08.md](./archive/core-platform-master-data-audit-2026-09-08.md) | 2026-09-08 | 上帝文件拆分、master-data 治理 |
| [crm-datalayer-plan-2026-09-08.md](./archive/crm-datalayer-plan-2026-09-08.md) | 2026-09-08 | CRM 数据层缺口与写入方接通 |
| [dead-tables-review-2026-09-08.md](./archive/dead-tables-review-2026-09-08.md) | 2026-09-08 | 90 张死表删除（库表 962→872） |
| [hrm-manufacturing-frontend-backend-audit-2026-09-08.md](./archive/hrm-manufacturing-frontend-backend-audit-2026-09-08.md) | 2026-09-08 | HRM 与制造域前后端覆盖核查 |
| [rls-coverage-audit-2026-09-10.md](./archive/rls-coverage-audit-2026-09-10.md) | 2026-09-10 | RLS 覆盖率审计 |
| [rls-e2e-verification-2026-09-09.md](./archive/rls-e2e-verification-2026-09-09.md) | 2026-09-09 | RLS 受限用户切换端到端验证 |
| [security-audit-report-2026-09-11.md](./archive/security-audit-report-2026-09-11.md) | 2026-09-11 | 安全审计报告 |
| [service-token-audit.md](./archive/service-token-audit.md) | — | 服务 Token 审计 |
| [2026-09-02-mcp-tool-audit.md](./archive/2026-09-02-mcp-tool-audit.md) | 2026-09-02 | MCP 工具审计 |
| [V67.1-data-layer-audit-20260808.md](./archive/V67.1-data-layer-audit-20260808.md) | 2026-08-08 | V67.1 数据层深度审计 |
| [V70-fifth-round-audit-20260808.md](./archive/V70-fifth-round-audit-20260808.md) | 2026-08-08 | V70 第五轮架构审计（31 项全闭环） |
| [V71-sixth-round-probe-design.md](./archive/V71-sixth-round-probe-design.md) | 2026-08-09 | V71 第六轮审计探针设计 |
| [v73-real-handler-triage.md](./archive/v73-real-handler-triage.md) | — | V73 Real Handler Triage |
| [v77-architecture-audit-report.md](./archive/v77-architecture-audit-report.md) | — | V77 架构与质量全面审计 |
| [v78-architecture-audit-report.md](./archive/v78-architecture-audit-report.md) | — | V78.0 架构与质量审计 |
| [v81-phase-1-report.md](./archive/v81-phase-1-report.md) | — | V81 Phase 1：深度治理与规模化拆分 |
| [v81-phase-2-report.md](./archive/v81-phase-2-report.md) | — | V81 Phase 2：深度拆分与编译错误清零 |
| [v81-phase-3-report.md](./archive/v81-phase-3-report.md) | — | V81 Phase 3：TSC 清零 + 123 hooks 测试 |
| [v81-phase-4-report.md](./archive/v81-phase-4-report.md) | — | V81 Phase 4：TSC 零错误 + Page 拆分收官 |
| [V83.1-react-query-standardization-report.md](./archive/V83.1-react-query-standardization-report.md) | — | V83.1 React Query 标准化审计 |
| [openapi-coverage-report.md](./archive/openapi-coverage-report.md) | — | OpenAPI 覆盖率对照报告 |
| [p04-triage-report.md](./archive/p04-triage-report.md) | — | P-04 未使用 API 与未文档化前端 API |
| [probe-p04-openapi-contract.md](./archive/probe-p04-openapi-contract.md) | — | P-04 探针：OpenAPI 前后端契约一致性 |
| [probe-p07-utoipa-schema.md](./archive/probe-p07-utoipa-schema.md) | — | P-07 探针：utoipa schema vs handler 一致性 |
| [refactor-p0-p1-summary-2026-08-20.md](./archive/refactor-p0-p1-summary-2026-08-20.md) | 2026-08-20 | P0/P1 重构总结 |
| [tenant-exemption-acceptance.md](./archive/tenant-exemption-acceptance.md) | — | 租户豁免验收 |
| [i18n-bilingual-acceptance.md](./archive/i18n-bilingual-acceptance.md) | — | 国际化双语验收 |

### 3.3 测试报告

| 报告 | 日期 | 说明 |
|------|------|------|
| [phase21-test-report.md](./archive/phase21-test-report.md) | — | Phase 21 集成测试报告 |
| [e2e-test-plan-2026-09-11.md](./archive/e2e-test-plan-2026-09-11.md) | 2026-09-11 | E2E 测试计划 |
| [e2e-test-implementation-report-2026-09-11.md](./archive/e2e-test-implementation-report-2026-09-11.md) | 2026-09-11 | E2E 测试实施报告 |
| [e2e-test-full-verification-report-2026-09-12.md](./archive/e2e-test-full-verification-report-2026-09-12.md) | 2026-09-12 | E2E 全量验证报告 |
| [test-coverage-report-2026-09-11.md](./archive/test-coverage-report-2026-09-11.md) | 2026-09-11 | 测试覆盖率报告 |
| group-a ～ group-f raw.md | 2026-09-09 | 全模块重评估 6 组并行实测取证（中间产物） |

### 3.4 性能优化

| 报告 | 日期 | 说明 |
|------|------|------|
| [database-performance-optimization-report-2026-09-11.md](./archive/database-performance-optimization-report-2026-09-11.md) | 2026-09-11 | 数据库性能优化报告 |
| [performance-optimization-report-2026-09-11.md](./archive/performance-optimization-report-2026-09-11.md) | 2026-09-11 | 综合性能优化报告 |
| [cache-consistency-verification-report-2026-09-11.md](./archive/cache-consistency-verification-report-2026-09-11.md) | 2026-09-11 | 缓存一致性验证报告 |
| [cache-deep-optimization-plan-2026-09-11.md](./archive/cache-deep-optimization-plan-2026-09-11.md) | 2026-09-11 | 缓存深度优化计划 |
| [cache-extension-report.md](./archive/cache-extension-report.md) | — | 缓存扩展报告 |
| [V8-BUILD-OPTIMIZATION-REPORT.md](./archive/V8-BUILD-OPTIMIZATION-REPORT.md) | — | V8 构建优化报告 |

### 3.5 交付与验收

| 报告 | 日期 | 说明 |
|------|------|------|
| [2026-08-31-audit-export-delivery-guide.md](./archive/2026-08-31-audit-export-delivery-guide.md) | 2026-08-31 | 审计导出交付指南 |
| [2026-09-02-collaboration-delivery.md](./archive/2026-09-02-collaboration-delivery.md) | 2026-09-02 | 协同交付记录 |
| [acceptance_20260830.html](./archive/acceptance_20260830.html) | 2026-08-30 | 验收报告 |
| [production-deployment-report.md](./archive/production-deployment-report.md) | — | 生产部署报告 |
| [V321-acceptance-report.md](./archive/V321-acceptance-report.md) | — | V321 验收报告 |

---

*本文档由 TOPEMS 团队维护，最后更新：2026-09-26*
