# SRM模块技术文档

## 1. 概述

SRM（供应商关系管理）模块是TOPEMS平台的核心模块之一，提供供应商管理、采购管理、合同管理、绩效评估等功能，帮助企业建立和维护良好的供应商关系。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 供应商管理 | 供应商信息、资质审核、准入管理 |
| 采购管理 | 采购需求、采购订单、到货管理 |
| 合同管理 | 合同签订、合同执行、合同归档 |
| 绩效评估 | 供应商评分、绩效分析、改进建议 |
| 协同管理 | 供应商门户、消息通知、文档共享 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      SRM模块架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── SrmPage.tsx        # SRM主页面                  │
│  └── components/                                           │
│      └── srm/                                              │
│          ├── SupplierCard.tsx # 供应商卡片               │
│          └── PurchaseOrderForm.tsx # 采购订单表单        │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── srm.ts               # SRM API客户端                  │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL)                              │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── supplier.rs       # 供应商管理                    │
│  │   ├── purchase.rs       # 采购管理                      │
│  │   ├── contract.rs       # 合同管理                      │
│  │   └── performance.rs    # 绩效评估                      │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 供应商管理

**功能说明**：管理供应商基本信息和资质审核。

**数据模型**：

```typescript
interface Supplier {
  id: string;                    // 供应商ID
  name: string;                  // 供应商名称
  code: string;                  // 供应商编号
  type: 'manufacturer' | 'distributor' | 'service'; // 类型
  status: 'pending' | 'approved' | 'rejected'; // 状态
  contact: ContactInfo;          // 联系人信息
  address: Address;              // 地址信息
  certifications: string[];      // 资质证书
  created_at: string;            // 创建时间
}

interface ContactInfo {
  name: string;                  // 联系人姓名
  phone: string;                 // 联系电话
  email: string;                 // 邮箱
}

interface Address {
  province: string;              // 省份
  city: string;                  // 城市
  detail: string;                // 详细地址
}
```

### 2.2 采购管理

**功能说明**：管理采购需求和采购订单。

**数据模型**：

```typescript
interface PurchaseOrder {
  id: string;                    // 采购订单ID
  code: string;                  // 订单编号
  supplier_id: string;           // 供应商ID
  supplier_name: string;         // 供应商名称
  items: PurchaseItem[];         // 采购明细
  status: 'pending' | 'confirmed' | 'shipped' | 'received'; // 状态
  total_amount: number;          // 订单总额
  delivery_date: string;         // 交货日期
  created_by: string;            // 创建人
  created_at: string;            // 创建时间
}

interface PurchaseItem {
  id: string;                    // 明细ID
  material_code: string;         // 物料编码
  material_name: string;         // 物料名称
  quantity: number;              // 数量
  unit: string;                  // 单位
  unit_price: number;            // 单价
  amount: number;                // 金额
}
```

### 2.3 合同管理

**功能说明**：管理供应商合同。

**数据模型**：

```typescript
interface Contract {
  id: string;                    // 合同ID
  code: string;                  // 合同编号
  name: string;                  // 合同名称
  supplier_id: string;           // 供应商ID
  supplier_name: string;         // 供应商名称
  type: 'purchase' | 'service' | 'framework'; // 合同类型
  amount: number;                // 合同金额
  start_date: string;            // 开始日期
  end_date: string;              // 结束日期
  status: 'draft' | 'signed' | 'executing' | 'completed'; // 状态
  file_url: string;              // 合同文件
  created_at: string;            // 创建时间
}
```

### 2.4 绩效评估

**功能说明**：评估供应商绩效。

**数据模型**：

```typescript
interface Performance {
  id: string;                    // 评估ID
  supplier_id: string;           // 供应商ID
  supplier_name: string;         // 供应商名称
  period: string;                // 评估周期
  scores: ScoreItem[];           // 评分项
  total_score: number;           // 总分
  level: 'A' | 'B' | 'C' | 'D'; // 等级
  comments: string;              // 评价意见
  created_at: string;            // 创建时间
}

interface ScoreItem {
  id: string;                    // 评分项ID
  name: string;                  // 评分项名称
  score: number;                 // 得分
  weight: number;                // 权重
}
```

---

## 3. API接口文档

### 3.1 供应商管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取供应商列表 | GET | `/api/v1/srm/suppliers` |
| 创建供应商 | POST | `/api/v1/srm/suppliers` |
| 审核供应商 | PUT | `/api/v1/srm/suppliers/:id/approve` |

### 3.2 采购管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取采购订单列表 | GET | `/api/v1/srm/purchase-orders` |
| 创建采购订单 | POST | `/api/v1/srm/purchase-orders` |
| 确认订单 | PUT | `/api/v1/srm/purchase-orders/:id/confirm` |
| 确认到货 | PUT | `/api/v1/srm/purchase-orders/:id/receive` |

### 3.3 合同管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取合同列表 | GET | `/api/v1/srm/contracts` |
| 创建合同 | POST | `/api/v1/srm/contracts` |
| 签署合同 | PUT | `/api/v1/srm/contracts/:id/sign` |

### 3.4 绩效评估接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取绩效评估列表 | GET | `/api/v1/srm/performance` |
| 创建绩效评估 | POST | `/api/v1/srm/performance` |
| 获取供应商绩效 | GET | `/api/v1/srm/performance/supplier/:id` |

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队