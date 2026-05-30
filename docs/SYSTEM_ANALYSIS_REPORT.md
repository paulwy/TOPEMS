# TOPEMS 前后端功能对比分析报告

生成时间: 2026-05-30

## 📋 系统架构概览

### 后端服务清单 (共 19 个微服务)

| 服务名称 | 服务标识 | 端口 | 状态 | 说明 |
|---------|---------|------|------|------|
| IAM (身份认证) | topems-iam | 8002 | ✅ 运行中 | 用户、角色、权限管理 |
| DOC (文档管理) | topems-doc | 8001 | ✅ 运行中 | 文件管理、模板、知识库 |
| AI (AI服务) | topems-ai | 8003 | ✅ 运行中 | 智能分析、聊天 |
| FLOW (工作流) | topems-flow | 8004 | ✅ 运行中 | 审批流程、实例管理 |
| LIMS (实验室管理) | topems-lims | 8006 | ✅ 运行中 | 样品、仪器、试剂管理 |
| HRM (人力资源) | topems-hrm | 8010 | ✅ 运行中 | 职位、请假、招聘、薪酬 |
| ERP (企业资源) | topems-erp | - | ❌ 未运行 | 公司、部门、资产管理 |
| QMS (质量管理) | topems-qms | - | ❌ 未运行 | 质量检验、问题追踪 |
| EHS (环境健康) | topems-ehs | - | ❌ 未运行 | 环境、健康、安全管理 |
| SRM (供应商管理) | topems-srm | - | ❌ 未运行 | 供应商关系管理 |
| PDM (产品数据) | topems-pdm | - | ❌ 未运行 | 产品数据管理 |
| GIS (地理信息) | topems-gis | - | ❌ 未运行 | 地理信息系统 |
| IM (即时通讯) | topems-im | - | ❌ 未运行 | 即时消息 |
| CRM (客户管理) | topems-crm | - | ❌ 未运行 | 客户关系管理 |
| MES (制造执行) | topems-mes | - | ❌ 未运行 | 制造执行系统 |
| SCM (供应链) | topems-scm | - | ❌ 未运行 | 供应链管理 |
| WMS (仓库管理) | topems-wms | - | ❌ 未运行 | 仓库管理系统 |
| BI (商业智能) | topems-bi | - | ❌ 未运行 | 数据分析报表 |
| RS (研发管理) | topems-rs | 8003 | ⚠️ 与AI共用端口 | 研发项目、实验、配方 |
| Integration (集成) | topems-integration | - | ❌ 未运行 | 系统集成服务 |
| Notification (通知) | notification-service | - | ❌ 未运行 | 消息通知服务 |
| Report (报表) | report-service | - | ❌ 未运行 | 报表生成服务 |

## 🔍 功能对比详情

### 1. IAM (身份认证与权限) - ✅ 完成度 95%

#### 后端 API 模块
```
/api/v1/auth/*         - 认证相关 (登录、注册、刷新token)
/api/v1/users/*        - 用户管理
/api/v1/roles/*        - 角色管理
/api/v1/permissions/*  - 权限管理
/api/v1/access-logs/*  - 访问日志
```

#### 前端实现
- ✅ LoginPage.tsx - 登录页面
- ✅ UserManagementPage.tsx - 用户管理页面
- ✅ RoleManagementPage.tsx - 角色管理页面
- ✅ PermissionManagementPage.tsx - 权限管理页面
- ✅ AuditLogPage.tsx - 审计日志页面
- ✅ useAuth.tsx hook - 认证状态管理

#### 缺失功能
- ❌ 忘记密码/重置密码流程
- ❌ OAuth 第三方登录 (GitHub, Google)
- ❌ MFA 多因素认证
- ❌ 用户头像上传
- ❌ 用户个人资料编辑页面

---

### 2. DOC (文档管理) - ✅ 完成度 80%

#### 后端 API 模块
```
/api/v1/files/*        - 文件上传下载
/api/v1/folders/*       - 文件夹管理
/api/v1/templates/*    - 模板管理
/api/v1/help-center/*  - 帮助中心
/api/v1/documents/*    - 文档搜索
```

#### 前端实现
- ✅ DocumentsPage.tsx - 文档列表
- ✅ DocumentCenterPage.tsx - 文档中心
- ✅ HelpCenterPage.tsx - 帮助中心
- ✅ TemplateManagementPage.tsx - 模板管理

#### 缺失功能
- ❌ 文件预览功能 (PDF, Office)
- ❌ 文档版本管理
- ❌ 文档评论和协作
- ❌ 文档分享和权限控制

---

### 3. FLOW (工作流) - ✅ 完成度 90%

#### 后端 API 模块
```
/api/v1/workflows/*     - 工作流定义
/api/v1/instances/*     - 流程实例
/api/v1/approvals/*     - 审批操作
/api/v1/notifications/* - 通知
/api/v1/statistics/*    - 统计
/api/v1/versions/*      - 版本控制
```

#### 前端实现
- ✅ FlowWorkflowPage.tsx - 工作流列表
- ✅ FlowInstanceListPage.tsx - 实例列表
- ✅ FlowInstanceDetailPage.tsx - 实例详情
- ✅ FlowApprovalPage.tsx - 审批页面
- ✅ FlowApprovalDetailPage.tsx - 审批详情
- ✅ FlowStatisticsPage.tsx - 统计页面
- ✅ FlowNotificationCenter.tsx - 通知中心
- ✅ WorkflowDesignerPage.tsx - 工作流设计器
- ✅ FlowVersionHistoryPage.tsx - 版本历史

#### 缺失功能
- ❌ 工作流模板导入导出
- ❌ 流程节点批量配置

---

### 4. LIMS (实验室管理) - ⚠️ 完成度 70%

#### 后端 API 模块
```
/api/v1/samples/*              - 样品管理
/api/v1/instruments/*           - 仪器管理
/api/v1/reagents/*              - 试剂管理
/api/v1/inspection_processes/*  - 检测流程
/api/v1/inspection_tasks/*      - 检测任务
/api/v1/inspection_records/*    - 检测记录
/api/v1/ai/*                   - AI集成
/api/v1/docs/*                  - 文档集成
```

#### 前端实现
- ✅ Limspage.tsx - LIMS 主页面
- ⚠️ 部分组件 (SampleList, InstrumentList, ReagentList)

#### 缺失功能
- ❌ 样品登记页面
- ❌ 仪器维护记录
- ❌ 试剂库存管理
- ❌ 检测任务分配
- ❌ 检测报告生成
- ❌ 数据统计分析

---

### 5. HRM (人力资源) - ⚠️ 完成度 75%

#### 后端 API 模块
```
/api/v1/departments/*     - 部门管理
/api/v1/employees/*       - 员工管理
/api/v1/positions/*       - 职位管理
/api/v1/contracts/*       - 合同管理
/api/v1/leave/*           - 请假管理
/api/v1/attendance/*      - 考勤管理
/api/v1/recruitment/*     - 招聘管理
/api/v1/payroll/*         - 薪酬管理
/api/v1/performance/*     - 绩效考核
```

#### 前端实现
- ✅ HrmPositionPage.tsx - 职位管理
- ✅ HrmLeavePage.tsx - 请假管理
- ✅ HrmRecruitmentPage.tsx - 招聘管理
- ✅ HrmPayrollPage.tsx - 薪酬管理
- ✅ HrmPerformancePage.tsx - 绩效考核
- ✅ HrmAttendancePage.tsx - 考勤管理

#### 缺失功能
- ❌ 员工档案详情页面
- ❌ 部门组织架构图
- ❌ 合同模板和签订流程
- ❌ 请假审批流程
- ❌ 排班管理
- ❌ 工资条查看

---

### 6. RS (研发管理) - ⚠️ 完成度 40%

#### 后端 API 模块
```
/api/v1/projects/*      - 研发项目
/api/v1/experiments/*   - 实验记录
/api/v1/formulas/*     - 配方管理
/api/v1/materials/*    - 物料管理
/api/v1/patents/*       - 专利管理
/api/v1/ai/*           - AI集成
```

#### 前端实现
- ✅ Rspage.tsx - RS 主页面
- ⚠️ 部分组件 (ProjectList, ExperimentList, FormulaList)

#### 缺失功能
- ❌ 项目看板视图
- ❌ 实验记录详情
- ❌ 配方版本管理
- ❌ 物料库存
- ❌ 专利申请流程
- ❌ 实验报告生成

---

### 7. ERP (企业资源) - ⚠️ 完成度 30%

#### 后端 API 模块
```
/api/v1/companies/*     - 公司管理
/api/v1/departments/*   - 部门管理
/api/v1/employees/*      - 员工管理
/api/v1/assets/*        - 资产管理
/api/v1/contracts/*      - 合同管理
/api/v1/audit/*         - 审计日志
```

#### 前端实现
- ✅ CompanyManagementPage.tsx - 公司管理
- ✅ DepartmentManagementPage.tsx - 部门管理
- ✅ EmployeeManagementPage.tsx - 员工管理
- ✅ FinanceExpensePage.tsx - 费用管理

#### 缺失功能
- ❌ 完整的资产管理
- ❌ 合同管理页面
- ❌ 财务报表
- ❌ 预算管理

---

### 8-19. 其他服务 (QMS, EHS, SRM, PDM, GIS, IM, CRM, MES, SCM, WMS, BI, Integration, Notification, Report) - ❌ 完成度 0-20%

这些服务后端代码存在,但:
- ❌ 前端没有对应的页面
- ❌ 前端 API 文件未实现
- ❌ Vite 代理未配置

## 🐛 当前存在的技术问题

### 1. Vite 代理配置不完整
```
问题: /api, /doc, /erp 都指向 localhost:8001
影响: DOC 服务可能处理不了所有这些请求
建议: 修正代理配置
```

### 2. 服务端口冲突
```
问题: RS 和 AI 都使用 8003 端口
影响: 无法同时运行两个服务
建议: RS 分配独立端口
```

### 3. 健康检查端点不一致
```
问题: 部分后端没有 /health 端点
影响: Dashboard 无法正确检测服务状态
建议: 统一实现 /health 端点
```

### 4. 401 认证错误
```
问题: listUsers 调用返回 401
原因: Token 过期或未正确传递
影响: 用户管理页面无法加载
建议: 实现 Token 自动刷新机制
```

## 📝 待实施计划

### 优先级 1 (紧急 - 影响核心功能)
1. **修复 IAM 认证问题**
   - 实现 Token 自动刷新
   - 添加 /health 端点
   - 优化 401 错误处理

2. **完善 LIMS 前端**
   - 样品管理页面
   - 仪器管理页面
   - 试剂管理页面
   - 检测任务页面

3. **完善 HRM 前端**
   - 员工详情页面
   - 考勤打卡功能
   - 请假审批流程

### 优先级 2 (重要 - 提升用户体验)
4. **完善 RS 前端**
   - 项目详情页面
   - 实验记录页面
   - 配方管理页面

5. **修复 Vite 代理配置**
   - 修正服务端口映射
   - 添加缺失的代理配置

### 优先级 3 (一般 - 扩展功能)
6. **实现未运行的服务**
   - QMS 质量管理
   - EHS 环境健康
   - BI 商业智能
   - Report 报表服务

7. **新增功能**
   - 忘记密码
   - 文档预览
   - 移动端适配
   - 国际化 (i18n)

## 📊 总结

| 模块 | 完成度 | 优先级 | 状态 |
|------|--------|--------|------|
| IAM | 95% | P1 | 🟢 良好 |
| DOC | 80% | P2 | 🟡 需完善 |
| FLOW | 90% | P1 | 🟢 良好 |
| LIMS | 70% | P1 | 🟡 需完善 |
| HRM | 75% | P1 | 🟡 需完善 |
| RS | 40% | P2 | 🔴 待开发 |
| ERP | 30% | P2 | 🔴 待开发 |
| 其他 | 0-20% | P3 | 🔴 未开始 |

**整体系统完成度: ~45%**
