# RD模块技术文档

## 1. 概述

RD（研发管理 Research & Development）模块是 TOPEMS 平台专为研发项目管理设计的核心业务模块。代码后端服务目录为 `svc/rd/`，前端 API 客户端位于 `apps/web/src/api/rd/`，前端页面位于 `apps/web/src/pages/rd/`。提供项目管理、实验管理、配方管理、专利管理等功能。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 项目管理 | 研发项目立项、进度跟踪、资源分配 |
| 实验管理 | 实验记录、数据采集、数据分析 |
| 配方管理 | 配方版本、配方验证、配方审批 |
| 专利管理 | 专利申请、专利维护、专利检索 |
| 物料管理 | 研发物料、试剂管理、样品管理 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      RD模块架构                             │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/rd/                                             │
│  │   ├── DashboardPage.tsx          # RD 仪表盘            │
│  │   ├── RsProjectListPage.tsx     # 项目列表（历史命名）  │
│  │   ├── RsProjectDetailPage.tsx   # 项目详情（历史命名）  │
│  │   ├── RsExperimentListPage.tsx  # 实验列表（历史命名）  │
│  │   ├── RsFormulaListPage.tsx     # 配方列表（历史命名）  │
│  │   └── ... 其他 RD 模块页面                             │
│  └── components/                                           │
│      └── rd/                                               │
│          ├── ProjectForm.tsx      # 项目表单               │
│          └── ExperimentForm.tsx   # 实验表单               │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── api/rd/index.ts       # RD API 客户端（统一入口）     │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL, svc/rd/)                     │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── project.rs        # 项目管理                      │
│  │   ├── experiment.rs     # 实验管理                      │
│  │   ├── formula.rs        # 配方管理                      │
│  │   └── patent.rs         # 专利管理                      │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

> **命名说明**：部分前端组件文件仍保留 `Rs*` 前缀（如 `RsProjectListPage.tsx`），这是历史命名遗留，不影响模块代码名 RD 的统一规范。新开发请统一使用 `RD*` 前缀。

---

## 2. 核心功能详解

### 2.1 项目管理

**功能说明**：管理研发项目的全生命周期，包括立项、计划、执行和结题。

**数据模型**：

```typescript
interface Project {
  id: string;                    // 项目ID
  name: string;                  // 项目名称
  code: string;                  // 项目编号
  description: string;           // 项目描述
  status: 'planning' | 'active' | 'completed' | 'cancelled'; // 状态
  start_date: string;            // 开始日期
  end_date: string;              // 结束日期
  budget: number;                // 预算
  phase: string;                 // 当前阶段
  created_at: string;            // 创建时间
}

interface ProjectPhase {
  id: string;                    // 阶段ID
  project_id: string;            // 项目ID
  name: string;                  // 阶段名称
  description: string;           // 阶段描述
  status: 'pending' | 'in_progress' | 'completed'; // 状态
  start_date: string;            // 开始日期
  end_date: string;              // 结束日期
}
```

### 2.2 实验管理

**功能说明**：记录和管理实验数据，支持实验设计、数据采集和分析。

**数据模型**：

```typescript
interface Experiment {
  id: string;                    // 实验ID
  project_id: string;            // 项目ID
  name: string;                  // 实验名称
  description: string;           // 实验描述
  status: 'planned' | 'in_progress' | 'completed'; // 状态
  parameters: ExperimentParameter[]; // 实验参数
  results: ExperimentResult[];    // 实验结果
  created_at: string;            // 创建时间
}

interface ExperimentParameter {
  id: string;                    // 参数ID
  name: string;                  // 参数名称
  value: string;                 // 参数值
  unit: string;                  // 单位
}

interface ExperimentResult {
  id: string;                    // 结果ID
  name: string;                  // 结果名称
  value: string;                 // 结果值
  unit: string;                  // 单位
  data?: Record<string, any>;    // 原始数据
}
```

### 2.3 配方管理

**功能说明**：管理产品配方的版本控制和审批流程。

**数据模型**：

```typescript
interface Formula {
  id: string;                    // 配方ID
  name: string;                  // 配方名称
  code: string;                  // 配方编号
  version: string;               // 版本号
  status: 'draft' | 'review' | 'approved' | 'rejected'; // 状态
  ingredients: FormulaIngredient[]; // 成分列表
  instructions: string;          // 操作说明
  created_at: string;            // 创建时间
}

interface FormulaIngredient {
  id: string;                    // 成分ID
  material_code: string;         // 物料编号
  material_name: string;         // 物料名称
  quantity: number;              // 数量
  unit: string;                  // 单位
}
```

### 2.4 专利管理

**功能说明**：管理专利申请和维护流程。

**数据模型**：

```typescript
interface Patent {
  id: string;                    // 专利ID
  name: string;                  // 专利名称
  type: 'invention' | 'utility' | 'design'; // 专利类型
  status: 'pending' | 'granted' | 'expired'; // 状态
  application_number: string;    // 申请号
  application_date: string;      // 申请日期
  publication_date?: string;     // 公布日期
  inventors: string[];           // 发明人
  assignee: string;              // 申请人
  created_at: string;            // 创建时间
}
```

---

## 3. API接口文档

### 3.1 项目管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取项目列表 | GET | `/api/v1/rs/projects` |
| 获取项目详情 | GET | `/api/v1/rs/projects/:id` |
| 创建项目 | POST | `/api/v1/rs/projects` |
| 更新项目 | PUT | `/api/v1/rs/projects/:id` |
| 删除项目 | DELETE | `/api/v1/rs/projects/:id` |

### 3.2 实验管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取实验列表 | GET | `/api/v1/rs/experiments` |
| 创建实验 | POST | `/api/v1/rs/experiments` |
| 更新实验结果 | PUT | `/api/v1/rs/experiments/:id/results` |

### 3.3 配方管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取配方列表 | GET | `/api/v1/rs/formulas` |
| 创建配方 | POST | `/api/v1/rs/formulas` |
| 审批配方 | PUT | `/api/v1/rs/formulas/:id/approve` |
| 获取配方版本 | GET | `/api/v1/rs/formulas/:id/versions` |

### 3.4 专利管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取专利列表 | GET | `/api/v1/rs/patents` |
| 创建专利 | POST | `/api/v1/rs/patents` |
| 更新专利状态 | PUT | `/api/v1/rs/patents/:id/status` |

---

## 4. 使用指南

### 4.1 创建项目

```typescript
import { rsApi } from './api/rs';

const project = await rsApi.createProject({
  name: '新型材料研发项目',
  code: 'PRJ-2024-001',
  description: '研发新型高分子材料',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  budget: 1000000
});
```

### 4.2 创建实验

```typescript
const experiment = await rsApi.createExperiment({
  project_id: 'project-id',
  name: '材料性能测试',
  description: '测试材料的力学性能',
  parameters: [
    { name: '温度', value: '25', unit: '℃' },
    { name: '湿度', value: '50', unit: '%' }
  ]
});
```

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队