# CRM模块技术文档

## 1. 概述

CRM（客户关系管理）模块是TOPEMS平台的核心模块之一，提供客户管理、销售管理、营销自动化、客户服务等功能，帮助企业建立和维护良好的客户关系。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 客户管理 | 客户信息管理、客户分类、客户画像 |
| 销售管理 | 销售机会、销售漏斗、订单管理 |
| 营销管理 | 营销活动、客户触达、效果追踪 |
| 客户服务 | 服务工单、投诉处理、满意度调查 |
| 数据分析 | 客户分析、销售报表、趋势预测 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      CRM模块架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── CrmPage.tsx        # CRM主页面                  │
│  └── components/                                           │
│      └── crm/                                              │
│          ├── CustomerCard.tsx # 客户卡片                 │
│          └── OpportunityForm.tsx # 销售机会表单          │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── crm.ts               # CRM API客户端                  │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL)                              │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── customer.rs       # 客户管理                      │
│  │   ├── sales.rs          # 销售管理                      │
│  │   ├── marketing.rs      # 营销管理                      │
│  │   └── service.rs        # 客户服务                      │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 客户管理

**功能说明**：管理客户基本信息、分类和画像。

**数据模型**：

```typescript
interface Customer {
  id: string;                    // 客户ID
  name: string;                  // 客户名称
  type: 'individual' | 'enterprise'; // 客户类型
  industry: string;              // 所属行业
  status: 'active' | 'inactive'; // 状态
  contact: ContactInfo;          // 联系人信息
  address: Address;              // 地址信息
  tags: string[];                // 标签
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
}

interface ContactInfo {
  name: string;                  // 联系人姓名
  phone: string;                 // 联系电话
  email: string;                 // 邮箱
  position: string;              // 职位
}

interface Address {
  province: string;              // 省份
  city: string;                  // 城市
  district: string;              // 区县
  detail: string;                // 详细地址
}
```

### 2.2 销售管理

**功能说明**：管理销售机会、销售漏斗和订单。

**数据模型**：

```typescript
interface Opportunity {
  id: string;                    // 机会ID
  customer_id: string;           // 客户ID
  customer_name: string;         // 客户名称
  title: string;                 // 机会名称
  value: number;                 // 预估金额
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed'; // 阶段
  probability: number;           // 成功概率(%)
  expected_close_date: string;   // 预计成交日期
  owner: string;                 // 负责人
  created_at: string;            // 创建时间
}

interface Order {
  id: string;                    // 订单ID
  code: string;                  // 订单编号
  customer_id: string;           // 客户ID
  customer_name: string;         // 客户名称
  items: OrderItem[];            // 订单商品
  total_amount: number;          // 订单总额
  status: 'pending' | 'paid' | 'shipped' | 'completed'; // 状态
  created_at: string;            // 创建时间
}

interface OrderItem {
  id: string;                    // 商品ID
  product_name: string;          // 商品名称
  quantity: number;              // 数量
  unit_price: number;            // 单价
  amount: number;                // 金额
}
```

### 2.3 营销管理

**功能说明**：管理营销活动和客户触达。

**数据模型**：

```typescript
interface Campaign {
  id: string;                    // 活动ID
  name: string;                  // 活动名称
  type: 'email' | 'sms' | 'wechat' | 'event'; // 活动类型
  target_audience: string[];     // 目标受众标签
  start_date: string;            // 开始日期
  end_date: string;              // 结束日期
  budget: number;                // 预算
  status: 'draft' | 'active' | 'completed'; // 状态
  metrics: CampaignMetrics;      // 活动指标
  created_at: string;            // 创建时间
}

interface CampaignMetrics {
  impressions: number;           // 曝光次数
  clicks: number;                // 点击次数
  conversions: number;           // 转化次数
  conversion_rate: number;       // 转化率(%)
  roi: number;                   // 投资回报率
}
```

### 2.4 客户服务

**功能说明**：管理客户服务工单和投诉处理。

**数据模型**：

```typescript
interface ServiceTicket {
  id: string;                    // 工单ID
  customer_id: string;           // 客户ID
  customer_name: string;         // 客户名称
  title: string;                 // 工单标题
  description: string;           // 问题描述
  type: 'complaint' | 'inquiry' | 'suggestion'; // 类型
  priority: 'low' | 'medium' | 'high'; // 优先级
  status: 'open' | 'processing' | 'resolved'; // 状态
  assignee: string;              // 处理人
  created_at: string;            // 创建时间
  resolved_at?: string;          // 解决时间
}
```

---

## 3. API接口文档

### 3.1 客户管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取客户列表 | GET | `/api/v1/crm/customers` |
| 获取客户详情 | GET | `/api/v1/crm/customers/:id` |
| 创建客户 | POST | `/api/v1/crm/customers` |
| 更新客户 | PUT | `/api/v1/crm/customers/:id` |
| 删除客户 | DELETE | `/api/v1/crm/customers/:id` |

### 3.2 销售管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取销售机会列表 | GET | `/api/v1/crm/opportunities` |
| 创建销售机会 | POST | `/api/v1/crm/opportunities` |
| 更新机会阶段 | PUT | `/api/v1/crm/opportunities/:id/stage` |
| 获取订单列表 | GET | `/api/v1/crm/orders` |
| 创建订单 | POST | `/api/v1/crm/orders` |

### 3.3 营销管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取营销活动列表 | GET | `/api/v1/crm/campaigns` |
| 创建营销活动 | POST | `/api/v1/crm/campaigns` |
| 获取活动统计 | GET | `/api/v1/crm/campaigns/:id/metrics` |

### 3.4 客户服务接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取工单列表 | GET | `/api/v1/crm/tickets` |
| 创建工单 | POST | `/api/v1/crm/tickets` |
| 更新工单状态 | PUT | `/api/v1/crm/tickets/:id/status` |

---

## 4. 使用指南

### 4.1 创建客户

```typescript
import { crmApi } from './api/crm';

const customer = await crmApi.createCustomer({
  name: '北京科技有限公司',
  type: 'enterprise',
  industry: '科技',
  contact: {
    name: '张三',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    position: '采购经理'
  },
  address: {
    province: '北京',
    city: '北京',
    district: '朝阳区',
    detail: 'xxx大厦'
  },
  tags: ['VIP', '重点客户']
});
```

### 4.2 创建销售机会

```typescript
const opportunity = await crmApi.createOpportunity({
  customer_id: 'customer-id',
  title: '年度采购计划',
  value: 500000,
  stage: 'qualified',
  probability: 60,
  expected_close_date: '2024-12-31',
  owner: 'sales-001'
});
```

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队