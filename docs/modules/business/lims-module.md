# LIMS模块技术文档

## 1. 概述

LIMS（实验室信息管理系统）模块是TOPEMS平台专为实验室管理设计的核心模块，提供样品管理、试剂管理、仪器管理、实验记录等功能。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 样品管理 | 样品登记、流转、存储、处置 |
| 试剂管理 | 试剂库存、有效期提醒、领用记录 |
| 仪器管理 | 仪器台账、校准、维护、使用记录 |
| 实验管理 | 实验记录、数据采集、报告生成 |
| 文档管理 | 标准操作规程、实验报告归档 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      LIMS模块架构                           │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── LimsPage.tsx        # LIMS主页面                 │
│  └── components/                                           │
│      └── lims/                                             │
│          ├── SampleForm.tsx   # 样品表单                  │
│          └── InstrumentCard.tsx # 仪器卡片               │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── lims.ts              # LIMS API客户端                 │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL)                              │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── sample.rs         # 样品管理                      │
│  │   ├── reagent.rs        # 试剂管理                      │
│  │   ├── instrument.rs     # 仪器管理                      │
│  │   └── docs.rs           # 文档管理                      │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 样品管理

**功能说明**：管理样品从登记到处置的全生命周期。

**数据模型**：

```typescript
interface Sample {
  id: string;                    // 样品ID
  name: string;                  // 样品名称
  code: string;                  // 样品编号
  type: string;                  // 样品类型
  status: 'pending' | 'testing' | 'completed' | 'discarded'; // 状态
  location: string;              // 存储位置
  received_date: string;         // 接收日期
  test_items: string[];          // 检测项目
  created_at: string;            // 创建时间
}
```

### 2.2 试剂管理

**功能说明**：管理试剂库存、有效期提醒和领用记录。

**数据模型**：

```typescript
interface Reagent {
  id: string;                    // 试剂ID
  name: string;                  // 试剂名称
  code: string;                  // 试剂编号
  supplier: string;              // 供应商
  quantity: number;              // 数量
  unit: string;                  // 单位
  expiry_date: string;           // 有效期
  location: string;              // 存放位置
  status: 'available' | 'low' | 'expired'; // 状态
  created_at: string;            // 创建时间
}
```

### 2.3 仪器管理

**功能说明**：管理实验室仪器的台账、校准和维护。

**数据模型**：

```typescript
interface Instrument {
  id: string;                    // 仪器ID
  name: string;                  // 仪器名称
  model: string;                 // 型号
  serial_no: string;             // 序列号
  status: 'in_use' | 'idle' | 'maintenance' | 'calibration'; // 状态
  last_calibration: string;      // 上次校准日期
  next_calibration: string;      // 下次校准日期
  location: string;              // 存放位置
  created_at: string;            // 创建时间
}
```

---

## 3. API接口文档

### 3.1 样品管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取样品列表 | GET | `/api/v1/lims/samples` |
| 获取单个样品 | GET | `/api/v1/lims/samples/:id` |
| 创建样品 | POST | `/api/v1/lims/samples` |
| 更新样品 | PUT | `/api/v1/lims/samples/:id` |
| 删除样品 | DELETE | `/api/v1/lims/samples/:id` |

### 3.2 试剂管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取试剂列表 | GET | `/api/v1/lims/reagents` |
| 创建试剂 | POST | `/api/v1/lims/reagents` |
| 领用试剂 | POST | `/api/v1/lims/reagents/:id/issue` |

### 3.3 仪器管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取仪器列表 | GET | `/api/v1/lims/instruments` |
| 创建仪器 | POST | `/api/v1/lims/instruments` |
| 校准记录 | POST | `/api/v1/lims/instruments/:id/calibrate` |

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队