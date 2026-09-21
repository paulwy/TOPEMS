use axum::{
    extract::State,
    routing::{get, post, put},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow, Row};
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use crate::shared::AppState;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_auth::auth::Claims;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/instruments",
            get(list_instruments).post(create_instrument),
        )
        .route(
            "/instruments/{id}",
            get(get_instrument)
                .put(update_instrument)
                .delete(delete_instrument),
        )
        .route("/instruments/{id}/calibration", post(calibrate))
        .route(
            "/instruments/{id}/calibrations",
            get(get_calibration_history),
        )
        .route("/instruments/{id}/maintenance", get(list_maintenance))
        .route("/maintenance", post(create_maintenance))
        .route(
            "/maintenance/{id}",
            put(update_maintenance).delete(delete_maintenance),
        )
}

#[derive(Debug, Deserialize)]
pub struct InstrumentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Instrument {
    pub id: String,
    pub tenant_id: String,
    pub instrument_no: String,
    pub name: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub status: String,
    pub location: Option<String>,
    pub last_calibration_at: Option<String>,
    pub next_calibration_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateInstrumentRequest {
    pub name: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub location: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInstrumentRequest {
    pub name: Option<String>,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub status: Option<String>,
    pub location: Option<String>,
    pub next_calibration_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CalibrationRequest {
    pub calibrated_by: String,
    pub next_calibration_at: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:instrument:read"])),
    path = "/lims/instruments",
    tag = "instrument",
    params(
        ("page" = Option<i64>, Query, description = "Page number"),
        ("page_size" = Option<i64>, Query, description = "Items per page"),
        ("status" = Option<String>, Query, description = "Filter by status"),
        ("name" = Option<String>, Query, description = "Filter by name"),
    ),
    responses(
        (status = 200, description = "List of instruments", body = ApiResponse<Vec<Instrument>>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_instruments(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<InstrumentQuery>,
) -> Json<ApiResponse<Vec<Instrument>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let sql = match (query.status.as_ref(), query.name.as_ref()) {
        (Some(_), Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, instrument_no, name, model, manufacturer, status, location, last_calibration_at::TEXT, next_calibration_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_instruments WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = $2 AND name LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        (Some(_), None) => "SELECT id::TEXT, tenant_id::TEXT, instrument_no, name, model, manufacturer, status, location, last_calibration_at::TEXT, next_calibration_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_instruments WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, Some(_)) => "SELECT id::TEXT, tenant_id::TEXT, instrument_no, name, model, manufacturer, status, location, last_calibration_at::TEXT, next_calibration_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_instruments WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND name LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        (None, None) => "SELECT id::TEXT, tenant_id::TEXT, instrument_no, name, model, manufacturer, status, location, last_calibration_at::TEXT, next_calibration_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_instruments WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    };

    let mut query_builder = sqlx::query(sql).bind(tenant_id);
    match (query.status.as_ref(), query.name.as_ref()) {
        (Some(st), Some(nm)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, Some(nm)) => {
            query_builder = query_builder
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let instruments = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| Instrument {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                instrument_no: row.get("instrument_no"),
                name: row.get("name"),
                model: row.get("model"),
                manufacturer: row.get("manufacturer"),
                status: row.get("status"),
                location: row.get("location"),
                last_calibration_at: row.get("last_calibration_at"),
                next_calibration_at: row.get("next_calibration_at"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match instruments {
        Ok(data) => Json(ApiResponse::success(data, "获取仪器列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch instruments: {}", e);
            Json(ApiResponse::error(500, "获取仪器列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:instrument:read"])),
    path = "/lims/instruments",
    tag = "instrument",
    request_body = CreateInstrumentRequest,
    responses(
        (status = 200, description = "Instrument created", body = ApiResponse<Instrument>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_instrument(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateInstrumentRequest>,
) -> Json<ApiResponse<Instrument>> {
    let instrument_no = format!(
        "INS-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let tenant_id = ctx.tenant_id;

    let row = sqlx::query(
        "INSERT INTO qa_lab_instruments (tenant_id, instrument_no, name, model, manufacturer, status, location) VALUES ($1, $2, $3, $4, $5, 'normal', $6) RETURNING id::TEXT, tenant_id::TEXT, instrument_no, name, model, manufacturer, status, location, last_calibration_at::TEXT, next_calibration_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(tenant_id)
    .bind(instrument_no)
    .bind(&req.name)
    .bind(&req.model)
    .bind(&req.manufacturer)
    .bind(&req.location)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Instrument {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                instrument_no: r.get("instrument_no"),
                name: r.get("name"),
                model: r.get("model"),
                manufacturer: r.get("manufacturer"),
                status: r.get("status"),
                location: r.get("location"),
                last_calibration_at: r.get("last_calibration_at"),
                next_calibration_at: r.get("next_calibration_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "仪器创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create instrument: {}", e);
            Json(ApiResponse::error(500, "仪器创建失败"))
        }
    }
}

pub async fn get_instrument(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Instrument>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的仪器ID")),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };

    let row = sqlx::query(
        "SELECT id::TEXT, tenant_id::TEXT, instrument_no, name, model, manufacturer, status, location, last_calibration_at::TEXT, next_calibration_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_instruments WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Instrument {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                instrument_no: r.get("instrument_no"),
                name: r.get("name"),
                model: r.get("model"),
                manufacturer: r.get("manufacturer"),
                status: r.get("status"),
                location: r.get("location"),
                last_calibration_at: r.get("last_calibration_at"),
                next_calibration_at: r.get("next_calibration_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取仪器成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

        Err(e) => {
            tracing::error!("Failed to fetch instrument: {}", e);
            Json(ApiResponse::error(500, "获取仪器失败"))
        }
    }
}

pub async fn update_instrument(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateInstrumentRequest>,
) -> Json<ApiResponse<Instrument>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的仪器ID")),
    };
    let tenant_id = ctx.tenant_id;

    let row = sqlx::query(
        "UPDATE qa_lab_instruments SET name = COALESCE($2, name), model = COALESCE($3, model), manufacturer = COALESCE($4, manufacturer), status = COALESCE($5, status), location = COALESCE($6, location), next_calibration_at = COALESCE($7, next_calibration_at), updated_at = NOW() WHERE id = $1 AND tenant_id = $8 RETURNING id::TEXT, tenant_id::TEXT, instrument_no, name, model, manufacturer, status, location, last_calibration_at::TEXT, next_calibration_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.model)
    .bind(&req.manufacturer)
    .bind(&req.status)
    .bind(&req.location)
    .bind(&req.next_calibration_at)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Instrument {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                instrument_no: r.get("instrument_no"),
                name: r.get("name"),
                model: r.get("model"),
                manufacturer: r.get("manufacturer"),
                status: r.get("status"),
                location: r.get("location"),
                last_calibration_at: r.get("last_calibration_at"),
                next_calibration_at: r.get("next_calibration_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "仪器更新成功",
        )),
        Err(e) => {
            tracing::error!("Failed to update instrument: {}", e);
            Json(ApiResponse::error(500, "仪器更新失败"))
        }
    }
}

pub async fn calibrate(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CalibrationRequest>,
) -> Json<ApiResponse<Instrument>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的仪器ID")),
    };
    let tenant_id = ctx.tenant_id;

    let row = sqlx::query(
        "UPDATE qa_lab_instruments SET last_calibration_at = NOW(), next_calibration_at = COALESCE($2, next_calibration_at), status = 'calibrated', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id::TEXT, tenant_id::TEXT, instrument_no, name, model, manufacturer, status, location, last_calibration_at::TEXT, next_calibration_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
    .bind(&req.next_calibration_at)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Instrument {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                instrument_no: r.get("instrument_no"),
                name: r.get("name"),
                model: r.get("model"),
                manufacturer: r.get("manufacturer"),
                status: r.get("status"),
                location: r.get("location"),
                last_calibration_at: r.get("last_calibration_at"),
                next_calibration_at: r.get("next_calibration_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "仪器校准成功",
        )),
        Err(e) => {
            tracing::error!("Failed to calibrate instrument: {}", e);
            Json(ApiResponse::error(500, "仪器校准失败"))
        }
    }
}

pub async fn delete_instrument(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的仪器ID")),
    };
    let tenant_id = ctx.tenant_id;

    let result = sqlx::query(
        "UPDATE qa_lab_instruments SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "仪器删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete instrument: {}", e);
            Json(ApiResponse::error(500, "仪器删除失败"))
        }
    }
}

// ========================================
// Calibration Schedule & History Management
// ========================================

#[derive(Debug, Serialize)]
pub struct CalibrationRecord {
    pub id: String,
    pub instrument_id: String,
    pub instrument_no: String,
    pub instrument_name: String,
    pub calibrated_by: String,
    pub calibration_date: String,
    pub next_calibration_date: Option<String>,
    pub calibration_result: String,
    pub parameters: Option<serde_json::Value>,
    pub notes: Option<String>,
    pub certificate_no: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct CalibrationSchedule {
    pub id: String,
    pub instrument_id: String,
    pub instrument_no: String,
    pub instrument_name: String,
    pub frequency_days: i32,
    pub last_calibration: Option<String>,
    pub next_calibration: Option<String>,
    pub is_overdue: bool,
    pub days_until_due: i32,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCalibrationRecordRequest {
    pub instrument_id: String,
    pub calibrated_by: String,
    pub calibration_date: Option<String>,
    pub next_calibration_date: Option<String>,
    pub calibration_result: String,
    pub parameters: Option<serde_json::Value>,
    pub notes: Option<String>,
    pub certificate_no: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCalibrationScheduleRequest {
    pub instrument_id: String,
    pub frequency_days: i32,
    pub start_date: Option<String>,
}

pub async fn get_calibration_history(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(instrument_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<CalibrationRecord>>> {
    let id = match Uuid::parse_str(&instrument_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的仪器ID")),
    };

    let rows = sqlx::query(
        r#"
        SELECT id::TEXT, instrument_id::TEXT, instrument_no, instrument_name,
               calibrated_by AS performed_by,
               calibration_date::TEXT, next_calibration_date::TEXT,
               calibration_result AS result,
               parameters, notes, certificate_no, created_at::TEXT
        FROM qa_lab_calibration_records
        WHERE instrument_id = $1
        ORDER BY calibration_date DESC
        "#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let records: Vec<CalibrationRecord> = rows
                .into_iter()
                .map(|row| CalibrationRecord {
                    id: row.get("id"),
                    instrument_id: row.get("instrument_id"),
                    instrument_no: row.get("instrument_no"),
                    instrument_name: row.get("instrument_name"),
                    calibrated_by: row.get("performed_by"),
                    calibration_date: row.get("calibration_date"),
                    next_calibration_date: row.get("next_calibration_date"),
                    calibration_result: row.get("result"),
                    parameters: row.get("parameters"),
                    notes: row.get("notes"),
                    certificate_no: row.get("certificate_no"),
                    created_at: row.get("created_at"),
                })
                .collect();
            Json(ApiResponse::success(records, "获取校准历史成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch calibration history: {}", e);
            Json(ApiResponse::error(500, "获取校准历史失败"))
        }
    }
}

pub async fn create_calibration_record(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<CreateCalibrationRecordRequest>,
) -> Json<ApiResponse<CalibrationRecord>> {
    let instrument_id = match Uuid::parse_str(&req.instrument_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的仪器ID")),
    };

    // Get instrument info
    let instrument_row = sqlx::query(
        "SELECT instrument_no, name FROM qa_lab_instruments WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(instrument_id)
    .fetch_optional(&state.pool)
    .await;

    let (instrument_no, instrument_name) = match instrument_row {
        Ok(Some(row)) => (
            row.get::<String, _>("instrument_no"),
            row.get::<String, _>("name"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "仪器不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询仪器失败: {}", e))),
    };

    let record_id = Uuid::new_v4();
    let calibration_date = req
        .calibration_date
        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lab_calibration_records (
            id, instrument_id, instrument_no, instrument_name, calibrated_by,
            calibration_date, next_calibration_date, calibration_result,
            parameters, notes, certificate_no, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING id::TEXT, instrument_id::TEXT, instrument_no, instrument_name, calibrated_by,
                  calibration_date::TEXT, next_calibration_date::TEXT, calibration_result,
                  parameters, notes, certificate_no, created_at::TEXT
        "#,
    )
    .bind(record_id)
    .bind(instrument_id)
    .bind(&instrument_no)
    .bind(&instrument_name)
    .bind(&req.calibrated_by)
    .bind(&calibration_date)
    .bind(&req.next_calibration_date)
    .bind(&req.calibration_result)
    .bind(&req.parameters)
    .bind(&req.notes)
    .bind(&req.certificate_no)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            // Update instrument's calibration dates
            let _ = sqlx::query(
                "UPDATE qa_lab_instruments SET last_calibration_at = $2, next_calibration_at = $3, updated_at = NOW() WHERE id = $1"
            )
            .bind(instrument_id)
            .bind(&calibration_date)
            .bind(&req.next_calibration_date)
            .execute(&state.pool)
            .await;

            Json(ApiResponse::success(
                CalibrationRecord {
                    id: r.get("id"),
                    instrument_id: r.get("instrument_id"),
                    instrument_no: r.get("instrument_no"),
                    instrument_name: r.get("instrument_name"),
                    calibrated_by: r.get("calibrated_by"),
                    calibration_date: r.get("calibration_date"),
                    next_calibration_date: r.get("next_calibration_date"),
                    calibration_result: r.get("calibration_result"),
                    parameters: r.get("parameters"),
                    notes: r.get("notes"),
                    certificate_no: r.get("certificate_no"),
                    created_at: r.get("created_at"),
                },
                "校准记录创建成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to create calibration record: {}", e);
            Json(ApiResponse::error(500, "创建校准记录失败"))
        }
    }
}

pub async fn get_calibration_schedule(
    State(state): State<crate::shared::AppState>,
) -> Json<ApiResponse<Vec<CalibrationSchedule>>> {
    let rows = sqlx::query(
        r#"
        SELECT 
            i.id as instrument_id,
            i.instrument_no,
            i.name as instrument_name,
            cs.frequency_days,
            cs.last_calibration_date::TEXT,
            cs.next_calibration_date::TEXT,
            CASE 
                WHEN cs.next_calibration_date IS NOT NULL AND cs.next_calibration_date <= NOW() THEN TRUE
                ELSE FALSE
            END as is_overdue,
            CASE 
                WHEN cs.next_calibration_date IS NOT NULL THEN 
                    GREATEST(0, EXTRACT(DAY FROM (cs.next_calibration_date - NOW()))::INTEGER)
                ELSE 999
            END as days_until_due,
            CASE 
                WHEN i.status = 'calibrated' THEN '正常'
                WHEN cs.next_calibration_date IS NOT NULL AND cs.next_calibration_date <= NOW() THEN '已过期'
                WHEN cs.next_calibration_date IS NOT NULL AND cs.next_calibration_date <= NOW() + INTERVAL '7 days' THEN '即将到期'
                ELSE '待校准'
            END as status
        FROM qa_lab_instruments i
        LEFT JOIN (
            SELECT instrument_id, 
                   MAX(calibration_date) as last_calibration_date,
                   MAX(next_calibration_date) as next_calibration_date,
                   90 as frequency_days
            FROM qa_lab_calibration_records
            GROUP BY instrument_id
        ) cs ON i.id = cs.instrument_id
        WHERE i.status != 'retired'
        ORDER BY is_overdue DESC, days_until_due ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let schedules: Vec<CalibrationSchedule> = rows
                .into_iter()
                .map(|row| CalibrationSchedule {
                    id: row.get::<String, _>("instrument_id"),
                    instrument_id: row.get("instrument_id"),
                    instrument_no: row.get("instrument_no"),
                    instrument_name: row.get("instrument_name"),
                    frequency_days: row.get("frequency_days"),
                    last_calibration: row.get("last_calibration_date"),
                    next_calibration: row.get("next_calibration_date"),
                    is_overdue: row.get("is_overdue"),
                    days_until_due: row.get("days_until_due"),
                    status: row.get("status"),
                })
                .collect();
            Json(ApiResponse::success(schedules, "获取校准计划成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch calibration schedule: {}", e);
            Json(ApiResponse::error(500, "获取校准计划失败"))
        }
    }
}

pub async fn get_overdue_calibrations(
    State(state): State<crate::shared::AppState>,
) -> Json<ApiResponse<Vec<CalibrationSchedule>>> {
    let rows = sqlx::query(
        r#"
        SELECT 
            i.id as instrument_id,
            i.instrument_no,
            i.name as instrument_name,
            90 as frequency_days,
            cs.last_calibration_date::TEXT,
            cs.next_calibration_date::TEXT,
            TRUE as is_overdue,
            GREATEST(0, EXTRACT(DAY FROM (NOW() - cs.next_calibration_date))::INTEGER) as days_until_due,
            '已过期' as status
        FROM qa_lab_instruments i
        INNER JOIN (
            SELECT instrument_id, 
                   MAX(calibration_date) as last_calibration_date,
                   MAX(next_calibration_date) as next_calibration_date
            FROM qa_lab_calibration_records
            GROUP BY instrument_id
        ) cs ON i.id = cs.instrument_id
        WHERE cs.next_calibration_date IS NOT NULL AND cs.next_calibration_date < NOW()
        ORDER BY days_until_due DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let schedules: Vec<CalibrationSchedule> = rows
                .into_iter()
                .map(|row| CalibrationSchedule {
                    id: row.get::<String, _>("instrument_id"),
                    instrument_id: row.get("instrument_id"),
                    instrument_no: row.get("instrument_no"),
                    instrument_name: row.get("instrument_name"),
                    frequency_days: row.get("frequency_days"),
                    last_calibration: row.get("last_calibration_date"),
                    next_calibration: row.get("next_calibration_date"),
                    is_overdue: row.get("is_overdue"),
                    days_until_due: row.get("days_until_due"),
                    status: row.get("status"),
                })
                .collect();
            Json(ApiResponse::success(schedules, "获取过期校准成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch overdue calibrations: {}", e);
            Json(ApiResponse::error(500, "获取过期校准失败"))
        }
    }
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct MaintenanceRecord {
    pub id: String,
    pub instrument_id: String,
    pub maintenance_type: String,
    pub description: Option<String>,
    pub performed_by: Option<String>,
    pub performed_at: Option<String>,
    pub next_maintenance_date: Option<String>,
    pub cost: Option<f64>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateMaintenanceRequest {
    pub instrument_id: Uuid,
    pub maintenance_type: String,
    pub description: Option<String>,
    pub performed_by: Option<String>,
    pub performed_at: Option<String>,
    pub next_maintenance_date: Option<String>,
    pub cost: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct UpdateMaintenanceRequest {
    pub maintenance_type: Option<String>,
    pub description: Option<String>,
    pub performed_by: Option<String>,
    pub performed_at: Option<String>,
    pub next_maintenance_date: Option<String>,
    pub cost: Option<f64>,
    pub notes: Option<String>,
}

const MAINTENANCE_COLUMNS: &str = "id, instrument_id, maintenance_type, description, performed_by, performed_at::TEXT, next_maintenance_date::TEXT, cost::float8 AS cost, notes, created_at::TEXT";

pub async fn list_maintenance(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(instrument_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<MaintenanceRecord>>> {
    let id = match Uuid::parse_str(&instrument_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的仪器ID")),
    };
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    };
    let rows = sqlx::query(
        &format!(
            "SELECT {MAINTENANCE_COLUMNS} FROM lims.maintenance_records WHERE ($1::uuid IS NULL OR tenant_id = $1) AND instrument_id = $2 AND deleted_at IS NULL ORDER BY performed_at DESC NULLS LAST, created_at DESC"
        ),
    )
    .bind(ctx.tenant_id)
    .bind(id)
    .fetch_all(&state.pool)
    .await;
    match rows {
        Ok(rows) => {
            let records: Vec<MaintenanceRecord> = rows
                .into_iter()
                .map(|row| MaintenanceRecord {
                    id: row.get("id"),
                    instrument_id: row.get("instrument_id"),
                    maintenance_type: row.get("maintenance_type"),
                    description: row.get("description"),
                    performed_by: row.get("performed_by"),
                    performed_at: row.get("performed_at"),
                    next_maintenance_date: row.get("next_maintenance_date"),
                    cost: row.get("cost"),
                    notes: row.get("notes"),
                    created_at: row.get("created_at"),
                })
                .collect();
            Json(ApiResponse::success(records, "获取维护记录成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch maintenance records: {}", e);
            Json(ApiResponse::error(500, "获取维护记录失败"))
        }
    }
}

pub async fn create_maintenance(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateMaintenanceRequest>,
) -> Json<ApiResponse<MaintenanceRecord>> {
    let row = sqlx::query(
        "INSERT INTO lims.maintenance_records (tenant_id, organization_id, instrument_id, maintenance_type, description, performed_by, performed_at, next_maintenance_date, cost, notes) VALUES ($1, $1, $2, $3, $4, $5, $6::TIMESTAMPTZ, $7::TIMESTAMPTZ, $8, $9) RETURNING id::TEXT, instrument_id::TEXT, maintenance_type, description, performed_by, performed_at::TEXT, next_maintenance_date::TEXT, cost::float8 AS cost, notes, created_at::TEXT",
    )
    .bind(ctx.tenant_id)
    .bind(req.instrument_id)
    .bind(&req.maintenance_type)
    .bind(&req.description)
    .bind(&req.performed_by)
    .bind(&req.performed_at)
    .bind(&req.next_maintenance_date)
    .bind(req.cost)
    .bind(&req.notes)
    .fetch_one(&state.pool)
    .await;
    match row {
        Ok(r) => Json(ApiResponse::success(
            MaintenanceRecord {
                id: r.get("id"),
                instrument_id: r.get("instrument_id"),
                maintenance_type: r.get("maintenance_type"),
                description: r.get("description"),
                performed_by: r.get("performed_by"),
                performed_at: r.get("performed_at"),
                next_maintenance_date: r.get("next_maintenance_date"),
                cost: r.get("cost"),
                notes: r.get("notes"),
                created_at: r.get("created_at"),
            },
            "维护记录创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create maintenance record: {}", e);
            Json(ApiResponse::error(500, "创建维护记录失败"))
        }
    }
}

pub async fn update_maintenance(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateMaintenanceRequest>,
) -> Json<ApiResponse<MaintenanceRecord>> {
    let record_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的维护记录ID")),
    };
    let row = sqlx::query(
        "UPDATE lims.maintenance_records SET maintenance_type = COALESCE($3, maintenance_type), description = COALESCE($4, description), performed_by = COALESCE($5, performed_by), performed_at = COALESCE($6::TIMESTAMPTZ, performed_at), next_maintenance_date = COALESCE($7::TIMESTAMPTZ, next_maintenance_date), cost = COALESCE($8, cost), notes = COALESCE($9, notes), updated_at = now() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING id::TEXT, instrument_id::TEXT, maintenance_type, description, performed_by, performed_at::TEXT, next_maintenance_date::TEXT, cost::float8 AS cost, notes, created_at::TEXT",
    )
    .bind(ctx.tenant_id)
    .bind(record_id)
    .bind(&req.maintenance_type)
    .bind(&req.description)
    .bind(&req.performed_by)
    .bind(&req.performed_at)
    .bind(&req.next_maintenance_date)
    .bind(req.cost)
    .bind(&req.notes)
    .fetch_optional(&state.pool)
    .await;
    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
            MaintenanceRecord {
                id: r.get("id"),
                instrument_id: r.get("instrument_id"),
                maintenance_type: r.get("maintenance_type"),
                description: r.get("description"),
                performed_by: r.get("performed_by"),
                performed_at: r.get("performed_at"),
                next_maintenance_date: r.get("next_maintenance_date"),
                cost: r.get("cost"),
                notes: r.get("notes"),
                created_at: r.get("created_at"),
            },
            "维护记录更新成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "维护记录不存在")),
        Err(e) => {
            tracing::error!("Failed to update maintenance record: {}", e);
            Json(ApiResponse::error(500, "更新维护记录失败"))
        }
    }
}

pub async fn delete_maintenance(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let record_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的维护记录ID")),
    };
    let result = sqlx::query(
        "UPDATE lims.maintenance_records SET deleted_at = now(), updated_at = now() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL",
    )
    .bind(ctx.tenant_id)
    .bind(record_id)
    .execute(&state.pool)
    .await;
    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "维护记录删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "维护记录不存在")),
        Err(e) => {
            tracing::error!("Failed to delete maintenance record: {}", e);
            Json(ApiResponse::error(500, "删除维护记录失败"))
        }
    }
}
