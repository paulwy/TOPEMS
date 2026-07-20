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
            return Err(EventError::ConfigError(
                "page_size 不能为 0".to_string(),
            ));
        }

        let mut con = self.redis_client.get_multiplexed_async_connection().await?;
        let keys = self.list_dlq_keys(event_type).await?;

        // 收集所有死信条目并按 created_at 降序排序（最新在前）
        let mut all_items: Vec<DeadLetter> = Vec::new();
        for key in &keys {
            let count: i64 = redis::cmd("LLEN")
                .arg(key)
                .query_async(&mut con)
                .await?;
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
            (total + page_size - 1) / page_size
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
            let count: i64 = redis::cmd("LLEN")
                .arg(key)
                .query_async(&mut con)
                .await?;
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
                let result: Option<String> = redis::cmd("RPOP")
                    .arg(&key)
                    .query_async(&mut con)
                    .await?;
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
            DLQ_ARCHIVE_KEY_PREFIX,
            dead_letter.event.event_type
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
            let count: i64 = redis::cmd("LLEN")
                .arg(key)
                .query_async(&mut con)
                .await?;
            let count = count.max(0) as usize;
            total_dead_letters += count;

            // 解析事件类型（key 形如 topems:dlq:EventType）
            let parts: Vec<&str> = key.splitn(3, ':').collect();
            let event_type_name = if parts.len() == 3 { parts[2].to_string() } else { key.clone() };
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
            let count: i64 = redis::cmd("LLEN")
                .arg(&key)
                .query_async(&mut con)
                .await?;
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
