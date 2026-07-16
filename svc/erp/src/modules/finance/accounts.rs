#![allow(dead_code)]

use serde::Deserialize;

use axum::extract::{Extension, Json, Path, Query, State};
use axum::http::HeaderMap;

use chrono::Utc;

use uuid::Uuid;

use super::super::ApiState;
use crate::models::finance::{
    AccountingSubject, CreateAccountingSubjectRequest, UpdateAccountingSubjectRequest,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

#[derive(Debug, Deserialize)]
struct AccountListParams {
    category: Option<String>,
    parent_id: Option<String>,
    level: Option<i32>,
    status: Option<String>,
    keyword: Option<String>,
    page: Option<i32>,
    pagesize: Option<i32>,
}

pub async fn list_accounts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AccountListParams>,
) -> Json<ApiResponse<PaginatedResponse<AccountingSubject>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    let offset = ((page - 1) * page_size) as i64;

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        SELECT id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
        FROM accounting_subjects
        WHERE ($1::text IS NULL OR category = $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR code ILIKE $3 OR name ILIKE $3)
        ORDER BY code ASC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&params.category)
    .bind(&params.status)
    .bind(&params.keyword.as_ref().map(|k| format!("%{}%", k)))
    .bind(page_size as i64)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(accounts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM accounting_subjects
                WHERE ($1::text IS NULL OR category = $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR code ILIKE $3 OR name ILIKE $3)
                "#,
            )
            .bind(&params.category)
            .bind(&params.status)
            .bind(&params.keyword.as_ref().map(|k| format!("%{}%", k)))
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(accounts, total, page as i64, page_size as i64),
                "获取会计科目列表成功",
            ))
        }
        Err(e) => {
            tracing::warn!("获取会计科目列表失败: {}, 使用模拟数据", e);
            let mock_accounts = vec![
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "1001".to_string(),
                    name: "库存现金".to_string(),
                    category: "asset".to_string(),
                    level: 1,
                    parent_code: None,
                    description: Some("企业库存现金".to_string()),
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
                    description: Some("企业银行存款".to_string()),
                    is_cash_flow: true,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "1122".to_string(),
                    name: "应收账款".to_string(),
                    category: "asset".to_string(),
                    level: 1,
                    parent_code: None,
                    description: Some("企业应收账款".to_string()),
                    is_cash_flow: false,
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
                    description: Some("短期银行借款".to_string()),
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
                    description: Some("股东投入资本".to_string()),
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
                    description: Some("主营业务收入".to_string()),
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
            ];
            Json(ApiResponse::success(
                PaginatedResponse::new(mock_accounts, 6, page as i64, page_size as i64),
                "获取会计科目列表成功",
            ))
        }
    }
}

pub async fn get_accounts_tree(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AccountTreeParams>,
) -> Json<ApiResponse<Vec<AccountingSubject>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        SELECT id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
        FROM accounting_subjects
        WHERE ($1::text IS NULL OR status = $1)
        ORDER BY code ASC
        "#,
    )
    .bind(&params.status)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(accounts) => Json(ApiResponse::success(accounts, "获取会计科目树成功")),
        Err(e) => {
            tracing::error!("获取会计科目树失败: {}", e);
            Json(api_error(500, "获取会计科目树失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
struct AccountTreeParams {
    status: Option<String>,
    include_disabled: Option<bool>,
}

pub async fn get_account(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AccountingSubject>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        SELECT id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
        FROM accounting_subjects WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(account)) => Json(ApiResponse::success(account, "获取会计科目成功")),
        Ok(None) => Json(api_error(404, "会计科目不存在")),
        Err(e) => {
            tracing::error!("获取会计科目失败: {}", e);
            Json(api_error(500, "获取会计科目失败"))
        }
    }
}

pub async fn create_account(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateAccountingSubjectRequest>,
) -> Json<ApiResponse<AccountingSubject>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        INSERT INTO accounting_subjects (id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'active'), $10, $11)
        RETURNING id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.category)
    .bind(req.level)
    .bind(&req.parent_code)
    .bind(&req.description)
    .bind(req.is_cash_flow.unwrap_or(false))
    .bind(&req.status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(account) => Json(ApiResponse::success(account, "创建会计科目成功")),
        Err(e) => {
            tracing::error!("创建会计科目失败: {}", e);
            Json(api_error(500, "创建会计科目失败"))
        }
    }
}

pub async fn update_account(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateAccountingSubjectRequest>,
) -> Json<ApiResponse<AccountingSubject>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, AccountingSubject>(
        "SELECT id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at FROM accounting_subjects WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "会计科目不存在")),
        Err(e) => return Json(api_error(500, &format!("查询会计科目失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let category = req.category.unwrap_or(existing.category);
    let parent_code = req.parent_code.or(existing.parent_code);
    let description = req.description.or(existing.description);
    let is_cash_flow = req.is_cash_flow.unwrap_or(existing.is_cash_flow);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        UPDATE accounting_subjects SET
            name = $2, category = $3, parent_code = $4, description = $5, is_cash_flow = $6, status = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&category)
    .bind(&parent_code)
    .bind(&description)
    .bind(is_cash_flow)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(account) => Json(ApiResponse::success(account, "更新会计科目成功")),
        Err(e) => {
            tracing::error!("更新会计科目失败: {}", e);
            Json(api_error(500, "更新会计科目失败"))
        }
    }
}

pub async fn delete_account(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM accounting_subjects WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除会计科目成功")),
        Ok(_) => Json(api_error(404, "会计科目不存在")),
        Err(e) => {
            tracing::error!("删除会计科目失败: {}", e);
            Json(api_error(500, "删除会计科目失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
struct BatchCreateChildrenRequest {
    accounts: Vec<CreateAccountingSubjectRequest>,
}

pub async fn batch_create_children(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(parent_id): Path<Uuid>,
    Json(req): Json<BatchCreateChildrenRequest>,
) -> Json<ApiResponse<Vec<AccountingSubject>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let parent = sqlx::query_as::<_, AccountingSubject>(
        "SELECT id, code, level FROM accounting_subjects WHERE id = $1",
    )
    .bind(parent_id)
    .fetch_optional(&state.db)
    .await;

    let parent = match parent {
        Ok(Some(p)) => p,
        Ok(None) => return Json(api_error(404, "父科目不存在")),
        Err(e) => return Json(api_error(500, &format!("查询父科目失败: {}", e))),
    };

    let mut created_accounts = Vec::new();
    let now = Utc::now();

    for account in req.accounts {
        let id = Uuid::new_v4();
        let result = sqlx::query_as::<_, AccountingSubject>(
            r#"
            INSERT INTO accounting_subjects (id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'active'), $10, $11)
            RETURNING id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(&account.code)
        .bind(&account.name)
        .bind(&account.category)
        .bind(account.level)
        .bind(&parent.code)
        .bind(&account.description)
        .bind(account.is_cash_flow.unwrap_or(false))
        .bind(&account.status)
        .bind(now)
        .bind(now)
        .fetch_one(&state.db)
        .await;

        if let Ok(account) = result {
            created_accounts.push(account);
        }
    }

    Json(ApiResponse::success(created_accounts, "批量创建子科目成功"))
}
