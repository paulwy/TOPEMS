//! 移动端离线记录同步
//!
//! 从 unified-core 的 modules::sync::handlers（mobile_* 函数）迁移而来（2026-07 方案 C）。
//! 与既有的 offline_sync 模块互补：offline_sync 负责通用数据同步策略，
//! 本模块负责离线操作记录的 CRUD（上传、查询、标记完成、清理）。

use axum::extract::{Extension, Json, State};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::TopemsError;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;

fn tenant_filter(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    }
}

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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:offline:write"])),
    path = "/offline/records",
    responses((status = 200, description = "sync_records OK")),
    tag = "offline_records"
)]
pub async fn sync_records(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<MobileSyncRequest>,
) -> ApiResponse<MobileSyncResponse> {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库作用域创建失败");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return ApiResponse::server_error("数据库作用域创建失败");
        }
    };
    let mut success: Vec<String> = Vec::new();
    let mut failed: Vec<MobileSyncFailedItem> = Vec::new();

    // 写租户表必须显式带租户：缺失即报错，不兜底 nil。
    let Some(tenant_ctx) = topems_shared_auth::middleware::tenant::current_request_tenant() else {
        return ApiResponse::server_error("RLS context missing: 无租户上下文");
    };
    let tenant_id = tenant_ctx.tenant;

    for record in req.records {
        let user_id = Uuid::nil();

        match sqlx::query(only_own_schema_query!(
            "mobile",
            r#"
            INSERT INTO mobile.core_mobile_offline_records
            (id, tenant_id, user_id, module, action, data, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            ON CONFLICT (id) DO UPDATE SET data = $6, status = 'pending', updated_at = NOW()
            "#
        ))
        .bind(Uuid::parse_str(&record.id).unwrap_or_else(|_| Uuid::new_v4()))
        .bind(tenant_id)
        .bind(user_id)
        .bind(&record.module)
        .bind(&record.action)
        .bind(&record.data)
        .execute(&mut scope)
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

    let __mobile_response = {
        if failed.is_empty() {
            ApiResponse::success(response, "同步成功")
        } else {
            ApiResponse::success(response, "部分同步成功")
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 查询待同步的离线记录
#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:offline:write"])),
    path = "/offline/records/pending",
    responses((status = 200, description = "get_pending_records OK")),
    tag = "offline_records"
)]
pub async fn get_pending_records(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<serde_json::Value>> {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库作用域创建失败");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return ApiResponse::server_error("数据库作用域创建失败");
        }
    };
    let __mobile_response = {
        match sqlx::query(only_own_schema_query!(
            "mobile",
            r#"
        SELECT id, tenant_id, user_id, module, action, data, status,
               retry_count, max_retries, error_message, created_at, updated_at
        FROM mobile.core_mobile_offline_records
        WHERE status = 'pending'
        ORDER BY created_at ASC
        "#
        ))
        .fetch_all(&mut scope)
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
                ApiResponse::success(records, "查询成功")
            }
            Err(e) => {
                tracing::error!("查询离线记录失败: {}", e);
                ApiResponse::from(TopemsError::Internal("查询离线记录失败".to_string()))
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 标记单条离线记录为已同步
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:offline:write"])),
    path = "/offline/records/{record_id}/synced",
    responses((status = 200, description = "mark_synced OK")),
    tag = "offline_records"
)]
pub async fn mark_synced(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(record_id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库作用域创建失败");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return ApiResponse::server_error("数据库作用域创建失败");
        }
    };

    let __mobile_response = {
        match Uuid::parse_str(&record_id) {
            Ok(id) => {
                match sqlx::query(only_own_schema_query!(
                    "mobile",
                    r#"
                UPDATE mobile.core_mobile_offline_records
                SET status = 'synced', updated_at = NOW()
                WHERE id = $1 
                "#
                ))
                .bind(id)
                .execute(&mut scope)
                .await
                {
                    Ok(_) => ApiResponse::success((), "标记同步成功"),
                    Err(e) => {
                        tracing::error!("更新离线记录状态失败: {}", e);
                        ApiResponse::from(TopemsError::Internal("更新状态失败".to_string()))
                    }
                }
            }
            Err(_) => {
                ApiResponse::from(TopemsError::ValidationFailed("记录ID格式错误".to_string()))
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 清理所有已同步的离线记录
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mobile:offline:write"])),
    path = "/offline/records/synced/clear",
    responses((status = 200, description = "clear_synced OK")),
    tag = "offline_records"
)]
pub async fn clear_synced(
    Extension(claims): Extension<Claims>,
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<()> {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库作用域创建失败");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return ApiResponse::server_error("数据库作用域创建失败");
        }
    };
    let __mobile_response = {
        match sqlx::query(only_own_schema_query!(
            "mobile",
            r#"
        DELETE FROM mobile.core_mobile_offline_records
        WHERE status = 'synced' AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
        "#
        ))
        .bind(tenant_filter(&claims))
        .execute(&mut scope)
        .await
        {
            Ok(_) => ApiResponse::success((), "清理已同步记录成功"),
            Err(e) => {
                tracing::error!("清理已同步记录失败: {}", e);
                ApiResponse::from(TopemsError::Internal("清理失败".to_string()))
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
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
