//! WIP (Work In Progress) handlers

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use std::str::FromStr;
use topems_shared::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::shared::utils::big_decimal_to_f64;

use crate::AppState;
use topems_shared::response::ApiResponse;
use utoipa::ToSchema;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/wips", get(list_wips).post(create_wip))
        .route(
            "/wips/{id}",
            get(get_wip).put(update_wip).delete(delete_wip),
        )
        .route("/wips/transfer", post(transfer_wip))
        .route("/wips/{wip_id}/transfers", get(list_wip_transfers))
        .route("/wips/statistics", get(get_wip_statistics))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListWipsQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WipResponse {
    pub id: Uuid,
    pub wip_no: String,
    pub order_id: Option<Uuid>,
    pub order_no: Option<String>,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub current_process_id: Option<Uuid>,
    pub current_process_name: Option<String>,
    pub current_work_station_id: Option<Uuid>,
    pub current_work_station_name: Option<String>,
    pub status: String,
    pub batch_no: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub last_transfer_time: Option<DateTime<Utc>>,
    pub operator: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WipTransferResponse {
    pub id: Uuid,
    pub transfer_no: String,
    pub wip_id: Uuid,
    pub from_process_id: Option<Uuid>,
    pub from_process_name: Option<String>,
    pub from_work_station_id: Option<Uuid>,
    pub from_work_station_name: Option<String>,
    pub to_process_id: Option<Uuid>,
    pub to_process_name: Option<String>,
    pub to_work_station_id: Option<Uuid>,
    pub to_work_station_name: Option<String>,
    pub quantity: f64,
    pub transfer_time: DateTime<Utc>,
    pub operator: Option<String>,
    pub transfer_type: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WipStatisticsResponse {
    pub total_wip: i64,
    pub total_quantity: f64,
    pub by_status: Vec<WipStatusCount>,
    pub by_process: Vec<WipProcessCount>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WipStatusCount {
    pub status: String,
    pub count: i64,
    pub quantity: f64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WipProcessCount {
    pub process_id: Option<Uuid>,
    pub process_name: String,
    pub count: i64,
    pub quantity: f64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ListWipResponse {
    pub wips: Vec<WipResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateWipRequest {
    pub order_id: Option<Uuid>,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub process_id: Option<Uuid>,
    pub work_station_id: Option<Uuid>,
    pub batch_no: Option<String>,
    pub operator: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateWipTransferRequest {
    pub wip_id: Uuid,
    pub from_process_id: Option<Uuid>,
    pub from_work_station_id: Option<Uuid>,
    pub to_process_id: Option<Uuid>,
    pub to_work_station_id: Option<Uuid>,
    pub quantity: f64,
    pub transfer_type: Option<String>,
    pub operator: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateWipRequest {
    pub quantity: Option<f64>,
    pub status: Option<String>,
    pub batch_no: Option<String>,
    pub notes: Option<String>,
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<DateTime<Utc>>) -> Option<DateTime<Utc>> {
    dt
}

// ==================== WIP Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/wips",
    tag = "WIP",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("page_size" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "WIP列表", body = ApiResponse<ListWipResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_wips(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListWipsQuery>,
) -> Json<ApiResponse<ListWipResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WipRead).await {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE w.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE (w.wip_no ILIKE $1 OR w.order_no ILIKE $1 OR w.product_name ILIKE $1 OR w.product_code ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (w.wip_no ILIKE ${} OR w.order_no ILIKE ${} OR w.product_name ILIKE ${} OR w.product_code ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!("SELECT COUNT(*) as total FROM wips w{}", where_clause);

    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count WIPs: {}", e);
            return Json(ApiResponse::error(500, "获取WIP列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            w.id, w.wip_no, w.order_id, w.order_no,
            w.product_id, w.product_name, w.product_code,
            w.quantity, w.current_process_id, w.current_work_station_id,
            w.status, w.batch_no, w.start_time, w.last_transfer_time,
            w.operator, w.notes, w.created_at, w.updated_at,
            pp.process_name as process_name,
            ws.station_name as work_station_name
        FROM wips w
        LEFT JOIN production_processes pp ON w.current_process_id = pp.id
        LEFT JOIN work_stations ws ON w.current_work_station_id = ws.id
        {}
        ORDER BY w.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    let wips = match fetch_query.fetch_all(&state.pool).await {
        Ok(w) => w,
        Err(e) => {
            tracing::error!("Failed to fetch WIP list: {}", e);
            return Json(ApiResponse::error(500, "获取WIP列表失败"));
        }
    };

    let wip_list: Vec<WipResponse> = wips
        .into_iter()
        .map(|r| WipResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            wip_no: r.try_get::<String, _>("wip_no").unwrap_or_default(),
            order_id: r.try_get::<Option<Uuid>, _>("order_id").ok().flatten(),
            order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
            product_id: r.try_get::<Option<Uuid>, _>("product_id").ok().flatten(),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity")
                    .ok()
                    .flatten(),
            ),
            current_process_id: r
                .try_get::<Option<Uuid>, _>("current_process_id")
                .ok()
                .flatten(),
            current_process_name: r
                .try_get::<Option<String>, _>("process_name")
                .ok()
                .flatten(),
            current_work_station_id: r
                .try_get::<Option<Uuid>, _>("current_work_station_id")
                .ok()
                .flatten(),
            current_work_station_name: r
                .try_get::<Option<String>, _>("work_station_name")
                .ok()
                .flatten(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "in_progress".to_string()),
            batch_no: r.try_get::<Option<String>, _>("batch_no").ok().flatten(),
            start_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("start_time")
                    .ok()
                    .flatten(),
            ),
            last_transfer_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("last_transfer_time")
                    .ok()
                    .flatten(),
            ),
            operator: r.try_get::<Option<String>, _>("operator").ok().flatten(),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
            created_at: naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        ListWipResponse {
            wips: wip_list,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取WIP列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/wips",
    tag = "WIP",
    request_body = CreateWipRequest,
    responses(
        (status = 200, description = "WIP创建成功", body = ApiResponse<WipResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_wip(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateWipRequest>,
) -> Json<ApiResponse<WipResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WipWrite).await {
        return e;
    }

    let now = Utc::now();
    let wip_no = format!(
        "WIP{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let order_no = if let Some(order_id) = req.order_id {
        let order = sqlx::query!(
            r#"SELECT order_number AS order_no FROM production_orders WHERE id = $1"#,
            order_id
        )
        .fetch_optional(&state.pool)
        .await
        .ok()
        .flatten();
        order.map(|o| o.order_no)
    } else {
        None
    };

    let order_no_flat = order_no;
    let order_no_arg = order_no_flat;
    let result = sqlx::query!(
        r#"
        INSERT INTO wips (
            wip_no, order_id, order_no, product_id, product_name, product_code,
            quantity, current_process_id, current_work_station_id,
            status, batch_no, start_time, last_transfer_time, operator, notes,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'in_progress', $10, $11, $11, $12, $13, $14, $14)
        RETURNING 
            id, wip_no, order_id, order_no, product_id, product_name, product_code,
            quantity, current_process_id, current_work_station_id,
            status, batch_no, start_time, last_transfer_time, operator, notes,
            created_at, updated_at
        "#,
        wip_no,
        req.order_id,
        order_no_arg.unwrap_or_default(),        req.product_id,
        req.product_name,
        req.product_code,
        BigDecimal::from_str(&req.quantity.to_string()).unwrap_or_default(),
        req.process_id,
        req.work_station_id,
        req.batch_no,
now,
        req.operator,
        req.notes,
now,
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create WIP: {}", e);
            return Json(ApiResponse::error(500, "创建WIP失败"));
        }
    };

    let wip = WipResponse {
        id: result.id,
        wip_no: result.wip_no,
        order_id: result.order_id,
        order_no: Some(result.order_no.unwrap_or_default()),
        product_id: result.product_id,
        product_name: result.product_name,
        product_code: result.product_code,
        quantity: big_decimal_to_f64(Some(result.quantity)),
        current_process_id: result.current_process_id,
        current_process_name: None,
        current_work_station_id: result.current_work_station_id,
        current_work_station_name: None,
        status: result.status.unwrap_or_else(|| "in_progress".to_string()),
        batch_no: result.batch_no,
        start_time: result.start_time.map(|t| t),
        last_transfer_time: result.last_transfer_time.map(|t| t),
        operator: result.operator,
        notes: result.notes,
        created_at: result.created_at.unwrap_or_default(),
        updated_at: result.updated_at.unwrap_or_default(),
    };

    Json(ApiResponse::success(wip, "WIP创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/wips/{id}",
    tag = "WIP",
    params(
        ("id" = Uuid, Path, description = "WIP ID"),
    ),
    responses(
        (status = 200, description = "WIP详情", body = ApiResponse<WipResponse>),
        (status = 404, description = "WIP不存在"),
    ),
)]
pub async fn get_wip(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WipResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WipRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            w.id, w.wip_no, w.order_id, w.order_no,
            w.product_id, w.product_name, w.product_code,
            w.quantity, w.current_process_id, w.current_work_station_id,
            w.status, w.batch_no, w.start_time, w.last_transfer_time,
            w.operator, w.notes, w.created_at, w.updated_at,
            pp.process_name as process_name,
            ws.station_name as work_station_name
        FROM wips w
        LEFT JOIN production_processes pp ON w.current_process_id = pp.id
        LEFT JOIN work_stations ws ON w.current_work_station_id = ws.id
        WHERE w.id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch WIP: {}", e);
            return Json(ApiResponse::error(500, "获取WIP失败"));
        }
    };

    match result {
        Some(r) => {
            let wip = WipResponse {
                id: r.id,
                wip_no: r.wip_no,
                order_id: r.order_id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                current_process_id: r.current_process_id,
                current_process_name: Some(r.process_name),
                current_work_station_id: r.current_work_station_id,
                current_work_station_name: Some(r.work_station_name.unwrap_or_default()),
                status: r.status.unwrap_or_else(|| "in_progress".to_string()),
                batch_no: r.batch_no,
                start_time: r.start_time.map(|t| t),
                last_transfer_time: r.last_transfer_time.map(|t| t),
                operator: r.operator,
                notes: r.notes,
                created_at: r.created_at.unwrap_or_default(),
                updated_at: r.updated_at.unwrap_or_default(),
            };
            Json(ApiResponse::success(wip, "获取WIP成功"))
        }
        None => Json(ApiResponse::error(404, "WIP不存在")),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:update"])),
    path = "/api/mes/wips/{id}",
    tag = "WIP",
    params(
        ("id" = Uuid, Path, description = "WIP ID"),
    ),
    request_body = UpdateWipRequest,
    responses(
        (status = 200, description = "WIP更新成功", body = ApiResponse<WipResponse>),
        (status = 404, description = "WIP不存在"),
    ),
)]
pub async fn update_wip(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWipRequest>,
) -> Json<ApiResponse<WipResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WipWrite).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE wips SET
            quantity = COALESCE($2, quantity),
            status = COALESCE($3, status),
            batch_no = COALESCE($4, batch_no),
            notes = COALESCE($5, notes),
            updated_at = $6
        WHERE id = $1
        RETURNING 
            id, wip_no, order_id, order_no, product_id, product_name, product_code,
            quantity, current_process_id, current_work_station_id,
            status, batch_no, start_time, last_transfer_time, operator, notes,
            created_at, updated_at
        "#,
        id,
        req.quantity
            .and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.status,
        req.batch_no,
        req.notes,
        Utc::now(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update WIP: {}", e);
            return Json(ApiResponse::error(500, "更新WIP失败"));
        }
    };

    match result {
        Some(r) => {
            let wip = WipResponse {
                id: r.id,
                wip_no: r.wip_no,
                order_id: r.order_id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                current_process_id: r.current_process_id,
                current_process_name: None,
                current_work_station_id: r.current_work_station_id,
                current_work_station_name: None,
                status: r.status.unwrap_or_else(|| "in_progress".to_string()),
                batch_no: r.batch_no,
                start_time: r.start_time.map(|t| t),
                last_transfer_time: r.last_transfer_time.map(|t| t),
                operator: r.operator,
                notes: r.notes,
                created_at: r.created_at.unwrap_or_default(),
                updated_at: r.updated_at.unwrap_or_default(),
            };
            Json(ApiResponse::success(wip, "WIP更新成功"))
        }
        None => Json(ApiResponse::error(404, "WIP不存在")),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mes:delete"])),
    path = "/api/mes/wips/{id}",
    tag = "WIP",
    params(
        ("id" = Uuid, Path, description = "WIP ID"),
    ),
    responses(
        (status = 200, description = "WIP删除成功"),
        (status = 404, description = "WIP不存在"),
    ),
)]
pub async fn delete_wip(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WipWrite).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE wips SET deleted_at = NOW()
        WHERE id = $1 AND status IN ('completed', 'cancelled')
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete WIP: {}", e);
            return Json(ApiResponse::error(500, "删除WIP失败"));
        }
    };

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "WIP删除成功"))
    } else {
        Json(ApiResponse::error(404, "WIP不存在或状态不允许删除"))
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/wips/transfer",
    tag = "WIP",
    request_body = CreateWipTransferRequest,
    responses(
        (status = 200, description = "WIP转移成功", body = ApiResponse<WipTransferResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn transfer_wip(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateWipTransferRequest>,
) -> Json<ApiResponse<WipTransferResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WipTransfer).await {
        return e;
    }

    let now = Utc::now();
    let transfer_no = format!(
        "TRF{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "WIP转移失败"));
        }
    };

    let wip = sqlx::query!(
        r#"SELECT quantity, status FROM wips WHERE deleted_at IS NULL AND id = $1"#,
        req.wip_id
    )
    .fetch_optional(&mut *tx)
    .await;

    let wip = match wip {
        Ok(Some(w)) => w,
        Ok(None) => {
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(404, "WIP不存在"));
        }
        Err(e) => {
            tracing::error!("Failed to fetch WIP: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "WIP转移失败"));
        }
    };

    let current_qty = big_decimal_to_f64(Some(wip.quantity));
    if req.quantity > current_qty {
        let _ = tx.rollback().await;
        return Json(ApiResponse::error(400, "转移数量不能大于当前WIP数量"));
    }

    let transfer_result = sqlx::query!(
        r#"
        INSERT INTO wip_transfers (
            transfer_no, wip_id,
            from_process_id, from_work_station_id,
            to_process_id, to_work_station_id,
            quantity, transfer_time, operator, transfer_type, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING 
            id, transfer_no, wip_id,
            from_process_id, from_work_station_id,
            to_process_id, to_work_station_id,
            quantity, transfer_time, operator, transfer_type, notes
        "#,
        transfer_no,
        req.wip_id,
        req.from_process_id,
        req.from_work_station_id,
        req.to_process_id,
        req.to_work_station_id,
        BigDecimal::from_str(&req.quantity.to_string()).unwrap_or_default(),
        now,
        req.operator.clone(),
        req.transfer_type
            .clone()
            .unwrap_or_else(|| "process_transfer".to_string()),
        req.notes.clone(),
    )
    .fetch_one(&mut *tx)
    .await;

    let transfer = match transfer_result {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to create WIP transfer: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "WIP转移失败"));
        }
    };

    let _ = sqlx::query!(
        r#"
        UPDATE wips SET
            current_process_id = COALESCE($2, current_process_id),
            current_work_station_id = COALESCE($3, current_work_station_id),
            last_transfer_time = $4,
            updated_at = $4
        WHERE id = $1
        "#,
        req.wip_id,
        req.to_process_id,
        req.to_work_station_id,
        now,
    )
    .execute(&mut *tx)
    .await;

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "WIP转移失败"));
    }

    let from_process_name = if let Some(pid) = req.from_process_id {
        sqlx::query!(
            "SELECT process_name AS name FROM production_processes WHERE id = $1",
            pid
        )
        .fetch_optional(&state.pool)
        .await
        .ok()
        .flatten()
        .map(|p| p.name)
    } else {
        None
    };

    let to_process_name = if let Some(pid) = req.to_process_id {
        sqlx::query!(
            "SELECT process_name AS name FROM production_processes WHERE id = $1",
            pid
        )
        .fetch_optional(&state.pool)
        .await
        .ok()
        .flatten()
        .map(|p| p.name)
    } else {
        None
    };

    let from_workstation_name = if let Some(wid) = req.from_work_station_id {
        sqlx::query!(
            "SELECT station_name AS name FROM work_stations WHERE id = $1",
            wid
        )
        .fetch_optional(&state.pool)
        .await
        .ok()
        .flatten()
        .map(|w| w.name)
    } else {
        None
    };

    let to_workstation_name = if let Some(wid) = req.to_work_station_id {
        sqlx::query!(
            "SELECT station_name AS name FROM work_stations WHERE id = $1",
            wid
        )
        .fetch_optional(&state.pool)
        .await
        .ok()
        .flatten()
        .map(|w| w.name)
    } else {
        None
    };

    let response = WipTransferResponse {
        id: transfer.id,
        transfer_no: transfer.transfer_no,
        wip_id: transfer.wip_id,
        from_process_id: transfer.from_process_id,
        from_process_name: Some(from_process_name.unwrap_or_default()),
        from_work_station_id: transfer.from_work_station_id,
        from_work_station_name: from_workstation_name.flatten(),
        to_process_id: transfer.to_process_id,
        to_process_name: Some(to_process_name.unwrap_or_default()),
        to_work_station_id: transfer.to_work_station_id,
        to_work_station_name: to_workstation_name.flatten(),
        quantity: big_decimal_to_f64(Some(transfer.quantity)),
        transfer_time: transfer.transfer_time,
        operator: transfer.operator,
        transfer_type: transfer
            .transfer_type
            .unwrap_or_else(|| "process_transfer".to_string()),
        notes: transfer.notes,
    };

    Json(ApiResponse::success(response, "WIP转移成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/wips/{wip_id}/transfers",
    tag = "WIP",
    params(
        ("wip_id" = Uuid, Path, description = "WIP ID"),
    ),
    responses(
        (status = 200, description = "WIP转移记录列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_wip_transfers(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(wip_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<WipTransferResponse>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WipRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            wt.id, wt.transfer_no, wt.wip_id,
            wt.from_process_id, wt.from_work_station_id,
            wt.to_process_id, wt.to_work_station_id,
            wt.quantity, wt.transfer_time, wt.operator, wt.transfer_type, wt.notes,
            fp.process_name as from_process_name,
            tp.process_name as to_process_name,
            fws.station_name as from_work_station_name,
            tws.station_name as to_work_station_name
        FROM wip_transfers wt
        LEFT JOIN production_processes fp ON wt.from_process_id = fp.id
        LEFT JOIN production_processes tp ON wt.to_process_id = tp.id
        LEFT JOIN work_stations fws ON wt.from_work_station_id = fws.id
        LEFT JOIN work_stations tws ON wt.to_work_station_id = tws.id
        WHERE wt.wip_id = $1
        ORDER BY wt.transfer_time DESC
        "#,
        wip_id,
    )
    .fetch_all(&state.pool)
    .await;

    let transfers = match result {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to fetch WIP transfers: {}", e);
            return Json(ApiResponse::error(500, "获取WIP转移记录失败"));
        }
    };

    let transfer_list: Vec<WipTransferResponse> = transfers
        .into_iter()
        .map(|r| WipTransferResponse {
            id: r.id,
            transfer_no: r.transfer_no,
            wip_id: r.wip_id,
            from_process_id: r.from_process_id,
            from_process_name: Some(r.from_process_name),
            from_work_station_id: r.from_work_station_id,
            from_work_station_name: Some(r.from_work_station_name.unwrap_or_default()),
            to_process_id: r.to_process_id,
            to_process_name: Some(r.to_process_name),
            to_work_station_id: r.to_work_station_id,
            to_work_station_name: Some(r.to_work_station_name.unwrap_or_default()),
            quantity: big_decimal_to_f64(Some(r.quantity)),
            transfer_time: r.transfer_time,
            operator: r.operator,
            transfer_type: r
                .transfer_type
                .unwrap_or_else(|| "process_transfer".to_string()),
            notes: r.notes,
        })
        .collect();

    Json(ApiResponse::success(transfer_list, "获取WIP转移记录成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/wips/statistics",
    tag = "WIP",
    responses(
        (status = 200, description = "WIP统计数据", body = ApiResponse<WipStatisticsResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_wip_statistics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<WipStatisticsResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WipRead).await {
        return e;
    }

    let total_result = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_wip,
            COALESCE(SUM(quantity), 0) as total_quantity
        FROM wips
        WHERE status = 'in_progress'
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    let (total_wip, total_quantity) = match total_result {
        Ok(row) => {
            let tw: Option<i64> = row.try_get("total_wip").ok();
            let tq: Option<BigDecimal> = row.try_get("total_quantity").ok();
            tracing::debug!("WIP stats raw: total_wip={:?} total_quantity={:?}", tw, tq);
            (tw.unwrap_or(0), big_decimal_to_f64(tq))
        }
        Err(e) => {
            tracing::error!("Failed to fetch WIP statistics: {}", e);
            return Json(ApiResponse::error(500, "获取WIP统计失败"));
        }
    };

    let status_result = sqlx::query(
        r#"
        SELECT 
            status,
            COUNT(*) as count,
            COALESCE(SUM(quantity), 0) as quantity
        FROM wips
        GROUP BY status
        ORDER BY status
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    let by_status: Vec<WipStatusCount> = match status_result {
        Ok(rows) => rows
            .into_iter()
            .map(|r| WipStatusCount {
                status: r
                    .try_get::<String, _>("status")
                    .ok()
                    .unwrap_or_else(|| "unknown".to_string()),
                count: r.try_get::<i64, _>("count").ok().unwrap_or(0),
                quantity: big_decimal_to_f64(r.try_get("quantity").ok()),
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch WIP status stats: {}", e);
            return Json(ApiResponse::error(500, "获取WIP统计失败"));
        }
    };

    let process_result = sqlx::query(
        r#"
        SELECT 
            w.current_process_id,
            pp.process_name as process_name,
            COUNT(*) as count,
            COALESCE(SUM(w.quantity), 0) as quantity
        FROM wips w
        LEFT JOIN production_processes pp ON w.current_process_id = pp.id
        WHERE w.status = 'in_progress'
        GROUP BY w.current_process_id, pp.process_name
        ORDER BY quantity DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    let by_process: Vec<WipProcessCount> = match process_result {
        Ok(rows) => rows
            .into_iter()
            .map(|r| WipProcessCount {
                process_id: r.try_get("current_process_id").ok(),
                process_name: r
                    .try_get::<String, _>("process_name")
                    .ok()
                    .unwrap_or_default(),
                count: r.try_get::<i64, _>("count").ok().unwrap_or(0),
                quantity: big_decimal_to_f64(r.try_get("quantity").ok()),
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch WIP process stats: {}", e);
            return Json(ApiResponse::error(500, "获取WIP统计失败"));
        }
    };

    Json(ApiResponse::success(
        WipStatisticsResponse {
            total_wip,
            total_quantity,
            by_status,
            by_process,
        },
        "获取WIP统计成功",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use chrono::{Datelike, Timelike};

    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = Utc.with_ymd_and_hms(2024, 7, 1, 9, 45, 0).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.date_naive(), dt.date_naive());
        assert_eq!(utc.time(), dt.time());
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    #[test]
    fn opt_naive_to_utc_some() {
        let dt = Utc.with_ymd_and_hms(2024, 2, 28, 23, 59, 59).unwrap();
        let r = opt_naive_to_utc(Some(dt)).unwrap();
        assert_eq!(r.year(), 2024);
        assert_eq!(r.month(), 2);
        assert_eq!(r.day(), 28);
        assert_eq!(r.hour(), 23);
        assert_eq!(r.second(), 59);
    }

    #[test]
    fn opt_naive_to_utc_none() {
        assert!(opt_naive_to_utc(None).is_none());
    }

    #[test]
    fn big_decimal_to_f64_some() {
        let bd: BigDecimal = "1.25".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 1.25);
    }

    #[test]
    fn big_decimal_to_f64_none() {
        assert_eq!(big_decimal_to_f64(None), 0.0);
    }

    #[test]
    fn big_decimal_to_f64_negative() {
        let bd: BigDecimal = "-7.5".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), -7.5);
    }
}
