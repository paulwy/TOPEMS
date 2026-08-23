# TOPEMS 设计系统模板例外清单

> 文档状态：已归档  
> 关联规划：`/Users/air/TOPEMS/design-system-implementation-plan.md`  
> 关联 TODO：`docs/roadmap/TODO.md` V276 GIS 模板接入  
> 更新日期：2026-08-23

---

## 1. 背景

V266 模板迁移阶段结束后，全站模板覆盖率达到 **91.5%**（486/531 页面）。V267-B 新增 `MobilePageTemplate` 并完成 10 个移动端页面迁移后，覆盖率提升至 **93.4%**（496/531 页面）。V268 三轨并行推进：

1. **V268-C**：`MobileHomePage` 迁移至 `MobilePageTemplate`，覆盖率 **93.6%**（497/531）
2. **V268-A**：新增 `AuthPageTemplate` + 4 个认证/错误页迁移，覆盖率 **94.4%**（501/531）
3. **V268-B**：新增 `ChatPageTemplate` + 3 个聊天页（AiChatPage、DifyChatPage、IMPage）迁移，覆盖率 **94.9%**（504/531）

**V269**：新增 `DesignerTemplate` + 4 个设计器页（FormDesignPage、PageDesignPage、WorkflowDesignerPage、AutomationDesignerPage）迁移，覆盖率进一步提升至 **95.8%**（508/530），剩余 22 个例外项。

**V273**：新增 `AiToolPageTemplate` + 3 个 AI 工具页（AiCodeAssistantPage、AiDocumentAnalysisPage、AiKnowledgeBasePage）迁移，覆盖率提升至 **96.4%**（511/530），剩余 19 个例外项。

**V274**：新增 `ReportViewerTemplate` + 复用 `DesignerTemplate` 双轨并行，完成 6 个报表类页面模板化，覆盖率提升至 **97.5%**（517/530），剩余 **13** 个例外项。实现策略：
- `DesignerTemplate` (standard) 复用 V269 设计器布局壳，覆盖报表设计/构建 3 页面；scan.mjs `report-designer` 规则扩展为同时接受 `ReportDesignerTemplate` 和 `DesignerTemplate`
- `ReportViewerTemplate` 新建 center/viewer 双模式 + children 透传 + loading/error 统一状态；scan.mjs 新增 `report-viewer` 规则，覆盖报表中心/查看器 3 页面

**V276**：将 2 个 GIS 例外页接入已有的 `GisMapTemplate`（V269 创建但未落地），覆盖率提升至 **97.9%**（519/530），剩余 **11** 个例外项。数据转换：DevicePoint/StorageLocation → MapMarker、Pipeline → GeoFence rectangle。

剩余 11 个页面因交互形态特殊、或强行套用现有模板会显著增加维护成本，经评估后登记为例外项，不再纳入当前模板迁移范围。

例外项不代表"永不治理"，而是明确：
- 当前 22 种标准页面模板不覆盖这些场景（`MobilePageTemplate`、`AuthPageTemplate`、`ChatPageTemplate`、`DesignerTemplate`、`AiToolPageTemplate`、`ReportViewerTemplate` 已新增并落地）；
- 后续如需统一，应优先创建新的专用模板，而不是硬塞进现有模板。

---

## 2. 例外项总览

| 类别 | 数量 | 代表页面 | 核心原因 |
|------|------|----------|----------|
| AI 对话类 | 0 | — | 3 个 AI 工具页已全部迁至 `AiToolPageTemplate` |
| 移动端页面 | 0 | — | 11 个移动端页面已全部迁至 `MobilePageTemplate` |
| 设计器/画布类 | 0 | — | 4 个页面已全部迁至 `DesignerTemplate` |
| 报表类 | 0 | — | 6 个报表页面已完成模板化迁移（3 设计器→DesignerTemplate / 3 查看→ReportViewerTemplate） |
| 认证/错误页 | 0 | — | 4 个页面已全部迁至 `AuthPageTemplate` |
| 门户/协作类 | 2 | `SupplierPortalPage`、`NotificationCenter` | 多角色门户、消息中心，布局特殊 |
| GIS/地图类 | 0 | — | 2 个 GIS 页面已全部接入 `GisMapTemplate`（devicePoints→markers / pipelines→fences / storageLocations→markers） |
| 文档/邮件类 | 2 | `DocumentsPage`、`MailPage` | 富文本/邮件客户端，类似桌面应用 |
| 工具/系统类 | 3 | `PerformanceTestPage`、`SystemManagementPage`、`PluginUploadPage` | 高定制工具页 |
| 列表/结构类 | 4 | `DatabaseStructurePage`、`HelpCenterPage`、`CommentsPage`、`AppManagementPage` | 适合模板但优先级低，可待模块重构时处理 |

合计：**11 个页面**。

---

## 3. 详细清单

### 3.1 AI 对话类（0，已迁移 3 项）

V268-B 新增 `ChatPageTemplate`（`apps/web/src/components/templates/ChatPageTemplate.tsx`，左侧会话列表 + 右侧聊天区（标题栏 + 消息流 + 输入框）的标准布局，支持 `sidebar`、`header`、`messages`、`input` 四插槽，以及 `children` 透传模式）。`AiChatPage`、`DifyChatPage`、`IMPage` 已完成迁移。V273 新增 `AiToolPageTemplate`（`apps/web/src/components/templates/AiToolPageTemplate.tsx`，左侧配置/列表 + 右侧内容区（可选 Tabs）的双栏布局，支持 `leftPanel` / `rightPanel` / `tabs` 结构化插槽与 `children` 透传模式，统一 `loading` / `error` 状态），剩余 3 个 AI 工具页（代码助手、文档分析、知识库问答）已全部迁移至该模板，该类别例外清零。

| 页面路径 | 使用模板 | 状态 | 备注 |
|----------|----------|------|------|
| `apps/web/src/pages/ai/AiChatPage.tsx` | `ChatPageTemplate` | ✅ 已迁移 | AI 多模式对话 |
| `apps/web/src/pages/ai/AiCodeAssistantPage.tsx` | `AiToolPageTemplate` (children 模式) | ✅ 已迁移 | 代码助手（Paper[Tabs+Grid] 结构透传） |
| `apps/web/src/pages/ai/AiDocumentAnalysisPage.tsx` | `AiToolPageTemplate` (结构化模式) | ✅ 已迁移 | 文档分析（leftPanel + rightPanel + tabs） |
| `apps/web/src/pages/ai/AiKnowledgeBasePage.tsx` | `AiToolPageTemplate` (结构化模式) | ✅ 已迁移 | 知识库问答（leftPanel + rightPanel，无 tabs） |
| `apps/web/src/pages/ai/DifyChatPage.tsx` | `ChatPageTemplate` | ✅ 已迁移 | Dify 集成对话 |

### 3.2 移动端页面（0，已迁移 11 项）

V267-B 新增 `MobilePageTemplate`（`apps/web/src/components/templates/MobilePageTemplate.tsx`，由 `MobileLayout` + `PullToRefresh` + `PageContainer` 组合而成，支持 `bottomNav`、`actions`、`onRefresh`、`headerProps` 等移动端专用插槽）。V268-C 完成最后一个 `MobileHomePage` 的迁移，移动端 11 个页面已全部接入 `MobilePageTemplate`，该类别例外清零。

| 页面路径 | 使用模板 | 状态 | 备注 |
|----------|----------|------|------|
| `apps/web/src/pages/mobile/MobileApprovalPage.tsx` | `MobilePageTemplate` | ✅ 已迁移 | 审批列表（含详情视图） |
| `apps/web/src/pages/mobile/MobileAttendancePage.tsx` | `MobilePageTemplate` | ✅ 已迁移 | 考勤（含下拉刷新） |
| `apps/web/src/pages/mobile/MobileHomePage.tsx` | `MobilePageTemplate` | ✅ 已迁移 | 移动首页（用户卡+打卡+快捷入口+待办+动态） |
| `apps/web/src/pages/mobile/MobileInventoryPage.tsx` | `MobilePageTemplate` | ✅ 已迁移 | 库存（含 Tabs + 搜索） |
| `apps/web/src/pages/mobile/MobileProductionPage.tsx` | `MobilePageTemplate` | ✅ 已迁移 | 生产（含自定义过滤器） |
| `apps/web/src/pages/mobile/MobileProfilePage.tsx` | `MobilePageTemplate` | ✅ 已迁移 | 个人中心 |
| `apps/web/src/pages/mobile/MobileQualityPage.tsx` | `MobilePageTemplate` | ✅ 已迁移 | 质检（含对话框） |
| `apps/web/src/pages/mobile/MobileScanPage.tsx` | `MobilePageTemplate` | ✅ 已迁移 | 扫码（摄像头预览保留在 children） |
| `apps/web/src/pages/mobile/MobileTaskListPage.tsx` | `MobilePageTemplate` | ✅ 已迁移 | 任务列表（含 `headerProps.showSearch`） |
| `apps/web/src/pages/mobile/MobileWorkbenchPage.tsx` | `MobilePageTemplate` | ✅ 已迁移 | 工作台（含 `onRefresh` 下拉刷新） |
| `apps/web/src/pages/mobile/PushNotificationPage.tsx` | `MobilePageTemplate` | ✅ 已迁移 | 推送通知（含加载视图与主视图） |

### 3.3 设计器/画布类（0，已全部迁移）

V269 新增 `DesignerTemplate`（`apps/web/src/components/templates/DesignerTemplate.tsx`，支持 `standard` / `fullscreen` 两种模式，提供 `toolbar` / `leftPanel` / `rightPanel` / `loading` / `error` 等设计器专用插槽）。4 个设计器页已全部迁移。

| 页面路径 | 使用模板 | 状态 | 备注 |
|----------|----------|------|------|
| `apps/web/src/pages/lowcode/FormDesignPage.tsx` | `DesignerTemplate` (standard) | ✅ 已迁移 | 表单 JSON 编辑器 |
| `apps/web/src/pages/lowcode/PageDesignPage.tsx` | `DesignerTemplate` (standard) | ✅ 已迁移 | 页面 JSON 编辑器 |
| `apps/web/src/pages/workflow/WorkflowDesignerPage.tsx` | `DesignerTemplate` (fullscreen) | ✅ 已迁移 | 流程画布设计器 |
| `apps/web/src/pages/automation/AutomationDesignerPage/index.tsx` | `DesignerTemplate` (fullscreen) | ✅ 已迁移 | 自动化规则三栏设计器 |

### 3.4 报表类（0，已迁移 6 项）

V274 分两类模板接入报表体系，实现报表类例外清零（6→0，标准模板数 18→19，例外总数 19→13）：
- **`DesignerTemplate`（标准模式）**：复用 V269 设计器布局模板（统一 `loading` / `error` / `title` / `subtitle` / `pageContainerProps`），scan.mjs 已将 `DesignerTemplate` 加入 `report-designer` 识别规则，覆盖报表设计/构建场景。
- **`ReportViewerTemplate`（新增）**：`apps/web/src/components/templates/ReportViewerTemplate.tsx`，支持 `center` / `viewer` 两种模式及 `children` 透传，统一 `statsHeader` / `filterBar` / `tabs` / `content` / `pagination` / `toolbar` / `loading` / `error` 结构化插槽，scan.mjs 新增 `report-viewer` 识别规则。

| 页面路径 | 使用模板 | 状态 | 备注 |
|----------|----------|------|------|
| `apps/web/src/pages/report/ReportDesignPage.tsx` | `DesignerTemplate` (standard) | ✅ 已迁移 | landing 空状态入口 + 3 操作按钮（表格/图表/自定义） |
| `apps/web/src/pages/report/ReportBuilderPage.tsx` | `DesignerTemplate` (standard) | ✅ 已迁移 | 构建器页面包装，loading 透传给 react-query |
| `apps/web/src/pages/report/ReportBuilder.tsx` | `DesignerTemplate` (standard) | ✅ 已迁移 | 双分支：`isModal=true` 弹窗壳 / `isModal=false` 独立路由壳 |
| `apps/web/src/pages/report/ReportPage.tsx` | `ReportViewerTemplate`（别名 re-export） | ✅ 已迁移 | 报表中心入口别名，显式 re-export 模板保证审计识别 |
| `apps/web/src/pages/report/ReportPage/index.tsx` | `ReportViewerTemplate` (center) | ✅ 已迁移 | 报表中心仪表盘：`loading`/服务下线 error → `filterBar`/`tabs` → 内容 + 弹窗层 |
| `apps/web/src/pages/report/ReportViewer.tsx` | `ReportViewerTemplate` (viewer) | ✅ 已迁移 | 报表查看器：`loading`/`error` 统一处理 → 全屏 modal children 透传 |

### 3.5 认证/错误页（0，已迁移 4 项）

V268-A 新增 `AuthPageTemplate`（`apps/web/src/components/templates/AuthPageTemplate.tsx`，封装全屏背景 + 居中内容容器，支持 `backgroundGradient`、`maxWidth`、`centerContent` 等配置），4 个认证/错误页面已全部迁移至该模板，该类别例外清零。

| 页面路径 | 使用模板 | 状态 | 备注 |
|----------|----------|------|------|
| `apps/web/src/pages/shared/LoginPage.tsx` | `AuthPageTemplate` | ✅ 已迁移 | 登录（紫粉渐变 + 装饰圆形 + 顶部栏 + Card） |
| `apps/web/src/pages/shared/ForgotPasswordPage.tsx` | `AuthPageTemplate` | ✅ 已迁移 | 忘记密码（同 LoginPage 布局） |
| `apps/web/src/pages/shared/NotFoundPage.tsx` | `AuthPageTemplate` | ✅ 已迁移 | 404（浅灰背景 + 推荐模块入口） |
| `apps/web/src/pages/shared/ErrorPage.tsx` | `AuthPageTemplate` | ✅ 已迁移 | 错误页（浅灰背景 + 居中卡片） |

### 3.6 门户/协作类（2）

`IMPage` 已于 V268-B 迁移至 `ChatPageTemplate`（children 透传模式，内部 `ChatInterface` 组件保持完整聊天布局）。

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/srm/SupplierPortalPage.tsx` | `PortalPageTemplate` | 供应商门户 |
| `apps/web/src/pages/notification/NotificationCenter.tsx` | `NotificationTemplate` | 消息中心 |
| `apps/web/src/pages/shared/IMPage.tsx` | `ChatPageTemplate` | ✅ 已迁移（children 模式） |

### 3.7 GIS/地图类（0，已迁移 2 项）

V276 将 2 个 GIS 例外页面接入已有的 `GisMapTemplate`（V269 创建但未落地），实现 GIS 类例外清零（2→0）。数据转换策略：
- `DevicePoint[]` → `MapMarker[]`（position: [latitude, longitude]，type: 'device'，color 按 status 着色）
- `StorageLocation[]` → `MapMarker[]`（type: 'storage'，color: blue）
- `Pipeline[]` → `GeoFence[]`（type: 'rectangle'，coordinates: [start_point, end_point]）

| 页面路径 | 使用模板 | 状态 | 备注 |
|----------|----------|------|------|
| `apps/web/src/pages/bi/GisPage/index.tsx` | `GisMapTemplate` | ✅ 已迁移 | BI 地图 Tab，inline 渲染替代 MapSection 组件，onMarkerClick 回查原数据 |
| `apps/web/src/pages/gis/index.tsx` | `GisMapTemplate` | ✅ 已迁移 | GIS 模块入口，map Tab 内嵌 GisMapTemplate，markers + fences 数据转换 |

### 3.8 文档/邮件类（2）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/doc/DocumentsPage/index.tsx` | `DocumentTemplate` | 文档中心 |
| `apps/web/src/pages/im/MailPage/index.tsx` | `MailClientTemplate` | 邮件客户端 |

### 3.9 工具/系统类（3）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/performance/PerformanceTestPage.tsx` | `FormPageTemplate` / 保持定制 | 压测工具页 |
| `apps/web/src/pages/admin/SystemManagementPage.tsx` | `DashboardTemplate` / 保持定制 | 系统管理入口 |
| `apps/web/src/pages/plugin/PluginUploadPage.tsx` | `WizardPageTemplate` / 保持定制 | 插件上传向导（Stepper 分步表单） |

### 3.10 列表/结构类（4）

| 页面路径 | 建议后续模板 | 备注 |
|----------|--------------|------|
| `apps/web/src/pages/admin/DatabaseStructurePage.tsx` | `TreePageTemplate` | 数据库结构树 |
| `apps/web/src/pages/help/HelpCenterPage.tsx` | `CardListTemplate` | 帮助中心 |
| `apps/web/src/pages/shared/CommentsPage.tsx` | `ListPageTemplate` | 评论列表 |
| `apps/web/src/pages/lowcode/AppManagementPage.tsx` | `ListPageTemplate` | 应用管理 |

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
| 当前全站页面总数 | 530 |
| 已使用标准模板 | 511 (96.4%) |
| 例外项（本文档） | 19 (3.6%) |
| 目标覆盖率（不含例外） | 100% |

> 注：覆盖率计算以 `apps/web/src/pages/**/*.tsx` 为分母。非页面支持文件（constants.tsx、_shared/*.shared.tsx）已移出 `pages/` 或改为 `.ts`，不再计入。V267-B 迁移 10 个移动端页面至 `MobilePageTemplate` 后，覆盖率自 91.5%（486/531）提升至 93.4%（496/531）。V268-C 迁移 `MobileHomePage` 后，覆盖率提升至 93.6%（497/531）。V268-B 迁移 3 个聊天页面至 `ChatPageTemplate` 后，覆盖率提升至 94.2%（500/531）。V268-A 迁移 4 个认证/错误页至 `AuthPageTemplate` 后，覆盖率提升至 94.9%（504/531）。V269 迁移 4 个设计器页至 `DesignerTemplate` 后，覆盖率进一步提升至 95.7%（508/531）。V270 校准审计脚本（新增 mobile/auth/chat/designer 四类模板检测）并清理已移出 pages/ 的非页面文件后，数据修正为 95.8%（508/530），例外项 22 个。V273 迁移 3 个 AI 工具页至 `AiToolPageTemplate` 后，覆盖率提升至 96.4%（511/530），例外项 19 个。
