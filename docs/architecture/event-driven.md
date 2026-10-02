# TOPEMS 事件驱动架构文档

> 最后更新：2026-07-02（Phase 4 扩展：ERP/SCM/CRM/Finance 事件类型）

> 📐 **2026-10-02 文档漂移校准（阶段 1 快赢任务 T2，对齐 D2 决策）**
> - **事件总线机制已迁移 Redis Stream**：V321 起默认 `EVENT_BUS_MODE=stream`，机制为 **XADD / XREADGROUP / XACK + 消费组（Consumer Group）+ DLQ（`topems:dlq` + retry_count）+ 事件版本（`EventVersion{major,minor}`）+ Schema Registry（`schema_registry.rs:26-129`）**，初始化失败自动降级。旧 **Redis Pub/Sub 已 deprecated**（`lib/shared-event/src/messaging.rs:3,69,71`，`RedisMessageBroker::publish` 直接返回迁移提示）；RabbitMQ（lapin 依赖在册，`rabbitmq.rs`）为历史/备选通道，非主链路。
> - **事件命名规范**：新事件统一「**域前缀 + 动作 + 版本**」（如 `ErpProductionOrderDispatched` / `MesWorkReportSubmitted` / `HrmPayrollPosted`，见 D2 §6 U2.5）；存量事件需按此前缀规范回修（ERP-04）。
> - **§3.9 CRM / §3.10 Finance / §3.7 ERP 事件清单存在大面积名实漂移**（F-24/FCRM-04/F-47）：代码 `EventType` 枚举实际使用**无前缀短名**（`SalesOrderCreated`/`CustomerCreated`/`PaymentReceived`/`PaymentMade` 等），且 CRM/Finance 多为**订阅方**而非文档声称的发布方——详见各节 ⚠️ 标注。
> - 文件路径原文 `lib/src/event/*` 已过时，实际为 `lib/shared-event/src/event/*`（见 §8 文件索引校准）。

## 1. 概述

TOPEMS 采用事件驱动架构（EDA）实现微服务间的松耦合通信。

> 📐 **对齐代码现状 2026-10-02 实测**：主通道为 **Redis Stream**（持久化 + 消费组 + ACK + DLQ）；旧 Redis Pub/Sub 仅保留兼容内存 broker 与 deprecated stub；RabbitMQ 为历史备选通道。

- **Redis Stream（主通道，默认开启）**：`XADD` 生产、`XREADGROUP` 消费、`XACK` 确认、消费组负载均衡、`topems:dlq` 死信队列 + retry_count、事件版本号、Schema Registry 结构校验。位于 `lib/shared-event/src/event/stream_publisher.rs` / `stream_subscriber.rs`。
- **Redis Pub/Sub（已 deprecated）**：旧实时通知通道，`messaging.rs` 中 `RedisMessageBroker` 已标记 `#[deprecated]`，publish 直接返回迁移提示；仅 `InMemoryMessageBroker` 保留用于单测/本地开发。
- **RabbitMQ / lapin（历史备选）**：`rabbitmq.rs` 仍在册（lapin 4.10 依赖），但生产主链路已切 Redis Stream，本节相关描述视为历史参考。

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

事件类型遵循 `{DomainPrefix}{Entity}{Action}` 的 PascalCase 命名规范：

> 📐 **对齐 D2 决策（2026-10-02）**：新事件统一「**域前缀 + 动作 + 版本**」，例：`ErpProductionOrderDispatched`、`MesWorkReportSubmitted`、`HrmPayrollPosted`（D2 §6 U2.5）。⚠️ **存量事件漂移（ERP-04 / F-47）**：代码 `EventType` 枚举实际使用**无前缀短名**（如 erp 发布 `SalesOrderCreated` 而非 `ErpSalesOrderCreated`，见 `svc/erp/src/modules/sales_order.rs:294` `publish_sales_order_created`）——存量事件名缺域前缀，将随 D2 环事件化（U2.5）统一回修。

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

### 2.3 频道/Stream 键命名

> 📐 对齐代码现状 2026-10-02：主通道为 Redis Stream，键为 Stream key 而非 Pub/Sub channel。

- **Redis Stream key**：`topems:events:{EventType}`（如 `topems:events:HrmEmployeeCreated`），消费组 `XREADGROUP` 消费、`XACK` 确认
- **DLQ Stream/List**：`topems:dlq`（+ retry_count），失败事件重投
- **RabbitMQ 路由键（历史）**：`event.{EventType}`（如 `event.HrmEmployeeCreated`）

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

> ⚠️ **名实漂移（F-47 / ERP-04，对齐代码现状 2026-10-02）**：下表为文档 Phase 4 声称名。代码 `EventType` 枚举实际使用**无前缀短名**——erp 经 `publish_sales_order_created` 发布的是 `SalesOrderCreated`（`svc/erp/src/modules/sales_order.rs:294`），`PurchaseOrderApproved` 等亦无 `Erp` 前缀。上下游按下表带 `Erp` 前缀名订阅会落空；存量前缀回修列入 D2 U2.5。

| 事件类型 | Payload 结构 | 发布者 | 订阅者 |
|---------|-------------|--------|--------|
| `ErpSalesOrderCreated`（代码实际：`SalesOrderCreated`） | `ErpSalesOrderCreatedPayload` | ERP | Finance, Notification |
| `ErpSalesOrderUpdated` | `ErpSalesOrderUpdatedPayload` | ERP | Finance |
| `ErpSalesOrderCompleted` | `ErpSalesOrderCompletedPayload` | ERP | Finance, SCM |
| `ErpPurchaseOrderCreated`（代码实际：`PurchaseOrderCreated`） | `ErpPurchaseOrderCreatedPayload` | ERP | SCM, Finance |
| `ErpPurchaseOrderApproved`（代码实际：`PurchaseOrderApproved`） | `ErpPurchaseOrderApprovedPayload` | ERP | SCM, Notification |
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

> ⚠️ **大面积漂移（F-24 / FCRM-04，对齐代码现状 2026-10-02）**：下表为 Phase 4 文档声称清单，**代码中 CRM 实为订阅方而非这些事件的发布方**。实测 `svc/crm/src/event_handlers/mod.rs:46-86` CRM 仅订阅 `AfterSalesTicketCreated` / `OpportunityWon` / `CustomerCreated` / `ShippingOrderRequested` / `PaymentReceived` / `SalesOrderCreated` 六个事件；`EventType` 枚举中亦为无前缀短名（`CustomerCreated` @ `event_types.rs:104`、`OpportunityWon` @ `:108`），无 `CrmCustomerCreated`/`CrmOpportunityCreated` 等变体。即 CRM 表内多数事件「文档声称、代码未实现」，上下游按此对接会落空。

| 事件类型 | Payload 结构 | 文档声称发布者 | 代码实测 |
|---------|-------------|--------|--------|
| `CrmCustomerCreated`（代码实际：`CustomerCreated`，且非 CRM 发布） | `CrmCustomerCreatedPayload` | CRM | ⚠️ 文档声称未实现/方向待核 |
| `CrmCustomerUpdated` | `CrmCustomerUpdatedPayload` | CRM | ⚠️ 文档声称未实现 |
| `CrmOpportunityCreated`（代码实际存在的是 `OpportunityWon`） | `CrmOpportunityCreatedPayload` | CRM | ⚠️ 名实不符 |
| `CrmOpportunityStageChanged` | `CrmOpportunityStageChangedPayload` | CRM | ⚠️ 文档声称未实现 |
| `CrmContactCreated` | `CrmContactCreatedPayload` | CRM | ⚠️ 文档声称未实现 |
| `CrmInteractionRecorded` | `CrmInteractionRecordedPayload` | CRM | ⚠️ 文档声称未实现 |

### 3.10 Finance 事件（Phase 4 新增）

> ⚠️ **大面积漂移（F-24 / FCRM-04，对齐代码现状 2026-10-02）**：下表为 Phase 4 文档声称清单，**代码中 Finance 实为订阅方而非这些事件的发布方**。实测 `svc/finance/src/event_handlers/mod.rs:46-90` Finance 订阅 `SalesOrderCreated`/`SalesOrderApproved`/`PurchaseOrderCreated`/`PurchaseOrderApproved`/`PaymentReceived`/`PaymentMade`/`ReconciliationCreated|Updated|Approved`/`SettlementCreated|Approved|Rejected`；枚举中无 `FinancePaymentCompleted` 等变体（实际为 `PaymentReceived`/`PaymentMade`）。即 Finance 表内多数事件「文档声称、代码未实现」。

| 事件类型 | Payload 结构 | 文档声称发布者 | 代码实测 |
|---------|-------------|--------|--------|
| `FinanceBillGenerated` | `FinanceBillGeneratedPayload` | Finance | ⚠️ 文档声称未实现 |
| `FinancePaymentCompleted`（代码实际：`PaymentReceived`/`PaymentMade`） | `FinancePaymentCompletedPayload` | Finance | ⚠️ 名实不符 |
| `FinanceBudgetApproved` | `FinanceBudgetApprovedPayload` | Finance | ⚠️ 文档声称未实现 |
| `FinanceAccountingPeriodClosed` | `FinanceAccountingPeriodClosedPayload` | Finance | ⚠️ 文档声称未实现 |
| `FinanceJournalEntryCreated` | `FinanceJournalEntryCreatedPayload` | Finance | ⚠️ 文档声称未实现 |

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

### 4.2 EventPublisher（Redis Stream 发布者）

> 📐 对齐代码现状 2026-10-02：路径原文 `lib/src/event/publisher.rs` 已过时，实际位于 `lib/shared-event/src/event/`（主通道 `stream_publisher.rs`，兼容层 `publisher.rs`）。

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

### 4.3 EventSubscriber（Redis Stream 订阅者）

> 📐 对齐代码现状 2026-10-02：实际位于 `lib/shared-event/src/event/stream_subscriber.rs`（`XREADGROUP`/`XACK`/`XGROUP CREATE`），兼容层 `subscriber.rs`。

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

### 4.4 RabbitMqPublisher / RabbitMqSubscriber（历史备选通道）

> ⚠️ **对齐代码现状 2026-10-02**：位于 `lib/shared-event/src/event/rabbitmq.rs`，lapin 4.10 依赖仍在册，但**生产主链路已切 Redis Stream**，本节为历史/备选参考，非推荐用法。

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

> 📐 对齐代码现状 2026-10-02：实际位于 `lib/shared-event/src/event/dead_letter_queue.rs`，与 Redis Stream 消费组协同（XACK 失败入 DLQ）。

- **存储**：`topems:dlq`（Redis Stream/List）
- **重试计数**：`retry_count`（`dead_letter_queue.rs:11-17,61-89`）
- **最大重试**：3 次
- **重试间隔**：60 秒
- **超时保护**：事件处理超过 30s 自动进入 DLQ

### 4.6 EventMonitor（事件监控）

位于 `lib/shared-event/src/event/monitor.rs`（原文 `lib/src/event/monitor.rs` 路径已过时），提供可观测性：

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

> 📐 对齐代码现状 2026-10-02：主通道为 Redis Stream，具备持久化 + 消费组 + XACK。

| 通道 | 持久化 | 确认机制 | 重试 |
|------|--------|---------|------|
| **Redis Stream（主）** | **是（Stream 持久化）** | **消费组 + XACK** | 失败入 `topems:dlq` + retry_count |
| Redis Pub/Sub（deprecated） | 否（内存） | 否 | 已 deprecated，见 `messaging.rs:71` |
| RabbitMQ（历史备选） | 是（durable） | 手动 ACK | NACK + requeue |

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
| `EVENT_BUS_MODE` | `stream` | 主通道模式（`stream`=Redis Stream，默认开启；初始化失败自动降级） |
| `REDIS_URL` | `redis://localhost:6379` | Redis 连接地址（Stream 与 DLQ 共用） |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672/%2f` | RabbitMQ 连接地址（历史备选通道） |

## 8. 文件索引

> 📐 对齐代码现状 2026-10-02：原文路径 `lib/src/event/*` 已过时，实际位于 `lib/shared-event/src/event/`。

| 文件 | 说明 |
|------|------|
| `lib/shared-event/src/event/mod.rs` | 事件模块入口，统一导出 |
| `lib/shared-event/src/event/event_types.rs` | 事件类型枚举、Event 结构体、Payload 定义 |
| `lib/shared-event/src/event/stream_publisher.rs` | **Redis Stream 事件发布者（主通道，XADD）** |
| `lib/shared-event/src/event/stream_subscriber.rs` | **Redis Stream 事件订阅者（XREADGROUP/XACK）** |
| `lib/shared-event/src/event/publisher.rs` / `subscriber.rs` | 兼容层发布者/订阅者 |
| `lib/shared-event/src/event/versioning.rs` | 事件版本号 `EventVersion{major,minor}` |
| `lib/shared-event/src/event/schema_registry.rs` | **Schema Registry（结构校验，已实现）** |
| `lib/shared-event/src/event/dead_letter_queue.rs` | 死信队列（`topems:dlq` + retry_count） |
| `lib/shared-event/src/event/monitor.rs` | 事件监控与指标 |
| `lib/shared-event/src/event/error.rs` | 事件错误类型定义 |
| `lib/shared-event/src/event/rabbitmq.rs` | RabbitMQ 发布者/订阅者（历史备选） |
| `lib/shared-event/src/messaging.rs` | 旧 Pub/Sub 抽象（`RedisMessageBroker` 已 `#[deprecated]`，:3,:69,:71） |
| `svc/integration/src/event_bus.rs` | 集成服务事件总线 |

## 9. 后续规划

- [x] 增加 ERP/SCM/CRM/Finance 模块事件类型（Phase 4 已完成：30+ 新事件类型）
- [ ] 实现 Event Sourcing 模式（事件溯源）
- [x] 添加事件版本化支持（`event_version` 字段，默认版本 1）（Phase 4 已完成；实测 `EventVersion{major,minor}` 见 `versioning.rs:24-43`）
- [ ] 实现 Saga 分布式事务模式
- [x] ~~添加事件 Schema Registry（结构验证）~~ **已实现**（`lib/shared-event/src/event/schema_registry.rs:26-129`，对齐代码现状 2026-10-02；原文误标为待办）
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
