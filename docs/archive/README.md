# 文档归档

本目录存放已完成使命或不再活跃的历史文档，保留供参考。所有归档内容按主题归入以下四个子目录，根目录不再散落单文件。

## 目录结构

| 子目录 | 文件数 | 内容定位 |
|--------|-------:|----------|
| [`misc/`](misc/) | 28 | 杂项历史归档：旧架构计划、重构报告、TODO 备份、泛化模板与指南、交付报告等 |
| [`roadmap-history/`](roadmap-history/) | 43 | 路线图历史快照：V67–V266 版本阶段记录、周度报告、构建/基线日志、TODO 归档 |
| [`superpowers/`](superpowers/) | 42 | 已完成并落地的实施计划与技术规格（`plans/` 23 份 + `specs/` 18 份 + 索引 README） |
| [`ui-migration/`](ui-migration/) | 11 | UI v3 迁移期文档：迁移指南、部署、测试清单、根 TODO 历史、灰度发布配置等 |

---

## ⚠️ 已被替代的架构方案

以下两份架构方案文档位于 [`misc/`](misc/)，已被新方案替代，**不再作为执行依据**：

- [`misc/TOPEMS_Architecture_Improvement_Plan.md`](misc/TOPEMS_Architecture_Improvement_Plan.md) v1.2
- [`misc/TOPEMS_MCP_Architecture_Amendment_Plan.md`](misc/TOPEMS_MCP_Architecture_Amendment_Plan.md) v1.1

**新的唯一架构路线图**：[`docs/architecture/TOPEMS_Architecture_Roadmap_v2.md`](../architecture/TOPEMS_Architecture_Roadmap_v2.md)

新方案基于旧方案的完整评估，整合了边界治理、MCP 适配、AI 能力建设等内容，并诚实区分了"已验证完成"、"框架就绪"、"未启动"三类状态。所有架构决策请以新方案为准。

---

## 各子目录说明

### misc/ — 杂项历史归档（28 份）

早期散落的一次性历史文档，按类别大致包括：

- **旧架构计划与报告**：`TOPEMS_Architecture_Improvement_Plan.md`、`TOPEMS_MCP_Architecture_Amendment_Plan.md`、`architecture-evolution-and-todo.md`、`architecture-optimization.md`、`2026-08-17-microkernel-spec.md`
- **重构与质量报告**：`REFACTOR-P0-P1-P2-REPORT.md`、`shortcomings-analysis.md`、`code-quality-guide-generic.md`
- **设计系统与模板**：`design-inventory-and-template-analysis.md`、`design-system-implementation-plan.md`、`design-system-spec.md`
- **TODO 备份**：`TODO_backup_20260828.md`、`TODO_HISTORY_phases_19_55.md`
- **交付与项目总结**：`PROJECT_COMPLETION_SUMMARY.md`、`PROJECT_COMPLETION_REPORT.md`、`final-delivery-report.md`、`project-summary-report.md`
- **脚本体系整治（2026-09-29 归档）**：`TOPEMS脚本全面分析与topems.sh优化报告.md`（77 脚本全面分析 + topems.sh 优化 + 实施状态追踪表；实施链已落 TODO.md）
- **泛化指南与手册**：`AI_ENGINEERING_GUIDE.md`、`development-guide-generic.md`、`USER_GUIDE-v1-merged.md`、`assessments-README-old.md`
- **集成与迁移**：`aps_mes_merge_deployment.md`、`integration-implementation-plan.md`、`migration-inventory.md`
- **其他阶段计划**：`TOPEMS_Architecture_Roadmap_v2.md`、`v68.1-implementation-plan.md`、`V82-2a-next-steps-20260812.md`

### roadmap-history/ — 路线图历史快照（43 份）

按版本阶段归档的路线图与执行痕迹：

- **版本阶段记录**：`V67-V99-foundation.md`、`V178-V210-modules.md`、`V211-V230-quality.md`、`V231-V258-closure.md`、`V259-V264-backlog-closure.md`、`V266-P0-hook-unification.md` 等
- **周度报告**：`2026-W32.md`、`2026-W33.md`
- **TODO 归档**：`TODO-archived-V265-V272.md`、`TODO-archived-V284-V393.md`、`TODO-archived-V394-V513.md`、`TODO-archived-workbench-2026-09-09.md`
- **构建/基线日志**：r12/r13 系列 `.json` / `.log` / `.txt` 构建产物与门禁基线

### superpowers/ — 已完成实施计划与规格（42 份）

全部已落地的实施计划与技术规格，按 `plans/`（23 份）与 `specs/`（18 份）分目录归档，另含一份索引 README。文件名以 `YYYY-MM-DD-v<版本>-<主题>` 命名，记录各版本的设计与执行过程。

### ui-migration/ — UI v3 迁移期文档（11 份）

UI v3 迁移期间的操作与交付文档：

- 迁移指南与 FAQ：`UI_MIGRATION_GUIDE.md`、`UI_MIGRATION_FAQ.md`、`UI_MIGRATION_COMPLETION_REPORT.md`
- 部署与发布：`UI_MIGRATION_DEPLOYMENT_GUIDE.md`、`UI_REDESIGN_GRAY_RELEASE_CHECKLIST.md`、`UI_REDESIGN_MONITORING_CONFIG.md`
- 测试与验收：`UI_MIGRATION_TEST_CHECKLIST.md`、`UI_REDESIGN_USER_GUIDE.md`
- 历史与变更：`ROOT-TODO-ui-v3-history.md`、`CHANGELOG_UI_MIGRATION.md`、`ui-navigation-optimization-plan.md`

---

> 注：本目录被 `.gitignore` 的 `archive/` 规则默认忽略，子目录内文件系显式纳入版本控制。归档文档仅供历史参考，不再作为活跃执行依据。
