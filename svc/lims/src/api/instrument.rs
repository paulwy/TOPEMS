#![allow(dead_code)]

use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use topems_shared::Result;
use uuid::Uuid;

use crate::api::audit::log_audit_event;
use crate::api::ApiState;
use crate::models::{
    CreateInstrumentRequest, CreateMaintenanceRecordRequest, Instrument, MaintenanceRecord,
    UpdateInstrumentRequest,
};
use topems_shared::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CalibrationRecordRequest {
    pub calibration_date: String,
    pub calibrated_by: String,
    pub calibration_results: serde_json::Value,
    pub notes: Option<String>,
}

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route(
            "/api/v1/instruments",
            get(list_instruments).post(create_instrument),
        )
        .route(
            "/api/v1/instruments/{id}",
            get(get_instrument)
                .put(update_instrument)
                .delete(delete_instrument),
        )
        .route(
            "/api/v1/instruments/{id}/calibrations",
            get(get_calibrations).post(add_calibration),
        )
        .route(
            "/api/v1/instruments/{id}/maintenance",
            get(list_maintenance_records).post(create_maintenance_record),
        )
        .route(
            "/api/v1/maintenance/{id}",
            delete(delete_maintenance_record),
        );

    Ok(app)
}

async fn list_maintenance_records(
    State(state): State<ApiState>,
    Path(instrument_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<MaintenanceRecord>>> {
    let result = sqlx::query_as::<_, MaintenanceRecord>(
        r#"
        SELECT id, instrument_id, maintenance_type, description, 
               performed_by, performed_at, next_maintenance_date, cost, notes, created_at
        FROM maintenance_records
        WHERE instrument_id = $1
        ORDER BY performed_at DESC
        "#,
    )
    .bind(instrument_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => Json(ApiResponse::success(records, "获取维护记录成功")),
        Err(e) => {
            tracing::error!("获取维护记录失败: {}", e);
            Json(ApiResponse::error(500, "获取维护记录失败"))
        }
    }
}

async fn create_maintenance_record(
    State(state): State<ApiState>,
    Path(instrument_id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<CreateMaintenanceRecordRequest>,
) -> Json<ApiResponse<MaintenanceRecord>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let request_data = serde_json::to_value(&req).ok();

    let result = sqlx::query_as::<_, MaintenanceRecord>(
        r#"
        INSERT INTO lims.maintenance_records (
            id, instrument_id, maintenance_type, description, 
            performed_by, performed_at, next_maintenance_date, cost, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, instrument_id, maintenance_type, description, 
                  performed_by, performed_at, next_maintenance_date, cost, notes, created_at
        "#,
    )
    .bind(id)
    .bind(instrument_id)
    .bind(&req.maintenance_type)
    .bind(&req.description)
    .bind(&req.performed_by)
    .bind(&req.performed_at)
    .bind(&req.next_maintenance_date)
    .bind(req.cost)
    .bind(&req.notes)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let response = match result {
        Ok(record) => {
            log_audit_event(
                &state.db,
                "create".to_string(),
                "maintenance_record".to_string(),
                Some(id),
                None,
                None,
                None,
                request_data,
                Some(serde_json::to_value(&record).unwrap_or(serde_json::Value::Null)),
                "success".to_string(),
                None,
                &headers,
            )
            .await;

            Json(ApiResponse::success(record, "维护记录创建成功"))
        }
        Err(e) => {
            tracing::error!("创建维护记录失败: {}", e);
            log_audit_event(
                &state.db,
                "create".to_string(),
                "maintenance_record".to_string(),
                Some(id),
                None,
                None,
                None,
                request_data,
                None,
                "error".to_string(),
                Some(e.to_string()),
                &headers,
            )
            .await;

            Json(ApiResponse::error(500, "创建维护记录失败"))
        }
    };

    response
}

async fn delete_maintenance_record(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM lims.maintenance_records WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "维护记录删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(ApiResponse::error(404, "维护记录不存在")),
            "error".to_string(),
            Some("维护记录不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除维护记录失败: {}", e);
            (
                Json(ApiResponse::error(500, "删除维护记录失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "maintenance_record".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn list_instruments(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Instrument>(
        r#"
        SELECT id, name, code, instrument_type as type, model, manufacturer, serial_number, status,
               location, purchase_date, calibration_date, next_calibration_date,
               maintenance_history, responsible_person, description,
               created_at, updated_at
        FROM lims.instruments
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
                SELECT COUNT(*) FROM lims.instruments
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
                    "items": instruments,
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
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateInstrumentRequest>,
) -> Json<ApiResponse<Instrument>> {
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "仪器名称不能为空"));
    }

    if req.code.is_empty() {
        return Json(ApiResponse::error(400, "仪器编码不能为空"));
    }

    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Instrument>(
        r#"
        INSERT INTO lims.instruments (
            id, name, code, instrument_type, model, manufacturer, serial_number, status,
            location, purchase_date, calibration_date, next_calibration_date,
            maintenance_history, responsible_person, description,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, name, code, instrument_type as type, model, manufacturer, serial_number, status,
                  location, purchase_date, calibration_date, next_calibration_date,
                  maintenance_history, responsible_person, description,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.instrument_type)
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

    let response_data = match &result {
        Ok(instrument) => serde_json::to_value(instrument).ok(),
        Err(_) => None,
    };

    let (response, status_str, error_msg) = match result {
        Ok(instrument) => (
            Json(ApiResponse::success(instrument, "仪器创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建仪器失败: {}", e);
            (
                Json(ApiResponse::error(500, "仪器创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "instrument".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_instrument(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Instrument>> {
    let result = sqlx::query_as::<_, Instrument>(
        r#"
        SELECT id, name, code, instrument_type as type, model, manufacturer, serial_number, status,
               location, purchase_date, calibration_date, next_calibration_date,
               maintenance_history, responsible_person, description,
               created_at, updated_at
        FROM lims.instruments WHERE id = $1
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
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateInstrumentRequest>,
) -> Json<ApiResponse<Instrument>> {
    let existing = sqlx::query_as::<_, Instrument>(
        "SELECT id, name, code, instrument_type as type, model, manufacturer, serial_number, status, location, purchase_date, calibration_date, next_calibration_date, maintenance_history, responsible_person, description, created_at, updated_at FROM lims.instruments WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(ApiResponse::error(404, "仪器不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询仪器失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let instrument_type = req.instrument_type.unwrap_or(existing.instrument_type);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Instrument>(
        r#"
        UPDATE lims.instruments SET
            name = $2, instrument_type = $3, model = $4, manufacturer = $5, serial_number = $6,
            status = $7, location = $8, calibration_date = $9,
            next_calibration_date = $10, responsible_person = $11,
            description = $12, updated_at = $13
        WHERE id = $1
        RETURNING id, name, code, instrument_type as type, model, manufacturer, serial_number, status,
                  location, purchase_date, calibration_date, next_calibration_date,
                  maintenance_history, responsible_person, description,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&instrument_type)
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

    let response_data = match &result {
        Ok(instrument) => serde_json::to_value(instrument).ok(),
        Err(_) => None,
    };

    let (response, status_str, error_msg) = match result {
        Ok(instrument) => (
            Json(ApiResponse::success(instrument, "仪器更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新仪器失败: {}", e);
            (
                Json(ApiResponse::error(500, "仪器更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "instrument".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_instrument(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM lims.instruments WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "仪器删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(ApiResponse::error(404, "仪器不存在")),
            "error".to_string(),
            Some("仪器不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除仪器失败: {}", e);
            (
                Json(ApiResponse::error(500, "仪器删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "instrument".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_calibrations(
    State(state): State<ApiState>,
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
            Json(ApiResponse::success(
                calibrations.as_array().unwrap_or(&vec![]).clone(),
                "获取校准记录成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取校准记录失败: {}", e);
            Json(ApiResponse::error(500, "获取校准记录失败"))
        }
    }
}

async fn add_calibration(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<CalibrationRecordRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let record_id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO lims.instrument_calibrations (
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
            UPDATE lims.instruments SET
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
