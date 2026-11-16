use axum::extract::{Extension, Json, Path, State};
use chrono::Utc;
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
    let tenant_id_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };
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
                only_own_schema_query!("finance", "SELECT id, template_id, description, account_code, direction, amount_formula, sort_order, created_at FROM finance_voucher_template_lines WHERE template_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)  ORDER BY sort_order, created_at"),
            )
            .bind(template_id)
            .bind(tenant_id_opt)
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
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path((template_id, entry_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<VoucherTemplateLine> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let line: Option<VoucherTemplateLine> = sqlx::query_as(
        only_own_schema_query!("finance", "SELECT l.id, l.template_id, l.description, l.account_code, l.direction, l.amount_formula, l.sort_order, l.created_at FROM finance_voucher_template_lines l JOIN finance_voucher_templates t ON l.template_id = t.id WHERE ($1::uuid IS NULL OR t.tenant_id = $1) AND l.template_id = $2 AND l.id = $3"),
    )
    .bind(tenant_id)
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

pub async fn create_entry(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<AddTemplateEntryRequest>,
) -> ApiResponse<VoucherTemplateLine> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut read_scope = match state.db.scope_with(&mut *txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance_voucher_templates WHERE tenant_id = $1 AND id = $2"
    ))
    .bind(tenant_id)
    .bind(template_id)
    .fetch_one(&mut read_scope)
    .await
    .unwrap_or(0);
    if count == 0 {
        return ApiResponse::not_found("凭证模板不存在");
    }
    let sort_order: i32 = match req.sort_order {
        Some(s) => s,
        None => {
            let max_order: i32 = sqlx::query_scalar(
                only_own_schema_query!("finance", "SELECT COALESCE(MAX(sort_order), 0) FROM finance_voucher_template_lines WHERE template_id = $1"),
            )
            .bind(template_id)
            .fetch_one(&mut read_scope)
            .await
            .unwrap_or(0);
            max_order + 1
        }
    };
    let _ = read_scope.commit().await;
    let line_id = Uuid::new_v4();
    let now = Utc::now();
    let mut scope = match state.db.scope_with(&mut *txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let line: Result<VoucherTemplateLine, sqlx::Error> = sqlx::query_as(
        only_own_schema_query!("finance", r#"INSERT INTO finance_voucher_template_lines
            (id, template_id, description, account_code, direction, amount_formula, sort_order, created_at, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, template_id, description, account_code, direction, amount_formula, sort_order, created_at"#),
    )
    .bind(line_id)
    .bind(template_id)
    .bind(&req.description)
    .bind(&req.account_code)
    .bind(&req.direction)
    .bind(&req.amount_formula)
    .bind(sort_order)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;
    match line {
        Ok(l) => {
            if let Err(e) = scope.commit().await {
                return crate::shared::err_resp(e);
            }
            ApiResponse::success(l, "新增分录成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn update_entry(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path((template_id, entry_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateTemplateEntryRequest>,
) -> ApiResponse<VoucherTemplateLine> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut read_scope = match state.db.scope_with(&mut *txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let owns: i64 = sqlx::query_scalar(
        only_own_schema_query!("finance", "SELECT COUNT(*) FROM finance_voucher_template_lines l JOIN finance_voucher_templates t ON l.template_id = t.id WHERE t.tenant_id = $1 AND l.template_id = $2 AND l.id = $3"),
    )
    .bind(tenant_id)
    .bind(template_id)
    .bind(entry_id)
    .fetch_one(&mut read_scope)
    .await
    .unwrap_or(0);
    if owns == 0 {
        return ApiResponse::not_found("模板分录不存在");
    }
    let existing: VoucherTemplateLine =
        match sqlx::query_as(only_own_schema_query!("finance", "SELECT id, template_id, description, account_code, direction, amount_formula, sort_order, created_at FROM finance_voucher_template_lines WHERE id = $1"))
            .bind(entry_id)
            .fetch_one(&mut read_scope)
            .await
        {
            Ok(l) => l,
            Err(e) => return crate::shared::err_resp(e),
        };
    let _ = read_scope.commit().await;
    let description = req.description.or(existing.description);
    let account_code = req.account_code.unwrap_or(existing.account_code);
    let direction = req.direction.unwrap_or(existing.direction);
    let amount_formula = req.amount_formula.or(existing.amount_formula);
    let sort_order = req.sort_order.unwrap_or(existing.sort_order);
    let mut scope = match state.db.scope_with(&mut *txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let line: Result<VoucherTemplateLine, sqlx::Error> = sqlx::query_as(
        only_own_schema_query!("finance", r#"UPDATE finance_voucher_template_lines
              SET description = $1, account_code = $2, direction = $3,
                  amount_formula = $4, sort_order = $5
            WHERE id = $6
           RETURNING id, template_id, description, account_code, direction, amount_formula, sort_order, created_at"#),
    )
    .bind(description)
    .bind(account_code)
    .bind(direction)
    .bind(amount_formula)
    .bind(sort_order)
    .bind(entry_id)
    .fetch_one(&mut scope)
    .await;
    match line {
        Ok(l) => {
            if let Err(e) = scope.commit().await {
                return crate::shared::err_resp(e);
            }
            ApiResponse::success(l, "更新分录成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

pub async fn delete_entry(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path((template_id, entry_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let res = match sqlx::query(
        only_own_schema_query!("finance", "DELETE FROM finance_voucher_template_lines WHERE id = $1 AND template_id = $2 AND EXISTS (SELECT 1 FROM finance_voucher_templates WHERE id = $2 AND tenant_id = $3)"),
    )
    .bind(entry_id)
    .bind(template_id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        Ok(r) => r,
        Err(e) => return crate::shared::err_resp(e),
    };
    if let Err(e) = scope.commit().await {
        return crate::shared::err_resp(e);
    }
    if res.rows_affected() == 0 {
        return ApiResponse::not_found("模板分录不存在");
    }
    ApiResponse::success(
        serde_json::json!({"deleted": true, "entry_id": entry_id}),
        "删除分录成功",
    )
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
pub async fn reorder_entries(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<ReorderEntriesRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut read_scope = match state.db.scope_with(&mut *txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance_voucher_templates WHERE tenant_id = $1 AND id = $2"
    ))
    .bind(tenant_id)
    .bind(template_id)
    .fetch_one(&mut read_scope)
    .await
    .unwrap_or(0);
    if count == 0 {
        return ApiResponse::not_found("凭证模板不存在");
    }
    let _ = read_scope.commit().await;
    let mut scope = match state.db.scope_with(&mut *txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    for (idx, entry_id) in req.entry_ids.iter().enumerate() {
        let sort_order = (idx + 1) as i32;
        if let Err(e) = sqlx::query(
            only_own_schema_query!("finance", "UPDATE finance_voucher_template_lines SET sort_order = $1 WHERE id = $2 AND template_id = $3"),
        )
        .bind(sort_order)
        .bind(entry_id)
        .bind(template_id)
        .execute(&mut scope)
        .await
        {
            return crate::shared::err_resp(e);
        }
    }
    let lines: Result<Vec<VoucherTemplateLine>, sqlx::Error> = sqlx::query_as(
        only_own_schema_query!("finance", "SELECT id, template_id, description, account_code, direction, amount_formula, sort_order, created_at FROM finance_voucher_template_lines WHERE template_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid) ORDER BY sort_order, created_at"),
    )
    .bind(template_id)
    .bind(tenant_id)
    .fetch_all(&mut scope)
    .await;
    match lines {
        Ok(ls) => {
            if let Err(e) = scope.commit().await {
                return crate::shared::err_resp(e);
            }
            let json_lines: Vec<serde_json::Value> = ls
                .iter()
                .map(|l| serde_json::to_value(l).unwrap_or(serde_json::json!({})))
                .collect();
            ApiResponse::success(
                serde_json::json!({"template_id": template_id, "entries": json_lines}),
                "重排成功",
            )
        }
        Err(e) => crate::shared::err_resp(e),
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
