//! 移动端离线记录同步
//!
//! 从 unified-core 的 modules::sync::handlers（mobile_* 函数）迁移而来（2026-07 方案 C）。
//! 与既有的 offline_sync 模块互补：offline_sync 负责通用数据同步策略，
//! 本模块负责离线操作记录的 CRUD（上传、查询、标记完成、清理）。

use axum::extract::{Json, State};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use topems_shared::ApiResponse;
use topems_shared_core::response::api_error;

#[derive(Debug, Deserialize, Serialize)]
pub struct MobileSyncRequest {
    pub records: Vec<MobileSyncRecordItem>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MobileSyncRecordItem {
    pub id: String,
    pub module: String,
    pub action: String,
    pub data: serde_json::Value,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MobileSyncResponse {
    pub success: Vec<String>,
    pub failed: Vec<MobileSyncFailedItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MobileSyncFailedItem {
    pub id: String,
    pub error: String,
}

/// 上传离线操作记录（批量）
pub async fn sync_records(
    State(pool): State<PgPool>,
    Json(req): Json<MobileSyncRequest>,
) -> Json<ApiResponse<MobileSyncResponse>> {
    let mut success: Vec<String> = Vec::new();
    let mut failed: Vec<MobileSyncFailedItem> = Vec::new();

    for record in req.records {
        let tenant_id = Uuid::nil();
        let user_id = Uuid::nil();

        match sqlx::query(
            r#"
            INSERT INTO core_mobile_offline_records
            (id, tenant_id, user_id, module, action, data, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            ON CONFLICT (id) DO UPDATE SET data = $6, status = 'pending', updated_at = NOW()
            "#,
        )
        .bind(Uuid::parse_str(&record.id).unwrap_or_else(|_| Uuid::new_v4()))
        .bind(tenant_id)
        .bind(user_id)
        .bind(&record.module)
        .bind(&record.action)
        .bind(&record.data)
        .execute(&pool)
        .await
        {
            Ok(_) => {
                success.push(record.id);
            }
            Err(e) => {
                tracing::error!("保存离线记录失败: {}", e);
                failed.push(MobileSyncFailedItem {
                    id: record.id,
                    error: e.to_string(),
                });
            }
        }
    }

    let response = MobileSyncResponse {
        success,
        failed: failed.clone(),
    };

    if failed.is_empty() {
        Json(ApiResponse::success(response, "同步成功"))
    } else {
        Json(ApiResponse::success(response, "部分同步成功"))
    }
}

/// 查询待同步的离线记录
pub async fn get_pending_records(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match sqlx::query(
        r#"
        SELECT id, tenant_id, user_id, module, action, data, status,
               retry_count, max_retries, error_message, created_at, updated_at
        FROM core_mobile_offline_records
        WHERE status = 'pending'
        ORDER BY created_at ASC
        "#,
    )
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => {
            let records: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.get::<Uuid, _>("id"),
                        "tenant_id": row.get::<Uuid, _>("tenant_id"),
                        "user_id": row.get::<Uuid, _>("user_id"),
                        "module": row.get::<String, _>("module"),
                        "action": row.get::<String, _>("action"),
                        "data": row.get::<serde_json::Value, _>("data"),
                        "status": row.get::<String, _>("status"),
                        "retry_count": row.get::<i32, _>("retry_count"),
                        "max_retries": row.get::<i32, _>("max_retries"),
                        "error_message": row.get::<Option<String>, _>("error_message"),
                        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                        "updated_at": row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
                    })
                })
                .collect();
            Json(ApiResponse::success(records, "查询成功"))
        }
        Err(e) => {
            tracing::error!("查询离线记录失败: {}", e);
            Json(api_error(500, "查询离线记录失败"))
        }
    }
}

/// 标记单条离线记录为已同步
pub async fn mark_synced(
    State(pool): State<PgPool>,
    axum::extract::Path(record_id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    match Uuid::parse_str(&record_id) {
        Ok(id) => {
            match sqlx::query(
                r#"
                UPDATE core_mobile_offline_records
                SET status = 'synced', updated_at = NOW()
                WHERE id = $1
                "#,
            )
            .bind(id)
            .execute(&pool)
            .await
            {
                Ok(_) => Json(ApiResponse::success((), "标记同步成功")),
                Err(e) => {
                    tracing::error!("更新离线记录状态失败: {}", e);
                    Json(api_error(500, "更新状态失败"))
                }
            }
        }
        Err(_) => Json(api_error(400, "记录ID格式错误")),
    }
}

/// 清理所有已同步的离线记录
pub async fn clear_synced(State(pool): State<PgPool>) -> Json<ApiResponse<()>> {
    match sqlx::query(
        r#"
        DELETE FROM core_mobile_offline_records
        WHERE status = 'synced'
        "#,
    )
    .execute(&pool)
    .await
    {
        Ok(_) => Json(ApiResponse::success((), "清理已同步记录成功")),
        Err(e) => {
            tracing::error!("清理已同步记录失败: {}", e);
            Json(api_error(500, "清理失败"))
        }
    }
}

/// 初始化离线记录表（从 unified-core 迁移）
pub async fn init_database(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_mobile_offline_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            user_id UUID NOT NULL,
            module VARCHAR(64) NOT NULL,
            action VARCHAR(64) NOT NULL,
            data JSONB NOT NULL,
            status VARCHAR(32) DEFAULT 'pending',
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_mobile_offline_status ON core_mobile_offline_records(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_mobile_offline_user ON core_mobile_offline_records(user_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_mobile_offline_module ON core_mobile_offline_records(module)")
        .execute(pool)
        .await?;

    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
// roundtrip verified by JSON comparison
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn mobile_sync_failed_item_roundtrip() {
        roundtrip(&MobileSyncFailedItem {
            id: "rec1".into(),
            error: "timeout".into(),
        });
    }

    #[test]
    fn mobile_sync_record_item_roundtrip() {
        roundtrip(&MobileSyncRecordItem {
            id: "rec1".into(),
            module: "task".into(),
            action: "create".into(),
            data: serde_json::json!({"x":1}),
            created_at: 1700000000,
        });
    }

    #[test]
    fn mobile_sync_request_roundtrip() {
        roundtrip(&MobileSyncRequest {
            records: vec![MobileSyncRecordItem {
                id: "1".into(),
                module: "t".into(),
                action: "a".into(),
                data: serde_json::json!({}),
                created_at: 0,
            }],
        });
    }

    #[test]
    fn mobile_sync_response_roundtrip() {
        roundtrip(&MobileSyncResponse {
            success: vec!["1".into()],
            failed: vec![MobileSyncFailedItem {
                id: "2".into(),
                error: "e".into(),
            }],
        });
    }

}
