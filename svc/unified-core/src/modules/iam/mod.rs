//! IAM module - Identity and Access Management

pub mod auth;
pub mod permission;
pub mod permission_verify;
pub mod position;
pub mod role;
pub mod user;
pub mod user_permission;
pub mod user_position;

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

    // Insert default permissions (模块级权限)
    let permissions = vec![
        // IAM 权限
        ("iam:read", "身份管理-只读", "身份管理", "iam", "read"),
        ("iam:write", "身份管理-写入", "身份管理", "iam", "write"),
        ("iam:delete", "身份管理-删除", "身份管理", "iam", "delete"),
        ("iam:admin", "身份管理-管理", "身份管理", "iam", "admin"),
        // HRM 权限
        ("hrm:read", "人力资源-只读", "人力资源", "hrm", "read"),
        ("hrm:write", "人力资源-写入", "人力资源", "hrm", "write"),
        ("hrm:delete", "人力资源-删除", "人力资源", "hrm", "delete"),
        ("hrm:admin", "人力资源-管理", "人力资源", "hrm", "admin"),
        // ERP 权限
        ("erp:read", "企业资源-只读", "企业资源", "erp", "read"),
        ("erp:write", "企业资源-写入", "企业资源", "erp", "write"),
        ("erp:delete", "企业资源-删除", "企业资源", "erp", "delete"),
        ("erp:admin", "企业资源-管理", "企业资源", "erp", "admin"),
        // PM 权限
        ("pm:read", "项目管理-只读", "项目管理", "pm", "read"),
        ("pm:write", "项目管理-写入", "项目管理", "pm", "write"),
        ("pm:delete", "项目管理-删除", "项目管理", "pm", "delete"),
        ("pm:admin", "项目管理-管理", "项目管理", "pm", "admin"),
        // RS 权限
        ("rs:read", "研发管理-只读", "研发管理", "rs", "read"),
        ("rs:write", "研发管理-写入", "研发管理", "rs", "write"),
        ("rs:delete", "研发管理-删除", "研发管理", "rs", "delete"),
        ("rs:admin", "研发管理-管理", "研发管理", "rs", "admin"),
        // SCM 权限
        ("scm:read", "供应链-只读", "供应链", "scm", "read"),
        ("scm:write", "供应链-写入", "供应链", "scm", "write"),
        ("scm:delete", "供应链-删除", "供应链", "scm", "delete"),
        ("scm:admin", "供应链-管理", "供应链", "scm", "admin"),
        // CRM 权限
        ("crm:read", "客户关系-只读", "客户关系", "crm", "read"),
        ("crm:write", "客户关系-写入", "客户关系", "crm", "write"),
        ("crm:delete", "客户关系-删除", "客户关系", "crm", "delete"),
        ("crm:admin", "客户关系-管理", "客户关系", "crm", "admin"),
        // AI 权限
        ("ai:read", "AI助手-只读", "AI助手", "ai", "read"),
        ("ai:write", "AI助手-写入", "AI助手", "ai", "write"),
        ("ai:delete", "AI助手-删除", "AI助手", "ai", "delete"),
        ("ai:admin", "AI助手-管理", "AI助手", "ai", "admin"),
        // GIS 权限
        ("gis:read", "地理信息-只读", "地理信息", "gis", "read"),
        ("gis:write", "地理信息-写入", "地理信息", "gis", "write"),
        ("gis:delete", "地理信息-删除", "地理信息", "gis", "delete"),
        ("gis:admin", "地理信息-管理", "地理信息", "gis", "admin"),
        // QMS 权限 (质量管理)
        ("qms:read", "质量管理-只读", "质量管理", "qms", "read"),
        ("qms:write", "质量管理-写入", "质量管理", "qms", "write"),
        ("qms:delete", "质量管理-删除", "质量管理", "qms", "delete"),
        ("qms:admin", "质量管理-管理", "质量管理", "qms", "admin"),
        // EHS 权限 (环境健康安全)
        (
            "ehs:read",
            "环境健康安全-只读",
            "环境健康安全",
            "ehs",
            "read",
        ),
        (
            "ehs:write",
            "环境健康安全-写入",
            "环境健康安全",
            "ehs",
            "write",
        ),
        (
            "ehs:delete",
            "环境健康安全-删除",
            "环境健康安全",
            "ehs",
            "delete",
        ),
        (
            "ehs:admin",
            "环境健康安全-管理",
            "环境健康安全",
            "ehs",
            "admin",
        ),
        // MES 权限 (制造执行)
        ("mes:read", "制造执行-只读", "制造执行", "mes", "read"),
        ("mes:write", "制造执行-写入", "制造执行", "mes", "write"),
        ("mes:delete", "制造执行-删除", "制造执行", "mes", "delete"),
        ("mes:admin", "制造执行-管理", "制造执行", "mes", "admin"),
        // WMS 权限 (仓储管理)
        ("wms:read", "仓储管理-只读", "仓储管理", "wms", "read"),
        ("wms:write", "仓储管理-写入", "仓储管理", "wms", "write"),
        ("wms:delete", "仓储管理-删除", "仓储管理", "wms", "delete"),
        ("wms:admin", "仓储管理-管理", "仓储管理", "wms", "admin"),
        // Workflow 权限
        ("workflow:read", "工作流-只读", "工作流", "workflow", "read"),
        (
            "workflow:write",
            "工作流-写入",
            "工作流",
            "workflow",
            "write",
        ),
        (
            "workflow:delete",
            "工作流-删除",
            "工作流",
            "workflow",
            "delete",
        ),
        (
            "workflow:approve",
            "工作流-审批",
            "工作流",
            "workflow",
            "approve",
        ),
        (
            "workflow:admin",
            "工作流-管理",
            "工作流",
            "workflow",
            "admin",
        ),
        // Doc 权限 (基础设施，与 IAM 联动)
        ("doc:read", "文档管理-只读", "文档管理", "doc", "read"),
        ("doc:write", "文档管理-写入", "文档管理", "doc", "write"),
        ("doc:delete", "文档管理-删除", "文档管理", "doc", "delete"),
        ("doc:admin", "文档管理-管理", "文档管理", "doc", "admin"),
        // File 权限 (基础设施，与 IAM 联动)
        ("file:read", "文件服务-只读", "文件服务", "file", "read"),
        ("file:write", "文件服务-写入", "文件服务", "file", "write"),
        ("file:delete", "文件服务-删除", "文件服务", "file", "delete"),
        ("file:admin", "文件服务-管理", "文件服务", "file", "admin"),
        // Notification 权限 (基础设施，与 IAM 联动)
        (
            "notification:read",
            "通知服务-只读",
            "通知服务",
            "notification",
            "read",
        ),
        (
            "notification:write",
            "通知服务-写入",
            "通知服务",
            "notification",
            "write",
        ),
        (
            "notification:delete",
            "通知服务-删除",
            "通知服务",
            "notification",
            "delete",
        ),
        (
            "notification:admin",
            "通知服务-管理",
            "通知服务",
            "notification",
            "admin",
        ),
        // IM 权限 (基础设施，与 IAM 联动)
        ("im:read", "即时通讯-只读", "即时通讯", "im", "read"),
        ("im:write", "即时通讯-写入", "即时通讯", "im", "write"),
        ("im:delete", "即时通讯-删除", "即时通讯", "im", "delete"),
        ("im:admin", "即时通讯-管理", "即时通讯", "im", "admin"),
        // Integration 权限 (基础设施，与 IAM 联动)
        (
            "integration:read",
            "系统集成-只读",
            "系统集成",
            "integration",
            "read",
        ),
        (
            "integration:write",
            "系统集成-写入",
            "系统集成",
            "integration",
            "write",
        ),
        (
            "integration:delete",
            "系统集成-删除",
            "系统集成",
            "integration",
            "delete",
        ),
        (
            "integration:admin",
            "系统集成-管理",
            "系统集成",
            "integration",
            "admin",
        ),
        // System 权限 (系统设置)
        (
            "system:settings",
            "系统设置",
            "系统设置",
            "system",
            "settings",
        ),
        (
            "system:monitor",
            "系统监控",
            "系统设置",
            "system",
            "monitor",
        ),
        ("system:audit", "审计日志", "系统设置", "system", "audit"),
        (
            "system:dictionary",
            "字典管理",
            "系统设置",
            "system",
            "dictionary",
        ),
        ("system:plugin", "插件管理", "系统设置", "system", "plugin"),
        (
            "system:migration",
            "数据迁移",
            "系统设置",
            "system",
            "migration",
        ),
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
    // 权限码格式为 module:action，与 lib/src/permission.rs 中 ModuleCode 和 PermissionAction 一致
    let admin_permissions = vec![
        "iam:admin",
        "hrm:admin",
        "erp:admin",
        "pm:admin",
        "rs:admin",
        "scm:admin",
        "crm:admin",
        "ai:admin",
        "gis:admin",
        "qms:admin",
        "ehs:admin",
        "mes:admin",
        "wms:admin",
        "doc:admin",
        "file:admin",
        "notification:admin",
        "im:admin",
        "integration:admin",
        "system:admin",
        "workflow:approve",
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

    // Insert default admin user
    // 从环境变量读取初始密码，未设置时回退到默认值 admin123
    let admin_password =
        std::env::var("ADMIN_INITIAL_PASSWORD").unwrap_or_else(|_| "admin123".to_string());
    tracing::warn!("⚠️ 使用默认管理员密码，请在首次登录后立即修改！");
    let admin_password_hash = match bcrypt::hash(&admin_password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("管理员密码哈希失败: {}", e);
            return Err(sqlx::Error::Configuration(
                format!("管理员密码哈希失败: {e}").into(),
            ));
        }
    };
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
