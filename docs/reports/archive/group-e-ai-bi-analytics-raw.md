# TOPEMS Group E 模块组全量 5 维实测评估（原始取证版）

> 范围：AI / BI / 数据分析(analytics) / 监控(monitor) / 搜索(search) / GIS 模块组
> 后端服务：svc/ai、svc/analytics、svc/monitor、svc/search、svc/gis
> 前端 API：apps/web/src/api/{ai,bi,report,monitor,search,gis}
> 前端模块：apps/web/src/modules/{ai,bi,report,monitor,gis}
> 评估日期：2026-09-09
> 方法：仓库内 grep/find/python 实测取证，所有数字附 file:line；无法取证处标注"未取证"。

---

## 0. 关键口径与链路事实（影响全篇评分）

| 项 | 事实 | 证据 |
|---|---|---|
| 服务→前缀映射 | svc/analytics 的 api_prefix 为 `/api/bi`（目录名 analytics，路由前缀 bi，端口 8060） | svc/analytics/src/main.rs:39-46 |
| 前端 client 映射 | `bi: /api/bi`、`analytics: /api/bi`（别名）、`ai: /api/ai`、`monitor: /api/monitor`、`gis: /api/gis`、`search: /api/search` | apps/web/src/config/runtime.ts:84-105 |
| report 前端归属 | `api/report/index.ts` 全部调用走 `apiClient.bi`（即 /api/bi，svc/analytics），**非独立后端** | apps/web/src/api/report/index.ts:7-9 |
| search 后端规模 | svc/search 仅注册 2 个唯一路径：`/`（业务搜索）与 `/health`，业务路由仅 1 个 | svc/search/src/main.rs:34-49 |
| 菜单模块 | modules/ 下无 search 目录；search 为全局搜索栏组件而非独立菜单模块 | apps/web/src/modules/（ls 实测无 search） |

---

## 1. 模块 × 5 维总览表

评分档位：✅ 完整 / 🟡 部分 / ❌ 缺口 / ⚪ 预埋悬空

| 模块 | ①前后端完整度 | ②前后端API对应 | ③菜单前后端覆盖 | ④设置合理性 | ⑤冗余判定 |
|---|---|---|---|---|---|
| **AI (svc/ai)** | 🟡 部分：后端 162 路由 vs 前端 142 调用，页面消费覆盖约 6 成；存在真实缺口（/conversations）与多处预埋 | 🟡 部分：/conversations 页面真实消费但后端无路由；/vector/* 单复数不匹配；/recommendations 后端无 | ✅ 完整：11 个菜单路由全部有页面，无指向缺失后端 | 🟡 部分：模型设置（/models、/models/{id}/config）前后端一致；/models/usage 后端返回硬编码全零 | 🔴 高：ai_form 孤儿模块未挂载；generated 客户端无消费；usage 假接口；/api/core/ai-form 死路由 |
| **BI (svc/analytics·bi)** | ✅ 完整：后端 154 路由 vs 前端 119 调用，页面消费 16 个，核心链路全覆盖 | ✅ 完整：analytics/rs/lims/qms/ehs/srm/pdm 模块概览、dashboard/widget/dataset/data-source/comparison/permission/sync 均有对应 | ✅ 完整：13 个菜单路由全部有页面（含 /bi/gis 复用 gis API） | ✅ 合理：权限设置走 /permissions/* 真实链路 | 🔴 高：与 report 双套报表重叠；/bi/gis 与 /gis/* 页面重复；analytics_compat 空桩；/summary 与 /analytics/summary 双路径注册 |
| **REPORT (svc/analytics·report)** | 🟡 部分：前端 31 调用全部有后端路由，但复用 /api/bi，与 bi 报表功能大面积重叠 | ✅ 完整：/reports、/templates、/schedules、/subscriptions 前后端一一对应 | ✅ 完整：9 个菜单路由全部有页面 | 🟡 部分：无独立设置页；模板/订阅配置走 /templates 等真实链路 | 🔴 高：与 bi/report.ts（/report 单数）功能重叠，双实现 |
| **MONITOR (svc/monitor)** | 🟡 部分：后端 49 路由 vs 前端 113 调用（含大量重复封装）；核心告警/规则/SLO/阈值链路完整 | 🟡 部分：/metrics/realtime 后端无路由；alerts 系列存在 GET/PUT 双注册（前端调用后端正） | ✅ 完整：7 个菜单路由全部有页面 | ❌ 不合理：设置页全部设置项为前端本地 useState，handleSave 无任何 API 持久化，queryFn 结果未使用 | 🔴 高：metrics.ts 三合一与 businessMetric/slo/ruleTyped 重复；businessMetric.ts、slo.ts、dashboard.ts 成死代码 |
| **SEARCH (svc/search)** | ❌ 缺口：后端仅 1 个业务路由；前端 2 方法中 1 个（/suggestions）后端无路由 | 🟡 部分：globalSearch（/）真实消费且对应；getSuggestions（/suggestions）预埋且后端缺失 | ✅ 完整：全局搜索栏消费 searchApi，无独立菜单（合理） | ➖ 无设置项 | 🟡 低：前端 /suggestions 预埋悬空；后端能力极简（非冗余，是欠实现） |
| **GIS (svc/gis)** | ✅ 完整：后端 65 路由 vs 前端 51 调用，页面消费 5 个 | ✅ 完整：map/device/fence/business/pipeline 主要路径全部对应 | ✅ 完整：4 个菜单路由全部有页面 | ➖ 无设置项 | 🟡 中：storage.ts（warehouse-locations/location-photos 11 方法）无页面消费；bi/GisPage 与独立 GIS 页面重复实现 |

---

## 2. 逐模块详细评估卡

### 2.1 AI 模块（svc/ai → /api/ai，端口 8013）

**① 前后端完整度**
- 后端唯一路径：**162** 个（svc/ai/src 全仓 .route( 解析；含 dsh 41、dify 11、qa 9、knowledge 9、documents 9、vectors 7、connectors 7、multimodal 7 等）
- 前端 API 调用：**142** 个（apps/web/src/api/ai/*.ts，15 个文件，排除测试与注释；另有 generated/client.ts 28 个未计入）
- 页面/组件消费：**14+ 个文件**（AiDashboardPage/AiChatPage/AiCodeAssistantPage/AiAssistantPage/AiKnowledgeBasePage/AiDocumentAnalysisPage/AiModelSettingsPage/BusinessCopilotPage/GovernanceDashboardPage/DifyChatPage + hooks useAiAssistant/useBusinessCopilot/useDshAgent/useGovernanceDashboard + 组件 AIAnalyzer/DocumentManager/DshAgentChatPanel）
- 结论：**部分**。核心链路（chat/assistant/code/document/knowledge/dashboard/models）有真实消费；但 recommendation、vector、conversations、usage 等大量封装悬空。

**② 前后端 API 对应**
| 前端调用 | 后端路由 | 判定 | 证据 |
|---|---|---|---|
| GET /conversations（chat.ts:34, AiChatPage:169 消费） | **无** | ❌ 真实缺口（页面消费，后端 404） | svc/ai 全仓 grep `"/conversations` 为空；chat.ts:32 注释自认"后端未提供 /conversations" |
| POST /conversations、/conversations/{id} 等 6 处 | 无 | ⚪ 预埋+缺口 | chat.ts:38-46、index.ts:69-90 |
| /vector/collections、/vector/index/{documentId} | 后端仅 /vectors/*（复数） | ⚪ 预埋+路径不匹配 | vector.ts:5 调用 vs routes.rs:232-240 |
| /recommendations、/recommendations/personalized、/recommendations/feedback | 后端仅 /recommend*（无 recommendations） | ⚪ 预埋+缺口 | recommendation.ts:3 调用 vs 后端提取列表 |
| /qa/*（10）、/code/*（5）、/documents/*（12）、/assistant/*（4）、/dsh/*（41 后端） | 均有 | ✅ | routes.rs 全文件 |
| /models、/models/{id}/config、/dashboard/stats、/prompts/* | 均有 | ✅ | routes.rs:151-197、161-189 |

**③ 菜单前后端覆盖**
- modules/ai/config.ts 定义 11 个路由（dashboard/chat/code/document/knowledge/prompts/settings/assistant/difyChat/businessCopilot/governanceDashboard），全部映射到存在的页面文件（config.ts:73-232 element 均为 lazyWithRetry import 真实页面），无指向缺失后端。✅

**④ 设置合理性**
- AiModelSettingsPage 调 aiApi.listModels / getModelConfig / updateModelConfig（AiModelSettingsPage.tsx:218、api/ai/index.ts:146-190），后端 /models、/models/{id}/config 存在（routes.rs:161-189）→ 前后端一致 ✅
- **异常**：`GET /models/usage` 后端 handler 返回硬编码全零（total_tokens:0, total_requests:0, total_cost:0.0, breakdown:[]）→ 假接口，无采集（svc/ai/src/handlers/model_admin_handlers.rs:378-395）❌
- `/dashboard/feature-usage` 有真实统计（count 自 ai.qa_history / ai.documents / ai.analysis_results / ai.vectors 四表），采集闭环存在于后端，但**前端 web 无消费**（AiDashboardPage 仅调 getDashboardStats，AiDashboardPage.tsx:358）→ 采集有后端无前端展示（mobile/analytics.ts:126 有方法但属 mobile 模块）

**⑤ 冗余发现**
1. **ai_form 孤儿模块**：svc/ai/src/modules/ai_form/service.rs 注册 10 个 `/api/core/ai-form/*` 路由，但 main.rs 路由树仅 merge agent 与 ai_knowledge（svc/ai/src/routes.rs:305、681），ai_form 未挂载 → 后端死代码
2. `/api/core/ai-form/*` 前端零消费（grep ai-form 于 apps/web/src 为空）
3. **generated 客户端**：api/ai/generated/client.ts 28 个方法，全仓无 import 消费（grep api/ai/generated 为空）→ 死代码
4. **recommendationApi（3 方法）**：无任何页面/组件消费（grep recommendationApi 为空）→ 预埋悬空
5. **vector.ts（5 方法）**：无页面消费（grep api/ai/vector 为空）→ 预埋悬空；且路径与后端单复数不一致
6. **usage 假接口**：/models/usage 返回全零（见 ④）
7. **difyApi 双实现风险**：前端 chat.ts 注释"@deprecated 无页面消费（DifyChatPage 走 difyApi）"（chat.ts:32）→ 旧 chat 会话链路废弃，新链路走 dify

---

### 2.2 BI 模块（svc/analytics → /api/bi，端口 8060；前端 api/bi）

**① 前后端完整度**
- 后端唯一路径：**154** 个（svc/analytics/src；dashboard 18、analytics 7、multidim 7、datasets 7、widget 7、visualization 7、permissions 6、rs 5 等）
- 前端 API 调用：**119** 个（apps/web/src/api/bi/*.ts，12 个文件）
- 页面消费：**16 个文件**（BIDashboardPage/BIAnalyticsPage/BIComparisonPage/BIDataSourcePage/DatasetPage/BIReportPage/BIVisualizationPage/ReportBuilderPage/BiPermissionPage/BiIndexPage/BIModuleDetailPage/DataAnalysisPage/GisPage + 权限组件 3 + hook useBiPermission）
- 结论：**完整**。核心链路全消费，与后端一一对应。

**② 前后端 API 对应**
- analytics 模块概览：前端 /summary、/development、/quality、/production、/laboratory、/overview、/{moduleId}（bi/analytics.ts）→ 后端 routes.rs:515-539 ✅
- 业务域概览：/rs/*、/lims/*、/qms/*、/ehs/*、/srm/*、/pdm/*（bi/analytics.ts 22 处）→ 后端 routes.rs:573-660 ✅
- dashboard（14 调用）、widget（7）、dataset（10）、dataSource（7）、comparison（7）、permission（11）、sync（6）、visualization（10）→ 后端均有对应路由 ✅
- **例外（预埋）**：bi/report.ts 的 /report/{reportId}/exports、/report/exports/{jobId}、/report/exports/{jobId}/download、/report/{reportId}/schedules、/report/schedules/{scheduleId}、run、toggle 共 **9 个方法**：后端 /report 仅注册 8 个（CRUD+query+export，routes.rs:321-345），无 exports/schedules 子路径 → ⚪ 预埋（同时无页面从 @/api/bi 导入这 9 个方法）

**③ 菜单前后端覆盖**
- modules/bi/config.ts 定义 13 个路由（dashboard/analytics/comparison/dataSource/dataset/report/visualization/reportBuilder/permission/index/moduleDetail/dataAnalysis/gis），全部映射真实页面（config.ts:76-232）✅
- 注意 `/bi/gis` → pages/bi/GisPage，复用 @/api/gis API（pages/bi/GisPage/index.tsx:24），与独立 GIS 模块页面重复（见 2.6⑤）

**④ 设置合理性**
- BiPermissionPage 走 /permissions/row-level、/permissions/data、/permissions/check（api/bi/permission.ts）→ 后端 row_level_permission 真实实现（routes.rs:497-505）✅
- 无独立 settings 页；无设置项前后端不一致问题。

**⑤ 冗余发现**
1. **analytics_compat 空桩**：svc/analytics/src/modules/analytics_compat.rs 为 OpenAPI-only 空函数桩（`#![allow(dead_code)]`，函数体为空），仅提供契约无实现 → 死代码
2. **/summary 与 /analytics/summary 双路径注册**：routes.rs:515-568 同一组 handler 注册 7 对路径（新路径 + v7.8 前兼容旧路径），注释明确为兼容遗留（routes.rs:511）→ 有意的重复注册，低危冗余
3. **与 report 双套报表重叠**（详见 2.3⑤）

---

### 2.3 REPORT 模块（复用 svc/analytics → /api/bi；前端 api/report）

**① 前后端完整度**
- 后端：modules/report 子模块注册 /reports、/reports/from-template、/reports/{id}、/reports/{id}/export、/reports/{id}/run、/schedules、/schedules/{id}/execute、/schedules/{id}/history、/subscriptions、/subscriptions/{id}/toggle、/subscriptions/user/{user_id}、/templates、/templates/{id}（svc/analytics/src/modules/report/{report,schedule,subscription,template}.rs）
- 前端 API 调用：**31** 个（apps/web/src/api/report/index.ts 单文件，全部走 apiClient.bi）
- 页面消费：**12 个文件**（ReportListPage/ReportDesignPage/ReportViewer/ReportSchedulePage/ReportSubscriptionPage/TemplateManagementPage/ReportPage/ReportBuilderPage/ReportBuilder + components 4）
- 结论：**部分**。前后端自洽，但整体是 bi 报表的平行第二套实现。

**② 前后端 API 对应**
| 前端路径（api/report/index.ts） | 后端 | 判定 |
|---|---|---|
| /reports、/reports/{id}、/reports/from-template、/reports/{id}/export、/reports/{id}/run | modules/report/report.rs:17-24 | ✅ |
| /templates、/templates/{id} | modules/report/template.rs:17-18 | ✅ |
| /schedules、/schedules/{id}、/schedules/{id}/execute、/schedules/{id}/history | modules/report/schedule.rs:19-27 | ✅ |
| /subscriptions、/subscriptions/user/{user_id}、/subscriptions/{id}、/subscriptions/{id}/toggle | modules/report/subscription.rs:18-29 | ✅ |
- 全部 31 调用有后端对应 ✅；前端无悬空方法。

**③ 菜单前后端覆盖**
- modules/report/config.ts 定义 9 个路由（dashboard/list/viewer/design/builder/schedule/subscription/template/report），全部映射真实页面（config.ts:37-146）✅

**④ 设置合理性**
- 无独立 settings 页；订阅/模板/调度配置走真实 /templates、/subscriptions、/schedules 链路 ✅

**⑤ 冗余发现**
1. **与 bi 报表双实现**：前端存在两套报表 API——`api/bi/report.ts`（单数 /report，8 个后端路由，被 BIReportPage/ReportBuilderPage/BiIndexPage 消费）与 `api/report/index.ts`（复数 /reports + schedules + subscriptions + templates，12 个 report 页面消费）。后端同样双实现：routes.rs:321-345（self_service_report）与 modules/report/（独立 report.rs/schedule.rs/subscription.rs/template.rs）。CRUD/导出/调度能力大面积重叠，功能边界不清晰 → **高优先级冗余**（建议合并报表能力）
2. report 前端通过 apiClient.bi 调用，服务名/目录名与后端模块名（svc/analytics、modules/report）三者不一致，理解成本高

---

### 2.4 MONITOR 模块（svc/monitor → /api/monitor，端口 8095）

**① 前后端完整度**
- 后端唯一路径：**49** 个（svc/monitor/src；rules 8、slos 7、alerts 7、performance 6、business-metrics 5、metrics 4 等）
- 前端 API 调用：**113** 个（apps/web/src/api/monitor/*.ts，14 个文件）
- 页面消费：**9 个文件**（MonitorDashboardPage/MonitorAlertsPage/MonitorAlertHistoryPage/MonitorAlertRulesPage/MonitorMetricsPage/MetricsDashboardPage/MonitorLogsPage/SLOStatusPage/MonitorSettingsPage）
- 结论：**部分**。核心链路（告警/规则/SLO/阈值/系统指标）完整；但封装大量重复，多个文件死代码。

**② 前后端 API 对应**
- /alerts、/alerts/{id}、/alerts/statistics、/alerts/acknowledge、/alerts/resolve、/alerts/{id}/history、/alerts/{id}/timeline → 后端 alerts.rs:253-260 ✅
- /rules 系列（enable/disable/advanced/routing/escalation/scheduled-trigger）→ 后端 routes.rs 全有 ✅
- /slos 系列（summary/budget/trend/violations/{id}/resolve）→ 后端 ✅
- /thresholds、/thresholds/evaluate → 后端 ✅
- /business-metrics 系列（summary/trend/kpi）→ 后端 ✅
- **例外**：`GET /metrics/realtime`（api/monitor/dashboard.ts）→ 后端 svc/monitor 无此路由（grep realtime 为空）→ ⚪ 预埋+缺口（该文件本身无页面消费）
- /performance/*（summary/trend/services/slow-queries/export）→ 后端有 ✅（但前端 dashboard.ts 无消费）

**③ 菜单前后端覆盖**
- modules/monitor/config.ts 定义 7 个路由（dashboard/alerts/alertHistory/rules/metrics/logs/settings），全部映射真实页面（config.ts:98-186）✅

**④ 设置合理性 ❌**
- MonitorSettingsPage（882 行）定义 generalSettings/alertSettings/notificationSettings/datasourceSettings 等 30+ 设置项，全部为 `useState` 本地默认值（MonitorSettingsPage.tsx:28-94）
- 唯一 API 调用 `monitorApi.threshold.list()` 的 queryFn 结果被解构丢弃（`const {} = useQuery`，MonitorSettingsPage.tsx:17-25），**无任何实际用途**
- handleSave 仅把表单数据写回本地 useState（MonitorSettingsPage.tsx:95-120+），**无任何持久化/后端提交** → 刷新即丢，设置项无实际作用、无后端存储表对应 → 设置项硬编码 + 假设置页

**⑤ 冗余发现**
1. **metrics.ts 三合一**：metricsApi（25 调用）同时封装 /business-metrics、/slos、/rules 三套 CRUD（metrics.ts:223-327），与 businessMetric.ts（9 调用）、slo.ts（10 调用）、ruleTyped.ts（11 调用）大面积重复
2. **businessMetric.ts 死代码**：businessMetricApi 仅被 monitor/index.ts re-export（index.ts:291），无任何页面 import 使用（grep 为空）→ 死代码
3. **slo.ts 死代码**：sloApi 无任何消费（grep 为空）；SLOStatusPage 实际用 metricsApi（SLOStatusPage.tsx:54）→ 死代码
4. **dashboard.ts 预埋**：dashboardApi（6 方法，含 /metrics/realtime）无页面消费（grep 为空）→ 预埋悬空 + /metrics/realtime 后端缺口
5. **alert.ts 与 alertBatch.ts 重复**：acknowledge/resolve/statistics/history/timeline 在两文件重复封装（alert.ts:10-11、alertBatch.ts:5 调用）
6. **ruleTyped/metricTyped 命名混乱**：monitorApi.ruleTyped/metrics 实际指向 ruleTypedApi/metricTypedApi（index.ts:283-284），与业务语义命名（rule/metric）不一致，且与 metrics.ts 的 /rules、/business-metrics 重复

---

### 2.5 SEARCH 模块（svc/search → /api/search，端口 8082）

**① 前后端完整度 ❌**
- 后端唯一路径：**2** 个（`/` + `/health`，svc/search/src/main.rs:34-49）；业务路由仅 1 个：`GET /`（search_handler，search:admin 权限，main.rs:44-49）
- 前端 API 调用：**2** 个（api/search/index.ts：globalSearch → `/?q=&limit=`、getSuggestions → `/suggestions`）
- 页面消费：无独立页面；**全局搜索栏真实消费** globalSearch（useGlobalSearch.ts:164 → searchApi.globalSearch）
- 结论：**缺口**。后端能力极简（单端点全文搜索），前端预埋的 suggestions 无后端支撑。

**② 前后端 API 对应**
| 前端调用 | 后端路由 | 判定 |
|---|---|---|
| GET `/?q=&limit=`（globalSearch） | GET `/`（search_handler） | ✅ 真实对应（useGlobalSearch.ts:164 消费） |
| GET `/suggestions`（getSuggestions） | **无**（suggestions 仅为搜索结果响应字段，handlers.rs:378-402；非独立端点） | ⚪ 预埋+缺口（无页面消费；GlobalSearchBar 的搜索建议是本地函数 getSearchSuggestions，SearchResultList.tsx:148） |

**③ 菜单前后端覆盖**
- modules/ 无 search 目录；全局搜索栏（components/GlobalSearchBar + hooks/useGlobalSearch）作为平台级入口消费 search API → 无菜单入口合理，无孤儿页 ✅

**④ 设置合理性**
- 无设置项。➖

**⑤ 冗余发现**
1. 前端 getSuggestions 预埋悬空 + 后端无 /suggestions 路由（双缺口）
2. 后端服务单路由承载全文搜索，与平台全局搜索需求（多服务聚合搜索）相比能力偏弱（非冗余，属欠实现）

---

### 2.6 GIS 模块（svc/gis → /api/gis，端口 8071）

**① 前后端完整度**
- 后端唯一路径：**65** 个（svc/gis/src；spatial 8、devices 7、locations 6、maps 5、geodata 5、pipelines 3、warehouse-locations 3、business-locations 3 等）
- 前端 API 调用：**51** 个（apps/web/src/api/gis/*.ts，6 个文件：map 14、storage 11、device 9、business 6、pipeline 6、fence 5）
- 页面消费：**5 个文件**（pages/gis：DashboardPage/index/GisTrackingPage/GisFencePage + hooks UseGisPage；另有 pages/bi/GisPage 复用 @/api/gis）
- 页面实际调用：gisApi.getStatistics（DashboardPage.tsx:32）、listMapMarkers（GisFencePage.tsx:138）、listDevicePoints/getDeviceTrack（GisTrackingPage.tsx:55,69）
- 结论：**完整**。核心地图/设备/围栏/追踪链路真实消费且与后端对应。

**② 前后端 API 对应**
- /statistics、/search、/geojson/export、/factory-maps、/device-locations、/pipelines（map.ts/device.ts/pipeline.ts）→ 后端 embedded.rs:60-93 ✅
- /devices、/devices/{device_code}/report、/devices/{id}/history、/devices/{id}/location、/devices/{id}/tracking（device.ts）→ 后端 ✅
- /fences、/fences/{id}（fence.ts，唯一被页面直连的 gis 子模块调用 gis.delete /fences/{id}）→ 后端 ✅
- /maps、/maps/{id}/layers、/map-markers、/business-locations、/spatial/* → 后端 ✅
- **例外**：storage.ts（warehouse-locations、location-photos 共 11 方法）→ 后端路由存在，但**无任何页面消费**（grep api/gis/storage 为空；gis/index.ts:8 re-export 但 gisApi.storage 无页面使用）→ ⚪ 预埋悬空

**③ 菜单前后端覆盖**
- modules/gis/config.ts 定义 4 个路由（dashboard/map/tracking/fence），全部映射真实页面（config.ts:30-69）✅

**④ 设置合理性**
- 无设置页。➖

**⑤ 冗余发现**
1. **bi/GisPage 与独立 GIS 模块重复**：/bi/gis（pages/bi/GisPage，复用 @/api/gis）与 /gis/*（pages/gis 独立实现）功能重叠，同一能力两套页面 → 中优先级冗余
2. **storage.ts 预埋悬空**：11 方法（warehouse-locations/location-photos）有后端有封装无消费
3. fence.ts 的 5 个方法中仅 delete 被页面直连，其余经 gisApi 中转，封装层次略冗余（低危）

---

## 3. 缺口 / 冗余清单（区分真实缺口 / 预埋 / 冗余）

### 3.1 真实缺口（页面真实消费但后端无路由 / 后端假实现）

| # | 缺口 | 消费方 | 证据 | 影响 |
|---|---|---|---|---|
| G1 | GET /api/ai/conversations 后端无路由 | AiChatPage.tsx:169 → aiApi.listConversations() | svc/ai 全仓无 `"/conversations` 路由；chat.ts:32 自认"后端未提供" | 会话列表页 404，功能不可用 |
| G2 | GET /api/ai/models/usage 后端返回硬编码全零 | 无页面消费（假接口） | model_admin_handlers.rs:378-395 返回 total_tokens:0 等 | 用量统计无意义，前端若接即拿到假数据 |
| G3 | GET /api/monitor/metrics/realtime 后端无路由 | api/monitor/dashboard.ts（该文件本身无页面消费） | svc/monitor grep realtime 为空 | 预埋级缺口，暂不影响线上 |

### 3.2 预埋悬空（有封装有类型，无任何页面 import 消费）

| # | 预埋项 | 方法数 | 后端状态 | 证据 |
|---|---|---|---|---|
| P1 | api/ai/recommendation.ts（recommendationApi） | 3 | 后端无 /recommendations | grep recommendationApi 消费为空 |
| P2 | api/ai/vector.ts（vectorApi） | 5 | 路径与后端 /vectors 单复数不匹配 | grep api/ai/vector 消费为空 |
| P3 | api/ai/chat.ts conversations 系列（除 listConversations 被 G1 消费） | 6 | 后端无 | chat.ts:38-46 |
| P4 | api/ai/index.ts getActivityTrend/getFeatureUsage/getUsageStats | 3 | 后端有（usage 为假实现） | AiDashboardPage 仅调 getDashboardStats |
| P5 | api/ai/generated/client.ts | 28 | — | 全仓无 import |
| P6 | api/bi/report.ts export/schedule 9 方法 | 9 | 后端 /report 无子路径 | 无页面从 @/api/bi 导入 |
| P7 | api/monitor/dashboard.ts（dashboardApi） | 6 | /metrics/realtime 缺失，其余有 | 无页面消费 |
| P8 | api/monitor/businessMetric.ts（businessMetricApi） | 9 | 后端有 | 无页面消费，与 metrics.ts 重复 |
| P9 | api/monitor/slo.ts（sloApi） | 10 | 后端有 | 无页面消费，与 metrics.ts 重复 |
| P10 | api/gis/storage.ts（storageApi） | 11 | 后端有 | 无页面消费 |
| P11 | api/search/index.ts getSuggestions | 1 | 后端无 /suggestions | 无页面消费 |

### 3.3 冗余（多套实现 / 重复注册 / 死代码）

| # | 冗余项 | 详情 | 证据 |
|---|---|---|---|
| R1 | bi 与 report 双套报表 | 前端 bi/report.ts（/report 单数）+ report/index.ts（/reports 复数）；后端 self_service_report（routes.rs:321-345）+ modules/report 五文件；CRUD/导出/调度重叠 | 见 2.2⑤/2.3⑤ |
| R2 | monitor metrics.ts 三合一 | metricsApi 同时封装 business-metrics+slos+rules，与三个独立文件重复；businessMetric.ts/slo.ts 因此成死代码 | metrics.ts:223-327 |
| R3 | analytics /summary 与 /analytics/summary 双路径 | 7 组 handler 双注册（兼容 v7.8 前路径） | routes.rs:511-568 |
| R4 | bi/GisPage 与 /gis/* 重复实现 | 同一 GIS 能力两套页面（API 共用 @/api/gis） | pages/bi/GisPage vs pages/gis |
| R5 | svc/ai ai_form 孤儿模块 | 10 个 /api/core/ai-form/* 路由未挂载（main 仅 merge agent/ai_knowledge） | routes.rs:305,681；modules/mod.rs:2 |
| R6 | svc/analytics analytics_compat 空桩 | OpenAPI-only 空函数（dead_code） | analytics_compat.rs 全文 |
| R7 | monitor alert.ts 与 alertBatch.ts 重复 | acknowledge/resolve/statistics/history/timeline 双封装 | alert.ts vs alertBatch.ts |
| R8 | ai /api/core/ai-form 死路由 | 前端零消费（前端实际走 /api/ai/dsh/smart-forms） | businessIntelligence.ts:248 vs ai_form/service.rs:13 |

---

## 4. 结论摘要

1. **最严重真实缺口**：AI 聊天页（AiChatPage）消费的 `/api/ai/conversations` 后端无路由，会话列表功能实际不可用（G1）。
2. **最严重冗余**：BI 与 REPORT 双套报表（R1）前后端各两套实现；MONITOR 的 metrics.ts 三合一导致 businessMetric/slo 死代码（R2）。
3. **设置项问题**：MONITOR 设置页为纯前端假设置（30+ 项本地 state、无持久化、queryFn 结果丢弃），是 6 模块中唯一明确的设置一致性违规（④❌）。
4. **AI usage 采集闭环**：后端 feature-usage 有真实表计数采集，但 web 前端无消费；/models/usage 为全零假接口，闭环未完成。
5. **search 服务欠实现**：单业务路由承载全局搜索，前端 /suggestions 预埋无后端支撑。

---

## 附：取证命令清单（可复现）

```bash
# 后端路由
grep -rn "\.route(" svc/ai/src svc/analytics/src svc/monitor/src svc/search/src svc/gis/src --include="*.rs"
# 前端调用（含泛型）
grep -rn "apiClient\." apps/web/src/api/{ai,bi,report,monitor,search,gis} --include="*.ts"
# 页面消费
grep -rln "from '@\/api\/ai\|from '@\/api\/bi\|from '@\/api\/report\|from '@\/api\/monitor\|from '@\/api\/gis\|from '@\/api\/search" apps/web/src/pages apps/web/src/modules
# 菜单
grep -nE "path:|element:" apps/web/src/modules/{ai,bi,report,monitor,gis}/config.ts
# 设置
grep -n "handleSave\|useState\|useQuery" apps/web/src/pages/monitor/MonitorSettingsPage.tsx
```

> 注：后端路由数为**唯一路径**（脚本解析 .route("...") 去重）；前端方法数为**apiClient 调用行数**（排除测试与注释行）。部分模板字符串路径（如 `${moduleId}`）无法静态展开，按前缀计入。
