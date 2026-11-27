use crate::AppState;
use axum::http::StatusCode;
use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::iam::auth::validate_password_strength;
use crate::modules::iam::tenant_scope::{self, IamScope, UserTarget};

use super::models::{
    is_valid_email, record_audit_log, superuser_permission_codes, superuser_role_names,
    ListUsersParams, UserResponse, UserRow,
};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:iam:user:read"])),
    path = "/iam/users",
    tag = "IAM-User",
    responses(
        (status = 200, description = "用户列表查询成功"),
        (status = 400, description = "参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "查询失败"),
    ),
)]
#[axum::debug_handler]
pub async fn list_users(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListUsersParams>,
    headers: axum::http::HeaderMap,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user list_users called");

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());

    // 登录后的列表读取必须走请求作用域（租户通道）。裸池在严格 RLS 下读
    // `core_tenant_users` 会得到 0 行，导致非超管用户列表恒为空。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "获取用户列表失败：缺少租户上下文",
            ));
        }
    };

    let total_result = if claims.is_superuser {
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM iam.users WHERE deleted_at IS NULL")
            .fetch_one(&mut scope)
            .await
    } else {
        sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM iam.users u WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR EXISTS (SELECT 1 FROM public.core_tenant_users tu WHERE tu.user_id = u.id AND tu.tenant_id = $1::uuid AND tu.status = 'active' AND tu.deleted_at IS NULL))",
        )
        .bind(tenant_id.unwrap_or_else(Uuid::nil))
        .fetch_one(&mut scope)
        .await
    };

    let total = match total_result {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to count users: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("获取用户总数失败: {}", e),
            ));
        }
    };

    let result = if claims.is_superuser {
        sqlx::query_as::<_, UserRow>(
            "SELECT id, username, email, CASE WHEN $3 = 'en' THEN COALESCE(full_name_en, full_name) ELSE full_name END AS full_name, status, is_superuser, created_at FROM iam.users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        )
        .bind(page_size)
        .bind(offset)
        .bind(topems_shared_core::locale::Locale::from_headers(&headers).as_sql())
        .fetch_all(&mut scope)
        .await
    } else {
        sqlx::query_as::<_, UserRow>(
            "SELECT id, username, email, CASE WHEN $4 = 'en' THEN COALESCE(full_name_en, full_name) ELSE full_name END AS full_name, status, is_superuser, created_at FROM iam.users u WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR EXISTS (SELECT 1 FROM public.core_tenant_users tu WHERE tu.user_id = u.id AND tu.tenant_id = $1::uuid AND tu.status = 'active' AND tu.deleted_at IS NULL)) ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(tenant_id.unwrap_or_else(Uuid::nil))
        .bind(page_size)
        .bind(offset)
        .bind(topems_shared_core::locale::Locale::from_headers(&headers).as_sql())
        .fetch_all(&mut scope)
        .await
    };

    match result {
        Ok(users) => {
            // BE-09 P1-4：批量查真实角色名（core_user_roles JOIN core_roles），
            // 替代原先硬编码 ["user"]/["admin"] 的语义撒谎。
            let user_ids: Vec<uuid::Uuid> = users.iter().map(|u| u.id).collect();
            let real_roles: std::collections::HashMap<uuid::Uuid, Vec<String>> = sqlx::query_as::<_, (uuid::Uuid, String)>(
                "SELECT ur.user_id, r.name FROM public.core_user_roles ur JOIN public.core_roles r ON r.id = ur.role_id WHERE ur.user_id = ANY($1) AND r.deleted_at IS NULL ORDER BY ur.user_id, r.name",
            )
            .bind(&user_ids)
            .fetch_all(&mut scope)
            .await
            .unwrap_or_default()
            .into_iter()
            .fold(std::collections::HashMap::new(), |mut m, (uid, name)| {
                m.entry(uid).or_default().push(name);
                m
            });

            // 对称批量查真实权限码（关联表规范化授权），替代原先非超管硬编码占位方言码。
            let real_permissions: std::collections::HashMap<uuid::Uuid, Vec<String>> =
                sqlx::query_as::<_, (uuid::Uuid, String)>(
                    "SELECT ur.user_id, p.code FROM public.core_user_roles ur
                 JOIN public.core_role_permissions rp ON rp.role_id = ur.role_id
                 JOIN public.core_permissions p ON p.id = rp.permission_id
                 WHERE ur.user_id = ANY($1) ORDER BY ur.user_id, p.code",
                )
                .bind(&user_ids)
                .fetch_all(&mut scope)
                .await
                .unwrap_or_default()
                .into_iter()
                .fold(std::collections::HashMap::new(), |mut m, (uid, code)| {
                    m.entry(uid).or_default().push(code);
                    m
                });

            // 超管回显 DB 全量目录（一次预取，闭包内复用），不再走 shared-auth 内存目录占位。
            let superuser_codes = superuser_permission_codes(&state.db).await;
            let superuser_roles = superuser_role_names(&state.db).await;

            let user_responses: Vec<UserResponse> = users
                .into_iter()
                .map(|u| {
                    let roles = if u.is_superuser {
                        superuser_roles.clone()
                    } else {
                        real_roles.get(&u.id).cloned().unwrap_or_default()
                    };

                    let permissions = if u.is_superuser {
                        superuser_codes.clone()
                    } else {
                        real_permissions.get(&u.id).cloned().unwrap_or_default()
                    };

                    UserResponse {
                        id: u.id.to_string(),
                        username: u.username,
                        email: u.email,
                        full_name: u.full_name,
                        role: if u.is_superuser {
                            "admin".to_string()
                        } else {
                            roles.first().cloned().unwrap_or_default()
                        },
                        roles,
                        permissions,
                        is_active: u.status == "active",
                        is_superuser: u.is_superuser,
                        created_at: u.created_at,
                    }
                })
                .collect();

            if let Err(e) = scope.commit().await {
                tracing::warn!("Failed to commit user list read scope: {}", e);
            }

            Json(serde_json::json!({
                "success": true,
                "message": "获取用户列表成功",
                "data": {
                    "users": user_responses,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": topems_shared_core::response::total_pages_of(total, page_size)
                },
                "code": 200
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch users: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                &format!("获取用户列表失败: {}", e),
            ))
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
#[allow(dead_code)]
#[schema(as = CreateUserRequest)]
struct CreateUserRequest {
    username: String,
    email: String,
    password: String,
    full_name: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:iam:user:write"])),
    path = "/iam/users",
    tag = "IAM-User",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "创建用户成功"),
        (status = 400, description = "参数错误"),
        (status = 401, description = "未授权"),
        (status = 409, description = "用户名或邮箱已存在"),
        (status = 500, description = "创建失败"),
    ),
)]
#[axum::debug_handler]
pub async fn create_user(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    // 请求体包含明文口令，禁止整体打印到应用日志。
    tracing::info!("IAM user create_user called");

    let operator_id = &claims.sub;

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:write") {
        Ok(scope) => scope,
        Err(_) => {
            return tenant_scope::forbidden("缺少租户上下文，无法创建租户用户");
        }
    };

    let username = payload
        .get("username")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let email = payload.get("email").and_then(|v| v.as_str()).unwrap_or("");
    let password = payload
        .get("password")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let full_name = payload.get("full_name").and_then(|v| v.as_str());

    if username.is_empty() {
        tracing::warn!("Create user failed: username is required");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "用户名是必填字段",
            )),
        );
    }

    if email.is_empty() {
        tracing::warn!("Create user failed: email is required");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "邮箱是必填字段",
            )),
        );
    }

    if password.is_empty() {
        tracing::warn!("Create user failed: password is required");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "密码是必填字段",
            )),
        );
    }

    if let Err(message) = validate_password_strength(password) {
        tracing::warn!("Create user failed: {}", message);
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(400, &message)),
        );
    }

    if !is_valid_email(email) {
        tracing::warn!("Create user failed: invalid email format");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "邮箱格式不正确",
            )),
        );
    }

    // 写入必须带显式租户通道：`core_tenant_users` 已 FORCE RLS，裸池无 GUC 时
    // INSERT 会被 fail-closed 策略拒绝（42501）。平台通道走系统作用域。
    let mut guard = txn_arc.lock().await;
    let tx_result = match scope {
        IamScope::Tenant(_) => {
            let Some(txn) = guard.as_mut() else {
                tracing::error!("rls txn missing: RLS 事务中间件未注入");
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        "数据库事务上下文缺失",
                    )),
                );
            };
            state.db.scope_with(txn).await
        }
        IamScope::Platform => state.db.scope_system().await,
    };
    let mut tx = match tx_result {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to begin create_user transaction: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("创建用户失败: {}", e),
                )),
            );
        }
    };

    let existing_user_count: i64 = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam.users WHERE deleted_at IS NULL AND username = $1",
    )
    .bind(username)
    .fetch_one(&mut tx)
    .await
    {
        Ok(count) => count,
        Err(e) => {
            tracing::error!("Failed to check username: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    };

    if existing_user_count > 0 {
        tracing::warn!("Create user failed: username already exists");
        return (
            StatusCode::CONFLICT,
            Json(topems_shared_core::response::error_value(
                409,
                "用户名已存在",
            )),
        );
    }

    let existing_email_count: i64 = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam.users WHERE deleted_at IS NULL AND email = $1",
    )
    .bind(email)
    .fetch_one(&mut tx)
    .await
    {
        Ok(count) => count,
        Err(e) => {
            tracing::error!("Failed to check email: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询邮箱失败: {}", e),
                )),
            );
        }
    };

    if existing_email_count > 0 {
        tracing::warn!("Create user failed: email already exists");
        return (
            StatusCode::CONFLICT,
            Json(topems_shared_core::response::error_value(409, "邮箱已存在")),
        );
    }

    let user_id = Uuid::new_v4();
    let hashed_password = bcrypt::hash(password, bcrypt::DEFAULT_COST).unwrap_or_else(|_| {
        tracing::error!("Failed to hash password");
        "".to_string()
    });

    if hashed_password.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "密码加密失败",
            )),
        );
    }

    // 租户管理员创建的账号必须同时写入 core_tenant_users，否则后续按租户过滤
    // 时看不到、也管不了自己刚建的账号。平台管理员保持既有行为（不写成员关系）。
    //

    let insert_result = sqlx::query(
        r#"
        INSERT INTO iam.users (id, username, email, password_hash, full_name, status, is_superuser, created_at)
        VALUES ($1, $2, $3, $4, $5, 'active', false, NOW())
        "#
    )
    .bind(user_id)
    .bind(username)
    .bind(email)
    .bind(hashed_password)
    .bind(full_name)
    .execute(&mut tx)
    .await;

    let result = match insert_result {
        Ok(_) => {
            if let IamScope::Tenant(tenant_id) = scope {
                if let Err(e) = sqlx::query(
                    r#"
                    INSERT INTO public.core_tenant_users (tenant_id, user_id, email, role, status)
                    VALUES ($1, $2, $3, 'member', 'active')
                    ON CONFLICT (tenant_id, user_id) DO NOTHING
                    "#,
                )
                .bind(tenant_id)
                .bind(user_id)
                .bind(email)
                .execute(&mut tx)
                .await
                {
                    let _ = tx.rollback().await;
                    Err(e)
                } else {
                    tx.commit().await
                }
            } else {
                tx.commit().await
            }
        }
        Err(e) => {
            let _ = tx.rollback().await;
            Err(e)
        }
    };

    match result {
        Ok(_) => {
            tracing::info!("User created successfully: {}", username);

            let response_body = serde_json::json!({
                "success": true,
                "message": "创建用户成功",
                "data": {
                    "id": user_id.to_string(),
                    "username": username,
                    "email": email,
                    "full_name": full_name,
                },
                "code": 201
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "create",
                "user",
                &user_id.to_string(),
                Some(payload),
                Some(response_body.clone()),
                201,
            )
            .await;

            (StatusCode::CREATED, Json(response_body))
        }
        Err(e) => {
            if let Some(db_error) = e.as_database_error() {
                if db_error.code().unwrap_or_default() == "23505" {
                    tracing::warn!("Create user failed: unique constraint violation");
                    let response_body = topems_shared_core::response::error_value(409, "数据重复");
                    record_audit_log(
                        &state.pool,
                        operator_id,
                        "create",
                        "user",
                        "-",
                        Some(payload),
                        Some(response_body.clone()),
                        409,
                    )
                    .await;
                    return (StatusCode::CONFLICT, Json(response_body));
                }
            }
            tracing::error!("Failed to create user: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("创建用户失败: {}", e));
            record_audit_log(
                &state.pool,
                operator_id,
                "create",
                "user",
                "-",
                Some(payload),
                Some(response_body.clone()),
                500,
            )
            .await;
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/iam/users/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "get /iam/users/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_user(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user get_user called with id: {}", id);

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID",
                )),
            );
        }
    };

    let scope = match tenant_scope::iam_read_scope(&claims) {
        Ok(scope) => scope,
        Err(_) => return tenant_scope::forbidden("缺少租户上下文，无法查看用户"),
    };

    match tenant_scope::check_user_target(&state.db, &txn_arc, scope, user_id, claims.is_superuser)
        .await
    {
        Ok(UserTarget::Ok) => {}
        Ok(UserTarget::NotFound) => return tenant_scope::not_found_detail("用户不存在"),
        Ok(UserTarget::Superuser) => return tenant_scope::forbidden("无权查看超级管理员"),
        Err(e) => {
            tracing::error!("Failed to check user target scope: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "数据库事务上下文缺失",
            )),
        );
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开 IAM 用户作用域失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    };

    let user: Option<UserRow> = sqlx::query_as(
        "SELECT id, username, email, CASE WHEN $2 = 'en' THEN COALESCE(full_name_en, full_name) ELSE full_name END AS full_name, status, is_superuser, created_at FROM iam.users WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(user_id)
    .bind(topems_shared_core::locale::Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut rls_scope)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Database query failed: {}", e);
        None
    });

    match user {
        Some(u) => {
            // BE-09 P1-4：单用户详情同样查真实角色名。
            let real_roles: Vec<String> = sqlx::query_scalar::<_, String>(
                "SELECT r.name FROM public.core_user_roles ur JOIN public.core_roles r ON r.id = ur.role_id WHERE ur.user_id = $1 AND r.deleted_at IS NULL ORDER BY r.name",
            )
            .bind(u.id)
            .fetch_all(&mut rls_scope)
            .await
            .unwrap_or_default();

            // 对称查真实权限码（关联表规范化授权），替代非超管硬编码占位方言码。
            let real_permissions: Vec<String> = sqlx::query_scalar::<_, String>(
                "SELECT DISTINCT p.code FROM public.core_user_roles ur
                 JOIN public.core_role_permissions rp ON rp.role_id = ur.role_id
                 JOIN public.core_permissions p ON p.id = rp.permission_id
                 WHERE ur.user_id = $1 ORDER BY p.code",
            )
            .bind(u.id)
            .fetch_all(&mut rls_scope)
            .await
            .unwrap_or_default();

            let roles = if u.is_superuser {
                superuser_role_names(&state.db).await
            } else {
                real_roles
            };

            let permissions = if u.is_superuser {
                superuser_permission_codes(&state.db).await
            } else {
                real_permissions
            };

            let user_response = UserResponse {
                id: u.id.to_string(),
                username: u.username,
                email: u.email,
                full_name: u.full_name,
                role: if u.is_superuser {
                    "admin".to_string()
                } else {
                    roles.first().cloned().unwrap_or_default()
                },
                roles,
                permissions,
                is_active: u.status == "active",
                is_superuser: u.is_superuser,
                created_at: u.created_at,
            };

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "message": "获取用户成功",
                    "data": user_response,
                    "code": 200
                })),
            )
        }
        None => {
            tracing::warn!("User not found: {}", id);
            // 前端契约：详情类资源不存在返回 HTTP 200 + 内层 code=404（避免 BFF catch-all 误判路由缺失）
            (
                StatusCode::OK,
                Json(topems_shared_core::response::error_value(404, "用户不存在")),
            )
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/iam/users/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "put /iam/users/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_user(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    // 请求体可能携带口令字段，只记录用户 id，不打印 payload。
    tracing::info!("IAM user update_user called with id: {}", id);

    let operator_id = &claims.sub;

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID",
                )),
            );
        }
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:write") {
        Ok(scope) => scope,
        Err(_) => return tenant_scope::forbidden("缺少租户上下文，无法修改用户"),
    };

    match tenant_scope::check_user_target(&state.db, &txn_arc, scope, user_id, claims.is_superuser)
        .await
    {
        Ok(UserTarget::Ok) => {}
        Ok(UserTarget::NotFound) => return tenant_scope::not_found_detail("用户不存在"),
        Ok(UserTarget::Superuser) => return tenant_scope::forbidden("无权修改超级管理员"),
        Err(e) => {
            tracing::error!("Failed to check user target scope: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "数据库事务上下文缺失",
            )),
        );
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开 IAM 用户作用域失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    };

    if let Some(username) = payload.get("username").and_then(|v| v.as_str()) {
        let existing_count: i64 = match sqlx::query_scalar(
            "SELECT COUNT(*) FROM iam.users WHERE deleted_at IS NULL AND username = $1 AND id != $2",
        )
        .bind(username)
        .bind(user_id)
        .fetch_one(&mut rls_scope)
        .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to check username: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(500, &format!("查询用户失败: {}", e))),
                );
            }
        };

        if existing_count > 0 {
            return (
                StatusCode::CONFLICT,
                Json(topems_shared_core::response::error_value(
                    409,
                    "用户名已存在",
                )),
            );
        }
    }

    if let Some(email) = payload.get("email").and_then(|v| v.as_str()) {
        let existing_email_count: i64 = match sqlx::query_scalar(
            "SELECT COUNT(*) FROM iam.users WHERE deleted_at IS NULL AND email = $1 AND id != $2",
        )
        .bind(email)
        .bind(user_id)
        .fetch_one(&mut rls_scope)
        .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to check email: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        &format!("查询邮箱失败: {}", e),
                    )),
                );
            }
        };

        if existing_email_count > 0 {
            return (
                StatusCode::CONFLICT,
                Json(topems_shared_core::response::error_value(409, "邮箱已存在")),
            );
        }
    }

    let update_result = sqlx::query(
        r#"
        UPDATE iam.users
        SET 
            username = COALESCE($1, username),
            email = COALESCE($2, email),
            full_name = COALESCE($3, full_name),
            updated_at = NOW()
        WHERE id = $4
        "#,
    )
    .bind(payload.get("username").and_then(|v| v.as_str()))
    .bind(payload.get("email").and_then(|v| v.as_str()))
    .bind(payload.get("full_name").and_then(|v| v.as_str()))
    .bind(user_id)
    .execute(&mut rls_scope)
    .await;

    match update_result {
        Ok(_) => {
            tracing::info!("User updated successfully: {}", id);

            let response_body = serde_json::json!({
                "success": true,
                "message": "更新用户成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "update",
                "user",
                &id,
                Some(payload),
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to update user: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("更新用户失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "update",
                "user",
                &id,
                Some(payload),
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/users/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "delete /users/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_user(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user delete_user called with id: {}", id);

    let operator_id = &claims.sub;

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID",
                )),
            );
        }
    };

    if claims.sub == id {
        tracing::warn!("Delete user failed: cannot delete yourself");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "不能删除自己",
            )),
        );
    }

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:delete") {
        Ok(scope) => scope,
        Err(_) => return tenant_scope::forbidden("缺少租户上下文，无法删除用户"),
    };

    match tenant_scope::check_user_target(&state.db, &txn_arc, scope, user_id, claims.is_superuser)
        .await
    {
        Ok(UserTarget::Ok) => {}
        Ok(UserTarget::NotFound) => return tenant_scope::not_found_detail("用户不存在"),
        Ok(UserTarget::Superuser) => return tenant_scope::forbidden("无权删除超级管理员"),
        Err(e) => {
            tracing::error!("Failed to check user target scope: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "数据库事务上下文缺失",
            )),
        );
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开 IAM 用户作用域失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("删除用户失败: {}", e),
                )),
            );
        }
    };

    let delete_result = sqlx::query("UPDATE iam.users SET deleted_at = NOW() WHERE id = $1")
        .bind(user_id)
        .execute(&mut rls_scope)
        .await;

    match delete_result {
        Ok(_) => {
            tracing::info!("User deleted successfully: {}", id);

            let response_body = serde_json::json!({
                "success": true,
                "message": "删除用户成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "delete",
                "user",
                &id,
                None,
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to delete user: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("删除用户失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "delete",
                "user",
                &id,
                None,
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}
