# BI模块技术文档

## 1. 概述

BI（商业智能）模块是TOPEMS平台的核心模块之一，提供数据可视化、报表分析、数据挖掘、决策支持等功能，帮助企业从数据中获取洞察。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 数据可视化 | 图表展示、仪表板、数据大屏 |
| 报表管理 | 报表设计、报表生成、报表订阅 |
| 数据分析 | 多维分析、趋势分析、对比分析 |
| 数据挖掘 | 数据建模、预测分析、异常检测 |
| 数据管理 | 数据源管理、数据清洗、数据同步 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      BI模块架构                             │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── BiPage.tsx         # BI主页面                   │
│  └── components/                                           │
│      └── bi/                                               │
│          ├── Dashboard.tsx   # 仪表板组件                │
│          └── ChartBuilder.tsx # 图表构建器               │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── bi.ts                # BI API客户端                   │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL + ClickHouse)                │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── dashboard.rs      # 仪表板管理                    │
│  │   ├── report.rs         # 报表管理                      │
│  │   ├── analysis.rs       # 数据分析                      │
│  │   └── datasource.rs     # 数据源管理                    │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 数据可视化

**功能说明**：提供丰富的图表组件和仪表板功能。

**数据模型**：

```typescript
interface Dashboard {
  id: string;                    // 仪表板ID
  name: string;                  // 仪表板名称
  description: string;           // 描述
  widgets: Widget[];             // 组件列表
  layout: LayoutConfig;          // 布局配置
  created_by: string;            // 创建人
  created_at: string;            // 创建时间
}

interface Widget {
  id: string;                    // 组件ID
  type: 'chart' | 'table' | 'metric' | 'text'; // 类型
  title: string;                 // 标题
  config: WidgetConfig;          // 配置
  position: Position;            // 位置
}

interface WidgetConfig {
  chartType?: string;            // 图表类型
  dataSource?: string;           // 数据源
  query?: string;                // 查询语句
  options?: Record<string, any>; // 图表选项
}

interface Position {
  x: number;                     // 横坐标
  y: number;                     // 纵坐标
  width: number;                 // 宽度
  height: number;                // 高度
}
```

### 2.2 报表管理

**功能说明**：管理报表设计和生成。

**数据模型**：

```typescript
interface Report {
  id: string;                    // 报表ID
  name: string;                  // 报表名称
  code: string;                  // 报表编号
  type: 'daily' | 'weekly' | 'monthly' | 'custom'; // 类型
  status: 'draft' | 'published'; // 状态
  schedule?: Schedule;           // 定时任务
  subscriptions: Subscription[]; // 订阅列表
  created_at: string;            // 创建时间
}

interface Schedule {
  type: 'daily' | 'weekly' | 'monthly'; // 周期类型
  time: string;                  // 执行时间
  day_of_week?: number;          // 周几
  day_of_month?: number;         // 几号
}

interface Subscription {
  id: string;                    // 订阅ID
  user_id: string;               // 用户ID
  user_email: string;            // 用户邮箱
  format: 'pdf' | 'excel' | 'csv'; // 格式
}
```

### 2.3 数据分析

**功能说明**：提供多维分析和数据挖掘能力。

**数据模型**：

```typescript
interface Analysis {
  id: string;                    // 分析ID
  name: string;                  // 分析名称
  type: 'trend' | 'comparison' | 'funnel' | 'correlation'; // 分析类型
  dimensions: string[];          // 维度
  metrics: string[];             // 指标
  filters: Filter[];             // 筛选条件
  result: AnalysisResult;        // 分析结果
  created_at: string;            // 创建时间
}

interface Filter {
  field: string;                 // 字段名
  operator: '=' | '<>' | '<' | '>' | '<=' | '>=' | 'in' | 'like'; // 操作符
  value: any;                    // 值
}

interface AnalysisResult {
  data: Record<string, any>[];   // 数据
  summary: Record<string, number>; // 汇总统计
  insights: string[];            // 洞察发现
}
```

---

## 3. API接口文档

> 口径校准（2026-10-20）：analytics 服务前缀为 `/api/bi`（无 `/api/v1/bi` 业务前缀，legacy `/api/v1/bi` 仅别名）；下表以 `svc/analytics/src/routes.rs` / `main.rs` 实测为准，未挂载接口标注 RC4a gap。

### 3.1 仪表板接口（已挂载，单数 `/dashboard`）

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取仪表板列表 | GET | `/api/bi/dashboard` |
| 创建仪表板 | POST | `/api/bi/dashboard` |
| 获取仪表板详情 | GET | `/api/bi/dashboard/:id` |
| 更新仪表板 | PUT | `/api/bi/dashboard/:id` |
| 删除仪表板 | DELETE | `/api/bi/dashboard/:id` |

### 3.2 报表管理接口（report 模块并入 analytics）

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取报表列表 | GET | `/api/bi/reports` |
| 创建报表 | POST | `/api/bi/reports` |
| 生成报表 | GET | `/api/bi/reports/:id/export`（导出；`:id/generate` 未挂载，RC4a gap） |
| 订阅报表 | POST | 未挂载（RC4a gap） |

### 3.3 数据分析接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取分析列表 | GET | `/api/bi/analysis` |
| 创建分析 | POST | `/api/bi/analysis` |
| 执行分析 / 获取结果 | — | `/analysis/:id/execute`、`/analysis/:id/result` 未挂载（RC4a gap；另有 `/comparison-analysis/:id/run`、`/comparison-analysis/:id/result`） |

### 3.4 数据源接口（未挂载，RC4a gap）

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取数据源列表 | GET | `/api/bi/datasources`（未挂载） |
| 创建数据源 | POST | `/api/bi/datasources`（未挂载） |
| 测试连接 | POST | `/api/bi/datasources/:id/test`（未挂载） |

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11（2026-10-20 按 analytics 实测校准前缀与已挂载路由，其余未挂载项标注 gap）  
**作者**: TOPEMS开发团队