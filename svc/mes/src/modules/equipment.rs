//! Equipment handlers

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Datelike;
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use std::str::FromStr;
use topems_shared::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/equipment", get(list_equipment).post(create_equipment))
        .route("/equipment/statistics", get(get_equipment_statistics))
        .route(
            "/equipment/{id}",
            get(get_equipment)
                .put(update_equipment)
                .delete(delete_equipment),
        )
        .route("/equipment/{id}/maintenance", post(maintenance_equipment))
        .route(
            "/inspections",
            get(list_inspections).post(create_inspection),
        )
        .route(
            "/maintenances",
            get(list_maintenances).post(create_maintenance),
        )
        .route("/maintenances/{id}/status", put(update_maintenance_status))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListEquipmentQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateEquipmentRequest {
    pub equipment_no: Option<String>,
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
    pub id: String,
    pub equipment_no: String,
    pub name: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub status: String,
    pub location: Option<String>,
    pub purchase_date: Option<String>,
    pub warranty_end_date: Option<String>,
    pub maintenance_cycle: i32,
    pub last_maintenance_date: Option<String>,
    pub next_maintenance_date: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListEquipmentResponse {
    pub equipments: Vec<EquipmentResponse>,
    pub total: i64,
    pub page: i32,
    pub pagesize: i32,
}

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d))
        .unwrap_or_else(Utc::now)
}

fn opt_big_decimal_to_f64(bd: Option<BigDecimal>) -> Option<f64> {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
}

fn f64_to_big_decimal(f: Option<f64>) -> Option<BigDecimal> {
    f.and_then(|v| BigDecimal::from_str(&v.to_string()).ok())
}

fn naive_date_to_string(d: Option<chrono::NaiveDate>) -> Option<String> {
    d.map(|date| date.format("%Y-%m-%d").to_string())
}

fn datetime_to_string(dt: Option<NaiveDateTime>) -> String {
    naive_to_utc(dt).to_rfc3339()
}

fn row_to_equipment_response(r: &sqlx::postgres::PgRow) -> EquipmentResponse {
    EquipmentResponse {
        id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
        equipment_no: r.try_get::<String, _>("equipment_no").unwrap_or_default(),
        name: r.try_get::<String, _>("name").unwrap_or_default(),
        model: r.try_get::<Option<String>, _>("model").ok().flatten(),
        manufacturer: r
            .try_get::<Option<String>, _>("manufacturer")
            .ok()
            .flatten(),
        status: r
            .try_get::<Option<String>, _>("status")
            .ok()
            .flatten()
            .unwrap_or_else(|| "normal".to_string()),
        location: r.try_get::<Option<String>, _>("location").ok().flatten(),
        purchase_date: naive_date_to_string(
            r.try_get::<Option<chrono::NaiveDate>, _>("purchase_date")
                .ok()
                .flatten(),
        ),
        warranty_end_date: naive_date_to_string(
            r.try_get::<Option<chrono::NaiveDate>, _>("warranty_end_date")
                .ok()
                .flatten(),
        ),
        maintenance_cycle: r
            .try_get::<Option<i32>, _>("maintenance_cycle")
            .ok()
            .flatten()
            .unwrap_or(30),
        last_maintenance_date: naive_date_to_string(
            r.try_get::<Option<chrono::NaiveDate>, _>("last_maintenance_date")
                .ok()
                .flatten(),
        ),
        next_maintenance_date: naive_date_to_string(
            r.try_get::<Option<chrono::NaiveDate>, _>("next_maintenance_date")
                .ok()
                .flatten(),
        ),
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
}

// ==================== Equipment Handlers ====================

pub async fn list_equipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListEquipmentQuery>,
) -> Json<ApiResponse<ListEquipmentResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause
                .push_str(" WHERE (equipment_no ILIKE $1 OR name ILIKE $1 OR model ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (equipment_no ILIKE ${} OR name ILIKE ${} OR model ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!("SELECT COUNT(*) as total FROM equipment{}", where_clause);

    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count equipment: {}", e);
            return Json(ApiResponse::error(500, "获取设备列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, equipment_no, name, model, manufacturer,
            status, location, purchase_date, warranty_end_date,
            maintenance_cycle, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        FROM equipment
        {}
        ORDER BY created_at DESC
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

    let equipment = match fetch_query.fetch_all(&state.pool).await {
        Ok(e) => e,
        Err(e) => {
            tracing::error!("Failed to fetch equipment: {}", e);
            return Json(ApiResponse::error(500, "获取设备列表失败"));
        }
    };

    let equipment_list: Vec<EquipmentResponse> =
        equipment.iter().map(row_to_equipment_response).collect();

    Json(ApiResponse::success(
        ListEquipmentResponse {
            equipments: equipment_list,
            total: total.unwrap_or(0),
            page: page as i32,
            pagesize: pagesize as i32,
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
    let equipment_no = req.equipment_no.unwrap_or_else(|| {
        format!(
            "EQ{}{:04}",
            now.format("%Y%m%d"),
            rand::random::<u16>() % 10000
        )
    });

    let maintenance_cycle = req.maintenance_cycle.unwrap_or(30);
    let next_maintenance_date = req.purchase_date.map(|d| {
        let days = chrono::Duration::days(maintenance_cycle as i64);
        d + days
    });

    let result = sqlx::query(
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
    )
    .bind(&equipment_no)
    .bind(&req.name)
    .bind(&req.model)
    .bind(&req.manufacturer)
    .bind(&req.location)
    .bind(req.purchase_date)
    .bind(req.warranty_end_date)
    .bind(maintenance_cycle)
    .bind(next_maintenance_date)
    .bind(&req.description)
    .bind(now.naive_utc())
    .fetch_one(&state.pool)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create equipment: {}", e);
            return Json(ApiResponse::error(500, "创建设备失败"));
        }
    };

    Json(ApiResponse::success(
        row_to_equipment_response(&row),
        "设备创建成功",
    ))
}

pub async fn get_equipment(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<EquipmentResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let result = sqlx::query(
        r#"
        SELECT 
            id, equipment_no, name, model, manufacturer,
            status, location, purchase_date, warranty_end_date,
            maintenance_cycle, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        FROM equipment
        WHERE id = $1
        "#,
    )
    .bind(id)
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
        Some(row) => Json(ApiResponse::success(
            row_to_equipment_response(&row),
            "获取设备成功",
        )),
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

    let result = sqlx::query(
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
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.model)
    .bind(&req.manufacturer)
    .bind(&req.status)
    .bind(&req.location)
    .bind(req.purchase_date)
    .bind(req.warranty_end_date)
    .bind(req.maintenance_cycle)
    .bind(req.last_maintenance_date)
    .bind(req.next_maintenance_date)
    .bind(&req.description)
    .bind(Utc::now().naive_utc())
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
        Some(row) => Json(ApiResponse::success(
            row_to_equipment_response(&row),
            "设备更新成功",
        )),
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
    let today =
        chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), now.day()).unwrap_or_default();
    let next_maintenance_date = today + chrono::Duration::days(30);

    let result = sqlx::query(
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
    )
    .bind(id)
    .bind(today)
    .bind(next_maintenance_date)
    .bind(now.naive_utc())
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
        Some(row) => Json(ApiResponse::success(
            row_to_equipment_response(&row),
            "设备维护成功",
        )),
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
            SUM(CASE WHEN next_maintenance IS NOT NULL AND next_maintenance <= CURRENT_DATE THEN 1 ELSE 0 END) as pending_maintenance_count
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
            tracing::error!("Failed to fetch maintenances: {}", e);
            return Json(ApiResponse::error(500, "获取维护记录列表失败"));
        }
    };

    let maintenance_records: Vec<MaintenanceRecord> = records
        .into_iter()
        .map(|r| MaintenanceRecord {
            id: r.id,
            equipment_id: r.equipment_id.unwrap_or_default(),
            equipment_name: Some(r.equipment_name),
            equipment_no: Some(r.equipment_no),
            maintenance_type: r.maintenance_type.unwrap_or_default(),
            description: r.description,
            maintainer: r.maintainer.unwrap_or_default(),
            start_time: naive_to_utc(r.start_time),
            end_time: r.end_time.and_then(|dt| Some(naive_to_utc(Some(dt)))),
            cost: opt_big_decimal_to_f64(r.cost),
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

    let total = total_result.unwrap_or_default();

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
        f64_to_big_decimal(req.cost),
        req.result,
        req.status.clone().unwrap_or_else(|| "pending".to_string()),
        req.remarks,
        now.naive_utc(),
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create maintenance: {}", e);
            return Json(ApiResponse::error(500, "创建维护记录失败"));
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
            equipment_id: result.equipment_id.unwrap_or_default(),
            equipment_name,
            equipment_no,
            maintenance_type: result.maintenance_type.unwrap_or_default(),
            description: result.description,
            maintainer: result.maintainer.unwrap_or_default(),
            start_time: naive_to_utc(result.start_time),
            end_time: result.end_time.and_then(|dt| Some(naive_to_utc(Some(dt)))),
            cost: opt_big_decimal_to_f64(result.cost),
            result: result.result,
            status: result.status.unwrap_or_else(|| "pending".to_string()),
            remarks: result.remarks,
            created_at: naive_to_utc(result.created_at),
            updated_at: naive_to_utc(result.updated_at),
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
            equipment_id: result.equipment_id.unwrap_or_default(),
            equipment_name,
            equipment_no,
            maintenance_type: result.maintenance_type.unwrap_or_default(),
            description: result.description,
            maintainer: result.maintainer.unwrap_or_default(),
            start_time: naive_to_utc(result.start_time),
            end_time: result.end_time.and_then(|dt| Some(naive_to_utc(Some(dt)))),
            cost: opt_big_decimal_to_f64(result.cost),
            result: result.result,
            status: result.status.unwrap_or_else(|| "pending".to_string()),
            remarks: result.remarks,
            created_at: naive_to_utc(result.created_at),
            updated_at: naive_to_utc(result.updated_at),
        },
        "维护状态更新成功",
    ))
}

// ==================== Equipment Inspection Handlers ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListInspectionsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    equipment_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateInspectionRequest {
    equipment_id: String,
    inspector: String,
    inspection_date: String,
    location: Option<String>,
    temperature: Option<f64>,
    vibration: Option<f64>,
    noiselevel: Option<f64>,
    status: Option<String>,
    items: Option<serde_json::Value>,
    abnormalities: Option<String>,
    remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InspectionResponse {
    id: String,
    equipment_id: String,
    equipment_code: String,
    equipment_name: String,
    inspector: String,
    inspection_date: String,
    location: Option<String>,
    temperature: Option<f64>,
    vibration: Option<f64>,
    noiselevel: Option<f64>,
    status: String,
    items: Option<serde_json::Value>,
    abnormalities: Option<String>,
    remarks: Option<String>,
    created_at: String,
}

pub async fn list_inspections(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListInspectionsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let equipment_uuid = query
        .equipment_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());

    let count_result = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*) FROM equipment_inspections
        WHERE ($1::uuid IS NULL OR equipment_id = $1)
        "#,
        equipment_uuid,
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match count_result {
        Ok(c) => c.unwrap_or(0),
        Err(e) => {
            tracing::error!("Failed to count inspections: {}", e);
            return Json(ApiResponse::error(500, "获取点检记录列表失败"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT 
            ei.id, ei.equipment_id, ei.equipment_code, ei.equipment_name,
            ei.inspector, ei.inspection_date, ei.location,
            ei.temperature, ei.vibration, ei.noiselevel,
            ei.status, ei.items, ei.abnormalities, ei.remarks,
            ei.created_at
        FROM equipment_inspections ei
        WHERE ($1::uuid IS NULL OR ei.equipment_id = $1)
        ORDER BY ei.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        equipment_uuid,
        pagesize,
        offset,
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let inspections: Vec<InspectionResponse> = rows
                .into_iter()
                .map(|r| InspectionResponse {
                    id: r.id.to_string(),
                    equipment_id: r.equipment_id.to_string(),
                    equipment_code: r.equipment_code.unwrap_or_default(),
                    equipment_name: r.equipment_name.unwrap_or_default(),
                    inspector: r.inspector,
                    inspection_date: r.inspection_date,
                    location: r.location,
                    temperature: r
                        .temperature
                        .map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                    vibration: r
                        .vibration
                        .map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                    noiselevel: r
                        .noiselevel
                        .map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                    status: r.status.unwrap_or_else(|| "normal".to_string()),
                    items: r.items,
                    abnormalities: r.abnormalities,
                    remarks: r.remarks,
                    created_at: naive_to_utc(Some(r.created_at.unwrap_or_default())).to_rfc3339(),
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "records": inspections,
                    "total": total,
                    "page": page,
                    "pagesize": pagesize,
                }),
                "获取点检记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to fetch inspections: {}", e);
            Json(ApiResponse::error(500, "获取点检记录列表失败"))
        }
    }
}

pub async fn create_inspection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateInspectionRequest>,
) -> Json<ApiResponse<InspectionResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let equipment_uuid = match Uuid::parse_str(&body.equipment_id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的设备ID"));
        }
    };

    let equipment_info = sqlx::query!(
        r#"SELECT equipment_no, name FROM equipment WHERE id = $1"#,
        equipment_uuid,
    )
    .fetch_optional(&state.pool)
    .await;

    let (equipment_code, equipment_name) = match equipment_info {
        Ok(Some(e)) => (Some(e.equipment_no), Some(e.name)),
        _ => (None, None),
    };

    let temperature = body
        .temperature
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let vibration = body
        .vibration
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let noiselevel = body
        .noiselevel
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let inspection_date = DateTime::parse_from_rfc3339(&body.inspection_date)
        .map(|dt| dt.with_timezone(&Utc).naive_utc())
        .unwrap_or_else(|_| Utc::now().naive_utc());
    let items_value = body.items.as_ref().map(|v| v.to_string());

    let result = sqlx::query_unchecked!(
        r#"
        INSERT INTO equipment_inspections (
            equipment_id, equipment_code, equipment_name,
            inspector, inspection_date, location,
            temperature, vibration, noiselevel,
            status, items, abnormalities, remarks
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
        "#,
        equipment_uuid,
        equipment_code,
        equipment_name,
        body.inspector,
        inspection_date,
        body.location,
        temperature,
        vibration,
        noiselevel,
        body.status,
        items_value,
        body.abnormalities,
        body.remarks,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            InspectionResponse {
                id: r.id.to_string(),
                equipment_id: r.equipment_id.to_string(),
                equipment_code: r.equipment_code.unwrap_or_default(),
                equipment_name: r.equipment_name.unwrap_or_default(),
                inspector: r.inspector,
                inspection_date: r.inspection_date,
                location: r.location,
                temperature: r
                    .temperature
                    .map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                vibration: r
                    .vibration
                    .map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                noiselevel: r
                    .noiselevel
                    .map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                status: r.status.unwrap_or_else(|| "normal".to_string()),
                items: r.items,
                abnormalities: r.abnormalities,
                remarks: r.remarks,
                created_at: naive_to_utc(Some(r.created_at.unwrap_or_default())).to_rfc3339(),
            },
            "创建点检记录成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create inspection: {}", e);
            Json(ApiResponse::error(500, "创建点检记录失败"))
        }
    }
}
