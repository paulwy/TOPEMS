use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub code: u16,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        Self {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: u16, message: &str) -> Self {
        Self {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Instrument {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub serial_number: Option<String>,
    pub status: String,
    pub location: Option<String>,
    pub purchase_date: Option<chrono::DateTime<chrono::Utc>>,
    pub calibration_date: Option<chrono::DateTime<chrono::Utc>>,
    pub next_calibration_date: Option<chrono::DateTime<chrono::Utc>>,
    pub maintenance_history: serde_json::Value,
    pub responsible_person: Option<String>,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInstrumentRequest {
    pub name: String,
    pub code: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub serial_number: Option<String>,
    pub status: String,
    pub location: Option<String>,
    pub purchase_date: Option<String>,
    pub calibration_date: Option<String>,
    pub next_calibration_date: Option<String>,
    pub responsible_person: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInstrumentRequest {
    pub name: Option<String>,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub serial_number: Option<String>,
    pub status: Option<String>,
    pub location: Option<String>,
    pub calibration_date: Option<String>,
    pub next_calibration_date: Option<String>,
    pub responsible_person: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CalibrationRecordRequest {
    pub calibration_date: String,
    pub calibrated_by: String,
    pub calibration_results: serde_json::Value,
    pub notes: Option<String>,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/instruments", get(list_instruments).post(create_instrument))
        .route(
            "/api/v1/instruments/{id}",
            get(get_instrument).put(update_instrument).delete(delete_instrument),
        )
        .route("/api/v1/instruments/{id}/calibrations", get(get_calibrations).post(add_calibration))
        .with_state(state);

    Ok(app)
}

async fn list_instruments(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Instrument>(
        r#"
        SELECT id, name, code, model, manufacturer, serial_number, status,
               location, purchase_date, calibration_date, next_calibration_date,
               maintenance_history, responsible_person, description,
               created_at, updated_at
        FROM instruments
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&params.search)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(instruments) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM instruments
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&params.search)
            .bind(&params.status)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "instruments": instruments,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取仪器列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取仪器列表失败: {}", e);
            Json(ApiResponse::error(500, "获取仪器列表失败"))
        }
    }
}

async fn create_instrument(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateInstrumentRequest>,
) -> Json<ApiResponse<Instrument>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Instrument>(
        r#"
        INSERT INTO instruments (
            id, name, code, model, manufacturer, serial_number, status,
            location, purchase_date, calibration_date, next_calibration_date,
            maintenance_history, responsible_person, description,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, name, code, model, manufacturer, serial_number, status,
                  location, purchase_date, calibration_date, next_calibration_date,
                  maintenance_history, responsible_person, description,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.model)
    .bind(&req.manufacturer)
    .bind(&req.serial_number)
    .bind(&req.status)
    .bind(&req.location)
    .bind(req.purchase_date)
    .bind(req.calibration_date)
    .bind(req.next_calibration_date)
    .bind(serde_json::json!([]))
    .bind(&req.responsible_person)
    .bind(&req.description)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(instrument) => Json(ApiResponse::success(instrument, "仪器创建成功")),
        Err(e) => {
            tracing::error!("创建仪器失败: {}", e);
            Json(ApiResponse::error(500, "仪器创建失败"))
        }
    }
}

async fn get_instrument(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Instrument>> {
    let result = sqlx::query_as::<_, Instrument>(
        r#"
        SELECT id, name, code, model, manufacturer, serial_number, status,
               location, purchase_date, calibration_date, next_calibration_date,
               maintenance_history, responsible_person, description,
               created_at, updated_at
        FROM instruments WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(instrument)) => Json(ApiResponse::success(instrument, "获取仪器成功")),
        Ok(None) => Json(ApiResponse::error(404, "仪器不存在")),
        Err(e) => {
            tracing::error!("获取仪器失败: {}", e);
            Json(ApiResponse::error(500, "获取仪器失败"))
        }
    }
}

async fn update_instrument(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInstrumentRequest>,
) -> Json<ApiResponse<Instrument>> {
    let existing = sqlx::query_as::<_, Instrument>(
        "SELECT id, name, code, model, manufacturer, serial_number, status, location, purchase_date, calibration_date, next_calibration_date, maintenance_history, responsible_person, description, created_at, updated_at FROM instruments WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(ApiResponse::error(404, "仪器不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询仪器失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Instrument>(
        r#"
        UPDATE instruments SET
            name = $2, model = $3, manufacturer = $4, serial_number = $5,
            status = $6, location = $7, calibration_date = $8,
            next_calibration_date = $9, responsible_person = $10,
            description = $11, updated_at = $12
        WHERE id = $1
        RETURNING id, name, code, model, manufacturer, serial_number, status,
                  location, purchase_date, calibration_date, next_calibration_date,
                  maintenance_history, responsible_person, description,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&req.model)
    .bind(&req.manufacturer)
    .bind(&req.serial_number)
    .bind(&status)
    .bind(&req.location)
    .bind(req.calibration_date)
    .bind(req.next_calibration_date)
    .bind(&req.responsible_person)
    .bind(&req.description)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(instrument) => Json(ApiResponse::success(instrument, "仪器更新成功")),
        Err(e) => {
            tracing::error!("更新仪器失败: {}", e);
            Json(ApiResponse::error(500, "仪器更新失败"))
        }
    }
}

async fn delete_instrument(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM instruments WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "仪器删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "仪器不存在")),
        Err(e) => {
            tracing::error!("删除仪器失败: {}", e);
            Json(ApiResponse::error(500, "仪器删除失败"))
        }
    }
}

async fn get_calibrations(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let result = sqlx::query_as::<_, (Option<serde_json::Value>,)>(
        r#"
        SELECT json_agg(
            json_build_object(
                'id', id,
                'instrument_id', instrument_id,
                'calibration_date', calibration_date,
                'calibrated_by', calibrated_by,
                'calibration_results', calibration_results,
                'notes', notes,
                'created_at', created_at
            )
        ) as calibrations
        FROM instrument_calibrations
        WHERE instrument_id = $1
        ORDER BY calibration_date DESC
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok((calibrations,)) => {
            let calibrations = calibrations.unwrap_or(serde_json::json!([]));
            Json(ApiResponse::success(calibrations.as_array().unwrap_or(&vec![]).clone(), "获取校准记录成功"))
        }
        Err(e) => {
            tracing::error!("获取校准记录失败: {}", e);
            Json(ApiResponse::error(500, "获取校准记录失败"))
        }
    }
}

async fn add_calibration(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<CalibrationRecordRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let record_id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO instrument_calibrations (
            id, instrument_id, calibration_date, calibrated_by, calibration_results, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(record_id)
    .bind(id)
    .bind(&req.calibration_date)
    .bind(&req.calibrated_by)
    .bind(&req.calibration_results)
    .bind(&req.notes)
    .bind(now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => {
            sqlx::query(
                r#"
                UPDATE instruments SET
                    calibration_date = $2,
                    next_calibration_date = $3,
                    updated_at = $4
                WHERE id = $1
                "#,
            )
            .bind(id)
            .bind(&req.calibration_date.clone())
            .bind(req.calibration_date.clone())
            .bind(now)
            .execute(&state.db)
            .await
            .ok();

            Json(ApiResponse::success(
                serde_json::json!({
                    "id": record_id,
                    "created_at": now
                }),
                "校准记录添加成功",
            ))
        }
        Err(e) => {
            tracing::error!("添加校准记录失败: {}", e);
            Json(ApiResponse::error(500, "添加校准记录失败"))
        }
    }
}