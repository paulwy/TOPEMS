# 重复页面清理方案

> 版本: 1.0 | 日期: 2026-07-01
> 状态: 待确认

## 一、背景

经过全面扫描，发现项目中存在多套页面并存、目录重复、孤儿页面等问题。本方案旨在彻底清理这些重复页面，统一目录结构和命名规范。

## 二、总体数据

| 指标 | 数量 |
|------|------|
| 页面文件总数 | 417 个 |
| V2 路由模块数 | 31 个 |
| V2 路由总数 | 405 条 |
| V2 路由引用页面数 | 381 个 |
| **孤儿页面（未被引用）** | **30 个** |
| V2 路由重复路径 | 0 条 ✅ |

## 三、分批次清理计划

### 第一批（P1 - 高优先级）：workflow 两套页面合并

**问题**：workflow 模块存在 Flow* 和 Workflow* 两套命名的页面

**策略**：
- 保留 Workflow* 命名（已标准化，使用 ListPageTemplate 等模板）
- 将仍被引用的 Flow* 页面重命名为 Workflow* 命名
- 删除未被引用的 Flow* 旧页面

**仍被 V2 路由引用的 Flow* 页面（5个）—— 需重命名**：

| 旧文件名 | 新文件名 | 路由路径 |
|---------|---------|---------|
| `FlowInstanceDetailPage.tsx` | `WorkflowInstanceDetailPage.tsx` | /workflow/instances/:id |
| `FlowApprovalDetailPage.tsx` | `WorkflowApprovalDetailPage.tsx` | /workflow/approvals/:id |
| `FlowTemplatePage.tsx` | `WorkflowTemplatePage.tsx` | /workflow/templates |
| `FlowVersionHistoryPage.tsx` | `WorkflowVersionHistoryPage.tsx` | /workflow/version-history |
| `FlowNotificationCenter.tsx` | `WorkflowNotificationCenterPage.tsx` | /workflow/notification-center |

**未被引用的 Flow* 页面（9个）—— 直接删除**：

| 文件名 | 说明 |
|--------|------|
| `FlowApprovalPage.tsx` | 审批列表（已有 WorkflowApprovalsPage） |
| `FlowDefinitionPage.tsx` | 流程定义列表（已有 WorkflowDefinitionsPage） |
| `FlowDesignerPage.tsx` | 流程设计器（已有 WorkflowDesignerPage） |
| `FlowInstanceListPage.tsx` | 实例列表（已有 WorkflowInstancesPage） |
| `FlowMonitorPage.tsx` | 流程监控（已有 WorkflowMonitorPage） |
| `FlowSettingsPage.tsx` | 系统设置（已有 WorkflowSettingsPage） |
| `FlowStatisticsPage.tsx` | 统计分析（已有 WorkflowStatisticsPage） |
| `FlowWorkflowPage.tsx` | 工作流页面（冗余） |
| `DashboardPage.tsx` | 旧版仪表盘（已有 WorkflowDashboardPage） |

**操作步骤**：
1. 将 5 个被引用的 Flow* 页面重命名为 Workflow* 命名
2. 更新 V2 路由引用
3. 删除 9 个未被引用的 Flow* 页面

---

### 第二批（P1 - 高优先级）：doc 模块目录合并

**问题**：doc 模块存在 docs/ 和 document/ 两个目录，V2 路由同时引用两个目录的页面

**策略**：
- 统一到 `doc/` 目录（与路由模块名一致）
- 优先保留使用标准化模板的页面
- 合并后删除旧目录

**当前引用情况**：

| 目录 | 页面数 | 被引用页面数 | 被引用页面 |
|------|--------|-------------|-----------|
| `pages/document/` | 3 | 3 | DocumentDashboardPage, DocumentListPage, DocumentKnowledgeBasePage |
| `pages/docs/` | 5 | 3 | DocumentsPage, DocumentCenterPage, DocsFileDetailPage |

**合并方案**：

| 源文件 | 目标位置 | 操作 |
|--------|---------|------|
| `document/DocumentDashboardPage.tsx` | `doc/DashboardPage.tsx` | 重命名并移动 |
| `document/DocumentListPage.tsx` | `doc/DocumentListPage.tsx` | 移动 |
| `document/DocumentKnowledgeBasePage.tsx` | `doc/KnowledgeBasePage.tsx` | 重命名并移动 |
| `docs/DocumentsPage.tsx` | `doc/DocumentsPage.tsx` | 移动 |
| `docs/DocumentCenterPage.tsx` | `doc/DocumentCenterPage.tsx` | 移动 |
| `docs/DocsFileDetailPage.tsx` | `doc/FileDetailPage.tsx` | 重命名并移动 |
| `docs/DocsDashboardPage.tsx` | — | 删除（已有 DocumentDashboardPage） |
| `docs/KnowledgeBasePage.tsx` | — | 删除（已有 DocumentKnowledgeBasePage） |

**操作步骤**：
1. 创建 `pages/doc/` 目录
2. 将 6 个被引用的页面移动到 doc/ 目录并适当重命名
3. 更新 V2 路由引用
4. 删除 `docs/` 和 `document/` 两个旧目录

---

### 第三批（P2 - 中优先级）：重复 Dashboard + 孤儿页面清理

#### 3.1 重复 Dashboard 页面（6个模块）

**问题**：多个模块同时存在两个 Dashboard 页面

| 模块 | 页面1 | 页面2 | 保留 | 删除 |
|------|-------|-------|------|------|
| ai | AiDashboardPage.tsx | DashboardPage.tsx | AiDashboardPage | DashboardPage |
| finance | FinanceDashboardPage.tsx | DashboardPage.tsx | FinanceDashboardPage | DashboardPage |
| iam | IamDashboardPage.tsx | DashboardPage.tsx | IamDashboardPage | DashboardPage |
| mes | ProductionDashboardPage.tsx | DashboardPage.tsx | ProductionDashboardPage | DashboardPage |
| workflow | WorkflowDashboardPage.tsx | DashboardPage.tsx | WorkflowDashboardPage | DashboardPage |

> 注：统一保留使用标准化命名（ModulePrefix + DashboardPage）的页面

#### 3.2 孤儿页面清单（37个，按模块分组）

**workflow 模块（9个）** — 见第一批

**mobile 模块（3个）**：

| 文件名 | 路径 | 说明 |
|--------|------|------|
| `NotificationListPage.tsx` | pages/mobile/ | 移动端通知列表（被 MobileNotificationPage 替代？） |
| `OfflineSyncPage.tsx` | pages/mobile/ | 离线同步 |
| `ScanSettingsPage.tsx` | pages/mobile/ | 扫描设置 |

> ✅ 已确认：MobileWorkbenchPage、MobileSettingsPage、MobileNotificationPage 正在被 V2 路由引用，不是孤儿页面

**integration 模块（4个）**：

| 文件名 | 路径 | 说明 |
|--------|------|------|
| `ExternalErpConnectionPage.tsx` | pages/integration/ | 外部ERP连接（旧命名，可能被 IntegrationConnectionsPage 替代） |
| `ExternalErpMappingPage.tsx` | pages/integration/ | 外部ERP映射（旧命名，可能被 IntegrationMappingsPage 替代） |
| `ExternalErpOverviewPage.tsx` | pages/integration/ | 外部ERP概览（旧命名，可能被 IntegrationErpOverviewPage 替代） |
| `ConversionRulesPage.tsx` | pages/integration/ | 转换规则 |

> ✅ 已确认：Integration* 系列页面正在被 V2 路由引用，ExternalErp* 是旧命名版本

**docs 模块（2个）** — 见第二批（DocsDashboardPage, KnowledgeBasePage）

**mes 模块（3个）**：

| 文件名 | 路径 | 说明 |
|--------|------|------|
| `MobileWorkstationPage.tsx` | pages/mes/ | 移动工位（可能在mobile模块） |
| `EquipmentMaintenanceDetailPage.tsx` | pages/mes/ | 设备维护详情 |
| `DashboardPage.tsx` | pages/mes/ | 旧版Dashboard |

**shared 模块（4个）**：

| 文件名 | 路径 | 说明 |
|--------|------|------|
| `AIPage.tsx` | pages/shared/ | AI页面 |
| `HelpCenterPage.tsx` | pages/shared/ | 帮助中心 |
| `ProjectDashboardPage.tsx` | pages/shared/ | 项目仪表盘 |
| `ReportDashboardPage.tsx` | pages/shared/ | 报表仪表盘 |

> ✅ 已确认：ModulesOverviewPage 被 dashboard.ts 引用，正在使用
> ✅ 已确认：NotFoundPage 未找到任何引用，确实是孤儿页面

**其他零散孤儿页面（6个）**：

| 文件名 | 路径 | 说明 |
|--------|------|------|
| `DashboardPage.tsx` | pages/ai/ | AI模块旧Dashboard |
| `DashboardPage.tsx` | pages/finance/ | 财务模块旧Dashboard |
| `DashboardPage.tsx` | pages/iam/ | IAM模块旧Dashboard |
| `DashboardPage.tsx` | pages/mes/ | MES模块旧Dashboard |
| `DashboardPage.tsx` | pages/workflow/ | 工作流模块旧Dashboard |
| `NotFoundPage.tsx` | pages/shared/ | 404页面（未被引用） |

> ✅ 已确认：notification 模块的 8 个页面全部被 V2 路由引用，不是孤儿页面

---

### 第四批（P2 - 中优先级）：iam/admin 页面职责梳理

**问题**：iam 模块 V2 路由引用了 9 个 admin/ 目录下的页面，导致两个模块页面交叉

**iam 模块引用的 admin 页面**：
- `admin/SysRolePage` — 系统角色
- `admin/SysPermissionPage` — 系统权限
- `admin/SysDictPage` — 数据字典
- `admin/SysMenuPage` — 菜单管理
- `admin/SysDeptPage` — 部门管理
- `admin/SysUserPage` — 用户管理
- `admin/SysLogPage` — 操作日志
- `admin/SysConfigPage` — 系统配置
- `admin/OrganizationPage` — 组织架构

**策略**：
- 明确 iam 模块职责：身份认证与访问管理（用户、角色、权限、组织架构）
- 明确 admin 模块职责：系统管理（字典、菜单、日志、配置、租户）
- 将属于 iam 职责的页面从 admin/ 移动到 iam/
- 将属于 admin 职责的页面保留在 admin/
- 更新 V2 路由引用

**页面归属调整方案**：

| 页面 | 当前位置 | 调整后位置 | 归属模块 | 理由 |
|------|---------|-----------|---------|------|
| SysUserPage | admin/ | iam/ | iam | 用户管理属于IAM核心功能 |
| SysRolePage | admin/ | iam/ | iam | 角色管理属于IAM核心功能 |
| SysPermissionPage | admin/ | iam/ | iam | 权限管理属于IAM核心功能 |
| OrganizationPage | admin/ | iam/ | iam | 组织架构属于IAM |
| SysDeptPage | admin/ | iam/ | iam | 部门管理属于组织架构 |
| SysDictPage | admin/ | admin/ | admin | 数据字典属于系统管理 |
| SysMenuPage | admin/ | admin/ | admin | 菜单管理属于系统管理 |
| SysLogPage | admin/ | admin/ | admin | 操作日志属于系统管理 |
| SysConfigPage | admin/ | admin/ | admin | 系统配置属于系统管理 |

## 四、实施原则

1. **先重命名/移动，再删除**：确保所有路由引用更新后再删除旧文件
2. **每批完成后验证**：每批清理完成后，验证所有页面可正常访问
3. **保留功能，不丢信息**：合并页面时，确保保留更完善的版本的所有功能
4. **命名规范化**：
   - 页面文件统一使用 `ModulePrefix + PageName + Page.tsx` 格式
   - 目录名与模块 code 一致（如 `doc/`、`workflow/`）
   - Dashboard 统一为 `ModulePrefix + DashboardPage.tsx`

## 五、风险与回滚

- **风险**：删除错误的页面导致功能不可用
- **回滚**：所有操作可通过 git 历史回滚
- **验证**：每批完成后运行全量路由冒烟测试

---

## 六、待确认事项

⚠️ 以下页面需要确认是否真的可以删除：

1. **mobile 模块的 3 个孤儿页面**：NotificationListPage、OfflineSyncPage、ScanSettingsPage — 是否是遗留的旧版移动端页面？
2. **integration 模块的 4 个 ExternalErp* 页面**：是否是旧版命名，功能已被 Integration* 系列页面替代？
3. **mes 模块的 3 个孤儿页面**：MobileWorkstationPage、EquipmentMaintenanceDetailPage、DashboardPage — 是否还在使用？
4. **shared 模块的 4 个孤儿页面**：AIPage、HelpCenterPage、ProjectDashboardPage、ReportDashboardPage — 是否是历史遗留页面？

> 以上页面经过全局搜索，未在路由配置中找到引用。但为安全起见，建议先确认后再删除。
