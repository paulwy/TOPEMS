# MES模块技术文档

## 1. 概述

MES（制造执行系统）模块是TOPEMS平台的核心模块之一，提供生产计划、车间调度、生产监控、质量管理等功能，实现生产过程的实时管控。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 生产计划 | 生产订单、产能计划、排程管理 |
| 车间管理 | 车间布局、设备管理、人员排班 |
| 生产执行 | 工单管理、工序跟踪、数据采集 |
| 质量管理 | 在线检验、不合格品处理、追溯 |
| 设备管理 | 设备状态、维护保养、故障处理 |
| 数据采集 | 产量统计、效率分析、能耗监控 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      MES模块架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── MesPage.tsx        # MES主页面                  │
│  └── components/                                           │
│      └── mes/                                              │
│          ├── ProductionSchedule.tsx # 生产排程           │
│          └── WorkOrderCard.tsx      # 工单卡片            │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── mes.ts               # MES API客户端                  │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL)                              │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── production.rs     # 生产管理                      │
│  │   ├── shopfloor.rs      # 车间管理                      │
│  │   ├── quality.rs        # 质量管理                      │
│  │   └── equipment.rs      # 设备管理                      │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 生产计划

**功能说明**：管理生产订单和排程计划。

**数据模型**：

```typescript
interface ProductionOrder {
  id: string;                    // 生产订单ID
  code: string;                  // 订单编号
  product_id: string;            // 产品ID
  product_name: string;          // 产品名称
  quantity: number;              // 计划数量
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'; // 状态
  start_date: string;            // 开始日期
  end_date: string;              // 结束日期
  created_at: string;            // 创建时间
}

interface Schedule {
  id: string;                    // 排程ID
  order_id: string;              // 生产订单ID
  resource_id: string;           // 资源ID(设备/产线)
  start_time: string;            // 开始时间
  end_time: string;              // 结束时间
  status: 'scheduled' | 'in_progress' | 'completed'; // 状态
  created_at: string;            // 创建时间
}
```

### 2.2 工单管理

**功能说明**：管理生产工单和工序执行。

**数据模型**：

```typescript
interface WorkOrder {
  id: string;                    // 工单ID
  code: string;                  // 工单编号
  order_id: string;              // 生产订单ID
  operation_id: string;          // 工序ID
  operation_name: string;        // 工序名称
  status: 'pending' | 'in_progress' | 'completed' | 'scrapped'; // 状态
  target_qty: number;            // 目标数量
  actual_qty: number;            // 实际数量
  operator: string;              // 操作人员
  start_time?: string;           // 开始时间
  end_time?: string;             // 结束时间
  created_at: string;            // 创建时间
}
```

### 2.3 设备管理

**功能说明**：管理生产设备的状态和维护。

**数据模型**：

```typescript
interface Equipment {
  id: string;                    // 设备ID
  name: string;                  // 设备名称
  code: string;                  // 设备编号
  model: string;                 // 设备型号
  status: 'running' | 'idle' | 'maintenance' | 'fault'; // 状态
  location: string;              // 位置
  last_maintenance: string;      // 上次维护日期
  next_maintenance: string;      // 下次维护日期
  created_at: string;            // 创建时间
}

interface MaintenanceRecord {
  id: string;                    // 维护记录ID
  equipment_id: string;          // 设备ID
  type: 'routine' | 'repair' | 'upgrade'; // 维护类型
  description: string;           // 维护内容
  status: 'completed' | 'pending'; // 状态
  performed_by: string;          // 执行人员
  performed_at: string;          // 执行时间
}
```

### 2.4 生产监控

**功能说明**：实时监控生产进度和设备状态。

**数据模型**：

```typescript
interface ProductionStats {
  order_id: string;              // 订单ID
  order_code: string;            // 订单编号
  product_name: string;          // 产品名称
  target_qty: number;            // 目标数量
  completed_qty: number;         // 完成数量
  progress: number;              // 进度(%)
  efficiency: number;            // 效率(%)
  quality_rate: number;          // 良品率(%)
}

interface EquipmentStats {
  equipment_id: string;          // 设备ID
  equipment_name: string;        // 设备名称
  status: string;                // 状态
  running_hours: number;         // 运行时长(小时)
  utilization_rate: number;      // 利用率(%)
  downtime_rate: number;         // 停机率(%)
}
```

---

## 3. API接口文档

### 3.1 生产计划接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取生产订单列表 | GET | `/api/v1/mes/orders` |
| 创建生产订单 | POST | `/api/v1/mes/orders` |
| 获取排程列表 | GET | `/api/v1/mes/schedules` |
| 创建排程 | POST | `/api/v1/mes/schedules` |

### 3.2 工单管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取工单列表 | GET | `/api/v1/mes/work-orders` |
| 创建工单 | POST | `/api/v1/mes/work-orders` |
| 更新工单状态 | PUT | `/api/v1/mes/work-orders/:id/status` |
| 汇报产量 | POST | `/api/v1/mes/work-orders/:id/report` |

### 3.3 设备管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取设备列表 | GET | `/api/v1/mes/equipment` |
| 获取设备状态 | GET | `/api/v1/mes/equipment/status` |
| 创建维护记录 | POST | `/api/v1/mes/maintenance` |

### 3.4 生产监控接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取生产统计 | GET | `/api/v1/mes/statistics/production` |
| 获取设备统计 | GET | `/api/v1/mes/statistics/equipment` |
| 获取实时数据 | GET | `/api/v1/mes/realtime` |

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队