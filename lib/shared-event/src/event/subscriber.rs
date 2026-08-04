use super::dead_letter_queue::DeadLetterQueue;
use super::error::EventResult;
use super::event_types::{Event, EventType};
use super::master_data::{MasterDataDomain, MasterDataEvent};
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

/// MDM 事件处理器回调类型
pub type MasterDataEventHandler =
    Arc<dyn Fn(MasterDataEvent) -> Pin<Box<dyn Future<Output = ()> + Send>> + Send + Sync>;

/// 事件订阅者
pub struct EventSubscriber {
    redis_client: Client,
    _service_name: String,
    handlers: Vec<(Vec<EventType>, EventHandler)>,
    mdm_handlers: Vec<(Vec<MasterDataDomain>, MasterDataEventHandler)>,
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
            mdm_handlers: Vec::new(),
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

        // 订阅所有感兴趣的标准事件频道
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

        // 订阅所有感兴趣的 MDM 事件频道
        let mut all_mdm_domains = Vec::new();
        for (domains, _) in &self.mdm_handlers {
            all_mdm_domains.extend(domains.iter().cloned());
        }

        // 去重
        all_mdm_domains.sort_by(|a, b| a.prefix().cmp(b.prefix()));
        all_mdm_domains.dedup_by(|a, b| a.prefix() == b.prefix());

        for domain in &all_mdm_domains {
            let channel_name = format!("topems:master_data:{}", domain.prefix());
            pubsub.subscribe(&channel_name).await?;
            info!("订阅 MDM 频道: {}", channel_name);
        }

        let handlers = Arc::new(self.handlers);
        let mdm_handlers = Arc::new(self.mdm_handlers);
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

            let channel_name = msg.get_channel_name();

            // 根据频道名称判断是标准事件还是 MDM 事件
            if channel_name.starts_with("topems:master_data:") {
                // 处理 MDM 主数据事件
                let mdm_event: MasterDataEvent = match serde_json::from_str(&payload) {
                    Ok(e) => e,
                    Err(e) => {
                        error!("解析 MDM 事件 JSON 错误: {:?}", e);
                        continue;
                    }
                };

                debug!(
                    "收到 MDM 事件: {:?} {:?} from {}",
                    mdm_event.domain, mdm_event.action, mdm_event.source_service
                );

                // 分发到相应的 MDM 处理器
                for (domains, handler) in mdm_handlers.as_ref() {
                    if domains.contains(&mdm_event.domain) {
                        let event_clone = mdm_event.clone();
                        let handler_clone = handler.clone();
                        let master_data_id = event_clone.master_data_id.clone();

                        let span = tracing::info_span!(
                            "mdm_event_handler",
                            domain = ?mdm_event.domain,
                            action = ?mdm_event.action,
                            master_data_id = %mdm_event.master_data_id,
                            tenant_id = %mdm_event.tenant_id,
                        );

                        tokio::spawn(
                            async move {
                                match tokio::time::timeout(
                                    tokio::time::Duration::from_secs(30),
                                    handler_clone(event_clone),
                                )
                                .await
                                {
                                    Ok(_) => {}
                                    Err(e) => {
                                        warn!(
                                            "MDM 事件处理超时: {:?}, master_data_id: {}",
                                            e, master_data_id
                                        );
                                    }
                                }
                            }
                            .instrument(span),
                        );
                    }
                }
            } else {
                // 处理标准事件
                let event: Event = match serde_json::from_str(&payload) {
                    Ok(e) => e,
                    Err(e) => {
                        error!("解析事件 JSON 错误: {:?}", e);
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

                        tokio::spawn(
                            async move {
                                match tokio::time::timeout(
                                    tokio::time::Duration::from_secs(30),
                                    handler_clone(event_clone.clone()),
                                )
                                .await
                                {
                                    Ok(_) => {}
                                    Err(e) => {
                                        warn!(
                                            "事件处理超时: {:?}, 事件ID: {}",
                                            e, event_clone.event_id
                                        );
                                        let _ = dlq_clone.push(event_clone, "处理超时").await;
                                    }
                                }
                            }
                            .instrument(span),
                        );
                    }
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

    /// 订阅 MDM 主数据事件
    pub fn subscribe_master_data<F, Fut>(
        mut self,
        domains: Vec<MasterDataDomain>,
        handler: F,
    ) -> Self
    where
        F: Fn(MasterDataEvent) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = ()> + Send + 'static,
    {
        let handler_arc: MasterDataEventHandler = Arc::new(move |event| Box::pin(handler(event)));
        self.mdm_handlers.push((domains, handler_arc));
        self
    }

    /// 便捷方法：订阅 MDM 员工事件
    pub fn subscribe_master_data_employee<F, Fut>(self, handler: F) -> Self
    where
        F: Fn(MasterDataEvent) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = ()> + Send + 'static,
    {
        self.subscribe_master_data(vec![MasterDataDomain::Employee], handler)
    }

    /// 便捷方法：订阅 MDM 组织事件
    pub fn subscribe_master_data_organization<F, Fut>(self, handler: F) -> Self
    where
        F: Fn(MasterDataEvent) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = ()> + Send + 'static,
    {
        self.subscribe_master_data(vec![MasterDataDomain::Organization], handler)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event::event_types::{Event, EventType, PmProjectCreatedPayload};
    use crate::event::master_data::{MasterDataAction, MasterDataDomain, MasterDataEvent};
    use crate::event::publisher::EventPublisher;
    use crate::test_helpers::redis_pubsub::{self, ActiveSubscription};
    use serde_json::json;
    use std::sync::Arc;
    use tokio::sync::{oneshot, Mutex};
    use uuid::Uuid;

    // =====================================================================
    // EventSubscriber 集成测试规范：
    // - 所有涉及 Redis Pub/Sub 的场景都必须使用 test_helpers::redis_pubsub
    //   的两阶段 API，禁止"spawn(start_listening) 后立刻发布事件"。
    // - 对于 start_listening（无限循环），使用 oneshot 从 handler 内部传值，
    //   并结合 JoinHandle::abort 在测试结束后回收后台任务。
    // =====================================================================

    // ———————————————————————————————————————————————————————————————
    // 1. 烟雾测试：不依赖 Redis 环境
    // ———————————————————————————————————————————————————————————————

    #[test]
    fn test_subscriber_new_is_lazy() {
        // EventSubscriber::new 仅做 Client::open，不建立连接。
        // 即使本地没有 Redis，也必须返回成功（惰性初始化）。
        let sub = EventSubscriber::new("lazy-subscriber-test");
        assert!(sub.is_ok(), "Subscriber::new 惰性初始化应始终成功");
    }

    #[test]
    fn test_subscriber_builder_chain_returns_self() {
        // 验证链式 API 消费 self 并返回 Self，类型不崩
        let noop = |_event: Event| Box::pin(async {});
        let noop_mdm = |_e: MasterDataEvent| Box::pin(async {});

        let sub = EventSubscriber::new("builder-test")
            .unwrap()
            .subscribe(vec![EventType::PmProjectCreated, EventType::PmTaskCreated], noop)
            .subscribe_hrm_employee_events(|_e| Box::pin(async {}))
            .subscribe_master_data(
                vec![MasterDataDomain::Customer, MasterDataDomain::Supplier],
                noop_mdm,
            )
            .subscribe_master_data_employee(|_e| Box::pin(async {}))
            .subscribe_master_data_organization(|_e| Box::pin(async {}));

        // 能正常编译 + 构造出来即视为通过（builder 模式无运行时）
        let _ = sub;
    }

    // ———————————————————————————————————————————————————————————————
    // 2. 两阶段集成测试：Subscriber 端到端接收 EventPublisher 事件
    // ———————————————————————————————————————————————————————————————

    /// 验证 EventSubscriber.start_listening 能够正确接收 EventPublisher 发布的
    /// PmProjectCreated 事件，并通过标准事件 handler 回调正确处理。
    ///
    /// 注意：这里使用 **三重同步保证**，防止竞态：
    ///   1) 先通过 PUBSUB NUMSUB 确认 Subscriber 端的订阅已登记；
    ///   2) 再通过 EventPublisher 发布事件；
    ///   3) Subscriber handler 内部通过 oneshot 把收到的事件回传给测试断言。
    #[tokio::test]
    async fn test_event_subscriber_receives_publisher_events() {
        let Some(redis_client) = redis_pubsub::skip_without_redis().await else { return };

        // —— 准备：生成唯一的事件标识，防止并发测试串扰 ——
        let test_project_id = Uuid::new_v4();
        let test_owner_id = Uuid::new_v4();
        let project_name = "SubscriberEndToEnd-项目".to_string();
        let channel = format!("topems:events:{}", EventType::PmProjectCreated);

        // —— 步骤一：先确认 channel 当前没有订阅者（防止其他测试的残留）——
        // （非必须，仅用于调试时判断环境是否干净）

        // —— 步骤二：使用通用两阶段 API 确认订阅完全就绪 ——
        // 这里的 subscription 只是为了"确保 Redis 服务端接受了订阅请求后再发布"，
        // 它不影响 EventSubscriber 本身的 handler 触发（两边都会收到消息）。
        let _guard_subscription: ActiveSubscription<Event> =
            redis_pubsub::prepare_subscription(&redis_client, &channel, move |e: &Event| {
                e.event_type == EventType::PmProjectCreated
                    && e.parse_payload::<PmProjectCreatedPayload>()
                        .map(|p| p.project_id == test_project_id)
                        .unwrap_or(false)
            })
            .await;

        // —— 步骤三：启动 EventSubscriber，并用 oneshot 从 handler 回传结果 ——
        let (tx, rx) = oneshot::channel::<Event>();
        let tx = Arc::new(Mutex::new(Some(tx)));
        let subscriber = EventSubscriber::new("subscriber-e2e-test")
            .unwrap()
            .subscribe(vec![EventType::PmProjectCreated], move |event: Event| {
                let tx = Arc::clone(&tx);
                Box::pin(async move {
                    // 严格按 project_id 过滤，只把匹配的事件塞给测试
                    let matches = event.event_type == EventType::PmProjectCreated
                        && event
                            .parse_payload::<PmProjectCreatedPayload>()
                            .map(|p| p.project_id == test_project_id)
                            .unwrap_or(false);
                    if matches {
                        if let Some(oneshot_tx) = tx.lock().await.take() {
                            let _ = oneshot_tx.send(event);
                        }
                    }
                })
            });

        let subscriber_handle = tokio::spawn(async move {
            let _ = subscriber.start_listening().await;
        });

        // —— 步骤四：用 PUBSUB NUMSUB 确认 EventSubscriber 的订阅也在服务端生效 ——
        // （因为 prepare_subscription 已经确认至少 1 个订阅者，而 Subscriber 又启动了第二个，
        //  等达到 ≥ 2 时即可确定 Subscriber 端的 SUBSCRIBE 也被服务端登记了）
        {
            let mut probe = redis_client
                .get_multiplexed_async_connection()
                .await
                .expect("探针连接失败");
            let deadline = tokio::time::Instant::now() + tokio::time::Duration::from_secs(3);
            loop {
                let result: Result<Vec<(String, u64)>, _> = redis::cmd("PUBSUB")
                    .arg("NUMSUB")
                    .arg(&channel)
                    .query_async(&mut probe)
                    .await;
                let count = result
                    .ok()
                    .and_then(|rows| rows.into_iter().find(|(c, _)| c == &channel))
                    .map(|(_, n)| n)
                    .unwrap_or(0);
                if count >= 2 {
                    break; // prepare_subscription(1) + EventSubscriber(1) = 2 个订阅者
                }
                if tokio::time::Instant::now() >= deadline {
                    // 达到超时后不 panic，因为有些 Redis 配置下 PUBSUB NUMSUB 返回会滞后，
                    // 我们退化为多 sleep 200ms 让系统稳定，避免误报。
                    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                    break;
                }
                tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;
            }
        }

        // —— 步骤五：现在可以安全发布事件，不再存在"发布先于订阅"竞态 ——
        let publisher = EventPublisher::new("publisher-e2e-test").unwrap();
        let publish_res = publisher
            .publish_pm_project_created(test_project_id, &project_name, test_owner_id)
            .await;
        assert!(publish_res.is_ok(), "EventPublisher 发布失败: {publish_res:?}");

        // —— 步骤六：等待 Subscriber handler 中 oneshot 回传的事件 ——
        let received = tokio::time::timeout(tokio::time::Duration::from_secs(10), rx)
            .await
            .expect("Subscriber 在 10 秒内未触发 handler（事件丢失？）")
            .expect("oneshot 发送端意外关闭");

        assert_eq!(received.event_type, EventType::PmProjectCreated);
        assert_eq!(received.source, "publisher-e2e-test");
        let payload = received
            .parse_payload::<PmProjectCreatedPayload>()
            .unwrap();
        assert_eq!(payload.project_id, test_project_id);
        assert_eq!(payload.project_name, project_name);
        assert_eq!(payload.owner_id, test_owner_id);

        // —— 步骤七：回收后台 Subscriber 任务（start_listening 是无限循环）
        subscriber_handle.abort();
        let _ = subscriber_handle.await; // 忽略 Aborted
    }

    // ———————————————————————————————————————————————————————————————
    // 3. MDM 事件：EventSubscriber 端到端接收 MasterDataEvent
    // ———————————————————————————————————————————————————————————————

    #[tokio::test]
    async fn test_event_subscriber_receives_mdm_event() {
        let Some(redis_client) = redis_pubsub::skip_without_redis().await else { return };

        let tenant_id = Uuid::new_v4();
        let master_data_id = "sub-mdm-test-cust-001".to_string();
        let expected_code = "SUBCUST001".to_string();
        let expected_event_id = Uuid::new_v4();

        // 构造 MDM 事件（用 builder 模式设置固定 event_id，方便 matcher）
        let mut mdm_event = MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Customer,
            MasterDataAction::Created,
            master_data_id.clone(),
            expected_code.clone(),
            "mdm-e2e-publisher",
            json!({"name": "SubscriberMDM测试客户"}),
        );
        mdm_event.event_id = expected_event_id; // 固定，方便跨多个 matcher 对比

        let channel = mdm_event.channel();

        // 步骤一：通用工具确保订阅就绪（1/2）
        let _guard: ActiveSubscription<MasterDataEvent> =
            redis_pubsub::prepare_subscription(&redis_client, &channel, move |e: &MasterDataEvent| {
                e.event_id == expected_event_id
            })
            .await;

        // 步骤二：启动 EventSubscriber，监听 Customer 域 MDM 事件
        let (tx, rx) = oneshot::channel::<MasterDataEvent>();
        let tx = Arc::new(Mutex::new(Some(tx)));
        let subscriber = EventSubscriber::new("subscriber-mdm-test")
            .unwrap()
            .subscribe_master_data(vec![MasterDataDomain::Customer], move |event: MasterDataEvent| {
                let tx = Arc::clone(&tx);
                Box::pin(async move {
                    if event.event_id == expected_event_id {
                        if let Some(oneshot_tx) = tx.lock().await.take() {
                            let _ = oneshot_tx.send(event);
                        }
                    }
                })
            });

        let handle = tokio::spawn(async move {
            let _ = subscriber.start_listening().await;
        });

        // 步骤三：确认 Subscriber 的订阅也登记到 Redis（≥ 2 个订阅者）
        {
            let mut probe = redis_client.get_multiplexed_async_connection().await.unwrap();
            let deadline = tokio::time::Instant::now() + tokio::time::Duration::from_secs(3);
            loop {
                let result: Result<Vec<(String, u64)>, _> = redis::cmd("PUBSUB")
                    .arg("NUMSUB")
                    .arg(&channel)
                    .query_async(&mut probe)
                    .await;
                let count = result
                    .ok()
                    .and_then(|rows| rows.into_iter().find(|(c, _)| c == &channel))
                    .map(|(_, n)| n)
                    .unwrap_or(0);
                if count >= 2 {
                    break;
                }
                if tokio::time::Instant::now() >= deadline {
                    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                    break;
                }
                tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;
            }
        }

        // 步骤四：安全发布
        mdm_event.publish().await.expect("MDM event publish 失败");

        // 步骤五：等待 Subscriber handler 回传
        let received = tokio::time::timeout(tokio::time::Duration::from_secs(10), rx)
            .await
            .expect("Subscriber MDM handler 未在 10s 内触发")
            .expect("oneshot 关闭");

        assert_eq!(received.event_id, expected_event_id);
        assert_eq!(received.domain, MasterDataDomain::Customer);
        assert_eq!(received.action, MasterDataAction::Created);
        assert_eq!(received.master_data_id, master_data_id);
        assert_eq!(received.code, expected_code);
        assert_eq!(received.tenant_id, tenant_id);

        handle.abort();
        let _ = handle.await;
    }
}
