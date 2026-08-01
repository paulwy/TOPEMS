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
