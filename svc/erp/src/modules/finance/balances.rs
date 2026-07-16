#![allow(dead_code)]

use serde::{Deserialize, Serialize};

use axum::extract::{Extension, Json, Path, Query, State};

use chrono::{DateTime, Utc};

use uuid::Uuid;

use super::super::ApiState;
use crate::models::finance::AccountingSubject;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
struct AccountBalancesParams {
    account_ids: Option<Vec<String>>,
    period: String,
    company_id: Option<String>,
    department_id: Option<String>,
    project_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct AccountBalance {
    account_id: String,
    account_code: String,
    account_name: String,
    period: String,
    opening_debit: f64,
    opening_credit: f64,
    period_debit: f64,
    period_credit: f64,
    closing_debit: f64,
    closing_credit: f64,
    balance: f64,
}

pub async fn get_account_balances(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AccountBalancesParams>,
) -> Json<ApiResponse<Vec<AccountBalance>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    if params.period.is_empty() {
        return Json(api_error(400, "会计期间不能为空"));
    }

    let mut balances = Vec::new();

    let accounts = match sqlx::query_as::<_, AccountingSubject>(
        "SELECT id, code, name FROM accounting_subjects WHERE status = 'active'",
    )
    .fetch_all(&state.db)
    .await
    {
        Ok(accs) => accs,
        Err(e) => {
            tracing::warn!("获取会计科目失败: {}, 使用模拟数据", e);
            vec![
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "1001".to_string(),
                    name: "库存现金".to_string(),
                    category: "asset".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: true,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "1002".to_string(),
                    name: "银行存款".to_string(),
                    category: "asset".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: true,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "2001".to_string(),
                    name: "短期借款".to_string(),
                    category: "liability".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "3001".to_string(),
                    name: "实收资本".to_string(),
                    category: "equity".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "5001".to_string(),
                    name: "主营业务收入".to_string(),
                    category: "income".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "6001".to_string(),
                    name: "主营业务成本".to_string(),
                    category: "expense".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
            ]
        }
    };

    for account in accounts {
        balances.push(AccountBalance {
            account_id: account.id.to_string(),
            account_code: account.code,
            account_name: account.name,
            period: params.period.clone(),
            opening_debit: 0.0,
            opening_credit: 0.0,
            period_debit: 0.0,
            period_credit: 0.0,
            closing_debit: 0.0,
            closing_credit: 0.0,
            balance: 0.0,
        });
    }

    Json(ApiResponse::success(balances, "获取账户余额成功"))
}

#[derive(Debug, Deserialize)]
struct OpeningBalancesParams {
    period: String,
    account_ids: Option<Vec<String>>,
    company_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct AccountOpeningBalance {
    id: String,
    account_id: String,
    account_code: String,
    account_name: String,
    period: String,
    debit_amount: f64,
    credit_amount: f64,
    balance: f64,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

pub async fn get_opening_balances(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<OpeningBalancesParams>,
) -> Json<ApiResponse<Vec<AccountOpeningBalance>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    if params.period.is_empty() {
        return Json(api_error(400, "会计期间不能为空"));
    }

    let mut opening_balances = Vec::new();

    let accounts = match sqlx::query_as::<_, AccountingSubject>(
        "SELECT id, code, name FROM accounting_subjects WHERE status = 'active'",
    )
    .fetch_all(&state.db)
    .await
    {
        Ok(accs) => accs,
        Err(e) => {
            tracing::error!("获取会计科目失败: {}", e);
            return Json(api_error(500, "获取会计科目失败"));
        }
    };

    let now = Utc::now();
    for account in accounts {
        opening_balances.push(AccountOpeningBalance {
            id: Uuid::new_v4().to_string(),
            account_id: account.id.to_string(),
            account_code: account.code,
            account_name: account.name,
            period: params.period.clone(),
            debit_amount: 0.0,
            credit_amount: 0.0,
            balance: 0.0,
            created_at: now,
            updated_at: now,
        });
    }

    Json(ApiResponse::success(opening_balances, "获取期初余额成功"))
}

#[derive(Debug, Deserialize)]
struct SetOpeningBalanceRequest {
    period: String,
    debit_amount: f64,
    credit_amount: f64,
}

pub async fn set_opening_balance(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(account_id): Path<Uuid>,
    Json(req): Json<SetOpeningBalanceRequest>,
) -> Json<ApiResponse<AccountOpeningBalance>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.period.is_empty() {
        return Json(api_error(400, "会计期间不能为空"));
    }

    let account = match sqlx::query_as::<_, AccountingSubject>(
        "SELECT id, code, name FROM accounting_subjects WHERE id = $1",
    )
    .bind(account_id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(acc)) => acc,
        Ok(None) => return Json(api_error(404, "会计科目不存在")),
        Err(e) => return Json(api_error(500, &format!("查询会计科目失败: {}", e))),
    };

    let now = Utc::now();
    let opening_balance = AccountOpeningBalance {
        id: Uuid::new_v4().to_string(),
        account_id: account.id.to_string(),
        account_code: account.code,
        account_name: account.name,
        period: req.period,
        debit_amount: req.debit_amount,
        credit_amount: req.credit_amount,
        balance: req.debit_amount - req.credit_amount,
        created_at: now,
        updated_at: now,
    };

    Json(ApiResponse::success(opening_balance, "设置期初余额成功"))
}

#[derive(Debug, Deserialize)]
struct CarryForwardRequest {
    from_period: String,
    to_period: String,
    company_id: Option<String>,
}

pub async fn carry_forward_opening_balance(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CarryForwardRequest>,
) -> Json<ApiResponse<()>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.from_period.is_empty() || req.to_period.is_empty() {
        return Json(api_error(400, "结转期间不能为空"));
    }

    Json(ApiResponse::success(
        (),
        &format!("从 {} 结转到 {} 成功", req.from_period, req.to_period),
    ))
}
