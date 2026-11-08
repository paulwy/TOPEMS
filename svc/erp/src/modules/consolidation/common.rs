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
