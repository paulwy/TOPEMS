use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::security::audit_logger::current_audit_context;
use topems_shared_core::audit::redact_sensitive_json;
use topems_shared_db::scope::Db;
use utoipa::ToSchema;

lazy_static! {
    static ref EMAIL_REGEX: Regex =
        match Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$") {
            Ok(re) => re,
            Err(e) => panic!("invalid EMAIL_REGEX pattern: {e}"),
        };
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(as = ListUsersParams)]
pub struct ListUsersParams {
    pub(crate) page: Option<i64>,
    pub(crate) page_size: Option<i64>,
}

pub(crate) async fn record_audit_log(
    pool: &sqlx::PgPool,
    user_id: &str,
    action: &str,
    resource_type: &str,
    resource_id: &str,
    request_body: Option<serde_json::Value>,
    response_body: Option<serde_json::Value>,
    status: i16,
) {
    let db = Db::new(pool.clone(), "public, shared");
    let mut scope = match db.scope_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to create audit log scope: {}", e);
            return;
        }
    };
    // 从请求级审计上下文补全来源信息：IP / User-Agent / 当前 Claims 租户。
    // 无请求上下文的后台调用回退 nil 租户，配合 scope_system 命中系统通道。
    let audit_ctx = current_audit_context();
    let tenant_id = audit_ctx
        .as_ref()
        .and_then(|ctx| ctx.tenant_id)
        .unwrap_or_else(uuid::Uuid::nil);
    let ip_address = audit_ctx.as_ref().and_then(|ctx| ctx.ip_address.as_deref());
    let user_agent = audit_ctx.as_ref().and_then(|ctx| ctx.user_agent.as_deref());
    // 创建 / 改密 / 注册等请求体可能携带明文口令，落库前必须脱敏。
    let request_body = request_body.as_ref().map(redact_sensitive_json);
    let response_body = response_body.as_ref().map(redact_sensitive_json);

    let result = sqlx::query(
        r#"
        INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, request_details, response_details, status, ip_address, user_agent, created_at)
        VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        "#,
    )
    // user_id 与 entity_id 都是 uuid 列，字符串必须先解析；解析失败写 NULL，
    // 避免再次出现 "column user_id is of type uuid but expression is of type text"。
    .bind(tenant_id)
    .bind(uuid::Uuid::parse_str(user_id).ok())
    .bind(action)
    .bind(resource_type)
    .bind(uuid::Uuid::parse_str(resource_id).ok())
    .bind(request_body)
    .bind(response_body)
    .bind(if status < 400 { "success" } else { "failed" })
    .bind(ip_address)
    .bind(user_agent)
    .execute(&mut scope)
    .await;

    let _ = scope.commit().await;

    if let Err(e) = result {
        tracing::error!("Failed to record audit log: {}", e);
    }
}

pub(crate) fn is_valid_email(email: &str) -> bool {
    EMAIL_REGEX.is_match(email)
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = UserResponse)]
pub(crate) struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub role: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    /// BE-09 P1-1：前端契约为 `isactive`（Django 风格，schemas/iam/user.ts:184 读 row.isactive）；
    /// alias 保留 `is_active` 旧键兼容 Deserialize。
    #[serde(rename = "isactive", alias = "is_active")]
    pub is_active: bool,
    pub is_superuser: bool,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(sqlx::FromRow)]
pub(crate) struct UserRow {
    pub id: uuid::Uuid,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub status: String,
    pub is_superuser: bool,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// P0-4：从规范化授权表实时解析用户角色与权限，与刷新换发（auth.rs refresh）同构：
/// `core_user_roles → core_roles`（角色名）、`core_user_roles → core_role_permissions →
/// core_permissions`（权限码）。采用运行时纯查询（非 sqlx 编译期宏），不依赖离线缓存。
/// 无角色授权时 roles 保持空数组，不再伪造成 `["user"]`；permissions 允许为空
///（精确授权由后端中间件依据 JWT 判定）。供 `/users/me`、`/permissions/my-permissions` 复用，
/// 登录签发在 auth.rs 以同一规范化结果组装 claims，保证 login 与 refresh 两路一致。
pub(crate) async fn resolve_user_grants(
    db: &Db,
    user_id: uuid::Uuid,
) -> (Vec<String>, Vec<String>) {
    // 「按 user_id 查授权」是系统读（设计文档 §6.4）：登录/刷新无 Claims，
    // 统一走系统通道，避免依赖请求上下文或裸池（裸池在严格 RLS 下恒 0 行）。
    let mut scope = match db.scope_read_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::warn!("解析用户授权失败（数据库作用域创建）: {}", e);
            return (Vec::new(), Vec::new());
        }
    };

    let roles: Vec<String> = sqlx::query(
        r#"
        SELECT COALESCE(ARRAY_AGG(DISTINCT r.name), '{}') AS roles
        FROM public.core_user_roles ur
        JOIN public.core_roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await
    .ok()
    .flatten()
    .and_then(|row| row.try_get::<Vec<String>, _>("roles").ok())
    .unwrap_or_default();

    let permissions: Vec<String> = sqlx::query(
        r#"
        SELECT COALESCE(ARRAY_AGG(DISTINCT p.code), '{}') AS permissions
        FROM public.core_user_roles ur
        JOIN public.core_role_permissions rp ON rp.role_id = ur.role_id
        JOIN public.core_permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await
    .ok()
    .flatten()
    .and_then(|row| row.try_get::<Vec<String>, _>("permissions").ok())
    .unwrap_or_default();

    let _ = scope.commit().await;

    (roles, permissions)
}

/// 超管回显：DB 全量权限目录 code（平台目录，系统通道读取，与 `resolve_user_grants` 同范式）。
/// 取代 shared-auth 内存目录占位，保证超管/普通用户回显同源 DB 目录。
pub(crate) async fn superuser_permission_codes(db: &Db) -> Vec<String> {
    let mut scope = match db.scope_read_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::warn!("解析超管权限目录失败（数据库作用域创建）: {}", e);
            return Vec::new();
        }
    };
    let codes =
        sqlx::query_scalar::<_, String>("SELECT code FROM public.core_permissions ORDER BY code")
            .fetch_all(&mut scope)
            .await
            .unwrap_or_default();
    let _ = scope.commit().await;
    codes
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub(crate) struct PreferenceRow {
    pub preference_value: serde_json::Value,
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
#[allow(clippy::mixed_attributes_style)]
mod tests {
    #![cfg(feature = "db-tests")]
    use super::*;

    #[test]
    fn test_is_valid_email_valid_cases() {
        assert!(is_valid_email("user@example.com"));
        assert!(is_valid_email("user.name+tag@domain.co.uk"));
        assert!(is_valid_email("admin@company.org"));
        assert!(is_valid_email("test_user123@sub.domain.io"));
        assert!(is_valid_email("a@b.cd"));
    }

    #[test]
    fn test_is_valid_email_invalid_cases() {
        assert!(!is_valid_email("notanemail"));
        assert!(!is_valid_email("@missinguser.com"));
        assert!(!is_valid_email("user@"));
        assert!(!is_valid_email("user@.com"));
        assert!(!is_valid_email("user@domain"));
        assert!(!is_valid_email(""));
        assert!(!is_valid_email("   "));
    }

    #[test]
    fn test_list_users_params() {
        let params = ListUsersParams {
            page: Some(2),
            page_size: Some(50),
        };
        assert_eq!(params.page, Some(2));
        assert_eq!(params.page_size, Some(50));
    }

    #[test]
    fn test_list_users_params_default_none() {
        let params = ListUsersParams {
            page: None,
            page_size: None,
        };
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_user_response_clone_and_serde() {
        let ur = UserResponse {
            id: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            full_name: Some("Test User".to_string()),
            role: "user".to_string(),
            roles: vec!["user".to_string(), "editor".to_string()],
            permissions: vec!["doc:read".to_string()],
            is_active: true,
            is_superuser: false,
            created_at: Some(
                chrono::DateTime::parse_from_rfc3339("2024-01-15T10:30:00Z")
                    .unwrap()
                    .with_timezone(&chrono::Utc),
            ),
        };
        let cloned = ur.clone();
        assert_eq!(cloned.username, "testuser");
        assert_eq!(cloned.roles.len(), 2);

        let json =
            serde_json::to_string(&ur).unwrap_or_else(|e| panic!("serde serialize failed: {e}"));
        let de: UserResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, ur.id);
        assert!(de.is_active);
        assert!(de.full_name.is_some());
    }

    #[test]
    fn test_preference_row() {
        let row = PreferenceRow {
            preference_value: serde_json::json!({"theme": "dark", "lang": "zh-CN"}),
        };
        assert_eq!(row.preference_value["theme"], "dark");
        assert_eq!(row.preference_value["lang"], "zh-CN");
    }

    topems_test_support::sqlx_dsn_guard!();
    #[sqlx::test(migrations = false)]
    async fn test_record_audit_log_redacts_password_and_fills_context(pool: sqlx::PgPool) {
        sqlx::query("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query(
            r#"CREATE TABLE public.audit_logs (
                id UUID PRIMARY KEY,
                tenant_id UUID,
                user_id UUID,
                action TEXT,
                entity_type TEXT,
                entity_id UUID,
                request_details JSONB,
                response_details JSONB,
                status TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )"#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let tenant = uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let operator = "550e8400-e29b-41d4-a716-446655440000";
        let resource = "550e8400-e29b-41d4-a716-446655440001";
        let ctx = topems_shared_auth::security::audit_logger::AuditRequestContext {
            tenant_id: Some(tenant),
            ip_address: Some("10.0.0.1".to_string()),
            user_agent: Some("curl/8".to_string()),
            ..Default::default()
        };

        topems_shared_auth::security::audit_logger::scope_audit_context(ctx, async {
            record_audit_log(
                &pool,
                operator,
                "create",
                "user",
                resource,
                Some(serde_json::json!({
                    "username": "bob",
                    "password": "Test@123456",
                    "confirmPassword": "Test@123456"
                })),
                Some(serde_json::json!({"success": true})),
                201,
            )
            .await;
        })
        .await;

        let row = sqlx::query(
            r#"SELECT tenant_id, user_id::text AS user_id, ip_address, user_agent, request_details, status
               FROM public.audit_logs"#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let details: serde_json::Value = sqlx::Row::get(&row, "request_details");

        assert_eq!(
            sqlx::Row::get::<Option<uuid::Uuid>, _>(&row, "tenant_id")
                .map(|t| t.to_string())
                .as_deref(),
            Some("00000000-0000-0000-0000-000000000001")
        );
        assert_eq!(
            sqlx::Row::get::<Option<String>, _>(&row, "user_id").as_deref(),
            Some(operator)
        );
        assert_eq!(
            sqlx::Row::get::<Option<String>, _>(&row, "ip_address").as_deref(),
            Some("10.0.0.1")
        );
        assert_eq!(
            sqlx::Row::get::<Option<String>, _>(&row, "user_agent").as_deref(),
            Some("curl/8")
        );
        assert_eq!(details["password"], "[REDACTED]");
        assert_eq!(details["confirmPassword"], "[REDACTED]");
        assert!(!details.to_string().contains("Test@123456"));
    }
}
