//! Equipment handlers

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, Datelike, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::{types::Uuid, Row};
use std::str::FromStr;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::get_tenant_id_from_claims as get_tenant_id;
use topems_shared_auth::middleware::require_tenant;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_db::decimal::big_decimal_to_f64_opt;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

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
        // 前端契约兜底：模板带可选路径段 — 待上游支持
        .route("/inspections/{_id}", get(list_inspections))
        .route("/maintenances/{_id}", get(list_maintenances))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListEquipmentQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateEquipmentRequest {
    pub equipment_no: Option<String>,
    pub name: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub location: Option<String>,
    pub purchase_date: Option<chrono::NaiveDate>,
    pub warranty_expiry_date: Option<chrono::NaiveDate>,
    pub maintenance_frequency_days: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateEquipmentRequest {
    pub name: Option<String>,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub location: Option<String>,
    pub status: Option<String>,
    pub purchase_date: Option<chrono::NaiveDate>,
    pub warranty_expiry_date: Option<chrono::NaiveDate>,
    pub maintenance_frequency_days: Option<i32>,
    pub last_maintenance_date: Option<chrono::NaiveDate>,
    pub next_maintenance_date: Option<chrono::NaiveDate>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct EquipmentResponse {
    pub id: String,
    pub equipment_no: String,
    pub code: String,
    pub name: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub status: String,
    pub location: Option<String>,
    pub purchase_date: Option<String>,
    pub warranty_expiry_date: Option<String>,
    pub maintenance_frequency_days: i32,
    pub last_maintenance_date: Option<String>,
    pub next_maintenance_date: Option<String>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ListEquipmentResponse {
    pub equipments: Vec<EquipmentResponse>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.unwrap_or_else(Utc::now)
}

fn f64_to_big_decimal(f: Option<f64>) -> Option<BigDecimal> {
    f.and_then(|v| BigDecimal::from_str(&v.to_string()).ok())
}

fn naive_date_to_string(d: Option<chrono::NaiveDate>) -> Option<String> {
    d.map(|date| date.to_string())
}

fn datetime_to_string(dt: Option<DateTime<Utc>>) -> String {
    dt.map(|d| d.to_rfc3339()).unwrap_or_default()
}

fn row_to_equipment_response(r: &sqlx::postgres::PgRow) -> EquipmentResponse {
    EquipmentResponse {
        id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
        equipment_no: r.try_get::<String, _>("equipment_no").unwrap_or_default(),
        code: r.try_get::<String, _>("equipment_no").unwrap_or_default(),
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
        warranty_expiry_date: naive_date_to_string(
            r.try_get::<Option<chrono::NaiveDate>, _>("warranty_expiry_date")
                .ok()
                .flatten(),
        ),
        maintenance_frequency_days: r
            .try_get::<Option<i32>, _>("maintenance_frequency_days")
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
        created_at: (r
            .try_get::<Option<DateTime<Utc>>, _>("created_at")
            .ok()
            .flatten())
        .unwrap_or_default(),
        updated_at: (r
            .try_get::<Option<DateTime<Utc>>, _>("updated_at")
            .ok()
            .flatten())
        .unwrap_or_default(),
    }
}

// ==================== Equipment Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/equipment",
    tag = "Equipment",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("page_size" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "设备列表", body = ApiResponse<ListEquipmentResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn list_equipment(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListEquipmentQuery>,
) -> ApiResponse<ListEquipmentResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取设备列表失败");
        }
    };

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(
                " WHERE (equipment_code ILIKE $1 OR equipment_name ILIKE $1 OR model ILIKE $1)",
            );
        } else {
            where_clause.push_str(&format!(
                " AND (equipment_code ILIKE ${} OR equipment_name ILIKE ${} OR model ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    // tenant 隔离（读路径 Claims bind，nil=全见）
    let tenant_ph = params.len() + 1;
    let tenant_filter = format!("tenant_id = ${}::uuid", tenant_ph);
    if where_clause.is_empty() {
        where_clause.push_str(&format!(" WHERE {}", tenant_filter));
    } else {
        where_clause.push_str(&format!(" AND {}", tenant_filter));
    }
    let tenant_uuid = get_tenant_id(&claims);

    let count_sql = format!("SELECT COUNT(*) as total FROM equipment{}", where_clause);

    let mut count_query = sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        count_query = count_query.bind(p.as_str().unwrap_or(""));
    }
    count_query = count_query.bind(tenant_uuid);

    let count_result = count_query.fetch_one(&mut scope).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count equipment: {}", e);
            return ApiResponse::server_error("获取设备列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, equipment_code AS equipment_no, equipment_name AS name, model, manufacturer,
            status, location, purchase_date, warranty_expiry_date,
            maintenance_frequency_days, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        FROM equipment
        {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        // tenant 隔离占 1 位，LIMIT/OFFSET 顺延 N+1/N+2（无筛选时 LIMIT $1 会复用 tenant_uuid → uuid 类型错误 → 500）
        params.len() + 2,
        params.len() + 3
    );

    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(tenant_uuid).bind(page_size).bind(offset);

    let equipment = match fetch_query.fetch_all(&mut scope).await {
        Ok(e) => e,
        Err(e) => {
            tracing::error!("Failed to fetch equipment: {}", e);
            return ApiResponse::server_error("获取设备列表失败");
        }
    };

    let equipment_list: Vec<EquipmentResponse> =
        equipment.iter().map(row_to_equipment_response).collect();

    ApiResponse::success(
        ListEquipmentResponse {
            equipments: equipment_list,
            total: total.unwrap_or(0),
            page: page as i32,
            page_size: page_size as i32,
        },
        "获取设备列表成功",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/equipment",
    tag = "Equipment",
    request_body = CreateEquipmentRequest,
    responses(
        (status = 200, description = "设备创建成功", body = ApiResponse<EquipmentResponse>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions)]
pub async fn create_equipment(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateEquipmentRequest>,
) -> ApiResponse<EquipmentResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    // mes.equipment.description 在生产库为 NOT NULL，缺少描述直接拒绝，避免落库时 23502 打成 500
    let Some(description) = req
        .description
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    else {
        return ApiResponse::bad_request("设备描述不能为空");
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("创建设备失败");
        }
    };

    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims);
    let equipment_no = req.equipment_no.unwrap_or_else(|| {
        format!(
            "EQ{}{:04}",
            now.format("%Y%m%d"),
            rand::random::<u16>() % 10000
        )
    });

    let maintenance_frequency_days = req.maintenance_frequency_days.unwrap_or(30);
    let next_maintenance_date = req.purchase_date.map(|d| {
        let days = chrono::Duration::days(maintenance_frequency_days as i64);
        d + days
    });

    let result = sqlx::query(
        r#"
        INSERT INTO equipment (
            equipment_code, equipment_name, model, manufacturer, status,
            location, purchase_date, warranty_expiry_date,
            maintenance_frequency_days, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, 'normal', $5, $6, $7, $8, NULL, $9, $10, $11, $11, $12)
        RETURNING
            id, equipment_code AS equipment_no, equipment_name AS name, model, manufacturer,
            status, location, purchase_date, warranty_expiry_date,
            maintenance_frequency_days, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        "#,
    )
    .bind(&equipment_no)
    .bind(&req.name)
    .bind(&req.model)
    .bind(&req.manufacturer)
    .bind(&req.location)
    .bind(req.purchase_date)
    .bind(req.warranty_expiry_date)
    .bind(maintenance_frequency_days)
    .bind(next_maintenance_date)
    .bind(description)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create equipment: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("创建设备失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit equipment: {}", e);
        return ApiResponse::server_error("创建设备失败");
    }

    ApiResponse::success(row_to_equipment_response(&row), "设备创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/equipment/{id}",
    tag = "Equipment",
    params(
        ("id" = Uuid, Path, description = "设备ID"),
    ),
    responses(
        (status = 200, description = "设备详情", body = ApiResponse<EquipmentResponse>),
        (status = 404, description = "设备不存在"),
    ),
)]
pub async fn get_equipment(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<EquipmentResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取设备失败");
        }
    };

    let result = sqlx::query(
        r#"
        SELECT 
            id, equipment_code AS equipment_no, equipment_name AS name, model, manufacturer,
            status, location, purchase_date, warranty_expiry_date,
            maintenance_frequency_days, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        FROM equipment
        WHERE id = $1
          AND tenant_id = $2::uuid
        "#,
    )
    .bind(id)
    .bind(get_tenant_id(&claims))
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch equipment: {}", e);
            return ApiResponse::server_error("获取设备失败");
        }
    };

    match result {
        Some(row) => ApiResponse::success(row_to_equipment_response(&row), "获取设备成功"),
        None => ApiResponse::not_found("设备不存在"),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:update"])),
    path = "/api/mes/equipment/{id}",
    tag = "Equipment",
    params(
        ("id" = Uuid, Path, description = "设备ID"),
    ),
    request_body = UpdateEquipmentRequest,
    responses(
        (status = 200, description = "设备更新成功", body = ApiResponse<EquipmentResponse>),
        (status = 404, description = "设备不存在"),
    ),
)]
pub async fn update_equipment(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateEquipmentRequest>,
) -> ApiResponse<EquipmentResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("更新设备失败");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query(
        r#"
        UPDATE equipment SET
            equipment_name = COALESCE($2, equipment_name),
            model = COALESCE($3, model),
            manufacturer = COALESCE($4, manufacturer),
            status = COALESCE($5, status),
            location = COALESCE($6, location),
            purchase_date = COALESCE($7, purchase_date),
            warranty_expiry_date = COALESCE($8, warranty_expiry_date),
            maintenance_frequency_days = COALESCE($9, maintenance_frequency_days),
            last_maintenance_date = COALESCE($10, last_maintenance_date),
            next_maintenance_date = COALESCE($11, next_maintenance_date),
            description = COALESCE($12, description),
            updated_at = $13
        WHERE id = $1 AND tenant_id = $14::uuid
        RETURNING 
            id, equipment_code AS equipment_no, equipment_name AS name, model, manufacturer,
            status, location, purchase_date, warranty_expiry_date,
            maintenance_frequency_days, last_maintenance_date, next_maintenance_date,
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
    .bind(req.warranty_expiry_date)
    .bind(req.maintenance_frequency_days)
    .bind(req.last_maintenance_date)
    .bind(req.next_maintenance_date)
    .bind(&req.description)
    .bind(Utc::now())
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update equipment: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("更新设备失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit equipment update: {}", e);
        return ApiResponse::server_error("更新设备失败");
    }

    match result {
        Some(row) => ApiResponse::success(row_to_equipment_response(&row), "设备更新成功"),
        None => ApiResponse::not_found("设备不存在"),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mes:delete"])),
    path = "/api/mes/equipment/{id}",
    tag = "Equipment",
    params(
        ("id" = Uuid, Path, description = "设备ID"),
    ),
    responses(
        (status = 200, description = "设备删除成功"),
        (status = 404, description = "设备不存在"),
    ),
)]
pub async fn delete_equipment(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("删除设备失败");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query(
        r#"
        UPDATE equipment SET deleted_at = NOW()
        WHERE id = $1 AND tenant_id = $2::uuid
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete equipment: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("删除设备失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit equipment delete: {}", e);
        return ApiResponse::server_error("删除设备失败");
    }

    if result.rows_affected() > 0 {
        ApiResponse::success("".to_string(), "设备删除成功")
    } else {
        ApiResponse::not_found("设备不存在")
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/equipment/{id}/maintenance",
    tag = "Equipment",
    params(
        ("id" = Uuid, Path, description = "设备ID"),
    ),
    responses(
        (status = 200, description = "设备维护成功", body = ApiResponse<EquipmentResponse>),
        (status = 404, description = "设备不存在"),
    ),
)]
pub async fn maintenance_equipment(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<EquipmentResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("设备维护失败");
        }
    };

    let tenant_id = get_tenant_id(&claims);

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
        WHERE id = $1 AND tenant_id = $5::uuid
        RETURNING 
            id, equipment_code AS equipment_no, equipment_name AS name, model, manufacturer,
            status, location, purchase_date, warranty_expiry_date,
            maintenance_frequency_days, last_maintenance_date, next_maintenance_date,
            description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(today)
    .bind(next_maintenance_date)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to maintain equipment: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("设备维护失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit equipment maintenance: {}", e);
        return ApiResponse::server_error("设备维护失败");
    }

    match result {
        Some(row) => ApiResponse::success(row_to_equipment_response(&row), "设备维护成功"),
        None => ApiResponse::not_found("设备不存在"),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/equipment/statistics",
    tag = "Equipment",
    responses(
        (status = 200, description = "设备统计", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_equipment_statistics(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取设备统计失败");
        }
    };

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
    .fetch_one(&mut scope)
    .await;

    let stats = match stats {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to get equipment statistics: {}", e);
            return ApiResponse::server_error("获取设备统计失败");
        }
    };

    ApiResponse::success(
        serde_json::json!({
            "total": stats.total_count.unwrap_or(0),
            "in_use": stats.normal_count.unwrap_or(0),
            "idle": stats.fault_count.unwrap_or(0),
            "maintenance": stats.maintenance_count.unwrap_or(0),
            "scrapped": 0,
            "total_value": 0,
            "monthly_inspections": 0,
            "monthly_maintenances": 0,
            "pending_repairs": stats.pending_maintenance_count.unwrap_or(0),
        }),
        "获取设备统计成功",
    )
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListMaintenancesParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub equipment_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateMaintenanceStatus {
    pub status: String,
    pub result: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/maintenances",
    tag = "Equipment",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("equipment_id" = Option<Uuid>, Query, description = "设备ID"),
    ),
    responses(
        (status = 200, description = "维护记录列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_maintenances(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListMaintenancesParams>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取维护记录列表失败");
        }
    };

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query!(
        r#"
        SELECT 
            m.id, m.equipment_id, e.equipment_name as equipment_name, e.equipment_code as equipment_no,
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
    .fetch_all(&mut scope)
    .await;

    let records = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch maintenances: {}", e);
            return ApiResponse::server_error("获取维护记录列表失败");
        }
    };

    let maintenance_records: Vec<MaintenanceRecord> = records
        .into_iter()
        .map(|r| MaintenanceRecord {
            id: r.id,
            equipment_id: r.equipment_id,
            equipment_name: Some(r.equipment_name),
            equipment_no: Some(r.equipment_no),
            maintenance_type: r.maintenance_type,
            description: Some(r.description),
            maintainer: r.maintainer,
            start_time: r.start_time,
            end_time: r.end_time,
            cost: big_decimal_to_f64_opt(r.cost),
            result: r.result,
            status: r.status,
            remarks: r.remarks,
            created_at: r.created_at,
            updated_at: r.updated_at,
        })
        .collect();

    let total_result = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*) FROM equipment_maintenance_records
        WHERE ($1::uuid IS NULL OR equipment_id = $1)
        "#,
        params.equipment_id,
    )
    .fetch_one(&mut scope)
    .await;

    let total = total_result.unwrap_or_default();

    ApiResponse::success(
        serde_json::json!({
            "items": maintenance_records,
            "total": total,
            "page": page,
            "page_size": page_size,
        }),
        "获取维护记录列表成功",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/maintenances",
    tag = "Equipment",
    request_body = CreateMaintenanceRecord,
    responses(
        (status = 200, description = "维护记录创建成功", body = ApiResponse<MaintenanceRecord>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_maintenance(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMaintenanceRecord>,
) -> ApiResponse<MaintenanceRecord> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("创建维护记录失败");
        }
    };

    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims);
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
            start_time, end_time, cost, result, status, remarks, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12)
        RETURNING
            id, equipment_id, maintenance_type, description, maintainer,
            start_time, end_time, cost, result, status, remarks, created_at, updated_at
        "#,
        req.equipment_id,
        req.maintenance_type,
        req.description,
        req.maintainer,
        start_time,
        end_time,
        f64_to_big_decimal(req.cost),
        req.result,
        req.status.clone().unwrap_or_else(|| "pending".to_string()),
        req.remarks,
        now,
        tenant_id,
    )
    .fetch_one(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create maintenance: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("创建维护记录失败");
        }
    };

    // sqlx INSERT/UPDATE..RETURNING 列推断为 Option（离线缓存此前掩盖），值必在——解构归一
    let id = result.id;
    let equipment_id = result.equipment_id;
    let maintenance_type = result.maintenance_type;
    let description = result.description;
    let maintainer = result.maintainer;
    let start_time = result.start_time;
    let end_time = result.end_time;
    let status = result.status;
    let created_at = result.created_at;
    let updated_at = result.updated_at;

    let equipment_name = sqlx::query_scalar!(
        "SELECT equipment_name FROM equipment WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2::uuid",
        equipment_id,
        tenant_id,
    )
    .fetch_optional(&mut scope)
    .await
    .ok()
    .flatten();

    let equipment_no = sqlx::query_scalar!(
        "SELECT equipment_code FROM equipment WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2::uuid",
        equipment_id,
        tenant_id,
    )
    .fetch_optional(&mut scope)
    .await
    .ok()
    .flatten();

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit maintenance record: {}", e);
        return ApiResponse::server_error("创建维护记录失败");
    }

    ApiResponse::success(
        MaintenanceRecord {
            id,
            equipment_id,
            equipment_name: Some(equipment_name.unwrap_or_default()),
            equipment_no,
            maintenance_type,
            description: Some(description),
            maintainer,
            start_time,
            end_time,
            cost: big_decimal_to_f64_opt(result.cost),
            result: result.result,
            status,
            remarks: result.remarks,
            created_at,
            updated_at,
        },
        "维护记录创建成功",
    )
}

#[derive(sqlx::FromRow)]
struct MaintenanceStatusRow {
    id: Uuid,
    equipment_id: Uuid,
    maintenance_type: String,
    description: String,
    maintainer: String,
    start_time: DateTime<Utc>,
    end_time: Option<DateTime<Utc>>,
    cost: Option<BigDecimal>,
    result: Option<String>,
    status: String,
    remarks: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:update"])),
    path = "/api/mes/maintenances/{id}/status",
    tag = "Equipment",
    params(
        ("id" = Uuid, Path, description = "维护记录ID"),
    ),
    request_body = UpdateMaintenanceStatus,
    responses(
        (status = 200, description = "维护状态更新成功", body = ApiResponse<MaintenanceRecord>),
        (status = 404, description = "维护记录不存在"),
    ),
)]
pub async fn update_maintenance_status(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaintenanceStatus>,
) -> ApiResponse<MaintenanceRecord> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("更新维护状态失败");
        }
    };

    let tenant_id = get_tenant_id(&claims);
    let now = Utc::now();

    let result = sqlx::query_as::<_, MaintenanceStatusRow>(
        r#"
        UPDATE equipment_maintenance_records SET
            status = $2,
            result = COALESCE($3, result),
            updated_at = $4
        WHERE id = $1 AND tenant_id = $5::uuid
        RETURNING 
            id, equipment_id, maintenance_type, description, maintainer,
            start_time, end_time, cost, result, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.status)
    .bind(req.result)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("维护记录不存在"),
        Err(e) => {
            tracing::warn!("Failed to update maintenance status: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("更新维护状态失败");
        }
    };

    // sqlx INSERT/UPDATE..RETURNING 列推断为 Option（离线缓存此前掩盖），值必在——解构归一
    let id = result.id;
    let equipment_id = result.equipment_id;
    let maintenance_type = result.maintenance_type;
    let description = result.description;
    let maintainer = result.maintainer;
    let start_time = result.start_time;
    let end_time = result.end_time;
    let status = result.status;
    let created_at = result.created_at;
    let updated_at = result.updated_at;

    let equipment_name = sqlx::query_scalar!(
        "SELECT equipment_name FROM equipment WHERE deleted_at IS NULL AND id = $1",
        equipment_id,
    )
    .fetch_optional(&mut scope)
    .await
    .ok()
    .flatten();

    let equipment_no = sqlx::query_scalar!(
        "SELECT equipment_code FROM equipment WHERE deleted_at IS NULL AND id = $1",
        equipment_id,
    )
    .fetch_optional(&mut scope)
    .await
    .ok()
    .flatten();

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit maintenance status: {}", e);
        return ApiResponse::server_error("更新维护状态失败");
    }

    ApiResponse::success(
        MaintenanceRecord {
            id,
            equipment_id,
            equipment_name: Some(equipment_name.unwrap_or_default()),
            equipment_no,
            maintenance_type,
            description: Some(description),
            maintainer,
            start_time,
            end_time,
            cost: big_decimal_to_f64_opt(result.cost),
            result: result.result,
            status,
            remarks: result.remarks,
            created_at,
            updated_at,
        },
        "维护状态更新成功",
    )
}

// ==================== Equipment Inspection Handlers ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListInspectionsQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    equipment_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, ToSchema)]
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/inspections",
    tag = "Equipment",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("page_size" = Option<i32>, Query, description = "每页数量"),
        ("equipment_id" = Option<String>, Query, description = "设备ID"),
    ),
    responses(
        (status = 200, description = "点检记录列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions)]
pub async fn list_inspections(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListInspectionsQuery>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取点检记录列表失败");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let equipment_uuid = query
        .equipment_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());

    let count_result = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*) FROM equipment_inspections
        WHERE ($1::uuid IS NULL OR equipment_id = $1)
          AND EXISTS (
              SELECT 1 FROM mes.equipment e WHERE e.id = equipment_id AND e.tenant_id = $2::uuid AND e.deleted_at IS NULL
          )
        "#,
        equipment_uuid,
        tenant_id,
    )
    .fetch_one(&mut scope)
    .await;

    let total: i64 = match count_result {
        Ok(c) => c.unwrap_or(0),
        Err(e) => {
            tracing::error!("Failed to count inspections: {}", e);
            return ApiResponse::server_error("获取点检记录列表失败");
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
          AND EXISTS (
              SELECT 1 FROM mes.equipment e WHERE e.id = ei.equipment_id AND e.tenant_id = $2::uuid AND e.deleted_at IS NULL
          )
        ORDER BY ei.created_at DESC
        LIMIT $3 OFFSET $4
        "#,
        equipment_uuid,
        tenant_id,
        page_size,
        offset,
    )
    .fetch_all(&mut scope)
    .await;

    match result {
        Ok(rows) => {
            let inspections: Vec<InspectionResponse> = rows
                .into_iter()
                .map(|r| InspectionResponse {
                    id: r.id.to_string(),
                    equipment_id: r.equipment_id.to_string(),
                    equipment_code: r.equipment_code.clone().unwrap_or_else(String::new),
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
                    status: if r.status.as_deref().unwrap_or("").is_empty() {
                        "normal".to_string()
                    } else {
                        r.status.unwrap_or_default()
                    },
                    items: r.items.map(|s| serde_json::Value::String(s.to_string())),
                    abnormalities: r.abnormalities,
                    remarks: r.remarks,
                    created_at: r.created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                })
                .collect();

            ApiResponse::success(
                serde_json::json!({
                    "records": inspections,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "获取点检记录列表成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to fetch inspections: {}", e);
            ApiResponse::server_error("获取点检记录列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/inspections",
    tag = "Equipment",
    request_body = CreateInspectionRequest,
    responses(
        (status = 200, description = "创建点检记录成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_inspection(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(body): Json<CreateInspectionRequest>,
) -> ApiResponse<InspectionResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentWrite).await
    {
        return e;
    }

    // equipment_inspections 是业务表：服务身份缺租户头同样 400，写路径必须有确定租户。
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin scope for create_inspection: {}", e);
            return ApiResponse::server_error("创建设备点检记录失败");
        }
    };

    let equipment_uuid = match Uuid::parse_str(&body.equipment_id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的设备ID");
        }
    };

    let equipment_info = sqlx::query!(
        r#"SELECT equipment_code AS equipment_no, equipment_name AS name FROM equipment WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2::uuid"#,
        equipment_uuid,
        tenant_id,
    )
    .fetch_optional(&mut scope)
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
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());
    let items_value = body.items.as_ref().map(|v| v.to_string());

    let result = sqlx::query_unchecked!(
        r#"
        INSERT INTO equipment_inspections (
            equipment_id, equipment_code, equipment_name,
            inspector, inspection_date, location,
            temperature, vibration, noiselevel,
            status, items, abnormalities, remarks, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
        tenant_id,
    )
    .fetch_one(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit inspection: {}", e);
            return ApiResponse::server_error("创建设备点检记录失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(r) => ApiResponse::success(
            InspectionResponse {
                id: r.id.to_string(),
                equipment_id: r.equipment_id.to_string(),
                equipment_code: r.equipment_code.clone().unwrap_or_else(String::new),
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
                status: if r.status.as_deref().unwrap_or("").is_empty() {
                    "normal".to_string()
                } else {
                    r.status.unwrap_or_default()
                },
                items: r.items.map(|s| serde_json::Value::String(s.to_string())),
                abnormalities: r.abnormalities,
                remarks: r.remarks,
                created_at: r.created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            },
            "创建点检记录成功",
        ),
        Err(e) => {
            tracing::error!("Failed to create inspection: {}", e);
            ApiResponse::server_error("创建点检记录失败")
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::{NaiveDate, TimeZone};

    // ---- naive_to_utc ----
    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = Utc.with_ymd_and_hms(2024, 7, 1, 9, 45, 0).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.date_naive(), dt.date_naive());
        assert_eq!(utc.time(), dt.time());
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    // ---- big_decimal_to_f64 ----
    #[test]
    fn big_decimal_to_f64_some() {
        let bd: BigDecimal = "12.5".parse().unwrap();
        assert_eq!(big_decimal_to_f64_opt(Some(bd)), Some(12.5));
    }

    #[test]
    fn big_decimal_to_f64_none() {
        assert_eq!(big_decimal_to_f64_opt(None), None);
    }

    #[test]
    fn big_decimal_to_f64_zero() {
        let bd: BigDecimal = "0".parse().unwrap();
        assert_eq!(big_decimal_to_f64_opt(Some(bd)), Some(0.0));
    }

    // ---- f64_to_big_decimal ----
    #[test]
    fn f64_to_big_decimal_roundtrip() {
        let f = Some(3.5);
        let bd = f64_to_big_decimal(f).unwrap();
        assert_eq!(big_decimal_to_f64_opt(Some(bd)), Some(3.5));
    }

    #[test]
    fn f64_to_big_decimal_none() {
        assert!(f64_to_big_decimal(None).is_none());
    }

    #[test]
    fn f64_to_big_decimal_zero() {
        let bd = f64_to_big_decimal(Some(0.0)).unwrap();
        assert_eq!(big_decimal_to_f64_opt(Some(bd)), Some(0.0));
    }

    #[test]
    fn f64_to_big_decimal_integer_value() {
        let bd = f64_to_big_decimal(Some(100.0)).unwrap();
        assert_eq!(big_decimal_to_f64_opt(Some(bd)), Some(100.0));
    }

    // ---- naive_date_to_string ----
    #[test]
    fn naive_date_to_string_some() {
        let d = NaiveDate::from_ymd_opt(2024, 12, 25).unwrap();
        assert_eq!(naive_date_to_string(Some(d)).unwrap(), "2024-12-25");
    }

    #[test]
    fn naive_date_to_string_none() {
        assert!(naive_date_to_string(None).is_none());
    }

    #[test]
    fn naive_date_to_string_single_digit_padding() {
        let d = NaiveDate::from_ymd_opt(2024, 1, 5).unwrap();
        assert_eq!(naive_date_to_string(Some(d)).unwrap(), "2024-01-05");
    }

    // ---- datetime_to_string ----
    #[test]
    fn datetime_to_string_some_rfc3339() {
        let dt = Utc.with_ymd_and_hms(2024, 3, 1, 0, 0, 0).unwrap();
        let s = datetime_to_string(Some(dt));
        assert!(s.starts_with("2024-03-01T00:00:00"), "got {}", s);
    }

    #[test]
    fn datetime_to_string_none_valid() {
        let s = datetime_to_string(None);
        assert!(s.is_empty());
    }
}
