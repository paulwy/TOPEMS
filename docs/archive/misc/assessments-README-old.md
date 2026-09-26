# 评估与审计报告索引

本目录存放 TOPEMS 平台的前后端映射、数据层、安全与治理专项评估报告。所有结论均基于实测取证（grep/路由注册点/页面消费链），并随代码演进持续同步状态。

## 报告索引

| 报告 | 日期 | 类型 | 状态 / 说明 |
|------|------|------|-------------|
| [architecture-assessment-2026-09-07.html](./architecture-assessment-2026-09-07.html) | 2026-09-07 | 架构评估 | 模块/服务级架构完整度评估 |
| [project-assessment-2026-09-07.html](./project-assessment-2026-09-07.html) | 2026-09-07 | 项目评估 | 全局项目状态评估（含依赖安全治理链范畴待办，另行跟踪） |
| [frontend-backend-mapping-assessment-2026-09-08.html](./frontend-backend-mapping-assessment-2026-09-08.html) | 2026-09-08 | 前后端映射 | **主报告最终态**：P0×13 / P1×52 / P2×41 / P3×28 遗留项已全部收口并推送，状态与配套文档一致 |
| [core-platform-master-data-audit-2026-09-08.md](./core-platform-master-data-audit-2026-09-08.md) | 2026-09-08 | 核心平台/主数据审计 | 上帝文件拆分、master-data 治理 |
| [crm-datalayer-plan-2026-09-08.md](./crm-datalayer-plan-2026-09-08.md) | 2026-09-08 | CRM 数据层 | CRM 数据层缺口与写入方接通（billing_records 已闭环） |
| [dead-tables-review-2026-09-08.md](./dead-tables-review-2026-09-08.md) | 2026-09-08 | 死表清理 | 90 张死表删除（A 组 56 + B 组 34），库表 962→872，迁移 20260908000012 |
| [hrm-manufacturing-frontend-backend-audit-2026-09-08.md](./hrm-manufacturing-frontend-backend-audit-2026-09-08.md) | 2026-09-08 | HRM/制造审计 | HRM 与制造域前后端覆盖核查 |
| [api-lifecycle-registry-2026-09-09.md](./api-lifecycle-registry-2026-09-09.md) | 2026-09-09 | API 生命周期 | 版本化 API 生命周期登记表 |
| [rls-e2e-verification-2026-09-09.md](./rls-e2e-verification-2026-09-09.md) | 2026-09-09 | RLS 端到端验证 | RLS 受限用户切换验证（voucher_items FORCE 已闭环） |
| [version-lifecycle-registry-2026-09-09.md](./version-lifecycle-registry-2026-09-09.md) | 2026-09-09 | 版本生命周期 | 版本化生命周期登记表（V54-V79 预埋观察、finance/risk 待评审） |
| [pending-initiatives-2026-09-09.md](./pending-initiatives-2026-09-09.md) | 2026-09-09 | 预埋立项 | 3 张立项卡 READY FOR REVIEW（IM 白板/呼叫、master dataAssetCatalog、WMS 拣货 wave_pick） |
| [module-completeness-reassessment-2026-09-09.html](./module-completeness-reassessment-2026-09-09.html) | 2026-09-09 | 全模块重评估 | **49 模块 × 5 维全量实测**：后端路由 4,519 / 前端 API 方法 5,404 / 真实缺口 32 项 / 预埋悬空 43 组 / 冗余 64 项（commit `59bb09c71`） |

## 原始取证（评估工作流中间产物，供审计追溯）

`group-*-raw.md` 为全模块重评估 6 组并行实测的分组取证（前后端方法/路由统计与 file:line 证据），非独立报告。

## 关联

- 测试/技术债报告索引：`docs/reports/README.md`
- 唯一权威待办文档：`docs/roadmap/TODO.md`（含各版本收口记录与 📚 归档索引）
