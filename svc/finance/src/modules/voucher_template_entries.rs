use axum::extract::{Extension, Path, State};
use serde::Deserialize;
use topems_shared_boundary::only_own_schema_query;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::services::finance::voucher_template::VoucherTemplateLine;
use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize, IntoParams)]
pub struct TemplateEntryPathParams {
    pub template_id: Uuid,
    pub entry_id: Uuid,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct TemplatePathParams {
    pub template_id: Uuid,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AddTemplateEntryRequest {
    pub description: Option<String>,
    pub account_code: String,
    pub direction: String,
    pub amount_formula: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateTemplateEntryRequest {
    pub description: Option<String>,
    pub account_code: Option<String>,
    pub direction: Option<String>,
    pub amount_formula: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReorderEntriesRequest {
    pub entry_ids: Vec<Uuid>,
}

pub async fn list_entries(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Path(template_id): Path<Uuid>,
) -> ApiResponse<Vec<VoucherTemplateLine>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service
        .get_voucher_template(tenant_id, template_id, txn)
        .await
    {
        Ok(_) => {
            let mut scope = match state.db.scope_with(&mut *txn).await {
                Ok(s) => s,
                Err(e) => return crate::shared::err_resp(e),
            };
            let lines: Vec<VoucherTemplateLine> = sqlx::query_as(
                only_own_schema_query!("finance", "SELECT id, template_id, description, account_code, direction, amount_formula, sort_order, created_at FROM finance_voucher_template_lines WHERE template_id = $1  ORDER BY sort_order, created_at"),
            )
            .bind(template_id)
        .fetch_all(&mut scope)
            .await
            .unwrap_or_default();
            let _ = scope.commit().await;
            ApiResponse::success(lines, "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn get_entry(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path((template_id, entry_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<VoucherTemplateLine> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let line: Option<VoucherTemplateLine> = sqlx::query_as(
        only_own_schema_query!("finance", "SELECT l.id, l.template_id, l.description, l.account_code, l.direction, l.amount_formula, l.sort_order, l.created_at FROM finance_voucher_template_lines l JOIN finance_voucher_templates t ON l.template_id = t.id WHERE l.template_id = $1 AND l.id = $2"),
    )
    .bind(template_id)
    .bind(entry_id)
    .fetch_optional(&mut scope)
    .await
    .unwrap_or(None);
    let _ = scope.commit().await;
    match line {
        Some(l) => ApiResponse::success(l, "查询成功"),
        None => ApiResponse::not_found("模板分录不存在"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_template_entry_request_deserialize() {
        let json = r#"{
            "description": "借方分录",
            "account_code": "1001",
            "direction": "debit",
            "amount_formula": "amount * 0.1",
            "sort_order": 1
        }"#;
        let request: AddTemplateEntryRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.description.as_deref(), Some("借方分录"));
        assert_eq!(request.account_code, "1001");
        assert_eq!(request.direction, "debit");
        assert_eq!(request.amount_formula.as_deref(), Some("amount * 0.1"));
        assert_eq!(request.sort_order, Some(1));
    }

    #[test]
    fn test_add_template_entry_request_minimal() {
        let json = r#"{"account_code": "1002", "direction": "credit"}"#;
        let request: AddTemplateEntryRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.account_code, "1002");
        assert_eq!(request.direction, "credit");
        assert!(request.description.is_none());
        assert!(request.amount_formula.is_none());
        assert!(request.sort_order.is_none());
    }

    #[test]
    fn test_update_template_entry_request_deserialize() {
        let json = r#"{"description": "更新描述", "sort_order": 2}"#;
        let request: UpdateTemplateEntryRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.description.as_deref(), Some("更新描述"));
        assert_eq!(request.sort_order, Some(2));
        assert!(request.account_code.is_none());
        assert!(request.direction.is_none());
    }

    #[test]
    fn test_reorder_entries_request_deserialize() {
        let json = r#"{"entry_ids": ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440001"]}"#;
        let request: ReorderEntriesRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.entry_ids.len(), 2);
    }
}
