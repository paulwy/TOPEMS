//! 通用 Redis Pub/Sub 集成测试工具。
//!
//! 提供 `prepare_subscription` + `wait_for_match` 两阶段 API，
//! 解决 Rust Future 惰性执行特性导致的"发布先于订阅登记，消息丢失"竞态。
//!
//! 适用于：任何"先订阅 → 再发布"的 Redis Pub/Sub 测试。
//!
//! # 典型用法
//! ```ignore
//! use topems_shared_event::test_helpers::redis_pubsub::*;
//!
//! #[tokio::test]
//! async fn my_test() {
//!     let Some((client, _guard)) = skip_without_redis().await else { return };
//!     let expected_id = event.event_id;
//!     let channel = event.channel();
//!
//!     // 阶段一：订阅在 Redis 服务端完全生效（返回前 await 确认）
//!     let sub = prepare_subscription::<MyEvent>(&client, &channel, move |e| e.id == expected_id)
//!         .await;
//!     // 阶段二：此时再发布，100% 不会丢消息
//!     let publish_task = tokio::spawn(async move { publish(&event).await });
//!     // 阶段三：等匹配结果
//!     let received = sub.wait_for_match().await;
//! }
//! ```

use futures_util::StreamExt;
use redis::Client;
use serde::de::DeserializeOwned;
use std::time::Duration;

/// 异步尝试连接 Redis。成功返回 `Some(client)`（已通过 PING 校验），失败返回 `None`。
pub async fn maybe_connect_redis() -> Option<Client> {
    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    let client = Client::open(redis_url).ok()?;
    let mut con = client.get_multiplexed_async_connection().await.ok()?;
    let pong: Result<String, _> = redis::cmd("PING").query_async(&mut con).await;
    match pong {
        Ok(s) if s == "PONG" => Some(client),
        _ => None,
    }
}

/// Drop 时恢复 `EVENT_BUS_MODE` 原值，避免并行测试间全局环境变量互相污染。
pub struct EventBusModeGuard {
    prev: Option<String>,
}

impl Drop for EventBusModeGuard {
    fn drop(&mut self) {
        match &self.prev {
            Some(v) => std::env::set_var("EVENT_BUS_MODE", v),
            None => std::env::remove_var("EVENT_BUS_MODE"),
        }
    }
}

/// 测试需要真实 Redis 时使用：连不上就打印 skip 信息并返回 `None`，调用方直接 return 即可。
///
/// ```ignore
/// let Some((client, _guard)) = skip_without_redis().await else { return };
/// ```
pub async fn skip_without_redis() -> Option<(Client, EventBusModeGuard)> {
    match maybe_connect_redis().await {
        Some(c) => {
            // V321: 确保使用本助手的测试显式使用 Pub/Sub 模式
            // （EventPublisher 默认已改为 stream 模式，需显式切回 pubsub 以匹配本助手的 SUBSCRIBE）
            // 记录原值并设置 pubsub；guard 在测试结束时恢复，防止污染并行测试。
            let prev = std::env::var("EVENT_BUS_MODE").ok();
            std::env::set_var("EVENT_BUS_MODE", "pubsub");
            Some((c, EventBusModeGuard { prev }))
        }
        None => {
            eprintln!(
                "[skip] {}: Redis 不可达（未启动/未设置 REDIS_URL/连接超时）",
                std::thread::current().name().unwrap_or("<unknown-test>")
            );
            None
        }
    }
}

/// 已在 Redis 服务端登记生效的活跃订阅句柄。
///
/// 拿到此句柄后可以立即发布消息，不存在"发布先于订阅"的竞态窗口。
pub struct ActiveSubscription<T> {
    subscriber_task: tokio::task::JoinHandle<T>,
}

impl<T: Send + 'static> ActiveSubscription<T> {
    /// 等待匹配 `matcher` 的消息到达，超时 15s。
    pub async fn wait_for_match(self) -> T {
        self.subscriber_task
            .await
            .expect("订阅任务 panic（查看上方日志定位具体断言）")
    }
}

/// 阶段一：同步建立订阅 → 确认 Redis 服务端已登记 → 返回活跃句柄。
///
/// 返回前会依次保证：
///   1. 订阅端 task 已执行 `SUBSCRIBE {channel}` 并通过 oneshot 通知外部；
///   2. 额外探针连接轮询 `PUBSUB NUMSUB {channel}` 直到订阅者数 ≥ 1。
///
/// # 参数
/// - `matcher`：函数式过滤条件，通常是"收到的消息 ID == 发布的事件 ID"。
pub async fn prepare_subscription<T, F>(
    client: &Client,
    channel_name: &str,
    matcher: F,
) -> ActiveSubscription<T>
where
    T: DeserializeOwned + Send + 'static,
    F: Fn(&T) -> bool + Send + 'static,
{
    let ch = channel_name.to_string();
    let subscriber_client = client.clone();
    let (ready_tx, ready_rx) = tokio::sync::oneshot::channel::<()>();

    let subscriber_task = tokio::spawn(async move {
        let con = subscriber_client
            .get_async_connection()
            .await
            .expect("订阅端 redis 连接失败");
        let mut pubsub = con.into_pubsub();
        pubsub.subscribe(&ch).await.expect("subscribe 失败");
        let _ = ready_tx.send(());

        let mut stream = pubsub.on_message();
        let deadline = tokio::time::Instant::now() + Duration::from_secs(15);
        loop {
            if tokio::time::Instant::now() >= deadline {
                panic!("订阅 channel={ch} 等待匹配消息超时（15s）");
            }
            let next = tokio::time::timeout_at(deadline, stream.next()).await;
            let Ok(Some(msg)) = next else { continue };
            let payload: String = msg.get_payload().unwrap();
            let parsed: T = match serde_json::from_str(&payload) {
                Ok(v) => v,
                Err(_) => continue,
            };
            if matcher(&parsed) {
                break parsed;
            }
        }
    });

    ready_rx
        .await
        .expect("订阅任务在发出订阅就绪信号前 panic/结束");

    // 额外探针轮询，确认订阅在 Redis 服务端真正生效
    {
        let mut probe = client
            .get_multiplexed_async_connection()
            .await
            .expect("探针连接失败");
        let wait_deadline = tokio::time::Instant::now() + Duration::from_secs(2);
        loop {
            let result: Result<Vec<(String, u64)>, _> = redis::cmd("PUBSUB")
                .arg("NUMSUB")
                .arg(channel_name)
                .query_async(&mut probe)
                .await;
            let subscribers = result
                .ok()
                .and_then(|rows| rows.into_iter().find(|(c, _)| c == channel_name))
                .map(|(_, n)| n)
                .unwrap_or(0);
            if subscribers >= 1 {
                break;
            }
            if tokio::time::Instant::now() >= wait_deadline {
                panic!("2 秒内订阅未在 Redis 服务端生效（PUBSUB NUMSUB {channel_name} 仍为 0）");
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    }

    ActiveSubscription { subscriber_task }
}

/// 便捷版：prepare_subscription + wait_for_match 一步到位（仅适合串行测试，并发测试请用两阶段 API）。
#[allow(dead_code)]
pub async fn subscribe_until_match<T, F>(client: Client, channel: &str, matcher: F) -> T
where
    T: DeserializeOwned + Send + 'static,
    F: Fn(&T) -> bool + Send + 'static,
{
    let sub = prepare_subscription(&client, channel, matcher).await;
    sub.wait_for_match().await
}
