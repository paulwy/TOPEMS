use axum::{
    body::Body,
    extract::State,
    http::{header, Request},
    middleware::Next,
    response::{IntoResponse, Response},
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{error::TopemsError, response::{ApiResponse, api_error}};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub username: String,
    pub email: Option<String>,
    pub is_superuser: bool,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub department: Option<String>,
    pub tenant_id: Option<String>,
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
        permissions.iter().any(|p| self.permissions.contains(&p.to_string()))
    }
    
    pub fn has_all_permissions(&self, permissions: &[&str]) -> bool {
        if self.is_superuser {
            return true;
        }
        permissions.iter().all(|p| self.permissions.contains(&p.to_string()))
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

#[derive(Clone)]
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
        Self {
            jwt_secret: std::env::var("JWT_SECRET").unwrap_or_else(|_| "topems-jwt-secret".to_string()),
            refresh_secret: std::env::var("REFRESH_SECRET").unwrap_or_else(|_| "topems-refresh-secret".to_string()),
            token_expiry_hours: std::env::var("JWT_EXPIRY_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .unwrap_or(24),
        }
    }
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
        Permission { id: "users.read".to_string(), name: "读取用户".to_string(), description: "查看用户列表和详情".to_string(), category: "用户管理".to_string() },
        Permission { id: "users.create".to_string(), name: "创建用户".to_string(), description: "创建新用户".to_string(), category: "用户管理".to_string() },
        Permission { id: "users.update".to_string(), name: "更新用户".to_string(), description: "更新用户信息".to_string(), category: "用户管理".to_string() },
        Permission { id: "users.delete".to_string(), name: "删除用户".to_string(), description: "删除用户".to_string(), category: "用户管理".to_string() },
        
        Permission { id: "roles.read".to_string(), name: "读取角色".to_string(), description: "查看角色列表".to_string(), category: "角色管理".to_string() },
        Permission { id: "roles.create".to_string(), name: "创建角色".to_string(), description: "创建新角色".to_string(), category: "角色管理".to_string() },
        Permission { id: "roles.update".to_string(), name: "更新角色".to_string(), description: "更新角色信息".to_string(), category: "角色管理".to_string() },
        Permission { id: "roles.delete".to_string(), name: "删除角色".to_string(), description: "删除角色".to_string(), category: "角色管理".to_string() },
        
        Permission { id: "projects.read".to_string(), name: "读取项目".to_string(), description: "查看项目列表".to_string(), category: "项目管理".to_string() },
        Permission { id: "projects.create".to_string(), name: "创建项目".to_string(), description: "创建新项目".to_string(), category: "项目管理".to_string() },
        Permission { id: "projects.update".to_string(), name: "更新项目".to_string(), description: "更新项目信息".to_string(), category: "项目管理".to_string() },
        Permission { id: "projects.delete".to_string(), name: "删除项目".to_string(), description: "删除项目".to_string(), category: "项目管理".to_string() },
        
        Permission { id: "documents.read".to_string(), name: "读取文档".to_string(), description: "查看文档".to_string(), category: "文档管理".to_string() },
        Permission { id: "documents.create".to_string(), name: "创建文档".to_string(), description: "创建文档".to_string(), category: "文档管理".to_string() },
        Permission { id: "documents.update".to_string(), name: "更新文档".to_string(), description: "更新文档".to_string(), category: "文档管理".to_string() },
        Permission { id: "documents.delete".to_string(), name: "删除文档".to_string(), description: "删除文档".to_string(), category: "文档管理".to_string() },
        
        Permission { id: "workflows.read".to_string(), name: "读取工作流".to_string(), description: "查看工作流".to_string(), category: "工作流管理".to_string() },
        Permission { id: "workflows.create".to_string(), name: "创建工作流".to_string(), description: "创建工作流".to_string(), category: "工作流管理".to_string() },
        Permission { id: "workflows.update".to_string(), name: "更新工作流".to_string(), description: "更新工作流".to_string(), category: "工作流管理".to_string() },
        Permission { id: "workflows.delete".to_string(), name: "删除工作流".to_string(), description: "删除工作流".to_string(), category: "工作流管理".to_string() },
        
        Permission { id: "system.settings".to_string(), name: "系统设置".to_string(), description: "修改系统设置".to_string(), category: "系统管理".to_string() },
        Permission { id: "system.logs".to_string(), name: "查看日志".to_string(), description: "查看系统日志".to_string(), category: "系统管理".to_string() },
        Permission { id: "system.monitor".to_string(), name: "系统监控".to_string(), description: "查看系统监控".to_string(), category: "系统管理".to_string() },
        Permission { id: "system.export".to_string(), name: "数据导出".to_string(), description: "导出系统数据".to_string(), category: "系统管理".to_string() },
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
                "users.read".to_string(), "users.create".to_string(), "users.update".to_string(),
                "roles.read".to_string(), "roles.create".to_string(), "roles.update".to_string(),
                "system.settings".to_string(), "system.logs".to_string(),
            ],
            is_default: false,
        },
        Role {
            id: "project_manager".to_string(),
            name: "项目经理".to_string(),
            description: "管理项目和文档".to_string(),
            permissions: vec![
                "projects.read".to_string(), "projects.create".to_string(), "projects.update".to_string(),
                "documents.read".to_string(), "documents.create".to_string(), "documents.update".to_string(),
                "workflows.read".to_string(), "workflows.create".to_string(),
            ],
            is_default: false,
        },
        Role {
            id: "developer".to_string(),
            name: "开发人员".to_string(),
            description: "参与项目开发".to_string(),
            permissions: vec![
                "projects.read".to_string(),
                "documents.read".to_string(), "documents.update".to_string(),
                "workflows.read".to_string(),
            ],
            is_default: false,
        },
        Role {
            id: "viewer".to_string(),
            name: "查看者".to_string(),
            description: "只读权限".to_string(),
            permissions: vec![
                "projects.read".to_string(),
                "documents.read".to_string(),
            ],
            is_default: true,
        },
    ]
}

pub fn get_role_by_id(role_id: &str) -> Option<Role> {
    get_roles().into_iter().find(|r| r.id == role_id)
}

pub fn get_permission_by_id(permission_id: &str) -> Option<Permission> {
    get_permissions().into_iter().find(|p| p.id == permission_id)
}

pub async fn auth_middleware(
    State(auth_state): State<AuthState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let path = req.uri().path();
    
    let public_paths = ["/", "/health", "/api/v1/auth/login", "/api/v1/auth/refresh"];
    if public_paths.contains(&path) || path.starts_with("/api/v1/auth/") {
        return next.run(req).await;
    }
    
    let is_development = std::env::var("RUST_ENV").unwrap_or_default() == "development"
        || std::env::var("ENV").unwrap_or_default() == "dev";
    
    if is_development {
        let dev_public_paths = [
            "/api/v1/documents", 
            "/api/v1/files", 
            "/api/v1/folders", 
            "/api/v1/workflows", 
            "/api/v1/ai",
            "/api/v1/samples",
            "/api/v1/inspection",
            "/api/v1/instruments",
            "/api/v1/reagents",
            "/api/v1/audit",
            "/api/v1/projects",
            "/api/v1/formulas",
            "/api/v1/experiments",
            "/api/v1/materials",
            "/swagger-ui",
            "/api-docs"
        ];
        if dev_public_paths.iter().any(|p| path.starts_with(p)) {
            return next.run(req).await;
        }
    }

    let (mut parts, body) = req.into_parts();
    
    let auth_header = parts
        .headers
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => {
            return api_error::<()>(401, "未授权：缺少有效的认证令牌").into_response();
        }
    };

    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(auth_state.jwt_secret.as_ref()),
        &Validation::new(Algorithm::HS256),
    ) {
        Ok(token_data) => {
            let claims = token_data.claims;
            
            if claims.exp < chrono::Utc::now().timestamp() as usize {
                return api_error::<()>(401, "令牌已过期，请重新登录").into_response();
            }
            
            parts.extensions.insert(claims);
            
            let req = Request::from_parts(parts, body);
            next.run(req).await
        }
        Err(e) => {
            tracing::error!("Token verification failed: {}", e);
            api_error::<()>(401, &format!("认证失败：{}", e)).into_response()
        }
    }
}

pub fn check_permission(claims: &Claims, permission: &str) -> Result<(), ApiResponse<()>> {
    if claims.has_permission(permission) {
        Ok(())
    } else {
        Err(api_error::<()>(
            403,
            &format!("权限不足：需要 {} 权限", permission),
        ))
    }
}

pub fn check_role(claims: &Claims, role: &str) -> Result<(), ApiResponse<()>> {
    if claims.has_role(role) {
        Ok(())
    } else {
        Err(api_error::<()>(
            403,
            &format!("权限不足：需要 {} 角色", role),
        ))
    }
}

pub fn require_superuser(claims: &Claims) -> Result<(), ApiResponse<()>> {
    if claims.is_superuser {
        Ok(())
    } else {
        Err(api_error::<()>(
            403,
            "权限不足：需要超级管理员权限",
        ))
    }
}

pub fn require_any_permission(claims: &Claims, permissions: &[&str]) -> Result<(), ApiResponse<()>> {
    if claims.has_any_permission(permissions) {
        Ok(())
    } else {
        Err(api_error::<()>(
            403,
            &format!("权限不足：需要以下任一权限: {}", permissions.join(", ")),
        ))
    }
}

pub fn require_all_permissions(claims: &Claims, permissions: &[&str]) -> Result<(), ApiResponse<()>> {
    if claims.has_all_permissions(permissions) {
        Ok(())
    } else {
        Err(api_error::<()>(
            403,
            &format!("权限不足：需要所有以下权限: {}", permissions.join(", ")),
        ))
    }
}
