use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::str::FromStr;
use uuid::Uuid;

use super::ApiState;
use crate::api::audit::log_audit_event;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PayrollRun {
    pub id: Uuid,
    pub pay_period: String,
    pub status: String,
    pub total_amount: BigDecimal,
    pub employee_count: i32,
    pub paid_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PayrollItem {
    pub id: Uuid,
    pub payroll_run_id: Uuid,
    pub employee_id: Uuid,
    pub gross_amount: BigDecimal,
    pub net_amount: BigDecimal,
    pub deductions: BigDecimal,
    pub taxes: BigDecimal,
    pub status: String,
    pub bank_account: Option<String>,
    pub paid_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PayrollDetail {
    pub id: Uuid,
    pub payroll_item_id: Uuid,
    pub item_type: String,
    pub category: String,
    pub description: String,
    pub amount: BigDecimal,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePayrollRunRequest {
    pub pay_period: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub pay_period: Option<String>,
    pub status: Option<String>,
    pub payroll_run_id: Option<Uuid>,
    pub employee_id: Option<Uuid>,
    pub payroll_item_id: Option<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/hrm/payroll-runs",
            get(list_payroll_runs).post(create_payroll_run),
        )
        .route(
            "/api/hrm/payroll-runs/{id}",
            get(get_payroll_run).delete(delete_payroll_run),
        )
        .route(
            "/api/hrm/payroll-runs/{id}/calculate",
            put(calculate_payroll_run),
        )
        .route("/api/hrm/payroll-runs/{id}/pay", put(pay_payroll_run))
        .route("/api/hrm/payroll-items", get(list_payroll_items))
        .route("/api/hrm/payroll-items/{id}", get(get_payroll_item))
        .route(
            "/api/hrm/payroll-details",
            get(list_payroll_details).post(create_payroll_detail),
        )
}

async fn list_payroll_runs(
    State(state): State<ApiState>,
    Query(params): Query<QueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let pay_period = params.pay_period.clone();
    let status_filter = params.status;

    let result = sqlx::query_as::<_, PayrollRun>(
        r#"
        SELECT id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        FROM hrm.payroll_runs
        WHERE ($1::text IS NULL OR $1 = '' OR pay_period ILIKE '%' || $1 || '%')
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&pay_period)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM hrm.payroll_runs
                WHERE ($1::text IS NULL OR $1 = '' OR pay_period ILIKE '%' || $1 || '%')
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&pay_period)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询薪资发放列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询薪资发放列表失败",
            ))
        }
    }
}

async fn create_payroll_run(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreatePayrollRunRequest>,
) -> Json<ApiResponse<PayrollRun>> {
    if req.pay_period.is_empty() {
        return Json(api_error(400, "薪资周期不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, PayrollRun>(
        r#"
        INSERT INTO hrm.payroll_runs (id, pay_period, status, total_amount, employee_count, created_at, updated_at)
        VALUES ($1, $2, 'draft', 0, 0, $3, $4)
        RETURNING id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(&req.pay_period)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(run) => (
            Json(ApiResponse::success(run.clone(), "薪资周期创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建薪资周期失败: {}", e);
            (
                Json(api_error(500, "创建薪资周期失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(run) = &result {
        serde_json::to_value(run).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "payroll_run".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_payroll_run(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, PayrollRun>(
        "SELECT id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at FROM hrm.payroll_runs WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(run)) => {
            let items = sqlx::query_as::<_, PayrollItem>(
                "SELECT id, payroll_run_id, employee_id, gross_amount, net_amount, deductions, taxes, status, bank_account, paid_at, created_at, updated_at FROM hrm.payroll_items WHERE payroll_run_id = $1"
            )
            .bind(id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

            Json(ApiResponse::success(
                serde_json::json!({
                    "run": run,
                    "items": items
                }),
                "查询成功",
            ))
        }
        Ok(None) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "薪资周期不存在",
        )),
        Err(e) => {
            tracing::error!("查询薪资周期失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询薪资周期失败",
            ))
        }
    }
}

async fn delete_payroll_run(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM hrm.payroll_runs WHERE id = $1 AND status = 'draft'")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success(id.to_string(), "薪资周期已删除")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "薪资周期不存在或状态不正确")),
            "error".to_string(),
            Some("薪资周期不存在或状态不正确".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除薪资周期失败: {}", e);
            (
                Json(api_error(500, "删除薪资周期失败")),
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
        "delete".to_string(),
        "payroll_run".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn calculate_payroll_run(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PayrollRun>> {
    let now = Utc::now();

    let result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM shared.employees WHERE status = 'active'",
    )
    .fetch_one(&state.db)
    .await;

    let emp_count = result.unwrap_or(0);
    let total_amount = BigDecimal::from(emp_count) * BigDecimal::from(5000);

    let result = sqlx::query_as::<_, PayrollRun>(
        r#"
        UPDATE hrm.payroll_runs
        SET status = 'calculated', total_amount = $2, employee_count = $3, updated_at = $4
        WHERE id = $1 AND status = 'draft'
        RETURNING id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(total_amount)
    .bind(emp_count)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(run)) => {
            let _ = create_payroll_items(&state.db, id, emp_count as i32).await;
            Json(ApiResponse::success(run, "薪资计算完成"))
        }
        Ok(None) => Json(ApiResponse::<PayrollRun>::error(
            404,
            "薪资周期不存在或状态不正确",
        )),
        Err(e) => {
            tracing::error!("计算薪资失败: {}", e);
            Json(ApiResponse::<PayrollRun>::error(500, "计算薪资失败"))
        }
    }
}

async fn create_payroll_items(
    db: &PgPool,
    payroll_run_id: Uuid,
    emp_count: i32,
) -> Result<(), sqlx::Error> {
    for i in 1..=emp_count {
        let item_id = Uuid::new_v4();
        let emp_id = Uuid::new_v4();
        let gross_amount = BigDecimal::from(5000) + (BigDecimal::from(i) * BigDecimal::from(100));
        let taxes = &gross_amount * BigDecimal::from_str("0.1").unwrap();
        let deductions = &gross_amount * BigDecimal::from_str("0.05").unwrap();
        let net_amount = &gross_amount - &taxes - &deductions;

        let _ = sqlx::query(
            r#"
            INSERT INTO hrm.payroll_items (id, payroll_run_id, employee_id, gross_amount, net_amount, deductions, taxes, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
            "#
        )
        .bind(item_id)
        .bind(payroll_run_id)
        .bind(emp_id)
        .bind(gross_amount)
        .bind(net_amount)
        .bind(deductions)
        .bind(taxes)
        .execute(db)
        .await;
    }

    Ok(())
}

async fn pay_payroll_run(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PayrollRun>> {
    let now = Utc::now();

    let _ = sqlx::query(
        r#"
        UPDATE hrm.payroll_items
        SET status = 'paid', paid_at = $2
        WHERE payroll_run_id = $1 AND status = 'pending'
        "#,
    )
    .bind(id)
    .bind(now)
    .execute(&state.db)
    .await;

    let result = sqlx::query_as::<_, PayrollRun>(
        r#"
        UPDATE hrm.payroll_runs
        SET status = 'paid', paid_at = $2, updated_at = $2
        WHERE id = $1 AND status = 'calculated'
        RETURNING id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(run)) => Json(ApiResponse::success(run, "薪资发放完成")),
        Ok(None) => Json(ApiResponse::<PayrollRun>::error(
            404,
            "薪资周期不存在或状态不正确",
        )),
        Err(e) => {
            tracing::error!("发放薪资失败: {}", e);
            Json(ApiResponse::<PayrollRun>::error(500, "发放薪资失败"))
        }
    }
}

async fn list_payroll_items(
    State(state): State<ApiState>,
    Query(params): Query<QueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let payroll_run_id = params.payroll_run_id;
    let emp_id = params.employee_id;
    let status_filter = params.status;

    let result = sqlx::query_as::<_, PayrollItem>(
        r#"
        SELECT id, payroll_run_id, employee_id, gross_amount, net_amount, deductions, taxes, status, bank_account, paid_at, created_at, updated_at
        FROM hrm.payroll_items
        WHERE ($1::uuid IS NULL OR payroll_run_id = $1)
          AND ($2::uuid IS NULL OR employee_id = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(payroll_run_id)
    .bind(emp_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM hrm.payroll_items
                WHERE ($1::uuid IS NULL OR payroll_run_id = $1)
                  AND ($2::uuid IS NULL OR employee_id = $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(payroll_run_id)
            .bind(emp_id)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询薪资明细列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询薪资明细列表失败",
            ))
        }
    }
}

async fn get_payroll_item(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, PayrollItem>(
        "SELECT id, payroll_run_id, employee_id, gross_amount, net_amount, deductions, taxes, status, bank_account, paid_at, created_at, updated_at FROM hrm.payroll_items WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(item)) => {
            let details = sqlx::query_as::<_, PayrollDetail>(
                "SELECT id, payroll_item_id, item_type, category, description, amount, created_at FROM hrm.payroll_details WHERE payroll_item_id = $1"
            )
            .bind(id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

            Json(ApiResponse::success(
                serde_json::json!({
                    "item": item,
                    "details": details
                }),
                "查询成功",
            ))
        }
        Ok(None) => Json(ApiResponse::<serde_json::Value>::error(
            404,
            "薪资明细不存在",
        )),
        Err(e) => {
            tracing::error!("查询薪资明细失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询薪资明细失败",
            ))
        }
    }
}

async fn list_payroll_details(
    State(state): State<ApiState>,
    Query(params): Query<QueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let payroll_item_id = params.payroll_item_id;

    let result = sqlx::query_as::<_, PayrollDetail>(
        r#"
        SELECT id, payroll_item_id, item_type, category, description, amount, created_at
        FROM hrm.payroll_details
        WHERE ($1::uuid IS NULL OR payroll_item_id = $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(payroll_item_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM hrm.payroll_details WHERE ($1::uuid IS NULL OR payroll_item_id = $1)",
            )
            .bind(payroll_item_id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询薪资详情列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询薪资详情列表失败",
            ))
        }
    }
}

async fn create_payroll_detail(
    State(state): State<ApiState>,
    Json(req): Json<PayrollDetail>,
) -> Json<ApiResponse<PayrollDetail>> {
    let id = Uuid::new_v4();

    let result = sqlx::query_as::<_, PayrollDetail>(
        r#"
        INSERT INTO hrm.payroll_details (id, payroll_item_id, item_type, category, description, amount, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, payroll_item_id, item_type, category, description, amount, created_at
        "#
    )
    .bind(id)
    .bind(req.payroll_item_id)
    .bind(&req.item_type)
    .bind(&req.category)
    .bind(&req.description)
    .bind(&req.amount)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(detail) => Json(ApiResponse::success(detail, "薪资详情添加成功")),
        Err(e) => {
            tracing::error!("添加薪资详情失败: {}", e);
            Json(ApiResponse::<PayrollDetail>::error(500, "添加薪资详情失败"))
        }
    }
}
