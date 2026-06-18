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
        let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
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
        let _: () = redis::cmd("SET").arg(format!("{}:current", METRICS_KEY_PREFIX)).arg(&metrics_json).query_async(&mut con).await?;
        Ok(())
    }

    pub async fn record_processed(&self, _event: &Event, processing_time_ms: u64) -> EventResult<()> {
        let mut metrics = self.metrics.write().await;
        metrics.processing_times.push(processing_time_ms);
        if metrics.processing_times.len() > 100 {
            metrics.processing_times.remove(0);
        }
        metrics.avg_processing_time_ms = metrics.processing_times.iter().sum::<u64>() as f64 / metrics.processing_times.len() as f64;
        let metrics_json = serde_json::to_string(&*metrics)?;
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let _: () = redis::cmd("SET").arg(format!("{}:current", METRICS_KEY_PREFIX)).arg(&metrics_json).query_async(&mut con).await?;
        Ok(())
    }

    pub async fn record_error(&self, event: &Event, error: &str) -> EventResult<()> {
        let mut metrics = self.metrics.write().await;
        let type_str = format!("{:?}", event.event_type);
        *metrics.errors_by_type.entry(type_str).or_insert(0) += 1;
        let metrics_json = serde_json::to_string(&*metrics)?;
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let _: () = redis::cmd("SET").arg(format!("{}:current", METRICS_KEY_PREFIX)).arg(&metrics_json).query_async(&mut con).await?;
        warn!("事件处理错误 - 事件ID: {}, 类型: {:?}, 错误: {}", event.event_id, event.event_type, error);
        Ok(())
    }

    pub async fn get_metrics(&self) -> EventResult<EventMetrics> {
        Ok(self.metrics.read().await.clone())
    }

    pub async fn get_metrics_from_redis(&self) -> EventResult<Option<EventMetrics>> {
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let result: Option<String> = redis::cmd("GET").arg(format!("{}:current", METRICS_KEY_PREFIX)).query_async(&mut con).await?;
        if let Some(metrics_json) = result {
            let metrics: EventMetrics = serde_json::from_str(&metrics_json)?;
            Ok(Some(metrics))
        } else {
            Ok(None)
        }
    }

    pub async fn log_metrics(&self) -> EventResult<()> {
        let metrics = self.get_metrics().await?;
        info!("事件监控统计 - 总事件数: {}, 平均处理时间: {:.2}ms, 错误数: {}", metrics.total_events, metrics.avg_processing_time_ms, metrics.errors_by_type.values().sum::<u64>());
        Ok(())
    }
}
