//! Permission middleware - API 权限验证中间件
//!
//! 提供细粒度的 API 权限检查功能
//!
//! # 使用示例
//! ```rust
//! // 在路由中使用 from_fn_with_state
//! .route("/api/core/iam/users", post(create_user))
//! .layer(axum::middleware::from_fn_with_state(
//!     state.clone(),
//!     require_permission("iam:write"),
//! ))
#![allow(clippy::unused_async)]

use axum::{
    body::Body,
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use topems_shared::auth::Claims;

use crate::AppState;

/// 从请求中提取 Claims
pub fn extract_claims(req: &Request) -> Option<Claims> {
    req.extensions().get::<Claims>().cloned()
}

/// 检查用户是否拥有指定权限
pub fn has_permission(claims: &Claims, permission: &str) -> bool {
    claims.has_permission(permission)
}

/// 检查用户是否拥有指定角色
pub fn has_role(claims: &Claims, role: &str) -> bool {
    claims.has_role(role)
}

// ============================================================
// 路由权限中间件工厂函数 (用于 from_fn_with_state)
// ============================================================

/// 创建权限验证中间件的工厂函数
///
/// # 示例
/// ```rust
/// .route("/api/core/iam/users", post(create_user))
/// .layer(axum::middleware::from_fn_with_state(
///     state.clone(),
///     require_permission("iam:write"),
/// ))
/// ```
pub fn require_permission(
    permission: &'static str,
) -> impl Fn(
    State<AppState>,
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |State(_state): State<AppState>, req: Request<Body>, next: Next| {
        let permission = permission;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if !has_permission(&claims, permission) {
                tracing::warn!(
                    "Permission denied: user={}, permission={}",
                    claims.username,
                    permission
                );
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    format!(
                        r#"{{"success":false,"message":"权限不足：需要 {} 权限","code":403}}"#,
                        permission
                    ),
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

/// 创建角色验证中间件的工厂函数
pub fn require_role(
    role: &'static str,
) -> impl Fn(
    State<AppState>,
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |State(_state): State<AppState>, req: Request<Body>, next: Next| {
        let role = role;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if !has_role(&claims, role) {
                tracing::warn!("Role denied: user={}, role={}", claims.username, role);
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    format!(
                        r#"{{"success":false,"message":"权限不足：需要 {} 角色","code":403}}"#,
                        role
                    ),
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

/// 超级管理员验证中间件工厂函数
pub fn require_superuser() -> impl Fn(
    State<AppState>,
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |State(_state): State<AppState>, req: Request<Body>, next: Next| {
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if !claims.is_superuser {
                tracing::warn!("Superuser access denied: user={}", claims.username);
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    r#"{"success":false,"message":"权限不足：需要超级管理员权限","code":403}"#,
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

/// 创建多权限验证中间件（需要任意一个权限）
pub fn require_any_permission(
    permissions: &'static [&'static str],
) -> impl Fn(
    State<AppState>,
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |State(_state): State<AppState>, req: Request<Body>, next: Next| {
        let permissions = permissions;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            let has_any = permissions.iter().any(|p| has_permission(&claims, p));
            if !has_any {
                tracing::warn!(
                    "Permission denied: user={}, required_any={:?}",
                    claims.username,
                    permissions
                );
                return (StatusCode::FORBIDDEN, [(header::CONTENT_TYPE, "application/json")],
                    format!(r#"{{"success":false,"message":"权限不足：需要以下任一权限: {}","code":403}}"#, 
                        permissions.join(", "))).into_response();
            }

            next.run(req).await
        })
    }
}

/// 创建多权限验证中间件（需要所有权限）
pub fn require_all_permissions(
    permissions: &'static [&'static str],
) -> impl Fn(
    State<AppState>,
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |State(_state): State<AppState>, req: Request<Body>, next: Next| {
        let permissions = permissions;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            let has_all = permissions.iter().all(|p| has_permission(&claims, p));
            if !has_all {
                tracing::warn!(
                    "Permission denied: user={}, required_all={:?}",
                    claims.username,
                    permissions
                );
                return (StatusCode::FORBIDDEN, [(header::CONTENT_TYPE, "application/json")],
                    format!(r#"{{"success":false,"message":"权限不足：需要以下所有权限: {}","code":403}}"#, 
                        permissions.join(", "))).into_response();
            }

            next.run(req).await
        })
    }
}

// ============================================================
// 旧版中间件函数（保留兼容，不推荐使用）
// ============================================================

/// 权限验证中间件工厂函数（已废弃，请使用 require_permission）
///
/// # 示例
/// ```rust
/// // 在路由中使用
/// .route("/api/iam/users", post(create_user))
/// .layer(axum::middleware::from_fn_with_state(
///     state.clone(),
///     permission_required("iam:write"),
/// ))
/// ```
#[deprecated(since = "0.1.0", note = "请使用 require_permission 函数")]
pub async fn permission_required(
    State(_state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
            )
                .into_response();
        }
    };

    // 从请求扩展中获取所需的权限（需要先设置扩展）
    let permission = req
        .extensions()
        .get::<&'static str>()
        .copied()
        .unwrap_or("");

    if !has_permission(&claims, permission) {
        tracing::warn!(
            "Permission denied: user={}, permission={}",
            claims.username,
            permission
        );
        return (
            StatusCode::FORBIDDEN,
            [(header::CONTENT_TYPE, "application/json")],
            format!(
                r#"{{"success":false,"message":"权限不足：需要 {} 权限","code":403}}"#,
                permission
            ),
        )
            .into_response();
    }

    next.run(req).await
}

/// 角色验证中间件工厂函数（已废弃，请使用 require_role）
#[deprecated(since = "0.1.0", note = "请使用 require_role 函数")]
pub async fn role_required(
    State(_state): State<AppState>,
    req: Request<Body>,
    next: Next,
    role: &'static str,
) -> Response {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
            )
                .into_response();
        }
    };

    if !has_role(&claims, role) {
        tracing::warn!("Role denied: user={}, role={}", claims.username, role);
        return (
            StatusCode::FORBIDDEN,
            [(header::CONTENT_TYPE, "application/json")],
            format!(
                r#"{{"success":false,"message":"权限不足：需要 {} 角色","code":403}}"#,
                role
            ),
        )
            .into_response();
    }

    next.run(req).await
}

/// 超级管理员验证中间件（已废弃，请使用 require_superuser）
#[deprecated(since = "0.1.0", note = "请使用 require_superuser 函数")]
pub async fn superuser_required(
    State(_state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
            )
                .into_response();
        }
    };

    if !claims.is_superuser {
        tracing::warn!("Superuser access denied: user={}", claims.username);
        return (
            StatusCode::FORBIDDEN,
            [(header::CONTENT_TYPE, "application/json")],
            r#"{"success":false,"message":"权限不足：需要超级管理员权限","code":403}"#,
        )
            .into_response();
    }

    next.run(req).await
}

/// 多权限验证中间件（需要任意一个权限）（已废弃，请使用 require_any_permission）
#[deprecated(since = "0.1.0", note = "请使用 require_any_permission 函数")]
pub async fn any_permission_required(
    State(_state): State<AppState>,
    req: Request<Body>,
    next: Next,
    permissions: &'static [&'static str],
) -> Response {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
            )
                .into_response();
        }
    };

    let has_any = permissions.iter().any(|p| has_permission(&claims, p));
    if !has_any {
        tracing::warn!(
            "Permission denied: user={}, required_any={:?}",
            claims.username,
            permissions
        );
        return (
            StatusCode::FORBIDDEN,
            [(header::CONTENT_TYPE, "application/json")],
            format!(
                r#"{{"success":false,"message":"权限不足：需要以下任一权限: {}","code":403}}"#,
                permissions.join(", ")
            ),
        )
            .into_response();
    }

    next.run(req).await
}

/// 多权限验证中间件（需要所有权限）（已废弃，请使用 require_all_permissions）
#[deprecated(since = "0.1.0", note = "请使用 require_all_permissions 函数")]
pub async fn all_permissions_required(
    State(_state): State<AppState>,
    req: Request<Body>,
    next: Next,
    permissions: &'static [&'static str],
) -> Response {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
            )
                .into_response();
        }
    };

    let has_all = permissions.iter().all(|p| has_permission(&claims, p));
    if !has_all {
        tracing::warn!(
            "Permission denied: user={}, required_all={:?}",
            claims.username,
            permissions
        );
        return (
            StatusCode::FORBIDDEN,
            [(header::CONTENT_TYPE, "application/json")],
            format!(
                r#"{{"success":false,"message":"权限不足：需要以下所有权限: {}","code":403}}"#,
                permissions.join(", ")
            ),
        )
            .into_response();
    }

    next.run(req).await
}

/// 模块级权限检查辅助函数
///
/// # 参数
/// - `claims`: 用户 Claims
/// - `module`: 模块名称（如 "iam", "hrm", "doc"）
/// - `action`: 操作类型（"read", "write", "delete", "admin"）
///
/// # 示例
/// ```rust
/// if !check_module_action(&claims, "iam", "write") {
///     return (StatusCode::FORBIDDEN, "Permission denied").into_response();
/// }
/// ```
pub fn check_module_action(claims: &Claims, module: &str, action: &str) -> bool {
    // 超级管理员拥有所有权限
    if claims.is_superuser {
        return true;
    }

    let permission = format!("{}:{}", module, action);

    // 检查具体权限
    if claims.has_permission(&permission) {
        return true;
    }

    // admin 权限隐式包含所有同级权限
    let admin_permission = format!("{}:admin", module);
    if claims.has_permission(&admin_permission) {
        return true;
    }

    // 基础设施模块与 IAM 联动
    let infra_modules = ["doc", "file", "notification", "im", "integration"];
    if infra_modules.contains(&module) {
        // 有 IAM 同级权限自动获得基础设施权限
        let iam_permission = format!("iam:{}", action);
        if claims.has_permission(&iam_permission) {
            return true;
        }
        // 有 IAM:admin 自动获得所有基础设施权限
        if claims.has_permission("iam:admin") {
            return true;
        }
    }

    false
}

/// 权限级别常量
pub mod levels {
    /// 读取权限级别
    pub const READ: &str = "read";
    /// 写入权限级别
    pub const WRITE: &str = "write";
    /// 删除权限级别
    pub const DELETE: &str = "delete";
    /// 审批权限级别（工作流专用）
    pub const APPROVE: &str = "approve";
    /// 管理权限级别
    pub const ADMIN: &str = "admin";
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_claims(is_superuser: bool, permissions: Vec<&str>, roles: Vec<&str>) -> Claims {
        Claims {
            sub: "test-user-id".to_string(),
            username: "test".to_string(),
            role: if is_superuser {
                "admin".to_string()
            } else {
                "user".to_string()
            },
            roles: roles.into_iter().map(|s| s.to_string()).collect(),
            permissions: permissions.into_iter().map(|s| s.to_string()).collect(),
            is_superuser,
            exp: 9999999999,
            iat: 0,
            email: Some("test@test.com".to_string()),
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    #[test]
    fn test_superuser_has_all_permissions() {
        let claims = create_test_claims(true, vec![], vec![]);
        assert!(check_module_action(&claims, "any_module", "any_action"));
        assert!(check_module_action(&claims, "iam", "write"));
        assert!(check_module_action(&claims, "hrm", "delete"));
    }

    #[test]
    fn test_normal_user_specific_permission() {
        let claims = create_test_claims(false, vec!["iam:read", "hrm:write"], vec!["user"]);

        assert!(check_module_action(&claims, "iam", "read"));
        assert!(check_module_action(&claims, "hrm", "write"));
        assert!(!check_module_action(&claims, "iam", "write"));
        assert!(!check_module_action(&claims, "hrm", "delete"));
    }

    #[test]
    fn test_admin_permission_implies_all() {
        let claims = create_test_claims(false, vec!["iam:admin"], vec!["admin"]);

        assert!(check_module_action(&claims, "iam", "read"));
        assert!(check_module_action(&claims, "iam", "write"));
        assert!(check_module_action(&claims, "iam", "delete"));
        assert!(check_module_action(&claims, "iam", "admin"));
    }

    #[test]
    fn test_infrastructure_module_linkage() {
        let claims_read = create_test_claims(false, vec!["iam:read"], vec!["user"]);
        let claims_write = create_test_claims(false, vec!["iam:read", "iam:write"], vec!["user"]);

        // IAM:read 应该隐式获得 doc:read, file:read 等基础设施模块的 read 权限
        assert!(check_module_action(&claims_read, "doc", "read"));
        assert!(check_module_action(&claims_read, "file", "read"));
        // IAM:read 不包含 doc:write
        assert!(!check_module_action(&claims_read, "doc", "write"));

        // IAM:write 应该包含 doc:write
        assert!(check_module_action(&claims_write, "doc", "write"));
        assert!(check_module_action(&claims_write, "file", "write"));
    }

    #[test]
    fn test_iam_admin_implies_all_infra() {
        let claims = create_test_claims(false, vec!["iam:admin"], vec!["admin"]);

        assert!(check_module_action(&claims, "doc", "read"));
        assert!(check_module_action(&claims, "doc", "write"));
        assert!(check_module_action(&claims, "doc", "delete"));
        assert!(check_module_action(&claims, "file", "admin"));
        assert!(check_module_action(&claims, "notification", "admin"));
    }
}
