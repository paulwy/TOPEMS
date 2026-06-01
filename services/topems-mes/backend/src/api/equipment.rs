use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{
    InspectionRecord, CreateInspectionRecord,
    MaintenanceRecord, CreateMaintenanceRecord,
    UpdateMaintenanceStatus, EquipmentStatistics
};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};
use crate::api::audit::log_audit_event;

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

pub struct AppState {
    pub pool: PgPool,
}

pub async fn create_routes(pool: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { pool });

    let app = Router::new()
        .route("/equipment/statistics", get(get_statistics))
        .route("/inspections", get(list_inspections).post(create_inspection))
        .route("/maintenances", get(list_maintenances).post(create_maintenance))
        .route("/maintenances/:id/status", put(update_maintenance_status))
        .with_state(state);

    Ok(app)
}

async fn get_statistics(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<EquipmentStatistics>> {
    // 因为设备资产在ERP中管理，这里调用ERP的API或者直接查询共享的DB
    // 为了演示，这里返回模拟数据
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
    State(state): State<Arc<AppState>>,
    Query(query): Query<InspectionQuery>,
) -> Json<ApiResponse<PaginatedResponse<InspectionRecord>>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = match query.equipment_id {
        Some(eq_id) => {
            sqlx::query_as!(
                InspectionRecord,
                r#"
                SELECT id, equipment_id, equipment_code, equipment_name, inspector, 
                       inspection_date, location, temperature, vibration, noise_level, 
                       status, items, abnormalities, remarks, created_at
                FROM mes.inspection_records
                WHERE equipment_id = $1
                ORDER BY inspection_date DESC
                LIMIT $2 OFFSET $3
                "#,
                eq_id, page_size, offset
            )
            .fetch_all(&state.pool)
            .await
        },
        None => {
            sqlx::query_as!(
                InspectionRecord,
                r#"
                SELECT id, equipment_id, equipment_code, equipment_name, inspector, 
                       inspection_date, location, temperature, vibration, noise_level, 
                       status, items, abnormalities, remarks, created_at
                FROM mes.inspection_records
                ORDER BY inspection_date DESC
                LIMIT $1 OFFSET $2
                "#,
                page_size, offset
            )
            .fetch_all(&state.pool)
            .await
        }
    };

    match result {
        Ok(records) => {
            let count_result = match query.equipment_id {
                Some(eq_id) => {
                    sqlx::query_scalar!(
                        r#"SELECT COUNT(*) FROM mes.inspection_records WHERE equipment_id = $1"#,
                        eq_id
                    )
                    .fetch_one(&state.pool)
                    .await
                },
                None => {
                    sqlx::query_scalar!(r#"SELECT COUNT(*) FROM mes.inspection_records"#)
                        .fetch_one(&state.pool)
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
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<CreateInspectionRecord>,
) -> Json<ApiResponse<InspectionRecord>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let inspection_date = match chrono::NaiveDate::parse_from_str(&req.inspection_date, "%Y-%m-%d") {
        Ok(d) => d,
        Err(_) => chrono::Utc::now().date_naive(),
    };

    // 这里应该从ERP获取设备信息，为了演示我们直接使用默认值
    let equipment_code = "EQ-001".to_string();
    let equipment_name = "默认设备".to_string();

    let result = sqlx::query_as!(
        InspectionRecord,
        r#"
        INSERT INTO mes.inspection_records (
            id, equipment_id, equipment_code, equipment_name, inspector, inspection_date,
            location, temperature, vibration, noise_level, status, items, abnormalities, remarks, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
        "#,
        id, req.equipment_id, equipment_code, equipment_name, req.inspector,
        inspection_date, req.location, req.temperature, req.vibration, req.noise_level,
        req.status, req.items, req.abnormalities, req.remarks, now
    )
    .fetch_one(&state.pool)
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

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(record) = &result {
        serde_json::to_value(record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.pool,
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
    State(state): State<Arc<AppState>>,
    Query(query): Query<MaintenanceQuery>,
) -> Json<ApiResponse<PaginatedResponse<MaintenanceRecord>>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = match query.equipment_id {
        Some(eq_id) => {
            sqlx::query_as!(
                MaintenanceRecord,
                r#"
                SELECT id, equipment_id, equipment_code, equipment_name, maintenance_type,
                       description, maintainer, start_time, end_time, cost, parts_replaced,
                       result, status, remarks, created_at
                FROM mes.maintenance_records
                WHERE equipment_id = $1
                ORDER BY start_time DESC
                LIMIT $2 OFFSET $3
                "#,
                eq_id, page_size, offset
            )
            .fetch_all(&state.pool)
            .await
        },
        None => {
            sqlx::query_as!(
                MaintenanceRecord,
                r#"
                SELECT id, equipment_id, equipment_code, equipment_name, maintenance_type,
                       description, maintainer, start_time, end_time, cost, parts_replaced,
                       result, status, remarks, created_at
                FROM mes.maintenance_records
                ORDER BY start_time DESC
                LIMIT $1 OFFSET $2
                "#,
                page_size, offset
            )
            .fetch_all(&state.pool)
            .await
        }
    };

    match result {
        Ok(records) => {
            let count_result = match query.equipment_id {
                Some(eq_id) => {
                    sqlx::query_scalar!(
                        r#"SELECT COUNT(*) FROM mes.maintenance_records WHERE equipment_id = $1"#,
                        eq_id
                    )
                    .fetch_one(&state.pool)
                    .await
                },
                None => {
                    sqlx::query_scalar!(r#"SELECT COUNT(*) FROM mes.maintenance_records"#)
                        .fetch_one(&state.pool)
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
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<CreateMaintenanceRecord>,
) -> Json<ApiResponse<MaintenanceRecord>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let start_time = match chrono::DateTime::parse_from_rfc3339(&req.start_time) {
        Ok(dt) => dt.with_timezone(&Utc),
        Err(_) => now,
    };
    let end_time = req.end_time.and_then(|et| {
        chrono::DateTime::parse_from_rfc3339(&et)
            .map(|dt| dt.with_timezone(&Utc))
            .ok()
    });

    // 这里应该从ERP获取设备信息，为了演示我们直接使用默认值
    let equipment_code = "EQ-001".to_string();
    let equipment_name = "默认设备".to_string();

    let result = sqlx::query_as!(
        MaintenanceRecord,
        r#"
        INSERT INTO mes.maintenance_records (
            id, equipment_id, equipment_code, equipment_name, maintenance_type, description,
            maintainer, start_time, end_time, cost, parts_replaced, result, status, remarks, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
        "#,
        id, req.equipment_id, equipment_code, equipment_name, req.maintenance_type,
        req.description, req.maintainer, start_time, end_time, req.cost, req.parts_replaced,
        req.result, req.status.unwrap_or("pending".to_string()), req.remarks, now
    )
    .fetch_one(&state.pool)
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

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(record) = &result {
        serde_json::to_value(record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.pool,
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
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateMaintenanceStatus>,
) -> Json<ApiResponse<MaintenanceRecord>> {
    let end_time = if req.status == "completed" {
        Some(Utc::now())
    } else {
        None
    };

    let result = sqlx::query_as!(
        MaintenanceRecord,
        r#"
        UPDATE mes.maintenance_records
        SET status = $1, result = COALESCE($2, result), end_time = COALESCE($3, end_time)
        WHERE id = $4
        RETURNING *
        "#,
        req.status, req.result, end_time, id
    )
    .fetch_one(&state.pool)
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

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(record) = &result {
        serde_json::to_value(record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.pool,
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
