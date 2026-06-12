# EHS模块技术文档

## 1. 概述

EHS（环境、健康与安全）模块是TOPEMS平台的核心模块之一，提供风险评估、安全检查、环境监测、事故管理等功能，帮助企业实现安全合规管理。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 风险管理 | 风险识别、评估、控制措施 |
| 安全检查 | 巡检计划、检查记录、整改跟踪 |
| 环境监测 | 污染物排放、环境指标监控 |
| 事故管理 | 事故报告、调查分析、整改措施 |
| 培训管理 | 安全培训、证书管理、考核记录 |
| 应急管理 | 应急预案、演练记录、应急资源 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      EHS模块架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── Ehspage.tsx         # EHS主页面                  │
│  └── components/                                           │
│      └── ehs/                                              │
│          ├── RiskForm.tsx     # 风险评估表单              │
│          └── IncidentReport.tsx # 事故报告表单           │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── ehs.ts               # EHS API客户端                  │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL)                              │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── risk.rs           # 风险管理                      │
│  │   ├── safety.rs         # 安全检查                      │
│  │   ├── health.rs         # 健康管理                      │
│  │   ├── environment.rs    # 环境管理                      │
│  │   └── training.rs       # 培训管理                      │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 风险管理

**功能说明**：识别、评估和控制企业运营过程中的各类风险。

**数据模型**：

```typescript
interface Risk {
  id: string;                    // 风险ID
  name: string;                  // 风险名称
  description: string;           // 风险描述
  category: string;              // 风险类别
  likelihood: 'low' | 'medium' | 'high'; // 发生可能性
  impact: 'low' | 'medium' | 'high'; // 影响程度
  risk_level: 'low' | 'medium' | 'high' | 'critical'; // 风险等级
  control_measures: string[];    // 控制措施
  status: 'active' | 'mitigated' | 'closed'; // 状态
  created_at: string;            // 创建时间
}
```

### 2.2 安全检查

**功能说明**：管理安全巡检计划、检查记录和整改跟踪。

**数据模型**：

```typescript
interface Inspection {
  id: string;                    // 检查ID
  title: string;                 // 检查标题
  type: string;                  // 检查类型
  schedule: string;              // 计划时间
  status: 'pending' | 'in_progress' | 'completed'; // 状态
  findings: Finding[];           // 检查发现
  created_at: string;            // 创建时间
}

interface Finding {
  id: string;                    // 发现ID
  description: string;           // 问题描述
  severity: 'minor' | 'major' | 'critical'; // 严重程度
  corrective_action: string;     // 整改措施
  status: 'open' | 'resolved';   // 状态
  due_date: string;              // 整改期限
}
```

### 2.3 事故管理

**功能说明**：记录和管理安全事故，进行调查分析。

**数据模型**：

```typescript
interface Incident {
  id: string;                    // 事故ID
  title: string;                 // 事故标题
  description: string;           // 事故描述
  type: string;                  // 事故类型
  severity: 'minor' | 'serious' | 'critical'; // 严重程度
  date: string;                  // 发生日期
  location: string;              // 发生地点
  status: 'investigating' | 'resolved'; // 状态
  root_cause: string;            // 根本原因
  corrective_actions: string[];  // 整改措施
  created_at: string;            // 创建时间
}
```

---

## 3. API接口文档

### 3.1 风险管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取风险列表 | GET | `/api/v1/ehs/risks` |
| 获取单个风险 | GET | `/api/v1/ehs/risks/:id` |
| 创建风险 | POST | `/api/v1/ehs/risks` |
| 更新风险 | PUT | `/api/v1/ehs/risks/:id` |
| 删除风险 | DELETE | `/api/v1/ehs/risks/:id` |

### 3.2 安全检查接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取检查列表 | GET | `/api/v1/ehs/inspections` |
| 创建检查 | POST | `/api/v1/ehs/inspections` |
| 添加发现 | POST | `/api/v1/ehs/inspections/:id/findings` |

### 3.3 事故管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取事故列表 | GET | `/api/v1/ehs/incidents` |
| 创建事故 | POST | `/api/v1/ehs/incidents` |
| 更新事故状态 | PUT | `/api/v1/ehs/incidents/:id/status` |

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队