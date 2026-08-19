use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use crate::models::finance::AccountingSubject;
use crate::modules::audit::{log_audit_event, AuditEventParams};
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OpeningBalance {
    pub id: Uuid,
    pub company_id: Uuid,
    pub subject_code: String,
    pub subject_name: String,
    pub period: String,
    pub debit_balance: f64,
    pub credit_balance: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateOpeningBalanceRequest {
    pub company_id: Uuid,
    pub subject_code: String,
    pub period: String,
    pub debit_balance: f64,
    pub credit_balance: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateOpeningBalanceRequest {
    pub debit_balance: Option<f64>,
    pub credit_balance: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CarryForwardRequest {
    pub from_period: String,
    pub to_period: String,
}

#[derive(Debug, Deserialize)]
pub struct OpeningBalanceParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub company_id: Option<String>,
    pub period: Option<String>,
    pub subject_code: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/finance/accounts/opening-balances",
            get(list_opening_balances).post(create_opening_balance),
        )
        .route(
            "/finance/accounts/opening-balances/{id}",
            get(get_opening_balance)
                .put(update_opening_balance)
                .delete(delete_opening_balance),
        )
        .route(
            "/finance/accounts/opening-balances/batch",
            post(import_opening_balances),
        )
        .route(
            "/finance/accounts/opening-balances/carry-forward",
            post(carry_forward_opening_balance),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:finance:read"])),
    path = "/erp/finance/accounts/opening-balances",
    tag = "Finance",
    responses((status = 200, description = "获取期初余额列表成功"))
)]
pub async fn list_opening_balances(
    State(state): State<ApiState>,
    Query(params): Query<OpeningBalanceParams>,
) -> Json<ApiResponse<PaginatedResponse<OpeningBalance>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, OpeningBalance>(
        r#"
        SELECT ob.id, ob.company_id, ob.subject_code, ob.subject_name, ob.period, 
               ob.debit_balance, ob.credit_balance, ob.created_at, ob.updated_at
        FROM opening_balances ob
        WHERE ($1::uuid IS NULL OR ob.company_id = $1)
          AND ($2::text IS NULL OR ob.period = $2)
          AND ($3::text IS NULL OR ob.subject_code = $3)
        ORDER BY ob.period DESC, ob.subject_code ASC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(
        params
            .company_id
            .as_ref()
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(&params.period)
    .bind(&params.subject_code)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(balances) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM opening_balances ob
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR ob.company_id = $1)
                  AND ($2::text IS NULL OR ob.period = $2)
                  AND ($3::text IS NULL OR ob.subject_code = $3)
                "#,
            )
            .bind(
                params
                    .company_id
                    .as_ref()
                    .and_then(|s| Uuid::parse_str(s).ok()),
            )
            .bind(&params.period)
            .bind(&params.subject_code)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(balances, total, page, page_size),
                "获取期初余额列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取期初余额列表失败: {}", e);
            Json(api_error(500, "获取期初余额列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:finance:write"])),
    path = "/erp/finance/accounts/opening-balances",
    tag = "Finance",
    responses((status = 200, description = "期初余额创建成功"))
)]
pub async fn create_opening_balance(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateOpeningBalanceRequest>,
) -> Json<ApiResponse<OpeningBalance>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let subject_name = match sqlx::query_as::<_, AccountingSubject>(
        "SELECT name FROM accounting_subjects WHERE code = $1",
    )
    .bind(&req.subject_code)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(s)) => s.name,
        _ => "未知科目".to_string(),
    };

    let result = sqlx::query_as::<_, OpeningBalance>(
        r#"
        INSERT INTO opening_balances (id, company_id, subject_code, subject_name, period, debit_balance, credit_balance, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, company_id, subject_code, subject_name, period, debit_balance, credit_balance, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.company_id)
    .bind(&req.subject_code)
    .bind(&subject_name)
    .bind(&req.period)
    .bind(req.debit_balance)
    .bind(req.credit_balance)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(balance) => (
            Json(ApiResponse::success(balance.clone(), "期初余额创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建期初余额失败: {}", e);
            (
                Json(api_error(500, "期初余额创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(balance) = &result {
        serde_json::to_value(balance).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "opening_balance".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:finance:read"])),
    path = "/erp/finance/accounts/opening-balances/{id}",
    tag = "Finance",
    params(("id" = Uuid, Path, description = "期初余额ID")),
    responses((status = 200, description = "获取期初余额成功"))
)]
pub async fn get_opening_balance(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OpeningBalance>> {
    let result = sqlx::query_as::<_, OpeningBalance>(
        r#"
        SELECT id, company_id, subject_code, subject_name, period, debit_balance, credit_balance, created_at, updated_at
        FROM opening_balances WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(balance)) => Json(ApiResponse::success(balance, "获取期初余额成功")),
        Ok(None) => Json(api_error(404, "期初余额不存在")),
        Err(e) => {
            tracing::error!("获取期初余额失败: {}", e);
            Json(api_error(500, "获取期初余额失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:finance:write"])),
    path = "/erp/finance/accounts/opening-balances/{id}",
    tag = "Finance",
    params(("id" = Uuid, Path, description = "期初余额ID")),
    responses((status = 200, description = "期初余额更新成功"))
)]
pub async fn update_opening_balance(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateOpeningBalanceRequest>,
) -> Json<ApiResponse<OpeningBalance>> {
    let existing = sqlx::query_as::<_, OpeningBalance>(
        "SELECT id, company_id, subject_code, subject_name, period, debit_balance, credit_balance, created_at, updated_at FROM opening_balances WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(b)) => b,
        Ok(None) => return Json(api_error(404, "期初余额不存在")),
        Err(e) => return Json(api_error(500, &format!("查询期初余额失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let debit_balance = req.debit_balance.unwrap_or(existing.debit_balance);
    let credit_balance = req.credit_balance.unwrap_or(existing.credit_balance);
    let now = Utc::now();

    let result = sqlx::query_as::<_, OpeningBalance>(
        r#"
        UPDATE opening_balances SET debit_balance = $2, credit_balance = $3, updated_at = $4
        WHERE id = $1
        RETURNING id, company_id, subject_code, subject_name, period, debit_balance, credit_balance, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(debit_balance)
    .bind(credit_balance)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(balance) => (
            Json(ApiResponse::success(balance.clone(), "期初余额更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新期初余额失败: {}", e);
            (
                Json(api_error(500, "期初余额更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(balance) = &result {
        serde_json::to_value(balance).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "opening_balance".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:finance:write"])),
    path = "/erp/finance/accounts/opening-balances/{id}",
    tag = "Finance",
    params(("id" = Uuid, Path, description = "期初余额ID")),
    responses((status = 200, description = "期初余额删除成功"))
)]
pub async fn delete_opening_balance(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("UPDATE opening_balances SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "期初余额删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "期初余额不存在")),
            "error".to_string(),
            Some("期初余额不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除期初余额失败: {}", e);
            (
                Json(api_error(500, "期初余额删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "opening_balance".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:finance:write"])),
    path = "/erp/finance/accounts/opening-balances/batch",
    tag = "Finance",
    responses((status = 200, description = "期初余额批量导入完成"))
)]
pub async fn import_opening_balances(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<Vec<CreateOpeningBalanceRequest>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut success_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();
    let now = Utc::now();
    let request_data = serde_json::to_value(&req).ok();

    for item in req {
        let subject_name = match sqlx::query_as::<_, AccountingSubject>(
            "SELECT name FROM accounting_subjects WHERE code = $1",
        )
        .bind(&item.subject_code)
        .fetch_optional(&state.db)
        .await
        {
            Ok(Some(s)) => s.name,
            _ => "未知科目".to_string(),
        };

        let result = sqlx::query(
            r#"
            INSERT INTO opening_balances (id, company_id, subject_code, subject_name, period, debit_balance, credit_balance, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(item.company_id)
        .bind(&item.subject_code)
        .bind(&subject_name)
        .bind(&item.period)
        .bind(item.debit_balance)
        .bind(item.credit_balance)
        .bind(now)
        .bind(now)
        .execute(&state.db)
        .await;

        match result {
            Ok(_) => success_count += 1,
            Err(e) => {
                failed_count += 1;
                errors.push(format!("科目{}导入失败: {}", item.subject_code, e));
            }
        }
    }

    let result = serde_json::json!({
        "success_count": success_count,
        "failed_count": failed_count,
        "errors": errors,
    });

    let response_data = Some(result.clone());

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "import".to_string(),
            entity_type: "opening_balance".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: if failed_count == 0 {
                "success".to_string()
            } else {
                "partial".to_string()
            },
            error_message: if !errors.is_empty() {
                Some(errors.join("; "))
            } else {
                None
            },
        },
        &headers,
    )
    .await;

    Json(ApiResponse::success(result, "期初余额批量导入完成"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:finance:write"])),
    path = "/erp/finance/accounts/opening-balances/carry-forward",
    tag = "Finance",
    responses((status = 200, description = "期初余额结转完成"))
)]
pub async fn carry_forward_opening_balance(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CarryForwardRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let request_data = serde_json::to_value(&req).ok();

    let query = r#"
        INSERT INTO opening_balances (id, company_id, subject_code, subject_name, period, debit_balance, credit_balance, created_at, updated_at)
        SELECT uuid_generate_v4(), company_id, subject_code, subject_name, $2, debit_balance, credit_balance, NOW(), NOW()
        FROM opening_balances
        WHERE period = $1
        ON CONFLICT (company_id, subject_code, period) DO UPDATE SET
            debit_balance = EXCLUDED.debit_balance,
            credit_balance = EXCLUDED.credit_balance,
            updated_at = NOW()
    "#;

    let result = sqlx::query(query)
        .bind(&req.from_period)
        .bind(&req.to_period)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match result {
        Ok(r) => (
            Json(ApiResponse::success(
                serde_json::json!({ "rows_affected": r.rows_affected() }),
                "期初余额结转完成",
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("结转期初余额失败: {}", e);
            (
                Json(api_error(500, "期初余额结转失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "carry_forward".to_string(),
            entity_type: "opening_balance".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: None,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}
