use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginatedResponse, PaginationParams};

#[derive(Debug, Clone, Deserialize, Serialize, sqlx::FromRow)]
pub struct WavePick {
    pub id: Uuid,
    pub wave_pick_number: String,
    pub wave_pick_type: String,
    pub warehouse_id: Uuid,
    pub warehouse_name: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub assigned_to: Option<Uuid>,
    pub assigned_user_name: Option<String>,
    pub batch_id: Option<Uuid>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub total_items: i64,
    pub picked_items: i64,
    pub total_quantity: f64,
    pub picked_quantity: f64,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateWavePickRequest {
    pub wave_pick_number: String,
    pub wave_pick_type: String,
    pub warehouse_id: Uuid,
    pub priority: Option<String>,
    pub batch_id: Option<Uuid>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AssignWavePickRequest {
    pub assigned_to: Uuid,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/wave-picks", get(list_wave_picks).post(create_wave_pick))
        .route(
            "/wave-picks/{id}",
            get(get_wave_pick)
                .put(update_wave_pick)
                .delete(delete_wave_pick),
        )
        .route("/wave-picks/{id}/items", get(list_wave_pick_items))
        .route("/wave-picks/{id}/assign", post(assign_wave_pick))
        .route("/wave-picks/{id}/start", post(start_wave_pick))
        .route("/wave-picks/{id}/complete", post(complete_wave_pick))
        .route("/wave-picks/{id}/cancel", post(cancel_wave_pick))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:wave:read"])),
    path = "/api/wms/wave-picks",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_wave_picks(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<WavePick>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, WavePick>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, wave_pick_number, wave_pick_type, warehouse_id, warehouse_name,
               status, priority, assigned_to, assigned_user_name, batch_id,
               start_time, end_time, total_items, picked_items,
               total_quantity, picked_quantity, remarks, created_at, updated_at
        FROM wms.wave_picks
        WHERE ($1::text IS NULL OR wave_pick_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(wave_picks) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.wave_picks
                WHERE ($1::text IS NULL OR wave_pick_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND deleted_at IS NULL
                "#
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            let total_pages = topems_shared_core::response::total_pages_of(total, page_size);

            Json(ApiResponse::success(
                PaginatedResponse {
                    items: wave_picks,
                    total,
                    page,
                    page_size,
                    total_pages,
                },
                "获取波次拣货列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取波次拣货列表失败: {}", e);
            Json(api_error(500, "获取波次拣货列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:wave:write"])),
    path = "/api/wms/wave-picks",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn create_wave_pick(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateWavePickRequest>,
) -> Json<ApiResponse<WavePick>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, WavePick>(
        only_own_schema_query!("wms", r#"
        INSERT INTO wms.wave_picks (id, org_id, wave_pick_number, wave_pick_type, 
                                    warehouse_id, status, priority, batch_id, remarks,
                                    total_items, picked_items, total_quantity, picked_quantity,
                                    created_at, updated_at)
        VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, $3, $4, 'pending', $5, $6, $7, 0, 0, 0, 0, $8, $9)
        RETURNING id, wave_pick_number, wave_pick_type, warehouse_id, warehouse_name,
                  status, priority, assigned_to, assigned_user_name, batch_id,
                  start_time, end_time, total_items, picked_items,
                  total_quantity, picked_quantity, remarks, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.wave_pick_number)
    .bind(&req.wave_pick_type)
    .bind(req.warehouse_id)
    .bind(&req.priority)
    .bind(req.batch_id)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(wave_pick) => (
            Json(ApiResponse::success(wave_pick.clone(), "波次拣货创建成功")),
            "success",
            None,
            serde_json::to_value(wave_pick).ok(),
        ),
        Err(e) => {
            tracing::error!("创建波次拣货失败: {}", e);
            (
                Json(api_error(500, "波次拣货创建失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "wave_pick".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:wave:read"])),
    path = "/api/wms/wave-picks/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn get_wave_pick(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<WavePick>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, WavePick>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, wave_pick_number, wave_pick_type, warehouse_id, warehouse_name,
               status, priority, assigned_to, assigned_user_name, batch_id,
               start_time, end_time, total_items, picked_items,
               total_quantity, picked_quantity, remarks, created_at, updated_at
        FROM wms.wave_picks
        WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(wave_pick)) => Json(ApiResponse::success(wave_pick, "获取波次拣货成功")),
        Ok(None) => Json(api_error(404, "波次拣货不存在")),
        Err(e) => {
            tracing::error!("获取波次拣货失败: {}", e);
            Json(api_error(500, "获取波次拣货失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:wave:write"])),
    path = "/api/wms/wave-picks/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn update_wave_pick(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<WavePick>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = Some(req.clone());
    let now = Utc::now();

    let priority: Option<String> = req
        .get("priority")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let remarks: Option<String> = req
        .get("remarks")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let result = sqlx::query_as::<_, WavePick>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.wave_picks SET
            priority = COALESCE($2, priority),
            remarks = COALESCE($3, remarks),
            updated_at = $4
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, wave_pick_number, wave_pick_type, warehouse_id, warehouse_name,
                  status, priority, assigned_to, assigned_user_name, batch_id,
                  start_time, end_time, total_items, picked_items,
                  total_quantity, picked_quantity, remarks, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(priority)
    .bind(remarks)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(wave_pick) => (
            Json(ApiResponse::success(wave_pick.clone(), "波次拣货更新成功")),
            "success",
            None,
            serde_json::to_value(wave_pick).ok(),
        ),
        Err(sqlx::Error::RowNotFound) => (
            Json(api_error(404, "波次拣货不存在")),
            "error",
            Some("波次拣货不存在".to_string()),
            None,
        ),
        Err(e) => {
            tracing::error!("更新波次拣货失败: {}", e);
            (
                Json(api_error(500, "更新波次拣货失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "wave_pick".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:wave:write"])),
    path = "/api/wms/wave-picks/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn delete_wave_pick(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        "UPDATE wms.wave_picks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            (
                Json(ApiResponse::success("".to_string(), "波次拣货删除成功")),
                "success",
                None,
                Some(serde_json::json!({ "rows_affected": r.rows_affected() })),
            )
        }
        Ok(_) => (
            Json(api_error(404, "波次拣货不存在")),
            "error",
            Some("波次拣货不存在".to_string()),
            None,
        ),
        Err(e) => {
            tracing::error!("删除波次拣货失败: {}", e);
            (
                Json(api_error(500, "删除波次拣货失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "wave_pick".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[derive(Debug, Clone, Deserialize, Serialize, sqlx::FromRow)]
pub struct WavePickItem {
    pub id: Uuid,
    pub wave_pick_id: Uuid,
    pub outbound_order_id: Option<Uuid>,
    pub outbound_order_number: Option<String>,
    pub material_code: String,
    pub material_name: String,
    pub location_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub planned_quantity: f64,
    pub picked_quantity: f64,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:wave:read"])),
    path = "/api/wms/wave-picks/{id}/items",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_wave_pick_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, WavePickItem>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, wave_pick_id, outbound_order_id, outbound_order_number,
               material_code, material_name, location_id, location_code,
               planned_quantity, picked_quantity, status, remarks,
               created_at, updated_at
        FROM wms.wave_pick_items
        WHERE wave_pick_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        "#
    ))
    .bind(id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let total = items.len() as i64;
            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total
                }),
                "获取波次拣货明细成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取波次拣货明细失败: {}", e);
            Json(api_error(500, "获取波次拣货明细失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:wave:write"])),
    path = "/api/wms/wave-picks/{id}/assign",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn assign_wave_pick(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<AssignWavePickRequest>,
) -> Json<ApiResponse<WavePick>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now();

    let result = sqlx::query_as::<_, WavePick>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.wave_picks SET
            assigned_to = $2,
            updated_at = $3
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, wave_pick_number, wave_pick_type, warehouse_id, warehouse_name,
                  status, priority, assigned_to, assigned_user_name, batch_id,
                  start_time, end_time, total_items, picked_items,
                  total_quantity, picked_quantity, remarks, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(req.assigned_to)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(wave_pick) => (
            Json(ApiResponse::success(wave_pick.clone(), "波次拣货分配成功")),
            "success",
            None,
            serde_json::to_value(wave_pick).ok(),
        ),
        Err(sqlx::Error::RowNotFound) => (
            Json(api_error(404, "波次拣货不存在")),
            "error",
            Some("波次拣货不存在".to_string()),
            None,
        ),
        Err(e) => {
            tracing::error!("分配波次拣货失败: {}", e);
            (
                Json(api_error(500, "分配波次拣货失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "assign".to_string(),
        "wave_pick".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:wave:write"])),
    path = "/api/wms/wave-picks/{id}/start",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn start_wave_pick(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<WavePick>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, WavePick>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.wave_picks SET
            status = 'picking',
            start_time = $2,
            updated_at = $3
        WHERE id = $1 AND deleted_at IS NULL AND status = 'pending'
        RETURNING id, wave_pick_number, wave_pick_type, warehouse_id, warehouse_name,
                  status, priority, assigned_to, assigned_user_name, batch_id,
                  start_time, end_time, total_items, picked_items,
                  total_quantity, picked_quantity, remarks, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(wave_pick) => (
            Json(ApiResponse::success(wave_pick.clone(), "波次拣货已开始")),
            "success",
            None,
            serde_json::to_value(wave_pick).ok(),
        ),
        Err(sqlx::Error::RowNotFound) => (
            Json(api_error(400, "波次拣货不存在或状态不允许开始")),
            "error",
            Some("波次拣货不存在或状态不允许开始".to_string()),
            None,
        ),
        Err(e) => {
            tracing::error!("开始波次拣货失败: {}", e);
            (
                Json(api_error(500, "开始波次拣货失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "start".to_string(),
        "wave_pick".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:wave:write"])),
    path = "/api/wms/wave-picks/{id}/complete",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn complete_wave_pick(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<WavePick>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, WavePick>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.wave_picks SET
            status = 'completed',
            end_time = $2,
            updated_at = $3
        WHERE id = $1 AND deleted_at IS NULL AND status = 'picking'
        RETURNING id, wave_pick_number, wave_pick_type, warehouse_id, warehouse_name,
                  status, priority, assigned_to, assigned_user_name, batch_id,
                  start_time, end_time, total_items, picked_items,
                  total_quantity, picked_quantity, remarks, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(wave_pick) => (
            Json(ApiResponse::success(wave_pick.clone(), "波次拣货已完成")),
            "success",
            None,
            serde_json::to_value(wave_pick).ok(),
        ),
        Err(sqlx::Error::RowNotFound) => (
            Json(api_error(400, "波次拣货不存在或状态不允许完成")),
            "error",
            Some("波次拣货不存在或状态不允许完成".to_string()),
            None,
        ),
        Err(e) => {
            tracing::error!("完成波次拣货失败: {}", e);
            (
                Json(api_error(500, "完成波次拣货失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "complete".to_string(),
        "wave_pick".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:wave:write"])),
    path = "/api/wms/wave-picks/{id}/cancel",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn cancel_wave_pick(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<WavePick>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, WavePick>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.wave_picks SET
            status = 'cancelled',
            updated_at = $2
        WHERE id = $1 AND deleted_at IS NULL AND status IN ('pending', 'picking')
        RETURNING id, wave_pick_number, wave_pick_type, warehouse_id, warehouse_name,
                  status, priority, assigned_to, assigned_user_name, batch_id,
                  start_time, end_time, total_items, picked_items,
                  total_quantity, picked_quantity, remarks, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(wave_pick) => (
            Json(ApiResponse::success(wave_pick.clone(), "波次拣货已取消")),
            "success",
            None,
            serde_json::to_value(wave_pick).ok(),
        ),
        Err(sqlx::Error::RowNotFound) => (
            Json(api_error(400, "波次拣货不存在或状态不允许取消")),
            "error",
            Some("波次拣货不存在或状态不允许取消".to_string()),
            None,
        ),
        Err(e) => {
            tracing::error!("取消波次拣货失败: {}", e);
            (
                Json(api_error(500, "取消波次拣货失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "cancel".to_string(),
        "wave_pick".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wave_pick_serialization() {
        let wave = WavePick {
            id: Uuid::nil(),
            wave_pick_number: "WP001".to_string(),
            wave_pick_type: "order".to_string(),
            warehouse_id: Uuid::nil(),
            warehouse_name: Some("主仓库".to_string()),
            status: "pending".to_string(),
            priority: Some("high".to_string()),
            assigned_to: None,
            assigned_user_name: None,
            batch_id: None,
            start_time: None,
            end_time: None,
            total_items: 10,
            picked_items: 0,
            total_quantity: 100.0,
            picked_quantity: 0.0,
            remarks: Some("测试波次".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_value(&wave).unwrap();
        assert_eq!(json["wave_pick_number"], "WP001");
        assert_eq!(json["wave_pick_type"], "order");
        assert_eq!(json["status"], "pending");
        assert_eq!(json["priority"], "high");
        assert_eq!(json["total_items"], 10);
        assert_eq!(json["picked_items"], 0);
        assert_eq!(json["total_quantity"], 100.0);
        assert_eq!(json["picked_quantity"], 0.0);
    }

    #[test]
    fn test_wave_pick_clone() {
        let wave = WavePick {
            id: Uuid::nil(),
            wave_pick_number: "WP002".to_string(),
            wave_pick_type: "batch".to_string(),
            warehouse_id: Uuid::nil(),
            warehouse_name: None,
            status: "in_progress".to_string(),
            priority: None,
            assigned_to: Some(Uuid::nil()),
            assigned_user_name: Some("张三".to_string()),
            batch_id: Some(Uuid::nil()),
            start_time: Some(Utc::now()),
            end_time: None,
            total_items: 5,
            picked_items: 3,
            total_quantity: 50.0,
            picked_quantity: 30.0,
            remarks: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let cloned = wave.clone();
        assert_eq!(wave.wave_pick_number, cloned.wave_pick_number);
        assert_eq!(wave.status, cloned.status);
        assert_eq!(wave.total_items, cloned.total_items);
        assert_eq!(wave.picked_items, cloned.picked_items);
    }

    #[test]
    fn test_create_wave_pick_request_serialization() {
        let request = CreateWavePickRequest {
            wave_pick_number: "WP003".to_string(),
            wave_pick_type: "order".to_string(),
            warehouse_id: Uuid::nil(),
            priority: Some("medium".to_string()),
            batch_id: None,
            remarks: Some("创建测试".to_string()),
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["wave_pick_number"], "WP003");
        assert_eq!(json["wave_pick_type"], "order");
        assert_eq!(json["priority"], "medium");
        assert!(json["batch_id"].is_null());
        assert_eq!(json["remarks"], "创建测试");
    }

    #[test]
    fn test_create_wave_pick_request_minimal() {
        let request = CreateWavePickRequest {
            wave_pick_number: "WP004".to_string(),
            wave_pick_type: "batch".to_string(),
            warehouse_id: Uuid::nil(),
            priority: None,
            batch_id: None,
            remarks: None,
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["wave_pick_number"], "WP004");
        assert_eq!(json["wave_pick_type"], "batch");
        assert!(json["priority"].is_null());
        assert!(json["remarks"].is_null());
    }

    #[test]
    fn test_create_wave_pick_request_deserialize() {
        let json = r#"{
            "wave_pick_number": "WP005",
            "wave_pick_type": "order",
            "warehouse_id": "00000000-0000-0000-0000-000000000000",
            "priority": "high",
            "remarks": "反序列化测试"
        }"#;
        let request: CreateWavePickRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.wave_pick_number, "WP005");
        assert_eq!(request.wave_pick_type, "order");
        assert_eq!(request.priority.as_deref(), Some("high"));
        assert_eq!(request.remarks.as_deref(), Some("反序列化测试"));
    }

    #[test]
    fn test_assign_wave_pick_request_serialization() {
        let request = AssignWavePickRequest {
            assigned_to: Uuid::nil(),
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["assigned_to"], "00000000-0000-0000-0000-000000000000");
    }

    #[test]
    fn test_assign_wave_pick_request_deserialize() {
        let json = r#"{"assigned_to": "00000000-0000-0000-0000-000000000000"}"#;
        let request: AssignWavePickRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.assigned_to, Uuid::nil());
    }

    #[test]
    fn test_wave_pick_item_serialization() {
        let item = WavePickItem {
            id: Uuid::nil(),
            wave_pick_id: Uuid::nil(),
            outbound_order_id: Some(Uuid::nil()),
            outbound_order_number: Some("OUT001".to_string()),
            material_code: "MAT001".to_string(),
            material_name: "测试物料".to_string(),
            location_id: Some(Uuid::nil()),
            location_code: Some("A-01-01".to_string()),
            planned_quantity: 10.0,
            picked_quantity: 5.0,
            status: "in_progress".to_string(),
            remarks: Some("部分拣货".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["material_code"], "MAT001");
        assert_eq!(json["material_name"], "测试物料");
        assert_eq!(json["planned_quantity"], 10.0);
        assert_eq!(json["picked_quantity"], 5.0);
        assert_eq!(json["status"], "in_progress");
        assert_eq!(json["outbound_order_number"], "OUT001");
    }

    #[test]
    fn test_wave_pick_item_clone() {
        let item = WavePickItem {
            id: Uuid::nil(),
            wave_pick_id: Uuid::nil(),
            outbound_order_id: None,
            outbound_order_number: None,
            material_code: "MAT002".to_string(),
            material_name: "简单物料".to_string(),
            location_id: None,
            location_code: None,
            planned_quantity: 20.0,
            picked_quantity: 0.0,
            status: "pending".to_string(),
            remarks: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let cloned = item.clone();
        assert_eq!(item.material_code, cloned.material_code);
        assert_eq!(item.planned_quantity, cloned.planned_quantity);
        assert_eq!(item.status, cloned.status);
    }
}
