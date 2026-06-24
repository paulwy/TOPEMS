//! Equipment handlers

use axum::{extract::Path, extract::State, extract::Extension, Json};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use chrono::Datelike;
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, PgPool};
use topems_shared::auth::Claims;

use crate::AppState;
use super::permission::{check_permission, ModulePermission};
use topems_shared::response::ApiResponse;

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
    dt.map(|d| Utc.from_utc_datetime(&d)).unwrap_or_else(Utc::now)
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

    let equipment_list: Vec<EquipmentResponse> = equipment.into_iter().map(|r| EquipmentResponse {
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
    }).collect();

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
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await {
        return e;
    }

    let now = Utc::now();
    let equipment_no = format!("EQ{}{:04}", now.format("%Y%m%d"), rand::random::<u16>() % 10000);

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
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await {
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
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await {
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
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await {
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
