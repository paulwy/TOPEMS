use serde::Deserialize;
use topems_shared_db::repository::ListQueryParams;
use uuid::Uuid;

use topems_shared_service_client::service_client::{
    api::finance_api::FinanceApi, TypedServiceClient,
};

/// 调用 Finance Core 审批接口（使用共享 TypedServiceClient<FinanceApi>）
pub async fn call_finance_core_approval(
    finance_client: &TypedServiceClient<FinanceApi>,
    doc_type: &str,
    doc_id: Uuid,
    doc_no: &str,
    action: &str,
    _username: &str,
    rejection_reason: Option<&str>,
    comment: Option<&str>,
) -> Result<(), String> {
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
pub struct PaginationParams {
    #[serde(flatten)]
    pub base: ListQueryParams,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub scope_id: Option<Uuid>,
    pub report_type: Option<String>,
    pub period_from: Option<String>,
    pub period_to: Option<String>,
}
