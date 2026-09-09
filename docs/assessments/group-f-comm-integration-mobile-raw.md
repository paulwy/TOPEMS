# TOPEMS 通信/集成/移动/插件/工单/OA 模块组 全量 5 维度实测评估

- 评估日期：2026-09-09
- 评估范围：后端 svc/communication、svc/integration、svc/mobile、svc/plugin-registry、svc/ticket；前端 apps/web/src/api/{im,notification,mail,integration,external-erp,mobile,plugin,ticket}；前端 apps/web/src/modules/{im,notification,integration,mobile,plugin,ticket,oa}
- 评估口径：全部数字来自仓库内 grep/find 实测取证（附 file:line），无编造。无法取证处标注"未取证"。
- 路由计数口径：以 `.route(` 注册次数计（含多行写法）；路径前缀取各服务 `api_prefix`（apps/web/src/config/runtime.ts:74-115 的 client base 与之一致）。

---

## 0. 服务挂载前缀（取证基线）

| 服务 | api_prefix | legacy_prefixes | 证据 |
|---|---|---|---|
| communication | /api/communication | /api/core/comm, /api/core/notification | svc/communication/src/main.rs:26-27 |
| integration | /api/integration | /api/v1/integration | svc/integration/src/main.rs:40-41 |
| mobile | /api/mobile | /api/v1/mobile, /api/core/mobile/v1 | svc/mobile/src/main.rs:120-121 |
| plugin-registry | /api | （无） | svc/plugin-registry/src/main.rs:39-40 |
| ticket | /api/ticket | /api/v1/ticket | svc/ticket/src/main.rs:30-31 |

前端 client base：im=/api/communication/im、notification=/api/communication/notification、mail=/api/communication/mail、mobile=/api/mobile、integration=/api/integration、ticket=/api/ticket（apps/web/src/config/runtime.ts:74-115）。

---

## 1. 模块 × 5 维总览表

| 模块 | 后端路由数 | 前端API方法数 | ①前后端完整度 | ②API对应 | ③菜单前后端覆盖 | ④设置合理性 | ⑤冗余判定 |
|---|---|---|---|---|---|---|---|
| communication（im/notification/mail） | 86（main.rs 78 + im_location.rs 8 死代码） | im 36 / notification 210 / mail 15 | 部分：notification/mail 有真实消费但有缺口；im 全量预埋悬空 | 部分：im 路径/方法大面积错位；notification 扩展 API 约 120+ 调用无后端；mail 3 个消费方法无后端 | 部分：im 菜单仅 dashboard+mail，无聊天主体入口；notification 8 菜单全有页面 | 差：settings 页调 listChannels() 后端不存在；preference/pushConfig 全部无后端 | 高：im_location.rs 死代码路由 8 条；notification 两套设置 API 重叠；im/mail API 双套封装；mail 三套对象 |
| integration | 54 | integration 44 / external-erp 57 | 部分：sync 类真实消费；connections/mappings/external-erp 消费但后端无路由 | 差：/erp/connections、/erp/mappings、/endpoints、/external-erp/*、/conversion-rules 均无后端对应 | 部分：9 菜单路由，connections/mappings 页消费空后端或 mock | 差：settings 页无 API 调用（纯静态）；mappings 页硬编码 mock | 高：connection.ts/mapping.ts 自标 @deprecated；plugin.rs create_routes() 死代码；mappings 双实现 |
| mobile | 91（89 main.rs + 2 mobile_plugin） | mobile 312（26 文件） | 部分：消费的 API 大多有后端；但 oa.ts 21 方法全无后端（被 OA 页真实消费） | 部分：approvalEnhanced 20 方法约 18 个无后端；oa.ts 全量无后端；其余消费方法基本有后端 | 完整：12 菜单路由均有页面且后端有对应；approvals 菜单后端仅有读 | 部分：user/settings、push/config 真实；mobile NotificationSettings 纯 localStorage 无后端 | 中：approval.ts 与 approvalEnhanced.ts 双套；/api/plugins/* 三服务重复 |
| plugin-registry | 63 | plugin 0 apiClient（独立 axios，10+ 方法） | 部分：页面真实消费 marketplace，但前端 base 与后端前缀错位 | 差：前缀混乱（/api/core/plugin vs /api/plugin vs /api/plugins/*）；traefik 仅路由 /api/plugin | 完整：4 菜单路由有页面；后端 dev/upgrade/runtime 大量无前端（孤儿） | 无设置页/配置接口（navigation-config 只读） | 高：/api/plugins/info 三服务重复；自身 /health 与 /api/plugin/health 双注册；unified-core 插件路由注释残留 |
| ticket | 37 | ticket 83（8 文件） | 部分：2 个消费页面的方法全部有后端；大量预埋 API 无消费 | 部分：预埋路径大量无后端（dashboard/*、export、search、sla-policies/*、workflows/* 等）；消费路径均对应 | 完整：dashboard/center 2 菜单有页面有后端；后端 feedback 路由无前端入口（孤儿） | 无 settings 页（未取证 settings 相关接口） | 中：feedback_compat 并入 ticket 但前端无消费（旧链路残留）；knowledge-articles 后端有、前端无 API |
| oa（无独立后端） | 0（无 oa 服务） | oa 21（mobile/oa.ts）+ erp/core 若干 | 缺口：meetings 页消费 oaApi 全部无后端；announcements/vehicles/documents 依赖 erp/core | 差：mobile/oa.ts 头注释声称后端存在，实测 svc/mobile 无对应路由 | 完整：5 菜单路由有页面；后端支撑分散 | 无设置 | 中：OA 能力分散 mobile/oa.ts 与 erp/core；oa.ts 全量预埋但被 1 页消费 |

---

## 2. 逐模块详细评估卡

### 2.1 communication（svc/communication：im / notification / mail）

#### 后端路由数 + 证据
- `.route(` 注册总数：**86**
  - src/main.rs:45-234 实际生效路由 **78** 条（notification 30、im 34、mail 10、/health 1 另计 public）
  - src/im_location.rs:758-782 **8** 条为 `#[allow(dead_code)] pub fn create_location_routes()`（main.rs:754-755），从未被挂载 → 死代码
- 路由分组证据：
  - notification：main.rs:45-151（/notify/list、/notification/notifications 系列、/notification/notification-templates 系列）
  - im：main.rs:155-219（/im/rooms、/im/contacts、/im/contact-groups、/im/project-groups、/im/online-status、/im/notifications/{user_id}、/im/locations/*、/im/pois/search）
  - mail：main.rs:223-234（/mail/emails、/mail/templates、/mail/emails/{id}/read、/mail/templates/{id}/send）

#### 前端 API 方法数 + 证据
- api/im/index.ts：**36 个导出方法 / 37 次 apiClient 调用**（imApi 对象，api/im/index.ts:133-307）
- api/notification/：**210 次 apiClient 调用**（14 文件；index 24、im.ts 30、group.ts 19、digest.ts 18、channel.ts 15、batch.ts 15、preference.ts 14、subscription.ts 13、pushConfig.ts 13、template.ts 12、webhook.ts 11、mail.ts 10、delivery.ts 10、config.ts 6）
  - 注：im.ts（30 调用，用 apiClient.im）与 mail.ts（10 调用，用 apiClient.mail）是 IM/邮件 API 的第二套重复封装，非 notification 自有后端；真正悬空集中在 preference/pushConfig/channel/group/subscription/digest/delivery/webhook/template 扩展（约 120+ 调用）
- api/mail/index.ts：**15 次 apiClient 调用**（emailApi 7、templateApi 7、mailApi 1，index.ts:84-173）

#### 页面消费清单
- im：**0 个真实页面**，仅 pages/__tests__/ImModule.test.tsx 引用 imApi → **预埋悬空**
  - pages/im/ 仅有 MailPage/（消费 mail）与 DashboardPage.tsx（无任何 API import，pages/im/DashboardPage.tsx:1-5）
- notification：7 页消费（pages/notification/NotificationSettingsPage、NotificationCenter、NotificationDetailPage、NotificationListPage、NotificationTemplatesPage、NotificationArchivePage、NotificationStatsPage）；消费方法仅 4 个：markUnread、markRead、listChannels、get（grep 实测）
- mail：pages/im/MailPage/* 12 处 import '@/api/mail'（多为类型/常量）；真实 API 调用在 components/im/MailPageHooks.tsx:87-482（emailApi.getStats/list/send/sendWithTemplate/delete/get/resend）

#### 菜单覆盖
- modules/im/config.ts：仅 dashboard + mail 2 条路由（config.ts:23-36、83-96）→ **IM 菜单无聊天主体入口**，聊天 API 全量无页面
- modules/notification/config.ts：8 条路由（dashboard/list/archive/detail/center/templates/statistics/settings，config.ts:55-167），页面全部存在 ✓
- 孤儿后端：/im/locations/*、/im/pois/search（8 路由）无任何前端 API/菜单对应

#### 设置项检查
- pages/notification/NotificationSettingsPage.tsx:18 调用 `notificationApi.listChannels()` → /notification/channels，**后端无此路由**（实测 svc/communication 全仓无 channels 路由）→ 设置页拉取必然失败
- api/notification/preference.ts:79-159（14 调用）全部指向 /notification/preferences/*，**后端全仓无**（grep svc/* 无命中）
- api/notification/pushConfig.ts:114-172（13 调用）全部指向 /push-config/*，**后端全仓无**（仅 svc/mobile 有 /push/config，路径不同）
- api/notification/channel.ts:1-17 头注释声称"后端: svc/communication/src/notification.rs 路由 GET /notification/channels…"，**与实测不符**（文档误导）

#### 冗余发现
- im_location.rs:755 `create_location_routes()` 死代码（8 条路由与 main.rs:171-218 内联注册完全重复）
- notification preference.ts 与 pushConfig.ts 功能重叠（quiet-hours/global-mute 两套实现，preference.ts:130-149 vs pushConfig.ts:165-172）
- api/mail/index.ts 同时导出 emailApi / templateApi / mailApi 三套对象，且 emailApi 与 templateApi 的 list/get/delete 签名重复
- 后端 mail 有 /mail/templates/{id}/send（main.rs:233），前端不用，前端改用不存在的 /emails/send-with-template → 双向错位

---

### 2.2 integration（svc/integration）

#### 后端路由数 + 证据
- `.route(` 注册总数：**54**（src/routes.rs:26-128 主体 + plugin.rs:98-99）
- 公开：/、/health、/api/plugins/info、/api/plugins/health（routes.rs:26-29）
- 受保护：/stats、/events、/lims-qms、/mes-erp、/mes-erp/sync/*、/mes-erp/{id}/retry|logs|records、/wms-scm、/sync/tasks|pending|statistics|retry-failed|trigger/*、/mes-qms、/rules（conversion）、（routes.rs:45-128）
- 注意：/api/plugins/info 与 /api/plugins/health 在 routes.rs:28-29 直接注册 handler，而 plugin.rs:98-99 `create_routes()` 又定义同 2 条路由 → 后者未被 merge（grep 无调用点）→ 死代码

#### 前端 API 方法数 + 证据
- api/integration/：**44 次 apiClient 调用**（6 文件）
- api/external-erp/：**57 次 apiClient 调用**（8 文件，全部走 apiClient.integration base）

#### 页面消费清单
- pages/integration/IntegrationMesErpPage、IntegrationWmsScmPage、IntegrationLimsQmsPage（消费 syncApi → 后端 ✓）
- pages/integration/IntegrationConnectionsPage.tsx:131 消费 `integrationApi.connections.listConnections()` → /erp/connections，**后端无此路由**
- pages/integration/IntegrationMappingsPage.tsx:196 消费 `integrationApi.mappings.listMappings()`，但 CrudPage adapter 在 :285 直接返回 `MOCK_MAPPINGS`（mock 回退，未真正请求后端）
- pages/integration/IntegrationExternalErpOverviewPage 经 hooks/useExternalErp.ts:25 消费 `externalErpApi.getConnections()` → /external-erp/connections，**后端无此路由**

#### 菜单覆盖
- modules/integration/config.ts：9 条路由（dashboard/connections/mappings/events/erpOverview/limsQms/mesErp/wmsScm/settings，config.ts:65-193）
- connections 菜单 → 消费空后端（真实缺口）；mappings 菜单 → mock 页面；settings 菜单 → 静态页

#### 设置项检查
- pages/integration/IntegrationSettingsPage.tsx：**0 次 apiClient/integrationApi 调用**（grep 无命中），表单默认值硬编码（erp.example.com 等，IntegrationSettingsPage.tsx:49-67），保存无后端 → 设置项无实际作用

#### 冗余发现
- api/integration/connection.ts:1、mapping.ts:1 均自标注 `@deprecated 无页面消费（预埋），后端 integration 服务未提供对应路由`，但 ConnectionsPage/MappingsPage 仍在引用（标注与事实矛盾）
- src/plugin.rs:98-99 create_routes() 死代码（与 routes.rs:28-29 重复）
- pages/integration/IntegrationMappingsPage.tsx:45-71 MOCK_MAPPINGS 硬编码 + :285 mock 回退，与真实 API 双实现
- /api/plugins/info、/api/plugins/health 与 svc/mobile/mobile_plugin.rs:150-151、svc/plugin-registry 的 /api/plugin/health 三处重复

---

### 2.3 mobile（svc/mobile）

#### 后端路由数 + 证据
- `.route(` 注册总数：**91**（main.rs 89 + mobile_plugin.rs 2）
- main.rs:272-537 主要路由：/approvals(6)、/attendance(5)、/offline(11)、/push(8)、/media(4)、/photos(5)、/inventory(6)、/quality(4)、/production(4)、/scan(4)、/stats(3)、/user(3)、/barcode(3)、/devices(2)、/shortcuts、/mobile-tasks(3)、/inspection、/analytics、/workbench、/patrol-records、/health 等
- 审批后端覆盖：GET /approvals、/approvals/pending、/approvals/history、/approvals/{id}、POST /approvals/{id}/approve|reject|delegate（main.rs:283-302）→ **审批只有"读+单条动作"，无创建、无模板、无批量**

#### 前端 API 方法数 + 证据
- api/mobile/：**312 次 apiClient 调用**（26 文件；index 29、oa.ts 21、approvalEnhanced.ts 20、gis 19、report 17、bpm 15、aiAssistant 15、inventory 14、document/customer 13、production 12、supplier/media/attendance 11、project/offline/employee 10、quality/push/inspection 9、workflow/approval 7、analytics 6、shortcut/device 5、user 4）

#### 页面消费清单（16+ 文件，实测消费方法均映射）
- MobileHomePage / MobileTaskListPage / MobileScanPage / MobileAttendancePage / MobileSettingsPage / PushNotificationPage / MobileProductionCard / AttendanceRecordsTab / AttendanceClockTab / AttendanceLeaveTab / LeaveApplicationDialog / MobileQualityDefectList / MobileProductionReportDialog / MobileProductionActions 等
- pages/oa/MeetingManagementPage.tsx:9 消费 oaApi（mobile/oa.ts）→ **后端无任何对应路由**
- 消费方法实测：listLeaveApplications、listAttendanceRecords、getAttendanceStats、checkIn/checkOut、applyLeave、user.getSettings、getPushConfig/updatePushConfig、listPushTemplates、updatePushTemplate、listMobileTasks、inspection.listTasks、analytics.getUsageStats —— 与后端一一对应 ✓

#### 菜单覆盖
- modules/mobile/config.ts：12 条路由（home/workbench/attendance/tasks/approvals/inventory/quality/production/scan/notifications/profile/settings，config.ts:84-236），均有页面，后端均有支撑（approvals 后端仅有读+单条动作，勉强覆盖）

#### 设置项检查
- pages/mobile/MobileSettingsPage.tsx:57 `mobileApi.user.getSettings()` → /user/settings ✓ 有后端
- push 设置：getPushConfig/updatePushConfig → /push/config ✓ 有后端
- pages/mobile/NotificationSettingsPage.tsx:70-77 **纯 localStorage**（'notification_settings'）读写，默认值硬编码（:55-64），**无任何后端接口** → 设置项无后端持久化、无实际作用

#### 冗余发现
- api/mobile/approval.ts（8 方法，approval.ts:47-94）与 approvalEnhanced.ts（20 方法，approvalEnhanced.ts:153-214+）双套审批 API；approvalEnhanced 的 templates/history/approvers/cc/batch/delegations/my-approvals/my-requests/stats **约 18 个方法后端无路由**（预埋）
- oa.ts 21 方法（meetings/calendar/tasks/announcements/oa/stats）后端全无（svc/mobile 无 /meetings、/calendar、/announcements、/oa；tasks 仅 /mobile-tasks 前缀不同）→ 全量预埋 + 1 页真实消费 = 真实缺口
- /api/plugins/info、/api/plugins/health 在 mobile（mobile_plugin.rs:150-151，main.rs:273 merge）与 integration、plugin-registry 重复

---

### 2.4 plugin-registry（svc/plugin-registry）

#### 后端路由数 + 证据
- `.route(` 注册总数：**63**（main.rs 8 + src/modules/plugin/mod.rs 55+）
- 公开：/、/health、/api/plugin/health、/metrics、/dev/runtime/{code}/register（main.rs:65-96）
- 受保护：/plugin/marketplace*、/plugin/plugins/{code}*、/plugin/runtime/*、/plugin/tenant/*、/plugin/dev/*、/plugin/upgrade/*、/plugin/reviews/*、/plugins/*（mod.rs:28-297）
- **后端自身前缀混乱**：/plugin/* 与 /plugins/* 混用（/plugins/my mod.rs:93、/plugins/installed :265、/plugins/{plugin_code}/install :277…）

#### 前端 API 方法数 + 证据
- api/plugin/：**0 次 apiClient 调用**——独立 pluginAxios（plugin/marketplace.ts:17-19），方法：marketplace.ts 6（getSummary/getCategories/listPlugins/getPlugin/getVersions/getReviews/submitReview）+ plugin.ts 9（listMarketplace/listInstalled/getDetails/install/uninstall/enable/disable/upgrade/getUpgradeHistory）+ registry.ts（静态 SUITES/PLUGIN_REGISTRY）
- **base 分裂**：marketplace.ts:14 `MARKETPLACE_API='/api/core/plugin/marketplace'`（旧前缀）、plugin.ts:12 `API_BASE='/api/plugin'`（新前缀）
- moduleMapping.ts:231 plugin apiBasePath='/api/core/plugin'（旧）；pluginManager.ts:542-544 仍调 /api/core/plugin/navigation-config（旧）

#### 页面消费清单
- pages/plugin/ 15+ 文件消费 '@/api/plugin'（PluginMarketplacePage、PluginDetailPage、PluginDetailDialog、PluginReviewsTab 等）
- 页面消费方法：getPlugin、getPluginVersions、getPluginReviews、submitPluginReview、getSummary/listPlugins 等（PluginDetailPage.tsx:69-97）→ 走 marketplace.ts 旧 base `/api/core/plugin/*`

#### 菜单覆盖
- modules/plugin/config.ts：4 条路由（dashboard/marketplace/upload/detail，config.ts:35-79），页面齐全
- 孤儿后端：/plugin/dev/*（上传/发布）、/plugin/upgrade/*、/plugin/runtime/*、/plugins/installed、/plugin/upgrade/queue 等大量路由前端无对应 API（前端仅 marketplace+管理 15 方法）

#### 设置项检查
- 无 plugin settings 页；后端无 config 写接口（navigation-config 为只读 GET，mod.rs:72）

#### 冗余发现
- **前缀错位链**：前端旧 base /api/core/plugin（marketplace.ts:14）→ moduleMapping service 'unified-core'（moduleMapping.ts:231）→ unified-core 插件路由**已全部注释**（svc/unified-core/src/routes/mod.rs:119,142,146,150 `//`）→ traefik 只路由 PathPrefix(/api/plugin) → svc-plugin（deploy/docker/traefik/dynamic.yml:306-310）→ **页面消费即 404**（真实缺口）
- 插件健康/信息端点三处实现：integration plugin.rs:98-99、mobile mobile_plugin.rs:150-151、plugin-registry main.rs:88（/api/plugin/health）
- plugin-registry 自身 /health 与 /api/plugin/health 双注册（main.rs:87-88）
- 前端 plugin/index.ts 同时导出 getMarketplaceSummary 等函数 + pluginApiAggregated 聚合对象 + marketplaceApi/pluginApi 对象（多重导出冗余，plugin/index.ts:14-40）

---

### 2.5 ticket（svc/ticket）

#### 后端路由数 + 证据
- `.route(` 注册总数：**37**（handlers.rs:1519-1567、ticket_ext.rs:35-73、feedback_compat.rs:328-330、main.rs:53-56）
- 主体：/tickets、/tickets/stats、/tickets/sla-stats、/tickets/{id}、/tickets/{id}/comments、/tickets/{id}/activities、/tickets/{id}/sla、/sla-policies、/automation-rules、/knowledge-articles（handlers.rs:1519-1567）
- 扩展：/workflows、/tickets/{id}/transitions|transition|tags、/ticket-tags、/tickets/batch-*、/tickets/{id}/attachments*（ticket_ext.rs:35-73）
- 兼容：/feedbacks、/feedbacks/{id}（feedback_compat.rs:328-330，main.rs:62 merge）

#### 前端 API 方法数 + 证据
- api/ticket/：**83 次 apiClient 调用**（8 文件：attachment/batch/comment/dashboard/index/sla/types/workflow）

#### 页面消费清单（2 页，消费方法全部有后端 ✓）
- pages/ticket/DashboardPage.tsx:14 `ticketApi.getStats()` → /tickets/stats ✓
- pages/ticket/TicketCenterPage.tsx:61-408 listTickets/createTicket/updateTicket/getComments/getTicketSla/addComment/getStats → 对应 /tickets、/tickets/{id}、/tickets/{id}/comments、/tickets/{id}/sla ✓

#### 菜单覆盖
- modules/ticket/config.ts：2 条路由（dashboard/center，config.ts:21-34），页面存在 ✓
- 孤儿后端：/knowledge-articles（handlers.rs:1560-1567）前端无任何 ticket API 对应；/feedbacks 前端无消费（feedback 已归并 ticket 但前端未建 API）

#### 设置项检查
- ticket 无 settings 页/配置 API（未取证到 settings/config 接口）

#### 冗余发现
- feedback_compat.rs 并入 ticket（main.rs:62）但前端无 feedback API/页面 → 旧链路残留（仅兼容存量）
- 预埋悬空路径清单（前端有、后端无）：/tickets/dashboard/*（9 条，dashboard.ts）、/tickets/export、/tickets/my、/tickets/search、/sla-policies/default、/sla-policies/match、/workflows/{id}、/workflows/{workflowId}/transitions、/workflows/automation-rules（后端在顶层 /automation-rules）、/workflows/match、/tickets/{id}/assign|close|resolve、/tickets/{ticketId}/activities/{activityId}、/activities/timeline、/sla/calculate、/sla/escalations
- 后端 /automation-rules 与前端 /workflows/automation-rules 路径不一致（双向可用但语义漂移）

---

### 2.6 oa（无独立后端服务）

#### 前端结构
- modules/oa/config.ts：5 条路由（dashboard/documents/announcements/meetings/vehicles，config.ts:40-95），页面 5 个
- API 来源分散：oaApi（api/mobile/oa.ts，21 方法）、vehicleApi/announcementApi/documentApi（api/erp/core）

#### 消费与后端对照
- pages/oa/MeetingManagementPage.tsx:9 消费 oaApi → apiClient.mobile.get('meetings'|'calendar/events'|'tasks'|'announcements'|'oa/stats')（oa.ts:167-267）→ **svc/mobile 无任何对应路由**（grep 实测：无 /meetings、/calendar、/announcements、/oa）→ 真实缺口
- pages/oa/VehicleManagementPage.tsx:6、AnnouncementPage.tsx:7、DocumentManagementPage.tsx:6 消费 erp/core（本组不展开，但可见 OA 功能无统一后端归属）

#### 冗余发现
- oa.ts:1-26 头注释声明的后端路由与实测完全不符（文档与实现漂移）
- OA 会议/任务/公告能力在 mobile/oa.ts 与 erp/core 之间分散，无单一归属

---

## 3. 缺口 / 冗余清单

### 3.1 真实缺口（页面消费了但后端无路由）

| # | 模块 | 前端调用 | 目标路径 | 消费页 | 证据 |
|---|---|---|---|---|---|
| G1 | notification | notificationApi.listChannels() | /notification/channels | NotificationSettingsPage.tsx:18 | 后端全仓无此路由 |
| G2 | mail | emailApi.getStats() | /emails/stats | MailPageHooks.tsx:87 | 后端 mail 无 stats |
| G3 | mail | emailApi.sendWithTemplate() | /emails/send-with-template | MailPageHooks.tsx:211 | 后端为 /mail/templates/{id}/send |
| G4 | mail | emailApi.resend() | /emails/resend | MailPageHooks.tsx:482 | 后端无 |
| G5 | integration | integrationApi.connections.* | /erp/connections* | IntegrationConnectionsPage.tsx:131 | routes.rs 无 erp/connections |
| G6 | integration | integrationApi.mappings.* | /erp/mappings* | IntegrationMappingsPage.tsx:196（mock 回退掩盖） | routes.rs 无 erp/mappings |
| G7 | integration/external-erp | externalErpApi.* | /external-erp/*（13 路径） | IntegrationExternalErpOverviewPage（hooks/useExternalErp.ts:25） | integration 服务无 /external-erp 路由 |
| G8 | mobile/oa | oaApi.*（21 方法） | /meetings、/calendar/*、/tasks、/announcements、/oa/stats | pages/oa/MeetingManagementPage.tsx:9 | svc/mobile 无对应路由 |
| G9 | plugin | marketplaceApi.getPlugin 等 | /api/core/plugin/* | PluginDetailPage.tsx:69-97 等 | plugin-registry 前缀 /api/plugin；unified-core 插件路由已注释；traefik 只路由 /api/plugin |
| G10 | plugin | pluginManager | /api/core/plugin/navigation-config | pluginManager.ts:542-544 | 后端为 /plugin/navigation-config |

### 3.2 预埋悬空（有封装/类型/文档，但 0 页面消费；含消费为 0 的整目录）

| # | 模块 | 内容 | 证据 |
|---|---|---|---|
| P1 | im | imApi 全部 36 方法（仅测试文件消费） | pages/__tests__/ImModule.test.tsx；pages/im 无聊天页 |
| P2 | notification | preference.ts 14、pushConfig.ts 13、channel.ts 15、group.ts 19、subscription.ts 13、digest.ts 18、delivery.ts 10、webhook.ts 11、template.ts 扩展 7（render/test/versions/clone/variables/status/batch-status）等扩展 API 全量无后端（约 120+ 调用） | grep svc/communication 无对应路由 |
| P3 | integration | connection.ts、mapping.ts（自标 @deprecated）；integrationApi.listEndpoints() → /endpoints | connection.ts:1、mapping.ts:1 |
| P4 | mobile | approvalEnhanced.ts 约 18 方法（templates/history/approvers/cc/batch/delegations/my-*/stats） | 后端无对应路由；无页面消费 |
| P5 | mobile | oa.ts 中除被 OA 页消费外的剩余方法 | oa.ts:167-267 |
| P6 | ticket | dashboard/*（9）、export、my、search、sla-policies/default|match、workflows/{id}、workflows/*/transitions、workflows/automation-rules、workflows/match、activities/{id}|timeline、sla/calculate|escalations、tickets/{id}/assign|close|resolve | api/ticket/*.ts 路径 vs 后端 |
| P7 | plugin | upgrade/dev/runtime 相关后端路由无前端 API | plugin-registry mod.rs:137-233 vs api/plugin |

### 3.3 冗余 / 死代码 / 死链路

| # | 位置 | 问题 | 证据 |
|---|---|---|---|
| R1 | svc/communication/src/im_location.rs:755 | create_location_routes() 死代码，8 条路由与 main.rs 重复注册 | `#[allow(dead_code)]` + 无调用点 |
| R2 | svc/integration/src/plugin.rs:98-99 | create_routes() 死代码，/api/plugins/info+health 与 routes.rs:28-29 重复 | 无 merge 调用点 |
| R3 | svc/mobile、svc/integration、svc/plugin-registry | /api/plugins/info、/api/plugins/health 三处实现重复 | mobile_plugin.rs:150-151、plugin.rs:98-99、main.rs:88 |
| R4 | svc/plugin-registry/src/main.rs:87-88 | /health 与 /api/plugin/health 双注册同一 handler | main.rs:87-88 |
| R5 | svc/unified-core/src/routes/mod.rs:119-150 | 插件路由注释残留（迁移 plugin-registry 后未清理） | `// "/plugin/..."` 4 处 |
| R6 | api/notification preference.ts vs pushConfig.ts | quiet-hours/global-mute 两套重叠实现 | preference.ts:130-149、pushConfig.ts:165-172 |
| R7 | api/notification/im.ts（30 调用）vs api/im/index.ts（37 调用） | **IM API 双套封装**：notification 目录内再封装一套 im 客户端 | im.ts:153+ 用 apiClient.im、im/index.ts:133+ |
| R8 | api/notification/mail.ts（10 调用）vs api/mail/index.ts（15 调用） | **邮件 API 双套封装** | mail.ts:68+ 用 apiClient.mail、mail/index.ts:84+ |
| R9 | api/mail/index.ts | emailApi/templateApi/mailApi 三对象冗余导出 | index.ts:84-173 |
| R10 | pages/integration/IntegrationMappingsPage.tsx | 真实 API + MOCK_MAPPINGS 双实现（mock 兜底掩盖缺口） | :45-71、:196、:285 |
| R11 | api/mobile approval.ts vs approvalEnhanced.ts | 双套审批 API 并存 | approval.ts:47-94、approvalEnhanced.ts:153-214 |
| R12 | svc/ticket feedback_compat.rs | feedback 归并 ticket 后前端无消费，仅存量兼容 | main.rs:62；前端无 feedbackApi |
| R13 | api/plugin/index.ts | 函数式导出 + pluginApiAggregated + marketplaceApi/pluginApi 多重导出 | plugin/index.ts:14-40 |
| R14 | 前端 plugin 前缀 | /api/core/plugin（旧）与 /api/plugin（新）并存于同目录两文件 | marketplace.ts:14 vs plugin.ts:12 |

---

## 4. 关键结论摘要

1. **im 是最大的预埋悬空模块**：36 个 API 方法、0 个真实页面消费，且方法路径/语义与后端错位（好友制 contacts vs 后端单联系人、mute/pin 方法 PUT vs POST、notifications 写接口后端缺失）；IM 菜单仅剩 dashboard+mail。
2. **notification 扩展 API 大面积悬空**：210 次调用中约 120+ 指向后端不存在的 channels/groups/subscriptions/digests/deliveries/webhooks/topics/providers/scheduled/preferences/push-config（im.ts/mail.ts 为重复封装不在此列），且被 settings 页真实消费的 listChannels 会直接 404。
3. **plugin 前缀混乱是链路级缺陷**：前端旧 base（/api/core/plugin）→ moduleMapping 指向 unified-core（插件路由已注释）→ 网关仅路由 /api/plugin → 页面消费即失败；后端自身 /plugin 与 /plugins 前缀亦不统一；插件信息/健康端点在 3 个服务重复。
4. **integration/external-erp 属于"有页面无后端"**：connections/mappings 页面消费空路由，mappings 用 mock 掩盖；external-erp 13 个路径全部无后端；integration 设置页纯静态。
5. **mobile 主链路健康、扩展链路悬空**：消费的考勤/任务/推送/扫码等 API 后端全覆盖；但 oa.ts（21 方法）与 approvalEnhanced（约 18 方法）无后端，其中 OA 会议页真实消费 → 实打实的缺口。
6. **ticket 消费面小而稳**：2 个页面消费的 8 个方法全部有后端；大量预埋扩展路径无后端；feedback 归并后前端无消费。
7. **共性冗余**：插件信息/健康端点 3 处实现、审批 API 双套、邮件 API 三对象、im_location 死路由、unified-core 注释残留。

---

*本报告全部结论基于 2026-09-09 仓库实测取证；数字均可在上文证据列（file:line）复核。未取证项：ticket 设置接口（不存在）、oa 后端服务（不存在）。*
