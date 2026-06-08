# TOPEMS 事件驱动架构使用指南

> 文档版本: v1.0
> 创建日期: 2026-06-08
> 状态: 已实现

---

## 1. 概述

事件驱动架构（EDA）是 TOPEMS 微服务架构的核心组成部分，通过发布-订阅模式实现模块间的松耦合通信。

### 1.1 核心组件

- **EventPublisher**: 事件发布者，用于向 Redis 频道发布事件
- **EventSubscriber**: 事件订阅者，用于监听和处理事件
- **Event**: 事件实体，包含事件类型、源、数据等信息
- **EventPayloads**: 预定义的事件数据结构（HRM、PM 等）

### 1.2 架构优势

- ✅ **松耦合**: 模块间不需要知道彼此的存在
- ✅ **可扩展性**: 新增订阅者不影响现有模块
- ✅ **容错性**: 一个模块故障不影响其他模块
- ✅ **异步处理**: 事件处理可以异步执行

---

## 2. 快速开始

### 2.1 发布事件（HRM 模块示例）

```rust
// 在 HRM 模块中，员工创建成功后发布事件
use topems_shared::{EventPublisher, EventType};

async fn create_employee_service(
    // ... 参数
) -> Result<()> {
    // 1. 创建员工...
    let employee = create_employee_in_db(...).await?;
    
    // 2. 初始化事件发布者
    let publisher = EventPublisher::new("hrm-service")?;
    
    // 3. 发布员工创建事件
    publisher.publish_hrm_employee_created(
        employee.id,
        &employee.name,
        &employee.email,
        employee.department_id,
    ).await?;
    
    Ok(())
}
```

### 2.2 订阅事件（ERP 模块示例）

```rust
// 在 ERP 模块中，订阅 HRM 员工事件
use topems_shared::{EventSubscriber, Event, EventType};
use tokio;

#[tokio::main]
async fn main() {
    // 1. 创建订阅者
    let subscriber = EventSubscriber::new("erp-service")?;
    
    // 2. 订阅 HRM 员工事件
    let subscriber = subscriber.subscribe_hrm_employee_events(|event| {
        async move {
            handle_hrm_employee_event(event).await;
        }
    });
    
    // 3. 启动监听（这会阻塞，通常在后台任务中运行）
    if let Err(e) = subscriber.start_listening().await {
        eprintln!("事件监听失败: {}", e);
    }
}

async fn handle_hrm_employee_event(event: Event) {
    match event.event_type {
        EventType::HrmEmployeeCreated => {
            // 处理员工创建事件
            if let Ok(payload) = serde_json::from_value::<HrmEmployeeCreatedPayload>(event.payload) {
                println!("新员工创建: {} ({})", payload.name, payload.email);
                // 可以在这里更新 ERP 的缓存或做其他同步操作
            }
        },
        EventType::HrmEmployeeUpdated => {
            // 处理员工更新事件
        },
        EventType::HrmEmployeeDeleted => {
            // 处理员工删除事件
        },
        _ => {}
    }
}
```

---

## 3. 完整示例

### 3.1 场景：HRM 创建员工，ERP 收到通知并同步信息

```
┌──────────────┐          ┌───────────┐          ┌──────────────┐
│  HRM 模块    │          │   Redis   │          │  ERP 模块    │
└──────┬───────┘          └─────┬─────┘          └──────┬───────┘
       │                        │                        │
       │  1. 创建员工           │                        │
       │  2. 发布事件          │                        │
       │───────────────────────>│                        │
       │                        │  3. 事件广播          │
       │                        │───────────────────────>│
       │                        │                        │  4. 处理事件
       │                        │                        │
```

```rust
// HRM 侧
use topems_shared::EventPublisher;

async fn on_employee_created(employee: &Employee) {
    let publisher = EventPublisher::new("hrm")?;
    publisher.publish_hrm_employee_created(
        employee.id,
        &employee.name,
        &employee.email,
        employee.department_id,
    ).await?;
}

// ERP 侧
use topems_shared::{EventSubscriber, Event, EventType, HrmEmployeeCreatedPayload};

fn start_event_listener() {
    tokio::spawn(async move {
        let subscriber = EventSubscriber::new("erp")?
            .subscribe_hrm_employee_events(|event| async move {
                handle_event(event).await;
            });
        
        subscriber.start_listening().await?;
    });
}

async fn handle_event(event: Event) {
    if event.event_type == EventType::HrmEmployeeCreated {
        if let Ok(payload) = serde_json::from_value::<HrmEmployeeCreatedPayload>(event.payload) {
            // ERP 可以在这里：
            // 1. 更新本地缓存（例如员工姓名用于显示）
            // 2. 触发通知给相关人员
            // 3. 更新 ERP 报表等
            sync_employee_to_erp(&payload).await;
        }
    }
}
```

---

## 4. 事件类型

### 4.1 HRM 事件

| 事件类型 | Payload 结构 | 说明 |
|---------|-------------|------|
| HrmEmployeeCreated | HrmEmployeeCreatedPayload | 员工创建 |
| HrmEmployeeUpdated | HrmEmployeeUpdatedPayload | 员工更新 |
| HrmEmployeeDeleted | (通用) | 员工删除 |
| HrmDepartmentCreated | (待实现) | 部门创建 |
| HrmDepartmentUpdated | (待实现) | 部门更新 |

### 4.2 PM 事件

| 事件类型 | Payload 结构 | 说明 |
|---------|-------------|------|
| PmProjectCreated | PmProjectCreatedPayload | 项目创建 |
| PmProjectUpdated | (待实现) | 项目更新 |
| PmTaskCreated | (待实现) | 任务创建 |

### 4.3 添加新事件

```rust
// 1. 在 event.rs 中添加事件类型
pub enum EventType {
    // ... 现有事件
    MyCustomEvent, // 新增
}

// 2. 创建 Payload 结构（可选）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MyCustomPayload {
    pub field1: String,
    pub field2: i32,
}

// 3. 在 publisher.rs 中添加便捷方法
impl EventPublisher {
    pub async fn publish_my_custom_event(
        &self,
        field1: &str,
        field2: i32,
    ) -> EventResult<()> {
        let payload = MyCustomPayload {
            field1: field1.to_string(),
            field2,
        };
        self.publish_event(EventType::MyCustomEvent, payload).await
    }
}
```

---

## 5. 最佳实践

### 5.1 发布者实践

1. **仅在事务成功后发布**：确保数据变更已持久化
2. **不要依赖事件处理结果**：事件是异步的，不能依赖订阅者的返回值
3. **包含必要的信息**：事件 payload 应包含处理所需的全部数据

### 5.2 订阅者实践

1. **幂等性**：事件可能重复送达，处理必须是幂等的
2. **错误处理**：单个事件处理失败不应影响其他事件
3. **超时控制**：事件处理应设置合理超时

### 5.3 错误处理

```rust
async fn handle_event_safely(event: Event) {
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        handle_event_core(event.clone())
    ).await;
    
    match result {
        Ok(Ok(())) => {
            tracing::debug!("事件处理成功");
        }
        Ok(Err(e)) => {
            tracing::error!("事件处理失败: {}", e);
            // 可以考虑记录到死信队列
        }
        Err(_) => {
            tracing::error!("事件处理超时");
        }
    }
}
```

---

## 6. 频道命名规范

所有事件频道遵循以下格式：

```
topems:events:<EventType>
```

例如：
- `topems:events:HrmEmployeeCreated`
- `topems:events:PmProjectCreated`

---

## 7. 相关文档

- [架构改进计划](./ARCHITECTURE_IMPROVEMENT_PLAN.md)
- [Schema 隔离规范](./SCHEMA_ISOLATION_GUIDE.md)
- [服务客户端指南](./SERVICE_CLIENT_GUIDE.md)

---

## 8. 下一步

- ✅ 基础框架已实现
- ⏳ 可以根据需求添加更多事件类型
- ⏳ 可以考虑实现死信队列机制
- ⏳ 可以添加事件监控和追踪

---

**事件驱动架构让 TOPEMS 更具弹性！**
