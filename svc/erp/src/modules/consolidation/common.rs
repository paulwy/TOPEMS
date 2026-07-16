use reqwest::Client;
use serde::Deserialize;
use uuid::Uuid;

pub async fn call_finance_core_approval(
    doc_type: &str,
    doc_id: Uuid,
    doc_no: &str,
    action: &str,
    _username: &str,
    rejection_reason: Option<&str>,
    comment: Option<&str>,
) -> Result<(), String> {
    let client = Client::new();
    let finance_core_url =
        std::env::var("FINANCE_CORE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());

    let relative_path = match action {
        "submit" => "/api/finance/approvals/submit",
        "approve" => "/api/finance/approvals/approve",
        "reject" => "/api/finance/approvals/reject",
        "cancel" => "/api/finance/approvals/cancel",
        _ => return Err(format!("Unknown action: {}", action)),
    };

    let url = format!("{}{}", finance_core_url, relative_path);

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

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to call Finance Core: {}", e))?;

    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        Err(format!("Finance Core returned error: {}", status))
    }
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub scope_id: Option<Uuid>,
    pub report_type: Option<String>,
    pub period_from: Option<String>,
    pub period_to: Option<String>,
}
