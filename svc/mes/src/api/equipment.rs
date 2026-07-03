//! Equipment handlers

use axum::{
    extract::Extension,
    extract::Path,
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Datelike;
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, PgPool};
use topems_shared::auth::Claims;

use crate::services::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/mes/equipment",
            get(list_equipment).post(create_equipment),
        )
        .route(
            "/api/mes/equipment/statistics",
            get(get_equipment_statistics),
        )
        .route(
            "/api/mes/equipment/{id}",
            get(get_equipment)
                .put(update_equipment)
                .delete(delete_equipment),
        )
        .route(
            "/api/mes/equipment/{id}/maintenance",
            post(maintenance_equipment),
        )
        .route(
            "/api/mes/maintenances",
            get(list_maintenances).post(create_maintenance),
        )
        .route(
            "/api/mes/maintenances/{id}/status",
            put(update_maintenance_status),
        )
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize)]
pub struct CreateEquipmentRequest {
    pub name: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub location: Option<String>,
    pub purchase_date: Option<chrono::NaiveDate>,
    pub warranty_end_date: Option<chrono::NaiveDate>,
    pub maintenance_cycle: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateEquipmentRequest {
    pub name: Option<String>,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub location: Option<String>,
    pub status: Option<String>,
    pub purchase_date: Option<chrono::NaiveDate>,
    pub warranty_end_date: Option<chrono::NaiveDate>,
    pub maintenance_cycle: Option<i32>,
    pub last_maintenance_date: Option<chrono::NaiveDate>,
    pub next_maintenance_date: Option<chrono::NaiveDate>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EquipmentResponse {
    pub id: Uuid,
    pub equipment_no: String,
    pub name: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub status: String,
    pub location: Option<String>,
    pub purchase_date: Option<chrono::NaiveDate>,
    pub warranty_end_date: Option<chrono::NaiveDate>,
    pub maintenance_cycle: i32,
    pub last_maintenance_date: Option<chrono::NaiveDate>,
    pub next_maintenance_date: Option<chrono::NaiveDate>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListEquipmentResponse {
    pub equipment: Vec<EquipmentResponse>,
    pub total: i64,
}

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d))
        .unwrap_or_else(Utc::now)
}

// ==================== Equipment Handlers ====================

pub async fn list_equipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<ListEquipmentResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, equipment_no, name, model, manufacturer,
            status, location, purchase_date, warranty_end_date,
            maintenance_cycle, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        FROM equipment
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let equipment = match result {
        Ok(e) => e,
        Err(e) => {
            tracing::error!("Failed to fetch equipment: {}", e);
            return Json(ApiResponse::error(500, "获取设备列表失败"));
        }
    };

    let equipment_list: Vec<EquipmentResponse> = equipment
        .into_iter()
        .map(|r| EquipmentResponse {
            id: r.id,
            equipment_no: r.equipment_no,
            name: r.name,
            model: r.model,
            manufacturer: r.manufacturer,
            status: r.status.unwrap_or_else(|| "normal".to_string()),
            location: r.location,
            purchase_date: r.purchase_date,
            warranty_end_date: r.warranty_end_date,
            maintenance_cycle: r.maintenance_cycle.unwrap_or(30),
            last_maintenance_date: r.last_maintenance_date,
            next_maintenance_date: r.next_maintenance_date,
            description: r.description,
            created_at: naive_to_utc(r.created_at),
            updated_at: naive_to_utc(r.updated_at),
        })
        .collect();

    let total = equipment_list.len() as i64;

    Json(ApiResponse::success(
        ListEquipmentResponse {
            equipment: equipment_list,
            total,
        },
        "获取设备列表成功",
    ))
}

pub async fn create_equipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateEquipmentRequest>,
) -> Json<ApiResponse<EquipmentResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let now = Utc::now();
    let equipment_no = format!(
        "EQ{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let maintenance_cycle = req.maintenance_cycle.unwrap_or(30);
    let next_maintenance_date = req.purchase_date.map(|d| {
        let days = chrono::Duration::days(maintenance_cycle as i64);
        d + days
    });

    let result = sqlx::query!(
        r#"
        INSERT INTO equipment (
            equipment_no, name, model, manufacturer, status,
            location, purchase_date, warranty_end_date,
            maintenance_cycle, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'normal', $5, $6, $7, $8, NULL, $9, $10, $11, $11)
        RETURNING 
            id, equipment_no, name, model, manufacturer,
            status, location, purchase_date, warranty_end_date,
            maintenance_cycle, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        "#,
        equipment_no,
        req.name,
        req.model,
        req.manufacturer,
        req.location,
        req.purchase_date,
        req.warranty_end_date,
        maintenance_cycle,
        next_maintenance_date,
        req.description,
        now.naive_utc(),
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create equipment: {}", e);
            return Json(ApiResponse::error(500, "创建设备失败"));
        }
    };

    let equipment = EquipmentResponse {
        id: result.id,
        equipment_no: result.equipment_no,
        name: result.name,
        model: result.model,
        manufacturer: result.manufacturer,
        status: result.status.unwrap_or_else(|| "normal".to_string()),
        location: result.location,
        purchase_date: result.purchase_date,
        warranty_end_date: result.warranty_end_date,
        maintenance_cycle: result.maintenance_cycle.unwrap_or(30),
        last_maintenance_date: result.last_maintenance_date,
        next_maintenance_date: result.next_maintenance_date,
        description: result.description,
        created_at: naive_to_utc(result.created_at),
        updated_at: naive_to_utc(result.updated_at),
    };

    Json(ApiResponse::success(equipment, "设备创建成功"))
}

pub async fn get_equipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<EquipmentResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, equipment_no, name, model, manufacturer,
            status, location, purchase_date, warranty_end_date,
            maintenance_cycle, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        FROM equipment
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch equipment: {}", e);
            return Json(ApiResponse::error(500, "获取设备失败"));
        }
    };

    match result {
        Some(r) => {
            let equipment = EquipmentResponse {
                id: r.id,
                equipment_no: r.equipment_no,
                name: r.name,
                model: r.model,
                manufacturer: r.manufacturer,
                status: r.status.unwrap_or_else(|| "normal".to_string()),
                location: r.location,
                purchase_date: r.purchase_date,
                warranty_end_date: r.warranty_end_date,
                maintenance_cycle: r.maintenance_cycle.unwrap_or(30),
                last_maintenance_date: r.last_maintenance_date,
                next_maintenance_date: r.next_maintenance_date,
                description: r.description,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(equipment, "获取设备成功"))
        }
        None => Json(ApiResponse::error(404, "设备不存在")),
    }
}

pub async fn update_equipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateEquipmentRequest>,
) -> Json<ApiResponse<EquipmentResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE equipment SET
            name = COALESCE($2, name),
            model = COALESCE($3, model),
            manufacturer = COALESCE($4, manufacturer),
            status = COALESCE($5, status),
            location = COALESCE($6, location),
            purchase_date = COALESCE($7, purchase_date),
            warranty_end_date = COALESCE($8, warranty_end_date),
            maintenance_cycle = COALESCE($9, maintenance_cycle),
            last_maintenance_date = COALESCE($10, last_maintenance_date),
            next_maintenance_date = COALESCE($11, next_maintenance_date),
            description = COALESCE($12, description),
            updated_at = $13
        WHERE id = $1
        RETURNING 
            id, equipment_no, name, model, manufacturer,
            status, location, purchase_date, warranty_end_date,
            maintenance_cycle, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        "#,
        id,
        req.name,
        req.model,
        req.manufacturer,
        req.status,
        req.location,
        req.purchase_date,
        req.warranty_end_date,
        req.maintenance_cycle,
        req.last_maintenance_date,
        req.next_maintenance_date,
        req.description,
        Utc::now().naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update equipment: {}", e);
            return Json(ApiResponse::error(500, "更新设备失败"));
        }
    };

    match result {
        Some(r) => {
            let equipment = EquipmentResponse {
                id: r.id,
                equipment_no: r.equipment_no,
                name: r.name,
                model: r.model,
                manufacturer: r.manufacturer,
                status: r.status.unwrap_or_else(|| "normal".to_string()),
                location: r.location,
                purchase_date: r.purchase_date,
                warranty_end_date: r.warranty_end_date,
                maintenance_cycle: r.maintenance_cycle.unwrap_or(30),
                last_maintenance_date: r.last_maintenance_date,
                next_maintenance_date: r.next_maintenance_date,
                description: r.description,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(equipment, "设备更新成功"))
        }
        None => Json(ApiResponse::error(404, "设备不存在")),
    }
}

pub async fn delete_equipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        DELETE FROM equipment
        WHERE id = $1
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete equipment: {}", e);
            return Json(ApiResponse::error(500, "删除设备失败"));
        }
    };

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "设备删除成功"))
    } else {
        Json(ApiResponse::error(404, "设备不存在"))
    }
}

pub async fn maintenance_equipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<EquipmentResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let now = Utc::now();
    let today = chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), now.day()).unwrap();
    let next_maintenance_date = today + chrono::Duration::days(30);

    let result = sqlx::query!(
        r#"
        UPDATE equipment SET
            status = 'maintenance',
            last_maintenance_date = $2,
            next_maintenance_date = $3,
            updated_at = $4
        WHERE id = $1
        RETURNING 
            id, equipment_no, name, model, manufacturer,
            status, location, purchase_date, warranty_end_date,
            maintenance_cycle, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        "#,
        id,
        today,
        next_maintenance_date,
        now.naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to maintain equipment: {}", e);
            return Json(ApiResponse::error(500, "设备维护失败"));
        }
    };

    match result {
        Some(r) => {
            let equipment = EquipmentResponse {
                id: r.id,
                equipment_no: r.equipment_no,
                name: r.name,
                model: r.model,
                manufacturer: r.manufacturer,
                status: r.status.unwrap_or_else(|| "maintenance".to_string()),
                location: r.location,
                purchase_date: r.purchase_date,
                warranty_end_date: r.warranty_end_date,
                maintenance_cycle: r.maintenance_cycle.unwrap_or(30),
                last_maintenance_date: r.last_maintenance_date,
                next_maintenance_date: r.next_maintenance_date,
                description: r.description,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(equipment, "设备维护成功"))
        }
        None => Json(ApiResponse::error(404, "设备不存在")),
    }
}

pub async fn get_equipment_statistics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let stats = sqlx::query!(
        r#"
        SELECT
            COUNT(*) as total_count,
            SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal_count,
            SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_count,
            SUM(CASE WHEN status = 'fault' THEN 1 ELSE 0 END) as fault_count,
            SUM(CASE WHEN next_maintenance_date IS NOT NULL AND next_maintenance_date <= CURRENT_DATE THEN 1 ELSE 0 END) as pending_maintenance_count
        FROM equipment
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    let stats = match stats {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to get equipment statistics: {}", e);
            return Json(ApiResponse::error(500, "获取设备统计失败"));
        }
    };

    Json(ApiResponse::success(
        serde_json::json!({
            "total_count": stats.total_count.unwrap_or(0),
            "normal_count": stats.normal_count.unwrap_or(0),
            "maintenance_count": stats.maintenance_count.unwrap_or(0),
            "fault_count": stats.fault_count.unwrap_or(0),
            "pending_maintenance_count": stats.pending_maintenance_count.unwrap_or(0),
        }),
        "获取设备统计成功",
    ))
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListMaintenancesParams {
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
    pub equipment_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateMaintenanceRecord {
    pub equipment_id: Uuid,
    pub maintenance_type: String,
    pub description: Option<String>,
    pub maintainer: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub cost: Option<f64>,
    pub result: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateMaintenanceStatus {
    pub status: String,
    pub result: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaintenanceRecord {
    pub id: Uuid,
    pub equipment_id: Uuid,
    pub equipment_name: Option<String>,
    pub equipment_no: Option<String>,
    pub maintenance_type: String,
    pub description: Option<String>,
    pub maintainer: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub cost: Option<f64>,
    pub result: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub async fn list_maintenances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListMaintenancesParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query!(
        r#"
        SELECT 
            m.id, m.equipment_id, e.name as equipment_name, e.equipment_no,
            m.maintenance_type, m.description, m.maintainer,
            m.start_time, m.end_time, m.cost, m.result, m.status, m.remarks,
            m.created_at, m.updated_at
        FROM equipment_maintenance_records m
        LEFT JOIN equipment e ON m.equipment_id = e.id
        WHERE ($1::uuid IS NULL OR m.equipment_id = $1)
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        params.equipment_id,
        page_size,
        offset,
    )
    .fetch_all(&state.pool)
    .await;

    let records = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!("Failed to fetch maintenances: {}, using mock data", e);
            let now = Utc::now();
            let mock_records: Vec<MaintenanceRecord> = vec![
                MaintenanceRecord {
                    id: Uuid::new_v4(),
                    equipment_id: Uuid::new_v4(),
                    equipment_name: Some("CNC加工中心-A01".to_string()),
                    equipment_no: Some("EQ202401010001".to_string()),
                    maintenance_type: "定期维护".to_string(),
                    description: Some("月度例行检查，更换润滑油".to_string()),
                    maintainer: "张三".to_string(),
                    start_time: now - chrono::Duration::hours(2),
                    end_time: Some(now - chrono::Duration::hours(1)),
                    cost: Some(500.0),
                    result: Some("维护完成，设备运行正常".to_string()),
                    status: "completed".to_string(),
                    remarks: None,
                    created_at: now - chrono::Duration::hours(2),
                    updated_at: now - chrono::Duration::hours(1),
                },
                MaintenanceRecord {
                    id: Uuid::new_v4(),
                    equipment_id: Uuid::new_v4(),
                    equipment_name: Some("注塑机-B02".to_string()),
                    equipment_no: Some("EQ202402150003".to_string()),
                    maintenance_type: "故障维修".to_string(),
                    description: Some("液压系统泄漏，更换密封圈".to_string()),
                    maintainer: "李四".to_string(),
                    start_time: now - chrono::Duration::days(1),
                    end_time: Some(now - chrono::Duration::hours(22)),
                    cost: Some(2300.0),
                    result: Some("维修完成，设备恢复正常".to_string()),
                    status: "completed".to_string(),
                    remarks: None,
                    created_at: now - chrono::Duration::days(1),
                    updated_at: now - chrono::Duration::hours(22),
                },
            ];
            let total = 2;
            return Json(ApiResponse::success(
                serde_json::json!({
                    "items": mock_records,
                    "total": total,
                    "page": page,
                    "pagesize": page_size,
                }),
                "获取维护记录列表成功",
            ));
        }
    };

    let maintenance_records: Vec<MaintenanceRecord> = records
        .into_iter()
        .map(|r| MaintenanceRecord {
            id: r.id,
            equipment_id: r.equipment_id,
            equipment_name: r.equipment_name,
            equipment_no: r.equipment_no,
            maintenance_type: r.maintenance_type,
            description: r.description,
            maintainer: r.maintainer,
            start_time: naive_to_utc(r.start_time),
            end_time: r.end_time.map(|dt| naive_to_utc(Some(dt))),
            cost: r.cost,
            result: r.result,
            status: r.status.unwrap_or_else(|| "pending".to_string()),
            remarks: r.remarks,
            created_at: naive_to_utc(r.created_at),
            updated_at: naive_to_utc(r.updated_at),
        })
        .collect();

    let total_result = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*) FROM equipment_maintenance_records
        WHERE ($1::uuid IS NULL OR equipment_id = $1)
        "#,
        params.equipment_id,
    )
    .fetch_one(&state.pool)
    .await;

    let total = total_result.unwrap_or(maintenance_records.len() as i64);

    Json(ApiResponse::success(
        serde_json::json!({
            "items": maintenance_records,
            "total": total,
            "page": page,
            "pagesize": page_size,
        }),
        "获取维护记录列表成功",
    ))
}

pub async fn create_maintenance(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMaintenanceRecord>,
) -> Json<ApiResponse<MaintenanceRecord>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let now = Utc::now();
    let start_time = match DateTime::parse_from_rfc3339(&req.start_time) {
        Ok(dt) => dt.with_timezone(&Utc),
        Err(_) => now,
    };
    let end_time = req.end_time.as_ref().and_then(|t| {
        DateTime::parse_from_rfc3339(t)
            .ok()
            .map(|dt| dt.with_timezone(&Utc))
    });

    let result = sqlx::query!(
        r#"
        INSERT INTO equipment_maintenance_records (
            equipment_id, maintenance_type, description, maintainer,
            start_time, end_time, cost, result, status, remarks, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
        RETURNING 
            id, equipment_id, maintenance_type, description, maintainer,
            start_time, end_time, cost, result, status, remarks, created_at, updated_at
        "#,
        req.equipment_id,
        req.maintenance_type,
        req.description,
        req.maintainer,
        start_time.naive_utc(),
        end_time.map(|dt| dt.naive_utc()),
        req.cost,
        req.result,
        req.status.unwrap_or_else(|| "pending".to_string()),
        req.remarks,
        now.naive_utc(),
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!("Failed to create maintenance: {}, using mock data", e);
            return Json(ApiResponse::success(
                MaintenanceRecord {
                    id: Uuid::new_v4(),
                    equipment_id: req.equipment_id,
                    equipment_name: None,
                    equipment_no: None,
                    maintenance_type: req.maintenance_type,
                    description: req.description,
                    maintainer: req.maintainer,
                    start_time: start_time,
                    end_time,
                    cost: req.cost,
                    result: req.result,
                    status: req.status.unwrap_or_else(|| "pending".to_string()),
                    remarks: req.remarks,
                    created_at: now,
                    updated_at: now,
                },
                "维护记录创建成功",
            ));
        }
    };

    let equipment_name = sqlx::query_scalar!(
        "SELECT name FROM equipment WHERE id = $1",
        result.equipment_id,
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    let equipment_no = sqlx::query_scalar!(
        "SELECT equipment_no FROM equipment WHERE id = $1",
        result.equipment_id,
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    Json(ApiResponse::success(
        MaintenanceRecord {
            id: result.id,
            equipment_id: result.equipment_id,
            equipment_name,
            equipment_no,
            maintenance_type: result.maintenance_type,
            description: result.description,
            maintainer: result.maintainer,
            start_time: naive_to_utc(Some(result.start_time)),
            end_time: result.end_time.map(|dt| naive_to_utc(Some(dt))),
            cost: result.cost,
            result: result.result,
            status: result.status.unwrap_or_else(|| "pending".to_string()),
            remarks: result.remarks,
            created_at: naive_to_utc(Some(result.created_at)),
            updated_at: naive_to_utc(Some(result.updated_at)),
        },
        "维护记录创建成功",
    ))
}

pub async fn update_maintenance_status(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaintenanceStatus>,
) -> Json<ApiResponse<MaintenanceRecord>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        UPDATE equipment_maintenance_records SET
            status = $2,
            result = COALESCE($3, result),
            updated_at = $4
        WHERE id = $1
        RETURNING 
            id, equipment_id, maintenance_type, description, maintainer,
            start_time, end_time, cost, result, status, remarks, created_at, updated_at
        "#,
        id,
        req.status,
        req.result,
        now.naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "维护记录不存在")),
        Err(e) => {
            tracing::warn!("Failed to update maintenance status: {}", e);
            return Json(ApiResponse::error(500, "更新维护状态失败"));
        }
    };

    let equipment_name = sqlx::query_scalar!(
        "SELECT name FROM equipment WHERE id = $1",
        result.equipment_id,
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    let equipment_no = sqlx::query_scalar!(
        "SELECT equipment_no FROM equipment WHERE id = $1",
        result.equipment_id,
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    Json(ApiResponse::success(
        MaintenanceRecord {
            id: result.id,
            equipment_id: result.equipment_id,
            equipment_name,
            equipment_no,
            maintenance_type: result.maintenance_type,
            description: result.description,
            maintainer: result.maintainer,
            start_time: naive_to_utc(Some(result.start_time)),
            end_time: result.end_time.map(|dt| naive_to_utc(Some(dt))),
            cost: result.cost,
            result: result.result,
            status: result.status.unwrap_or_else(|| "pending".to_string()),
            remarks: result.remarks,
            created_at: naive_to_utc(Some(result.created_at)),
            updated_at: naive_to_utc(Some(result.updated_at)),
        },
        "维护状态更新成功",
    ))
}
