// V45.0 Track A: Finance 事件管道
// =============================================================================
// 整合: 发布器 + 路由器 + Saga 协调器
// 流程: 命令产生事件 → 发布 → 路由到处理器 → 触发相关 Saga

use super::event_handler::{default_router, EventRouter, RouteResult, SideEffect};
use super::event_publisher::{DomainEventPublisherExt, InMemoryEventPublisher, PublishedEvent};
use super::events::FinanceDomainEvent;
use super::saga::{saga_type_for_event, SagaCoordinator};

/// 事件管道: 发布 → 路由 → 处理 → 副作用 → 触发 Saga
pub struct EventPipeline {
    publisher: InMemoryEventPublisher,
    router: EventRouter,
    saga_coordinator: SagaCoordinator,
}

impl EventPipeline {
    pub fn new() -> Self {
        Self {
            publisher: InMemoryEventPublisher::new(),
            router: default_router(),
            saga_coordinator: super::saga::default_coordinator(),
        }
    }

    /// 处理命令产生的事件: 发布 + 路由 + 触发 Saga
    pub async fn process_events(&self, events: &[(FinanceDomainEvent, String)]) -> PipelineResult {
        // 1. 批量发布事件
        let events_published = events.len();
        if let Err(e) = self.publisher.publish_batch(events).await {
            tracing::warn!("[event-pipeline] publish_batch 失败: {}", e);
        }

        // 2. 路由到处理器，收集副作用
        let mut handlers_invoked = 0usize;
        let mut side_effects: Vec<SideEffect> = Vec::new();
        let mut route_results: Vec<RouteResult> = Vec::new();
        for (event, aggregate_id) in events {
            let results = self.router.route(event, aggregate_id).await;
            handlers_invoked += results.len();
            for r in results {
                side_effects.extend(r.side_effects.iter().cloned());
                route_results.push(r);
            }
        }

        // 3. 根据事件触发相关 Saga
        let mut sagas_started = Vec::new();
        for (event, aggregate_id) in events {
            if let Some(saga_type) = saga_type_for_event(event) {
                let payload = saga_payload_for_event(event, aggregate_id);
                match self.saga_coordinator.start_saga(saga_type, payload).await {
                    Ok(saga_id) => {
                        tracing::info!(
                            "[event-pipeline] 已启动 Saga {} (id={}) 由事件 {} 触发",
                            saga_type,
                            saga_id,
                            super::event_publisher::event_type_name(event)
                        );
                        sagas_started.push(saga_id);
                    }
                    Err(e) => {
                        tracing::warn!("[event-pipeline] 启动 Saga {} 失败: {}", saga_type, e);
                    }
                }
            }
        }

        PipelineResult {
            events_published,
            handlers_invoked,
            side_effects,
            sagas_started,
            route_results,
        }
    }

    pub fn get_published_events(&self) -> Vec<PublishedEvent> {
        self.publisher.get_events()
    }

    pub fn published_count(&self) -> usize {
        self.publisher.count()
    }

    pub fn get_router(&self) -> &EventRouter {
        &self.router
    }

    pub fn get_saga_coordinator(&self) -> &SagaCoordinator {
        &self.saga_coordinator
    }
}

impl Default for EventPipeline {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct PipelineResult {
    pub events_published: usize,
    pub handlers_invoked: usize,
    pub side_effects: Vec<SideEffect>,
    pub sagas_started: Vec<String>,
    #[serde(skip)]
    pub route_results: Vec<RouteResult>,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct PipelineStats {
    pub published_events: usize,
    pub registered_handlers: usize,
    pub registered_saga_definitions: usize,
    pub saga_stats: super::saga::SagaStats,
}

/// 从领域事件构造 Saga 启动 payload
fn saga_payload_for_event(event: &FinanceDomainEvent, aggregate_id: &str) -> serde_json::Value {
    match event {
        FinanceDomainEvent::VoucherPosted(e) => serde_json::json!({
            "voucher_id": e.voucher_id,
            "voucher_no": e.voucher_no,
            "posted_by": e.posted_by,
            "aggregate_id": aggregate_id,
        }),
        FinanceDomainEvent::ReceivableSettled(e) => serde_json::json!({
            "receivable_id": e.receivable_id,
            "collection_id": e.collection_id,
            "settled_amount": e.settled_amount,
            "remaining_amount": e.remaining_amount,
            "aggregate_id": aggregate_id,
        }),
        FinanceDomainEvent::PayableSettled(e) => serde_json::json!({
            "payable_id": e.payable_id,
            "payment_id": e.payment_id,
            "settled_amount": e.settled_amount,
            "remaining_amount": e.remaining_amount,
            "aggregate_id": aggregate_id,
        }),
        _ => serde_json::json!({ "aggregate_id": aggregate_id }),
    }
}

// 全局管道实例（OnceLock）
static EVENT_PIPELINE: std::sync::OnceLock<EventPipeline> = std::sync::OnceLock::new();

pub fn get_event_pipeline() -> &'static EventPipeline {
    EVENT_PIPELINE.get_or_init(EventPipeline::new)
}

pub fn get_pipeline_stats() -> PipelineStats {
    let pipeline = get_event_pipeline();
    PipelineStats {
        published_events: pipeline.published_count(),
        registered_handlers: pipeline.get_router().handler_count(),
        registered_saga_definitions: pipeline.get_saga_coordinator().definition_count(),
        saga_stats: pipeline.get_saga_coordinator().get_stats(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::event_handler::SideEffect;
    use crate::domain::saga::SagaStats;
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn rt_pipeline_result_default() {
        roundtrip(&PipelineResult::default());
    }

    #[test]
    fn rt_pipeline_result_with_side_effects() {
        let effects = vec![
            SideEffect::SendNotification {
                recipient: "alice".into(),
                message: "Voucher posted".into(),
            },
            SideEffect::TriggerSync {
                target_service: "ledger".into(),
                entity_type: "Voucher".into(),
                entity_id: "v-001".into(),
            },
            SideEffect::UpdateCache {
                cache_key: "voucher:v-001".into(),
            },
            SideEffect::InvalidateView {
                view_name: "voucher_summary".into(),
            },
            SideEffect::PublishExternalEvent {
                routing_key: "finance.voucher.posted".into(),
                payload: serde_json::json!({ "voucher_id": "v-001" }),
            },
        ];
        roundtrip(&PipelineResult {
            events_published: 2,
            handlers_invoked: 4,
            side_effects: effects,
            sagas_started: vec!["saga-1".into()],
            route_results: vec![],
        });
    }

    #[test]
    fn rt_pipeline_stats() {
        let mut by_type = HashMap::new();
        by_type.insert("VoucherPosting".to_string(), 3usize);
        roundtrip(&PipelineStats {
            published_events: 100,
            registered_handlers: 4,
            registered_saga_definitions: 4,
            saga_stats: SagaStats {
                total: 10,
                running: 1,
                completed: 6,
                failed: 1,
                compensating: 1,
                compensated: 1,
                aborted: 0,
                by_type,
            },
        });
    }
}
