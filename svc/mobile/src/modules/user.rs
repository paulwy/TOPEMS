use axum::{
    extract::{Extension, Json, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, Row};
use std::fs;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::paths::resolve_writable_dir;
use topems_shared_core::response::ApiResponse;

fn tenant_filter(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: Uuid,
    pub username: String,
    pub nickname: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl UserProfile {
    pub fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            username: row.try_get("username")?,
            nickname: row.try_get("nickname")?,
            phone: row.try_get("phone")?,
            email: row.try_get("email")?,
            avatar_url: row.try_get("avatar_url")?,
            department: row.try_get("department")?,
            position: row.try_get("position")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProfileRequest {
    pub nickname: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub id: Uuid,
    pub user_id: Uuid,
    pub language: String,
    pub theme: String,
    pub notification_enabled: bool,
    pub sound_enabled: bool,
    pub auto_sync: bool,
    pub sync_interval: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl UserSettings {
    pub fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            language: row.try_get("language")?,
            theme: row.try_get("theme")?,
            notification_enabled: row.try_get("notification_enabled")?,
            sound_enabled: row.try_get("sound_enabled")?,
            auto_sync: row.try_get("auto_sync")?,
            sync_interval: row.try_get("sync_interval")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:user:read"])),
    path = "/user/profile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "user"
)]
pub async fn get_profile(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let __mobile_response = {
        let profile = match sqlx::query(only_own_schema_query!("mobile", "SELECT id, username, nickname, phone, email, avatar_url, department, position, created_at, updated_at FROM mobile.mobile_users WHERE id = $1"))
        .bind(user_id)
        .fetch_optional(&mut scope)
        .await
    {
        Ok(Some(row)) => match UserProfile::from_row(&row) {
            Ok(p) => p,
            Err(e) => {
                tracing::error!("解析用户信息失败: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("内部服务器错误"));
            }
        },
        Ok(None) => {
            return (StatusCode::NOT_FOUND, ApiResponse::not_found("用户不存在"));
        }
        Err(e) => {
            tracing::error!("查询用户信息失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("内部服务器错误"));
        }
    };

        (
            StatusCode::OK,
            ApiResponse::success(profile, "获取用户信息成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    put,
    path = "/api/mobile/user/profile",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn update_profile(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<UpdateProfileRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let result = sqlx::query(only_own_schema_query!("mobile", "UPDATE mobile.mobile_users SET nickname = COALESCE($1, nickname), phone = COALESCE($2, phone), email = COALESCE($3, email), department = COALESCE($4, department), position = COALESCE($5, position), updated_at = NOW() WHERE id = $6"))
        .bind(payload.nickname)
        .bind(payload.phone)
        .bind(payload.email)
        .bind(payload.department)
        .bind(payload.position)
        .bind(user_id)
        .execute(&mut scope)
        .await;

    let __mobile_response = {
        match result {
            Ok(r) if r.rows_affected() > 0 => {
                (StatusCode::OK, ApiResponse::success((), "更新用户信息成功"))
            }
            Ok(_) => (StatusCode::NOT_FOUND, ApiResponse::not_found("用户不存在")),
            Err(e) => {
                tracing::error!("更新用户信息失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("内部服务器错误"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UploadAvatarRequest {
    pub avatar_base64: String,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:user:write"])),
    path = "/user/avatar",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "user"
)]
pub async fn upload_avatar(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<UploadAvatarRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let raw_bytes = match base64_decode(&payload.avatar_base64) {
        Ok(b) if !b.is_empty() => b,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("缺少头像文件"),
            )
        }
    };

    let file_name = format!("{}_{}", Uuid::new_v4(), "avatar.jpg");
    // 上传目录解析为绝对路径（默认锚定可执行文件目录，可用 UPLOAD_DIR 覆盖），不依赖 CWD
    let uploads_dir = resolve_writable_dir("UPLOAD_DIR", "uploads");
    let path = uploads_dir.join(&file_name);

    if let Err(e) = fs::create_dir_all(&uploads_dir) {
        tracing::error!("创建上传目录失败: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("创建上传目录失败"),
        );
    }

    if let Err(e) = fs::write(&path, &raw_bytes) {
        tracing::error!("保存头像失败: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("保存头像失败"),
        );
    }

    let avatar_url = format!("/uploads/{}", file_name);

    let result = sqlx::query(only_own_schema_query!(
        "mobile",
        "UPDATE mobile.mobile_users SET avatar_url = $1, updated_at = NOW() WHERE id = $2"
    ))
    .bind(&avatar_url)
    .bind(user_id)
    .execute(&mut scope)
    .await;

    let __mobile_response = {
        match result {
            Ok(_) => (
                StatusCode::OK,
                ApiResponse::success(avatar_url, "上传头像成功"),
            ),
            Err(e) => {
                tracing::error!("更新头像URL失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("更新头像URL失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
fn base64_decode(s: &str) -> Result<Vec<u8>, ()> {
    // 简单 base64 解码实现，避免额外依赖
    use std::collections::HashMap;
    let chars: Vec<char> = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
        .chars()
        .collect();
    let map: HashMap<char, u8> = chars
        .iter()
        .enumerate()
        .map(|(i, c)| (*c, i as u8))
        .collect();

    let cleaned: String = s
        .chars()
        .filter(|c| c != &'=' && c != &'\n' && c != &'\r' && c != &' ')
        .collect();
    let mut out = Vec::new();
    let bytes: Vec<char> = cleaned.chars().collect();
    for i in (0..bytes.len()).step_by(4) {
        let n1 = bytes.get(i).and_then(|c| map.get(c)).copied().unwrap_or(0);
        let n2 = bytes
            .get(i + 1)
            .and_then(|c| map.get(c))
            .copied()
            .unwrap_or(0);
        let n3 = bytes
            .get(i + 2)
            .and_then(|c| map.get(c))
            .copied()
            .unwrap_or(0);
        let n4 = bytes
            .get(i + 3)
            .and_then(|c| map.get(c))
            .copied()
            .unwrap_or(0);
        out.push((n1 << 2) | (n2 >> 4));
        if i + 2 < bytes.len() {
            out.push(((n2 & 0x0F) << 4) | (n3 >> 2));
        }
        if i + 3 < bytes.len() {
            out.push(((n3 & 0x03) << 6) | n4);
        }
    }
    Ok(out)
}

/// 修改密码（前端 POST /user/change-password → 转发 unified-core /api/core/iam/users/{id}/password）
pub async fn change_password(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(topems_shared_core::response::error_value(401, "未授权")),
            );
        }
    };

    // 当前部署形态为 monolith（8099）；独立部署 unified-core 时通过 CORE_URL 覆盖
    let core_url =
        std::env::var("CORE_URL").unwrap_or_else(|_| "http://localhost:8099".to_string());
    let url = format!("{}/api/core/iam/users/{}/password", core_url, user_id);

    let auth_value = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .to_string();

    let client = topems_shared_core::shared_http_client();
    match client
        .put(&url)
        .header(reqwest::header::AUTHORIZATION, auth_value)
        .json(&payload)
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status();
            let body = resp.json::<serde_json::Value>().await.unwrap_or_default();
            (
                StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
                Json(body),
            )
        }
        Err(e) => {
            tracing::error!("转发修改密码失败: {}", e);
            (
                StatusCode::BAD_GATEWAY,
                Json(topems_shared_core::response::error_value(
                    502,
                    "修改密码服务不可用",
                )),
            )
        }
    }
}

// ===== user 死代码端点轻量兜底（2026-10-05，页面未调用，占位实现防 404）=====

/// 用户详情（前端 GET /user/{id} → mobile_users 按 id 查询）
pub async fn get_user_by_id(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let row = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT id, username, nickname, phone, email, avatar_url, department, position, created_at, updated_at FROM mobile.mobile_users WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    let __mobile_response = {
        match row {
            Ok(Some(r)) => match UserProfile::from_row(&r) {
                Ok(profile) => (
                    StatusCode::OK,
                    ApiResponse::success(profile, "获取用户详情成功"),
                ),
                Err(e) => {
                    tracing::error!("解析用户详情失败: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        ApiResponse::server_error("解析用户详情失败"),
                    )
                }
            },
            Ok(None) => (StatusCode::NOT_FOUND, ApiResponse::not_found("用户不存在")),
            Err(e) => {
                tracing::error!("查询用户详情失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("查询用户详情失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListUsersParams {
    pub page: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i64>,
    pub keyword: Option<String>,
    #[serde(rename = "departmentId")]
    pub department_id: Option<String>,
    pub status: Option<String>,
}

/// 用户列表（前端 GET /user → 分页 + keyword/departmentId 过滤；status 无字段忽略）
pub async fn list_users(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Query(params): Query<ListUsersParams>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let keyword = params.keyword.unwrap_or_default();
    let department = params.department_id.unwrap_or_default();

    let rows = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT id, username, nickname, phone, email, avatar_url, department, position, created_at, updated_at
         FROM mobile.mobile_users
         WHERE ($1::text = '' OR username ILIKE '%' || $1 || '%' OR nickname ILIKE '%' || $1 || '%' OR phone ILIKE '%' || $1 || '%')
           AND ($2::text = '' OR department = $2)
         ORDER BY created_at DESC LIMIT $3 OFFSET $4"
    ))
    .bind(&keyword)
    .bind(&department)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    let __mobile_response = {
        match rows {
            Ok(rows) => {
                let users: Vec<UserProfile> = rows
                    .iter()
                    .filter_map(|r| UserProfile::from_row(r).ok())
                    .collect();
                (
                    StatusCode::OK,
                    ApiResponse::success(
                        serde_json::json!({ "items": users, "total": users.len() }),
                        "获取用户列表成功",
                    ),
                )
            }
            Err(e) => {
                tracing::error!("查询用户列表失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("查询用户列表失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 部门成员（前端 GET /user/department/{departmentId} → 按 department 过滤）
pub async fn get_department_members(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    axum::extract::Path(department_id): axum::extract::Path<String>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let rows = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT id, username, nickname, phone, email, avatar_url, department, position, created_at, updated_at
         FROM mobile.mobile_users WHERE department = $1 ORDER BY username ASC"
    ))
    .bind(&department_id)
    .fetch_all(&mut scope)
    .await;

    let __mobile_response = {
        match rows {
            Ok(rows) => {
                let users: Vec<UserProfile> = rows
                    .iter()
                    .filter_map(|r| UserProfile::from_row(r).ok())
                    .collect();
                (
                    StatusCode::OK,
                    ApiResponse::success(users, "获取部门成员成功"),
                )
            }
            Err(e) => {
                tracing::error!("查询部门成员失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("查询部门成员失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 更新用户状态（前端 PUT /user/{id}/status → mobile_users 无 status 字段，占位校验存在性）
pub async fn update_user_status(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    let status = payload.get("status").and_then(|v| v.as_str()).unwrap_or("");

    let exists = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT 1 FROM mobile.mobile_users WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    let __mobile_response = {
        match exists {
            Ok(Some(_)) => (
                StatusCode::OK,
                ApiResponse::success(
                    serde_json::json!({ "id": id, "status": status }),
                    "用户状态已更新（占位实现，待 IAM 状态字段接入）",
                ),
            ),
            Ok(None) => (StatusCode::NOT_FOUND, ApiResponse::not_found("用户不存在")),
            Err(e) => {
                tracing::error!("查询用户失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("查询用户失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 用户权限（前端 GET /user/permissions → 移动端基础权限集）
pub async fn get_permissions(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let permissions = serde_json::json!({
        "permissions": [
            "mobile:task:read", "mobile:task:write",
            "mobile:attendance:read", "mobile:attendance:write",
            "mobile:inventory:read", "mobile:inventory:write",
            "mobile:production:read", "mobile:production:write",
            "mobile:customer:read", "mobile:customer:write",
            "mobile:document:read", "mobile:document:write"
        ],
        "roles": ["mobile_user"]
    });
    (
        StatusCode::OK,
        ApiResponse::success(permissions, "获取用户权限成功"),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        // roundtrip verified by JSON comparison
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn user_profile_roundtrip() {
        use chrono::Utc;
        roundtrip(&UserProfile {
            id: uuid::Uuid::new_v4(),
            username: "alice".into(),
            nickname: Some("Alice".into()),
            phone: None,
            email: Some("a@b.com".into()),
            avatar_url: None,
            department: None,
            position: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
    }

    #[test]
    fn update_profile_request_roundtrip() {
        roundtrip(&UpdateProfileRequest {
            nickname: Some("A".into()),
            phone: None,
            email: None,
            department: None,
            position: None,
        });
    }

    #[test]
    fn user_settings_roundtrip() {
        use chrono::Utc;
        roundtrip(&UserSettings {
            id: uuid::Uuid::new_v4(),
            user_id: uuid::Uuid::new_v4(),
            language: "zh".into(),
            theme: "light".into(),
            notification_enabled: true,
            sound_enabled: true,
            auto_sync: true,
            sync_interval: 15,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
    }

    #[test]
    fn upload_avatar_request_roundtrip() {
        roundtrip(&UploadAvatarRequest {
            avatar_base64: "aGVsbG8=".into(),
        });
    }
}
