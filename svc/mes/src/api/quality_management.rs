//! Quality Management handlers
//!
//! 质量管理模块：质量检验、巡检、质量标准

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use std::str::FromStr;
use topems_shared::auth::Claims;

use crate::services::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // Quality Inspections
        .route(
            "/api/mes/quality/inspections",
            get(list_inspections).post(create_inspection),
        )
        .route(
            "/api/mes/quality/inspections/{id}",
            get(get_inspection)
                .put(update_inspection)
                .delete(delete_inspection),
        )
        // Quality Patrols
        .route(
            "/api/mes/quality/patrols",
            get(list_patrols).post(create_patrol),
        )
        .route(
            "/api/mes/quality/patrols/{id}",
            get(get_patrol).put(update_patrol).delete(delete_patrol),
        )
        // Patrol Items
        .route(
            "/api/mes/quality/patrols/{patrol_id}/items",
            get(list_patrol_items).post(add_patrol_item),
        )
        .route(
            "/api/mes/quality/patrol-items/{id}",
            put(update_patrol_item).delete(delete_patrol_item),
        )
        // Quality Standards
        .route(
            "/api/mes/quality/standards",
            get(list_standards).post(create_standard),
        )
        .route(
            "/api/mes/quality/standards/{id}",
            get(get_standard)
                .put(update_standard)
                .delete(delete_standard),
        )
}

// ==================== Helper Functions ====================

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    match dt {
        Some(d) => Utc.from_utc_datetime(&d),
        None => Utc::now(),
    }
}

fn datetime_to_string(dt: Option<NaiveDateTime>) -> String {
    naive_to_utc(dt).to_rfc3339()
}

fn opt_big_decimal_to_f64(bd: Option<BigDecimal>) -> Option<f64> {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}

fn big_decimal_value_to_f64(bd: BigDecimal) -> f64 {
    bd.to_string().parse::<f64>().unwrap_or(0.0)
}

// ==================== Quality Inspections ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListInspectionsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
    inspection_type: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateInspectionRequest {
    pub order_id: Option<String>,
    pub order_number: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub inspection_type: String,
    pub quantity: f64,
    pub qualified_quantity: Option<f64>,
    pub unqualified_quantity: Option<f64>,
    pub inspector: Option<String>,
    pub inspection_time: Option<String>,
    pub status: Option<String>,
    pub result: Option<String>,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateInspectionRequest {
    pub qualified_quantity: Option<f64>,
    pub unqualified_quantity: Option<f64>,
    pub inspector: Option<String>,
    pub inspection_time: Option<String>,
    pub status: Option<String>,
    pub result: Option<String>,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InspectionResponse {
    pub id: String,
    pub inspection_no: String,
    pub order_id: Option<String>,
    pub order_number: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub inspection_type: String,
    pub quantity: f64,
    pub qualified_quantity: f64,
    pub unqualified_quantity: f64,
    pub qualification_rate: f64,
    pub inspector: Option<String>,
    pub inspection_time: String,
    pub status: String,
    pub result: Option<String>,
    pub memo: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub async fn list_inspections(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListInspectionsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE qi.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(inspection_type) = query.inspection_type {
        let idx = params.len() + 1;
        if where_clause.is_empty() {
            where_clause.push_str(&format!(" WHERE qi.inspection_type = ${}", idx));
        } else {
            where_clause.push_str(&format!(" AND qi.inspection_type = ${}", idx));
        }
        params.push(serde_json::Value::String(inspection_type));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        let idx = params.len() + 1;
        if where_clause.is_empty() {
            where_clause.push_str(&format!(
                " WHERE (qi.inspection_no ILIKE ${} OR qi.product_code ILIKE ${} OR qi.product_name ILIKE ${})",
                idx, idx, idx
            ));
        } else {
            where_clause.push_str(&format!(
                " AND (qi.inspection_no ILIKE ${} OR qi.product_code ILIKE ${} OR qi.product_name ILIKE ${})",
                idx, idx, idx
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM quality_inspections qi{}",
        where_clause
    );
    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }
    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count quality inspections: {}", e);
            return Json(ApiResponse::error(500, "获取检验记录列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT
            qi.id, qi.inspection_no, qi.order_id, qi.order_number,
            qi.product_code, qi.product_name, qi.process_id, qi.process_name,
            qi.inspection_type, qi.quantity, qi.qualified_quantity,
            qi.unqualified_quantity, qi.qualification_rate,
            qi.inspector, qi.inspection_time, qi.status, qi.result, qi.memo,
            qi.created_at, qi.updated_at
        FROM quality_inspections qi
        {}
        ORDER BY qi.created_at DESC
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
    fetch_query = fetch_query.bind(pagesize).bind(offset);

    let rows = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch quality inspections: {}", e);
            return Json(ApiResponse::error(500, "获取检验记录列表失败"));
        }
    };

    let inspections: Vec<InspectionResponse> = rows
        .into_iter()
        .map(|r| InspectionResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            inspection_no: r.try_get::<String, _>("inspection_no").unwrap_or_default(),
            order_id: r
                .try_get::<Option<Uuid>, _>("order_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            order_number: r
                .try_get::<Option<String>, _>("order_number")
                .ok()
                .flatten(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            process_id: r
                .try_get::<Option<Uuid>, _>("process_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            process_name: r
                .try_get::<Option<String>, _>("process_name")
                .ok()
                .flatten(),
            inspection_type: r
                .try_get::<String, _>("inspection_type")
                .unwrap_or_default(),
            quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity")
                    .ok()
                    .flatten(),
            ),
            qualified_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("qualified_quantity")
                    .ok()
                    .flatten(),
            ),
            unqualified_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("unqualified_quantity")
                    .ok()
                    .flatten(),
            ),
            qualification_rate: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("qualification_rate")
                    .ok()
                    .flatten(),
            ),
            inspector: r.try_get::<Option<String>, _>("inspector").ok().flatten(),
            inspection_time: r
                .try_get::<Option<String>, _>("inspection_time")
                .ok()
                .flatten()
                .unwrap_or_default(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            result: r.try_get::<Option<String>, _>("result").ok().flatten(),
            memo: r.try_get::<Option<String>, _>("memo").ok().flatten(),
            created_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "inspections": inspections,
            "total": total.expect("count failed"),
            "page": page,
            "pagesize": pagesize,
        }),
        "获取检验记录列表成功",
    ))
}

pub async fn get_inspection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<InspectionResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的检验记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT
            qi.id, qi.inspection_no, qi.order_id, qi.order_number,
            qi.product_code, qi.product_name, qi.process_id, qi.process_name,
            qi.inspection_type, qi.quantity, qi.qualified_quantity,
            qi.unqualified_quantity, qi.qualification_rate,
            qi.inspector, qi.inspection_time, qi.status, qi.result, qi.memo,
            qi.created_at, qi.updated_at
        FROM quality_inspections qi
        WHERE qi.id = $1
        "#,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            InspectionResponse {
                id: r.id.to_string(),
                inspection_no: r.inspection_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_number: r.order_number,
                product_code: r.product_code,
                product_name: r.product_name,
                process_id: r.process_id.map(|u| u.to_string()),
                process_name: r.process_name,
                inspection_type: r.inspection_type,
                quantity: big_decimal_value_to_f64(r.quantity),
                qualified_quantity: big_decimal_value_to_f64(r.qualified_quantity),
                unqualified_quantity: big_decimal_value_to_f64(r.unqualified_quantity),
                qualification_rate: big_decimal_to_f64(r.qualification_rate),
                inspector: r.inspector,
                inspection_time: r.inspection_time.unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                memo: r.memo,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "获取检验记录成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "检验记录不存在")),
        Err(e) => {
            tracing::error!("Failed to get quality inspection: {}", e);
            Json(ApiResponse::error(500, "获取检验记录失败"))
        }
    }
}

pub async fn create_inspection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateInspectionRequest>,
) -> Json<ApiResponse<InspectionResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let now = Utc::now();
    let inspection_no = format!(
        "QI{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let order_id = body
        .order_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let process_id = body
        .process_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let quantity = BigDecimal::from_str(&body.quantity.to_string()).unwrap_or_default();
    let qualified_quantity = body
        .qualified_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let unqualified_quantity = body
        .unqualified_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let inspection_time = body.inspection_time.unwrap_or_else(|| now.to_rfc3339());

    let result = sqlx::query!(
        r#"
        INSERT INTO quality_inspections (
            inspection_no, order_id, order_number, product_code, product_name,
            process_id, process_name, inspection_type, quantity,
            qualified_quantity, unqualified_quantity, qualification_rate,
            inspector, inspection_time, status, result, memo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING
            id, inspection_no, order_id, order_number,
            product_code, product_name, process_id, process_name,
            inspection_type, quantity, qualified_quantity,
            unqualified_quantity, qualification_rate,
            inspector, inspection_time, status, result, memo,
            created_at, updated_at
        "#,
        inspection_no,
        order_id,
        body.order_number,
        body.product_code,
        body.product_name,
        process_id,
        body.process_name,
        body.inspection_type,
        quantity,
        qualified_quantity,
        unqualified_quantity,
        BigDecimal::from_str("0").unwrap_or_default(),
        body.inspector,
        inspection_time,
        body.status.unwrap_or_else(|| "pending".to_string()),
        body.result,
        body.memo,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            InspectionResponse {
                id: r.id.to_string(),
                inspection_no: r.inspection_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_number: r.order_number,
                product_code: r.product_code,
                product_name: r.product_name,
                process_id: r.process_id.map(|u| u.to_string()),
                process_name: r.process_name,
                inspection_type: r.inspection_type,
                quantity: big_decimal_value_to_f64(r.quantity),
                qualified_quantity: big_decimal_value_to_f64(r.qualified_quantity),
                unqualified_quantity: big_decimal_value_to_f64(r.unqualified_quantity),
                qualification_rate: big_decimal_to_f64(r.qualification_rate),
                inspector: r.inspector,
                inspection_time: r.inspection_time.unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                memo: r.memo,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "创建检验记录成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create quality inspection: {}", e);
            Json(ApiResponse::error(500, "创建检验记录失败"))
        }
    }
}

pub async fn update_inspection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateInspectionRequest>,
) -> Json<ApiResponse<InspectionResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的检验记录ID"));
        }
    };

    let qualified_quantity = body
        .qualified_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let unqualified_quantity = body
        .unqualified_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());

    let result = sqlx::query!(
        r#"
        UPDATE quality_inspections
        SET
            qualified_quantity = COALESCE($1, qualified_quantity),
            unqualified_quantity = COALESCE($2, unqualified_quantity),
            qualification_rate = CASE
                WHEN quantity > 0 THEN (COALESCE($1, qualified_quantity) / quantity * 100)
                ELSE 0
            END,
            inspector = COALESCE($3, inspector),
            inspection_time = COALESCE($4, inspection_time),
            status = COALESCE($5, status),
            result = COALESCE($6, result),
            memo = COALESCE($7, memo),
            updated_at = NOW()
        WHERE id = $8
        RETURNING
            id, inspection_no, order_id, order_number,
            product_code, product_name, process_id, process_name,
            inspection_type, quantity, qualified_quantity,
            unqualified_quantity, qualification_rate,
            inspector, inspection_time, status, result, memo,
            created_at, updated_at
        "#,
        qualified_quantity,
        unqualified_quantity,
        body.inspector,
        body.inspection_time,
        body.status,
        body.result,
        body.memo,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            InspectionResponse {
                id: r.id.to_string(),
                inspection_no: r.inspection_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_number: r.order_number,
                product_code: r.product_code,
                product_name: r.product_name,
                process_id: r.process_id.map(|u| u.to_string()),
                process_name: r.process_name,
                inspection_type: r.inspection_type,
                quantity: big_decimal_value_to_f64(r.quantity),
                qualified_quantity: big_decimal_value_to_f64(r.qualified_quantity),
                unqualified_quantity: big_decimal_value_to_f64(r.unqualified_quantity),
                qualification_rate: big_decimal_to_f64(r.qualification_rate),
                inspector: r.inspector,
                inspection_time: r.inspection_time.unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                memo: r.memo,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "更新检验记录成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "检验记录不存在")),
        Err(e) => {
            tracing::error!("Failed to update quality inspection: {}", e);
            Json(ApiResponse::error(500, "更新检验记录失败"))
        }
    }
}

pub async fn delete_inspection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的检验记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        DELETE FROM quality_inspections WHERE id = $1
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id, "删除检验记录成功")),
        Err(e) => {
            tracing::error!("Failed to delete quality inspection: {}", e);
            Json(ApiResponse::error(500, "删除检验记录失败"))
        }
    }
}

// ==================== Quality Patrols ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListPatrolsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePatrolRequest {
    pub production_line: Option<String>,
    pub workstation_id: Option<String>,
    pub workstation_name: Option<String>,
    pub inspector: String,
    pub patrol_time: Option<String>,
    pub status: Option<String>,
    pub result: Option<String>,
    pub findings: Option<String>,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePatrolRequest {
    pub production_line: Option<String>,
    pub workstation_id: Option<String>,
    pub workstation_name: Option<String>,
    pub inspector: Option<String>,
    pub patrol_time: Option<String>,
    pub status: Option<String>,
    pub result: Option<String>,
    pub findings: Option<String>,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PatrolResponse {
    pub id: String,
    pub patrol_no: String,
    pub production_line: Option<String>,
    pub workstation_id: Option<String>,
    pub workstation_name: Option<String>,
    pub inspector: String,
    pub patrol_time: String,
    pub status: String,
    pub result: Option<String>,
    pub findings: Option<String>,
    pub memo: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub async fn list_patrols(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListPatrolsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE qp.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        let idx = params.len() + 1;
        if where_clause.is_empty() {
            where_clause.push_str(&format!(
                " WHERE (qp.patrol_no ILIKE ${} OR qp.inspector ILIKE ${} OR qp.production_line ILIKE ${})",
                idx, idx, idx
            ));
        } else {
            where_clause.push_str(&format!(
                " AND (qp.patrol_no ILIKE ${} OR qp.inspector ILIKE ${} OR qp.production_line ILIKE ${})",
                idx, idx, idx
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM quality_patrols qp{}",
        where_clause
    );
    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }
    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count quality patrols: {}", e);
            return Json(ApiResponse::error(500, "获取巡检记录列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT
            qp.id, qp.patrol_no, qp.production_line, qp.workstation_id,
            qp.workstation_name, qp.inspector, qp.patrol_time,
            qp.status, qp.result, qp.findings, qp.memo,
            qp.created_at, qp.updated_at
        FROM quality_patrols qp
        {}
        ORDER BY qp.created_at DESC
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
    fetch_query = fetch_query.bind(pagesize).bind(offset);

    let rows = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch quality patrols: {}", e);
            return Json(ApiResponse::error(500, "获取巡检记录列表失败"));
        }
    };

    let patrols: Vec<PatrolResponse> = rows
        .into_iter()
        .map(|r| PatrolResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            patrol_no: r.try_get::<String, _>("patrol_no").unwrap_or_default(),
            production_line: r
                .try_get::<Option<String>, _>("production_line")
                .ok()
                .flatten(),
            workstation_id: r
                .try_get::<Option<Uuid>, _>("workstation_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            workstation_name: r
                .try_get::<Option<String>, _>("workstation_name")
                .ok()
                .flatten(),
            inspector: r.try_get::<String, _>("inspector").unwrap_or_default(),
            patrol_time: r
                .try_get::<Option<String>, _>("patrol_time")
                .ok()
                .flatten()
                .unwrap_or_default(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            result: r.try_get::<Option<String>, _>("result").ok().flatten(),
            findings: r.try_get::<Option<String>, _>("findings").ok().flatten(),
            memo: r.try_get::<Option<String>, _>("memo").ok().flatten(),
            created_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "patrols": patrols,
            "total": total.expect("count failed"),
            "page": page,
            "pagesize": pagesize,
        }),
        "获取巡检记录列表成功",
    ))
}

pub async fn get_patrol(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<PatrolResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT
            qp.id, qp.patrol_no, qp.production_line, qp.workstation_id,
            qp.workstation_name, qp.inspector, qp.patrol_time,
            qp.status, qp.result, qp.findings, qp.memo,
            qp.created_at, qp.updated_at
        FROM quality_patrols qp
        WHERE qp.id = $1
        "#,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            PatrolResponse {
                id: r.id.to_string(),
                patrol_no: r.patrol_no,
                production_line: r.production_line,
                workstation_id: r.workstation_id.map(|u| u.to_string()),
                workstation_name: r.workstation_name,
                inspector: r.inspector,
                patrol_time: r.patrol_time.unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                findings: r.findings,
                memo: r.memo,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "获取巡检记录成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "巡检记录不存在")),
        Err(e) => {
            tracing::error!("Failed to get quality patrol: {}", e);
            Json(ApiResponse::error(500, "获取巡检记录失败"))
        }
    }
}

pub async fn create_patrol(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreatePatrolRequest>,
) -> Json<ApiResponse<PatrolResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let now = Utc::now();
    let patrol_no = format!(
        "PT{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let workstation_id = body
        .workstation_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let patrol_time = body.patrol_time.unwrap_or_else(|| now.to_rfc3339());

    let result = sqlx::query!(
        r#"
        INSERT INTO quality_patrols (
            patrol_no, production_line, workstation_id, workstation_name,
            inspector, patrol_time, status, result, findings, memo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
            id, patrol_no, production_line, workstation_id,
            workstation_name, inspector, patrol_time,
            status, result, findings, memo,
            created_at, updated_at
        "#,
        patrol_no,
        body.production_line,
        workstation_id,
        body.workstation_name,
        body.inspector,
        patrol_time,
        body.status.unwrap_or_else(|| "pending".to_string()),
        body.result,
        body.findings,
        body.memo,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            PatrolResponse {
                id: r.id.to_string(),
                patrol_no: r.patrol_no,
                production_line: r.production_line,
                workstation_id: r.workstation_id.map(|u| u.to_string()),
                workstation_name: r.workstation_name,
                inspector: r.inspector,
                patrol_time: r.patrol_time.unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                findings: r.findings,
                memo: r.memo,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "创建巡检记录成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create quality patrol: {}", e);
            Json(ApiResponse::error(500, "创建巡检记录失败"))
        }
    }
}

pub async fn update_patrol(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdatePatrolRequest>,
) -> Json<ApiResponse<PatrolResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检记录ID"));
        }
    };

    let workstation_id = body
        .workstation_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());

    let result = sqlx::query!(
        r#"
        UPDATE quality_patrols
        SET
            production_line = COALESCE($1, production_line),
            workstation_id = COALESCE($2, workstation_id),
            workstation_name = COALESCE($3, workstation_name),
            inspector = COALESCE($4, inspector),
            patrol_time = COALESCE($5, patrol_time),
            status = COALESCE($6, status),
            result = COALESCE($7, result),
            findings = COALESCE($8, findings),
            memo = COALESCE($9, memo),
            updated_at = NOW()
        WHERE id = $10
        RETURNING
            id, patrol_no, production_line, workstation_id,
            workstation_name, inspector, patrol_time,
            status, result, findings, memo,
            created_at, updated_at
        "#,
        body.production_line,
        workstation_id,
        body.workstation_name,
        body.inspector,
        body.patrol_time,
        body.status,
        body.result,
        body.findings,
        body.memo,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            PatrolResponse {
                id: r.id.to_string(),
                patrol_no: r.patrol_no,
                production_line: r.production_line,
                workstation_id: r.workstation_id.map(|u| u.to_string()),
                workstation_name: r.workstation_name,
                inspector: r.inspector,
                patrol_time: r.patrol_time.unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                findings: r.findings,
                memo: r.memo,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "更新巡检记录成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "巡检记录不存在")),
        Err(e) => {
            tracing::error!("Failed to update quality patrol: {}", e);
            Json(ApiResponse::error(500, "更新巡检记录失败"))
        }
    }
}

pub async fn delete_patrol(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        DELETE FROM quality_patrols WHERE id = $1
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id, "删除巡检记录成功")),
        Err(e) => {
            tracing::error!("Failed to delete quality patrol: {}", e);
            Json(ApiResponse::error(500, "删除巡检记录失败"))
        }
    }
}

// ==================== Patrol Items ====================

#[derive(Debug, Clone, Deserialize)]
pub struct AddPatrolItemRequest {
    pub item_name: String,
    pub standard: Option<String>,
    pub actual_value: Option<String>,
    pub status: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PatrolItemResponse {
    pub id: String,
    pub patrol_id: String,
    pub item_name: String,
    pub standard: Option<String>,
    pub actual_value: Option<String>,
    pub status: String,
    pub remark: Option<String>,
}

pub async fn list_patrol_items(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(patrol_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let patrol_uuid = match Uuid::parse_str(&patrol_id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT
            qpi.id, qpi.patrol_id, qpi.item_name, qpi.standard,
            qpi.actual_value, qpi.status, qpi.remark
        FROM quality_patrol_items qpi
        WHERE qpi.patrol_id = $1
        ORDER BY qpi.created_at ASC
        "#,
        patrol_uuid,
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let items: Vec<PatrolItemResponse> = rows
                .into_iter()
                .map(|r| PatrolItemResponse {
                    id: r.id.to_string(),
                    patrol_id: r.patrol_id.to_string(),
                    item_name: r.item_name,
                    standard: r.standard,
                    actual_value: r.actual_value,
                    status: r.status.unwrap_or_else(|| "pending".to_string()),
                    remark: r.remark,
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({ "items": items }),
                "获取巡检项目列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to list patrol items: {}", e);
            Json(ApiResponse::error(500, "获取巡检项目列表失败"))
        }
    }
}

pub async fn add_patrol_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(patrol_id): Path<String>,
    Json(body): Json<AddPatrolItemRequest>,
) -> Json<ApiResponse<PatrolItemResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let patrol_uuid = match Uuid::parse_str(&patrol_id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        INSERT INTO quality_patrol_items (
            patrol_id, item_name, standard, actual_value, status, remark
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, patrol_id, item_name, standard, actual_value, status, remark
        "#,
        patrol_uuid,
        body.item_name,
        body.standard,
        body.actual_value,
        body.status.clone().unwrap_or_else(|| "pending".to_string()),
        body.remark,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            PatrolItemResponse {
                id: r.id.to_string(),
                patrol_id: r.patrol_id.to_string(),
                item_name: r.item_name,
                standard: r.standard,
                actual_value: r.actual_value,
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                remark: r.remark,
            },
            "添加巡检项目成功",
        )),
        Err(e) => {
            tracing::error!("Failed to add patrol item: {}", e);
            Json(ApiResponse::error(500, "添加巡检项目失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePatrolItemRequest {
    pub item_name: Option<String>,
    pub standard: Option<String>,
    pub actual_value: Option<String>,
    pub status: Option<String>,
    pub remark: Option<String>,
}

pub async fn update_patrol_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdatePatrolItemRequest>,
) -> Json<ApiResponse<PatrolItemResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检项目ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE quality_patrol_items
        SET
            item_name = COALESCE($1, item_name),
            standard = COALESCE($2, standard),
            actual_value = COALESCE($3, actual_value),
            status = COALESCE($4, status),
            remark = COALESCE($5, remark)
        WHERE id = $6
        RETURNING id, patrol_id, item_name, standard, actual_value, status, remark
        "#,
        body.item_name,
        body.standard,
        body.actual_value,
        body.status,
        body.remark,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            PatrolItemResponse {
                id: r.id.to_string(),
                patrol_id: r.patrol_id.to_string(),
                item_name: r.item_name,
                standard: r.standard,
                actual_value: r.actual_value,
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                remark: r.remark,
            },
            "更新巡检项目成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "巡检项目不存在")),
        Err(e) => {
            tracing::error!("Failed to update patrol item: {}", e);
            Json(ApiResponse::error(500, "更新巡检项目失败"))
        }
    }
}

pub async fn delete_patrol_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检项目ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        DELETE FROM quality_patrol_items WHERE id = $1
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id, "删除巡检项目成功")),
        Err(e) => {
            tracing::error!("Failed to delete patrol item: {}", e);
            Json(ApiResponse::error(500, "删除巡检项目失败"))
        }
    }
}

// ==================== Quality Standards ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListStandardsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
    inspection_type: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StandardValueInput {
    pub item_name: String,
    pub lower_limit: Option<f64>,
    pub upper_limit: Option<f64>,
    pub unit: Option<String>,
    pub inspection_method: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateStandardRequest {
    pub code: String,
    pub name: String,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub inspection_type: String,
    pub standard_values: Option<Vec<StandardValueInput>>,
    pub status: Option<String>,
    pub version: Option<String>,
    pub effective_date: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateStandardRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub inspection_type: Option<String>,
    pub standard_values: Option<Vec<StandardValueInput>>,
    pub status: Option<String>,
    pub version: Option<String>,
    pub effective_date: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StandardValueResponse {
    pub id: String,
    pub standard_id: String,
    pub item_name: String,
    pub lower_limit: Option<f64>,
    pub upper_limit: Option<f64>,
    pub unit: Option<String>,
    pub inspection_method: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StandardResponse {
    pub id: String,
    pub code: String,
    pub name: String,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub inspection_type: String,
    pub standard_values: Vec<StandardValueResponse>,
    pub status: String,
    pub version: Option<String>,
    pub effective_date: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub async fn list_standards(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListStandardsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE qs.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(inspection_type) = query.inspection_type {
        let idx = params.len() + 1;
        if where_clause.is_empty() {
            where_clause.push_str(&format!(" WHERE qs.inspection_type = ${}", idx));
        } else {
            where_clause.push_str(&format!(" AND qs.inspection_type = ${}", idx));
        }
        params.push(serde_json::Value::String(inspection_type));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        let idx = params.len() + 1;
        if where_clause.is_empty() {
            where_clause.push_str(&format!(
                " WHERE (qs.code ILIKE ${} OR qs.name ILIKE ${} OR qs.product_code ILIKE ${})",
                idx, idx, idx
            ));
        } else {
            where_clause.push_str(&format!(
                " AND (qs.code ILIKE ${} OR qs.name ILIKE ${} OR qs.product_code ILIKE ${})",
                idx, idx, idx
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM quality_standards qs{}",
        where_clause
    );
    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }
    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count quality standards: {}", e);
            return Json(ApiResponse::error(500, "获取质量标准列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT
            qs.id, qs.code, qs.name, qs.product_code, qs.product_name,
            qs.inspection_type, qs.status, qs.version,
            qs.effective_date, qs.description,
            qs.created_at, qs.updated_at
        FROM quality_standards qs
        {}
        ORDER BY qs.created_at DESC
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
    fetch_query = fetch_query.bind(pagesize).bind(offset);

    let rows = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch quality standards: {}", e);
            return Json(ApiResponse::error(500, "获取质量标准列表失败"));
        }
    };

    let standard_ids: Vec<Uuid> = rows
        .iter()
        .filter_map(|r| r.try_get::<Uuid, _>("id").ok())
        .collect();

    let mut values_map: std::collections::HashMap<Uuid, Vec<StandardValueResponse>> =
        std::collections::HashMap::new();

    if !standard_ids.is_empty() {
        let values_result = sqlx::query!(
            r#"
            SELECT
                qsv.id, qsv.standard_id, qsv.item_name, qsv.lower_limit,
                qsv.upper_limit, qsv.unit, qsv.inspection_method, qsv.remark
            FROM quality_standard_values qsv
            WHERE qsv.standard_id = ANY($1)
            "#,
            &standard_ids,
        )
        .fetch_all(&state.pool)
        .await;

        if let Ok(value_rows) = values_result {
            for v in value_rows {
                let sid = v.standard_id;
                values_map
                    .entry(sid)
                    .or_insert_with(Vec::new)
                    .push(StandardValueResponse {
                        id: v.id.to_string(),
                        standard_id: sid.to_string(),
                        item_name: v.item_name,
                        lower_limit: opt_big_decimal_to_f64(v.lower_limit),
                        upper_limit: opt_big_decimal_to_f64(v.upper_limit),
                        unit: v.unit,
                        inspection_method: v.inspection_method,
                        remark: v.remark,
                    });
            }
        }
    }

    let standards: Vec<StandardResponse> = rows
        .into_iter()
        .map(|r| {
            let sid = r.try_get::<Uuid, _>("id").unwrap_or_default();
            let values = values_map.remove(&sid).unwrap_or_default();
            StandardResponse {
                id: sid.to_string(),
                code: r.try_get::<String, _>("code").unwrap_or_default(),
                name: r.try_get::<String, _>("name").unwrap_or_default(),
                product_code: r
                    .try_get::<Option<String>, _>("product_code")
                    .ok()
                    .flatten(),
                product_name: r
                    .try_get::<Option<String>, _>("product_name")
                    .ok()
                    .flatten(),
                inspection_type: r
                    .try_get::<String, _>("inspection_type")
                    .unwrap_or_default(),
                standard_values: values,
                status: r
                    .try_get::<Option<String>, _>("status")
                    .ok()
                    .flatten()
                    .unwrap_or_else(|| "active".to_string()),
                version: r.try_get::<Option<String>, _>("version").ok().flatten(),
                effective_date: r
                    .try_get::<Option<String>, _>("effective_date")
                    .ok()
                    .flatten(),
                description: r.try_get::<Option<String>, _>("description").ok().flatten(),
                created_at: datetime_to_string(
                    r.try_get::<Option<NaiveDateTime>, _>("created_at")
                        .ok()
                        .flatten(),
                ),
                updated_at: datetime_to_string(
                    r.try_get::<Option<NaiveDateTime>, _>("updated_at")
                        .ok()
                        .flatten(),
                ),
            }
        })
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "standards": standards,
            "total": total.expect("count failed"),
            "page": page,
            "pagesize": pagesize,
        }),
        "获取质量标准列表成功",
    ))
}

pub async fn get_standard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<StandardResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的质量标准ID"));
        }
    };

    let standard_result = sqlx::query!(
        r#"
        SELECT
            qs.id, qs.code, qs.name, qs.product_code, qs.product_name,
            qs.inspection_type, qs.status, qs.version,
            qs.effective_date, qs.description,
            qs.created_at, qs.updated_at
        FROM quality_standards qs
        WHERE qs.id = $1
        "#,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    let standard = match standard_result {
        Ok(r) => r,
        Err(sqlx::Error::RowNotFound) => {
            return Json(ApiResponse::error(404, "质量标准不存在"));
        }
        Err(e) => {
            tracing::error!("Failed to get quality standard: {}", e);
            return Json(ApiResponse::error(500, "获取质量标准失败"));
        }
    };

    let values_result = sqlx::query!(
        r#"
        SELECT
            qsv.id, qsv.standard_id, qsv.item_name, qsv.lower_limit,
            qsv.upper_limit, qsv.unit, qsv.inspection_method, qsv.remark
        FROM quality_standard_values qsv
        WHERE qsv.standard_id = $1
        "#,
        uuid,
    )
    .fetch_all(&state.pool)
    .await;

    let standard_values: Vec<StandardValueResponse> = match values_result {
        Ok(rows) => rows
            .into_iter()
            .map(|v| StandardValueResponse {
                id: v.id.to_string(),
                standard_id: v.standard_id.to_string(),
                item_name: v.item_name,
                lower_limit: opt_big_decimal_to_f64(v.lower_limit),
                upper_limit: opt_big_decimal_to_f64(v.upper_limit),
                unit: v.unit,
                inspection_method: v.inspection_method,
                remark: v.remark,
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to get standard values: {}", e);
            Vec::new()
        }
    };

    Json(ApiResponse::success(
        StandardResponse {
            id: standard.id.to_string(),
            code: standard.code,
            name: standard.name,
            product_code: standard.product_code,
            product_name: standard.product_name,
            inspection_type: standard.inspection_type,
            standard_values,
            status: standard.status.unwrap_or_else(|| "active".to_string()),
            version: standard.version,
            effective_date: standard.effective_date,
            description: standard.description,
            created_at: datetime_to_string(standard.created_at),
            updated_at: datetime_to_string(standard.updated_at),
        },
        "获取质量标准成功",
    ))
}

pub async fn create_standard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateStandardRequest>,
) -> Json<ApiResponse<StandardResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "创建质量标准失败"));
        }
    };

    let standard_result = sqlx::query!(
        r#"
        INSERT INTO quality_standards (
            code, name, product_code, product_name, inspection_type,
            status, version, effective_date, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
            id, code, name, product_code, product_name,
            inspection_type, status, version,
            effective_date, description,
            created_at, updated_at
        "#,
        body.code,
        body.name,
        body.product_code,
        body.product_name,
        body.inspection_type,
        body.status.unwrap_or_else(|| "active".to_string()),
        body.version,
        body.effective_date,
        body.description,
    )
    .fetch_one(&mut *tx)
    .await;

    let standard = match standard_result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create quality standard: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "创建质量标准失败"));
        }
    };

    let mut values: Vec<StandardValueResponse> = Vec::new();

    if let Some(standard_values) = &body.standard_values {
        for v in standard_values {
            let lower_limit = v
                .lower_limit
                .and_then(|x| BigDecimal::from_str(&x.to_string()).ok());
            let upper_limit = v
                .upper_limit
                .and_then(|x| BigDecimal::from_str(&x.to_string()).ok());

            let value_result = sqlx::query!(
                r#"
                INSERT INTO quality_standard_values (
                    standard_id, item_name, lower_limit, upper_limit,
                    unit, inspection_method, remark
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, standard_id, item_name, lower_limit, upper_limit,
                    unit, inspection_method, remark
                "#,
                standard.id,
                v.item_name,
                lower_limit,
                upper_limit,
                v.unit,
                v.inspection_method,
                v.remark,
            )
            .fetch_one(&mut *tx)
            .await;

            match value_result {
                Ok(r) => {
                    values.push(StandardValueResponse {
                        id: r.id.to_string(),
                        standard_id: r.standard_id.to_string(),
                        item_name: r.item_name,
                        lower_limit: opt_big_decimal_to_f64(r.lower_limit),
                        upper_limit: opt_big_decimal_to_f64(r.upper_limit),
                        unit: r.unit,
                        inspection_method: r.inspection_method,
                        remark: r.remark,
                    });
                }
                Err(e) => {
                    tracing::error!("Failed to insert standard value: {}", e);
                    let _ = tx.rollback().await;
                    return Json(ApiResponse::error(500, "创建质量标准值失败"));
                }
            }
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "创建质量标准失败"));
    }

    Json(ApiResponse::success(
        StandardResponse {
            id: standard.id.to_string(),
            code: standard.code,
            name: standard.name,
            product_code: standard.product_code,
            product_name: standard.product_name,
            inspection_type: standard.inspection_type,
            standard_values: values,
            status: standard.status.unwrap_or_else(|| "active".to_string()),
            version: standard.version,
            effective_date: standard.effective_date,
            description: standard.description,
            created_at: datetime_to_string(standard.created_at),
            updated_at: datetime_to_string(standard.updated_at),
        },
        "创建质量标准成功",
    ))
}

pub async fn update_standard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateStandardRequest>,
) -> Json<ApiResponse<StandardResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的质量标准ID"));
        }
    };

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "更新质量标准失败"));
        }
    };

    let standard_result = sqlx::query!(
        r#"
        UPDATE quality_standards
        SET
            code = COALESCE($1, code),
            name = COALESCE($2, name),
            product_code = COALESCE($3, product_code),
            product_name = COALESCE($4, product_name),
            inspection_type = COALESCE($5, inspection_type),
            status = COALESCE($6, status),
            version = COALESCE($7, version),
            effective_date = COALESCE($8, effective_date),
            description = COALESCE($9, description),
            updated_at = NOW()
        WHERE id = $10
        RETURNING
            id, code, name, product_code, product_name,
            inspection_type, status, version,
            effective_date, description,
            created_at, updated_at
        "#,
        body.code,
        body.name,
        body.product_code,
        body.product_name,
        body.inspection_type,
        body.status,
        body.version,
        body.effective_date,
        body.description,
        uuid,
    )
    .fetch_one(&mut *tx)
    .await;

    let standard = match standard_result {
        Ok(r) => r,
        Err(sqlx::Error::RowNotFound) => {
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(404, "质量标准不存在"));
        }
        Err(e) => {
            tracing::error!("Failed to update quality standard: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "更新质量标准失败"));
        }
    };

    let mut values: Vec<StandardValueResponse> = Vec::new();

    if let Some(standard_values) = &body.standard_values {
        let delete_result = sqlx::query!(
            r#"
            DELETE FROM quality_standard_values WHERE standard_id = $1
            "#,
            uuid,
        )
        .execute(&mut *tx)
        .await;

        if let Err(e) = delete_result {
            tracing::error!("Failed to clear standard values: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "更新质量标准值失败"));
        }

        for v in standard_values {
            let lower_limit = v
                .lower_limit
                .and_then(|x| BigDecimal::from_str(&x.to_string()).ok());
            let upper_limit = v
                .upper_limit
                .and_then(|x| BigDecimal::from_str(&x.to_string()).ok());

            let value_result = sqlx::query!(
                r#"
                INSERT INTO quality_standard_values (
                    standard_id, item_name, lower_limit, upper_limit,
                    unit, inspection_method, remark
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, standard_id, item_name, lower_limit, upper_limit,
                    unit, inspection_method, remark
                "#,
                uuid,
                v.item_name,
                lower_limit,
                upper_limit,
                v.unit,
                v.inspection_method,
                v.remark,
            )
            .fetch_one(&mut *tx)
            .await;

            match value_result {
                Ok(r) => {
                    values.push(StandardValueResponse {
                        id: r.id.to_string(),
                        standard_id: r.standard_id.to_string(),
                        item_name: r.item_name,
                        lower_limit: opt_big_decimal_to_f64(r.lower_limit),
                        upper_limit: opt_big_decimal_to_f64(r.upper_limit),
                        unit: r.unit,
                        inspection_method: r.inspection_method,
                        remark: r.remark,
                    });
                }
                Err(e) => {
                    tracing::error!("Failed to insert standard value: {}", e);
                    let _ = tx.rollback().await;
                    return Json(ApiResponse::error(500, "更新质量标准值失败"));
                }
            }
        }
    } else {
        let values_result = sqlx::query!(
            r#"
            SELECT
                qsv.id, qsv.standard_id, qsv.item_name, qsv.lower_limit,
                qsv.upper_limit, qsv.unit, qsv.inspection_method, qsv.remark
            FROM quality_standard_values qsv
            WHERE qsv.standard_id = $1
            "#,
            uuid,
        )
        .fetch_all(&mut *tx)
        .await;

        if let Ok(rows) = values_result {
            for v in rows {
                values.push(StandardValueResponse {
                    id: v.id.to_string(),
                    standard_id: v.standard_id.to_string(),
                    item_name: v.item_name,
                    lower_limit: opt_big_decimal_to_f64(v.lower_limit),
                    upper_limit: opt_big_decimal_to_f64(v.upper_limit),
                    unit: v.unit,
                    inspection_method: v.inspection_method,
                    remark: v.remark,
                });
            }
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "更新质量标准失败"));
    }

    Json(ApiResponse::success(
        StandardResponse {
            id: standard.id.to_string(),
            code: standard.code,
            name: standard.name,
            product_code: standard.product_code,
            product_name: standard.product_name,
            inspection_type: standard.inspection_type,
            standard_values: values,
            status: standard.status.unwrap_or_else(|| "active".to_string()),
            version: standard.version,
            effective_date: standard.effective_date,
            description: standard.description,
            created_at: datetime_to_string(standard.created_at),
            updated_at: datetime_to_string(standard.updated_at),
        },
        "更新质量标准成功",
    ))
}

pub async fn delete_standard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的质量标准ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        DELETE FROM quality_standards WHERE id = $1
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id, "删除质量标准成功")),
        Err(e) => {
            tracing::error!("Failed to delete quality standard: {}", e);
            Json(ApiResponse::error(500, "删除质量标准失败"))
        }
    }
}
