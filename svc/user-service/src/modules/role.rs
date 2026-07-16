use axum::{extract::Path, Extension, Json};
use sqlx::{FromRow, PgPool};
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::role::{CreateRoleRequest, Role, UpdateRoleRequest};

pub async fn list_roles(Extension(pool): Extension<PgPool>) -> Json<ApiResponse<Vec<Role>>> {
    let rows = match sqlx::query("SELECT id, name, description, permissions, status, created_at, updated_at FROM core_roles ORDER BY name")
        .fetch_all(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询角色列表失败: {}", e);
            return Json(ApiResponse::error(500, "查询角色列表失败"));
        }
    };

    let roles: Vec<Role> = rows
        .into_iter()
        .filter_map(|row| Role::from_row(&row).ok())
        .collect();

    Json(ApiResponse::success(roles, "查询成功"))
}

pub async fn create_role(
    Extension(pool): Extension<PgPool>,
    Json(req): Json<CreateRoleRequest>,
) -> Json<ApiResponse<Role>> {
    let row = match sqlx::query(
        r#"INSERT INTO core_roles (name, description, permissions, status)
           VALUES ($1, $2, $3, $4)
           RETURNING id, name, description, permissions, status, created_at, updated_at"#,
    )
    .bind(req.name)
    .bind(req.description)
    .bind(req.permissions)
    .bind("active")
    .fetch_one(&pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("创建角色失败: {}", e);
            return Json(ApiResponse::error(500, "创建角色失败"));
        }
    };

    let role = match Role::from_row(&row) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("解析角色数据失败: {}", e);
            return Json(ApiResponse::error(500, "创建角色失败"));
        }
    };
    Json(ApiResponse::success(role, "创建成功"))
}

pub async fn get_role(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Role>> {
    let row = match sqlx::query("SELECT id, name, description, permissions, status, created_at, updated_at FROM core_roles WHERE id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询角色失败: {}", e);
            return Json(ApiResponse::error(500, "查询角色失败"));
        }
    };

    match row {
        Some(row) => match Role::from_row(&row) {
            Ok(r) => Json(ApiResponse::success(r, "查询成功")),
            Err(_) => Json(ApiResponse::error(500, "数据解析失败")),
        },
        None => Json(ApiResponse::error(404, "角色不存在")),
    }
}

pub async fn update_role(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateRoleRequest>,
) -> Json<ApiResponse<Role>> {
    let row = match sqlx::query(
        r#"UPDATE core_roles SET
           name = COALESCE($1, name),
           description = COALESCE($2, description),
           permissions = COALESCE($3, permissions),
           status = COALESCE($4, status),
           updated_at = NOW()
           WHERE id = $5
           RETURNING id, name, description, permissions, status, created_at, updated_at"#,
    )
    .bind(req.name)
    .bind(req.description)
    .bind(req.permissions)
    .bind(req.status)
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("更新角色失败: {}", e);
            return Json(ApiResponse::error(500, "更新角色失败"));
        }
    };

    match row {
        Some(row) => match Role::from_row(&row) {
            Ok(r) => Json(ApiResponse::success(r, "更新成功")),
            Err(_) => Json(ApiResponse::error(500, "数据解析失败")),
        },
        None => Json(ApiResponse::error(404, "角色不存在")),
    }
}

pub async fn delete_role(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = match sqlx::query("DELETE FROM core_roles WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("删除角色失败: {}", e);
            return Json(ApiResponse::error(500, "删除角色失败"));
        }
    };

    if result.rows_affected() > 0 {
        Json(ApiResponse::success((), "删除成功"))
    } else {
        Json(ApiResponse::error(404, "角色不存在"))
    }
}
