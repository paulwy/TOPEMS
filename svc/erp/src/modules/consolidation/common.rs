use axum::http::HeaderMap;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::{repository::ListQueryParams, AuditLogService};
use topems_shared_service_client::service_client::{
    api::finance_api::FinanceApi, TypedServiceClient,
};
use uuid::Uuid;

/// 合并模块动作级权限门（精确匹配 `core_permissions.code`）。
///
/// 普通 ERP 用户只持有 `erp:read`/`erp:write` 等模块级码，不会自动获得这些动作码，
/// 因此生成、发布、执行抵消必须单独授权。
pub fn require_action_permission<T>(
    claims: &Claims,
    code: &str,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.has_permission(code) {
        Ok(())
    } else {
        Err(axum::Json(ApiResponse::forbidden(&format!(
            "权限不足：需要 {} 权限",
            code
        ))))
    }
}

/// 主体数据范围档位（与 core_user_company_scopes.access_level 一致）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CompanyAccess {
    Read,
    Write,
    Consolidate,
}

impl CompanyAccess {
    fn rank(self) -> i32 {
        match self {
            CompanyAccess::Read => 1,
            CompanyAccess::Write => 2,
            CompanyAccess::Consolidate => 3,
        }
    }

    fn rank_of(level: &str) -> i32 {
        match level {
            "consolidate" => 3,
            "write" => 2,
            _ => 1,
        }
    }
}

#[derive(Debug)]
pub enum CompanyScopeError {
    /// 公司不存在，或不属于当前租户。
    NotFound,
    /// 存在该主体，但当前用户没有对应档位（含未配置任何 scope 的 fail-closed 场景）。
    Forbidden,
    Db(sqlx::Error),
}

impl From<CompanyScopeError> for TopemsError {
    fn from(err: CompanyScopeError) -> Self {
        match err {
            CompanyScopeError::NotFound => {
                TopemsError::ResourceNotFound("主体不存在或不属于当前租户".to_string())
            }
            CompanyScopeError::Forbidden => TopemsError::PermissionDenied {
                required: "company-scope".to_string(),
            },
            CompanyScopeError::Db(e) => {
                tracing::error!("主体范围校验失败: {}", e);
                TopemsError::Internal("主体范围校验失败".to_string())
            }
        }
    }
}

/// 校验当前用户对指定法人主体的数据范围。
///
/// 顺序：先判「主体是否存在/属于本租户」（404），再判「是否有权限」（403），
/// 两者可区分。平台超级管理员跳过 scope 记录检查，但仍需主体真实存在。
/// 未配置任何 scope 记录一律拒绝（fail-closed）。
pub async fn ensure_company_scope(
    conn: &mut sqlx::PgConnection,
    claims: &Claims,
    company_id: Uuid,
    required: CompanyAccess,
) -> Result<(), CompanyScopeError> {
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let company_tenant: Option<Uuid> = sqlx::query_scalar(
        "SELECT tenant_id FROM hrm.companies WHERE id = $1 AND deleted_at IS NULL AND ($2::uuid IS NULL OR tenant_id = $2)",
    )
    .bind(company_id)
    .bind(tenant_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(CompanyScopeError::Db)?;

    let Some(company_tenant) = company_tenant else {
        return Err(CompanyScopeError::NotFound);
    };

    if claims.is_superuser {
        return Ok(());
    }

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Err(CompanyScopeError::Forbidden),
    };

    let level: Option<String> = sqlx::query_scalar(
        "SELECT access_level FROM public.core_user_company_scopes WHERE tenant_id = $1 AND user_id = $2 AND company_id = $3",
    )
    .bind(company_tenant)
    .bind(user_id)
    .bind(company_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(CompanyScopeError::Db)?;

    match level {
        Some(level) if CompanyAccess::rank_of(&level) >= required.rank() => Ok(()),
        _ => Err(CompanyScopeError::Forbidden),
    }
}

/// 将主体范围校验错误转换为 HTTP 响应。
pub fn company_scope_error<T>(err: CompanyScopeError) -> ApiResponse<T> {
    match err {
        CompanyScopeError::NotFound => ApiResponse::from(TopemsError::ResourceNotFound(
            "主体不存在或不属于当前租户".to_string(),
        )),
        CompanyScopeError::Forbidden => {
            ApiResponse::forbidden("无主体权限：当前用户未配置该法人的主体范围")
        }
        CompanyScopeError::Db(e) => {
            tracing::error!("主体范围校验失败: {}", e);
            ApiResponse::server_error("主体范围校验失败")
        }
    }
}

pub async fn log_audit(
    pool: &PgPool,
    action: &str,
    entity_type: &str,
    entity_id: Option<Uuid>,
    headers: &HeaderMap,
) {
    let username = headers.get("x-username").and_then(|v| v.to_str().ok());
    let svc = AuditLogService::new(pool.clone());
    let _ = svc
        .log_operation(
            action,
            entity_type,
            entity_id,
            username,
            None,
            "success",
            None,
        )
        .await;
}

#[allow(clippy::indexing_slicing)] // pos/job_pos/idx 由 position() 前置校验（Some 或 else 提前返回）保证存在，索引数学安全
pub async fn call_finance_core_approval(
    finance_client: &TypedServiceClient<FinanceApi>,
    pool: &PgPool,
    doc_type: &str,
    doc_id: Uuid,
    doc_no: &str,
    action: &str,
    username: &str,
    rejection_reason: Option<&str>,
    comment: Option<&str>,
) -> Result<(), TopemsError> {
    let action_tag = match action {
        "submit" => "approval_submit",
        "approve" => "approval_approve",
        "reject" => "approval_reject",
        "cancel" => "approval_cancel",
        _ => action,
    };
    let mut details = json!({ "doc_no": doc_no });
    if let Some(r) = rejection_reason {
        details["rejection_reason"] = json!(r);
    }
    if let Some(c) = comment {
        details["comment"] = json!(c);
    }
    let svc = AuditLogService::new(pool.clone());
    if let Err(e) = svc
        .log_operation(
            action_tag,
            doc_type,
            Some(doc_id),
            Some(username),
            Some(details),
            "success",
            None,
        )
        .await
    {
        tracing::warn!(
            "本地审计日志双写失败: action={}, doc_type={}, doc_id={}, error={}",
            action_tag,
            doc_type,
            doc_id,
            e
        );
    }

    let body = match action {
        "submit" => serde_json::json!({
            "doc_type": doc_type,
            "doc_id": doc_id,
            "doc_no": doc_no
        }),
        "approve" => serde_json::json!([
            doc_type,
            doc_id.to_string(),
            {"comment": comment}
        ]),
        "reject" => serde_json::json!([
            doc_type,
            doc_id.to_string(),
            {"reason": rejection_reason, "comment": comment}
        ]),
        "cancel" => serde_json::json!([doc_type, doc_id.to_string()]),
        _ => {
            return Err(TopemsError::BusinessLogic(format!(
                "Unknown action: {}",
                action
            )))
        }
    };

    let result = match action {
        "submit" => finance_client.submit_approval(&body).await,
        "approve" => finance_client.approve_approval(&body).await,
        "reject" => finance_client.reject_approval(&body).await,
        "cancel" => finance_client.cancel_approval(&body).await,
        _ => {
            return Err(TopemsError::BusinessLogic(format!(
                "Unknown action: {}",
                action
            )))
        }
    };

    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(TopemsError::BusinessLogic(format!(
            "Finance Core returned error: {}",
            e
        ))),
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    fn claims(permissions: Vec<String>, is_superuser: bool) -> Claims {
        Claims {
            sub: "11111111-1111-1111-1111-111111111111".to_string(),
            username: "tester".to_string(),
            role: "employee".to_string(),
            roles: vec!["employee".to_string()],
            permissions,
            is_superuser,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    #[test]
    fn action_permission_denies_module_level_erp_user() {
        let c = claims(vec!["erp:read".to_string(), "erp:write".to_string()], false);
        assert!(require_action_permission::<()>(&c, "erp:consolidation-report:write").is_err());
    }

    #[test]
    fn action_permission_allows_exact_code_and_superuser() {
        let c = claims(vec!["erp:consolidation-report:write".to_string()], false);
        assert!(require_action_permission::<()>(&c, "erp:consolidation-report:write").is_ok());

        let su = claims(Vec::new(), true);
        assert!(
            require_action_permission::<()>(&su, "erp:consolidation-elimination:write").is_ok()
        );
    }
}

#[derive(Debug, Deserialize)]
pub struct ConsolidationListParams {
    #[serde(flatten)]
    pub base: ListQueryParams,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub scope_id: Option<Uuid>,
    pub report_type: Option<String>,
    pub period_from: Option<String>,
    pub period_to: Option<String>,
}

#[cfg(test)]
mod company_scope_tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{ensure_company_scope, CompanyAccess, CompanyScopeError};
    use topems_shared_auth::auth::Claims;
    use uuid::Uuid;

    fn claims_for(user: Uuid, tenant: Uuid) -> Claims {
        Claims {
            sub: user.to_string(),
            username: "tester".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: Some(tenant.to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    async fn setup(pool: &sqlx::PgPool) {
        sqlx::query("CREATE SCHEMA IF NOT EXISTS hrm")
            .execute(pool)
            .await
            .unwrap();
        sqlx::query(
            r#"CREATE TABLE IF NOT EXISTS hrm.companies (
                id uuid PRIMARY KEY,
                tenant_id uuid NOT NULL,
                name varchar(255) NOT NULL,
                deleted_at timestamptz
            )"#,
        )
        .execute(pool)
        .await
        .unwrap();
        sqlx::query(
            r#"CREATE TABLE IF NOT EXISTS public.core_user_company_scopes (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id uuid NOT NULL,
                user_id uuid NOT NULL,
                company_id uuid NOT NULL,
                access_level varchar(20) NOT NULL
            )"#,
        )
        .execute(pool)
        .await
        .unwrap();
    }

    async fn insert_company(pool: &sqlx::PgPool, tenant: Uuid) -> Uuid {
        let id = Uuid::new_v4();
        sqlx::query("INSERT INTO hrm.companies (id, tenant_id, name) VALUES ($1, $2, '测试公司')")
            .bind(id)
            .bind(tenant)
            .execute(pool)
            .await
            .unwrap();
        id
    }

    #[sqlx::test(migrations = false)]
    async fn missing_company_returns_not_found(pool: sqlx::PgPool) {
        setup(&pool).await;
        let tenant = Uuid::new_v4();
        let mut conn = pool.acquire().await.unwrap();
        let err = ensure_company_scope(
            &mut *conn,
            &claims_for(Uuid::new_v4(), tenant),
            Uuid::new_v4(),
            CompanyAccess::Read,
        )
        .await
        .unwrap_err();
        assert!(matches!(err, CompanyScopeError::NotFound));
    }

    #[sqlx::test(migrations = false)]
    async fn cross_tenant_company_returns_not_found(pool: sqlx::PgPool) {
        setup(&pool).await;
        let tenant_a = Uuid::new_v4();
        let tenant_b = Uuid::new_v4();
        let company_b = insert_company(&pool, tenant_b).await;
        let mut conn = pool.acquire().await.unwrap();
        let err = ensure_company_scope(
            &mut *conn,
            &claims_for(Uuid::new_v4(), tenant_a),
            company_b,
            CompanyAccess::Read,
        )
        .await
        .unwrap_err();
        assert!(matches!(err, CompanyScopeError::NotFound));
    }

    #[sqlx::test(migrations = false)]
    async fn no_scope_row_is_forbidden_fail_closed(pool: sqlx::PgPool) {
        setup(&pool).await;
        let tenant = Uuid::new_v4();
        let company = insert_company(&pool, tenant).await;
        let mut conn = pool.acquire().await.unwrap();
        let err = ensure_company_scope(
            &mut *conn,
            &claims_for(Uuid::new_v4(), tenant),
            company,
            CompanyAccess::Read,
        )
        .await
        .unwrap_err();
        assert!(matches!(err, CompanyScopeError::Forbidden));
    }

    #[sqlx::test(migrations = false)]
    async fn read_scope_allows_read_but_not_write(pool: sqlx::PgPool) {
        setup(&pool).await;
        let tenant = Uuid::new_v4();
        let user = Uuid::new_v4();
        let company = insert_company(&pool, tenant).await;
        sqlx::query(
            "INSERT INTO public.core_user_company_scopes (tenant_id, user_id, company_id, access_level) VALUES ($1, $2, $3, 'read')",
        )
        .bind(tenant)
        .bind(user)
        .bind(company)
        .execute(&pool)
        .await
        .unwrap();
        let mut conn = pool.acquire().await.unwrap();
        let claims = claims_for(user, tenant);
        assert!(
            ensure_company_scope(&mut *conn, &claims, company, CompanyAccess::Read)
                .await
                .is_ok()
        );
        let err = ensure_company_scope(&mut *conn, &claims, company, CompanyAccess::Write)
            .await
            .unwrap_err();
        assert!(matches!(err, CompanyScopeError::Forbidden));
    }

    #[sqlx::test(migrations = false)]
    async fn write_scope_covers_write_and_read(pool: sqlx::PgPool) {
        setup(&pool).await;
        let tenant = Uuid::new_v4();
        let user = Uuid::new_v4();
        let company = insert_company(&pool, tenant).await;
        sqlx::query(
            "INSERT INTO public.core_user_company_scopes (tenant_id, user_id, company_id, access_level) VALUES ($1, $2, $3, 'write')",
        )
        .bind(tenant)
        .bind(user)
        .bind(company)
        .execute(&pool)
        .await
        .unwrap();
        let mut conn = pool.acquire().await.unwrap();
        let claims = claims_for(user, tenant);
        assert!(
            ensure_company_scope(&mut *conn, &claims, company, CompanyAccess::Write)
                .await
                .is_ok()
        );
        assert!(
            ensure_company_scope(&mut *conn, &claims, company, CompanyAccess::Read)
                .await
                .is_ok()
        );
    }
}
