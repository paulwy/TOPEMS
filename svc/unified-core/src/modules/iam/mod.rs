//! IAM module - Identity and Access Management

pub mod auth;
pub mod user;
pub mod role;
pub mod permission;
pub mod user_permission;

use sqlx::PgPool;

/// Initialize IAM database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create users table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username VARCHAR(64) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(128),
            phone VARCHAR(32),
            avatar_url VARCHAR(512),
            status VARCHAR(32) DEFAULT 'active',
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            last_login_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create roles table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(64) NOT NULL UNIQUE,
            description TEXT,
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create permissions table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(128) NOT NULL UNIQUE,
            name VARCHAR(128) NOT NULL,
            description TEXT,
            resource VARCHAR(64),
            action VARCHAR(32),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create user_roles table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_user_roles (
            user_id UUID NOT NULL REFERENCES core_users(id),
            role_id UUID NOT NULL REFERENCES core_roles(id),
            created_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (user_id, role_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create role_permissions table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_role_permissions (
            role_id UUID NOT NULL REFERENCES core_roles(id),
            permission_id UUID NOT NULL REFERENCES core_permissions(id),
            created_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (role_id, permission_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_users_username ON core_users(username)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_users_email ON core_users(email)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_roles_name ON core_roles(name)")
        .execute(pool)
        .await?;

    Ok(())
}