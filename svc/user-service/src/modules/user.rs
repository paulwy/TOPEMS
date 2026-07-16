use axum::{extract::Path, http::StatusCode, Extension, Json};
use sqlx::{FromRow, PgPool, Row};
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::user::{CreateUserRequest, UpdateUserRequest, User, UserProfile};

pub async fn list_users(
    Extension(pool): Extension<PgPool>,
) -> (StatusCode, Json<ApiResponse<Vec<User>>>) {
    let users = match sqlx::query("SELECT id, username, email, full_name, avatar_url, status, created_at, updated_at FROM core_users ORDER BY created_at DESC")
        .fetch_all(&pool)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("查询用户列表失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "查询用户列表失败")));
        }
    };

    let users: Vec<User> = users
        .into_iter()
        .filter_map(|row| match User::from_row(&row) {
            Ok(u) => Some(u),
            Err(e) => {
                tracing::error!("解析用户数据失败: {}", e);
                None
            }
        })
        .collect();

    (
        StatusCode::OK,
        Json(ApiResponse::success(users, "查询成功")),
    )
}

pub async fn create_user(
    Extension(pool): Extension<PgPool>,
    Json(req): Json<CreateUserRequest>,
) -> (StatusCode, Json<ApiResponse<User>>) {
    let row = match sqlx::query(
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
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("创建用户失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "创建用户失败")),
            );
        }
    };

    let user = match User::from_row(&row) {
        Ok(u) => u,
        Err(e) => {
            tracing::error!("解析用户数据失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "数据解析失败")),
            );
        }
    };

    (StatusCode::OK, Json(ApiResponse::success(user, "创建成功")))
}

pub async fn get_user(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<User>>) {
    let row = match sqlx::query("SELECT id, username, email, full_name, avatar_url, status, created_at, updated_at FROM core_users WHERE id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("查询用户信息失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "查询用户信息失败")));
        }
    };

    match row {
        Some(row) => match User::from_row(&row) {
            Ok(u) => (StatusCode::OK, Json(ApiResponse::success(u, "查询成功"))),
            Err(e) => {
                tracing::error!("解析用户数据失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "数据解析失败")),
                )
            }
        },
        None => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "用户不存在")),
        ),
    }
}

pub async fn update_user(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateUserRequest>,
) -> (StatusCode, Json<ApiResponse<User>>) {
    let row = match sqlx::query(
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
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("更新用户信息失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "更新用户信息失败")),
            );
        }
    };

    match row {
        Some(row) => match User::from_row(&row) {
            Ok(u) => (StatusCode::OK, Json(ApiResponse::success(u, "更新成功"))),
            Err(e) => {
                tracing::error!("解析用户数据失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "数据解析失败")),
                )
            }
        },
        None => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "用户不存在")),
        ),
    }
}

pub async fn delete_user(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<()>>) {
    let result = match sqlx::query("DELETE FROM core_users WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(result) => result,
        Err(e) => {
            tracing::error!("删除用户失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "删除用户失败")),
            );
        }
    };

    if result.rows_affected() > 0 {
        (StatusCode::OK, Json(ApiResponse::success((), "删除成功")))
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "用户不存在")),
        )
    }
}

pub async fn get_user_profile(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<UserProfile>>) {
    let row = match sqlx::query("SELECT id, user_id, bio, phone, department, position, location FROM core_user_profiles WHERE user_id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("查询用户资料失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "查询用户资料失败")));
        }
    };

    match row {
        Some(row) => match UserProfile::from_row(&row) {
            Ok(p) => (StatusCode::OK, Json(ApiResponse::success(p, "查询成功"))),
            Err(e) => {
                tracing::error!("解析用户资料失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "数据解析失败")),
                )
            }
        },
        None => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "用户资料不存在")),
        ),
    }
}

pub async fn update_user_profile(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UserProfile>,
) -> (StatusCode, Json<ApiResponse<UserProfile>>) {
    let row = match sqlx::query(
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
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("更新用户资料失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "更新用户资料失败")),
            );
        }
    };

    let profile = match UserProfile::from_row(&row) {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("解析用户资料失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "数据解析失败")),
            );
        }
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(profile, "更新成功")),
    )
}

pub async fn get_user_roles(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<Vec<String>>>) {
    let rows = match sqlx::query("SELECT r.name FROM core_roles r JOIN core_user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1")
        .bind(id)
        .fetch_all(&pool)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("查询用户角色失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "查询用户角色失败")));
        }
    };

    let roles: Vec<String> = rows
        .into_iter()
        .filter_map(|row| match row.try_get("name") {
            Ok(name) => Some(name),
            Err(e) => {
                tracing::error!("解析角色名称失败: {}", e);
                None
            }
        })
        .collect();

    (
        StatusCode::OK,
        Json(ApiResponse::success(roles, "查询成功")),
    )
}

pub async fn assign_roles(
    Extension(pool): Extension<PgPool>,
    Path(id): Path<Uuid>,
    Json(role_ids): Json<Vec<Uuid>>,
) -> (StatusCode, Json<ApiResponse<()>>) {
    for role_id in role_ids {
        if let Err(e) = sqlx::query(
            "INSERT INTO core_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(id)
        .bind(role_id)
        .execute(&pool)
        .await
        {
            tracing::error!("分配角色失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "分配角色失败")),
            );
        }
    }

    (
        StatusCode::OK,
        Json(ApiResponse::success((), "角色分配成功")),
    )
}

pub async fn remove_role(
    Extension(pool): Extension<PgPool>,
    Path((id, role_id)): Path<(Uuid, Uuid)>,
) -> (StatusCode, Json<ApiResponse<()>>) {
    let result =
        match sqlx::query("DELETE FROM core_user_roles WHERE user_id = $1 AND role_id = $2")
            .bind(id)
            .bind(role_id)
            .execute(&pool)
            .await
        {
            Ok(result) => result,
            Err(e) => {
                tracing::error!("移除角色失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "移除角色失败")),
                );
            }
        };

    if result.rows_affected() > 0 {
        (
            StatusCode::OK,
            Json(ApiResponse::success((), "角色移除成功")),
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "用户角色关系不存在")),
        )
    }
}
