use axum::http::HeaderMap;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use topems_shared_db::{repository::ListQueryParams, AuditLogService};
use uuid::Uuid;

use topems_shared_service_client::service_client::{
    api::finance_api::FinanceApi, TypedServiceClient,
};

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
) -> Result<(), String> {
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
        _ => return Err(format!("Unknown action: {}", action)),
    };

    let result = match action {
        "submit" => finance_client.submit_approval(&body).await,
        "approve" => finance_client.approve_approval(&body).await,
        "reject" => finance_client.reject_approval(&body).await,
        "cancel" => finance_client.cancel_approval(&body).await,
        _ => return Err(format!("Unknown action: {}", action)),
    };

    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Finance Core returned error: {}", e)),
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
