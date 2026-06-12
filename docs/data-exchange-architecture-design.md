# TOPEMS 数据交换体系设计方案 V1.0

## 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | V1.0 |
| 更新日期 | 2024-01-11 |
| 状态 | 设计中 |
| 关联文档 | erp-integration-design-v3.md, centralized-id-management-design.md |

---

## 一、数据交换总体架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TOPEMS 数据交换体系架构                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                 数据消费方 (Consumers)                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │   │
│  │  │    BI       │  │    AI      │  │   移动端   │  │   报表     │  │  外部系统 │ │   │
│  │  │  数据分析   │  │  智能分析   │  │  移动应用   │  │  报表中心  │  │  第三方   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              ▲                                               │
│                                              │                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                  数据服务层 (Data Services)                            │   │
│  │                                                                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │   │
│  │  │   数据查询API   │  │   实时数据流   │  │   消息通知服务  │  │   数据订阅服务  │ │   │
│  │  │  Query API     │  │  Real-time API │  │  Notification   │  │  Subscription   │ │   │
│  │  │                │  │                │  │                │  │                │ │   │
│  │  │ • REST API    │  │ • WebSocket   │  │ • SSE          │  │ • Polling      │ │   │
│  │  │ • GraphQL     │  │ • SSE         │  │ • Push         │  │ • Webhook      │ │   │
│  │  │ • 聚合查询     │  │ • SSE         │  │ • 邮件         │  │ • Server Events │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              ▲                                               │
│                                              │                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                               数据总线层 (Data Bus)                                  │   │
│  │                                                                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │   │
│  │  │   消息队列      │  │   事件总线      │  │   数据同步      │  │   ETL管道       │ │   │
│  │  │  Message Queue │  │  Event Bus     │  │  Data Sync     │  │  ETL Pipeline  │ │   │
│  │  │                │  │                │  │                │  │                │ │   │
│  │  │ • Kafka       │  │ • CQRS        │  │ • CDC         │  │ • Batch       │ │   │
│  │  │ • RabbitMQ    │  │ • EventStore  │  │ • 双写        │  │ • Streaming   │ │   │
│  │  │ • Redis Pub/Sub│ │ • 发件箱模式  │  │ • 订阅发布    │  │ • Data Lake   │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              ▲                                               │
│                                              │                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                               数据源层 (Data Sources)                                 │   │
│  │                                                                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │   │
│  │  │   业务数据库     │  │   主数据        │  │   外部系统      │  │   文件存储      │ │   │
│  │  │  Operational DB │  │  Master Data   │  │  External API  │  │  File Storage  │ │   │
│  │  │                │  │                │  │                │  │                │ │   │
│  │  │ • MySQL       │  │ • 组织架构     │  │ • 金蝶/用友   │  │ • OSS         │ │   │
│  │  │ • PostgreSQL  │  │ • 往来单位     │  │ • 电商平台    │  │ • S3          │ │   │
│  │  │ • MongoDB     │  │ • 会计科目     │  │ • 银行API     │  │ • MinIO       │ │   │
│  │  │               │  │ • 项目档案     │  │ • 税务局      │  │              │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │   │
│  │                                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、核心数据交换模式

### 2.1 数据交换模式总览

| 模式 | 适用场景 | 延迟 | 一致性 | 实现复杂度 |
|------|---------|------|--------|-----------|
| **同步请求响应** | 实时查询、小数据量 | <100ms | 强一致 | 低 |
| **异步消息队列** | 跨模块通知、大数据量 | <1s | 最终一致 | 中 |
| **事件驱动** | 状态变更、触发动作 | <1s | 最终一致 | 中 |
| **数据订阅** | 数据同步、缓存更新 | <1s | 最终一致 | 中 |
| **批量ETL** | 报表数据、大数据分析 | 分钟级 | 最终一致 | 高 |
| **CDC变更捕获** | 数据同步、审计日志 | <1s | 最终一致 | 高 |

### 2.2 同步请求响应模式

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        同步请求响应模式                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Client                                                                      │
│     │                                                                        │
│     │  POST /api/v1/finance/vouchers                                        │
│     │  {                                                                     │
│     │    "items": [...]                                                     │
│     │  }                                                                     │
│     ▼                                                                        │
│  ┌───────────────┐                                                          │
│  │   API Gateway │                                                          │
│  └───────┬───────┘                                                          │
│          │                                                                   │
│          ▼                                                                   │
│  ┌───────────────┐                                                          │
│  │  Voucher API  │ ──► 数据验证 ──► 业务处理 ──► 事务保存                 │
│  └───────┬───────┘                      │                                   │
│          │                              │                                   │
│          ▼                              ▼                                   │
│  ┌───────────────┐            ┌───────────────┐                          │
│  │   Response    │            │  业务数据库   │                          │
│  │  200 OK      │            │   MySQL      │                          │
│  │  {id, ...}  │            └───────────────┘                          │
│  └───────────────┘                                                          │
│                                                                              │
│  特点:                                                                      │
│  • 强一致性                                                                 │
│  • 低延迟 (<100ms)                                                          │
│  • 适合小数据量、实时性要求高的场景                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 异步消息队列模式

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        异步消息队列模式                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   HRM模块                    消息队列                      ERP模块           │
│   ┌─────────┐               ┌─────────┐                ┌─────────┐           │
│   │ 工资单  │──── 发送 ────►│  Kafka  │──── 消费 ────►│ 凭证   │           │
│   │ 生成    │               │         │                │ 生成   │           │
│   └─────────┘               └─────────┘                └─────────┘           │
│                                    │                                         │
│                                    │                                         │
│                                    ▼                                         │
│                             ┌─────────────┐                                 │
│                             │  消息日志   │                                 │
│                             │  持久化     │                                 │
│                             │  3天保留    │                                 │
│                             └─────────────┘                                 │
│                                                                              │
│   特点:                                                                      │
│   • 松耦合: HRM和ERP模块独立演进                                            │
│   • 高吞吐: 支持百万级消息/天                                               │
│   • 可靠性: 消息持久化+重试机制                                              │
│   • 最终一致性                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 事件驱动模式 (CQRS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           事件驱动架构 (CQRS)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐                                                          │
│   │   命令端    │                                                          │
│   │  Commands   │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        事件总线 (Event Bus)                           │  │
│   │                                                                      │  │
│   │   VoucherCreated  │  VoucherApproved  │  VoucherPosted              │  │
│   │        │                 │                   │                        │  │
│   │        ▼                 ▼                   ▼                        │  │
│   │   ┌────────┐       ┌────────┐         ┌────────┐                   │  │
│   │   │ 通知   │       │ 审计   │         │ 报表   │                   │  │
│   │   │ Service│       │ Log   │         │ 更新   │                   │  │
│   │   └────────┘       └────────┘         └────────┘                   │  │
│   │                                                                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   ┌─────────────┐                                                          │
│   │   查询端    │                                                          │
│   │  Queries    │                                                          │
│   └─────────────┘                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、数据交换协议设计

### 3.1 统一消息格式

```typescript
// src/types/integration/message.ts

/**
 * 统一消息格式
 */
export interface Message<T = any> {
  // 消息标识
  id: string;                    // 消息唯一ID (UUID)
  correlation_id?: string;        // 关联ID (用于请求-响应关联)
  conversation_id?: string;      // 会话ID (用于长流程)
  
  // 消息类型
  type: MessageType;
  event_type?: string;          // 事件类型
  action?: string;               // 操作类型
  
  // 消息内容
  payload: T;
  
  // 元数据
  metadata: MessageMetadata;
  
  // 时间戳
  timestamp: string;              // ISO8601格式
  expires_at?: string;           // 过期时间
  
  // 路由信息
  source: MessageEndpoint;       // 消息来源
  destination?: MessageEndpoint[]; // 消息目的地
  
  // 处理信息
  headers?: Record<string, string>;
  reply_to?: string;             // 回复地址
}

export type MessageType = 
  | 'command'    // 命令 (需要响应)
  | 'event'     // 事件 (广播通知)
  | 'query'     // 查询 (需要响应)
  | 'response'   // 响应
  | 'document';  // 文档 (大数据量)

export interface MessageMetadata {
  // 来源信息
  source_system: string;         // 来源系统
  source_module: string;         // 来源模块
  source_user_id?: string;       // 来源用户
  
  // 业务信息
  business_type?: string;        // 业务类型
  business_id?: string;          // 业务ID
  
  // 处理信息
  retry_count: number;           // 重试次数
  max_retries: number;          // 最大重试
  priority: MessagePriority;      // 优先级
  
  // 追踪信息
  trace_id?: string;             // 链路追踪ID
  span_id?: string;              // Span ID
}

export type MessagePriority = 'high' | 'normal' | 'low';

/**
 * 消息端点
 */
export interface MessageEndpoint {
  system: string;                 // 系统名称
  module: string;                // 模块名称
  service?: string;               // 服务名称
  topic?: string;                // 主题/队列名
  routing_key?: string;          // 路由键
}

/**
 * 消息确认
 */
export interface MessageAck {
  message_id: string;
  status: 'acked' | 'nacked' | 'rejected';
  timestamp: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
```

### 3.2 业务事件定义

```typescript
// src/types/integration/events.ts

/**
 * HRM模块事件
 */
export interface HrmEvents {
  // 员工事件
  'hrm.employee.created': {
    employee_id: string;
    employee_number: string;
    name: string;
    department_id: string;
    position: string;
    hire_date: string;
  };
  
  'hrm.employee.updated': {
    employee_id: string;
    changes: Record<string, { old: any; new: any }>;
  };
  
  'hrm.employee.resigned': {
    employee_id: string;
    leave_date: string;
    final_salary: number;
  };
  
  // 考勤事件
  'hrm.attendance.recorded': {
    employee_id: string;
    date: string;
    work_hours: number;
    overtime_hours: number;
  };
  
  // 工资事件
  'hrm.payroll.calculated': {
    period: string;
    department_id: string;
    total_amount: number;
    employee_count: number;
  };
  
  'hrm.payroll.approved': {
    period: string;
    approved_by: string;
    approved_at: string;
  };
  
  'hrm.payroll.paid': {
    period: string;
    paid_amount: number;
    paid_count: number;
    bank_transaction_id?: string;
  };
}

/**
 * CRM模块事件
 */
export interface CrmEvents {
  // 客户事件
  'crm.customer.created': {
    customer_id: string;
    customer_code: string;
    name: string;
    credit_limit: number;
  };
  
  'crm.customer.credit_updated': {
    customer_id: string;
    old_limit: number;
    new_limit: number;
  };
  
  // 商机事件
  'crm.opportunity.created': {
    opportunity_id: string;
    customer_id: string;
    value: number;
    stage: string;
  };
  
  'crm.opportunity.stage_changed': {
    opportunity_id: string;
    old_stage: string;
    new_stage: string;
    probability: number;
  };
  
  // 销售发票事件
  'crm.invoice.issued': {
    invoice_id: string;
    invoice_no: string;
    customer_id: string;
    amount: number;
    due_date: string;
  };
  
  'crm.invoice.received': {
    invoice_id: string;
    received_amount: number;
    received_date: string;
    remaining_amount: number;
  };
  
  // 收款事件
  'crm.collection.recorded': {
    collection_id: string;
    customer_id: string;
    amount: number;
    collection_date: string;
    invoice_ids: string[];
  };
}

/**
 * SRM模块事件
 */
export interface SrmEvents {
  // 供应商事件
  'srm.supplier.created': {
    supplier_id: string;
    supplier_code: string;
    name: string;
  };
  
  // 采购事件
  'srm.purchase_order.created': {
    order_id: string;
    order_no: string;
    supplier_id: string;
    total_amount: number;
  };
  
  'srm.purchase_order.approved': {
    order_id: string;
    approved_by: string;
  };
  
  // 收货事件
  'srm.goods_received': {
    receive_id: string;
    receive_no: string;
    order_id: string;
    supplier_id: string;
    total_amount: number;
  };
  
  // 采购发票事件
  'srm.invoice.received': {
    invoice_id: string;
    invoice_no: string;
    supplier_id: string;
    amount: number;
    due_date: string;
  };
  
  // 付款事件
  'srm.payment.made': {
    payment_id: string;
    supplier_id: string;
    amount: number;
    payment_date: string;
    invoice_ids: string[];
  };
}

/**
 * PM模块事件
 */
export interface PmEvents {
  // 项目事件
  'pm.project.created': {
    project_id: string;
    project_code: string;
    name: string;
    organization_id: string;
    budget: number;
  };
  
  'pm.project.status_changed': {
    project_id: string;
    old_status: string;
    new_status: string;
  };
  
  'pm.project.budget_updated': {
    project_id: string;
    old_budget: number;
    new_budget: number;
  };
  
  // 成本事件
  'pm.cost.recorded': {
    project_id: string;
    cost_type: 'labor' | 'material' | 'subcontract' | 'expense';
    amount: number;
    department_id?: string;
    employee_id?: string;
    record_date: string;
  };
  
  // 里程碑事件
  'pm.milestone.completed': {
    project_id: string;
    milestone_id: string;
    completed_date: string;
    confirm_amount: number;
  };
  
  // 收入确认事件
  'pm.revenue.confirmed': {
    project_id: string;
    milestone_id?: string;
    amount: number;
    confirmed_date: string;
    invoice_id?: string;
  };
}

/**
 * ERP财务模块事件
 */
export interface ErpEvents {
  // 凭证事件
  'erp.voucher.created': {
    voucher_id: string;
    voucher_no: string;
    period: string;
    total_amount: number;
    creator: string;
  };
  
  'erp.voucher.approved': {
    voucher_id: string;
    approved_by: string;
    approved_at: string;
  };
  
  'erp.voucher.posted': {
    voucher_id: string;
    posted_by: string;
    posted_at: string;
  };
  
  'erp.voucher.reversed': {
    voucher_id: string;
    reversed_by: string;
    reversed_at: string;
    reverse_reason: string;
  };
  
  // 会计期间事件
  'erp.period.opened': {
    period: string;
    company_id: string;
  };
  
  'erp.period.closed': {
    period: string;
    company_id: string;
    closed_by: string;
  };
  
  // 固定资产事件
  'erp.asset.depreciation': {
    asset_id: string;
    period: string;
    depreciation_amount: number;
    accumulated_depreciation: number;
  };
  
  // 银行事件
  'erp.bank.transaction': {
    bank_account_id: string;
    transaction_type: 'debit' | 'credit';
    amount: number;
    balance: number;
    reference: string;
  };
}

/**
 * 跨模块业务事件
 */
export interface CrossModuleEvents {
  // 销售到收款闭环
  'business.sale_to_collection.completed': {
    opportunity_id: string;
    project_id?: string;
    invoice_id: string;
    collection_id: string;
    voucher_id: string;
    total_amount: number;
    collection_rate: number;
  };
  
  // 采购到付款闭环
  'business.purchase_to_payment.completed': {
    order_id: string;
    invoice_id: string;
    payment_id: string;
    voucher_id: string;
    total_amount: number;
    payment_rate: number;
  };
  
  // 工资发放闭环
  'business.payroll_completed': {
    period: string;
    payroll_id: string;
    voucher_id: string;
    total_amount: number;
    employee_count: number;
  };
  
  // 项目成本归集完成
  'business.project_cost_recorded': {
    project_id: string;
    period: string;
    labor_cost: number;
    material_cost: number;
    subcontract_cost: number;
    total_cost: number;
  };
  
  // 质量成本统计
  'business.quality_cost_calculated': {
    period: string;
    company_id: string;
    prevention_cost: number;
    appraisal_cost: number;
    internal_loss: number;
    external_loss: number;
    total_cost: number;
  };
}
```

### 3.3 消息路由规则

```typescript
// src/types/integration/routing.ts

/**
 * 消息路由规则
 */
export interface RoutingRule {
  id: string;
  name: string;
  
  // 匹配条件
  match: RoutingMatch;
  
  // 目的地
  destination: RoutingDestination;
  
  // 转换规则
  transform?: MessageTransform;
  
  // 过滤条件
  filter?: RoutingFilter[];
  
  // 优先级
  priority: number;
  
  // 状态
  enabled: boolean;
  
  created_at: string;
}

export interface RoutingMatch {
  // 匹配的消息类型
  message_type?: MessageType[];
  
  // 匹配的事件类型 (支持通配符)
  event_type?: string[];  // 如: ['hrm.employee.*', 'crm.*']
  
  // 匹配的系统/模块
  source_system?: string[];
  source_module?: string[];
  
  // 自定义条件 (SPEL表达式)
  custom_condition?: string;
}

export interface RoutingDestination {
  // 目标类型
  type: 'queue' | 'topic' | 'service' | 'webhook';
  
  // 目标地址
  target: string;
  
  // 投递模式
  delivery_mode: 'sync' | 'async' | 'confirm';
  
  // 超时设置
  timeout?: number;
}

export interface MessageTransform {
  // 字段映射
  field_mapping?: Record<string, string>;
  
  // 字段转换表达式
  field_transforms?: {
    field: string;
    expression: string;  // JSONata表达式
  }[];
  
  // 添加字段
  add_fields?: Record<string, any>;
  
  // 移除字段
  remove_fields?: string[];
  
  // 模板转换
  template?: string;
}

export interface RoutingFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains' | 'regex';
  value: any;
}
```

---

## 四、数据交换服务实现

### 4.1 消息服务 (MessageService)

```typescript
// src/services/integration/MessageService.ts

import { v4 as uuidv4 } from 'uuid';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import Redis from 'ioredis';

/**
 * 消息服务
 */
export class MessageService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private redis: Redis;
  private handlers: Map<string, MessageHandler[]>;
  
  constructor(config: MessageServiceConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
    });
    
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    
    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
    
    this.redis = new Redis(config.redis);
    this.handlers = new Map();
  }
  
  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    await this.producer.connect();
    await this.consumer.connect();
    
    // 订阅系统级主题
    await this.consumer.subscribe({ 
      topics: ['system.events', 'business.events', 'finance.events'],
      fromBeginning: false 
    });
    
    // 启动消费者
    await this.consumer.run({
      eachMessage: async (payload) => {
        await this.handleMessage(payload);
      },
    });
  }
  
  /**
   * 发送消息
   */
  async send<T>(topic: string, message: Message<T>): Promise<void> {
    const enrichedMessage = {
      ...message,
      id: message.id || uuidv4(),
      timestamp: message.timestamp || new Date().toISOString(),
      metadata: {
        ...message.metadata,
        retry_count: 0,
      },
    };
    
    await this.producer.send({
      topic,
      messages: [
        {
          key: this.getMessageKey(enrichedMessage),
          value: JSON.stringify(enrichedMessage),
          headers: {
            'correlation-id': enrichedMessage.correlation_id || '',
            'source-system': enrichedMessage.source.system,
            'message-type': enrichedMessage.type,
          },
        },
      ],
    });
    
    // 记录消息日志
    await this.logMessage(enrichedMessage);
  }
  
  /**
   * 发布事件
   */
  async publish<T>(eventType: string, payload: T, metadata?: Partial<MessageMetadata>): Promise<void> {
    const message: Message<T> = {
      id: uuidv4(),
      type: 'event',
      event_type: eventType,
      payload,
      metadata: {
        source_system: this.systemName,
        source_module: this.moduleName,
        retry_count: 0,
        max_retries: 3,
        priority: 'normal',
        ...metadata,
      },
      source: {
        system: this.systemName,
        module: this.moduleName,
      },
    };
    
    const topic = this.getTopicForEvent(eventType);
    await this.send(topic, message);
  }
  
  /**
   * 发送命令并等待响应
   */
  async sendCommand<T, R>(
    commandType: string, 
    payload: T, 
    options?: { timeout?: number; correlationId?: string }
  ): Promise<R> {
    const correlationId = options?.correlationId || uuidv4();
    
    const message: Message<T> = {
      id: uuidv4(),
      type: 'command',
      action: commandType,
      payload,
      metadata: {
        source_system: this.systemName,
        source_module: this.moduleName,
        retry_count: 0,
        max_retries: 0,  // 命令不重试
        priority: 'high',
      },
      source: {
        system: this.systemName,
        module: this.moduleName,
      },
      correlation_id: correlationId,
      reply_to: `reply.${this.systemName}`,
    };
    
    // 发送到命令队列
    const topic = `commands.${commandType}`;
    await this.send(topic, message);
    
    // 等待响应
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.redis.del(`response:${correlationId}`);
        reject(new Error(`Command timeout: ${commandType}`));
      }, options?.timeout || 30000);
      
      // 监听响应
      this.redis.subscribe(`response:${correlationId}`);
      this.redis.on('message', (channel, data) => {
        if (channel === `response:${correlationId}`) {
          clearTimeout(timeout);
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.data);
          }
        }
      });
    });
  }
  
  /**
   * 订阅消息
   */
  async subscribe<T>(
    topic: string | string[],
    handler: MessageHandler<T>
  ): Promise<void> {
    const topics = Array.isArray(topic) ? topic : [topic];
    
    for (const t of topics) {
      if (!this.handlers.has(t)) {
        this.handlers.set(t, []);
        await this.consumer.subscribe({ topic: t, fromBeginning: false });
      }
      
      this.handlers.get(t)!.push(handler as MessageHandler);
    }
  }
  
  /**
   * 处理消息
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    
    if (!message.value) return;
    
    const messageStr = message.value.toString();
    const message: Message = JSON.parse(messageStr);
    
    try {
      // 更新处理计数
      message.metadata.retry_count++;
      
      // 获取处理器
      const handlers = this.handlers.get(topic) || [];
      
      // 执行所有处理器
      const promises = handlers.map(handler => 
        handler(message).catch(err => {
          console.error(`Handler error for message ${message.id}:`, err);
          return this.handleHandlerError(message, err);
        })
      );
      
      await Promise.all(promises);
      
      // 记录处理成功
      await this.logSuccess(message);
      
    } catch (error) {
      console.error('Message processing error:', error);
      await this.handleMessageError(message, error);
    }
  }
  
  /**
   * 错误处理
   */
  private async handleHandlerError(message: Message, error: any): Promise<void> {
    if (message.metadata.retry_count < message.metadata.max_retries) {
      // 重新入队
      const delay = Math.pow(2, message.metadata.retry_count) * 1000;  // 指数退避
      await this.requeueMessage(message, delay);
    } else {
      // 发送到死信队列
      await this.sendToDeadLetter(message, error);
    }
  }
  
  /**
   * 重新入队
   */
  private async requeueMessage(message: Message, delay: number): Promise<void> {
    await this.redis.zadd(
      'message:retry',
      Date.now() + delay,
      JSON.stringify(message)
    );
  }
  
  /**
   * 发送到死信队列
   */
  private async sendToDeadLetter(message: Message, error: any): Promise<void> {
    const deadLetter = {
      original_message: message,
      error: {
        message: error.message,
        stack: error.stack,
      },
      failed_at: new Date().toISOString(),
      retry_count: message.metadata.retry_count,
    };
    
    await this.redis.lpush('message:deadletter', JSON.stringify(deadLetter));
    
    // 发送告警通知
    await this.sendAlert({
      level: 'error',
      title: '消息处理失败',
      message: `Message ${message.id} failed after ${message.metadata.retry_count} retries`,
      data: deadLetter,
    });
  }
  
  /**
   * 获取消息Key
   */
  private getMessageKey(message: Message): string {
    if (message.metadata.business_id) {
      return `${message.source.system}:${message.metadata.business_id}`;
    }
    return message.id;
  }
  
  /**
   * 获取事件对应的主题
   */
  private getTopicForEvent(eventType: string): string {
    const [module] = eventType.split('.');
    return `${module}.events`;
  }
}

type MessageHandler<T = any> = (message: Message<T>) => Promise<void>;
```

### 4.2 数据同步服务 (DataSyncService)

```typescript
// src/services/integration/DataSyncService.ts

/**
 * 数据同步服务
 */
export class DataSyncService {
  private kafka: Kafka;
  private mysql: mysql.Connection;
  private redis: Redis;
  private cdcClient: DebeziumClient;
  
  /**
   * 初始化CDC (Change Data Capture)
   */
  async initCDC(config: CDCConfig): Promise<void> {
    this.cdcClient = new DebeziumClient({
      hostname: config.hostname,
      port: config.port,
      serverId: config.serverId,
    });
    
    // 监听数据变更
    await this.cdcClient.subscribe({
      database: config.database,
      tables: config.tables,  // ['hrm.employees', 'crm.customers', ...]
      callbacks: {
        onCreate: async (data) => await this.handleCreate(data),
        onUpdate: async (data) => await this.handleUpdate(data),
        onDelete: async (data) => await this.handleDelete(data),
      },
    });
  }
  
  /**
   * 处理新增数据
   */
  private async handleCreate(data: CDCData): Promise<void> {
    const syncTask = await this.getSyncTask(data.table);
    
    if (!syncTask) return;
    
    // 获取完整数据
    const fullData = await this.getFullData(data.table, data.id);
    
    // 转换为目标格式
    const transformedData = this.transformData(fullData, syncTask);
    
    // 发送到目标系统
    await this.syncToTarget(data.table, transformedData, syncTask);
    
    // 更新同步状态
    await this.updateSyncStatus(data.table, data.id, 'synced');
  }
  
  /**
   * 处理更新数据
   */
  private async handleUpdate(data: CDCData): Promise<void> {
    const syncTask = await this.getSyncTask(data.table);
    
    if (!syncTask || !syncTask.update_policy) {
      // 无更新策略，检查是否有变更
      return;
    }
    
    const changes = this.extractChanges(data.old, data.new);
    
    if (this.shouldSyncChanges(changes, syncTask)) {
      const fullData = await this.getFullData(data.table, data.id);
      const transformedData = this.transformData(fullData, syncTask);
      
      await this.syncToTarget(data.table, transformedData, syncTask);
      await this.updateSyncStatus(data.table, data.id, 'synced');
    }
  }
  
  /**
   * 处理删除数据
   */
  private async handleDelete(data: CDCData): Promise<void> {
    const syncTask = await this.getSyncTask(data.table);
    
    if (!syncTask) return;
    
    // 根据策略处理删除
    switch (syncTask.delete_policy) {
      case 'cascade':
        // 级联删除目标数据
        await this.deleteTargetData(data.table, data.id, syncTask);
        break;
        
      case 'soft_delete':
        // 软删除目标数据
        await this.softDeleteTargetData(data.table, data.id, syncTask);
        break;
        
      case 'archive':
        // 归档到历史表
        await this.archiveData(data.table, data.id, syncTask);
        break;
        
      case 'ignore':
        // 忽略
        break;
    }
  }
  
  /**
   * 批量同步
   */
  async batchSync(params: {
    source_table: string;
    target_system: string;
    batch_size?: number;
    date_range?: { start: string; end: string };
  }): Promise<SyncResult> {
    const result: SyncResult = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
    };
    
    // 获取待同步数据
    const data = await this.getPendingSyncData({
      table: params.source_table,
      batch_size: params.batch_size || 1000,
      date_range: params.date_range,
    });
    
    result.total = data.length;
    
    // 分批处理
    for (const item of data) {
      try {
        await this.syncSingleRecord(item, params.target_system);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          id: item.id,
          error: error.message,
        });
      }
    }
    
    return result;
  }
  
  /**
   * 双向同步
   */
  async bidirectionalSync(params: {
    source_table: string;
    target_table: string;
    conflict_strategy: 'source_wins' | 'target_wins' | 'newest_wins' | 'manual';
  }): Promise<void> {
    // 获取源数据
    const sourceData = await this.getTableData(params.source_table);
    
    // 获取目标数据
    const targetData = await this.getTableData(params.target_table);
    
    // 构建差异
    const diffs = this.computeDiffs(sourceData, targetData);
    
    // 处理冲突
    for (const diff of diffs) {
      await this.resolveConflict(diff, params.conflict_strategy);
    }
  }
}
```

### 4.3 数据转换服务 (TransformService)

```typescript
// src/services/integration/TransformService.ts

import jsonata from 'jsonata';

/**
 * 数据转换服务
 */
export class TransformService {
  private expressionCache: Map<string, jsonata.Expression>;
  
  /**
   * 字段映射转换
   */
  transform<T, R>(data: T, mapping: FieldMapping[]): R {
    const result: any = {};
    
    for (const map of mapping) {
      const value = this.getNestedValue(data, map.source_field);
      const transformedValue = map.transform 
        ? this.applyTransform(value, map.transform)
        : value;
      
      this.setNestedValue(result, map.target_field, transformedValue);
    }
    
    return result;
  }
  
  /**
   * 应用JSONata表达式转换
   */
  applyTransform(value: any, expression: string): any {
    try {
      let exp = this.expressionCache.get(expression);
      
      if (!exp) {
        exp = jsonata(expression);
        this.expressionCache.set(expression, exp);
      }
      
      return exp.evaluate(value);
    } catch (error) {
      console.error(`Transform expression error: ${expression}`, error);
      return value;
    }
  }
  
  /**
   * 批量数据转换
   */
  batchTransform<T, R>(
    dataList: T[], 
    mapping: FieldMapping[]
  ): R[] {
    return dataList.map(data => this.transform(data, mapping));
  }
  
  /**
   * 组合多个转换规则
   */
  composeTransforms(
    transforms: TransformRule[]
  ): (data: any) => any {
    return (data: any) => {
      let result = { ...data };
      
      for (const transform of transforms) {
        switch (transform.type) {
          case 'field_mapping':
            result = this.transform(result, transform.mapping);
            break;
          case 'filter':
            result = this.applyFilter(result, transform.filter);
            break;
          case 'aggregate':
            result = this.applyAggregation(result, transform.aggregation);
            break;
          case 'custom':
            result = transform.customFn(result);
            break;
        }
      }
      
      return result;
    };
  }
  
  /**
   * 获取嵌套字段值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => 
      current?.[key], obj
    );
  }
  
  /**
   * 设置嵌套字段值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    
    target[lastKey!] = value;
  }
}

/**
 * 字段映射
 */
export interface FieldMapping {
  source_field: string;      // 源字段
  target_field: string;      // 目标字段
  transform?: string;        // 转换表达式
  default_value?: any;       // 默认值
  required?: boolean;        // 是否必填
}

/**
 * 转换规则
 */
export interface TransformRule {
  type: 'field_mapping' | 'filter' | 'aggregate' | 'custom';
  mapping?: FieldMapping[];
  filter?: FilterRule;
  aggregation?: AggregationRule;
  customFn?: (data: any) => any;
}
```

### 4.4 外部系统适配器

```typescript
// src/services/integration/adapters/BaseAdapter.ts

/**
 * 适配器基类
 */
export abstract class BaseAdapter {
  protected config: AdapterConfig;
  protected httpClient: AxiosInstance;
  protected retryConfig: RetryConfig;
  
  constructor(config: AdapterConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: config.endpoint,
      timeout: config.timeout || 30000,
    });
    
    this.retryConfig = {
      maxRetries: config.retry_times || 3,
      retryDelay: config.retry_delay || 1000,
      backoffMultiplier: 2,
    };
  }
  
  /**
   * 认证
   */
  abstract authenticate(): Promise<string>;
  
  /**
   * 获取数据
   */
  abstract fetchData(params: any): Promise<any>;
  
  /**
   * 发送数据
   */
  abstract sendData(data: any): Promise<any>;
  
  /**
   * 带重试的执行
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= this.retryConfig.maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // 判断是否可重试
        if (!this.isRetryable(error) || i === this.retryConfig.maxRetries) {
          throw error;
        }
        
        const delay = this.retryConfig.retryDelay * 
          Math.pow(this.retryConfig.backoffMultiplier, i);
        
        console.log(`Retry ${i + 1}/${this.retryConfig.maxRetries} for ${context} after ${delay}ms`);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }
  
  /**
   * 判断错误是否可重试
   */
  protected isRetryable(error: any): boolean {
    // 网络错误
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
      return true;
    }
    
    // HTTP 5xx 错误
    if (error.response?.status >= 500) {
      return true;
    }
    
    // HTTP 429 (限流)
    if (error.response?.status === 429) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 睡眠
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 金蝶K3 Cloud适配器
 */
export class KingdeeAdapter extends BaseAdapter {
  private token: string | null = null;
  
  async authenticate(): Promise<string> {
    const response = await this.withRetry(() =>
      this.httpClient.post('/api/v1/auth/login', {
        username: this.config.username,
        password: this.config.password,
      })
    );
    
    this.token = response.data.access_token;
    return this.token;
  }
  
  async fetchData(params: {
    entity: string;
    fields?: string[];
    filter?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<any>> {
    await this.ensureAuthenticated();
    
    const response = await this.withRetry(() =>
      this.httpClient.get(`/api/v1/${params.entity}`, {
        headers: { Authorization: `Bearer ${this.token}` },
        params: {
          fields: params.fields?.join(','),
          filter: params.filter,
          page: params.page,
          pageSize: params.pageSize,
        },
      })
    );
    
    return this.transformResponse(response.data);
  }
  
  async sendData(data: {
    entity: string;
    action: 'create' | 'update' | 'delete' | 'submit' | 'approve';
    payload: any;
  }): Promise<any> {
    await this.ensureAuthenticated();
    
    const endpoint = `/api/v1/${data.entity}/${data.action}`;
    
    const response = await this.withRetry(() =>
      this.httpClient.post(endpoint, data.payload, {
        headers: { Authorization: `Bearer ${this.token}` },
      })
    );
    
    return response.data;
  }
  
  /**
   * 批量创建凭证
   */
  async batchCreateVouchers(vouchers: CreateVoucherRequest[]): Promise<BatchCreateResult> {
    const results = {
      total: vouchers.length,
      success: 0,
      failed: 0,
      errors: [] as { index: number; error: string }[],
    };
    
    // 分批处理，每批10条
    const batchSize = 10;
    for (let i = 0; i < vouchers.length; i += batchSize) {
      const batch = vouchers.slice(i, i + batchSize);
      
      try {
        await this.withRetry(() =>
          this.httpClient.post(
            '/api/v1/gl/vouchers/batch',
            { vouchers: batch },
            { headers: { Authorization: `Bearer ${this.token}` } }
          )
        );
        results.success += batch.length;
      } catch (error: any) {
        results.failed += batch.length;
        results.errors.push({
          index: i,
          error: error.message,
        });
      }
    }
    
    return results;
  }
  
  private async ensureAuthenticated(): Promise<void> {
    if (!this.token) {
      await this.authenticate();
    }
  }
  
  private transformResponse(data: any): PaginatedResult<any> {
    return {
      items: data.List || [],
      total: data.TotalCount || 0,
      page: data.PageIndex || 1,
      pageSize: data.PageSize || 100,
    };
  }
}

/**
 * 用友U8适配器
 */
export class YonyouAdapter extends BaseAdapter {
  private session: string | null = null;
  
  async authenticate(): Promise<string> {
    const response = await this.withRetry(() =>
      this.httpClient.post('/u8api/login', {
        account: this.config.username,
        password: this.config.password,
      })
    );
    
    this.session = response.data.session_id;
    return this.session!;
  }
  
  async fetchData(params: {
    api_name: string;
    params?: Record<string, any>;
  }): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await this.withRetry(() =>
      this.httpClient.post(
        `/u8api/${params.api_name}`,
        params.params || {},
        { headers: { Authorization: this.session } }
      )
    );
    
    return response.data;
  }
  
  async sendData(data: {
    api_name: string;
    params: Record<string, any>;
  }): Promise<any> {
    await this.ensureAuthenticated();
    
    const response = await this.withRetry(() =>
      this.httpClient.post(
        `/u8api/${data.api_name}`,
        data.params,
        { headers: { Authorization: this.session } }
      )
    );
    
    return response.data;
  }
}

/**
 * SAP S/4HANA适配器
 */
export class SapAdapter extends BaseAdapter {
  async authenticate(): Promise<string> {
    // SAP使用Basic Auth
    const auth = Buffer.from(
      `${this.config.username}:${this.config.password}`
    ).toString('base64');
    
    return `Basic ${auth}`;
  }
  
  async fetchData(params: {
    endpoint: string;
    query?: Record<string, string>;
  }): Promise<any> {
    const token = await this.authenticate();
    
    const response = await this.withRetry(() =>
      this.httpClient.get(params.endpoint, {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        params: params.query,
      })
    );
    
    return response.data;
  }
  
  async sendData(data: {
    endpoint: string;
    method: 'POST' | 'PUT' | 'DELETE';
    body: any;
  }): Promise<any> {
    const token = await this.authenticate();
    
    const response = await this.withRetry(() =>
      this.httpClient.request({
        method: data.method,
        url: data.endpoint,
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        data: data.body,
      })
    );
    
    return response.data;
  }
  
  /**
   * 调用BAPI
   */
  async callBAPI(bapiName: string, params: any): Promise<BAPIResponse> {
    const response = await this.sendData({
      endpoint: `/sap/bc/rest/ygl/bapi_${bapiName}`,
      method: 'POST',
      body: params,
    });
    
    // 检查是否有错误
    const errors = response.RETURN?.filter(
      (r: any) => r.TYPE === 'E'
    );
    
    if (errors?.length > 0) {
      throw new Error(errors.map((e: any) => e.MESSAGE).join('; '));
    }
    
    return response;
  }
  
  /**
   * 提交事务
   */
  async commitTransaction(): Promise<void> {
    await this.sendData({
      endpoint: '/sap/bc/rest/ygl/bapi_transaction_commit',
      method: 'POST',
      body: {},
    });
  }
  
  /**
   * 回滚事务
   */
  async rollbackTransaction(): Promise<void> {
    await this.sendData({
      endpoint: '/sap/bc/rest/ygl/bapi_transaction_rollback',
      method: 'POST',
      body: {},
    });
  }
}
```

---

## 五、数据交换API设计

### 5.1 统一数据交换API

```typescript
// src/api/integration/exchange.ts

/**
 * 数据交换API
 */
export const exchangeApi = {
  // ============ 消息发送 ============
  
  /**
   * 发送消息
   */
  sendMessage: (topic: string, message: any) =>
    integrationClient.post(`/api/v1/exchange/messages/${topic}`, message),
  
  /**
   * 发布事件
   */
  publishEvent: (eventType: string, payload: any) =>
    integrationClient.post('/api/v1/exchange/events', {
      event_type: eventType,
      payload,
    }),
  
  /**
   * 发送命令
   */
  sendCommand: <T, R>(commandType: string, payload: T, timeout?: number) =>
    integrationClient.post<R>(`/api/v1/exchange/commands/${commandType}`, {
      payload,
      timeout,
    }),
  
  // ============ 数据同步 ============
  
  /**
   * 触发同步任务
   */
  triggerSync: (taskId: string, params?: { full_sync?: boolean }) =>
    integrationClient.post(`/api/v1/exchange/sync/${taskId}/trigger`, params),
  
  /**
   * 获取同步状态
   */
  getSyncStatus: (taskId: string) =>
    integrationClient.get(`/api/v1/exchange/sync/${taskId}/status`),
  
  /**
   * 获取同步历史
   */
  getSyncHistory: (params: {
    task_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => integrationClient.get('/api/v1/exchange/sync/history', { params }),
  
  /**
   * 批量同步
   */
  batchSync: (requests: {
    source_entity: string;
    target_entity: string;
    record_ids: string[];
  }[]) => integrationClient.post('/api/v1/exchange/sync/batch', { requests }),
  
  // ============ 数据转换 ============
  
  /**
   * 转换数据
   */
  transform: (mappingId: string, data: any) =>
    integrationClient.post(`/api/v1/exchange/transform/${mappingId}`, data),
  
  /**
   * 批量转换
   */
  batchTransform: (mappingId: string, dataList: any[]) =>
    integrationClient.post(`/api/v1/exchange/transform/${mappingId}/batch`, {
      data_list: dataList,
    }),
  
  /**
   * 预览转换结果
   */
  previewTransform: (mappingId: string, sampleData: any) =>
    integrationClient.post(`/api/v1/exchange/transform/${mappingId}/preview`, sampleData),
  
  // ============ 数据订阅 ============
  
  /**
   * 创建订阅
   */
  createSubscription: (data: {
    name: string;
    entity: string;
    events: string[];
    filter?: string;
    endpoint: string;
    endpoint_type: 'webhook' | 'queue' | 'service';
  }) => integrationClient.post('/api/v1/exchange/subscriptions', data),
  
  /**
   * 获取订阅列表
   */
  getSubscriptions: (params?: { entity?: string; status?: string }) =>
    integrationClient.get('/api/v1/exchange/subscriptions', { params }),
  
  /**
   * 更新订阅
   */
  updateSubscription: (id: string, data: Partial<Subscription>) =>
    integrationClient.put(`/api/v1/exchange/subscriptions/${id}`, data),
  
  /**
   * 删除订阅
   */
  deleteSubscription: (id: string) =>
    integrationClient.delete(`/api/v1/exchange/subscriptions/${id}`),
  
  /**
   * 测试订阅
   */
  testSubscription: (id: string) =>
    integrationClient.post(`/api/v1/exchange/subscriptions/${id}/test`, {}),
  
  // ============ 消息监控 ============
  
  /**
   * 获取消息列表
   */
  getMessages: (params: {
    topic?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => integrationClient.get('/api/v1/exchange/messages', { params }),
  
  /**
   * 获取消息详情
   */
  getMessage: (messageId: string) =>
    integrationClient.get(`/api/v1/exchange/messages/${messageId}`),
  
  /**
   * 重新投递消息
   */
  redeliverMessage: (messageId: string) =>
    integrationClient.post(`/api/v1/exchange/messages/${messageId}/redeliver`, {}),
  
  /**
   * 获取死信消息
   */
  getDeadLetterMessages: (params?: {
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => integrationClient.get('/api/v1/exchange/dead-letter', { params }),
  
  /**
   * 重试死信消息
   */
  retryDeadLetterMessage: (messageId: string) =>
    integrationClient.post(`/api/v1/exchange/dead-letter/${messageId}/retry`, {}),
  
  // ============ 统计监控 ============
  
  /**
   * 获取交换统计
   */
  getStatistics: (params: {
    period: 'hour' | 'day' | 'week' | 'month';
    start_date?: string;
    end_date?: string;
    topics?: string[];
  }) => integrationClient.get('/api/v1/exchange/statistics', { params }),
  
  /**
   * 获取健康状态
   */
  getHealthStatus: () =>
    integrationClient.get('/api/v1/exchange/health'),
};
```

---

## 六、数据交换配置

### 6.1 路由规则配置

```typescript
// src/config/integration-routes.ts

/**
 * 数据交换路由规则配置
 */
export const integrationRoutes: RoutingRule[] = [
  // ============ HRM -> ERP 路由 ============
  {
    id: 'route-hrm-employee-to-erp',
    name: '员工数据同步到ERP',
    match: {
      message_type: ['event'],
      event_type: ['hrm.employee.*'],
      source_module: 'hrm',
    },
    destination: {
      type: 'queue',
      target: 'erp.employee.sync',
      delivery_mode: 'async',
    },
    filter: [
      { field: 'event_type', operator: 'in', value: ['hrm.employee.created', 'hrm.employee.updated'] },
    ],
    priority: 10,
    enabled: true,
  },
  
  {
    id: 'route-hrm-payroll-to-erp',
    name: '工资单生成凭证',
    match: {
      message_type: ['event'],
      event_type: ['hrm.payroll.approved'],
      source_module: 'hrm',
    },
    destination: {
      type: 'service',
      target: 'erp-voucher-service',
      delivery_mode: 'async',
      timeout: 60000,
    },
    priority: 20,
    enabled: true,
  },
  
  // ============ CRM -> ERP 路由 ============
  {
    id: 'route-crm-customer-to-erp',
    name: '客户数据同步到ERP',
    match: {
      message_type: ['event'],
      event_type: ['crm.customer.*'],
      source_module: 'crm',
    },
    destination: {
      type: 'queue',
      target: 'erp.customer.sync',
      delivery_mode: 'async',
    },
    priority: 10,
    enabled: true,
  },
  
  {
    id: 'route-crm-invoice-to-erp',
    name: '销售发票生成应收凭证',
    match: {
      message_type: ['event'],
      event_type: ['crm.invoice.issued'],
      source_module: 'crm',
    },
    destination: {
      type: 'service',
      target: 'erp-ar-service',
      delivery_mode: 'async',
      timeout: 30000,
    },
    priority: 20,
    enabled: true,
  },
  
  {
    id: 'route-crm-collection-to-erp',
    name: '收款生成收款凭证',
    match: {
      message_type: ['event'],
      event_type: ['crm.collection.recorded'],
      source_module: 'crm',
    },
    destination: {
      type: 'service',
      target: 'erp-receipt-service',
      delivery_mode: 'async',
      timeout: 30000,
    },
    priority: 20,
    enabled: true,
  },
  
  // ============ SRM -> ERP 路由 ============
  {
    id: 'route-srm-supplier-to-erp',
    name: '供应商数据同步到ERP',
    match: {
      message_type: ['event'],
      event_type: ['srm.supplier.*'],
      source_module: 'srm',
    },
    destination: {
      type: 'queue',
      target: 'erp.supplier.sync',
      delivery_mode: 'async',
    },
    priority: 10,
    enabled: true,
  },
  
  {
    id: 'route-srm-invoice-to-erp',
    name: '采购发票生成应付凭证',
    match: {
      message_type: ['event'],
      event_type: ['srm.invoice.received'],
      source_module: 'srm',
    },
    destination: {
      type: 'service',
      target: 'erp-ap-service',
      delivery_mode: 'async',
      timeout: 30000,
    },
    priority: 20,
    enabled: true,
  },
  
  {
    id: 'route-srm-payment-to-erp',
    name: '付款生成付款凭证',
    match: {
      message_type: ['event'],
      event_type: ['srm.payment.made'],
      source_module: 'srm',
    },
    destination: {
      type: 'service',
      target: 'erp-payment-service',
      delivery_mode: 'async',
      timeout: 30000,
    },
    priority: 20,
    enabled: true,
  },
  
  // ============ PM -> ERP 路由 ============
  {
    id: 'route-pm-project-to-erp',
    name: '项目数据同步到ERP',
    match: {
      message_type: ['event'],
      event_type: ['pm.project.*'],
      source_module: 'pm',
    },
    destination: {
      type: 'queue',
      target: 'erp.project.sync',
      delivery_mode: 'async',
    },
    priority: 10,
    enabled: true,
  },
  
  {
    id: 'route-pm-cost-to-erp',
    name: '项目成本归集到ERP',
    match: {
      message_type: ['event'],
      event_type: ['pm.cost.recorded'],
      source_module: 'pm',
    },
    destination: {
      type: 'service',
      target: 'erp-cost-service',
      delivery_mode: 'async',
    },
    filter: [
      { field: 'payload.cost_type', operator: 'in', value: ['labor', 'material'] },
    ],
    priority: 15,
    enabled: true,
  },
  
  {
    id: 'route-pm-revenue-to-erp',
    name: '项目收入确认到ERP',
    match: {
      message_type: ['event'],
      event_type: ['pm.revenue.confirmed'],
      source_module: 'pm',
    },
    destination: {
      type: 'service',
      target: 'erp-revenue-service',
      delivery_mode: 'async',
    },
    priority: 20,
    enabled: true,
  },
  
  // ============ ERP -> 其他模块 路由 ============
  {
    id: 'route-erp-voucher-to-bi',
    name: '凭证数据同步到BI',
    match: {
      message_type: ['event'],
      event_type: ['erp.voucher.posted'],
      source_module: 'erp',
    },
    destination: {
      type: 'topic',
      target: 'bi.finance.vouchers',
      delivery_mode: 'async',
    },
    transform: {
      add_fields: {
        '_sync_time': '{$now()}',
        '_source': 'erp',
      },
    },
    priority: 5,
    enabled: true,
  },
  
  {
    id: 'route-erp-voucher-to-audit',
    name: '凭证数据同步到审计日志',
    match: {
      message_type: ['event'],
      event_type: ['erp.voucher.*'],
      source_module: 'erp',
    },
    destination: {
      type: 'service',
      target: 'audit-service',
      delivery_mode: 'confirm',
    },
    priority: 30,
    enabled: true,
  },
  
  // ============ 外部系统路由 ============
  {
    id: 'route-kingdee-sync',
    name: '金蝶数据同步',
    match: {
      message_type: ['event'],
      event_type: ['*'],
      source_module: 'integration',
    },
    destination: {
      type: 'webhook',
      target: 'https://kingdee-api.example.com/webhook',
      delivery_mode: 'async',
    },
    filter: [
      { field: 'metadata.sync_target', operator: 'eq', value: 'kingdee' },
    ],
    priority: 1,
    enabled: false,
  },
];
```

### 6.2 数据转换映射配置

```typescript
// src/config/integration-mappings.ts

/**
 * 数据转换映射配置
 */
export const integrationMappings: Record<string, MappingConfig> = {
  // ============ HRM -> ERP 映射 ============
  'mapping.hrm.employee.to.erp': {
    id: 'mapping.hrm.employee.to.erp',
    name: '员工到会计科目-人员辅助核算',
    source: { entity: 'Employee', module: 'hrm' },
    target: { entity: 'DimensionValue', module: 'erp' },
    
    field_mappings: [
      { source_field: 'id', target_field: 'id' },
      { source_field: 'employee_number', target_field: 'code' },
      { source_field: 'name', target_field: 'name' },
      { source_field: 'department_id', target_field: 'department_id' },
      { source_field: 'position', target_field: 'position_name' },
      { 
        source_field: 'status', 
        target_field: 'status',
        transform: '$join([$, {"active": "active", "inactive": "disabled"}])' 
      },
    ],
    
    transforms: [
      {
        type: 'field_mapping',
        mapping: [
          { source_field: 'id', target_field: 'dimension', transform: '"employee"' },
          { source_field: 'id', target_field: 'dimension_type', transform: '"employee"' },
        ],
      },
    ],
  },
  
  'mapping.hrm.payroll.to.voucher': {
    id: 'mapping.hrm.payroll.to.voucher',
    name: '工资单到凭证分录',
    source: { entity: 'PayrollRecord', module: 'hrm' },
    target: { entity: 'VoucherEntry', module: 'erp' },
    
    field_mappings: [
      { source_field: 'id', target_field: 'id' },
      { source_field: 'net_salary', target_field: 'debit_amount', transform: '$' },
      { source_field: 'department_id', target_field: 'department_id' },
      { source_field: 'employee_id', target_field: 'employee_id' },
    ],
    
    // 工资凭证分录生成规则
    voucher_template: {
      entries: [
        // 借: 工资薪金
        {
          account_code: '6602.01',  // 应付职工薪酬-工资
          debit_amount: 'gross_salary',
          department_mapping: 'department_id',
        },
        // 贷: 应交个人所得税
        {
          account_code: '2221.01',  // 应交税费-个人所得税
          credit_amount: 'individual_income_tax',
        },
        // 贷: 其他应付款-社保
        {
          account_code: '2241.01',  // 其他应付款-社保
          credit_amount: '$social_security_employee + $housing_fund_employee',
        },
        // 贷: 银行存款
        {
          account_code: '1002',  // 银行存款
          credit_amount: 'net_salary',
          bank_account_mapping: 'bank_account_id',
        },
      ],
    },
  },
  
  // ============ CRM -> ERP 映射 ============
  'mapping.crm.customer.to.erp': {
    id: 'mapping.crm.customer.to.erp',
    name: '客户到往来单位辅助核算',
    source: { entity: 'Customer', module: 'crm' },
    target: { entity: 'DimensionValue', module: 'erp' },
    
    field_mappings: [
      { source_field: 'id', target_field: 'id' },
      { source_field: 'code', target_field: 'code' },
      { source_field: 'name', target_field: 'name' },
      { source_field: 'industry', target_field: 'industry' },
      { source_field: 'credit_limit', target_field: 'credit_limit' },
      { source_field: 'tax_number', target_field: 'tax_number' },
    ],
  },
  
  'mapping.crm.invoice.to.ar': {
    id: 'mapping.crm.invoice.to.ar',
    name: '销售发票到应收账款',
    source: { entity: 'SalesInvoice', module: 'crm' },
    target: { entity: 'ReceivableRecord', module: 'erp' },
    
    field_mappings: [
      { source_field: 'id', target_field: 'id' },
      { source_field: 'invoice_no', target_field: 'invoice_number' },
      { source_field: 'invoice_date', target_field: 'invoice_date' },
      { source_field: 'amount', target_field: 'amount' },
      { source_field: 'tax_amount', target_field: 'tax_amount' },
      { source_field: 'customer_id', target_field: 'customer_id' },
      { source_field: 'project_id', target_field: 'project_id' },
    ],
    
    transforms: [
      {
        type: 'field_mapping',
        mapping: [
          { 
            source_field: 'total_amount', 
            target_field: 'total_amount',
            transform: '$amount + $tax_amount',
          },
          { 
            source_field: 'due_date', 
            target_field: 'due_date',
            transform: '$add(invoice_date, customer.credit_term_days + " days")',
            default_value: '$add(invoice_date, "30 days")',
          },
        ],
      },
    ],
  },
  
  // ============ SRM -> ERP 映射 ============
  'mapping.srm.supplier.to.erp': {
    id: 'mapping.srm.supplier.to.erp',
    name: '供应商到往来单位辅助核算',
    source: { entity: 'Supplier', module: 'srm' },
    target: { entity: 'DimensionValue', module: 'erp' },
    
    field_mappings: [
      { source_field: 'id', target_field: 'id' },
      { source_field: 'code', target_field: 'code' },
      { source_field: 'name', target_field: 'name' },
      { source_field: 'tax_number', target_field: 'tax_number' },
      { source_field: 'payment_terms', target_field: 'payment_terms' },
    ],
  },
  
  'mapping.srm.invoice.to.ap': {
    id: 'mapping.srm.invoice.to.ap',
    name: '采购发票到应付账款',
    source: { entity: 'PurchaseInvoice', module: 'srm' },
    target: { entity: 'PayableRecord', module: 'erp' },
    
    field_mappings: [
      { source_field: 'id', target_field: 'id' },
      { source_field: 'invoice_no', target_field: 'invoice_number' },
      { source_field: 'invoice_date', target_field: 'invoice_date' },
      { source_field: 'amount', target_field: 'amount' },
      { source_field: 'tax_amount', target_field: 'tax_amount' },
      { source_field: 'supplier_id', target_field: 'supplier_id' },
      { source_field: 'project_id', target_field: 'project_id' },
    ],
  },
  
  // ============ PM -> ERP 映射 ============
  'mapping.pm.project.to.erp': {
    id: 'mapping.pm.project.to.erp',
    name: '项目到项目辅助核算',
    source: { entity: 'Project', module: 'pm' },
    target: { entity: 'DimensionValue', module: 'erp' },
    
    field_mappings: [
      { source_field: 'id', target_field: 'id' },
      { source_field: 'code', target_field: 'code' },
      { source_field: 'name', target_field: 'name' },
      { source_field: 'status', target_field: 'status' },
      { source_field: 'budget', target_field: 'budget_amount' },
      { source_field: 'organization_id', target_field: 'company_id' },
    ],
  },
  
  'mapping.pm.cost.to.voucher': {
    id: 'mapping.pm.cost.to.voucher',
    name: '项目成本到凭证分录',
    source: { entity: 'ProjectCostAllocation', module: 'pm' },
    target: { entity: 'VoucherEntry', module: 'erp' },
    
    cost_type_mappings: {
      labor: {
        account_code: '5001.01',  // 项目成本-人工
      },
      material: {
        account_code: '5001.02',  // 项目成本-材料
      },
      subcontract: {
        account_code: '5001.03',  // 项目成本-分包
      },
      expense: {
        account_code: '6602.99',  // 管理费用-其他
      },
    },
  },
};
```

---

## 七、监控与告警

### 7.1 监控指标

```typescript
// src/types/integration/monitoring.ts

/**
 * 监控指标定义
 */
export interface MonitoringMetrics {
  // 消息指标
  message_throughput: {
    total_sent: number;           // 总发送数
    total_received: number;        // 总接收数
    per_second: number;            // 每秒处理数
    by_topic: Record<string, number>;
  };
  
  // 延迟指标
  message_latency: {
    p50: number;                  // P50延迟
    p90: number;                  // P90延迟
    p99: number;                  // P99延迟
    max: number;                  // 最大延迟
  };
  
  // 错误指标
  error_metrics: {
    total_errors: number;        // 总错误数
    by_type: Record<string, number>;
    by_source: Record<string, number>;
  };
  
  // 重试指标
  retry_metrics: {
    total_retries: number;       // 总重试数
    successful_retries: number;  // 成功重试数
    failed_retries: number;      // 失败重试数
    dead_letter_count: number;   // 死信数量
  };
  
  // 同步指标
  sync_metrics: {
    total_syncs: number;
    successful_syncs: number;
    failed_syncs: number;
    avg_sync_duration: number;
  };
  
  // 系统健康
  system_health: {
    kafka_brokers: BrokerHealth[];
    database_connections: ConnectionPoolStatus;
    redis_status: RedisHealth;
  };
}

export interface BrokerHealth {
  broker_id: string;
  host: string;
  port: number;
  status: 'up' | 'down' | 'degraded';
  lag: number;
}

export interface ConnectionPoolStatus {
  active: number;
  idle: number;
  waiting: number;
  max: number;
}
```

### 7.2 告警规则

```typescript
// src/config/monitoring-alerts.ts

/**
 * 告警规则配置
 */
export const alertRules: AlertRule[] = [
  {
    id: 'alert-high-error-rate',
    name: '错误率过高',
    condition: {
      metric: 'error_metrics.total_errors',
      operator: 'gt',
      threshold: 100,
      window: '5m',
    },
    severity: 'critical',
    notification: {
      channels: ['email', 'sms', 'webhook'],
      template: 'high-error-rate',
    },
    enabled: true,
  },
  
  {
    id: 'alert-dead-letter-accumulation',
    name: '死信队列积压',
    condition: {
      metric: 'retry_metrics.dead_letter_count',
      operator: 'gt',
      threshold: 50,
      window: '10m',
    },
    severity: 'critical',
    notification: {
      channels: ['email', 'webhook'],
      template: 'dead-letter-accumulation',
    },
    enabled: true,
  },
  
  {
    id: 'alert-high-latency',
    name: '消息延迟过高',
    condition: {
      metric: 'message_latency.p99',
      operator: 'gt',
      threshold: 5000,  // 5秒
      window: '5m',
    },
    severity: 'warning',
    notification: {
      channels: ['email'],
      template: 'high-latency',
    },
    enabled: true,
  },
  
  {
    id: 'alert-sync-failure',
    name: '同步任务失败',
    condition: {
      metric: 'sync_metrics.failed_syncs',
      operator: 'gt',
      threshold: 10,
      window: '1h',
    },
    severity: 'warning',
    notification: {
      channels: ['email', 'webhook'],
      template: 'sync-failure',
    },
    enabled: true,
  },
  
  {
    id: 'alert-kafka-broker-down',
    name: 'Kafka Broker宕机',
    condition: {
      metric: 'system_health.kafka_brokers.status',
      operator: 'eq',
      threshold: 'down',
      window: '1m',
    },
    severity: 'critical',
    notification: {
      channels: ['sms', 'phone'],
      template: 'kafka-down',
    },
    enabled: true,
  },
];
```

---

## 八、实施计划

### 8.1 实施阶段

| 阶段 | 时间 | 任务 | 交付物 |
|------|------|------|--------|
| **Phase 1** | 2周 | 基础消息服务搭建 | MessageService, 消息队列 |
| **Phase 2** | 2周 | 事件定义与路由 | 事件总线, 路由规则引擎 |
| **Phase 3** | 2周 | 数据同步服务 | DataSyncService, CDC |
| **Phase 4** | 2周 | 转换服务 | TransformService, 映射配置 |
| **Phase 5** | 2周 | 外部适配器 | 适配器实现 |
| **Phase 6** | 1周 | 监控告警 | 监控系统 |
| **Phase 7** | 1周 | 测试上线 | 全流程测试 |

### 8.2 技术选型

| 组件 | 选型 | 原因 |
|------|------|------|
| 消息队列 | Apache Kafka | 高吞吐、持久化、分区 |
| 缓存 | Redis | 高性能、支持Pub/Sub |
| CDC | Debezium | 开源、成熟、支持多数据库 |
| 监控 | Prometheus + Grafana | 开源、可视化 |
| 告警 | AlertManager | 支持多通道 |

---

## 九、总结

本文档设计了一个完整的数据交换体系，包括:

1. **多种数据交换模式**: 同步请求、异步消息、事件驱动、CDC等
2. **统一的消息格式**: 标准化的消息结构和元数据
3. **完善的服务组件**: MessageService、DataSyncService、TransformService
4. **灵活的路由机制**: 基于规则的智能路由和过滤
5. **健壮的外部集成**: 支持金蝶、用友、SAP等主流ERP
6. **全面的监控体系**: 指标采集、告警通知、故障追踪

通过本方案的实施，可以实现:
- 各业务模块之间的实时数据交换
- 与外部ERP系统的无缝集成
- 数据的最终一致性和可追溯性
- 高效的故障处理和恢复机制
