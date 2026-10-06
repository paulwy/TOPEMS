// ==================== graphql_subscription_impls：根类型字段实现（批次5 委托式拆分） ====================
// 拆分自 graphql_schema.rs：字段函数体搬移至此（pub async fn impl_*），主文件保留委托壳。

#![allow(ambiguous_glob_reexports, unused)]
#![allow(
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss,
    clippy::as_conversions,
    clippy::indexing_slicing,
    clippy::cast_lossless
)]

use async_graphql::dataloader::DataLoader;
use async_graphql::Context;
use futures_util::future::join_all;
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

use crate::modules::graphql_dataloader::*;
use crate::modules::graphql_helpers::*;
use crate::modules::graphql_types::*;
use crate::shared::AppState;

use crate::modules::adaptive_execution::*;
use crate::modules::aggregation::*;
use crate::modules::ai_ops::*;
use crate::modules::announcements::*;
use crate::modules::dashboard::*;
use crate::modules::deep_federation::*;
use crate::modules::deployment_manager::*;
use crate::modules::edge_computing::*;
use crate::modules::federation_gateway::*;
use crate::modules::gateway_monitoring::*;
use crate::modules::gateway_security::*;
use crate::modules::graphql_ai_assist::*;
use crate::modules::graphql_cache::*;
use crate::modules::graphql_dataloader::*;
use crate::modules::graphql_edge_computing::*;
use crate::modules::graphql_edge_v2::*;
use crate::modules::graphql_enterprise_security::MaskingRule;
use crate::modules::graphql_enterprise_security::*;
use crate::modules::graphql_entities::*;
use crate::modules::graphql_event_bus::SubscriptionChannel;
use crate::modules::graphql_event_bus::*;
use crate::modules::graphql_federation::reset_circuit_breaker;
use crate::modules::graphql_federation::*;
use crate::modules::graphql_federation_runtime::*;
use crate::modules::graphql_federation_sdl::*;
use crate::modules::graphql_federation_v4::*;
use crate::modules::graphql_gateway_security::*;
use crate::modules::graphql_governance::*;
use crate::modules::graphql_helpers::*;
use crate::modules::graphql_monitoring::acknowledge_alert;
use crate::modules::graphql_monitoring::*;
use crate::modules::graphql_persisted_queries::*;
use crate::modules::graphql_realtime_stream::*;
use crate::modules::graphql_redis_pubsub::*;
use crate::modules::graphql_schema::{
    decrement_subscriptions, get_active_subscriptions, get_cache_version, increment_subscriptions,
    invalidate_cache,
};
use crate::modules::graphql_security::*;
use crate::modules::graphql_semantic_cache::*;
use crate::modules::graphql_subscription_enhanced::*;
use crate::modules::graphql_types::*;
use crate::modules::help::*;
use crate::modules::intelligent_gateway::*;
use crate::modules::monitoring::*;
use crate::modules::navigation::*;
use crate::modules::notifications::*;
use crate::modules::orchestration::*;
use crate::modules::persisted_query::*;
use crate::modules::portal_plugin::*;
use crate::modules::query_governance::*;
use crate::modules::query_optimizer::*;
use crate::modules::quick_actions::*;
use crate::modules::rate_limiting::*;
use crate::modules::realtime_processing::*;
use crate::modules::schema_versioning::*;
use crate::modules::search::*;
use crate::modules::security_v1::*;
use crate::modules::services::*;
use crate::modules::settings::*;
use crate::modules::smart_gateway::*;
use crate::modules::streaming_processing::*;
use crate::modules::subscription_manager::*;
use crate::modules::todos::*;
use crate::modules::user::*;
use crate::modules::version_control::*;

pub async fn impl_service_health_changed() -> ReceiverStream<ServiceHealthGql> {
    increment_subscriptions();
    let (tx, rx) = mpsc::channel(32);
    tokio::spawn(async move {
        let _defer = DeferSubscriptionCount;
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
        loop {
            interval.tick().await;
            invalidate_cache();
            let mut all_ok = true;
            for (name, url) in SUBSCRIPTION_SERVICES {
                let healthy = probe_service_health(name, url).await;
                if tx
                    .send(ServiceHealthGql {
                        service: (*name).to_string(),
                        healthy,
                        url: (*url).to_string(),
                    })
                    .await
                    .is_err()
                {
                    all_ok = false;
                    break;
                }
            }
            if !all_ok {
                return;
            }
        }
    });
    ReceiverStream::new(rx)
}

pub async fn impl_master_data_changed(
    ctx: &Context<'_>,
    domain: Option<String>,
) -> ReceiverStream<MasterDataEventGql> {
    increment_subscriptions();
    let (tx, rx) = mpsc::channel(32);
    let event_bus = ctx
        .data::<Arc<EventBus>>()
        .cloned()
        .unwrap_or_else(|_| global_event_bus().clone());

    tokio::spawn(async move {
        let _defer = DeferSubscriptionCount;
        let mut recv = event_bus.subscribe(SubscriptionChannel::MasterDataChanged);
        loop {
            match recv.recv().await {
                Ok(value) => {
                    if let Ok(event) = serde_json::from_value::<MasterDataEventGql>(value) {
                        // 按 domain 过滤
                        if let Some(ref d) = domain {
                            if !event.domain.eq_ignore_ascii_case(d) {
                                continue;
                            }
                        }
                        if tx.send(event).await.is_err() {
                            break;
                        }
                    }
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    ReceiverStream::new(rx)
}

pub async fn impl_notification_received(
    ctx: &Context<'_>,
    user_id: String,
) -> ReceiverStream<NotificationEventGql> {
    increment_subscriptions();
    let (tx, rx) = mpsc::channel(32);
    let event_bus = ctx
        .data::<Arc<EventBus>>()
        .cloned()
        .unwrap_or_else(|_| global_event_bus().clone());

    tokio::spawn(async move {
        let _defer = DeferSubscriptionCount;
        let mut recv = event_bus.subscribe(SubscriptionChannel::NotificationReceived);
        loop {
            match recv.recv().await {
                Ok(value) => {
                    if let Ok(event) = serde_json::from_value::<NotificationEventGql>(value) {
                        if event.user_id != user_id {
                            continue;
                        }
                        if tx.send(event).await.is_err() {
                            break;
                        }
                    }
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    ReceiverStream::new(rx)
}

pub async fn impl_workflow_task_assigned(
    ctx: &Context<'_>,
    assignee_id: String,
) -> ReceiverStream<WorkflowTaskEventGql> {
    increment_subscriptions();
    let (tx, rx) = mpsc::channel(32);
    let event_bus = ctx
        .data::<Arc<EventBus>>()
        .cloned()
        .unwrap_or_else(|_| global_event_bus().clone());

    tokio::spawn(async move {
        let _defer = DeferSubscriptionCount;
        let mut recv = event_bus.subscribe(SubscriptionChannel::WorkflowTaskAssigned);
        loop {
            match recv.recv().await {
                Ok(value) => {
                    if let Ok(event) = serde_json::from_value::<WorkflowTaskEventGql>(value) {
                        if event.assignee_id != assignee_id {
                            continue;
                        }
                        if tx.send(event).await.is_err() {
                            break;
                        }
                    }
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    ReceiverStream::new(rx)
}

pub async fn impl_order_status_changed(
    ctx: &Context<'_>,
    order_type: Option<String>,
) -> ReceiverStream<OrderStatusEventGql> {
    increment_subscriptions();
    let (tx, rx) = mpsc::channel(32);
    let event_bus = ctx
        .data::<Arc<EventBus>>()
        .cloned()
        .unwrap_or_else(|_| global_event_bus().clone());

    tokio::spawn(async move {
        let _defer = DeferSubscriptionCount;
        let mut recv = event_bus.subscribe(SubscriptionChannel::OrderStatusChanged);
        loop {
            match recv.recv().await {
                Ok(value) => {
                    if let Ok(event) = serde_json::from_value::<OrderStatusEventGql>(value) {
                        if let Some(ref ot) = order_type {
                            if !event.order_type.eq_ignore_ascii_case(ot) {
                                continue;
                            }
                        }
                        if tx.send(event).await.is_err() {
                            break;
                        }
                    }
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    ReceiverStream::new(rx)
}

pub async fn impl_data_changed(
    ctx: &Context<'_>,
    entity_type: Option<String>,
    update_type: Option<String>,
) -> ReceiverStream<DataChangeEventGql> {
    increment_subscriptions();
    let (tx, rx) = mpsc::channel(32);
    let event_bus = ctx
        .data::<Arc<EventBus>>()
        .cloned()
        .unwrap_or_else(|_| global_event_bus().clone());

    tokio::spawn(async move {
        let _defer = DeferSubscriptionCount;
        let mut recv = event_bus.subscribe(SubscriptionChannel::DataChanged);
        loop {
            match recv.recv().await {
                Ok(value) => {
                    if let Ok(event) = serde_json::from_value::<DataChangeEvent>(value) {
                        if let Some(ref et) = entity_type {
                            if !event.entity_type.eq_ignore_ascii_case(et) {
                                continue;
                            }
                        }
                        if let Some(ref ut) = update_type {
                            let event_ut = match event.update_type {
                                UpdateType::Created => "created",
                                UpdateType::Updated => "updated",
                                UpdateType::Deleted => "deleted",
                                UpdateType::Delta => "delta",
                                UpdateType::Full => "full",
                            };
                            if !event_ut.eq_ignore_ascii_case(ut) {
                                continue;
                            }
                        }
                        let gql_event = DataChangeEventGql {
                            entity_type: event.entity_type,
                            entity_id: event.entity_id,
                            update_type: event.update_type.into(),
                            data: event.data,
                            delta: event.delta,
                            version: event.version,
                            timestamp: event.timestamp,
                            source: event.source,
                        };
                        if tx.send(gql_event).await.is_err() {
                            break;
                        }
                    }
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    ReceiverStream::new(rx)
}

pub async fn impl_realtime_data_stream(
    entity_type: Option<String>,
    update_type: Option<String>,
) -> ReceiverStream<RealtimeStreamUpdateGql> {
    increment_subscriptions();
    let (tx, rx) = mpsc::channel(32);
    let et = entity_type.clone();
    let ut = update_type.clone();

    tokio::spawn(async move {
        let _defer = DeferSubscriptionCount;
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(500));
        let mut last_seq: i64 = 0;
        loop {
            interval.tick().await;
            let target_et = et.clone().unwrap_or_else(|| "order".to_string());
            let updates = RealtimeStreamManager::get_stream_updates(&target_et, last_seq, Some(50));
            for u in updates {
                last_seq = last_seq.max(u.sequence_number);
                if let Some(ref ut) = ut {
                    let type_str = match u.stream_type {
                        StreamUpdateTypeGql::Insert => "insert",
                        StreamUpdateTypeGql::Update => "update",
                        StreamUpdateTypeGql::Delete => "delete",
                        StreamUpdateTypeGql::Sync => "sync",
                        StreamUpdateTypeGql::Snapshot => "snapshot",
                    };
                    if !type_str.eq_ignore_ascii_case(ut) {
                        continue;
                    }
                }
                if tx.send(u).await.is_err() {
                    return;
                }
            }
        }
    });

    ReceiverStream::new(rx)
}

pub async fn impl_incremental_updates(
    entity_type: Option<String>,
    entity_id: Option<String>,
) -> ReceiverStream<IncrementalUpdateGql> {
    increment_subscriptions();
    let (tx, rx) = mpsc::channel(32);
    let et = entity_type.clone();
    let eid = entity_id.clone();

    tokio::spawn(async move {
        let _defer = DeferSubscriptionCount;
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(500));
        let mut seen: HashSet<String> = HashSet::new();
        loop {
            interval.tick().await;
            let target_et = et.clone().unwrap_or_else(|| "order".to_string());
            let target_eid = eid.clone().unwrap_or_default();
            let updates = IncrementalUpdateEngine::get_pending_updates(&target_et, &target_eid, 0);
            for u in updates {
                if seen.contains(&u.update_id) {
                    continue;
                }
                seen.insert(u.update_id.clone());
                if tx.send(u).await.is_err() {
                    return;
                }
            }
        }
    });

    ReceiverStream::new(rx)
}

pub async fn impl_sync_state_changed(client_id: Option<String>) -> ReceiverStream<SyncSessionGql> {
    increment_subscriptions();
    let (tx, rx) = mpsc::channel(32);
    let cid = client_id.clone();

    tokio::spawn(async move {
        let _defer = DeferSubscriptionCount;
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(2));
        let mut last_count: usize = 0;
        loop {
            interval.tick().await;
            let history = StateSyncManager::get_sync_history(cid.as_deref(), Some(10));
            if history.len() != last_count {
                last_count = history.len();
                if let Some(latest) = history.first() {
                    if tx.send(latest.clone()).await.is_err() {
                        return;
                    }
                }
            }
        }
    });

    ReceiverStream::new(rx)
}

// ====== 从 graphql_schema.rs 迁移：订阅服务列表 + 订阅计数守卫（批次5 收尾） ======
/// 服务健康监控的目标服务列表
pub const SUBSCRIPTION_SERVICES: &[(&str, &str)] = &[
    ("erp", "http://localhost:8010"),
    ("crm", "http://localhost:8029"),
    ("hrm", "http://localhost:8020"),
    ("finance", "http://localhost:8011"),
    ("mes", "http://localhost:8030"),
    ("workflow", "http://localhost:8000"),
    ("iam", "http://localhost:8000"),
    ("notification", "http://localhost:8084"),
];

pub struct DeferSubscriptionCount;

impl Drop for DeferSubscriptionCount {
    fn drop(&mut self) {
        decrement_subscriptions();
    }
}
