// ==================== V39.0 Phase 9: 多频道事件驱动 Subscription ====================
// 拆分自 graphql_schema.rs：SubscriptionChannel + 事件 payload + 内存 EventBus + 全局单例。

use std::collections::HashMap;
use std::sync::Arc;

use async_graphql::SimpleObject;
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

// ==================== V39.0 Phase 9: 多频道事件驱动 Subscription ====================

/// 订阅频道类型
/// 支持 6 个事件频道，每个频道可独立订阅和过滤。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SubscriptionChannel {
    /// 服务健康状态变化（已有，保留）
    ServiceHealth,
    /// 主数据变更事件（客户/供应商/物料/员工等）
    MasterDataChanged,
    /// 通知接收事件
    NotificationReceived,
    /// 工作流任务分配事件
    WorkflowTaskAssigned,
    /// 订单状态变更事件
    OrderStatusChanged,
    /// V43.0: 通用数据变更事件（实体级细粒度推送）
    DataChanged,
}

impl SubscriptionChannel {
    /// Redis PubSub 频道名
    pub fn redis_channel(&self) -> &'static str {
        match self {
            Self::ServiceHealth => "topems:portal:subscription:service_health",
            Self::MasterDataChanged => "topems:portal:subscription:master_data",
            Self::NotificationReceived => "topems:portal:subscription:notification",
            Self::WorkflowTaskAssigned => "topems:portal:subscription:workflow_task",
            Self::OrderStatusChanged => "topems:portal:subscription:order_status",
            Self::DataChanged => "topems:portal:subscription:data_changed",
        }
    }
}

/// 主数据变更事件 payload
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct MasterDataEventGql {
    pub domain: String,
    pub action: String,
    pub master_data_id: String,
    pub source_service: String,
    pub timestamp: String,
}

/// 通知接收事件 payload
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct NotificationEventGql {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub content: String,
    pub notification_type: String,
    pub timestamp: String,
}

/// 工作流任务分配事件 payload
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct WorkflowTaskEventGql {
    pub task_id: String,
    pub assignee_id: String,
    pub instance_title: String,
    pub priority: String,
    pub status: String,
    pub timestamp: String,
}

/// 订单状态变更事件 payload
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct OrderStatusEventGql {
    pub order_id: String,
    pub order_type: String,
    pub old_status: String,
    pub new_status: String,
    pub timestamp: String,
}

/// 内存事件总线（降级模式 / 本地广播）
///
/// 当 Redis 不可用时，使用 `tokio::sync::broadcast` 进行本地事件广播。
/// 每个频道独立配置容量（256），支持多订阅者。
pub struct EventBus {
    channels: HashMap<SubscriptionChannel, broadcast::Sender<serde_json::Value>>,
}

impl EventBus {
    /// 创建包含所有频道的事件总线
    pub fn new() -> Self {
        let mut channels = HashMap::new();
        let all_channels = [
            SubscriptionChannel::ServiceHealth,
            SubscriptionChannel::MasterDataChanged,
            SubscriptionChannel::NotificationReceived,
            SubscriptionChannel::WorkflowTaskAssigned,
            SubscriptionChannel::OrderStatusChanged,
            SubscriptionChannel::DataChanged,
        ];
        for ch in all_channels {
            let (tx, _rx) = broadcast::channel::<serde_json::Value>(256);
            channels.insert(ch, tx);
        }
        Self { channels }
    }

    /// 发布事件到指定频道
    pub fn publish(&self, channel: SubscriptionChannel, event: serde_json::Value) {
        if let Some(tx) = self.channels.get(&channel) {
            // 忽略发送错误（无订阅者时正常）
            let _ = tx.send(event);
        }
    }

    /// 订阅指定频道，返回一个新的接收器
    pub fn subscribe(
        &self,
        channel: SubscriptionChannel,
    ) -> broadcast::Receiver<serde_json::Value> {
        self.channels
            .get(&channel)
            .unwrap_or_else(|| panic!("unknown subscription channel: {channel:?}"))
            .subscribe()
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new()
    }
}

/// 全局事件总线单例
/// 供 SubscriptionRoot、MutationRoot 和 Redis 监听后台任务共享。
static GLOBAL_EVENT_BUS: std::sync::OnceLock<Arc<EventBus>> = std::sync::OnceLock::new();

/// 获取全局事件总线
pub fn global_event_bus() -> &'static Arc<EventBus> {
    GLOBAL_EVENT_BUS.get_or_init(|| Arc::new(EventBus::new()))
}

