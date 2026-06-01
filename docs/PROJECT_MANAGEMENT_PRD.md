# TOPEMS 项目管理系统 PRD

## 1. 需求概述

### 1.1 业务背景
基于系统设计分析，当前系统已存在研发项目管理（RS模块），但缺少：
- 设计项目管理能力
- 生产项目管理能力
- 项目与合同、收付款、预决算、费用、进度、人员的完整关联

### 1.2 需求目标
建立统一的项目管理体系，实现：
- 项目全生命周期管理（立项→执行→验收→归档）
- 项目与合同、财务、人力的一体化管理
- 支持多种项目类型（研发、生产、设计、建设、服务）

---

## 2. 功能需求分析

### 2.1 功能架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     项目管理系统                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 项目类型管理  │  │ 项目基础信息 │  │ 项目状态管理 │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 项目合同管理  │  │ 收付款管理   │  │ 预决算管理   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 费用报销管理  │  │ 进度管理     │  │ 人员管理     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 项目类型管理

| 项目类型 | 编码 | 描述 | 所属服务 |
|---------|------|------|---------|
| 研发项目 | R&D | 产品研发、技术攻关 | topems-rs |
| 生产项目 | PRODUCTION | 生产线建设、产能扩张 | topems-mes |
| 设计项目 | DESIGN | 产品设计、方案设计 | topems-pdm |
| 建设项目 | CONSTRUCTION | 基建工程、设施建设 | topems-erp |
| 服务项目 | SERVICE | 咨询服务、运维服务 | topems-crm |

### 2.3 核心业务流程

#### 2.3.1 项目创建流程
```
立项申请 → 审批 → 合同签订 → 预算编制 → 人员分配 → 项目启动
```

#### 2.3.2 收付款流程
```
合同签订 → 生成收付款计划 → 到期提醒 → 收付款执行 → 核销
```

#### 2.3.3 费用报销流程
```
费用申请 → 审批 → 预算校验 → 报销支付 → 入账
```

---

## 3. 数据模型设计

### 3.1 实体关系图

```
Project 1 ──── N ProjectContract
Project 1 ──── N ProjectPhase
Project 1 ──── N ProjectMilestone
Project 1 ──── N ProjectMember
Project 1 ──── 1 ProjectBudget
Project 1 ──── N Receivable
Project 1 ──── N Payable
Project 1 ──── N Expense
ProjectContract 1 ──── N PaymentSchedule
ProjectBudget 1 ──── N ProjectBudgetItem
```

### 3.2 模型详细设计

#### 3.2.1 Project（项目主表）

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| id | UUID | PRIMARY KEY | 项目ID |
| name | VARCHAR(200) | NOT NULL | 项目名称 |
| code | VARCHAR(50) | UNIQUE | 项目编号 |
| description | TEXT | NULL | 项目描述 |
| project_type | VARCHAR(50) | NOT NULL | 项目类型（R&D/PRODUCTION/DESIGN/CONSTRUCTION/SERVICE） |
| status | VARCHAR(50) | NOT NULL | 状态（DRAFT/PENDING_APPROVAL/ACTIVE/PAUSED/COMPLETED/CANCELLED） |
| leader | VARCHAR(100) | NOT NULL | 项目经理 |
| budget | DECIMAL(18,2) | NULL | 项目预算 |
| actual_cost | DECIMAL(18,2) | NULL | 实际成本 |
| start_date | TIMESTAMP | NOT NULL | 开始日期 |
| end_date | TIMESTAMP | NULL | 结束日期 |
| progress | INT | DEFAULT 0 | 进度百分比(0-100) |
| created_by | VARCHAR(100) | NOT NULL | 创建人 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 3.2.2 ProjectContract（项目合同）

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| id | UUID | PRIMARY KEY | 合同ID |
| project_id | UUID | FOREIGN KEY | 关联项目 |
| contract_no | VARCHAR(100) | NOT NULL | 合同编号 |
| contract_type | VARCHAR(50) | NOT NULL | 合同类型（SALES/PURCHASE/SERVICE/OTHER） |
| party_a | VARCHAR(200) | NOT NULL | 甲方 |
| party_b | VARCHAR(200) | NOT NULL | 乙方 |
| subject | VARCHAR(500) | NOT NULL | 合同标的 |
| amount | DECIMAL(18,2) | NOT NULL | 合同金额 |
| tax_amount | DECIMAL(18,2) | NULL | 税额 |
| total_amount | DECIMAL(18,2) | NOT NULL | 含税总额 |
| currency | VARCHAR(10) | DEFAULT 'CNY' | 币种 |
| signing_date | TIMESTAMP | NOT NULL | 签订日期 |
| effective_date | TIMESTAMP | NOT NULL | 生效日期 |
| expiration_date | TIMESTAMP | NULL | 到期日期 |
| status | VARCHAR(50) | NOT NULL | 状态（DRAFT/PENDING_APPROVAL/ACTIVE/EXPIRED/TERMINATED） |
| payment_terms | JSON | NULL | 付款条款 |
| attachment_ids | JSON | NULL | 附件ID列表 |
| created_by | VARCHAR(100) | NOT NULL | 创建人 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 3.2.3 ProjectPhase（项目阶段）

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| id | UUID | PRIMARY KEY | 阶段ID |
| project_id | UUID | FOREIGN KEY | 关联项目 |
| phase_number | INT | NOT NULL | 阶段序号 |
| name | VARCHAR(200) | NOT NULL | 阶段名称 |
| description | TEXT | NULL | 阶段描述 |
| start_date | TIMESTAMP | NULL | 开始日期 |
| end_date | TIMESTAMP | NULL | 结束日期 |
| planned_duration_days | INT | NULL | 计划天数 |
| actual_duration_days | INT | NULL | 实际天数 |
| status | VARCHAR(50) | NOT NULL | 状态（NOT_STARTED/IN_PROGRESS/COMPLETED/DELAYED） |
| progress | INT | DEFAULT 0 | 阶段进度 |
| predecessor_id | UUID | FOREIGN KEY | 前置阶段 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 3.2.4 ProjectMilestone（项目里程碑）

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| id | UUID | PRIMARY KEY | 里程碑ID |
| project_id | UUID | FOREIGN KEY | 关联项目 |
| phase_id | UUID | FOREIGN KEY | 关联阶段 |
| name | VARCHAR(200) | NOT NULL | 里程碑名称 |
| description | TEXT | NULL | 里程碑描述 |
| target_date | TIMESTAMP | NOT NULL | 目标日期 |
| actual_date | TIMESTAMP | NULL | 实际完成日期 |
| status | VARCHAR(50) | NOT NULL | 状态（PENDING/ACHIEVED/DELAYED） |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 3.2.5 ProjectMember（项目成员）

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| id | UUID | PRIMARY KEY | 成员ID |
| project_id | UUID | FOREIGN KEY | 关联项目 |
| employee_id | UUID | FOREIGN KEY | 关联员工 |
| role | VARCHAR(50) | NOT NULL | 角色 |
| responsibility | TEXT | NULL | 职责描述 |
| allocation | DECIMAL(5,2) | DEFAULT 1.0 | 投入比例(0-1) |
| join_date | TIMESTAMP | NOT NULL | 加入日期 |
| leave_date | TIMESTAMP | NULL | 离开日期 |
| status | VARCHAR(50) | NOT NULL | 状态（ACTIVE/INACTIVE） |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 3.2.6 ProjectBudget（项目预算）

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| id | UUID | PRIMARY KEY | 预算ID |
| project_id | UUID | FOREIGN KEY | 关联项目 |
| budget_type | VARCHAR(50) | NOT NULL | 预算类型（CAPITAL/OPERATING/EXPENSE） |
| fiscal_year | VARCHAR(4) | NOT NULL | 预算年度 |
| total_budget | DECIMAL(18,2) | NOT NULL | 预算总额 |
| allocated_amount | DECIMAL(18,2) | DEFAULT 0 | 已分配金额 |
| used_amount | DECIMAL(18,2) | DEFAULT 0 | 已使用金额 |
| remaining_amount | DECIMAL(18,2) | DEFAULT 0 | 剩余金额 |
| status | VARCHAR(50) | NOT NULL | 状态（DRAFT/APPROVED/EXECUTING/CLOSED） |
| created_by | VARCHAR(100) | NOT NULL | 创建人 |
| approved_by | VARCHAR(100) | NULL | 审批人 |
| approved_at | TIMESTAMP | NULL | 审批时间 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 3.2.7 ProjectBudgetItem（预算明细项）

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| id | UUID | PRIMARY KEY | 明细ID |
| budget_id | UUID | FOREIGN KEY | 关联预算 |
| category | VARCHAR(100) | NOT NULL | 费用类别 |
| subcategory | VARCHAR(100) | NULL | 费用子类 |
| budget_amount | DECIMAL(18,2) | NOT NULL | 预算金额 |
| used_amount | DECIMAL(18,2) | DEFAULT 0 | 已使用金额 |
| remarks | TEXT | NULL | 备注 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 3.2.8 PaymentSchedule（收付款计划）

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|------|
| id | UUID | PRIMARY KEY | 计划ID |
| receivable_id | UUID | FOREIGN KEY | 关联应收 |
| payable_id | UUID | FOREIGN KEY | 关联应付 |
| project_id | UUID | FOREIGN KEY | 关联项目 |
| contract_id | UUID | FOREIGN KEY | 关联合同 |
| schedule_type | VARCHAR(50) | NOT NULL | 类型（RECEIVE/PAY） |
| due_date | TIMESTAMP | NOT NULL | 到期日期 |
| amount | DECIMAL(18,2) | NOT NULL | 计划金额 |
| status | VARCHAR(50) | NOT NULL | 状态（PENDING/PAID/VOID） |
| actual_payment_date | TIMESTAMP | NULL | 实际付款日期 |
| actual_amount | DECIMAL(18,2) | NULL | 实际金额 |
| remarks | TEXT | NULL | 备注 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

### 3.3 角色枚举定义

| 角色代码 | 角色名称 |
|---------|---------|
| PROJECT_MANAGER | 项目经理 |
| TECH_LEAD | 技术负责人 |
| DEVELOPER | 开发人员 |
| DESIGNER | 设计师 |
| TESTER | 测试人员 |
| ANALYST | 分析师 |
| CONSULTANT | 顾问 |
| CLIENT | 客户方 |
| OTHER | 其他 |

---

## 4. API 接口设计

### 4.1 项目管理接口

| API路径 | 方法 | 功能 | 所属服务 |
|---------|------|------|---------|
| /api/v1/projects | POST | 创建项目 | ERP |
| /api/v1/projects | GET | 查询项目列表 | ERP |
| /api/v1/projects/{id} | GET | 查询项目详情 | ERP |
| /api/v1/projects/{id} | PUT | 更新项目 | ERP |
| /api/v1/projects/{id} | DELETE | 删除项目 | ERP |
| /api/v1/projects/{id}/summary | GET | 项目综合汇总 | ERP |

### 4.2 合同管理接口

| API路径 | 方法 | 功能 | 所属服务 |
|---------|------|------|---------|
| /api/v1/projects/{id}/contracts | POST | 创建项目合同 | ERP |
| /api/v1/projects/{id}/contracts | GET | 查询项目合同列表 | ERP |
| /api/v1/contracts/{id} | GET | 查询合同详情 | ERP |
| /api/v1/contracts/{id} | PUT | 更新合同 | ERP |
| /api/v1/contracts/{id} | DELETE | 删除合同 | ERP |

### 4.3 收付款接口

| API路径 | 方法 | 功能 | 所属服务 |
|---------|------|------|---------|
| /api/v1/projects/{id}/receivables | POST | 创建应收账款 | ERP |
| /api/v1/projects/{id}/receivables | GET | 查询项目应收列表 | ERP |
| /api/v1/projects/{id}/payables | POST | 创建应付账款 | ERP |
| /api/v1/projects/{id}/payables | GET | 查询项目应付列表 | ERP |
| /api/v1/projects/{id}/payment-schedules | GET | 查询收付款计划 | ERP |

### 4.4 预算管理接口

| API路径 | 方法 | 功能 | 所属服务 |
|---------|------|------|---------|
| /api/v1/projects/{id}/budget | POST | 创建项目预算 | ERP |
| /api/v1/projects/{id}/budget | GET | 查询项目预算 | ERP |
| /api/v1/budgets/{id}/items | POST | 创建预算明细 | ERP |
| /api/v1/budgets/{id}/items | GET | 查询预算明细 | ERP |

### 4.5 进度管理接口

| API路径 | 方法 | 功能 | 所属服务 |
|---------|------|------|---------|
| /api/v1/projects/{id}/phases | POST | 创建项目阶段 | RS |
| /api/v1/projects/{id}/phases | GET | 查询项目阶段 | RS |
| /api/v1/phases/{id} | PUT | 更新阶段 | RS |
| /api/v1/projects/{id}/milestones | POST | 创建里程碑 | RS |
| /api/v1/projects/{id}/milestones | GET | 查询里程碑 | RS |

### 4.6 人员管理接口

| API路径 | 方法 | 功能 | 所属服务 |
|---------|------|------|---------|
| /api/v1/projects/{id}/members | POST | 添加项目成员 | RS |
| /api/v1/projects/{id}/members | GET | 查询项目成员 | RS |
| /api/v1/project-members/{id} | PUT | 更新成员信息 | RS |
| /api/v1/project-members/{id} | DELETE | 删除项目成员 | RS |

---

## 5. 实施计划

### 5.1 阶段划分

| 阶段 | 周期 | 目标 |
|------|------|------|
| 第一阶段 | 2周 | 项目基础模型扩展、项目合同模型 |
| 第二阶段 | 2周 | 收付款模型增强、预算模型 |
| 第三阶段 | 2周 | 进度管理、人员管理 |
| 第四阶段 | 2周 | API实现、数据库迁移 |
| 第五阶段 | 1周 | 测试、文档、验收 |

### 5.2 详细任务分解

#### 第一阶段：基础模型扩展（2周）

| 任务 | 子任务 | 负责人 | 工期 |
|------|--------|--------|------|
| 1.1 扩展Project模型 | 添加project_type枚举、actual_cost字段 | 后端开发 | 3天 |
| 1.2 新增ProjectContract模型 | 定义合同实体、创建数据库表 | 后端开发 | 5天 |
| 1.3 数据库迁移脚本 | 编写PostgreSQL迁移SQL | 后端开发 | 2天 |

#### 第二阶段：财务关联（2周）

| 任务 | 子任务 | 负责人 | 工期 |
|------|--------|--------|------|
| 2.1 增强Receivable模型 | 添加project_id、contract_id字段 | 后端开发 | 2天 |
| 2.2 增强Payable模型 | 添加project_id、contract_id字段 | 后端开发 | 2天 |
| 2.3 增强Expense模型 | 添加project_id、contract_id字段 | 后端开发 | 2天 |
| 2.4 新增PaymentSchedule模型 | 收付款计划实体 | 后端开发 | 4天 |
| 2.5 新增ProjectBudget模型 | 项目预算实体 | 后端开发 | 4天 |

#### 第三阶段：进度与人员（2周）

| 任务 | 子任务 | 负责人 | 工期 |
|------|--------|--------|------|
| 3.1 新增ProjectPhase模型 | 阶段实体、依赖关系 | 后端开发 | 4天 |
| 3.2 新增ProjectMilestone模型 | 里程碑实体 | 后端开发 | 3天 |
| 3.3 新增ProjectMember模型 | 人员关联实体 | 后端开发 | 3天 |
| 3.4 数据库迁移脚本 | 编写迁移SQL | 后端开发 | 2天 |

#### 第四阶段：API实现（2周）

| 任务 | 子任务 | 负责人 | 工期 |
|------|--------|--------|------|
| 4.1 项目管理API | CRUD接口实现 | 后端开发 | 4天 |
| 4.2 合同管理API | CRUD接口实现 | 后端开发 | 3天 |
| 4.3 收付款API | 应收应付接口 | 后端开发 | 3天 |
| 4.4 预算API | 预算管理接口 | 后端开发 | 2天 |
| 4.5 进度API | 阶段、里程碑接口 | 后端开发 | 3天 |
| 4.6 人员API | 成员管理接口 | 后端开发 | 2天 |

#### 第五阶段：测试与验收（1周）

| 任务 | 子任务 | 负责人 | 工期 |
|------|--------|--------|------|
| 5.1 单元测试 | 各模块单元测试 | 测试人员 | 3天 |
| 5.2 集成测试 | API集成测试 | 测试人员 | 2天 |
| 5.3 文档编写 | API文档、用户手册 | 技术文档 | 2天 |
| 5.4 验收交付 | 功能验收、部署上线 | 项目经理 | 1天 |

---

## 6. 验收标准

### 6.1 功能验收

| 模块 | 验收项 | 通过标准 |
|------|--------|---------|
| 项目管理 | 创建项目 | 成功创建项目，返回项目ID |
| | 查询项目列表 | 支持按类型、状态筛选 |
| | 更新项目 | 成功更新项目信息 |
| | 删除项目 | 级联删除关联数据 |
| 合同管理 | 创建合同 | 关联项目，合同编号唯一 |
| | 查询合同 | 支持按项目查询 |
| 收付款管理 | 创建应收/应付 | 关联项目和合同 |
| | 收付款计划 | 自动生成计划 |
| 预算管理 | 创建预算 | 关联项目，金额计算正确 |
| | 预算执行 | 费用报销扣减预算 |
| 进度管理 | 创建阶段 | 支持前置阶段依赖 |
| | 创建里程碑 | 关联阶段 |
| 人员管理 | 添加成员 | 关联员工和项目 |
| | 更新成员 | 投入比例变更生效 |

### 6.2 非功能验收

| 指标 | 要求 | 验证方法 |
|------|------|---------|
| API响应时间 | < 500ms | JMeter压测 |
| 数据一致性 | 关联数据同步更新 | 测试数据校验 |
| 并发性能 | 支持100并发 | JMeter压测 |
| 安全性 | 认证授权正确 | API测试 |

---

## 7. 部署与集成

### 7.1 数据库迁移

```bash
# ERP服务迁移
cd services/topems-erp/backend
sqlx migrate run

# RS服务迁移
cd services/topems-rs/backend
sqlx migrate run
```

### 7.2 服务启动顺序

1. PostgreSQL数据库
2. IAM服务（认证依赖）
3. ERP服务（项目主数据）
4. RS服务（研发项目）
5. MES服务（生产项目）
6. PDM服务（设计项目）

---

## 8. 风险评估

| 风险 | 等级 | 应对措施 |
|------|------|---------|
| 数据迁移影响现有业务 | 高 | 先备份，灰度迁移 |
| API接口变更影响前端 | 中 | 版本控制，向后兼容 |
| 跨服务调用性能 | 中 | 增加缓存，异步处理 |
| 并发数据一致性 | 中 | 使用事务，乐观锁 |

---

## 文档版本

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|---------|
| v1.0 | 2026-06-01 | 系统架构师 | 初始版本 |

---

**文档位置**: `docs/PROJECT_MANAGEMENT_PRD.md`
**关联文档**: `docs/SYSTEM_ANALYSIS_REPORT.md`