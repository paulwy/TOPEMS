# 版本化模块生命周期登记表（⑪ 收口 · 2026-09-09）

> 范围：TOPEMS 全仓带版本化命名（V{n} / v{n}）或历史遗留并存的前端封装与后端模块。
> 口径：以"页面真实消费"为权威判定（与 P0-P3 审计矩阵一致）；状态、路由规模、消费方均来自 2026-09-08/09 审计实测，非估算。
> 配套报告：`docs/reports/archive/frontend-backend-mapping-assessment-2026-09-08.html`（P3 #5 治理项落地）。

## 1. 生命周期状态定义

| 状态 | 定义 | 处置 |
|---|---|---|
| **启用中** | 前后端实现存在，且页面真实消费 ≥ 1 处 | 正常维护，纳入 CI 边界门禁 |
| **预埋** | 后端已挂载或前端已封装，页面零消费（悬空代码） | 观察（P3），前端承接时激活；无消费超版本周期评估归档 |
| **待评审** | 存在保留理由或部分消费，需产品/架构评审 | 立项清单（`pending-initiatives-2026-09-09.md`） |
| **已归档** | 全库零引用（含 `@/` 别名与桶 re-export 双模式核验）后移入 `_archive/` | 不重建；如需恢复走版本管理 |

迁移规则：启用中 ↔ 预埋（消费消失/出现）→ 待评审（决策点）→ 已归档（零引用）。

## 2. 登记总表

### 2.1 master 域（数据治理/主数据产品族）

| 版本段 | 前端文件（apps/web/src/api/master/） | 后端实现（svc/master-data/src/modules/） | 路由规模 | 页面消费 | 状态 | 建议 |
|---|---|---|---|---|---|---|
| V51 | quality.ts | quality_v51.rs | master-data 全模块合计 ~240 路由（.route 注册 240 处） | ✅ qualityApi（mes/mobile 复用） | 启用中 | 正常维护 |
| V52-V53 | —（并入 V60+ 文件或直连） | lineage_v52.rs / knowledge_v53.rs | 同上 | 无 | 预埋 | P3 观察 |
| V54-V79 | gatewayV54 / commercialV55 / metadataV60 / dataContractV61 / apiLifecycleV62 / dataStandardV63 / dataMaskingV64 / dataQualityEnhancedV65 / dataAssetCatalogV66 / dataSecurityV67 / dataLifecycleV68 / dataMarketplaceV69 / complianceReportV70 / dataServiceOrchestrationV71 / dataProductCatalogV72 / dataServiceMarketplaceV73 / dataGovernanceDashboardV74 / dataFederationMeshV75 / dataSecurityAuditV76 / dataLineageEnhancedV77 / dataWorkflowAutomationV78 / dataPolicyConfigurationV79（21 文件）+ aiGovernanceV59 + governanceV2 | versioning_v54 / commercial_v55 / disaster_v56 / semantic_v57 / governance_v58 / ai_governance_v59 / metadata_v60 / schema_registry.rs / master_plugin.rs / dict/（10 模块文件） | 同上（后端 11 模块真实挂载，236-240 路由） | 无（零页面消费） | 预埋（commit c26d00dba 判定"前后端双活、无 UI 承接"） | P3 观察（量化退出条件：无消费满 2 个主版本周期 → 评估归档，口径同 V51-V60 行）；产品立项承接时激活（试点建议：dataAssetCatalogV66，见立项清单卡 2） |
| V79+ | — | — | — | — | — | master 扩展（V54-V79，129 方法）实测 236 路由覆盖，无缺口 | 持续观察 |

### 2.2 finance 域（版本化路由反向无消费）

| 版本段 | 前端 | 后端注册 | 规模 | 页面消费 | 状态 | 建议 |
|---|---|---|---|---|---|---|
| V51-V60 | finance/riskV54.ts（re-export 于 finance/index.ts，测试 finance-risk-v54-v59.test.ts 引用） | `.route(` 注册 415 处：顶层 127 + 模块内 288；V51-V60 段 182 处；路径含 v53×6 / v55 / v59 等 | 415 路由注册 | 无（页面零消费） | 待评审 | 登记观察：新消费发生时激活；无消费满 2 个主版本周期评估归档 V51-V60 死段（归档前需与既有 V41 收款域等核对重叠） |
| risk 族 | erp 侧 risk.ts / riskV59 | — | — | — | 已归档（commit 8db835b1f，risk.ts 是 riskV54.ts 子集） | 不重建 |
| riskV54（finance） | riskV54.ts | finance 后端对应风险路由 | 12 方法 | 无页面消费（仅 re-export + 测试） | 待评审 | 与 P1 财务风险审计口径对齐后再定去留；当前保留 |

### 2.3 已归档记录（2026-09-08/09 治理链）

| 模块 | 归档 commit | 原规模 | 归档依据 |
|---|---|---|---|
| im 扩展（32/33 对象） | c26d00dba | 614 方法 | 零页面消费 + 后端 communication 无扩展路由（前后端双无死契约），imApi 基础 95 方法保留 |
| consolidation 三份 | 8db835b1f | consolidation(30) + consolidation-contract(25) + erp/core/consolidation.ts(~30) | 重复实现，保留 api/consolidation（hooks/useConsolidation.ts 真实消费） |
| voucherTemplate / financialReport / risk.ts / riskV59 / erp-core-dbStructure / erp-core-consolidation 等 | 8db835b1f | 11 文件 | 重复实现，保留方按消费事实修正 |
| erp/receivablePayable | 05e0a2c7c | 67 行（5+5 方法） | 与 finance/receivablePayable 同名撞车，并入 finance 版（页面改指），原文件归档 |
| master 扩展 V54-V79 | 保留（未归档） | 129 方法 | 前后端双活、无 UI 承接 → 预埋观察，不归档 |

## 3. 生命周期迁移日志

| 日期 | 动作 | commit |
|---|---|---|
| 2026-09-08 | im 扩展 32/33 对象 → 已归档 | c26d00dba |
| 2026-09-08 | 重复实现 6 组治理：11 文件 → 已归档 | 8db835b1f |
| 2026-09-09 | erp/receivablePayable → 并入 finance 版，原文件归档 | 05e0a2c7c |
| 2026-09-09 | ⑨ ai dashboard 真实统计闭环（usage 采集 + RLS 读路径） | 620bc6831 |
| 2026-09-09 | 本登记表建立（⑪ 收口） | abc301ba1 |
| 2026-09-09 | V54-V79 行补量化退出条件（无消费满 2 主版本周期 → 归档评估）+ 立项清单升级 READY FOR REVIEW | 44e30047f |

## 4. 治理建议（承接 P3 #5）

1. **预埋模块不进 CI 门禁白名单豁免，但记录在案**：api-boundary allowlist 的 prebuilt 段即预埋台账，与本表双轨对照（check-api-boundary 已登记 313 prebuilt）。
2. **版本化死段归档触发条件**：页面零消费 + 后端路由无外部契约（无其他服务/迁移引用）持续 2 个主版本周期 → 走 _archive 归档，归档前跑全库引用核验（`@/` 别名 + 桶 re-export 双模式）。
3. **新版本化模块立项前置**：新增 V{n} 前端封装必须登记本表（启用/预埋/待评审），并声明后端路由与消费方；无消费声明一律标预埋。
4. **本表维护责任**：随每次涉及版本化模块的 commit 更新 §2.2/§2.3 与 §3，保持单一事实来源。

## 5. 数据口径与局限

- 路由规模为 `.route(` 静态注册计数（finance 415、master-data 240、wms 136），不包含中间件前缀展开。
- "页面消费"以 `apps/web/src/**/*.tsx` 对 api 模块的 import 为准；mock 演示开关（VITE_ENABLE_*_MOCK）不计为消费。
- 本表不改变既有代码行为，仅登记状态与处置建议；执行归档/激活需另行评审。
