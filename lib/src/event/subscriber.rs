use super::dead_letter_queue::DeadLetterQueue;
use super::error::EventResult;
use super::event_types::{Event, EventType};
use futures_util::StreamExt;
use redis::Client;
use std::env;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use tracing::{debug, error, info, warn, Instrument};

/// 事件处理器回调类型
pub type EventHandler =
    Arc<dyn Fn(Event) -> Pin<Box<dyn Future<Output = ()> + Send>> + Send + Sync>;

/// 事件订阅者
pub struct EventSubscriber {
    redis_client: Client,
    _service_name: String,
    handlers: Vec<(Vec<EventType>, EventHandler)>,
}

impl EventSubscriber {
    /// 创建新的事件订阅者
    pub fn new(service_name: &str) -> EventResult<Self> {
        let redis_url =
            env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());

        let redis_client = Client::open(redis_url)?;

        Ok(Self {
            redis_client,
            _service_name: service_name.to_string(),
            handlers: Vec::new(),
        })
    }

    /// 订阅特定事件类型
    pub fn subscribe<F, Fut>(mut self, event_types: Vec<EventType>, handler: F) -> Self
    where
        F: Fn(Event) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = ()> + Send + 'static,
    {
        let handler_arc: EventHandler = Arc::new(move |event| Box::pin(handler(event)));

        self.handlers.push((event_types, handler_arc));
        self
    }

    /// 订阅特定事件类型（返回 Result 的 handler 版本）
    pub fn subscribe_handler<F>(mut self, event_types: Vec<EventType>, handler: F) -> Self
    where
        F: Fn(
                Event,
            )
                -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), String>> + Send>>
            + Send
            + Sync
            + Clone
            + 'static,
    {
        let handler_arc: EventHandler = Arc::new(move |event| {
            let handler = handler.clone();
            Box::pin(async move {
                match handler(event).await {
                    Ok(_) => {}
                    Err(e) => {
                        error!("事件处理器执行失败: {}", e);
                    }
                }
            })
        });

        self.handlers.push((event_types, handler_arc));
        self
    }

    /// 启动事件监听（持续运行）
    pub async fn start_listening(self) -> EventResult<()> {
        let con = self.redis_client.get_async_connection().await?;
        let mut pubsub = con.into_pubsub();

        // 订阅所有感兴趣的频道
        let mut all_event_types = Vec::new();
        for (event_types, _) in &self.handlers {
            all_event_types.extend(event_types.iter().cloned());
        }

        // 去重
        all_event_types.sort();
        all_event_types.dedup();

        for event_type in &all_event_types {
            let channel_name = format!("topems:events:{}", event_type);
            pubsub.subscribe(&channel_name).await?;
            info!("订阅事件频道: {}", channel_name);
        }

        let handlers = Arc::new(self.handlers);
        let dlq = DeadLetterQueue::new()?;
        let mut stream = pubsub.on_message();

        // 持续监听
        while let Some(msg) = stream.next().await {
            let payload: String = match msg.get_payload() {
                Ok(p) => p,
                Err(e) => {
                    error!("解析消息payload错误: {:?}", e);
                    continue;
                }
            };

            let event: Event = match serde_json::from_str(&payload) {
                Ok(e) => e,
                Err(e) => {
                    error!("解析事件JSON错误: {:?}", e);
                    continue;
                }
            };

            debug!("收到事件: {:?} from {}", event.event_type, event.source);

            // 分发到相应的处理器
            for (event_types, handler) in handlers.as_ref() {
                if event_types.contains(&event.event_type) {
                    let event_clone = event.clone();
                    let handler_clone = handler.clone();
                    let dlq_clone = dlq.clone();

                    // V26.0: 如果事件携带 trace_id，创建关联 span 实现分布式追踪
                    let span = if let Some(ref trace_id) = event.trace_id {
                        tracing::info_span!(
                            "event_handler",
                            trace_id = %trace_id,
                            event_type = ?event.event_type,
                            event_id = %event.event_id,
                            source = %event.source,
                        )
                    } else {
                        tracing::info_span!(
                            "event_handler",
                            event_type = ?event.event_type,
                            event_id = %event.event_id,
                            source = %event.source,
                        )
                    };

                    tokio::spawn(async move {
                        match tokio::time::timeout(
                            tokio::time::Duration::from_secs(30),
                            handler_clone(event_clone.clone()),
                        )
                        .await
                        {
                            Ok(_) => {}
                            Err(e) => {
                                warn!("事件处理超时: {:?}, 事件ID: {}", e, event_clone.event_id);
                                let _ = dlq_clone.push(event_clone, "处理超时").await;
                            }
                        }
                    }.instrument(span));
                }
            }
        }

        Ok(())
    }

    /// 便捷方法：订阅 HRM 员工相关事件
    pub fn subscribe_hrm_employee_events<F, Fut>(self, handler: F) -> Self
    where
        F: Fn(Event) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = ()> + Send + 'static,
    {
        self.subscribe(
            vec![
                EventType::HrmEmployeeCreated,
                EventType::HrmEmployeeUpdated,
                EventType::HrmEmployeeDeleted,
            ],
            handler,
        )
    }
}
