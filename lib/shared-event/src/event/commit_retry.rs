//! D6 通用：commit 后 emit + Redis ZSET 重试队列（跨服务共享）。
//!
//! 背景：业务写事务内发布事件——commit 失败则孤儿事件（源行未落库但事件已发）；
//! XADD 失败则丢事件（源行已落库但下游未收到）。
//!
//! 本模块提供最小侵入方案：
//! 1. 写事务 commit **成功之后** 再发布事件（孤儿事件机制消除）；
//! 2. 发布失败 → 写入 Redis ZSET（score=下次重试时间戳），内嵌 tokio 任务周期扫描重发；
//! 3. 消费侧天然幂等（at-least-once 重复投递无副作用）。
//!
//! 不落 DB 表（0013 不落库），免迁移。
//!
//! ## ZSET 约定
//! - 键：`topems:event_retry:{service_name}`（每服务独立集合）
//! - member = JSON：
//!   - searchable 通道：`{"channel":"searchable","entity_type":..,"entity_id":..,"attempts":n}`
//!   - typed 通道：`{"channel":"typed","event_type":<EventType json>,"payload":{..},"attempts":n}`
//! - score = 下次重试 unix 时间戳；退避 `(attempts+1)*30s`，最大 8 次。

use chrono::Utc;
use serde::Serialize;
use std::future::Future;
use uuid::Uuid;

use crate::event::{EventPublisher, EventType};

pub const RETRY_INTERVAL_SEC: i64 = 30;
pub const MAX_ATTEMPTS: u32 = 8;

pub fn retry_zset_key(service_name: &str) -> String {
    format!("topems:event_retry:{}", service_name)
}

fn redis_client() -> Option<redis::Client> {
    let url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    redis::Client::open(url).ok()
}

async fn zadd(service_name: &str, member: &str, attempts: u32) {
    let Some(client) = redis_client() else { return };
    let Ok(mut con) = client.get_multiplexed_async_connection().await else {
        tracing::error!("[{}] 重试队列：无法连接 Redis，丢弃失败事件", service_name);
        return;
    };
    let delay = (i64::from(attempts) + 1) * RETRY_INTERVAL_SEC;
    let score = Utc::now().timestamp() + delay;
    let _: () = redis::cmd("ZADD")
        .arg(retry_zset_key(service_name))
        .arg(score)
        .arg(member)
        .query_async(&mut con)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("[{}] 重试队列 ZADD 失败: {}", service_name, e);
        });
}

/// typed 通道入队：存完整 payload，重试时反序列化重发。
pub async fn push_retry_typed(service_name: &str, event_type: EventType, payload: &impl Serialize) {
    let Ok(p) = serde_json::to_value(payload) else {
        return;
    };
    let Ok(et) = serde_json::to_value(event_type) else {
        return;
    };
    let member = serde_json::json!({
        "channel": "typed",
        "event_type": et,
        "payload": p,
        "attempts": 0u32,
    })
    .to_string();
    zadd(service_name, &member, 0).await;
}

/// searchable 通道入队：仅存 entity_type/id，重试时由服务方回调从 DB 重建 payload。
pub async fn push_retry_searchable(
    service_name: &str,
    entity_type: &str,
    entity_id: Uuid,
    attempts: u32,
) {
    let member = serde_json::json!({
        "channel": "searchable",
        "entity_type": entity_type,
        "entity_id": entity_id,
        "attempts": attempts,
    })
    .to_string();
    zadd(service_name, &member, attempts).await;
}

/// 内嵌 tokio 后台任务：扫描到期项重发，成功 ZREM；超限 error! 告警。
///
/// `rebuild_searchable` 由服务方提供：给定 (entity_type, entity_id)，从已提交 DB 重建
/// SearchableEntityChanged payload；返回 None 表示实体已删（跳过）。
pub async fn run_relay<F, Fut>(
    service_name: &str,
    publisher: &EventPublisher,
    rebuild_searchable: F,
) where
    F: Fn(&str, Uuid) -> Fut + Send + Sync,
    Fut: Future<Output = Option<serde_json::Value>> + Send,
{
    let Some(client) = redis_client() else { return };
    let Ok(mut con) = client.get_multiplexed_async_connection().await else {
        return;
    };
    let now = Utc::now().timestamp();
    let due: Vec<(String, i64)> = redis::cmd("ZRANGEBYSCORE")
        .arg(retry_zset_key(service_name))
        .arg("-inf")
        .arg(now)
        .arg("WITHSCORES")
        .query_async(&mut con)
        .await
        .unwrap_or_default();
    for (member, _score) in due {
        let Ok(mut v) = serde_json::from_str::<serde_json::Value>(&member) else {
            continue;
        };
        let attempts: u32 = v
            .get("attempts")
            .and_then(|x| x.as_u64())
            .and_then(|n| u32::try_from(n).ok())
            .unwrap_or(0);
        let channel = v
            .get("channel")
            .and_then(|x| x.as_str())
            .unwrap_or("searchable");

        let (published, label) = match channel {
            "typed" => {
                let et: Option<EventType> = v
                    .get("event_type")
                    .cloned()
                    .and_then(|e| serde_json::from_value(e).ok());
                let payload = v.get("payload").cloned().unwrap_or(serde_json::Value::Null);
                match et {
                    Some(et) => (
                        publisher.publish_event(et, &payload).await.is_ok(),
                        "typed".to_string(),
                    ),
                    None => (false, "typed:bad-et".to_string()),
                }
            }
            _ => {
                let Some(et) = v.get("entity_type").and_then(|x| x.as_str()) else {
                    continue;
                };
                let Some(eid) = v
                    .get("entity_id")
                    .and_then(|x| x.as_str())
                    .and_then(|s| Uuid::parse_str(s).ok())
                else {
                    continue;
                };
                match rebuild_searchable(et, eid).await {
                    Some(payload) => (
                        publisher
                            .publish_event(EventType::SearchableEntityChanged, &payload)
                            .await
                            .is_ok(),
                        format!("searchable:{}", et),
                    ),
                    None => (false, format!("searchable:{}", et)),
                }
            }
        };

        if published {
            let _: i64 = redis::cmd("ZREM")
                .arg(retry_zset_key(service_name))
                .arg(&member)
                .query_async(&mut con)
                .await
                .unwrap_or(0);
            tracing::info!("[{}] 重试发布成功 {}", service_name, label);
        } else if attempts + 1 >= MAX_ATTEMPTS {
            let _: i64 = redis::cmd("ZREM")
                .arg(retry_zset_key(service_name))
                .arg(&member)
                .query_async(&mut con)
                .await
                .unwrap_or(0);
            tracing::error!(
                "[{}] 事件重试超上限（{} 次），放弃 {}——需 backfill 补拉",
                service_name,
                MAX_ATTEMPTS,
                label
            );
        } else if let Some(obj) = v.as_object_mut() {
            obj.insert("attempts".to_string(), serde_json::json!(attempts + 1));
            let new_member = serde_json::Value::Object(obj.clone()).to_string();
            zadd(service_name, &new_member, attempts + 1).await;
        }
    }
}
