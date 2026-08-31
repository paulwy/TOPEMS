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
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::modules::audit::log_audit_event;
use crate::modules::payroll_calc::{
    build_payroll_voucher_entries, estimate_total_payroll, format_voucher_period,
    generate_voucher_number, mock_employee_salary_components, net_salary_from_deductions,
    split_deductions_into_social_security, validate_pay_period, PayrollVoucherSummary,
};
use topems_shared_core::response::{api_error, ApiResponse};

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

/// 薪资凭证生成请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GeneratePayrollVoucherRequest {
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub voucher_date: Option<chrono::DateTime<chrono::Utc>>,
    pub period: Option<String>,
    pub maker_id: Option<Uuid>,
    pub maker_name: Option<String>,
}

/// 薪资凭证生成响应
#[derive(Debug, Clone, Serialize)]
pub struct PayrollVoucherResponse {
    pub success: bool,
    pub voucher_id: Option<Uuid>,
    pub voucher_number: Option<String>,
    pub message: String,
    pub total_salary: BigDecimal,
    pub total_social_security: BigDecimal,
    pub total_housing_fund: BigDecimal,
    pub total_tax: BigDecimal,
    pub employee_count: i32,
}

#[derive(Debug, Clone, Deserialize, utoipa::ToSchema)]
pub struct QueryParams {
    pub page: Option<i64>,
    #[serde(alias = "pagesize")]
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
            "/payroll-runs",
            get(list_payroll_runs).post(create_payroll_run),
        )
        .route(
            "/payroll-runs/{id}",
            get(get_payroll_run).delete(delete_payroll_run),
        )
        .route("/payroll-runs/{id}/calculate", put(calculate_payroll_run))
        .route("/payroll-runs/{id}/pay", put(pay_payroll_run))
        .route(
            "/payroll-runs/{id}/generate-voucher",
            post(generate_payroll_voucher),
        )
        .route("/payroll-items", get(list_payroll_items))
        .route("/payroll-items/{id}", get(get_payroll_item))
        .route(
            "/payroll-details",
            get(list_payroll_details).post(create_payroll_detail),
        )
        .route("/payroll-slips", get(list_payroll_slips))
}

#[utoipa::path(
    get,
    path = "/payroll-runs",
    tag = "payroll",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("pagesize" = Option<i64>, Query, description = "每页大小"),
        ("pay_period" = Option<String>, Query, description = "薪资周期"),
        ("status" = Option<String>, Query, description = "状态"),
        ("payroll_run_id" = Option<Uuid>, Query, description = "薪资发放ID"),
        ("employee_id" = Option<Uuid>, Query, description = "员工ID"),
        ("payroll_item_id" = Option<Uuid>, Query, description = "薪资项ID")
    ),
    responses(
        (status = 200, description = "获取薪资发放列表成功", body = serde_json::Value),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
async fn list_payroll_runs(
    State(state): State<ApiState>,
    Query(params): Query<QueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let pay_period = params.pay_period.clone();
    let status_filter = params.status;

    let result = sqlx::query_as::<_, PayrollRun>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        FROM hrm.payroll_runs
        WHERE ($1::text IS NULL OR $1 = '' OR pay_period ILIKE '%' || $1 || '%')
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(&pay_period)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("hrm", r#"
                SELECT COUNT(*) FROM hrm.payroll_runs
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR $1 = '' OR pay_period ILIKE '%' || $1 || '%')
                  AND ($2::text IS NULL OR status = $2)
                "#),
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
    if !validate_pay_period(&req.pay_period) {
        return Json(api_error(400, "薪资周期为空或格式不正确（应为 YYYY-MM）"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, PayrollRun>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.payroll_runs (id, pay_period, status, total_amount, employee_count, created_at, updated_at)
        VALUES ($1, $2, 'draft', 0, 0, $3, $4)
        RETURNING id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        "#)
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
        only_own_schema_query!("hrm", "SELECT id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at FROM hrm.payroll_runs WHERE deleted_at IS NULL AND id = $1")
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(run)) => {
            let items = sqlx::query_as::<_, PayrollItem>(
                only_own_schema_query!("hrm", "SELECT id, payroll_run_id, employee_id, gross_amount, net_amount, deductions, taxes, status, bank_account, paid_at, created_at, updated_at FROM hrm.payroll_items WHERE payroll_run_id = $1")
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
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.payroll_runs SET deleted_at = NOW() WHERE id = $1 AND status = 'draft'"
    ))
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

    let result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "hrm",
        "SELECT COUNT(*) FROM hrm.employees WHERE status = 'active'"
    ))
    .fetch_one(&state.db)
    .await;

    let emp_count = result.unwrap_or(0);
    let total_amount = estimate_total_payroll(emp_count, 5000);

    let result = sqlx::query_as::<_, PayrollRun>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.payroll_runs
        SET status = 'calculated', total_amount = $2, employee_count = $3, updated_at = $4
        WHERE id = $1 AND status = 'draft'
        RETURNING id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        "#)
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
        let amounts = mock_employee_salary_components(i);
        let gross_amount = amounts.gross;
        let taxes = amounts.taxes;
        let deductions = amounts.deductions;
        let net_amount = amounts.net;

        let _ = sqlx::query(
            only_own_schema_query!("hrm", r#"
            INSERT INTO hrm.payroll_items (id, payroll_run_id, employee_id, gross_amount, net_amount, deductions, taxes, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
            "#)
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

    let _ = sqlx::query(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.payroll_items
        SET status = 'paid', paid_at = $2
        WHERE payroll_run_id = $1 AND status = 'pending'
        "#
    ))
    .bind(id)
    .bind(now)
    .execute(&state.db)
    .await;

    let result = sqlx::query_as::<_, PayrollRun>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.payroll_runs
        SET status = 'paid', paid_at = $2, updated_at = $2
        WHERE id = $1 AND status = 'calculated'
        RETURNING id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        "#)
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
        only_own_schema_query!("hrm", r#"
        SELECT id, payroll_run_id, employee_id, gross_amount, net_amount, deductions, taxes, status, bank_account, paid_at, created_at, updated_at
        FROM hrm.payroll_items
        WHERE ($1::uuid IS NULL OR payroll_run_id = $1)
          AND ($2::uuid IS NULL OR employee_id = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#),
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
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.payroll_items
                WHERE ($1::uuid IS NULL OR payroll_run_id = $1)
                  AND ($2::uuid IS NULL OR employee_id = $2)
                  AND ($3::text IS NULL OR status = $3)
                "#
            ))
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
        only_own_schema_query!("hrm", "SELECT id, payroll_run_id, employee_id, gross_amount, net_amount, deductions, taxes, status, bank_account, paid_at, created_at, updated_at FROM hrm.payroll_items WHERE id = $1")
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(item)) => {
            let details = sqlx::query_as::<_, PayrollDetail>(
                only_own_schema_query!("hrm", "SELECT id, payroll_item_id, item_type, category, description, amount, created_at FROM hrm.payroll_details WHERE payroll_item_id = $1")
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

    let result = sqlx::query_as::<_, PayrollDetail>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, payroll_item_id, item_type, category, description, amount, created_at
        FROM hrm.payroll_details
        WHERE ($1::uuid IS NULL OR payroll_item_id = $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#
    ))
    .bind(payroll_item_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("hrm", "SELECT COUNT(*) FROM hrm.payroll_details WHERE ($1::uuid IS NULL OR payroll_item_id = $1)"),
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
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.payroll_details (id, payroll_item_id, item_type, category, description, amount, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, payroll_item_id, item_type, category, description, amount, created_at
        "#)
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

/// 生成薪资凭证
/// 根据薪资发放记录生成财务凭证
async fn generate_payroll_voucher(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<GeneratePayrollVoucherRequest>,
) -> Json<ApiResponse<PayrollVoucherResponse>> {
    // 获取薪资发放记录
    let payroll_run: Option<PayrollRun> = sqlx::query_as(
        only_own_schema_query!("hrm", "SELECT id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at FROM hrm.payroll_runs WHERE deleted_at IS NULL AND id = $1")
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    let payroll_run = match payroll_run {
        Some(r) => r,
        None => {
            return Json(ApiResponse::<PayrollVoucherResponse>::error(
                404,
                "薪资记录不存在",
            ))
        }
    };

    // 检查薪资是否已发放
    if payroll_run.status != "paid" {
        return Json(ApiResponse::<PayrollVoucherResponse>::error(
            400,
            "薪资未发放，无法生成凭证",
        ));
    }

    // 获取薪资明细汇总
    #[derive(sqlx::FromRow)]
    struct PayrollSummary {
        total_gross: BigDecimal,
        total_tax: BigDecimal,
        total_deductions: BigDecimal,
    }

    let payroll_summary: Option<PayrollSummary> = sqlx::query_as(only_own_schema_query!(
        "hrm",
        r#"
        SELECT
            COALESCE(SUM(gross_amount), 0) as total_gross,
            COALESCE(SUM(taxes), 0) as total_tax,
            COALESCE(SUM(deductions), 0) as total_deductions
        FROM hrm.payroll_items
        WHERE payroll_run_id = $1
        "#
    ))
    .bind(id)
    .fetch_one(&state.db)
    .await
    .ok();

    let (total_gross, total_tax, total_deductions) = match payroll_summary {
        Some(ref s) => (
            s.total_gross.clone(),
            s.total_tax.clone(),
            s.total_deductions.clone(),
        ),
        None => (
            BigDecimal::from(0),
            BigDecimal::from(0),
            BigDecimal::from(0),
        ),
    };

    // 计算社保和公积金（从扣款中分离，这里简化为扣款的80%为社保公积金）
    let social_security_ratio = BigDecimal::from_str("0.8").unwrap_or_default();
    let split = split_deductions_into_social_security(&total_deductions, &social_security_ratio);
    let total_social_security = split.social_security;
    let total_housing_fund = split.housing_fund;
    let net_salary = net_salary_from_deductions(&total_gross, &total_deductions);

    let voucher_date = req.voucher_date.unwrap_or_else(Utc::now);
    let period = req
        .period
        .unwrap_or_else(|| format_voucher_period(voucher_date));

    // 生成凭证号（由 rand 注入 sequence）
    let voucher_number = generate_voucher_number(voucher_date, rand::random::<u16>() % 10000);

    // 在ERP数据库中创建凭证
    let voucher_id = Uuid::new_v4();
    let now = Utc::now();
    let department_id = req.department_id.unwrap_or_else(Uuid::nil);

    // 创建凭证主记录
    let voucher_result = sqlx::query(
        only_own_schema_query!("hrm", r#"
        INSERT INTO erp.financial_vouchers (id, voucher_number, voucher_date, period, summary, maker_id, maker_name, status, total_debit, total_credit, source_system, source_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, 'HRM', $10, $11, $12)
        "#, "erp"),
    )
    .bind(voucher_id)
    .bind(&voucher_number)
    .bind(voucher_date)
    .bind(&period)
    .bind(format!("发放{}月工资", payroll_run.pay_period))
    .bind(req.maker_id)
    .bind(req.maker_name.clone().unwrap_or_else(|| "系统".to_string()))
    .bind(&total_gross)
    .bind(&total_gross)
    .bind(id)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await;

    match voucher_result {
        Ok(_) => {
            // 创建凭证分录（由纯函数构建，保证借贷平衡）
            let summary = PayrollVoucherSummary {
                total_gross: &total_gross,
                total_tax: &total_tax,
                total_social_security: &total_social_security,
                net_salary: &net_salary,
            };
            let entries = build_payroll_voucher_entries(&summary);

            for entry in entries {
                let item_id = Uuid::new_v4();
                let _ = sqlx::query(
                    only_own_schema_query!("hrm", r#"
                    INSERT INTO erp.voucher_items (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, department_id, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    "#, "erp"),
                )
                .bind(item_id)
                .bind(voucher_id)
                .bind(entry.line as i32)
                .bind(entry.subject_code)
                .bind(entry.subject_name)
                .bind(format!("发放{}月工资", payroll_run.pay_period))
                .bind(entry.debit)
                .bind(entry.credit)
                .bind(department_id)
                .bind(now)
                .bind(now)
                .execute(&state.db)
                .await;
            }

            tracing::debug!(
                "[HRM] Generated payroll voucher {} for payroll run {}",
                voucher_number,
                id
            );

            Json(ApiResponse::success(
                PayrollVoucherResponse {
                    success: true,
                    voucher_id: Some(voucher_id),
                    voucher_number: Some(voucher_number),
                    message: "薪资凭证生成成功".to_string(),
                    total_salary: total_gross,
                    total_social_security,
                    total_housing_fund,
                    total_tax,
                    employee_count: payroll_run.employee_count,
                },
                "薪资凭证生成成功",
            ))
        }
        Err(e) => {
            tracing::error!("[HRM] Failed to generate payroll voucher: {}", e);
            Json(ApiResponse::<PayrollVoucherResponse>::error(
                500,
                &format!("薪资凭证生成失败: {}", e),
            ))
        }
    }
}

/// 工资单（员工视角的薪资明细，JOIN payroll_items + payroll_runs + employees）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PayrollSlip {
    pub id: Uuid,
    pub payroll_run_id: Uuid,
    pub pay_period: String,
    pub run_status: String,
    pub employee_id: Uuid,
    pub employee_name: Option<String>,
    pub employee_number: Option<String>,
    pub department_name: Option<String>,
    pub gross_amount: BigDecimal,
    pub net_amount: BigDecimal,
    pub deductions: BigDecimal,
    pub taxes: BigDecimal,
    pub slip_status: String,
    pub bank_account: Option<String>,
    pub paid_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

async fn list_payroll_slips(
    State(state): State<ApiState>,
    Query(params): Query<QueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let payroll_run_id = params.payroll_run_id;
    let emp_id = params.employee_id;
    let status_filter = params.status;

    let result = sqlx::query_as::<_, PayrollSlip>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT
            pi.id,
            pi.payroll_run_id,
            pr.pay_period,
            pr.status AS run_status,
            pi.employee_id,
            e.name AS employee_name,
            e.employee_number,
            d.name AS department_name,
            pi.gross_amount,
            pi.net_amount,
            pi.deductions,
            pi.taxes,
            pi.status AS slip_status,
            pi.bank_account,
            pi.paid_at,
            pi.created_at
        FROM hrm.payroll_items pi
        INNER JOIN hrm.payroll_runs pr ON pi.payroll_run_id = pr.id
        LEFT JOIN hrm.employees e ON pi.employee_id = e.id
        LEFT JOIN hrm.departments d ON e.department_id = d.id
        WHERE ($1::uuid IS NULL OR pi.payroll_run_id = $1)
          AND ($2::uuid IS NULL OR pi.employee_id = $2)
          AND ($3::text IS NULL OR pi.status = $3)
        ORDER BY pi.created_at DESC
        LIMIT $4 OFFSET $5
        "#
    ))
    .bind(payroll_run_id)
    .bind(emp_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*)
                FROM hrm.payroll_items pi
                WHERE ($1::uuid IS NULL OR pi.payroll_run_id = $1)
                  AND ($2::uuid IS NULL OR pi.employee_id = $2)
                  AND ($3::text IS NULL OR pi.status = $3)
                "#
            ))
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
                "查询工资单成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询工资单失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询工资单失败",
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bigdecimal::BigDecimal;

    fn now() -> chrono::DateTime<Utc> {
        Utc::now()
    }

    fn dec(n: i64) -> BigDecimal {
        BigDecimal::from(n)
    }

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_create_routes() {
        let _router = create_routes();
    }

    #[test]
    fn test_payroll_run_roundtrip() {
        roundtrip(&PayrollRun {
            id: Uuid::new_v4(),
            pay_period: "2024-01".to_string(),
            status: "draft".to_string(),
            total_amount: dec(100000),
            employee_count: 10,
            paid_at: None,
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_payroll_run_with_paid_at() {
        roundtrip(&PayrollRun {
            id: Uuid::new_v4(),
            pay_period: "2024-06".to_string(),
            status: "paid".to_string(),
            total_amount: dec(50000),
            employee_count: 5,
            paid_at: Some(now()),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_payroll_item_roundtrip() {
        roundtrip(&PayrollItem {
            id: Uuid::new_v4(),
            payroll_run_id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            gross_amount: dec(10000),
            net_amount: dec(8000),
            deductions: dec(1000),
            taxes: dec(1000),
            status: "pending".to_string(),
            bank_account: Some("6222000011112222333".to_string()),
            paid_at: None,
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_payroll_item_paid() {
        roundtrip(&PayrollItem {
            id: Uuid::new_v4(),
            payroll_run_id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            gross_amount: dec(12000),
            net_amount: dec(9500),
            deductions: dec(1500),
            taxes: dec(1000),
            status: "paid".to_string(),
            bank_account: None,
            paid_at: Some(now()),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_payroll_detail_roundtrip() {
        roundtrip(&PayrollDetail {
            id: Uuid::new_v4(),
            payroll_item_id: Uuid::new_v4(),
            item_type: "bonus".to_string(),
            category: "performance".to_string(),
            description: "季度绩效奖金".to_string(),
            amount: dec(2000),
            created_at: now(),
        });
    }

    #[test]
    fn test_create_payroll_run_request() {
        roundtrip(&CreatePayrollRunRequest {
            pay_period: "2024-03".to_string(),
        });
    }

    #[test]
    fn test_create_payroll_run_request_empty() {
        roundtrip(&CreatePayrollRunRequest {
            pay_period: String::new(),
        });
    }

    #[test]
    fn test_generate_payroll_voucher_request_full() {
        roundtrip(&GeneratePayrollVoucherRequest {
            department_id: Some(Uuid::new_v4()),
            department_name: Some("Engineering".to_string()),
            voucher_date: Some(now()),
            period: Some("2024-03".to_string()),
            maker_id: Some(Uuid::new_v4()),
            maker_name: Some("admin".to_string()),
        });
    }

    #[test]
    fn test_generate_payroll_voucher_request_empty() {
        roundtrip(&GeneratePayrollVoucherRequest {
            department_id: None,
            department_name: None,
            voucher_date: None,
            period: None,
            maker_id: None,
            maker_name: None,
        });
    }

    #[test]
    fn test_payroll_voucher_response_success() {
        let resp = PayrollVoucherResponse {
            success: true,
            voucher_id: Some(Uuid::new_v4()),
            voucher_number: Some("PV20240301001".to_string()),
            message: "薪资凭证生成成功".to_string(),
            total_salary: dec(100000),
            total_social_security: dec(8000),
            total_housing_fund: dec(2000),
            total_tax: dec(10000),
            employee_count: 10,
        };
        assert!(resp.success);
        assert_eq!(resp.employee_count, 10);
        assert!(resp.voucher_number.is_some());
    }

    #[test]
    fn test_payroll_voucher_response_failure() {
        let resp = PayrollVoucherResponse {
            success: false,
            voucher_id: None,
            voucher_number: None,
            message: "薪资未发放".to_string(),
            total_salary: dec(0),
            total_social_security: dec(0),
            total_housing_fund: dec(0),
            total_tax: dec(0),
            employee_count: 0,
        };
        assert!(!resp.success);
        assert!(resp.voucher_id.is_none());
    }

    #[test]
    fn test_query_params_all_none() {
        let params = QueryParams {
            page: None,
            page_size: None,
            pay_period: None,
            status: None,
            payroll_run_id: None,
            employee_id: None,
            payroll_item_id: None,
        };
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_query_params_with_values() {
        let run_id = Uuid::new_v4();
        let emp_id = Uuid::new_v4();
        let params = QueryParams {
            page: Some(1),
            page_size: Some(20),
            pay_period: Some("2024-01".to_string()),
            status: Some("paid".to_string()),
            payroll_run_id: Some(run_id),
            employee_id: Some(emp_id),
            payroll_item_id: None,
        };
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
        assert_eq!(params.payroll_run_id, Some(run_id));
        assert_eq!(params.employee_id, Some(emp_id));
    }

    #[test]
    fn test_payroll_run_debug() {
        let run = PayrollRun {
            id: Uuid::new_v4(),
            pay_period: "2024-01".to_string(),
            status: "draft".to_string(),
            total_amount: dec(0),
            employee_count: 0,
            paid_at: None,
            created_at: now(),
            updated_at: now(),
        };
        let debug = format!("{:?}", run);
        assert!(debug.contains("PayrollRun"));
        assert!(debug.contains("draft"));
    }

    #[test]
    fn test_payroll_run_clone() {
        let run = PayrollRun {
            id: Uuid::new_v4(),
            pay_period: "2024-02".to_string(),
            status: "calculated".to_string(),
            total_amount: dec(5000),
            employee_count: 1,
            paid_at: None,
            created_at: now(),
            updated_at: now(),
        };
        let cloned = run.clone();
        assert_eq!(run.id, cloned.id);
        assert_eq!(run.pay_period, cloned.pay_period);
        assert_eq!(run.status, cloned.status);
    }
}
