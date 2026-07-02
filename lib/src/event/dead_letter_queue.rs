use super::error::EventResult;
use super::event_types::Event;
use chrono::{DateTime, Utc};
use redis::Client;
use serde::{Deserialize, Serialize};
use std::env;
use tracing::{error, info, warn};

const DLQ_KEY_PREFIX: &str = "topems:dlq";
const DLQ_RETRY_COUNT_KEY: &str = "topems:dlq:retry_count";

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
}
