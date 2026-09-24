//! 询价管理（P2 更多模块业务 API）：询价单 CRUD + 发布/关闭状态流转
//! 数据源：srm.inquiries（event_handlers 写入，收敛自 srm_inquiries）
//! 走 RLS txn（tenant_middleware 注入）

use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use std::sync::Arc;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

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
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router, anyhow::Error> {
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

async fn current_tenant_id(claims: &Claims) -> Option<Uuid> {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        SELECT id, inquiry_no, title, description, status, creator, tenant_id,
               created_at, updated_at
        FROM srm.inquiries
        WHERE ($1::text IS NULL OR inquiry_no ILIKE $1 OR title ILIKE $1)
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
                WHERE ($1::text IS NULL OR inquiry_no ILIKE $1 OR title ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND deleted_at IS NULL
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "询价单列表获取成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取询价单列表失败: {}", e);
            Json(api_error(500, "获取询价单列表失败"))
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Inquiry>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        SELECT id, inquiry_no, title, description, status, creator, tenant_id,
               created_at, updated_at
        FROM srm.inquiries
        WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(inquiry)) => Json(ApiResponse::success(inquiry, "询价单获取成功")),
        Ok(None) => Json(api_error(404, "询价单不存在")),
        Err(e) => {
            tracing::error!("获取询价单失败: {}", e);
            Json(api_error(500, "获取询价单失败"))
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateInquiryRequest>,
) -> Json<ApiResponse<Inquiry>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = current_tenant_id(&claims).await.unwrap_or_else(Uuid::nil);
    let creator = Uuid::parse_str(&claims.sub).unwrap_or_else(|_| Uuid::nil());
    let inquiry_no = format!("INQ-{}-{:04}", Utc::now().format("%Y%m%d"), rand_no());

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
    .bind(req.status.unwrap_or_else(|| "draft".to_string()))
    .bind(creator)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(inquiry) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("询价单事务提交失败: {}", e);
                    return Json(api_error(500, "询价单创建失败"));
                }
            }
            Json(ApiResponse::success(inquiry, "询价单创建成功"))
        }
        Err(e) => {
            tracing::error!("创建询价单失败: {}", e);
            Json(api_error(500, "创建询价单失败"))
        }
    }
}

pub async fn update_inquiry(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateInquiryRequest>,
) -> Json<ApiResponse<Inquiry>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        UPDATE srm.inquiries
        SET title = COALESCE($2, title),
            description = COALESCE($3, description),
            status = COALESCE($4, status),
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, inquiry_no, title, description, status, creator, tenant_id,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.status)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(inquiry)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("询价单更新事务提交失败: {}", e);
                    return Json(api_error(500, "询价单更新失败"));
                }
            }
            Json(ApiResponse::success(inquiry, "询价单更新成功"))
        }
        Ok(None) => Json(api_error(404, "询价单不存在")),
        Err(e) => {
            tracing::error!("更新询价单失败: {}", e);
            Json(api_error(500, "更新询价单失败"))
        }
    }
}

pub async fn delete_inquiry(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
                    return Json(api_error(500, "询价单删除失败"));
                }
            }
            Json(ApiResponse::success(
                serde_json::json!({"id": id}),
                "询价单删除成功",
            ))
        }
        Ok(_) => Json(api_error(404, "询价单不存在")),
        Err(e) => {
            tracing::error!("删除询价单失败: {}", e);
            Json(api_error(500, "删除询价单失败"))
        }
    }
}

pub async fn publish_inquiry(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Inquiry>> {
    transition_inquiry(id, "published", &["draft", "closed"], "发布", txn_arc).await
}

pub async fn close_inquiry(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Inquiry>> {
    transition_inquiry(id, "closed", &["published"], "关闭", txn_arc).await
}

async fn transition_inquiry(
    id: Uuid,
    target_status: &str,
    allowed_from: &[&str],
    action: &str,
    txn_arc: std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
) -> Json<ApiResponse<Inquiry>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM srm.inquiries WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let current = match current {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "询价单不存在")),
        Err(e) => {
            tracing::error!("查询询价单状态失败: {}", e);
            return Json(api_error(500, "询价单状态查询失败"));
        }
    };

    if !allowed_from.contains(&current.as_str()) {
        return Json(api_error(
            400,
            &format!("当前状态 {} 不允许{}", current, action),
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
    .bind(target_status)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(inquiry) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("询价单{}事务提交失败: {}", action, e);
                    return Json(api_error(500, &format!("询价单{}失败", action)));
                }
            }
            Json(ApiResponse::success(
                inquiry,
                &format!("询价单{}成功", action),
            ))
        }
        Err(e) => {
            tracing::error!("询价单{}失败: {}", action, e);
            Json(api_error(500, &format!("询价单{}失败", action)))
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
