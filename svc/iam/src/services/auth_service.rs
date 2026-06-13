#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(dead_code)]

use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use regex::Regex;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use super::user_service::UserService;
use crate::db::repository::AuditLogRepository;
use crate::models::user::{
    LoginRequest, LoginResponse, RefreshTokenRequest, RefreshTokenResponse, RegisterRequest, User,
    UserInfo,
};
use crate::models::AuditLog;
use topems_shared::{ApiResponse, AuthState, Claims};

pub struct AuthService {
    db: PgPool,
    auth_state: AuthState,
    user_service: UserService,
    audit_repo: AuditLogRepository,
}

impl AuthService {
    pub fn new(db: PgPool) -> Self {
        let audit_repo = AuditLogRepository::new(db.clone());
        AuthService {
            db: db.clone(),
            auth_state: AuthState::from_env(),
            user_service: UserService::new(db),
            audit_repo,
        }
    }

    /// 记录审计日志
    #[allow(clippy::too_many_arguments)]
    async fn log_audit(
        &self,
        user_id: Option<Uuid>,
        action: &str,
        resource: Option<&str>,
        resource_id: Option<Uuid>,
        ip_address: &str,
        user_agent: &str,
        details: serde_json::Value,
    ) {
        let log = AuditLog {
            id: Uuid::new_v4(),
            user_id,
            action: action.to_string(),
            resource: resource.map(|s| s.to_string()),
            resource_id,
            ip_address: ip_address.to_string(),
            user_agent: user_agent.to_string(),
            details,
            created_at: Utc::now(),
        };

        if let Err(e) = self.audit_repo.create(&log).await {
            tracing::error!("创建审计日志失败: {}", e);
        }
    }

    pub async fn login(&self, request: LoginRequest) -> ApiResponse<LoginResponse> {
        let result = sqlx::query_as::<_, (Uuid, String, String, Option<String>, String, bool, bool, chrono::DateTime<Utc>, chrono::DateTime<Utc>)>(
            "SELECT id, username, email, full_name, password_hash, is_active, is_superuser, created_at, updated_at FROM iam.users WHERE username = $1"
        )
        .bind(&request.username)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(user)) => {
                if !user.5 {
                    return ApiResponse::error(403, "该账号已被禁用");
                }

                if !bcrypt::verify(&request.password, &user.4).unwrap_or(false) {
                    tracing::warn!("密码错误: {}", request.username);
                    return ApiResponse::error(401, "密码错误");
                }

                let (roles, permissions) = self
                    .user_service
                    .get_user_roles_and_permissions(&user.0)
                    .await;
                let role = roles.first().cloned().unwrap_or_else(|| "user".to_string());
                let is_superuser = user.6 || role == "admin";
                let final_roles = if roles.is_empty() {
                    vec!["user".to_string()]
                } else {
                    roles
                };

                let user_info = UserInfo {
                    id: user.0.to_string(),
                    username: user.1.clone(),
                    email: user.2.clone(),
                    full_name: user.3.clone(),
                    role: role.clone(),
                    roles: final_roles.clone(),
                    permissions: permissions.clone(),
                    avatar_url: None,
                    created_at: user.7.to_rfc3339(),
                    is_active: user.5,
                    is_superuser,
                };

                let user_for_token = User {
                    id: user.0,
                    username: user.1.clone(),
                    email: user.2.clone(),
                    password_hash: user.4.clone(),
                    full_name: user.3.clone(),
                    role: role.clone(),
                    roles: final_roles,
                    permissions,
                    created_at: user.7,
                    updated_at: user.8,
                    is_active: user.5,
                    is_superuser,
                    avatar_url: None,
                };

                let access_token = self.generate_token(&user_for_token, 1).unwrap();
                let refresh_token = self.generate_token(&user_for_token, 168).unwrap();

                let resp = LoginResponse {
                    access_token,
                    refresh_token,
                    token_type: "Bearer".to_string(),
                    expires_in: 3600,
                    user: user_info,
                };

                tracing::info!("用户登录成功: {}", user.1);
                ApiResponse::success(
                    resp,
                    &format!("欢迎回来，{}！", user.3.as_ref().unwrap_or(&user.1)),
                )
            }
            Ok(None) => {
                tracing::warn!("用户不存在: {}", request.username);
                ApiResponse::error(404, "用户不存在")
            }
            Err(e) => {
                tracing::error!("数据库查询错误: {}", e);
                ApiResponse::error(500, "服务器内部错误")
            }
        }
    }

    pub async fn register(&self, request: RegisterRequest) -> ApiResponse<LoginResponse> {
        if let Err(msg) = self.validate_username(&request.username) {
            return ApiResponse::error(400, &msg);
        }

        if let Err(msg) = self.validate_email(&request.email) {
            return ApiResponse::error(400, &msg);
        }

        if let Err(msg) = self.validate_password(&request.password) {
            return ApiResponse::error(400, &msg);
        }

        let password_hash = bcrypt::hash(&request.password, bcrypt::DEFAULT_COST).unwrap();

        let result = sqlx::query(
            r#"
            INSERT INTO iam.users (username, email, password_hash, full_name, role, is_active, is_superuser)
            VALUES ($1, $2, $3, $4, 'user', true, false)
            ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
            RETURNING id, username, email, full_name, role, is_active, created_at, updated_at
            "#
        )
        .bind(&request.username)
        .bind(&request.email)
        .bind(&password_hash)
        .bind(&request.full_name)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(user)) => {
                tracing::info!("用户注册成功: {}", user.get::<String, _>("username"));

                let user_id = user.get::<Uuid, _>("id");
                let (user_roles, user_permissions) = self
                    .user_service
                    .get_user_roles_and_permissions(&user_id)
                    .await;

                let is_superuser = user.get::<String, _>("role") == "admin";
                let user_info = UserInfo {
                    id: user_id.to_string(),
                    username: user.get::<String, _>("username"),
                    email: user.get::<String, _>("email"),
                    full_name: user.get::<Option<String>, _>("full_name"),
                    role: user.get::<String, _>("role"),
                    roles: user_roles.clone(),
                    permissions: user_permissions.clone(),
                    avatar_url: None,
                    created_at: user
                        .get::<chrono::DateTime<Utc>, _>("created_at")
                        .to_rfc3339(),
                    is_active: user.get::<bool, _>("is_active"),
                    is_superuser,
                };

                let new_user = User {
                    id: user_id,
                    username: user_info.username.clone(),
                    email: user_info.email.clone(),
                    password_hash,
                    full_name: user_info.full_name.clone(),
                    role: user_info.role.clone(),
                    roles: user_info.roles.clone(),
                    permissions: user_info.permissions.clone(),
                    created_at: user.get::<chrono::DateTime<Utc>, _>("created_at"),
                    updated_at: user.get::<chrono::DateTime<Utc>, _>("updated_at"),
                    is_active: user_info.is_active,
                    is_superuser: user_info.is_superuser,
                    avatar_url: None,
                };

                let access_token = self.generate_token(&new_user, 1).unwrap();
                let refresh_token = self.generate_token(&new_user, 168).unwrap();

                let resp = LoginResponse {
                    access_token,
                    refresh_token,
                    token_type: "Bearer".to_string(),
                    expires_in: 3600,
                    user: user_info,
                };

                ApiResponse::success(resp, "注册成功！")
            }
            Ok(None) => ApiResponse::error(409, "用户名或邮箱已存在"),
            Err(e) => {
                tracing::error!("数据库插入错误: {}", e);
                ApiResponse::error(500, "服务器内部错误")
            }
        }
    }

    pub async fn refresh_token(
        &self,
        request: RefreshTokenRequest,
    ) -> ApiResponse<RefreshTokenResponse> {
        match self.verify_token(&request.refresh_token) {
            Ok(claims) => {
                // 将 String 转换为 UUID
                let user_id = match Uuid::parse_str(&claims.sub) {
                    Ok(id) => id,
                    Err(_) => return ApiResponse::error(400, "无效的用户ID"),
                };

                let result = sqlx::query_as::<_, (Uuid, String, String, Option<String>, String, bool, chrono::DateTime<Utc>, chrono::DateTime<Utc>, bool)>(
                    "SELECT id, username, email, full_name, password_hash, is_active, created_at, updated_at, is_superuser FROM iam.users WHERE id = $1"
                )
                .bind(user_id)
                .fetch_optional(&self.db)
                .await;

                match result {
                    Ok(Some(user)) => {
                        if !user.5 {
                            return ApiResponse::error(403, "该账号已被禁用");
                        }

                        let user_for_token = User {
                            id: user.0,
                            username: user.1.clone(),
                            email: user.2.clone(),
                            password_hash: user.4.clone(),
                            full_name: user.3.clone(),
                            role: claims.role.clone(),
                            roles: claims.roles.clone(),
                            permissions: claims.permissions.clone(),
                            created_at: user.6,
                            updated_at: user.7,
                            is_active: user.5,
                            is_superuser: claims.is_superuser,
                            avatar_url: None,
                        };

                        let access_token = self.generate_token(&user_for_token, 1).unwrap();

                        let resp = RefreshTokenResponse {
                            access_token,
                            token_type: "Bearer".to_string(),
                            expires_in: 3600,
                        };

                        ApiResponse::success(resp, "Token刷新成功")
                    }
                    Ok(None) => ApiResponse::error(404, "用户不存在"),
                    Err(e) => {
                        tracing::error!("数据库查询错误: {}", e);
                        ApiResponse::error(500, "服务器内部错误")
                    }
                }
            }
            Err(e) => {
                tracing::warn!("刷新token失败: {}", e);
                ApiResponse::error(401, "Refresh token 已失效")
            }
        }
    }

    fn generate_token(&self, user: &User, expires_in_hours: i64) -> Result<String, String> {
        let expiration = Utc::now()
            .checked_add_signed(Duration::hours(expires_in_hours))
            .expect("valid timestamp")
            .timestamp() as usize;

        let claims = Claims {
            sub: user.id.to_string(),
            username: user.username.clone(),
            role: user.role.clone(),
            roles: user.roles.clone(),
            permissions: user.permissions.clone(),
            is_superuser: user.is_superuser,
            exp: expiration,
            iat: Utc::now().timestamp() as usize,
            email: Some(user.email.clone()),
            department: None,
            tenant_id: None,
        };

        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(self.auth_state.jwt_secret.as_ref()),
        )
        .map_err(|e| format!("生成token失败: {}", e))
    }

    fn verify_token(&self, token: &str) -> Result<Claims, String> {
        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;
        decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.auth_state.jwt_secret.as_ref()),
            &validation,
        )
        .map(|data| data.claims)
        .map_err(|e| format!("Token验证失败: {}", e))
    }

    fn validate_password(&self, password: &str) -> Result<(), String> {
        if password.len() < 8 {
            return Err("密码长度至少为8位".to_string());
        }

        let has_uppercase = password.chars().any(|c| c.is_uppercase());
        let has_lowercase = password.chars().any(|c| c.is_lowercase());
        let has_number = password.chars().any(|c| c.is_numeric());
        let has_special = password.chars().any(|c| !c.is_alphanumeric());

        if !has_uppercase {
            return Err("密码必须包含至少一个大写字母".to_string());
        }
        if !has_lowercase {
            return Err("密码必须包含至少一个小写字母".to_string());
        }
        if !has_number {
            return Err("密码必须包含至少一个数字".to_string());
        }
        if !has_special {
            return Err("密码必须包含至少一个特殊字符".to_string());
        }

        Ok(())
    }

    fn validate_email(&self, email: &str) -> Result<(), String> {
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
        if !email_regex.is_match(email) {
            return Err("请输入有效的邮箱地址".to_string());
        }
        Ok(())
    }

    fn validate_username(&self, username: &str) -> Result<(), String> {
        if username.len() < 2 {
            return Err("用户名长度至少为2位".to_string());
        }
        if username.len() > 20 {
            return Err("用户名不能超过20个字符".to_string());
        }

        for c in username.chars() {
            if !c.is_ascii_alphanumeric() {
                return Err("用户名只能包含字母和数字".to_string());
            }
        }

        Ok(())
    }
}
