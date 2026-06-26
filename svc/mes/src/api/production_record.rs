//! Production Record handlers

use axum::{extract::Path, extract::State, extract::Extension, routing::{delete, get, post, put}, Json, Router};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::{Uuid, BigDecimal}, PgPool};
use std::str::FromStr;
use topems_shared::auth::Claims;

use crate::AppState;
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/mes/records", get(list_records).post(create_record))
        .route("/api/mes/records/{id}", get(get_record).put(update_record).delete(delete_record))
        .route("/api/mes/records/{id}/complete", post(complete_record))
}

// ==================== Data Types ====================

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
}

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d)).unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<NaiveDateTime>) -> Option<DateTime<Utc>> {
    dt.map(|d| Utc.from_utc_datetime(&d))
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok()).unwrap_or(0.0)
}

fn f64_to_big_decimal(f: Option<f64>) -> Option<BigDecimal> {
    f.and_then(|v| BigDecimal::from_str(&v.to_string()).ok())
}

// ==================== Production Record Handlers ====================

pub async fn list_records(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<ListRecordsResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::RecordRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, order_id, process_id, work_station_id, equipment_id,
            operator_id, start_time, end_time,
            quantity_produced, quantity_defective, status, notes,
            created_at, updated_at
        FROM production_records
        ORDER BY start_time DESC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let records = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch records: {}", e);
            return Json(ApiResponse::error(500, "获取生产记录列表失败"));
        }
    };

    let records: Vec<ProductionRecordResponse> = records.into_iter().map(|r| ProductionRecordResponse {
        id: r.id,
        order_id: r.order_id,
        process_id: r.process_id,
        work_station_id: r.work_station_id,
        equipment_id: r.equipment_id,
        operator_id: r.operator_id,
        start_time: naive_to_utc(Some(r.start_time)),
        end_time: opt_naive_to_utc(r.end_time),
        quantity_produced: big_decimal_to_f64(r.quantity_produced),
        quantity_defective: big_decimal_to_f64(r.quantity_defective),
        status: r.status.unwrap_or_else(|| "in_progress".to_string()),
        notes: r.notes,
        created_at: naive_to_utc(r.created_at),
        updated_at: naive_to_utc(r.updated_at),
    }).collect();

    let total = records.len() as i64;

    Json(ApiResponse::success(
        ListRecordsResponse {
            records,
            total,
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
            order_id, process_id, work_station_id, equipment_id,
            operator_id, start_time, end_time,
            quantity_produced, quantity_defective, status, notes,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8, 'in_progress', $9, $10, $10)
        RETURNING 
            id, order_id, process_id, work_station_id, equipment_id,
            operator_id, start_time, end_time,
            quantity_produced, quantity_defective, status, notes,
            created_at, updated_at
        "#,
        req.order_id,
        req.process_id,
        req.work_station_id,
        req.equipment_id,
        req.operator_id,
        req.start_time.naive_utc(),
        f64_to_big_decimal(req.quantity_produced),
        f64_to_big_decimal(req.quantity_defective),
        req.notes,
        now.naive_utc(),
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
        start_time: naive_to_utc(Some(result.start_time)),
        end_time: opt_naive_to_utc(result.end_time),
        quantity_produced: big_decimal_to_f64(result.quantity_produced),
        quantity_defective: big_decimal_to_f64(result.quantity_defective),
        status: result.status.unwrap_or_else(|| "in_progress".to_string()),
        notes: result.notes,
        created_at: naive_to_utc(result.created_at),
        updated_at: naive_to_utc(result.updated_at),
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
            id, order_id, process_id, work_station_id, equipment_id,
            operator_id, start_time, end_time,
            quantity_produced, quantity_defective, status, notes,
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
                equipment_id: r.equipment_id,
                operator_id: r.operator_id,
                start_time: naive_to_utc(Some(r.start_time)),
                end_time: opt_naive_to_utc(r.end_time),
                quantity_produced: big_decimal_to_f64(r.quantity_produced),
                quantity_defective: big_decimal_to_f64(r.quantity_defective),
                status: r.status.unwrap_or_else(|| "in_progress".to_string()),
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
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
    let status = if req.end_time.is_some() { "completed" } else { "in_progress" };

    let result = sqlx::query!(
        r#"
        UPDATE production_records SET
            process_id = COALESCE($2, process_id),
            work_station_id = COALESCE($3, work_station_id),
            equipment_id = COALESCE($4, equipment_id),
            operator_id = COALESCE($5, operator_id),
            end_time = COALESCE($6, end_time),
            quantity_produced = COALESCE($7, quantity_produced),
            quantity_defective = COALESCE($8, quantity_defective),
            status = $9,
            notes = COALESCE($10, notes),
            updated_at = $11
        WHERE id = $1
        RETURNING 
            id, order_id, process_id, work_station_id, equipment_id,
            operator_id, start_time, end_time,
            quantity_produced, quantity_defective, status, notes,
            created_at, updated_at
        "#,
        id,
        req.process_id,
        req.work_station_id,
        req.equipment_id,
        req.operator_id,
        req.end_time.map(|t| t.naive_utc()),
        f64_to_big_decimal(req.quantity_produced),
        f64_to_big_decimal(req.quantity_defective),
        status,
        req.notes,
        now.naive_utc(),
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
                equipment_id: r.equipment_id,
                operator_id: r.operator_id,
                start_time: naive_to_utc(Some(r.start_time)),
                end_time: opt_naive_to_utc(r.end_time),
                quantity_produced: big_decimal_to_f64(r.quantity_produced),
                quantity_defective: big_decimal_to_f64(r.quantity_defective),
                status: r.status.unwrap_or_else(|| "in_progress".to_string()),
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
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
        DELETE FROM production_records
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
            id, order_id, process_id, work_station_id, equipment_id,
            operator_id, start_time, end_time,
            quantity_produced, quantity_defective, status, notes,
            created_at, updated_at
        "#,
        id,
        now.naive_utc(),
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
                equipment_id: r.equipment_id,
                operator_id: r.operator_id,
                start_time: naive_to_utc(Some(r.start_time)),
                end_time: opt_naive_to_utc(r.end_time),
                quantity_produced: big_decimal_to_f64(r.quantity_produced),
                quantity_defective: big_decimal_to_f64(r.quantity_defective),
                status: r.status.unwrap_or_else(|| "completed".to_string()),
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(record, "生产记录完成成功"))
        }
        None => Json(ApiResponse::error(404, "生产记录不存在或状态不允许完成")),
    }
}
