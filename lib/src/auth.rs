use axum::{
    body::Body,
    extract::State,
    http::{header, Request},
    middleware::Next,
    response::{IntoResponse, Response},
};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    error::TopemsError,
    response::{api_error, ApiResponse},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub role: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub is_superuser: bool,
    pub exp: usize,
    pub iat: usize,
    pub email: Option<String>,
    pub department: Option<String>,
    pub tenant_id: Option<String>,
    pub department_id: Option<String>,
    pub position_id: Option<String>,
    pub position_code: Option<String>,
}

impl Claims {
    pub fn user_id(&self) -> Result<Uuid, TopemsError> {
        Uuid::parse_str(&self.sub)
            .map_err(|_| TopemsError::Auth("Invalid user ID in token".to_string()))
    }

    pub fn has_permission(&self, permission: &str) -> bool {
        self.is_superuser || self.permissions.contains(&permission.to_string())
    }

    pub fn has_role(&self, role: &str) -> bool {
        self.is_superuser || self.roles.contains(&role.to_string())
    }

    pub fn has_any_permission(&self, permissions: &[&str]) -> bool {
        if self.is_superuser {
            return true;
        }
        permissions
            .iter()
            .any(|p| self.permissions.contains(&p.to_string()))
    }

    pub fn has_all_permissions(&self, permissions: &[&str]) -> bool {
        if self.is_superuser {
            return true;
        }
        permissions
            .iter()
            .all(|p| self.permissions.contains(&p.to_string()))
    }

    pub fn encode(&self, secret: &str) -> Result<String, TopemsError> {
        encode(
            &Header::new(Algorithm::HS256),
            self,
            &EncodingKey::from_secret(secret.as_ref()),
        )
        .map_err(|e| TopemsError::Auth(format!("Failed to encode token: {}", e)))
    }
}

#[derive(Debug, Clone)]
pub struct AuthState {
    pub jwt_secret: String,
    pub refresh_secret: String,
    pub token_expiry_hours: i64,
}

impl AuthState {
    pub fn new(jwt_secret: String, refresh_secret: String, token_expiry_hours: i64) -> Self {
        Self {
            jwt_secret,
            refresh_secret,
            token_expiry_hours,
        }
    }

    pub fn from_env() -> Self {
        let default_jwt_secret =
            "topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256";
        let default_refresh_secret =
            "topems-refresh-secret-key-must-be-at-least-32-characters-for-hs256";

        let is_production = std::env::var("RUST_ENV")
            .map(|v| v == "production")
            .unwrap_or(false)
            || std::env::var("ENV")
                .map(|v| v == "production")
                .unwrap_or(false);

        let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| {
            if is_production {
                panic!(
                    "JWT_SECRET environment variable is required in production mode. \
                     Please set a strong secret of at least 32 characters."
                );
            }
            tracing::warn!(
                "⚠️  JWT_SECRET not set, using default development secret. \
                 This is INSECURE for production use!"
            );
            default_jwt_secret.to_string()
        });

        let refresh_secret = std::env::var("JWT_REFRESH_SECRET")
            .or_else(|_| std::env::var("REFRESH_SECRET"))
            .unwrap_or_else(|_| {
                if is_production {
                    panic!(
                        "JWT_REFRESH_SECRET environment variable is required in production mode. \
                         Please set a strong secret of at least 32 characters."
                    );
                }
                tracing::warn!(
                    "⚠️  JWT_REFRESH_SECRET not set, using default development secret. \
                     This is INSECURE for production use!"
                );
                default_refresh_secret.to_string()
            });

        if jwt_secret.len() < 32 {
            panic!("JWT_SECRET must be at least 32 characters long for security");
        }
        if refresh_secret.len() < 32 {
            panic!("JWT_REFRESH_SECRET or REFRESH_SECRET must be at least 32 characters long for security");
        }

        if jwt_secret == default_jwt_secret && is_production {
            panic!("Default JWT_SECRET cannot be used in production mode");
        }
        if refresh_secret == default_refresh_secret && is_production {
            panic!("Default JWT_REFRESH_SECRET cannot be used in production mode");
        }

        Self {
            jwt_secret,
            refresh_secret,
            token_expiry_hours: std::env::var("JWT_EXPIRY_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .unwrap_or(24),
        }
    }
}

pub fn generate_jwt_token(user_id: &str, secret: &str, expire_minutes: i64) -> String {
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::minutes(expire_minutes)).timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        username: user_id.to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: Vec::new(),
        is_superuser: false,
        exp,
        iat: now.timestamp() as usize,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
    };
    claims.encode(secret).unwrap_or_else(|_| String::new())
}

pub fn verify_jwt_token(token: &str, secret: &str) -> Result<Claims, TopemsError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.leeway = 60;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &validation,
    )
    .map_err(|e| TopemsError::Auth(format!("JWT 验证失败: {}", e)))?;
    Ok(token_data.claims)
}

pub fn generate_refresh_token() -> String {
    use rand::RngCore;
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    pub id: String,
    pub name: String,
    pub description: String,
    pub permissions: Vec<String>,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
}

pub fn get_permissions() -> Vec<Permission> {
    vec![
        Permission {
            id: "iam:users_read".to_string(),
            name: "读取用户".to_string(),
            description: "查看用户列表和详情".to_string(),
            category: "用户管理".to_string(),
        },
        Permission {
            id: "iam:users_create".to_string(),
            name: "创建用户".to_string(),
            description: "创建新用户".to_string(),
            category: "用户管理".to_string(),
        },
        Permission {
            id: "iam:users_update".to_string(),
            name: "更新用户".to_string(),
            description: "更新用户信息".to_string(),
            category: "用户管理".to_string(),
        },
        Permission {
            id: "iam:users_delete".to_string(),
            name: "删除用户".to_string(),
            description: "删除用户".to_string(),
            category: "用户管理".to_string(),
        },
        Permission {
            id: "iam:roles_read".to_string(),
            name: "读取角色".to_string(),
            description: "查看角色列表".to_string(),
            category: "角色管理".to_string(),
        },
        Permission {
            id: "iam:roles_create".to_string(),
            name: "创建角色".to_string(),
            description: "创建新角色".to_string(),
            category: "角色管理".to_string(),
        },
        Permission {
            id: "iam:roles_update".to_string(),
            name: "更新角色".to_string(),
            description: "更新角色信息".to_string(),
            category: "角色管理".to_string(),
        },
        Permission {
            id: "iam:roles_delete".to_string(),
            name: "删除角色".to_string(),
            description: "删除角色".to_string(),
            category: "角色管理".to_string(),
        },
        Permission {
            id: "iam:permissions_read".to_string(),
            name: "读取权限".to_string(),
            description: "查看权限列表".to_string(),
            category: "权限管理".to_string(),
        },
        Permission {
            id: "iam:permissions_update".to_string(),
            name: "更新权限".to_string(),
            description: "更新权限配置".to_string(),
            category: "权限管理".to_string(),
        },
        Permission {
            id: "iam:audit_read".to_string(),
            name: "读取审计日志".to_string(),
            description: "查看审计日志".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:system_read".to_string(),
            name: "系统设置读取".to_string(),
            description: "查看系统设置".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:system_update".to_string(),
            name: "系统设置更新".to_string(),
            description: "修改系统设置".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:dictionaries_read".to_string(),
            name: "字典读取".to_string(),
            description: "查看字典数据".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:dictionaries_update".to_string(),
            name: "字典更新".to_string(),
            description: "更新字典数据".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:plugins_read".to_string(),
            name: "插件读取".to_string(),
            description: "查看插件列表".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:plugins_update".to_string(),
            name: "插件更新".to_string(),
            description: "安装/卸载插件".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "pm:projects_read".to_string(),
            name: "读取项目".to_string(),
            description: "查看项目列表".to_string(),
            category: "项目管理".to_string(),
        },
        Permission {
            id: "pm:projects_create".to_string(),
            name: "创建项目".to_string(),
            description: "创建新项目".to_string(),
            category: "项目管理".to_string(),
        },
        Permission {
            id: "pm:projects_update".to_string(),
            name: "更新项目".to_string(),
            description: "更新项目信息".to_string(),
            category: "项目管理".to_string(),
        },
        Permission {
            id: "pm:projects_delete".to_string(),
            name: "删除项目".to_string(),
            description: "删除项目".to_string(),
            category: "项目管理".to_string(),
        },
        Permission {
            id: "doc:documents_read".to_string(),
            name: "读取文档".to_string(),
            description: "查看文档".to_string(),
            category: "文档管理".to_string(),
        },
        Permission {
            id: "doc:documents_create".to_string(),
            name: "创建文档".to_string(),
            description: "创建文档".to_string(),
            category: "文档管理".to_string(),
        },
        Permission {
            id: "doc:documents_update".to_string(),
            name: "更新文档".to_string(),
            description: "更新文档".to_string(),
            category: "文档管理".to_string(),
        },
        Permission {
            id: "doc:documents_delete".to_string(),
            name: "删除文档".to_string(),
            description: "删除文档".to_string(),
            category: "文档管理".to_string(),
        },
        Permission {
            id: "workflow:workflows_read".to_string(),
            name: "读取工作流".to_string(),
            description: "查看工作流".to_string(),
            category: "工作流管理".to_string(),
        },
        Permission {
            id: "workflow:workflows_create".to_string(),
            name: "创建工作流".to_string(),
            description: "创建工作流".to_string(),
            category: "工作流管理".to_string(),
        },
        Permission {
            id: "workflow:workflows_update".to_string(),
            name: "更新工作流".to_string(),
            description: "更新工作流".to_string(),
            category: "工作流管理".to_string(),
        },
        Permission {
            id: "workflow:workflows_delete".to_string(),
            name: "删除工作流".to_string(),
            description: "删除工作流".to_string(),
            category: "工作流管理".to_string(),
        },
        Permission {
            id: "iam:system_settings".to_string(),
            name: "系统设置".to_string(),
            description: "修改系统设置".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:system_logs".to_string(),
            name: "查看日志".to_string(),
            description: "查看系统日志".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:system_monitor".to_string(),
            name: "系统监控".to_string(),
            description: "查看系统监控".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:system_export".to_string(),
            name: "数据导出".to_string(),
            description: "导出系统数据".to_string(),
            category: "系统管理".to_string(),
        },
    ]
}

pub fn get_roles() -> Vec<Role> {
    let permissions = get_permissions();
    vec![
        Role {
            id: "superadmin".to_string(),
            name: "超级管理员".to_string(),
            description: "拥有所有权限".to_string(),
            permissions: permissions.iter().map(|p| p.id.clone()).collect(),
            is_default: false,
        },
        Role {
            id: "admin".to_string(),
            name: "管理员".to_string(),
            description: "管理用户和角色".to_string(),
            permissions: vec![
                "iam:users_read".to_string(),
                "iam:users_create".to_string(),
                "iam:users_update".to_string(),
                "iam:roles_read".to_string(),
                "iam:roles_create".to_string(),
                "iam:roles_update".to_string(),
                "iam:system_settings".to_string(),
                "iam:system_logs".to_string(),
            ],
            is_default: false,
        },
        Role {
            id: "project_manager".to_string(),
            name: "项目经理".to_string(),
            description: "管理项目和文档".to_string(),
            permissions: vec![
                "pm:projects_read".to_string(),
                "pm:projects_create".to_string(),
                "pm:projects_update".to_string(),
                "doc:documents_read".to_string(),
                "doc:documents_create".to_string(),
                "doc:documents_update".to_string(),
                "workflow:workflows_read".to_string(),
                "workflow:workflows_create".to_string(),
            ],
            is_default: false,
        },
        Role {
            id: "developer".to_string(),
            name: "开发人员".to_string(),
            description: "参与项目开发".to_string(),
            permissions: vec![
                "pm:projects_read".to_string(),
                "doc:documents_read".to_string(),
                "doc:documents_update".to_string(),
                "workflow:workflows_read".to_string(),
            ],
            is_default: false,
        },
        Role {
            id: "viewer".to_string(),
            name: "查看者".to_string(),
            description: "只读权限".to_string(),
            permissions: vec![
                "pm:projects_read".to_string(),
                "doc:documents_read".to_string(),
            ],
            is_default: true,
        },
    ]
}

pub fn get_role_by_id(role_id: &str) -> Option<Role> {
    get_roles().into_iter().find(|r| r.id == role_id)
}

pub fn get_permission_by_id(permission_id: &str) -> Option<Permission> {
    get_permissions()
        .into_iter()
        .find(|p| p.id == permission_id)
}

fn is_public_path(path: &str) -> bool {
    eprintln!("DEBUG is_public_path: path='{}'", path);
    // 先精确匹配完整路径
    let public_paths = [
        "/",
        "/health",
        "/api/core/iam/auth/login",
        "/api/core/iam/auth/refresh",
        "/api/core/iam/auth/register",
        "/api/core/iam/auth/forgot-password",
        "/api/core/iam/auth/reset-password",
        "/api/core/iam/auth/logout",
        "/api/integration/webhooks",
    ];
    if public_paths.contains(&path) {
        return true;
    }
    path.starts_with("/api/core/iam/auth/")
        || path.starts_with("/api/integration/webhooks")
}

fn is_websocket_path(path: &str) -> bool {
    path.starts_with("/ws/")
}

fn is_plugin_public_path(path: &str, method: &str) -> bool {
    if path.starts_with("/api/plugins/health") || path.starts_with("/api/plugins/info") {
        return true;
    }
    if path.starts_with("/api/core/plugin/marketplace") {
        return true;
    }
    if path.starts_with("/api/core/plugins/") {
        if path.ends_with("/install")
            || path.ends_with("/uninstall")
            || path.ends_with("/enable")
            || path.ends_with("/disable")
        {
            return true;
        }
        if path == "/api/core/plugins" && method == "GET" {
            return true;
        }
    }
    if path.starts_with("/api/core/plugin/dev/plugins/") && path.ends_with("/register") {
        return true;
    }
    false
}

pub async fn auth_middleware(
    State(auth_state): State<AuthState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let path = req.uri().path();
    let method = req.method().as_str();

    if is_public_path(path) {
        return next.run(req).await;
    }

    if is_websocket_path(path) {
        let is_websocket_upgrade = req
            .headers()
            .get(header::UPGRADE)
            .map(|h| h.to_str().unwrap_or(""))
            .map(|h| h.eq_ignore_ascii_case("websocket"))
            .unwrap_or(false);
        if is_websocket_upgrade {
            return next.run(req).await;
        }
    }

    if is_plugin_public_path(path, method) {
        return next.run(req).await;
    }

    let (mut parts, body) = req.into_parts();

    if std::env::var("DEVELOPMENT_MODE").unwrap_or_default() == "true" {
        tracing::warn!("开发模式已启用 - 仅用于本地开发环境");
        let claims = Claims {
            sub: "00000000-0000-0000-0000-000000000001".to_string(),
            username: "dev_user".to_string(),
            role: "admin".to_string(),
            roles: vec!["admin".to_string(), "user".to_string()],
            permissions: vec!["iam:admin".to_string(), "notification:read".to_string(), "plugin:read".to_string(), "plugin:write".to_string()],
            is_superuser: true,
            exp: 0,
            iat: 0,
            email: Some("dev@example.com".to_string()),
            department: None,
            tenant_id: Some("00000000-0000-0000-0000-000000000001".to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
        };
        parts.extensions.insert(claims);
        let req = Request::from_parts(parts, body);
        return next.run(req).await;
    }

    let auth_header = parts
        .headers
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let claims = if let Some(header) = auth_header {
        let token = header.strip_prefix("Bearer ").unwrap_or(header);
        match verify_jwt_token(token, &auth_state.jwt_secret) {
            Ok(claims) => claims,
            Err(e) => {
                tracing::error!("Token verification failed: {}", e);
                return api_error::<()>(401, &format!("认证失败：{}", e)).into_response();
            }
        }
    } else {
        return api_error::<()>(401, "未授权：缺少有效的认证令牌").into_response();
    };

    parts.extensions.insert(claims);
    let req = Request::from_parts(parts, body);
    next.run(req).await
}

pub fn check_permission<T>(
    claims: &Claims,
    permission: &str,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.has_permission(permission) {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            &format!("权限不足：需要 {} 权限", permission),
        )))
    }
}

pub fn check_role<T>(claims: &Claims, role: &str) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.has_role(role) {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            &format!("权限不足：需要 {} 角色", role),
        )))
    }
}

pub fn require_superuser<T>(claims: &Claims) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            "权限不足：需要超级管理员权限",
        )))
    }
}

pub fn require_any_permission<T>(
    claims: &Claims,
    permissions: &[&str],
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.has_any_permission(permissions) {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            &format!("权限不足：需要以下任一权限: {}", permissions.join(", ")),
        )))
    }
}

pub fn require_all_permissions<T>(
    claims: &Claims,
    permissions: &[&str],
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.has_all_permissions(permissions) {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            &format!("权限不足：需要所有以下权限: {}", permissions.join(", ")),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_claims_has_permission() {
        let claims = Claims {
            sub: "1".to_string(),
            username: "test".to_string(),
            role: "user".to_string(),
            roles: vec!["user".to_string()],
            permissions: vec!["iam:users_read".to_string()],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
        };
        assert!(claims.has_permission("iam:users_read"));
        assert!(!claims.has_permission("iam:users_create"));
    }

    #[test]
    fn test_superuser_has_all_permissions() {
        let claims = Claims {
            sub: "1".to_string(),
            username: "admin".to_string(),
            role: "superadmin".to_string(),
            roles: vec!["superadmin".to_string()],
            permissions: vec![],
            is_superuser: true,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
        };
        assert!(claims.has_permission("any_permission"));
        assert!(claims.has_role("any_role"));
    }

    #[test]
    fn test_is_public_path() {
        assert!(is_public_path("/"));
        assert!(is_public_path("/health"));
        assert!(is_public_path("/api/core/iam/auth/login"));
        assert!(!is_public_path("/api/core/iam/users"));
    }

    #[test]
    fn test_is_websocket_path() {
        assert!(is_websocket_path("/ws/mes/dashboard"));
        assert!(is_websocket_path("/ws/bi/dashboard"));
        assert!(is_websocket_path("/ws/gis/device/code"));
        assert!(is_websocket_path("/ws/core/notifications"));
        assert!(!is_websocket_path("/api/orders"));
    }

    #[test]
    fn test_auth_state_validates_secret_length() {
        assert!(std::panic::catch_unwind(|| {
            AuthState {
                jwt_secret: "short".to_string(),
                refresh_secret: "this-is-a-very-long-secret-key-at-least-32-chars".to_string(),
                token_expiry_hours: 24,
            };
        })
        .is_ok());

        std::env::set_var(
            "JWT_SECRET",
            "this-is-a-very-long-secret-key-at-least-32-chars",
        );
        std::env::set_var(
            "JWT_REFRESH_SECRET",
            "this-is-also-a-very-long-secret-key-for-refresh",
        );
        let auth_state = AuthState::from_env();
        assert_eq!(auth_state.token_expiry_hours, 24);
    }
}
