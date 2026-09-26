# TOPEMS V78.0 架构与质量审计报告

> 审计日期：2026-07-29  
> 审计范围：全代码库（前端 apps/web + 后端 svc/* + 共享 lib/*）  
> 审计方法：静态代码扫描 + 量化统计 + 人工抽样核验  
> 报告版本：V78.0（继 V77.0 之后的第二轮深度量化审计）

---

## 0. 摘要

| 维度 | 问题总数 | P0 | P1 | P2 |
|------|---------|----|----|----|
| D1 整体架构 | 10 | 3 | 5 | 2 |
| D2 前端模块 | 9 | 1 | 5 | 3 |
| D3 后端模块 | 7 | 2 | 3 | 2 |
| D4 前后端对齐 | 11 | 4 | 5 | 2 |
| D5 UI/UX 优化 | 6 | 2 | 3 | 1 |
| D6 公共组件/常量 | 8 | 3 | 3 | 2 |
| D7 硬编码问题 | 7 | 3 | 2 | 2 |
| D8 补充优化方向 | 8 | 4 | 3 | 1 |
| **合计** | **66** | **22** | **29** | **15** |

> **P0 = 安全阻断 / 上线阻塞**；**P1 = 数据正确性 / 功能完整**；**P2 = 代码质量 / 长期可维护性**

---

## 1. D1：整体前后端架构

### 1.1 后端微服务架构

#### P0-1：5个服务端口配置与权威源 services.yaml 不一致（18.5%）
- **影响**：ehs / mes / pdm / rd / search 五个服务 main.rs 硬编码端口 ≠ config/services.yaml
- **详情**：

| 服务 | main.rs硬编码 | services.yaml | 差异 |
|------|:-----------:|:----------:|------|
| ehs | 8025 | 8052 | -27 |
| mes | 8020 | 8030 | -10 |
| pdm | 8022 | 8031 | -9 |
| rd | 8025 | 8053 | -28 |
| search | 8083 | 8082 | +1 |

- **修复**：5处服务 main.rs 的 port 字段改为 resolve_port / env / services.yaml 读取

#### P0-2：srm 服务 13个核心依赖完全未使用 workspace 引用
- **位置**：`svc/srm/Cargo.toml`
- **详情**：axum、sqlx、serde、chrono、tokio、tower-http、tower、serde_json、uuid、bigdecimal、tracing、utoipa、reqwest 全部写死版本号
- **风险**：跨服务版本不一致、安全补丁需要逐服务升级

#### P0-3：unified-core 13处 `.expect("Failed to init")` 直接 panic
- **位置**：`svc/unified-core/src/main.rs:134-188`
- **详情**：iam / flow / file / tenant / plugin / migration / dict / master / menu / help / login_log / doc / seed 共 13 处 DB init 全是 expect()，任何一个模块初始化失败都会让整个 God Service 崩溃
- **修复**：非核心模块（dict / plugin / menu / help / login_log / doc / migration）改为 warn! 日志降级

#### P1-1：portal/main.rs 膨胀至 3,250 行 / 8 个中间件
- **平均**：其他服务 main.rs 约 100-250 行，portal 是平均的 13 倍
- **建议**：拆分 `middleware/`、`routes/`、`state.rs`、`openapi.rs`

#### P1-2：前端 4 种路由机制并存
- **机制1**：静态路由组（authRoutes / dashboardRoutes / commonRoutes）
- **机制2**：DynamicRoutes 通配 fallback
- **机制3**：Plugin loader 的 DynamicRouter `/core/*`
- **机制4**：Module Federation 微前端 REMOTE_MODULES
- **风险**：同一路径可能被多机制匹配，路由调试成本极高

#### P1-3：9 个服务 sqlx 写死 `0.8` 而非 workspace 的 `0.8.6`
- billing / crm / erp / feedback / hrm / pm / ticket + srm(全量)
- 实际：0.8 → 实际解析为 0.8.6 不冲突，但仍建议统一 `workspace = true`

#### P1-4：前端 Zustand store 与 React Query 4处疑似重叠管理
- notification / module / theme / workflow 双来源可能数据不一致

#### P1-5：modules/*/pages/ 为 0，页面全部集中在 pages/
- 架构文档承诺 modules/<name>/pages/<XxxPage> 实际未执行，所有页面散落 pages/ 扁平目录（550+文件）

---

### 1.2 前端架构

#### P1-6：466 个 pages/ 页面未在任何路由配置中静态 import
- 模块配置引用的页面 vs pages/ 目录实际文件：**>90% 页面未被静态路由引用**
- 两种可能性：A) DynamicRoutes 通过 metadata 动态加载（运行时 OK 但静态扫描不到）；B) 僵尸代码堆积

#### P2-1：admin/iam 目录 3 对完全重名功能页面
- RoleManagement / PermissionManagement / CompanyStructure 各在 admin 和 iam 目录下各有一份，存在功能漂移风险

#### P2-2：前端 16 个 >1000 行超大 Page 组件
- **TOP**：`doc/DocumentsPage/index.tsx`(1450) / `erp/VoucherManagementPage.tsx`(1432) / `shared/ProfilePage.tsx`(1301) / `admin/MonitoringAlertPage.tsx`(1186) / `pm/PmProjectDetailPage.tsx`(1175)
- **风险**：首屏 bundle 大、可维护性差，需拆分子组件 + React.lazy

---

## 2. D2：前端模块（缺陷/冲突/重复/冗余）

### 2.1 重复页面与重名

#### P0-1：11 个域全部有 DashboardPage.tsx 重名（构建混淆）
- pm / wms / crm / admin / shared / hrm / doc / scm / erp / rd / gis
- 风险：构建堆栈、调试、import alias 时完全无法从文件名判断

#### P1-1：4 套 CRUD 抽象并存（重复建设）
1. `useCrudQueries` + `useCrudMutations`（旧版）
2. `useCrudUnified`（统一版）
3. `useResourceCRUD`（资源粒度版）
4. `useBffCrud`（BFF 层版）
- 建议：保留 useCrudUnified，其余 3 套标记 deprecated

#### P1-2：3 种 WebSocket 封装重复（useWebSocket/useWebSocketNotifications/useNotificationWebSocket）
- 建议：合并为 `useWebSocketChannel(domain: 'im' | 'notification' | 'dashboard')`

#### P1-3：4 个文件使用自定义 @media 断点（未用 MUI sm/md/lg）
- components/common/Grid.tsx 等
- 风险：响应式断点与 MUI 全局 1200/900/600px 不一致

#### P1-4：功能近似 Hooks 聚类 TOP10 组
| 分组 | 数量 | 建议 |
|------|:----:|------|
| 实时/同步/WebSocket | 24 | 抽象 useChannel |
| BI/报表 | 23 | 统一 useBIAggregate |
| 权限/角色/用户 | 18 | 统一 useAuthContext |
| 财务跨域集成 | 14 | 统一 useFinanceIntegration |
| Crud/查询变更 | 14 | useCrudUnified 收敛 |
| AI辅助编码 | 12 | 统一 useAIAgent |

#### P1-5：疑似未 import 文件 624 个（497 高风险）
- 注：可能包含动态 import 假阳性

#### P2-1：DashboardPage 双版本（目录版 vs schema 模板版）
- 11 个域已全部有 `modules/<name>/pages/DashboardPage`（实际不存在 → pages/ 下有 DashboardPage.tsx + DashboardPage 模板版）
- 需统一到 schema 驱动模板

#### P2-2：4 套 CRUD hooks 在 domain/index.ts 同时对外暴露
- 调用方随机选择导致实现分化

#### P2-3：WS hooks 11 个导出函数命名风格不统一
- useXxxConnection / useXxxSubscription / useXxxChannel 混用

---

## 3. D3：后端模块（缺陷/冲突/重复/冗余）

### 3.1 代码重复

#### P0-1：AuditLog 5 个服务重复定义 + 字段漂移
- **位置**：wms / scm / erp / rd（15字段） + hrm（15字段）
- **问题**：scm/erp 缺 tenant_id 字段；后续审计字段变更需要 5 处同步
- **修复**：提升到 topems-shared 共享 AuditLog 类型

#### P0-2：插件注册文件 6 服务完全重复（100% 相同代码）
- crm / mes / mobile / scm 等服务的 `*_plugin.rs`（auto_register_to_core / get_plugin_info / plugin_health_check）
- 总计约 45KB 纯重复代码
- **修复**：抽入 topems-shared 作为 `plugin_registry` 通用宏/框架

### 3.2 SELECT * 残留

#### P1-1：全 svc/ 281 处 SELECT *（排除动态拼接）
**Top 5 服务（占 75.6%）：**

| 排名 | 服务 | 数量 | 占比 |
|-----:|------|:---:|:---:|
| 1 | gis | 65 | 23.1% |
| 2 | pm | 60 | 21.4% |
| 3 | unified-core | 50 | 17.8% |
| 4 | erp | 34 | 12.1% |
| 5 | mobile | 23 | 8.2% |
| - | 其他6个 | 49 | 17.4% |

**分级**：P0(立即)=gis+pm+unified-core=176处；P1(二期)=erp+mobile=57处

#### P1-2：264 对 module 文件函数名重合 ≥80%
- 典型：CRUD 模板文件仅表名/字段不同

#### P1-3：183 处显式 `#[allow(dead_code)]`
- Top3 服务：hrm / finance / unified-core
- 建议 CI 接入 clippy -- -W dead_code 做增量扫描

#### P2-1：31 个服务中 migration-sdk / user-service 为纯 SDK 无路由
- 文档中无说明，补充注释防止误判为僵尸服务

#### P2-2：master-data 无 auto_register
- 其余 24 个业务服务都有自动注册到 unified-core 的插件机制，master-data 缺失

---

## 4. D4：前后端对齐（模块功能完整性）

### 4.1 API 路径与方法对齐

#### P0-1：SCM 13处方法级冲突（POST 列表 vs GET 列表）
- **后果**：前端所有 POST 创建操作可能被后端当作列表查询处理（或反向404）
- **清单**：/suppliers、/purchase-orders、/purchase-requisitions、/purchase-contracts、/purchase-items、/quotes、/comparisons、/supplier-admissions、/mrp/suggestions、/evaluations、/delivery-appointments、/incoming-inspections、/supplier-assessments

#### P0-2：Finance `created_by` 前端可选 vs 后端必填 String
- **影响**：前端创建凭证时若不显式填 created_by → 后端 422 Unprocessable Entity
- **位置**：后端 `svc/finance/src/models/mod.rs` Voucher 的 created_by 字段

#### P0-3：Finance VoucherLine 缺失 14 个核算维度
- **严重程度**：🔴 凭证创建后维度丢失
- **后端 VoucherLine**：9 字段（id/tenant_id/voucher_id/line_no/account_id/account_code/account_name/description/debit/credit/project_id/department_id）
- **前端 VoucherEntry**：23 字段（多出 customer_id/supplier_id/employee_id/bank_account_id + 各对应code/name 共 14 个辅助核算维度）
- **后果**：客户/供应商/员工/银行 4 个核算维度在保存时完全丢失

#### P0-4：SCM /suppliers 列表 POST vs GET 冲突
- 前端 crud factory 统一 POST 创建 + POST 查询列表；后端使用 REST 语义（GET 列表 / POST 创建）

### 4.2 响应结构对齐

#### P1-1：pageSize（camelCase） vs page_size（snake_case）全项目不一致
- 前端 PaginatedResponse.pageSize → 后端所有响应 page_size
- 需统一 serde rename 或前端反向适配层

#### P1-2：approved_by / poster_id vs approver_id / poster_id 冗余
- Finance Voucher 后端 created_by + approved_by + posted_by；前端用 approver_id 替代 approved_by（2字段语义漂移）

#### P1-3：Finance description vs summary 双摘要并存
- 后端 description 前端无定义；前端 summary 后端有同名字段 → 可能双写不一致

#### P1-4：year / month / total_amount / currency_code 前端必填 vs 后端 Option
- 前端 4 字段定义为必填；后端 4 字段为 Option<i32/Decimal/String>
- 若后端 None 返回到前端 → 前端 TS 运行时 undefined
- Finance Voucher 还有 is_reversed / attachment_count / updated_at 同样问题（共9字段必填性不一致）

#### P1-5：缺失后端端点（修正假阳性后约30%真实缺失率）
- D4.1 脚本有模板字符串解析误判，建议人工抽样确认 finance/hrm/crm/wms/mes/scm 实际缺失率

#### P2-1：列表响应 list 字段名不统一
- items / completed_records / file_data / data 混用（前端类型仅支持 items / data）

#### P2-2：total 响应字段不统一
- total / total_count / count / total_employees 等 10+ 变体（前端适配层可能多写判断）

---

## 5. D5：UI/UX 优化空间

### 5.1 硬编码样式 Token

#### P0-1：2184 次 fontSize 硬编码（未用 theme.typography token）
- Top5 文件：ai-governance/v57(76) / ai-copilot/v55(43) / ai-review/v56(41) / intelligent-ops/v56(39) / ai-agent/v54(38)
- 表现：fontSize: 10 / 11 / 12 / 14 数字字面量散落

#### P0-2：7170 次固定 width/height 硬编码（675 文件）
- **TOP 风险**：FloatingAIHelper(101次) / BISkeleton(85) / DocumentsPage(80) / MobileApprovalPage(69) / AppHeader(66)
- 移动端适配：Mobile 系列 4 个页面合计 259 次固定 px，可能严重破坏窄屏设备体验

#### P1-1：261 次 margin/padding 用 'xxpx' 而非 MUI spacing(1/2/3...)
- Top：AISettingsModal(37) / MapView(24) / ErrorBoundary(22)

#### P1-2：149 次 z-index 数字硬编码（102 文件）
- 风险分布：`10000`(31次=弹窗) / `1`(31次=基层) / `10`(23次) / `50`(21次) / `10001`(6次=最顶级弹窗)
- 层级管理混乱：同一语义（modal）有的写 10000 有的写 10001 有的写 1300

#### P1-3：273 次 transition 字面量（157 文件）
- TOP 模式：'all 0.2s'(47) / 'background-color 0.2s'(22) / 'transform 0.2s'(18) / 'all 0.3s'(16)
- 动效时长/缓动函数无统一规范（应该统一走 theme.transitions.create()）

#### P2-1：fontWeight 数字字面量 0 次（良好 ✅）

---

## 6. D6：公共部分/组件/常量

### 6.1 公共组件重复

#### P0-1：ListPageTemplate 仅被 import 1 次，9 个页面重复写 Table+Toolbar
- 9 个重复页面：admin/MonitoringAlertPage / admin/OperationAuditLogPage / admin/PermissionAuditPage / bi/BIComparisonPage / erp/AuditLogPage / erp/DatabaseManagementPage / erp/VoucherManagementPage / system/AuditLogPage / system/BackupPage
- 组件已写好但覆盖率 = 0.001

#### P0-2：ModalTemplate / FormFieldGroup 被 import 0 次
- 公共组件完全无人使用，实际业务全部重写 Modal / Form 结构

#### P0-3：973 个类型跨文件重复定义
- **最严重 TOP**：CrudApiAdapter(120处) / StatCard(26) / ChartCard(20) / TabConfig(20) / SectionConfig(20) / PaginationParams(14) / QuickAction(14)
- 后果：同一类型不同处定义字段不一致，编译过了行为错

#### P1-1：StatusChip / PriorityBadge / UserAvatar 散落 81+28 文件各处自实现
- 无统一颜色/尺寸规范，同一状态不同页颜色不同

#### P1-2：storage 工具 6 套实现
- GlobalSearchBar/utils / PluginManager / lib/security / ab-testing / fallback-strategy / session.ts
- 各套 key 前缀、TTL、序列化格式不一致

#### P1-3：跨 utils 文件 7 组函数名重复
- formatCurrency ×2 / formatNumber ×2 / formatDuration ×2 / debounce ×2 / throttle ×2 / lazyImport ×3 / endSpan ×2
- 运行时若 import 错路径可能逻辑完全不同（worker 版 vs 主线程版）

#### P2-1：10 个 *PageTemplate 组件仅被 1 次使用
- CardListTemplate / MasterDetailPageTemplate / KanbanPageTemplate / TreePageTemplate / TimelinePageTemplate / WizardPageTemplate 都是创建后仅示例页引用，长期闲置

#### P2-2：CrudPage vs ListPageTemplate 两套列表页模板并存
- CrudPage 231 次使用；ListPageTemplate 1 次使用。两套 API / props 不兼容，新功能选择成本高

---

## 7. D7：硬编码问题

### 7.1 后端硬编码

#### P0-1：测试文件硬编码 DB 密码 topems_secret ×3
- `svc/pdm/tests/pdm_tests.rs:9` / `svc/finance/tests/finance_service_tests.rs:12` / `svc/ehs/tests/ehs_tests.rs:8`
- 风险：代码泄漏时测试密码与生产密码若复用 → 直接 DB 渗透

#### P0-2：erp iam_client 硬编码 admin / admin123 凭证
- `svc/erp/services/iam_client.rs:66-69`
- 以及 unified-core modules/iam/mod.rs:435 `admin123` 初始密码
- **修复**：所有 env::var() 涉及密钥/密码的，必须 panic 不允许回退

#### P0-3：83 处硬编码 localhost URL/端口回退
- **Top风险**：portal/shared/mod.rs (8个服务回退) / integration/main.rs (7个) / portal/search.rs (4个)
- 若生产环境变量缺失，请求会打向 localhost → 直接 connection refused 或本地测试服务响应

#### P1-1：83 处 Duration::from_secs(数字字面量) 未提取常量
- 相同语义 300s(5min)、3600s(1h) 散落 50+ 处；变更 TTL 时容易漏改

#### P1-2：CRM / ERP / HRM 的 ENCRYPTION_MASTER_KEY / ENCRYPTION_KEY 仍有 unwrap_or_else 回退块
- V77.0 修复了 CRM，但 ERP/HRM 仍有弱密钥回退（审计脚本再次识别到）

#### P2-1：admin123 出现位置
- unified-core 初始密码 + erp iam_client 测试凭证（两处）

#### P2-2：8 处 println! / eprintln! 残留（应换 tracing）
- svc/qms/openapi.rs 等 openapi spec 写盘日志、svc/ai/embedding.rs

---

### 7.2 前端硬编码

#### P1-1：硬编码颜色 hex 仍有 161 文件 + 1179 次 rgba
- P1-6 仅替换了 top10 高残留文件，剩余 151 文件需渐进迁移
- **高残留 TOP**：v53-platform-console(80+) / design-system(60+) / gis/modules/*(120+) / lowcode-builder(28)

#### P1-2：localhost:xxxx 仍有 99 处（微前端+插件端口）
- microfrontend/config.ts(22) / api/plugin/registry.ts(19) / config/plugins.config.ts(11) / WS 默认端口 / MonitorSettingsPage(6)
- 生产构建若未替换 → 浏览器请求本地 localhost 失败

---

## 8. D8：补充优化方向

### 8.1 性能

#### P0-1：analytics / mes 6 处 format! 拼接 SELECT（SQL注入面）
**最高风险 3 处**：
- `svc/analytics/src/modules/bi/multidimensional_analysis.rs:433` — select_clause 用户可控列
- `svc/analytics/src/modules/bi/chart_service.rs:167,189,209` — cols[0]/table 直接拼接
- `svc/mes/modules/wip.rs:209` / equipment.rs:227 / team.rs:161 — where_clause 直接拼接

**修复**：列名/表名/表别名走严格白名单验证，不匹配即拒绝

#### P0-2：unified-core 缺 request_id / request_context / telemetry 中间件
- 其他 26 个服务通过 build_application 自动注入；unified-core 手写 `.layer(cors)` 完全错过三层
- 后果：全链路追踪断在 unified-core，God Service 中的 11 个模块请求无 Request ID 无法排查

#### P0-3：16 个 >1000 行 Page 未用 React.lazy
- 同步直引 1120 次；首屏 bundle 至少大 30%
- 修复：所有 pages/* 组件路由入口统一 lazyWithRetry 包裹

#### P0-4：pdm/wms/qms/srm/crm 五大服务零 validator 校验
- 抽样 5 服务 create/update handler，无任何服务使用 validator crate
- 仅 pdm / qms 手写了非空校验和状态机；wms / srm / crm 完全裸奔（超长字符串、非法数字直接入DB）

### 8.2 可观测性

#### P1-1：8 println! 残留（应全部 tracing::info!）

#### P1-2：unified-core tracing 链路断裂（见 P0-2）

#### P1-3：28 服务中 10+ 服务 0 个测试文件
- billing / feedback / search / ticket / analytics 等
- 至少补 health endpoint、基础 CRUD 集成测试

### 8.3 安全

#### P1-1：CORS 配置良好 ✅（0 wildcard，全精准 origin list）
- 默认回退源 http://localhost:3000,http://localhost:5173，生产必须配置环境变量

#### P1-2：21 处 format!.*SELECT（其中 6 处高风险见 P0-1）

#### P1-3：输入校验缺失 → validator 引入（P0-4）

### 8.4 测试

#### P1-1：综合覆盖率粗估 5-12%
- 前端测试文件占比 12.7%；后端 11%；考虑 line coverage 实际数字更低
- 28 服务中 10+ 服务 0 个 tests/*.rs

#### P2-1：apps/web/tests 目录仅 3 个文件，e2e 无 spec
- Cypress/Playwright 未发现实际用例文件（仅有 helpers 目录结构）

---

## 9. 分阶段修复路线图

### 第一阶段：P0 安全与阻断（22项）— 立即并行
| # | 任务 | 预估耗时 |
|---|------|:------:|
| P0-1 | 修复 5服务端口（ehs/mes/pdm/rd/search）与 services.yaml 对齐 | 15min |
| P0-2 | srm Cargo.toml 13个核心依赖 → workspace = true | 10min |
| P0-3 | unified-core 13处 expect() → warn降级（非核心7模块） | 20min |
| P0-4 | AuditLog 5服务重复 → 提升 topems-shared 共享类型 | 30min |
| P0-5 | 6服务 *_plugin.rs 重复代码 → 抽 shared plugin_registry | 40min |
| P0-6 | SCM 13处方法冲突（POST列表→GET，修正工厂函数） | 30min |
| P0-7 | Finance created_by 必填性修复 + VoucherLine 增14维度列 | 40min |
| P0-8 | analytics+mes 6处 SQL 拼接 → 白名单验证 | 30min |
| P0-9 | unified-core 补 request_id/request_context/telemetry 三层 | 20min |
| P0-10 | 五大服务（pdm/wms/qms/srm/crm）引入 validator 校验 create/update | 60min |
| P0-11 | 3 处测试文件 topems_secret 改为 env 读取 | 10min |
| P0-12 | erp iam_client admin123 + unified-core 初始 admin123 → 强制 env | 15min |
| P0-13 | CRM/ERP/HRM ENCRYPTION_MASTER_KEY 回退移除 → panic | 10min |
| P0-14 | ListPageTemplate 推广到 9 个重复手写 Table 页面 | 60min |
| P0-15 | CrudApiAdapter 120处重复类型 → 提升 shared-types | 40min |
| P0-16 | 83 处 Duration::from_secs → 提取常量到 shared-core/config/durations | 30min |
| P0-17 | 83 处 localhost 回退（Top3 服务：portal/integration/portal_search） | 30min |
| P0-18 | PaginationParams 14处重复 → 提升 shared-types | 20min |
| P0-19 | 2184 处 fontSize 硬编码（AI面板 6 文件 60%） | 60min |
| P0-20 | 7170 处 width/height 固定值（Mobile4页+TOP5文件 40%） | 60min |
| P0-21 | 16 个 >1000 行 Page → React.lazy 包裹路由入口 | 30min |
| P0-22 | ModalTemplate/FormFieldGroup 推广或删除（0次使用） | 30min |

### 第二阶段：P1 数据正确性（29项）— 第二周
- 176 处 SELECT *（gis+pm+unified-core）
- pageSize/page_size 全项目统一 serde rename
- Finance 9 字段必填性不一致修复
- 4 套 CRUD hooks 标记 deprecated（保留 useCrudUnified）
- 3 套 WS hooks 合并为 useWebSocketChannel
- 8 println! → tracing
- 10+ 服务补基础测试 CRUD + health
- StatusChip/PriorityBadge/UserAvatar 集中到 common
- storage 工具 6 套合并

### 第三阶段：P2 长期可维护性（15项）— 第三周
- 剩余 57 处 SELECT *（erp+mobile）
- 151 文件硬编码颜色渐进迁移
- 99 处 localhost 端口（微前端/插件）统一 config
- 149 z-index 集中管理（theme.zIndex 映射）
- 273 transition → theme.transitions.create
- master-data 补 auto_register
- migration-sdk/user-service 补文档注释
- 补充 Cypress/Playwright e2e 核心流程测试

---

## 10. 附录

- **D3+D4 原始数据**（264重复对 + 281 SELECT* + 163 端点）：`scripts/audit_report_v78.json`
- **V77.0 审计报告**：`docs/audit/v77-architecture-audit-report.md`
- **TODO 任务清单**：`docs/roadmap/TODO.md`（本报告所有任务条目同步更新）
