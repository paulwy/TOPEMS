# WMS模块技术文档

## 1. 概述

WMS（仓储管理系统）模块是TOPEMS平台的核心模块之一，提供仓库管理、库存管理、出入库管理、盘点管理等功能，帮助企业实现高效的仓储运营。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 仓库管理 | 仓库信息、库区管理、货架管理 |
| 库存管理 | 库存查询、库存预警、库存调拨 |
| 出入库管理 | 入库单、出库单、移库管理 |
| 盘点管理 | 盘点计划、盘点记录、差异处理 |
| 批次管理 | 批次追踪、效期管理、序列号管理 |
| 报表管理 | 库存报表、出入库报表、盘点报表 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      WMS模块架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── WmsPage.tsx        # WMS主页面                  │
│  └── components/                                           │
│      └── wms/                                              │
│          ├── InventoryCard.tsx # 库存卡片                │
│          └── StockForm.tsx     # 出入库表单               │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── wms.ts               # WMS API客户端                  │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL)                              │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── warehouse.rs      # 仓库管理                      │
│  │   ├── inventory.rs      # 库存管理                      │
│  │   ├── stock.rs          # 出入库管理                    │
│  │   └── counting.rs       # 盘点管理                      │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 仓库管理

**功能说明**：管理仓库、库区和货架信息。

**数据模型**：

```typescript
interface Warehouse {
  id: string;                    // 仓库ID
  name: string;                  // 仓库名称
  code: string;                  // 仓库编码
  location: string;              // 仓库位置
  status: 'active' | 'inactive'; // 状态
  created_at: string;            // 创建时间
}

interface StorageArea {
  id: string;                    // 库区ID
  warehouse_id: string;          // 仓库ID
  name: string;                  // 库区名称
  code: string;                  // 库区编码
  type: 'raw' | 'finished' | 'work'; // 类型
  created_at: string;            // 创建时间
}

interface Shelf {
  id: string;                    // 货架ID
  area_id: string;               // 库区ID
  code: string;                  // 货架编码
  row: string;                   // 排
  column: string;                // 列
  level: number;                 // 层数
  capacity: number;              // 容量
  created_at: string;            // 创建时间
}
```

### 2.2 库存管理

**功能说明**：管理库存数量、预警和调拨。

**数据模型**：

```typescript
interface Inventory {
  id: string;                    // 库存ID
  sku: string;                   // 商品SKU
  product_name: string;          // 商品名称
  warehouse_id: string;          // 仓库ID
  area_id: string;               // 库区ID
  shelf_id: string;              // 货架ID
  batch_no: string;              // 批次号
  quantity: number;              // 数量
  unit: string;                  // 单位
  min_stock: number;             // 最低库存
  max_stock: number;             // 最高库存
  expiry_date?: string;          // 有效期
  status: 'normal' | 'low' | 'high'; // 状态
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
}
```

### 2.3 出入库管理

**功能说明**：管理入库单、出库单和移库操作。

**数据模型**：

```typescript
interface StockOrder {
  id: string;                    // 单据ID
  code: string;                  // 单据编号
  type: 'in' | 'out' | 'transfer'; // 类型
  status: 'pending' | 'processing' | 'completed'; // 状态
  items: StockItem[];            // 商品明细
  total_amount: number;          // 总金额
  created_by: string;            // 创建人
  created_at: string;            // 创建时间
}

interface StockItem {
  id: string;                    // 明细ID
  sku: string;                   // 商品SKU
  product_name: string;          // 商品名称
  batch_no: string;              // 批次号
  quantity: number;              // 数量
  unit: string;                  // 单位
  unit_price: number;            // 单价
  amount: number;                // 金额
}
```

### 2.4 盘点管理

**功能说明**：管理盘点计划和盘点记录。

**数据模型**：

```typescript
interface CountingPlan {
  id: string;                    // 盘点计划ID
  code: string;                  // 计划编号
  warehouse_id: string;          // 仓库ID
  area_id?: string;              // 库区ID
  status: 'pending' | 'in_progress' | 'completed'; // 状态
  scheduled_date: string;        // 计划日期
  created_at: string;            // 创建时间
}

interface CountingRecord {
  id: string;                    // 盘点记录ID
  plan_id: string;               // 盘点计划ID
  sku: string;                   // 商品SKU
  product_name: string;          // 商品名称
  system_qty: number;            // 系统数量
  actual_qty: number;            // 实际数量
  difference: number;            // 差异数量
  reason?: string;               // 差异原因
  status: 'pending' | 'adjusted'; // 状态
  counted_at: string;            // 盘点时间
}
```

---

## 3. API接口文档

### 3.1 仓库管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取仓库列表 | GET | `/api/v1/wms/warehouses` |
| 创建仓库 | POST | `/api/v1/wms/warehouses` |
| 获取库区列表 | GET | `/api/v1/wms/areas` |
| 获取货架列表 | GET | `/api/v1/wms/shelves` |

### 3.2 库存管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取库存列表 | GET | `/api/v1/wms/inventory` |
| 查询库存详情 | GET | `/api/v1/wms/inventory/:id` |
| 库存调拨 | POST | `/api/v1/wms/inventory/transfer` |
| 获取库存预警 | GET | `/api/v1/wms/inventory/alerts` |

### 3.3 出入库管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取出入库单列表 | GET | `/api/v1/wms/stock-orders` |
| 创建入库单 | POST | `/api/v1/wms/stock-orders/in` |
| 创建出库单 | POST | `/api/v1/wms/stock-orders/out` |
| 确认出入库 | PUT | `/api/v1/wms/stock-orders/:id/confirm` |

### 3.4 盘点管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取盘点计划列表 | GET | `/api/v1/wms/counting/plans` |
| 创建盘点计划 | POST | `/api/v1/wms/counting/plans` |
| 获取盘点记录 | GET | `/api/v1/wms/counting/records` |
| 创建盘点记录 | POST | `/api/v1/wms/counting/records` |
| 调整库存 | PUT | `/api/v1/wms/counting/records/:id/adjust` |

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队