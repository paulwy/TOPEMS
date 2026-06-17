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
            is_superuser BOOLEAN DEFAULT FALSE,
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

    // Add is_superuser column if not exists
    sqlx::query("ALTER TABLE IF EXISTS core_users ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE")
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

    // Insert default permissions
    let permissions = vec![
        ("iam:users_read", "读取用户", "用户管理", "users", "read"),
        ("iam:users_create", "创建用户", "用户管理", "users", "create"),
        ("iam:users_update", "更新用户", "用户管理", "users", "update"),
        ("iam:users_delete", "删除用户", "用户管理", "users", "delete"),
        ("iam:roles_read", "读取角色", "角色管理", "roles", "read"),
        ("iam:roles_create", "创建角色", "角色管理", "roles", "create"),
        ("iam:roles_update", "更新角色", "角色管理", "roles", "update"),
        ("iam:roles_delete", "删除角色", "角色管理", "roles", "delete"),
        ("iam:permissions_read", "读取权限", "权限管理", "permissions", "read"),
        ("iam:permissions_update", "更新权限", "权限管理", "permissions", "update"),
        ("iam:audit_read", "读取审计日志", "系统管理", "audit", "read"),
        ("iam:system_read", "系统设置读取", "系统管理", "system", "read"),
        ("iam:system_update", "系统设置更新", "系统管理", "system", "update"),
        ("iam:system_settings", "系统设置", "系统管理", "system", "settings"),
        ("iam:system_logs", "查看日志", "系统管理", "system", "logs"),
        ("iam:system_monitor", "系统监控", "系统管理", "system", "monitor"),
        ("iam:system_export", "数据导出", "系统管理", "system", "export"),
        ("iam:dictionaries_read", "字典读取", "系统管理", "dictionaries", "read"),
        ("iam:dictionaries_update", "字典更新", "系统管理", "dictionaries", "update"),
        ("iam:plugins_read", "插件读取", "系统管理", "plugins", "read"),
        ("iam:plugins_update", "插件更新", "系统管理", "plugins", "update"),
        ("pm:projects_read", "读取项目", "项目管理", "projects", "read"),
        ("pm:projects_create", "创建项目", "项目管理", "projects", "create"),
        ("pm:projects_update", "更新项目", "项目管理", "projects", "update"),
        ("pm:projects_delete", "删除项目", "项目管理", "projects", "delete"),
        ("doc:documents_read", "读取文档", "文档管理", "documents", "read"),
        ("doc:documents_create", "创建文档", "文档管理", "documents", "create"),
        ("doc:documents_update", "更新文档", "文档管理", "documents", "update"),
        ("doc:documents_delete", "删除文档", "文档管理", "documents", "delete"),
        ("workflow:workflows_read", "读取工作流", "工作流管理", "workflows", "read"),
        ("workflow:workflows_create", "创建工作流", "工作流管理", "workflows", "create"),
        ("workflow:workflows_update", "更新工作流", "工作流管理", "workflows", "update"),
        ("workflow:workflows_delete", "删除工作流", "工作流管理", "workflows", "delete"),
    ];

    for (code, name, desc, resource, action) in permissions {
        sqlx::query(
            r#"
            INSERT INTO core_permissions (code, name, description, resource, action)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (code) DO NOTHING
            "#,
        )
        .bind(code)
        .bind(name)
        .bind(desc)
        .bind(resource)
        .bind(action)
        .execute(pool)
        .await?;
    }

    // Insert default roles
    sqlx::query(
        r#"
        INSERT INTO core_roles (name, description)
        VALUES ('superadmin', '超级管理员')
        ON CONFLICT (name) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO core_roles (name, description)
        VALUES ('admin', '管理员')
        ON CONFLICT (name) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    // Assign all permissions to superadmin role
    sqlx::query(
        r#"
        INSERT INTO core_role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM core_roles r, core_permissions p WHERE r.name = 'superadmin'
        ON CONFLICT DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    // Assign specific permissions to admin role
    let admin_permissions = vec![
        "iam:users_read", "iam:users_create", "iam:users_update",
        "iam:roles_read", "iam:roles_create", "iam:roles_update",
        "iam:system_settings", "iam:system_logs",
    ];

    for perm_code in admin_permissions {
        sqlx::query(
            r#"
            INSERT INTO core_role_permissions (role_id, permission_id)
            SELECT r.id, p.id FROM core_roles r, core_permissions p
            WHERE r.name = 'admin' AND p.code = $1
            ON CONFLICT DO NOTHING
            "#,
        )
        .bind(perm_code)
        .execute(pool)
        .await?;
    }

    // Insert default admin user (password: admin123)
    // Password hash for 'admin123' using bcrypt
    let admin_password_hash = "$argon2id$v=19$m=19456,t=2,p=1$YWJjZGVmZ2hpamtsbW5vcA$k5Q5z7K0xM7J0YxF5z4z7K0xM7J0YxF5z4z7K0xM7J0YxF5z4z7K0xM7J0";
    sqlx::query(
        r#"
        INSERT INTO core_users (username, email, password_hash, full_name, is_superuser)
        VALUES ('admin', 'admin@topems.com', $1, '系统管理员', true)
        ON CONFLICT (username) DO NOTHING
        "#,
    )
    .bind(admin_password_hash)
    .execute(pool)
    .await?;

    // Assign superadmin role to admin user
    sqlx::query(
        r#"
        INSERT INTO core_user_roles (user_id, role_id)
        SELECT u.id, r.id FROM core_users u, core_roles r
        WHERE u.username = 'admin' AND r.name = 'superadmin'
        ON CONFLICT DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}