# TOPEMS 工作流引擎 - 详细设计方案

---

## 文档信息

| 属性 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-06-03 |
| 作者 | TOPEMS Team |
| 状态 | 已批准 |
| 适用版本 | TOPEMS v1.0 |

---

## 目录

1. [项目管理类型分析](#1-项目管理类型分析)
2. [工作流体系细化设计](#2-工作流体系细化设计)
3. [实施计划](#3-实施计划)
4. [架构设计](#4-架构设计)
5. [数据库设计](#5-数据库设计)
6. [API 接口设计](#6-api-接口设计)
7. [安全性考虑](#7-安全性考虑)
8. [迭代计划](#8-迭代计划)

---

## 1. 项目管理类型分析

### 1.1 项目管理类型概览

基于 TOPEMS 平台的业务需求，识别出以下 **5 种核心项目管理类型**：

| 类型 | 描述 | 特点 | 典型场景 |
|------|------|------|----------|
| **产品研发项目** | 软件产品开发、功能迭代 | 需求驱动、敏捷迭代 | 新功能开发、Bug修复 |
| **基础设施项目** | IT基础设施建设、运维 | 资源密集、周期长 | 服务器迁移、系统升级 |
| **营销活动项目** | 市场推广、活动策划 | 时间敏感、跨部门协作 | 产品发布、促销活动 |
| **采购项目** | 物资采购、供应商管理 | 流程驱动、合规要求 | 设备采购、服务外包 |
| **改进优化项目** | 流程优化、质量改进 | 持续性、跨组织 | ISO认证、效率提升 |

### 1.2 各类型特征对比

| 维度 | 产品研发 | 基础设施 | 营销活动 | 采购项目 | 改进优化 |
|------|----------|----------|----------|----------|----------|
| **生命周期** | 迭代式 | 阶段式 | 事件驱动 | 流程式 | 持续式 |
| **优先级** | 业务价值 | 稳定性 | 时效性 | 成本控制 | 质量提升 |
| **风险类型** | 技术风险 | 实施风险 | 市场风险 | 合规风险 | 变革风险 |
| **核心指标** | 交付速度 | 可用性 | ROI | 成本节约 | 效率提升 |

---

## 2. 工作流体系细化设计

### 2.1 工作流分类架构

```
工作流体系
├── 日常行政类
│   ├── 请假审批流程 (WF001)
│   ├── 报销审批流程 (WF002)
│   ├── 办公用品申请流程 (WF003)
│   ├── 出差申请流程 (WF004)
│   ├── 加班申请流程 (WF005)
│   └── 用章申请流程 (WF006)
├── 业务流程类
│   ├── 采购审批流程 (WF007)
│   ├── 合同审批流程 (WF008)
│   ├── 付款申请流程 (WF009)
│   └── 费用预算申请流程 (WF010)
└── 项目管理类
    ├── 项目立项审批流程 (WF011)
    ├── 项目变更申请流程 (WF012)
    ├── 资源调配申请流程 (WF013)
    └── 项目结项审批流程 (WF014)
```

### 2.2 工作流定义规范

#### 2.2.1 节点类型定义

| 节点类型 | 标识 | 说明 | 必需字段 |
|----------|------|------|----------|
| 开始节点 | `start` | 流程起始点 | `node_id`, `name` |
| 审批节点 | `approval` | 需要人工审批 | `approvers`, `approval_type` |
| 条件节点 | `condition` | 分支判断 | `conditions`, `next_nodes` |
| 自动节点 | `auto` | 自动执行 | `action` |
| 结束节点 | `end` | 流程结束 | `node_id`, `name` |

#### 2.2.2 审批类型定义

| 类型 | 标识 | 说明 | 适用场景 |
|------|------|------|----------|
| 单人审批 | `single` | 单个审批人决定 | 日常审批 |
| 会签 | `counter` | 所有审批人必须同意 | 重要决策 |
| 或签 | `or` | 任一审批人同意即可 | 快速审批 |

#### 2.2.3 条件操作符定义

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `>` | 大于 | `{"field": "amount", "operator": ">", "value": 1000}` |
| `<` | 小于 | `{"field": "days", "operator": "<", "value": 3}` |
| `>=` | 大于等于 | `{"field": "budget", "operator": ">=", "value": 5000}` |
| `<=` | 小于等于 | `{"field": "risk_level", "operator": "<=", "value": "medium"}` |
| `==` | 等于 | `{"field": "type", "operator": "==", "value": "urgent"}` |
| `!=` | 不等于 | `{"field": "status", "operator": "!=", "value": "cancelled"}` |
| `in` | 包含于 | `{"field": "category", "operator": "in", "value": ["A", "B"]}` |

### 2.3 各工作流详细设计

#### 2.3.1 日常行政类

**WF001 - 请假审批流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交申请 | - | - |
| 2 | manager_approval | 主管审批 | role:department_manager | 48h |
| 3 | hr_approval | HR审批 | role:hr | 24h |

**WF002 - 报销审批流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交报销 | - | - |
| 2 | manager_approval | 主管审批 | role:department_manager | 24h |
| 3 | finance_approval | 财务审核 | role:finance | 48h |

**WF003 - 办公用品申请流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交申请 | - | - |
| 2 | admin_check | 行政审核 | role:admin | 24h |
| 3 | warehouse | 仓库发货 | role:warehouse | 48h |

**WF004 - 出差申请流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交申请 | - | - |
| 2 | manager_approval | 主管审批 | role:department_manager | 24h |
| 3 | finance_record | 财务备案 | role:finance | 12h |

**WF005 - 加班申请流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交申请 | - | - |
| 2 | manager_approval | 主管审批 | role:department_manager | 12h |
| 3 | hr_record | HR记录 | role:hr | 24h |

**WF006 - 用章申请流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交申请 | - | - |
| 2 | manager_approval | 部门审批 | role:department_manager | 12h |
| 3 | legal_check | 法务审核 | role:legal | 12h |
| 4 | admin_stamp | 盖章登记 | role:admin | 6h |

#### 2.3.2 业务流程类

**WF007 - 采购审批流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 | 条件 |
|------|--------|------|--------|----------|------|
| 1 | submit | 提交采购申请 | - | - | - |
| 2 | dept_manager | 部门经理审批 | role:department_manager | 24h | amount > 1000 |
| 3 | finance | 财务审批 | role:finance_manager, role:finance | 48h | 会签 |
| 4 | purchase | 采购执行 | role:purchase | 72h | - |

**WF008 - 合同审批流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交合同 | - | - |
| 2 | legal_review | 法务审核 | role:legal | 72h |
| 3 | dept_manager | 部门审批 | role:department_manager | 24h |
| 4 | executive | 高管审批 | role:executive | 48h |
| 5 | sign | 盖章签署 | role:admin | 24h |

**WF009 - 付款申请流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交申请 | - | - |
| 2 | manager_approval | 主管审批 | role:department_manager | 24h |
| 3 | finance_check | 财务审核 | role:finance | 24h |
| 4 | finance_manager | 财务经理审批 | role:finance_manager | 24h |
| 5 | payment | 付款执行 | role:finance | 48h |

**WF010 - 费用预算申请流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交预算 | - | - |
| 2 | dept_manager | 部门确认 | role:department_manager | 48h |
| 3 | finance_review | 财务评审 | role:finance_manager | 72h |
| 4 | executive | 管理层审批 | role:executive | 48h |
| 5 | finalize | 预算生效 | role:finance | 24h |

#### 2.3.3 项目管理类

**WF011 - 项目立项审批流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交立项 | - | - |
| 2 | tech_review | 技术评审 | role:tech_lead | 72h |
| 3 | finance_estimate | 财务评估 | role:finance | 48h |
| 4 | project_committee | 项目委员会 | role:executive, role:tech_director, role:finance_manager | 72h |
| 5 | kickoff | 项目启动 | role:project_manager | 24h |

**WF012 - 项目变更申请流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交变更 | - | - |
| 2 | pm_review | 项目经理审核 | role:project_manager | 24h |
| 3 | stakeholder | 相关方确认 | role:department_manager, role:tech_lead | 48h |
| 4 | executive_approval | 管理层审批 | role:executive | 24h |
| 5 | update_plan | 更新计划 | role:project_manager | 12h |

**WF013 - 资源调配申请流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交申请 | - | - |
| 2 | current_pm | 原项目经理 | role:project_manager | 24h |
| 3 | target_pm | 目标项目经理 | role:project_manager | 24h |
| 4 | resource_manager | 资源经理审批 | role:resource_manager | 24h |
| 5 | notify | 通知执行 | role:hr | 12h |

**WF014 - 项目结项审批流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 |
|------|--------|------|--------|----------|
| 1 | submit | 提交结项 | - | - |
| 2 | pm_summary | 项目经理总结 | role:project_manager | 48h |
| 3 | stakeholder_review | 相关方验收 | role:department_manager, role:tech_lead | 72h |
| 4 | finance_audit | 财务审计 | role:finance | 48h |
| 5 | archive | 项目归档 | role:admin | 24h |

#### 2.3.4 工地施工类

**WF015 - 施工许可证申请流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 | 说明 |
|------|--------|------|--------|----------|------|
| 1 | submit | 提交申请 | - | - | 提交施工许可申请材料 |
| 2 | safety_check | 安全审核 | role:safety_manager | 48h | 安全措施审查 |
| 3 | engineering_review | 工程审查 | role:engineer | 72h | 施工方案审查 |
| 4 | fire_approval | 消防审批 | role:fire_safety | 48h | 消防设施审查 |
| 5 | environmental_check | 环保审查 | role:environmental | 24h | 环保措施审查 |
| 6 | permit_issue | 发证 | role:construction_manager | 24h | 颁发施工许可证 |

**WF016 - 材料进场验收流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 | 说明 |
|------|--------|------|--------|----------|------|
| 1 | submit | 提交报验 | - | - | 材料供应商提交报验单 |
| 2 | warehouse_check | 仓库验收 | role:warehouse | 12h | 数量核对 |
| 3 | quality_inspection | 质量检验 | role:qc_engineer | 24h | 质量检测 |
| 4 | engineer_approval | 工程师确认 | role:site_engineer | 12h | 技术参数确认 |
| 5 | acceptance | 验收通过 | role:construction_manager | 12h | 最终确认 |

**WF017 - 工程质量验收流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 | 说明 |
|------|--------|------|--------|----------|------|
| 1 | submit | 申请验收 | - | - | 施工班组申请分项验收 |
| 2 | self_inspection | 自检 | role:foreman | 24h | 施工班组自检 |
| 3 | qc_inspection | QC检验 | role:qc_manager | 48h | 质量控制检验 |
| 4 | engineer_acceptance | 工程师验收 | role:site_engineer | 48h | 专业工程师验收 |
| 5 | signature | 签字确认 | role:construction_manager | 24h | 项目负责人确认 |

**WF018 - 工程竣工验收流程**

| 步骤 | 节点ID | 名称 | 审批人 | 超时时间 | 说明 |
|------|--------|------|--------|----------|------|
| 1 | submit | 提交申请 | - | - | 提交竣工验收申请 |
| 2 | document_review | 资料审核 | role:document_control | 72h | 竣工资料审查 |
| 3 | on_site_inspection | 现场检查 | role:chief_engineer | 72h | 现场实地检查 |
| 4 | safety_evaluation | 安全评估 | role:safety_manager | 48h | 安全设施评估 |
| 5 | quality_assessment | 质量评定 | role:qc_manager | 48h | 工程质量评定 |
| 6 | acceptance_meeting | 验收会议 | role:project_owner, role:construction_manager, role:designer | 72h | 多方验收会议 |
| 7 | certificate_issue | 发合格证 | role:construction_manager | 24h | 颁发竣工验收合格证 |

---

## 3. 实施计划

### 3.1 实施阶段划分

| 阶段 | 时间 | 目标 | 交付物 |
|------|------|------|--------|
| **Phase 1** | 第1-2周 | 基础设施搭建 | 数据库、API框架、认证机制 |
| **Phase 2** | 第3-4周 | 核心工作流引擎 | 流程定义、执行引擎、审批处理 |
| **Phase 3** | 第5-6周 | 预置工作流部署 | 14个预置工作流、测试验证 |
| **Phase 4** | 第7-8周 | 前端集成 | UI组件、交互流程、用户体验 |
| **Phase 5** | 第9-10周 | 优化迭代 | 性能优化、Bug修复、文档完善 |

### 3.2 里程碑

| 里程碑 | 描述 | 时间 |
|--------|------|------|
| M1 | 数据库与API框架就绪 | 第2周 |
| M2 | 工作流引擎核心功能完成 | 第4周 |
| M3 | 所有预置工作流上线 | 第6周 |
| M4 | 前端集成完成 | 第8周 |
| M5 | 项目交付 | 第10周 |

---

## 4. 架构设计

### 4.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      前端层 (Frontend)                      │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ 工作流  │  │ 审批中心 │  │ 流程监控 │  │ 流程设计器  │  │
│  │ 管理页  │  │          │  │          │  │             │  │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘  │
└───────┼─────────────┼─────────────┼───────────────┼──────────┘
        │             │             │               │
        ▼             ▼             ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 网关层 (API Gateway)               │
│              CORS | 认证 | 限流 | 日志 | 监控               │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   工作流API  │    │   实例API    │    │   审批API    │
│  /workflows │    │  /instances  │    │  /approvals  │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └──────────┬────────┴──────────┬────────┘
                  ▼                   ▼
         ┌───────────────┐    ┌───────────────┐
         │   服务层      │    │   引擎层      │
         │ Service Layer│    │ Engine Layer  │
         │ - CRUD操作   │    │ - 流程解析    │
         │ - 业务逻辑   │    │ - 状态流转    │
         │ - 事务管理   │    │ - 条件判断    │
         └───────┬──────┘    └───────┬──────┘
                 │                   │
                 └──────────┬────────┘
                            ▼
                 ┌─────────────────┐
                 │    数据层       │
                 │ PostgreSQL      │
                 │ - workflows    │
                 │ - instances    │
                 │ - approvals    │
                 │ - notifications│
                 └─────────────────┘
```

### 4.2 核心组件说明

| 组件 | 职责 | 技术实现 |
|------|------|----------|
| **API网关** | 请求路由、认证、限流 | Axum Middleware |
| **工作流服务** | 工作流CRUD、版本管理 | Rust + SQLx |
| **流程引擎** | 流程解析、状态机执行 | 状态模式 + 策略模式 |
| **审批服务** | 审批任务分发、处理 | 事件驱动 |
| **通知服务** | 消息推送、提醒 | WebSocket + 邮件 |

---

## 5. 数据库设计

### 5.1 核心表结构

**workflows 表**

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PRIMARY KEY | 工作流唯一标识 |
| name | VARCHAR(100) | NOT NULL | 工作流名称 |
| description | VARCHAR(500) | NULL | 描述 |
| definition | JSONB | NOT NULL | 流程定义JSON |
| is_active | BOOLEAN | DEFAULT true | 是否启用 |
| created_by | UUID | NULL | 创建人 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**workflow_instances 表**

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PRIMARY KEY | 实例唯一标识 |
| workflow_id | UUID | FOREIGN KEY | 关联工作流 |
| status | VARCHAR(20) | NOT NULL | 状态(running/completed/cancelled) |
| current_node | VARCHAR(50) | NOT NULL | 当前节点 |
| initiator_id | UUID | NULL | 发起人 |
| data | JSONB | NULL | 流程数据 |
| started_at | TIMESTAMP | NULL | 开始时间 |
| completed_at | TIMESTAMP | NULL | 完成时间 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

**approvals 表**

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PRIMARY KEY | 审批任务标识 |
| workflow_instance_id | UUID | FOREIGN KEY | 关联实例 |
| node_id | VARCHAR(50) | NOT NULL | 节点ID |
| task_name | VARCHAR(100) | NOT NULL | 任务名称 |
| assignee_id | UUID | NOT NULL | 审批人 |
| status | VARCHAR(20) | DEFAULT 'pending' | 状态 |
| approval_type | VARCHAR(20) | NOT NULL | 审批类型 |
| comment | TEXT | NULL | 审批意见 |
| approved_by | UUID | NULL | 处理人 |
| approved_at | TIMESTAMP | NULL | 处理时间 |
| timeout_at | TIMESTAMP | NULL | 超时时间 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

**notifications 表**

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PRIMARY KEY | 通知标识 |
| user_id | UUID | NOT NULL | 接收用户 |
| type | VARCHAR(20) | NOT NULL | 通知类型 |
| title | VARCHAR(200) | NOT NULL | 标题 |
| content | TEXT | NOT NULL | 内容 |
| metadata | JSONB | NULL | 元数据 |
| is_read | BOOLEAN | DEFAULT false | 是否已读 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

---

## 6. API 接口设计

### 6.1 接口总览

| 模块 | 方法 | 端点 | 说明 |
|------|------|------|------|
| 工作流 | GET | /api/v1/workflows | 列表查询 |
| 工作流 | POST | /api/v1/workflows | 创建工作流 |
| 工作流 | GET | /api/v1/workflows/{id} | 获取详情 |
| 工作流 | PUT | /api/v1/workflows/{id} | 更新工作流 |
| 工作流 | DELETE | /api/v1/workflows/{id} | 删除工作流 |
| 实例 | GET | /api/v1/instances | 列表查询 |
| 实例 | POST | /api/v1/instances | 创建实例 |
| 实例 | GET | /api/v1/instances/{id} | 获取详情 |
| 审批 | GET | /api/v1/approvals | 列表查询 |
| 审批 | POST | /api/v1/approvals/{id}/process | 处理审批 |
| 通知 | GET | /api/v1/notifications/{user_id} | 获取通知 |
| 通知 | POST | /api/v1/notifications/{user_id}/read | 标记已读 |

### 6.2 接口详细设计

**POST /api/v1/workflows - 创建工作流**

请求体：
```json
{
  "name": "请假审批流程",
  "description": "员工请假审批",
  "definition": {
    "version": "1.0",
    "nodes": [...],
    "start_node": "submit",
    "end_nodes": ["end"]
  }
}
```

响应：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "请假审批流程",
    "description": "员工请假审批",
    "definition": {...},
    "is_active": true,
    "created_at": "2026-06-03T00:00:00Z"
  },
  "message": "Workflow created successfully"
}
```

**POST /api/v1/instances - 创建流程实例**

请求体：
```json
{
  "workflow_id": "uuid",
  "created_by": "user_id",
  "data": {
    "leave_days": 3,
    "reason": "个人事务"
  }
}
```

响应：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workflow_id": "uuid",
    "status": "running",
    "current_node": "manager_approval",
    "data": {...},
    "started_at": "2026-06-03T00:00:00Z"
  },
  "message": "Workflow instance started successfully"
}
```

**POST /api/v1/approvals/{id}/process - 处理审批**

请求体：
```json
{
  "action": "approve",
  "comment": "同意申请",
  "actor_id": "user_id",
  "actor_name": "张三"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "approval": {...},
    "instance": {...}
  },
  "message": "Approval processed successfully"
}
```

---

## 7. 安全性考虑

### 7.1 认证与授权

| 机制 | 说明 |
|------|------|
| JWT Token | 无状态认证，过期时间24小时 |
| 角色权限 | 基于角色的访问控制(RBAC) |
| 资源权限 | 细粒度权限检查 |
| 开发模式 | 可配置跳过认证 |

### 7.2 数据安全

| 措施 | 说明 |
|------|------|
| 输入验证 | 请求参数校验 |
| SQL注入防护 | 使用参数化查询 |
| 敏感数据加密 | 数据库传输加密 |
| 日志脱敏 | 敏感字段不记录 |

### 7.3 业务安全

| 措施 | 说明 |
|------|------|
| 超时处理 | 自动处理超时审批 |
| 重复提交检测 | 防止重复创建 |
| 权限隔离 | 审批人只能处理自己的任务 |
| 审计日志 | 记录所有操作 |

---

## 8. 迭代计划

### 8.1 版本路线图

| 版本 | 时间 | 目标 | 关键特性 |
|------|------|------|----------|
| **v1.0** | 2026-Q2 | 基础版本 | 核心工作流引擎、14个预置流程 |
| **v1.1** | 2026-Q3 | 增强版本 | 可视化流程设计器、高级条件分支 |
| **v1.2** | 2026-Q4 | 扩展版本 | 集成外部系统、移动端支持 |
| **v2.0** | 2027-Q1 | 企业版本 | SLA管理、多租户支持 |

### 8.2 迭代优先级

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P0 | 流程设计器 | 可视化创建/编辑工作流 |
| P1 | 条件分支 | 支持复杂业务规则 |
| P2 | 通知增强 | 邮件/短信/钉钉通知 |
| P3 | 报表分析 | 流程效率统计 |
| P4 | 移动端 | 移动端审批 |

---

## 附录：工作流ID映射表

| 工作流ID | 名称 | 分类 |
|----------|------|------|
| WF001 | 请假审批流程 | 日常行政 |
| WF002 | 报销审批流程 | 日常行政 |
| WF003 | 办公用品申请流程 | 日常行政 |
| WF004 | 出差申请流程 | 日常行政 |
| WF005 | 加班申请流程 | 日常行政 |
| WF006 | 用章申请流程 | 日常行政 |
| WF007 | 采购审批流程 | 业务流程 |
| WF008 | 合同审批流程 | 业务流程 |
| WF009 | 付款申请流程 | 业务流程 |
| WF010 | 费用预算申请流程 | 业务流程 |
| WF011 | 项目立项审批流程 | 项目管理 |
| WF012 | 项目变更申请流程 | 项目管理 |
| WF013 | 资源调配申请流程 | 项目管理 |
| WF014 | 项目结项审批流程 | 项目管理 |
| WF015 | 施工许可证申请流程 | 工地施工 |
| WF016 | 材料进场验收流程 | 工地施工 |
| WF017 | 工程质量验收流程 | 工地施工 |
| WF018 | 工程竣工验收流程 | 工地施工 |

---

**文档结束**

---

*本设计方案为 TOPEMS 工作流引擎的核心设计文档，包含完整的架构设计、数据库设计、API设计和实施计划。文档将作为后续迭代的基础参考。*
