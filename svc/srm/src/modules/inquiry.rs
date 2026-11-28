//! 询价管理（P2 更多模块业务 API）：询价单 CRUD + 发布/关闭状态流转
//! 数据源：srm.inquiries（event_handlers 写入，收敛自 srm_inquiries）
//! 走 RLS txn（tenant_middleware 注入）

use crate::modules::inquiry_status::InquiryStatus;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::sync::Arc;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::error::Result;
use topems_shared_core::TopemsError;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListInquiryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Inquiry {
    pub id: Uuid,
    pub inquiry_no: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: String,
    pub creator: Option<Uuid>,
    pub tenant_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInquiryRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInquiryRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}

pub struct AppState {
    pub db: Db,
}

pub async fn create_routes(db: Db) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/inquiries", get(list_inquiries).post(create_inquiry))
        .route(
            "/inquiries/{id}",
            get(get_inquiry).put(update_inquiry).delete(delete_inquiry),
        )
        .route("/inquiries/{id}/publish", post(publish_inquiry))
        .route("/inquiries/{id}/close", post(close_inquiry))
        .with_state(state);

    Ok(app)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:inquiry:read"])),
    path = "/inquiries",
    responses(
        (status = 200, description = "list_inquiries OK")
    ),
    tag = "SRM/inquiry"
)]
pub async fn list_inquiries(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<ListInquiryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = match params.status.as_deref() {
        Some(raw) => match InquiryStatus::from_db_str(raw) {
            Some(s) => Some(s.as_db_str().to_string()),
            None => return ApiResponse::bad_request("无效的询价单状态过滤值"),
        },
        None => None,
    };

    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        SELECT id, inquiry_no, title, description, status, creator, tenant_id,
               created_at, updated_at
        FROM srm.inquiries
        WHERE status IN ('draft','published','in_progress','closed','awarded','cancelled')
          AND ($1::text IS NULL OR inquiry_no ILIKE $1 OR title ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let total = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM srm.inquiries
                WHERE status IN ('draft','published','in_progress','closed','awarded','cancelled')
                  AND ($1::text IS NULL OR inquiry_no ILIKE $1 OR title ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND deleted_at IS NULL
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "询价单列表获取成功",
            )
        }
        Err(e) => {
            tracing::error!("获取询价单列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取询价单列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:inquiry:read"])),
    path = "/inquiries/{id}",
    responses(
        (status = 200, description = "get_inquiry OK")
    ),
    tag = "SRM/inquiry"
)]
pub async fn get_inquiry(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Inquiry> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        SELECT id, inquiry_no, title, description, status, creator, tenant_id,
               created_at, updated_at
        FROM srm.inquiries
        WHERE id = $1 AND deleted_at IS NULL
          AND status IN ('draft','published','in_progress','closed','awarded','cancelled')
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(inquiry)) => ApiResponse::success(inquiry, "询价单获取成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("询价单不存在".to_string())),
        Err(e) => {
            tracing::error!("获取询价单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取询价单失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:inquiry:write"])),
    path = "/inquiries",
    responses(
        (status = 200, description = "create_inquiry OK")
    ),
    tag = "SRM/inquiry"
)]
pub async fn create_inquiry(
    State(_state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateInquiryRequest>,
) -> ApiResponse<Inquiry> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let creator = match claims.user_id() {
        Ok(u) => u,
        Err(_) => return ApiResponse::forbidden("无效的用户身份"),
    };
    let inquiry_no = format!("INQ-{}-{:04}", Utc::now().format("%Y%m%d"), rand_no());
    let initial_status = match req.status.as_deref() {
        Some(raw) => match InquiryStatus::from_db_str(raw) {
            Some(s) => s,
            None => return ApiResponse::bad_request("无效的询价单状态"),
        },
        None => InquiryStatus::DEFAULT,
    };

    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        INSERT INTO srm.inquiries (inquiry_no, title, description, status, creator, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, inquiry_no, title, description, status, creator, tenant_id,
                  created_at, updated_at
        "#,
    )
    .bind(inquiry_no)
    .bind(&req.title)
    .bind(&req.description)
    .bind(initial_status.as_db_str())
    .bind(creator)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(inquiry) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("询价单事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("询价单创建失败".to_string()));
                }
            }
            ApiResponse::success(inquiry, "询价单创建成功")
        }
        Err(e) => {
            tracing::error!("创建询价单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建询价单失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["srm:inquiry:write"])),
    path = "/inquiries/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/inquiry"
)]
pub async fn update_inquiry(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateInquiryRequest>,
) -> ApiResponse<Inquiry> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let next_status = match req.status.as_deref() {
        Some(raw) => match InquiryStatus::from_db_str(raw) {
            Some(s) => Some(s.as_db_str()),
            None => return ApiResponse::bad_request("无效的询价单状态"),
        },
        None => None,
    };

    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        UPDATE srm.inquiries
        SET title = COALESCE($2, title),
            description = COALESCE($3, description),
            status = COALESCE($4, status),
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
          AND status IN ('draft','published','in_progress','closed','awarded','cancelled')
        RETURNING id, inquiry_no, title, description, status, creator, tenant_id,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(next_status)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(inquiry)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("询价单更新事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("询价单更新失败".to_string()));
                }
            }
            ApiResponse::success(inquiry, "询价单更新成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("询价单不存在".to_string())),
        Err(e) => {
            tracing::error!("更新询价单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新询价单失败".to_string()))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["srm:inquiry:write"])),
    path = "/inquiries/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/inquiry"
)]
pub async fn delete_inquiry(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let result = sqlx::query(
        "UPDATE srm.inquiries SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("询价单删除事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("询价单删除失败".to_string()));
                }
            }
            ApiResponse::success(serde_json::json!({"id": id}), "询价单删除成功")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("询价单不存在".to_string())),
        Err(e) => {
            tracing::error!("删除询价单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除询价单失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:inquiry:write"])),
    path = "/inquiries/{id}/publish",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/inquiry"
)]
pub async fn publish_inquiry(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Inquiry> {
    transition_inquiry(
        id,
        InquiryStatus::Published,
        InquiryStatus::publish_from(),
        "发布",
        txn_arc,
    )
    .await
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:inquiry:write"])),
    path = "/inquiries/{id}/close",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/inquiry"
)]
pub async fn close_inquiry(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Inquiry> {
    transition_inquiry(
        id,
        InquiryStatus::Closed,
        InquiryStatus::close_from(),
        "关闭",
        txn_arc,
    )
    .await
}

async fn transition_inquiry(
    id: Uuid,
    target_status: InquiryStatus,
    allowed_from: &[&str],
    action: &str,
    txn_arc: RlsTxnCell,
) -> ApiResponse<Inquiry> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM srm.inquiries WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let current = match current {
        Ok(Some(s)) => s,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("询价单不存在".to_string()))
        }
        Err(e) => {
            tracing::error!("查询询价单状态失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("询价单状态查询失败".to_string()));
        }
    };

    if !allowed_from.contains(&current.as_str()) {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "当前状态不允许执行该操作".to_string(),
        ));
    }

    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        UPDATE srm.inquiries
        SET status = $2, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, inquiry_no, title, description, status, creator, tenant_id,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(target_status.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(inquiry) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("询价单{}事务提交失败: {}", action, e);
                    return ApiResponse::from(TopemsError::Internal("询价单操作失败".to_string()));
                }
            }
            ApiResponse::success(inquiry, &format!("询价单{}成功", action))
        }
        Err(e) => {
            tracing::error!("询价单{}失败: {}", action, e);
            ApiResponse::from(TopemsError::Internal("询价单操作失败".to_string()))
        }
    }
}

fn rand_no() -> u32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    nanos % 10000
}
