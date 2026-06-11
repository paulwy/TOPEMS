use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{
    InspectionRecord, CreateInspectionRecord,
    MaintenanceRecord, CreateMaintenanceRecord,
    UpdateMaintenanceStatus, EquipmentStatistics
};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};
use crate::api::audit::log_audit_event;

use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct InspectionQuery {
    pub equipment_id: Option<Uuid>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct MaintenanceQuery {
    pub equipment_id: Option<Uuid>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/equipment/statistics", get(get_statistics))
        .route("/inspections", get(list_inspections).post(create_inspection))
        .route("/maintenances", get(list_maintenances).post(create_maintenance))
        .route("/maintenances/{id}/status", put(update_maintenance_status));

    Ok(app)
}

async fn get_statistics(
    State(_state): State<ApiState>,
) -> Json<ApiResponse<EquipmentStatistics>> {
    Json(ApiResponse::success(
        EquipmentStatistics {
            total: 0,
            in_use: 0,
            idle: 0,
            maintenance: 0,
            scrapped: 0,
            total_value: 0.0,
            monthly_inspections: 0,
            monthly_maintenances: 0,
            pending_repairs: 0,
        },
        "获取统计数据成功"
    ))
}

async fn list_inspections(
    State(state): State<ApiState>,
    Query(query): Query<InspectionQuery>,
) -> Json<ApiResponse<PaginatedResponse<InspectionRecord>>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = match query.equipment_id {
        Some(eq_id) => {
            let sql = r#"
                SELECT id, equipment_id, equipment_code, equipment_name, inspector, 
                       inspection_date, location, temperature, vibration, noise_level, 
                       status, items, abnormalities, remarks, created_at
                FROM mes.inspection_records
                WHERE equipment_id = $1
                ORDER BY inspection_date DESC
                LIMIT $2 OFFSET $3
                "#;
            sqlx::query_as::<_, InspectionRecord>(sql)
                .bind(eq_id)
                .bind(page_size)
                .bind(offset)
                .fetch_all(&state.db)
                .await
        },
        None => {
            let sql = r#"
                SELECT id, equipment_id, equipment_code, equipment_name, inspector, 
                       inspection_date, location, temperature, vibration, noise_level, 
                       status, items, abnormalities, remarks, created_at
                FROM mes.inspection_records
                ORDER BY inspection_date DESC
                LIMIT $1 OFFSET $2
                "#;
            sqlx::query_as::<_, InspectionRecord>(sql)
                .bind(page_size)
                .bind(offset)
                .fetch_all(&state.db)
                .await
        }
    };

    match result {
        Ok(records) => {
            let count_result = match query.equipment_id {
                Some(eq_id) => {
                    let sql = r#"SELECT COUNT(*) FROM mes.inspection_records WHERE equipment_id = $1"#;
                    sqlx::query_scalar::<_, i64>(sql)
                        .bind(eq_id)
                        .fetch_one(&state.db)
                        .await
                },
                None => {
                    let sql = r#"SELECT COUNT(*) FROM mes.inspection_records"#;
                    sqlx::query_scalar::<_, i64>(sql)
                        .fetch_one(&state.db)
                        .await
                }
            };
            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(records, total, page, page_size),
                "获取点检记录成功"
            ))
        },
        Err(e) => {
            tracing::error!("获取点检记录失败: {}", e);
            Json(api_error(500, "获取点检记录失败"))
        }
    }
}

async fn create_inspection(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateInspectionRecord>,
) -> Json<ApiResponse<InspectionRecord>> {
    if req.equipment_id.is_nil() {
        return Json(api_error(400, "设备ID不能为空"));
    }

    if req.inspector.is_empty() {
        return Json(api_error(400, "点检员不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let inspection_date = match chrono::NaiveDate::parse_from_str(&req.inspection_date, "%Y-%m-%d") {
        Ok(d) => d,
        Err(_) => Utc::now().date_naive(),
    };

    let equipment_code = "EQ-001".to_string();
    let equipment_name = "默认设备".to_string();
    
    let request_data = serde_json::to_value(&req).ok();

    let sql = r#"
        INSERT INTO mes.inspection_records (
            id, equipment_id, equipment_code, equipment_name, inspector, inspection_date,
            location, temperature, vibration, noise_level, status, items, abnormalities, remarks, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
        "#;

    let result = sqlx::query_as::<_, InspectionRecord>(sql)
        .bind(id)
        .bind(req.equipment_id)
        .bind(equipment_code)
        .bind(equipment_name)
        .bind(&req.inspector)
        .bind(inspection_date)
        .bind(req.location.as_ref())
        .bind(req.temperature)
        .bind(req.vibration)
        .bind(req.noise_level)
        .bind(&req.status)
        .bind(req.items.clone())
        .bind(req.abnormalities.as_ref())
        .bind(req.remarks.as_ref())
        .bind(now)
        .fetch_one(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(record) => (
            Json(ApiResponse::success(record.clone(), "创建点检记录成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建点检记录失败: {}", e);
            (
                Json(api_error(500, "创建点检记录失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(record) = &result {
        serde_json::to_value(record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "inspection".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    ).await;

    response
}

async fn list_maintenances(
    State(state): State<ApiState>,
    Query(query): Query<MaintenanceQuery>,
) -> Json<ApiResponse<PaginatedResponse<MaintenanceRecord>>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = match query.equipment_id {
        Some(eq_id) => {
            let sql = r#"
                SELECT id, equipment_id, equipment_code, equipment_name, maintenance_type,
                       description, maintainer, start_time, end_time, cost, parts_replaced,
                       result, status, remarks, created_at
                FROM mes.maintenance_records
                WHERE equipment_id = $1
                ORDER BY start_time DESC
                LIMIT $2 OFFSET $3
                "#;
            sqlx::query_as::<_, MaintenanceRecord>(sql)
                .bind(eq_id)
                .bind(page_size)
                .bind(offset)
                .fetch_all(&state.db)
                .await
        },
        None => {
            let sql = r#"
                SELECT id, equipment_id, equipment_code, equipment_name, maintenance_type,
                       description, maintainer, start_time, end_time, cost, parts_replaced,
                       result, status, remarks, created_at
                FROM mes.maintenance_records
                ORDER BY start_time DESC
                LIMIT $1 OFFSET $2
                "#;
            sqlx::query_as::<_, MaintenanceRecord>(sql)
                .bind(page_size)
                .bind(offset)
                .fetch_all(&state.db)
                .await
        }
    };

    match result {
        Ok(records) => {
            let count_result = match query.equipment_id {
                Some(eq_id) => {
                    let sql = r#"SELECT COUNT(*) FROM mes.maintenance_records WHERE equipment_id = $1"#;
                    sqlx::query_scalar::<_, i64>(sql)
                        .bind(eq_id)
                        .fetch_one(&state.db)
                        .await
                },
                None => {
                    let sql = r#"SELECT COUNT(*) FROM mes.maintenance_records"#;
                    sqlx::query_scalar::<_, i64>(sql)
                        .fetch_one(&state.db)
                        .await
                }
            };
            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(records, total, page, page_size),
                "获取维护记录成功"
            ))
        },
        Err(e) => {
            tracing::error!("获取维护记录失败: {}", e);
            Json(api_error(500, "获取维护记录失败"))
        }
    }
}

async fn create_maintenance(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateMaintenanceRecord>,
) -> Json<ApiResponse<MaintenanceRecord>> {
    if req.equipment_id.is_nil() {
        return Json(api_error(400, "设备ID不能为空"));
    }

    if req.maintenance_type.is_empty() {
        return Json(api_error(400, "维护类型不能为空"));
    }

    if req.maintainer.is_empty() {
        return Json(api_error(400, "维护人员不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let start_time = match chrono::DateTime::parse_from_rfc3339(&req.start_time) {
        Ok(dt) => dt.with_timezone(&Utc),
        Err(_) => now,
    };
    let end_time = req.end_time.as_ref().and_then(|et| {
        chrono::DateTime::parse_from_rfc3339(et)
            .map(|dt| dt.with_timezone(&Utc))
            .ok()
    });

    let equipment_code = "EQ-001".to_string();
    let equipment_name = "默认设备".to_string();
    
    let request_data = serde_json::to_value(&req).ok();

    let sql = r#"
        INSERT INTO mes.maintenance_records (
            id, equipment_id, equipment_code, equipment_name, maintenance_type, description,
            maintainer, start_time, end_time, cost, parts_replaced, result, status, remarks, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
        "#;

    let result = sqlx::query_as::<_, MaintenanceRecord>(sql)
        .bind(id)
        .bind(req.equipment_id)
        .bind(equipment_code)
        .bind(equipment_name)
        .bind(&req.maintenance_type)
        .bind(&req.description)
        .bind(&req.maintainer)
        .bind(start_time)
        .bind(end_time)
        .bind(req.cost)
        .bind(req.parts_replaced.clone())
        .bind(req.result.as_ref())
        .bind(req.status.as_deref().unwrap_or("pending"))
        .bind(req.remarks.as_ref())
        .bind(now)
        .fetch_one(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(record) => (
            Json(ApiResponse::success(record.clone(), "创建维护记录成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建维护记录失败: {}", e);
            (
                Json(api_error(500, "创建维护记录失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(record) = &result {
        serde_json::to_value(record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "maintenance".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    ).await;

    response
}

async fn update_maintenance_status(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateMaintenanceStatus>,
) -> Json<ApiResponse<MaintenanceRecord>> {
    let request_data = serde_json::to_value(&req).ok();
    
    let sql = r#"
        UPDATE mes.maintenance_records 
        SET status = $1, result = $2, end_time = $3 
        WHERE id = $4
        RETURNING *
        "#;

    let result = sqlx::query_as::<_, MaintenanceRecord>(sql)
        .bind(&req.status)
        .bind(req.result.as_ref())
        .bind(Utc::now())
        .bind(id)
        .fetch_one(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(record) => (
            Json(ApiResponse::success(record.clone(), "更新维护状态成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新维护状态失败: {}", e);
            (
                Json(api_error(500, "更新维护状态失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(record) = &result {
        serde_json::to_value(record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "maintenance".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    ).await;

    response
}
