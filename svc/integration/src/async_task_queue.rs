//! 异步任务队列（持久化）
//!
//! 基于数据库的异步任务队列，支持：
//! - 任务入队/出队
//! - 状态跟踪（pending -> in_progress -> completed/failed）
//! - 重试机制
//! - 优先级调度
//! - 租户隔离

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

// ============================================================================
// 数据模型
// ============================================================================

/// 异步任务状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AsyncTaskStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    MaxRetriesExceeded,
    Cancelled,
}

impl AsyncTaskStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            AsyncTaskStatus::Pending => "pending",
            AsyncTaskStatus::InProgress => "in_progress",
            AsyncTaskStatus::Completed => "completed",
            AsyncTaskStatus::Failed => "failed",
            AsyncTaskStatus::MaxRetriesExceeded => "max_retries_exceeded",
            AsyncTaskStatus::Cancelled => "cancelled",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "in_progress" => AsyncTaskStatus::InProgress,
            "completed" => AsyncTaskStatus::Completed,
            "failed" => AsyncTaskStatus::Failed,
            "max_retries_exceeded" => AsyncTaskStatus::MaxRetriesExceeded,
            "cancelled" => AsyncTaskStatus::Cancelled,
            _ => AsyncTaskStatus::Pending,
        }
    }
}

/// 异步任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsyncTask {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub task_type: String,
    pub source_service: Option<String>,
    pub target_service: Option<String>,
    pub payload: serde_json::Value,
    pub result_payload: Option<serde_json::Value>,
    pub status: AsyncTaskStatus,
    pub retry_count: i32,
    pub max_retries: i32,
    pub priority: i32,
    pub scheduled_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建任务请求
#[derive(Debug, Clone, Deserialize)]
pub struct CreateAsyncTaskRequest {
    pub tenant_id: Option<Uuid>,
    pub task_type: String,
    pub source_service: Option<String>,
    pub target_service: Option<String>,
    pub payload: serde_json::Value,
    pub max_retries: Option<i32>,
    pub priority: Option<i32>,
    pub scheduled_at: Option<DateTime<Utc>>,
}

/// 任务统计
#[derive(Debug, Clone, Serialize)]
pub struct AsyncTaskStats {
    pub total: i64,
    pub pending: i64,
    pub in_progress: i64,
    pub completed: i64,
    pub failed: i64,
    pub max_retries_exceeded: i64,
}

// ============================================================================
// 数据库操作
// ============================================================================

/// 入队任务
pub async fn enqueue_task(
    pool: &PgPool,
    req: &CreateAsyncTaskRequest,
) -> Result<AsyncTask, String> {
    let max_retries = req.max_retries.unwrap_or(5);
    let priority = req.priority.unwrap_or(0);
    let scheduled_at = req.scheduled_at.unwrap_or_else(Utc::now);

    let row = sqlx::query(
        r#"
        INSERT INTO integration.async_tasks
            (tenant_id, task_type, source_service, target_service, payload,
             max_retries, priority, scheduled_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        RETURNING id, tenant_id, task_type, source_service, target_service,
                  payload, result_payload, status, retry_count, max_retries,
                  priority, scheduled_at, started_at, completed_at, last_error,
                  created_at, updated_at
        "#,
    )
    .bind(req.tenant_id)
    .bind(&req.task_type)
    .bind(&req.source_service)
    .bind(&req.target_service)
    .bind(&req.payload)
    .bind(max_retries)
    .bind(priority)
    .bind(scheduled_at)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("入队任务失败: {}", e))?;

    Ok(row_to_task(&row))
}

/// 出队任务（获取待处理任务并标记为 in_progress）
///
/// 使用 SELECT ... FOR UPDATE SKIP LOCKED 实现并发安全
pub async fn dequeue_task(
    pool: &PgPool,
    task_types: &[&str],
    limit: i64,
) -> Result<Vec<AsyncTask>, String> {
    let types_array: Vec<String> = task_types.iter().map(|s| s.to_string()).collect();

    let rows = sqlx::query(
        r#"
        WITH next_tasks AS (
            SELECT id
            FROM integration.async_tasks
            WHERE status = 'pending'
              AND scheduled_at <= NOW()
              AND deleted_at IS NULL
              AND ($1::text[] IS NULL OR task_type = ANY($1))
            ORDER BY priority DESC, scheduled_at ASC, created_at ASC
            LIMIT $2
            FOR UPDATE SKIP LOCKED
        )
        UPDATE integration.async_tasks t
        SET status = 'in_progress',
            started_at = NOW(),
            retry_count = retry_count
        FROM next_tasks nt
        WHERE t.id = nt.id
        RETURNING t.id, t.tenant_id, t.task_type, t.source_service, t.target_service,
                  t.payload, t.result_payload, t.status, t.retry_count, t.max_retries,
                  t.priority, t.scheduled_at, t.started_at, t.completed_at, t.last_error,
                  t.created_at, t.updated_at
        "#,
    )
    .bind(types_array)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("出队任务失败: {}", e))?;

    Ok(rows.iter().map(row_to_task).collect())
}

/// 标记任务完成
pub async fn complete_task(
    pool: &PgPool,
    task_id: Uuid,
    result: Option<serde_json::Value>,
) -> Result<AsyncTask, String> {
    let row = sqlx::query(
        r#"
        UPDATE integration.async_tasks
        SET status = 'completed',
            completed_at = NOW(),
            result_payload = $2,
            last_error = NULL
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, tenant_id, task_type, source_service, target_service,
                  payload, result_payload, status, retry_count, max_retries,
                  priority, scheduled_at, started_at, completed_at, last_error,
                  created_at, updated_at
        "#,
    )
    .bind(task_id)
    .bind(result)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("标记任务完成失败: {}", e))?;

    Ok(row_to_task(&row))
}

/// 标记任务失败
pub async fn fail_task(
    pool: &PgPool,
    task_id: Uuid,
    error: &str,
) -> Result<AsyncTask, String> {
    let row = sqlx::query(
        r#"
        UPDATE integration.async_tasks
        SET status = 'failed',
            completed_at = NOW(),
            last_error = $2
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, tenant_id, task_type, source_service, target_service,
                  payload, result_payload, status, retry_count, max_retries,
                  priority, scheduled_at, started_at, completed_at, last_error,
                  created_at, updated_at
        "#,
    )
    .bind(task_id)
    .bind(error)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("标记任务失败失败: {}", e))?;

    Ok(row_to_task(&row))
}

/// 重试任务（将失败任务重新置为 pending）
pub async fn retry_task(
    pool: &PgPool,
    task_id: Uuid,
    delay_secs: Option<i64>,
) -> Result<AsyncTask, String> {
    let scheduled_at = match delay_secs {
        Some(secs) => Utc::now() + chrono::Duration::seconds(secs),
        None => Utc::now(),
    };

    let row = sqlx::query(
        r#"
        UPDATE integration.async_tasks
        SET status = 'pending',
            retry_count = retry_count + 1,
            scheduled_at = $2,
            started_at = NULL,
            completed_at = NULL,
            last_error = NULL
        WHERE id = $1
          AND deleted_at IS NULL
          AND retry_count < max_retries
        RETURNING id, tenant_id, task_type, source_service, target_service,
                  payload, result_payload, status, retry_count, max_retries,
                  priority, scheduled_at, started_at, completed_at, last_error,
                  created_at, updated_at
        "#,
    )
    .bind(task_id)
    .bind(scheduled_at)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("重试任务失败: {}", e))?;

    Ok(row_to_task(&row))
}

/// 标记任务超过最大重试次数
pub async fn mark_max_retries_exceeded(
    pool: &PgPool,
    task_id: Uuid,
    error: &str,
) -> Result<AsyncTask, String> {
    let row = sqlx::query(
        r#"
        UPDATE integration.async_tasks
        SET status = 'max_retries_exceeded',
            completed_at = NOW(),
            last_error = $2
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, tenant_id, task_type, source_service, target_service,
                  payload, result_payload, status, retry_count, max_retries,
                  priority, scheduled_at, started_at, completed_at, last_error,
                  created_at, updated_at
        "#,
    )
    .bind(task_id)
    .bind(error)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("标记任务超过最大重试次数失败: {}", e))?;

    Ok(row_to_task(&row))
}

/// 获取任务详情
pub async fn get_task(pool: &PgPool, task_id: Uuid) -> Result<Option<AsyncTask>, String> {
    let row = sqlx::query(
        r#"
        SELECT id, tenant_id, task_type, source_service, target_service,
               payload, result_payload, status, retry_count, max_retries,
               priority, scheduled_at, started_at, completed_at, last_error,
               created_at, updated_at
        FROM integration.async_tasks
        WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(task_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("获取任务详情失败: {}", e))?;

    Ok(row.as_ref().map(row_to_task))
}

/// 列出任务
pub async fn list_tasks(
    pool: &PgPool,
    status: Option<&str>,
    task_type: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<AsyncTask>, String> {
    let rows = sqlx::query(
        r#"
        SELECT id, tenant_id, task_type, source_service, target_service,
               payload, result_payload, status, retry_count, max_retries,
               priority, scheduled_at, started_at, completed_at, last_error,
               created_at, updated_at
        FROM integration.async_tasks
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR status = $1)
          AND ($2::text IS NULL OR task_type = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(status)
    .bind(task_type)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("列出任务失败: {}", e))?;

    Ok(rows.iter().map(row_to_task).collect())
}

/// 获取任务统计
pub async fn get_task_stats(pool: &PgPool) -> Result<AsyncTaskStats, String> {
    let row = sqlx::query(
        r#"
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) FILTER (WHERE status = 'max_retries_exceeded') as max_retries_exceeded
        FROM integration.async_tasks
        WHERE deleted_at IS NULL
        "#,
    )
    .fetch_one(pool)
    .await
    .map_err(|e| format!("获取任务统计失败: {}", e))?;

    Ok(AsyncTaskStats {
        total: row.try_get("total").unwrap_or(0),
        pending: row.try_get("pending").unwrap_or(0),
        in_progress: row.try_get("in_progress").unwrap_or(0),
        completed: row.try_get("completed").unwrap_or(0),
        failed: row.try_get("failed").unwrap_or(0),
        max_retries_exceeded: row.try_get("max_retries_exceeded").unwrap_or(0),
    })
}

/// 清理已完成的旧任务（软删除）
pub async fn cleanup_completed_tasks(
    pool: &PgPool,
    older_than_days: i64,
) -> Result<i64, String> {
    let result = sqlx::query(
        r#"
        UPDATE integration.async_tasks
        SET deleted_at = NOW()
        WHERE status IN ('completed', 'cancelled')
          AND completed_at < NOW() - INTERVAL '1 day' * $1
          AND deleted_at IS NULL
        "#,
    )
    .bind(older_than_days)
    .execute(pool)
    .await
    .map_err(|e| format!("清理旧任务失败: {}", e))?;

    Ok(result.rows_affected() as i64)
}

// ============================================================================
// 辅助函数
// ============================================================================

fn row_to_task(row: &sqlx::postgres::PgRow) -> AsyncTask {
    let status_str: String = row.try_get("status").unwrap_or_else(|_| "pending".to_string());

    AsyncTask {
        id: row.try_get("id").unwrap_or_else(|_| Uuid::nil()),
        tenant_id: row.try_get("tenant_id").ok(),
        task_type: row.try_get("task_type").unwrap_or_default(),
        source_service: row.try_get("source_service").ok(),
        target_service: row.try_get("target_service").ok(),
        payload: row.try_get("payload").unwrap_or(serde_json::json!({})),
        result_payload: row.try_get("result_payload").ok(),
        status: AsyncTaskStatus::from_str(&status_str),
        retry_count: row.try_get("retry_count").unwrap_or(0),
        max_retries: row.try_get("max_retries").unwrap_or(5),
        priority: row.try_get("priority").unwrap_or(0),
        scheduled_at: row.try_get("scheduled_at").unwrap_or_else(|_| Utc::now()),
        started_at: row.try_get("started_at").ok(),
        completed_at: row.try_get("completed_at").ok(),
        last_error: row.try_get("last_error").ok(),
        created_at: row.try_get("created_at").unwrap_or_else(|_| Utc::now()),
        updated_at: row.try_get("updated_at").unwrap_or_else(|_| Utc::now()),
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_async_task_status_as_str() {
        assert_eq!(AsyncTaskStatus::Pending.as_str(), "pending");
        assert_eq!(AsyncTaskStatus::InProgress.as_str(), "in_progress");
        assert_eq!(AsyncTaskStatus::Completed.as_str(), "completed");
        assert_eq!(AsyncTaskStatus::Failed.as_str(), "failed");
        assert_eq!(AsyncTaskStatus::MaxRetriesExceeded.as_str(), "max_retries_exceeded");
        assert_eq!(AsyncTaskStatus::Cancelled.as_str(), "cancelled");
    }

    #[test]
    fn test_async_task_status_from_str() {
        assert_eq!(AsyncTaskStatus::from_str("pending"), AsyncTaskStatus::Pending);
        assert_eq!(AsyncTaskStatus::from_str("in_progress"), AsyncTaskStatus::InProgress);
        assert_eq!(AsyncTaskStatus::from_str("completed"), AsyncTaskStatus::Completed);
        assert_eq!(AsyncTaskStatus::from_str("failed"), AsyncTaskStatus::Failed);
        assert_eq!(
            AsyncTaskStatus::from_str("max_retries_exceeded"),
            AsyncTaskStatus::MaxRetriesExceeded
        );
        assert_eq!(AsyncTaskStatus::from_str("cancelled"), AsyncTaskStatus::Cancelled);
        assert_eq!(AsyncTaskStatus::from_str("unknown"), AsyncTaskStatus::Pending);
    }

    #[test]
    fn test_create_async_task_request_defaults() {
        let req = CreateAsyncTaskRequest {
            tenant_id: None,
            task_type: "test_sync".to_string(),
            source_service: None,
            target_service: None,
            payload: serde_json::json!({"key": "value"}),
            max_retries: None,
            priority: None,
            scheduled_at: None,
        };
        assert_eq!(req.task_type, "test_sync");
        assert_eq!(req.max_retries, None);
        assert_eq!(req.priority, None);
    }

    #[test]
    fn test_async_task_stats_default() {
        let stats = AsyncTaskStats {
            total: 10,
            pending: 3,
            in_progress: 2,
            completed: 4,
            failed: 1,
            max_retries_exceeded: 0,
        };
        assert_eq!(stats.total, 10);
        assert_eq!(stats.pending, 3);
        assert_eq!(stats.completed, 4);
    }
}
