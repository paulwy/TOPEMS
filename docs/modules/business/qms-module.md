# QMS模块技术文档

## 1. 概述

QMS（质量管理系统）模块是TOPEMS平台的核心模块之一，提供质量控制、质量检查、不合格品管理、质量追溯等功能，帮助企业实现全面质量管理。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 质量控制 | 检验标准、检验计划、检验记录 |
| 不合格品管理 | 不合格品登记、评审、处置 |
| 质量追溯 | 批次追溯、产品溯源 |
| 质量改进 | 纠正措施、预防措施 |
| 质量文档 | 质量手册、程序文件 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      QMS模块架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── Qmspage.tsx        # QMS主页面                  │
│  └── components/                                           │
│      └── qms/                                              │
│          ├── InspectionForm.tsx # 检验表单               │
│          └── NonConformingReport.tsx # 不合格品报告      │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── qms.ts               # QMS API客户端                  │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL)                              │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── quality_control.rs  # 质量控制                  │
│  │   ├── batch.rs         # 批次管理                      │
│  │   └── dashboard.rs     # 质量仪表板                    │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 质量控制

**功能说明**：管理检验标准、检验计划和检验记录。

**数据模型**：

```typescript
interface Inspection {
  id: string;                    // 检验ID
  batch_id: string;              // 批次ID
  batch_code: string;            // 批次编号
  product_name: string;          // 产品名称
  inspection_items: InspectionItem[]; // 检验项目
  status: 'pending' | 'in_progress' | 'completed'; // 状态
  result: 'pass' | 'fail';       // 检验结果
  inspector: string;             // 检验员
  inspected_at: string;          // 检验时间
  created_at: string;            // 创建时间
}

interface InspectionItem {
  id: string;                    // 项目ID
  name: string;                  // 项目名称
  standard: string;              // 标准要求
  actual: string;                // 实际值
  result: 'pass' | 'fail';       // 结果
}
```

### 2.2 不合格品管理

**功能说明**：管理不合格品的登记、评审和处置流程。

**数据模型**：

```typescript
interface NonConforming {
  id: string;                    // 不合格品ID
  batch_id: string;              // 批次ID
  product_code: string;          // 产品编号
  description: string;           // 不合格描述
  quantity: number;              // 数量
  severity: 'minor' | 'major' | 'critical'; // 严重程度
  status: 'reported' | 'reviewing' | 'disposed'; // 状态
  disposal_method: string;       // 处置方式
  created_at: string;            // 创建时间
}
```

### 2.3 质量追溯

**功能说明**：实现产品批次追溯，追踪原材料到成品的全过程。

**数据模型**：

```typescript
interface Batch {
  id: string;                    // 批次ID
  code: string;                  // 批次编号
  product_id: string;            // 产品ID
  product_name: string;          // 产品名称
  production_date: string;       // 生产日期
  status: 'in_production' | 'completed' | 'shipped'; // 状态
  materials: MaterialLot[];      // 使用的原材料批次
  created_at: string;            // 创建时间
}

interface MaterialLot {
  id: string;                    // 物料批次ID
  material_code: string;         // 物料编号
  supplier: string;              // 供应商
  lot_number: string;            // 批号
  quantity: number;              // 数量
}
```

---

## 3. API接口文档

### 3.1 质量控制接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取检验列表 | GET | `/api/v1/qms/inspections` |
| 创建检验记录 | POST | `/api/v1/qms/inspections` |
| 获取检验详情 | GET | `/api/v1/qms/inspections/:id` |

### 3.2 不合格品管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取不合格品列表 | GET | `/api/v1/qms/non-conforming` |
| 创建不合格品报告 | POST | `/api/v1/qms/non-conforming` |
| 处置不合格品 | PUT | `/api/v1/qms/non-conforming/:id/dispose` |

### 3.3 批次追溯接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取批次列表 | GET | `/api/v1/qms/batches` |
| 获取批次详情 | GET | `/api/v1/qms/batches/:id` |
| 创建批次 | POST | `/api/v1/qms/batches` |

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队