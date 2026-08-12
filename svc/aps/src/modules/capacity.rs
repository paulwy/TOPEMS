use axum::{
    extract::FromRef,
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::middleware::tenant::get_tenant_id;
use crate::modules::ApiState;
use crate::shared::fsm::{capacity_can_transition, capacity_requires_approval};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};
use utoipa::ToSchema;

/// 审批请求体
#[derive(Debug, Deserialize)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Capacity {
    pub id: Uuid,
    pub work_center_id: Uuid,
    pub work_center_name: Option<String>,
    pub capacity_date: Option<NaiveDate>,
    pub available_hours: Option<sqlx::types::BigDecimal>,
    pub used_hours: Option<sqlx::types::BigDecimal>,
    pub utilization_rate: Option<sqlx::types::BigDecimal>,
    pub status: String,
    pub tenant_id: Option<Uuid>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateCapacityRequest {
    pub work_center_id: Uuid,
    pub work_center_name: Option<String>,
    pub capacity_date: Option<NaiveDate>,
    pub available_hours: Option<f64>,
    pub used_hours: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateCapacityRequest {
    pub work_center_name: Option<String>,
    pub capacity_date: Option<NaiveDate>,
    pub available_hours: Option<f64>,
    pub used_hours: Option<f64>,
    pub status: Option<String>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/capacities", get(list_capacities).post(create_capacity))
        .route(
            "/capacities/{id}",
            get(get_capacity)
                .put(update_capacity)
                .delete(delete_capacity),
        )
        .route("/capacities/{id}/submit", post(submit_capacity))
        .route("/capacities/{id}/allocate", post(allocate_capacity))
        .route("/capacities/{id}/release", post(release_capacity))
}

#[utoipa::path(
    get,
    path = "/api/aps/capacities",
    responses(
        (status = 200, description = "list_capacities OK")
    ),
    tag = "APS - Capacity"
)]
pub async fn list_capacities(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Query(params): axum::extract::Query<PaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Capacity>(
        r#"
        SELECT id, work_center_id, work_center_name, capacity_date, available_hours,
               used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_capacities
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR work_center_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(capacities) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_aps.aps_capacities
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR work_center_name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let response_data = serde_json::json!({
                "capacities": capacities,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            Json(ApiResponse::success(response_data, "获取产能列表成功"))
        }
        Err(e) => {
            tracing::error!("获取产能列表失败: {}", e);
            Json(api_error(500, "获取产能列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/aps/capacities/{id}",
    params(
        ("id" = Uuid, Path, description = "产能 ID")
    ),
    responses(
        (status = 200, description = "get_capacity OK")
    ),
    tag = "APS - Capacity"
)]
pub async fn get_capacity(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Capacity>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Capacity>(
        r#"
        SELECT id, work_center_id, work_center_name, capacity_date, available_hours,
               used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_capacities
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(capacity)) => Json(ApiResponse::success(capacity, "获取产能成功")),
        Ok(None) => Json(api_error(404, "产能不存在")),
        Err(e) => {
            tracing::error!("获取产能失败: {}", e);
            Json(api_error(500, "获取产能失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/aps/capacities",
    request_body = CreateCapacityRequest,
    responses(
        (status = 200, description = "create_capacity OK")
    ),
    tag = "APS - Capacity"
)]
pub async fn create_capacity(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<CreateCapacityRequest>,
) -> Json<ApiResponse<Capacity>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);
    let status = req.status.unwrap_or_else(|| "available".to_string());
    let available_hours: Option<sqlx::types::BigDecimal> = req
        .available_hours
        .and_then(|v| sqlx::types::BigDecimal::try_from(v).ok());
    let used_hours: Option<sqlx::types::BigDecimal> = req
        .used_hours
        .and_then(|v| sqlx::types::BigDecimal::try_from(v).ok());

    let result = sqlx::query_as::<_, Capacity>(
        r#"
        INSERT INTO plugin_aps.aps_capacities
            (id, work_center_id, work_center_name, capacity_date, available_hours,
             used_hours, utilization_rate, status, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10)
        RETURNING id, work_center_id, work_center_name, capacity_date, available_hours,
                  used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.work_center_id)
    .bind(&req.work_center_name)
    .bind(req.capacity_date)
    .bind(&available_hours)
    .bind(&used_hours)
    .bind(&status)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(capacity) => Json(ApiResponse::success(capacity, "产能创建成功")),
        Err(e) => {
            tracing::error!("创建产能失败: {}", e);
            Json(api_error(500, "创建产能失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/aps/capacities/{id}",
    request_body = UpdateCapacityRequest,
    params(
        ("id" = Uuid, Path, description = "产能 ID")
    ),
    responses(
        (status = 200, description = "update_capacity OK")
    ),
    tag = "APS - Capacity"
)]
pub async fn update_capacity(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<UpdateCapacityRequest>,
) -> Json<ApiResponse<Capacity>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Capacity>(
        r#"
        SELECT id, work_center_id, work_center_name, capacity_date, available_hours,
               used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_capacities
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "产能不存在")),
        Err(e) => return Json(api_error(500, &format!("查询产能失败: {}", e))),
    };

    let work_center_name = req.work_center_name.or(existing.work_center_name);
    let capacity_date = req.capacity_date.or(existing.capacity_date);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let available_hours: Option<sqlx::types::BigDecimal> = match req.available_hours {
        Some(v) => sqlx::types::BigDecimal::try_from(v).ok(),
        None => existing.available_hours,
    };
    let used_hours: Option<sqlx::types::BigDecimal> = match req.used_hours {
        Some(v) => sqlx::types::BigDecimal::try_from(v).ok(),
        None => existing.used_hours,
    };

    let result = sqlx::query_as::<_, Capacity>(
        r#"
        UPDATE plugin_aps.aps_capacities SET
            work_center_name = $2, capacity_date = $3, available_hours = $4,
            used_hours = $5, utilization_rate = CASE WHEN $4 IS NULL OR $4 = 0 THEN 0 ELSE $5 / $4 END,
            status = $6, updated_at = $7
        WHERE id = $1 AND tenant_id = $8
        RETURNING id, work_center_id, work_center_name, capacity_date, available_hours,
                  used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&work_center_name)
    .bind(capacity_date)
    .bind(&available_hours)
    .bind(&used_hours)
    .bind(&status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(capacity) => Json(ApiResponse::success(capacity, "产能更新成功")),
        Err(e) => {
            tracing::error!("更新产能失败: {}", e);
            Json(api_error(500, "更新产能失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/aps/capacities/{id}",
    params(
        ("id" = Uuid, Path, description = "产能 ID")
    ),
    responses(
        (status = 200, description = "delete_capacity OK")
    ),
    tag = "APS - Capacity"
)]
pub async fn delete_capacity(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result =
        sqlx::query("DELETE FROM plugin_aps.aps_capacities WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.db)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "产能删除成功"))
        }
        Ok(_) => Json(api_error(404, "产能不存在")),
        Err(e) => {
            tracing::error!("删除产能失败: {}", e);
            Json(api_error(500, "删除产能失败"))
        }
    }
}

/// APV-3: 提交分配申请 (no state change, just flag for allocation)
pub async fn submit_capacity(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<ApprovalRequest>,
) -> Json<ApiResponse<Capacity>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Capacity>(
        r#"
        SELECT id, work_center_id, work_center_name, capacity_date, available_hours,
               used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_capacities
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(capacity)) => {
            tracing::info!(
                "产能 {} 提交分配申请 (操作人: {}, 备注: {:?})",
                id,
                req.operator,
                req.comment
            );
            Json(ApiResponse::success(capacity, "产能已提交分配申请"))
        }
        Ok(None) => Json(api_error(404, "产能不存在")),
        Err(e) => {
            tracing::error!("查询产能失败: {}", e);
            Json(api_error(500, "查询产能失败"))
        }
    }
}

/// APV-3: 分配产能 (available → allocated, approve allocation)
pub async fn allocate_capacity(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<ApprovalRequest>,
) -> Json<ApiResponse<Capacity>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let target_status = "allocated";

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM plugin_aps.aps_capacities WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let current_status = match current {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "产能不存在")),
        Err(e) => return Json(api_error(500, &format!("查询产能失败: {}", e))),
    };

    if !capacity_requires_approval(&current_status, target_status) {
        return Json(api_error(400, "当前状态不需要审批分配"));
    }
    if let Err(e) = capacity_can_transition(&current_status, target_status) {
        return Json(api_error(400, &format!("当前状态不允许分配: {}", e)));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, Capacity>(
        r#"
        UPDATE plugin_aps.aps_capacities SET status = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
        RETURNING id, work_center_id, work_center_name, capacity_date, available_hours,
                  used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(target_status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(capacity) => {
            tracing::info!(
                "产能 {} 分配审批通过: {} -> {} (操作人: {}, 备注: {:?})",
                id,
                current_status,
                target_status,
                req.operator,
                req.comment
            );
            Json(ApiResponse::success(capacity, "产能已分配"))
        }
        Err(e) => {
            tracing::error!("分配产能失败: {}", e);
            Json(api_error(500, "分配产能失败"))
        }
    }
}

/// APV-3: 释放产能 (allocated → released, release allocation)
pub async fn release_capacity(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<ApprovalRequest>,
) -> Json<ApiResponse<Capacity>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let target_status = "released";

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM plugin_aps.aps_capacities WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let current_status = match current {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "产能不存在")),
        Err(e) => return Json(api_error(500, &format!("查询产能失败: {}", e))),
    };

    if let Err(e) = capacity_can_transition(&current_status, target_status) {
        return Json(api_error(400, &format!("当前状态不允许释放: {}", e)));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, Capacity>(
        r#"
        UPDATE plugin_aps.aps_capacities SET status = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
        RETURNING id, work_center_id, work_center_name, capacity_date, available_hours,
                  used_hours, utilization_rate, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(target_status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(capacity) => {
            tracing::info!(
                "产能 {} 已释放: {} -> {} (操作人: {}, 备注: {:?})",
                id,
                current_status,
                target_status,
                req.operator,
                req.comment
            );
            Json(ApiResponse::success(capacity, "产能已释放"))
        }
        Err(e) => {
            tracing::error!("释放产能失败: {}", e);
            Json(api_error(500, "释放产能失败"))
        }
    }
}
