# 前端测试矩阵 ROI 审视（Frontend Test ROI Review）

> **状态**：审视报告（待实施）· **归档日期**：2026-08-31 · **关联**：`TODO.md` P1-3
> **数据基线**：2026-08-31 代码库快照（apps/web）

## 1. 现状基线

| 层级 | 规模 | 运行方式 | CI 耗时预算 |
|---|---|---|---|
| 单元/纯逻辑测试（unit） | utils/api/lib 等 | vitest `--project unit` | 10 min/job |
| 组件+页面单测（component） | 392 个测试文件，8 路分片 | vitest `--project component --shard=N/8` | 10 min × 8 |
| Playwright UI E2E | 41 个 spec，6 project（chromium/firefox/webkit/mobile-iphone/tablet-ipad/mobile-android） | playwright.config.ts | 未设上限 |
| Playwright API E2E | e2e/api | playwright.config.api.ts | — |
| Playwright 集成 | e2e/integration | playwright.config.integration.ts | — |
| 覆盖率 | 独立 job | vitest coverage | — |
| 设计系统/视觉回归 | component-visual + design-system-visual | 快照 | — |

**单测文件分布**（392 个，按目录）：

| 目录 | 数量 | 层级 | 建议保留级别 |
|---|---|---|---|
| pages | 167 | 页面级 | L3（抽查） |
| api | 73 | 逻辑/契约 | L1（保留） |
| components | 70 | 组件级 | L2（分级） |
| utils | 20 | 纯逻辑 | L1（保留） |
| `__tests__` | 17 | 混合 | L2 |
| hooks | 11 | 逻辑 | L1（保留） |
| lib / config / store / schemas 等 | 34 | 逻辑/基础设施 | L1（保留） |

## 2. ROI 分级与裁剪建议

### L1 高价值（保留）：纯逻辑 + API 契约（~120 文件）
utils/lib/api/hooks 测试成本低、故障定位准、防回归价值高。**全保留，禁止删除**。

### L2 中价值（分级保留）：组件级（~80 文件）
- **保留**：通用/共享组件（`components/common`、`components/templates`、shared-components）测试——影响面大。
- **降级**：单一页面专属、低频更新的业务组件测试——从"每组件必有"改为"关键行为抽测"，可合并到页面抽查。

### L3 低 ROI（抽查策略）：页面级（167 文件）
页面测试依赖大量 mock、随 UI 变更高频维护，单测价值被 E2E 覆盖重叠。
- **建议**：167 个页面单测不逐页全量维护，改为**关键业务页面（登录/工单/订单/报表等高频核心）保留 + 其余降为 smoke（仅渲染不崩溃）**。
- 预计可裁剪 40–50% 页面单测文件，且不降低有效覆盖。

### L4 E2E 矩阵收敛（Playwright）
- **chromium 全量跑**（覆盖 80% 以上回归），**firefox/webkit 降为关键流程冒烟**（登录→核心 CRUD）。
- 移动端 3 个 device profile（iphone/ipad/android）收敛为 **1 个（iphone）+ 1 个 tablet**，或改为仅响应式断言。
- 视觉快照（component-visual/design-system-visual）：只保留设计系统级（共享组件），页面级视觉快照停用（变更噪音大）。

## 3. 时间预算（目标）

CI 前端全链路单次 PR 预算（从当前 ~25–35 min 收敛至 ≤ 20 min）：

| 阶段 | 预算 |
|---|---|
| lint + typecheck + design-system-check + i18n-gate | ≤ 4 min |
| 单测 9 路分片（unit + 8 shard） | 每分片 ≤ 4 min |
| 覆盖率 | ≤ 3 min（随裁剪同步降低门槛，不以 100% 为硬指标） |
| E2E（UI 收敛后 1+1 project + API + 集成） | ≤ 8 min |
| Lighthouse | 按需（非阻塞） |

> 门槛原则：**覆盖率阈值不随裁剪上调**，改为"核心路径 100% + 全量 ≥ 现有值下限"。

## 4. 实施路径（分三批，每批独立可回滚）

1. **批 1（低风险）**：E2E 矩阵收敛（6→2 project）+ 视觉快照只留设计系统级 → 立省 CI 时间。
2. **批 2（中风险）**：页面单测降级为 smoke（保留关键页面）→ 裁剪文件 + 对应 vitest 分片数从 8 降到 4–5。
3. **批 3（持续）**：按"修改频率 × 故障价值"双维建立用例热图，季度复盘一次 ROI。

## 5. 本次待办完成定义（P1-3）

- [x] 用例分级（L1/L2/L3/L4）与裁剪建议
- [x] CI 时间预算（≤ 20 min 目标）
- [x] 分三批实施路径
- [x] 批 1 E2E 矩阵收敛（2026-08-31 落地）：CI 实际使用的 `tests/e2e/playwright.config.ts` 本就为单 chromium project；`apps/web/playwright.config.ts` 6 project（未被 CI 引用）已收敛为 chromium + mobile-iphone，firefox/webkit/tablet/android 注释保留。全项目 0 snapshot 文件，视觉快照项无对象可清理。
- [x] 批 2 页面单测保留集评审（2026-09-01 落地）：167 文件逐项分类——**保留 102（61%）**（核心页面 68 + 页面 hooks 34）/ **降级 smoke 65（39%）**；vitest 分片 8→5（见下节 §6）。

## 6. 批 2 保留集评审结论（2026-09-01）

### 6.1 分类口径
- **保留（完整单测）**：高频核心业务页面（认证/工作台/订单/生产/质量/HR/报表/审批/移动核心/模块聚合）+ **全部页面 hooks**（逻辑测试，成本低价值高，符合 L1 原则）。
- **降级 smoke（仅渲染不崩溃）**：低变更/低访问页面与页面专属组件（系统管理/管理后台次级/AI/插件/自动化/GIS/监控/文档/移动次级/分析聚合）。smoke 化模板见 §6.4，保留 1-3 个渲染断言，删繁重 mock。

### 6.2 保留集（102 个，完整单测）
**核心页面（68）**：
- 工作台/仪表盘：BIDashboardPage、FinanceDashboardPage、ProductionDashboardPage、WorkStationPage
- 订单/客户：SrmOrderPage.api、CrmCustomerManagementPage、CrmOpportunityManagementPage、CustomerManagementPage、CrmCrudPages
- 生产/工单：ProductionOrderManagementPage、ProductionProcessPage、ProductionRecordPage、WIPPage、MaterialBOMPage、WorkflowApprovalsPage
- 质量：QmsAuditManagementPage、QmsInspectionPage、QmsNonconformancePage、QmsQualityControlPage、QualityTraceabilityPage
- HR：HrmEmployeePage(.form)、HrmAttendancePage、HrmLeavePage、HrmPayrollPage、HrmDepartmentPage
- 报表/BI：ReportListPage、ReportSchedulePage、ReportSubscriptionPage、BIComparisonPage、BIDataSourcePage
- 移动核心：MobileApprovalPage、MobileTaskListPage、MobileHomePage
- IAM：IamUserManagementPage、IamRoleManagementPage、IamPermissionManagementPage、IamCompanyStructurePage
- EHS：EhsPlanPage、EhsCheckPage、EhsAccidentPage、EhsDrillPage、EhsHazardPage
- LIMS：LimsSamplePage、LimsSampleDetailPage、LimsTaskPage、LimsInstrumentPage、LimsProcessPage
- 模块聚合：ErpModule、FinanceModule、MesModule、PdmModule、PmModule、ScmModule、WmsModule、BiModule、ImModule、QmsModule、ReportModule、WorkflowModule、CoreInteractions、BatchOperations
- Admin 核心：AdminTenantManagementPage、AdminSystemSettingsPage、AdminAuditMonitoringComponents、AdminBasicComponents
- 公共：shared/NotFoundPage（极简 404，防回归）

**页面 hooks（34）**：admin/hooks 7、ai/hooks 4、bi/hooks 1、doc/hooks 1、ehs/hooks 1、erp/hooks 3、finance/hooks 1、gis/hooks 1、mobile/hooks 6、monitor/hooks 1、plugin/hooks 2、pm/hooks 2、report/hooks 1、shared/hooks 2、system/hooks 1

### 6.3 降级集（65 个，smoke 化）
- 模块聚合（低访问）：AiModule、SrmModule、OtherModules、CrmMobDbg、GisTrackingPage、IamAdminRouteConfig、MobileScanPage
- 管理后台次级：admin/components（Database/Dictionary/Plugin/RateLimit/TenantDetail 5）
- AI：ai/components（AiAssistant/AiModelSettings/Chat/Dashboard/QuickAction/StatCard 6）
- 自动化：automation（Designer/Rules/Runs/Variables/Dashboard 5）
- BI/GIS 次级：bi/GisPageComponents、BiPermissionComponents、gis/components（DataTable/StatisticsCards/StatusChip 3）
- 文档/EHS/ERP/Finance 组件：doc/DocumentBasicComponents、ehs/EhsHazardComponents、erp/Operational/FinancialReport、finance/ConsolidationScope/FinanceVoucher
- IAM 独立页：iam/__tests__（CompanyStructure/Permission/Role/User 4——与 __tests__/Iam* 聚合重复，保留聚合套）
- 移动次级：mobile/components 6 + lims/LimsInstrumentDataComponents
- 监控/插件/PM/报告组件：monitor/SettingsTabRenderer、plugin/components 4、pm/components 2、report/ReportPageComponents
- 系统管理：system（AuditLogDetailDialog、CacheConfigPanel、LogConfigPanel、SystemConfigPanel、BackupPage 5）
- 分析聚合：mes/qms/wms AnalyticsPages 3 + wms/InventoryReportComponents
- 共享组件：shared/ProfileShortcuts

### 6.4 smoke 化模板（降级集使用）
```tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
// 不 mock API/Store —— 组件内部容错空数据，仅验证渲染不崩溃 + 标题/关键占位
import Component from '../Component';
describe('Component smoke', () => {
  it('renders without crash', () => {
    render(<BrowserRouter><Component /></BrowserRouter>);
    expect(screen.getByTestId('root') ?? document.body).toBeTruthy();
  });
});
```

### 6.5 分片调整（8 → 5）
- 现 component 项目 8 分片（`--shard=N/8`）；降级 65 文件 smoke 化后单文件执行与 mock 成本大幅下降。
- 目标 5 分片（`--shard=N/5`），每分片预算维持 ≤4 min；若实测仍宽裕可再收至 4。
- 覆盖门槛：**核心路径 100% + 全量 ≥ 现有值下限**（不随裁剪上调阈值）。

### 6.6 实施状态
- [x] 保留集/降级集评审与清单
- [ ] 降级集 smoke 化改造（65 文件，按 §6.4 模板）
- [ ] vitest 分片 8→5 + 覆盖率门槛核对
- [ ] CI 实测预算验证（目标 ≤20 min）
