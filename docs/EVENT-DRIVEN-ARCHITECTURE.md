# TOPEMS 事件驱动架构文档

> 最后更新：2026-07-02（Phase 4 扩展：ERP/SCM/CRM/Finance 事件类型）

## 1. 概述

TOPEMS 采用事件驱动架构（EDA）实现微服务间的松耦合通信。系统提供双通道事件基础设施：

- **Redis Pub/Sub**：轻量级实时事件通知，适用于低延迟、非持久化场景
- **RabbitMQ (lapin)**：可靠消息传递，支持持久化、确认机制和死信队列

### 1.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     事件驱动架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    publish     ┌─────────────────┐           │
│  │  HRM     │───────────────▶│                 │           │
│  │ Service  │                │  EventPublisher │           │
│  └──────────┘                │  (Redis Pub)    │           │
│                              └────────┬────────┘           │
│  ┌──────────┐    publish              │                    │
│  │  QMS     │───────────────┐         │                    │
│  │ Service  │               │         │                    │
│  └──────────┘               ▼         ▼                    │
│                     ┌─────────────────────┐                │
│  ┌──────────┐       │   Redis Pub/Sub     │                │
│  │  EHS     │──────▶│   Channel:          │                │
│  │ Service  │       │   topems:events:*   │                │
│  └──────────┘       └─────────┬───────────┘                │
│                               │                            │
│  ┌──────────┐    publish      │  subscribe                 │
│  │  LIMS    │─────────────────┤                            │
│  │ Service  │                 │                            │
│  └──────────┘                 ▼                            │
│                     ┌─────────────────────┐                │
│  ┌──────────┐       │  EventSubscriber    │                │
│  │  PM      │       │  - 路由分发          │                │
│  │ Service  │       │  - 30s 超时保护      │                │
│  └──────────┘       │  - DLQ 重试          │                │
│                     └─────────────────────┘                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              RabbitMQ (备选/增强通道)                 │   │
│  │  Exchange: topems.events (Topic)                    │   │
│  │  Routing: event.{EventType}                         │   │
│  │  Queue: topems.{service_name}                       │   │
│  │  Features: Durable, ACK, DLQ                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              可观测性层                                │   │
│  │  EventMonitor: 指标采集、链路追踪、错误统计            │   │
│  │  DeadLetterQueue: 失败事件存储 + 自动重试 (最多3次)   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 2. 命名规范

### 2.1 事件类型命名

事件类型遵循 `{Module}{Entity}{Action}` 的 PascalCase 命名规范：

| 前缀 | 模块 | 示例 |
|------|------|------|
| `Hrm` | 人力资源 | `HrmEmployeeCreated`, `HrmDepartmentUpdated` |
| `Pm` | 项目管理 | `PmProjectCreated`, `PmTaskDeleted` |
| `Lims` | 实验室管理 | `LimsSampleRegistered`, `LimsInspectionAbnormalDetected` |
| `Qms` | 质量管理 | `QmsInspectionCompleted`, `QmsQualityIssueCreated` |
| `Ehs` | 环境安全 | `EhsHazardReported`, `EhsAccidentInvestigated` |

### 2.2 动作后缀

| 后缀 | 含义 |
|------|------|
| `Created` | 实体创建 |
| `Updated` | 实体更新 |
| `Deleted` | 实体删除 |
| `Completed` | 流程完成 |
| `Reported` | 事件上报 |
| `Detected` | 异常检测 |
| `Triggered` | 跨模块同步触发 |

### 2.3 频道/路由键命名

- **Redis 频道**：`topems:events:{EventType}`（如 `topems:events:HrmEmployeeCreated`）
- **RabbitMQ 路由键**：`event.{EventType}`（如 `event.HrmEmployeeCreated`）

## 3. 事件清单

### 3.1 HRM 事件

| 事件类型 | Payload 结构 | 发布者 | 订阅者 |
|---------|-------------|--------|--------|
| `HrmEmployeeCreated` | `HrmEmployeeCreatedPayload` | HRM | Integration, Notification |
| `HrmEmployeeUpdated` | `HrmEmployeeUpdatedPayload` | HRM | Integration |
| `HrmEmployeeDeleted` | — | HRM | Integration |
| `HrmDepartmentCreated` | `HrmDepartmentCreatedPayload` | HRM | Integration |
| `HrmDepartmentUpdated` | `HrmDepartmentUpdatedPayload` | HRM | Integration |
| `HrmDepartmentDeleted` | `HrmDepartmentDeletedPayload` | HRM | Integration |

### 3.2 PM 事件

| 事件类型 | Payload 结构 | 发布者 | 订阅者 |
|---------|-------------|--------|--------|
| `PmProjectCreated` | `PmProjectCreatedPayload` | PM | Notification |
| `PmProjectUpdated` | `PmProjectUpdatedPayload` | PM | — |
| `PmTaskCreated` | `PmTaskCreatedPayload` | PM | Notification |
| `PmTaskUpdated` | `PmTaskUpdatedPayload` | PM | — |
| `PmTaskDeleted` | `PmTaskDeletedPayload` | PM | — |

### 3.3 LIMS 事件

| 事件类型 | Payload 结构 | 发布者 | 订阅者 |
|---------|-------------|--------|--------|
| `LimsSampleRegistered` | `LimsSampleRegisteredPayload` | LIMS | QMS, EHS |
| `LimsSampleUpdated` | — | LIMS | — |
| `LimsInspectionTaskCreated` | — | LIMS | — |
| `LimsInspectionTaskUpdated` | — | LIMS | — |
| `LimsInspectionResultSubmitted` | `LimsInspectionResultSubmittedPayload` | LIMS | QMS, Notification |
| `LimsInspectionAbnormalDetected` | `LimsInspectionAbnormalDetectedPayload` | LIMS | QMS, EHS, Notification |
| `LimsRecordCompleted` | `LimsRecordCompletedPayload` | LIMS | QMS |
| `LimsReagentAlert` | `LimsReagentAlertPayload` | LIMS | Notification, EHS |

### 3.4 QMS 事件

| 事件类型 | Payload 结构 | 发布者 | 订阅者 |
|---------|-------------|--------|--------|
| `QmsInspectionCompleted` | `QmsInspectionCompletedPayload` | QMS | LIMS, Notification |
| `QmsCorrectiveActionCreated` | `QmsCorrectiveActionCreatedPayload` | QMS | Notification |
| `QmsCorrectiveActionUpdated` | — | QMS | — |
| `QmsQualityIssueCreated` | `QmsQualityIssueCreatedPayload` | QMS | EHS, Notification |

### 3.5 EHS 事件

| 事件类型 | Payload 结构 | 发布者 | 订阅者 |
|---------|-------------|--------|--------|
| `EhsHazardReported` | `EhsHazardReportedPayload` | EHS | QMS, Notification |
| `EhsHazardRectified` | — | EHS | — |
| `EhsHazardVerified` | — | EHS | — |
| `EhsAccidentReported` | `EhsAccidentReportedPayload` | EHS | QMS, Notification |
| `EhsAccidentInvestigated` | — | EHS | — |

### 3.6 跨模块集成事件

| 事件类型 | 触发场景 | 源模块 | 目标模块 |
|---------|---------|--------|---------|
| `QmsToLimsSyncTriggered` | QMS 检验结果同步到 LIMS | QMS | LIMS |
| `EhsToQmsTriggered` | EHS 隐患触发 QMS 质量问题 | EHS | QMS |
| `LimsToEhsTriggered` | LIMS 异常结果通知 EHS | LIMS | EHS |
| `HealthCheck` | 服务健康检查心跳 | All | Monitor |

### 3.7 ERP 事件（Phase 4 新增）

| 事件类型 | Payload 结构 | 发布者 | 订阅者 |
|---------|-------------|--------|--------|
| `ErpSalesOrderCreated` | `ErpSalesOrderCreatedPayload` | ERP | Finance, Notification |
| `ErpSalesOrderUpdated` | `ErpSalesOrderUpdatedPayload` | ERP | Finance |
| `ErpSalesOrderCompleted` | `ErpSalesOrderCompletedPayload` | ERP | Finance, SCM |
| `ErpPurchaseOrderCreated` | `ErpPurchaseOrderCreatedPayload` | ERP | SCM, Finance |
| `ErpPurchaseOrderApproved` | `ErpPurchaseOrderApprovedPayload` | ERP | SCM, Notification |
| `ErpInventoryAdjusted` | `ErpInventoryAdjustedPayload` | ERP | WMS, Finance |
| `ErpInvoiceGenerated` | `ErpInvoiceGeneratedPayload` | ERP | Finance, Notification |

### 3.8 SCM 事件（Phase 4 新增）

| 事件类型 | Payload 结构 | 发布者 | 订阅者 |
|---------|-------------|--------|--------|
| `ScmSupplierAdmitted` | `ScmSupplierAdmittedPayload` | SCM | ERP, Notification |
| `ScmSupplierUpdated` | `ScmSupplierUpdatedPayload` | SCM | ERP |
| `ScmPurchaseContractSigned` | `ScmPurchaseContractSignedPayload` | SCM | Finance, ERP |
| `ScmDeliveryAppointmentScheduled` | `ScmDeliveryAppointmentScheduledPayload` | SCM | WMS, Notification |
| `ScmGoodsReceived` | `ScmGoodsReceivedPayload` | SCM | ERP, QMS, Finance |

### 3.9 CRM 事件（Phase 4 新增）

| 事件类型 | Payload 结构 | 发布者 | 订阅者 |
|---------|-------------|--------|--------|
| `CrmCustomerCreated` | `CrmCustomerCreatedPayload` | CRM | ERP, Notification |
| `CrmCustomerUpdated` | `CrmCustomerUpdatedPayload` | CRM | ERP |
| `CrmOpportunityCreated` | `CrmOpportunityCreatedPayload` | CRM | Notification |
| `CrmOpportunityStageChanged` | `CrmOpportunityStageChangedPayload` | CRM | Notification, Finance |
| `CrmContactCreated` | `CrmContactCreatedPayload` | CRM | Notification |
| `CrmInteractionRecorded` | `CrmInteractionRecordedPayload` | CRM | Notification |

### 3.10 Finance 事件（Phase 4 新增）

| 事件类型 | Payload 结构 | 发布者 | 订阅者 |
|---------|-------------|--------|--------|
| `FinanceBillGenerated` | `FinanceBillGeneratedPayload` | Finance | Notification, CRM |
| `FinancePaymentCompleted` | `FinancePaymentCompletedPayload` | Finance | ERP, SCM, Notification |
| `FinanceBudgetApproved` | `FinanceBudgetApprovedPayload` | Finance | HRM, Notification |
| `FinanceAccountingPeriodClosed` | `FinanceAccountingPeriodClosedPayload` | Finance | ERP, Notification |
| `FinanceJournalEntryCreated` | `FinanceJournalEntryCreatedPayload` | Finance | Notification |

## 4. 核心组件

### 4.1 Event 结构体

```rust
pub struct Event {
    pub event_id: Uuid,        // 事件唯一 ID
    pub event_type: EventType, // 事件类型枚举
    pub source: String,        // 发布者服务名
    pub payload: serde_json::Value, // 事件负载数据
    pub occurred_at: DateTime<Utc>, // 发生时间
}
```

### 4.2 EventPublisher（Redis 发布者）

位于 `lib/src/event/publisher.rs`，提供类型安全的发布方法：

```rust
// 通用发布
publisher.publish_event(EventType::HrmEmployeeCreated, payload).await?;

// 便捷方法（自动构建 Payload）
publisher.publish_hrm_employee_created(
    employee_id, "张三", "zhangsan@topems.com", Some(dept_id)
).await?;

publisher.publish_qms_inspection_completed(
    inspection_id, "INS-001", Some(product_id), Some("产品A"),
    "passed", Some(98.5), "检验员张三"
).await?;

// Phase 4 新增便捷方法示例
publisher.publish_erp_sales_order_created(
    order_id, "SO-001", customer_id, Some("客户A"),
    10000.0, Some("CNY"), Some("张三")
).await?;

publisher.publish_crm_opportunity_stage_changed(
    opportunity_id, "OP-001", "初步接触", "需求确认",
    Some("李四"), "2026-07-02T10:00:00Z"
).await?;

publisher.publish_finance_payment_completed(
    payment_id, "PAY-001", bill_id, "BILL-001",
    5000.0, Some("CNY"), "银行转账", "2026-07-02T10:00:00Z", Some("王五")
).await?;
```

### 4.3 EventSubscriber（Redis 订阅者）

位于 `lib/src/event/subscriber.rs`，支持多事件订阅和超时保护：

```rust
let subscriber = EventSubscriber::new("notification-service")?
    .subscribe(
        vec![
            EventType::HrmEmployeeCreated,
            EventType::QmsQualityIssueCreated,
            EventType::EhsHazardReported,
        ],
        |event| async move {
            // 处理事件，30s 超时保护
            handle_event(event).await;
        }
    );

subscriber.start_listening().await?;
```

### 4.4 RabbitMqPublisher / RabbitMqSubscriber

位于 `lib/src/event/rabbitmq.rs`，提供可靠消息传递：

- **Exchange**：`topems.events`（Topic 类型，durable）
- **Queue**：`topems.{service_name}`（durable, non-exclusive）
- **Routing Key**：`event.{EventType}`
- **消息确认**：手动 ACK，失败时 NACK + requeue
- **QoS**：预取 10 条消息

```rust
// RabbitMQ 发布
let publisher = RabbitMqPublisher::new("hrm-service").await?;
publisher.publish_event(EventType::HrmEmployeeCreated, payload).await?;

// RabbitMQ 订阅
let subscriber = RabbitMqSubscriber::new("notification-service").await?;
subscriber.subscribe(EventType::HrmEmployeeCreated, |event| {
    handle_event(event)?;
    Ok(())
}).await?;
```

### 4.5 DeadLetterQueue（死信队列）

位于 `lib/src/event/dead_letter_queue.rs`，基于 Redis List 实现：

- **存储**：`topems:dlq:{EventType}`（Redis List）
- **重试计数**：`topems:dlq:retry_count`（Redis Hash）
- **最大重试**：3 次
- **重试间隔**：60 秒
- **超时保护**：事件处理超过 30s 自动进入 DLQ

### 4.6 EventMonitor（事件监控）

位于 `lib/src/event/monitor.rs`，提供可观测性：

- **EventMetrics**：总事件数、按类型统计、错误统计、平均处理时间
- **EventTrace**：事件链路追踪（Published → Received → Processing → Completed/Failed）
- **存储**：`topems:event_metrics:current`（Redis）

## 5. 集成模式

### 5.1 服务内事件发布

```rust
// 在 HRM 服务中
use topems_lib::event::{EventPublisher, EventType};

let publisher = EventPublisher::new("hrm-service")?;

// 创建员工后发布事件
publisher.publish_hrm_employee_created(
    employee.id,
    &employee.name,
    &employee.email,
    employee.department_id,
).await?;
```

### 5.2 服务间事件订阅

```rust
// 在 Notification 服务中
use topems_lib::event::{EventSubscriber, EventType};

let subscriber = EventSubscriber::new("notification-service")?
    .subscribe(
        vec![EventType::HrmEmployeeCreated, EventType::EhsHazardReported],
        |event| async move {
            match event.event_type {
                EventType::HrmEmployeeCreated => {
                    // 发送欢迎邮件
                }
                EventType::EhsHazardReported => {
                    // 发送安全隐患通知
                }
                _ => {}
            }
        }
    );

subscriber.start_listening().await?;
```

### 5.3 跨模块数据同步

通过 `IntegrationEvent` 实现跨模块数据同步，位于 `svc/integration/src/event_bus.rs`：

```rust
// QMS 检验完成后触发 LIMS 同步
let event = bus.publish(PublishEventRequest {
    source_system: "qms".to_string(),
    target_system: "lims".to_string(),
    event_type: "inspection.completed".to_string(),
    source_record_id: Some(inspection_id.to_string()),
    payload: Some(serde_json::json!({
        "inspection_no": "INS-001",
        "result": "passed"
    })),
}).await;
```

### 5.4 事件处理链路

```
发布者 ──▶ EventPublisher ──▶ Redis Channel ──▶ EventSubscriber
                                                      │
                                            ┌─────────┴─────────┐
                                            │                   │
                                      Handler 调用          DLQ 重试
                                      (30s 超时)         (最多3次)
                                            │                   │
                                      EventMonitor      DeadLetterQueue
                                      (指标采集)        (持久化存储)
```

## 6. 可靠性保障

### 6.1 消息持久化

| 通道 | 持久化 | 确认机制 | 重试 |
|------|--------|---------|------|
| Redis Pub/Sub | 否（内存） | 否 | 通过 DLQ |
| RabbitMQ | 是（durable） | 手动 ACK | NACK + requeue |

### 6.2 错误处理策略

1. **事件反序列化失败**：NACK + requeue（RabbitMQ）或跳过（Redis）
2. **事件处理超时**（>30s）：进入 DLQ，60s 后自动重试
3. **事件处理异常**：进入 DLQ，最多重试 3 次后放弃
4. **Redis 连接失败**：使用默认 `redis://localhost:6379` 重试
5. **RabbitMQ 连接失败**：使用默认 `amqp://guest:guest@localhost:5672/%2f` 重试

### 6.3 幂等性要求

事件消费者**必须**实现幂等性处理，因为：
- Redis Pub/Sub 不保证 exactly-once 语义
- DLQ 重试可能导致重复消费
- 网络抖动可能导致 NACK 后重复投递

推荐方案：使用 `event_id` 作为幂等键，在 Redis 中记录已处理事件 ID（TTL 24h）。

## 7. 环境配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `REDIS_URL` | `redis://localhost:6379` | Redis 连接地址 |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672/%2f` | RabbitMQ 连接地址 |

## 8. 文件索引

| 文件 | 说明 |
|------|------|
| `lib/src/event/mod.rs` | 事件模块入口，统一导出 |
| `lib/src/event/event_types.rs` | 事件类型枚举、Event 结构体、Payload 定义 |
| `lib/src/event/publisher.rs` | Redis 事件发布者 |
| `lib/src/event/subscriber.rs` | Redis 事件订阅者 |
| `lib/src/event/rabbitmq.rs` | RabbitMQ 发布者/订阅者 |
| `lib/src/event/dead_letter_queue.rs` | 死信队列 |
| `lib/src/event/monitor.rs` | 事件监控与指标 |
| `lib/src/event/error.rs` | 事件错误类型定义 |
| `svc/integration/src/event_bus.rs` | 集成服务事件总线 |

## 9. 后续规划

- [x] 增加 ERP/SCM/CRM/Finance 模块事件类型（Phase 4 已完成：30+ 新事件类型）
- [ ] 实现 Event Sourcing 模式（事件溯源）
- [x] 添加事件版本化支持（`event_version` 字段，默认版本 1）（Phase 4 已完成）
- [ ] 实现 Saga 分布式事务模式
- [ ] 添加事件 Schema Registry（结构验证）
- [ ] 实现事件回放功能（从 DLQ 或 Event Store）

### 9.1 Phase 4 扩展详情

**新增事件类型统计**：
- ERP：7 种（销售订单、采购订单、库存调整、发票生成）
- SCM：5 种（供应商准入、合同签署、送货预约、收货）
- CRM：6 种（客户、商机、联系人、交互记录）
- Finance：5 种（账单、付款、预算、会计期间、凭证）

**事件版本化实现**：
- `Event` 结构体新增 `event_version: u32` 字段
- 默认版本号为 1（`Event::new()`）
- 支持自定义版本号（`Event::with_version()`）
- 用于未来事件结构升级和平滑迁移
