# TOPEMS Project Core 用户手册

<lark-toc />

## 1. 系统概述

### 1.1 什么是 Project Core

Project Core 是 TOPEMS 企业管理系统的项目管理核心模块，提供完整的项目管理功能，包括：

- 项目管理（项目定义、阶段划分、里程碑管理）
- 任务管理（WBS 分解、任务分配、进度跟踪）
- 资源管理（人员分配、设备分配、成本归集）
- 成本管理（预算编制、实际成本、挣值分析）
- 甘特图可视化（项目进度、阶段、里程碑展示）
- 报表分析（项目进度、成本分析、资源利用率）

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| 项目 | 为实现特定目标而进行的临时性工作，有明确的开始和结束时间 |
| 阶段 | 项目中的主要工作阶段，如"需求分析"、"设计"、"开发"、"测试" |
| 里程碑 | 项目中的重要节点，代表关键交付物或决策点 |
| 任务 | 阶段下的具体工作单元，可分配给人员执行 |
| WBS | Work Breakdown Structure，工作分解结构，将项目分解为可管理的工作单元 |
| 资源 | 执行任务所需的人力、设备、材料等 |
| 挣值分析 | Earned Value Management，评估项目进度和成本绩效的方法 |

### 1.3 项目状态

| 状态 | 说明 |
|------|------|
| `planning` | 规划中，项目正在准备阶段 |
| `active` | 进行中，项目正在执行 |
| `completed` | 已完成，项目目标已实现 |
| `cancelled` | 已取消，项目被终止 |

### 1.4 任务状态

| 状态 | 说明 |
|------|------|
| `pending` | 待开始，任务尚未开始执行 |
| `in_progress` | 进行中，任务正在执行 |
| `review` | 审核中，任务完成待审核 |
| `completed` | 已完成，任务已全部完成 |

### 1.5 甘特图

甘特图是项目进度可视化工具，帮助团队直观了解：

- 项目各阶段的开始和结束时间
- 各阶段的进度百分比
- 里程碑的位置和状态
- 阶段之间的前置依赖关系

```
[规划阶段] ══════════════►
                        ↓
                   [开发阶段] ═════════════════►
                                         ↓
                                    [测试阶段] ═════►
      ★里程碑1           ★里程碑2              ★里程碑3
```

---

## 2. 快速开始

### 2.1 环境准备

确保已启动 PM 服务：

```bash
curl http://localhost:8001/health
```

正常返回：

```json
{
  "status": "healthy",
  "message": "pm-service is running"
}
```

### 2.2 登录获取 Token

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

返回的 `access_token` 用于后续 API 调用：

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1Q..."
  }
}
```

---

## 3. 项目管理

### 3.1 创建项目

**请求示例：**

```bash
curl -X POST http://localhost:8001/api/v1/pm/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "ERP系统升级项目",
    "code": "PRJ2026001",
    "description": "对公司现有ERP系统进行版本升级",
    "project_type": "technology",
    "leader": "张三",
    "start_date": "2026-07-01",
    "end_date": "2026-12-31",
    "budget": 500000,
    "priority": 1,
    "risk_level": "medium"
  }'
```

**项目类型：**

| 类型 | 说明 |
|------|------|
| `technology` | 技术研发项目 |
| `business` | 业务改进项目 |
| `infrastructure` | 基础设施建设 |
| `marketing` | 市场推广项目 |
| `custom` | 自定义类型 |

**优先级：**

| 值 | 说明 |
|---|------|
| 1 | 最高优先级 |
| 2 | 高优先级 |
| 3 | 中优先级 |
| 4 | 低优先级 |

**风险等级：**

| 值 | 说明 |
|---|------|
| `low` | 低风险 |
| `medium` | 中风险 |
| `high` | 高风险 |

### 3.2 查询项目列表

```bash
curl http://localhost:8001/api/v1/pm/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**查询参数：**

| 参数 | 说明 |
|------|------|
| `status` | 按状态筛选（如 `active`） |
| `leader` | 按负责人筛选 |
| `start_date_from` | 开始日期范围起始 |
| `start_date_to` | 开始日期范围结束 |

### 3.3 查询项目详情

```bash
curl http://localhost:8001/api/v1/pm/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.4 更新项目

```bash
curl -X PUT http://localhost:8001/api/v1/pm/projects/PROJECT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "active",
    "progress": 25
  }'
```

### 3.5 删除项目

```bash
curl -X DELETE http://localhost:8001/api/v1/pm/projects/PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4. 阶段管理

### 4.1 创建阶段

**请求示例：**

```bash
curl -X POST http://localhost:8001/api/v1/pm/phases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "project_id": "PROJECT_ID",
    "name": "需求分析",
    "description": "完成业务需求调研和分析",
    "sequence_number": 1,
    "start_date": "2026-07-01",
    "end_date": "2026-07-31"
  }'
```

### 4.2 查询项目阶段列表

```bash
curl http://localhost:8001/api/v1/pm/phases?project_id=PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.3 更新阶段

```bash
curl -X PUT http://localhost:8001/api/v1/pm/phases/PHASE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "progress": 50,
    "status": "in_progress"
  }'
```

### 4.4 设置前置依赖

```bash
curl -X PUT http://localhost:8001/api/v1/pm/phases/PHASE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "predecessor_ids": ["PREVIOUS_PHASE_ID"]
  }'
```

---

## 5. 里程碑管理

### 5.1 创建里程碑

**请求示例：**

```bash
curl -X POST http://localhost:8001/api/v1/pm/milestones \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "project_id": "PROJECT_ID",
    "name": "需求确认",
    "description": "需求文档评审通过",
    "date": "2026-07-31",
    "phase_id": "PHASE_ID"
  }'
```

### 5.2 查询里程碑列表

```bash
curl http://localhost:8001/api/v1/pm/milestones?project_id=PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.3 更新里程碑状态

```bash
curl -X PUT http://localhost:8001/api/v1/pm/milestones/MILESTONE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "completed"
  }'
```

**里程碑状态：**

| 状态 | 说明 |
|------|------|
| `pending` | 待达成 |
| `achieved` | 已达成 |
| `delayed` | 已延迟 |

---

## 6. 任务管理

### 6.1 创建任务

**请求示例：**

```bash
curl -X POST http://localhost:8001/api/v1/pm/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "project_id": "PROJECT_ID",
    "phase_id": "PHASE_ID",
    "name": "用户访谈",
    "description": "对关键用户进行访谈，收集业务需求",
    "priority": "high",
    "start_date": "2026-07-01",
    "end_date": "2026-07-15",
    "assignee_id": "USER_ID"
  }'
```

**任务优先级：**

| 值 | 说明 |
|---|------|
| `high` | 高优先级 |
| `medium` | 中优先级 |
| `low` | 低优先级 |

### 6.2 查询任务列表

```bash
curl http://localhost:8001/api/v1/pm/tasks?project_id=PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**查询参数：**

| 参数 | 说明 |
|------|------|
| `project_id` | 项目ID |
| `phase_id` | 阶段ID |
| `status` | 任务状态 |
| `assignee_id` | 负责人ID |

### 6.3 更新任务状态

```bash
curl -X PUT http://localhost:8001/api/v1/pm/tasks/TASK_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "completed"
  }'
```

### 6.4 更新任务进度

```bash
curl -X PUT http://localhost:8001/api/v1/pm/tasks/TASK_ID/progress \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "progress": 80,
    "comment": "大部分功能已完成"
  }'
```

---

## 7. 甘特图

### 7.1 获取甘特图数据

```bash
curl http://localhost:8001/api/v1/pm/projects/PROJECT_ID/gantt \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "phases": [
      {
        "id": "PHASE_UUID",
        "name": "需求分析",
        "project_id": "PROJECT_UUID",
        "start_date": "2026-07-01",
        "end_date": "2026-07-31",
        "progress": 60,
        "status": "in_progress",
        "predecessor_ids": []
      }
    ],
    "milestones": [
      {
        "id": "MILESTONE_UUID",
        "name": "需求确认",
        "project_id": "PROJECT_UUID",
        "date": "2026-07-31",
        "status": "pending"
      }
    ],
    "resources": []
  }
}
```

### 7.2 甘特图功能说明

**缩放控制：**
- 支持 50%-150% 缩放
- 缩放影响日期条形图的宽度

**滚动导航：**
- 左右箭头按钮滚动时间轴
- 也可直接拖动滚动条

**状态颜色：**
- 蓝色：进行中
- 绿色：已完成
- 灰色：未开始

**里程碑标记：**
- 黄色圆点标记里程碑位置
- 悬停显示里程碑名称

---

## 8. 资源管理

### 8.1 创建资源分配

**请求示例：**

```bash
curl -X POST http://localhost:8001/api/v1/pm/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "project_id": "PROJECT_ID",
    "resource_type": "human",
    "resource_id": "USER_ID",
    "role": "developer",
    "start_date": "2026-07-01",
    "end_date": "2026-10-31",
    "allocation_percent": 80
  }'
```

**资源类型：**

| 类型 | 说明 |
|------|------|
| `human` | 人力资源 |
| `equipment` | 设备资源 |
| `material` | 材料资源 |

### 8.2 查询资源分配列表

```bash
curl http://localhost:8001/api/v1/pm/resources?project_id=PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 9. 成本管理

### 9.1 查询项目成本

```bash
curl http://localhost:8001/api/v1/pm/projects/PROJECT_ID/cost \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "budget": 500000,
    "actual_cost": 125000,
    "committed_cost": 50000,
    "remaining_budget": 325000,
    "cost_variance": -125000,
    "cost_variance_rate": -25,
    "budget_utilization_rate": 35
  }
}
```

### 9.2 成本字段说明

| 字段 | 说明 |
|------|------|
| `budget` | 项目预算 |
| `actual_cost` | 实际发生成本 |
| `committed_cost` | 已承诺成本（已下单未付款） |
| `remaining_budget` | 剩余预算 |
| `cost_variance` | 成本差异（负数表示超支） |
| `cost_variance_rate` | 成本差异率（百分比） |
| `budget_utilization_rate` | 预算使用率 |

---

## 10. 挣值分析

### 10.1 获取挣值分析数据

```bash
curl http://localhost:8001/api/v1/pm/projects/PROJECT_ID/benefit-analysis \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_planned_cost": 500000,
      "total_actual_cost": 125000,
      "total_planned_value": 150000,
      "total_earned_value": 120000,
      "period_count": 3
    },
    "eva": {
      "cpi": 0.96,
      "spi": 0.8,
      "cv": -5000,
      "sv": -30000,
      "eac": 520833,
      "etc": 400833,
      "roi": 2.5
    },
    "trend": {
      "cpi_status": "warning",
      "spi_status": "critical",
      "cost_status": "overrun"
    }
  }
}
```

### 10.2 挣值指标说明

| 指标 | 说明 | 判断标准 |
|------|------|----------|
| `CPI` | 成本绩效指数 | >1 省钱，<1 超支 |
| `SPI` | 进度绩效指数 | >1 提前，<1 延期 |
| `CV` | 成本差异 | 正数省钱，负数超支 |
| `SV` | 进度差异 | 正数提前，负数延期 |
| `EAC` | 预估完成成本 | 预计项目最终花费 |
| `ETC` | 预估剩余成本 | 预计剩余工作花费 |
| `ROI` | 投资回报率 | 越高越好 |

---

## 11. 项目仪表盘

### 11.1 获取项目仪表盘数据

```bash
curl http://localhost:8001/api/v1/pm/projects/PROJECT_ID/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "project": { ... },
    "progress": {
      "planned": 30,
      "actual": 25,
      "trend": "behind",
      "completed_phases": 1,
      "total_phases": 4
    },
    "budget": { ... },
    "members": [ ... ],
    "equipment": [ ... ],
    "benefits": {
      "spi": 0.83,
      "milestones_achieved": 1,
      "total_milestones": 3
    },
    "risks": [ ... ]
  }
}
```

---

## 12. API 参考

### 12.1 基础信息

| 项目 | 值 |
|------|-----|
| 基础URL | `http://localhost:8001/api/v1/pm` |
| 认证方式 | Bearer Token (JWT) |
| Content-Type | `application/json` |

### 12.2 完整 API 列表

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/projects` | 创建项目 |
| GET | `/projects` | 查询项目列表 |
| GET | `/projects/{id}` | 查询项目详情 |
| PUT | `/projects/{id}` | 更新项目 |
| DELETE | `/projects/{id}` | 删除项目 |
| GET | `/projects/{id}/gantt` | 获取甘特图数据 |
| GET | `/projects/{id}/cost` | 获取项目成本 |
| GET | `/projects/{id}/benefit-analysis` | 获取挣值分析 |
| GET | `/projects/{id}/dashboard` | 获取项目仪表盘 |
| POST | `/phases` | 创建阶段 |
| GET | `/phases` | 查询阶段列表 |
| PUT | `/phases/{id}` | 更新阶段 |
| DELETE | `/phases/{id}` | 删除阶段 |
| POST | `/milestones` | 创建里程碑 |
| GET | `/milestones` | 查询里程碑列表 |
| PUT | `/milestones/{id}` | 更新里程碑 |
| DELETE | `/milestones/{id}` | 删除里程碑 |
| POST | `/tasks` | 创建任务 |
| GET | `/tasks` | 查询任务列表 |
| PUT | `/tasks/{id}` | 更新任务 |
| PUT | `/tasks/{id}/status` | 更新任务状态 |
| PUT | `/tasks/{id}/progress` | 更新任务进度 |
| DELETE | `/tasks/{id}` | 删除任务 |
| POST | `/resources` | 创建资源分配 |
| GET | `/resources` | 查询资源分配列表 |
| PUT | `/resources/{id}` | 更新资源分配 |
| DELETE | `/resources/{id}` | 删除资源分配 |

### 12.3 响应格式

所有 API 返回统一格式：

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2026-06-23T10:00:00Z"
}
```

**错误响应：**

```json
{
  "success": false,
  "data": null,
  "message": "错误描述",
  "timestamp": "2026-06-23T10:00:00Z"
}
```

---

## 13. 前端页面路由

| 页面 | 路由 | 说明 |
|------|------|------|
| 项目列表 | `/pm/projects` | 显示所有项目 |
| 项目详情 | `/pm/projects/:id` | 显示项目详细信息、甘特图、阶段、里程碑等 |
| 创建项目 | `/pm/projects/new` | 创建新项目表单 |
| 编辑项目 | `/pm/projects/:id/edit` | 编辑项目信息 |

---

## 14. 常见问题

### 14.1 创建项目失败 - 编码已存在

**错误信息：** `项目编码已存在`

**解决方案：** 使用唯一的项目编码，如 `PRJ2026002`。

### 14.2 甘特图不显示数据

**可能原因：**
1. 项目尚未创建阶段
2. 阶段没有设置开始和结束日期

**解决方案：** 确保项目下有设置了日期的阶段。

### 14.3 任务无法分配

**可能原因：**
1. 任务所属的阶段尚未创建
2. 负责人用户 ID 不存在

**解决方案：** 先创建阶段，再创建任务并分配。

### 14.4 成本数据不准确

**可能原因：**
1. 资源分配未记录实际成本
2. 费用报销未关联项目

**解决方案：** 确保所有资源分配和费用报销都关联到项目。

---

## 附录 A: 数据类型

### A.1 UUID 格式

所有 ID 字段使用 UUID 格式：

```
550e8400-e29b-41d4-a716-446655440000
```

### A.2 时间格式

| 格式 | 示例 |
|------|------|
| 日期 | `2026-07-15` |
| 时间戳 | `2026-07-15T00:00:00Z` |

### A.3 金额格式

金额字段使用数字类型：

```json
{
  "budget": 500000,
  "actual_cost": 125000.50
}
```

---

*文档版本：1.0.0*
*最后更新：2026-06-23*
*更新内容：*
- *v1.0.0 初始版本*
