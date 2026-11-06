use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use sqlx::Row;
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
    let result = sqlx::query(
        r#"
        INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, request_details, response_details, status, created_at)
        VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
        "#,
    )
    // 审计日志为无 claims 的内部路径：租户位绑 nil UUID，配合 scope_system 显式
    // 命中系统通道（nil 租户 + app.rls_system='on'）；
    // 不再硬编码真实租户 ...0001 —— 超管/nil 上下文会被幸存严格策略拒绝。
    .bind(uuid::Uuid::nil())
    .bind(uuid::Uuid::parse_str(user_id).ok())
    .bind(action)
    .bind(resource_type)
    .bind(uuid::Uuid::parse_str(resource_id).ok())
    .bind(request_body)
    .bind(response_body)
    .bind(if status < 400 { "success" } else { "failed" })
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
/// 无角色授权时 roles 回退 `["user"]`，兼容前端 `hasRole('user')` 形状；permissions 允许为空
///（精确授权由后端中间件依据 JWT 判定）。供 `/users/me`、`/permissions/my-permissions` 复用，
/// 登录签发在 auth.rs 以同一规范化结果组装 claims，保证 login 与 refresh 两路一致。
pub(crate) async fn resolve_user_grants(
    pool: &sqlx::PgPool,
    user_id: uuid::Uuid,
) -> (Vec<String>, Vec<String>) {
    let roles: Vec<String> = sqlx::query(
        r#"
        SELECT COALESCE(ARRAY_AGG(DISTINCT r.name), '{}') AS roles
        FROM public.core_user_roles ur
        JOIN public.core_roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool)
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
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
    .and_then(|row| row.try_get::<Vec<String>, _>("permissions").ok())
    .unwrap_or_default();

    let roles = if roles.is_empty() {
        vec!["user".to_string()]
    } else {
        roles
    };
    (roles, permissions)
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub(crate) struct PreferenceRow {
    pub preference_value: serde_json::Value,
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
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
}
