# PM模块技术文档

## 1. 概述

PM（项目管理）模块是TOPEMS平台的核心模块之一，提供项目计划、任务管理、资源分配、进度跟踪等功能，帮助团队高效协作完成项目目标。

> **实施状态**: ✅ 已完成 (2026-06-23)
>
> - 后端 API: ✅ 已完成
> - 前端页面: ✅ 已完成
> - 甘特图组件: ✅ 已完成

### 1.1 功能定位

| 功能类别 | 功能描述 | 状态 |
|----------|----------|------|
| 项目管理 | 项目创建、项目规划、项目状态管理 | ✅ |
| 任务管理 | 任务创建、任务分配、任务状态跟踪 | ✅ |
| 资源管理 | 人员分配、资源调度、工时管理 | ✅ |
| 进度管理 | 甘特图、里程碑、进度跟踪 | ✅ |
| 团队协作 | 团队管理、消息通知、文档共享 | ✅ |
| 报表分析 | 项目报表、资源利用率、成本分析 | ✅ |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      PM模块架构                             │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── PmPage.tsx         # PM主页面                   │
│  └── components/                                           │
│      └── pm/                                               │
│          ├── GanttChart.tsx  # 甘特图组件                │
│          └── TaskCard.tsx    # 任务卡片                  │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── pm.ts                # PM API客户端                   │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL)                              │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── project.rs        # 项目管理                      │
│  │   ├── task.rs           # 任务管理                      │
│  │   ├── resource.rs       # 资源管理                      │
│  │   └── report.rs         # 报表管理                      │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 项目管理

**功能说明**：管理项目的全生命周期。

**数据模型**：

```typescript
interface Project {
  id: string;                    // 项目ID
  name: string;                  // 项目名称
  code: string;                  // 项目编号
  description: string;           // 项目描述
  status: 'planning' | 'active' | 'completed' | 'cancelled'; // 状态
  priority: 'low' | 'medium' | 'high' | 'critical'; // 优先级
  start_date: string;            // 开始日期
  end_date: string;              // 结束日期
  budget: number;                // 预算
  progress: number;              // 进度(%)
  manager_id: string;            // 项目经理ID
  manager_name: string;          // 项目经理名称
  created_at: string;            // 创建时间
}
```

### 2.2 任务管理

**功能说明**：管理项目任务的创建和执行。

**数据模型**：

```typescript
interface Task {
  id: string;                    // 任务ID
  project_id: string;            // 项目ID
  project_name: string;          // 项目名称
  name: string;                  // 任务名称
  description: string;           // 任务描述
  status: 'pending' | 'in_progress' | 'review' | 'completed'; // 状态
  priority: 'low' | 'medium' | 'high'; // 优先级
  assignee_id: string;           // 负责人ID
  assignee_name: string;         // 负责人名称
  start_date: string;            // 开始日期
  end_date: string;              // 结束日期
  parent_id?: string;            // 父任务ID
  progress: number;              // 进度(%)
  created_at: string;            // 创建时间
}
```

### 2.3 资源管理

**功能说明**：管理项目资源和人员分配。

**数据模型**：

```typescript
interface Resource {
  id: string;                    // 资源ID
  name: string;                  // 资源名称
  type: 'human' | 'equipment' | 'material'; // 资源类型
  capacity: number;              // 容量
  allocated: number;             // 已分配量
  unit: string;                  // 单位
  created_at: string;            // 创建时间
}

interface ResourceAllocation {
  id: string;                    // 分配ID
  project_id: string;            // 项目ID
  resource_id: string;           // 资源ID
  resource_name: string;         // 资源名称
  quantity: number;              // 分配数量
  start_date: string;            // 开始日期
  end_date: string;              // 结束日期
  created_at: string;            // 创建时间
}
```

### 2.4 进度管理

**功能说明**：跟踪项目进度和里程碑。

**数据模型**：

```typescript
interface Milestone {
  id: string;                    // 里程碑ID
  project_id: string;            // 项目ID
  name: string;                  // 里程碑名称
  description: string;           // 描述
  target_date: string;           // 目标日期
  status: 'pending' | 'achieved' | 'delayed'; // 状态
  created_at: string;            // 创建时间
}

interface ProgressUpdate {
  id: string;                    // 更新ID
  task_id: string;               // 任务ID
  task_name: string;             // 任务名称
  progress: number;              // 更新后的进度(%)
  comment: string;               // 更新说明
  updated_by: string;            // 更新人
  updated_at: string;            // 更新时间
}
```

---

## 3. API接口文档

### 3.1 项目管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取项目列表 | GET | `/api/v1/pm/projects` |
| 创建项目 | POST | `/api/v1/pm/projects` |
| 获取项目详情 | GET | `/api/v1/pm/projects/:id` |
| 更新项目 | PUT | `/api/v1/pm/projects/:id` |
| 删除项目 | DELETE | `/api/v1/pm/projects/:id` |

### 3.2 任务管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取任务列表 | GET | `/api/v1/pm/tasks` |
| 创建任务 | POST | `/api/v1/pm/tasks` |
| 获取任务详情 | GET | `/api/v1/pm/tasks/:id` |
| 更新任务状态 | PUT | `/api/v1/pm/tasks/:id/status` |
| 更新任务进度 | PUT | `/api/v1/pm/tasks/:id/progress` |

### 3.3 资源管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取资源列表 | GET | `/api/v1/pm/resources` |
| 创建资源 | POST | `/api/v1/pm/resources` |
| 分配资源 | POST | `/api/v1/pm/resources/allocate` |
| 获取资源分配 | GET | `/api/v1/pm/resources/allocation` |

### 3.4 进度管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取里程碑列表 | GET | `/api/v1/pm/milestones` |
| 创建里程碑 | POST | `/api/v1/pm/milestones` |
| 更新里程碑状态 | PUT | `/api/v1/pm/milestones/:id/status` |
| 获取进度更新 | GET | `/api/v1/pm/progress` |
| 记录进度更新 | POST | `/api/v1/pm/progress` |

### 3.5 报表接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取项目报表 | GET | `/api/v1/pm/reports/project/:id` |
| 获取资源利用率 | GET | `/api/v1/pm/reports/resources` |
| 获取任务统计 | GET | `/api/v1/pm/reports/tasks` |

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队