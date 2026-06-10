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
        let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET environment variable must be set for security");
        let refresh_secret = std::env::var("JWT_REFRESH_SECRET")
            .or_else(|_| std::env::var("REFRESH_SECRET"))
            .expect("JWT_REFRESH_SECRET or REFRESH_SECRET environment variable must be set for security");
        
        tracing::info!("🔑 AuthState 读取到的 JWT_SECRET: {}", jwt_secret);
        
        if jwt_secret.len() < 32 {
            panic!("JWT_SECRET must be at least 32 characters long for security");
        }
        if refresh_secret.len() < 32 {
            panic!("JWT_REFRESH_SECRET or REFRESH_SECRET must be at least 32 characters long for security");
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

/// 生成 JWT 访问令牌。`expire_minutes` 以分钟为单位。
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
    };
    claims.encode(secret).unwrap_or_else(|_| String::new())
}

/// 验证 JWT 令牌，返回 claims。
pub fn verify_jwt_token(token: &str, secret: &str) -> Result<Claims, TopemsError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|e| TopemsError::Auth(format!("JWT 验证失败: {}", e)))?;
    Ok(token_data.claims)
}

/// 生成一个随机的 refresh token。
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
    if public_paths.contains(&path) {
        return next.run(req).await;
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

pub fn check_permission<T>(claims: &Claims, permission: &str) -> Result<(), axum::Json<ApiResponse<T>>> {
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

pub fn require_any_permission<T>(claims: &Claims, permissions: &[&str]) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.has_any_permission(permissions) {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            &format!("权限不足：需要以下任一权限: {}", permissions.join(", ")),
        )))
    }
}

pub fn require_all_permissions<T>(claims: &Claims, permissions: &[&str]) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.has_all_permissions(permissions) {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            &format!("权限不足：需要所有以下权限: {}", permissions.join(", ")),
        )))
    }
}
