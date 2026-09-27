//! Redis Stream 事件发布器
//!
//! 使用 Redis Stream（XADD 命令）发布事件，支持：
//! - 消息持久化（Pub/Sub 消息不持久化）
//! - 消费者组（支持多消费者负载均衡）
//! - ACK 机制（确保消息至少被处理一次）
//! - 死信队列（处理失败的消息）

use super::error::{EventError, EventResult};
use super::event_types::{Event, EventType};
use super::schema_registry::SchemaRegistry;
use super::versioning::EventVersionRegistry;
use redis::Client;
use serde::Serialize;
use std::env;
use std::sync::Arc;
use tracing::info;

/// 发布前事件校验（Schema + 版本）
///
/// - 已注册 Schema 的事件类型 → 校验 payload，不匹配返回 `ValidationError`
/// - 已注册版本的事件类型 → 校验最新版本未废弃
/// - 都未注册 → `Ok(())`（向后兼容，不影响未治理的事件）
pub fn validate_event_for_publish(
    schema_registry: Option<&SchemaRegistry>,
    event_versions: Option<&EventVersionRegistry>,
    event_type: &EventType,
    payload: &serde_json::Value,
) -> EventResult<()> {
    let event_type_str = event_type.to_string();

    if let Some(registry) = schema_registry {
        if registry.get(&event_type_str).is_some() {
            let result = registry.validate(&event_type_str, payload);
            if !result.valid {
                return Err(EventError::ValidationError(format!(
                    "事件 {} payload 校验失败: {:?}",
                    event_type_str, result.errors
                )));
            }
        }
    }

    if let Some(versions) = event_versions {
        if let Some(latest) = versions.get_latest_version(&event_type_str) {
            if latest.deprecated {
                return Err(EventError::ValidationError(format!(
                    "事件 {} 的最新版本 {} 已废弃，拒绝发布",
                    event_type_str, latest.version
                )));
            }
        }
    }

    Ok(())
}

/// Redis Stream 事件发布者
#[derive(Clone)]
pub struct StreamEventPublisher {
    redis_client: Client,
    service_name: String,
    /// Stream 键前缀
    stream_prefix: String,
    /// 最大流长度（近似值，用于自动裁剪）
    max_stream_length: Option<u64>,
    /// 事件 Schema 注册表（可选：启用后发布前校验 payload）
    schema_registry: Option<Arc<SchemaRegistry>>,
    /// 事件版本注册表（可选：启用后发布前校验版本未废弃）
    event_versions: Option<Arc<EventVersionRegistry>>,
}

impl StreamEventPublisher {
    /// 创建新的 Stream 事件发布者
    pub fn new(service_name: &str) -> EventResult<Self> {
        let redis_url =
            env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());

        let redis_client = Client::open(redis_url)?;

        let max_stream_length = env::var("EVENT_STREAM_MAX_LENGTH")
            .ok()
            .and_then(|v| v.parse().ok());

        Ok(Self {
            redis_client,
            service_name: service_name.to_string(),
            stream_prefix: "topems:stream:events".to_string(),
            max_stream_length,
            schema_registry: None,
            event_versions: None,
        })
    }

    /// 启用事件 Schema 校验（发布前校验 payload，需先在注册表注册事件 Schema）
    pub fn with_schema_registry(mut self, registry: Arc<SchemaRegistry>) -> Self {
        self.schema_registry = Some(registry);
        self
    }

    /// 启用事件版本治理（发布前校验最新版本未废弃）
    pub fn with_event_versions(mut self, registry: Arc<EventVersionRegistry>) -> Self {
        self.event_versions = Some(registry);
        self
    }

    /// 获取事件类型对应的 Stream 键
    fn stream_key(&self, event_type: &EventType) -> String {
        format!("{}:{}", self.stream_prefix, event_type)
    }

    /// 发布事件到 Redis Stream
    ///
    /// 使用 XADD 命令将事件添加到 Stream，返回消息 ID
    pub async fn publish_event(
        &self,
        event_type: EventType,
        payload: impl Serialize,
    ) -> EventResult<String> {
        let payload_json = serde_json::to_value(&payload)?;
        // 发布前校验（Schema + 版本），失败拒绝发布
        validate_event_for_publish(
            self.schema_registry.as_deref(),
            self.event_versions.as_deref(),
            &event_type,
            &payload_json,
        )?;
        let trace_id: Option<String> = None;
        let event =
            Event::new(event_type, &self.service_name, payload_json).with_trace_id(trace_id);

        let stream_key = self.stream_key(&event_type);
        let event_json = serde_json::to_string(&event)?;

        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        // 构建 XADD 命令
        let mut cmd = redis::cmd("XADD");
        cmd.arg(&stream_key);

        // 如果设置了最大流长度，使用 MAXLEN ~ 进行近似裁剪
        if let Some(max_len) = self.max_stream_length {
            cmd.arg("MAXLEN").arg("~").arg(max_len);
        }

        // 使用自动生成的 ID（*）
        cmd.arg("*");

        // 添加字段：event_id, event_type, payload, occurred_at, source
        cmd.arg("event_id").arg(event.event_id.to_string());
        cmd.arg("event_type").arg(format!("{:?}", event.event_type));
        cmd.arg("payload").arg(&event_json);
        cmd.arg("occurred_at").arg(event.occurred_at.to_rfc3339());
        cmd.arg("source").arg(&event.source);

        // 执行命令，返回消息 ID
        let message_id: String = cmd.query_async(&mut con).await?;

        info!(
            "Stream 事件发布成功 - 类型: {:?}, 事件ID: {}, Stream: {}, 消息ID: {}",
            event_type, event.event_id, stream_key, message_id
        );

        Ok(message_id)
    }

    /// 发布事件到统一的 Stream（所有事件类型共用一个 Stream）
    ///
    /// 这种方式适合需要按顺序处理所有事件的场景
    pub async fn publish_event_unified(
        &self,
        event_type: EventType,
        payload: impl Serialize,
    ) -> EventResult<String> {
        let payload_json = serde_json::to_value(&payload)?;
        // 发布前校验（Schema + 版本），失败拒绝发布
        validate_event_for_publish(
            self.schema_registry.as_deref(),
            self.event_versions.as_deref(),
            &event_type,
            &payload_json,
        )?;
        let trace_id: Option<String> = None;
        let event =
            Event::new(event_type, &self.service_name, payload_json).with_trace_id(trace_id);

        let stream_key = format!("{}:all", self.stream_prefix);
        let event_json = serde_json::to_string(&event)?;

        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        let mut cmd = redis::cmd("XADD");
        cmd.arg(&stream_key);

        if let Some(max_len) = self.max_stream_length {
            cmd.arg("MAXLEN").arg("~").arg(max_len);
        }

        cmd.arg("*");
        cmd.arg("event_id").arg(event.event_id.to_string());
        cmd.arg("event_type").arg(format!("{:?}", event.event_type));
        cmd.arg("payload").arg(&event_json);
        cmd.arg("occurred_at").arg(event.occurred_at.to_rfc3339());
        cmd.arg("source").arg(&event.source);

        let message_id: String = cmd.query_async(&mut con).await?;

        info!(
            "统一 Stream 事件发布成功 - 类型: {:?}, 事件ID: {}, 消息ID: {}",
            event_type, event.event_id, message_id
        );

        Ok(message_id)
    }

    /// 获取 Stream 的当前长度
    pub async fn stream_length(&self, event_type: &EventType) -> EventResult<u64> {
        let stream_key = self.stream_key(event_type);
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        let length: u64 = redis::cmd("XLEN")
            .arg(&stream_key)
            .query_async(&mut con)
            .await?;

        Ok(length)
    }

    /// 删除 Stream
    pub async fn delete_stream(&self, event_type: &EventType) -> EventResult<()> {
        let stream_key = self.stream_key(event_type);
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        let _: () = redis::cmd("DEL")
            .arg(&stream_key)
            .query_async(&mut con)
            .await?;

        info!(
            "Stream 已删除 - 类型: {:?}, Stream: {}",
            event_type, stream_key
        );

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_stream_event_publisher_new() {
        let publisher = StreamEventPublisher::new("test-service");
        assert!(publisher.is_ok());
        let publisher = publisher.unwrap();
        assert_eq!(publisher.service_name, "test-service");
        assert_eq!(publisher.stream_prefix, "topems:stream:events");
    }

    #[test]
    fn test_stream_key() {
        let publisher = StreamEventPublisher::new("test-service").unwrap();
        let key = publisher.stream_key(&EventType::SalesOrderCreated);
        assert_eq!(key, "topems:stream:events:SalesOrderCreated");
    }

    #[test]
    fn test_stream_key_unified() {
        let publisher = StreamEventPublisher::new("test-service").unwrap();
        let key = format!("{}:all", publisher.stream_prefix);
        assert_eq!(key, "topems:stream:events:all");
    }

    #[test]
    fn test_max_stream_length_from_env() {
        // 测试默认情况下 max_stream_length 为 None
        let publisher = StreamEventPublisher::new("test-service").unwrap();
        assert!(publisher.max_stream_length.is_none());
    }

    #[test]
    fn test_event_serialization() {
        let event = Event::new(
            EventType::SalesOrderCreated,
            "test-service",
            json!({"order_id": "123"}),
        );
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("SalesOrderCreated"));
        assert!(json.contains("test-service"));
        assert!(json.contains("123"));
    }

    // --- 事件类型版本化管理接入 Stream：Schema + 版本校验（纯函数，无需 Redis） ---

    fn sales_order_schema() -> serde_json::Value {
        json!({
            "type": "object",
            "required": ["order_id"],
            "properties": {
                "order_id": {"type": "string"},
                "amount": {"type": "number"}
            },
            "additionalProperties": true
        })
    }

    #[test]
    fn test_validate_no_registry_ok() {
        // 未启用 Schema/版本治理 → 校验通过（向后兼容）
        let result = validate_event_for_publish(
            None,
            None,
            &EventType::SalesOrderCreated,
            &json!({"order_id": "SO-001"}),
        );
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_unregistered_event_type_ok() {
        // 注册表存在但事件类型未注册 → 跳过校验
        let registry = SchemaRegistry::new();
        let result = validate_event_for_publish(
            Some(&registry),
            None,
            &EventType::SalesOrderCreated,
            &json!({"whatever": true}),
        );
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_matching_payload_ok() {
        let registry = SchemaRegistry::new();
        registry
            .register(
                "SalesOrderCreated",
                sales_order_schema(),
                "销售订单创建事件",
            )
            .unwrap();
        let result = validate_event_for_publish(
            Some(&registry),
            None,
            &EventType::SalesOrderCreated,
            &json!({"order_id": "SO-001", "amount": 100}),
        );
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_mismatched_payload_rejected() {
        let registry = SchemaRegistry::new();
        registry
            .register(
                "SalesOrderCreated",
                sales_order_schema(),
                "销售订单创建事件",
            )
            .unwrap();
        // 缺少必填字段 order_id
        let result = validate_event_for_publish(
            Some(&registry),
            None,
            &EventType::SalesOrderCreated,
            &json!({"amount": 100}),
        );
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            EventError::ValidationError(_)
        ));
    }

    #[test]
    fn test_validate_deprecated_version_rejected() {
        use crate::event::versioning::{EventVersion, EventVersionEntry, EventVersionRegistry};
        let versions = EventVersionRegistry::new();
        versions
            .register(EventVersionEntry::new(
                "SalesOrderCreated",
                EventVersion::v1(),
                sales_order_schema(),
                "v1",
            ))
            .unwrap();
        versions
            .deprecate("SalesOrderCreated", EventVersion::v1(), "升级至 v2", None)
            .unwrap();
        // 最新版本（v1 唯一版本）已废弃 → 拒绝发布
        let result = validate_event_for_publish(
            None,
            Some(&versions),
            &EventType::SalesOrderCreated,
            &json!({"order_id": "SO-001"}),
        );
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            EventError::ValidationError(_)
        ));
    }

    #[test]
    fn test_validate_active_version_ok() {
        use crate::event::versioning::{EventVersion, EventVersionEntry, EventVersionRegistry};
        let versions = EventVersionRegistry::new();
        versions
            .register(EventVersionEntry::new(
                "SalesOrderCreated",
                EventVersion::v2(),
                sales_order_schema(),
                "v2",
            ))
            .unwrap();
        let result = validate_event_for_publish(
            None,
            Some(&versions),
            &EventType::SalesOrderCreated,
            &json!({"order_id": "SO-001"}),
        );
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_stream_publish_and_length() {
        let Some((_client, _guard)) = crate::test_helpers::redis_pubsub::skip_without_redis().await else {
            return;
        };

        let publisher = StreamEventPublisher::new("test-stream-service").unwrap();
        let event_type = EventType::SalesOrderCreated;

        // 发布事件
        let message_id = publisher
            .publish_event(event_type, json!({"order_id": "stream-test-1"}))
            .await;
        assert!(message_id.is_ok(), "发布到 Stream 失败: {:?}", message_id);

        // 检查 Stream 长度
        let length = publisher.stream_length(&event_type).await;
        assert!(length.is_ok());
        assert!(length.unwrap() >= 1, "Stream 长度应 >= 1");

        // 清理
        let _ = publisher.delete_stream(&event_type).await;
    }

    #[tokio::test]
    async fn test_stream_unified_publish() {
        let Some((_client, _guard)) = crate::test_helpers::redis_pubsub::skip_without_redis().await else {
            return;
        };

        let publisher = StreamEventPublisher::new("test-stream-service").unwrap();

        // 发布到统一 Stream
        let result = publisher
            .publish_event_unified(EventType::PmProjectCreated, json!({"project_id": "p1"}))
            .await;
        assert!(result.is_ok(), "发布到统一 Stream 失败: {:?}", result);

        // 清理统一 Stream
        let mut con = publisher
            .redis_client
            .get_multiplexed_async_connection()
            .await
            .unwrap();
        let _: () = redis::cmd("DEL")
            .arg("topems:stream:events:all")
            .query_async(&mut con)
            .await
            .unwrap();
    }
}
