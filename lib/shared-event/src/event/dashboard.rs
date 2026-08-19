//! 事件治理仪表盘数据接口
//!
//! 整合版本注册表、Schema 注册表与死信队列统计，为 Web 控制台提供统一的数据视图。
//! 实时统计字段（如当日发布数、当日消费数、平均处理时间）以 stub 形式返回 0 值，
//! 后续接入实时监控后端时替换 `collect_realtime_stats` 实现即可。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::warn;
use uuid::Uuid;

use super::dead_letter_queue::{DeadLetterQueue, DeadLetterStats};
use super::error::EventResult;
use super::schema_registry::SchemaRegistry;
use super::versioning::{EventVersionRegistry, EventVersionRegistryStats};

/// 事件治理仪表盘数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventGovernanceDashboard {
    pub summary: EventGovernanceSummary,
    pub version_registry_stats: EventVersionRegistryStats,
    pub schema_registry_stats: SchemaRegistryStats,
    pub dead_letter_stats: DeadLetterStats,
    pub recent_events: Vec<RecentEvent>,
    pub event_type_distribution: Vec<EventTypeDistribution>,
}

/// 仪表盘汇总信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventGovernanceSummary {
    pub total_event_types: usize,
    pub total_published_today: u64,
    pub total_consumed_today: u64,
    pub total_failed_today: u64,
    pub average_processing_time_ms: f64,
    pub generated_at: DateTime<Utc>,
}

/// Schema 注册表统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaRegistryStats {
    pub total_schemas: usize,
    pub validated_events_today: u64,
    pub validation_failures_today: u64,
}

/// 最近事件条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentEvent {
    pub event_id: Uuid,
    pub event_type: String,
    pub source: String,
    pub occurred_at: DateTime<Utc>,
    pub status: String,
}

/// 事件类型分布
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventTypeDistribution {
    pub event_type: String,
    pub count: u64,
    pub percentage: f64,
}

/// 事件治理仪表盘生成器
pub struct EventDashboardGenerator {
    version_registry: Arc<EventVersionRegistry>,
    schema_registry: Arc<SchemaRegistry>,
    dead_letter_queue: Arc<DeadLetterQueue>,
}

impl EventDashboardGenerator {
    pub fn new(
        version_registry: Arc<EventVersionRegistry>,
        schema_registry: Arc<SchemaRegistry>,
        dead_letter_queue: Arc<DeadLetterQueue>,
    ) -> Self {
        Self {
            version_registry,
            schema_registry,
            dead_letter_queue,
        }
    }

    /// 生成完整的仪表盘数据
    pub async fn generate(&self) -> EventResult<EventGovernanceDashboard> {
        let version_stats = self.version_registry.stats();
        let schema_total = self.schema_registry.count();
        let dead_letter_stats = self.dead_letter_queue.get_stats().await?;

        // 实时统计字段：当前为 stub 实现，后续接入 EventMonitor 即可填充
        let realtime = self.collect_realtime_stats().await;

        let summary = EventGovernanceSummary {
            total_event_types: version_stats.total_event_types,
            total_published_today: realtime.published_today,
            total_consumed_today: realtime.consumed_today,
            total_failed_today: dead_letter_stats.total_dead_letters as u64,
            average_processing_time_ms: realtime.avg_processing_time_ms,
            generated_at: Utc::now(),
        };

        let schema_registry_stats = SchemaRegistryStats {
            total_schemas: schema_total,
            validated_events_today: realtime.validated_events_today,
            validation_failures_today: realtime.validation_failures_today,
        };

        // 将死信按事件类型分布转换为分布列表
        let total_dl: u64 = dead_letter_stats
            .by_event_type
            .values()
            .map(|v| *v as u64)
            .sum();
        let mut event_type_distribution: Vec<EventTypeDistribution> = dead_letter_stats
            .by_event_type
            .iter()
            .map(|(k, v)| EventTypeDistribution {
                event_type: k.clone(),
                count: *v as u64,
                percentage: if total_dl == 0 {
                    0.0
                } else {
                    (*v as f64 / total_dl as f64) * 100.0
                },
            })
            .collect();
        event_type_distribution.sort_by_key(|a| std::cmp::Reverse(a.count));

        Ok(EventGovernanceDashboard {
            summary,
            version_registry_stats: version_stats,
            schema_registry_stats,
            dead_letter_stats,
            recent_events: realtime.recent_events,
            event_type_distribution,
        })
    }

    /// 收集实时统计（stub 实现）
    ///
    /// 当前阶段返回 0 值，待接入 EventMonitor 的实时计数器后替换。
    /// HTTP 调用使用 reqwest（已包含在 lib 依赖中），如需调用外部监控服务，
    /// 可在此方法内扩展。
    async fn collect_realtime_stats(&self) -> RealtimeStats {
        if let Err(e) = self.try_fetch_realtime().await {
            warn!(error = %e, "实时统计获取失败，使用 0 值兜底");
        }
        RealtimeStats::default()
    }

    /// 预留的 HTTP 调用入口（当前为 stub）
    ///
    /// 后续如需对接外部监控服务，可在此处使用 `reqwest` 拉取数据。
    /// 当前实现直接返回 `Err`，使 `collect_realtime_stats` 走默认值路径。
    async fn try_fetch_realtime(&self) -> EventResult<()> {
        // Stub: 不发起实际请求
        Ok(())
    }
}

#[derive(Debug, Clone, Default)]
struct RealtimeStats {
    published_today: u64,
    consumed_today: u64,
    avg_processing_time_ms: f64,
    validated_events_today: u64,
    validation_failures_today: u64,
    recent_events: Vec<RecentEvent>,
}

/// 工具函数：将 `HashMap<String, usize>` 转为分布列表
///
/// 公开供外部组件复用。
pub fn distribution_from_map(map: &HashMap<String, usize>) -> Vec<EventTypeDistribution> {
    let total: u64 = map.values().map(|v| *v as u64).sum();
    let mut list: Vec<EventTypeDistribution> = map
        .iter()
        .map(|(k, v)| EventTypeDistribution {
            event_type: k.clone(),
            count: *v as u64,
            percentage: if total == 0 {
                0.0
            } else {
                (*v as f64 / total as f64) * 100.0
            },
        })
        .collect();
    list.sort_by_key(|a| std::cmp::Reverse(a.count));
    list
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_distribution_from_map() {
        let mut map = HashMap::new();
        map.insert("user.created".to_string(), 30);
        map.insert("order.created".to_string(), 10);

        let dist = distribution_from_map(&map);
        assert_eq!(dist.len(), 2);
        // 已按 count 降序
        assert_eq!(dist[0].event_type, "user.created");
        assert_eq!(dist[0].count, 30);
        assert!((dist[0].percentage - 75.0).abs() < 0.01);
        assert!((dist[1].percentage - 25.0).abs() < 0.01);
    }

    #[test]
    fn test_distribution_empty() {
        let map: HashMap<String, usize> = HashMap::new();
        let dist = distribution_from_map(&map);
        assert!(dist.is_empty());
    }

    #[test]
    fn test_summary_serialization() {
        let summary = EventGovernanceSummary {
            total_event_types: 5,
            total_published_today: 100,
            total_consumed_today: 95,
            total_failed_today: 5,
            average_processing_time_ms: 12.5,
            generated_at: Utc::now(),
        };
        let json = serde_json::to_string(&summary).expect("序列化失败");
        let back: EventGovernanceSummary = serde_json::from_str(&json).expect("反序列化失败");
        assert_eq!(back.total_event_types, 5);
        assert_eq!(back.total_published_today, 100);
    }
}
