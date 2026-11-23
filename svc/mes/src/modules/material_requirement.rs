use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::{types::Uuid, Row};
use std::str::FromStr;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::require_tenant;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

use crate::modules::material_requirement_status::MaterialRequirementStatus;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::decimal::big_decimal_to_f64;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/material-requirements",
            get(list_material_requirements).post(create_material_requirement),
        )
        .route(
            "/material-requirements/{id}",
            get(get_material_requirement)
                .put(update_material_requirement)
                .delete(delete_material_requirement),
        )
        .route(
            "/material-requirements/calculate",
            post(calculate_requirements),
        )
        .route(
            "/material-requirements/{id}/confirm",
            put(confirm_requirement),
        )
        .route(
            "/material-requirements/{id}/release",
            put(release_requirement),
        )
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListMaterialRequirementsQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateMaterialRequirementRequest {
    pub order_id: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub material_code: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub required_quantity: f64,
    pub required_date: String,
    pub priority: Option<String>,
    pub source_type: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateMaterialRequirementRequest {
    pub required_quantity: Option<f64>,
    pub available_quantity: Option<f64>,
    pub required_date: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialRequirementResponse {
    pub id: String,
    pub mrp_no: String,
    pub order_id: Option<String>,
    pub order_number: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub material_code: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub required_quantity: f64,
    pub available_quantity: Option<f64>,
    pub shortfall_quantity: Option<f64>,
    pub required_date: String,
    pub priority: Option<String>,
    pub status: String,
    pub source_type: Option<String>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    match dt {
        Some(d) => d,
        None => Utc::now(),
    }
}

fn datetime_to_string(dt: Option<DateTime<Utc>>) -> String {
    dt.map(|d| d.to_rfc3339()).unwrap_or_default()
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:material:read"])),
    path = "/material-requirements",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
#[allow(clippy::as_conversions)]
pub async fn list_material_requirements(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListMaterialRequirementsQuery>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
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
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取物料需求列表失败");
        }
    };

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(raw_status) = query.status.as_deref() {
        let raw_status = raw_status.trim();
        if !raw_status.is_empty() && !raw_status.eq_ignore_ascii_case("all") {
            let Some(status) = MaterialRequirementStatus::from_db_str(raw_status) else {
                return ApiResponse::bad_request("无效的物料需求状态");
            };
            where_clause.push_str(" WHERE status = $1");
            params.push(serde_json::Value::String(status.as_db_str().to_string()));
        }
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE (material_code ILIKE $1 OR material_name ILIKE $1 OR product_code ILIKE $1 OR product_name ILIKE $1)");
        } else {
            where_clause.push_str(&format!(" AND (material_code ILIKE ${} OR material_name ILIKE ${} OR product_code ILIKE ${} OR product_name ILIKE ${})", params.len() + 1, params.len() + 1, params.len() + 1, params.len() + 1));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM mes.material_requirements{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        count_query = count_query.bind(p.as_str().unwrap_or(""));
    }

    let count_result = count_query.fetch_one(&mut scope).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count material requirements: {}", e);
            return ApiResponse::server_error("获取物料需求列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, mrp_no, order_id, order_number, product_code, product_name,
            material_code, material_name, specification, unit, required_quantity,
            available_quantity, shortfall_quantity, required_date, priority,
            status, source_type, remark, created_at, updated_at
        FROM mes.material_requirements
        {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    let requirements = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch material requirements: {}", e);
            return ApiResponse::server_error("获取物料需求列表失败");
        }
    };

    let requirements: Vec<MaterialRequirementResponse> = requirements
        .into_iter()
        .map(|r| MaterialRequirementResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            mrp_no: r.try_get::<String, _>("mrp_no").unwrap_or_default(),
            order_id: r
                .try_get::<Option<Uuid>, _>("order_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            order_number: r
                .try_get::<Option<String>, _>("order_number")
                .ok()
                .flatten(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            material_code: r.try_get::<String, _>("material_code").unwrap_or_default(),
            material_name: r.try_get::<String, _>("material_name").unwrap_or_default(),
            specification: r
                .try_get::<Option<String>, _>("specification")
                .ok()
                .flatten(),
            unit: r.try_get::<Option<String>, _>("unit").ok().flatten(),
            required_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("required_quantity")
                    .ok()
                    .flatten(),
            ),
            available_quantity: Some(big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("available_quantity")
                    .ok()
                    .flatten(),
            )),
            shortfall_quantity: Some(big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("shortfall_quantity")
                    .ok()
                    .flatten(),
            )),
            required_date: r.try_get::<String, _>("required_date").unwrap_or_default(),
            priority: r.try_get::<Option<String>, _>("priority").ok().flatten(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| MaterialRequirementStatus::DEFAULT.as_db_str().to_string()),
            source_type: r.try_get::<Option<String>, _>("source_type").ok().flatten(),
            remark: r.try_get::<Option<String>, _>("remark").ok().flatten(),
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
        })
        .collect();

    ApiResponse::success(
        serde_json::json!({
            "requirements": requirements,
            "total": total.unwrap_or(0),
            "page": page,
            "page_size": page_size,
        }),
        "获取物料需求列表成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:material:read"])),
    path = "/material-requirements/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn get_material_requirement(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<MaterialRequirementResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
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
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取物料需求失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的物料需求ID");
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT 
            id, mrp_no, order_id, order_number, product_code, product_name,
            material_code, material_name, specification, unit, required_quantity,
            available_quantity, shortfall_quantity, required_date, priority,
            status, source_type, remark, created_at, updated_at
        FROM mes.material_requirements
        WHERE id = $1
        "#,
        uuid,
    )
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(r) => ApiResponse::success(
            MaterialRequirementResponse {
                id: r.id.to_string(),
                mrp_no: r.mrp_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_number: r.order_number,
                product_code: r.product_code,
                product_name: r.product_name,
                material_code: r.material_code,
                material_name: r.material_name,
                specification: r.specification,
                unit: r.unit,
                required_quantity: big_decimal_to_f64(Some(r.required_quantity)),
                available_quantity: Some(big_decimal_to_f64(r.available_quantity)),
                shortfall_quantity: Some(big_decimal_to_f64(r.shortfall_quantity)),
                required_date: r.required_date,
                priority: r.priority,
                status: r
                    .status
                    .clone()
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| MaterialRequirementStatus::DEFAULT.as_db_str().to_string()),
                source_type: r.source_type,
                remark: r.remark,
                created_at: r.created_at.unwrap_or_else(Utc::now),
                updated_at: r.updated_at.unwrap_or_else(Utc::now),
            },
            "获取物料需求成功",
        ),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("物料需求不存在"),
        Err(e) => {
            tracing::error!("Failed to get material requirement: {}", e);
            ApiResponse::server_error("获取物料需求失败")
        }
    }
}

pub async fn create_material_requirement(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(body): Json<CreateMaterialRequirementRequest>,
) -> ApiResponse<MaterialRequirementResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mrp_no = format!("MRP{}", chrono::Local::now().format("%Y%m%d%H%M%S"));

    // material_requirements 是业务表：服务身份缺租户头同样 400，写路径必须有确定租户。
    let tenant_id: Uuid = match require_tenant(&claims, &headers) {
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
            tracing::error!(
                "Failed to begin scope for create_material_requirement: {}",
                e
            );
            return ApiResponse::server_error("创建物料需求失败");
        }
    };

    let order_id = body
        .order_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let required_quantity =
        BigDecimal::from_str(&body.required_quantity.to_string()).unwrap_or_default();

    let required_date = NaiveDateTime::parse_from_str(&body.required_date, "%Y-%m-%d %H:%M:%S")
        .ok()
        .or_else(|| {
            DateTime::parse_from_rfc3339(&body.required_date)
                .ok()
                .map(|dt| dt.naive_utc())
        })
        .or_else(|| {
            body.required_date
                .parse::<chrono::NaiveDate>()
                .ok()
                .and_then(|d| d.and_hms_opt(0, 0, 0))
        });

    let result = sqlx::query_unchecked!(
        r#"
        INSERT INTO mes.material_requirements (
            mrp_no, order_id, order_number, product_code, product_name,
            material_code, material_name, specification, unit, required_quantity,
            required_date, priority, source_type, remark, status, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
        "#,
        mrp_no,
        order_id,
        body.order_id,
        body.product_code,
        body.product_name,
        body.material_code,
        body.material_name,
        body.specification,
        body.unit,
        required_quantity,
        required_date,
        body.priority,
        body.source_type,
        body.remark,
        MaterialRequirementStatus::DEFAULT.as_db_str(),
        tenant_id,
    )
    .fetch_one(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit material requirement: {}", e);
            return ApiResponse::server_error("创建物料需求失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(r) => ApiResponse::success(
            MaterialRequirementResponse {
                id: r.id.to_string(),
                mrp_no: r.mrp_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_number: r.order_number,
                product_code: r.product_code,
                product_name: r.product_name,
                material_code: r.material_code,
                material_name: r.material_name,
                specification: r.specification,
                unit: r.unit,
                required_quantity: big_decimal_to_f64(Some(r.required_quantity)),
                available_quantity: Some(big_decimal_to_f64(r.available_quantity)),
                shortfall_quantity: Some(big_decimal_to_f64(r.shortfall_quantity)),
                required_date: r.required_date,
                priority: r.priority,
                status: r
                    .status
                    .clone()
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| MaterialRequirementStatus::DEFAULT.as_db_str().to_string()),
                source_type: r.source_type,
                remark: r.remark,
                created_at: r.created_at.unwrap_or_else(Utc::now),
                updated_at: r.updated_at.unwrap_or_else(Utc::now),
            },
            "创建物料需求成功",
        ),
        Err(e) => {
            tracing::error!("Failed to create material requirement: {}", e);
            ApiResponse::server_error("创建物料需求失败")
        }
    }
}

pub async fn update_material_requirement(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateMaterialRequirementRequest>,
) -> ApiResponse<MaterialRequirementResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
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
            return ApiResponse::server_error("更新物料需求失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的物料需求ID");
        }
    };

    let required_quantity = body
        .required_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let available_quantity = body
        .available_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());

    let status = match body.status.as_deref() {
        None => None,
        Some(raw) if raw.trim().is_empty() => None,
        Some(raw) => match MaterialRequirementStatus::from_db_str(raw) {
            Some(status) => Some(status),
            None => return ApiResponse::bad_request("无效的物料需求状态"),
        },
    };
    let result = sqlx::query_unchecked!(
        r#"
        UPDATE mes.material_requirements
        SET 
            required_quantity = COALESCE($1, required_quantity),
            available_quantity = COALESCE($2, available_quantity),
            shortfall_quantity = COALESCE($1, required_quantity) - COALESCE($2, available_quantity),
            required_date = COALESCE($3, required_date),
            priority = COALESCE($4, priority),
            status = COALESCE($5, status),
            remark = COALESCE($6, remark),
            updated_at = NOW()
        WHERE id = $7
        RETURNING *
        "#,
        required_quantity,
        available_quantity,
        body.required_date,
        body.priority,
        status.map(MaterialRequirementStatus::as_db_str),
        body.remark,
        uuid,
    )
    .fetch_one(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit material requirement update: {}", e);
            return ApiResponse::server_error("更新物料需求失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(r) => ApiResponse::success(
            MaterialRequirementResponse {
                id: r.id.to_string(),
                mrp_no: r.mrp_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_number: r.order_number,
                product_code: r.product_code,
                product_name: r.product_name,
                material_code: r.material_code,
                material_name: r.material_name,
                specification: r.specification,
                unit: r.unit,
                required_quantity: big_decimal_to_f64(Some(r.required_quantity)),
                available_quantity: Some(big_decimal_to_f64(r.available_quantity)),
                shortfall_quantity: Some(big_decimal_to_f64(r.shortfall_quantity)),
                required_date: r.required_date,
                priority: r.priority,
                status: r
                    .status
                    .clone()
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| MaterialRequirementStatus::DEFAULT.as_db_str().to_string()),
                source_type: r.source_type,
                remark: r.remark,
                created_at: r.created_at.unwrap_or_else(Utc::now),
                updated_at: r.updated_at.unwrap_or_else(Utc::now),
            },
            "更新物料需求成功",
        ),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("物料需求不存在"),
        Err(e) => {
            tracing::error!("Failed to update material requirement: {}", e);
            ApiResponse::server_error("更新物料需求失败")
        }
    }
}

pub async fn delete_material_requirement(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
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
            return ApiResponse::server_error("删除物料需求失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的物料需求ID");
        }
    };

    let result = sqlx::query!(
        r#"
        DELETE FROM mes.material_requirements WHERE id = $1
        "#,
        uuid,
    )
    .execute(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit material requirement delete: {}", e);
            return ApiResponse::server_error("删除物料需求失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(_) => ApiResponse::success(id, "删除物料需求成功"),
        Err(e) => {
            tracing::error!("Failed to delete material requirement: {}", e);
            ApiResponse::server_error("删除物料需求失败")
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct CalculateRequirementsRequest {
    pub order_id: String,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:material:write"])),
    path = "/material-requirements/calculate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn calculate_requirements(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(body): Json<CalculateRequirementsRequest>,
) -> ApiResponse<Vec<MaterialRequirementResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }
    // 写路径必须有确定租户：先于订单查询判定，服务身份缺租户头一律 400。
    let _tenant_id = match require_tenant(&claims, &headers) {
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
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("物料需求计算失败");
        }
    };

    let order_uuid = match Uuid::parse_str(&body.order_id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的订单ID");
        }
    };

    let order_result = sqlx::query!(
        r#"
        SELECT order_number AS order_no, product_code, product_name, quantity
        FROM mes.production_orders
        WHERE id = $1
        "#,
        order_uuid,
    )
    .fetch_one(&mut scope)
    .await;

    let order = match order_result {
        Ok(o) => o,
        Err(sqlx::Error::RowNotFound) => {
            return ApiResponse::not_found("生产订单不存在");
        }
        Err(e) => {
            tracing::error!("Failed to get production order: {}", e);
            return ApiResponse::server_error("获取生产订单失败");
        }
    };

    // material_requirements 是业务表：服务身份缺租户头同样 400，写路径必须有确定租户。
    let tenant_id: Uuid = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };

    let bom_items_result = sqlx::query!(
        r#"
        SELECT bi.material_code, bi.material_name, bi.specification, bi.unit, bi.quantity
        FROM mes.bom_items bi
        JOIN mes.material_boms mb ON bi.bom_id = mb.id
        WHERE mb.product_code = $1
        "#,
        order.product_code,
    )
    .fetch_all(&mut scope)
    .await;

    let mut requirements: Vec<MaterialRequirementResponse> = Vec::new();

    match bom_items_result {
        Ok(items) => {
            for item in items {
                let required_quantity_bd = item.quantity * order.quantity.clone();
                let mrp_no = format!("MRP{}", chrono::Local::now().format("%Y%m%d%H%M%S"));
                let now_str = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

                let insert_result = sqlx::query_unchecked!(
                    r#"
                    INSERT INTO mes.material_requirements (
                        mrp_no, order_id, order_number, product_code, product_name,
                        material_code, material_name, specification, unit, required_quantity,
                        required_date, priority, source_type, status, tenant_id
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING *
                    "#,
                    mrp_no,
                    Some(order_uuid),
                    order.order_no,
                    order.product_code,
                    order.product_name,
                    item.material_code,
                    item.material_name,
                    item.specification,
                    Some(item.unit),
                    required_quantity_bd,
                    NaiveDateTime::parse_from_str(&now_str, "%Y-%m-%d %H:%M:%S").ok(),
                    Some("normal"),
                    Some("calculated"),
                    Some(MaterialRequirementStatus::DEFAULT.as_db_str()),
                    tenant_id,
                )
                .fetch_one(&mut scope)
                .await;

                if let Ok(r) = insert_result {
                    requirements.push(MaterialRequirementResponse {
                        id: r.id.to_string(),
                        mrp_no: r.mrp_no,
                        order_id: r.order_id.map(|u| u.to_string()),
                        order_number: r.order_number,
                        product_code: r.product_code,
                        product_name: r.product_name,
                        material_code: r.material_code,
                        material_name: r.material_name,
                        specification: r.specification,
                        unit: r.unit,
                        required_quantity: big_decimal_to_f64(Some(r.required_quantity)),
                        available_quantity: Some(big_decimal_to_f64(r.available_quantity)),
                        shortfall_quantity: Some(big_decimal_to_f64(r.shortfall_quantity)),
                        required_date: r.required_date,
                        priority: r.priority,
                        status: r.status.unwrap_or_else(|| {
                            MaterialRequirementStatus::DEFAULT.as_db_str().to_string()
                        }),
                        source_type: r.source_type,
                        remark: r.remark,
                        created_at: r.created_at.unwrap_or_else(Utc::now),
                        updated_at: r.updated_at.unwrap_or_else(Utc::now),
                    });
                }
            }
        }
        Err(e) => {
            tracing::warn!("Failed to get BOM items: {}", e);
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit calculated requirements: {}", e);
        return ApiResponse::server_error("物料需求计算失败");
    }

    ApiResponse::success(requirements, "物料需求计算成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:material:write"])),
    path = "/material-requirements/{id}/confirm",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn confirm_requirement(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<MaterialRequirementResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
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
            return ApiResponse::server_error("确认物料需求失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的物料需求ID");
        }
    };

    let result = sqlx::query_unchecked!(
        r#"
        UPDATE mes.material_requirements
        SET status = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
        uuid,
        MaterialRequirementStatus::Confirmed.as_db_str(),
    )
    .fetch_one(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit confirm requirement: {}", e);
            return ApiResponse::server_error("确认物料需求失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(r) => ApiResponse::success(
            MaterialRequirementResponse {
                id: r.id.to_string(),
                mrp_no: r.mrp_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_number: r.order_number,
                product_code: r.product_code,
                product_name: r.product_name,
                material_code: r.material_code,
                material_name: r.material_name,
                specification: r.specification,
                unit: r.unit,
                required_quantity: big_decimal_to_f64(Some(r.required_quantity)),
                available_quantity: Some(big_decimal_to_f64(r.available_quantity)),
                shortfall_quantity: Some(big_decimal_to_f64(r.shortfall_quantity)),
                required_date: r.required_date,
                priority: r.priority,
                status: r
                    .status
                    .clone()
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| MaterialRequirementStatus::DEFAULT.as_db_str().to_string()),
                source_type: r.source_type,
                remark: r.remark,
                created_at: r.created_at.unwrap_or_else(Utc::now),
                updated_at: r.updated_at.unwrap_or_else(Utc::now),
            },
            "确认物料需求成功",
        ),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("物料需求不存在"),
        Err(e) => {
            tracing::error!("Failed to confirm material requirement: {}", e);
            ApiResponse::server_error("确认物料需求失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:material:write"])),
    path = "/material-requirements/{id}/release",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn release_requirement(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<MaterialRequirementResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
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
            return ApiResponse::server_error("下发物料需求失败");
        }
    };

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return ApiResponse::bad_request("无效的物料需求ID");
        }
    };

    let result = sqlx::query_unchecked!(
        r#"
        UPDATE mes.material_requirements
        SET status = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
        uuid,
        MaterialRequirementStatus::Released.as_db_str(),
    )
    .fetch_one(&mut scope)
    .await;

    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("Failed to commit release requirement: {}", e);
            return ApiResponse::server_error("下发物料需求失败");
        }
    } else {
        let _ = scope.rollback().await;
    }

    match result {
        Ok(r) => ApiResponse::success(
            MaterialRequirementResponse {
                id: r.id.to_string(),
                mrp_no: r.mrp_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_number: r.order_number,
                product_code: r.product_code,
                product_name: r.product_name,
                material_code: r.material_code,
                material_name: r.material_name,
                specification: r.specification,
                unit: r.unit,
                required_quantity: big_decimal_to_f64(Some(r.required_quantity)),
                available_quantity: Some(big_decimal_to_f64(r.available_quantity)),
                shortfall_quantity: Some(big_decimal_to_f64(r.shortfall_quantity)),
                required_date: r.required_date,
                priority: r.priority,
                status: r
                    .status
                    .clone()
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| MaterialRequirementStatus::DEFAULT.as_db_str().to_string()),
                source_type: r.source_type,
                remark: r.remark,
                created_at: r.created_at.unwrap_or_else(Utc::now),
                updated_at: r.updated_at.unwrap_or_else(Utc::now),
            },
            "下发物料需求成功",
        ),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("物料需求不存在"),
        Err(e) => {
            tracing::error!("Failed to release material requirement: {}", e);
            ApiResponse::server_error("下发物料需求失败")
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use topems_shared_db::decimal::big_decimal_to_f64_non_opt;

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

    #[test]
    fn big_decimal_to_f64_some() {
        let bd: BigDecimal = "1.25".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 1.25);
    }

    #[test]
    fn big_decimal_to_f64_none() {
        assert_eq!(big_decimal_to_f64(None), 0.0);
    }

    #[test]
    fn big_decimal_to_f64_negative() {
        let bd: BigDecimal = "-7.5".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), -7.5);
    }

    #[test]
    fn big_decimal_to_f64_non_opt_some() {
        let bd: BigDecimal = "99.99".parse().unwrap();
        assert_eq!(big_decimal_to_f64_non_opt(bd), 99.99);
    }

    #[test]
    fn big_decimal_to_f64_non_opt_negative() {
        let bd: BigDecimal = "-0.01".parse().unwrap();
        assert_eq!(big_decimal_to_f64_non_opt(bd), -0.01);
    }
}
