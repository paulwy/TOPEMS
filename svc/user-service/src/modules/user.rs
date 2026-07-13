use axum::{extract::Path, Extension, Json};
use sqlx::{FromRow, PgPool, Row};
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::user::{CreateUserRequest, UpdateUserRequest, User, UserProfile};

pub async fn list_users(Extension(pool): Extension<PgPool>) -> Json<ApiResponse<Vec<User>>> {
    let users = sqlx::query("SELECT id, username, email, full_name, avatar_url, status, created_at, updated_at FROM core_users ORDER BY created_at DESC")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    let users: Vec<User> = users
        .into_iter()
        .filter_map(|row| match User::from_row(&row) {
            Ok(u) => Some(u),
            Err(_) => None,
        })
        .collect();

    Json(ApiResponse::success(users, "查询成功"))
}

pub async fn create_user(
    Extension(pool): Extension<PgPool>,
    Json(req): Json<CreateUserRequest>,
) -> Json<ApiResponse<User>> {
    let user = sqlx::query(
        r#"INSERT INTO core_users (username, email, full_name, avatar_url, status)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, username, email, full_name, avatar_url, status, created_at, updated_at"#,
    )
    .bind(req.username)
    .bind(req.email)
    .bind(req.full_name)
    .bind(req.avatar_url)
    .bind("active")
    .fetch_one(&pool)
    .await
    .unwrap();

    let user = User::from_row(&user).unwrap();
    Json(ApiResponse::success(user, "创建成功"))
}

pub async fn get_user(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<User>> {
    let row = sqlx::query("SELECT id, username, email, full_name, avatar_url, status, created_at, updated_at FROM core_users WHERE id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await
        .unwrap();

    match row {
        Some(row) => match User::from_row(&row) {
            Ok(u) => Json(ApiResponse::success(u, "查询成功")),
            Err(_) => Json(ApiResponse::error(500, "数据解析失败")),
        },
        None => Json(ApiResponse::error(404, "用户不存在")),
    }
}

pub async fn update_user(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateUserRequest>,
) -> Json<ApiResponse<User>> {
    let row = sqlx::query(
        r#"UPDATE core_users SET
           username = COALESCE($1, username),
           email = COALESCE($2, email),
           full_name = COALESCE($3, full_name),
           avatar_url = COALESCE($4, avatar_url),
           status = COALESCE($5, status),
           updated_at = NOW()
           WHERE id = $6
           RETURNING id, username, email, full_name, avatar_url, status, created_at, updated_at"#,
    )
    .bind(req.username)
    .bind(req.email)
    .bind(req.full_name)
    .bind(req.avatar_url)
    .bind(req.status)
    .bind(id)
    .fetch_optional(&pool)
    .await
    .unwrap();

    match row {
        Some(row) => match User::from_row(&row) {
            Ok(u) => Json(ApiResponse::success(u, "更新成功")),
            Err(_) => Json(ApiResponse::error(500, "数据解析失败")),
        },
        None => Json(ApiResponse::error(404, "用户不存在")),
    }
}

pub async fn delete_user(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM core_users WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .unwrap();

    if result.rows_affected() > 0 {
        Json(ApiResponse::success((), "删除成功"))
    } else {
        Json(ApiResponse::error(404, "用户不存在"))
    }
}

pub async fn get_user_profile(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<UserProfile>> {
    let row = sqlx::query("SELECT id, user_id, bio, phone, department, position, location FROM core_user_profiles WHERE user_id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await
        .unwrap();

    match row {
        Some(row) => match UserProfile::from_row(&row) {
            Ok(p) => Json(ApiResponse::success(p, "查询成功")),
            Err(_) => Json(ApiResponse::error(500, "数据解析失败")),
        },
        None => Json(ApiResponse::error(404, "用户资料不存在")),
    }
}

pub async fn update_user_profile(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UserProfile>,
) -> Json<ApiResponse<UserProfile>> {
    let row = sqlx::query(
        r#"INSERT INTO core_user_profiles (user_id, bio, phone, department, position, location)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id) DO UPDATE SET
           bio = COALESCE($2, core_user_profiles.bio),
           phone = COALESCE($3, core_user_profiles.phone),
           department = COALESCE($4, core_user_profiles.department),
           position = COALESCE($5, core_user_profiles.position),
           location = COALESCE($6, core_user_profiles.location),
           updated_at = NOW()
           RETURNING id, user_id, bio, phone, department, position, location"#,
    )
    .bind(id)
    .bind(req.bio)
    .bind(req.phone)
    .bind(req.department)
    .bind(req.position)
    .bind(req.location)
    .fetch_one(&pool)
    .await
    .unwrap();

    let profile = UserProfile::from_row(&row).unwrap();
    Json(ApiResponse::success(profile, "更新成功"))
}

pub async fn get_user_roles(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<String>>> {
    let rows = sqlx::query("SELECT r.name FROM core_roles r JOIN core_user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1")
        .bind(id)
        .fetch_all(&pool)
        .await
        .unwrap();

    let roles: Vec<String> = rows
        .into_iter()
        .filter_map(|row| row.try_get("name").ok())
        .collect();

    Json(ApiResponse::success(roles, "查询成功"))
}

pub async fn assign_roles(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
    Json(role_ids): Json<Vec<Uuid>>,
) -> Json<ApiResponse<()>> {
    for role_id in role_ids {
        sqlx::query(
            "INSERT INTO core_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(id)
        .bind(role_id)
        .execute(&pool)
        .await
        .unwrap();
    }

    Json(ApiResponse::success((), "角色分配成功"))
}

pub async fn remove_role(
    Extension(pool): Extension<PgPool>,
    Path((id, role_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM core_user_roles WHERE user_id = $1 AND role_id = $2")
        .bind(id)
        .bind(role_id)
        .execute(&pool)
        .await
        .unwrap();

    if result.rows_affected() > 0 {
        Json(ApiResponse::success((), "角色移除成功"))
    } else {
        Json(ApiResponse::error(404, "用户角色关系不存在"))
    }
}
