use super::error::EventResult;
use super::event_types::{Event, EventType};
use chrono::{DateTime, Utc};
use redis::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn};

const METRICS_KEY_PREFIX: &str = "topems:event_metrics";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventMetrics {
    pub total_events: u64,
    pub events_by_type: HashMap<String, u64>,
    pub errors_by_type: HashMap<String, u64>,
    pub last_event_time: DateTime<Utc>,
    pub avg_processing_time_ms: f64,
    pub processing_times: Vec<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventTrace {
    pub event_id: uuid::Uuid,
    pub event_type: EventType,
    pub source: String,
    pub published_at: DateTime<Utc>,
    pub received_at: Option<DateTime<Utc>>,
    pub processed_at: Option<DateTime<Utc>>,
    pub processing_time_ms: Option<u64>,
    pub status: TraceStatus,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TraceStatus {
    Published,
    Received,
    Processing,
    Completed,
    Failed,
}

pub struct EventMonitor {
    redis_client: Client,
    metrics: Arc<RwLock<EventMetrics>>,
    _traces: Arc<RwLock<HashMap<uuid::Uuid, EventTrace>>>,
}

impl EventMonitor {
    pub fn new() -> EventResult<Self> {
        let redis_url =
            env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
        let redis_client = Client::open(redis_url)?;
        Ok(Self {
            redis_client,
            metrics: Arc::new(RwLock::new(EventMetrics {
                total_events: 0,
                events_by_type: HashMap::new(),
                errors_by_type: HashMap::new(),
                last_event_time: Utc::now(),
                avg_processing_time_ms: 0.0,
                processing_times: Vec::new(),
            })),
            _traces: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    pub async fn record_published(&self, event: &Event) -> EventResult<()> {
        let mut metrics = self.metrics.write().await;
        metrics.total_events += 1;
        let type_str = format!("{:?}", event.event_type);
        *metrics.events_by_type.entry(type_str).or_insert(0) += 1;
        metrics.last_event_time = event.occurred_at;
        let metrics_json = serde_json::to_string(&*metrics)?;
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let _: () = redis::cmd("SET")
            .arg(format!("{}:current", METRICS_KEY_PREFIX))
            .arg(&metrics_json)
            .query_async(&mut con)
            .await?;
        Ok(())
    }

    pub async fn record_processed(
        &self,
        _event: &Event,
        processing_time_ms: u64,
    ) -> EventResult<()> {
        let mut metrics = self.metrics.write().await;
        metrics.processing_times.push(processing_time_ms);
        if metrics.processing_times.len() > 100 {
            metrics.processing_times.remove(0);
        }
        metrics.avg_processing_time_ms = metrics.processing_times.iter().sum::<u64>() as f64
            / metrics.processing_times.len() as f64;
        let metrics_json = serde_json::to_string(&*metrics)?;
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let _: () = redis::cmd("SET")
            .arg(format!("{}:current", METRICS_KEY_PREFIX))
            .arg(&metrics_json)
            .query_async(&mut con)
            .await?;
        Ok(())
    }

    pub async fn record_error(&self, event: &Event, error: &str) -> EventResult<()> {
        let mut metrics = self.metrics.write().await;
        let type_str = format!("{:?}", event.event_type);
        *metrics.errors_by_type.entry(type_str).or_insert(0) += 1;
        let metrics_json = serde_json::to_string(&*metrics)?;
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let _: () = redis::cmd("SET")
            .arg(format!("{}:current", METRICS_KEY_PREFIX))
            .arg(&metrics_json)
            .query_async(&mut con)
            .await?;
        warn!(
            "事件处理错误 - 事件ID: {}, 类型: {:?}, 错误: {}",
            event.event_id, event.event_type, error
        );
        Ok(())
    }

    pub async fn get_metrics(&self) -> EventResult<EventMetrics> {
        Ok(self.metrics.read().await.clone())
    }

    pub async fn get_metrics_from_redis(&self) -> EventResult<Option<EventMetrics>> {
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let result: Option<String> = redis::cmd("GET")
            .arg(format!("{}:current", METRICS_KEY_PREFIX))
            .query_async(&mut con)
            .await?;
        if let Some(metrics_json) = result {
            let metrics: EventMetrics = serde_json::from_str(&metrics_json)?;
            Ok(Some(metrics))
        } else {
            Ok(None)
        }
    }

    pub async fn log_metrics(&self) -> EventResult<()> {
        let metrics = self.get_metrics().await?;
        info!(
            "事件监控统计 - 总事件数: {}, 平均处理时间: {:.2}ms, 错误数: {}",
            metrics.total_events,
            metrics.avg_processing_time_ms,
            metrics.errors_by_type.values().sum::<u64>()
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event::event_types::{Event, EventType};
    use crate::test_helpers::redis_pubsub;

    fn make_event() -> Event {
        Event::new(
            EventType::HealthCheck,
            "test-source",
            serde_json::json!({"k": "v"}),
        )
    }

    fn make_metrics() -> EventMetrics {
        let mut events_by_type = HashMap::new();
        events_by_type.insert("HealthCheck".to_string(), 5u64);
        let mut errors_by_type = HashMap::new();
        errors_by_type.insert("HealthCheck".to_string(), 1u64);
        EventMetrics {
            total_events: 5,
            events_by_type,
            errors_by_type,
            last_event_time: Utc::now(),
            avg_processing_time_ms: 12.5,
            processing_times: vec![10, 15, 12, 11, 14],
        }
    }

    fn make_trace(status: TraceStatus) -> EventTrace {
        EventTrace {
            event_id: uuid::Uuid::new_v4(),
            event_type: EventType::HealthCheck,
            source: "test-source".to_string(),
            published_at: Utc::now(),
            received_at: Some(Utc::now()),
            processed_at: Some(Utc::now()),
            processing_time_ms: Some(42),
            status,
            error_message: None,
        }
    }

    #[test]
    fn test_event_metrics_serde_roundtrip() {
        let metrics = make_metrics();
        let json = serde_json::to_string(&metrics).expect("serialize");
        let back: EventMetrics = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.total_events, 5);
        assert_eq!(back.events_by_type.get("HealthCheck"), Some(&5));
        assert_eq!(back.errors_by_type.get("HealthCheck"), Some(&1));
        assert_eq!(back.avg_processing_time_ms, 12.5);
        assert_eq!(back.processing_times, vec![10, 15, 12, 11, 14]);
        assert_eq!(back.last_event_time, metrics.last_event_time);
    }

    #[test]
    fn test_event_metrics_serde_roundtrip_empty() {
        let metrics = EventMetrics {
            total_events: 0,
            events_by_type: HashMap::new(),
            errors_by_type: HashMap::new(),
            last_event_time: Utc::now(),
            avg_processing_time_ms: 0.0,
            processing_times: Vec::new(),
        };
        let json = serde_json::to_string(&metrics).expect("serialize");
        let back: EventMetrics = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.total_events, 0);
        assert!(back.events_by_type.is_empty());
        assert!(back.errors_by_type.is_empty());
        assert!(back.processing_times.is_empty());
        assert_eq!(back.avg_processing_time_ms, 0.0);
    }

    #[test]
    fn test_event_trace_serde_roundtrip() {
        let trace = make_trace(TraceStatus::Completed);
        let json = serde_json::to_string(&trace).expect("serialize");
        let back: EventTrace = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.event_id, trace.event_id);
        assert_eq!(back.event_type, EventType::HealthCheck);
        assert_eq!(back.source, "test-source");
        assert_eq!(back.published_at, trace.published_at);
        assert_eq!(back.processing_time_ms, Some(42));
        assert_eq!(back.status, TraceStatus::Completed);
        assert!(back.error_message.is_none());
    }

    #[test]
    fn test_event_trace_serde_roundtrip_failed_with_error() {
        let trace = EventTrace {
            event_id: uuid::Uuid::new_v4(),
            event_type: EventType::HealthCheck,
            source: "svc".to_string(),
            published_at: Utc::now(),
            received_at: None,
            processed_at: None,
            processing_time_ms: None,
            status: TraceStatus::Failed,
            error_message: Some("connection refused".to_string()),
        };
        let json = serde_json::to_string(&trace).expect("serialize");
        let back: EventTrace = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.status, TraceStatus::Failed);
        assert_eq!(back.error_message.as_deref(), Some("connection refused"));
        assert!(back.received_at.is_none());
        assert!(back.processing_time_ms.is_none());
    }

    #[test]
    fn test_trace_status_serde_roundtrip_all_variants() {
        for status in [
            TraceStatus::Published,
            TraceStatus::Received,
            TraceStatus::Processing,
            TraceStatus::Completed,
            TraceStatus::Failed,
        ] {
            let json = serde_json::to_string(&status).expect("serialize");
            let back: TraceStatus = serde_json::from_str(&json).expect("deserialize");
            assert_eq!(status, back);
        }
    }

    #[test]
    fn test_event_metrics_clone_preserves_fields() {
        let metrics = make_metrics();
        let cloned = metrics.clone();
        assert_eq!(cloned.total_events, metrics.total_events);
        assert_eq!(cloned.events_by_type, metrics.events_by_type);
        assert_eq!(cloned.errors_by_type, metrics.errors_by_type);
        assert_eq!(cloned.processing_times, metrics.processing_times);
        assert_eq!(cloned.avg_processing_time_ms, metrics.avg_processing_time_ms);
    }

    #[test]
    fn test_event_trace_clone_preserves_fields() {
        let trace = make_trace(TraceStatus::Received);
        let cloned = trace.clone();
        assert_eq!(cloned.event_id, trace.event_id);
        assert_eq!(cloned.event_type, trace.event_type);
        assert_eq!(cloned.status, trace.status);
        assert_eq!(cloned.source, trace.source);
    }

    #[test]
    fn test_trace_status_copy_and_equality() {
        let a = TraceStatus::Completed;
        let b = a; // Copy
        assert_eq!(a, b); // PartialEq
        assert_ne!(a, TraceStatus::Failed);
    }

    #[tokio::test]
    async fn test_event_monitor_new_succeeds_lazily() {
        // EventMonitor::new 仅做 Client::open，不建立实际连接
        let monitor = EventMonitor::new();
        assert!(monitor.is_ok(), "EventMonitor::new 惰性构造应始终成功");
    }

    #[tokio::test]
    async fn test_event_monitor_get_metrics_initial_state() {
        // get_metrics 只读内存状态，不依赖 Redis
        let monitor = EventMonitor::new().expect("lazy construction succeeds");
        let metrics = monitor.get_metrics().await.expect("get_metrics should succeed");
        assert_eq!(metrics.total_events, 0);
        assert!(metrics.events_by_type.is_empty());
        assert!(metrics.errors_by_type.is_empty());
        assert!(metrics.processing_times.is_empty());
        assert_eq!(metrics.avg_processing_time_ms, 0.0);
    }

    #[tokio::test]
    async fn test_event_monitor_log_metrics_succeeds_without_redis() {
        // log_metrics 只读内存状态，不依赖 Redis
        let monitor = EventMonitor::new().expect("lazy construction succeeds");
        let result = monitor.log_metrics().await;
        assert!(result.is_ok(), "log_metrics 不依赖 Redis 应始终成功");
    }

    #[tokio::test]
    async fn test_event_monitor_record_published_returns_err_when_redis_unavailable() {
        if redis_pubsub::maybe_connect_redis().await.is_some() {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let monitor = EventMonitor::new().expect("lazy construction succeeds");
        let event = make_event();
        let result = monitor.record_published(&event).await;
        assert!(result.is_err(), "Redis 不可达时 record_published 应返回 Err");
        // 但内存中的 metrics 已更新（record_published 先更新内存再连 Redis）
        let metrics = monitor.get_metrics().await.expect("get_metrics");
        assert_eq!(metrics.total_events, 1);
        assert_eq!(metrics.events_by_type.get("HealthCheck"), Some(&1));
    }

    #[tokio::test]
    async fn test_event_monitor_record_processed_returns_err_when_redis_unavailable() {
        if redis_pubsub::maybe_connect_redis().await.is_some() {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let monitor = EventMonitor::new().expect("lazy construction succeeds");
        let event = make_event();
        let result = monitor.record_processed(&event, 50).await;
        assert!(result.is_err(), "Redis 不可达时 record_processed 应返回 Err");
        // 内存中的 processing_times 已更新
        let metrics = monitor.get_metrics().await.expect("get_metrics");
        assert_eq!(metrics.processing_times, vec![50]);
        assert_eq!(metrics.avg_processing_time_ms, 50.0);
    }

    #[tokio::test]
    async fn test_event_monitor_record_error_returns_err_when_redis_unavailable() {
        if redis_pubsub::maybe_connect_redis().await.is_some() {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let monitor = EventMonitor::new().expect("lazy construction succeeds");
        let event = make_event();
        let result = monitor.record_error(&event, "test error").await;
        assert!(result.is_err(), "Redis 不可达时 record_error 应返回 Err");
        // 内存中的 errors_by_type 已更新
        let metrics = monitor.get_metrics().await.expect("get_metrics");
        assert_eq!(metrics.errors_by_type.get("HealthCheck"), Some(&1));
    }

    #[tokio::test]
    async fn test_event_monitor_get_metrics_from_redis_returns_err_when_unavailable() {
        if redis_pubsub::maybe_connect_redis().await.is_some() {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let monitor = EventMonitor::new().expect("lazy construction succeeds");
        let result = monitor.get_metrics_from_redis().await;
        assert!(result.is_err(), "Redis 不可达时 get_metrics_from_redis 应返回 Err");
    }

    #[tokio::test]
    async fn test_event_monitor_record_processed_trims_to_100_entries() {
        // 验证 processing_times 列表超过 100 条时会被裁剪（仅内存逻辑，无需 Redis）
        // 注意：record_processed 会因 Redis 不可达返回 Err，但内存状态已更新
        if redis_pubsub::maybe_connect_redis().await.is_some() {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let monitor = EventMonitor::new().expect("lazy construction succeeds");
        let event = make_event();
        for i in 0..105 {
            let _ = monitor.record_processed(&event, i).await;
        }
        let metrics = monitor.get_metrics().await.expect("get_metrics");
        // 列表应被裁剪到 100 条
        assert_eq!(metrics.processing_times.len(), 100);
        // 前 5 条应已被移除（保留 5..104）
        assert_eq!(metrics.processing_times[0], 5);
        assert_eq!(metrics.processing_times[99], 104);
    }
}
