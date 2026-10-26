use axum::{
    extract::Path,
    routing::get,
    Extension, Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::project_member::{CreateMemberRequest, ProjectMember, UpdateMemberRequest};
use crate::modules::effective_tenant_id;

type RlsTxnArc = std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>;

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/members",
            get(list_members).post(create_member),
        )
        .route(
            "/projects/{project_id}/members/{id}",
            get(get_member).put(update_member).delete(delete_member),
        )
        .with_state(pool)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/members",
    tag = "project_members",
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "获取项目成员列表成功", body = ApiResponse<Vec<ProjectMember>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_members(
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectMember>>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Json(ApiResponse::server_error("rls transaction unavailable")),
    };
    let result = sqlx::query_as::<_, ProjectMember>(
        only_own_schema_query!("pm", "SELECT id, project_id, user_id, role, responsibilities, start_date, end_date, created_at, updated_at FROM pm.project_members WHERE project_id = $1 ORDER BY role ASC"),
    )
    .bind(project_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(members) => Json(ApiResponse::success(members, "获取项目成员列表成功")),
        Err(e) => {
            tracing::error!("获取项目成员列表失败: {}", e);
            Json(ApiResponse::server_error("获取项目成员列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/projects/{project_id}/members",
    tag = "project_members",
    request_body = CreateMemberRequest,
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "添加项目成员成功", body = ApiResponse<ProjectMember>),
        (status = 409, description = "成员已存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn create_member(
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMemberRequest>,
) -> Json<ApiResponse<ProjectMember>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Json(ApiResponse::server_error("rls transaction unavailable")),
    };
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectMember>(only_own_schema_query!(
        "pm",
        r#"
        INSERT INTO pm.project_members (
            id, tenant_id, project_id, user_id, role, responsibilities,
            start_date, end_date, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (project_id, user_id) DO NOTHING
        RETURNING *
        "#
    ))
    .bind(id)
    .bind(effective_tenant_id(&ctx, &claims))
    .bind(project_id)
    .bind(&req.user_id)
    .bind(&req.role)
    .bind(&req.responsibilities)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(now)
    .bind(now)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(member)) => Json(ApiResponse::success(member, "添加项目成员成功")),
        Ok(None) => Json(ApiResponse::conflict("成员已存在")),
        Err(e) => {
            tracing::error!("添加项目成员失败: {}", e);
            Json(ApiResponse::server_error("添加项目成员失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/members/{id}",
    tag = "project_members",
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "获取项目成员成功", body = ApiResponse<ProjectMember>),
        (status = 404, description = "项目成员不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_member(
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<ProjectMember>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Json(ApiResponse::server_error("rls transaction unavailable")),
    };
    let result = sqlx::query_as::<_, ProjectMember>(
        only_own_schema_query!("pm", "SELECT id, project_id, user_id, role, responsibilities, start_date, end_date, created_at, updated_at FROM pm.project_members WHERE project_id = $1 AND id = $2"),
    )
    .bind(project_id)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(member)) => Json(ApiResponse::success(member, "获取项目成员成功")),
        Ok(None) => Json(ApiResponse::not_found("项目成员不存在")),
        Err(e) => {
            tracing::error!("获取项目成员失败: {}", e);
            Json(ApiResponse::server_error("获取项目成员失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:update"])),
    path = "/projects/{project_id}/members/{id}",
    tag = "project_members",
    request_body = UpdateMemberRequest,
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "更新项目成员成功", body = ApiResponse<ProjectMember>),
        (status = 404, description = "项目成员不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn update_member(
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateMemberRequest>,
) -> Json<ApiResponse<ProjectMember>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Json(ApiResponse::server_error("rls transaction unavailable")),
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectMember>(only_own_schema_query!(
        "pm",
        r#"
        UPDATE pm.project_members
        SET role = COALESCE($1, role),
            responsibilities = COALESCE($2, responsibilities),
            start_date = COALESCE($3, start_date),
            end_date = COALESCE($4, end_date),
            updated_at = $5
        WHERE project_id = $6 AND id = $7 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
        RETURNING *
        "#
    ))
    .bind(&req.role)
    .bind(&req.responsibilities)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(now)
    .bind(project_id)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(member)) => Json(ApiResponse::success(member, "更新项目成员成功")),
        Ok(None) => Json(ApiResponse::not_found("项目成员不存在")),
        Err(e) => {
            tracing::error!("更新项目成员失败: {}", e);
            Json(ApiResponse::server_error("更新项目成员失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pm:delete"])),
    path = "/projects/{project_id}/members/{id}",
    tag = "project_members",
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "删除项目成员成功", body = ApiResponse<bool>),
        (status = 404, description = "项目成员不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn delete_member(
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<bool>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Json(ApiResponse::server_error("rls transaction unavailable")),
    };
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.project_members WHERE project_id = $1 AND id = $2 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"
    ))
    .bind(project_id)
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            Json(ApiResponse::success(true, "删除项目成员成功"))
        }
        Ok(_) => Json(ApiResponse::not_found("项目成员不存在")),
        Err(e) => {
            tracing::error!("删除项目成员失败: {}", e);
            Json(ApiResponse::server_error("删除项目成员失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::PgConnectOptions;
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(make_pool());
        let _ = router;
    }
}
