use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::{CreateDepartmentRequest, Department, UpdateDepartmentRequest};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::api_error;
use topems_shared_event::event::MasterDataAction;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/departments",
            get(list_departments).post(create_department),
        )
        .route(
            "/departments/{id}",
            get(get_department)
                .put(update_department)
                .delete(delete_department),
        )
}

#[derive(Debug, Deserialize)]
pub struct DepartmentPaginationParams {
    pub page: Option<i64>,
    #[serde(alias = "page_size")]
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub org_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:department:read"])),
    path = "/departments",
    tag = "departments",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("org_id" = Option<Uuid>, Query, description = "公司ID过滤"),
    ),
    responses(
        (status = 200, description = "部门列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_departments(
    State(_state): State<ApiState>,
    headers: HeaderMap,
    Query(params): Query<DepartmentPaginationParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let org_id_filter = params.org_id;

    let result = sqlx::query_as::<_, Department>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, organization_id AS org_id,
               CASE WHEN $6 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               code, parent_id, manager_id, description, status, created_at, updated_at
        FROM hrm.departments
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR organization_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(org_id_filter)
    .bind(page_size)
    .bind(offset)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(departments) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.departments
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR organization_id = $3)
                "#
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(org_id_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": departments,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取部门列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取部门列表失败: {}", e);
            Json(api_error(500, "获取部门列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:department:read"])),
    path = "/departments",
    tag = "departments",
    request_body = CreateDepartmentRequest,
    responses(
        (status = 200, description = "部门创建成功", body = ApiResponse<Department>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_department(
    State(_state): State<ApiState>,
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateDepartmentRequest>,
) -> Json<ApiResponse<Department>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let now = Utc::now();

    // 从 JWT claims 自动填充 tenant_id 和 organization_id
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);
    let tenant_id = req.tenant_id.unwrap_or(claims_tenant);
    let org_id = req.org_id.unwrap_or(claims_tenant);

    let result = sqlx::query_as::<_, Department>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.departments (
            id, tenant_id, organization_id, name, code, parent_id, manager_id, description, status, created_at, updated_at, name_en
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, $11)
        RETURNING id, tenant_id, organization_id AS org_id,
                  CASE WHEN $12 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                  code, parent_id, manager_id, description, status, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(tenant_id)
    .bind(org_id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(req.parent_id)
    .bind(req.manager_id)
    .bind(&req.description)
    .bind(now)
    .bind(now)
    .bind(&req.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(department) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            // 发布 MDM 主数据事件
            let mdm_service = crate::services::mdm_event_service::MdmEventService::new();
            let dept_id = department.id;
            let dept_code = department.code.clone();
            let dept_name = department.name.clone();
            let parent_id = department.parent_id;
            let manager_id = department.manager_id;
            let org_id = department.org_id;
            let status = department.status.clone();
            tokio::spawn(async move {
                mdm_service
                    .publish_department_event(
                        claims
                            .tenant_id
                            .as_deref()
                            .and_then(|s| Uuid::parse_str(s).ok())
                            .unwrap_or(Uuid::nil()),
                        dept_id,
                        dept_code.as_deref(),
                        &dept_name,
                        parent_id,
                        manager_id,
                        org_id,
                        &status,
                        MasterDataAction::Created,
                        None,
                    )
                    .await;
            });

            Json(ApiResponse::success(department, "部门创建成功"))
        }
        Err(e) => {
            tracing::error!("创建部门失败: {}", e);
            Json(api_error(500, "部门创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:department:read"])),
    path = "/departments/{id}",
    tag = "departments",
    params(
        ("id" = Uuid, Path, description = "部门ID"),
    ),
    responses(
        (status = 200, description = "部门详情", body = ApiResponse<Department>),
        (status = 404, description = "部门不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_department(
    State(_state): State<ApiState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Department>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, Department>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, organization_id AS org_id,
               CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               code, parent_id, manager_id, description, status, created_at, updated_at
        FROM hrm.departments WHERE id = $1
        "#
    ))
    .bind(id)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(department)) => Json(ApiResponse::success(department, "获取部门成功")),
        Ok(None) => Json(api_error(404, "部门不存在")),
        Err(e) => {
            tracing::error!("获取部门失败: {}", e);
            Json(api_error(500, "获取部门失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:department:read"])),
    path = "/departments/{id}",
    tag = "departments",
    params(
        ("id" = Uuid, Path, description = "部门ID"),
    ),
    request_body = UpdateDepartmentRequest,
    responses(
        (status = 200, description = "部门更新成功", body = ApiResponse<Department>),
        (status = 404, description = "部门不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn update_department(
    State(_state): State<ApiState>,
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateDepartmentRequest>,
) -> Json<ApiResponse<Department>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let existing = sqlx::query_as::<_, Department>(
        only_own_schema_query!("hrm", "SELECT id, tenant_id, organization_id AS org_id, name, code, parent_id, manager_id, description, status, created_at, updated_at FROM hrm.departments WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(d)) => d,
        Ok(None) => return Json(api_error(404, "部门不存在")),
        Err(e) => return Json(api_error(500, &format!("查询部门失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let code = req.code.or(existing.code);
    let manager_id = req.manager_id.or(existing.manager_id);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    // 如果没有提供 org_id，使用 existing 的值
    let org_id = req.org_id.or(existing.org_id);

    // 如果没有提供 parent_id，使用 existing 的值
    let parent_id = req.parent_id.or(existing.parent_id);

    let result = sqlx::query_as::<_, Department>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.departments SET
            tenant_id = $2, organization_id = $3, name = $4, code = $5, parent_id = $6, manager_id = $7,
            description = $8, status = $9, updated_at = $10, name_en = COALESCE($11, name_en)
        WHERE id = $1
        RETURNING id, tenant_id, organization_id AS org_id,
                  CASE WHEN $12 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                  code, parent_id, manager_id, description, status, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(existing.tenant_id)
    .bind(org_id)
    .bind(&name)
    .bind(&code)
    .bind(parent_id)
    .bind(manager_id)
    .bind(&description)
    .bind(&status)
    .bind(now)
    .bind(&req.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(department) => {
            // 发布 MDM 主数据事件
            let mdm_service = crate::services::mdm_event_service::MdmEventService::new();
            let dept_id = department.id;
            let dept_code = department.code.clone();
            let dept_name = department.name.clone();
            let parent_id = department.parent_id;
            let manager_id = department.manager_id;
            let org_id = department.org_id;
            let status = department.status.clone();
            tokio::spawn(async move {
                mdm_service
                    .publish_department_event(
                        claims
                            .tenant_id
                            .as_deref()
                            .and_then(|s| Uuid::parse_str(s).ok())
                            .unwrap_or(Uuid::nil()),
                        dept_id,
                        dept_code.as_deref(),
                        &dept_name,
                        parent_id,
                        manager_id,
                        org_id,
                        &status,
                        MasterDataAction::Updated,
                        None,
                    )
                    .await;
            });

            Json(ApiResponse::success(department, "部门更新成功"))
        }
        Err(e) => {
            tracing::error!("更新部门失败: {}", e);
            Json(api_error(500, "部门更新失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["hrm:department:read"])),
    path = "/departments/{id}",
    tag = "departments",
    params(
        ("id" = Uuid, Path, description = "部门ID"),
    ),
    responses(
        (status = 200, description = "部门删除成功", body = ApiResponse<()>),
        (status = 404, description = "部门不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_department(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.departments SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            // 发布 MDM 主数据事件
            let mdm_service = crate::services::mdm_event_service::MdmEventService::new();
            let dept_id = id;
            tokio::spawn(async move {
                mdm_service
                    .publish_department_event(
                        claims
                            .tenant_id
                            .as_deref()
                            .and_then(|s| Uuid::parse_str(s).ok())
                            .unwrap_or(Uuid::nil()),
                        dept_id,
                        None,
                        "DELETED",
                        None,
                        None,
                        None,
                        "deleted",
                        MasterDataAction::Deleted,
                        None,
                    )
                    .await;
            });

            Json(ApiResponse::success("".to_string(), "部门删除成功"))
        }
        Ok(_) => Json(api_error(404, "部门不存在")),
        Err(e) => {
            tracing::error!("删除部门失败: {}", e);
            Json(api_error(500, "部门删除失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_routes_returns_router() {
        let _router = create_routes();
    }

    #[test]
    fn test_department_pagination_params_deserialize_all_none() {
        let json = r#"{}"#;
        let params: DepartmentPaginationParams = serde_json::from_str(json).expect("deserialize");
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.search.is_none());
        assert!(params.status.is_none());
        assert!(params.org_id.is_none());
    }

    #[test]
    fn test_department_pagination_params_deserialize_all_some() {
        let org_id = Uuid::new_v4();
        let json = format!(
            r#"{{"page":2,"page_size":50,"search":"研发","status":"active","org_id":"{}"}}"#,
            org_id
        );
        let params: DepartmentPaginationParams = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(params.page, Some(2));
        assert_eq!(params.page_size, Some(50));
        assert_eq!(params.search.as_deref(), Some("研发"));
        assert_eq!(params.status.as_deref(), Some("active"));
        assert_eq!(params.org_id, Some(org_id));
    }

    #[test]
    fn test_department_pagination_params_deserialize_partial() {
        let json = r#"{"search":"工程","status":"inactive"}"#;
        let params: DepartmentPaginationParams = serde_json::from_str(json).expect("deserialize");
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert_eq!(params.search.as_deref(), Some("工程"));
        assert_eq!(params.status.as_deref(), Some("inactive"));
        assert!(params.org_id.is_none());
    }

    #[test]
    fn test_department_pagination_params_deserialize_empty_search() {
        let json = r#"{"search":""}"#;
        let params: DepartmentPaginationParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(params.search.as_deref(), Some(""));
    }
}
