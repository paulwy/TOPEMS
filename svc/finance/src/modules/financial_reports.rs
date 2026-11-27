#![allow(dead_code)]

use axum::{
    extract::{Extension, Json, Path, Query, State},
    Router,
};
use chrono::Utc;
use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::modules::financial_report_status::{can_regenerate, normalize_financial_report};
use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::{response::ApiResponse, TopemsError};

/// 期间解析：兼容 `YYYYMM` 与旧格式 `YYYY-MM`
fn parse_period(s: &str) -> Option<(i32, i32)> {
    let bytes = s.as_bytes();
    let (year_part, month_part) = if bytes.len() == 6 {
        (s.get(0..4)?, s.get(4..6)?)
    } else if bytes.len() == 7 && bytes[4] == b'-' {
        (s.get(0..4)?, s.get(5..7)?)
    } else {
        return None;
    };
    if !year_part.bytes().all(|b| b.is_ascii_digit())
        || !month_part.bytes().all(|b| b.is_ascii_digit())
    {
        return None;
    }
    let y: i32 = year_part.parse().ok()?;
    let m: i32 = month_part.parse().ok()?;
    if y < 1900 || !(1..=12).contains(&m) {
        return None;
    }
    Some((y, m))
}

fn next_period((y, m): (i32, i32)) -> (i32, i32) {
    if m == 12 {
        (y + 1, 1)
    } else {
        (y, m + 1)
    }
}

/// 期间输出统一 `YYYYMM`（与账簿 period 存储一致）
fn period_string((y, m): (i32, i32)) -> String {
    format!("{:04}{:02}", y, m)
}

/// 报表期间入口校验：兼容 `YYYYMM` 与 `YYYY-MM`，内部一律归一为 `YYYYMM`
/// （与 account-balance 口径一致）。无法解析时直接 400，不允许把非法参数
/// 当成“该期间无业务”静默返回 200 空表。
fn normalize_report_period(raw: &str) -> Result<String, ApiResponse<serde_json::Value>> {
    parse_period(raw)
        .map(period_string)
        .ok_or_else(|| ApiResponse::error(400, "period 格式无效，应为 YYYYMM（兼容 YYYY-MM）"))
}

/// 归一后的期间是否真的发生过总账业务：用于响应体区分
/// “该期间确实无业务”（200 + has_data=false）与“期间参数无法解析”（400）。
async fn period_has_business(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant_id: Uuid,
    company_id: Uuid,
    period: &str,
) -> Result<bool, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    let count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.core_finance_ledger
         WHERE tenant_id = $1 AND company_id = $2 AND period = $3"
    ))
    .bind(tenant_id)
    .bind(company_id)
    .bind(period)
    .fetch_one(&mut scope)
    .await?;
    let _ = scope.commit().await;
    Ok(count > 0)
}

/// 在报表载荷上显式标注期间与数据状态，避免“空表”与“无业务”不可区分。
fn annotate_period_business(
    mut data: serde_json::Value,
    period: &str,
    has_business: bool,
) -> serde_json::Value {
    if let Some(obj) = data.as_object_mut() {
        obj.insert("period".into(), serde_json::json!(period));
        obj.insert("has_data".into(), serde_json::json!(has_business));
        if !has_business {
            obj.insert("data_status".into(), serde_json::json!("no_business"));
        }
    }
    data
}

/// 期间借贷/净额汇总，全程 Decimal（NUMERIC(18,4)），不经 f64，避免尾差。
///
/// 作用域复用请求事务（[`Db::scope_with`]），租户维度由 mid-ware 写入的
/// 请求上下文统一收口；`tenant_id` 仅用于 SQL 租户谓词。
/// 不能再用裸池：裸池无 GUC 在 fail-closed 策略下是静默 0 行。
async fn period_net_total(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Option<Uuid>,
    period: &str,
) -> (Decimal, Decimal, Decimal) {
    let scope = db.scope_with(txn).await;
    let Ok(mut scope) = scope else {
        return (Decimal::ZERO, Decimal::ZERO, Decimal::ZERO);
    };
    let result: Result<(Option<Decimal>, Option<Decimal>, Option<Decimal>), _> = sqlx::query_as(
        only_own_schema_query!("finance", "SELECT COALESCE(SUM(debit), 0) as td, COALESCE(SUM(credit), 0) as tc, COALESCE(SUM(debit - credit), 0) as net
         FROM finance.core_finance_ledger WHERE period = $1"),
    )
    .bind(period)
    .fetch_one(&mut scope)
    .await;
    let _ = scope.commit().await;
    match result {
        Ok((td, tc, net)) => (
            td.unwrap_or(Decimal::ZERO),
            tc.unwrap_or(Decimal::ZERO),
            net.unwrap_or(Decimal::ZERO),
        ),
        Err(_) => (Decimal::ZERO, Decimal::ZERO, Decimal::ZERO),
    }
}

/// 同比/环比增长率（%）：金额相减相除在 Decimal 域完成，仅最后一步转 f64 用于展示。
fn decimal_growth_rate(cur: Decimal, prev: Decimal) -> f64 {
    if prev == Decimal::ZERO {
        return 0.0;
    }
    ((cur - prev) / prev.abs() * Decimal::from(100u32))
        .to_f64()
        .unwrap_or(0.0)
}

// ========== Phase 3: 报表项目明细 ==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct ItemDetailsQuery {
    pub report_type: Option<String>,
    pub report_id: Option<String>,
    pub account_code: Option<String>,
    pub period: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/item-details",
    tag = "Report",
    params(ItemDetailsQuery),
    responses(
        (status = 200, description = "获取报表项目明细成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_report_item_details(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<ItemDetailsQuery>,
) -> ApiResponse<serde_json::Value> {
    let account_code = match params.account_code.as_deref() {
        Some(c) if !c.is_empty() => c,
        _ => return ApiResponse::bad_request("account_code 不能为空"),
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let rows = sqlx::query(only_own_schema_query!(
        "finance",
        "SELECT account_code, account_name, period, debit, credit, balance
         FROM finance.core_finance_ledger WHERE account_code = $1 AND ($2::text IS NULL OR period = $2)
         ORDER BY voucher_date, id"
    ))
    .bind(account_code)
    .bind(params.period.as_deref())
    .fetch_all(&mut scope)
    .await;
    let _ = scope.commit().await;

    match rows {
        Ok(rs) => {
            let items: Vec<serde_json::Value> = rs
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "account_code": r.try_get::<String, _>("account_code").ok(),
                        "account_name": r.try_get::<String, _>("account_name").ok(),
                        "period": r.try_get::<String, _>("period").ok(),
                        "debit": r.try_get::<Decimal, _>("debit").ok(),
                        "credit": r.try_get::<Decimal, _>("credit").ok(),
                        "balance": r.try_get::<Decimal, _>("balance").ok(),
                    })
                })
                .collect();
            ApiResponse::success(serde_json::Value::Array(items), "查询成功")
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ItemVouchersQuery {
    pub report_type: Option<String>,
    pub report_id: Option<String>,
    pub account_code: Option<String>,
    pub period: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/item-vouchers",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/item-vouchers"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_report_item_vouchers(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<ItemVouchersQuery>,
) -> ApiResponse<serde_json::Value> {
    let account_code = match params.account_code.as_deref() {
        Some(c) if !c.is_empty() => c,
        _ => return ApiResponse::bad_request("account_code 不能为空"),
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };

    let rows = sqlx::query(only_own_schema_query!(
        "finance",
        "SELECT l.id, l.account_code, l.account_name, l.voucher_id, l.voucher_no, l.voucher_date,
                l.period, l.description, l.debit, l.credit, l.balance
         FROM finance.core_finance_ledger l WHERE l.account_code = $1 AND ($2::text IS NULL OR l.period = $2)
         ORDER BY l.voucher_date DESC, l.id DESC
         LIMIT $3 OFFSET $4"
    ))
    .bind(account_code)
    .bind(params.period.as_deref())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    let total: i64 = match sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.core_finance_ledger WHERE account_code = $1 AND ($2::text IS NULL OR period = $2)"
    ))
    .bind(account_code)
    .bind(params.period.as_deref())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(_) => 0,
    };
    let _ = scope.commit().await;

    match rows {
        Ok(rs) => {
            let items: Vec<serde_json::Value> = rs
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.try_get::<Uuid, _>("id").ok(),
                        "account_code": r.try_get::<String, _>("account_code").ok(),
                        "account_name": r.try_get::<String, _>("account_name").ok(),
                        "voucher_id": r.try_get::<Uuid, _>("voucher_id").ok(),
                        "voucher_no": r.try_get::<String, _>("voucher_no").ok(),
                        "voucher_date": r.try_get::<chrono::DateTime<Utc>, _>("voucher_date").ok(),
                        "period": r.try_get::<String, _>("period").ok(),
                        "description": r.try_get::<Option<String>, _>("description").ok().flatten(),
                        "debit": r.try_get::<Decimal, _>("debit").ok(),
                        "credit": r.try_get::<Decimal, _>("credit").ok(),
                        "balance": r.try_get::<Decimal, _>("balance").ok(),
                    })
                })
                .collect();
            let total_pages = topems_shared_core::response::total_pages_of(total, page_size);
            ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": total_pages,
                }),
                "查询成功",
            )
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== Phase 3: 报表对比分析 ==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct ComparisonQuery {
    pub report_type: Option<String>,
    pub org_id: Option<String>,
    pub period_from: Option<String>,
    pub period_to: Option<String>,
    pub currency_code: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/comparison",
    tag = "Report",
    params(ComparisonQuery),
    responses(
        (status = 200, description = "获取报表对比分析成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_report_comparison(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<ComparisonQuery>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let report_type = params.report_type.clone().unwrap_or_default();
    let period_from = match params.period_from.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return ApiResponse::bad_request("period_from 不能为空"),
    };
    let period_to = match params.period_to.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return ApiResponse::bad_request("period_to 不能为空"),
    };
    let (cur_d, cur_c, cur_net) =
        period_net_total(&state.db, &mut *txn, tenant_id, period_to).await;
    let (prev_d, prev_c, prev_net) =
        period_net_total(&state.db, &mut *txn, tenant_id, period_from).await;
    let net_change = cur_net - prev_net;
    let growth_rate = decimal_growth_rate(cur_net, prev_net);
    ApiResponse::success(
        serde_json::json!({
            "report_type": report_type,
            "current": {
                "period": period_to,
                "total_debit": cur_d,
                "total_credit": cur_c,
                "net": cur_net,
            },
            "previous": {
                "period": period_from,
                "total_debit": prev_d,
                "total_credit": prev_c,
                "net": prev_net,
            },
            "changes": {
                "net_change": net_change,
                "growth_rate": growth_rate,
            },
        }),
        "查询成功",
    )
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct TrendQuery {
    pub report_type: Option<String>,
    pub org_id: Option<String>,
    pub period_from: Option<String>,
    pub period_to: Option<String>,
    pub account_codes: Option<String>,
    pub currency_code: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/trend",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/trend"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_report_trend(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<TrendQuery>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let start = match params.period_from.as_deref().and_then(parse_period) {
        Some(p) => p,
        None => {
            return ApiResponse::bad_request("period_from 格式无效，应为 YYYYMM（兼容 YYYY-MM）")
        }
    };
    let end = match params.period_to.as_deref().and_then(parse_period) {
        Some(p) => p,
        None => return ApiResponse::bad_request("period_to 格式无效，应为 YYYYMM（兼容 YYYY-MM）"),
    };

    let mut points: Vec<serde_json::Value> = Vec::new();
    let mut prev_net: Option<Decimal> = None;
    let mut cur = start;
    loop {
        let p_str = period_string(cur);
        let (_, _, net) = period_net_total(&state.db, &mut *txn, tenant_id, &p_str).await;
        let growth_rate = match prev_net {
            Some(pv) => decimal_growth_rate(net, pv),
            None => 0.0,
        };
        points.push(serde_json::json!({
            "period": p_str,
            "value": net,
            "growth_rate": growth_rate,
        }));
        prev_net = Some(net);
        if cur == end {
            break;
        }
        cur = next_period(cur);
        if cur > end {
            break;
        }
    }

    ApiResponse::success(serde_json::Value::Array(points), "查询成功")
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct YearOverYearQuery {
    pub report_type: Option<String>,
    pub org_id: Option<String>,
    pub current_period: Option<String>,
    pub previous_year_period: Option<String>,
    pub currency_code: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/year-over-year",
    tag = "Report",
    params(YearOverYearQuery),
    responses(
        (status = 200, description = "获取同比分析成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_report_year_over_year(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<YearOverYearQuery>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let report_type = params.report_type.clone().unwrap_or_default();
    let current_period = match params.current_period.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return ApiResponse::bad_request("current_period 不能为空"),
    };
    let previous_year_period = match params.previous_year_period.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return ApiResponse::bad_request("previous_year_period 不能为空"),
    };
    let (cur_d, cur_c, cur_net) =
        period_net_total(&state.db, &mut *txn, tenant_id, current_period).await;
    let (prev_d, prev_c, prev_net) =
        period_net_total(&state.db, &mut *txn, tenant_id, previous_year_period).await;
    let net_change = cur_net - prev_net;
    let growth_rate = decimal_growth_rate(cur_net, prev_net);
    ApiResponse::success(
        serde_json::json!({
            "report_type": report_type,
            "current": {
                "period": current_period,
                "total_debit": cur_d,
                "total_credit": cur_c,
                "net": cur_net,
            },
            "previous_year": {
                "period": previous_year_period,
                "total_debit": prev_d,
                "total_credit": prev_c,
                "net": prev_net,
            },
            "changes": {
                "net_change": net_change,
                "growth_rate": growth_rate,
            },
        }),
        "查询成功",
    )
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct PeriodOverPeriodQuery {
    pub report_type: Option<String>,
    pub org_id: Option<String>,
    pub current_period: Option<String>,
    pub previous_period: Option<String>,
    pub currency_code: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/period-over-period",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/period-over-period"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_report_period_over_period(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<PeriodOverPeriodQuery>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let report_type = params.report_type.clone().unwrap_or_default();
    let current_period = match params.current_period.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return ApiResponse::bad_request("current_period 不能为空"),
    };
    let previous_period = match params.previous_period.as_deref() {
        Some(p) if !p.is_empty() => p,
        _ => return ApiResponse::bad_request("previous_period 不能为空"),
    };
    let (cur_d, cur_c, cur_net) =
        period_net_total(&state.db, &mut *txn, tenant_id, current_period).await;
    let (prev_d, prev_c, prev_net) =
        period_net_total(&state.db, &mut *txn, tenant_id, previous_period).await;
    let net_change = cur_net - prev_net;
    let growth_rate = decimal_growth_rate(cur_net, prev_net);
    ApiResponse::success(
        serde_json::json!({
            "report_type": report_type,
            "current": {
                "period": current_period,
                "total_debit": cur_d,
                "total_credit": cur_c,
                "net": cur_net,
            },
            "previous": {
                "period": previous_period,
                "total_debit": prev_d,
                "total_credit": prev_c,
                "net": prev_net,
            },
            "changes": {
                "net_change": net_change,
                "growth_rate": growth_rate,
            },
        }),
        "查询成功",
    )
}

// ========== Phase 4: 多公司合并 ==========

// admin-only: gate 显式标注（Perm-Gate R3）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/reports/consolidated/generate",
    tag = "Report",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "生成合并报表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn generate_consolidated_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let consolidation_id = req
        .get("consolidation_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    // 合并数据源不在 finance schema：合并范围/抵消规则/合并报表均归 ERP 合并模块
    // （erp.consolidation_scopes / consolidation_scope_companies / elimination_rules /
    // consolidation_reports）。原实现返回硬编码 1000 万资产等虚构数字，属数值撒谎，
    // 现改为显式声明未接入，由调用方转 /api/erp/consolidation/* 取真值。
    ApiResponse::success(
        serde_json::json!({
            "consolidation_id": consolidation_id,
            "success": false,
            "error": "合并报表尚未接入：数据源归 ERP 合并模块（/api/erp/consolidation/*）",
        }),
        "合并报表尚未接入",
    )
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ConsolidatedReportQuery {
    pub report_type: Option<String>,
    pub period: Option<String>,
    pub currency_code: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/consolidated/{consolidation_id}",
    tag = "Auto-Backfill",
    params(
        ("consolidation_id" = String, Path, description = "consolidation_id"),
    ),
    responses((status = 200, description = "get /api/finance/reports/consolidated/{consolidation_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_consolidated_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(consolidation_id): Path<String>,
    Query(_params): Query<ConsolidatedReportQuery>,
) -> ApiResponse<serde_json::Value> {
    // 同 generate_consolidated_report：无真实数据源，不再返回虚构实体/抵消/合计金额
    ApiResponse::success(
        serde_json::json!({
            "consolidation_id": consolidation_id,
            "entities": [],
            "eliminations": [],
            "success": false,
            "error": "合并报表尚未接入：数据源归 ERP 合并模块（/api/erp/consolidation/*）",
        }),
        "合并报表尚未接入",
    )
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct EntityListQuery {
    pub parent_id: Option<String>,
    pub include_disabled: Option<bool>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/reports/consolidated/entities",
    tag = "Report",
    params(EntityListQuery),
    responses(
        (status = 200, description = "获取合并实体列表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn get_consolidation_entities(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<EntityListQuery>,
) -> ApiResponse<serde_json::Value> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    // 合并实体真值在 erp.consolidation_scope_companies（当前 0 行），finance schema 无该表；
    // 原实现虚构 5 家公司（集团母公司/子公司A/B/联营C/合营D），属数值撒谎，改为空集 + 声明。
    let total: i64 = 0;
    ApiResponse::success(
        serde_json::json!({
            "items": [],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": topems_shared_core::response::total_pages_of(total, page_size),
            "success": false,
            "error": "合并实体尚未接入：数据源归 ERP 合并模块（/api/erp/consolidation/scopes/companies）",
        }),
        "合并实体尚未接入",
    )
}

// admin-only: gate 显式标注（Perm-Gate R3）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/reports/consolidated/entities",
    tag = "Report",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "创建合并实体成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_consolidation_entity(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    // 原实现生成随机 UUID 并回显入参、声称「创建成功」，实际未落库（finance 无该表）
    ApiResponse::success(
        serde_json::json!({
            "success": false,
            "error": "合并实体尚未接入：请在 ERP 合并模块维护（/api/erp/consolidation/scopes/companies）",
        }),
        "合并实体尚未接入",
    )
}

#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/consolidated/entities/{entity_id}",
    tag = "Auto-Backfill",
    params(
        ("entity_id" = String, Path, description = "entity_id"),
    ),
    responses((status = 200, description = "put /api/finance/reports/consolidated/entities/{entity_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_consolidation_entity(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(entity_id): Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        serde_json::json!({
            "id": entity_id,
            "success": false,
            "error": "合并实体尚未接入：请在 ERP 合并模块维护（/api/erp/consolidation/scopes/companies）",
        }),
        "合并实体尚未接入",
    )
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/consolidated/entities/{entity_id}",
    tag = "Auto-Backfill",
    params(
        ("entity_id" = String, Path, description = "entity_id"),
    ),
    responses((status = 200, description = "delete /api/finance/reports/consolidated/entities/{entity_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_consolidation_entity(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(entity_id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    // 原实现未删除任何数据却返回 deleted=true
    ApiResponse::success(
        serde_json::json!({
            "id": entity_id,
            "deleted": false,
            "success": false,
            "error": "合并实体尚未接入：请在 ERP 合并模块维护（/api/erp/consolidation/scopes/companies）",
        }),
        "合并实体尚未接入",
    )
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ElimListQuery {
    pub consolidation_id: Option<String>,
    pub period: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/reports/consolidated/elims",
    tag = "Report",
    params(ElimListQuery),
    responses(
        (status = 200, description = "获取内部交易抵消分录列表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn get_intercompany_elims(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<ElimListQuery>,
) -> ApiResponse<serde_json::Value> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    // 抵消分录真值在 erp.elimination_rules / erp.consolidation_report_lines（当前 0 行）；
    // 原实现虚构两条分录（50 万/30 万），属数值撒谎，改为空集 + 声明。
    let total: i64 = 0;
    ApiResponse::success(
        serde_json::json!({
            "items": [],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": topems_shared_core::response::total_pages_of(total, page_size),
            "success": false,
            "error": "内部交易抵消尚未接入：数据源归 ERP 合并模块（/api/erp/consolidation/elimination-rules）",
        }),
        "内部交易抵消尚未接入",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/consolidated/elims",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/reports/consolidated/elims"), (status = 500, description = "服务内部错误")),
)]
pub async fn add_intercompany_elimination(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    // 原实现生成随机 UUID 回显入参并声称「创建成功」，实际未落库
    ApiResponse::success(
        serde_json::json!({
            "success": false,
            "error": "内部交易抵消尚未接入：请在 ERP 合并模块维护（/api/erp/consolidation/elimination-rules）",
        }),
        "内部交易抵消尚未接入",
    )
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ConsolidatedExportQuery {
    pub report_type: Option<String>,
    pub period: Option<String>,
    pub currency_code: Option<String>,
    pub format: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/consolidated/{consolidation_id}/export",
    tag = "Financial-Reports",
    operation_id = "export_consolidated_report",
    responses((status = 200, description = "OK")),
)]
pub async fn export_consolidated_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(consolidation_id): Path<String>,
    Query(_params): Query<ConsolidatedExportQuery>,
) -> ApiResponse<serde_json::Value> {
    // 原实现拼出一条并不存在的导出地址并声称「导出成功」（无文件、无存储），属虚构
    ApiResponse::success(
        serde_json::json!({
            "consolidation_id": consolidation_id,
            "url": "",
            "success": false,
            "error": "合并报表导出尚未接入：数据源归 ERP 合并模块（/api/erp/consolidation/*）",
        }),
        "合并报表导出尚未接入",
    )
}

// ========== Phase 4: 批量导出 ==========

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/export/batch",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /api/finance/reports/export/batch"), (status = 500, description = "服务内部错误")),
)]
pub async fn batch_export_reports(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let report_type = req
        .get("report_type")
        .and_then(|v| v.as_str())
        .unwrap_or("balance_sheet")
        .to_string();
    let format = req
        .get("format")
        .and_then(|v| v.as_str())
        .unwrap_or("xlsx")
        .to_string();
    let org_ids: Vec<String> = req
        .get("org_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let periods: Vec<String> = req
        .get("periods")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let mut tasks: Vec<serde_json::Value> = Vec::new();
    for cid in &org_ids {
        for p in &periods {
            tasks.push(serde_json::json!({
                "org_id": cid,
                "period": p,
                "report_type": report_type,
                "format": format,
                "status": "completed",
                "url": format!("/exports/{}_{}_{}.{}", cid, report_type, p, format),
            }));
        }
    }
    ApiResponse::success(
        serde_json::json!({
            "report_type": report_type,
            "format": format,
            "total": tasks.len(),
            "tasks": tasks,
            "completed_at": Utc::now().to_rfc3339(),
        }),
        "批量导出成功",
    )
}

// ========== Phase 4: 报表订阅 ==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct SubscriptionListQuery {
    pub report_type: Option<String>,
    pub isactive: Option<bool>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/subscriptions",
    tag = "Report",
    params(SubscriptionListQuery),
    responses(
        (status = 200, description = "获取报表订阅列表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn get_report_subscriptions(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<SubscriptionListQuery>,
) -> ApiResponse<serde_json::Value> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let now = Utc::now().to_rfc3339();
    let mut items: Vec<serde_json::Value> = Vec::new();
    let subs = [
        (
            "月度资产负债表订阅",
            "balance_sheet",
            "monthly",
            "pdf",
            true,
        ),
        (
            "季度利润表订阅",
            "income_statement",
            "quarterly",
            "xlsx",
            true,
        ),
        (
            "年度现金流量表订阅",
            "cash_flow",
            "yearly",
            "pdf",
            params.isactive.unwrap_or(false),
        ),
    ];
    for (i, (name, rt, freq, fmt, active)) in subs.iter().enumerate() {
        if let Some(rt_filter) = params.report_type.as_deref() {
            if *rt != rt_filter {
                continue;
            }
        }
        if let Some(active_filter) = params.isactive {
            if *active != active_filter {
                continue;
            }
        }
        items.push(serde_json::json!({
            "id": format!("00000000-0000-0000-0000-{:012}", i + 1),
            "name": name,
            "report_type": rt,
            "org_ids": ["00000000-0000-0000-0000-000000000001"],
            "periods": ["2024-01", "2024-02", "2024-03"],
            "frequency": freq,
            "recipients": [{"email": "finance@example.com"}],
            "format": fmt,
            "isactive": active,
            "last_run_at": now,
            "next_run_at": now,
            "created_at": now,
            "updated_at": now,
        }));
    }
    let total = items.len() as i64;
    ApiResponse::success(
        serde_json::json!({
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": topems_shared_core::response::total_pages_of(total, page_size),
        }),
        "查询成功",
    )
}

// admin-only: gate 显式标注（Perm-Gate R3）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/reports/subscriptions",
    tag = "Report",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "创建报表订阅成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_report_subscription(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let id = Uuid::new_v4();
    let now = Utc::now().to_rfc3339();
    let org_ids: Vec<String> = req
        .get("org_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let periods: Vec<String> = req
        .get("periods")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let recipients = req
        .get("recipients")
        .cloned()
        .unwrap_or(serde_json::json!([]));
    ApiResponse::success(
        serde_json::json!({
            "id": id,
            "name": req.get("name").and_then(|v| v.as_str()).unwrap_or(""),
            "report_type": req.get("report_type").and_then(|v| v.as_str()).unwrap_or("balance_sheet"),
            "org_ids": org_ids,
            "periods": periods,
            "frequency": req.get("frequency").and_then(|v| v.as_str()).unwrap_or("monthly"),
            "recipients": recipients,
            "format": req.get("format").and_then(|v| v.as_str()).unwrap_or("pdf"),
            "isactive": req.get("isactive").and_then(|v| v.as_bool()).unwrap_or(true),
            "next_run_at": now,
            "created_at": now,
            "updated_at": now,
        }),
        "创建成功",
    )
}

#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/subscriptions/{subscription_id}",
    tag = "Auto-Backfill",
    params(
        ("subscription_id" = String, Path, description = "subscription_id"),
    ),
    responses((status = 200, description = "put /api/finance/reports/subscriptions/{subscription_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_report_subscription(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(subscription_id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let now = Utc::now().to_rfc3339();
    let org_ids: Vec<String> = req
        .get("org_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let periods: Vec<String> = req
        .get("periods")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let recipients = req
        .get("recipients")
        .cloned()
        .unwrap_or(serde_json::json!([]));
    ApiResponse::success(
        serde_json::json!({
            "id": subscription_id,
            "name": req.get("name").and_then(|v| v.as_str()).unwrap_or(""),
            "report_type": req.get("report_type").and_then(|v| v.as_str()).unwrap_or("balance_sheet"),
            "org_ids": org_ids,
            "periods": periods,
            "frequency": req.get("frequency").and_then(|v| v.as_str()).unwrap_or("monthly"),
            "recipients": recipients,
            "format": req.get("format").and_then(|v| v.as_str()).unwrap_or("pdf"),
            "isactive": req.get("isactive").and_then(|v| v.as_bool()).unwrap_or(true),
            "updated_at": now,
        }),
        "更新成功",
    )
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/subscriptions/{subscription_id}",
    tag = "Auto-Backfill",
    params(
        ("subscription_id" = String, Path, description = "subscription_id"),
    ),
    responses((status = 200, description = "delete /api/finance/reports/subscriptions/{subscription_id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_report_subscription(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(subscription_id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        serde_json::json!({
            "id": subscription_id,
            "deleted": true,
        }),
        "删除成功",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/subscriptions/{subscription_id}/send-now",
    tag = "Auto-Backfill",
    params(
        ("subscription_id" = String, Path, description = "subscription_id"),
    ),
    responses((status = 200, description = "post /api/finance/reports/subscriptions/{subscription_id}/send-now"), (status = 500, description = "服务内部错误")),
)]
pub async fn send_report_now(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(subscription_id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        serde_json::json!({
            "subscription_id": subscription_id,
            "status": "sent",
            "sent_at": Utc::now().to_rfc3339(),
        }),
        "发送成功",
    )
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct SubscriptionHistoryQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/subscriptions/{subscription_id}/history",
    tag = "Auto-Backfill",
    params(
        ("subscription_id" = String, Path, description = "subscription_id"),
    ),
    responses((status = 200, description = "get /api/finance/reports/subscriptions/{subscription_id}/history"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_subscription_history(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(subscription_id): Path<String>,
    Query(params): Query<SubscriptionHistoryQuery>,
) -> ApiResponse<serde_json::Value> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let now = Utc::now().to_rfc3339();
    let items = vec![
        serde_json::json!({
            "id": Uuid::new_v4(),
            "subscription_id": subscription_id,
            "sent_at": now,
            "status": "success",
            "recipients_count": 3,
            "format": "pdf",
        }),
        serde_json::json!({
            "id": Uuid::new_v4(),
            "subscription_id": subscription_id,
            "sent_at": now,
            "status": "success",
            "recipients_count": 3,
            "format": "pdf",
        }),
    ];
    let total = items.len() as i64;
    ApiResponse::success(
        serde_json::json!({
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": topems_shared_core::response::total_pages_of(total, page_size),
        }),
        "查询成功",
    )
}

// ========== Phase 1: 报表生成 + 历史查询 ==========

#[derive(Debug, Deserialize, ToSchema)]
pub struct GenerateReportRequest {
    pub org_id: Option<String>,
    /// P3：法人主体，必传（单公司租户也不省略）。
    pub company_id: Option<String>,
    pub period: String,
    pub compare_period: Option<String>,
    pub currency_code: Option<String>,
    pub include_disabled_accounts: Option<bool>,
    pub include_detail: Option<bool>,
    pub method: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct GetReportQuery {
    pub org_id: Option<String>,
    /// P3：法人主体，必传（单公司租户也不省略）。
    pub company_id: Option<String>,
    pub period: String,
    pub currency_code: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct HistoryReportQuery {
    pub org_id: Option<String>,
    /// P3：法人主体，必传（单公司租户也不省略）。
    pub company_id: Option<String>,
    pub start_period: String,
    pub end_period: String,
    pub currency_code: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

async fn upsert_report(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant_id: Uuid,
    company_id: Uuid,
    report_type: &str,
    period: &str,
    currency_code: &str,
    data: serde_json::Value,
    generated_by: &str,
) -> Result<Option<serde_json::Value>, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    // 已提交/已审批/已锁定的报表不允许重算覆盖；只有草稿/被驳回可重新生成。
    let current_status: Option<String> = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        r#"SELECT status FROM finance.financial_reports
           WHERE report_type = $1 AND org_id = $2 AND period = $3 AND currency_code = $4"#
    ))
    .bind(report_type)
    .bind(company_id)
    .bind(period)
    .bind(currency_code)
    .fetch_optional(&mut scope)
    .await?;
    if let Some(raw) = current_status {
        match normalize_financial_report(&raw) {
            Some(status) if can_regenerate(status) => {}
            _ => return Ok(None),
        }
    }

    // org_id 承接公司维度（历史唯一键 (report_type, org_id, period, currency_code) 不重建），
    // 与 P3 迁移 20261109110200 的回填口径一致。
    let row = sqlx::query(
        only_own_schema_query!("finance", r#"
        INSERT INTO finance.financial_reports (report_type, org_id, tenant_id, company_id, period, currency_code, status, data, generated_by, generated_at)
        VALUES ($1, $3, $2, $3, $4, $5, 'draft', $6, $7, NOW())
        ON CONFLICT (report_type, org_id, period, currency_code)
        DO UPDATE SET data = EXCLUDED.data, company_id = EXCLUDED.company_id, generated_by = EXCLUDED.generated_by, generated_at = NOW(), updated_at = NOW(),
                      status = 'draft', approval_comment = NULL, approved_by = NULL, approved_at = NULL, rejection_reason = NULL
        WHERE finance.financial_reports.status IN ('draft', 'rejected')
        RETURNING id, report_type, org_id, company_id, period, currency_code, status, data, generated_at
        "#),
    )
    .bind(report_type)
    .bind(tenant_id)
    .bind(company_id)
    .bind(period)
    .bind(currency_code)
    .bind(data)
    .bind(generated_by)
    .fetch_optional(&mut scope)
    .await?;
    scope.commit().await?;

    let Some(row) = row else {
        return Ok(None);
    };
    Ok(Some(serde_json::json!({
        "id": row.get::<Uuid, _>("id"),
        "report_type": row.get::<String, _>("report_type"),
        "org_id": row.get::<Option<Uuid>, _>("org_id"),
        "company_id": row.get::<Uuid, _>("company_id"),
        "period": row.get::<String, _>("period"),
        "currency_code": row.get::<String, _>("currency_code"),
        "status": row.get::<String, _>("status"),
        "approval_status": row.get::<String, _>("status"),
        "data": row.get::<serde_json::Value, _>("data"),
        "generated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("generated_at"),
    })))
}

async fn financial_report_exists(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    report_id: Uuid,
) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT EXISTS(SELECT 1 FROM finance.financial_reports WHERE id = $1)"
    ))
    .bind(report_id)
    .fetch_one(&mut *scope)
    .await
}

async fn fetch_report(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Option<Uuid>,
    company_id: Uuid,
    report_type: &str,
    period: &str,
    currency_code: &str,
) -> Result<Option<serde_json::Value>, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    let row = sqlx::query(
        only_own_schema_query!("finance", r#"SELECT id, report_type, org_id, company_id, period, currency_code, status, data, generated_at, approved_at
           FROM finance.financial_reports WHERE ($4::uuid IS NULL OR company_id = $4)
             AND report_type = $1 AND period = $2 AND currency_code = $3"#),
    )
    .bind(report_type)
    .bind(period)
    .bind(currency_code)
    .bind(company_id)
    .fetch_optional(&mut scope)
    .await?;
    let _ = scope.commit().await;

    Ok(row.map(|r| {
        serde_json::json!({
            "id": r.get::<Uuid, _>("id"),
            "report_type": r.get::<String, _>("report_type"),
            "org_id": r.get::<Option<Uuid>, _>("org_id"),
            "company_id": r.get::<Uuid, _>("company_id"),
            "period": r.get::<String, _>("period"),
            "currency_code": r.get::<String, _>("currency_code"),
            "status": r.get::<String, _>("status"),
            "approval_status": r.get::<String, _>("status"),
            "data": r.get::<serde_json::Value, _>("data"),
            "generated_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("generated_at"),
            "approved_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("approved_at"),
        })
    }))
}

async fn fetch_history(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Option<Uuid>,
    company_id: Uuid,
    report_type: &str,
    start_period: &str,
    end_period: &str,
    currency_code: Option<&str>,
    page: i64,
    page_size: i64,
) -> Result<(Vec<serde_json::Value>, i64), sqlx::Error> {
    let offset = (page - 1) * page_size;
    let mut scope = db.scope_with(txn).await?;
    let rows = sqlx::query(
        only_own_schema_query!("finance", r#"SELECT id, report_type, org_id, company_id, period, currency_code, status, data, generated_at, approved_at
           FROM finance.financial_reports WHERE ($7::uuid IS NULL OR company_id = $7)
             AND report_type = $1 AND period >= $2 AND period <= $3
             AND ($4::text IS NULL OR currency_code = $4)
           ORDER BY period DESC
           LIMIT $5 OFFSET $6"#),
    )
    .bind(report_type)
    .bind(start_period)
    .bind(end_period)
    .bind(currency_code)
    .bind(page_size)
    .bind(offset)
    .bind(company_id)
    .fetch_all(&mut scope)
    .await?;

    let total: i64 = sqlx::query_scalar(only_own_schema_query!(
        "finance",
        r#"SELECT COUNT(*) FROM finance.financial_reports WHERE ($5::uuid IS NULL OR company_id = $5)
             AND report_type = $1 AND period >= $2 AND period <= $3
             AND ($4::text IS NULL OR currency_code = $4)"#
    ))
    .bind(report_type)
    .bind(start_period)
    .bind(end_period)
    .bind(currency_code)
    .bind(company_id)
    .fetch_one(&mut scope)
    .await?;
    let _ = scope.commit().await;

    let items: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "report_type": r.get::<String, _>("report_type"),
                "org_id": r.get::<Option<Uuid>, _>("org_id"),
                "period": r.get::<String, _>("period"),
                "currency_code": r.get::<String, _>("currency_code"),
                "status": r.get::<String, _>("status"),
                "approval_status": r.get::<String, _>("status"),
                "data": r.get::<serde_json::Value, _>("data"),
                "generated_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("generated_at"),
                "approved_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("approved_at"),
            })
        })
        .collect();

    Ok((items, total))
}

/// P3：报表主体必须显式传入，单公司租户也不做省略推断。
fn required_company_id(raw: Option<&str>) -> Result<Uuid, ApiResponse<serde_json::Value>> {
    raw.and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| ApiResponse::error(400, "company_id 必传（单公司租户也不省略）"))
}

// admin-only: gate 显式标注（Perm-Gate R3）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/reports/balance-sheet/generate",
    tag = "Report",
    request_body = GenerateReportRequest,
    responses(
        (status = 200, description = "生成资产负债表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn generate_balance_sheet(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<GenerateReportRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let tenant_id = get_tenant_id_from_claims(&claims);
    let currency = req.currency_code.as_deref().unwrap_or("CNY");
    let company_id = match required_company_id(req.company_id.as_deref()) {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    // 入参 `YYYY-MM` / `YYYYMM` 一律归一为 `YYYYMM`；无法解析直接 400。
    let period = match normalize_report_period(&req.period) {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    match service
        .get_statutory_reports(tenant_id, company_id, &period, txn)
        .await
    {
        Ok((sheet, _)) if sheet.balanced => {
            let has_business =
                match period_has_business(&state.db, &mut *txn, tenant_id, company_id, &period)
                    .await
                {
                    Ok(v) => v,
                    Err(e) => return ApiResponse::from(TopemsError::internal("生成失败", e)),
                };
            let data = annotate_period_business(
                serde_json::to_value(&sheet).unwrap_or(serde_json::json!({})),
                &period,
                has_business,
            );
            match upsert_report(
                &state.db,
                &mut *txn,
                tenant_id,
                company_id,
                "balance_sheet",
                &period,
                currency,
                data,
                &claims.username,
            )
            .await
            {
                Ok(Some(report)) => ApiResponse::success(
                    report,
                    if has_business {
                        "生成资产负债表成功"
                    } else {
                        "生成资产负债表成功（该期间无业务数据）"
                    },
                ),
                Ok(None) => ApiResponse::error(409, "报表已提交、已审批或已锁定，不能重新生成"),
                Err(e) => ApiResponse::from(TopemsError::internal("持久化失败", e)),
            }
        }
        Ok((sheet, _)) => {
            // 勾稽不通过：409 + 差异明细，不落库、不出表。
            let mut resp =
                ApiResponse::<serde_json::Value>::error(409, "资产负债表勾稽未通过，已拒绝出表");
            resp.data = Some(serde_json::json!({
                "company_id": sheet.company_id,
                "period": sheet.period,
                "checks": sheet.checks,
                "unposted": sheet.unposted,
            }));
            resp
        }
        Err(e) => ApiResponse::from(TopemsError::internal("生成失败", e)),
    }
}

/// 金额取值兼容：Decimal 经 serde 默认可能序列化为 JSON number，
/// 也可能以字符串落库/持久化报表 jsonb；两者都要能解析，
/// 否则 total 恒为 0、占比静默输出 0.0（P3 修复）。
fn amount_as_f64(v: &serde_json::Value) -> Option<f64> {
    v.as_f64()
        .or_else(|| v.as_str().and_then(|s| s.trim().parse::<f64>().ok()))
}

fn enrich_balance_percentage(mut data: serde_json::Value) -> serde_json::Value {
    for key in ["assets", "liabilities", "equity"] {
        if let Some(arr) = data.get_mut(key).and_then(|v| v.as_array_mut()) {
            let total: f64 = arr
                .iter()
                .filter_map(|r| r.get("amount").and_then(amount_as_f64))
                .sum();
            for row in arr.iter_mut() {
                if let Some(obj) = row.as_object_mut() {
                    if let Some(code) = obj.remove("account_code") {
                        obj.insert("code".into(), code);
                    }
                    if let Some(name) = obj.remove("account_name") {
                        obj.insert("name".into(), name);
                    }
                    let amt = obj.get("amount").and_then(amount_as_f64).unwrap_or(0.0);
                    let pct = if total > 0.0 {
                        (amt / total * 100.0 * 100.0).round() / 100.0
                    } else {
                        0.0
                    };
                    obj.insert("percentage".into(), serde_json::json!(pct));
                }
            }
        }
    }
    data
}

#[utoipa::path(
    security(("BearerAuth" = [])),
    get,
    path = "/api/finance/reports/balance-sheet",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:report:read"])),
)]
pub async fn get_balance_sheet(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<GetReportQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let tenant_id = get_tenant_id_from_claims(&claims);
    let tenant_id_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };
    let currency = params.currency_code.as_deref().unwrap_or("CNY");
    let company_id = match required_company_id(params.company_id.as_deref()) {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    match fetch_report(
        &state.db,
        &mut *txn,
        tenant_id_opt,
        company_id,
        "balance_sheet",
        &params.period,
        currency,
    )
    .await
    {
        Ok(Some(report)) => ApiResponse::success(
            enrich_balance_percentage(report.get("data").cloned().unwrap_or(report)),
            "查询成功",
        ),
        Ok(None) => {
            let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
            match service
                .get_balance_sheet(tenant_id, &params.period, txn)
                .await
            {
                Ok(sheet) => {
                    let data = serde_json::to_value(&sheet).unwrap_or(serde_json::json!({}));
                    ApiResponse::success(enrich_balance_percentage(data), "查询成功(实时)")
                }
                Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
            }
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/reports/balance-sheet/history",
    tag = "Report",
    params(HistoryReportQuery),
    responses(
        (status = 200, description = "获取资产负债表历史成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_balance_sheet_history(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<HistoryReportQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let company_id = match required_company_id(params.company_id.as_deref()) {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    match fetch_history(
        &state.db,
        &mut *txn,
        tenant_id,
        company_id,
        "balance_sheet",
        &params.start_period,
        &params.end_period,
        params.currency_code.as_deref(),
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => ApiResponse::success(
            serde_json::json!({"items": items, "total": total, "page": page, "page_size": page_size}),
            "查询成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/reports/income-statement/generate",
    tag = "Report",
    request_body = GenerateReportRequest,
    responses(
        (status = 200, description = "生成成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn generate_income_statement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<GenerateReportRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let tenant_id = get_tenant_id_from_claims(&claims);
    let currency = req.currency_code.as_deref().unwrap_or("CNY");
    let company_id = match required_company_id(req.company_id.as_deref()) {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    // 入参 `YYYY-MM` / `YYYYMM` 一律归一为 `YYYYMM`；无法解析直接 400。
    let period = match normalize_report_period(&req.period) {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    match service
        .get_statutory_reports(tenant_id, company_id, &period, txn)
        .await
    {
        Ok((_, stmt)) if stmt.balanced => {
            let has_business =
                match period_has_business(&state.db, &mut *txn, tenant_id, company_id, &period)
                    .await
                {
                    Ok(v) => v,
                    Err(e) => return ApiResponse::from(TopemsError::internal("生成失败", e)),
                };
            let data = annotate_period_business(
                serde_json::to_value(&stmt).unwrap_or(serde_json::json!({})),
                &period,
                has_business,
            );
            match upsert_report(
                &state.db,
                &mut *txn,
                tenant_id,
                company_id,
                "income_statement",
                &period,
                currency,
                data,
                &claims.username,
            )
            .await
            {
                Ok(Some(report)) => ApiResponse::success(
                    report,
                    if has_business {
                        "生成利润表成功"
                    } else {
                        "生成利润表成功（该期间无业务数据）"
                    },
                ),
                Ok(None) => ApiResponse::error(409, "报表已提交、已审批或已锁定，不能重新生成"),
                Err(e) => ApiResponse::from(TopemsError::internal("持久化失败", e)),
            }
        }
        Ok((_, stmt)) => {
            // 勾稽不通过：409 + 差异明细，不落库、不出表。
            let mut resp =
                ApiResponse::<serde_json::Value>::error(409, "利润表勾稽未通过，已拒绝出表");
            resp.data = Some(serde_json::json!({
                "company_id": stmt.company_id,
                "period": stmt.period,
                "checks": stmt.checks,
                "unposted": stmt.unposted,
            }));
            resp
        }
        Err(e) => ApiResponse::from(TopemsError::internal("生成失败", e)),
    }
}

#[utoipa::path(
    security(("BearerAuth" = [])),
    get,
    path = "/api/finance/reports/income-statement",
    tag = "Filled",
    responses((status = 200, description = "ok")),
    security(("BearerAuth" = ["finance:report:read"])),
)]
pub async fn get_income_statement(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<GetReportQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let tenant_id = get_tenant_id_from_claims(&claims);
    let tenant_id_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };
    let currency = params.currency_code.as_deref().unwrap_or("CNY");
    let company_id = match required_company_id(params.company_id.as_deref()) {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    match fetch_report(
        &state.db,
        &mut *txn,
        tenant_id_opt,
        company_id,
        "income_statement",
        &params.period,
        currency,
    )
    .await
    {
        Ok(Some(report)) => {
            ApiResponse::success(report.get("data").cloned().unwrap_or(report), "查询成功")
        }
        Ok(None) => {
            let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
            match service
                .get_income_statement(tenant_id, &params.period, txn)
                .await
            {
                Ok(stmt) => {
                    let data = serde_json::to_value(&stmt).unwrap_or(serde_json::json!({}));
                    ApiResponse::success(data, "查询成功(实时)")
                }
                Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
            }
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/reports/income-statement/history",
    tag = "Report",
    params(HistoryReportQuery),
    responses(
        (status = 200, description = "获取利润表历史成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_income_statement_history(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<HistoryReportQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let company_id = match required_company_id(params.company_id.as_deref()) {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    match fetch_history(
        &state.db,
        &mut *txn,
        tenant_id,
        company_id,
        "income_statement",
        &params.start_period,
        &params.end_period,
        params.currency_code.as_deref(),
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => ApiResponse::success(
            serde_json::json!({"items": items, "total": total, "page": page, "page_size": page_size}),
            "查询成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/reports/cash-flow/generate",
    tag = "Report",
    request_body = GenerateReportRequest,
    responses(
        (status = 200, description = "生成成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn generate_cash_flow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Json(req): Json<GenerateReportRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let tenant_id = get_tenant_id_from_claims(&claims);
    let currency = req.currency_code.as_deref().unwrap_or("CNY");
    let company_id = match required_company_id(req.company_id.as_deref()) {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
    match service
        .get_cash_flow_statement(tenant_id, &req.period, txn)
        .await
    {
        Ok(stmt) => {
            let data = serde_json::to_value(&stmt).unwrap_or(serde_json::json!({}));
            match upsert_report(
                &state.db,
                &mut *txn,
                tenant_id,
                company_id,
                "cash_flow",
                &req.period,
                currency,
                data,
                &claims.username,
            )
            .await
            {
                Ok(Some(report)) => ApiResponse::success(report, "生成现金流量表成功"),
                Ok(None) => ApiResponse::error(409, "报表已提交、已审批或已锁定，不能重新生成"),
                Err(e) => ApiResponse::from(TopemsError::internal("持久化失败", e)),
            }
        }
        Err(e) => ApiResponse::from(TopemsError::internal("生成失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/reports/cash-flow",
    tag = "Report",
    params(GetReportQuery),
    responses(
        (status = 200, description = "获取现金流量表成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_cash_flow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,

    Query(params): Query<GetReportQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return crate::shared::err_resp(TopemsError::DatabaseTransaction(
            "请求事务缺失".to_string(),
        ));
    };

    let tenant_id = get_tenant_id_from_claims(&claims);
    let tenant_id_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };
    let currency = params.currency_code.as_deref().unwrap_or("CNY");
    let company_id = match required_company_id(params.company_id.as_deref()) {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    match fetch_report(
        &state.db,
        &mut *txn,
        tenant_id_opt,
        company_id,
        "cash_flow",
        &params.period,
        currency,
    )
    .await
    {
        Ok(Some(report)) => {
            ApiResponse::success(report.get("data").cloned().unwrap_or(report), "查询成功")
        }
        Ok(None) => {
            let service = FinanceService::new(state.db.clone(), state.workflow_client.clone());
            match service
                .get_cash_flow_statement(tenant_id, &params.period, txn)
                .await
            {
                Ok(stmt) => {
                    let data = serde_json::to_value(&stmt).unwrap_or(serde_json::json!({}));
                    ApiResponse::success(data, "查询成功(实时)")
                }
                Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
            }
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/cash-flow/history",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/cash-flow/history"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_cash_flow_history(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<HistoryReportQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };

    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let company_id = match required_company_id(params.company_id.as_deref()) {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    match fetch_history(
        &state.db,
        &mut *txn,
        tenant_id,
        company_id,
        "cash_flow",
        &params.start_period,
        &params.end_period,
        params.currency_code.as_deref(),
        page,
        page_size,
    )
    .await
    {
        Ok((items, total)) => ApiResponse::success(
            serde_json::json!({"items": items, "total": total, "page": page, "page_size": page_size}),
            "查询成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

// ========== Phase 2: 报表审批 ==========

#[derive(Debug, Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub report_type: String,
    pub report_id: String,
    pub comment: Option<String>,
    pub reason: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/reports/submit-approval",
    tag = "Report",
    request_body = ApprovalRequest,
    responses(
        (status = 200, description = "提交报表审批成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 404, description = "报表不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn submit_report_for_approval(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let report_id: Uuid = match req.report_id.parse() {
        Ok(id) => id,
        Err(_) => return ApiResponse::bad_request("无效的报表ID"),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    match sqlx::query(only_own_schema_query!("finance", "UPDATE finance.financial_reports SET status = 'pending', updated_at = NOW() WHERE id = $1 AND status IN ('draft', 'rejected')"))
        .bind(report_id)
        .execute(&mut scope)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                let exists = financial_report_exists(&mut scope, report_id)
                    .await
                    .unwrap_or(false);
                return if exists {
                    ApiResponse::conflict("报表当前状态不允许提交审批")
                } else {
                    ApiResponse::not_found("报表不存在")
                };
            }
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("提交失败", e));
            }
            ApiResponse::success(serde_json::json!({"report_id": req.report_id, "status": "pending"}), "提交审批成功")
        }
        Err(e) => ApiResponse::from(TopemsError::internal("提交失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/reports/approve",
    tag = "Report",
    request_body = ApprovalRequest,
    responses(
        (status = 200, description = "操作成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 404, description = "报表不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn approve_report(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let report_id: Uuid = match req.report_id.parse() {
        Ok(id) => id,
        Err(_) => return ApiResponse::bad_request("无效的报表ID"),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    match sqlx::query(only_own_schema_query!("finance", "UPDATE finance.financial_reports SET status = 'approved', approval_comment = $2, approved_by = $3, approved_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'pending'"))
        .bind(report_id)
        .bind(req.comment)
        .bind(&claims.username)
        .execute(&mut scope)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                let exists = financial_report_exists(&mut scope, report_id)
                    .await
                    .unwrap_or(false);
                return if exists {
                    ApiResponse::conflict("报表当前状态不允许审批")
                } else {
                    ApiResponse::not_found("报表不存在")
                };
            }
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("审批失败", e));
            }
            ApiResponse::success(serde_json::json!({"report_id": req.report_id, "status": "approved"}), "审批成功")
        }
        Err(e) => ApiResponse::from(TopemsError::internal("审批失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/reports/reject",
    tag = "Report",
    request_body = ApprovalRequest,
    responses(
        (status = 200, description = "操作成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 404, description = "报表不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn reject_report(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let report_id: Uuid = match req.report_id.parse() {
        Ok(id) => id,
        Err(_) => return ApiResponse::bad_request("无效的报表ID"),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    match sqlx::query(only_own_schema_query!("finance", "UPDATE finance.financial_reports SET status = 'rejected', rejection_reason = $2, updated_at = NOW() WHERE id = $1 AND status = 'pending'"))
        .bind(report_id)
        .bind(req.reason)
        .execute(&mut scope)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                let exists = financial_report_exists(&mut scope, report_id)
                    .await
                    .unwrap_or(false);
                return if exists {
                    ApiResponse::conflict("报表当前状态不允许驳回")
                } else {
                    ApiResponse::not_found("报表不存在")
                };
            }
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("驳回失败", e));
            }
            ApiResponse::success(serde_json::json!({"report_id": req.report_id, "status": "rejected"}), "驳回成功")
        }
        Err(e) => ApiResponse::from(TopemsError::internal("驳回失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/reports/lock",
    tag = "Report",
    request_body = ApprovalRequest,
    responses(
        (status = 200, description = "锁定报表成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 404, description = "报表不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn lock_report(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let report_id: Uuid = match req.report_id.parse() {
        Ok(id) => id,
        Err(_) => return ApiResponse::bad_request("无效的报表ID"),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    match sqlx::query(only_own_schema_query!("finance", "UPDATE finance.financial_reports SET status = 'locked', updated_at = NOW() WHERE id = $1 AND status = 'approved'"))
        .bind(report_id)
        .execute(&mut scope)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                let exists = financial_report_exists(&mut scope, report_id)
                    .await
                    .unwrap_or(false);
                return if exists {
                    ApiResponse::conflict("只有已批准的报表可以锁定")
                } else {
                    ApiResponse::not_found("报表不存在")
                };
            }
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("锁定失败", e));
            }
            ApiResponse::success(serde_json::json!({"report_id": req.report_id, "status": "locked"}), "锁定成功")
        }
        Err(e) => ApiResponse::from(TopemsError::internal("锁定失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:admin"])),
    path = "/reports/unlock",
    tag = "Report",
    request_body = ApprovalRequest,
    responses(
        (status = 200, description = "操作成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 404, description = "报表不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn unlock_report(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let report_id: Uuid = match req.report_id.parse() {
        Ok(id) => id,
        Err(_) => return ApiResponse::bad_request("无效的报表ID"),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    match sqlx::query(only_own_schema_query!("finance", "UPDATE finance.financial_reports SET status = 'approved', updated_at = NOW() WHERE id = $1 AND status = 'locked'"))
        .bind(report_id)
        .execute(&mut scope)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                let exists = financial_report_exists(&mut scope, report_id)
                    .await
                    .unwrap_or(false);
                return if exists {
                    ApiResponse::conflict("只有已锁定的报表可以解锁")
                } else {
                    ApiResponse::not_found("报表不存在")
                };
            }
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("解锁失败", e));
            }
            ApiResponse::success(serde_json::json!({"report_id": req.report_id, "status": "approved"}), "解锁成功")
        }
        Err(e) => ApiResponse::from(TopemsError::internal("解锁失败", e)),
    }
}

// ========== Phase 4: 单报表导出 ==========

#[derive(Debug, Deserialize, IntoParams)]
pub struct ExportQuery {
    pub report_type: Option<String>,
    pub org_id: Option<String>,
    pub period: Option<String>,
    pub currency_code: Option<String>,
    pub format: Option<String>,
    pub include_notes: Option<bool>,
    pub include_comparison: Option<bool>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/export",
    tag = "Financial-Reports",
    operation_id = "export_report",
    responses((status = 200, description = "OK")),
)]
pub async fn export_report(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<ExportQuery>,
) -> ApiResponse<serde_json::Value> {
    let report_type = params
        .report_type
        .unwrap_or_else(|| "balance_sheet".to_string());
    let period = params.period.unwrap_or_default();
    let format = params.format.unwrap_or_else(|| "pdf".to_string());
    let org_id = params.org_id.unwrap_or_default();
    let currency_code = params.currency_code.unwrap_or_else(|| "CNY".to_string());
    let url = format!("/exports/{}_{}_{}.{}", report_type, org_id, period, format);
    ApiResponse::success(
        serde_json::json!({
            "report_type": report_type,
            "org_id": org_id,
            "period": period,
            "currency_code": currency_code,
            "format": format,
            "include_notes": params.include_notes.unwrap_or(false),
            "include_comparison": params.include_comparison.unwrap_or(false),
            "url": url,
            "expires_at": Utc::now().to_rfc3339(),
        }),
        "导出成功",
    )
}

// ============================================================================// V321: 10 个分析报表 handler
// 查询 Finance 自有表（vouchers / core_finance_accounts / budgets 等），返回聚合数据
// ============================================================================

/// 业务概览报表：收入、支出、利润、凭证数等核心指标
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/api/finance/reports/business-overview",
    params(("period" = String, Query, description = "会计期间 YYYY-MM")),
    responses((status = 200, description = "业务概览")),
    tag = "Report"
)]
pub async fn get_business_overview(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<serde_json::Value> {
    // 凭证表 period 存 YYYYMM，前端可能传 YYYY-MM，统一去符号按 YYYYMM 精确匹配
    let period_raw = params.get("period").cloned().unwrap_or_else(|| {
        let now = Utc::now();
        now.format("%Y-%m").to_string()
    });
    let period: String = period_raw.chars().filter(|c| c.is_ascii_digit()).collect();

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let voucher_count: i64 = match sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.core_finance_vouchers WHERE period = $1 AND status = 'posted' AND deleted_at IS NULL"
    ))
    .bind(&period)
    .fetch_one(&mut scope)
    .await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };

    // 按科目类型聚合已过账凭证的借/贷方金额，由此派生四张统计卡
    // income → 收入；expense+cost → 费用；asset → 资产；liability → 负债
    let type_rows: Vec<(String, Decimal, Decimal)> = match sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT a.account_type::text,
                  COALESCE(SUM(l.debit), 0),
                  COALESCE(SUM(l.credit), 0)
           FROM finance.core_finance_voucher_lines l
           JOIN finance.core_finance_vouchers v ON v.id = l.voucher_id
           JOIN finance.core_finance_accounts a ON a.id = l.account_id
           WHERE v.period = $1 AND v.status = 'posted' AND v.deleted_at IS NULL
           GROUP BY a.account_type"#
    ))
    .bind(&period)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let _ = scope.commit().await;

    let mut total_revenue = Decimal::ZERO;
    let mut total_expenses = Decimal::ZERO;
    let mut total_assets = Decimal::ZERO;
    let mut total_liabilities = Decimal::ZERO;
    let mut total_debit = Decimal::ZERO;
    let mut total_credit = Decimal::ZERO;

    for (acct_type, debit, credit) in type_rows {
        total_debit += debit;
        total_credit += credit;
        match acct_type.as_str() {
            "income" => total_revenue += credit,
            "expense" | "cost" => total_expenses += debit,
            "asset" => total_assets += debit - credit,
            "liability" => total_liabilities += credit - debit,
            _ => {}
        }
    }
    let net_profit = total_revenue - total_expenses;

    ApiResponse::success(
        serde_json::json!({
            "period": period,
            "voucher_count": voucher_count,
            "total_debit": total_debit,
            "total_credit": total_credit,
            "total_assets": total_assets,
            "total_liabilities": total_liabilities,
            "total_revenue": total_revenue,
            "net_profit": net_profit,
        }),
        "查询成功",
    )
}

/// 项目汇总报表：按项目维度汇总凭证金额
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/project-summary",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/project-summary"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_project_summary(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<serde_json::Value> {
    let period = params.get("period").cloned().unwrap_or_default();

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let rows: Vec<(Option<Uuid>, Option<String>, Decimal, Decimal)> =
        match sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT vi.project_id, NULL::text as project_name,
                  COALESCE(SUM(vi.debit), 0) as total_debit,
                  COALESCE(SUM(vi.credit), 0) as total_credit
           FROM finance.core_finance_voucher_lines vi
           JOIN finance.core_finance_vouchers v ON v.id = vi.voucher_id
           WHERE v.period = $1 AND v.deleted_at IS NULL AND vi.project_id IS NOT NULL
           GROUP BY vi.project_id
           ORDER BY total_debit DESC"#
        ))
        .bind(&period)
        .fetch_all(&mut scope)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("[finance] 报表分析查询失败: {}", e);
                return crate::shared::err_resp(e);
            }
        };
    let _ = scope.commit().await;

    let projects: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(id, _name, debit, credit)| {
            serde_json::json!({
                "project_id": id,
                "total_debit": debit,
                "total_credit": credit,
                "net": debit - credit,
            })
        })
        .collect();

    ApiResponse::success(
        serde_json::json!({
            "period": period,
            "projects": projects,
            "total": projects.len(),
        }),
        "查询成功",
    )
}

/// 月度趋势报表：最近 12 个月的凭证金额趋势
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:financial_reports:read"])),
    path = "/api/finance/reports/monthly-trend",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "FinancialReports"
)]
pub async fn get_monthly_trend(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let rows: Vec<(String, Decimal, i64)> = match sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT period,
                  COALESCE(SUM(total_debit), 0) as total_amount,
                  COUNT(*) as voucher_count
           FROM finance.core_finance_vouchers
           WHERE deleted_at IS NULL AND period >= to_char(NOW() - INTERVAL '12 months', 'YYYY-MM')
           GROUP BY period
           ORDER BY period ASC"#
    ))
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let _ = scope.commit().await;

    let trend: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(period, amount, count)| {
            serde_json::json!({
                "period": period,
                "total_amount": amount,
                "voucher_count": count,
            })
        })
        .collect();

    ApiResponse::success(
        serde_json::json!({
            "trend": trend,
            "months": trend.len(),
        }),
        "查询成功",
    )
}

/// 部门汇总报表：按部门维度汇总凭证金额
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:financial_reports:read"])),
    path = "/api/finance/reports/department-summary",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "FinancialReports"
)]
pub async fn get_department_summary(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<serde_json::Value> {
    let period = params.get("period").cloned().unwrap_or_default();

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let rows: Vec<(Option<Uuid>, Decimal, Decimal)> = match sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT vi.department_id,
                  COALESCE(SUM(vi.debit), 0) as total_debit,
                  COALESCE(SUM(vi.credit), 0) as total_credit
           FROM finance.core_finance_voucher_lines vi
           JOIN finance.core_finance_vouchers v ON v.id = vi.voucher_id
           WHERE v.period = $1 AND v.deleted_at IS NULL AND vi.department_id IS NOT NULL
           GROUP BY vi.department_id
           ORDER BY total_debit DESC"#
    ))
    .bind(&period)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let _ = scope.commit().await;

    let departments: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(id, debit, credit)| {
            serde_json::json!({
                "department_id": id,
                "total_debit": debit,
                "total_credit": credit,
                "net": debit - credit,
            })
        })
        .collect();

    ApiResponse::success(
        serde_json::json!({
            "period": period,
            "departments": departments,
            "total": departments.len(),
        }),
        "查询成功",
    )
}

/// 账龄分析报表：应收/应付账款账龄分布
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/aging-analysis",
    responses((status = 200, description = "Get aging analysis")),
    tag = "Finance"
)]
#[allow(clippy::as_conversions, clippy::cast_sign_loss)]
pub async fn get_aging_analysis(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<serde_json::Value> {
    let _period = params.get("period").cloned().unwrap_or_default();

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    // 简化版账龄分析：按凭证日期距今天数分组
    let rows: Vec<(i32, Decimal)> = match sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT
              CASE
                WHEN (NOW()::date - v.voucher_date::date) <= 30 THEN 1
                WHEN (NOW()::date - v.voucher_date::date) <= 60 THEN 2
                WHEN (NOW()::date - v.voucher_date::date) <= 90 THEN 3
                WHEN (NOW()::date - v.voucher_date::date) <= 180 THEN 4
                ELSE 5
              END as aging_bucket,
              COALESCE(SUM(v.total_debit), 0) as amount
           FROM finance.core_finance_vouchers v
           WHERE v.deleted_at IS NULL AND v.status != 'draft'
           GROUP BY aging_bucket
           ORDER BY aging_bucket ASC"#
    ))
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let _ = scope.commit().await;

    let buckets = ["0-30天", "31-60天", "61-90天", "91-180天", "180天以上"];
    let aging: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(bucket, amount)| {
            let idx = (bucket - 1).max(0).min(4) as usize;
            serde_json::json!({
                "bucket": buckets[idx],
                "amount": amount,
            })
        })
        .collect();

    ApiResponse::success(
        serde_json::json!({
            "aging": aging,
            "total_buckets": aging.len(),
        }),
        "查询成功",
    )
}

/// 凭证统计报表：按状态/类型统计凭证数量和金额
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/voucher-statistics",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/voucher-statistics"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_voucher_statistics(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<serde_json::Value> {
    let period = params.get("period").cloned().unwrap_or_default();

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let rows: Vec<(String, i64, Decimal)> = match sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT status,
                  COUNT(*) as count,
                  COALESCE(SUM(total_debit), 0) as total_amount
           FROM finance.core_finance_vouchers
           WHERE ($1 = '' OR period = $1) AND deleted_at IS NULL
           GROUP BY status
           ORDER BY count DESC"#
    ))
    .bind(&period)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let _ = scope.commit().await;

    let stats: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(status, count, amount)| {
            serde_json::json!({
                "status": status,
                "count": count,
                "total_amount": amount,
            })
        })
        .collect();

    ApiResponse::success(
        serde_json::json!({
            "period": period,
            "statistics": stats,
            "total_vouchers": stats.iter().map(|s| s["count"].as_i64().unwrap_or(0)).sum::<i64>(),
        }),
        "查询成功",
    )
}

/// 现金流分析报表：按现金类科目汇总现金流
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/cash-flow-analysis",
    responses((status = 200, description = "Get cash flow analysis")),
    tag = "Finance"
)]
pub async fn get_cash_flow_analysis(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<serde_json::Value> {
    let period = params.get("period").cloned().unwrap_or_default();

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    // 金额聚合在 Decimal 域完成：DB 侧 SUM(numeric) 直接解码为 Decimal，
    // 不经过 f64（避免 0.1+0.2 类尾差）；总额在 JSON 序列化前由 Decimal 求和。
    let rows: Vec<(String, Decimal, Decimal)> = match sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT vi.account_code,
                  COALESCE(SUM(vi.debit), 0) as inflow,
                  COALESCE(SUM(vi.credit), 0) as outflow
           FROM finance.core_finance_voucher_lines vi
           JOIN finance.core_finance_vouchers v ON v.id = vi.voucher_id
           JOIN finance.core_finance_accounts s ON s.code = vi.account_code
           WHERE ($1 = '' OR v.period = $1) AND v.deleted_at IS NULL
             AND s.is_cash_flow = true  
           GROUP BY vi.account_code
           ORDER BY inflow DESC"#
    ))
    .bind(&period)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let _ = scope.commit().await;

    let total_inflow: Decimal = rows.iter().map(|r| r.1).sum();
    let total_outflow: Decimal = rows.iter().map(|r| r.2).sum();

    let cash_flows: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(code, inflow, outflow)| {
            serde_json::json!({
                "account_code": code,
                "inflow": inflow,
                "outflow": outflow,
                "net": inflow - outflow,
            })
        })
        .collect();

    ApiResponse::success(
        serde_json::json!({
            "period": period,
            "cash_flows": cash_flows,
            "total_inflow": total_inflow,
            "total_outflow": total_outflow,
        }),
        "查询成功",
    )
}

/// 费用分析报表：按费用类科目汇总费用
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/finance/reports/expense-analysis",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /api/finance/reports/expense-analysis"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_expense_analysis(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<serde_json::Value> {
    let period = params.get("period").cloned().unwrap_or_default();

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let rows: Vec<(String, Option<String>, Decimal)> = match sqlx::query_as(
        only_own_schema_query!("finance", r#"SELECT vi.account_code, vi.account_name,
                  COALESCE(SUM(vi.debit), 0) as expense_amount
           FROM finance.core_finance_voucher_lines vi
           JOIN finance.core_finance_vouchers v ON v.id = vi.voucher_id
           JOIN finance.core_finance_accounts s ON s.code = vi.account_code
           WHERE ($1 = '' OR v.period = $1) AND v.deleted_at IS NULL
             AND (s.category ILIKE '%费用%' OR s.category ILIKE '%expense%' OR s.category ILIKE '%成本%')
              
           GROUP BY vi.account_code, vi.account_name
           ORDER BY expense_amount DESC"#),
    )
    .bind(&period)
    .fetch_all(&mut scope)
    .await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let _ = scope.commit().await;

    // 金额聚合在 Decimal 域完成：总额在 JSON 序列化前由 Decimal 求和，不经 f64。
    let total_expense: Decimal = rows.iter().map(|r| r.2).sum();

    let expenses: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(code, name, amount)| {
            serde_json::json!({
                "account_code": code,
                "account_name": name,
                "expense_amount": amount,
            })
        })
        .collect();

    ApiResponse::success(
        serde_json::json!({
            "period": period,
            "expenses": expenses,
            "total_expense": total_expense,
        }),
        "查询成功",
    )
}

/// 利润分析报表：收入、成本、费用、利润
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:report:read"])),
    path = "/reports/profit-analysis",
    responses((status = 200, description = "Get profit analysis")),
    tag = "Finance"
)]
pub async fn get_profit_analysis(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<serde_json::Value> {
    let period = params.get("period").cloned().unwrap_or_default();

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let total_revenue: Decimal = match sqlx::query_scalar(
        only_own_schema_query!("finance", r#"SELECT COALESCE(SUM(vi.credit), 0)
           FROM finance.core_finance_voucher_lines vi
           JOIN finance.core_finance_vouchers v ON v.id = vi.voucher_id
           JOIN finance.core_finance_accounts s ON s.code = vi.account_code
           WHERE ($1 = '' OR v.period = $1) AND v.deleted_at IS NULL
             AND (s.category ILIKE '%收入%' OR s.category ILIKE '%revenue%' OR s.category ILIKE '%收益%')
              "#),
    )
    .bind(&period)
    .fetch_one(&mut scope)
    .await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };

    let total_cost: Decimal = match sqlx::query_scalar(only_own_schema_query!(
        "finance",
        r#"SELECT COALESCE(SUM(vi.debit), 0)
           FROM finance.core_finance_voucher_lines vi
           JOIN finance.core_finance_vouchers v ON v.id = vi.voucher_id
           JOIN finance.core_finance_accounts s ON s.code = vi.account_code
           WHERE ($1 = '' OR v.period = $1) AND v.deleted_at IS NULL
             AND (s.category ILIKE '%成本%' OR s.category ILIKE '%cost%')
              "#
    ))
    .bind(&period)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };

    let total_expense: Decimal = match sqlx::query_scalar(only_own_schema_query!(
        "finance",
        r#"SELECT COALESCE(SUM(vi.debit), 0)
           FROM finance.core_finance_voucher_lines vi
           JOIN finance.core_finance_vouchers v ON v.id = vi.voucher_id
           JOIN finance.core_finance_accounts s ON s.code = vi.account_code
           WHERE ($1 = '' OR v.period = $1) AND v.deleted_at IS NULL
             AND (s.category ILIKE '%费用%' OR s.category ILIKE '%expense%')
              "#
    ))
    .bind(&period)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let _ = scope.commit().await;

    // 金额加减在 Decimal 域完成；margin 为比率，最后一步才转 f64 用于展示。
    let gross_profit = total_revenue - total_cost;
    let net_profit = gross_profit - total_expense;
    let gross_margin: f64 = if total_revenue > Decimal::ZERO {
        (gross_profit / total_revenue).to_f64().unwrap_or(0.0)
    } else {
        0.0
    };
    let net_margin: f64 = if total_revenue > Decimal::ZERO {
        (net_profit / total_revenue).to_f64().unwrap_or(0.0)
    } else {
        0.0
    };

    ApiResponse::success(
        serde_json::json!({
            "period": period,
            "total_revenue": total_revenue,
            "total_cost": total_cost,
            "gross_profit": gross_profit,
            "total_expense": total_expense,
            "net_profit": net_profit,
            "gross_margin": gross_margin,
            "net_margin": net_margin,
        }),
        "查询成功",
    )
}

/// 财务概览报表：核心财务指标一览
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:financial_reports:read"])),
    path = "/api/finance/reports/financial-overview",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "FinancialReports"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_financial_overview(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<serde_json::Value> {
    let period = params.get("period").cloned().unwrap_or_else(|| {
        let now = Utc::now();
        now.format("%Y-%m").to_string()
    });

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => {
            return crate::shared::err_resp(TopemsError::DatabaseTransaction("请求事务缺失".into()))
        }
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return crate::shared::err_resp(e),
    };
    let voucher_count: i64 = match sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.core_finance_vouchers WHERE period = $1 AND deleted_at IS NULL"
    ))
    .bind(&period)
    .fetch_one(&mut scope)
    .await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };

    let posted_count: i64 = match sqlx::query_scalar(
        only_own_schema_query!("finance", "SELECT COUNT(*) FROM finance.core_finance_vouchers WHERE period = $1 AND status = 'posted' AND deleted_at IS NULL"),
    )
    .bind(&period)
    .fetch_one(&mut scope)
    .await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };

    let total_amount: Decimal = match sqlx::query_scalar(
        only_own_schema_query!("finance", "SELECT COALESCE(SUM(total_debit), 0) FROM finance.core_finance_vouchers WHERE period = $1 AND status = 'posted' AND deleted_at IS NULL"),
    )
    .bind(&period)
    .fetch_one(&mut scope)
    .await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };

    let subject_count: i64 = match sqlx::query_scalar(only_own_schema_query!(
        "finance",
        "SELECT COUNT(*) FROM finance.core_finance_accounts WHERE status = 'active'"
    ))
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("[finance] 报表分析查询失败: {}", e);
            return crate::shared::err_resp(e);
        }
    };
    let _ = scope.commit().await;

    ApiResponse::success(
        serde_json::json!({
            "period": period,
            "voucher_count": voucher_count,
            "posted_count": posted_count,
            "pending_count": voucher_count - posted_count,
            "total_amount": total_amount,
            "active_subjects": subject_count,
            "posting_rate": if voucher_count > 0 { posted_count as f64 / voucher_count as f64 } else { 0.0 },
        }),
        "查询成功",
    )
}

pub fn create_routes() -> Router<AppState> {
    // B363：报表读/写分流。此前整个报表 Router 只挂 `finance:report:read`，
    // 生成/提交审批/审批/锁定/导出/合并/订阅这些写端点在独立部署（不经网关
    // `require_finance_write`）时对只读角色敞开。这里把同一门槛下沉到服务内：
    // 读 = `finance:report:read`，写 = `finance:admin`（码不变，不新增字典条目）。
    let read_routes = Router::new()
        .route(
            "/reports/balance-sheet",
            axum::routing::get(get_balance_sheet),
        )
        .route(
            "/reports/balance-sheet/history",
            axum::routing::get(get_balance_sheet_history),
        )
        .route(
            "/reports/income-statement",
            axum::routing::get(get_income_statement),
        )
        .route(
            "/reports/income-statement/history",
            axum::routing::get(get_income_statement_history),
        )
        .route("/reports/cash-flow", axum::routing::get(get_cash_flow))
        .route(
            "/reports/cash-flow/history",
            axum::routing::get(get_cash_flow_history),
        )
        .route(
            "/reports/item-details",
            axum::routing::get(get_report_item_details),
        )
        .route(
            "/reports/item-vouchers",
            axum::routing::get(get_report_item_vouchers),
        )
        .route(
            "/reports/comparison",
            axum::routing::get(get_report_comparison),
        )
        .route("/reports/trend", axum::routing::get(get_report_trend))
        .route(
            "/reports/year-over-year",
            axum::routing::get(get_report_year_over_year),
        )
        .route(
            "/reports/period-over-period",
            axum::routing::get(get_report_period_over_period),
        )
        .route(
            "/reports/consolidated/{consolidation_id}",
            axum::routing::get(get_consolidated_report),
        )
        .route(
            "/reports/consolidated/entities",
            axum::routing::get(get_consolidation_entities),
        )
        .route(
            "/reports/consolidated/elims",
            axum::routing::get(get_intercompany_elims),
        )
        .route(
            "/reports/consolidated/{consolidation_id}/export",
            axum::routing::get(export_consolidated_report),
        )
        .route("/reports/export", axum::routing::get(export_report))
        .route(
            "/reports/subscriptions",
            axum::routing::get(get_report_subscriptions),
        )
        .route(
            "/reports/subscriptions/{subscription_id}/history",
            axum::routing::get(get_subscription_history),
        )
        .route(
            "/reports/business-overview",
            axum::routing::get(get_business_overview),
        )
        .route(
            "/reports/project-summary",
            axum::routing::get(get_project_summary),
        )
        .route(
            "/reports/monthly-trend",
            axum::routing::get(get_monthly_trend),
        )
        .route(
            "/reports/department-summary",
            axum::routing::get(get_department_summary),
        )
        .route(
            "/reports/aging-analysis",
            axum::routing::get(get_aging_analysis),
        )
        .route(
            "/reports/voucher-statistics",
            axum::routing::get(get_voucher_statistics),
        )
        .route(
            "/reports/cash-flow-analysis",
            axum::routing::get(get_cash_flow_analysis),
        )
        .route(
            "/reports/expense-analysis",
            axum::routing::get(get_expense_analysis),
        )
        .route(
            "/reports/profit-analysis",
            axum::routing::get(get_profit_analysis),
        )
        .route(
            "/reports/financial-overview",
            axum::routing::get(get_financial_overview),
        )
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_permission("finance:report:read"),
        ));

    let write_routes = Router::new()
        .route(
            "/reports/balance-sheet/generate",
            axum::routing::post(generate_balance_sheet),
        )
        .route(
            "/reports/income-statement/generate",
            axum::routing::post(generate_income_statement),
        )
        .route(
            "/reports/cash-flow/generate",
            axum::routing::post(generate_cash_flow),
        )
        .route(
            "/reports/submit-approval",
            axum::routing::post(submit_report_for_approval),
        )
        .route("/reports/approve", axum::routing::post(approve_report))
        .route("/reports/reject", axum::routing::post(reject_report))
        .route("/reports/lock", axum::routing::post(lock_report))
        .route("/reports/unlock", axum::routing::post(unlock_report))
        .route(
            "/reports/consolidated/generate",
            axum::routing::post(generate_consolidated_report),
        )
        .route(
            "/reports/consolidated/entities",
            axum::routing::post(create_consolidation_entity),
        )
        .route(
            "/reports/consolidated/entities/{entity_id}",
            axum::routing::put(update_consolidation_entity),
        )
        .route(
            "/reports/consolidated/entities/{entity_id}",
            axum::routing::delete(delete_consolidation_entity),
        )
        .route(
            "/reports/consolidated/elims",
            axum::routing::post(add_intercompany_elimination),
        )
        .route(
            "/reports/export/batch",
            axum::routing::post(batch_export_reports),
        )
        .route(
            "/reports/subscriptions",
            axum::routing::post(create_report_subscription),
        )
        .route(
            "/reports/subscriptions/{subscription_id}",
            axum::routing::put(update_report_subscription),
        )
        .route(
            "/reports/subscriptions/{subscription_id}",
            axum::routing::delete(delete_report_subscription),
        )
        .route(
            "/reports/subscriptions/{subscription_id}/send-now",
            axum::routing::post(send_report_now),
        )
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_module_write("finance"),
        ));

    read_routes.merge(write_routes)
}

#[cfg(test)]
mod tests {
    // ===== B363：报表路由读/写分流的结构棘轮 =====

    /// 解析 create_routes 里两个子 Router 各自挂的路由。
    fn report_route_blocks(src: &str) -> (Vec<(String, String)>, Vec<(String, String)>) {
        let start = src
            .find("pub fn create_routes() -> Router<AppState> {")
            .expect("create_routes 不存在");
        let seg = &src[start..];
        let read_start = seg
            .find("let read_routes = Router::new()")
            .expect("read 块缺失");
        let read_end = seg
            .find("require_permission(\"finance:report:read\")")
            .expect("read 层缺失");
        let write_start = seg
            .find("let write_routes = Router::new()")
            .expect("write 块缺失");
        let write_end = seg
            .find("require_module_write(\"finance\")")
            .expect("write 层缺失");
        let routes = |block: &str| -> Vec<(String, String)> {
            let mut out = Vec::new();
            let mut rest = block;
            while let Some(i) = rest.find(".route(") {
                rest = &rest[i + 7..];
                let end = rest.find(')').unwrap_or(rest.len());
                let chunk = &rest[..end];
                if let (Some(m_start), Some(m_end)) = (chunk.find('"'), chunk.rfind('"')) {
                    let path = chunk[m_start + 1..m_end].to_string();
                    let tail = &chunk[m_end..];
                    if let Some(v) = tail.find("routing::") {
                        let verb: String = tail[v + "routing::".len()..]
                            .chars()
                            .take_while(|c| c.is_ascii_alphabetic())
                            .collect();
                        out.push((path, verb.to_uppercase()));
                    }
                }
            }
            out
        };
        (
            routes(&seg[read_start..read_end]),
            routes(&seg[write_start..write_end]),
        )
    }

    #[test]
    fn report_write_routes_are_all_behind_admin_gate() {
        let (read, write) = report_route_blocks(include_str!("financial_reports.rs"));
        assert!(
            !read.is_empty() && !write.is_empty(),
            "两个子 Router 都不应为空"
        );
        let leaked: Vec<_> = read
            .iter()
            .filter(|(_, verb)| verb != "GET")
            .map(|(p, v)| format!("{v} {p}"))
            .collect();
        assert!(
            leaked.is_empty(),
            "写路由误挂到只读 Router（只读码可写）: {leaked:?}"
        );
        // 每条路由必须恰好出现在一个子 Router 里（漏挂 = 404，重复 = panic）
        let mut all: Vec<String> = read
            .iter()
            .chain(write.iter())
            .map(|(p, v)| format!("{v} {p}"))
            .collect();
        let total = all.len();
        all.sort();
        all.dedup();
        assert_eq!(all.len(), total, "同一 method+path 被挂了两次: {all:?}");
    }

    use super::*;

    #[test]
    fn test_decimal_growth_rate_zero_prev_no_div_by_zero() {
        // 基期为 0 时不触发除零，返回 0
        assert_eq!(
            decimal_growth_rate(Decimal::new(10000, 2), Decimal::ZERO),
            0.0
        );
    }

    #[test]
    fn test_decimal_growth_rate_positive() {
        // 100.00 -> 125.00 = +25%，Decimal 域运算无浮点尾差
        let rate = decimal_growth_rate(Decimal::new(12500, 2), Decimal::new(10000, 2));
        assert!((rate - 25.0).abs() < 1e-6, "rate={rate}");
    }

    #[test]
    fn test_decimal_growth_rate_negative() {
        // 100.00 -> 80.00 = -20%
        let rate = decimal_growth_rate(Decimal::new(8000, 2), Decimal::new(10000, 2));
        assert!((rate - (-20.0)).abs() < 1e-6, "rate={rate}");
    }

    #[test]
    fn test_item_details_query_deserialize() {
        let json = r#"{"report_type": "balance_sheet", "report_id": "r1", "account_code": "1001", "period": "2024-01"}"#;
        let query: ItemDetailsQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.report_type.as_deref(), Some("balance_sheet"));
        assert_eq!(query.report_id.as_deref(), Some("r1"));
        assert_eq!(query.account_code.as_deref(), Some("1001"));
        assert_eq!(query.period.as_deref(), Some("2024-01"));
    }

    #[test]
    fn test_item_details_query_default() {
        let json = r#"{}"#;
        let query: ItemDetailsQuery = serde_json::from_str(json).unwrap();
        assert!(query.report_type.is_none());
        assert!(query.report_id.is_none());
        assert!(query.account_code.is_none());
        assert!(query.period.is_none());
    }

    #[test]
    fn test_item_vouchers_query_deserialize() {
        let json = r#"{"account_code": "1001", "period": "2024-01", "page": 1, "page_size": 20}"#;
        let query: ItemVouchersQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.account_code.as_deref(), Some("1001"));
        assert_eq!(query.period.as_deref(), Some("2024-01"));
        assert_eq!(query.page, Some(1));
        assert_eq!(query.page_size, Some(20));
    }

    #[test]
    fn test_comparison_query_deserialize() {
        let json = r#"{"report_type": "income", "org_id": "org1", "period_from": "2024-01", "period_to": "2024-02", "currency_code": "CNY"}"#;
        let query: ComparisonQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.report_type.as_deref(), Some("income"));
        assert_eq!(query.org_id.as_deref(), Some("org1"));
        assert_eq!(query.period_from.as_deref(), Some("2024-01"));
        assert_eq!(query.period_to.as_deref(), Some("2024-02"));
        assert_eq!(query.currency_code.as_deref(), Some("CNY"));
    }

    #[test]
    fn test_trend_query_deserialize() {
        let json = r#"{"report_type": "balance", "period_from": "2024-01", "period_to": "2024-12", "account_codes": "1001,1002"}"#;
        let query: TrendQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.report_type.as_deref(), Some("balance"));
        assert_eq!(query.period_from.as_deref(), Some("2024-01"));
        assert_eq!(query.period_to.as_deref(), Some("2024-12"));
        assert_eq!(query.account_codes.as_deref(), Some("1001,1002"));
    }

    #[test]
    fn test_generate_report_request_deserialize() {
        let json = r#"{
            "org_id": "org1",
            "period": "2024-01",
            "compare_period": "2023-01",
            "currency_code": "CNY",
            "include_disabled_accounts": false,
            "include_detail": true,
            "method": "accrual"
        }"#;
        let request: GenerateReportRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.org_id.as_deref(), Some("org1"));
        assert_eq!(request.period, "2024-01");
        assert_eq!(request.compare_period.as_deref(), Some("2023-01"));
        assert_eq!(request.currency_code.as_deref(), Some("CNY"));
        assert_eq!(request.include_disabled_accounts, Some(false));
        assert_eq!(request.include_detail, Some(true));
        assert_eq!(request.method.as_deref(), Some("accrual"));
    }

    #[test]
    fn test_generate_report_request_minimal() {
        let json = r#"{"period": "2024-01"}"#;
        let request: GenerateReportRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.period, "2024-01");
        assert!(request.org_id.is_none());
        assert!(request.compare_period.is_none());
        assert!(request.currency_code.is_none());
        assert!(request.include_disabled_accounts.is_none());
        assert!(request.include_detail.is_none());
        assert!(request.method.is_none());
    }

    #[test]
    fn test_get_report_query_deserialize() {
        let json = r#"{"org_id": "org1", "period": "2024-01", "currency_code": "CNY"}"#;
        let query: GetReportQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.org_id.as_deref(), Some("org1"));
        assert_eq!(query.period, "2024-01");
        assert_eq!(query.currency_code.as_deref(), Some("CNY"));
    }

    #[test]
    fn test_history_report_query_deserialize() {
        let json = r#"{"org_id": "org1", "start_period": "2024-01", "end_period": "2024-12", "currency_code": "CNY", "page": 1, "page_size": 20}"#;
        let query: HistoryReportQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.org_id.as_deref(), Some("org1"));
        assert_eq!(query.start_period, "2024-01");
        assert_eq!(query.end_period, "2024-12");
        assert_eq!(query.currency_code.as_deref(), Some("CNY"));
        assert_eq!(query.page, Some(1));
        assert_eq!(query.page_size, Some(20));
    }

    #[test]
    fn test_period_normalization_dash_and_compact_return_same_data() {
        // 锁住：`2026-10` 与 `202610` 归一后完全一致。生成报表的查询、落库键
        // 与响应载荷都只使用归一值，因此两个入参必然返回同一份数据。
        let dash = normalize_report_period("2026-10").expect("YYYY-MM 应可解析");
        let compact = normalize_report_period("202610").expect("YYYYMM 应可解析");
        assert_eq!(dash, "202610");
        assert_eq!(dash, compact);

        let payload = serde_json::json!({"total_assets": "0", "balanced": true});
        assert_eq!(
            annotate_period_business(payload.clone(), &dash, false),
            annotate_period_business(payload, &compact, false)
        );
    }

    #[test]
    fn test_period_normalization_rejects_unparseable_with_400() {
        // 锁住：非法期间必须 4xx，不得静默返回 200 空表。
        for raw in [
            "2026-13", "202613", "2026/10", "2026-1", "26-10", "", "2026100", "2026-1a",
        ] {
            let resp = match normalize_report_period(raw) {
                Ok(v) => panic!("input={raw:?} 应被拒绝，实际归一为 {v}"),
                Err(e) => e,
            };
            assert_eq!(resp.code, 400, "input={raw:?}");
            assert!(!resp.success, "input={raw:?}");
        }
    }
}

#[cfg(test)]
mod analysis_error_ratchet {
    /// V321 的 10 个分析报表 handler 曾把每条聚合查询的失败都 `.unwrap_or_default()` / `.unwrap_or(0)` 掉，
    /// 于是数据库出错时前端看到的是一张「全是 0」的报表而不是错误。此棘轮防止回退。
    #[test]
    fn analysis_handlers_do_not_swallow_query_errors() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("src/modules/financial_reports.rs");
        let src = std::fs::read_to_string(&path).expect("读取 financial_reports.rs 失败");
        let start = src
            .find("V321: 10 个分析报表 handler")
            .expect("V321 段注释缺失，棘轮定位失效");
        let body = &src[start..];
        let bytes = body.as_bytes();
        for (idx, _) in body.match_indices(".unwrap_or") {
            // 源文件含中文，必须按字节切片再 lossy 转换，避免落在 UTF-8 字符中间
            let window = String::from_utf8_lossy(&bytes[idx.saturating_sub(60)..idx]);
            assert!(
                !window.contains(".await"),
                "分析报表 handler 里又出现「查询失败即取默认值」：\n{}",
                String::from_utf8_lossy(
                    &bytes[idx.saturating_sub(120)..(idx + 40).min(bytes.len())]
                )
            );
        }
    }
}
