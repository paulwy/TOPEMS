# TOPEMS 文档体系重构方案

> 版本：v1.0
> 编制日期：2026-09-26
> 性质：**蓝图方案，不含任何已执行操作**。本文档为后续分阶段 `git mv / git rm` 执行提供精确依据。
> 统计口径：docs/ 下 346 个 `.md` + 4 个 `.html`（`docs/assessments/` 实际 44 个，清单漏列 4 个 html）= 350 个 docs 文件；根目录 23 个 `.md`。合计 **373 个待处置对象**。

---

## 0. 背景与现状诊断

### 0.1 已确认的核心问题

| # | 问题 | 证据 |
|---|------|------|
| 1 | `docs/README.md` 严重过时 | 自称 29 篇、引用大量不存在路径（`docs/api/openapi.yaml` 实存但索引写的是旧结构；`docs/user/user-manual.md`、`docs/configuration/configuration-guide.md`、`docs/operations/monitoring-guide.md`、`docs/deployment/deployment-guide.md` 均不存在） |
| 2 | 规范类文档三处重复且质量参差 | `development/development-guide.md`（泛化模板，仍写 MySQL / `apps/backend`，与实际 PostgreSQL / `svc/` 不符）、`development/code-quality-guide.md`（泛化）、`development/backend/code-standards.md`（真实项目规范）、`architecture/standards.md`（v2.1 强制执行标准）四份重叠 |
| 3 | 根文档散落 | 23 个根 `.md` 中 10 个为 UI v3 迁移期一次性文档（UI_MIGRATION_* 6 个 + UI_REDESIGN_* 3 个 + CHANGELOG_UI_MIGRATION），UI v3 已默认上线，属历史 |
| 4 | 两份用户手册重复 | `docs/USER_GUIDE.md`（v1.0.0, 2026-08-28）与 `docs/user-guide/UserManual.md`（v2.1, 2026-07-03）内容重叠 |
| 5 | 两份 TODO 并存 | 根 `TODO.md`（93K，UI v3 历史跟踪）与 `docs/roadmap/TODO.md`（V516, 2026-09-10，活跃唯一真相源） |
| 6 | 脚本断链 | `scripts/topems.sh:1797` 引用 `docs/guides/devops/websocket-path-mapping.md`，该路径不存在；实际文件在 `docs/architecture/websocket-path-mapping.md` |
| 7 | 一次性报告与活文档混放 | `docs/assessments/` 44 个文件中，既混有 2026-09 一次性评估/验收报告，也混有可复用的运维指南（postgresql 部署 runbook、cache 命名标准）和活注册表（api/version lifecycle registry） |
| 8 | 已完成方案堆积 | `superpowers/plans/` 23 + `superpowers/specs/` 18，其 README 明确"全部已落地，本目录不再删除任何文件" |
| 9 | `design-system-spec.md`（根）已自标废弃 | 文件头注明"v2 旧版已废弃"，指向 `UI_REDESIGN_v3.md` |

### 0.2 不可触碰的硬约束（必须保留原位）

- `docs/ADMIN_GUIDE.md`（1393 行活跃运维手册）
- `database/README.md`（278 个迁移已同步）
- 根核心 9 文档：`README.md / CHANGELOG.md / ROADMAP.md / SECURITY.md / CONTRIBUTING.md / CODE_OF_CONDUCT.md / GOVERNANCE.md / SUPPORT.md / FAQ.md`

> 说明：`database/README.md` 不在 docs/ 下，本方案不移动它。

---

## 1. 设计原则

1. **按读者分层，而非按历史阶段堆放**：入门者 / 开发者 / 运维 / 最终用户 / 项目经理各取所需。
2. **活文档就近保留，一次性证据归档**：可复用的规范/指南/手册留在主树；带日期的评估/验收/实施计划进 `archive/` 或 `reports/archive/`，**默认归档不删除**（与 `superpowers/README` "保留备查" 既定立场一致）。
3. **合并去重，保留权威源**：同一主题只留一份权威文档，其余归档并在新索引中指向权威源。
4. **脚本与外部引用零断链**：所有被脚本/CI/根 README 引用的路径，要么原位保留，要么在第 7 节显式列出同步修改。
5. **每步可回滚**：全程 `git mv`（历史可追溯），不做 `git rm`；分阶段提交。

---

## 2. 目标目录结构（新 `docs/` 树）

```
docs/
├── README.md                     # 【重建】文档中心索引，按读者角色导航
├── DOC_REORGANIZATION_PLAN.md    # 本方案（保留在项目中）
│
├── getting-started/              # ① 入门（新人 5 分钟上手）
│   ├── quickstart.md
│   ├── local-deployment.md
│   └── environment-config.md
│
├── developer/                    # ② 开发者
│   ├── README.md                 # 【新】开发总览（吸收旧 development-guide 有效部分）
│   ├── backend/                  #   后端
│   ├── frontend/                 #   前端
│   ├── standards/               #   规范（架构/命名/日期/迁移/MCP/缓存键）
│   ├── git-workflow.md
│   ├── event-design-guide.md
│   ├── monolith.md
│   ├── lefthook-guide.md
│   └── mes-compile-mechanism.md
│
├── architecture/                 # ③ 架构（仅保留活跃架构参考）
├── database/                     # ④ 数据库（汇总散落的 db 设计/RLS/表治理文档）
├── api/                          # ⑤ API（整体保留）
├── modules/                      # ⑥ 业务模块技术文档（business/ + core/，保留）
│
├── user-guide/                   # ⑦ 最终用户（合并 docs/USER_GUIDE.md）
├── admin/                        # ⑧ 运维管理（合并 operations/ runbooks/ deployment/ + ADMIN_GUIDE）
├── testing/                      # ⑨ 测试
├── security/                     # ⑩ 安全
├── design/                       # ⑪ 设计（UI v3 规范 + 导航 + 组件模板）
├── performance/                  # ⑫ 性能（optimization + benchmarks）
├── sales/                        # ⑬ 销售（保留）
├── training/                     # ⑭ 培训（保留）
│
├── project/                      # ⑮ 项目管理（roadmap 活跃部分 + project/ + delivery/）
│   ├── TODO.md                   #   唯一真相源（自 roadmap/TODO.md 移入）
│   ├── roadmap.md
│   ├── release-governance.md
│   └── ... 验收/上线/交付/质量/风险/沟通
│
├── reports/                      # ⑯ 报告与评估（合并 assessments/ audit/ reports/）
│   ├── README.md                 #   【重建】合并索引
│   ├── audit/                    #   审计操作文档（README + templates，脚本依赖，保留）
│   ├── registries/               #   活注册表（生命周期/立项卡）
│   └── archive/                  #   历史一次性报告（带日期的评估/验收/审计）
│
└── archive/                      # ⑰ 归档
    ├── superpowers/              #   plans/ + specs/（已完成）
    ├── roadmap-history/          #   roadmap/archive 历史快照
    ├── ui-migration/              #   根 UI_MIGRATION_* / UI_REDESIGN_* 历史文档
    └── misc/                     #   其他历史计划/报告/废弃规范
```

> **设计取舍说明**：
> - `archive/` 与 `reports/archive/` 的分工：`reports/archive/` 放"评估/审计/测试/性能"类技术报告（与 reports/README 强关联）；`archive/` 放"已完成实施计划/规格、UI 迁移过程文档、历史路线图快照"等工程过程档案。二者都保留，便于按主题检索。
> - 不新设 `configuration/`：当前无配置类文档，避免空目录。
> - `benchmarks/` 并入 `performance/`（构建/覆盖率基准本质是性能参考）。

---

## 3. 逐文件处置结论

> 处置取值：**保留原位 / 移动→ / 合并→X / 归档→archive/ / 删除**。
> 本方案 **不建议任何硬删除**（见第 4.4 与第 9 节）；删除候选全部列入第 9 节待决，先归档观察。

### 3.1 docs/ 根目录散落文件（16 个）

| 文件 | 处置 | 新位置 / 去向 | 理由 |
|------|------|--------------|------|
| `docs/ADMIN_GUIDE.md` | 移动 | `admin/admin-guide.md` | 活跃运维手册；与 user-guide/admin-guide.md 易混，统一进 admin/ |
| `docs/USER_GUIDE.md` | 合并 | 合并入 `user-guide/UserManual.md` | 与 UserManual 重复；保留较新的 v1.0.0 内容要点，归并后归档原文件 |
| `docs/date_type_convention.md` | 移动 | `developer/standards/date-type-convention.md` | 活跃强制契约（2026-09-25 审计基线） |
| `docs/aps_mes_merge_deployment.md` | 归档 | `archive/misc/` | APS 已并入 MES，一次性清理步骤，已完成 |
| `docs/backend-i18n-guide.md` | 移动 | `developer/backend/backend-i18n-guide.md` | 活跃接入指南 |
| `docs/cache-extension-report.md` | 归档 | `reports/archive/` | 2026-09 一次性实施报告 |
| `docs/component-duplication-analysis.md` | 归档 | `reports/archive/` | 2026-09-14 一次性分析 |
| `docs/DSH_AI_API.md` | 移动 | `modules/core/ai-api.md` | AI 模块 API 文档 |
| `docs/DSH_AI_ARCHITECTURE.md` | 移动 | `architecture/ai-architecture.md` | AI 中间层架构 |
| `docs/DSH_AI_USAGE_GUIDE.md` | 移动 | `modules/core/ai-usage-guide.md` | AI 使用指南 |
| `docs/DSH_BUSINESS_INTELLIGENCE_API.md` | 移动 | `modules/core/bi-api.md` | 业务智能 API |
| `docs/i18n-bilingual-acceptance.md` | 归档 | `reports/archive/` | 2026-09-22 一次性验收报告 |
| `docs/lighthouse-performance-testing-guide.md` | 移动 | `testing/lighthouse-performance-testing-guide.md` | 性能+无障碍测试方法，可复用 |
| `docs/mcp-external-agent-integration.md` | 移动 | `developer/backend/mcp-external-agent-integration.md` | 活跃对接指南（端到端已验证） |
| `docs/mes_compile_mechanism.md` | 移动 | `developer/backend/mes-compile-mechanism.md` | 活跃编译治理手册（根 README 引用 mes-guard） |
| `docs/navigation-architecture.md` | 移动 | `design/navigation-architecture.md` | 活跃导航规范 v2.1 |
| `docs/system-feature-checklist.md` | 移动 | `user-guide/system-feature-checklist.md` | 功能清单，面向验收/用户参考 |
| `docs/tenant-exemption-acceptance.md` | 归档 | `reports/archive/` | 一次性改造验收报告 |

### 3.2 docs/getting-started/（3 个，整体保留）

| 文件 | 处置 | 理由 |
|------|------|------|
| `quickstart.md` / `local-deployment.md` / `environment-config.md` | 保留原位 | 目录名与目标结构一致，已是入门分类，无需移动 |

### 3.3 docs/development/ → developer/（17 个）

| 文件 | 处置 | 新位置 | 理由 |
|------|------|--------|------|
| `development-guide.md` | **合并→developer/README.md 后归档** | `archive/misc/development-guide-generic.md` | 泛化模板，技术栈错误（MySQL/apps/backend）；仅保留项目结构/命令等有效段落到新 README |
| `code-quality-guide.md` | **合并→developer/README.md 后归档** | `archive/misc/code-quality-guide-generic.md` | 泛化通用指南，与 backend/code-standards 重叠；质量门禁/审查清单有效段落并入 README |
| `git-workflow.md` | 移动 | `developer/git-workflow.md` | 活跃流程 |
| `event-design-guide.md` | 移动 | `developer/event-design-guide.md` | 活跃设计指南 |
| `monolith.md` | 移动 | `developer/monolith.md` | 模块化单体说明 |
| `migration-inventory.md` | 归档 | `archive/misc/` | 2026-07-24 旧快照（127 svc 迁移），已被 database/migrations 278 个主链取代，过时 |
| `migration-naming-convention.md` | 移动 | `developer/standards/migration-naming-convention.md` | 活跃命名规范 |
| `backend/code-standards.md` | 移动 | `developer/backend/code-standards.md` | **权威代码规范**（含缓存架构/路径标准） |
| `backend/backend-services.md` | 移动 | `developer/backend/` | 活跃 |
| `backend/api-design.md` | 移动 | `developer/backend/` | 活跃 |
| `backend/environment-setup.md` | 移动 | `developer/backend/` | 活跃 |
| `backend/template-guidelines.md` | 移动 | `developer/backend/` | 活跃 |
| `backend/database-development.md` | 移动 | `developer/backend/` | 活跃 |
| `backend/debugging.md` | 移动 | `developer/backend/` | 活跃 |
| `frontend/design-system.md` | 移动 | `developer/frontend/` | 活跃 |
| `frontend/module-federation-architecture.md` | 移动 | `developer/frontend/` | 活跃 |
| `frontend/module-federation-workflow.md` | 移动 | `developer/frontend/` | 活跃 |
| `frontend/component-migration-guide.md` | 移动 | `developer/frontend/` | 活跃 |
| `frontend/plugin-lifecycle-guide.md` | 移动 | `developer/frontend/` | 活跃 |
| `frontend/accessibility.md` | 移动 | `developer/frontend/` | 活跃 |

### 3.4 docs/architecture/（36 个，拆分）

**保留在 architecture/（活跃架构参考）：**

| 文件 | 处置 | 理由 |
|------|------|------|
| `overview.md` | 保留原位 | 架构总览（根 README 核心入口） |
| `code-wiki.md` | 保留原位 | 项目百科（核心文档） |
| `inventory.md` | 保留原位 | 架构清单 |
| `database.md` | 保留原位 | 数据库设计规范（根 README 引用） |
| `ports.md` | 保留原位 | 端口唯一真相源 |
| `event-driven.md` | 保留原位 | 事件驱动架构 |
| `modular-monolith-design.md` | 保留原位 | 模块化单体设计 |
| `partitioning-strategy.md` | 保留原位 | 分区策略 |
| `microfrontend-architecture-decision.md` | 保留原位 | 选型决策记录 |
| `integration-cross-domain-api.md` | 保留原位 | 跨域集成 |
| `business-tools-sdk-design.md` | 保留原位 | SDK 设计 |
| `business-tools-usage-guide.md` | 保留原位 | SDK 使用 |
| `api-gateway-plan.md` | 保留原位 | 网关方案 |
| `permission-persistence-design.md` | 保留原位 | 权限持久化设计 |
| `unified-error-handling-decision.md` | 保留原位 | 错误处理决策 |
| `unified-core-slimming-decision.md` | 保留原位 | 核心瘦身决策 |
| `a2-build-cache.md` | 保留原位 | 构建缓存优化 |
| `mes-schema-truth.md` | 保留原位 | MES Schema 真相源 |
| `architecture-diagrams.md` | 保留原位 | 架构图 |
| `service-topology/cross-db-calls.md` | 保留原位 | 跨库调用（嵌套目录保留） |

**移入 developer/standards/（规范类）：**

| 文件 | 新位置 | 理由 |
|------|--------|------|
| `standards.md` | `developer/standards/architecture-standards.md` | v2.1 强制执行命名/目录标准 |
| `api-path-standardization.md` | `developer/standards/api-path-standardization.md` | API 路径规范 |
| `websocket-path-mapping.md` | `developer/standards/websocket-path-mapping.md` | 根 README + topems.sh 引用（**修正 topems.sh 路径**） |

**移入 database/（数据库治理类）：**

| 文件 | 新位置 |
|------|--------|
| `column-type-risk-report.md` | `database/` |
| `database-schema-ownership-review.md` | `database/` |
| `database-split-plan.md` | `database/` |
| `duplicate-table-consolidation.md` | `database/` |
| `duplicate-table-convergence.md` | `database/` |
| `rls-coverage-report.md` | `database/` |
| `rls-live-coverage.md` | `database/` |

**归档（一次性评估/历史）：**

| 文件 | 去向 | 理由 |
|------|------|------|
| `2026-08-17-microkernel-spec.md` | `archive/misc/` | 带日期设计规格 |
| `architecture-evolution-and-todo.md` | `project/` 后评估后归档 | 演进+todo，与 roadmap 重叠 |
| `frontend-test-roi-review.md` | `reports/archive/` | 一次性 ROI 评估 |
| `portal-gateway-modules-review.md` | `reports/archive/` | 一次性评审 |
| `service-token-audit.md` | `reports/archive/`（或 security/） | 一次性审计 |
| `TOPEMS_Architecture_Roadmap_v2.md` | `project/` 历史 | 历史路线图 v2 |
| `workflow-split-assessment.md` | `reports/archive/` | 一次性评估 |

### 3.5 docs/database/（2 个）

| 文件 | 处置 | 理由 |
|------|------|------|
| `database-design.md` | 移动到 `database/`（与 3.4 移入的 db 文档合并目录） | 已在 docs/database/，目标 database/ 保留 |
| `database-primary-instance.md` | 保留 | 主库实例说明 |

> 注：`docs/database/` 目录与目标 `database/` 同名，合并后该目录吸收 3.4 移入的 7 个 db 文档。

### 3.6 docs/api/（34 个，整体保留原位）

全部保留。该目录已是按模块组织的活跃 API 文档集，结构清晰，根 README 有完整索引。含 `openapi.yaml` + `openapi.json`。

| 范围 | 处置 |
|------|------|
| `API_*.md`（26 个）、`api-error-codes.md`、`api-quick-reference.md`、`im-phase21.md`、`plugins-api.md`、`README.md`、`services-openapi-status.md`、`API_VERSION_AND_SCHEMA_GUIDE.md` | 保留原位 |

### 3.7 docs/modules/（17 个，整体保留）

`modules/business/`（15 个业务模块）+ `modules/core/`（ai/bi）整体保留原位，结构清晰。`modules/core/ai-module.md` 与移入的 DSH AI 文档互补，不合并。

### 3.8 docs/user-guide/（21 个，保留 + 吸收 USER_GUIDE）

| 文件 | 处置 |
|------|------|
| `README.md` / `quick-start.md` / `UserManual.md` / `admin-guide.md` / `faq.md` | 保留原位；`UserManual.md` 吸收 `docs/USER_GUIDE.md` 要点 |
| `modules/*.md`（16 个：ai/bi/crm/ehs/erp/finance/gis/hrm/lims/mes/pdm/pm/qms/rd/scm/srm/wms） | 保留原位 |

### 3.9 docs/operations/ + runbooks/ + deployment/ → admin/（合并）

| 原文件 | 新位置 | 理由 |
|--------|--------|------|
| `operations/operations-manual.md` | `admin/operations-manual.md` | 运维手册 |
| `operations/service-stability-best-practices.md` | `admin/` | 稳定性实践 |
| `operations/troubleshooting-cheatsheet.md` | `admin/` | 排障速查 |
| `runbooks/ai-alerts-runbook.md` | `admin/ai-alerts-runbook.md` | 告警 runbook |
| `runbooks/mcp-agent-integration-guide.md` | `admin/` | MCP 对接运维 |
| `deployment/README.md` | `admin/README.md`（重建索引） | 运维总入口 |
| `deployment/deployment-guide-overview.md` | `admin/` | 部署总览 |
| `deployment/MODULAR_MONOLITH_DEPLOYMENT.md` | `admin/` | 部署 |
| `deployment/microfrontend-deployment.md` | `admin/` | 微前端部署 |
| `deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md` | `admin/` | 生产检查单 |
| `deployment/production-deployment-report.md` | `admin/` 后归档 | 一次性报告→`reports/archive/` |
| `deployment/release-strategies.md` | `admin/` | 发布策略 |
| `deployment/rls-full-coverage-deployment-guide.md` | `admin/` | RLS 部署 |
| `deployment/troubleshooting.md` | `admin/` | 排障 |
| `deployment/AI_BUSINESS_INTELLIGENCE_DEPLOYMENT_GUIDE.md` | `admin/` | AI BI 部署 |
| `assessments/postgresql-production-deployment-runbook-2026-09-11.md` | `admin/postgresql-deployment-runbook.md` | **可复用 runbook，从 assessments 提升** |
| `assessments/postgresql-production-config-checklist-2026-09-11.md` | `admin/` | 可复用检查单 |
| `assessments/postgresql-production-config-tuning-2026-09-11.md` | `admin/` | 可复用调优 |
| `assessments/production-environment-setup-guide-2026-09-11.md` | `admin/` | 可复用部署指南 |
| `assessments/postgresql-deployment-report-template-2026-09-11.md` | `admin/templates/` | 可复用模板 |

### 3.10 docs/testing/（3 个）

| 文件 | 处置 |
|------|------|
| `AI_BUSINESS_INTEGRATION_TEST_PLAN.md` | 保留原位 |
| `AI_BUSINESS_INTELLIGENCE_E2E_GUIDE.md` | 保留原位 |
| `AI_BUSINESS_INTELLIGENCE_PERFORMANCE_GUIDE.md` | 保留原位 |
| `lighthouse-performance-testing-guide.md`（自 docs 根移入） | `testing/` |

### 3.11 docs/security/（2 个，保留）

`SECURITY.md`、`security-best-practices.md` 保留原位。根 `SECURITY.md` 为硬约束保留，与 `docs/security/SECURITY.md` 关系：二者并存，根为 GitHub 入口，docs 内为详述——保留，不合并。

### 3.12 docs/design/（5 个）→ 扩充 design/

| 文件 | 处置 |
|------|------|
| `implementation-task-tracker.md` | `design/`（任务跟踪，可保留） |
| `page-template-selection-guide.md` | `design/` |
| `shared-component-guidelines.md` | `design/` |
| `template-exceptions.md` | `design/` |
| `ui-navigation-unified-plan.md` | `design/` |
| 根 `UI_REDESIGN_v3.md` | **移入 `design/ui-redesign-v3.md`**（现行设计规范，design-system-spec 已指向它） |
| `docs/navigation-architecture.md` | `design/navigation-architecture.md` |

### 3.13 docs/performance/ + benchmarks/（合并）

| 文件 | 处置 |
|------|------|
| `performance/optimization-guide.md` | 保留 |
| `performance/performance-testing-best-practices.md` | 保留 |
| `benchmarks/build-cache-v71.md` | `performance/benchmarks/` |
| `benchmarks/vite-build-v71.md` | `performance/benchmarks/` |
| `benchmarks/vitest-coverage-v71.md` | `performance/benchmarks/` |
| `benchmarks/cli-test-coverage-2026-08-06.md` | `performance/benchmarks/`（带日期基准，保留备查） |

### 3.14 docs/sales/、training/（各 4 / 2，保留）

`sales/`（case-study-template / product-brochure / quick-start-guide / sales-playbook）、`training/`（training-materials-outline / training-plan）整体保留原位。

### 3.15 docs/project/ + delivery/ + roadmap 活跃部分 → project/

| 原文件 | 新位置 | 理由 |
|--------|--------|------|
| `project/communication-management.md` | `project/` | 项目管理 |
| `project/final-review.md` | `project/` | 终审 |
| `project/go-live-checklist.md` | `project/` | 上线检查 |
| `project/project-acceptance-checklist.md` | `project/` | 验收检查 |
| `project/quality-management.md` | `project/` | 质量管理 |
| `project/risk-assessment.md` | `project/` | 风险 |
| `project/time-management.md` | `project/` | 时间 |
| `delivery/delivery-package-checklist.md` | `project/` | 交付清单 |
| `delivery/final-delivery-report.md` | `project/` 后归档 | 一次性交付报告→`archive/misc/` |
| `delivery/project-summary-report.md` | `project/` 后归档 | 一次性总结→`archive/misc/` |
| `roadmap/TODO.md` | **`project/TODO.md`** | 唯一真相源，保留活跃 |
| `roadmap/roadmap.md` | `project/roadmap.md` | 路线图 |
| `roadmap/release-governance.md` | `project/` | 发布治理 |
| `roadmap/UI-ENGLISH-STYLE-GUIDE.md` | `design/` | 英文文案风格，归设计 |
| `roadmap/V321-acceptance-report.md` | `reports/archive/` | 一次性验收 |
| `roadmap/V8-BUILD-OPTIMIZATION-REPORT.md` | `reports/archive/` | 历史报告 |

### 3.15b docs/plans/（5 个，均为历史计划）

| 文件 | 处置 | 去向 | 理由 |
|------|------|------|------|
| `plans/architecture-optimization.md` | 归档 | `archive/misc/` | 2026-06-29 旧优化方案 |
| `plans/integration-implementation-plan.md` | 归档 | `archive/misc/` | 2026-07-24 整合实施计划，已完成 |
| `plans/shortcomings-analysis.md` | 归档 | `archive/misc/` | 2026-07-24 短板分析，被后续版本取代 |
| `plans/v68.1-implementation-plan.md` | 归档 | `archive/misc/` | V68.1（2026-08-08）已实施 |
| `plans/V82-2a-next-steps-20260812.md` | 归档 | `archive/misc/` | 2026-08-12 下一步规划，已过期 |

> 这 5 个均为带日期/版本号的一次性实施计划，与 superpowers/plans 同性质，归 archive 备查。

### 3.16 docs/reports/ + audit/ + assessments/ → reports/

**reports/ 保留与重组：**

| 原文件 | 处置 | 新位置 | 理由 |
|--------|------|--------|------|
| `reports/README.md` | 合并重建 | `reports/README.md` | 合并 assessments/audit/reports 三索引 |
| `reports/phase21-test-report.md` | 归档 | `reports/archive/` | 历史测试报告 |
| `reports/debt-audit-2026-08-13.md` | 归档 | `reports/archive/` | 历史债务审计 |
| `reports/refactor-p0-p1-summary-2026-08-20.md` | 归档 | `reports/archive/` | 历史重构总结 |
| `reports/2026-08-31-audit-export-delivery-guide.md` | 归档 | `reports/archive/` | 一次性交付指南 |
| `reports/2026-09-02-collaboration-delivery.md` | 归档 | `reports/archive/` | 一次性 |
| `reports/2026-09-02-mcp-tool-audit.md` | 归档 | `reports/archive/` | 一次性 |
| `reports/2026-09-02-collaboration-delivery.md` | 归档 | `reports/archive/` | 一次性 |

**audit/（操作文档保留，历史报告归档）：**

| 原文件 | 处置 | 新位置 | 理由 |
|--------|------|--------|------|
| `audit/README.md` | 保留 | `reports/audit/README.md` | 活跃审计系统操作手册（脚本依赖其描述） |
| `audit/templates/compliance-report.md` | 保留 | `reports/audit/templates/` | 脚本 `generate-report.sh` 默认模板路径引用，**同步改脚本路径** |
| `audit/openapi-coverage-report.md` | 归档 | `reports/archive/` | 历史对照报告 |
| `audit/p04-triage-report.md` | 归档 | `reports/archive/` | 历史 |
| `audit/probe-p04-openapi-contract.md` | 归档 | `reports/archive/` | 历史探针 |
| `audit/probe-p07-utoipa-schema.md` | 归档 | `reports/archive/` | 历史探针 |
| `audit/V67.1-data-layer-audit-20260808.md` | 归档 | `reports/archive/` | 历史轮次审计 |
| `audit/V70-fifth-round-audit-20260808.md` | 归档 | `reports/archive/` | 历史 |
| `audit/V71-sixth-round-probe-design.md` | 归档 | `reports/archive/` | 历史 |
| `audit/v73-real-handler-triage.md` | 归档 | `reports/archive/` | 历史 |
| `audit/v77-architecture-audit-report.md` | 归档 | `reports/archive/` | 历史 |
| `audit/v78-architecture-audit-report.md` | 归档 | `reports/archive/` | 历史 |
| `audit/v81-phase-1..4-report.md`（4 个） | 归档 | `reports/archive/` | 历史阶段报告 |
| `audit/V83.1-react-query-standardization-report.md` | 归档 | `reports/archive/` | 历史 |

**assessments/（44 个）拆分：**

提升为活文档（见 3.9 admin、下方 standards/registries）：
- `cache-key-naming-standard-2026-09-11.md` → `developer/standards/cache-key-naming-standard.md`
- `event-driven-cache-invalidation-guide-2026-09-11.md` → `developer/backend/event-driven-cache-invalidation.md`
- `cache-monitoring-prometheus-guide-2026-09-11.md` → `admin/cache-monitoring-prometheus-guide.md`
- `multi-level-cache-monitoring-guide-2026-09-11.md` → `admin/`
- `api-lifecycle-registry-2026-09-09.md` → `reports/registries/`
- `version-lifecycle-registry-2026-09-09.md` → `reports/registries/`
- `pending-initiatives-2026-09-09.md` → `reports/registries/`
- postgresql-* 4 个 + production-environment-setup-guide → `admin/`（见 3.9）

其余一次性报告（归档 `reports/archive/`，含 4 个 .html）：
`analytics-mock-to-real-api-plan / bi-report-duplicate-merge-assessment / cache-consistency-verification-report / cache-deep-optimization-plan / core-platform-master-data-audit / crm-datalayer-plan / database-performance-optimization-report / dead-tables-review / e2e-test-full-verification-report / e2e-test-implementation-report / e2e-test-plan / external-erp-deepening-assessment / group-a..f-raw.md（6 个取证中间产物）/ hrm-manufacturing-frontend-backend-audit / performance-optimization-report / prebuilt-api-assessment / project-assessment-2026-09-14 / rls-coverage-audit / rls-e2e-verification / security-audit-report / test-coverage-report / wms-prebuilt-api-archive` + 4 个 `.html`（architecture-assessment-2026-09-07 / project-assessment-2026-09-07 / frontend-backend-mapping-assessment-2026-09-08 / module-completeness-reassessment-2026-09-09）。

> `assessments/README.md` 合并入新 `reports/README.md` 后归档。

### 3.17 docs/superpowers/（41 个）→ archive/superpowers/

`plans/`（23 个）+ `specs/`（18 个）+ `README.md` 整体移到 `archive/superpowers/`。
理由：其 README 已逐项核查"全部落地、本目录不再删除任何文件"，是已完成工程的历史档案。整目录平移，保留内部相对链接。

### 3.18 docs/roadmap/archive/（12 个）→ archive/roadmap-history/

`2026-W32/W33、TODO-archived-*（4 个）、V178-V210/V211-V230/V231-V258/V259-V264/V266/V67-V99` 共 12 个历史快照，整体移到 `archive/roadmap-history/`。
`roadmap/artifacts/r12-zp0-z4cover-summary.md` → `archive/roadmap-history/`。

### 3.19 docs/archive/（9 个）保留

已是归档目录，保持原位（`archive/README` 已索引）。与新顶层 `archive/` 并存：本目录为早期归档，新归档集中到顶层 `archive/`，后续可考虑合并（列为待决）。

### 3.20 docs/changelog/（3 个）

| 文件 | 处置 |
|------|------|
| `changelog/CHANGELOG.md` | 保留原位 |
| `changelog/RELEASE_NOTES_V5.14.0.md` | 保留 |
| `changelog/CHANGELOG-cleanup-history.md` | 保留（已是清理历史） |

### 3.21 docs/engineering/（2 个）

| 文件 | 处置 | 去向 |
|------|------|------|
| `AI_ENGINEERING_GUIDE.md` | 归档 | `archive/misc/`（泛化模板，落款 2024-01-01，与 code-standards 重叠） |
| `LEFTHOOK_GUIDE.md` | 移动 | `developer/lefthook-guide.md`（活跃 hook 配置文档） |

### 3.22 docs/standards/（1 个）

| 文件 | 处置 | 去向 |
|------|------|------|
| `mcp-tools-resources-standard.md` | 移动 | `developer/standards/mcp-tools-resources-standard.md` |

---

## 4. 合并方案

| # | 合并目标 | 被合并来源 | 合并策略 |
|---|----------|-----------|----------|
| M1 | `developer/README.md`（新建） | `development/development-guide.md` + `development/code-quality-guide.md` | 仅抽取：真实项目结构（svc/ + apps/web）、开发命令、Git 提交规范、代码审查清单、质量门禁指标；**剔除** MySQL/apps/backend 错误技术栈与泛化示例代码。原两文件归档 |
| M2 | `user-guide/UserManual.md` | `docs/USER_GUIDE.md` | 以较新的 v1.0.0（2026-08-28）为补充源，合并 AI 助手/业务模块章节；原 `docs/USER_GUIDE.md` 归档 |
| M3 | `reports/README.md`（重建） | `assessments/README.md` + `audit/README.md` 索引部分 + `reports/README.md` | 保留 audit 操作手册主体（脚本依赖），合并三份索引为"报告/评估/审计"统一导航；registries 与 archive 分区 |
| M4 | `admin/README.md`（重建） | `deployment/README.md` + operations/runbooks 导航 | 合并运维/部署/runbook/排障为统一运维入口 |
| M5 | `docs/README.md`（重建） | 旧 `docs/README.md` 整体重写 | 按第 2 节目录树 + 读者角色重写，修正所有死链 |

---

## 5. 根文档处置（23 个）

### 5.1 保留原位（核心 9，硬约束）

| 文件 | 处置 |
|------|------|
| `README.md` | 保留（活跃，2026-09-05，内嵌文档目录需按新结构更新链接） |
| `CHANGELOG.md` | 保留 |
| `ROADMAP.md` | 保留 |
| `SECURITY.md` | 保留 |
| `CONTRIBUTING.md` | 保留 |
| `CODE_OF_CONDUCT.md` | 保留 |
| `GOVERNANCE.md` | 保留 |
| `SUPPORT.md` | 保留 |
| `FAQ.md` | 保留 |

### 5.2 归档到 `docs/archive/ui-migration/`（UI v3 已完成）

| 文件 | 理由 |
|------|------|
| `UI_MIGRATION_GUIDE.md` | 迁移指南，v3 已默认启用，历史 |
| `UI_MIGRATION_DEPLOYMENT_GUIDE.md` | 一次性部署 |
| `UI_MIGRATION_FAQ.md` | 迁移期 FAQ |
| `UI_MIGRATION_TEST_CHECKLIST.md` | 迁移期测试单 |
| `UI_MIGRATION_COMPLETION_REPORT.md` | 已完成报告 |
| `CHANGELOG_UI_MIGRATION.md` | 迁移变更记录 |
| `UI_REDESIGN_GRAY_RELEASE_CHECKLIST.md` | 灰度检查单 |
| `UI_REDESIGN_MONITORING_CONFIG.md` | 监控配置（一次性） |
| `UI_REDESIGN_USER_GUIDE.md` | 迁移期用户指引 |
| `ui-navigation-optimization-plan.md` | 一次性优化计划 |

### 5.3 移入 design/

| 文件 | 新位置 | 理由 |
|------|--------|------|
| `UI_REDESIGN_v3.md` | `docs/design/ui-redesign-v3.md` | **现行设计系统规范**（design-system-spec 已废弃并指向它），非历史 |

### 5.4 归档/移动其余

| 文件 | 处置 | 去向 |
|------|------|------|
| `TODO.md`（根） | 归档 | `docs/archive/ui-migration/ROOT-TODO-ui-v3-history.md`（93K，UI v3 历史跟踪；活跃 TODO 已在 project/TODO.md）。**注：尾部含 2026-09-25 条目，先核对是否有未迁移活跃内容再归档（待决 D2）** |
| `PROJECT_COMPLETION_REPORT.md` | 归档 | `docs/archive/misc/` |
| `design-system-spec.md` | 归档 | `docs/archive/misc/`（文件头自标 v2 废弃） |

---

## 6. 删除清单

**本方案不建议任何 `git rm` 硬删除。** 全部一次性/历史/重复文档均归档保留（git 历史可追溯）。
仅在归档后确认无引用且无历史价值的候选，列入第 9 节待决，观察一个迭代周期后再删。

---

## 7. 交叉引用更新清单

执行移动后必须同步修改以下链接（重点）：

| # | 所在文件 | 旧引用 | 新引用 |
|---|----------|--------|--------|
| X1 | `scripts/topems.sh:1797` | `docs/guides/devops/websocket-path-mapping.md` | `docs/developer/standards/websocket-path-mapping.md` |
| X2 | `docs/README.md`（重建） | 全部死链（openapi.yaml 路径、user/user-manual.md、configuration/、operations/monitoring-guide.md 等） | 按新目录树重写 |
| X3 | 根 `README.md` | "文档目录"整段 + 各 docs 链接（`docs/development/backend/code-standards.md`、`docs/roadmap/TODO.md`、`docs/architecture/websocket-path-mapping.md` 等） | 更新为 `developer/backend/`、`project/TODO.md`、`developer/standards/` |
| X4 | `docs/roadmap/TODO.md` → 移动为 `project/TODO.md` | 内部相对链接 `../roadmap/archive/`、`../assessments/README.md` | 改为 `../archive/roadmap-history/`、`../reports/README.md` |
| X5 | `docs/assessments/README.md`（已合并入 reports/README） | `docs/reports/README.md`、`docs/roadmap/TODO.md` 相对链接 | 重写 |
| X6 | `docs/audit/README.md` → `reports/audit/README.md` | 文中模板路径 `docs/audit/templates/compliance-report.md`、`reports/` 相对路径 | 改为 `docs/reports/audit/templates/...` |
| X7 | `scripts/audit/generate-report.sh` | 默认 `--template docs/audit/templates/compliance-report.md`、`--output docs/audit/reports/...` | 改为 `docs/reports/audit/templates/...` |
| X8 | `docs/engineering/LEFTHOOK_GUIDE.md` → developer/ | 相对 `../../lefthook.yml` | 层级变化需修正 `../../` → `../../../` |
| X9 | `docs/development/migration-naming-convention.md` | 引用 `docs/development/migration-inventory.md` | migration-inventory 归档后改为说明或链接 archive |
| X10 | `docs/design/ui-navigation-unified-plan.md`、`docs/navigation-architecture.md` 互链 | 相对路径 | 同在 design/ 后路径简化 |
| X11 | `superpowers/README.md` → archive/superpowers/ | 相对 `../roadmap/TODO.md`、`../../scripts/...` | 层级变化需修正 `../` 数量 |
| X12 | `CHANGELOG.md`（根） | 若引用 docs 路径则更新 | 检查后改 |

> 建议：每阶段移动完成后运行一次全仓 `grep -rn "docs/development/" --include="*.md"` 等批量扫链，兜底修复。

---

## 8. 阶段划分

### 阶段 1：低风险平移（不动活跃规范，先归档明显历史）
- 移动 `superpowers/` 整体 → `archive/superpowers/`
- 移动 `roadmap/archive/` + `roadmap/artifacts/` → `archive/roadmap-history/`
- 归档根 UI_MIGRATION_*（10 个）→ `archive/ui-migration/`
- 归档 `design-system-spec.md`、`PROJECT_COMPLETION_REPORT.md`、`TODO.md`（根，待 D2 确认后）、`aps_mes_merge_deployment.md`、`cache-extension-report.md`、`component-duplication-analysis.md`、`i18n-bilingual-acceptance.md`、`tenant-exemption-acceptance.md`
- 归档 `engineering/AI_ENGINEERING_GUIDE.md`、`development/migration-inventory.md`
- **提交信息**：`docs(archive): move completed superpowers plans/specs, roadmap snapshots and UI v3 migration docs to archive`

### 阶段 2：建立新目录骨架与活跃文档归位
- 新建 `developer/{backend,frontend,standards}/`、`admin/`、`design/`、`project/`、`reports/{audit,registries,archive}/`
- 移动 development/ → developer/、architecture 规范类 → developer/standards、db 治理类 → database/
- 合并 operations/runbooks/deployment → admin/；移入 ADMIN_GUIDE.md
- 移动 roadmap 活跃（TODO/roadmap/release-governance）→ project/；合并 project/ + delivery/
- 移动根 UI_REDESIGN_v3.md → design/；navigation-architecture → design/
- 提升 assessments 中可复用指南 → admin/、developer/standards/、registries/
- **提交信息**：`docs(structure): reorganize docs into reader-layered tree (developer/admin/design/project/reports)`

### 阶段 3：一次性报告归集 + 合并
- assessments 剩余带日期报告 + 4 html → `reports/archive/`
- audit 历史 v6x-v8x 报告 → `reports/archive/`；reports/ 历史 → archive
- 执行合并 M1-M5（developer/README、UserManual、reports/README、admin/README、docs/README 重建）
- **提交信息**：`docs(reports): consolidate one-off assessments/audit/reports into reports/archive and rebuild indexes`

### 阶段 4：交叉引用修复与验证
- 按第 7 节修复 topems.sh、根 README、reports/README、脚本路径等
- 全仓扫死链（grep 旧路径），修正
- `git status` 确认无遗漏，构建/脚本 dry-run 验证（topems.sh help、audit 脚本 --help）
- **提交信息**：`docs(fix): update all cross-references after reorganization; fix broken websocket doc path in topems.sh`

> 每阶段独立 commit + `git push --no-verify`，工作区保持可编译。

---

## 9. 待决清单（存在实质分歧，需人工拍板）

| # | 待决项 | 分歧点 | 建议默认 |
|---|--------|--------|----------|
| D1 | `assessments/` 带日期报告是否整批归档 vs 保留活跃 | README 称"随代码演进持续同步"，但文件名均带 2026-09 日期，且 P0×13/P1×52 已"全收口" | 默认归档到 reports/archive/，保留 reports/README 索引指向；若团队需持续引用个别 registry 则留在 registries/ |
| D2 | 根 `TODO.md`（93K）尾部含 2026-09-25 活跃条目 | 任务定性为"UI v3 历史"，但尾部有 date-type-audit/10 域收口等近期工作记录 | 归档前 diff 尾部，确认无未迁移的活跃待办；如有，先补入 project/TODO.md 再归档 |
| D3 | `docs/archive/`（旧）与新顶层 `archive/` 是否合并 | 两个 archive 并存易混淆 | 本方案先并存；后续可将旧 archive/ 内容并入顶层 archive/misc/（列为二期） |
| D4 | `architecture/standards.md` 与 `backend/code-standards.md` 是否合并为单一规范 | 二者都含命名/代码规范，有重叠（Git 提交规范、组件规范重复） | 本方案暂不合并（前者偏目录/API 路径强制标准，后者偏代码/缓存实现），由 developer/README 互相链接；若后续仍觉重复再合并 |
| D5 | `docs/security/SECURITY.md` 与根 `SECURITY.md` 去重 | 两份安全文档并存 | 保留（根为 GitHub Community 入口，docs 内为详述），不合并 |
| D6 | 是否最终删除归档后的泛化文档（development-guide/code-quality-guide/AI_ENGINEERING_GUIDE） | 含错误技术栈，但作为"模板"可能有参考价值 | 先归档观察；一个迭代周期后确认无人引用再 git rm |
| D7 | `architecture/architecture-evolution-and-todo.md`、`TOPEMS_Architecture_Roadmap_v2.md` 归 project 还是 archive | 含 todo 成分与历史路线图 | 默认 archive/misc/，避免与 project/TODO.md 双轨 |
| D8 | `benchmarks/` v71 基准是否随代码过时 | 构建/覆盖率基准随版本漂移 | 保留在 performance/benchmarks/，README 标注"v71 历史基准" |

---

## 附：处置统计

| 处置类别 | 数量（约） |
|----------|-----------|
| 保留原位（api/ modules/ getting-started/ security/ sales/ training/ changelog/ audit 操作部分等） | ~90 |
| 移动到新分类目录 | ~120 |
| 归档（一次性报告/已完成计划/UI 迁移/历史快照/泛化模板） | ~150 |
| 合并（M1-M5 涉及源文件归并后归档） | ~10 |
| 硬删除 | **0**（待 D6 观察后另议） |
| 根核心文档保留 | 9 |

> 精确到每个文件的 `git mv` 清单在阶段 1-2 执行时，按本表逐目录展开生成。
