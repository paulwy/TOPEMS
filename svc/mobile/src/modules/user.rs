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
use utoipa::ToSchema;
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

/// 写路径租户上下文：直接取 claims.tenant_id（超管的 claims 也带所属租户，
/// 之前沿用 tenant_filter 会因 is_superuser 返回 None，导致超管改资料/设置在 400 被挡）。
fn tenant_from_claims(claims: &Claims) -> Option<Uuid> {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .filter(|t| !t.is_nil())
}

/// 头像二进制上限（2 MiB）。base64 解码是手写全量展开，必须先挡住超大输入。
const MAX_AVATAR_BYTES: usize = 2 * 1024 * 1024;

/// 头像大小闸门（独立函数便于单测边界，不依赖 axum 请求生命周期）。
fn avatar_within_limit(len: usize) -> bool {
    len > 0 && len <= MAX_AVATAR_BYTES
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

pub async fn update_profile(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<UpdateProfileRequest>,
) -> impl IntoResponse {
    // W5-B：写路径显式带租户谓词，不依赖 RLS 单层（超管上下文时 RLS 分支全放行）。
    let tenant_id = match tenant_from_claims(&claims) {
        Some(t) => t,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("缺少租户上下文：拒绝更新资料"),
            )
        }
    };
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

    let result = sqlx::query(only_own_schema_query!("mobile", "UPDATE mobile.mobile_users SET nickname = COALESCE($1, nickname), phone = COALESCE($2, phone), email = COALESCE($3, email), department = COALESCE($4, department), position = COALESCE($5, position), updated_at = NOW() WHERE id = $6 AND tenant_id = $7::uuid AND deleted_at IS NULL"))
        .bind(payload.nickname)
        .bind(payload.phone)
        .bind(payload.email)
        .bind(payload.department)
        .bind(payload.position)
        .bind(user_id)
        .bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<UploadAvatarRequest>,
) -> impl IntoResponse {
    // W5-B：头像写路径同样显式租户谓词；缺租户直接拒绝，不落到 RLS 分支上。
    let tenant_id = match tenant_filter(&claims) {
        Some(t) if !t.is_nil() => t,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("缺少租户上下文：拒绝上传头像"),
            )
        }
    };
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

    // 先确认用户行存在（同租户、未软删），把 404 分支前移到任何写入之前：
    // 请求事务内写后再返回非 2xx 会被 tenant_middleware 回滚，且会留下孤儿头像文件。
    let target_exists = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT 1 FROM mobile.mobile_users WHERE id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL"
    ))
    .bind(user_id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    match target_exists {
        Ok(Some(_)) => {}
        Ok(None) => return (StatusCode::NOT_FOUND, ApiResponse::not_found("用户不存在")),
        Err(e) => {
            tracing::error!("校验用户存在性失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("内部服务器错误"),
            );
        }
    }

    let raw_bytes = match base64_decode(&payload.avatar_base64) {
        Ok(b) if !b.is_empty() => b,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("缺少头像文件"),
            )
        }
    };
    // 头像上限 2 MiB：手写 base64 解码没有流式限制，不设闸等于允许任意内存放大。
    if !avatar_within_limit(raw_bytes.len()) {
        return (
            StatusCode::PAYLOAD_TOO_LARGE,
            ApiResponse::error(413, "头像超过 2 MiB 上限"),
        );
    }

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
        "UPDATE mobile.mobile_users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3::uuid AND deleted_at IS NULL"
    ))
    .bind(&avatar_url)
    .bind(user_id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    let __mobile_response = {
        match result {
            Ok(r) if r.rows_affected() > 0 => (
                StatusCode::OK,
                ApiResponse::success(avatar_url, "上传头像成功"),
            ),
            Ok(_) => {
                // 竞态：预检后行被删。DB 未写入，清掉刚落盘的文件再返回 404。
                let _ = fs::remove_file(&path);
                (StatusCode::NOT_FOUND, ApiResponse::not_found("用户不存在"))
            }
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
        // B360：非法字符不再静默按 0 解码（旧实现会把 "!!!!" 解成合法字节），直接拒绝。
        let Some(n1) = bytes.get(i).and_then(|c| map.get(c)).copied() else {
            return Err(());
        };
        let n2 = bytes.get(i + 1).and_then(|c| map.get(c)).copied();
        let n3 = bytes.get(i + 2).and_then(|c| map.get(c)).copied();
        let n4 = bytes.get(i + 3).and_then(|c| map.get(c)).copied();
        let n2 = match n2 {
            Some(v) => v,
            None => return Err(()),
        };
        out.push((n1 << 2) | (n2 >> 4));
        if i + 2 < bytes.len() {
            let Some(n3) = n3 else { return Err(()) };
            out.push(((n2 & 0x0F) << 4) | (n3 >> 2));
        }
        if i + 3 < bytes.len() {
            let Some(n4) = n4 else { return Err(()) };
            let Some(n3) = n3 else { return Err(()) };
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

    #[test]
    fn avatar_size_gate_rejects_empty_and_oversize() {
        assert!(!avatar_within_limit(0));
        assert!(avatar_within_limit(1));
        assert!(avatar_within_limit(MAX_AVATAR_BYTES));
        assert!(!avatar_within_limit(MAX_AVATAR_BYTES + 1));
    }

    #[test]
    fn base64_decode_roundtrip_hello() {
        assert_eq!(base64_decode("aGVsbG8="), Ok(b"hello".to_vec()));
        // 空串解码为空字节，由 handler 的 avatar_within_limit 拒绝（0 长度不放行）。
        assert_eq!(base64_decode(""), Ok(Vec::new()));
        assert!(base64_decode("!!!!").is_err());
    }
}

/// 用户偏好设置（mobile.user_settings 真实行）。此前 GET /user/settings 返回硬编码 JSON。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettingsView {
    pub language: String,
    pub theme: String,
    pub notification_enabled: bool,
    pub sound_enabled: bool,
    pub auto_sync: bool,
    pub sync_interval: i32,
    /// 是否已有持久化记录。false 时值为系统默认，不代表用户个人配置。
    pub configured: bool,
}

impl UserSettingsView {
    fn defaults() -> Self {
        Self {
            language: "zh-CN".to_string(),
            theme: "light".to_string(),
            notification_enabled: true,
            sound_enabled: true,
            auto_sync: false,
            sync_interval: 15,
            configured: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateUserSettingsRequest {
    pub language: Option<String>,
    pub theme: Option<String>,
    pub notification_enabled: Option<bool>,
    pub sound_enabled: Option<bool>,
    pub auto_sync: Option<bool>,
    pub sync_interval: Option<i32>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:user:read"])),
    path = "/user/settings",
    responses((status = 200, description = "OK", body = serde_json::Value)),
    tag = "user"
)]
pub async fn get_user_settings(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    let tenant_id = match tenant_from_claims(&claims) {
        Some(t) => t,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::<UserSettingsView>::bad_request("缺少租户上下文"),
            )
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret)
        .ok()
        .and_then(|raw| Uuid::parse_str(&raw).ok())
    {
        Some(id) => id,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            )
        }
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
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

    let row = sqlx::query(
        "SELECT language, theme, notification_enabled, sound_enabled, auto_sync, sync_interval \
         FROM mobile.user_settings WHERE user_id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL",
    )
    .bind(user_id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let view = match row {
        Ok(Some(row)) => match (
            row.try_get::<String, _>("language"),
            row.try_get::<String, _>("theme"),
            row.try_get::<bool, _>("notification_enabled"),
            row.try_get::<bool, _>("sound_enabled"),
            row.try_get::<bool, _>("auto_sync"),
            row.try_get::<i32, _>("sync_interval"),
        ) {
            (
                Ok(language),
                Ok(theme),
                Ok(notification_enabled),
                Ok(sound_enabled),
                Ok(auto_sync),
                Ok(sync_interval),
            ) => UserSettingsView {
                language,
                theme,
                notification_enabled,
                sound_enabled,
                auto_sync,
                sync_interval,
                configured: true,
            },
            _ => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("设置行解析失败"),
                );
            }
        },
        Ok(None) => UserSettingsView::defaults(),
        Err(e) => {
            tracing::error!("查询用户设置失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("内部服务器错误"),
            );
        }
    };

    let _ = scope.commit().await;
    (StatusCode::OK, ApiResponse::success(view, "用户设置"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mobile:user:write"])),
    path = "/user/settings",
    request_body = UpdateUserSettingsRequest,
    responses((status = 200, description = "OK", body = serde_json::Value)),
    tag = "user"
)]
pub async fn update_user_settings(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<UpdateUserSettingsRequest>,
) -> impl IntoResponse {
    let tenant_id = match tenant_from_claims(&claims) {
        Some(t) => t,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::<UserSettingsView>::bad_request("缺少租户上下文"),
            )
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret)
        .ok()
        .and_then(|raw| Uuid::parse_str(&raw).ok())
    {
        Some(id) => id,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            )
        }
    };

    if let Some(interval) = payload.sync_interval {
        if !(1..=1440).contains(&interval) {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::<UserSettingsView>::bad_request("同步间隔需在 1–1440 分钟之间"),
            );
        }
    }
    if let Some(ref theme) = payload.theme {
        if !matches!(theme.as_str(), "light" | "dark" | "system") {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::<UserSettingsView>::bad_request("主题取值非法"),
            );
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
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

    let existing = sqlx::query(
        "SELECT id FROM mobile.user_settings WHERE user_id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL",
    )
    .bind(user_id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let existing_id = match existing {
        Ok(row) => row.map(|r| r.get::<Uuid, _>("id")),
        Err(e) => {
            tracing::error!("查询用户设置失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("内部服务器错误"),
            );
        }
    };

    let result = if existing_id.is_some() {
        sqlx::query(
            "UPDATE mobile.user_settings SET \
                language = COALESCE($3, language), \
                theme = COALESCE($4, theme), \
                notification_enabled = COALESCE($5, notification_enabled), \
                sound_enabled = COALESCE($6, sound_enabled), \
                auto_sync = COALESCE($7, auto_sync), \
                sync_interval = COALESCE($8, sync_interval), \
                updated_at = NOW() \
             WHERE user_id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL",
        )
        .bind(user_id)
        .bind(tenant_id)
        .bind(payload.language.clone())
        .bind(payload.theme.clone())
        .bind(payload.notification_enabled)
        .bind(payload.sound_enabled)
        .bind(payload.auto_sync)
        .bind(payload.sync_interval)
        .execute(&mut scope)
        .await
    } else {
        sqlx::query(
            "INSERT INTO mobile.user_settings \
                (tenant_id, user_id, language, theme, notification_enabled, sound_enabled, auto_sync, sync_interval) \
             VALUES ($2::uuid, $1, COALESCE($3, 'zh-CN'), COALESCE($4, 'light'), COALESCE($5, true), COALESCE($6, true), COALESCE($7, false), COALESCE($8, 15)) \
             ON CONFLICT (tenant_id, user_id) WHERE deleted_at IS NULL DO UPDATE SET \
                language = EXCLUDED.language, theme = EXCLUDED.theme, \
                notification_enabled = EXCLUDED.notification_enabled, \
                sound_enabled = EXCLUDED.sound_enabled, \
                auto_sync = EXCLUDED.auto_sync, sync_interval = EXCLUDED.sync_interval, \
                updated_at = NOW()",
        )
        .bind(user_id)
        .bind(tenant_id)
        .bind(payload.language.clone())
        .bind(payload.theme.clone())
        .bind(payload.notification_enabled)
        .bind(payload.sound_enabled)
        .bind(payload.auto_sync)
        .bind(payload.sync_interval)
        .execute(&mut scope)
        .await
    };

    match result {
        Ok(_) => {}
        Err(e) => {
            tracing::error!("保存用户设置失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("保存用户设置失败"),
            );
        }
    }

    let row = sqlx::query(
        "SELECT language, theme, notification_enabled, sound_enabled, auto_sync, sync_interval \
         FROM mobile.user_settings WHERE user_id = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL",
    )
    .bind(user_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let view = match row {
        Ok(row) => match (
            row.try_get::<String, _>("language"),
            row.try_get::<String, _>("theme"),
            row.try_get::<bool, _>("notification_enabled"),
            row.try_get::<bool, _>("sound_enabled"),
            row.try_get::<bool, _>("auto_sync"),
            row.try_get::<i32, _>("sync_interval"),
        ) {
            (
                Ok(language),
                Ok(theme),
                Ok(notification_enabled),
                Ok(sound_enabled),
                Ok(auto_sync),
                Ok(sync_interval),
            ) => UserSettingsView {
                language,
                theme,
                notification_enabled,
                sound_enabled,
                auto_sync,
                sync_interval,
                configured: true,
            },
            _ => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("设置行解析失败"),
                )
            }
        },
        Err(e) => {
            tracing::error!("回读用户设置失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("内部服务器错误"),
            );
        }
    };

    let _ = scope.commit().await;
    (StatusCode::OK, ApiResponse::success(view, "设置已保存"))
}
