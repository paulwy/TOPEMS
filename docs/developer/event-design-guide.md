# 事件驱动架构设计规范

本文档定义 TOPEMS 项目事件驱动架构（Event-Driven Architecture）的设计规范，涵盖事件类型、Payload 结构、发布/订阅模式与治理策略，确保跨模块松耦合通信的一致性与可演进性。

## 目录

- [架构概览](#架构概览)
- [核心组件](#核心组件)
- [事件命名规范](#事件命名规范)
- [Payload 设计规范](#payload-设计规范)
- [事件发布模式](#事件发布模式)
- [事件消费规范](#事件消费规范)
- [事件目录](#事件目录)
- [版本管理与 Schema 治理](#版本管理与-schema-治理)
- [最佳实践](#最佳实践)

---

## 架构概览

TOPEMS 采用 **Redis Pub/Sub** 作为事件总线，各微服务通过 `EventPublisher` 发布事件、通过 `EventSubscriber` 订阅事件，实现模块间松耦合通信。

```
┌──────────┐   publish    ┌─────────┐   subscribe   ┌──────────────┐
│ Service A │ ──────────► │  Redis  │ ◄────────── │  Service B    │
│ (WMS)     │              │ Channel │              │  (SCM/Finance)│
└──────────┘              └─────────┘              └──────────────┘
     │                                                    │
     │ EventPublisher.publish_event()                    │ EventSubscriber.subscribe()
     │   - 序列化 Payload 为 JSON                          │   - 反序列化 JSON 为 Payload
     │   - 注入 trace_id                                  │   - 执行业务逻辑（幂等）
     │   - PUBLISH topems:events:{type} {event_json}     │   - 错误进入死信队列
```

### 设计原则

1. **事实导向（Fact-based）**：事件描述"已发生的事实"（如 `WmsInventoryItemShipped`），而非命令式操作。
2. **最终一致**：事件发布采用 graceful fallback，发布失败仅记录告警，不阻塞主业务流程。
3. **幂等消费**：消费者必须做幂等处理，同一事件可能被重复投递。
4. **Schema 演进**：Payload 字段只增不删，可选字段使用 `Option<T>`，新增字段须有默认值语义。

---

## 核心组件

### 1. EventType 枚举

定义在 `lib/src/event/event_types.rs`，枚举所有系统支持的事件类型。每个变体对应一个 Redis 频道 `topems:events:{EventType}`。

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum EventType {
    // HRM 域
    HrmEmployeeCreated,
    HrmDepartmentUpdated,
    // WMS 域（P3 新增）
    WmsInventoryItemShipped,
    WmsInventoryItemReceived,
    WmsWarehouseTransferCompleted,
    WmsInventoryLowStock,
    // SRM 域（P3 新增）
    SrmSupplierCreated,
    SrmSupplierUpdated,
    SrmSupplierStatusChanged,
    // ...
}
```

### 2. Event 封装

`Event` 结构体封装事件元数据与 Payload，由 `EventPublisher` 自动构造：

| 字段 | 类型 | 说明 |
|------|------|------|
| `event_id` | `Uuid` | 事件唯一 ID（自动生成） |
| `event_type` | `EventType` | 事件类型 |
| `source` | `String` | 发布服务名（如 `"wms"`） |
| `payload` | `serde_json::Value` | 事件负载（序列化后的 Payload 结构体） |
| `trace_id` | `Option<String>` | 链路追踪 ID（自动注入当前 trace context） |
| `timestamp` | `DateTime<Utc>` | 事件生成时间 |

### 3. EventPublisher

定义在 `lib/src/event/publisher.rs`，提供两层 API：

- **通用方法**：`publish_event(event_type, payload)` —— 所有事件发布的基础方法。
- **便捷方法**：`publish_inventory_shipped(payload)`、`publish_supplier_created(payload)` 等 —— 领域语义化的封装，减少调用方代码量。

### 4. EventSubscriber

定义在 `lib/src/event/subscriber.rs`，订阅指定 `EventType` 频道，反序列化 Payload 后执行回调。消费失败的事件进入死信队列（`DeadLetterQueue`）。

---

## 事件命名规范

### 命名格式

```
{Domain}{Aggregate}{Action}{PastTense}
```

| 组成 | 说明 | 示例 |
|------|------|------|
| Domain | 领域前缀（大驼峰） | `Wms`、`Srm`、`Hrm`、`Pm` |
| Aggregate | 聚合根名称 | `InventoryItem`、`Supplier`、`Employee` |
| Action | 动作描述 | `Shipped`、`Created`、`Updated` |
| PastTense | 使用过去时表示已完成 | `Completed`、`Received` |

### 示例

- `WmsInventoryItemShipped` —— WMS 域库存项已出库
- `WmsWarehouseTransferCompleted` —— WMS 域仓库调拨已完成
- `SrmSupplierStatusChanged` —— SRM 域供应商状态已变更
- `HrmEmployeeCreated` —— HRM 域员工已创建

### Payload 命名

Payload 结构体命名 = EventType 变体名 + `Payload`：

```rust
WmsInventoryItemShipped       → WmsInventoryItemShippedPayload
SrmSupplierStatusChanged      → SrmSupplierStatusChangedPayload
```

---

## Payload 设计规范

### 字段规则

1. **必填字段**：事件语义核心标识，如 `supplier_id`、`outbound_id`、`material_code`。
2. **可选字段**：使用 `Option<T>`，消费者须处理 `None` 情况。
3. **时间字段**：统一使用 `Option<DateTime<Utc>>`，命名用过去时（`shipped_at`、`received_at`、`changed_at`）。
4. **ID 字段**：使用 `Uuid`；跨服务引用的 ID 允许 `Option<Uuid>`（汇总事件可为 `None`）。
5. **租户字段**：多租户事件须包含 `tenant_id: Option<Uuid>`，消费者据此隔离。
6. **变更追踪**：更新类事件须包含 `updated_fields: Vec<String>`、`old_data`、`new_data`。

### 标准字段集

| 字段 | 类型 | 适用场景 | 说明 |
|------|------|----------|------|
| `{aggregate}_id` | `Uuid` | 所有事件 | 聚合根 ID |
| `tenant_id` | `Option<Uuid>` | 多租户事件 | 租户隔离 |
| `{action}_by` | `Option<Uuid>` | 操作类事件 | 操作人 ID |
| `{action}_at` | `Option<DateTime<Utc>>` | 操作类事件 | 操作时间 |
| `updated_fields` | `Vec<String>` | 更新事件 | 变更字段列表 |
| `old_data` / `new_data` | `Option<serde_json::Value>` | 更新事件 | 变更前后快照 |
| `old_status` / `new_status` | `String` | 状态变更事件 | 状态流转 |

### Payload 示例

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SrmSupplierStatusChangedPayload {
    pub supplier_id: Uuid,
    pub supplier_no: String,
    pub supplier_name: String,
    pub old_status: String,
    pub new_status: String,
    pub change_reason: Option<String>,
    pub tenant_id: Option<Uuid>,
    pub changed_by: Option<Uuid>,
    pub changed_at: Option<DateTime<Utc>>,
}
```

---

## 事件发布模式

### 模式一：事务后异步发布（推荐）

在数据库事务提交成功后，使用 `tokio::spawn` 异步发布事件。事件发布失败仅记录 `warn` 日志，不影响主流程返回值。

```rust
// 在业务操作成功后
if let Some(ref publisher) = state.event_publisher {
    let publisher = publisher.clone();
    let supplier_id = id;
    let old_status = supplier_ref.status.clone();
    // ... 捕获所需字段 ...
    tokio::spawn(async move {
        let payload = SrmSupplierStatusChangedPayload {
            supplier_id,
            old_status,
            new_status: "approved".to_string(),
            // ...
        };
        if let Err(e) = publisher
            .publish_event(EventType::SrmSupplierStatusChanged, payload)
            .await
        {
            tracing::warn!(
                "[srm] SrmSupplierStatusChanged 事件发布失败（graceful fallback）: {}",
                e
            );
        } else {
            tracing::info!(
                "[srm] SrmSupplierStatusChanged 事件发布成功 - supplier_id={}",
                supplier_id
            );
        }
    });
}
```

### 模式二：批量查询发布

适用于聚合类事件（如低库存预警），先查询数据库获取所有需通知的记录，再批量发布。

```rust
// event_handlers::emit_low_stock_alerts
let rows = sqlx::query("SELECT ... FROM wms.inventory WHERE ...")
    .fetch_all(db).await?;

for row in rows {
    let payload = WmsInventoryLowStockPayload { /* ... */ };
    if let Err(e) = publisher
        .publish_event(EventType::WmsInventoryLowStock, payload).await
    {
        tracing::warn!("[wms] 低库存事件发布失败: {}", e);
    }
}
```

### 发布时机规范

| 业务场景 | 发布时机 | 事件示例 |
|----------|----------|----------|
| 实体创建 | INSERT 成功后 | `SrmSupplierCreated` |
| 实体更新 | UPDATE 成功后 | `SrmSupplierUpdated` |
| 状态流转 | UPDATE 成功后 | `SrmSupplierStatusChanged` |
| 业务完成 | 终态 UPDATE 成功后 | `WmsWarehouseTransferCompleted` |
| 阈值触发 | 查询命中条件后 | `WmsInventoryLowStock` |

### 字段捕获规范

`tokio::spawn` 闭包需要 `'static` 生命周期，发布前须将所需字段从 `state`/`req`/模型中 **clone 到局部变量**：

```rust
let publisher = publisher.clone();      // Arc clone
let supplier_id = id;                    // Copy
let supplier_no = supplier.supplier_no.clone();
let tenant_id_evt = tenant_id;           // Copy
```

---

## 事件消费规范

### 幂等性要求

消费者 **必须** 实现幂等处理，推荐策略：

1. **唯一键去重**：基于 `event_id` 或 Payload 中的业务唯一键做去重。
2. **状态检查**：消费前检查当前状态，若已是目标状态则跳过。
3. **UPSERT 语义**：使用 `INSERT ... ON CONFLICT DO UPDATE` 替代先查后写。

### 错误处理

- 消费失败的事件进入 `DeadLetterQueue`，可查看/重试/归档。
- 非幂等操作的重试须谨慎，建议人工介入后重试。
- 消费者不应抛出 panic，所有错误须被捕获并记录。

### 跨域事件流

```
WMS 出库完成 ──► WmsInventoryItemShipped ──► SCM（销售履约）/ Finance（成本结转）
WMS 入库完成 ──► WmsInventoryItemReceived ──► SCM（采购履约）/ Finance（应付确认）
WMS 调拨完成 ──► WmsWarehouseTransferCompleted ──► SCM（库存可见性）/ Finance（仓间结转）
WMS 低库存   ──► WmsInventoryLowStock ──► SCM（补货计划）/ Portal（用户提醒）
SRM 供应商创建 ──► SrmSupplierCreated ──► SCM（供应商可见性）/ Finance（应付科目）
SRM 供应商更新 ──► SrmSupplierUpdated ──► SCM/Finance（同步快照）
SRM 状态变更   ──► SrmSupplierStatusChanged ──► SCM（采购资格）/ Finance（应付启用）/ Portal
```

---

## 事件目录

### WMS 仓储事件

| 事件类型 | 触发时机 | 消费方 | Payload |
|----------|----------|--------|---------|
| `WmsInventoryItemShipped` | 出库单发货完成 | SCM, Finance | `WmsInventoryItemShippedPayload` |
| `WmsInventoryItemReceived` | 入库单收货完成 | SCM, Finance | `WmsInventoryItemReceivedPayload` |
| `WmsWarehouseTransferCompleted` | 调拨单完成 | SCM, Finance | `WmsWarehouseTransferCompletedPayload` |
| `WmsInventoryLowStock` | 库存低于阈值 | SCM, Portal | `WmsInventoryLowStockPayload` |

### SRM 供应商事件

| 事件类型 | 触发时机 | 消费方 | Payload |
|----------|----------|--------|---------|
| `SrmSupplierRegistered` | 供应商注册提交 | Portal | `SrmSupplierRegisteredPayload` |
| `SrmSupplierApproved` | 供应商审批通过 | SCM, Finance | `SrmSupplierApprovedPayload` |
| `SrmSupplierCreated` | 供应商主数据创建 | SCM, Finance | `SrmSupplierCreatedPayload` |
| `SrmSupplierUpdated` | 供应商主数据更新 | SCM, Finance | `SrmSupplierUpdatedPayload` |
| `SrmSupplierStatusChanged` | 供应商状态流转 | SCM, Finance, Portal | `SrmSupplierStatusChangedPayload` |
| `SrmRfqCreated` | 询价单创建 | Portal | `SrmRfqCreatedPayload` |
| `SrmBidSubmitted` | 投标提交 | Portal | `SrmBidSubmittedPayload` |

> **注意**：`SrmSupplierRegistered` 表示"注册审批流程已发起"，`SrmSupplierCreated` 表示"主数据已创建"（CUD 事实）。两者语义不同，不可互替。

### 其他域事件

完整事件列表见 `lib/src/event/event_types.rs` 的 `EventType` 枚举，涵盖 HRM、PM、LIMS、QMS、EHS、CRM、PDM、SCM、Finance、GIS、RD、AI、Doc、Portal 等域。

---

## 版本管理与 Schema 治理

### 事件版本注册表

`EventVersionRegistry`（`lib/src/event/versioning.rs`）管理事件版本，支持灰度迁移：

- 每个事件类型可注册多个版本（`EventVersion`）。
- 消费者可声明支持的版本范围。
- 版本迁移通过转换函数（upcast/downcast）实现。

### Schema 注册表

`SchemaRegistry`（`lib/src/event/schema_registry.rs`）集中管理 Payload 校验规则：

- 发布前可选校验 Payload 是否符合 Schema。
- 消费前可选校验收到的 Payload 结构。
- 校验结果通过 `ValidationResult` 返回。

### 演进规则

1. **字段新增**：直接添加，使用 `Option<T>` 或提供默认值。旧消费者忽略新字段。
2. **字段移除**：禁止直接移除。先标记 `#[deprecated]`，等待所有消费者更新后再清理。
3. **字段重命名**：禁止。通过新增字段 + 废弃旧字段实现。
4. **语义变更**：禁止。新建事件类型而非修改现有事件语义。

---

## 最佳实践

### DO

- 在数据库事务提交成功后再发布事件，避免发布了事件但事务回滚。
- 使用 `tokio::spawn` 异步发布，避免事件发布延迟影响 API 响应时间。
- 在 spawn 闭包前捕获所有需要的字段（clone），闭包内不持有 `state` 引用。
- 为每个事件添加 `tracing::info`（成功）和 `tracing::warn`（失败）日志。
- Payload 包含足够的业务上下文，减少消费者的二次查询。
- 状态变更事件同时携带 `old_status` 和 `new_status`。

### DON'T

- 不要在事件发布失败时返回错误给 API 调用方（graceful fallback）。
- 不要在事件 Payload 中包含敏感信息（密码、密钥）。
- 不要让消费者直接调用发布方的同步 API（会重新引入耦合）。
- 不要在同一业务操作中发布语义重叠的多个事件（如同时发布 `Created` 和 `Updated`）。
- 不要假设事件按发布顺序到达消费者（Redis Pub/Sub 不保证跨频道顺序）。

### 新增事件检查清单

新增事件时须完成以下步骤：

- [ ] 在 `EventType` 枚举中添加变体（`lib/src/event/event_types.rs`）
- [ ] 定义 Payload 结构体，添加文档注释说明事件语义与消费方
- [ ] 在 `mod.rs` 的 `pub use` 列表中导出 Payload 类型（`lib/src/event/mod.rs`）
- [ ] 在 `EventPublisher` impl 中添加便捷发布方法（`lib/src/event/publisher.rs`）
- [ ] 在业务模块中集成事件发布代码（事务成功后异步发布）
- [ ] 运行 `cargo check -p topems-shared -p {service}` 验证编译
- [ ] 更新本文档事件目录
