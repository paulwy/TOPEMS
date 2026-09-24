use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use utoipa::ToSchema;
use uuid::Uuid;

use super::ApiState;
use crate::modules::audit::log_audit_event;
use topems_shared::auth::Claims;
use topems_shared_core::hrm::{PaginatedResult, PaginationQuery};
use topems_shared_core::locale::Locale;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct Position {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub org_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub level: Option<i32>,
    pub min_salary: Option<BigDecimal>,
    pub max_salary: Option<BigDecimal>,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreatePositionRequest {
    pub tenant_id: Option<Uuid>,
    pub org_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub name: String,
    pub name_en: Option<String>,
    pub code: Option<String>,
    pub level: Option<i32>,
    pub min_salary: Option<BigDecimal>,
    pub max_salary: Option<BigDecimal>,
    pub description: Option<String>,
    pub requirements: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdatePositionRequest {
    pub org_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub name: Option<String>,
    pub name_en: Option<String>,
    pub code: Option<String>,
    pub level: Option<i32>,
    pub min_salary: Option<BigDecimal>,
    pub max_salary: Option<BigDecimal>,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, utoipa::ToSchema)]
pub struct QueryParams {
    pub page: Option<i64>,
    #[serde(alias = "page_size")]
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub department_id: Option<Uuid>,
    pub org_id: Option<Uuid>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/positions", get(list_positions).post(create_position))
        .route(
            "/positions/{id}",
            get(get_position)
                .put(update_position)
                .delete(delete_position),
        )
}

#[utoipa::path(
    get,
    path = "/positions",
    tag = "positions",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页大小"),
        ("search" = Option<String>, Query, description = "搜索关键字"),
        ("department_id" = Option<Uuid>, Query, description = "部门ID"),
        ("org_id" = Option<Uuid>, Query, description = "组织ID"),
        ("status" = Option<String>, Query, description = "状态")
    ),
    responses(
        (status = 200, description = "获取职位列表成功", body = [Position]),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn list_positions(
    State(_state): State<ApiState>,
    headers: HeaderMap,
    Query(params): Query<QueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResult<Position>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let pagination = PaginationQuery {
        page: params.page,
        page_size: params.page_size,
    };
    let offset = pagination.offset();
    let page_size = pagination.page_size();

    let search = params.search.unwrap_or_default();
    let dept_id = params.department_id;
    let org_id = params.org_id;
    let status_filter = params.status;

    let result = sqlx::query_as::<_, Position>(
        only_own_schema_query!("hrm", r#"
        SELECT id, tenant_id, organization_id AS org_id, department_id,
               CASE WHEN $7 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               code, level, salary_range_min AS min_salary, salary_range_max AS max_salary, description, requirements, status, created_at, updated_at
        FROM hrm.positions
        WHERE ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
          AND ($2::uuid IS NULL OR department_id = $2)
          AND ($3::uuid IS NULL OR organization_id = $3)
          AND ($4::text IS NULL OR status = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#),
    )
    .bind(&search)
    .bind(dept_id)
    .bind(org_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("hrm", r#"
                SELECT COUNT(*) FROM hrm.positions
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
                  AND ($2::uuid IS NULL OR department_id = $2)
                  AND ($3::uuid IS NULL OR organization_id = $3)
                  AND ($4::text IS NULL OR status = $4)
                "#),
            )
            .bind(&search)
            .bind(dept_id)
            .bind(org_id)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResult::new(items, total, pagination.page(), page_size),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询岗位列表失败: {}", e);
            Json(ApiResponse::<PaginatedResult<Position>>::error(
                500,
                "查询岗位列表失败",
            ))
        }
    }
}

#[utoipa::path(
    post,
    path = "/positions",
    tag = "positions",
    request_body = CreatePositionRequest,
    responses(
        (status = 200, description = "职位创建成功", body = Position),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn create_position(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreatePositionRequest>,
) -> Json<ApiResponse<Position>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.name.is_empty() {
        return Json(api_error(400, "岗位名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    // 从 JWT claims 自动填充 tenant_id 和 org_id
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);
    let tenant_id = req.tenant_id.unwrap_or(claims_tenant);
    let org_id = req.org_id.unwrap_or(claims_tenant);

    let result = sqlx::query_as::<_, Position>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.positions (id, tenant_id, organization_id, department_id, name, code, level, salary_range_min, salary_range_max, description, requirements, status, created_at, updated_at, name_en)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12, $13, $14)
        RETURNING id, tenant_id, organization_id AS org_id, department_id,
                  CASE WHEN $15 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                  code, level, salary_range_min AS min_salary, salary_range_max AS max_salary, description, requirements, status, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(tenant_id)
    .bind(org_id)
    .bind(req.department_id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(req.level)
    .bind(&req.min_salary)
    .bind(&req.max_salary)
    .bind(&req.description)
    .bind(&req.requirements)
    .bind(now)
    .bind(now)
    .bind(&req.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(position) => (
            Json(ApiResponse::success(position.clone(), "岗位创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建岗位失败: {}", e);
            (
                Json(api_error(500, "创建岗位失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(position) = &result {
        serde_json::to_value(position).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "position".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    path = "/positions/{id}",
    tag = "positions",
    params(
        ("id" = Uuid, Path, description = "职位ID")
    ),
    responses(
        (status = 200, description = "获取职位成功", body = Position),
        (status = 404, description = "职位不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn get_position(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Position>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, Position>(
        only_own_schema_query!("hrm", r#"
        SELECT id, tenant_id, organization_id AS org_id, department_id,
               CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               code, level, salary_range_min AS min_salary, salary_range_max AS max_salary, description, requirements, status, created_at, updated_at
        FROM hrm.positions WHERE deleted_at IS NULL AND id = $1
        "#)
    )
    .bind(id)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(position)) => Json(ApiResponse::success(position, "查询成功")),
        Ok(None) => Json(ApiResponse::<Position>::error(404, "岗位不存在")),
        Err(e) => {
            tracing::error!("查询岗位失败: {}", e);
            Json(ApiResponse::<Position>::error(500, "查询岗位失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/positions/{id}",
    tag = "positions",
    params(
        ("id" = Uuid, Path, description = "职位ID")
    ),
    request_body = UpdatePositionRequest,
    responses(
        (status = 200, description = "职位更新成功", body = Position),
        (status = 400, description = "请求参数错误"),
        (status = 404, description = "职位不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn update_position(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdatePositionRequest>,
) -> Json<ApiResponse<Position>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, Position>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.positions
        SET
            organization_id = COALESCE($1, organization_id),
            department_id = COALESCE($2, department_id),
            name = COALESCE($3, name),
            code = COALESCE($4, code),
            level = COALESCE($5, level),
            salary_range_min = COALESCE($6, salary_range_min),
            salary_range_max = COALESCE($7, salary_range_max),
            description = COALESCE($8, description),
            requirements = COALESCE($9, requirements),
            status = COALESCE($10, status),
            updated_at = $11,
            name_en = COALESCE($13, name_en)
        WHERE id = $12
        RETURNING id, tenant_id, organization_id AS org_id, department_id,
                  CASE WHEN $14 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                  code, level, salary_range_min AS min_salary, salary_range_max AS max_salary, description, requirements, status, created_at, updated_at
        "#)
    )
    .bind(req.org_id)
    .bind(req.department_id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(req.level)
    .bind(&req.min_salary)
    .bind(&req.max_salary)
    .bind(&req.description)
    .bind(&req.requirements)
    .bind(&req.status)
    .bind(now)
    .bind(id)
    .bind(&req.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(position)) => Json(ApiResponse::success(position, "岗位更新成功")),
        Ok(None) => Json(ApiResponse::<Position>::error(404, "岗位不存在")),
        Err(e) => {
            tracing::error!("更新岗位失败: {}", e);
            Json(ApiResponse::<Position>::error(500, "更新岗位失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/positions/{id}",
    tag = "positions",
    params(
        ("id" = Uuid, Path, description = "职位ID")
    ),
    responses(
        (status = 200, description = "职位删除成功", body = String),
        (status = 404, description = "职位不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn delete_position(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.positions SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success(id.to_string(), "岗位删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "岗位不存在")),
            "error".to_string(),
            Some("岗位不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除岗位失败: {}", e);
            (
                Json(api_error(500, "删除岗位失败")),
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
        "position".to_string(),
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;

    fn now() -> chrono::DateTime<chrono::Utc> {
        Utc::now()
    }

    fn dec(n: i64) -> BigDecimal {
        BigDecimal::from(n)
    }

    fn roundtrip<T: Serialize + DeserializeOwned + std::fmt::Debug>(item: &T) {
        let json = serde_json::to_string(item).expect("serialize");
        let v1: serde_json::Value = serde_json::from_str(&json).expect("to_value");
        let back: T = serde_json::from_str(&json).expect("deserialize");
        let json2 = serde_json::to_string(&back).expect("re-serialize");
        let v2: serde_json::Value = serde_json::from_str(&json2).expect("to_value2");
        assert_eq!(v1, v2, "roundtrip mismatch");
    }

    #[test]
    fn test_position_roundtrip_full() {
        roundtrip(&Position {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            org_id: Some(Uuid::new_v4()),
            department_id: Some(Uuid::new_v4()),
            name: "Senior Engineer".to_string(),
            code: Some("SE-001".to_string()),
            level: Some(6),
            min_salary: Some(dec(15000)),
            max_salary: Some(dec(30000)),
            description: Some("Senior engineering role".to_string()),
            requirements: Some("5+ years experience".to_string()),
            status: "active".to_string(),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_position_roundtrip_minimal() {
        roundtrip(&Position {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            org_id: None,
            department_id: None,
            name: "Intern".to_string(),
            code: None,
            level: None,
            min_salary: None,
            max_salary: None,
            description: None,
            requirements: None,
            status: "active".to_string(),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_position_roundtrip_inactive() {
        roundtrip(&Position {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            org_id: Some(Uuid::new_v4()),
            department_id: None,
            name: "Deprecated Role".to_string(),
            code: Some("DEP-001".to_string()),
            level: None,
            min_salary: None,
            max_salary: None,
            description: None,
            requirements: None,
            status: "inactive".to_string(),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_create_position_request_roundtrip_full() {
        roundtrip(&CreatePositionRequest {
            tenant_id: Some(Uuid::new_v4()),
            org_id: Some(Uuid::new_v4()),
            department_id: Some(Uuid::new_v4()),
            name: "Tech Lead".to_string(),
            name_en: None,
            code: Some("TL-001".to_string()),
            level: Some(7),
            min_salary: Some(dec(25000)),
            max_salary: Some(dec(50000)),
            description: Some("Technical leader".to_string()),
            requirements: Some("8+ years".to_string()),
        });
    }

    #[test]
    fn test_create_position_request_roundtrip_minimal() {
        roundtrip(&CreatePositionRequest {
            tenant_id: Some(Uuid::new_v4()),
            org_id: None,
            department_id: None,
            name: "Junior Dev".to_string(),
            name_en: None,
            code: None,
            level: None,
            min_salary: None,
            max_salary: None,
            description: None,
            requirements: None,
        });
    }

    #[test]
    fn test_update_position_request_roundtrip_all_none() {
        roundtrip(&UpdatePositionRequest {
            org_id: None,
            department_id: None,
            name: None,
            name_en: None,
            code: None,
            level: None,
            min_salary: None,
            max_salary: None,
            description: None,
            requirements: None,
            status: None,
        });
    }

    #[test]
    fn test_update_position_request_roundtrip_all_some() {
        roundtrip(&UpdatePositionRequest {
            org_id: Some(Uuid::new_v4()),
            department_id: Some(Uuid::new_v4()),
            name: Some("Updated Name".to_string()),
            name_en: None,
            code: Some("UPD-001".to_string()),
            level: Some(8),
            min_salary: Some(dec(30000)),
            max_salary: Some(dec(60000)),
            description: Some("Updated desc".to_string()),
            requirements: Some("Updated reqs".to_string()),
            status: Some("inactive".to_string()),
        });
    }

    #[test]
    fn test_create_routes_returns_router() {
        let _router = create_routes();
    }
}
