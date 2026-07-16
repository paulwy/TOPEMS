use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::super::models::{
    Account, AccountBalance, AccountListResponse, AccountOpeningBalance, AccountQuery,
    CreateAccountRequest, UpdateAccountRequest,
};
use super::utils::default_tenant_id;

pub async fn list_accounts(
    State(state): State<AppState>,
    Query(query): Query<AccountQuery>,
) -> Json<ApiResponse<AccountListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.pagesize.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_finance_accounts WHERE tenant_id = $1
           AND ($2::text IS NULL OR status = $2)
           AND ($3::text IS NULL OR parent_id = $3)
           AND ($4::integer IS NULL OR level = $4)
           AND ($5::text IS NULL OR (code LIKE '%' || $5 || '%' OR name LIKE '%' || $5 || '%'))"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.parent_id.clone())
    .bind(query.level)
    .bind(query.keyword.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询科目总数失败: {}", e);
            return Json(api_error(500, "查询科目总数失败"));
        }
    };

    let accounts: Vec<Account> = match sqlx::query_as(
        r#"SELECT * FROM core_finance_accounts WHERE tenant_id = $1
           AND ($2::text IS NULL OR status = $2)
           AND ($3::text IS NULL OR parent_id = $3)
           AND ($4::integer IS NULL OR level = $4)
           AND ($5::text IS NULL OR (code LIKE '%' || $5 || '%' OR name LIKE '%' || $5 || '%'))
           ORDER BY code ASC LIMIT $6 OFFSET $7"#,
    )
    .bind(tenant_id)
    .bind(query.status)
    .bind(query.parent_id)
    .bind(query.level)
    .bind(query.keyword)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询科目列表失败: {}", e);
            return Json(api_error(500, "查询科目列表失败"));
        }
    };

    Json(api_success(AccountListResponse {
        items: accounts,
        total,
        page,
        page_size,
    }))
}

pub async fn get_account(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Account>> {
    let tenant_id = default_tenant_id();

    let account: Option<Account> = match sqlx::query_as(
        "SELECT * FROM core_finance_accounts WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询科目失败: {}", e);
            return Json(api_error(500, "查询科目失败"));
        }
    };

    match account {
        Some(account) => Json(api_success(account)),
        None => Json(api_error(404, "科目不存在")),
    }
}

pub async fn create_account(
    State(state): State<AppState>,
    Json(req): Json<CreateAccountRequest>,
) -> Json<ApiResponse<Account>> {
    let tenant_id = default_tenant_id();

    let level = if let Some(parent_id) = req.parent_id {
        let parent: (i32,) =
            match sqlx::query_as("SELECT level FROM core_finance_accounts WHERE id = $1")
                .bind(parent_id)
                .fetch_one(&state.pool)
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("查询父科目失败: {}", e);
                    return Json(api_error(404, "父科目不存在"));
                }
            };
        parent.0 + 1
    } else {
        1
    };

    let account: Account = match sqlx::query_as(
        r#"INSERT INTO core_finance_accounts (tenant_id, code, name, parent_id, account_type, level, currency, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(req.code)
    .bind(req.name)
    .bind(req.parent_id)
    .bind(req.account_type)
    .bind(level)
    .bind(req.currency)
    .bind(req.description)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建科目失败: {}", e);
            return Json(api_error(500, "创建科目失败"));
        }
    };

    Json(api_success(account))
}

pub async fn update_account(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAccountRequest>,
) -> Json<ApiResponse<Account>> {
    let tenant_id = default_tenant_id();

    let account: Option<Account> = match sqlx::query_as(
        r#"UPDATE core_finance_accounts
           SET code = COALESCE($1, code),
               name = COALESCE($2, name),
               parent_id = COALESCE($3, parent_id),
               account_type = COALESCE($4, account_type),
               currency = COALESCE($5, currency),
               description = COALESCE($6, description),
               status = COALESCE($7, status),
               updated_at = NOW()
           WHERE tenant_id = $8 AND id = $9
           RETURNING *"#,
    )
    .bind(req.code)
    .bind(req.name)
    .bind(req.parent_id)
    .bind(req.account_type)
    .bind(req.currency)
    .bind(req.description)
    .bind(req.status)
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新科目失败: {}", e);
            return Json(api_error(500, "更新科目失败"));
        }
    };

    match account {
        Some(account) => Json(api_success(account)),
        None => Json(api_error(404, "科目不存在")),
    }
}

pub async fn delete_account(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let has_children: bool = match sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM core_finance_accounts WHERE parent_id = $1)",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("检查科目子节点失败: {}", e);
            return Json(api_error(500, "检查科目子节点失败"));
        }
    };

    if has_children {
        return Json(api_error(400, "存在子科目，无法删除"));
    }

    let result = sqlx::query("DELETE FROM core_finance_accounts WHERE tenant_id = $1 AND id = $2")
        .bind(tenant_id)
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "科目不存在")),
        Err(e) => {
            tracing::error!("删除科目失败: {}", e);
            Json(api_error(500, "删除科目失败"))
        }
    }
}

pub async fn get_account_tree(State(state): State<AppState>) -> Json<ApiResponse<Vec<Account>>> {
    let tenant_id = default_tenant_id();

    let accounts: Vec<Account> = match sqlx::query_as(
        "SELECT * FROM core_finance_accounts WHERE tenant_id = $1 ORDER BY code ASC",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询科目树失败: {}", e);
            return Json(api_error(500, "查询科目树失败"));
        }
    };

    Json(api_success(accounts))
}

pub async fn get_account_balances(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<AccountBalance>>> {
    let tenant_id = default_tenant_id();

    let balances: Vec<AccountBalance> = match sqlx::query_as(
        r#"SELECT a.id as account_id, a.code as account_code, a.name as account_name,
                  COALESCE(SUM(e.debit), 0) as debit,
                  COALESCE(SUM(e.credit), 0) as credit,
                  COALESCE(SUM(e.debit), 0) - COALESCE(SUM(e.credit), 0) as balance
           FROM core_finance_accounts a
           LEFT JOIN core_finance_voucher_entries e ON a.id = e.account_id
           WHERE a.tenant_id = $1
           GROUP BY a.id, a.code, a.name
           ORDER BY a.code ASC"#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询科目余额失败: {}", e);
            return Json(api_error(500, "查询科目余额失败"));
        }
    };

    Json(api_success(balances))
}

pub async fn get_opening_balances(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<AccountOpeningBalance>>> {
    let tenant_id = default_tenant_id();

    let balances: Vec<AccountOpeningBalance> = match sqlx::query_as(
        "SELECT * FROM core_finance_account_opening_balances WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询期初余额失败: {}", e);
            return Json(api_error(500, "查询期初余额失败"));
        }
    };

    Json(api_success(balances))
}

pub async fn set_opening_balance(
    State(state): State<AppState>,
    Path(account_id): Path<Uuid>,
) -> Json<ApiResponse<AccountOpeningBalance>> {
    let tenant_id = default_tenant_id();

    let balance: Option<AccountOpeningBalance> = match sqlx::query_as(
        r#"INSERT INTO core_finance_account_opening_balances (tenant_id, account_id, period, debit, credit)
           VALUES ($1, $2, '202401', 0, 0)
           ON CONFLICT (tenant_id, account_id, period) DO UPDATE SET debit = EXCLUDED.debit, credit = EXCLUDED.credit
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(account_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("设置期初余额失败: {}", e);
            return Json(api_error(500, "设置期初余额失败"));
        }
    };

    match balance {
        Some(balance) => Json(api_success(balance)),
        None => Json(api_error(500, "设置期初余额失败")),
    }
}

pub async fn carry_forward_opening_balance(
    State(state): State<AppState>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let _ = sqlx::query(
        r#"INSERT INTO core_finance_account_opening_balances (tenant_id, account_id, period, debit, credit)
           SELECT tenant_id, account_id, '202402', debit, credit
           FROM core_finance_account_opening_balances
           WHERE tenant_id = $1 AND period = '202401'
           ON CONFLICT (tenant_id, account_id, period) DO NOTHING"#,
    )
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    Json(api_success(true))
}
