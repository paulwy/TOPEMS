# TOPEMS 设计系统模板例外清单

> 文档状态：已归档  
> 关联规划：`/Users/air/TOPEMS/design-system-implementation-plan.md`  
> 关联 TODO：`docs/roadmap/TODO.md` V266 设计系统模板迁移  
> 更新日期：2026-08-22

---

## 1. 背景

V266 模板迁移阶段结束后，全站模板覆盖率达到 **91.5%**（486/531 页面）。剩余 45 个页面因交互形态特殊、属于子组件/常量文件、或强行套用现有模板会显著增加维护成本，经评估后登记为例外项，不再纳入当前模板迁移范围。

例外项不代表“永不治理”，而是明确：
- 当前 15 种标准页面模板不覆盖这些场景；
- 后续如需统一，应优先创建新的专用模板（如 `ChatPageTemplate`、`MobilePageTemplate`、`AuthPageTemplate`），而不是硬塞进现有模板。

---

## 2. 例外项总览

| 类别 | 数量 | 代表页面 | 核心原因 |
|------|------|----------|----------|
| AI 对话类 | 5 | `AiChatPage`、`DifyChatPage` 等 | 聊天交互，需要消息列表、输入区、上下文管理，现有模板无法表达 |
| 移动端页面 | 11 | `MobileHomePage`、`MobileTaskListPage` 等 | 小屏交互、底部导航、触摸优先，需 `MobilePageTemplate` |
| 设计器/画布类 | 4 | `FormDesignPage`、`PageDesignPage`、`WorkflowDesignerPage`、`AutomationDesignerPage` | 拖拽、画布、属性面板，属于编辑器而非数据页面 |
| 报表类 | 6 | `ReportBuilder`、`ReportViewer`、`ReportPage` 等 | 报表设计/查看/渲染，已有 `ReportDesignerTemplate` 但业务耦合深 |
| 认证/错误页 | 4 | `LoginPage`、`ForgotPasswordPage`、`NotFoundPage`、`ErrorPage` | 无导航、无 PageContainer，需 `AuthPageTemplate` |
| 门户/协作类 | 3 | `SupplierPortalPage`、`NotificationCenter`、`IMPage` | 多角色门户、实时通讯、消息中心，布局特殊 |
| GIS/地图类 | 2 | `GisPage`、`gis/index` | 地图画布 + 图层控制，现有 `GisMapTemplate` 尚未接入 |
| 文档/邮件类 | 2 | `DocumentsPage`、`MailPage` | 富文本/邮件客户端，类似桌面应用 |
| 性能测试/系统类 | 2 | `PerformanceTestPage`、`SystemManagementPage` | 高定制工具页 |
| 列表/结构类 | 4 | `DatabaseStructurePage`、`HelpCenterPage`、`CommentsPage`、`AppManagementPage` | 适合模板但优先级低，可待模块重构时处理 |
| 非页面支持文件 | 2 | `ProductionDashboardPage/constants.tsx`、历史遗留 `_shared/*` | 已改为 `.ts` 或移出 `pages/` |

合计：**45 个页面/文件**。

---

## 3. 详细清单

### 3.1 AI 对话类（5）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/ai/AiChatPage.tsx` | `ChatPageTemplate` | 多会话 + 消息流 |
| `apps/web/src/pages/ai/AiCodeAssistantPage.tsx` | `ChatPageTemplate` | 代码助手 |
| `apps/web/src/pages/ai/AiDocumentAnalysisPage.tsx` | `ChatPageTemplate` | 文档分析对话 |
| `apps/web/src/pages/ai/AiKnowledgeBasePage.tsx` | `CardListTemplate` / `ChatPageTemplate` | 知识库 + 问答混合 |
| `apps/web/src/pages/ai/DifyChatPage.tsx` | `ChatPageTemplate` | Dify 集成对话 |

### 3.2 移动端页面（11）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/mobile/MobileApprovalPage.tsx` | `MobilePageTemplate` | 审批列表 |
| `apps/web/src/pages/mobile/MobileAttendancePage.tsx` | `MobilePageTemplate` | 考勤 |
| `apps/web/src/pages/mobile/MobileHomePage.tsx` | `MobileDashboardTemplate` | 移动首页 |
| `apps/web/src/pages/mobile/MobileInventoryPage.tsx` | `MobilePageTemplate` | 库存 |
| `apps/web/src/pages/mobile/MobileProductionPage.tsx` | `MobilePageTemplate` | 生产 |
| `apps/web/src/pages/mobile/MobileProfilePage.tsx` | `MobilePageTemplate` | 个人中心 |
| `apps/web/src/pages/mobile/MobileQualityPage.tsx` | `MobilePageTemplate` | 质检 |
| `apps/web/src/pages/mobile/MobileScanPage.tsx` | `MobilePageTemplate` | 扫码 |
| `apps/web/src/pages/mobile/MobileTaskListPage.tsx` | `MobilePageTemplate` | 任务列表 |
| `apps/web/src/pages/mobile/MobileWorkbenchPage.tsx` | `MobilePageTemplate` | 工作台 |
| `apps/web/src/pages/mobile/PushNotificationPage.tsx` | `MobilePageTemplate` | 推送通知 |

### 3.3 设计器/画布类（4）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/lowcode/FormDesignPage.tsx` | `DesignerTemplate` | 表单设计器 |
| `apps/web/src/pages/lowcode/PageDesignPage.tsx` | `DesignerTemplate` | 页面设计器 |
| `apps/web/src/pages/workflow/WorkflowDesignerPage.tsx` | `DesignerTemplate` | 流程设计器 |
| `apps/web/src/pages/automation/AutomationDesignerPage/index.tsx` | `DesignerTemplate` | 自动化规则设计器 |

### 3.4 报表类（6）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/report/ReportBuilder.tsx` | `ReportDesignerTemplate` | 报表构建器 |
| `apps/web/src/pages/report/ReportBuilderPage.tsx` | `ReportDesignerTemplate` | 报表构建页 |
| `apps/web/src/pages/report/ReportDesignPage.tsx` | `ReportDesignerTemplate` | 报表设计 |
| `apps/web/src/pages/report/ReportPage.tsx` | `StatsPageTemplate` / `ReportViewerTemplate` | 报表中心 |
| `apps/web/src/pages/report/ReportPage/index.tsx` | `StatsPageTemplate` / `ReportViewerTemplate` | 报表中心（新版） |
| `apps/web/src/pages/report/ReportViewer.tsx` | `ReportViewerTemplate` | 报表查看器 |

### 3.5 认证/错误页（4）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/shared/LoginPage.tsx` | `AuthPageTemplate` | 登录 |
| `apps/web/src/pages/shared/ForgotPasswordPage.tsx` | `AuthPageTemplate` | 忘记密码 |
| `apps/web/src/pages/shared/NotFoundPage.tsx` | `AuthPageTemplate` / `ErrorPageTemplate` | 404 |
| `apps/web/src/pages/shared/ErrorPage.tsx` | `AuthPageTemplate` / `ErrorPageTemplate` | 错误页 |

### 3.6 门户/协作类（3）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/srm/SupplierPortalPage.tsx` | `PortalPageTemplate` | 供应商门户 |
| `apps/web/src/pages/notification/NotificationCenter.tsx` | `NotificationTemplate` | 消息中心 |
| `apps/web/src/pages/shared/IMPage.tsx` | `ChatPageTemplate` | 即时通讯 |

### 3.7 GIS/地图类（2）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/bi/GisPage/index.tsx` | `GisMapTemplate` | BI 地图 |
| `apps/web/src/pages/gis/index.tsx` | `GisMapTemplate` | GIS 模块 |

### 3.8 文档/邮件类（2）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/doc/DocumentsPage/index.tsx` | `DocumentTemplate` | 文档中心 |
| `apps/web/src/pages/im/MailPage/index.tsx` | `MailClientTemplate` | 邮件客户端 |

### 3.9 性能测试/系统类（2）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/performance/PerformanceTestPage.tsx` | `FormPageTemplate` / 保持定制 | 压测工具页 |
| `apps/web/src/pages/admin/SystemManagementPage.tsx` | `DashboardTemplate` / 保持定制 | 系统管理入口 |

### 3.10 列表/结构类（4）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/admin/DatabaseStructurePage.tsx` | `TreePageTemplate` | 数据库结构树 |
| `apps/web/src/pages/help/HelpCenterPage.tsx` | `CardListTemplate` | 帮助中心 |
| `apps/web/src/pages/shared/CommentsPage.tsx` | `ListPageTemplate` | 评论列表 |
| `apps/web/src/pages/lowcode/AppManagementPage.tsx` | `ListPageTemplate` | 应用管理 |

### 3.11 非页面支持文件（2）

| 文件路径 | 处理方式 | 备注 |
|----------|----------|------|
| `apps/web/src/pages/mes/ProductionDashboardPage/constants.tsx` | 已改为 `.ts` 并移至 `components/mes/ProductionDashboardConstants.ts` | 常量文件不应被识别为页面 |
| 历史 `_shared/*.shared.tsx` | 已移至 `components/shared/` | 共享组件不应在 `pages/` |

---

## 4. 例外项治理原则

1. **新增页面禁止为例外**：除非业务确实属于聊天/设计器/地图等当前模板未覆盖领域，否则必须选用现有模板。  
2. **新增例外必须登记**：若未来仍有页面无法套用模板，需更新本文档并说明原因。  
3. **专用模板优先于硬套**：当同一类例外页面 ≥ 3 个时，应考虑创建新的专用模板，而不是继续登记为例外。  
4. **定期回顾**：建议每季度回顾本清单，评估是否有例外项已具备迁移条件。

---

## 5. 对覆盖率指标的影响

| 指标 | 数值 |
|------|------|
| 当前全站页面总数 | 531 |
| 已使用标准模板 | 486 (91.5%) |
| 例外项（本文档） | 45 (8.5%) |
| 目标覆盖率（不含例外） | 100% |

> 注：覆盖率计算以 `apps/web/src/pages/**/*.tsx` 为分母。非页面支持文件已移出 `pages/` 或改为 `.ts`，不再计入。
