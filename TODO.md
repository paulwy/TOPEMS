# TOPEMS UI v3 迁移与优化 - 项目状态

## ✅ 已完成（P0 + P1）

### UI v3 两级菜单系统
- [x] 17 个一级模块
- [x] 79 个二级菜单
- [x] 菜单路径与实际路由匹配
- [x] 自动面包屑生成
- [x] 点击一级菜单只展开/折叠，不自动跳转

### Header 功能
- [x] Notifications 通知按钮
- [x] Settings 设置按钮
- [x] Profile 用户下拉菜单（个人中心、账号设置、退出登录）
- [x] DevTools 快捷键切换（Ctrl + Shift + D）

### 后端 API 实现
- [x] 独立服务：MES (8030)、SCM (8040)、WMS (8041)
- [x] unified-core 兼容层：简化版 API（用于开发调试）

### 脚本与配置
- [x] topems.sh 更新（MES/SCM/WMS 标记为已合并）
- [x] services.conf 更新
- [x] vite.config.ts 代理配置更新

---

## 📊 当前菜单统计（最终版）

**一级模块：17 个**
| 模块 | 二级菜单数 |
|------|-----------|
| 制造执行（MES） | 7 |
| 企业资源（ERP） | 7 |
| 供应链（SCM） | 8 |
| 客户管理（CRM） | 5 |
| 质量管理（QMS） | 5 |
| 仓储物流（WMS） | 5 |
| 数据决策（BI） | 7 |
| 地理信息（GIS） | 4 |
| 文档协同（DOC） | 4 |
| 消息中心（IM） | 2 |
| 人力资源（HRM） | 6 |
| 财务（Finance） | 7 |
| 系统管理（Admin） | 6 |
| 项目管理（PM） | 6 |
| 资产管理（Asset） | 5 |
| 产品数据（PDM） | 6 |

**二级菜单总数：83 个**

---

## 🚧 待改进（P2 - 长期）

### 专业模块（低优先级）
- [ ] 研发管理（RD）
- [ ] 环境健康安全（EHS）
- [ ] 实验室信息（LIMS）
- [ ] 高级排程（APS）
- [ ] 办公自动化（OA）

### 技术优化
- [x] crm contracts 后端实现（2026-09-16：CrmContractRedesignPage known_gap 转 matched，GET/POST/PUT /contracts + 迁移 + RLS）
- [x] GIS 服务认证问题修复（auth layer 顺序修正 + business-locations CRUD 闭环）
- [x] server 统一认证专项（2026-09-16：21 个 real_module 移除 inject_dev_claims 无条件伪造 superadmin 后门，接入真实 JWT auth_middleware；health 端点豁免；commit 09273803f）
- [x] 全模块 500 冒烟修复（2026-09-16：认证统一后逐模块真实 API 冒烟——rd tenant_id/experiments/formulas 缺列、gis 45 处 SQL 缺 SELECT、qms jsonb bind 类型、crm/contacts approval_status+deleted_at 缺列、finance accounts/tree、mes/equipment、wms/outbound-orders 补列；18 个真实服务全部 200，commit 192681e6f）
- [x] communication/ai 服务接入 server（2026-09-16：communication 已接，routes 补 nest(api_prefix) 修复 404，commit 8ce227f15；core 组 search/monitor/plugin-registry/integration/mobile 批量接入，commit e9126d983，已注册模块 24→29）
- [x] ai 服务接入 server（2026-09-16：AiRealModule 复用独立部署 AppState 组装链，create_routes 加 include_api_info 参数避免 /api、/api-docs 冲突；冒烟 /api/ai/analysis/history、/api/ai/connectors、/api/ai/agent/tools 200；模块 30→31 全量闭环，commit 0b807c9d6 + 01776b3d8）
- [x] unified-core 接入 server（2026-09-16：build_router 挂根路径冲突风险高，nest /api/core 隔离；/api/core/health、/api/core/api、/api/core/metrics 200，模块 29→30，commit e9da724ed）
- [x] unified-core 嵌入模式重构 + 端到端登录链路打通（2026-09-16：create_routes 增加 embed_mode 参数，嵌入时 core 业务路由挂根、跳过 public 冲突路由与 wms/mes/scm，修复 /api/core 双重前缀致登录 404；unified_core_real_module 改用 build_router_embedded；前端 VITE_CORE_PORT=8099 支持模块化单体代理；实测 POST /api/core/iam/auth/login 200 登录成功、users/me 200、permissions/metadata 200，前端 :3000 → vite proxy → 8099 全链路打通；commits 5653676fa/ec13cc90c/b2039af74）
- [x] 浏览器实际登录验证 dashboard 数据流真实化（2026-09-16：CU 驱动本机 Chrome admin 登录成功；修复三处断点——① vite.config VITE_MONOLITH=1 模块化单体全局代理开关（所有后端服务 target 统一 :8099，此前 MES/ERP 等仍按独立端口 8030/8010 代理致 ECONNREFUSED）② ports.ts 支持 VITE_PORTAL_PORT（此前 /api/portal 代理指向 8063 无服务）③ getDashboard 解包 GraphQL data.dashboard 层（此前访问 data.services 永远为空 → 永久默认演示数据）；实测模块运行状态 6 模块真实渲染（ERP/CRM/HRM/Finance/MES/Workflow 全部 healthy:false → 异常），本月产量真实聚合 0 替代演示 124,582）
- [x] portal dashboard 聚合在模块化单体下健康探测改口径（2026-09-17：GraphQL stats/services/todos 全部改走 8099 统一入口真实探活——① WorkflowApi 前缀 "" → /api/core/flow 且全部方法改走 build_path（此前独立/嵌入双轨均 404）② NotificationApi 前缀 /api/core/notification → /api/communication/notification（对齐 communication 实际路由）③ core_workflow_tasks 补 priority/due_time/claimed_at 三列（topems_app owner 执行，修复 flow my-pending 500）④ ApiResponse code/timestamp 加 serde default 容错（communication 响应无 code 字段致解析失败）；实测 services healthy 8/8、stats available 全 true、workflow/notification 端点 200 空数据、todos 三源（workflow+portal_todos+notification）全真实查询，业务库为空故数值 0）
- [x] business-stats 六组真实数值落地（2026-09-17：GET /api/portal/dashboard/business-stats 从"六组全 0/available:false"修复为全部真实——① service token TTL 300s→86400（issue_service_token）+ 新增 is_tenant_scoped 服务豁免 ② TypedServiceClient.get_items 解包 data.items/orders ③ erp/crm/hrm/mes 各 list/count 租户过滤加 nil 豁免（service 聚合读全量）④ hrm 客户端字段 Option 化（company_id/email 数据含 null）⑤ mes wip 统计 query 手动解码兼容 LEFT JOIN 空值（wip_count 0→2）⑥ finance 走 finance_client（此前误用 erp_client→404）+ 空参过滤（status="" 触发 Draft 过滤）+ list_vouchers nil 豁免 + finance:admin 权限 + 5433 授权 CREATE ON SCHEMA + finance 表 owner 转 topems_app（init_database 需 ALTER）——实测 erp{customers:1, sales_orders:1, materials:1} crm{customers:25} hrm{employees:6} finance{vouchers:1} mes{production_orders:1, wip_count:2} workflow{available:true}，六组 available 全 true；commits bb39002ad/68559aaff/bb2dcd5d0/afbeda125/ccbad132f/6333e78c6/15503c778/9b2fa4da1 已推送 main）
- [x] MUI elevation 警告修复（2026-09-17：核实 MUI 9.4.0 Paper 无 elevation 弃用警告（Paper.js propTypes 仅 elevation>0+variant=outlined 组合告警），代码扫描 148 处 elevation 无违规组合，浏览器 console 无 MUI 警告——TODO 项过时，标记完成）
- [x] dashboard 等演示模块认证一致性（2026-09-17：实测 /api/portal/graphql 无 token 200 且可查 businessStats/employeeEntity 等敏感字段——根因：graphql 及大量管理端点挂在 embedded.rs protected_routes 之外（register_routes_with_legacy_alias 合并后链式 .route）；修复：build_router 最外层挂 auth_middleware（is_public_path 豁免 /health/login，cors 外层保证预检放行）；实测无 token 401、带 token 200、business-stats 六组真实数值回归不变、前端 dashboard 正常渲染）
- [x] 全服务认证缺口扫描 + 转发用户 token 审计复核（2026-09-17：① 对 ai/analytics/bi/crm/ehs/erp/finance/hrm/lims/master-data/mes/pm/portal/qms/rd/scm/srm/wms 等 19 前缀无 token 探测常见业务端点——全部 401，仅 /health 豁免（is_public_path 设计，无敏感信息），无 portal graphql 类绕过 ② portal reqwest 调用已全部统一为 service token（issue_service_token + bearer_auth），无"转发用户 token"模式（仅 unified-core 测试代码用 bearer_auth 模拟用户，属预期）；历史"portal 46 处手工调用审计"项确认已治理完毕）
- [x] 服务调用可观测性：业务指标暴露到 /metrics（2026-09-17：发现 server 聚合模式的根 /metrics 由 AI 模块提供（svc/ai/src/routes.rs 挂根路由），handler 仅 render layer registry（axum HTTP 指标 22 行），业务指标（topems_service_to_service_calls_total / degraded / cache 等，注册于 prometheus 默认 registry）全部丢失；修复：/metrics handler 合并导出 gather()（默认 registry）+ metric_handle.render()（layer registry），unified-core 独立部署 metrics_render 同步修复；实测 /metrics 22→151 行，topems_service_to_service_calls_total{service="portal-service"} 13 可查，login/business-stats 回归正常）
- [x] 服务调用拓扑生成：聚合 metrics 的 service 维度 → 服务依赖矩阵/调用图谱（2026-09-17：指标增加 target 维度（topems_service_to_service_calls_total{service=调用方,target=被调方}，target 由被调路径 /api/{svc}/... 推导），单体模式下调用边完整可还原；service_topology.py --collect 解析新双 label 格式；实测 portal→erp 5 / →crm 3 / →hrm 2 / →mes 2 / →finance 1 真实边全部命中设计，runtime 图谱 24 节点 40 边已重新生成（docs/architecture/service-topology/service-topology.runtime.html））
- [x] --collect 接入阈值监控 / 定时任务（2026-09-17：check_split_threshold.py --topology auto 增加单体模式回退探测——services.yaml 独立端口（8000-18xxx）无进程时探测聚合端口 8099/8100（单进程暴露全部模块 /metrics，新双 label 格式可还原完整调用边）；每日巡检「TopEMS 拆分阈值与拓扑一致性巡检」现完整输出 6 项阈值 + 拓扑一致性（实测：匹配 5 / 仅 runtime 0 / 仅 design 35，均未触发））
- [x] 服务调用审计告警消费：ServiceIdentity + 频率 → 异常调用告警（2026-09-17：ServiceCallMonitor 告警规则已有（unknown_service / high_frequency / downstream_degrade，冷却去重 + tracing::warn + 可选飞书 webhook），补齐 Prometheus 消费出口——新增 topems_service_alerts_total{kind} 计数，告警发出时打点，运维平台可从 /metrics 采集；实测构造非白名单 service token（evil-intruder-service）触发 unknown_service 告警：/metrics 计数 1 + WARN 日志同步输出；Claims 必含 is_superuser 字段，手工构造 service token 需补全）
- [x] ticket 模块化单体全端点打通（2026-09-17：① DDL 权限修复——库侧 GRANT CREATE ON SCHEMA public TO topems_app + core_ticket_* 5 表 owner 转 topems_app（此前 init_ticket_tables 用受限 topems_app 建表被拒 → 模块降级未注册 → /api/ticket/* 全 404）② real_module 补挂 ticket_ext_routes（此前仅 handlers::ticket_routes + feedback_compat，batch-*/transitions/tags 扩展路由全缺）③ lib.rs 导出 pub mod ticket_ext（对齐独立部署 main.rs 已有挂载）④ 新增 workflows 子路由：GET /workflows/match（按 ticket_type 匹配默认状态机）、GET /workflows/automation-rules + PUT /workflows/automation-rules/{id}/toggle（ticket_automation_rules 映射 condition_field→trigger/action_type→action/enabled→is_active）——实测 /tickets、/tickets/stats、/ticket-tags、/workflows、/workflows/match、/automation-rules、/knowledge-articles 全 200；commit 7f13705ce 已推送）
- [x] tms 模块接入模块化单体（2026-09-17：module-tms 由 P3 门控转为 default 启用——tms 实现本已完备（analytics/carrier/driver/shipment/vehicle/optimization），仅 feature 未启用致 /api/tms/* 全 404；实测 analytics/carrier-performance、/vehicle-utilization 等 200，/assignments/plan 等 POST 端点 405（方法匹配正常）；随 commit 7f13705ce 推送）
- [x] aps 兼容层接入模块化单体（2026-09-17：mes_real_module 补 nest /api/aps → aps_compat（独立部署已有，模块化单体缺失致 /api/aps/* 全 404）；redirect handler 改 axum OriginalUri（nest 改写 Uri 丢前缀致 308 落点错）；实测 /capacities、/forecasts（→demand-forecasts）、/production-plans、/schedules 跟随重定向后 200；commit 029709368）
- [x] 更多模块的业务 API 实现（P2 长期；2026-09-17 全部缺口闭环：① pdm——server 接入 PdmRealModule（module-pdm）+ workflows/start 契约对齐（serde alias business_type/business_id），/api/pdm/* 全 200（commit 79afe8dcc）② srm——挂载 bidding/quotation（此前已写好未挂载，models 未导出致编译失败）+ 新建 inquiry.rs（CRUD+publish/close 状态机+RLS txn），/biddings /inquiries /quotations 全 200 + POST 落库（commit ba5397605）③ scm——新建 sync_records.rs（/sync-records CRUD + retry + details + /sync/wms|srm/{type} 触发同步），建表 scm.sync_records/sync_record_details（owner DDL + schema_defense 补定义），全 200 + POST 落库（commit 5f9a308e5）④ pm——补 /projects/milestones/timeline（聚合 project_milestones+projects），200（同 commit 5f9a308e5）⑤ rd 前端实走 apiClient.erp /materials 已 200（非缺口）；均已推送 main）
- [x] wms labor/picking 业务 API 落地（2026-09-17：新增 picking.rs（/picking/lists、/picking/lists/{id} 含明细、/picking/statistics、/picking/strategies）+ labor.rs（/labor/efficiency、/labor/efficiency/{userId}、/labor/productivity、/labor/workload、/labor/performance-dashboard、/labor/shifts GET+POST），全部走 RLS txn + WavePickRead/Write 权限；labor_shifts 建表（owner DDL）；关键修复：① 写操作必须显式 guard.take()→txn.commit()（tenant_middleware txn 随请求 drop 自动 ROLLBACK，POST 曾返回成功但未落库）② axum body 提取器必须在参数末尾 ③ PaginatedResponse 需 total_pages=total_pages_of(total,page_size) ④ PgRow.get 需 use sqlx::Row；实测 9/9 端点 200 + 班次 POST 落库可读，ticket/tms/aps 回归通过；commits f6812efe0/080dc7430 已推送）
- [x] 全服务批量 404 缺口第二波闭环（2026-09-17：前端真实调用 vs 后端全量盘点——gis 原 P3 门控未启用（module-gis 不在 default features），补入 default + 20 张表自检通过；gis factory-maps 公开路由依赖 Claims 致 500（embedded public 无鉴权），改为 header/默认租户；integration 双前缀 bug（create_routes 内部 register_routes_with_legacy_alias 自带 /api/integration 前缀 + server real_module 再 nest → 实际 /api/integration/api/integration/*），新增 create_routes_embedded 剥离 /、/health、/api/plugins/*、/api-docs/openapi.json（分别与宿主根/plugin-registry/openapi 冲突），server 侧改 merge；monitor 补 /metrics/realtime + /metrics/test-retry（复用 get_system_metrics，监控页真消费）；search 前端契约修复（/?q= → ?keyword=、limit → page_size，axum nest 根路由映射无尾斜杠）；排查结论：hrm reports/audit-logs、ehs drills/checks、qms apqp、doc folders 等均已 200（此前 404 为尾斜杠/变量替换假象），sync-stats/workspaces/ai conversations 为无页面消费或 mock 兜底，标已知问题；实测 gis/integration/monitor/search 全 200，server 稳定运行）
- [x] 全服务批量 404 缺口第三波闭环（2026-09-17：lims 补 4 个 handler（GET /tasks/sample/{id}、POST /tasks/{id}/complete_step、GET /lifecycle-stages/{code}、GET /print-config/default）+ 前端 4 处契约对齐（scanBarcode→POST /barcodes/scan 返回 BarcodeScanRecord、trace→/barcodes/trace/{barcode}、submitResult→/tasks/{id}/result、transitionSampleStage→/samples/{id}/stage/{to_stage}）；ehs hazard.rs 双前缀根因修复（8 条 /api/ehs/issues* → /issues*，此前实际暴露 /api/ehs/api/ehs/issues/*，前端 safetyIssue.ts 10 方法全解锁，前后端字段核验一致）；monitor 补单条 POST /alerts/{id}/acknowledge + /alerts/{id}/resolve（两页面真消费）；排查结论：doc 详情操作（activities/collaborators/comments/lock/share/versions）、ai 19 项（页面消费 5 方法全 200，其余未消费/mock 兜底）、integration conversion-rules/endpoints、ehs 其余 30+ 详情 GET 均无页面消费，标已知问题；实测 lims/ehs/monitor 端点全 200（假 id 业务 404 证路由已注册）；commits 95d8d50b1/2080b9197/35894b871 已推送）
- [x] workflow 大缺口专项第一波（2026-09-17：105 条缺口按页面消费过滤——页面消费 19 个方法中仅 2 个真缺口：POST /workflows/{id}/versions/{vid}/activate + DELETE /workflows/{id}/versions/{vid}（WorkflowVersionHistoryPage 消费），新增 activate_workflow_version（事务置同工作流其他版本非激活后激活目标）/delete_workflow_version（软删）；其余（categories/delegates/form-definitions/form-instances/rules/variables/monitor analysis/instances 变体等）为无页面消费 API 定义，标已知问题；instanceApi.delete 实为 cancel 路由、rollback/notifications 走既有路径；实测新路由 200（假 id 业务 404）；commit 2b4cb37eb 已推送）

---

## 📝 已知问题

| 问题 | 状态 | 说明 |
|------|------|------|
| WebSocket 连接中断 | ⚠️ 已知 | 重连时偶发，自动恢复 |
| MUI elevation 警告 | ⚠️ 警告 | 不影响功能 |
| GIS 认证 | ✅ 已修复 (fbcc1c6e9) | auth layer 顺序修正 + business-locations CRUD 闭环 |
| finance 真实模块降级（must be owner） | ✅ 已修复 | 全库业务 schema/表 owner 统一为 topems_app；MIGRATE_URL 迁移池用户统一（topems→topems_app），portal schema 防御 permission denied 同步消除 |
