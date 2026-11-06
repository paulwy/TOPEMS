use axum::{
    extract::{Extension, Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::project_resource::{
    CreateResourceRequest, ProjectResource, UpdateResourceRequest,
};
use crate::modules::effective_tenant_id;

// ==================== Pure functions ====================

/// Calculates resource utilization as a percentage.
///
/// Formula: `actual_hours / allocated_hours * 100`.
/// Returns `0.0` when `allocated_hours` is zero to avoid division by zero.
pub fn resource_utilization(allocated_hours: f64, actual_hours: f64) -> f64 {
    if allocated_hours == 0.0 {
        return 0.0;
    }
    (actual_hours / allocated_hours) * 100.0
}

type RlsTxnArc =
    std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>;

pub fn create_routes(db: Db) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/resources",
            get(list_resources).post(add_resource),
        )
        .route(
            "/projects/{project_id}/resources/{id}",
            get(get_resource)
                .put(update_resource)
                .delete(remove_resource),
        )
        .with_state(db)
}

/// 列对齐 pm.project_resources 真库（含补列）：resource_type/resource_name/quantity/cost/
/// status + resource_service/start_date/end_date/allocation_percent/created_by。

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:resource:read"])),
    path = "/projects/{project_id}/resources",
    tag = "project_resources",
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "获取项目资源列表成功", body = ApiResponse<Vec<ProjectResource>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_resources(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<ProjectResource>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result = sqlx::query_as::<_, ProjectResource>(
        only_own_schema_query!("pm", "SELECT id, project_id, resource_type, resource_name, resource_service, quantity, cost, resource_id, role, actual_hours, actual_cost, start_date, end_date, allocation_percent, status, created_by, created_at, updated_at FROM pm.project_resources WHERE deleted_at IS NULL AND project_id = $1 ORDER BY resource_type ASC"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match result {
        Ok(resources) => ApiResponse::success(resources, "获取项目资源列表成功"),
        Err(e) => {
            tracing::error!("获取项目资源列表失败: {}", e);
            ApiResponse::server_error("获取项目资源列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:resource:admin"])),
    path = "/projects/{project_id}/resources",
    tag = "project_resources",
    request_body = CreateResourceRequest,
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "添加项目资源成功", body = ApiResponse<ProjectResource>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn add_resource(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateResourceRequest>,
) -> ApiResponse<ProjectResource> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = effective_tenant_id(&ctx, &claims);

    // 列对齐真库：actual_cost->cost, actual_hours->quantity, resource_id->resource_name；
    // role 与 resource_type 语义重叠，INSERT 不再单列 role。
    let result = sqlx::query_as::<_, ProjectResource>(only_own_schema_query!(
        "pm",
        r#"
        INSERT INTO pm.project_resources (
            id, project_id, resource_type, resource_name, resource_service,
            quantity, cost, status, created_by, start_date, end_date,
            allocation_percent, resource_id, role, actual_hours, actual_cost,
            created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
        "#
    ))
    .bind(id)
    .bind(project_id)
    .bind(&req.resource_type)
    .bind(&req.resource_name)
    .bind(&req.resource_service)
    .bind(rust_decimal::Decimal::ZERO)
    .bind(rust_decimal::Decimal::ZERO)
    .bind("active")
    .bind(&req.created_by)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.allocation_percent.unwrap_or(100))
    .bind(&req.resource_id)
    .bind(&req.role)
    .bind(req.actual_hours)
    .bind(req.actual_cost)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(resource) => ApiResponse::success(resource, "添加项目资源成功"),
        Err(e) => {
            tracing::error!("添加项目资源失败: {}", e);
            ApiResponse::server_error("添加项目资源失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:resource:read"])),
    path = "/projects/{project_id}/resources/{id}",
    tag = "project_resources",
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "获取项目资源成功", body = ApiResponse<ProjectResource>),
        (status = 404, description = "项目资源不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_resource(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<ProjectResource> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result = sqlx::query_as::<_, ProjectResource>(
        only_own_schema_query!("pm", "SELECT id, project_id, resource_type, resource_name, resource_service, quantity, cost, resource_id, role, actual_hours, actual_cost, start_date, end_date, allocation_percent, status, created_by, created_at, updated_at FROM pm.project_resources WHERE deleted_at IS NULL AND project_id = $1 AND id = $2"),
    )
    .bind(project_id)
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(resource)) => ApiResponse::success(resource, "获取项目资源成功"),
        Ok(None) => ApiResponse::not_found("项目资源不存在"),
        Err(e) => {
            tracing::error!("获取项目资源失败: {}", e);
            ApiResponse::server_error("获取项目资源失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:resource:admin"])),
    path = "/projects/{project_id}/resources/{id}",
    tag = "project_resources",
    request_body = UpdateResourceRequest,
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "更新项目资源成功", body = ApiResponse<ProjectResource>),
        (status = 404, description = "项目资源不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn update_resource(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateResourceRequest>,
) -> ApiResponse<ProjectResource> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let now = Utc::now();

    // role->resource_type, actual_hours->quantity, actual_cost->cost。
    let result = sqlx::query_as::<_, ProjectResource>(only_own_schema_query!(
        "pm",
        r#"
        UPDATE pm.project_resources
        SET resource_type = COALESCE($1, resource_type),
            start_date = COALESCE($2, start_date),
            end_date = COALESCE($3, end_date),
            allocation_percent = COALESCE($4, allocation_percent),
            quantity = COALESCE($5, quantity),
            cost = COALESCE($6, cost),
            status = COALESCE($7, status),
            resource_id = COALESCE($8, resource_id),
            role = COALESCE($9, role),
            actual_hours = COALESCE($10, actual_hours),
            actual_cost = COALESCE($11, actual_cost),
            updated_at = $12
        WHERE project_id = $13 AND id = $14 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
        RETURNING *
        "#
    ))
    .bind(&req.resource_type)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.allocation_percent)
    .bind(req.quantity)
    .bind(req.cost)
    .bind(&req.status)
    .bind(&req.resource_id)
    .bind(&req.role)
    .bind(req.actual_hours)
    .bind(req.actual_cost)
    .bind(now)
    .bind(project_id)
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(resource)) => ApiResponse::success(resource, "更新项目资源成功"),
        Ok(None) => ApiResponse::not_found("项目资源不存在"),
        Err(e) => {
            tracing::error!("更新项目资源失败: {}", e);
            ApiResponse::server_error("更新项目资源失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pm:resource:admin"])),
    path = "/projects/{project_id}/resources/{id}",
    tag = "project_resources",
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "删除项目资源成功", body = ApiResponse<bool>),
        (status = 404, description = "项目资源不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn remove_resource(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<bool> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "UPDATE pm.project_resources SET deleted_at = NOW() WHERE project_id = $1 AND id = $2"
    ))
    .bind(project_id)
    .bind(id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => ApiResponse::success(true, "删除项目资源成功"),
        Ok(_) => ApiResponse::not_found("项目资源不存在"),
        Err(e) => {
            tracing::error!("删除项目资源失败: {}", e);
            ApiResponse::server_error("删除项目资源失败")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_utilization_zero_allocated() {
        assert_eq!(resource_utilization(0.0, 50.0), 0.0);
    }

    #[test]
    fn test_utilization_half() {
        assert!((resource_utilization(100.0, 50.0) - 50.0).abs() < 1e-9);
    }

    #[test]
    fn test_utilization_full() {
        assert!((resource_utilization(100.0, 100.0) - 100.0).abs() < 1e-9);
    }

    #[test]
    fn test_utilization_over_allocated() {
        assert!((resource_utilization(100.0, 150.0) - 150.0).abs() < 1e-9);
    }

    #[test]
    fn test_utilization_no_actual_hours() {
        assert_eq!(resource_utilization(100.0, 0.0), 0.0);
    }

    #[test]
    fn test_utilization_both_zero() {
        assert_eq!(resource_utilization(0.0, 0.0), 0.0);
    }

    #[test]
    fn test_utilization_large_values() {
        assert!((resource_utilization(2000.0, 500.0) - 25.0).abs() < 1e-9);
    }
}
