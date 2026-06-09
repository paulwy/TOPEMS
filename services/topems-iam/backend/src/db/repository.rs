use sqlx::postgres::PgPool;
use crate::models::*;
use uuid::Uuid;
use chrono::Utc;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RepositoryError {
    #[error("数据库错误: {0}")]
    Database(#[from] sqlx::Error),
    #[error("用户不存在")]
    UserNotFound,
    #[error("用户名已存在")]
    UsernameExists,
    #[error("邮箱已存在")]
    EmailExists,
}

#[derive(Clone)]
pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_username(&self, username: &str) -> Result<Option<User>, RepositoryError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            SELECT id, username, email, password_hash, full_name, avatar_url, 
                   is_active, is_superuser, created_at, updated_at, last_login_at
            FROM iam.users
            WHERE username = $1
            "#
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, RepositoryError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            SELECT id, username, email, password_hash, full_name, avatar_url, 
                   is_active, is_superuser, created_at, updated_at, last_login_at
            FROM iam.users
            WHERE id = $1
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn create(&self, user: &User) -> Result<User, RepositoryError> {
        let created_user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO iam.users (id, username, email, password_hash, full_name, avatar_url, 
                                  is_active, is_superuser, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, username, email, password_hash, full_name, avatar_url, 
                      is_active, is_superuser, created_at, updated_at, last_login_at
            "#
        )
        .bind(user.id)
        .bind(&user.username)
        .bind(&user.email)
        .bind(&user.password_hash)
        .bind(&user.full_name)
        .bind(&user.avatar_url)
        .bind(user.is_active)
        .bind(user.is_superuser)
        .bind(user.created_at)
        .bind(user.updated_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(created_user)
    }

    pub async fn update(&self, user: &User) -> Result<User, RepositoryError> {
        let updated_user = sqlx::query_as::<_, User>(
            r#"
            UPDATE iam.users
            SET email = $2, password_hash = $3, full_name = $4, avatar_url = $5, 
                is_active = $6, updated_at = $7
            WHERE id = $1
            RETURNING id, username, email, password_hash, full_name, avatar_url, 
                      is_active, is_superuser, created_at, updated_at, last_login_at
            "#
        )
        .bind(user.id)
        .bind(&user.email)
        .bind(&user.password_hash)
        .bind(&user.full_name)
        .bind(&user.avatar_url)
        .bind(user.is_active)
        .bind(user.updated_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(updated_user)
    }

    pub async fn update_last_login(&self, id: Uuid) -> Result<(), RepositoryError> {
        sqlx::query(
            "UPDATE iam.users SET last_login_at = $1, updated_at = $1 WHERE id = $2"
        )
        .bind(Utc::now())
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_all(&self, limit: i64, offset: i64) -> Result<Vec<User>, RepositoryError> {
        let users = sqlx::query_as::<_, User>(
            r#"
            SELECT id, username, email, password_hash, full_name, avatar_url, 
                   is_active, is_superuser, created_at, updated_at, last_login_at
            FROM iam.users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(users)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, RepositoryError> {
        let result = sqlx::query("DELETE FROM iam.users WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

#[derive(Clone)]
pub struct RoleRepository {
    pool: PgPool,
}

impl RoleRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_name(&self, name: &str) -> Result<Option<Role>, RepositoryError> {
        let role = sqlx::query_as::<_, Role>(
            "SELECT id, name, description, created_at FROM iam.roles WHERE name = $1"
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;

        Ok(role)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Role>, RepositoryError> {
        let role = sqlx::query_as::<_, Role>(
            "SELECT id, name, description, created_at FROM iam.roles WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(role)
    }

    pub async fn find_by_user_id(&self, user_id: Uuid) -> Result<Vec<Role>, RepositoryError> {
        let roles = sqlx::query_as::<_, Role>(
            r#"
            SELECT r.id, r.name, r.description, r.created_at
            FROM iam.roles r
            INNER JOIN iam.user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
            "#
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(roles)
    }

    pub async fn create(&self, role: &Role) -> Result<Role, RepositoryError> {
        let created_role = sqlx::query_as::<_, Role>(
            r#"
            INSERT INTO iam.roles (id, name, description, created_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, description, created_at
            "#
        )
        .bind(role.id)
        .bind(&role.name)
        .bind(&role.description)
        .bind(role.created_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(created_role)
    }

    pub async fn list_all(&self) -> Result<Vec<Role>, RepositoryError> {
        let roles = sqlx::query_as::<_, Role>(
            r#"
            SELECT id, name, description, created_at
            FROM iam.roles
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(roles)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, RepositoryError> {
        let result = sqlx::query("DELETE FROM iam.roles WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn add_user_role(&self, user_id: Uuid, role_id: Uuid) -> Result<(), RepositoryError> {
        sqlx::query(
            "INSERT INTO iam.user_roles (user_id, role_id, created_at) VALUES ($1, $2, $3)
             ON CONFLICT (user_id, role_id) DO NOTHING"
        )
        .bind(user_id)
        .bind(role_id)
        .bind(Utc::now())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn remove_user_role(&self, user_id: Uuid, role_id: Uuid) -> Result<bool, RepositoryError> {
        let result = sqlx::query(
            "DELETE FROM iam.user_roles WHERE user_id = $1 AND role_id = $2"
        )
        .bind(user_id)
        .bind(role_id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }
}

#[derive(Clone)]
pub struct PermissionRepository {
    pool: PgPool,
}

impl PermissionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Permission>, RepositoryError> {
        let permission = sqlx::query_as::<_, Permission>(
            "SELECT id, name, resource, action, description FROM iam.permissions WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(permission)
    }

    pub async fn find_by_name(&self, name: &str) -> Result<Option<Permission>, RepositoryError> {
        let permission = sqlx::query_as::<_, Permission>(
            "SELECT id, name, resource, action, description FROM iam.permissions WHERE name = $1"
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;

        Ok(permission)
    }

    pub async fn find_by_user_id(&self, user_id: Uuid) -> Result<Vec<Permission>, RepositoryError> {
        let permissions = sqlx::query_as::<_, Permission>(
            r#"
            SELECT DISTINCT p.id, p.name, p.resource, p.action, p.description
            FROM iam.permissions p
            INNER JOIN iam.role_permissions rp ON p.id = rp.permission_id
            INNER JOIN iam.user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
            "#
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(permissions)
    }

    pub async fn find_by_role_id(&self, role_id: Uuid) -> Result<Vec<Permission>, RepositoryError> {
        let permissions = sqlx::query_as::<_, Permission>(
            r#"
            SELECT p.id, p.name, p.resource, p.action, p.description
            FROM iam.permissions p
            INNER JOIN iam.role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = $1
            "#
        )
        .bind(role_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(permissions)
    }

    pub async fn create(&self, permission: &Permission) -> Result<Permission, RepositoryError> {
        let created_permission = sqlx::query_as::<_, Permission>(
            r#"
            INSERT INTO iam.permissions (id, name, resource, action, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, resource, action, description
            "#
        )
        .bind(permission.id)
        .bind(&permission.name)
        .bind(&permission.resource)
        .bind(&permission.action)
        .bind(&permission.description)
        .fetch_one(&self.pool)
        .await?;

        Ok(created_permission)
    }

    pub async fn list_all(&self) -> Result<Vec<Permission>, RepositoryError> {
        let permissions = sqlx::query_as::<_, Permission>(
            r#"
            SELECT id, name, resource, action, description
            FROM iam.permissions
            ORDER BY resource, action
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(permissions)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, RepositoryError> {
        let result = sqlx::query("DELETE FROM iam.permissions WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn add_role_permission(&self, role_id: Uuid, permission_id: Uuid) -> Result<(), RepositoryError> {
        sqlx::query(
            "INSERT INTO iam.role_permissions (role_id, permission_id) VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING"
        )
        .bind(role_id)
        .bind(permission_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn remove_role_permission(&self, role_id: Uuid, permission_id: Uuid) -> Result<bool, RepositoryError> {
        let result = sqlx::query(
            "DELETE FROM iam.role_permissions WHERE role_id = $1 AND permission_id = $2"
        )
        .bind(role_id)
        .bind(permission_id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }
}

#[derive(Clone)]
pub struct AuditLogRepository {
    pool: PgPool,
}

impl AuditLogRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, log: &AuditLog) -> Result<AuditLog, RepositoryError> {
        let created_log = sqlx::query_as::<_, AuditLog>(
            r#"
            INSERT INTO iam.audit_logs (id, user_id, action, resource, resource_id, ip_address, user_agent, details, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, user_id, action, resource, resource_id, ip_address, user_agent, details, created_at
            "#
        )
        .bind(log.id)
        .bind(log.user_id)
        .bind(&log.action)
        .bind(&log.resource)
        .bind(log.resource_id)
        .bind(&log.ip_address)
        .bind(&log.user_agent)
        .bind(&log.details)
        .bind(log.created_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(created_log)
    }

    pub async fn list_all(&self, limit: i64, offset: i64) -> Result<Vec<AuditLog>, RepositoryError> {
        let logs = sqlx::query_as::<_, AuditLog>(
            r#"
            SELECT id, user_id, action, resource, resource_id, ip_address, user_agent, details, created_at
            FROM iam.audit_logs
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(logs)
    }

    pub async fn find_by_user_id(&self, user_id: Uuid, limit: i64, offset: i64) -> Result<Vec<AuditLog>, RepositoryError> {
        let logs = sqlx::query_as::<_, AuditLog>(
            r#"
            SELECT id, user_id, action, resource, resource_id, ip_address, user_agent, details, created_at
            FROM iam.audit_logs
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(logs)
    }
}
