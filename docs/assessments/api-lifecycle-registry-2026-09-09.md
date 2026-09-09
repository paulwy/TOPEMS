# API 版本化生命周期登记表

- 日期：2026-09-09
- 关联报告：`frontend-backend-mapping-assessment-2026-09-08.html`（修复建议⑪）
- 口径：启用/预埋（页面零消费）/归档/待立项 四态；消费判定以页面 import + hooks 中转 + 桶 re-export + `apiClient.xxx` 对象属性四种模式全量扫描为准

## 一、版本化模块登记（按模块）

| 模块 | 前端文件 | 后端路由 | 页面消费 | 状态 | 治理动作 / 备注 |
|---|---|---|---|---|---|
| master V61-V79 | `api/master/` 24 个 V* 文件（dataContractV61/apiLifecycleV62/dataStandardV63/dataMaskingV64/dataQualityEnhancedV65/dataAssetCatalogV66/dataSecurityV67/dataLifecycleV68/dataMarketplaceV69/complianceReportV70/dataServiceOrchestrationV71/dataProductCatalogV72/dataServiceMarketplaceV73/dataGovernanceDashboardV74/dataFederationMeshV75/dataSecurityAuditV76/dataLineageEnhancedV77/dataWorkflowAutomationV78/dataPolicyConfigurationV79/aiGovernanceV59 等） | `svc/master-data/mod.rs:454` `/mdm-v60` 起系列 | **0 页面消费** | 预埋 | 待立项（见 §三 B 项） |
| finance 版本化路由 | `api/finance/` 21 文件（riskV54/riskV59/settlementCenter 等） | 版本化路径 V001/V999/v1 系（**2026-09-09 复核：业务 `.route(` 注册 415 处 = 顶层 mod.rs 127 + 模块内 288（V51-V60 版本化 10 模块 182）**） | 前端已覆盖 19 文件、路由为**反向无消费**（后端有前端无） | 启用/预埋 | 旧注记 155/52 口径不可复现，以 415 处注册文本数为准（含多方法合并，非等价端点数） |
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
| A-2 | master V61-V79（24 文件）+ file/dict/unified-core 零消费目录 | master 24 V* 文件 0 消费；dict(1) 已归档（erp 版承载）；file 服务经 shared/doc 中转在役、unified-core 服务在役（apiClient.core）——仅目录封装未消费 | master 维持预埋（版本化策略待定）；file/unified-core 目录维持预埋（服务在役） | 0 | ✅ 已治理（dict 归档 + 3 目录预埋登记） |
| A-3 | WMS 拣货 | 页面零消费（P3 判定） | 暂缓：待拣货业务流程产品需求 | — | A 立项 / B 暂缓 |
| A-4 | RD material 数据源 | ✅ 误报闭环（2026-09-09）：前端 material.ts（7 方法）走 **apiClient.erp**（非 rd 服务）；erp 后端 /materials 5 端点齐全、erp.materials 表 18 列与前端类型对应 | 无需立项 | 0 | ✅ 已核实（erp 承载） |
| A-5 | receivablePayable 归并 | ✅ 复核修正为**非重复**（2026-09-09）：erp 版＝应收应付台账 CRUD（真实消费仅 ReceivablePayablePage 1 处 CrudPage adapter）；finance 版＝发票/回款/付款单据工作流（发票/收据页）——**语义域不同，属业务分层**非功能重复 | 维持双份 | 0 | ✅ 已核实（业务分层） |

## 四、口径说明

- "页面消费"含四种访问模式：直接 import、hooks 中转 import、api 桶（index.ts）re-export、`financeApi.xxx` 对象属性访问。
- finance 版本化路由口径已复核（2026-09-09）：业务 `.route(` 注册 415 处（顶层 127 + 模块内 288，V51-V60 十模块 182），旧注记 155/52 为早期快照不可复现；415 为注册文本数（含 `.route("/x", get(a).post(b))` 多方法合并），非等价暴露端点数，如需精确端点数以运行期 OpenAPI 为准。
- 归档动作全部可回滚（git 历史），行为兼容优先。
