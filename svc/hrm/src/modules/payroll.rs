use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use bigdecimal::BigDecimal;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::{try_tenant_id_from_claims, RlsTxnCell};
use topems_shared_core::TopemsError;

/// U6-2：hrm 内部 BigDecimal -> 事件 rust_decimal::Decimal，字符串往返精确（不经过 f64，避免尾差）。
fn bd_to_dec(bd: &BigDecimal) -> rust_decimal::Decimal {
    std::str::FromStr::from_str(&bd.to_string()).unwrap_or(rust_decimal::Decimal::ZERO)
}
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::payroll_status::{PayrollItemStatus, PayrollRunStatus};
use super::ApiState;
use crate::modules::audit::log_audit_event;
use crate::modules::payroll_calc::{
    build_payroll_voucher_entries, format_voucher_period, generate_voucher_number,
    net_salary_from_deductions, payroll_amounts_from_gross, split_deductions_into_social_security,
    validate_pay_period, PayrollVoucherSummary,
};
use topems_shared_core::response::ApiResponse;

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
    #[serde(alias = "page_size")]
    pub page_size: Option<i64>,
    pub pay_period: Option<String>,
    pub status: Option<String>,
    pub payroll_run_id: Option<Uuid>,
    pub employee_id: Option<Uuid>,
    pub payroll_item_id: Option<Uuid>,
}

/// 响应兜底：run 状态未知历史值回落 `draft`
fn normalize_run(mut v: PayrollRun) -> PayrollRun {
    v.status = PayrollRunStatus::normalize(&v.status).to_string();
    v
}

/// 响应兜底：item 状态未知历史值回落 `pending`
fn normalize_item(mut v: PayrollItem) -> PayrollItem {
    v.status = PayrollItemStatus::normalize(&v.status).to_string();
    v
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
        ("page_size" = Option<i64>, Query, description = "每页大小"),
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
pub async fn list_payroll_runs(
    State(_state): State<ApiState>,
    Query(params): Query<QueryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let pay_period = params.pay_period.clone();
    let status_filter = match PayrollRunStatus::parse_filter(params.status.as_deref()) {
        Ok(v) => v.map(|x| x.as_db_str().to_string()),
        Err(_) => return ApiResponse::bad_request("非法的薪资周期状态筛选值"),
    };

    let result = sqlx::query_as::<_, PayrollRun>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        FROM hrm.payroll_runs
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR $1 = '' OR pay_period ILIKE '%' || $1 || '%')
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(&pay_period)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
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
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": items.into_iter().map(normalize_run).collect::<Vec<_>>(),
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            )
        }
        Err(e) => {
            tracing::error!("查询薪资发放列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("查询薪资发放列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:payroll:write"])),
    path = "/payroll-runs",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "payroll"
)]
pub async fn create_payroll_run(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreatePayrollRunRequest>,
) -> ApiResponse<PayrollRun> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if !validate_pay_period(&req.pay_period) {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "薪资周期为空或格式不正确（应为 YYYY-MM）".to_string(),
        ));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, PayrollRun>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.payroll_runs (id, pay_period, status, total_amount, employee_count, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $5, 0, 0, $3, $4,
                NULLIF(current_setting('app.tenant_id', true), '')::UUID)
        RETURNING id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(&req.pay_period)
    .bind(now)
    .bind(now)
    .bind(PayrollRunStatus::DEFAULT.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(run) => (
            ApiResponse::success(normalize_run(run.clone()), "薪资周期创建成功"),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建薪资周期失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("创建薪资周期失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(run) = &result {
        serde_json::to_value(normalize_run(run.clone())).ok()
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
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

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/payroll-runs/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "payroll"
)]
pub async fn get_payroll_run(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, PayrollRun>(
        only_own_schema_query!("hrm", "SELECT id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at FROM hrm.payroll_runs WHERE deleted_at IS NULL AND id = $1")
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(run)) => {
            let items = sqlx::query_as::<_, PayrollItem>(
                only_own_schema_query!("hrm", "SELECT id, payroll_run_id, employee_id, gross_amount, net_amount, deductions, taxes, status, bank_account, paid_at, created_at, updated_at FROM hrm.payroll_items WHERE payroll_run_id = $1")
            )
            .bind(id)
            .fetch_all(&mut **txn)
            .await
            .unwrap_or_default();

            ApiResponse::success(
                serde_json::json!({
                    "run": run,
                    "items": items
                }),
                "查询成功",
            )
        }
        Ok(None) => ApiResponse::<serde_json::Value>::not_found("薪资周期不存在"),
        Err(e) => {
            tracing::error!("查询薪资周期失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("查询薪资周期失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["hrm:payroll:write"])),
    path = "/payroll-runs/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "payroll"
)]
pub async fn delete_payroll_run(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.payroll_runs SET deleted_at = NOW() WHERE id = $1 AND status = $2"
    ))
    .bind(id)
    .bind(PayrollRunStatus::Draft.as_db_str())
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            ApiResponse::success(id.to_string(), "薪资周期已删除"),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound(
                "薪资周期不存在或状态不正确".to_string(),
            )),
            "error".to_string(),
            Some("薪资周期不存在或状态不正确".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除薪资周期失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("删除薪资周期失败".to_string())),
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
        &state.system_pool,
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

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

/// 真实薪资聚合源：在职员工 + 其最新 active 合同薪资（不再编造 employee_id / 金额）。
#[derive(Debug, Clone, sqlx::FromRow)]
struct PayrollSourceEmployee {
    employee_id: Uuid,
    tenant_id: Uuid,
    bank_account: Option<String>,
    gross_salary: BigDecimal,
}

#[utoipa::path(
    put,
    security(("bearerAuth" = [])),
    path = "/payroll-runs/{id}/calculate",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "payroll"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn calculate_payroll_run(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<PayrollRun> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    // 1) 校验 run 存在、处于 draft 且属于当前租户
    let existing = sqlx::query_as::<_, PayrollRun>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        FROM hrm.payroll_runs
        WHERE id = $1 AND status = $2 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .bind(PayrollRunStatus::Draft.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    let existing: Option<PayrollRun> = match existing {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询薪资周期失败: {}", e);
            return ApiResponse::<PayrollRun>::server_error("查询薪资周期失败");
        }
    };

    if existing.is_none() {
        return ApiResponse::<PayrollRun>::not_found("薪资周期不存在或状态不正确");
    }

    // 2) 真实聚合：active 员工 JOIN 最新 active 合同薪资（>0），无合同薪资者不参与发薪（不编造）
    let employees = sqlx::query_as::<_, PayrollSourceEmployee>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT e.id AS employee_id,
               e.tenant_id AS tenant_id,
               e.bank_account AS bank_account,
               c.salary AS gross_salary
        FROM hrm.employees e
        JOIN LATERAL (
            SELECT c.salary
            FROM hrm.contracts c
            WHERE c.employee_id = e.id
              AND c.status = 'active'
              AND c.deleted_at IS NULL
              AND c.salary IS NOT NULL
              AND c.salary > 0
            ORDER BY c.created_at DESC
            LIMIT 1
        ) c ON TRUE
        WHERE e.status = 'active'
          AND e.deleted_at IS NULL
        "#
    ))
    .fetch_all(&mut **txn)
    .await;

    let employees = match employees {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("聚合在职员工薪资失败: {}", e);
            return ApiResponse::<PayrollRun>::server_error("聚合在职员工薪资失败");
        }
    };

    // 3) 逐条用真实法定计算引擎生成明细并落库（错误向上返回，不再 let _ = 吞错）
    let mut total_gross = BigDecimal::from(0);
    let mut item_count: i64 = 0;
    for emp in &employees {
        let amounts = payroll_amounts_from_gross(&emp.gross_salary);
        let item_id = Uuid::new_v4();
        let res = sqlx::query(only_own_schema_query!(
            "hrm",
            r#"
            INSERT INTO hrm.payroll_items (
                id, payroll_run_id, employee_id, gross_amount, net_amount,
                deductions, taxes, status, bank_account, created_at, updated_at, tenant_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $10, $8, NOW(), NOW(), $9)
            "#
        ))
        .bind(item_id)
        .bind(id)
        .bind(emp.employee_id)
        .bind(&amounts.gross)
        .bind(&amounts.net)
        .bind(&amounts.deductions)
        .bind(&amounts.taxes)
        .bind(PayrollItemStatus::Pending.as_db_str())
        .bind(&emp.bank_account)
        .bind(emp.tenant_id)
        .execute(&mut **txn)
        .await;

        if let Err(e) = res {
            tracing::error!("写入薪资明细失败 employee_id={}: {}", emp.employee_id, e);
            return ApiResponse::<PayrollRun>::server_error("写入薪资明细失败");
        }
        total_gross += &amounts.gross;
        item_count += 1;
    }

    // 4) 汇总回写 run（total/employee_count 来自真实聚合，而非 count×5000 估算）
    let result = sqlx::query_as::<_, PayrollRun>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.payroll_runs
        SET status = $5, total_amount = $2, employee_count = $3, updated_at = $4
        WHERE id = $1 AND status = $6
        RETURNING id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(&total_gross)
    .bind(item_count as i32)
    .bind(now)
    .bind(PayrollRunStatus::Calculated.as_db_str())
    .bind(PayrollRunStatus::Draft.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(run)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_run(run), "薪资计算完成")
        }
        Ok(None) => ApiResponse::<PayrollRun>::not_found("薪资周期不存在或状态不正确"),
        Err(e) => {
            tracing::error!("计算薪资失败: {}", e);
            ApiResponse::<PayrollRun>::server_error("计算薪资失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("bearerAuth" = [])),
    path = "/payroll-runs/{id}/pay",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "payroll"
)]
pub async fn pay_payroll_run(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<PayrollRun> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    // 前置校验：仅当该 run 存在真实待发（pending）明细时才允许发放，
    // 避免把无明细/未计算的 run 直接置为 paid。
    let pending_count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "hrm",
        r#"
        SELECT COUNT(*) FROM hrm.payroll_items
        WHERE payroll_run_id = $1 AND status = $2
        "#
    ))
    .bind(id)
    .bind(PayrollItemStatus::Pending.as_db_str())
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    if pending_count == 0 {
        return ApiResponse::<PayrollRun>::bad_request("无可发放的薪资明细，请先执行薪资计算");
    }

    let items_res = sqlx::query(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.payroll_items
        SET status = $3, paid_at = $2
        WHERE payroll_run_id = $1 AND status = $4
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(PayrollItemStatus::Paid.as_db_str())
    .bind(PayrollItemStatus::Pending.as_db_str())
    .execute(&mut **txn)
    .await;

    if let Err(e) = items_res {
        tracing::error!("更新薪资明细发放状态失败: {}", e);
        return ApiResponse::<PayrollRun>::server_error("发放薪资失败");
    }

    let result = sqlx::query_as::<_, PayrollRun>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.payroll_runs
        SET status = $3, paid_at = $2, updated_at = $2
        WHERE id = $1 AND status = $4
        RETURNING id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(now)
    .bind(PayrollRunStatus::Paid.as_db_str())
    .bind(PayrollRunStatus::Calculated.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(run)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_run(run), "薪资发放完成")
        }
        Ok(None) => ApiResponse::<PayrollRun>::not_found("薪资周期不存在或状态不正确"),
        Err(e) => {
            tracing::error!("发放薪资失败: {}", e);
            ApiResponse::<PayrollRun>::server_error("发放薪资失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/payroll-items",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "payroll"
)]
pub async fn list_payroll_items(
    State(_state): State<ApiState>,
    Query(params): Query<QueryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let payroll_run_id = params.payroll_run_id;
    let emp_id = params.employee_id;
    let status_filter = match PayrollItemStatus::parse_filter(params.status.as_deref()) {
        Ok(v) => v.map(|x| x.as_db_str().to_string()),
        Err(_) => return ApiResponse::bad_request("非法的薪资明细状态筛选值"),
    };

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
    .fetch_all(&mut **txn)
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
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": items.into_iter().map(normalize_item).collect::<Vec<_>>(),
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            )
        }
        Err(e) => {
            tracing::error!("查询薪资明细列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("查询薪资明细列表失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/payroll-items/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "payroll"
)]
pub async fn get_payroll_item(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, PayrollItem>(
        only_own_schema_query!("hrm", "SELECT id, payroll_run_id, employee_id, gross_amount, net_amount, deductions, taxes, status, bank_account, paid_at, created_at, updated_at FROM hrm.payroll_items WHERE id = $1")
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(item)) => {
            let details = sqlx::query_as::<_, PayrollDetail>(
                only_own_schema_query!("hrm", "SELECT id, payroll_item_id, item_type, category, description, amount, created_at FROM hrm.payroll_details WHERE payroll_item_id = $1")
            )
            .bind(id)
            .fetch_all(&mut **txn)
            .await
            .unwrap_or_default();

            ApiResponse::success(
                serde_json::json!({
                    "item": normalize_item(item),
                    "details": details
                }),
                "查询成功",
            )
        }
        Ok(None) => ApiResponse::<serde_json::Value>::not_found("薪资明细不存在"),
        Err(e) => {
            tracing::error!("查询薪资明细失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("查询薪资明细失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/payroll-details",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "payroll"
)]
pub async fn list_payroll_details(
    State(_state): State<ApiState>,
    Query(params): Query<QueryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("hrm", "SELECT COUNT(*) FROM hrm.payroll_details WHERE ($1::uuid IS NULL OR payroll_item_id = $1)"),
            )
            .bind(payroll_item_id)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            )
        }
        Err(e) => {
            tracing::error!("查询薪资详情列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("查询薪资详情列表失败")
        }
    }
}

pub async fn create_payroll_detail(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PayrollDetail>,
) -> ApiResponse<PayrollDetail> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();

    let tenant_id = match try_tenant_id_from_claims(&claims) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::from(TopemsError::ValidationFailed(msg)),
    };

    let result = sqlx::query_as::<_, PayrollDetail>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.payroll_details (id, payroll_item_id, item_type, category, description, amount, created_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7::uuid)
        RETURNING id, payroll_item_id, item_type, category, description, amount, created_at
        "#)
    )
    .bind(id)
    .bind(req.payroll_item_id)
    .bind(&req.item_type)
    .bind(&req.category)
    .bind(&req.description)
    .bind(&req.amount)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(detail) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(detail, "薪资详情添加成功")
        }
        Err(e) => {
            tracing::error!("添加薪资详情失败: {}", e);
            ApiResponse::<PayrollDetail>::server_error("添加薪资详情失败")
        }
    }
}

/// 生成薪资凭证
/// 根据薪资发放记录生成财务凭证
#[utoipa::path(
    post,
    security(("bearerAuth" = [])),
    path = "/payroll-runs/{id}/generate-voucher",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "payroll"
)]
pub async fn generate_payroll_voucher(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<GeneratePayrollVoucherRequest>,
) -> ApiResponse<PayrollVoucherResponse> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    // 获取薪资发放记录
    let payroll_run: Option<PayrollRun> = sqlx::query_as(
        only_own_schema_query!("hrm", "SELECT id, pay_period, status, total_amount, employee_count, paid_at, created_at, updated_at FROM hrm.payroll_runs WHERE deleted_at IS NULL AND id = $1")
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await
    .unwrap_or(None);

    let payroll_run = match payroll_run {
        Some(r) => r,
        None => return ApiResponse::<PayrollVoucherResponse>::not_found("薪资记录不存在"),
    };

    // 检查薪资是否已发放
    if PayrollRunStatus::from_db_str(&payroll_run.status) != Some(PayrollRunStatus::Paid) {
        return ApiResponse::<PayrollVoucherResponse>::bad_request("薪资未发放，无法生成凭证");
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
    .fetch_one(&mut **txn)
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

    // 通过 erp 服务 API 创建凭证（避免跨服务直写 erp 表，schema 边界门禁）
    let summary = PayrollVoucherSummary {
        total_gross: &total_gross,
        total_tax: &total_tax,
        total_social_security: &total_social_security,
        net_salary: &net_salary,
    };
    let entries = build_payroll_voucher_entries(&summary);

    // D2 U2 环1（决策 C）：hrm→erp 工资凭证由同步 HTTP（POST /api/erp/vouchers）改为发布
    // `HrmPayrollPosted` 领域事件，erp 订阅生成总账凭证。幂等键 = payroll_run_id；
    // 凭证是"工资发放的副作用"，异步生成天然可接受；失败由 erp 侧 DLQ 兜底，不再阻塞本接口。
    let event_entries: Vec<topems_shared_event::event::HrmPayrollVoucherEntryPayload> = entries
        .iter()
        .map(
            |e| topems_shared_event::event::HrmPayrollVoucherEntryPayload {
                line_number: i32::try_from(e.line).unwrap_or(0),
                subject_code: e.subject_code.to_string(),
                subject_name: e.subject_name.to_string(),
                debit_amount: bd_to_dec(&e.debit),
                credit_amount: bd_to_dec(&e.credit),
            },
        )
        .collect();

    let event_payload = topems_shared_event::event::HrmPayrollPostedPayload {
        payroll_run_id: id,
        pay_period: payroll_run.pay_period.clone(),
        voucher_date,
        period: period.clone(),
        voucher_number: voucher_number.clone(),
        summary: format!("发放{}月工资", payroll_run.pay_period),
        maker_id: req.maker_id,
        maker_name: req.maker_name.clone().unwrap_or_else(|| "系统".to_string()),
        department_id: req.department_id.unwrap_or_else(Uuid::nil),
        total_gross: bd_to_dec(&total_gross),
        total_tax: bd_to_dec(&total_tax),
        total_social_security: bd_to_dec(&total_social_security),
        total_housing_fund: bd_to_dec(&total_housing_fund),
        net_salary: bd_to_dec(&net_salary),
        employee_count: payroll_run.employee_count,
        entries: event_entries,
        tenant_id: None,
    };

    if let Some(publisher) = &state.event_publisher {
        let publisher = publisher.clone();
        let vn = voucher_number.clone();
        tokio::spawn(async move {
            // D6：工资发放数据已落库（pay_payroll_run 此前提交），此处仅发布；失败入 ZSET 重试队列。
            if let Err(e) = publisher
                .publish_event(
                    topems_shared_event::event::EventType::HrmPayrollPosted,
                    event_payload.clone(),
                )
                .await
            {
                tracing::error!("[hrm] HrmPayrollPosted 事件发布失败: {}，入重试队列", e);
                topems_shared_event::event::commit_retry::push_retry_typed(
                    "hrm",
                    topems_shared_event::event::EventType::HrmPayrollPosted,
                    &event_payload,
                )
                .await;
            } else {
                tracing::info!(
                    "[hrm] HrmPayrollPosted 事件发布成功 - payroll_run_id={}, voucher_number={}",
                    id,
                    vn
                );
            }
        });
    } else {
        tracing::warn!(
            "[hrm] event_publisher 未配置，HrmPayrollPosted 未发布 - payroll_run_id={}",
            id
        );
    }

    // 凭证由 erp 订阅器异步生成（不再同步等待 erp 回执）；本接口立即受理成功。
    ApiResponse::success(
        PayrollVoucherResponse {
            success: true,
            voucher_id: None,
            voucher_number: Some(voucher_number),
            message: "薪资凭证生成请求已提交（事件异步生成）".to_string(),
            total_salary: total_gross,
            total_social_security,
            total_housing_fund,
            total_tax,
            employee_count: payroll_run.employee_count,
        },
        "薪资凭证生成请求已提交",
    )
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

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/payroll-slips",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "payroll"
)]
pub async fn list_payroll_slips(
    State(_state): State<ApiState>,
    Query(params): Query<QueryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let payroll_run_id = params.payroll_run_id;
    let emp_id = params.employee_id;
    let status_filter = match PayrollItemStatus::parse_filter(params.status.as_deref()) {
        Ok(v) => v.map(|x| x.as_db_str().to_string()),
        Err(_) => return ApiResponse::bad_request("非法的工资单状态筛选值"),
    };

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
    .fetch_all(&mut **txn)
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
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": items
                        .into_iter()
                        .map(|mut sl| {
                            sl.run_status = PayrollRunStatus::normalize(&sl.run_status).to_string();
                            sl.slip_status = PayrollItemStatus::normalize(&sl.slip_status).to_string();
                            sl
                        })
                        .collect::<Vec<_>>(),
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询工资单成功",
            )
        }
        Err(e) => {
            tracing::error!("查询工资单失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("查询工资单失败")
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
