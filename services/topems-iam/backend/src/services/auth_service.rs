use super::*;
use chrono::{Utc, Duration};
use jsonwebtoken::{encode, decode, Header, Validation, Algorithm, EncodingKey, DecodingKey};
use bcrypt::{hash, verify, DEFAULT_COST};
use uuid::Uuid;
use sqlx::PgPool;
use tracing;
use crate::models::User;

pub struct AuthService {
    pool: PgPool,
    jwt_secret: String,
}

impl AuthService {
    pub fn new(pool: PgPool, jwt_secret: String) -> Self {
        Self { pool, jwt_secret }
    }

    pub async fn login(&self, username: &str, password: &str) -> Result<(User, String), IamError> {
        let row: User = sqlx::query_as::<_, User>(
            r#"SELECT id, username, email, full_name, avatar_url, 
                      is_active, is_superuser, password_hash, created_at, updated_at, last_login_at
               FROM iam.users WHERE username = $1"#,
        )
        .bind(username)
        .fetch_one(&self.pool)
        .await?;

        if !row.is_active {
            return Err(IamError::UserDisabled);
        }

        if !verify(password, &row.password_hash).map_err(|_| IamError::AuthError("密码验证失败".to_string()))? {
            return Err(IamError::InvalidCredentials);
        }

        let user_id = row.id;
        let (roles, permissions) = self.get_user_roles_and_permissions(user_id).await?;

        let expiration = (Utc::now() + Duration::hours(24)).timestamp() as usize;
        let claims = Claims {
            sub: row.id.to_string(),
            exp: expiration,
            username: row.username.clone(),
            is_superuser: row.is_superuser,
            roles,
            permissions,
            role: String::new(),
            iat: Utc::now().timestamp() as usize,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_ref()),
        )?;

        let _ = sqlx::query(
            "UPDATE iam.users SET last_login_at = NOW() WHERE id = $1",
        )
        .bind(row.id)
        .execute(&self.pool)
        .await;

        Ok((row, token))
    }

    pub async fn verify_token(&self, token: &str) -> Result<Claims, IamError> {
        let decoded = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_ref()),
            &Validation::new(Algorithm::HS256),
        )?;

        if decoded.claims.exp < Utc::now().timestamp() as usize {
            return Err(IamError::TokenExpired);
        }

        Ok(decoded.claims)
    }

    pub async fn refresh_token(&self, token: &str) -> Result<(Claims, String), IamError> {
        let decoded = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_ref()),
            &Validation::new(Algorithm::HS256),
        )?;

        let user_id = Uuid::parse_str(&decoded.claims.sub)
            .map_err(|e| IamError::InvalidRequest(format!("无效的用户标识: {}", e)))?;

        let (roles, permissions) = self.get_user_roles_and_permissions(user_id).await?;

        let expiration = (Utc::now() + Duration::hours(24)).timestamp() as usize;
        let new_claims = Claims {
            sub: decoded.claims.sub,
            exp: expiration,
            username: decoded.claims.username,
            is_superuser: decoded.claims.is_superuser,
            roles,
            permissions,
            role: decoded.claims.role,
            iat: Utc::now().timestamp() as usize,
        };

        let new_token = encode(
            &Header::default(),
            &new_claims,
            &EncodingKey::from_secret(self.jwt_secret.as_ref()),
        )?;

        Ok((new_claims, new_token))
    }

    pub async fn hash_password(password: &str) -> Result<String, IamError> {
        hash(password, DEFAULT_COST).map_err(|_| IamError::PasswordHashError)
    }

    pub async fn get_user_roles_and_permissions(&self, user_id: Uuid) -> Result<(Vec<String>, Vec<String>), IamError> {
        let roles: Vec<String> = sqlx::query_scalar::<_, String>(
            r#"SELECT r.id::text as role_id
               FROM iam.roles r
               JOIN iam.user_roles ur ON r.id = ur.role_id
               WHERE ur.user_id = $1"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .collect();

        let permissions: Vec<String> = sqlx::query_scalar::<_, String>(
            r#"SELECT DISTINCT p.id::text as permission_id
               FROM iam.permissions p
               JOIN iam.role_permissions rp ON p.id = rp.permission_id
               JOIN iam.user_roles ur ON rp.role_id = ur.role_id
               WHERE ur.user_id = $1"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .collect();

        Ok((roles, permissions))
    }
}
