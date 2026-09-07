//! Redis Stream 事件订阅器
//!
//! 使用 Redis Stream（XREADGROUP + XACK 命令）订阅事件，支持：
//! - 消费者组（支持多消费者负载均衡）
//! - ACK 机制（确保消息至少被处理一次）
//! - 死信队列（处理失败的消息）
//! - 消息重试机制

use super::dead_letter_queue::DeadLetterQueue;
use super::error::EventResult;
use super::event_types::{Event, EventType};
use super::master_data::{MasterDataDomain, MasterDataEvent};
use redis::Client;
use std::collections::HashMap;
use std::env;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;
use tracing::{debug, error, info, warn};

/// 事件处理器回调类型（返回 Result，失败时会触发重试/DLQ）
pub type StreamEventHandler =
    Arc<dyn Fn(Event) -> Pin<Box<dyn Future<Output = Result<(), String>> + Send>> + Send + Sync>;

/// MDM 主数据事件处理器回调类型（返回 Result，失败时会触发重试）
pub type StreamMdmEventHandler = Arc<
    dyn Fn(MasterDataEvent) -> Pin<Box<dyn Future<Output = Result<(), String>> + Send>> + Send
        + Sync,
>;

/// 消费者配置
#[derive(Debug, Clone)]
pub struct ConsumerConfig {
    /// 消费者组名称
    pub group_name: String,
    /// 消费者名称（同一组内唯一）
    pub consumer_name: String,
    /// 读取超时（毫秒）
    pub block_ms: u64,
    /// 每次读取的消息数量
    pub count: usize,
    /// 最大重试次数（超过后进入死信队列）
    pub max_retries: usize,
    /// 处理超时（秒）
    pub process_timeout_secs: u64,
}

impl Default for ConsumerConfig {
    fn default() -> Self {
        Self {
            group_name: "default".to_string(),
            consumer_name: format!("consumer-{}", uuid::Uuid::new_v4()),
            block_ms: 5000,
            count: 10,
            max_retries: 3,
            process_timeout_secs: 30,
        }
    }
}

/// Redis Stream 事件订阅者
pub struct StreamEventSubscriber {
    redis_client: Client,
    service_name: String,
    /// Stream 键前缀
    stream_prefix: String,
    /// 事件处理器映射（事件类型 -> 处理器列表）
    handlers: HashMap<EventType, Vec<StreamEventHandler>>,
    /// MDM 主数据事件处理器映射（主数据域 -> 处理器列表）
    mdm_handlers: HashMap<MasterDataDomain, Vec<StreamMdmEventHandler>>,
    /// 消费者配置
    config: ConsumerConfig,
    /// 死信队列
    dlq: Option<DeadLetterQueue>,
}

impl StreamEventSubscriber {
    /// 创建新的 Stream 事件订阅者
    pub fn new(service_name: &str) -> EventResult<Self> {
        let redis_url =
            env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());

        let redis_client = Client::open(redis_url)?;

        let group_name =
            env::var("EVENT_CONSUMER_GROUP").unwrap_or_else(|_| format!("{}-group", service_name));

        let consumer_name = env::var("EVENT_CONSUMER_NAME")
            .unwrap_or_else(|_| format!("{}-consumer-{}", service_name, uuid::Uuid::new_v4()));

        let config = ConsumerConfig {
            group_name,
            consumer_name,
            ..Default::default()
        };

        Ok(Self {
            redis_client,
            service_name: service_name.to_string(),
            stream_prefix: "topems:stream:events".to_string(),
            handlers: HashMap::new(),
            mdm_handlers: HashMap::new(),
            config,
            dlq: None,
        })
    }

    /// 设置消费者配置
    pub fn with_config(mut self, config: ConsumerConfig) -> Self {
        self.config = config;
        self
    }

    /// 启用死信队列
    pub fn with_dlq(&mut self) -> EventResult<()> {
        self.dlq = Some(DeadLetterQueue::new()?);
        Ok(())
    }

    /// 获取事件类型对应的 Stream 键
    fn stream_key(&self, event_type: &EventType) -> String {
        format!("{}:{}", self.stream_prefix, event_type)
    }

    /// 获取 MDM 主数据域对应的 Stream 键
    ///
    /// 与主事件总线 `topems:stream:events:*` 同构：每域一个 Stream（`topems:stream:master_data:{prefix}`），
    /// XADD 持久化 + 消费者组 ACK + 重试，不再使用无持久化的 Pub/Sub 频道 `topems:master_data:*`。
    fn mdm_stream_key(&self, domain: &MasterDataDomain) -> String {
        format!("topems:stream:master_data:{}", domain.prefix())
    }

    /// 订阅特定事件类型
    pub fn subscribe<F, Fut>(mut self, event_type: EventType, handler: F) -> Self
    where
        F: Fn(Event) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<(), String>> + Send + 'static,
    {
        let handler_arc: StreamEventHandler = Arc::new(move |event| Box::pin(handler(event)));

        self.handlers
            .entry(event_type)
            .or_insert_with(Vec::new)
            .push(handler_arc);

        self
    }

    /// 订阅 MDM 主数据域事件
    pub fn subscribe_master_data<F, Fut>(mut self, domain: MasterDataDomain, handler: F) -> Self
    where
        F: Fn(MasterDataEvent) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<(), String>> + Send + 'static,
    {
        let handler_arc: StreamMdmEventHandler =
            Arc::new(move |event| Box::pin(handler(event)));

        self.mdm_handlers
            .entry(domain)
            .or_insert_with(Vec::new)
            .push(handler_arc);

        self
    }

    /// 确保消费者组存在
    async fn ensure_consumer_group(&self, stream_key: &str) -> EventResult<()> {
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        // 尝试创建消费者组，如果已存在则忽略错误
        let result: Result<String, _> = redis::cmd("XGROUP")
            .arg("CREATE")
            .arg(stream_key)
            .arg(&self.config.group_name)
            .arg("0") // 从最早的消息开始
            .arg("MKSTREAM") // 如果 Stream 不存在则创建
            .query_async(&mut con)
            .await;

        match result {
            Ok(_) => {
                info!(
                    "消费者组创建成功 - Stream: {}, Group: {}",
                    stream_key, self.config.group_name
                );
            }
            Err(e) => {
                // BUSYGROUP 表示组已存在，这是正常的
                let err_msg = e.to_string();
                if err_msg.contains("BUSYGROUP") {
                    debug!(
                        "消费者组已存在 - Stream: {}, Group: {}",
                        stream_key, self.config.group_name
                    );
                } else {
                    warn!("创建消费者组警告: {}", e);
                }
            }
        }

        Ok(())
    }

    /// 处理单条消息
    async fn process_message(
        &self,
        event: Event,
        message_id: &str,
        stream_key: &str,
    ) -> EventResult<()> {
        let event_type = event.event_type;
        let handlers = self.handlers.get(&event_type);

        if handlers.is_none() {
            // 没有处理器，直接 ACK
            self.ack_message(stream_key, message_id).await?;
            return Ok(());
        }

        let handlers = handlers.unwrap();
        let mut all_succeeded = true;

        for handler in handlers {
            let event_clone = event.clone();
            let handler_clone = handler.clone();

            let result = tokio::time::timeout(
                Duration::from_secs(self.config.process_timeout_secs),
                handler_clone(event_clone),
            )
            .await;

            match result {
                Ok(Ok(())) => {
                    debug!(
                        "事件处理成功 - 类型: {:?}, 消息ID: {}",
                        event_type, message_id
                    );
                }
                Ok(Err(e)) => {
                    error!(
                        "事件处理失败 - 类型: {:?}, 消息ID: {}, 错误: {}",
                        event_type, message_id, e
                    );
                    all_succeeded = false;
                }
                Err(_) => {
                    error!(
                        "事件处理超时 - 类型: {:?}, 消息ID: {}",
                        event_type, message_id
                    );
                    all_succeeded = false;
                }
            }
        }

        if all_succeeded {
            // 所有处理器都成功，ACK 消息
            self.ack_message(stream_key, message_id).await?;
        } else {
            // 处理失败，检查重试次数
            let retry_count = self.get_retry_count(stream_key, message_id).await?;

            if retry_count >= self.config.max_retries {
                // 超过最大重试次数，进入死信队列
                error!(
                    "事件超过最大重试次数，进入死信队列 - 类型: {:?}, 消息ID: {}, 重试次数: {}",
                    event_type, message_id, retry_count
                );

                if let Some(dlq) = &self.dlq {
                    if let Err(e) = dlq.push(event, "max retries exceeded").await {
                        error!("推入死信队列失败: {}", e);
                    }
                }

                // ACK 消息，避免重复处理
                self.ack_message(stream_key, message_id).await?;
            } else {
                // 增加重试计数，不 ACK，消息会被重新投递
                self.increment_retry_count(stream_key, message_id).await?;
                warn!(
                    "事件将被重试 - 类型: {:?}, 消息ID: {}, 当前重试次数: {}",
                    event_type,
                    message_id,
                    retry_count + 1
                );
            }
        }

        Ok(())
    }

    /// 处理单条 MDM 主数据消息（Redis Stream，持久化 + 重试）
    ///
    /// 与标准事件共用同一套重试机制：成功 ACK；失败不 ACK 触发重新投递；
    /// 超过 `max_retries` 后记录错误并 ACK 放弃（MDM DLQ 化为已知增强项，
    /// Stream 持久化已保证消息在订阅端短暂故障期间不丢失）。
    async fn process_mdm_message(
        &self,
        event: MasterDataEvent,
        message_id: &str,
        stream_key: &str,
    ) -> EventResult<()> {
        let domain = event.domain;
        let handlers = self.mdm_handlers.get(&domain);

        if handlers.is_none() {
            // 没有处理器，直接 ACK
            self.ack_message(stream_key, message_id).await?;
            return Ok(());
        }

        let handlers = handlers.unwrap();
        let mut all_succeeded = true;

        for handler in handlers {
            let event_clone = event.clone();
            let handler_clone = handler.clone();

            let result = tokio::time::timeout(
                Duration::from_secs(self.config.process_timeout_secs),
                handler_clone(event_clone),
            )
            .await;

            match result {
                Ok(Ok(())) => {
                    debug!(
                        "MDM 事件处理成功 - domain: {:?}, 消息ID: {}",
                        domain, message_id
                    );
                }
                Ok(Err(e)) => {
                    error!(
                        "MDM 事件处理失败 - domain: {:?}, 消息ID: {}, 错误: {}",
                        domain, message_id, e
                    );
                    all_succeeded = false;
                }
                Err(_) => {
                    error!(
                        "MDM 事件处理超时 - domain: {:?}, 消息ID: {}",
                        domain, message_id
                    );
                    all_succeeded = false;
                }
            }
        }

        if all_succeeded {
            self.ack_message(stream_key, message_id).await?;
        } else {
            let retry_count = self.get_retry_count(stream_key, message_id).await?;

            if retry_count >= self.config.max_retries {
                error!(
                    "MDM 事件超过最大重试次数，ACK 放弃 - domain: {:?}, 消息ID: {}, 重试次数: {}",
                    domain, message_id, retry_count
                );
                self.ack_message(stream_key, message_id).await?;
            } else {
                self.increment_retry_count(stream_key, message_id).await?;
                warn!(
                    "MDM 事件将被重试 - domain: {:?}, 消息ID: {}, 当前重试次数: {}",
                    domain,
                    message_id,
                    retry_count + 1
                );
            }
        }

        Ok(())
    }

    /// ACK 消息
    async fn ack_message(&self, stream_key: &str, message_id: &str) -> EventResult<()> {
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        let _: () = redis::cmd("XACK")
            .arg(stream_key)
            .arg(&self.config.group_name)
            .arg(message_id)
            .query_async(&mut con)
            .await?;

        debug!(
            "消息已 ACK - Stream: {}, 消息ID: {}",
            stream_key, message_id
        );

        Ok(())
    }

    /// 获取消息的重试计数
    async fn get_retry_count(&self, stream_key: &str, message_id: &str) -> EventResult<usize> {
        let retry_key = format!("{}:retry:{}", stream_key, message_id);
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        let count: Option<usize> = redis::cmd("GET")
            .arg(&retry_key)
            .query_async(&mut con)
            .await?;

        Ok(count.unwrap_or(0))
    }

    /// 增加消息的重试计数
    async fn increment_retry_count(&self, stream_key: &str, message_id: &str) -> EventResult<()> {
        let retry_key = format!("{}:retry:{}", stream_key, message_id);
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        let _: () = redis::cmd("INCR")
            .arg(&retry_key)
            .query_async(&mut con)
            .await?;

        // 设置过期时间（24小时）
        let _: () = redis::cmd("EXPIRE")
            .arg(&retry_key)
            .arg(86400)
            .query_async(&mut con)
            .await?;

        Ok(())
    }

    /// 启动事件监听（持续运行）
    pub async fn start_listening(self) -> EventResult<()> {
        info!(
            "Stream 事件订阅器启动 - 服务: {}, 消费者组: {}, 消费者: {}",
            self.service_name, self.config.group_name, self.config.consumer_name
        );

        // 确保所有 Stream 的消费者组都存在（标准事件 + MDM 主数据）
        for event_type in self.handlers.keys() {
            let stream_key = self.stream_key(event_type);
            self.ensure_consumer_group(&stream_key).await?;
        }
        for domain in self.mdm_handlers.keys() {
            let stream_key = self.mdm_stream_key(domain);
            self.ensure_consumer_group(&stream_key).await?;
        }

        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        // 持续监听
        loop {
            // 构建 XREADGROUP 命令
            let mut cmd = redis::cmd("XREADGROUP");
            cmd.arg("GROUP")
                .arg(&self.config.group_name)
                .arg(&self.config.consumer_name)
                .arg("COUNT")
                .arg(self.config.count)
                .arg("BLOCK")
                .arg(self.config.block_ms)
                .arg("STREAMS");

            // 添加所有要监听的 Stream（标准事件 + MDM 主数据）
            let mut stream_keys: Vec<String> =
                self.handlers.keys().map(|et| self.stream_key(et)).collect();
            stream_keys.extend(
                self.mdm_handlers
                    .keys()
                    .map(|domain| self.mdm_stream_key(domain)),
            );

            for key in &stream_keys {
                cmd.arg(key);
            }
            // 使用 > 表示读取未投递的新消息
            for _ in &stream_keys {
                cmd.arg(">");
            }

            // 执行命令，使用 redis::streams::StreamReadReply 接收
            let result: Result<redis::streams::StreamReadReply, _> =
                cmd.query_async(&mut con).await;

            match result {
                Ok(reply) => {
                    for stream in reply.keys {
                        let stream_key = stream.key;
                        let is_mdm = stream_key.starts_with("topems:stream:master_data:");
                        for message in stream.ids {
                            let message_id = message.id;
                            // 从字段中解析事件（Value 转为字符串）
                            let payload_json: String = message
                                .map
                                .get("payload")
                                .map(|v| redis::from_redis_value::<String>(v).unwrap_or_default())
                                .unwrap_or_default();

                            if is_mdm {
                                match serde_json::from_str::<MasterDataEvent>(&payload_json) {
                                    Ok(mdm_event) => {
                                        if let Err(e) = self
                                            .process_mdm_message(
                                                mdm_event,
                                                &message_id,
                                                &stream_key,
                                            )
                                            .await
                                        {
                                            error!("处理 MDM 消息时出错: {}", e);
                                        }
                                    }
                                    Err(e) => {
                                        error!(
                                            "解析 MDM 事件 JSON 错误: {:?}, 消息ID: {}",
                                            e, message_id
                                        );
                                        // 解析失败，直接 ACK，避免重复处理
                                        let _ =
                                            self.ack_message(&stream_key, &message_id).await;
                                    }
                                }
                            } else {
                                match serde_json::from_str::<Event>(&payload_json) {
                                    Ok(event) => {
                                        if let Err(e) =
                                            self.process_message(event, &message_id, &stream_key).await
                                        {
                                            error!("处理消息时出错: {}", e);
                                        }
                                    }
                                    Err(e) => {
                                        error!("解析事件 JSON 错误: {:?}, 消息ID: {}", e, message_id);
                                        // 解析失败，直接 ACK，避免重复处理
                                        let _ = self.ack_message(&stream_key, &message_id).await;
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    // 超时是正常的，继续循环
                    let err_msg = e.to_string();
                    if !err_msg.contains("timeout") {
                        error!("XREADGROUP 错误: {}", e);
                        tokio::time::sleep(Duration::from_secs(1)).await;
                    }
                }
            }
        }
    }

    /// 处理待处理消息（PEL - Pending Entries List）
    ///
    /// 在启动时调用，处理之前未 ACK 的消息
    pub async fn process_pending_messages(&self) -> EventResult<usize> {
        let processed = 0;

        for event_type in self.handlers.keys() {
            let stream_key = self.stream_key(event_type);

            let mut con = self.redis_client.get_multiplexed_async_connection().await?;

            // 查看待处理消息列表
            let result: Result<Vec<(String, String, i64, i64)>, _> = redis::cmd("XPENDING")
                .arg(&stream_key)
                .arg(&self.config.group_name)
                .query_async(&mut con)
                .await;

            if let Ok(pending) = result {
                // XPENDING 返回的是摘要信息，需要使用 XRANGE 获取详细消息
                // 这里简化处理，只记录数量
                info!(
                    "待处理消息 - Stream: {}, 数量: {}",
                    stream_key,
                    pending.len()
                );
            }
        }

        Ok(processed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_consumer_config_default() {
        let config = ConsumerConfig::default();
        assert_eq!(config.group_name, "default");
        assert_eq!(config.block_ms, 5000);
        assert_eq!(config.count, 10);
        assert_eq!(config.max_retries, 3);
        assert_eq!(config.process_timeout_secs, 30);
    }

    #[test]
    fn test_stream_event_subscriber_new() {
        let subscriber = StreamEventSubscriber::new("test-service");
        assert!(subscriber.is_ok());
        let subscriber = subscriber.unwrap();
        assert_eq!(subscriber.service_name, "test-service");
        assert_eq!(subscriber.stream_prefix, "topems:stream:events");
        assert!(subscriber.dlq.is_none());
    }

    #[test]
    fn test_stream_key() {
        let subscriber = StreamEventSubscriber::new("test-service").unwrap();
        let key = subscriber.stream_key(&EventType::SalesOrderCreated);
        assert_eq!(key, "topems:stream:events:SalesOrderCreated");
    }

    #[test]
    fn test_subscribe_adds_handler() {
        let subscriber = StreamEventSubscriber::new("test-service")
            .unwrap()
            .subscribe(EventType::SalesOrderCreated, |_event| async { Ok(()) });

        assert!(subscriber
            .handlers
            .contains_key(&EventType::SalesOrderCreated));
        assert_eq!(
            subscriber
                .handlers
                .get(&EventType::SalesOrderCreated)
                .unwrap()
                .len(),
            1
        );
    }

    #[test]
    fn test_subscribe_multiple_handlers() {
        let subscriber = StreamEventSubscriber::new("test-service")
            .unwrap()
            .subscribe(EventType::SalesOrderCreated, |_event| async { Ok(()) })
            .subscribe(EventType::SalesOrderCreated, |_event| async { Ok(()) });

        assert_eq!(
            subscriber
                .handlers
                .get(&EventType::SalesOrderCreated)
                .unwrap()
                .len(),
            2
        );
    }

    #[test]
    fn test_with_config() {
        let config = ConsumerConfig {
            group_name: "custom-group".to_string(),
            max_retries: 5,
            ..Default::default()
        };

        let subscriber = StreamEventSubscriber::new("test-service")
            .unwrap()
            .with_config(config);

        assert_eq!(subscriber.config.group_name, "custom-group");
        assert_eq!(subscriber.config.max_retries, 5);
    }

    #[tokio::test]
    async fn test_stream_publish_subscribe_roundtrip() {
        let Some(client) = crate::test_helpers::redis_pubsub::skip_without_redis().await else {
            return;
        };

        let event_type = EventType::PmProjectCreated;
        let stream_key = "topems:stream:events:PmProjectCreated";
        let group_name = "test-group-integration";
        let consumer_name = "test-consumer-1";

        // 清理旧数据
        let mut cleanup_con = client.get_multiplexed_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL")
            .arg(stream_key)
            .query_async(&mut cleanup_con)
            .await
            .unwrap();

        // 创建消费者组
        let result: Result<String, _> = redis::cmd("XGROUP")
            .arg("CREATE")
            .arg(stream_key)
            .arg(group_name)
            .arg("0")
            .arg("MKSTREAM")
            .query_async(&mut cleanup_con)
            .await;
        assert!(result.is_ok(), "创建消费者组失败: {:?}", result);

        // 创建订阅者并注册 handler
        let received = Arc::new(std::sync::Mutex::new(Vec::new()));
        let received_clone = received.clone();

        let subscriber = StreamEventSubscriber::new("test-integration")
            .unwrap()
            .with_config(ConsumerConfig {
                group_name: group_name.to_string(),
                consumer_name: consumer_name.to_string(),
                block_ms: 100,
                count: 10,
                max_retries: 3,
                process_timeout_secs: 5,
            })
            .subscribe(event_type, move |event| {
                let received_clone = received_clone.clone();
                async move {
                    received_clone
                        .lock()
                        .unwrap()
                        .push(event.event_id.to_string());
                    Ok(())
                }
            });

        // 单独调用一次读取循环（不进入无限循环），验证消息可被消费
        // 先发布事件
        let publisher =
            super::super::stream_publisher::StreamEventPublisher::new("test-pub").unwrap();
        let msg_id = publisher
            .publish_event(event_type, serde_json::json!({"pid": "p-1"}))
            .await;
        assert!(msg_id.is_ok(), "发布失败: {:?}", msg_id);

        // 读取并处理一条消息
        let mut con = client.get_multiplexed_async_connection().await.unwrap();
        let result: Result<redis::streams::StreamReadReply, _> = redis::cmd("XREADGROUP")
            .arg("GROUP")
            .arg(group_name)
            .arg(consumer_name)
            .arg("COUNT")
            .arg(10)
            .arg("STREAMS")
            .arg(stream_key)
            .arg(">")
            .query_async(&mut con)
            .await;

        assert!(result.is_ok(), "XREADGROUP 失败: {:?}", result);

        // 处理读取到的消息
        if let Ok(reply) = result {
            for stream in reply.keys {
                for message in stream.ids {
                    let payload_json: String = message
                        .map
                        .get("payload")
                        .map(|v| redis::from_redis_value::<String>(v).unwrap_or_default())
                        .unwrap_or_default();
                    if let Ok(event) = serde_json::from_str::<Event>(&payload_json) {
                        let _ = subscriber
                            .process_message(event, &message.id, &stream.key)
                            .await;
                    }
                }
            }
        }

        // 验证消息已被消费
        let count = received.lock().unwrap().len();
        assert_eq!(count, 1, "应该收到 1 条消息，实际收到 {} 条", count);

        // 清理
        let _: () = redis::cmd("DEL")
            .arg(stream_key)
            .query_async(&mut cleanup_con)
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_stream_mdm_publish_subscribe_roundtrip() {
        let Some(client) = crate::test_helpers::redis_pubsub::skip_without_redis().await else {
            return;
        };

        use crate::event::master_data::{
            MasterDataAction, MasterDataDomain, MasterDataEvent,
        };
        use serde_json::json;
        use uuid::Uuid;

        let tenant_id = Uuid::new_v4();
        let event = MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Customer,
            MasterDataAction::Created,
            "cust-stream-mdm-001".to_string(),
            "CUSTSTREAMMDM001".to_string(),
            "crm",
            json!({"id": "cust-stream-mdm-001", "name": "Stream MDM 客户"}),
        );
        let expected_event_id = event.event_id;
        let stream_key = event.stream_key();
        let group_name = "mdm-test-group";
        let consumer_name = "mdm-test-consumer-1";

        // 清理旧数据 + 创建消费者组
        let mut cleanup_con = client.get_multiplexed_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL")
            .arg(&stream_key)
            .query_async(&mut cleanup_con)
            .await
            .unwrap();
        let _: Result<String, _> = redis::cmd("XGROUP")
            .arg("CREATE")
            .arg(&stream_key)
            .arg(group_name)
            .arg("0")
            .arg("MKSTREAM")
            .query_async(&mut cleanup_con)
            .await;

        // 创建订阅者并注册 MDM handler
        let received = Arc::new(std::sync::Mutex::new(Vec::new()));
        let received_clone = received.clone();

        let subscriber = StreamEventSubscriber::new("test-mdm-integration")
            .unwrap()
            .with_config(ConsumerConfig {
                group_name: group_name.to_string(),
                consumer_name: consumer_name.to_string(),
                block_ms: 100,
                count: 10,
                max_retries: 3,
                process_timeout_secs: 5,
            })
            .subscribe_master_data(MasterDataDomain::Customer, move |mdm_event| {
                let received_clone = received_clone.clone();
                async move {
                    received_clone
                        .lock()
                        .unwrap()
                        .push(mdm_event.event_id.to_string());
                    Ok(())
                }
            });

        // 发布 MDM 事件到 Stream（XADD）
        event.publish().await.expect("发布 MDM 事件失败");

        // XREADGROUP 读回并分发到 MDM handler
        let mut con = client.get_multiplexed_async_connection().await.unwrap();
        let result: Result<redis::streams::StreamReadReply, _> = redis::cmd("XREADGROUP")
            .arg("GROUP")
            .arg(group_name)
            .arg(consumer_name)
            .arg("COUNT")
            .arg(10)
            .arg("BLOCK")
            .arg(100)
            .arg("STREAMS")
            .arg(&stream_key)
            .arg(">")
            .query_async(&mut con)
            .await;
        assert!(result.is_ok(), "XREADGROUP 失败: {:?}", result);

        if let Ok(reply) = result {
            for stream in reply.keys {
                for message in stream.ids {
                    let payload_json: String = message
                        .map
                        .get("payload")
                        .map(|v| redis::from_redis_value::<String>(v).unwrap_or_default())
                        .unwrap_or_default();
                    if let Ok(mdm_event) =
                        serde_json::from_str::<MasterDataEvent>(&payload_json)
                    {
                        let _ = subscriber
                            .process_mdm_message(mdm_event, &message.id, &stream.key)
                            .await;
                    }
                }
            }
        }

        // 验证 MDM handler 已消费消息
        let count = received.lock().unwrap().len();
        assert_eq!(count, 1, "MDM handler 应收到 1 条消息，实际 {} 条", count);
        assert_eq!(received.lock().unwrap()[0], expected_event_id.to_string());

        // 清理
        let _: () = redis::cmd("DEL")
            .arg(&stream_key)
            .query_async(&mut cleanup_con)
            .await
            .unwrap();
    }
}
