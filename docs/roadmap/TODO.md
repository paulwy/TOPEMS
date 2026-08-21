# TOPEMS 项目任务规划与路线图

> **版本**: V266 | **更新日期**: 2026-08-22
>
> **V259-V264+ Backlog 与 V265 硬编码清理已收闭**。当前进入 V266 设计系统模板迁移收尾阶段。

---

## 📊 当前状态

### 活跃任务：设计系统模板迁移收尾（V266）

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| system/AuditLogPage 迁移到 ListPageTemplate | 保留统计卡片、筛选、分页、行操作、详情弹窗；移除自定义 Filters/Table | ✅ |
| apps/web tsc 验证 | 0 errors | ✅ |
| apps/web eslint 验证 | 0 errors | ✅ |
| 设计系统审计扫描回归 | 模板覆盖率 77.7% → 77.8% | ✅ |
| system/BackupPage 迁移到 ListPageTemplate | 保留创建/恢复/详情弹窗、行操作；移除自定义 MUI Table | ✅ |
| oa/AnnouncementPage 迁移到 ListPageTemplate | 接入 ListPageTemplate 并预留列结构 | ✅ |
| lims/InspectionResultPage 迁移到 ListPageTemplate | 接入 ListPageTemplate 并预留列结构 | ✅ |
| 设计系统审计扫描回归 | 模板覆盖率 77.8% → 78.4%；硬编码 113 → 106 | ✅ |
| 下一批 List 页待迁移 | 剩余 116 个未标准化页面，优先候选：ERP DatabaseManagementPage、Finance OpeningBalancePage/ConsolidationScopePage、Workflow VersionHistoryPage、report/ReportSchedulePage 等 | 🔄 |

### V265 归档：设计系统样式硬编码清理收尾

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| 修复 DataTable.tsx ESLint 未使用表达式 | line 1369 `&&` 改为 `if` | ✅ |
| 更新审计脚本：rem 统计排除已 token 化引用 | scan.mjs regex negative lookbehind/lookahead | ✅ |
| rem 字号批量替换 | 267 文件已替换为 `designTokens.typography.fontSize.scale` | ✅ |
| px spacing 修复脚本 | `scripts/design-system-audit/fix-px-spacing.cjs` 创建并运行 | ✅ |
| px spacing 批量替换 | 74 文件已替换为 `designTokens.spacing.*` | ✅ |
| 修复 px 脚本生成的数字 key 语法错误 | `spacing.2xl` → `spacing['2xl']` | ✅ |
| apps/web tsc 验证 | 0 errors | ✅ |
| apps/web eslint 关键路径验证 | 0 errors（剩余 6 条 pre-existing warning） | ✅ |
| 剩余 6 处 rem 间距值替换 | `PerformanceTestPage` 4 处、`DashboardPage` 2 处 | ✅ |
| 设计系统审计扫描回归 | 当前硬编码 113 处（px 113 + rem 0） | ✅ |

### 质量门禁基线

| 门禁 | 指标 | 状态 |
|------|------|------|
| axum-layer-gate | R1/R2/R3 = 0/0/0 | ✅ |
| perm-gate | R1/R3/R5 = 0/0/0 | ✅ |
| cargo check | 0 errors · CRM 0 warnings | ✅ |
| tsc apps/web | 0 errors | ✅ |
| tsc shared packages | 6/6 passed | ✅ |
| props-alignment | 100% realness (359 routes) | ✅ |

### 代码净减

V254(-531) + V257(-19074 BFF) + V258(-2814 dead exports) + V264+(-96 dead exports) ≈ **净减 22,500+ 行**

---

## 📚 归档索引

> 已完成版本的详细验收矩阵、变更统计、EDGE CASE 记录均已按时间轴拆分至以下归档文档。

| 归档文件 | 版本范围 | 核心产物覆盖 |
|---------|---------|-------------|
| 📘 [V67-V99-foundation.md](archive/V67-V99-foundation.md) | V67.2 ~ V99 | 数据层 P0 修复 / 导航统一 / Schema 防御 / OpenAPI 契约 |
| 📗 [V178-V210-modules.md](archive/V178-V210-modules.md) | V178 ~ V210 | MES/QMS/WMS/TMS/APS 6 大模块 / 导航三联校验 / utoipa 注解 |
| 📙 [V211-V230-quality.md](archive/V211-V230-quality.md) | V210.5 ~ V230 | 覆盖率冲刺 / Design Token 2845→169 / i18n 清零 R5→R13 |
| 📕 [V231-V258-closure.md](archive/V231-V258-closure.md) | V231 ~ V258 | 架构冗余收修 / R5 security 清零 / Tauri Stronghold+IPC / 前端泛型 / 死代码 2814 条 |
| 📒 [V259-V264-backlog-closure.md](archive/V259-V264-backlog-closure.md) | V259 ~ V264+ | V252 CRUD 审计 Phase 1-6 / V232 Strict-Zero P0-P4 / Backlog 5 主题 16 条全完成 / L1-VALUE 96 dead exports / Tauri 生态 5/5 / CI 双开关 blocking |

**快速跳转**：
- 最早的设计决策 → V67-V99
- MES/QMS/WMS/TMS/APS 业务逻辑 → V178-V210
- i18n / Design Token 经验 → V211-V230
- Tauri keystore / 前端泛型 / CI Gate → V231-V258
- V252 CRUD 审计 / V232 Strict-Zero / Backlog 全量收闭 → V259-V264+
