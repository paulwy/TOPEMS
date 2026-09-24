//! Production Record handlers

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
use topems_shared_auth::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/records", get(list_records).post(create_record))
        .route(
            "/records/{id}",
            get(get_record).put(update_record).delete(delete_record),
        )
        .route("/records/{id}/complete", post(complete_record))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListRecordsQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateRecordRequest {
    pub order_id: Uuid,
    pub process_id: Option<Uuid>,
    pub work_station_id: Option<Uuid>,
    pub equipment_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub start_time: DateTime<Utc>,
    pub quantity_produced: Option<f64>,
    pub quantity_defective: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateRecordRequest {
    pub process_id: Option<Uuid>,
    pub work_station_id: Option<Uuid>,
    pub equipment_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub end_time: Option<DateTime<Utc>>,
    pub quantity_produced: Option<f64>,
    pub quantity_defective: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProductionRecordResponse {
    pub id: Uuid,
    pub order_id: Uuid,
    pub process_id: Option<Uuid>,
    pub work_station_id: Option<Uuid>,
    pub equipment_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub quantity_produced: f64,
    pub quantity_defective: f64,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListRecordsResponse {
    pub records: Vec<ProductionRecordResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<DateTime<Utc>>) -> Option<DateTime<Utc>> {
    dt
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}

fn f64_to_big_decimal(f: Option<f64>) -> Option<BigDecimal> {
    f.and_then(|v| BigDecimal::from_str(&v.to_string()).ok())
}

// ==================== Production Record Handlers ====================

pub async fn list_records(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListRecordsQuery>,
) -> Json<ApiResponse<ListRecordsResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordRead).await {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE deleted_at IS NULL");

    if let Some(status) = query.status {
        where_clause.push_str(" AND status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" AND (notes ILIKE $1 OR operator_id::text ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (notes ILIKE ${} OR operator_id::text ILIKE ${})",
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM production_records{}",
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
            tracing::error!("Failed to count records: {}", e);
            return Json(ApiResponse::error(500, "获取生产记录列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, order_id, process_id, work_station_id, NULL::uuid AS equipment_id,
            operator_id, start_time, end_time,
            completed_quantity AS quantity_produced, NULL::int AS quantity_defective, status, notes,
            created_at, updated_at
        FROM production_records
        {}
        ORDER BY start_time DESC
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

    let records = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch records: {}", e);
            return Json(ApiResponse::error(500, "获取生产记录列表失败"));
        }
    };

    let records_list: Vec<ProductionRecordResponse> = records
        .into_iter()
        .map(|r| ProductionRecordResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            order_id: r.try_get::<Uuid, _>("order_id").unwrap_or_default(),
            process_id: r.try_get::<Option<Uuid>, _>("process_id").ok().flatten(),
            work_station_id: r
                .try_get::<Option<Uuid>, _>("work_station_id")
                .ok()
                .flatten(),
            equipment_id: r.try_get::<Option<Uuid>, _>("equipment_id").ok().flatten(),
            operator_id: r.try_get::<Option<Uuid>, _>("operator_id").ok().flatten(),
            start_time: naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("start_time")
                    .ok()
                    .flatten(),
            ),
            end_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("end_time")
                    .ok()
                    .flatten(),
            ),
            quantity_produced: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity_produced")
                    .ok()
                    .flatten(),
            ),
            quantity_defective: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity_defective")
                    .ok()
                    .flatten(),
            ),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "in_progress".to_string()),
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
        ListRecordsResponse {
            records: records_list,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取生产记录列表成功",
    ))
}

pub async fn create_record(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateRecordRequest>,
) -> Json<ApiResponse<ProductionRecordResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordWrite).await {
        return e;
    }

    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        INSERT INTO production_records (
            order_id, process_id, work_station_id,
            operator_id, start_time, end_time,
            completed_quantity, status, notes,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NULL, $6, 'in_progress', $7, $8, $8)
        RETURNING 
            id, order_id, process_id, work_station_id, NULL::uuid AS equipment_id,
            operator_id, start_time, end_time,
            completed_quantity AS quantity_produced, NULL::int AS quantity_defective, status, notes,
            created_at, updated_at
        "#,
        req.order_id,
        req.process_id,
        req.work_station_id,
        req.operator_id,
        req.start_time,
        req.quantity_produced.map(|v| v as f64),
        req.notes,
        now,
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create record: {}", e);
            return Json(ApiResponse::error(500, "创建生产记录失败"));
        }
    };

    let record = ProductionRecordResponse {
        id: result.id,
        order_id: result.order_id,
        process_id: result.process_id,
        work_station_id: result.work_station_id,
        equipment_id: result.equipment_id,
        operator_id: result.operator_id,
        start_time: result.start_time,
        end_time: result.end_time.map(|d| d),
        quantity_produced: result.quantity_produced.unwrap_or_default(),
        quantity_defective: result
            .quantity_defective
            .map(|v| v as f64)
            .unwrap_or_default(),
        status: result.status.unwrap_or_default(),
        notes: result.notes,
        created_at: result.created_at,
        updated_at: result.updated_at,
    };

    Json(ApiResponse::success(record, "生产记录创建成功"))
}

pub async fn get_record(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionRecordResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, order_id, process_id, work_station_id, NULL::uuid AS equipment_id,
            operator_id, start_time, end_time,
            completed_quantity AS quantity_produced, NULL::int AS quantity_defective, status, notes,
            created_at, updated_at
        FROM production_records
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch record: {}", e);
            return Json(ApiResponse::error(500, "获取生产记录失败"));
        }
    };

    match result {
        Some(r) => {
            let record = ProductionRecordResponse {
                id: r.id,
                order_id: r.order_id,
                process_id: r.process_id,
                work_station_id: r.work_station_id,
                equipment_id: Some(r.equipment_id.unwrap_or_default()),
                operator_id: r.operator_id,
                start_time: r.start_time,
                end_time: r.end_time.map(|d| d),
                quantity_produced: r.quantity_produced.unwrap_or_default(),
                quantity_defective: r.quantity_defective.map(|v| v as f64).unwrap_or_default(),
                status: r.status.unwrap_or_default(),
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            Json(ApiResponse::success(record, "获取生产记录成功"))
        }
        None => Json(ApiResponse::error(404, "生产记录不存在")),
    }
}

pub async fn update_record(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateRecordRequest>,
) -> Json<ApiResponse<ProductionRecordResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordWrite).await {
        return e;
    }

    let now = Utc::now();
    let status = if req.end_time.is_some() {
        "completed"
    } else {
        "in_progress"
    };

    let result = sqlx::query!(
        r#"
        UPDATE production_records SET
            process_id = COALESCE($2, process_id),
            work_station_id = COALESCE($3, work_station_id),
            operator_id = COALESCE($4, operator_id),
            end_time = COALESCE($5, end_time),
            completed_quantity = COALESCE($6, completed_quantity),
            status = $7,
            notes = COALESCE($8, notes),
            updated_at = $9
        WHERE id = $1
        RETURNING 
            id, order_id, process_id, work_station_id, NULL::uuid AS equipment_id,
            operator_id, start_time, end_time,
            completed_quantity AS quantity_produced, NULL::int AS quantity_defective, status, notes,
            created_at, updated_at
        "#,
        id,
        req.process_id,
        req.work_station_id,
        req.operator_id,
        req.end_time,
        req.quantity_produced.map(|v| v as f64),
        status,
        req.notes,
        now,
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update record: {}", e);
            return Json(ApiResponse::error(500, "更新生产记录失败"));
        }
    };

    match result {
        Some(r) => {
            let record = ProductionRecordResponse {
                id: r.id,
                order_id: r.order_id,
                process_id: r.process_id,
                work_station_id: r.work_station_id,
                equipment_id: Some(r.equipment_id.unwrap_or_default()),
                operator_id: r.operator_id,
                start_time: r.start_time,
                end_time: r.end_time.map(|d| d),
                quantity_produced: r.quantity_produced.unwrap_or_default(),
                quantity_defective: r.quantity_defective.map(|v| v as f64).unwrap_or_default(),
                status: r.status.unwrap_or_default(),
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            Json(ApiResponse::success(record, "生产记录更新成功"))
        }
        None => Json(ApiResponse::error(404, "生产记录不存在")),
    }
}

pub async fn delete_record(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordWrite).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE production_records SET deleted_at = NOW()
        WHERE id = $1
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete record: {}", e);
            return Json(ApiResponse::error(500, "删除生产记录失败"));
        }
    };

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "生产记录删除成功"))
    } else {
        Json(ApiResponse::error(404, "生产记录不存在"))
    }
}

pub async fn complete_record(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionRecordResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordWrite).await {
        return e;
    }

    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        UPDATE production_records SET
            end_time = $2,
            status = 'completed',
            updated_at = $2
        WHERE id = $1 AND status = 'in_progress'
        RETURNING 
            id, order_id, process_id, work_station_id, NULL::uuid AS equipment_id,
            operator_id, start_time, end_time,
            completed_quantity AS quantity_produced, NULL::int AS quantity_defective, status, notes,
            created_at, updated_at
        "#,
        id,
        now,
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to complete record: {}", e);
            return Json(ApiResponse::error(500, "完成生产记录失败"));
        }
    };

    match result {
        Some(r) => {
            let record = ProductionRecordResponse {
                id: r.id,
                order_id: r.order_id,
                process_id: r.process_id,
                work_station_id: r.work_station_id,
                equipment_id: Some(r.equipment_id.unwrap_or_default()),
                operator_id: r.operator_id,
                start_time: r.start_time,
                end_time: r.end_time.map(|d| d),
                quantity_produced: r.quantity_produced.unwrap_or_default(),
                quantity_defective: r.quantity_defective.map(|v| v as f64).unwrap_or_default(),
                status: r.status.unwrap_or_default(),
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            Json(ApiResponse::success(record, "生产记录完成成功"))
        }
        None => Json(ApiResponse::error(404, "生产记录不存在或状态不允许完成")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Datelike, NaiveDate, Timelike};

    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = NaiveDate::from_ymd_opt(2024, 7, 1)
            .unwrap()
            .and_hms_opt(9, 45, 0)
            .unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.naive_utc().date(), dt.date());
        assert_eq!(utc.naive_utc().time(), dt.time());
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
        let dt = NaiveDate::from_ymd_opt(2024, 2, 28)
            .unwrap()
            .and_hms_opt(23, 59, 59)
            .unwrap();
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

    #[test]
    fn f64_to_big_decimal_roundtrip() {
        let bd = f64_to_big_decimal(Some(3.5)).unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 3.5);
    }

    #[test]
    fn f64_to_big_decimal_none() {
        assert!(f64_to_big_decimal(None).is_none());
    }

    #[test]
    fn f64_to_big_decimal_zero() {
        let bd = f64_to_big_decimal(Some(0.0)).unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 0.0);
    }
}
