# API 版本化生命周期登记表

- 日期：2026-09-09
- 关联报告：`frontend-backend-mapping-assessment-2026-09-08.html`（修复建议⑪）
- 口径：启用/预埋（页面零消费）/归档/待立项 四态；消费判定以页面 import + hooks 中转 + 桶 re-export + `apiClient.xxx` 对象属性四种模式全量扫描为准

## 一、版本化模块登记（按模块）

| 模块 | 前端文件 | 后端路由 | 页面消费 | 状态 | 治理动作 / 备注 |
|---|---|---|---|---|---|
| master V61-V79 | `api/master/` 24 个 V* 文件（dataContractV61/apiLifecycleV62/dataStandardV63/dataMaskingV64/dataQualityEnhancedV65/dataAssetCatalogV66/dataSecurityV67/dataLifecycleV68/dataMarketplaceV69/complianceReportV70/dataServiceOrchestrationV71/dataProductCatalogV72/dataServiceMarketplaceV73/dataGovernanceDashboardV74/dataFederationMeshV75/dataSecurityAuditV76/dataLineageEnhancedV77/dataWorkflowAutomationV78/dataPolicyConfigurationV79/aiGovernanceV59 等） | `svc/master-data/mod.rs:454` `/mdm-v60` 起系列 | **0 页面消费** | 预埋 | 待立项（见 §三 B 项） |
| finance 版本化路由 | `api/finance/` 21 文件（riskV54/riskV59/settlementCenter 等） | 版本化路径 V001/V999/v1 系（src 全量 52 处 route 定义；报告口径 155 条含子路由展开） | 前端已覆盖 19 文件、路由为**反向无消费**（后端有前端无） | 启用/预埋 | 155 条口径与 src 52 处差异为子路由展开 vs 静态注册，后续复核 |
| finance risk | riskV54.ts（12 方法） | finance /risk* 系 | V54 前端覆盖 | **启用** | 保留规范版；risk.ts（子集）+ riskV59.ts（悬空）已归档（8db835b1f） |
| consolidation | api/consolidation/（30 方法） | erp /consolidation* | hooks/useConsolidation.ts + 页面 | **启用** | 保留；consolidation-contract/(7 文件) 与 erp/core/consolidation.ts 已归档 |
| voucherTemplate | finance/voucherTemplate.ts（16） | finance /voucher-templates* | 0（经 financeApi 桶可访问） | 启用（唯一实现） | 独立 api/voucherTemplate/ 已归档 |
| financialReport | finance/report.ts（14） | finance /reports* | 页面消费 financeApi.report | **启用** | 独立 api/financialReport/ 已归档 |
| receivablePayable | erp/receivablePayable.ts + finance/receivablePayable.ts | finance /receivables /payables | **两组均有消费**（erp 版 5 处页面、finance 版发票/收据页） | 启用×2（重复） | 归并需页面迁移 → **暂缓**（见 §三 A-4） |
| database | erp/database.ts（5 处消费） | erp /database* | **启用** | 保留 | erp/core/dbStructure.ts 已归档（0 消费） |

## 二、归档台账（2026-09-09，commit 8db835b1f）

| 归档文件 | 原模块 | 归档依据 |
|---|---|---|
| api/consolidation-contract/{index,company,elimination,report,scope,transaction,types}.ts（7） | consolidation | 全库 0 引用（含四种消费模式） |
| api/voucherTemplate/index.ts | voucherTemplate | 全库 0 引用 |
| api/financialReport/index.ts | financialReport | 全库 0 引用 |
| api/finance/risk.ts | risk | V54 子集，0 引用 |
| api/finance/riskV59.ts | riskV59 | 悬空 22 方法，0 引用 |
| api/erp/core/dbStructure.ts | database | 0 引用，erp/database.ts 有消费 |
| api/erp/core/consolidation.ts | consolidation | 0 引用（api/consolidation 有消费） |

验证：tsc 0 error、eslint 0 error；`git log` 可随时恢复（行为兼容）。

## 三、预埋项立项建议（待产品拍板）

| # | 立项项 | 现状（已核实） | 建议动作 | 工作量估 | 决策 |
|---|---|---|---|---|---|
| A-1 | im 白板 / 呼叫 | 前端封装全、后端无路由、页面零消费 | **暂缓**：与现有 im 消息通道无用户诉求，先不建无效端点 | — | A 立项 / B 暂缓 / C 废弃 |
| A-2 | master V61-V79（24 文件） | 前端 24 个版本化 API、后端 /mdm-v6x 路由、页面 0 消费 | **选型**：确立"版本化采用 vXX 后缀 vs 统一 /api/core"策略后批量立项；否则维持预埋 | 中（24 文件契约+页面） | A 立项 / B 维持预埋 |
| A-3 | WMS 拣货 | 页面零消费（P3 判定） | 暂缓：待拣货业务流程产品需求 | — | A 立项 / B 暂缓 |
| A-4 | RD material 数据源 | 前端 3 方法无后端、**rd schema 无 materials 表**（数据源缺） | 需先补 DDL（建表）+ 后端路由，再接通前端 | 0.5 天 | A 立项（补数据源）/ B 暂缓 |
| A-5 | receivablePayable 归并 | 两组 API 均有页面消费（erp 5 处 / finance 发票收据页） | 页面迁移至 finance 版后归档 erp 版 | 0.5-1 天 | A 归并 / B 维持双份 |

## 四、口径说明

- "页面消费"含四种访问模式：直接 import、hooks 中转 import、api 桶（index.ts）re-export、`financeApi.xxx` 对象属性访问。
- finance 155 条版本化路由为报告期统计（子路由展开口径），src 静态 route( 定义 52 处，差异已注记待复核。
- 归档动作全部可回滚（git 历史），行为兼容优先。
