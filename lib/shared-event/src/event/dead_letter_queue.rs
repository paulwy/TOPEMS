use super::error::{EventError, EventResult};
use super::event_types::Event;
use chrono::{DateTime, Utc};
use redis::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use tracing::{error, info, warn};
use uuid::Uuid;

const DLQ_KEY_PREFIX: &str = "topems:dlq";
const DLQ_ARCHIVE_KEY_PREFIX: &str = "topems:dlq:archive";
const DLQ_RETRY_COUNT_KEY: &str = "topems:dlq:retry_count";
/// 统计计数器：成功重试次数
const DLQ_STATS_RETRY_SUCCESS_KEY: &str = "topems:dlq:stats:retry_success";
/// 统计计数器：失败重试次数
const DLQ_STATS_RETRY_FAILURE_KEY: &str = "topems:dlq:stats:retry_failure";

/// V23.0: 死信列表（分页响应）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeadLetterList {
    pub items: Vec<DeadLetter>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub total_pages: usize,
}

/// V23.0: 死信队列统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeadLetterStats {
    pub total_dead_letters: usize,
    pub by_event_type: HashMap<String, usize>,
    pub oldest_dead_letter_at: Option<DateTime<Utc>>,
    pub retry_success_count: u64,
    pub retry_failure_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeadLetter {
    pub event: Event,
    pub retry_count: usize,
    pub last_error: String,
    pub created_at: DateTime<Utc>,
    pub last_attempt_at: DateTime<Utc>,
}

#[derive(Clone)]
pub struct DeadLetterQueue {
    redis_client: Client,
}

impl DeadLetterQueue {
    pub fn new() -> EventResult<Self> {
        let redis_url =
            env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
        let redis_client = Client::open(redis_url)?;
        Ok(Self { redis_client })
    }

    pub async fn push(&self, event: Event, error: &str) -> EventResult<()> {
        let retry_count = self.get_retry_count(&event.event_id).await?;
        let new_retry_count = retry_count + 1;

        let dead_letter = DeadLetter {
            event: event.clone(),
            retry_count: new_retry_count,
            last_error: error.to_string(),
            created_at: if retry_count == 0 {
                event.occurred_at
            } else {
                Utc::now()
            },
            last_attempt_at: Utc::now(),
        };

        let dlq_key = format!("{}:{}", DLQ_KEY_PREFIX, event.event_type);
        let event_json = serde_json::to_string(&dead_letter)?;

        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let _: () = redis::cmd("LPUSH")
            .arg(&dlq_key)
            .arg(&event_json)
            .query_async(&mut con)
            .await?;
        let _: () = redis::cmd("HSET")
            .arg(DLQ_RETRY_COUNT_KEY)
            .arg(event.event_id.to_string())
            .arg(new_retry_count)
            .query_async(&mut con)
            .await?;

        if new_retry_count >= 3 {
            error!(
                "事件进入死信队列（超过最大重试次数）- 事件ID: {}, 类型: {:?}, 错误: {}",
                event.event_id, event.event_type, error
            );
        } else {
            warn!(
                "事件投递失败，进入重试队列 - 事件ID: {}, 类型: {:?}, 重试次数: {}, 错误: {}",
                event.event_id, event.event_type, new_retry_count, error
            );
        }
        Ok(())
    }

    pub async fn pop(&self, event_type: &str) -> EventResult<Option<DeadLetter>> {
        let dlq_key = format!("{}:{}", DLQ_KEY_PREFIX, event_type);
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let result: Option<String> = redis::cmd("RPOP")
            .arg(&dlq_key)
            .query_async(&mut con)
            .await?;
        if let Some(event_json) = result {
            let dead_letter: DeadLetter = serde_json::from_str(&event_json)?;
            Ok(Some(dead_letter))
        } else {
            Ok(None)
        }
    }

    pub async fn get_retry_count(&self, event_id: &uuid::Uuid) -> EventResult<usize> {
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let result: Option<i64> = redis::cmd("HGET")
            .arg(DLQ_RETRY_COUNT_KEY)
            .arg(event_id.to_string())
            .query_async(&mut con)
            .await?;
        Ok(result.unwrap_or(0) as usize)
    }

    pub async fn clear_retry_count(&self, event_id: &uuid::Uuid) -> EventResult<()> {
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let _: () = redis::cmd("HDEL")
            .arg(DLQ_RETRY_COUNT_KEY)
            .arg(event_id.to_string())
            .query_async(&mut con)
            .await?;
        Ok(())
    }

    pub async fn size(&self, event_type: &str) -> EventResult<usize> {
        let dlq_key = format!("{}:{}", DLQ_KEY_PREFIX, event_type);
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let count: i64 = redis::cmd("LLEN")
            .arg(&dlq_key)
            .query_async(&mut con)
            .await?;
        Ok(count as usize)
    }

    pub async fn start_retry_loop(&self) -> EventResult<()> {
        info!("启动死信队列重试循环");
        loop {
            let mut con = self.redis_client.get_multiplexed_async_connection().await?;
            let all_keys: Vec<String> = redis::cmd("KEYS")
                .arg(format!("{}:*", DLQ_KEY_PREFIX))
                .query_async(&mut con)
                .await?;

            for key in all_keys {
                let size: i64 = redis::cmd("LLEN").arg(&key).query_async(&mut con).await?;
                if size == 0 {
                    continue;
                }

                let result: Option<String> =
                    redis::cmd("RPOP").arg(&key).query_async(&mut con).await?;
                if let Some(event_json) = result {
                    if let Ok(dead_letter) = serde_json::from_str::<DeadLetter>(&event_json) {
                        if dead_letter.retry_count < 3 {
                            let channel_name =
                                format!("topems:events:{}", dead_letter.event.event_type);
                            let event_json = serde_json::to_string(&dead_letter.event)?;
                            let _: () = redis::cmd("PUBLISH")
                                .arg(&channel_name)
                                .arg(&event_json)
                                .query_async(&mut con)
                                .await?;
                            info!(
                                "死信队列重试事件 - 事件ID: {}, 类型: {:?}, 重试次数: {}",
                                dead_letter.event.event_id,
                                dead_letter.event.event_type,
                                dead_letter.retry_count
                            );
                        } else {
                            warn!(
                                "事件已超过最大重试次数，放弃重试 - 事件ID: {}, 类型: {:?}",
                                dead_letter.event.event_id, dead_letter.event.event_type
                            );
                            self.clear_retry_count(&dead_letter.event.event_id).await?;
                        }
                    }
                }
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        }
    }

    // ================================================================
    // V23.0: 死信队列管理 API
    // ================================================================

    /// V23.0: 列出所有死信（支持分页）
    ///
    /// - 当 `event_type` 为 `Some` 时，仅返回该事件类型的死信
    /// - `page` 从 0 开始计数，`page_size` 不能为 0
    pub async fn list_dead_letters(
        &self,
        event_type: Option<&str>,
        page: usize,
        page_size: usize,
    ) -> EventResult<DeadLetterList> {
        if page_size == 0 {
            return Err(EventError::ConfigError("page_size 不能为 0".to_string()));
        }

        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let keys = self.list_dlq_keys(event_type).await?;

        // 收集所有死信条目并按 created_at 降序排序（最新在前）
        let mut all_items: Vec<DeadLetter> = Vec::new();
        for key in &keys {
            let count: i64 = redis::cmd("LLEN").arg(key).query_async(&mut con).await?;
            if count == 0 {
                continue;
            }
            let raw: Vec<String> = redis::cmd("LRANGE")
                .arg(key)
                .arg(0i64)
                .arg(count - 1)
                .query_async(&mut con)
                .await?;
            for s in raw {
                if let Ok(dl) = serde_json::from_str::<DeadLetter>(&s) {
                    all_items.push(dl);
                }
            }
        }
        all_items.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        let total = all_items.len();
        let total_pages = if total == 0 {
            0
        } else {
            total.div_ceil(page_size)
        };
        let start = page.saturating_mul(page_size);
        let end = (start + page_size).min(total);
        let items = if start >= total {
            Vec::new()
        } else {
            all_items[start..end].to_vec()
        };

        Ok(DeadLetterList {
            items,
            total,
            page,
            page_size,
            total_pages,
        })
    }

    /// V23.0: 获取死信详情
    pub async fn get_dead_letter(&self, event_id: Uuid) -> EventResult<Option<DeadLetter>> {
        let keys = self.list_dlq_keys(None).await?;
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        for key in &keys {
            let count: i64 = redis::cmd("LLEN").arg(key).query_async(&mut con).await?;
            if count == 0 {
                continue;
            }
            // 分批扫描避免一次性加载过多
            let batch = 200i64;
            let mut idx: i64 = 0;
            while idx < count {
                let end = (idx + batch - 1).min(count - 1);
                let raw: Vec<String> = redis::cmd("LRANGE")
                    .arg(key)
                    .arg(idx)
                    .arg(end)
                    .query_async(&mut con)
                    .await?;
                for s in raw {
                    if let Ok(dl) = serde_json::from_str::<DeadLetter>(&s) {
                        if dl.event.event_id == event_id {
                            return Ok(Some(dl));
                        }
                    }
                }
                idx = end + 1;
            }
        }
        Ok(None)
    }

    /// V23.0: 重试单个死信
    ///
    /// 找到指定事件并重新发布到订阅频道，重试后从死信队列移除。
    pub async fn retry_dead_letter(&self, event_id: Uuid) -> EventResult<()> {
        let target = self.find_dlq_entry(event_id).await?;
        let Some((key, json, dead_letter)) = target else {
            warn!(%event_id, "未找到死信，无法重试");
            return Err(EventError::ConfigError(format!(
                "未找到事件 {} 的死信记录",
                event_id
            )));
        };

        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let channel_name = format!("topems:events:{}", dead_letter.event.event_type);
        let event_json = serde_json::to_string(&dead_letter.event)?;
        let _: () = redis::cmd("PUBLISH")
            .arg(&channel_name)
            .arg(&event_json)
            .query_async(&mut con)
            .await?;

        // 重试成功后从队列移除
        let removed: i64 = redis::cmd("LREM")
            .arg(&key)
            .arg(1i64)
            .arg(&json)
            .query_async(&mut con)
            .await?;
        if removed > 0 {
            let _: () = redis::cmd("INCR")
                .arg(DLQ_STATS_RETRY_SUCCESS_KEY)
                .query_async(&mut con)
                .await?;
            self.clear_retry_count(&dead_letter.event.event_id).await?;
            info!(%event_id, "死信重试成功并已从队列移除");
        }
        Ok(())
    }

    /// V23.0: 批量重试死信
    ///
    /// 重试指定事件类型（或全部）的所有死信，返回重试的事件数量。
    pub async fn retry_all_dead_letters(&self, event_type: Option<&str>) -> EventResult<usize> {
        let keys = self.list_dlq_keys(event_type).await?;
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let mut count = 0usize;

        for key in keys {
            loop {
                let result: Option<String> =
                    redis::cmd("RPOP").arg(&key).query_async(&mut con).await?;
                let Some(json) = result else { break };
                let Ok(dead_letter) = serde_json::from_str::<DeadLetter>(&json) else {
                    let _: () = redis::cmd("INCR")
                        .arg(DLQ_STATS_RETRY_FAILURE_KEY)
                        .query_async(&mut con)
                        .await?;
                    continue;
                };

                let channel_name = format!("topems:events:{}", dead_letter.event.event_type);
                let event_json = serde_json::to_string(&dead_letter.event)?;
                let pub_result: Result<(), _> = redis::cmd("PUBLISH")
                    .arg(&channel_name)
                    .arg(&event_json)
                    .query_async(&mut con)
                    .await;
                if pub_result.is_ok() {
                    count += 1;
                    let _: () = redis::cmd("INCR")
                        .arg(DLQ_STATS_RETRY_SUCCESS_KEY)
                        .query_async(&mut con)
                        .await?;
                    self.clear_retry_count(&dead_letter.event.event_id).await?;
                    info!(
                        event_id = %dead_letter.event.event_id,
                        "批量重试：事件已重新发布"
                    );
                } else {
                    let _: () = redis::cmd("INCR")
                        .arg(DLQ_STATS_RETRY_FAILURE_KEY)
                        .query_async(&mut con)
                        .await?;
                    // 重新入队，避免丢失
                    let _: () = redis::cmd("RPUSH")
                        .arg(&key)
                        .arg(&json)
                        .query_async(&mut con)
                        .await?;
                    break;
                }
            }
        }
        info!(count, "批量重试完成");
        Ok(count)
    }

    /// V23.0: 归档死信（从活跃队列移到归档队列）
    pub async fn archive_dead_letter(&self, event_id: Uuid) -> EventResult<()> {
        let target = self.find_dlq_entry(event_id).await?;
        let Some((key, json, dead_letter)) = target else {
            return Err(EventError::ConfigError(format!(
                "未找到事件 {} 的死信记录",
                event_id
            )));
        };

        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let removed: i64 = redis::cmd("LREM")
            .arg(&key)
            .arg(1i64)
            .arg(&json)
            .query_async(&mut con)
            .await?;
        if removed == 0 {
            warn!(%event_id, "归档失败：队列项已被移除");
            return Ok(());
        }

        let archive_key = format!(
            "{}:{}",
            DLQ_ARCHIVE_KEY_PREFIX, dead_letter.event.event_type
        );
        let _: () = redis::cmd("LPUSH")
            .arg(&archive_key)
            .arg(&json)
            .query_async(&mut con)
            .await?;
        self.clear_retry_count(&dead_letter.event.event_id).await?;
        info!(%event_id, "死信已归档");
        Ok(())
    }

    /// V23.0: 删除死信
    pub async fn delete_dead_letter(&self, event_id: Uuid) -> EventResult<()> {
        let target = self.find_dlq_entry(event_id).await?;
        let Some((key, json, dead_letter)) = target else {
            return Ok(());
        };
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let _: i64 = redis::cmd("LREM")
            .arg(&key)
            .arg(1i64)
            .arg(&json)
            .query_async(&mut con)
            .await?;
        self.clear_retry_count(&dead_letter.event.event_id).await?;
        info!(%event_id, "死信已删除");
        Ok(())
    }

    /// V23.0: 获取死信队列统计
    pub async fn get_stats(&self) -> EventResult<DeadLetterStats> {
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let keys = self.list_dlq_keys(None).await?;

        let mut by_event_type: HashMap<String, usize> = HashMap::new();
        let mut total_dead_letters = 0usize;
        let mut oldest: Option<DateTime<Utc>> = None;

        for key in &keys {
            let count: i64 = redis::cmd("LLEN").arg(key).query_async(&mut con).await?;
            let count = count.max(0) as usize;
            total_dead_letters += count;

            // 解析事件类型（key 形如 topems:dlq:EventType）
            let parts: Vec<&str> = key.splitn(3, ':').collect();
            let event_type_name = if parts.len() == 3 {
                parts[2].to_string()
            } else {
                key.clone()
            };
            *by_event_type.entry(event_type_name).or_insert(0) += count;

            // 寻找最早 created_at
            if count > 0 {
                let raw: Vec<String> = redis::cmd("LRANGE")
                    .arg(key)
                    .arg(0i64)
                    .arg((count as i64) - 1)
                    .query_async(&mut con)
                    .await?;
                for s in raw {
                    if let Ok(dl) = serde_json::from_str::<DeadLetter>(&s) {
                        oldest = Some(match oldest {
                            Some(o) if o < dl.created_at => o,
                            _ => dl.created_at,
                        });
                    }
                }
            }
        }

        let retry_success_count: u64 = {
            let result: Option<String> = redis::cmd("GET")
                .arg(DLQ_STATS_RETRY_SUCCESS_KEY)
                .query_async(&mut con)
                .await?;
            result.and_then(|s| s.parse().ok()).unwrap_or(0)
        };
        let retry_failure_count: u64 = {
            let result: Option<String> = redis::cmd("GET")
                .arg(DLQ_STATS_RETRY_FAILURE_KEY)
                .query_async(&mut con)
                .await?;
            result.and_then(|s| s.parse().ok()).unwrap_or(0)
        };

        Ok(DeadLetterStats {
            total_dead_letters,
            by_event_type,
            oldest_dead_letter_at: oldest,
            retry_success_count,
            retry_failure_count,
        })
    }

    // ----------------------------------------------------------------
    // 内部辅助方法
    // ----------------------------------------------------------------

    /// 列出所有 DLQ 键，可选按事件类型过滤
    async fn list_dlq_keys(&self, event_type: Option<&str>) -> EventResult<Vec<String>> {
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let keys: Vec<String> = match event_type {
            Some(et) => vec![format!("{}:{}", DLQ_KEY_PREFIX, et)],
            None => {
                let pattern = format!("{}:*", DLQ_KEY_PREFIX);
                let mut all: Vec<String> = redis::cmd("KEYS")
                    .arg(&pattern)
                    .query_async(&mut con)
                    .await?;
                // 排除 retry_count 与 stats 等非队列键
                all.retain(|k| {
                    !k.starts_with(DLQ_RETRY_COUNT_KEY)
                        && !k.starts_with("topems:dlq:stats")
                        && !k.starts_with(DLQ_ARCHIVE_KEY_PREFIX)
                });
                all
            }
        };
        Ok(keys)
    }

    /// 在所有 DLQ 列表中查找指定事件 ID 的条目
    ///
    /// 返回 (key, 原始 JSON 字符串, 解析后的 DeadLetter)
    async fn find_dlq_entry(
        &self,
        event_id: Uuid,
    ) -> EventResult<Option<(String, String, DeadLetter)>> {
        let keys = self.list_dlq_keys(None).await?;
        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        for key in keys {
            let count: i64 = redis::cmd("LLEN").arg(&key).query_async(&mut con).await?;
            if count == 0 {
                continue;
            }
            let batch = 200i64;
            let mut idx: i64 = 0;
            while idx < count {
                let end = (idx + batch - 1).min(count - 1);
                let raw: Vec<String> = redis::cmd("LRANGE")
                    .arg(&key)
                    .arg(idx)
                    .arg(end)
                    .query_async(&mut con)
                    .await?;
                for s in raw {
                    if let Ok(dl) = serde_json::from_str::<DeadLetter>(&s) {
                        if dl.event.event_id == event_id {
                            return Ok(Some((key.clone(), s, dl)));
                        }
                    }
                }
                idx = end + 1;
            }
        }
        Ok(None)
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
            serde_json::json!({"key": "value", "n": 42}),
        )
    }

    fn make_dead_letter(retry_count: usize) -> DeadLetter {
        let event = make_event();
        DeadLetter {
            event,
            retry_count,
            last_error: format!("error #{}", retry_count),
            created_at: Utc::now(),
            last_attempt_at: Utc::now(),
        }
    }

    #[test]
    fn test_dead_letter_serde_roundtrip() {
        let dl = make_dead_letter(2);
        let json = serde_json::to_string(&dl).expect("serialize");
        let back: DeadLetter = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.retry_count, 2);
        assert_eq!(back.last_error, "error #2");
        assert_eq!(back.event.event_id, dl.event.event_id);
        assert_eq!(back.event.event_type, EventType::HealthCheck);
        assert_eq!(back.event.source, "test-source");
        assert_eq!(back.created_at, dl.created_at);
        assert_eq!(back.last_attempt_at, dl.last_attempt_at);
    }

    #[test]
    fn test_dead_letter_list_serde_roundtrip_with_items() {
        let items = vec![
            make_dead_letter(0),
            make_dead_letter(1),
            make_dead_letter(2),
        ];
        let list = DeadLetterList {
            total: 42,
            page: 1,
            page_size: 10,
            total_pages: 5,
            items,
        };
        let json = serde_json::to_string(&list).expect("serialize");
        let back: DeadLetterList = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.total, 42);
        assert_eq!(back.page, 1);
        assert_eq!(back.page_size, 10);
        assert_eq!(back.total_pages, 5);
        assert_eq!(back.items.len(), 3);
        assert_eq!(back.items[0].retry_count, 0);
        assert_eq!(back.items[2].retry_count, 2);
    }

    #[test]
    fn test_dead_letter_list_serde_roundtrip_empty() {
        let list = DeadLetterList {
            items: Vec::new(),
            total: 0,
            page: 0,
            page_size: 20,
            total_pages: 0,
        };
        let json = serde_json::to_string(&list).expect("serialize");
        let back: DeadLetterList = serde_json::from_str(&json).expect("deserialize");
        assert!(back.items.is_empty());
        assert_eq!(back.total, 0);
        assert_eq!(back.total_pages, 0);
    }

    #[test]
    fn test_dead_letter_stats_serde_roundtrip_with_values() {
        let mut by_event_type = HashMap::new();
        by_event_type.insert("HealthCheck".to_string(), 5usize);
        by_event_type.insert("CacheInvalidated".to_string(), 3usize);
        let stats = DeadLetterStats {
            total_dead_letters: 8,
            by_event_type,
            oldest_dead_letter_at: Some(Utc::now()),
            retry_success_count: 10,
            retry_failure_count: 2,
        };
        let json = serde_json::to_string(&stats).expect("serialize");
        let back: DeadLetterStats = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.total_dead_letters, 8);
        assert_eq!(back.by_event_type.len(), 2);
        assert_eq!(back.by_event_type.get("HealthCheck"), Some(&5));
        assert_eq!(back.by_event_type.get("CacheInvalidated"), Some(&3));
        assert!(back.oldest_dead_letter_at.is_some());
        assert_eq!(back.retry_success_count, 10);
        assert_eq!(back.retry_failure_count, 2);
    }

    #[test]
    fn test_dead_letter_stats_serde_roundtrip_empty() {
        let stats = DeadLetterStats {
            total_dead_letters: 0,
            by_event_type: HashMap::new(),
            oldest_dead_letter_at: None,
            retry_success_count: 0,
            retry_failure_count: 0,
        };
        let json = serde_json::to_string(&stats).expect("serialize");
        let back: DeadLetterStats = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.total_dead_letters, 0);
        assert!(back.by_event_type.is_empty());
        assert!(back.oldest_dead_letter_at.is_none());
        assert_eq!(back.retry_success_count, 0);
        assert_eq!(back.retry_failure_count, 0);
    }

    #[test]
    fn test_dead_letter_clone_preserves_fields() {
        let dl = make_dead_letter(3);
        let cloned = dl.clone();
        assert_eq!(cloned.retry_count, dl.retry_count);
        assert_eq!(cloned.last_error, dl.last_error);
        assert_eq!(cloned.event.event_id, dl.event.event_id);
        assert_eq!(cloned.created_at, dl.created_at);
        assert_eq!(cloned.last_attempt_at, dl.last_attempt_at);
    }

    #[test]
    fn test_dead_letter_list_clone_preserves_fields() {
        let list = DeadLetterList {
            items: vec![make_dead_letter(0)],
            total: 1,
            page: 0,
            page_size: 5,
            total_pages: 1,
        };
        let cloned = list.clone();
        assert_eq!(cloned.total, list.total);
        assert_eq!(cloned.page, list.page);
        assert_eq!(cloned.page_size, list.page_size);
        assert_eq!(cloned.total_pages, list.total_pages);
        assert_eq!(cloned.items.len(), list.items.len());
    }

    #[test]
    fn test_dead_letter_stats_clone_preserves_fields() {
        let mut by_event_type = HashMap::new();
        by_event_type.insert("A".to_string(), 1usize);
        let stats = DeadLetterStats {
            total_dead_letters: 1,
            by_event_type,
            oldest_dead_letter_at: Some(Utc::now()),
            retry_success_count: 7,
            retry_failure_count: 3,
        };
        let cloned = stats.clone();
        assert_eq!(cloned.total_dead_letters, stats.total_dead_letters);
        assert_eq!(cloned.by_event_type.len(), stats.by_event_type.len());
        assert_eq!(cloned.retry_success_count, stats.retry_success_count);
        assert_eq!(cloned.retry_failure_count, stats.retry_failure_count);
        assert_eq!(cloned.oldest_dead_letter_at, stats.oldest_dead_letter_at);
    }

    #[test]
    fn test_dlq_new_succeeds_lazily() {
        // DeadLetterQueue::new 仅做 Client::open，不建立实际连接。
        // 此测试保证：即使本地完全没有 Redis，构造函数也不会失败。
        let queue = DeadLetterQueue::new();
        assert!(queue.is_ok(), "DeadLetterQueue::new 惰性构造应始终成功");
    }

    #[test]
    fn test_dlq_list_dead_letters_page_size_zero_returns_config_error() {
        // page_size=0 的校验在 Redis 连接之前，无需 Redis 即可测试错误路径
        let queue = DeadLetterQueue::new().expect("lazy construction succeeds");
        let rt = tokio::runtime::Runtime::new().expect("runtime");
        let result = rt.block_on(queue.list_dead_letters(None, 0, 0));
        assert!(result.is_err());
        match result.unwrap_err() {
            EventError::ConfigError(msg) => assert!(msg.contains("page_size")),
            other => panic!("Expected ConfigError, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_dlq_push_returns_err_when_redis_unavailable() {
        // 仅在 Redis 不可达时验证错误路径（避免与可用 Redis 环境的测试冲突）
        if redis_pubsub::maybe_connect_redis().await.is_some() {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let queue = DeadLetterQueue::new().expect("lazy construction succeeds");
        let event = make_event();
        let result = queue.push(event, "test error").await;
        assert!(result.is_err(), "Redis 不可达时 push 应返回 Err");
    }

    #[tokio::test]
    async fn test_dlq_pop_returns_err_when_redis_unavailable() {
        if redis_pubsub::maybe_connect_redis().await.is_some() {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let queue = DeadLetterQueue::new().expect("lazy construction succeeds");
        let result = queue.pop("HealthCheck").await;
        assert!(result.is_err(), "Redis 不可达时 pop 应返回 Err");
    }

    #[tokio::test]
    async fn test_dlq_size_returns_err_when_redis_unavailable() {
        if redis_pubsub::maybe_connect_redis().await.is_some() {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let queue = DeadLetterQueue::new().expect("lazy construction succeeds");
        let result = queue.size("HealthCheck").await;
        assert!(result.is_err(), "Redis 不可达时 size 应返回 Err");
    }

    #[tokio::test]
    async fn test_dlq_get_retry_count_returns_err_when_redis_unavailable() {
        if redis_pubsub::maybe_connect_redis().await.is_some() {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let queue = DeadLetterQueue::new().expect("lazy construction succeeds");
        let event_id = Uuid::new_v4();
        let result = queue.get_retry_count(&event_id).await;
        assert!(result.is_err(), "Redis 不可达时 get_retry_count 应返回 Err");
    }

    #[tokio::test]
    async fn test_dlq_get_stats_returns_err_when_redis_unavailable() {
        if redis_pubsub::maybe_connect_redis().await.is_some() {
            eprintln!("[skip] Redis 可用，跳过不可达错误路径测试");
            return;
        }
        let queue = DeadLetterQueue::new().expect("lazy construction succeeds");
        let result = queue.get_stats().await;
        assert!(result.is_err(), "Redis 不可达时 get_stats 应返回 Err");
    }
}
