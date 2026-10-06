// ==================== V39.0 Phase 9: Redis PubSub 后端 + 降级模式 ====================
// 拆分自 graphql_schema.rs：Redis 事件监听 + 演示事件模拟器（降级模式）。

use std::sync::Arc;

use crate::modules::graphql_event_bus::{
    EventBus, MasterDataEventGql, NotificationEventGql, OrderStatusEventGql,
    SubscriptionChannel, WorkflowTaskEventGql,
};

// ==================== V39.0 Phase 9: Redis PubSub 后端 + 降级模式 ====================

/// 尝试连接 Redis PubSub
///
/// 通过发布一个 HealthCheck 事件来验证 Redis 连接是否可用。
/// 如果 Redis 不可用或连接失败，返回 false，调用方应降级为内存广播模式。
pub async fn try_redis_pubsub() -> bool {
    let publisher = match topems_shared_event::event::EventPublisher::new("portal-bff-health-check")
    {
        Ok(p) => p,
        Err(e) => {
            tracing::debug!("[event-bus] Redis EventPublisher 创建失败: {}", e);
            return false;
        }
    };

    match publisher
        .publish_event(
            topems_shared_event::event::EventType::HealthCheck,
            serde_json::json!({"source": "portal-bff", "check": "connectivity"}),
        )
        .await
    {
        Ok(_) => {
            tracing::info!("[event-bus] Redis PubSub 连接正常");
            true
        }
        Err(e) => {
            tracing::warn!(
                "[event-bus] Redis PubSub 连接失败，将降级为内存广播模式: {}",
                e
            );
            false
        }
    }
}

/// 尝试启动 Redis PubSub 监听后台任务
///
/// 订阅 Redis 事件频道，将跨实例事件转发到本地 EventBus。
/// 如果 Redis EventSubscriber 创建失败，返回 false，调用方应启动演示模拟器。
pub fn try_start_redis_listener(event_bus: Arc<EventBus>) -> bool {
    let subscriber = match topems_shared_event::event::EventSubscriber::new("portal-bff") {
        Ok(s) => s,
        Err(e) => {
            tracing::warn!("[event-bus] 无法创建 EventSubscriber: {}", e);
            return false;
        }
    };

    // 订阅通知事件 → NotificationReceived 频道
    let eb_notif = event_bus.clone();
    let subscriber = subscriber.subscribe(
        vec![topems_shared_event::event::EventType::PortalNotificationPublished],
        move |event| {
            let eb = eb_notif.clone();
            async move {
                eb.publish(SubscriptionChannel::NotificationReceived, event.payload);
            }
        },
    );

    // 订阅工作流事件 → WorkflowTaskAssigned 频道
    let eb_wf = event_bus.clone();
    let subscriber = subscriber.subscribe(
        vec![
            topems_shared_event::event::EventType::WorkflowStarted,
            topems_shared_event::event::EventType::WorkflowApproved,
        ],
        move |event| {
            let eb = eb_wf.clone();
            async move {
                eb.publish(SubscriptionChannel::WorkflowTaskAssigned, event.payload);
            }
        },
    );

    // 订阅订单事件 → OrderStatusChanged 频道
    let eb_order = event_bus.clone();
    let subscriber = subscriber.subscribe(
        vec![
            topems_shared_event::event::EventType::SalesOrderCreated,
            topems_shared_event::event::EventType::SalesOrderApproved,
            topems_shared_event::event::EventType::PurchaseOrderCreated,
            topems_shared_event::event::EventType::PurchaseOrderApproved,
        ],
        move |event| {
            let eb = eb_order.clone();
            async move {
                eb.publish(SubscriptionChannel::OrderStatusChanged, event.payload);
            }
        },
    );

    // 订阅主数据事件 → MasterDataChanged 频道
    let eb_md = event_bus;
    let subscriber = subscriber.subscribe_master_data(
        vec![
            topems_shared_event::event::MasterDataDomain::Customer,
            topems_shared_event::event::MasterDataDomain::Supplier,
            topems_shared_event::event::MasterDataDomain::Material,
            topems_shared_event::event::MasterDataDomain::Organization,
            topems_shared_event::event::MasterDataDomain::Employee,
            topems_shared_event::event::MasterDataDomain::AccountSubject,
        ],
        move |mdm_event| {
            let eb = eb_md.clone();
            async move {
                let gql = MasterDataEventGql {
                    domain: format!("{:?}", mdm_event.domain).to_lowercase(),
                    action: format!("{:?}", mdm_event.action).to_lowercase(),
                    master_data_id: mdm_event.master_data_id.clone(),
                    source_service: mdm_event.source_service.clone(),
                    timestamp: mdm_event.timestamp.to_rfc3339(),
                };
                if let Ok(val) = serde_json::to_value(&gql) {
                    eb.publish(SubscriptionChannel::MasterDataChanged, val);
                }
            }
        },
    );

    // 在后台任务中持续监听
    tokio::spawn(async move {
        tracing::info!("[event-bus] Redis PubSub 监听已启动");
        if let Err(e) = subscriber.start_listening().await {
            tracing::warn!("[event-bus] Redis 事件监听异常退出: {}", e);
        }
    });

    true
}

/// 启动演示事件模拟器（Redis 不可用时的降级模式）
///
/// 每 30 秒向所有 4 个新频道发布模拟事件，用于演示和测试。
pub fn start_demo_simulator(event_bus: Arc<EventBus>) {
    tracing::info!("[event-bus] 启动演示事件模拟器（每 30 秒发布模拟事件）");

    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
        let mut counter: u64 = 0;

        loop {
            interval.tick().await;
            counter += 1;
            let now = chrono::Utc::now().to_rfc3339();
            let ts = chrono::Utc::now().timestamp();

            // 模拟主数据变更事件
            let md_event = MasterDataEventGql {
                domain: "customer".to_string(),
                action: "updated".to_string(),
                master_data_id: format!("cust-demo-{}", ts),
                source_service: "demo-simulator".to_string(),
                timestamp: now.clone(),
            };
            event_bus.publish(
                SubscriptionChannel::MasterDataChanged,
                serde_json::to_value(&md_event).unwrap_or_default(),
            );

            // 模拟通知事件
            let notif_event = NotificationEventGql {
                id: format!("notif-demo-{}", ts),
                user_id: "demo-user".to_string(),
                title: format!("演示通知 #{}", counter),
                content: "这是一条来自演示模拟器的通知事件".to_string(),
                notification_type: "info".to_string(),
                timestamp: now.clone(),
            };
            event_bus.publish(
                SubscriptionChannel::NotificationReceived,
                serde_json::to_value(&notif_event).unwrap_or_default(),
            );

            // 模拟工作流任务事件
            let wf_event = WorkflowTaskEventGql {
                task_id: format!("task-demo-{}", ts),
                assignee_id: "demo-user".to_string(),
                instance_title: format!("演示工作流任务 #{}", counter),
                priority: "medium".to_string(),
                status: "pending".to_string(),
                timestamp: now.clone(),
            };
            event_bus.publish(
                SubscriptionChannel::WorkflowTaskAssigned,
                serde_json::to_value(&wf_event).unwrap_or_default(),
            );

            // 模拟订单状态变更事件
            let order_event = OrderStatusEventGql {
                order_id: format!("order-demo-{}", ts),
                order_type: "sales".to_string(),
                old_status: "pending".to_string(),
                new_status: "approved".to_string(),
                timestamp: now,
            };
            event_bus.publish(
                SubscriptionChannel::OrderStatusChanged,
                serde_json::to_value(&order_event).unwrap_or_default(),
            );

            tracing::debug!("[event-bus][demo] 已发布第 {} 轮演示事件", counter);
        }
    });
}

